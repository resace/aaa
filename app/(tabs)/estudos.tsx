import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, Dimensions } from 'react-native';
import { BookOpen, Clock, CircleCheck as CheckCircle, Plus, Download } from 'lucide-react-native';
import { Subject, Topic, StudySession } from '@/utils/storage';
import { useAppContext } from '@/contexts/AppContext';

const { width: screenWidth } = Dimensions.get('window');

export default function Estudos() {
  const { subjects, addStudySession } = useAppContext();
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [showStudyForm, setShowStudyForm] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [studyData, setStudyData] = useState({
    duration: '',
    questions: '',
    correctAnswers: '',
  });

  const handleTopicPress = (topic: Topic) => {
    setSelectedTopic(topic);
    setShowStudyForm(true);
    setStudyData({
      duration: '',
      questions: '',
      correctAnswers: '',
    });
  };

  const handleStudySubmit = async () => {
    if (!selectedTopic || !studyData.duration || !studyData.questions || !studyData.correctAnswers) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    const duration = parseInt(studyData.duration);
    const questions = parseInt(studyData.questions);
    const correctAnswers = parseInt(studyData.correctAnswers);

    if (correctAnswers > questions) {
      Alert.alert('Erro', 'Acertos não podem ser maiores que o total de questões');
      return;
    }

    const newSession: StudySession = {
      id: `${Date.now()}-${Math.random()}`,
      topicId: selectedTopic.id,
      date: new Date().toISOString(),
      duration,
      questions,
      correctAnswers,
    };

    await addStudySession(newSession);
    setShowStudyForm(false);
    setSelectedTopic(null);
    
    Alert.alert('Sucesso', 'Estudo registrado com sucesso!');
  };

  const handleExportData = async () => {
    try {
      // Implementar exportação usando o contexto
      const exportData = {
        subjects,
        exportDate: new Date().toISOString(),
      };
      
      Alert.alert(
        'Exportar Dados',
        'Todos os dados foram preparados para exportação:\n\n' + 
        `• ${subjects.length} matérias\n` +
        `• Sessões de estudo\n` +
        `• Metas semanais\n` +
        `• Simulados\n` +
        `• Histórico Pomodoro\n\n` +
        'Em um app real, isso seria salvo como arquivo JSON para backup.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Erro', 'Erro ao exportar dados');
    }
  };

  const getTopicPercentage = (topic: Topic): number => {
    return topic.totalQuestions > 0 ? (topic.correctAnswers / topic.totalQuestions) * 100 : 0;
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}min`;
    }
    return `${remainingMinutes}min`;
  };

  if (showStudyForm && selectedTopic) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Registrar Estudo</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {selectedTopic.name}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Duração (minutos)</Text>
            <TextInput
              style={styles.input}
              value={studyData.duration}
              onChangeText={(text) => setStudyData({...studyData, duration: text})}
              keyboardType="numeric"
              placeholder="Ex: 30"
              placeholderTextColor="#6B7280"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Questões feitas</Text>
            <TextInput
              style={styles.input}
              value={studyData.questions}
              onChangeText={(text) => setStudyData({...studyData, questions: text})}
              keyboardType="numeric"
              placeholder="Ex: 10"
              placeholderTextColor="#6B7280"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Acertos</Text>
            <TextInput
              style={styles.input}
              value={studyData.correctAnswers}
              onChangeText={(text) => setStudyData({...studyData, correctAnswers: text})}
              keyboardType="numeric"
              placeholder="Ex: 8"
              placeholderTextColor="#6B7280"
            />
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setShowStudyForm(false)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleStudySubmit}
            >
              <Text style={styles.saveButtonText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Estudos</Text>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExportData}
        >
          <Download size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.subtitle}>
        <Text style={styles.subtitleText}>
          Registre seus estudos por tópico
        </Text>
      </View>

      {subjects.length === 0 ? (
        <View style={styles.emptyState}>
          <BookOpen size={48} color="#6B7280" />
          <Text style={styles.emptyStateText}>
            Nenhuma matéria cadastrada
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Adicione matérias na tela inicial
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          {!selectedSubject ? (
            <View style={styles.subjectsList}>
              {subjects.map(subject => (
                <TouchableOpacity
                  key={subject.id}
                  style={styles.subjectCard}
                  onPress={() => setSelectedSubject(subject)}
                >
                  <Text style={styles.subjectName} numberOfLines={2}>
                    {subject.name}
                  </Text>
                  <Text style={styles.subjectInfo}>
                    {subject.topics.length} tópicos
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.topicsContainer}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setSelectedSubject(null)}
              >
                <Text style={styles.backButtonText}>← Voltar</Text>
              </TouchableOpacity>

              <Text style={styles.subjectTitle} numberOfLines={2}>
                {selectedSubject.name}
              </Text>

              <View style={styles.topicsList}>
                {selectedSubject.topics.map(topic => {
                  const percentage = getTopicPercentage(topic);
                  
                  return (
                    <TouchableOpacity
                      key={topic.id}
                      style={[styles.topicCard, { borderLeftColor: topic.color }]}
                      onPress={() => handleTopicPress(topic)}
                    >
                      <View style={styles.topicHeader}>
                        <Text style={styles.topicName} numberOfLines={2}>
                          {topic.name}
                        </Text>
                        <Plus size={20} color="#9CA3AF" />
                      </View>
                      
                      <View style={styles.topicStats}>
                        <View style={styles.stat}>
                          <Clock size={16} color="#9CA3AF" />
                          <Text style={styles.statText}>
                            {formatTime(topic.studyTime)}
                          </Text>
                        </View>
                        
                        <View style={styles.stat}>
                          <CheckCircle size={16} color="#9CA3AF" />
                          <Text style={styles.statText}>
                            {topic.correctAnswers}/{topic.totalQuestions}
                          </Text>
                        </View>
                        
                        <Text style={[styles.percentage, { color: topic.color }]}>
                          {percentage.toFixed(1)}%
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
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
  exportButton: {
    backgroundColor: '#10B981',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  subtitleText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  subjectsList: {
    gap: 16,
  },
  subjectCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  subjectInfo: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  topicsContainer: {
    gap: 16,
  },
  backButton: {
    padding: 8,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: '#60A5FA',
  },
  subjectTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    lineHeight: 28,
  },
  topicsList: {
    gap: 12,
  },
  topicCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  topicName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
    lineHeight: 20,
  },
  topicStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  percentage: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  form: {
    padding: 20,
    gap: 20,
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