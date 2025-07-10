import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Subject, Topic } from '@/utils/storage';
import { useAppContext } from '@/contexts/AppContext';

export default function SubjectParser() {
  const { addSubjects } = useAppContext();
  const [input, setInput] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  const parseInput = (text: string): Subject[] => {
    const subjects: Subject[] = [];
    const subjectBlocks = text.split(';').filter(block => block.trim());

    subjectBlocks.forEach(block => {
      const parts = block.split(':');
      if (parts.length === 2) {
        const subjectName = parts[0].trim();
        const topicsText = parts[1].trim();
        
        if (subjectName && topicsText) {
          const topicNames = topicsText.split(',').map(t => t.trim()).filter(t => t);
          
          const topics: Topic[] = topicNames.map(name => ({
            id: `${Date.now()}-${Math.random()}`,
            name,
            subjectId: '',
            totalQuestions: 0,
            correctAnswers: 0,
            studyTime: 0,
            color: '#6B7280',
          }));

          const subject: Subject = {
            id: `${Date.now()}-${Math.random()}`,
            name: subjectName,
            topics: [],
          };

          topics.forEach(topic => {
            topic.subjectId = subject.id;
          });

          subject.topics = topics;
          subjects.push(subject);
        }
      }
    });

    return subjects;
  };

  const handleSave = async () => {
    if (!input.trim()) {
      Alert.alert('Erro', 'Digite o conteúdo no formato correto');
      return;
    }

    try {
      const newSubjects = parseInput(input);
      if (newSubjects.length === 0) {
        Alert.alert('Erro', 'Formato inválido. Use: MATÉRIA:TÓPICO,TÓPICO;MATÉRIA:TÓPICO');
        return;
      }

      const existingSubjects = await StorageService.getSubjects();
      await addSubjects(newSubjects);
      
      setInput('');
      setIsVisible(false);
      
      Alert.alert('Sucesso', `${newSubjects.length} matéria(s) adicionada(s) com sucesso!`);
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao salvar as matérias');
    }
  };

  if (!isVisible) {
    return (
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setIsVisible(true)}
      >
        <Plus size={20} color="#60A5FA" />
        <Text style={styles.addButtonText}>Adicionar Matérias</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Adicionar Matérias e Tópicos</Text>
      <Text style={styles.subtitle}>
        Formato: MATÉRIA:TÓPICO,TÓPICO;MATÉRIA:TÓPICO
      </Text>
      
      <TextInput
        style={styles.input}
        placeholder="Ex: Matemática:Álgebra,Geometria;Português:Gramática,Literatura"
        placeholderTextColor="#6B7280"
        value={input}
        onChangeText={setInput}
        multiline
        numberOfLines={4}
      />
      
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => {
            setInput('');
            setIsVisible(false);
          }}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Salvar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: '#60A5FA',
    borderStyle: 'dashed',
  },
  addButtonText: {
    color: '#60A5FA',
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
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