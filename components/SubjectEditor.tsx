import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { CreditCard as Edit, Trash2, Plus, Save, X } from 'lucide-react-native';
import { Subject, Topic } from '@/utils/storage';
import { useAppContext } from '@/contexts/AppContext';

interface SubjectEditorProps {
  onClose: () => void;
}

export default function SubjectEditor({ onClose }: SubjectEditorProps) {
  const { subjects, updateSubjects } = useAppContext();
  const [editingSubjects, setEditingSubjects] = useState<Subject[]>(
    subjects.map(subject => ({
      ...subject,
      topics: [...subject.topics]
    }))
  );

  const updateSubjectName = (subjectId: string, newName: string) => {
    setEditingSubjects(prev => 
      prev.map(subject => 
        subject.id === subjectId 
          ? { ...subject, name: newName }
          : subject
      )
    );
  };

  const updateTopicName = (subjectId: string, topicId: string, newName: string) => {
    setEditingSubjects(prev => 
      prev.map(subject => 
        subject.id === subjectId 
          ? {
              ...subject,
              topics: subject.topics.map(topic =>
                topic.id === topicId
                  ? { ...topic, name: newName }
                  : topic
              )
            }
          : subject
      )
    );
  };

  const addTopic = (subjectId: string) => {
    const newTopic: Topic = {
      id: `${Date.now()}-${Math.random()}`,
      name: 'Novo Tópico',
      subjectId,
      totalQuestions: 0,
      correctAnswers: 0,
      studyTime: 0,
      color: '#6B7280',
    };

    setEditingSubjects(prev => 
      prev.map(subject => 
        subject.id === subjectId 
          ? { ...subject, topics: [...subject.topics, newTopic] }
          : subject
      )
    );
  };

  const removeTopic = (subjectId: string, topicId: string) => {
    Alert.alert(
      'Remover Tópico',
      'Tem certeza? Todos os dados de estudo deste tópico serão perdidos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            setEditingSubjects(prev => 
              prev.map(subject => 
                subject.id === subjectId 
                  ? {
                      ...subject,
                      topics: subject.topics.filter(topic => topic.id !== topicId)
                    }
                  : subject
              )
            );
          },
        },
      ]
    );
  };

  const removeSubject = (subjectId: string) => {
    Alert.alert(
      'Remover Matéria',
      'Tem certeza? Todos os dados desta matéria serão perdidos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            setEditingSubjects(prev => prev.filter(subject => subject.id !== subjectId));
          },
        },
      ]
    );
  };

  const saveChanges = async () => {
    try {
      // Validar se todos os nomes estão preenchidos
      for (const subject of editingSubjects) {
        if (!subject.name.trim()) {
          Alert.alert('Erro', 'Todos os nomes de matérias devem estar preenchidos');
          return;
        }
        
        for (const topic of subject.topics) {
          if (!topic.name.trim()) {
            Alert.alert('Erro', 'Todos os nomes de tópicos devem estar preenchidos');
            return;
          }
        }
      }

      await updateSubjects(editingSubjects);
      onClose();
      Alert.alert('Sucesso', 'Alterações salvas com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Erro ao salvar alterações');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Editar Matérias</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.saveButton} onPress={saveChanges}>
            <Save size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {editingSubjects.map(subject => (
          <View key={subject.id} style={styles.subjectCard}>
            <View style={styles.subjectHeader}>
              <TextInput
                style={styles.subjectNameInput}
                value={subject.name}
                onChangeText={(text) => updateSubjectName(subject.id, text)}
                placeholder="Nome da matéria"
                placeholderTextColor="#6B7280"
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeSubject(subject.id)}
              >
                <Trash2 size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <View style={styles.topicsContainer}>
              <View style={styles.topicsHeader}>
                <Text style={styles.topicsTitle}>Tópicos</Text>
                <TouchableOpacity
                  style={styles.addTopicButton}
                  onPress={() => addTopic(subject.id)}
                >
                  <Plus size={16} color="#60A5FA" />
                </TouchableOpacity>
              </View>

              {subject.topics.map(topic => (
                <View key={topic.id} style={styles.topicRow}>
                  <TextInput
                    style={styles.topicNameInput}
                    value={topic.name}
                    onChangeText={(text) => updateTopicName(subject.id, topic.id, text)}
                    placeholder="Nome do tópico"
                    placeholderTextColor="#6B7280"
                  />
                  <TouchableOpacity
                    style={styles.removeTopicButton}
                    onPress={() => removeTopic(subject.id, topic.id)}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}

              {subject.topics.length === 0 && (
                <Text style={styles.noTopicsText}>
                  Nenhum tópico. Toque em + para adicionar.
                </Text>
              )}
            </View>
          </View>
        ))}

        {editingSubjects.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Nenhuma matéria para editar
            </Text>
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
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#10B981',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    backgroundColor: '#6B7280',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  subjectCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  subjectNameInput: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    padding: 8,
  },
  topicsContainer: {
    gap: 12,
  },
  topicsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topicsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addTopicButton: {
    backgroundColor: '#374151',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topicNameInput: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  removeTopicButton: {
    padding: 6,
  },
  noTopicsText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});