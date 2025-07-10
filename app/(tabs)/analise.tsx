import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { ChartBar as BarChart3, Calendar, TrendingUp, Clock, Target, Filter } from 'lucide-react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Subject, StudySession, Exam } from '@/utils/storage';
import { useAppContext } from '@/contexts/AppContext';

const screenWidth = Dimensions.get('window').width;

interface AnalyticsData {
  totalStudyTime: number;
  totalQuestions: number;
  totalCorrect: number;
  averagePerformance: number;
  subjectPerformance: { [subjectId: string]: { correct: number; total: number; time: number } };
  weeklyStudyTime: number[];
  performanceOverTime: { date: string; percentage: number }[];
}

interface SubjectPerformanceData {
  subjectId: string;
  name: string;
  data: { date: string; percentage: number }[];
}
export default function Analise() {
  const { subjects, studySessions, exams } = useAppContext();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalStudyTime: 0,
    totalQuestions: 0,
    totalCorrect: 0,
    averagePerformance: 0,
    subjectPerformance: {},
    weeklyStudyTime: [],
    performanceOverTime: [],
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('month');
  const [showSubjectPerformance, setShowSubjectPerformance] = useState(false);
  const [selectedSubjectForChart, setSelectedSubjectForChart] = useState<string | null>(null);
  const [subjectPerformanceData, setSubjectPerformanceData] = useState<SubjectPerformanceData[]>([]);
  const [performancePeriod, setPerformancePeriod] = useState<'7days' | '1month' | '3months' | '1year'>('1month');

  useEffect(() => {
    if (subjects.length > 0) {
      loadAnalytics();
    }
  }, [selectedPeriod, subjects, studySessions, exams]);

  const loadAnalytics = async () => {
    const now = new Date();
    const periodStart = getPeriodStart(now, selectedPeriod);
    
    const filteredSessions = studySessions.filter(session => 
      new Date(session.date) >= periodStart
    );
    
    const filteredExams = exams.filter(exam => 
      new Date(exam.date) >= periodStart
    );

    const totalStudyTime = filteredSessions.reduce((sum, session) => sum + session.duration, 0);
    const totalQuestions = filteredSessions.reduce((sum, session) => sum + session.questions, 0);
    const totalCorrect = filteredSessions.reduce((sum, session) => sum + session.correctAnswers, 0);
    const averagePerformance = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    // Performance por matéria
    const subjectPerformance: { [subjectId: string]: { correct: number; total: number; time: number } } = {};
    
    filteredSessions.forEach(session => {
      const topic = subjects.flatMap(s => s.topics).find(t => t.id === session.topicId);
      if (topic) {
        if (!subjectPerformance[topic.subjectId]) {
          subjectPerformance[topic.subjectId] = { correct: 0, total: 0, time: 0 };
        }
        subjectPerformance[topic.subjectId].correct += session.correctAnswers;
        subjectPerformance[topic.subjectId].total += session.questions;
        subjectPerformance[topic.subjectId].time += session.duration;
      }
    });

    // Adicionar dados dos simulados
    filteredExams.forEach(exam => {
      Object.entries(exam.results).forEach(([subjectId, result]) => {
        if (!subjectPerformance[subjectId]) {
          subjectPerformance[subjectId] = { correct: 0, total: 0, time: 0 };
        }
        subjectPerformance[subjectId].correct += result.correct;
        subjectPerformance[subjectId].total += result.total;
      });
    });

    // Tempo de estudo semanal
    const weeklyStudyTime = getWeeklyStudyTime(filteredSessions);
    
    // Performance ao longo do tempo
    const performanceOverTime = getPerformanceOverTime(filteredSessions, filteredExams);
    
    // Calcular performance por matéria ao longo do tempo
    const subjectPerformanceData = calculateSubjectPerformanceOverTime(filteredSessions, filteredExams, subjects);

    setAnalytics({
      totalStudyTime,
      totalQuestions,
      totalCorrect,
      averagePerformance,
      subjectPerformance,
      weeklyStudyTime,
      performanceOverTime,
    });
    
    setSubjectPerformanceData(subjectPerformanceData);
  };

  const calculateSubjectPerformanceOverTime = (
    sessions: StudySession[], 
    exams: Exam[], 
    subjects: Subject[]
  ): SubjectPerformanceData[] => {
    const subjectData: { [subjectId: string]: { [date: string]: { correct: number; total: number } } } = {};
    
    // Processar sessões de estudo
    sessions.forEach(session => {
      const topic = subjects.flatMap(s => s.topics).find(t => t.id === session.topicId);
      if (topic) {
        const date = new Date(session.date).toISOString().split('T')[0];
        if (!subjectData[topic.subjectId]) {
          subjectData[topic.subjectId] = {};
        }
        if (!subjectData[topic.subjectId][date]) {
          subjectData[topic.subjectId][date] = { correct: 0, total: 0 };
        }
        subjectData[topic.subjectId][date].correct += session.correctAnswers;
        subjectData[topic.subjectId][date].total += session.questions;
      }
    });
    
    // Processar simulados
    exams.forEach(exam => {
      const date = new Date(exam.date).toISOString().split('T')[0];
      Object.entries(exam.results).forEach(([subjectId, result]) => {
        if (!subjectData[subjectId]) {
          subjectData[subjectId] = {};
        }
        if (!subjectData[subjectId][date]) {
          subjectData[subjectId][date] = { correct: 0, total: 0 };
        }
        subjectData[subjectId][date].correct += result.correct;
        subjectData[subjectId][date].total += result.total;
      });
    });
    
    // Converter para formato do gráfico
    return subjects.map(subject => ({
      subjectId: subject.id,
      name: subject.name,
      data: Object.entries(subjectData[subject.id] || {})
        .map(([date, data]) => ({
          date,
          percentage: data.total > 0 ? (data.correct / data.total) * 100 : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .filter(point => {
          const pointDate = new Date(point.date);
          const periodStart = getPeriodStartForPerformance();
          return pointDate >= periodStart;
        }),
    })).filter(subject => subject.data.length > 0);
  };
  
  const getDataPointsForPeriod = (): number => {
    switch (performancePeriod) {
      case '7days': return 7;
      case '1month': return 30;
      case '3months': return 90;
      case '1year': return 365;
      default: return 30;
    }
  };
  
  const getPeriodStartForPerformance = (): Date => {
    const now = new Date();
    const start = new Date(now);
    switch (performancePeriod) {
      case '7days':
        start.setDate(now.getDate() - 7);
        break;
      case '1month':
        start.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        start.setMonth(now.getMonth() - 3);
        break;
      case '1year':
        start.setFullYear(now.getFullYear() - 1);
        break;
    }
    return start;
  };
  const getPeriodStart = (now: Date, period: 'week' | 'month' | 'all'): Date => {
    const start = new Date(now);
    switch (period) {
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'all':
        start.setFullYear(2020);
        break;
    }
    return start;
  };

  const getWeeklyStudyTime = (sessions: StudySession[]): number[] => {
    const weeks = Array(7).fill(0);
    const now = new Date();
    
    sessions.forEach(session => {
      const sessionDate = new Date(session.date);
      const daysDiff = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.floor(daysDiff / 7);
      
      if (weekIndex >= 0 && weekIndex < 7) {
        weeks[6 - weekIndex] += session.duration;
      }
    });
    
    return weeks;
  };

  const getPerformanceOverTime = (sessions: StudySession[], exams: Exam[]): { date: string; percentage: number }[] => {
    const dataPoints: { [date: string]: { correct: number; total: number } } = {};
    
    sessions.forEach(session => {
      const date = new Date(session.date).toISOString().split('T')[0];
      if (!dataPoints[date]) {
        dataPoints[date] = { correct: 0, total: 0 };
      }
      dataPoints[date].correct += session.correctAnswers;
      dataPoints[date].total += session.questions;
    });
    
    exams.forEach(exam => {
      const date = new Date(exam.date).toISOString().split('T')[0];
      const examCorrect = Object.values(exam.results).reduce((sum, result) => sum + result.correct, 0);
      const examTotal = Object.values(exam.results).reduce((sum, result) => sum + result.total, 0);
      
      if (!dataPoints[date]) {
        dataPoints[date] = { correct: 0, total: 0 };
      }
      dataPoints[date].correct += examCorrect;
      dataPoints[date].total += examTotal;
    });
    
    return Object.entries(dataPoints)
      .map(([date, data]) => ({
        date,
        percentage: data.total > 0 ? (data.correct / data.total) * 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Últimos 30 pontos
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}min`;
    }
    return `${remainingMinutes}min`;
  };

  const getPerformanceColor = (percentage: number): string => {
    if (percentage >= 80) return '#10B981';
    if (percentage >= 60) return '#F59E0B';
    if (percentage >= 40) return '#F97316';
    return '#EF4444';
  };

  const renderSubjectPerformanceChart = () => {
    if (!selectedSubjectForChart) return null;
    
    const subjectData = subjectPerformanceData.find(s => s.subjectId === selectedSubjectForChart);
    if (!subjectData || subjectData.data.length === 0) return null;
    
    const periodStart = getPeriodStartForPerformance();
    const filteredData = subjectData.data.filter(point => 
      new Date(point.date) >= periodStart
    );
    
    if (filteredData.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>
              Performance: {subjectData.name}
            </Text>
            <TouchableOpacity
              style={styles.closeChartButton}
              onPress={() => setSelectedSubjectForChart(null)}
            >
              <Text style={styles.closeChartText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.noDataText}>
            Sem dados para o período selecionado
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>
            Performance: {subjectData.name}
          </Text>
          <TouchableOpacity
            style={styles.closeChartButton}
            onPress={() => setSelectedSubjectForChart(null)}
          >
            <Text style={styles.closeChartText}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.periodSelector}>
          {(['7days', '1month', '3months', '1year'] as const).map(period => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                performancePeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => setPerformancePeriod(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  performancePeriod === period && styles.periodButtonTextActive,
                ]}
              >
                {period === '7days' ? '7d' : 
                 period === '1month' ? '1m' : 
                 period === '3months' ? '3m' : '1a'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={{
              labels: filteredData
                .filter((_, index) => index % Math.max(1, Math.ceil(filteredData.length / 6)) === 0)
                .map(point => new Date(point.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })),
              datasets: [
                {
                  data: filteredData
                    .filter((_, index) => index % Math.max(1, Math.ceil(filteredData.length / 6)) === 0)
                    .map(point => point.percentage),
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                  strokeWidth: 3,
                },
              ],
            }}
            width={Math.max(screenWidth - 40, 300)}
            height={200}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
            }}
            style={styles.chart}
            bezier
          />
        </ScrollView>
      </View>
    );
  };
  const chartConfig = {
    backgroundGradientFrom: '#1F2937',
    backgroundGradientTo: '#1F2937',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(96, 165, 250, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForLabels: {
      fontSize: 10,
    },
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Análise</Text>
        <View style={styles.periodSelector}>
          {(['week', 'month', 'all'] as const).map(period => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive,
                ]}
              >
                {period === 'week' ? '7d' : period === 'month' ? '30d' : 'Tudo'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.content}>
        {/* Estatísticas Gerais */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Clock size={20} color="#60A5FA" />
            <Text style={styles.statValue}>{formatTime(analytics.totalStudyTime)}</Text>
            <Text style={styles.statLabel}>Tempo Total</Text>
          </View>
          
          <View style={styles.statCard}>
            <Target size={20} color="#10B981" />
            <Text style={styles.statValue}>{analytics.totalQuestions}</Text>
            <Text style={styles.statLabel}>Questões</Text>
          </View>
          
          <View style={styles.statCard}>
            <TrendingUp size={20} color="#F59E0B" />
            <Text style={[styles.statValue, { color: getPerformanceColor(analytics.averagePerformance) }]}>
              {analytics.averagePerformance.toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>Média</Text>
          </View>
        </View>

        {/* Gráfico de Tempo Semanal */}
        {analytics.weeklyStudyTime.some(time => time > 0) && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Tempo de Estudo Semanal</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={{
                  labels: ['6s', '5s', '4s', '3s', '2s', '1s', 'Hoje'],
                  datasets: [
                    {
                      data: analytics.weeklyStudyTime,
                    },
                  ],
                }}
                width={Math.max(screenWidth - 40, 300)}
                height={200}
                chartConfig={chartConfig}
                style={styles.chart}
              />
            </ScrollView>
          </View>
        )}

        {/* Gráfico de Performance */}
        {analytics.performanceOverTime.length > 1 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Performance ao Longo do Tempo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <LineChart
                data={{
                  labels: analytics.performanceOverTime
                    .filter((_, index) => index % Math.ceil(analytics.performanceOverTime.length / 6) === 0)
                    .map(point => new Date(point.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })),
                  datasets: [
                    {
                      data: analytics.performanceOverTime
                        .filter((_, index) => index % Math.ceil(analytics.performanceOverTime.length / 6) === 0)
                        .map(point => point.percentage),
                    },
                  ],
                }}
                width={Math.max(screenWidth - 40, 300)}
                height={200}
                chartConfig={chartConfig}
                style={styles.chart}
              />
            </ScrollView>
          </View>
        )}

        {/* Performance por Matéria */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance por Matéria</Text>
          
          {/* Botão para mostrar gráfico de performance */}
          <TouchableOpacity
            style={styles.showPerformanceButton}
            onPress={() => setShowSubjectPerformance(!showSubjectPerformance)}
          >
            <Filter size={16} color="#60A5FA" />
            <Text style={styles.showPerformanceText}>
              {showSubjectPerformance ? 'Ocultar' : 'Ver'} Gráfico por Matéria
            </Text>
          </TouchableOpacity>
          
          {showSubjectPerformance && (
            <View style={styles.subjectChartSelector}>
              <Text style={styles.selectorTitle}>Selecione uma matéria:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.subjectButtons}>
                  {subjectPerformanceData.map(subject => (
                    <TouchableOpacity
                      key={subject.subjectId}
                      style={[
                        styles.subjectButton,
                        selectedSubjectForChart === subject.subjectId && styles.subjectButtonActive
                      ]}
                      onPress={() => setSelectedSubjectForChart(subject.subjectId)}
                    >
                      <Text style={[
                        styles.subjectButtonText,
                        selectedSubjectForChart === subject.subjectId && styles.subjectButtonTextActive
                      ]}>
                        {subject.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
          
          {renderSubjectPerformanceChart()}
          
          <View style={styles.subjectsList}>
            {Object.entries(analytics.subjectPerformance).map(([subjectId, data]) => {
              const subject = subjects.find(s => s.id === subjectId);
              const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;
              const color = getPerformanceColor(percentage);
              
              return (
                <View key={subjectId} style={styles.subjectCard}>
                  <View style={styles.subjectHeader}>
                    <Text style={styles.subjectName} numberOfLines={1}>
                      {subject?.name || 'Matéria desconhecida'}
                    </Text>
                    <Text style={[styles.subjectPercentage, { color }]}>
                      {percentage.toFixed(1)}%
                    </Text>
                  </View>
                  
                  <View style={styles.subjectStats}>
                    <View style={styles.subjectStat}>
                      <Text style={styles.subjectStatLabel}>Tempo</Text>
                      <Text style={styles.subjectStatValue}>{formatTime(data.time)}</Text>
                    </View>
                    
                    <View style={styles.subjectStat}>
                      <Text style={styles.subjectStatLabel}>Questões</Text>
                      <Text style={styles.subjectStatValue}>{data.total}</Text>
                    </View>
                    
                    <View style={styles.subjectStat}>
                      <Text style={styles.subjectStatLabel}>Acertos</Text>
                      <Text style={styles.subjectStatValue}>{data.correct}</Text>
                    </View>
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
              );
            })}
          </View>
        </View>
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
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 2,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#60A5FA',
  },
  periodButtonText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minHeight: 80,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 6,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  subjectsList: {
    gap: 16,
  },
  subjectCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  subjectPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  subjectStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subjectStat: {
    alignItems: 'center',
  },
  subjectStatLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  subjectStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  showPerformanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  showPerformanceText: {
    color: '#60A5FA',
    fontSize: 14,
    fontWeight: '600',
  },
  subjectChartSelector: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  selectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  subjectButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  subjectButton: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  subjectButtonActive: {
    backgroundColor: '#10B981',
  },
  subjectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  subjectButtonTextActive: {
    fontWeight: '600',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeChartButton: {
    backgroundColor: '#374151',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeChartText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noDataText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
});