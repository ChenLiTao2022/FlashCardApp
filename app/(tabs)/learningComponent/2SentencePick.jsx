import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import {
    WordByWordTranslation,
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

export default function SentencePick({ activitySequence, currentRound, onAnswer, showResult, freezeOnWrong, language }) {
  const [loading, setLoading] = useState(true);
  const [mainCard, setMainCard] = useState(null);
  const [selectedExample, setSelectedExample] = useState(null);
  const [sentenceWithBlank, setSentenceWithBlank] = useState('');
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [correctOption, setCorrectOption] = useState(null);
  const [originalSentence, setOriginalSentence] = useState('');
  const [wordByWordMap, setWordByWordMap] = useState({});
  const [usePart, setUsePart] = useState('question');
  const initialized = useRef(false);
  
  // Animation values
  const titleAnimation = useRef(new Animated.Value(0)).current;
  const sentenceAnimation = useRef(new Animated.Value(0)).current;
  const optionsAnimation = useRef(new Animated.Value(0)).current;

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
        
        // Get the main card and parse examples
        const mainCardData = parseCardData(currentActivity.mainCard);
        setMainCard(mainCardData);
        
        // Additional cards for distractors
        const otherCards = currentActivity.otherCards || [];
        
        // Make sure we have examples
        if (!mainCardData.examples || mainCardData.examples.length === 0) {
          throw new Error('Card does not have any examples');
        }
        
        // Filter examples to those that have the target word marked with #
        const validExamples = mainCardData.examples.filter(ex => 
          (ex.question && ex.question.includes('#')) || 
          (ex.answer && ex.answer.includes('#'))
        );
        
        if (validExamples.length === 0) {
          throw new Error('No examples with marked words (#) found');
        }
        
        // Select a random example
        const randomExample = validExamples[Math.floor(Math.random() * validExamples.length)];
        setSelectedExample(randomExample);
        
        // Determine if we'll use the question or answer part of the example
        const useQuestion = randomExample.question && randomExample.question.includes('#') 
          ? 'question' 
          : 'answer';
        
        setUsePart(useQuestion);
        
        // Get the sentence with the word to replace
        const sentence = randomExample[useQuestion];
        
        // Save original sentence for word-by-word translation
        setOriginalSentence(sentence);
        
        // Parse word-by-word translations
        const wordByWordStr = useQuestion === 'question' 
          ? randomExample.questionWordByWord 
          : randomExample.answerWordByWord;
        
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
          
          // Set the correct option (the target card's front)
          setCorrectOption(mainCardData.front);
          
          // Create options (including the correct one and distractors)
          if (otherCards.length < 2) {
            throw new Error('Need at least 2 additional cards for options');
          }
          
          // Use front values from other cards as distractors
          const distractors = otherCards.slice(0, 2).map(c => c.front || 'Option');
          
          // Combine and shuffle all options
          const allOptions = [mainCardData.front, ...distractors];
          const shuffledOptions = [...allOptions].sort(() => 0.5 - Math.random());
          
          setOptions(shuffledOptions);
        } else {
          throw new Error('Could not find a marked word in the example');
        }
        
        initialized.current = true;
        setLoading(false);
      } catch (error) {
        console.error("Error initializing SentencePick:", error);
        Alert.alert('Error', 'Could not load example sentences');
        setLoading(false);
      }
    };
    
    init();
  }, [activitySequence, currentRound, freezeOnWrong]);
  
  // Animation sequence when component renders
  useEffect(() => {
    if (!loading && selectedExample && options.length > 0 && !freezeOnWrong) {
      // Reset animation values
      titleAnimation.setValue(0);
      sentenceAnimation.setValue(0);
      optionsAnimation.setValue(0);
      
      // Run animations in sequence
      Animated.sequence([
        // Title first
        Animated.timing(titleAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.7))
        }),
        // Sentence container
        Animated.timing(sentenceAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }),
        // Options
        Animated.timing(optionsAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        })
      ]).start();
    }
  }, [loading, selectedExample, options, freezeOnWrong]);
  
  // Reset component when showResult changes (new round)
  useEffect(() => {
    // Only reset if not frozen due to wrong answer
    if (!freezeOnWrong) {
      setSelectedOption(null);
      setAnswered(false);
    }
  }, [showResult, freezeOnWrong]);

  const handleChoice = (option) => {
    if (answered || freezeOnWrong) return;
    
    setSelectedOption(option);
    setAnswered(true);
    
    const isCorrect = option === correctOption;
    
    // Create a rich popup data object with card details
    const sentenceComplete = sentenceWithBlank.replace('____', correctOption);
    const popupData = {
      imageUrl: mainCard.imageUrl,
      front: mainCard.front,
      phonetic: mainCard.phonetic,
      back: mainCard.back,
      isSentencePickActivity: true,
      question: sentenceComplete,
      questionPhonetic: selectedExample.questionPhonetic || '',
      questionTranslation: selectedExample.questionTranslation || '',
      correctAnswer: correctOption,
      userAnswer: option,
      translation: selectedExample.translation || ''
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
  if (!mainCard || !selectedExample || !sentenceWithBlank || options.length === 0) {
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
        Fill in the Missing Word
      </Animated.Text>
      
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
        
        {/* Word-by-word translation component */}
        <WordByWordTranslation 
          sentence={originalSentence}
          wordByWordMap={wordByWordMap}
          targetWord={correctOption}
          containerStyle={styles.wordByWordContainer}
          multiline={true}
          language={language}
        />
        
        {(selectedExample.questionPhonetic || selectedExample.answerPhonetic) && (
          <Text style={styles.phoneticText}>
            {selectedExample.questionPhonetic || selectedExample.answerPhonetic}
          </Text>
        )}
        {(selectedExample.questionTranslation || selectedExample.translation) && (
          <Text style={styles.translationText}>
            {selectedExample.questionTranslation || selectedExample.translation}
          </Text>
        )}
      </Animated.View>
      
      {/* Options */}
      <Animated.View 
        style={[
          styles.optionsContainer,
          {
            opacity: optionsAnimation,
            transform: [
              {
                translateY: optionsAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0]
                })
              }
            ]
          }
        ]}
      >
        {options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.optionButton,
              selectedOption === option && styles.selectedButton,
              answered && option === correctOption && styles.correctButton,
              answered && selectedOption === option && option !== correctOption && styles.incorrectButton
            ]}
            onPress={() => handleChoice(option)}
            disabled={answered || freezeOnWrong}
          >
            <Text style={[
              styles.optionButtonText,
              selectedOption === option && styles.selectedText,
              answered && option === correctOption && styles.correctText,
              answered && selectedOption === option && option !== correctOption && styles.incorrectText
            ]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
      
      {/* Feedback Section */}
      {answered && (
        <Animated.View 
          style={[
            styles.feedbackContainer,
            selectedOption === correctOption ? styles.correctFeedback : styles.incorrectFeedback,
            {
              opacity: optionsAnimation,
              transform: [
                {
                  scale: optionsAnimation.interpolate({
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
            selectedOption === correctOption ? styles.correctText : styles.incorrectText
          ]}>
            {selectedOption === correctOption ? "Correct!" : "Incorrect"}
          </Text>
          <Text style={styles.answerText}>
            The correct word is: {correctOption}
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
  sentenceText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: COLORS.textPrimary,
  },
  wordByWordContainer: {
    marginBottom: 10,
    marginTop: 5,
  },
  phoneticText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: 5,
  },
  translationText: {
    fontSize: 14,
    color: COLORS.blue,
  },
  optionsContainer: {
    width: '100%',
    marginTop: 10,
    marginBottom: 20,
  },
  optionButton: {
    width: '100%',
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  selectedButton: {
    borderColor: COLORS.blue,
    borderWidth: 2,
    backgroundColor: COLORS.blue + '22',
  },
  correctButton: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.correctLight,
  },
  incorrectButton: {
    borderColor: COLORS.incorrect,
    backgroundColor: COLORS.incorrectLight,
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  selectedText: {
    color: COLORS.blue,
  },
  correctText: {
    color: COLORS.primary,
  },
  incorrectText: {
    color: COLORS.incorrect,
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
  answerText: {
    fontSize: 16,
    textAlign: 'center',
    color: COLORS.textPrimary,
  },
});
