import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, TextInput } from 'react-native';
import { Play, Pause, RotateCcw, Settings, History, Clock } from 'lucide-react-native';
import { PomodoroSettings, PomodoroSession } from '@/utils/storage';
import { useAppContext } from '@/contexts/AppContext';

interface PomodoroTimerProps {
  onSettingsPress: () => void;
}

export default function PomodoroTimer({ onSettingsPress }: PomodoroTimerProps) {
  const { pomodoroSettings, pomodoroHistory, updatePomodoroSettings, addPomodoroSession } = useAppContext();
  const [time, setTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isWork, setIsWork] = useState(true);
  const [sessions, setSessions] = useState(0);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  const [pauseStartTime, setPauseStartTime] = useState<string | null>(null);
  const [pauseDurations, setPauseDurations] = useState<number[]>([]);

  useEffect(() => {
    setTime(pomodoroSettings.workTime * 60);
  }, [pomodoroSettings]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && time > 0) {
      interval = setInterval(() => {
        setTime(time - 1);
      }, 1000);
    } else if (time === 0) {
      handleTimerComplete();
    }

    return () => clearInterval(interval);
  }, [isRunning, time]);

  const handleTimerComplete = async () => {
    setIsRunning(false);
    
    const endTime = new Date().toISOString();
    
    if (isWork) {
      const newSessions = sessions + 1;
      setSessions(newSessions);
      
      // Verificar se completou um ciclo (trabalho + pausa)
      if (newSessions % pomodoroSettings.sessionsUntilLongBreak === 0) {
        setTime(pomodoroSettings.longBreakTime * 60);
        setCompletedCycles(completedCycles + 1);
      } else {
        setTime(pomodoroSettings.breakTime * 60);
      }
    } else {
      setTime(pomodoroSettings.workTime * 60);
      
      // Se acabou uma pausa, incrementa ciclos completados
      if (sessions % pomodoroSettings.sessionsUntilLongBreak !== 0) {
        setCompletedCycles(completedCycles + 1);
      }
    }
    
    setIsWork(!isWork);
  };

  const toggleTimer = () => {
    const now = new Date().toISOString();
    
    if (!isRunning) {
      // Iniciando timer
      if (!sessionStartTime) {
        setSessionStartTime(now);
      } else if (pauseStartTime) {
        // Retornando de pausa
        const pauseDuration = new Date(now).getTime() - new Date(pauseStartTime).getTime();
        setPauseDurations(prev => [...prev, pauseDuration]);
        setPauseStartTime(null);
      }
    } else {
      // Pausando timer
      setPauseStartTime(now);
    }
    
    setIsRunning(!isRunning);
  };

  const resetTimer = async () => {
    setIsRunning(false);
    setIsWork(true);
    setTime(pomodoroSettings.workTime * 60);
    
    // Salvar sessão se houve progresso
    if (sessions > 0 || completedCycles > 0) {
      const endTime = new Date().toISOString();
      const totalSessionTime = sessionStartTime ? 
        new Date(endTime).getTime() - new Date(sessionStartTime).getTime() : 0;
      const totalPauseTime = pauseDurations.reduce((sum, duration) => sum + duration, 0);
      const netStudyTime = Math.max(0, totalSessionTime - totalPauseTime);
      
      const newSession: PomodoroSession = {
        id: `${Date.now()}-${Math.random()}`,
        date: new Date().toISOString(),
        completedCycles,
        totalMinutes: Math.round(totalSessionTime / (1000 * 60)),
        workSessions: sessions,
        startTime: sessionStartTime || new Date().toISOString(),
        endTime,
        pauseTime: pauseStartTime || undefined,
        netStudyTime: Math.round(netStudyTime / (1000 * 60)),
        pauseDurations,
      };

      await addPomodoroSession(newSession);
    }
    
    setSessions(0);
    setCompletedCycles(0);
    setSessionStartTime(null);
    setPauseStartTime(null);
    setPauseDurations([]);
  };

  const handleAdvancedSettings = () => {
    setShowSettings(true);
  };

  const updateAdvancedSetting = async (key: keyof PomodoroSettings, value: number) => {
    const newSettings = { ...pomodoroSettings, [key]: value };
    await updatePomodoroSettings(newSettings);
    
    // Atualizar timer se necessário
    if (key === 'workTime' && isWork && !isRunning) {
      setTime(value * 60);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (): string => {
    if (isWork) return '#EF4444';
    return sessions % pomodoroSettings.sessionsUntilLongBreak === 0 ? '#10B981' : '#F59E0B';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (showSettings) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowSettings(false)}>
            <Text style={styles.backButton}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Configurações Pomodoro</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <ScrollView style={styles.settingsContainer}>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Tempo de Foco (minutos)</Text>
            <TextInput
              style={styles.settingInput}
              value={pomodoroSettings.workTime.toString()}
              onChangeText={(text) => {
                const value = parseInt(text) || 1;
                if (value >= 1 && value <= 120) {
                  updateAdvancedSetting('workTime', value);
                }
              }}
              keyboardType="numeric"
              placeholder="25"
              placeholderTextColor="#6B7280"
            />
            <Text style={styles.settingHint}>Entre 1 e 120 minutos</Text>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Pausa Curta (minutos)</Text>
            <TextInput
              style={styles.settingInput}
              value={pomodoroSettings.breakTime.toString()}
              onChangeText={(text) => {
                const value = parseInt(text) || 1;
                if (value >= 1 && value <= 60) {
                  updateAdvancedSetting('breakTime', value);
                }
              }}
              keyboardType="numeric"
              placeholder="5"
              placeholderTextColor="#6B7280"
            />
            <Text style={styles.settingHint}>Entre 1 e 60 minutos</Text>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Pausa Longa (minutos)</Text>
            <TextInput
              style={styles.settingInput}
              value={pomodoroSettings.longBreakTime.toString()}
              onChangeText={(text) => {
                const value = parseInt(text) || 1;
                if (value >= 1 && value <= 120) {
                  updateAdvancedSetting('longBreakTime', value);
                }
              }}
              keyboardType="numeric"
              placeholder="15"
              placeholderTextColor="#6B7280"
            />
            <Text style={styles.settingHint}>Entre 1 e 120 minutos</Text>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Sessões até Pausa Longa</Text>
            <TextInput
              style={styles.settingInput}
              value={pomodoroSettings.sessionsUntilLongBreak.toString()}
              onChangeText={(text) => {
                const value = parseInt(text) || 1;
                if (value >= 1 && value <= 10) {
                  updateAdvancedSetting('sessionsUntilLongBreak', value);
                }
              }}
              keyboardType="numeric"
              placeholder="4"
              placeholderTextColor="#6B7280"
            />
            <Text style={styles.settingHint}>Entre 1 e 10 sessões</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (showHistory) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowHistory(false)}>
            <Text style={styles.backButton}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Histórico Pomodoro</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <ScrollView style={styles.historyContainer}>
          {pomodoroHistory.length === 0 ? (
            <View style={styles.emptyHistory}>
              <History size={48} color="#6B7280" />
              <Text style={styles.emptyHistoryText}>Nenhuma sessão registrada</Text>
            </View>
          ) : (
            pomodoroHistory.slice().reverse().map(session => (
              <View key={session.id} style={styles.historyItem}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyDate}>{formatDateTime(session.startTime)}</Text>
                  <Text style={styles.historyTime}>
                    {session.netStudyTime || session.totalMinutes}min líquido
                  </Text>
                </View>
                <View style={styles.historyStats}>
                  <View style={styles.historyStatRow}>
                    <Text style={styles.historyStat}>
                      {session.completedCycles} ciclos • {session.workSessions} sessões
                    </Text>
                  </View>
                  {session.endTime && (
                    <View style={styles.historyStatRow}>
                      <Clock size={12} color="#9CA3AF" />
                      <Text style={styles.historyStatSmall}>
                        {new Date(session.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(session.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  )}
                  {session.pauseDurations && session.pauseDurations.length > 0 && (
                    <Text style={styles.historyStatSmall}>
                      {session.pauseDurations.length} pausa(s) • {Math.round(session.pauseDurations.reduce((sum, duration) => sum + duration, 0) / (1000 * 60))}min pausado
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pomodoro</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => setShowHistory(true)}>
            <History size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleAdvancedSettings}>
            <Settings size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={[styles.timerContainer, { borderColor: getTimerColor() }]}>
        <Text style={[styles.timer, { color: getTimerColor() }]}>
          {formatTime(time)}
        </Text>
        <Text style={styles.phase}>
          {isWork ? 'Foco' : sessions % pomodoroSettings.sessionsUntilLongBreak === 0 ? 'Pausa Longa' : 'Pausa'}
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, styles.resetButton]}
          onPress={resetTimer}
        >
          <RotateCcw size={18} color="#9CA3AF" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.playButton, { backgroundColor: getTimerColor() }]}
          onPress={toggleTimer}
        >
          {isRunning ? (
            <Pause size={20} color="#FFFFFF" />
          ) : (
            <Play size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{completedCycles}</Text>
          <Text style={styles.statLabel}>Ciclos</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{sessions}</Text>
          <Text style={styles.statLabel}>Sessões</Text>
        </View>
        {sessionStartTime && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {Math.round((Date.now() - new Date(sessionStartTime).getTime()) / (1000 * 60))}
            </Text>
            <Text style={styles.statLabel}>Min Total</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  backButton: {
    fontSize: 14,
    color: '#60A5FA',
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    marginBottom: 16,
  },
  timer: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  phase: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  resetButton: {
    backgroundColor: '#374151',
  },
  stats: {
    flexDirection: 'row',
    gap: 24,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  historyContainer: {
    width: '100%',
    maxHeight: 300,
  },
  emptyHistory: {
    alignItems: 'center',
    padding: 40,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
  },
  historyItem: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  historyTime: {
    fontSize: 14,
    color: '#60A5FA',
    fontWeight: '600',
  },
  historyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyStat: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  historyStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyStatSmall: {
    fontSize: 12,
    color: '#6B7280',
  },
  settingsContainer: {
    width: '100%',
    maxHeight: 400,
  },
  settingItem: {
    marginBottom: 24,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  settingInput: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 8,
  },
  settingHint: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});