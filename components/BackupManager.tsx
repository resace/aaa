import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, TextInput } from 'react-native';
import { Download, Upload, Settings, Calendar, Shield, Clock, FileText, X } from 'lucide-react-native';
import { BackupService, BackupData, BackupSettings } from '@/utils/backupService';
import { useAppContext } from '@/contexts/AppContext';

interface BackupManagerProps {
  onClose: () => void;
}

export default function BackupManager({ onClose }: BackupManagerProps) {
  const { refreshData } = useAppContext();
  const [backupSettings, setBackupSettings] = useState<BackupSettings>({
    enabled: true,
    intervalDays: 3,
    lastBackupDate: null,
  });
  const [lastBackup, setLastBackup] = useState<BackupData | null>(null);
  const [importData, setImportData] = useState('');
  const [showImportForm, setShowImportForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadBackupInfo();
  }, []);

  const loadBackupInfo = async () => {
    try {
      const [settings, backup] = await Promise.all([
        BackupService.getBackupSettings(),
        BackupService.getLastBackup(),
      ]);
      setBackupSettings(settings);
      setLastBackup(backup);
    } catch (error) {
      console.error('Error loading backup info:', error);
    }
  };

  const handleExportData = async () => {
    try {
      const backupData = await BackupService.exportAllData();
      const jsonString = JSON.stringify(backupData, null, 2);
      const fileName = BackupService.formatBackupFileName();
      
      Alert.alert(
        'Dados Exportados',
        `Backup criado com sucesso!\n\n` +
        `Arquivo: ${fileName}\n` +
        `Tamanho: ${(jsonString.length / 1024).toFixed(1)} KB\n\n` +
        `Dados incluídos:\n` +
        `• ${backupData.subjects.length} matérias\n` +
        `• ${backupData.studySessions.length} sessões de estudo\n` +
        `• ${backupData.weeklyGoals.length} metas semanais\n` +
        `• ${backupData.exams.length} simulados\n` +
        `• ${backupData.pomodoroHistory.length} sessões Pomodoro\n` +
        `• Configurações do Pomodoro\n\n` +
        `Em um app real, este arquivo seria salvo na pasta Downloads do dispositivo.`,
        [{ text: 'OK' }]
      );
      
      // Atualizar último backup
      await loadBackupInfo();
    } catch (error) {
      Alert.alert('Erro', 'Erro ao exportar dados: ' + error.message);
    }
  };

  const handleImportData = async () => {
    if (!importData.trim()) {
      Alert.alert('Erro', 'Cole o conteúdo do arquivo JSON de backup');
      return;
    }

    try {
      const backupData = JSON.parse(importData);
      
      if (!BackupService.validateBackupData(backupData)) {
        Alert.alert('Erro', 'Arquivo de backup inválido ou corrompido');
        return;
      }

      Alert.alert(
        'Confirmar Importação',
        `Deseja importar os dados do backup?\n\n` +
        `Data do backup: ${new Date(backupData.exportDate).toLocaleString('pt-BR')}\n` +
        `Versão: ${backupData.version}\n\n` +
        `Dados que serão importados:\n` +
        `• ${backupData.subjects.length} matérias\n` +
        `• ${backupData.studySessions.length} sessões de estudo\n` +
        `• ${backupData.weeklyGoals.length} metas semanais\n` +
        `• ${backupData.exams.length} simulados\n` +
        `• ${backupData.pomodoroHistory.length} sessões Pomodoro\n\n` +
        `⚠️ ATENÇÃO: Todos os dados atuais serão substituídos!`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Importar',
            style: 'destructive',
            onPress: async () => {
              try {
                await BackupService.importAllData(backupData);
                await refreshData();
                setImportData('');
                setShowImportForm(false);
                Alert.alert('Sucesso', 'Dados importados com sucesso!');
              } catch (error) {
                Alert.alert('Erro', 'Erro ao importar dados: ' + error.message);
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Erro', 'Formato JSON inválido');
    }
  };

  const handleCreateManualBackup = async () => {
    try {
      await BackupService.createBackup();
      await loadBackupInfo();
      Alert.alert('Sucesso', 'Backup manual criado com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Erro ao criar backup: ' + error.message);
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<BackupSettings>) => {
    try {
      const updatedSettings = { ...backupSettings, ...newSettings };
      await BackupService.saveBackupSettings(updatedSettings);
      setBackupSettings(updatedSettings);
      Alert.alert('Sucesso', 'Configurações salvas com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Erro ao salvar configurações');
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getNextBackupDate = (): string => {
    if (!backupSettings.lastBackupDate) return 'Próximo acesso ao app';
    
    const lastBackup = new Date(backupSettings.lastBackupDate);
    const nextBackup = new Date(lastBackup.getTime() + (backupSettings.intervalDays * 24 * 60 * 60 * 1000));
    return nextBackup.toLocaleString('pt-BR');
  };

  if (showSettings) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Configurações de Backup</Text>
          <TouchableOpacity onPress={() => setShowSettings(false)}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <Shield size={20} color="#10B981" />
              <Text style={styles.settingTitle}>Backup Automático</Text>
            </View>
            <Text style={styles.settingDescription}>
              Criar backup automaticamente a cada período definido
            </Text>
            <View style={styles.settingOptions}>
              <TouchableOpacity
                style={[
                  styles.settingOption,
                  backupSettings.enabled && styles.settingOptionActive,
                ]}
                onPress={() => handleUpdateSettings({ enabled: true })}
              >
                <Text style={[
                  styles.settingOptionText,
                  backupSettings.enabled && styles.settingOptionTextActive,
                ]}>
                  Ativado
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.settingOption,
                  !backupSettings.enabled && styles.settingOptionActive,
                ]}
                onPress={() => handleUpdateSettings({ enabled: false })}
              >
                <Text style={[
                  styles.settingOptionText,
                  !backupSettings.enabled && styles.settingOptionTextActive,
                ]}>
                  Desativado
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {backupSettings.enabled && (
            <View style={styles.settingCard}>
              <View style={styles.settingHeader}>
                <Clock size={20} color="#60A5FA" />
                <Text style={styles.settingTitle}>Intervalo de Backup</Text>
              </View>
              <Text style={styles.settingDescription}>
                Frequência para criação automática de backups
              </Text>
              <View style={styles.intervalOptions}>
                {[1, 3, 7, 14, 30].map(days => (
                  <TouchableOpacity
                    key={days}
                    style={[
                      styles.intervalOption,
                      backupSettings.intervalDays === days && styles.intervalOptionActive,
                    ]}
                    onPress={() => handleUpdateSettings({ intervalDays: days })}
                  >
                    <Text style={[
                      styles.intervalOptionText,
                      backupSettings.intervalDays === days && styles.intervalOptionTextActive,
                    ]}>
                      {days === 1 ? '1 dia' : `${days} dias`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <Calendar size={20} color="#F59E0B" />
              <Text style={styles.settingTitle}>Status do Backup</Text>
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>Último backup:</Text>
              <Text style={styles.statusValue}>
                {formatDate(backupSettings.lastBackupDate)}
              </Text>
            </View>
            {backupSettings.enabled && (
              <View style={styles.statusInfo}>
                <Text style={styles.statusLabel}>Próximo backup:</Text>
                <Text style={styles.statusValue}>
                  {getNextBackupDate()}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (showImportForm) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Importar Backup</Text>
          <TouchableOpacity onPress={() => setShowImportForm(false)}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.importCard}>
            <View style={styles.importHeader}>
              <Upload size={20} color="#60A5FA" />
              <Text style={styles.importTitle}>Cole o conteúdo do arquivo JSON</Text>
            </View>
            <Text style={styles.importDescription}>
              Cole aqui o conteúdo completo do arquivo de backup (.json) que você deseja importar.
            </Text>
            <TextInput
              style={styles.importInput}
              value={importData}
              onChangeText={setImportData}
              placeholder="Cole o conteúdo JSON aqui..."
              placeholderTextColor="#6B7280"
              multiline
              numberOfLines={10}
              textAlignVertical="top"
            />
            <View style={styles.importButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setImportData('');
                  setShowImportForm(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.importButton]}
                onPress={handleImportData}
              >
                <Text style={styles.importButtonText}>Importar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Backup e Importação</Text>
        <TouchableOpacity onPress={onClose}>
          <X size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.actionCard}>
          <View style={styles.actionHeader}>
            <Download size={20} color="#10B981" />
            <Text style={styles.actionTitle}>Exportar Dados</Text>
          </View>
          <Text style={styles.actionDescription}>
            Criar um arquivo JSON com todos os seus dados para backup ou transferência
          </Text>
          <TouchableOpacity style={styles.actionButton} onPress={handleExportData}>
            <Download size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Exportar Agora</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionCard}>
          <View style={styles.actionHeader}>
            <Upload size={20} color="#60A5FA" />
            <Text style={styles.actionTitle}>Importar Dados</Text>
          </View>
          <Text style={styles.actionDescription}>
            Restaurar dados de um arquivo de backup anterior
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#60A5FA' }]}
            onPress={() => setShowImportForm(true)}
          >
            <Upload size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Importar Backup</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionCard}>
          <View style={styles.actionHeader}>
            <Shield size={20} color="#F59E0B" />
            <Text style={styles.actionTitle}>Backup Manual</Text>
          </View>
          <Text style={styles.actionDescription}>
            Criar um backup imediato dos seus dados
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
            onPress={handleCreateManualBackup}
          >
            <Shield size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Criar Backup</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionCard}>
          <View style={styles.actionHeader}>
            <Settings size={20} color="#9CA3AF" />
            <Text style={styles.actionTitle}>Configurações</Text>
          </View>
          <Text style={styles.actionDescription}>
            Configurar backup automático e intervalos
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#6B7280' }]}
            onPress={() => setShowSettings(true)}
          >
            <Settings size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Configurar</Text>
          </TouchableOpacity>
        </View>

        {lastBackup && (
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <FileText size={20} color="#9CA3AF" />
              <Text style={styles.infoTitle}>Último Backup</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoText}>
                Data: {formatDate(lastBackup.exportDate)}
              </Text>
              <Text style={styles.infoText}>
                Versão: {lastBackup.version}
              </Text>
              <Text style={styles.infoText}>
                Matérias: {lastBackup.subjects.length}
              </Text>
              <Text style={styles.infoText}>
                Sessões: {lastBackup.studySessions.length}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  actionCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  actionDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  infoContent: {
    gap: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  importCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
  },
  importHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  importTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  importDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
    lineHeight: 20,
  },
  importInput: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 200,
    marginBottom: 16,
  },
  importButtons: {
    flexDirection: 'row',
    gap: 12,
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
  importButton: {
    backgroundColor: '#60A5FA',
  },
  importButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  settingCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  settingDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
    lineHeight: 20,
  },
  settingOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  settingOption: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  settingOptionActive: {
    backgroundColor: '#10B981',
  },
  settingOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  settingOptionTextActive: {
    fontWeight: '600',
  },
  intervalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  intervalOption: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  intervalOptionActive: {
    backgroundColor: '#60A5FA',
  },
  intervalOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  intervalOptionTextActive: {
    fontWeight: '600',
  },
  statusInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  statusValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});