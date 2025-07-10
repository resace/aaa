import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from './storage';
import { Alert } from 'react-native';

export interface BackupData {
  version: string;
  exportDate: string;
  subjects: any[];
  studySessions: any[];
  weeklyGoals: any[];
  exams: any[];
  pomodoroSettings: any;
  pomodoroHistory: any[];
}

export interface BackupSettings {
  enabled: boolean;
  intervalDays: number;
  lastBackupDate: string | null;
}

const BACKUP_SETTINGS_KEY = 'backupSettings';
const LAST_BACKUP_KEY = 'lastBackupData';

export class BackupService {
  static async getBackupSettings(): Promise<BackupSettings> {
    try {
      const data = await AsyncStorage.getItem(BACKUP_SETTINGS_KEY);
      return data ? JSON.parse(data) : {
        enabled: true,
        intervalDays: 3,
        lastBackupDate: null,
      };
    } catch (error) {
      console.error('Error getting backup settings:', error);
      return {
        enabled: true,
        intervalDays: 3,
        lastBackupDate: null,
      };
    }
  }

  static async saveBackupSettings(settings: BackupSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(BACKUP_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving backup settings:', error);
    }
  }

  static async exportAllData(): Promise<BackupData> {
    try {
      const [
        subjects,
        studySessions,
        weeklyGoals,
        exams,
        pomodoroSettings,
        pomodoroHistory,
      ] = await Promise.all([
        StorageService.getSubjects(),
        StorageService.getStudySessions(),
        StorageService.getWeeklyGoals(),
        StorageService.getExams(),
        StorageService.getPomodoroSettings(),
        StorageService.getPomodoroHistory(),
      ]);

      const backupData: BackupData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        subjects,
        studySessions,
        weeklyGoals,
        exams,
        pomodoroSettings,
        pomodoroHistory,
      };

      return backupData;
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new Error('Erro ao exportar dados');
    }
  }

  static async importAllData(backupData: BackupData): Promise<void> {
    try {
      // Validar estrutura dos dados
      if (!backupData.version || !backupData.exportDate) {
        throw new Error('Arquivo de backup inválido');
      }

      // Salvar todos os dados
      await Promise.all([
        StorageService.saveSubjects(backupData.subjects || []),
        StorageService.saveStudySessions(backupData.studySessions || []),
        StorageService.saveWeeklyGoals(backupData.weeklyGoals || []),
        StorageService.saveExams(backupData.exams || []),
        StorageService.savePomodoroSettings(backupData.pomodoroSettings || {
          workTime: 25,
          breakTime: 5,
          longBreakTime: 15,
          sessionsUntilLongBreak: 4,
        }),
        StorageService.savePomodoroHistory(backupData.pomodoroHistory || []),
      ]);
    } catch (error) {
      console.error('Error importing data:', error);
      throw new Error('Erro ao importar dados');
    }
  }

  static async createBackup(): Promise<BackupData> {
    try {
      const backupData = await this.exportAllData();
      
      // Salvar backup localmente
      await AsyncStorage.setItem(LAST_BACKUP_KEY, JSON.stringify(backupData));
      
      // Atualizar configurações de backup
      const settings = await this.getBackupSettings();
      settings.lastBackupDate = new Date().toISOString();
      await this.saveBackupSettings(settings);

      return backupData;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  static async getLastBackup(): Promise<BackupData | null> {
    try {
      const data = await AsyncStorage.getItem(LAST_BACKUP_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting last backup:', error);
      return null;
    }
  }

  static async shouldCreateBackup(): Promise<boolean> {
    try {
      const settings = await this.getBackupSettings();
      
      if (!settings.enabled) {
        return false;
      }

      if (!settings.lastBackupDate) {
        return true;
      }

      const lastBackup = new Date(settings.lastBackupDate);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60 * 24));

      return daysDiff >= settings.intervalDays;
    } catch (error) {
      console.error('Error checking backup schedule:', error);
      return false;
    }
  }

  static async checkAndCreateAutoBackup(): Promise<void> {
    try {
      const shouldBackup = await this.shouldCreateBackup();
      
      if (shouldBackup) {
        await this.createBackup();
        console.log('Backup automático criado com sucesso');
      }
    } catch (error) {
      console.error('Error in auto backup:', error);
    }
  }

  static formatBackupFileName(): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    return `studyhighway-backup-${dateStr}-${timeStr}.json`;
  }

  static validateBackupData(data: any): boolean {
    try {
      return (
        data &&
        typeof data === 'object' &&
        data.version &&
        data.exportDate &&
        Array.isArray(data.subjects) &&
        Array.isArray(data.studySessions) &&
        Array.isArray(data.weeklyGoals) &&
        Array.isArray(data.exams) &&
        Array.isArray(data.pomodoroHistory) &&
        typeof data.pomodoroSettings === 'object'
      );
    } catch (error) {
      return false;
    }
  }
}