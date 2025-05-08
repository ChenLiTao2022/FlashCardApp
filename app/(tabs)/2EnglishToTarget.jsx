import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import * as SQLite from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const db = SQLite.openDatabaseSync('mydb.db');

function DuoClone() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [cards, setCards] = useState([]);
  // currentQuestion: { prompt, answer, imageUrl }
  const [currentQuestion, setCurrentQuestion] = useState(null);
  
  // For manual mode:
  const [userAnswer, setUserAnswer] = useState('');
  // For word bank mode:
  const [wordBank, setWordBank] = useState([]);
  const [selectedWords, setSelectedWords] = useState([]);
  // Track if the answer uses spaces or not.
  const [isSpaceSeparated, setIsSpaceSeparated] = useState(true);
  // Input mode: 'manual' or 'wordBank'
  const [inputMethod, setInputMethod] = useState('manual');

  const router = useRouter();

  // On mount, load all non-system tables from SQLite.
  useEffect(() => {
    const result = db.getAllSync(`
      SELECT name 
      FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
    `);
    setTables(result);
  }, []);

  // When a table is selected, load its cards and generate the first question.
  function selectTable(tableName) {
    setSelectedTable(tableName);
    const items = db.getAllSync(`SELECT * FROM ${tableName}`);
    if (items.length === 0) {
      Alert.alert('No cards found', 'Please choose a table with at least one flashcard.');
      return;
    }
    setCards(items);
    generateQuestion(items);
  }

  // Utility: Shuffle an array using the Fisher-Yates algorithm.
  function shuffleArray(array) {
    let newArr = array.slice();
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  }

  // Generate a new question from the provided card items.
  // We use examples: prompt = examples.meaning, answer = examples.sentence.
  // Also include the card's imageUrl.
  function generateQuestion(items) {
    const card = items[Math.floor(Math.random() * items.length)];
    let prompt = '';
    let answer = '';

    if (card.examples) {
      try {
        const examples = JSON.parse(card.examples);
        if (Array.isArray(examples) && examples.length > 0) {
          const chosen = examples[Math.floor(Math.random() * examples.length)];
          prompt = chosen.meaning || card.back;
          answer = chosen.sentence || card.front;
        } else {
          prompt = card.back;
          answer = card.front;
        }
      } catch (error) {
        prompt = card.back;
        answer = card.front;
      }
    } else {
      prompt = card.back;
      answer = card.front;
    }

    setCurrentQuestion({ prompt, answer, imageUrl: card.imageUrl });
    // Prepare answer for word bank mode.
    const raw = answer.trim();
    let words = [];
    
    // Check if the language uses spaces
    const language = card.language || 'English';
    const usesSpaces = !isSpaceFreeLanguage(language);
    
    if (raw.includes(' ') && usesSpaces) {
      words = raw.split(' ');
      setIsSpaceSeparated(true);
    } else {
      words = raw.split('');
      setIsSpaceSeparated(false);
    }
    // Regardless of input mode, reset both methods.
    setWordBank(shuffleArray(words));
    setSelectedWords([]);
    setUserAnswer('');
  }

  // Helper: Determines whether a word is punctuation.
  function isPunctuation(word) {
    // Comprehensive regex for Western and Asian punctuation characters
    return /^[\s.,!?;:"()[\]{}，。！？；：""''「」『』【】《》〈〉（）]+$/.test(word);
  }


  // When a user taps a word in the selected words, remove it and return it to the word bank.
  function handleDeselectWord(word, index) {
    const newSelected = [...selectedWords];
    newSelected.splice(index, 1);
    setSelectedWords(newSelected);
    setWordBank(prev => [...prev, word]);
  }

  // When a user taps a word in the word bank:
  // remove it from the bank, add it to selected words, and speak it if it's not punctuation.
  function handleSelectWord(word, index) {
    const newBank = [...wordBank];
    newBank.splice(index, 1);
    setWordBank(newBank);
    setSelectedWords(prev => [...prev, word]);
    if (!isPunctuation(word)) {
      const language = currentQuestion?.language || 'English';
      Speech.speak(word, { language: language === 'Chinese' ? 'zh-CN' : 'en-US' });
    }
  }

  // Check if the user's answer is correct.
  function handleCheck() {
    let finalAnswer = '';
    if (inputMethod === 'manual') {
      finalAnswer = userAnswer.trim();
    } else {
      finalAnswer = isSpaceSeparated
        ? selectedWords.join(' ')
        : selectedWords.join('');
      finalAnswer = finalAnswer.trim();
    }
    const correct = isSpaceSeparated
      ? currentQuestion.answer.trim()
      : currentQuestion.answer.replace(/\s+/g, '');
    if (finalAnswer === correct) {
      Alert.alert('Correct!', 'Great job!');
      generateQuestion(cards);
    } else {
      Alert.alert('Incorrect', `Your answer: ${finalAnswer}\nCorrect: ${correct}`);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!selectedTable ? (
        <View style={styles.tableContainer}>
          <Text style={styles.header}>Select a Table</Text>
          {tables.map((table, index) => (
            <TouchableOpacity
              key={index}
              style={styles.tableButton}
              onPress={() => selectTable(table.name)}
            >
              <Text style={styles.tableButtonText}>{table.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.header}>Duolingo Clone Exercise</Text>
          {currentQuestion && (
            <View style={styles.questionContainer}>
              <Text style={styles.promptLabel}>Translate this sentence:</Text>
              {currentQuestion.imageUrl ? (
                <Image
                  source={{ uri: currentQuestion.imageUrl }}
                  style={styles.questionImage}
                  resizeMode="contain"
                />
              ) : null}
              <Text style={styles.sentence}>{currentQuestion.prompt}</Text>
            </View>
          )}

          {/* Toggle Input Method */}
          <View style={styles.toggleContainer}>
            {inputMethod === 'manual' ? (
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setInputMethod('wordBank')}
              >
                <Text style={styles.toggleButtonText}>Switch to Word Bank</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setInputMethod('manual')}
              >
                <Text style={styles.toggleButtonText}>Switch to Manual Input</Text>
              </TouchableOpacity>
            )}
          </View>

          {inputMethod === 'manual' ? (
            <TextInput
              style={styles.input}
              placeholder="Type your answer"
              value={userAnswer}
              onChangeText={setUserAnswer}
              placeholderTextColor="#888"
            />
          ) : (
            <>
              {/* Display selected words (the answer being built) */}
              <View style={styles.selectedWordsContainer}>
                {selectedWords.map((word, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.selectedWordButton}
                    onPress={() => handleDeselectWord(word, idx)}
                  >
                    <Text style={styles.selectedWordText}>{word}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Word Bank: Display remaining words */}
              <View style={styles.wordBankContainer}>
                {wordBank.map((word, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.wordButton}
                    onPress={() => handleSelectWord(word, idx)}
                  >
                    <Text style={styles.wordText}>{word}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCheck}>
              <Text style={styles.actionButtonText}>Check</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => generateQuestion(cards)}>
              <Text style={styles.actionButtonText}>New Question</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => setSelectedTable(null)}>
              <Text style={styles.actionButtonText}>Back to Tables</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 50,
    flexGrow: 1,
    backgroundColor: '#F9F9F9',
    alignItems: 'center',
  },
  tableContainer: {
    alignItems: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  tableButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 12,
    width: 250,
    alignItems: 'center',
  },
  tableButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  questionContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 20,
    width: '90%',
    alignItems: 'center',
  },
  promptLabel: {
    fontSize: 18,
    color: '#555',
    marginBottom: 10,
    textAlign: 'center',
  },
  questionImage: {
    width: 200,
    height: 200,
    marginBottom: 12,
    borderRadius: 10,
  },
  sentence: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
  },
  toggleContainer: {
    marginVertical: 10,
  },
  toggleButton: {
    backgroundColor: '#8E44AD',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    width: '90%',
    padding: 12,
    marginBottom: 20,
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 18,
    color: '#333',
  },
  selectedWordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    minHeight: 50,
    marginBottom: 20,
    justifyContent: 'center',
  },
  selectedWordButton: {
    backgroundColor: '#27AE60',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    margin: 4,
  },
  selectedWordText: {
    fontSize: 18,
    color: '#fff',
  },
  wordBankContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    justifyContent: 'center',
  },
  wordButton: {
    backgroundColor: '#F1C40F',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    margin: 4,
  },
  wordText: {
    fontSize: 18,
    color: '#fff',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '90%',
    marginVertical: 20,
  },
  actionButton: {
    backgroundColor: '#27AE60',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 5,
    flex: 1,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default DuoClone;
