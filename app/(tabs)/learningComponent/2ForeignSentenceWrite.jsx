import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    Keyboard,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import {
    WordByWordTranslation,
    cleanText,
    parseWordByWord
} from '../Review';

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

export default function ForeignSentenceWrite({ activitySequence, currentRound, onAnswer, showResult, freezeOnWrong, language }) {
  const [loading, setLoading] = useState(true);
  const [mainCard, setMainCard] = useState(null);
  const [selectedExample, setSelectedExample] = useState(null);
  const [translationText, setTranslationText] = useState('');
  const [sentenceWithBlank, setSentenceWithBlank] = useState('');
  const [userInput, setUserInput] = useState('');
  const [answered, setAnswered] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [usePart, setUsePart] = useState('question');
  const [wordByWordMap, setWordByWordMap] = useState({});
  const [originalSentence, setOriginalSentence] = useState('');
  const initialized = useRef(false);
  
  // Animation values
  const titleAnimation = useRef(new Animated.Value(0)).current;
  const translationAnimation = useRef(new Animated.Value(0)).current;
  const sentenceAnimation = useRef(new Animated.Value(0)).current;
  const inputAnimation = useRef(new Animated.Value(0)).current;

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

  // Initialize and select a random card and example
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
        
        // Make sure we have examples
        if (!mainCardData.examples || mainCardData.examples.length === 0) {
          throw new Error('Card does not have any examples');
        }
        
        // Filter examples that have marked words (with #) and translations
        const validExamples = mainCardData.examples.filter(ex => {
          const hasMarkedWord = (ex.question && ex.question.includes('#')) || 
                               (ex.answer && ex.answer.includes('#'));
          const hasTranslation = ex.translation || ex.questionTranslation;
          return hasMarkedWord && hasTranslation;
        });
        
        if (validExamples.length === 0) {
          throw new Error('No examples with marked words and translations available');
        }
        
        // Store main card
        setMainCard(mainCardData);
        
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
          throw new Error('Selected example does not have a valid marked word');
        }
        
        // Get the sentence with the word to replace and its translation
        const sentence = randomExample[part];
        const translation = part === 'question' ? 
                          randomExample.questionTranslation : 
                          randomExample.translation;
        
        // Save original sentence for the word-by-word translation
        setOriginalSentence(sentence);
        
        // Clean the translation before setting it (remove # characters)
        setTranslationText(cleanText(translation));
        
        // Parse word-by-word translations
        const wordByWordStr = part === 'question' ? 
                            randomExample.questionWordByWord : 
                            randomExample.answerWordByWord;
        
        const wordByWordMap = parseWordByWord(wordByWordStr || '');
        setWordByWordMap(wordByWordMap);
        
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
        } else {
          throw new Error('Could not extract the target word from the example');
        }
        
        initialized.current = true;
        setLoading(false);
      } catch (error) {
        console.error("Error initializing ForeignSentenceWrite:", error);
        Alert.alert('Error', 'Could not load example sentences');
        setLoading(false);
      }
    };
    
    init();
  }, [activitySequence, currentRound, freezeOnWrong]);
  
  // Animation sequence when component renders
  useEffect(() => {
    if (!loading && selectedExample && sentenceWithBlank && !freezeOnWrong) {
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
  }, [loading, selectedExample, sentenceWithBlank, freezeOnWrong]);
  
  // Reset component when showResult changes (new round)
  useEffect(() => {
    // Only reset if not frozen due to wrong answer
    if (!freezeOnWrong) {
      setUserInput('');
      setAnswered(false);
    }
  }, [showResult, freezeOnWrong]);

  const handleSubmit = () => {
    if (answered || showResult || !userInput.trim() || freezeOnWrong) return;
    
    setAnswered(true);
    Keyboard.dismiss();
    
    // Compare user input with correct answer (case insensitive)
    const isCorrect = userInput.trim().toLowerCase() === correctAnswer.toLowerCase();
    
    // Create a rich popup data object with card details
    const popupData = {
      imageUrl: mainCard.imageUrl,
      front: mainCard.front,
      phonetic: mainCard.phonetic,
      back: mainCard.back,
      isForeignSentenceActivity: true,
      translation: translationText,
      sentence: sentenceWithBlank.replace('____', correctAnswer),
      correctWord: correctAnswer,
      userAnswer: userInput,
      phonetic: usePart === 'question' ? selectedExample.questionPhonetic : selectedExample.answerPhonetic
    };
    
    // Call the onAnswer callback with the result and popup data
    onAnswer?.(isCorrect, popupData);
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
  
  // Handle case where no card or examples could be found
  if (!mainCard || !selectedExample || !sentenceWithBlank || !translationText) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Not enough examples available</Text>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={() => {
      Keyboard.dismiss();
    }}>
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
        
        {/* Word-by-word translation component */}
        <WordByWordTranslation 
          sentence={originalSentence}
          wordByWordMap={wordByWordMap}
          targetWord={correctAnswer}
          containerStyle={styles.wordByWordContainer}
          multiline={true}
          language={language}
        />
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
          placeholderTextColor={COLORS.textSecondary}
          value={userInput}
          onChangeText={setUserInput}
          editable={!answered && !showResult && !freezeOnWrong}
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!userInput.trim() || answered || showResult || freezeOnWrong) && styles.disabledButton
          ]}
          onPress={handleSubmit}
          disabled={!userInput.trim() || answered || showResult || freezeOnWrong}
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
    </TouchableWithoutFeedback>
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
  translationContainer: {
    width: '100%',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  translationLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: COLORS.textSecondary,
  },
  translationText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: COLORS.blue,
  },
  sentenceContainer: {
    width: '100%',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  sentenceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: COLORS.textSecondary,
  },
  wordByWordContainer: {
    marginBottom: 0,
    marginTop: 5,
  },
  inputContainer: {
    width: '100%',
    marginTop: 10,
    marginBottom: 20,
  },
  textInput: {
    width: '100%',
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    fontSize: 16,
    color: COLORS.white,
  },
  correctInput: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.correctLight,
  },
  incorrectInput: {
    borderColor: COLORS.incorrect,
    backgroundColor: COLORS.incorrectLight,
  },
  submitButton: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: COLORS.mediumGray,
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  feedbackContainer: {
    width: '100%',
    padding: 15,
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    alignItems: 'center',
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: COLORS.textPrimary,
  },
  correctText: {
    color: COLORS.primary,
  },
  incorrectText: {
    color: COLORS.incorrect,
  },
  answerText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
}); 