import { FontAwesome } from '@expo/vector-icons';
import { Audio } from 'expo-av';
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
import { WordByWordTranslation, parseWordByWord } from '../Review';

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

export default function SentencePairOrNotPair({ activitySequence, currentRound, onAnswer, showResult, freezeOnWrong, language }) {
  const [loading, setLoading] = useState(true);
  const [mainCard, setMainCard] = useState(null);
  const [questionExample, setQuestionExample] = useState(null);
  const [answerExample, setAnswerExample] = useState(null);
  const [selectedChoice, setSelectedChoice] = useState(null); // null, 'pair', 'notPair'
  const [answered, setAnswered] = useState(false);
  const [isPair, setIsPair] = useState(false);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingQuestion, setPlayingQuestion] = useState(true);
  const [questionWordByWordMap, setQuestionWordByWordMap] = useState({});
  const [questionTranslationWordByWordMap, setQuestionTranslationWordByWordMap] = useState({});
  const [answerWordByWordMap, setAnswerWordByWordMap] = useState({});
  const [answerTranslationWordByWordMap, setAnswerTranslationWordByWordMap] = useState({});
  const initialized = useRef(false);
  
  // Animation values
  const titleAnimation = useRef(new Animated.Value(0)).current;
  const questionAnimation = useRef(new Animated.Value(0)).current;
  const answerAnimation = useRef(new Animated.Value(0)).current;
  const buttonsAnimation = useRef(new Animated.Value(0)).current;

  // Function to remove any # characters from text
  const cleanText = (text) => {
    if (!text) return '';
    return text.replace(/#/g, '');
  };
  
  const parseCardData = (card) => {
    try {
      // Parse examples if they exist
      const examples = typeof card.examples === 'string' 
        ? JSON.parse(card.examples || '[]') 
        : (card.examples || []);
      
      // Parse word by word translations if they exist
      const wordByWord = typeof card.wordByWord === 'string'
        ? parseWordByWord(card.wordByWord)
        : (card.wordByWord || {});
      
      return {
        ...card,
        examples: examples,
        wordByWord: wordByWord
      };
    } catch (error) {
      console.error("Error parsing card data:", error);
      return {
        ...card,
        examples: [],
        wordByWord: {}
      };
    }
  };

  // Initialize only once for the current round
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
    
    const init = () => {
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
        if (!mainCardData.examples || mainCardData.examples.length < 2) {
          throw new Error('Card does not have enough examples (need at least 2)');
        }
        
        // Store main card
        setMainCard(mainCardData);
        
        // Select a random example for the question
        const randomExampleIndex = Math.floor(Math.random() * mainCardData.examples.length);
        const question = mainCardData.examples[randomExampleIndex];
        setQuestionExample(question);
        
        // Parse question word-by-word translations
        let questionWordByWord = {};
        if (question.questionWordByWord) {
          questionWordByWord = parseWordByWord(question.questionWordByWord);
        } else if (mainCardData.wordByWord) {
          // Fallback to card's wordByWord if specific example doesn't have it
          questionWordByWord = mainCardData.wordByWord;
        }
        setQuestionWordByWordMap(questionWordByWord);
        
        // Parse question translation word-by-word
        let questionTranslationWordByWord = {};
        if (question.questionTranslationWordByWord) {
          questionTranslationWordByWord = parseWordByWord(question.questionTranslationWordByWord);
        }
        setQuestionTranslationWordByWordMap(questionTranslationWordByWord);
        
        // Determine if this should be a pair (50% chance)
        const shouldBePair = Math.random() < 0.5;
        setIsPair(shouldBePair);
        
        // For the answer, either use the matching answer or a random different answer
        if (shouldBePair) {
          // If pair, use the matching answer
          setAnswerExample(question);
          
          // Use the same word-by-word translations for the answer
          let answerWordByWord = {};
          if (question.answerWordByWord) {
            answerWordByWord = parseWordByWord(question.answerWordByWord);
          } else if (mainCardData.wordByWord) {
            answerWordByWord = mainCardData.wordByWord;
          }
          setAnswerWordByWordMap(answerWordByWord);
          
          // Parse answer translation word-by-word
          let answerTranslationWordByWord = {};
          if (question.translationWordByWord) {
            answerTranslationWordByWord = parseWordByWord(question.translationWordByWord);
          }
          setAnswerTranslationWordByWordMap(answerTranslationWordByWord);
          
        } else {
          // If not pair, use a different example's answer
          const otherExamples = mainCardData.examples.filter((_, index) => index !== randomExampleIndex);
          if (otherExamples.length > 0) {
            const randomOtherExample = otherExamples[Math.floor(Math.random() * otherExamples.length)];
            setAnswerExample(randomOtherExample);
            
            // Parse answer word-by-word translations for the different example
            let answerWordByWord = {};
            if (randomOtherExample.answerWordByWord) {
              answerWordByWord = parseWordByWord(randomOtherExample.answerWordByWord);
            } else if (mainCardData.wordByWord) {
              answerWordByWord = mainCardData.wordByWord;
            }
            setAnswerWordByWordMap(answerWordByWord);
            
            // Parse answer translation word-by-word
            let answerTranslationWordByWord = {};
            if (randomOtherExample.translationWordByWord) {
              answerTranslationWordByWord = parseWordByWord(randomOtherExample.translationWordByWord);
            }
            setAnswerTranslationWordByWordMap(answerTranslationWordByWord);
            
          } else {
            // Create a modified version as a fallback
            setAnswerExample({
              ...question,
              answer: question.answer + " (modified)",
              answerPhonetic: question.answerPhonetic,
              translation: question.translation
            });
            
            // Use the same word-by-word translations as question with minor modifications
            setAnswerWordByWordMap(questionWordByWord);
            setAnswerTranslationWordByWordMap(questionTranslationWordByWord);
          }
        }
        
        initialized.current = true;
        setLoading(false);
      } catch (error) {
        console.error("Error initializing SentencePairOrNotPair:", error);
        Alert.alert('Error', 'Could not load example sentences');
        setLoading(false);
      }
    };
    
    init();
  }, [activitySequence, currentRound, freezeOnWrong]); 
  
  // Auto-play question audio when component is mounted and data is loaded
  useEffect(() => {
    if (!loading && questionExample && !freezeOnWrong) {
      // Short delay to ensure everything is rendered
      const timer = setTimeout(() => {
        playQuestionAudio();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [loading, questionExample, freezeOnWrong]);
  
  // Animation sequence when component renders
  useEffect(() => {
    if (!loading && questionExample && answerExample && !freezeOnWrong) {
      // Reset animation values
      titleAnimation.setValue(0);
      questionAnimation.setValue(0);
      answerAnimation.setValue(0);
      buttonsAnimation.setValue(0);
      
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
        // Answer container
        Animated.timing(answerAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }),
        // Buttons
        Animated.timing(buttonsAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        })
      ]).start();
    }
  }, [loading, questionExample, answerExample, freezeOnWrong]);
  
  // Reset component when showResult changes (new round)
  useEffect(() => {
    // Only reset if not frozen due to wrong answer
    if (!freezeOnWrong) {
    setSelectedChoice(null);
    setAnswered(false);
    }
  }, [showResult, freezeOnWrong]);
  
  // Clean up sound when component unmounts
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);
  
  const playQuestionAudio = async () => {
    if (isPlaying || !questionExample) return;
    
    setIsPlaying(true);
    setPlayingQuestion(true);
    
    try {
      // Stop any existing audio
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
      
      // Load and play the audio from the example or from the card if example doesn't have audio
      const audioUri = questionExample.questionAudio || mainCard?.frontAudio;
      
      if (!audioUri) {
        console.log("No audio available for this question");
        setIsPlaying(false);
        return;
      }
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
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
      setIsPlaying(false);
    }
  };
  
  const playAnswerAudio = async () => {
    if (isPlaying || !answerExample) return;
    
    setIsPlaying(true);
    setPlayingQuestion(false);
    
    try {
      // Stop any existing audio
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
      
      // Get the appropriate audio URI
      const audioUri = answerExample.answerAudio;
      
      if (!audioUri) {
        console.log("No audio available for this answer");
        setIsPlaying(false);
        return;
      }
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
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
      console.error("Error playing answer audio:", error);
      setIsPlaying(false);
    }
  };

  const handleChoice = (choice) => {
    if (answered || showResult || freezeOnWrong) return;
    
    setSelectedChoice(choice);
    setAnswered(true);
    
    const isCorrect = (choice === 'pair' && isPair) || (choice === 'notPair' && !isPair);
    
    // Create a rich popup data object with card details
    const popupData = {
      imageUrl: mainCard.imageUrl,
      front: mainCard.front,
      phonetic: mainCard.phonetic,
      back: mainCard.back,
      examples: mainCard.examples || [],
      isPairActivity: true,
      displayedQuestion: questionExample.question,
      displayedAnswer: answerExample.answer,
      correctAnswer: isPair ? "They Match" : "They Don't Match",
      userChoice: choice === 'pair' ? "They Match" : "They Don't Match",
      questionWordByWordMap: questionWordByWordMap,
      questionTranslationWordByWordMap: questionTranslationWordByWordMap,
      answerWordByWordMap: answerWordByWordMap,
      answerTranslationWordByWordMap: answerTranslationWordByWordMap
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
  if (!mainCard || !questionExample || !answerExample) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Not enough examples available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={true}
      >
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
          Do These Sentences Match?
        </Animated.Text>
        
        {/* Question Section */}
        <Animated.View 
          style={[
            styles.sentenceContainer,
            {
              opacity: questionAnimation,
              transform: [
                {
                  translateX: questionAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-100, 0]
                  })
                }
              ]
            }
          ]}
        >
          <View style={styles.sentenceHeader}>
            <TouchableOpacity 
              style={styles.audioButton}
              onPress={playQuestionAudio}
              disabled={isPlaying}
            >
              <FontAwesome 
                name="volume-up" 
                size={20} 
                color={isPlaying && playingQuestion ? COLORS.primary : COLORS.white} 
              />
            </TouchableOpacity>
          </View>
          <View style={styles.sentenceTextContainer}>
            {/* Word by word translation for question */}
            <WordByWordTranslation 
              sentence={cleanText(questionExample.question)}
              wordByWordMap={questionWordByWordMap}
              containerStyle={styles.wordByWordContainer}
              multiline={true}
              language={language}
            />
            
            {questionExample.questionPhonetic && (
              <Text style={styles.phoneticText}>{cleanText(questionExample.questionPhonetic)}</Text>
            )}
          </View>
        </Animated.View>
        
        {/* Answer Section */}
        <Animated.View 
          style={[
            styles.sentenceContainer,
            {
              opacity: answerAnimation,
              transform: [
                {
                  translateX: answerAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0]
                  })
                }
              ]
            }
          ]}
        >
          <View style={styles.sentenceHeader}>
            <TouchableOpacity 
              style={styles.audioButton}
              onPress={playAnswerAudio}
              disabled={isPlaying}
            >
              <FontAwesome 
                name="volume-up" 
                size={20} 
                color={isPlaying && !playingQuestion ? COLORS.primary : COLORS.white} 
              />
            </TouchableOpacity>
          </View>
          <View style={styles.sentenceTextContainer}>
            {/* Word by word translation for answer */}
            <WordByWordTranslation 
              sentence={cleanText(answerExample.answer)}
              wordByWordMap={answerWordByWordMap}
              containerStyle={styles.wordByWordContainer}
              multiline={true}
              language={language}
            />
            
            {answerExample.answerPhonetic && (
              <Text style={styles.phoneticText}>{cleanText(answerExample.answerPhonetic)}</Text>
            )}
          </View>
        </Animated.View>
        
        {/* Choices */}
        <Animated.View 
          style={[
            styles.choicesContainer,
            {
              opacity: buttonsAnimation,
              transform: [
                {
                  translateY: buttonsAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0]
                  })
                }
              ]
            }
          ]}
        >
          <TouchableOpacity
            style={[
              styles.choiceButton,
              selectedChoice === 'pair' && styles.selectedButton,
              answered && isPair && styles.correctButton,
              answered && !isPair && selectedChoice === 'pair' && styles.incorrectButton
            ]}
            onPress={() => handleChoice('pair')}
            disabled={answered || showResult || freezeOnWrong}
          >
            <Text style={[
              styles.choiceButtonText,
              selectedChoice === 'pair' && styles.selectedButtonText,
              answered && isPair && styles.correctButtonText,
              answered && !isPair && selectedChoice === 'pair' && styles.incorrectButtonText
            ]}>
              They Match
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.choiceButton,
              selectedChoice === 'notPair' && styles.selectedButton,
              answered && !isPair && styles.correctButton,
              answered && isPair && selectedChoice === 'notPair' && styles.incorrectButton
            ]}
            onPress={() => handleChoice('notPair')}
            disabled={answered || showResult || freezeOnWrong}
          >
            <Text style={[
              styles.choiceButtonText,
              selectedChoice === 'notPair' && styles.selectedButtonText,
              answered && !isPair && styles.correctButtonText,
              answered && isPair && selectedChoice === 'notPair' && styles.incorrectButtonText
            ]}>
              They Don't Match
            </Text>
          </TouchableOpacity>
        </Animated.View>
        
        {/* Feedback Section */}
        {answered && (
          <Animated.View 
            style={[
              styles.feedbackContainer,
              {
                opacity: buttonsAnimation,
                transform: [
                  {
                    scale: buttonsAnimation.interpolate({
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
              (selectedChoice === 'pair' && isPair) || (selectedChoice === 'notPair' && !isPair) 
                ? styles.correctText 
                : styles.incorrectText
            ]}>
              {(selectedChoice === 'pair' && isPair) || (selectedChoice === 'notPair' && !isPair) 
                ? "Correct!" 
                : "Incorrect"}
            </Text>
            <Text style={styles.answerText}>
              These sentences {isPair ? 'DO match' : 'DO NOT match'}.
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    margin: 0,
  },
  scrollViewContent: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 15,
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
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  sentenceHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 10,
  },
  audioButton: {
    backgroundColor: 'rgba(88, 204, 2, 0.3)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
  },
  sentenceTextContainer: {
    backgroundColor: COLORS.lightGray,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
    width: '100%',
    flexDirection: 'column',
  },
  sentenceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  phoneticText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 5,
  },
  translationText: {
    fontSize: 14,
    color: COLORS.primary,
    fontStyle: 'italic',
    marginTop: 5,
  },
  wordByWordContainer: {
    marginTop: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 8,
    flexWrap: 'wrap',
    flexDirection: 'row',
    width: '100%',
  },
  wordByWordTranslationContainer: {
    marginTop: 5,
    backgroundColor: 'rgba(88, 204, 2, 0.1)',
    borderRadius: 8,
    padding: 8,
  },
  choicesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
    marginBottom: 20,
  },
  choiceButton: {
    flex: 1,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
    borderRadius: 12,
    padding: 15,
    margin: 5,
    alignItems: 'center',
  },
  selectedButton: {
    borderColor: COLORS.blue,
    borderWidth: 2,
    backgroundColor: COLORS.lightGray,
  },
  correctButton: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.correctLight,
  },
  incorrectButton: {
    borderColor: COLORS.incorrect,
    backgroundColor: COLORS.incorrectLight,
  },
  choiceButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  selectedButtonText: {
    color: COLORS.blue,
  },
  correctButtonText: {
    color: COLORS.primary,
  },
  incorrectButtonText: {
    color: COLORS.incorrect,
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
