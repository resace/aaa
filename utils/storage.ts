import AsyncStorage from '@react-native-async-storage/async-storage';

// Interfaces
export interface Topic {
  id: string;
  name: string;
  subjectId: string;
  totalQuestions: number;
  correctAnswers: number;
  studyTime: number;
  color: string;
}

export interface Subject {
  id: string;
  name: string;
  topics: Topic[];
}

export interface StudySession {
  id: string;
  topicId: string;
  date: string;
  duration: number;
  questions: number;
  correctAnswers: number;
}

export interface WeeklyGoal {
  id: string;
  subjectId: string;
  weekStart: string;
  targetHours: number;
  currentHours: number;
  distribution?: { [key: string]: number };
}

export interface Exam {
  id: string;
  name: string;
  date: string;
  results: { [subjectId: string]: { correct: number; total: number } };
}

export interface PomodoroSettings {
  workTime: number;
  breakTime: number;
  longBreakTime: number;
  sessionsUntilLongBreak: number;
}

export interface PomodoroSession {
  id: string;
  date: string;
  completedCycles: number;
  totalMinutes: number;
  workSessions: number;
  startTime: string;
  endTime: string;
  pauseTime?: string;
  netStudyTime: number;
  pauseDurations: number[];
}

// Utility function
export const getTopicColor = (percentage: number): string => {
  if (percentage >= 80) return '#10B981';
  if (percentage >= 60) return '#F59E0B';
  if (percentage >= 40) return '#F97316';
  return '#EF4444';
};

// Storage keys
const STORAGE_KEYS = {
  SUBJECTS: 'subjects',
  STUDY_SESSIONS: 'studySessions',
  WEEKLY_GOALS: 'weeklyGoals',
  EXAMS: 'exams',
  POMODORO_SETTINGS: 'pomodoroSettings',
  POMODORO_HISTORY: 'pomodoroHistory',
};

// Storage Service
export const StorageService = {
  // Subjects
  async getSubjects(): Promise<Subject[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SUBJECTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting subjects:', error);
      return [];
    }
  },

  async saveSubjects(subjects: Subject[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
    } catch (error) {
      console.error('Error saving subjects:', error);
    }
  },

  // Study Sessions
  async getStudySessions(): Promise<StudySession[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.STUDY_SESSIONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting study sessions:', error);
      return [];
    }
  },

  async saveStudySessions(sessions: StudySession[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.STUDY_SESSIONS, JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving study sessions:', error);
    }
  },

  // Weekly Goals
  async getWeeklyGoals(): Promise<WeeklyGoal[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.WEEKLY_GOALS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting weekly goals:', error);
      return [];
    }
  },

  async saveWeeklyGoals(goals: WeeklyGoal[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.WEEKLY_GOALS, JSON.stringify(goals));
    } catch (error) {
      console.error('Error saving weekly goals:', error);
    }
  },

  // Exams
  async getExams(): Promise<Exam[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.EXAMS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting exams:', error);
      return [];
    }
  },

  async saveExams(exams: Exam[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(exams));
    } catch (error) {
      console.error('Error saving exams:', error);
    }
  },

  // Pomodoro Settings
  async getPomodoroSettings(): Promise<PomodoroSettings> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.POMODORO_SETTINGS);
      return data ? JSON.parse(data) : {
        workTime: 25,
        breakTime: 5,
        longBreakTime: 15,
        sessionsUntilLongBreak: 4,
      };
    } catch (error) {
      console.error('Error getting pomodoro settings:', error);
      return {
        workTime: 25,
        breakTime: 5,
        longBreakTime: 15,
        sessionsUntilLongBreak: 4,
      };
    }
  },

  async savePomodoroSettings(settings: PomodoroSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.POMODORO_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving pomodoro settings:', error);
    }
  },

  // Pomodoro History
  async getPomodoroHistory(): Promise<PomodoroSession[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.POMODORO_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting pomodoro history:', error);
      return [];
    }
  },

  async savePomodoroHistory(history: PomodoroSession[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.POMODORO_HISTORY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving pomodoro history:', error);
    }
  },

  // Export all data
  async exportAllData(): Promise<any> {
    try {
      const [subjects, studySessions, weeklyGoals, exams, pomodoroSettings, pomodoroHistory] = await Promise.all([
        this.getSubjects(),
        this.getStudySessions(),
        this.getWeeklyGoals(),
        this.getExams(),
        this.getPomodoroSettings(),
        this.getPomodoroHistory(),
      ]);

      return {
        subjects,
        studySessions,
        weeklyGoals,
        exams,
        pomodoroSettings,
        pomodoroHistory,
        exportDate: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  },

  // Clear all data
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  },
};