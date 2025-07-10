import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { FileText, Plus, Trash2, Calendar, Download } from 'lucide-react-native';
import { Subject, Exam } from '@/utils/storage';
import { useAppContext } from '@/contexts/AppContext';

export default function Simulados() {
  const { subjects, exams, addExam, deleteExam } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [examName, setExamName] = useState('');
  const [examResults, setExamResults] = useState<{ [subjectId: string]: { correct: string; total: string } }>({});

  const handleCreateExam = async () => {
    if (!examName.trim()) {
      Alert.alert('Erro', 'Digite o nome do simulado');
      return;
    }

    const resultsWithNumbers: { [subjectId: string]: { correct: number; total: number } } = {};
    let hasValidResults = false;

    for (const [subjectId, result] of Object.entries(examResults)) {
      const correct = parseInt(result.correct || '0');
      const total = parseInt(result.total || '0');
      
      if (total > 0) {
        if (correct > total) {
          Alert.alert('Erro', 'Acertos não podem ser maiores que o total de questões');
          return;
        }
        resultsWithNumbers[subjectId] = { correct, total };
        hasValidResults = true;
      }
    }

    if (!hasValidResults) {
      Alert.alert('Erro', 'Adicione pelo menos um resultado');
      return;
    }

    const newExam: Exam = {
      id: `${Date.now()}-${Math.random()}`,
      name: examName.trim(),
      date: new Date().toISOString(),
      results: resultsWithNumbers,
    };

    await addExam(newExam);
    setShowForm(false);
    setExamName('');
    setExamResults({});
    Alert.alert('Sucesso', 'Simulado registrado com sucesso!');
  };

  const handleDeleteExam = async (examId: string) => {
    Alert.alert(
      'Excluir Simulado',
      'Tem certeza que deseja excluir este simulado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteExam(examId),
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const allData = {
        subjects,
        exams,
        exportDate: new Date().toISOString(),
      };
      
      const jsonData = JSON.stringify(allData, null, 2);
      
      // Em um app real, você usaria react-native-fs ou similar para salvar
      Alert.alert(
        'Exportar Dados',
        'Dados preparados para exportação:\n\n' + 
        `${subjects.length} matérias\n` +
        `${exams.length} simulados\n\n` +
        'Em um app real, isso seria salvo como arquivo JSON.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Erro', 'Erro ao exportar dados');
    }
  };

  const updateExamResult = (subjectId: string, field: 'correct' | 'total', value: string) => {
    setExamResults(prev => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        [field]: value,
      },
    }));
  };

  const getExamPercentage = (exam: Exam): number => {
    const totalCorrect = Object.values(exam.results).reduce((sum, result) => sum + result.correct, 0);
    const totalQuestions = Object.values(exam.results).reduce((sum, result) => sum + result.total, 0);
    return totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
  };

  const getPerformanceColor = (percentage: number): string => {
    if (percentage >= 80) return '#10B981';
    if (percentage >= 60) return '#F59E0B';
    if (percentage >= 40) return '#F97316';
    return '#EF4444';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  if (showForm) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Novo Simulado</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome do Simulado</Text>
            <TextInput
              style={styles.input}
              value={examName}
              onChangeText={setExamName}
              placeholder="Ex: Simulado ENEM 2024"
              placeholderTextColor="#6B7280"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Resultados por Matéria</Text>
            <View style={styles.resultsContainer}>
              {subjects.map(subject => (
                <View key={subject.id} style={styles.subjectResult}>
                  <Text style={styles.subjectResultName} numberOfLines={1}>
                    {subject.name}
                  </Text>
                  <View style={styles.subjectResultInputs}>
                    <TextInput
                      style={styles.smallInput}
                      value={examResults[subject.id]?.correct || ''}
                      onChangeText={(value) => updateExamResult(subject.id, 'correct', value)}
                      placeholder="Acertos"
                      placeholderTextColor="#6B7280"
                      keyboardType="numeric"
                    />
                    <Text style={styles.divider}>/</Text>
                    <TextInput
                      style={styles.smallInput}
                      value={examResults[subject.id]?.total || ''}
                      onChangeText={(value) => updateExamResult(subject.id, 'total', value)}
                      placeholder="Total"
                      placeholderTextColor="#6B7280"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setShowForm(false);
                setExamName('');
                setExamResults({});
              }}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleCreateExam}
            >
              <Text style={styles.saveButtonText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Simulados</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportData}
          >
            <Download size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowForm(true)}
          >
            <Plus size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {exams.length === 0 ? (
        <View style={styles.emptyState}>
          <FileText size={48} color="#6B7280" />
          <Text style={styles.emptyStateText}>
            Nenhum simulado registrado
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Registre seus primeiros simulados
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          {exams.map(exam => {
            const percentage = getExamPercentage(exam);
            const color = getPerformanceColor(percentage);
            const totalCorrect = Object.values(exam.results).reduce((sum, result) => sum + result.correct, 0);
            const totalQuestions = Object.values(exam.results).reduce((sum, result) => sum + result.total, 0);
            
            return (
              <View key={exam.id} style={styles.examCard}>
                <View style={styles.examHeader}>
                  <View style={styles.examInfo}>
                    <Text style={styles.examName} numberOfLines={2}>
                      {exam.name}
                    </Text>
                    <View style={styles.examDate}>
                      <Calendar size={16} color="#9CA3AF" />
                      <Text style={styles.examDateText}>{formatDate(exam.date)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteExam(exam.id)}
                  >
                    <Trash2 size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                <View style={styles.examOverall}>
                  <View style={styles.examScore}>
                    <Text style={styles.examScoreText}>
                      {totalCorrect}/{totalQuestions}
                    </Text>
                    <Text style={[styles.examPercentage, { color }]}>
                      {percentage.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { backgroundColor: color, width: `${percentage}%` },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.examResults}>
                  {Object.entries(exam.results).map(([subjectId, result]) => {
                    const subject = subjects.find(s => s.id === subjectId);
                    const subjectPercentage = result.total > 0 ? (result.correct / result.total) * 100 : 0;
                    const subjectColor = getPerformanceColor(subjectPercentage);
                    
                    return (
                      <View key={subjectId} style={styles.subjectResult}>
                        <Text style={styles.subjectResultName} numberOfLines={1}>
                          {subject?.name || 'Matéria desconhecida'}
                        </Text>
                        <View style={styles.subjectResultStats}>
                          <Text style={styles.subjectResultScore}>
                            {result.correct}/{result.total}
                          </Text>
                          <Text style={[styles.subjectResultPercentage, { color: subjectColor }]}>
                            {subjectPercentage.toFixed(1)}%
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  exportButton: {
    backgroundColor: '#10B981',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: '#60A5FA',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#9CA3AF',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  examCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  examInfo: {
    flex: 1,
    marginRight: 12,
  },
  examName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 22,
  },
  examDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  examDateText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  examOverall: {
    marginBottom: 20,
  },
  examScore: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  examScoreText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  examPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  examResults: {
    gap: 12,
  },
  subjectResult: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  subjectResultName: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  subjectResultStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subjectResultScore: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  subjectResultPercentage: {
    fontSize: 14,
    fontWeight: '600',
  },
  form: {
    padding: 20,
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
  },
  resultsContainer: {
    gap: 16,
  },
  subjectResultInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  smallInput: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
  },
  divider: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6B7280',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#60A5FA',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});