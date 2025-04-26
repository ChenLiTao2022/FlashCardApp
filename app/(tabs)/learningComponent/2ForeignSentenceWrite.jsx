import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  TextInput,
  Keyboard
} from 'react-native';

export default function ForeignSentenceWrite({ dueCards, onAnswer, showResult }) {
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedExample, setSelectedExample] = useState(null);
  const [translationText, setTranslationText] = useState('');
  const [sentenceWithBlank, setSentenceWithBlank] = useState('');
  const [userInput, setUserInput] = useState('');
  const [answered, setAnswered] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [usePart, setUsePart] = useState('question');
  
  // Animation values
  const titleAnimation = useRef(new Animated.Value(0)).current;
  const translationAnimation = useRef(new Animated.Value(0)).current;
  const sentenceAnimation = useRef(new Animated.Value(0)).current;
  const inputAnimation = useRef(new Animated.Value(0)).current;

  // Initialize and select a random card and example
  useEffect(() => {
    if (!dueCards || dueCards.length === 0) return;
    
    const init = async () => {
      setLoading(true);
      
      try {
        // Filter cards to those with examples containing the target word marked with #
        const cardsWithValidExamples = dueCards.filter(card => {
          try {
            const examples = card.examples ? JSON.parse(card.examples) : [];
            // Find examples that have the word marked with # and have translations
            return examples.some(ex => {
              const hasMarkedWord = (ex.question && ex.question.includes('#')) || 
                                   (ex.answer && ex.answer.includes('#'));
              const hasTranslation = ex.translation || ex.questionTranslation;
              return hasMarkedWord && hasTranslation;
            });
          } catch (e) {
            return false;
          }
        });
        
        if (cardsWithValidExamples.length === 0) {
          Alert.alert('Not Enough Examples', 'None of the cards have examples with marked words and translations.');
          return;
        }
        
        // Select a random card
        const randomCard = cardsWithValidExamples[Math.floor(Math.random() * cardsWithValidExamples.length)];
        setSelectedCard(randomCard);
        
        // Parse examples
        const examples = JSON.parse(randomCard.examples);
        
        // Filter examples to those that have the target word marked with # and have translations
        const validExamples = examples.filter(ex => {
          const hasMarkedWord = (ex.question && ex.question.includes('#')) || 
                               (ex.answer && ex.answer.includes('#'));
          const hasTranslation = ex.translation || ex.questionTranslation;
          return hasMarkedWord && hasTranslation;
        });
        
        if (validExamples.length === 0) {
          setLoading(false);
          return;
        }
        
        // Select a random example
        const randomExample = validExamples[Math.floor(Math.random() * validExamples.length)];
        setSelectedExample(randomExample);
        
        // Determine if we'll use the question or answer part of the example
        // Prioritize question if it has a marked word and translation
        const useQuestion = randomExample.question && 
                           randomExample.question.includes('#') && 
                           randomExample.questionTranslation;
        
        const useAnswer = randomExample.answer && 
                         randomExample.answer.includes('#') && 
                         randomExample.translation;
        
        const part = useQuestion ? 'question' : (useAnswer ? 'answer' : null);
        setUsePart(part);
        
        if (!part) {
          setLoading(false);
          return;
        }
        
        // Get the sentence with the word to replace and its translation
        const sentence = randomExample[part];
        const translation = part === 'question' ? 
                          randomExample.questionTranslation : 
                          randomExample.translation;
        
        setTranslationText(translation);
        
        // Extract the target word and create a sentence with a blank
        const regex = /#(.*?)#/;
        const match = sentence.match(regex);
        
        if (match && match[1]) {
          const targetWord = match[1];
          // Replace the word with a blank
          const blankSentence = sentence.replace(/#.*?#/, '____');
          setSentenceWithBlank(blankSentence);
          
          // Set the correct answer (the target word)
          setCorrectAnswer(targetWord);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error initializing ForeignSentenceWrite:", error);
        Alert.alert('Error', 'Could not load example sentences');
        setLoading(false);
      }
    };
    
    init();
  }, [dueCards]);
  
  // Animation sequence when component renders
  useEffect(() => {
    if (!loading && selectedExample && sentenceWithBlank) {
      // Reset animation values
      titleAnimation.setValue(0);
      translationAnimation.setValue(0);
      sentenceAnimation.setValue(0);
      inputAnimation.setValue(0);
      
      // Run animations in sequence
      Animated.sequence([
        // Title first
        Animated.timing(titleAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.7))
        }),
        // Translation container
        Animated.timing(translationAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }),
        // Sentence container
        Animated.timing(sentenceAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }),
        // Input field
        Animated.timing(inputAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        })
      ]).start();
    }
  }, [loading, selectedExample, sentenceWithBlank]);
  
  // Reset component when showResult changes (new round)
  useEffect(() => {
    setUserInput('');
    setAnswered(false);
  }, [showResult]);

  const handleSubmit = () => {
    if (answered || showResult || !userInput.trim()) return;
    
    setAnswered(true);
    Keyboard.dismiss();
    
    // Simple comparison (can be improved with case insensitivity, etc.)
    const isCorrect = userInput.trim().toLowerCase() === correctAnswer.toLowerCase();
    
    // Build popup data string
    let popupString = '';
    
    if (selectedCard) {
      popupString += `${selectedCard.front}\n`;
      if (selectedCard.phonetic) popupString += `${selectedCard.phonetic}\n`;
      if (selectedCard.back) popupString += `${selectedCard.back}\n`;
    }
    
    popupString += `Translation: ${translationText}\n`;
    popupString += `Sentence: ${sentenceWithBlank.replace('____', correctAnswer)}\n`;
    
    const phonetic = usePart === 'question' ? 
                    selectedExample.questionPhonetic : 
                    selectedExample.answerPhonetic;
    
    if (phonetic) {
      popupString += `Phonetic: ${phonetic}\n`;
    }
    
    popupString += `Correct word: ${correctAnswer}\n`;
    popupString += `Your answer: ${userInput}\n`;
    
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
  
  // Handle case where no card or examples could be found
  if (!selectedCard || !selectedExample || !sentenceWithBlank || !translationText) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Not enough examples available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.Text 
        style={[
          styles.title,
          {
            opacity: titleAnimation,
            transform: [
              {
                translateY: titleAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0]
                })
              }
            ]
          }
        ]}
      >
        Write the Missing Word
      </Animated.Text>
      
      {/* Translation Section */}
      <Animated.View 
        style={[
          styles.translationContainer,
          {
            opacity: translationAnimation,
            transform: [
              {
                translateY: translationAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })
              }
            ]
          }
        ]}
      >
        <Text style={styles.translationLabel}>Translation:</Text>
        <Text style={styles.translationText}>{translationText}</Text>
      </Animated.View>
      
      {/* Sentence Section */}
      <Animated.View 
        style={[
          styles.sentenceContainer,
          {
            opacity: sentenceAnimation,
            transform: [
              {
                translateY: sentenceAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })
              }
            ]
          }
        ]}
      >
        <Text style={styles.sentenceLabel}>Complete this sentence:</Text>
        <Text style={styles.sentenceText}>{sentenceWithBlank}</Text>
        {((usePart === 'question' && selectedExample.questionPhonetic) || 
          (usePart === 'answer' && selectedExample.answerPhonetic)) && (
          <Text style={styles.phoneticText}>
            {usePart === 'question' ? selectedExample.questionPhonetic : selectedExample.answerPhonetic}
          </Text>
        )}
      </Animated.View>
      
      {/* Input Field */}
      <Animated.View 
        style={[
          styles.inputContainer,
          {
            opacity: inputAnimation,
            transform: [
              {
                translateY: inputAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0]
                })
              }
            ]
          }
        ]}
      >
        <TextInput
          style={[
            styles.textInput,
            answered && userInput.trim().toLowerCase() === correctAnswer.toLowerCase() && styles.correctInput,
            answered && userInput.trim().toLowerCase() !== correctAnswer.toLowerCase() && styles.incorrectInput
          ]}
          placeholder="Type your answer here"
          value={userInput}
          onChangeText={setUserInput}
          editable={!answered && !showResult}
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!userInput.trim() || answered || showResult) && styles.disabledButton
          ]}
          onPress={handleSubmit}
          disabled={!userInput.trim() || answered || showResult}
        >
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>
      </Animated.View>
      
      {/* Feedback Section */}
      {answered && (
        <Animated.View 
          style={[
            styles.feedbackContainer,
            {
              opacity: inputAnimation,
              transform: [
                {
                  scale: inputAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1]
                  })
                }
              ]
            }
          ]}
        >
          <Text style={[
            styles.feedbackText,
            userInput.trim().toLowerCase() === correctAnswer.toLowerCase() ? styles.correctText : styles.incorrectText
          ]}>
            {userInput.trim().toLowerCase() === correctAnswer.toLowerCase() ? "Correct!" : "Incorrect"}
          </Text>
          <Text style={styles.answerText}>
            The correct word is: {correctAnswer}
          </Text>
        </Animated.View>
      )}
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
  translationContainer: {
    width: '100%',
    backgroundColor: '#e6f7ff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  translationLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#555',
  },
  translationText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#0066cc',
  },
  sentenceContainer: {
    width: '100%',
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  sentenceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#555',
  },
  sentenceText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  phoneticText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  inputContainer: {
    width: '100%',
    marginTop: 10,
    marginBottom: 20,
  },
  textInput: {
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    fontSize: 16,
  },
  correctInput: {
    borderColor: '#28a745',
    backgroundColor: '#d4edda',
  },
  incorrectInput: {
    borderColor: '#dc3545',
    backgroundColor: '#f8d7da',
  },
  submitButton: {
    width: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  feedbackContainer: {
    width: '100%',
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 10,
    alignItems: 'center',
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  correctText: {
    color: 'green',
  },
  incorrectText: {
    color: 'red',
  },
  answerText: {
    fontSize: 16,
  },
});
