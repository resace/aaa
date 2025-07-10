import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Target, Plus, CreditCard as Edit, Trash2, Calendar } from 'lucide-react-native';
import { StorageService, Subject, WeeklyGoal } from '@/utils/storage';

export default function Metas() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [goals, setGoals] = useState<WeeklyGoal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [targetHours, setTargetHours] = useState('');
  const [distributionType, setDistributionType] = useState<'auto' | 'manual'>('auto');
  const [manualDistribution, setManualDistribution] = useState({
    monday: '0',
    tuesday: '0',
    wednesday: '0',
    thursday: '0',
    friday: '0',
    saturday: '0',
    sunday: '0',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [subjectsData, goalsData] = await Promise.all([
      StorageService.getSubjects(),
      StorageService.getWeeklyGoals(),
    ]);
    setSubjects(subjectsData);
    setGoals(goalsData);
  };

  const getCurrentWeekStart = (): string => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  const handleCreateGoal = async () => {
    if (!selectedSubject || !targetHours) {
      Alert.alert('Erro', 'Selecione uma matéria e defina as horas');
      return;
    }

    const hours = parseFloat(targetHours);
    if (hours <= 0) {
      Alert.alert('Erro', 'Horas devem ser maiores que zero');
      return;
    }

    let distribution: { [key: string]: number } = {};

    if (distributionType === 'auto') {
      const hoursPerDay = hours / 7;
      distribution = {
        monday: hoursPerDay,
        tuesday: hoursPerDay,
        wednesday: hoursPerDay,
        thursday: hoursPerDay,
        friday: hoursPerDay,
        saturday: hoursPerDay,
        sunday: hoursPerDay,
      };
    } else {
      const totalManualHours = Object.values(manualDistribution).reduce(
        (sum, h) => sum + parseFloat(h || '0'),
        0
      );
      
      if (Math.abs(totalManualHours - hours) > 0.1) {
        Alert.alert('Erro', 'A soma das horas diárias deve ser igual ao total');
        return;
      }

      distribution = {
        monday: parseFloat(manualDistribution.monday || '0'),
        tuesday: parseFloat(manualDistribution.tuesday || '0'),
        wednesday: parseFloat(manualDistribution.wednesday || '0'),
        thursday: parseFloat(manualDistribution.thursday || '0'),
        friday: parseFloat(manualDistribution.friday || '0'),
        saturday: parseFloat(manualDistribution.saturday || '0'),
        sunday: parseFloat(manualDistribution.sunday || '0'),
      };
    }

    const newGoal: WeeklyGoal = {
      id: `${Date.now()}-${Math.random()}`,
      subjectId: selectedSubject.id,
      weekStart: getCurrentWeekStart(),
      targetHours: hours,
      currentHours: 0,
      distribution,
    };

    const updatedGoals = [...goals, newGoal];
    await StorageService.saveWeeklyGoals(updatedGoals);
    setGoals(updatedGoals);
    setShowForm(false);
    setSelectedSubject(null);
    setTargetHours('');
    resetForm();
    
    Alert.alert('Sucesso', 'Meta criada com sucesso!');
  };

  const resetForm = () => {
    setManualDistribution({
      monday: '0',
      tuesday: '0',
      wednesday: '0',
      thursday: '0',
      friday: '0',
      saturday: '0',
      sunday: '0',
    });
    setDistributionType('auto');
  };

  const handleDeleteGoal = async (goalId: string) => {
    Alert.alert(
      'Excluir Meta',
      'Tem certeza que deseja excluir esta meta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const updatedGoals = goals.filter(goal => goal.id !== goalId);
            await StorageService.saveWeeklyGoals(updatedGoals);
            setGoals(updatedGoals);
          },
        },
      ]
    );
  };

  const getDayName = (day: string): string => {
    const names: { [key: string]: string } = {
      monday: 'Seg',
      tuesday: 'Ter',
      wednesday: 'Qua',
      thursday: 'Qui',
      friday: 'Sex',
      saturday: 'Sáb',
      sunday: 'Dom',
    };
    return names[day] || day;
  };

  const getGoalProgress = (goal: WeeklyGoal): number => {
    const currentHours = goal.currentHours || 0;
    const targetHours = goal.targetHours || 0;
    return targetHours > 0 ? (currentHours / targetHours) * 100 : 0;
  };

  if (showForm) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Nova Meta Semanal</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Matéria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.subjectPicker}>
                {subjects.map(subject => (
                  <TouchableOpacity
                    key={subject.id}
                    style={[
                      styles.subjectOption,
                      selectedSubject?.id === subject.id && styles.subjectOptionSelected,
                    ]}
                    onPress={() => setSelectedSubject(subject)}
                  >
                    <Text
                      style={[
                        styles.subjectOptionText,
                        selectedSubject?.id === subject.id && styles.subjectOptionTextSelected,
                      ]}
                    >
                      {subject.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Horas semanais</Text>
            <TextInput
              style={styles.input}
              value={targetHours}
              onChangeText={setTargetHours}
              keyboardType="numeric"
              placeholder="Ex: 10"
              placeholderTextColor="#6B7280"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Distribuição</Text>
            <View style={styles.distributionPicker}>
              <TouchableOpacity
                style={[
                  styles.distributionOption,
                  distributionType === 'auto' && styles.distributionOptionSelected,
                ]}
                onPress={() => setDistributionType('auto')}
              >
                <Text
                  style={[
                    styles.distributionOptionText,
                    distributionType === 'auto' && styles.distributionOptionTextSelected,
                  ]}
                >
                  Automática
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.distributionOption,
                  distributionType === 'manual' && styles.distributionOptionSelected,
                ]}
                onPress={() => setDistributionType('manual')}
              >
                <Text
                  style={[
                    styles.distributionOptionText,
                    distributionType === 'manual' && styles.distributionOptionTextSelected,
                  ]}
                >
                  Manual
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {distributionType === 'manual' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Horas por dia</Text>
              <View style={styles.weekDistribution}>
                {Object.entries(manualDistribution).map(([day, hours]) => (
                  <View key={day} style={styles.dayInput}>
                    <Text style={styles.dayLabel}>{getDayName(day)}</Text>
                    <TextInput
                      style={styles.dayInputField}
                      value={hours}
                      onChangeText={(text) =>
                        setManualDistribution({
                          ...manualDistribution,
                          [day]: text,
                        })
                      }
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#6B7280"
                    />
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setShowForm(false);
                resetForm();
              }}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleCreateGoal}
            >
              <Text style={styles.saveButtonText}>Criar Meta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Metas Semanais</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(true)}
        >
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {goals.length === 0 ? (
        <View style={styles.emptyState}>
          <Target size={48} color="#6B7280" />
          <Text style={styles.emptyStateText}>
            Nenhuma meta criada
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Crie suas primeiras metas semanais
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          {goals.map(goal => {
            const subject = subjects.find(s => s.id === goal.subjectId);
            const progress = getGoalProgress(goal);
            
            return (
              <View key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalSubject}>
                    {subject?.name || 'Matéria'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteGoal(goal.id)}
                  >
                    <Trash2 size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.goalProgress}>
                  <View style={styles.goalStats}>
                    <Text style={styles.goalHours}>
                      {(goal.currentHours || 0).toFixed(1)}h / {(goal.targetHours || 0)}h
                    </Text>
                    <Text style={styles.goalPercent}>
                      {progress.toFixed(1)}%
                    </Text>
                  </View>
                  
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.min(progress, 100)}%` },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.weekView}>
                  {Object.entries(goal.distribution || {}).map(([day, hours]) => (
                    <View key={day} style={styles.dayColumn}>
                      <Text style={styles.dayName}>{getDayName(day)}</Text>
                      <Text style={styles.dayHours}>{(hours || 0).toFixed(1)}h</Text>
                    </View>
                  ))}
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
  goalCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalSubject: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  goalProgress: {
    marginBottom: 16,
  },
  goalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalHours: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  goalPercent: {
    fontSize: 16,
    color: '#60A5FA',
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#60A5FA',
  },
  weekView: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    alignItems: 'center',
  },
  dayName: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  dayHours: {
    fontSize: 14,
    color: '#FFFFFF',
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
  subjectPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  subjectOption: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  subjectOptionSelected: {
    backgroundColor: '#60A5FA',
  },
  subjectOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  subjectOptionTextSelected: {
    fontWeight: '600',
  },
  distributionPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  distributionOption: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  distributionOptionSelected: {
    backgroundColor: '#60A5FA',
  },
  distributionOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  distributionOptionTextSelected: {
    fontWeight: '600',
  },
  weekDistribution: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayInput: {
    alignItems: 'center',
    width: '13%',
  },
  dayLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  dayInputField: {
    backgroundColor: '#1F2937',
    borderRadius: 6,
    padding: 8,
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    width: '100%',
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