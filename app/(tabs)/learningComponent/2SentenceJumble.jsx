import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  ScrollView
} from 'react-native';

export default function SentenceJumble({ dueCards, onAnswer, showResult }) {
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedExample, setSelectedExample] = useState(null);
  const [jumbledWords, setJumbledWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState([]);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  // Animation values for word blocks
  const wordAnimations = useRef([]).current;
  // Hold original positions to preserve space
  const [originalWordPositions, setOriginalWordPositions] = useState([]);
  
  // Split text based on language type (spaced or non-spaced)
  const splitTextByLanguage = (text) => {
    // Remove any highlighting markers (#)
    const cleanText = text.replace(/#/g, '');
    
    // Check if the text contains spaces (e.g., English, Spanish, etc.)
    if (/\s/.test(cleanText)) {
      // If it contains spaces, split by spaces
      return cleanText.split(/\s+/);
    } else {
      // For languages without spaces (Chinese, Japanese, etc.), split by character
      return cleanText.split('');
    }
  };
  
  // Shuffle the array of words
  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };
  
  // Initialize the game
  useEffect(() => {
    if (!dueCards || dueCards.length === 0) return;
    
    const init = async () => {
      setLoading(true);
      
      try {
        // Select a random card from due cards
        const randomCard = dueCards[Math.floor(Math.random() * dueCards.length)];
        setSelectedCard(randomCard);
        
        // Parse examples if they exist
        if (randomCard.examples) {
          let examples;
          try {
            examples = JSON.parse(randomCard.examples);
          } catch (e) {
            // If parsing fails, it might already be an object
            examples = randomCard.examples;
          }
          
          if (examples && examples.length > 0) {
            // Select a random example
            const randomExample = examples[Math.floor(Math.random() * examples.length)];
            setSelectedExample(randomExample);
            
            // Get the answer text and split it
            let answerText = randomExample.answer;
            const words = splitTextByLanguage(answerText);
            
            // Create jumbled words array with animations
            const jumbled = shuffleArray(words);
            
            // Initialize animation values for each word
            wordAnimations.length = jumbled.length;
            jumbled.forEach((_, index) => {
              wordAnimations[index] = new Animated.Value(1);
            });
            
            // Create word objects with visibility state
            const wordObjects = jumbled.map((word, index) => ({ 
              id: index, 
              text: word,
              isVisible: true
            }));
            
            setJumbledWords(wordObjects);
            setOriginalWordPositions(wordObjects);
            setSelectedWords([]);
          } else {
            // If no examples, use the card's front and back
            const words = splitTextByLanguage(randomCard.back);
            
            // Create jumbled words array with animations
            const jumbled = shuffleArray(words);
            
            // Initialize animation values for each word
            wordAnimations.length = jumbled.length;
            jumbled.forEach((_, index) => {
              wordAnimations[index] = new Animated.Value(1);
            });
            
            // Create word objects with visibility state
            const wordObjects = jumbled.map((word, index) => ({ 
              id: index, 
              text: word,
              isVisible: true
            }));
            
            setJumbledWords(wordObjects);
            setOriginalWordPositions(wordObjects);
            setSelectedWords([]);
            
            // Create a simplified example object
            setSelectedExample({
              question: randomCard.front,
              questionPhonetic: randomCard.phonetic || '',
              questionTranslation: "Translate this",
              answer: randomCard.back,
              answerPhonetic: '',
              translation: randomCard.back
            });
          }
        } else {
          // If no examples, use the card's front and back
          const words = splitTextByLanguage(randomCard.back);
          
          // Create jumbled words array with animations
          const jumbled = shuffleArray(words);
          
          // Initialize animation values for each word
          wordAnimations.length = jumbled.length;
          jumbled.forEach((_, index) => {
            wordAnimations[index] = new Animated.Value(1);
          });
          
          // Create word objects with visibility state
          const wordObjects = jumbled.map((word, index) => ({ 
            id: index, 
            text: word,
            isVisible: true
          }));
          
          setJumbledWords(wordObjects);
          setOriginalWordPositions(wordObjects);
          setSelectedWords([]);
          
          // Create a simplified example object
          setSelectedExample({
            question: randomCard.front,
            questionPhonetic: randomCard.phonetic || '',
            questionTranslation: "Translate this",
            answer: randomCard.back,
            answerPhonetic: '',
            translation: randomCard.back
          });
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error initializing SentenceJumble:", error);
        Alert.alert('Error', 'Could not load cards');
        setLoading(false);
      }
    };
    
    init();
  }, [dueCards]);
  
  // Reset component when showResult changes (new round)
  useEffect(() => {
    setAnswered(false);
    setIsCorrect(false);
    setSelectedWords([]);
    
    // Reset visibility of all jumbled words
    if (originalWordPositions.length > 0) {
      setJumbledWords(originalWordPositions.map(word => ({...word, isVisible: true})));
    }
  }, [showResult]);
  
  // Handle selecting a word
  const handleSelectWord = (word, index) => {
    if (answered) return;
    
    // Animate the word (scale down when selected)
    Animated.timing(wordAnimations[word.id], {
      toValue: 0.5,
      duration: 150,
      useNativeDriver: true
    }).start();
    
    // Add the word to selected words
    setSelectedWords([...selectedWords, word]);
    
    // Instead of removing the word, mark it as invisible
    setJumbledWords(
      jumbledWords.map(w => 
        w.id === word.id ? {...w, isVisible: false} : w
      )
    );
  };
  
  // Handle removing a word from selection
  const handleRemoveWord = (word) => {
    if (answered) return;
    
    // Animate the word (scale back up)
    Animated.timing(wordAnimations[word.id], {
      toValue: 1,
      duration: 150,
      useNativeDriver: true
    }).start();
    
    // Remove the word from selected words
    setSelectedWords(selectedWords.filter(w => w.id !== word.id));
    
    // Make the word visible again in its original position
    setJumbledWords(
      jumbledWords.map(w => 
        w.id === word.id ? {...w, isVisible: true} : w
      )
    );
  };
  
  // Check if the answer is correct
  const checkAnswer = () => {
    if (selectedWords.length === 0 || answered) return;
    
    setAnswered(true);
    
    // Get the correct answer text and split it
    const correctAnswer = selectedExample.answer.replace(/#/g, '');
    const correctWords = splitTextByLanguage(correctAnswer);
    
    // Compare the selected words with the correct answer
    const selectedText = selectedWords.map(word => word.text).join(/\s/.test(correctAnswer) ? ' ' : '');
    const correctText = correctWords.join(/\s/.test(correctAnswer) ? ' ' : '');
    
    const correct = selectedText === correctText;
    setIsCorrect(correct);
    
    // Build popup data string for feedback
    let popupString = '';
    
    if (selectedCard && selectedExample) {
      popupString += `Original: ${selectedExample.question}\n`;
      if (selectedExample.questionPhonetic) popupString += `Phonetic: ${selectedExample.questionPhonetic}\n`;
      popupString += `Correct Answer: ${correctText}\n`;
      popupString += `Your Answer: ${selectedText}\n`;
      
      if (selectedExample.translation) {
        popupString += `Translation: ${selectedExample.translation}\n`;
      }
    }
    
    // Call the onAnswer callback with the result
    onAnswer?.(correct, popupString);
  };
  
  // Handle reset
  const resetSelection = () => {
    if (answered) return;
    
    // Animate all words back to original size
    originalWordPositions.forEach((word) => {
      Animated.timing(wordAnimations[word.id], {
        toValue: 1,
        duration: 150,
        useNativeDriver: true
      }).start();
    });
    
    // Reset all words to visible in original positions
    setJumbledWords(originalWordPositions.map(word => ({...word, isVisible: true})));
    setSelectedWords([]);
  };
  
  // Handle loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading cards...</Text>
      </View>
    );
  }
  
  // Handle case where no card or example could be found
  if (!selectedCard || !selectedExample) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Not enough cards available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Question Section */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionLabel}>Arrange the translation:</Text>
        <Text style={styles.questionText}>{selectedExample.question}</Text>
        {selectedExample.questionPhonetic && (
          <Text style={styles.phoneticText}>{selectedExample.questionPhonetic}</Text>
        )}
        <Text style={styles.translationText}>{selectedExample.questionTranslation}</Text>
      </View>
      
      {/* Selected Words Area */}
      <View style={styles.selectedWordsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedWordsScroll}>
          {selectedWords.map((word, index) => (
            <TouchableOpacity
              key={`selected-${word.id}`}
              style={[
                styles.wordBlock,
                styles.selectedWordBlock,
                answered && isCorrect && styles.correctWordBlock,
                answered && !isCorrect && styles.incorrectWordBlock
              ]}
              onPress={() => !answered && handleRemoveWord(word)}
              disabled={answered}
            >
              <Text style={styles.wordText}>{word.text}</Text>
            </TouchableOpacity>
          ))}
          
          {selectedWords.length === 0 && (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>Tap words below</Text>
            </View>
          )}
        </ScrollView>
      </View>
      
      {/* Jumbled Words Area */}
      <View style={styles.jumbledWordsContainer}>
        <ScrollView contentContainerStyle={styles.jumbledWordsScroll}>
          <View style={styles.wordsGrid}>
            {jumbledWords.map((word, index) => (
              <View key={`jumbled-${word.id}`} style={styles.wordSlot}>
                {word.isVisible && (
                  <Animated.View style={{ transform: [{ scale: wordAnimations[word.id] }] }}>
                    <TouchableOpacity
                      style={styles.wordBlock}
                      onPress={() => handleSelectWord(word, index)}
                      disabled={answered}
                    >
                      <Text style={styles.wordText}>{word.text}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
      
      {/* Control Buttons */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.controlButton, styles.resetButton]}
          onPress={resetSelection}
          disabled={answered || selectedWords.length === 0}
        >
          <Text style={styles.controlButtonText}>Reset</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.controlButton, 
            styles.checkButton,
            selectedWords.length === 0 && styles.disabledButton
          ]}
          onPress={checkAnswer}
          disabled={answered || selectedWords.length === 0}
        >
          <Text style={styles.controlButtonText}>Check</Text>
        </TouchableOpacity>
      </View>
      
      {/* Feedback Section (shown after answering) */}
      {answered && (
        <View style={[
          styles.feedbackContainer,
          isCorrect ? styles.correctFeedback : styles.incorrectFeedback
        ]}>
          <Text style={styles.feedbackText}>
            {isCorrect ? "Correct!" : "Incorrect!"}
          </Text>
          <Text style={styles.answerText}>
            Correct answer: {selectedExample.answer.replace(/#/g, '')}
          </Text>
          {selectedExample.answerPhonetic && (
            <Text style={styles.answerPhoneticText}>
              {selectedExample.answerPhonetic}
            </Text>
          )}
        </View>
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
    marginBottom: 15,
  },
  questionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#555',
  },
  questionText: {
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
  translationText: {
    fontSize: 14,
    color: '#333',
  },
  selectedWordsContainer: {
    width: '100%',
    minHeight: 60,
    backgroundColor: '#e8f4ff',
    borderRadius: 15,
    padding: 8,
    marginBottom: 15,
  },
  selectedWordsScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    minHeight: 40,
  },
  placeholderContainer: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
    margin: 0,
  },
  placeholderText: {
    color: '#aaa',
    fontStyle: 'italic',
  },
  jumbledWordsContainer: {
    width: '100%',
    minHeight: 120,
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    padding: 8,
    marginBottom: 15,
    maxHeight: 200,
  },
  jumbledWordsScroll: {
    padding: 2,
  },
  wordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  wordSlot: {
    margin: 2,
    minWidth: 30,
    minHeight: 30,
  },
  wordBlock: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 6,
    margin: 2,
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedWordBlock: {
    backgroundColor: '#d1e8ff',
    borderColor: '#007AFF',
  },
  correctWordBlock: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
  },
  incorrectWordBlock: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
  },
  wordText: {
    fontSize: 15,
    fontWeight: '500',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
  },
  controlButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 5,
  },
  resetButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  checkButton: {
    backgroundColor: '#007AFF',
  },
  disabledButton: {
    opacity: 0.5,
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  feedbackContainer: {
    width: '100%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  correctFeedback: {
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    borderWidth: 1,
    borderColor: '#28a745',
  },
  incorrectFeedback: {
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  answerText: {
    fontSize: 16,
    textAlign: 'center',
  },
  answerPhoneticText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
    marginTop: 5,
  },
});
