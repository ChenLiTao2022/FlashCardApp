import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function ListenResponse({ dueCards, onAnswer, showResult }) {
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedExample, setSelectedExample] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState(null);
  const [answered, setAnswered] = useState(false);
  
  const audioRef = useRef(null);

  // Initialize and select a random card and example
  useEffect(() => {
    if (!dueCards || dueCards.length === 0) return;
    
    const init = async () => {
      setLoading(true);
      
      try {
        // Select a random card that has examples
        const cardsWithExamples = dueCards.filter(card => {
          try {
            const examples = card.examples ? JSON.parse(card.examples) : [];
            return examples.length > 0;
          } catch (e) {
            return false;
          }
        });
        
        if (cardsWithExamples.length === 0) {
          Alert.alert('No Examples', 'None of the cards have example sentences with audio.');
          return;
        }
        
        const randomCard = cardsWithExamples[Math.floor(Math.random() * cardsWithExamples.length)];
        setSelectedCard(randomCard);
        
        // Parse examples and select a random one
        const examples = JSON.parse(randomCard.examples);
        const randomExample = examples[Math.floor(Math.random() * examples.length)];
        setSelectedExample(randomExample);
        
        // Generate answers: correct one and an incorrect one
        const correctAnswer = {
          text: randomExample.answer,
          phonetic: randomExample.answerPhonetic,
          isCorrect: true
        };
        
        // Generate an incorrect answer by picking another example answer 
        // or modifying the current one if only one example exists
        let incorrectAnswer;
        if (examples.length > 1) {
          const otherExample = examples.find(ex => ex !== randomExample);
          incorrectAnswer = {
            text: otherExample.answer,
            phonetic: otherExample.answerPhonetic,
            isCorrect: false
          };
        } else {
          // Create a modified version of the answer as wrong answer
          // This is a simple approach - in a real app you might want a better way
          incorrectAnswer = {
            text: `${randomExample.answer} (incorrect)`,
            phonetic: randomExample.answerPhonetic,
            isCorrect: false
          };
        }
        
        // Randomize answer order
        const answerOptions = [correctAnswer, incorrectAnswer].sort(() => Math.random() - 0.5);
        setAnswers(answerOptions);
        
        setLoading(false);
      } catch (error) {
        console.error("Error initializing ListenResponse:", error);
        Alert.alert('Error', 'Could not load example sentences');
        setLoading(false);
      }
    };
    
    init();
    
    // Cleanup function
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [dueCards]);
  
  // Reset component when showResult changes (new round)
  useEffect(() => {
    setSelectedAnswerIndex(null);
    setAnswered(false);
  }, [showResult]);

  const playAudio = async () => {
    if (!selectedExample?.questionAudio) {
      Alert.alert('No Audio', 'This example does not have audio available.');
      return;
    }
    
    try {
      // Stop any existing audio
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
      
      setIsPlaying(true);
      
      // Load and play the audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: selectedExample.questionAudio },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      
      // Wait for audio to finish
      newSound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error("Error playing audio:", error);
      Alert.alert('Error', 'Could not play audio');
      setIsPlaying(false);
    }
  };

  const handleAnswerSelect = (index) => {
    if (answered || showResult) return;
    
    setSelectedAnswerIndex(index);
    setAnswered(true);
    
    const isCorrect = answers[index].isCorrect;
    
    // Build popup data string
    let popupString = '';
    
    if (selectedCard) {
      popupString += `${selectedCard.front}\n`;
      if (selectedCard.phonetic) popupString += `${selectedCard.phonetic}\n`;
      if (selectedCard.back) popupString += `${selectedCard.back}\n`;
    }
    
    if (selectedExample) {
      popupString += `Q: ${selectedExample.question}\n`;
      if (selectedExample.questionTranslation) {
        popupString += `Translation: ${selectedExample.questionTranslation}\n`;
      }
      popupString += `A: ${selectedExample.answer}\n`;
    }
    
    // Call the onAnswer callback with the result
    onAnswer?.(isCorrect, popupString);
  };

  // Handle loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading examples...</Text>
      </View>
    );
  }
  
  // Handle case where no card or example could be found
  if (!selectedCard || !selectedExample) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No examples available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Listen and Respond</Text>
      
      {/* Question Section */}
      <View style={styles.questionContainer}>
        <TouchableOpacity 
          style={styles.audioButton}
          onPress={playAudio}
          disabled={isPlaying || showResult}
        >
          <Ionicons 
            name={isPlaying ? "volume-high" : "play-circle"} 
            size={50} 
            color="#007AFF" 
          />
          <Text style={styles.audioButtonText}>
            {isPlaying ? "Playing..." : "Play Question"}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.questionTextContainer}>
          <Text style={styles.questionText}>{selectedExample.question}</Text>
          {selectedExample.questionPhonetic && (
            <Text style={styles.phoneticText}>{selectedExample.questionPhonetic}</Text>
          )}
          {selectedExample.questionTranslation && (
            <Text style={styles.translationText}>{selectedExample.questionTranslation}</Text>
          )}
        </View>
      </View>
      
      {/* Answer Options */}
      <Text style={styles.chooseText}>Choose the correct response:</Text>
      
      <View style={styles.answersContainer}>
        {answers.map((answer, index) => {
          const isSelected = selectedAnswerIndex === index;
          const showCorrectness = answered && isSelected;
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.answerButton,
                isSelected && styles.selectedButton,
                showCorrectness && (answer.isCorrect ? styles.correctButton : styles.incorrectButton)
              ]}
              onPress={() => handleAnswerSelect(index)}
              disabled={answered || showResult}
            >
              <Text style={styles.answerText}>{answer.text}</Text>
              {answer.phonetic && (
                <Text style={styles.answerPhonetic}>{answer.phonetic}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    margin: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    fontFamily: 'PressStart2P',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
  questionContainer: {
    width: '100%',
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  audioButton: {
    alignItems: 'center',
    marginBottom: 15,
  },
  audioButtonText: {
    fontSize: 16,
    color: '#007AFF',
    marginTop: 5,
  },
  questionTextContainer: {
    width: '100%',
    alignItems: 'center',
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  phoneticText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  translationText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  chooseText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  answersContainer: {
    width: '100%',
  },
  answerButton: {
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
    alignItems: 'center',
  },
  selectedButton: {
    borderColor: '#007AFF',
    borderWidth: 2,
    backgroundColor: '#f0f8ff',
  },
  correctButton: {
    borderColor: '#28a745',
    backgroundColor: '#d4edda',
  },
  incorrectButton: {
    borderColor: '#dc3545',
    backgroundColor: '#f8d7da',
  },
  answerText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  answerPhonetic: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },
});
