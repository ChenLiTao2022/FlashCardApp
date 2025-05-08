import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// Dark theme colors
const COLORS = {
  primary: '#58CC02', // Duolingo green
  primaryDark: '#2E5B01', // Darker green for pressed states
  background: '#1A1A1A', // Dark background
  cardBackground: '#252525', // Slightly lighter than background
  white: '#FFFFFF',
  lightGray: '#333333', // Dark gray for card backgrounds
  mediumGray: '#444444', // Medium gray for borders
  textPrimary: '#CCCCCC', // Light gray for text
  textSecondary: '#999999', // Darker gray for secondary text
  incorrect: '#FF4B4B', // Red for incorrect answers
  correctLight: 'rgba(88, 204, 2, 0.2)', // More transparent green background
  incorrectLight: 'rgba(255, 75, 75, 0.2)', // More transparent red background
  blue: '#1CB0F6', // Blue for buttons
  blueDark: '#0e82b4', // Darker blue for shadows
};

export default function SentenceJumbleTranslate({ activitySequence, currentRound, onAnswer, showResult, freezeOnWrong }) {
  const [loading, setLoading] = useState(true);
  const [mainCard, setMainCard] = useState(null);
  const [selectedExample, setSelectedExample] = useState(null);
  const [jumbledWords, setJumbledWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState([]);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  // Form 2 specific state
  const [useQuestion, setUseQuestion] = useState(true); // Whether to show questionTranslation or answer translation
  const [displayText, setDisplayText] = useState(''); // The translation to display
  const [displayPhonetic, setDisplayPhonetic] = useState(''); // Phonetic for the displayed translation
  const [textToJumble, setTextToJumble] = useState(''); // The text being jumbled
  const initialized = useRef(false);
  
  // Animation values for word blocks
  const wordAnimations = useRef([]).current;
  // Animation values for containers
  const titleAnimation = useRef(new Animated.Value(0)).current;
  const questionAnimation = useRef(new Animated.Value(0)).current;
  const selectedWordsAnimation = useRef(new Animated.Value(0)).current;
  const jumbledWordsAnimation = useRef(new Animated.Value(0)).current;
  const controlsAnimation = useRef(new Animated.Value(0)).current;
  
  // Hold original positions to preserve space
  const [originalWordPositions, setOriginalWordPositions] = useState([]);
  
  // Function to parse card data
  const parseCardData = (card) => {
    try {
      // Parse examples if they exist
      const examples = typeof card.examples === 'string' 
        ? JSON.parse(card.examples || '[]') 
        : (card.examples || []);
      
      return {
        ...card,
        examples: examples
      };
    } catch (error) {
      console.error("Error parsing card data:", error);
      return {
        ...card,
        examples: []
      };
    }
  };
  
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
    // If component is frozen due to wrong answer, don't reinitialize
    if (freezeOnWrong) {
      return;
    }
    
    initialized.current = false;
    
    if (!activitySequence || activitySequence.length === 0) {
      Alert.alert('Error', 'No activity sequence provided');
      return;
    }
    
    const init = async () => {
      setLoading(true);
      
      try {
        // Get the current activity
        const currentActivity = activitySequence[currentRound - 1];
        
        if (!currentActivity || !currentActivity.mainCard) {
          throw new Error('Invalid activity data');
        }
        
        // Get the main card and parse its examples
        const mainCardData = parseCardData(currentActivity.mainCard);
        setMainCard(mainCardData);
        
        // Make sure we have examples
        if (!mainCardData.examples || mainCardData.examples.length === 0) {
          throw new Error('Card does not have any examples');
        }
        
        // Select a random example
        const randomExample = mainCardData.examples[Math.floor(Math.random() * mainCardData.examples.length)];
        setSelectedExample(randomExample);
        
        // For Form 2, decide whether to use questionTranslation or translation (50% chance)
        const useQuestionText = Math.random() < 0.5;
        setUseQuestion(useQuestionText);
        
        // Form 2: If top is questionTranslation, unjumble question; if top is translation, unjumble answer
        let displayTextValue = '';
        let phoneticToDisplay = '';
        let textToJumbleValue = '';
        
        if (useQuestionText) {
          // Show questionTranslation, unjumble question
          displayTextValue = randomExample.questionTranslation ? randomExample.questionTranslation.replace(/#/g, '') : '';
          phoneticToDisplay = randomExample.questionPhonetic || '';
          textToJumbleValue = randomExample.question;
        } else {
          // Show translation, unjumble answer
          displayTextValue = randomExample.translation ? randomExample.translation.replace(/#/g, '') : '';
          phoneticToDisplay = randomExample.answerPhonetic || '';
          textToJumbleValue = randomExample.answer;
        }
        
        setDisplayText(displayTextValue);
        setDisplayPhonetic(phoneticToDisplay);
        setTextToJumble(textToJumbleValue);
        
        // Get the words to jumble and split them
        const words = splitTextByLanguage(textToJumbleValue);
        
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
        
        initialized.current = true;
        setLoading(false);
      } catch (error) {
        console.error("Error initializing SentenceJumbleTranslate:", error);
        Alert.alert('Error', 'Could not load examples');
        setLoading(false);
      }
    };
    
    init();
  }, [activitySequence, currentRound, freezeOnWrong]);
  
  // Animation sequence when component renders
  useEffect(() => {
    if (!loading && selectedExample && !freezeOnWrong) {
      // Reset animation values
      titleAnimation.setValue(0);
      questionAnimation.setValue(0);
      selectedWordsAnimation.setValue(0);
      jumbledWordsAnimation.setValue(0);
      controlsAnimation.setValue(0);
      
      // Run animations in sequence
      Animated.sequence([
        // Title first
        Animated.timing(titleAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.7))
        }),
        // Question container
        Animated.timing(questionAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }),
        // Selected words container
        Animated.timing(selectedWordsAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }),
        // Jumbled words container
        Animated.timing(jumbledWordsAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }),
        // Controls
        Animated.timing(controlsAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        })
      ]).start();
    }
  }, [loading, selectedExample, freezeOnWrong]);
  
  // Reset component when showResult changes (new round)
  useEffect(() => {
    // Only reset if not frozen due to wrong answer
    if (!freezeOnWrong) {
      setAnswered(false);
      setIsCorrect(false);
      setSelectedWords([]);
      
      // Reset visibility of all jumbled words
      if (originalWordPositions.length > 0) {
        setJumbledWords(originalWordPositions.map(word => ({...word, isVisible: true})));
      }
    }
  }, [showResult, freezeOnWrong]);
  
  // Handle selecting a word
  const handleSelectWord = (word, index) => {
    if (answered || freezeOnWrong) return;
    
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
    if (answered || freezeOnWrong) return;
    
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
    if (selectedWords.length === 0 || answered || freezeOnWrong) return;
    
    setAnswered(true);
    
    // Get the correct answer text and split it
    const correctAnswer = textToJumble.replace(/#/g, '');
    const correctWords = splitTextByLanguage(correctAnswer);
    
    // Compare the selected words with the correct answer
    const selectedText = selectedWords.map(word => word.text).join(/\s/.test(correctAnswer) ? ' ' : '');
    const correctText = correctWords.join(/\s/.test(correctAnswer) ? ' ' : '');
    
    const correct = selectedText === correctText;
    setIsCorrect(correct);
    
    // Create a rich popup data object with card details
    let popupData = {};
    
    if (useQuestion) {
      // Shown questionTranslation, unjumbled question
      popupData = {
        imageUrl: mainCard.imageUrl,
        front: mainCard.front,
        phonetic: mainCard.phonetic,
        back: mainCard.back,
        isSentenceJumbleActivity: true,
        question: selectedExample.question,
        questionPhonetic: selectedExample.questionPhonetic || '',
        questionTranslation: selectedExample.questionTranslation || '',
        correctAnswer: correctText,
        userAnswer: selectedText,
        translation: selectedExample.translation || ''
      };
    } else {
      // Shown translation, unjumbled answer
      popupData = {
        imageUrl: mainCard.imageUrl,
        front: mainCard.front,
        phonetic: mainCard.phonetic,
        back: mainCard.back,
        isSentenceJumbleActivity: true,
        question: selectedExample.question,
        questionPhonetic: selectedExample.questionPhonetic || '',
        questionTranslation: selectedExample.questionTranslation || '',
        correctAnswer: correctText,
        userAnswer: selectedText,
        translation: selectedExample.translation || ''
      };
    }
    
    // Call the onAnswer callback with the result and popup data
    onAnswer?.(correct, popupData);
  };
  
  // Handle reset
  const resetSelection = () => {
    if (answered || freezeOnWrong) return;
    
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
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading examples...</Text>
      </View>
    );
  }
  
  // Handle case where no card or example could be found
  if (!mainCard || !selectedExample) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Not enough examples available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Title */}
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
        Arrange the Text
      </Animated.Text>
      
      {/* Question Section */}
      <Animated.View 
        style={[
          styles.questionContainer,
          {
            opacity: questionAnimation,
            transform: [
              {
                translateY: questionAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })
              }
            ]
          }
        ]}
      >
        <Text style={styles.questionText}>{displayText}</Text>
        {displayPhonetic && (
          <Text style={styles.phoneticText}>{displayPhonetic}</Text>
        )}
      </Animated.View>
      
      {/* Selected Words Area */}
      <Animated.View 
        style={[
          styles.selectedWordsContainer,
          {
            opacity: selectedWordsAnimation,
            transform: [
              {
                translateY: selectedWordsAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })
              }
            ]
          }
        ]}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.selectedWordsScroll}
        >
          <View style={styles.selectedWordsWrapper}>
            {selectedWords.map((word, index) => (
              <TouchableOpacity
                key={`selected-${word.id}`}
                style={[
                  styles.wordBlock,
                  styles.selectedWordBlock,
                  answered && isCorrect && styles.correctWordBlock,
                  answered && !isCorrect && styles.incorrectWordBlock
                ]}
                onPress={() => !answered && !freezeOnWrong && handleRemoveWord(word)}
                disabled={answered || freezeOnWrong}
              >
                <Text style={[
                  styles.wordText,
                  answered && isCorrect && styles.correctWordText,
                  answered && !isCorrect && styles.incorrectWordText
                ]}>
                  {word.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {selectedWords.length === 0 && (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>Tap words below</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
      
      {/* Jumbled Words Area */}
      <Animated.View 
        style={[
          styles.jumbledWordsContainer,
          {
            opacity: jumbledWordsAnimation,
            transform: [
              {
                translateY: jumbledWordsAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })
              }
            ]
          }
        ]}
      >
        <ScrollView contentContainerStyle={styles.jumbledWordsScroll}>
          <View style={styles.wordsGrid}>
            {jumbledWords.map((word, index) => (
              <View key={`jumbled-${word.id}`} style={styles.wordSlot}>
                {word.isVisible && (
                  <Animated.View style={{ transform: [{ scale: wordAnimations[word.id] }] }}>
                    <TouchableOpacity
                      style={styles.wordBlock}
                      onPress={() => handleSelectWord(word, index)}
                      disabled={answered || freezeOnWrong}
                    >
                      <Text style={styles.wordText}>{word.text}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </Animated.View>
      
      {/* Control Buttons */}
      <Animated.View 
        style={[
          styles.controlsContainer,
          {
            opacity: controlsAnimation,
            transform: [
              {
                translateY: controlsAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })
              }
            ]
          }
        ]}
      >
        <TouchableOpacity
          style={[
            styles.controlButton, 
            styles.resetButton,
            (answered || selectedWords.length === 0 || freezeOnWrong) && styles.disabledButton
          ]}
          onPress={resetSelection}
          disabled={answered || selectedWords.length === 0 || freezeOnWrong}
        >
          <Text style={[
            styles.resetButtonText,
            (answered || selectedWords.length === 0 || freezeOnWrong) && styles.disabledButtonText
          ]}>
            Reset
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.controlButton, 
            styles.checkButton,
            (selectedWords.length === 0 || answered || freezeOnWrong) && styles.disabledButton
          ]}
          onPress={checkAnswer}
          disabled={selectedWords.length === 0 || answered || freezeOnWrong}
        >
          <Text style={[
            styles.checkButtonText,
            (selectedWords.length === 0 || answered || freezeOnWrong) && styles.disabledButtonText
          ]}>
            Check
          </Text>
        </TouchableOpacity>
      </Animated.View>
      
      {/* Feedback Section (shown after answering) */}
      {answered && (
        <Animated.View 
          style={[
            styles.feedbackContainer,
            isCorrect ? styles.correctFeedback : styles.incorrectFeedback,
            {
              opacity: controlsAnimation,
              transform: [
                {
                  scale: controlsAnimation.interpolate({
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
            isCorrect ? styles.correctText : styles.incorrectText
          ]}>
            {isCorrect ? "Correct!" : "Incorrect!"}
          </Text>
          <Text style={styles.answerText}>
            Correct answer: {textToJumble.replace(/#/g, '')}
          </Text>
          {(useQuestion ? selectedExample.questionPhonetic : selectedExample.answerPhonetic) && (
            <Text style={styles.answerPhoneticText}>
              {useQuestion ? selectedExample.questionPhonetic : selectedExample.answerPhonetic}
            </Text>
          )}
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
    backgroundColor: COLORS.background,
    borderRadius: 16,
    margin: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: COLORS.textPrimary,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.incorrect,
    textAlign: 'center',
  },
  questionContainer: {
    width: '100%',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: COLORS.textPrimary,
  },
  phoneticText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: 5,
  },
  selectedWordsContainer: {
    width: '100%',
    minHeight: 80,
    maxHeight: 120,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 15,
    padding: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  selectedWordsScroll: {
    flexGrow: 1,
    width: '100%',
  },
  selectedWordsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    width: '100%',
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
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  jumbledWordsContainer: {
    width: '100%',
    minHeight: 120,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 15,
    padding: 8,
    marginBottom: 15,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
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
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
    padding: 6,
    margin: 2,
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedWordBlock: {
    backgroundColor: COLORS.blue + '33',
    borderColor: COLORS.blue,
  },
  correctWordBlock: {
    backgroundColor: COLORS.correctLight,
    borderColor: COLORS.primary,
  },
  incorrectWordBlock: {
    backgroundColor: COLORS.incorrectLight,
    borderColor: COLORS.incorrect,
  },
  wordText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  correctWordText: {
    color: COLORS.primary,
  },
  incorrectWordText: {
    color: COLORS.incorrect,
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
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  resetButton: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  checkButton: {
    backgroundColor: COLORS.primary,
  },
  disabledButton: {
    backgroundColor: COLORS.mediumGray,
    borderColor: COLORS.mediumGray,
    opacity: 0.7,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  checkButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  disabledButtonText: {
    color: COLORS.textSecondary,
  },
  feedbackContainer: {
    width: '100%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  correctFeedback: {
    backgroundColor: COLORS.correctLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  incorrectFeedback: {
    backgroundColor: COLORS.incorrectLight,
    borderWidth: 1,
    borderColor: COLORS.incorrect,
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  correctText: {
    color: COLORS.primary,
  },
  incorrectText: {
    color: COLORS.incorrect,
  },
  answerText: {
    fontSize: 16,
    textAlign: 'center',
    color: COLORS.textPrimary,
  },
  answerPhoneticText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
    marginTop: 5,
  },
});
