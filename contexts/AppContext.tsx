import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { StorageService, Subject, WeeklyGoal, StudySession, Exam, PomodoroSession, PomodoroSettings } from '@/utils/storage';
import { BackupService } from '@/utils/backupService';

interface AppState {
  subjects: Subject[];
  weeklyGoals: WeeklyGoal[];
  studySessions: StudySession[];
  exams: Exam[];
  pomodoroHistory: PomodoroSession[];
  pomodoroSettings: PomodoroSettings;
  isLoading: boolean;
}

interface AppContextType extends AppState {
  // Subjects
  addSubjects: (newSubjects: Subject[]) => Promise<void>;
  updateSubjects: (updatedSubjects: Subject[]) => Promise<void>;
  
  // Weekly Goals
  addWeeklyGoal: (goal: WeeklyGoal) => Promise<void>;
  updateWeeklyGoals: (goals: WeeklyGoal[]) => Promise<void>;
  deleteWeeklyGoal: (goalId: string) => Promise<void>;
  
  // Study Sessions
  addStudySession: (session: StudySession) => Promise<void>;
  
  // Exams
  addExam: (exam: Exam) => Promise<void>;
  deleteExam: (examId: string) => Promise<void>;
  
  // Pomodoro
  addPomodoroSession: (session: PomodoroSession) => Promise<void>;
  updatePomodoroSettings: (settings: PomodoroSettings) => Promise<void>;
  
  // Utility
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, setState] = useState<AppState>({
    subjects: [],
    weeklyGoals: [],
    studySessions: [],
    exams: [],
    pomodoroHistory: [],
    pomodoroSettings: {
      workTime: 25,
      breakTime: 5,
      longBreakTime: 15,
      sessionsUntilLongBreak: 4,
    },
    isLoading: true,
  });

  // Carregar dados iniciais
  const loadInitialData = async () => {
    try {
      // Verificar e criar backup automático se necessário
      await BackupService.checkAndCreateAutoBackup();
      
      const [
        subjects,
        weeklyGoals,
        studySessions,
        exams,
        pomodoroHistory,
        pomodoroSettings,
      ] = await Promise.all([
        StorageService.getSubjects(),
        StorageService.getWeeklyGoals(),
        StorageService.getStudySessions(),
        StorageService.getExams(),
        StorageService.getPomodoroHistory(),
        StorageService.getPomodoroSettings(),
      ]);

      setState({
        subjects,
        weeklyGoals,
        studySessions,
        exams,
        pomodoroHistory,
        pomodoroSettings,
        isLoading: false,
      });
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Subjects
  const addSubjects = async (newSubjects: Subject[]) => {
    const updatedSubjects = [...state.subjects, ...newSubjects];
    await StorageService.saveSubjects(updatedSubjects);
    setState(prev => ({ ...prev, subjects: updatedSubjects }));
  };

  const updateSubjects = async (updatedSubjects: Subject[]) => {
    await StorageService.saveSubjects(updatedSubjects);
    setState(prev => ({ ...prev, subjects: updatedSubjects }));
  };

  // Weekly Goals
  const addWeeklyGoal = async (goal: WeeklyGoal) => {
    const updatedGoals = [...state.weeklyGoals, goal];
    await StorageService.saveWeeklyGoals(updatedGoals);
    setState(prev => ({ ...prev, weeklyGoals: updatedGoals }));
  };

  const updateWeeklyGoals = async (goals: WeeklyGoal[]) => {
    await StorageService.saveWeeklyGoals(goals);
    setState(prev => ({ ...prev, weeklyGoals: goals }));
  };

  const deleteWeeklyGoal = async (goalId: string) => {
    const updatedGoals = state.weeklyGoals.filter(goal => goal.id !== goalId);
    await StorageService.saveWeeklyGoals(updatedGoals);
    setState(prev => ({ ...prev, weeklyGoals: updatedGoals }));
  };

  // Study Sessions
  const addStudySession = async (session: StudySession) => {
    const updatedSessions = [...state.studySessions, session];
    await StorageService.saveStudySessions(updatedSessions);
    
    // Atualizar tópico correspondente
    const updatedSubjects = state.subjects.map(subject => ({
      ...subject,
      topics: subject.topics.map(topic => {
        if (topic.id === session.topicId) {
          const newTotalQuestions = topic.totalQuestions + session.questions;
          const newCorrectAnswers = topic.correctAnswers + session.correctAnswers;
          const newStudyTime = topic.studyTime + session.duration;
          const correctPercentage = newTotalQuestions > 0 ? (newCorrectAnswers / newTotalQuestions) * 100 : 0;
          
          return {
            ...topic,
            totalQuestions: newTotalQuestions,
            correctAnswers: newCorrectAnswers,
            studyTime: newStudyTime,
            color: getTopicColor(correctPercentage),
          };
        }
        return topic;
      }),
    }));
    
    await StorageService.saveSubjects(updatedSubjects);
    
    // Atualizar metas diárias
    const topicSubject = state.subjects.find(s => s.topics.some(t => t.id === session.topicId));
    if (topicSubject) {
      const studyHours = session.duration / 60;
      const updatedGoals = state.weeklyGoals.map(goal => {
        if (goal.subjectId === topicSubject.id) {
          return {
            ...goal,
            currentHours: (goal.currentHours || 0) + studyHours,
          };
        }
        return goal;
      });
      
      await StorageService.saveWeeklyGoals(updatedGoals);
      
      setState(prev => ({
        ...prev,
        studySessions: updatedSessions,
        subjects: updatedSubjects,
        weeklyGoals: updatedGoals,
      }));
    } else {
      setState(prev => ({
        ...prev,
        studySessions: updatedSessions,
        subjects: updatedSubjects,
      }));
    }
  };

  // Exams
  const addExam = async (exam: Exam) => {
    const updatedExams = [...state.exams, exam];
    await StorageService.saveExams(updatedExams);
    setState(prev => ({ ...prev, exams: updatedExams }));
  };

  const deleteExam = async (examId: string) => {
    const updatedExams = state.exams.filter(exam => exam.id !== examId);
    await StorageService.saveExams(updatedExams);
    setState(prev => ({ ...prev, exams: updatedExams }));
  };

  // Pomodoro
  const addPomodoroSession = async (session: PomodoroSession) => {
    const updatedHistory = [...state.pomodoroHistory, session];
    await StorageService.savePomodoroHistory(updatedHistory);
    setState(prev => ({ ...prev, pomodoroHistory: updatedHistory }));
  };

  const updatePomodoroSettings = async (settings: PomodoroSettings) => {
    await StorageService.savePomodoroSettings(settings);
    setState(prev => ({ ...prev, pomodoroSettings: settings }));
  };

  // Utility
  const refreshData = async () => {
    await loadInitialData();
  };

  // Helper function
  const getTopicColor = (percentage: number): string => {
    if (percentage >= 80) return '#10B981';
    if (percentage >= 60) return '#F59E0B';
    if (percentage >= 40) return '#F97316';
    return '#EF4444';
  };

  const contextValue: AppContextType = {
    ...state,
    addSubjects,
    updateSubjects,
    addWeeklyGoal,
    updateWeeklyGoals,
    deleteWeeklyGoal,
    addStudySession,
    addExam,
    deleteExam,
    addPomodoroSession,
    updatePomodoroSettings,
    refreshData,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};