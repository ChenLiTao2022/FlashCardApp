import { Audio } from 'expo-av';
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
import { WordByWordTranslation } from '../Review';

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

export default function MatchOrNot({ activitySequence, currentRound, onAnswer, showResult, freezeOnWrong, language }) {
  const [loading, setLoading] = useState(true);
  const [mainCard, setMainCard] = useState(null);
  const [replacementCard, setReplacementCard] = useState(null);
  const [displayedSentence, setDisplayedSentence] = useState('');
  const [displayedTranslation, setDisplayedTranslation] = useState('');
  const [selectedChoice, setSelectedChoice] = useState(null); // null, 'match', 'notMatch'
  const [answered, setAnswered] = useState(false);
  const [isMatch, setIsMatch] = useState(false);
  const [originalWord, setOriginalWord] = useState('');
  const [replacedWord, setReplacedWord] = useState('');
  const [wordByWordMap, setWordByWordMap] = useState({});
  const [translationWordByWordMap, setTranslationWordByWordMap] = useState({});
  const [sound, setSound] = useState(null);
  const [selectedExample, setSelectedExample] = useState(null);
  const initialized = useRef(false);
  
  // Animation values
  const titleAnimation = useRef(new Animated.Value(0)).current;
  const sentenceAnimation = useRef(new Animated.Value(0)).current;
  const translationAnimation = useRef(new Animated.Value(0)).current;
  const buttonsAnimation = useRef(new Animated.Value(0)).current;
  
  // Function to remove any # characters from text
  const cleanText = (text) => {
    if (!text) return '';
    return text.replace(/#/g, '');
  };

  // Parse word by word translations from a string format
  const parseWordByWord = (wordByWordStr) => {
    if (!wordByWordStr) return {};
    
    const mappings = {};
    const pairs = wordByWordStr.split('|');
    
    pairs.forEach(pair => {
      const [word, translation] = pair.split('=');
      if (word && translation) {
        mappings[word.trim()] = translation.trim();
      }
    });
    
    return mappings;
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

  // Function to play audio for sentences
  const playSentenceAudio = async (audioUri) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }
      
      if (!audioUri) return;
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      
      // Play the audio
      await newSound.playAsync();
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  // Clean up sound on component unmount
  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);
  
  // Initialize and select a random card
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
        
        // Randomly select an example pair
        const randomExample = mainCardData.examples[Math.floor(Math.random() * mainCardData.examples.length)];
        setSelectedExample(randomExample);
        
        // Decide whether to use the question or answer as our displayed sentence (50/50)
        const useQuestion = Math.random() < 0.5;
        let sentence = useQuestion ? randomExample.question : randomExample.answer;
        const translation = useQuestion ? randomExample.questionTranslation : randomExample.translation;
        const audioUri = useQuestion ? randomExample.questionAudio : randomExample.answerAudio;
        
        if (!sentence || !translation) {
          throw new Error('Example does not have required sentence or translation');
        }
        
        // Parse word-by-word translations from the example if available
        const wordByWordStr = useQuestion ? randomExample.questionWordByWord : randomExample.answerWordByWord;
        let exampleWordByWordMap = {};
        if (wordByWordStr) {
          exampleWordByWordMap = parseWordByWord(wordByWordStr);
        }
        
        // Initialize word by word map with the main card's translations and the example's wordByWord
        let combinedWordByWordMap = { 
          ...(mainCardData.wordByWord || {}),
          ...exampleWordByWordMap
        };
        
        // Parse translation word-by-word if available
        const translationWordByWordStr = useQuestion ? randomExample.questionTranslationWordByWord : randomExample.translationWordByWord;
        let translationMap = {};
        if (translationWordByWordStr) {
          translationMap = parseWordByWord(translationWordByWordStr);
        }
        setTranslationWordByWordMap(translationMap);
        
        // Extract the original word (wrapped in #...#)
        const wordMatch = sentence.match(/#(.*?)#/);
        if (wordMatch && wordMatch[1]) {
          setOriginalWord(wordMatch[1]);
          
          // Determine if this should be a match or not (50% chance)
          const shouldBeMatch = Math.random() < 0.5;
          setIsMatch(shouldBeMatch);
          
          if (!shouldBeMatch) {
            // If not a match, use a word from otherCards or another activity's mainCard
            if (currentActivity.otherCards && currentActivity.otherCards.length > 0) {
              // Use an otherCard front
              const randomOtherCard = parseCardData(currentActivity.otherCards[Math.floor(Math.random() * currentActivity.otherCards.length)]);
              setReplacementCard(randomOtherCard);
              setReplacedWord(randomOtherCard.front);
              sentence = sentence.replace(/#(.*?)#/g, `#${randomOtherCard.front}#`);
              
              // Add word by word translations from the other card
              if (randomOtherCard.wordByWord) {
                combinedWordByWordMap = { ...combinedWordByWordMap, ...randomOtherCard.wordByWord };
              }
              
              // Make sure the replaced word has a translation
              if (randomOtherCard.back && !combinedWordByWordMap[randomOtherCard.front]) {
                combinedWordByWordMap[randomOtherCard.front] = randomOtherCard.back;
              }
            } else if (activitySequence.length > 1) {
              // If no otherCards, try to find another card from the activity sequence
              const otherActivities = activitySequence.filter((_, index) => index !== (currentRound - 1));
              if (otherActivities.length > 0) {
                const randomActivity = otherActivities[Math.floor(Math.random() * otherActivities.length)];
                if (randomActivity.mainCard && randomActivity.mainCard.front) {
                  const otherCardData = parseCardData(randomActivity.mainCard);
                  setReplacementCard(otherCardData);
                  setReplacedWord(otherCardData.front);
                  sentence = sentence.replace(/#(.*?)#/g, `#${otherCardData.front}#`);
                  
                  // Add word by word translations from the other card
                  if (otherCardData.wordByWord) {
                    combinedWordByWordMap = { ...combinedWordByWordMap, ...otherCardData.wordByWord };
                  }
                  
                  // Make sure the replaced word has a translation
                  if (otherCardData.back && !combinedWordByWordMap[otherCardData.front]) {
                    combinedWordByWordMap[otherCardData.front] = otherCardData.back;
                  }
                } else {
                  // Fallback to modifying the original word
                  const originalWordModified = originalWord + 's'; // Simple modification
                  setReplacedWord(originalWordModified);
                  sentence = sentence.replace(/#(.*?)#/g, `#${originalWordModified}#`);
                  
                  // Add a basic translation for the modified word
                  if (!combinedWordByWordMap[originalWordModified] && combinedWordByWordMap[originalWord]) {
                    combinedWordByWordMap[originalWordModified] = combinedWordByWordMap[originalWord] + 's';
                  }
                }
              } else {
                // Fallback to modifying the original word
                const originalWordModified = originalWord + 's'; // Simple modification
                setReplacedWord(originalWordModified);
                sentence = sentence.replace(/#(.*?)#/g, `#${originalWordModified}#`);
                
                // Add a basic translation for the modified word
                if (!combinedWordByWordMap[originalWordModified] && combinedWordByWordMap[originalWord]) {
                  combinedWordByWordMap[originalWordModified] = combinedWordByWordMap[originalWord] + 's';
                }
              }
            } else {
              // As a fallback, modify the original word (add a letter, remove one, etc.)
              const originalWordModified = originalWord + 's'; // Simple modification
              setReplacedWord(originalWordModified);
              sentence = sentence.replace(/#(.*?)#/g, `#${originalWordModified}#`);
              
              // Add a basic translation for the modified word
              if (!combinedWordByWordMap[originalWordModified] && combinedWordByWordMap[originalWord]) {
                combinedWordByWordMap[originalWordModified] = combinedWordByWordMap[originalWord] + 's';
              }
            }
          }
        } else {
          // If there's no marked word, we'll create a modification
          const firstWord = sentence.split(' ')[0];
          setOriginalWord(firstWord);
          
          // Always make it not match for sentences without marked words
          setIsMatch(false);
          
          // Try to use a word from another card instead of just adding 's'
          if (currentActivity.otherCards && currentActivity.otherCards.length > 0) {
            const randomOtherCard = parseCardData(currentActivity.otherCards[Math.floor(Math.random() * currentActivity.otherCards.length)]);
            setReplacementCard(randomOtherCard);
            setReplacedWord(randomOtherCard.front);
            sentence = sentence.replace(firstWord, randomOtherCard.front);
            
            // Add word by word translations from the other card
            if (randomOtherCard.wordByWord) {
              combinedWordByWordMap = { ...combinedWordByWordMap, ...randomOtherCard.wordByWord };
            }
            
            // Make sure the replaced word has a translation
            if (randomOtherCard.back && !combinedWordByWordMap[randomOtherCard.front]) {
              combinedWordByWordMap[randomOtherCard.front] = randomOtherCard.back;
            }
          } else if (activitySequence.length > 1) {
            // Try to find another card from the activity sequence
            const otherActivities = activitySequence.filter((_, index) => index !== (currentRound - 1));
            if (otherActivities.length > 0) {
              const randomActivity = otherActivities[Math.floor(Math.random() * otherActivities.length)];
              if (randomActivity.mainCard && randomActivity.mainCard.front) {
                const otherCardData = parseCardData(randomActivity.mainCard);
                setReplacementCard(otherCardData);
                setReplacedWord(otherCardData.front);
                sentence = sentence.replace(firstWord, otherCardData.front);
                
                // Add word by word translations from the other card
                if (otherCardData.wordByWord) {
                  combinedWordByWordMap = { ...combinedWordByWordMap, ...otherCardData.wordByWord };
                }
                
                // Make sure the replaced word has a translation
                if (otherCardData.back && !combinedWordByWordMap[otherCardData.front]) {
                  combinedWordByWordMap[otherCardData.front] = otherCardData.back;
                }
              } else {
                // Fallback to modifying the original word
                const modifiedWord = firstWord + 's';
                setReplacedWord(modifiedWord);
                sentence = sentence.replace(firstWord, modifiedWord);
                
                // Add a basic translation for the modified word
                if (!combinedWordByWordMap[modifiedWord] && combinedWordByWordMap[firstWord]) {
                  combinedWordByWordMap[modifiedWord] = combinedWordByWordMap[firstWord] + 's';
                }
              }
            } else {
              // Fallback to modifying the original word
              const modifiedWord = firstWord + 's';
              setReplacedWord(modifiedWord);
              sentence = sentence.replace(firstWord, modifiedWord);
              
              // Add a basic translation for the modified word
              if (!combinedWordByWordMap[modifiedWord] && combinedWordByWordMap[firstWord]) {
                combinedWordByWordMap[modifiedWord] = combinedWordByWordMap[firstWord] + 's';
              }
            }
          } else {
            // Fallback to modifying the original word
            const modifiedWord = firstWord + 's';
            setReplacedWord(modifiedWord);
            sentence = sentence.replace(firstWord, modifiedWord);
            
            // Add a basic translation for the modified word
            if (!combinedWordByWordMap[modifiedWord] && combinedWordByWordMap[firstWord]) {
              combinedWordByWordMap[modifiedWord] = combinedWordByWordMap[firstWord] + 's';
            }
          }
        }
        
        // Set the word-by-word mapping
        setWordByWordMap(combinedWordByWordMap);
        
        // Remove # markers for display
        sentence = sentence.replace(/#/g, '');
        setDisplayedSentence(sentence);
        setDisplayedTranslation(translation.replace(/#/g, ''));
        
        initialized.current = true;
        setLoading(false);
        
        // After loading is complete, play the audio if available
        // Removing auto pronunciation
        /* if (audioUri) {
          setTimeout(() => {
            playSentenceAudio(audioUri);
          }, 500);
        } */
      } catch (error) {
        console.error("Error initializing MatchOrNot:", error);
        Alert.alert('Error', 'Could not load examples');
        setLoading(false);
      }
    };
    
    init();
  }, [activitySequence, currentRound, freezeOnWrong]);
  
  // Animation sequence when component renders
  useEffect(() => {
    if (!loading && displayedSentence && displayedTranslation && !freezeOnWrong) {
      // Reset animation values
      titleAnimation.setValue(0);
      sentenceAnimation.setValue(0);
      translationAnimation.setValue(0);
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
        // Sentence container
        Animated.timing(sentenceAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }),
        // Translation container
        Animated.timing(translationAnimation, {
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
  }, [loading, displayedSentence, displayedTranslation, freezeOnWrong]);
  
  // Reset component when showResult changes (new round)
  useEffect(() => {
    // Only reset if not frozen due to wrong answer
    if (!freezeOnWrong) {
    setSelectedChoice(null);
    setAnswered(false);
    }
  }, [showResult, freezeOnWrong]);

  const handleChoice = (choice) => {
    if (answered || showResult || freezeOnWrong) return;
    
    setSelectedChoice(choice);
    setAnswered(true);
    
    const isCorrect = (choice === 'match' && isMatch) || (choice === 'notMatch' && !isMatch);
    
    // Create a rich popup data object with card details
    const popupData = {
      imageUrl: mainCard.imageUrl,
      front: mainCard.front,
      phonetic: mainCard.phonetic,
      back: mainCard.back,
      isMatchOrNotActivity: true,
      sentence: displayedSentence,
      translation: displayedTranslation,
      originalWord: originalWord,
      replacedWord: isMatch ? null : replacedWord,
      isMatch: isMatch,
      userChoice: choice === 'match' ? 'They match' : 'They don\'t match',
      wordByWordMap: wordByWordMap,
      translationWordByWordMap: translationWordByWordMap,
      replacementCard: replacementCard
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
  
  // Handle case where no card could be found or no examples
  if (!mainCard || !displayedSentence || !displayedTranslation) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No examples available for this card</Text>
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
        Do These Match?
      </Animated.Text>
      
      {/* Sentence Section */}
      <Animated.View 
        style={[
          styles.sentenceContainer,
          {
            opacity: sentenceAnimation,
            transform: [
              {
                translateX: sentenceAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-100, 0]
                })
              }
            ]
          }
        ]}
      >
        <Text style={styles.sentenceLabel}>Sentence:</Text>
        
        {/* Word by word translation for sentence */}
        <WordByWordTranslation 
          sentence={displayedSentence}
          wordByWordMap={wordByWordMap}
          containerStyle={styles.wordByWordContainer}
          multiline={true}
          language={language}
        />
      </Animated.View>
      
      {/* Translation Section */}
      <Animated.View 
        style={[
          styles.translationContainer,
          {
            opacity: translationAnimation,
            transform: [
              {
                translateX: translationAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0]
                })
              }
            ]
          }
        ]}
      >
        <Text style={styles.sentenceLabel}>Translation:</Text>
        
        {/* Word by word translation for translation text */}
        {Object.keys(translationWordByWordMap).length > 0 ? (
          <WordByWordTranslation 
            sentence={displayedTranslation}
            wordByWordMap={translationWordByWordMap}
            containerStyle={styles.wordByWordTranslationContainer}
            multiline={true}
            language={language}
          />
        ) : (
          <Text style={styles.translationText}>{displayedTranslation}</Text>
        )}
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
            selectedChoice === 'match' && styles.selectedButton,
            answered && isMatch && styles.correctButton,
            answered && !isMatch && selectedChoice === 'match' && styles.incorrectButton
          ]}
          onPress={() => handleChoice('match')}
          disabled={answered || showResult || freezeOnWrong}
        >
          <Text style={[
            styles.choiceButtonText,
            selectedChoice === 'match' && styles.selectedButtonText,
            answered && isMatch && styles.correctButtonText,
            answered && !isMatch && selectedChoice === 'match' && styles.incorrectButtonText
          ]}>
            Yes, They Match
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.choiceButton,
            selectedChoice === 'notMatch' && styles.selectedButton,
            answered && !isMatch && styles.correctButton,
            answered && isMatch && selectedChoice === 'notMatch' && styles.incorrectButton
          ]}
          onPress={() => handleChoice('notMatch')}
          disabled={answered || showResult || freezeOnWrong}
        >
          <Text style={[
            styles.choiceButtonText,
            selectedChoice === 'notMatch' && styles.selectedButtonText,
            answered && !isMatch && styles.correctButtonText,
            answered && isMatch && selectedChoice === 'notMatch' && styles.incorrectButtonText
          ]}>
            No, They Don't Match
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
            (selectedChoice === 'match' && isMatch) || (selectedChoice === 'notMatch' && !isMatch) 
              ? styles.correctText 
              : styles.incorrectText
          ]}>
            {(selectedChoice === 'match' && isMatch) || (selectedChoice === 'notMatch' && !isMatch) 
              ? "Correct!" 
              : "Incorrect"}
          </Text>
          <Text style={styles.answerText}>
            These {isMatch ? 'DO match' : 'DO NOT match'}.
          </Text>
          {!isMatch && (
            <Text style={styles.answerText}>
              "{replacedWord}" was used instead of "{originalWord}".
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
  sentenceContainer: {
    width: '100%',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
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
  translationText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: COLORS.blue,
  },
  wordByWordContainer: {
    marginTop: 5,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 8,
  },
  wordByWordTranslationContainer: {
    marginTop: 5,
    backgroundColor: 'rgba(28, 176, 246, 0.1)',
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
    marginVertical: 2,
    color: COLORS.textPrimary,
  },
}); 