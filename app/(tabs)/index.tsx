import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { Calendar, Clock, Target, BookOpen, Settings, CreditCard as Edit, Shield } from 'lucide-react-native';
import { WeeklyGoal, Subject, PomodoroSettings } from '@/utils/storage';
import { useAppContext } from '@/contexts/AppContext';
import PomodoroTimer from '@/components/PomodoroTimer';
import SubjectParser from '@/components/SubjectParser';
import SubjectEditor from '@/components/SubjectEditor';
import BackupManager from '@/components/BackupManager';

const { width: screenWidth } = Dimensions.get('window');

export default function Home() {
  const { subjects, weeklyGoals, isLoading } = useAppContext();
  const [todayGoals, setTodayGoals] = useState<(WeeklyGoal & { subjectName: string })[]>([]);
  const [showPomodoroSettings, setShowPomodoroSettings] = useState(false);
  const [showSubjectEditor, setShowSubjectEditor] = useState(false);
  const [showBackupManager, setShowBackupManager] = useState(false);
  const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettings>({
    workTime: 25,
    breakTime: 5,
    longBreakTime: 15,
    sessionsUntilLongBreak: 4,
  });

  useEffect(() => {
    if (!isLoading && subjects.length > 0 && weeklyGoals.length > 0) {
      calculateTodayGoals();
    }
  }, [subjects, weeklyGoals, isLoading]);

  const calculateTodayGoals = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[dayOfWeek];

    const todayGoalsData = weeklyGoals
      .filter(goal => goal.distribution && goal.distribution[currentDay] > 0)
      .map(goal => ({
        ...goal,
        subjectName: subjects.find(s => s.id === goal.subjectId)?.name || 'Matéria desconhecida',
      }));

    setTodayGoals(todayGoalsData);
  };

  const getCurrentDate = () => {
    const today = new Date();
    return today.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handlePomodoroSettings = () => {
    Alert.alert(
      'Configurar Pomodoro',
      'Escolha uma configuração:',
      [
        {
          text: 'Foco: 25min',
          onPress: () => updateSetting('workTime', 25),
        },
        {
          text: 'Foco: 45min',
          onPress: () => updateSetting('workTime', 45),
        },
        {
          text: 'Pausa: 5min',
          onPress: () => updateSetting('breakTime', 5),
        },
        {
          text: 'Pausa: 10min',
          onPress: () => updateSetting('breakTime', 10),
        },
        {
          text: 'Pausa longa: 15min',
          onPress: () => updateSetting('longBreakTime', 15),
        },
        {
          text: 'Pausa longa: 30min',
          onPress: () => updateSetting('longBreakTime', 30),
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  const updateSetting = async (key: keyof PomodoroSettings, value: number) => {
    const newSettings = { ...pomodoroSettings, [key]: value };
    setPomodoroSettings(newSettings);
    Alert.alert('Sucesso', `${key === 'workTime' ? 'Tempo de foco' : key === 'breakTime' ? 'Pausa curta' : 'Pausa longa'} atualizado para ${value} minutos`);
  };

  const getTotalTodayHours = () => {
    return todayGoals.reduce((total, goal) => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = dayNames[dayOfWeek];
      return total + (goal.distribution?.[currentDay] || 0);
    }, 0);
  };

  const getProgressForGoal = (goal: WeeklyGoal): number => {
    // Calcular progresso real baseado no tempo estudado hoje
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
    
    // Buscar sessões de estudo de hoje para esta matéria
    const subject = subjects.find(s => s.id === goal.subjectId);
    if (!subject) return 0;
    
    // Calcular tempo estudado hoje (seria obtido das sessões de estudo)
    // Por enquanto, usar o progresso atual da meta
    const dayOfWeek = today.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[dayOfWeek];
    const targetHours = goal.distribution?.[currentDay] || 0;
    const currentHours = goal.currentHours || 0;
    
    return targetHours > 0 ? Math.min((currentHours / targetHours) * 100, 100) : 0;
  };

  if (showSubjectEditor) {
    return (
      <SubjectEditor
        onClose={() => setShowSubjectEditor(false)}
      />
    );
  }

  if (showBackupManager) {
    return (
      <BackupManager
        onClose={() => setShowBackupManager(false)}
      />
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Bom dia!</Text>
          <Text style={styles.date}>{getCurrentDate()}</Text>
        </View>
        <TouchableOpacity
          style={styles.backupButton}
          onPress={() => setShowBackupManager(true)}
        >
          <Shield size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <PomodoroTimer onSettingsPress={handlePomodoroSettings} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Target size={20} color="#60A5FA" />
          <Text style={styles.sectionTitle}>Metas de Hoje</Text>
        </View>

        {todayGoals.length > 0 ? (
          <View style={styles.goalsContainer}>
            <View style={styles.goalsSummary}>
              <Text style={styles.goalsSummaryText}>
                Total: {getTotalTodayHours().toFixed(1)}h
              </Text>
            </View>
            
            {todayGoals.map(goal => {
              const today = new Date();
              const dayOfWeek = today.getDay();
              const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
              const currentDay = dayNames[dayOfWeek];
              const todayHours = goal.distribution?.[currentDay] || 0;
              const progress = getProgressForGoal(goal);
              
              return (
                <View key={goal.id} style={styles.goalCard}>
                  <View style={styles.goalHeader}>
                    <Text style={styles.goalSubject} numberOfLines={1}>
                      {goal.subjectName}
                    </Text>
                    <Text style={styles.goalTime}>{(parseFloat(todayHours as string) || 0).toFixed(1)}h</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Calendar size={48} color="#6B7280" />
            <Text style={styles.emptyStateText}>
              Nenhuma meta para hoje
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Crie suas metas semanais na aba Metas
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <BookOpen size={20} color="#60A5FA" />
          <Text style={styles.sectionTitle}>Matérias</Text>
          {subjects.length > 0 && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setShowSubjectEditor(true)}
            >
              <Edit size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        <SubjectParser />

        {subjects.length > 0 && (
          <View style={styles.subjectsGrid}>
            {subjects.map(subject => (
              <View key={subject.id} style={[styles.subjectCard, { width: (screenWidth - 56) / 2 }]}>
                <Text style={styles.subjectName} numberOfLines={2}>
                  {subject.name}
                </Text>
                <Text style={styles.subjectTopics}>
                  {subject.topics.length} tópicos
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
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
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 60,
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  date: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  backupButton: {
    backgroundColor: '#1F2937',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  editButton: {
    padding: 8,
  },
  goalsContainer: {
    gap: 12,
  },
  goalsSummary: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  goalsSummaryText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#60A5FA',
  },
  goalCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  goalTime: {
    fontSize: 14,
    color: '#60A5FA',
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#60A5FA',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
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
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    justifyContent: 'space-between',
  },
  subjectCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    minHeight: 80,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  subjectTopics: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
});