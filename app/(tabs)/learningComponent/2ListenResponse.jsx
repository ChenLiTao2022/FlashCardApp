import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { WordByWordTranslation, parseWordByWord } from '../Review';

const { width } = Dimensions.get('window');

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

export default function ListenResponse({ activitySequence, currentRound, onAnswer, showResult, freezeOnWrong, language }) {
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedExample, setSelectedExample] = useState(null);
  const [options, setOptions] = useState([]);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [optionCards, setOptionCards] = useState([]);
  const [questionWordByWordMap, setQuestionWordByWordMap] = useState({});
  const [optionsWordByWordMaps, setOptionsWordByWordMaps] = useState([]);
  
  const audioRef = useRef(null);

  // Initialize and select a random card and example
  useEffect(() => {
    if (freezeOnWrong) {
      return;
    }
    
    if (!activitySequence || activitySequence.length === 0) {
      Alert.alert('Error', 'No activity sequence provided');
      return;
    }
    
    const init = async () => {
      setLoading(true);
      
      try {
        // Get the current activity from the sequence
        const currentActivity = activitySequence[currentRound - 1];
        
        if (!currentActivity || !currentActivity.mainCard) {
          throw new Error('Invalid activity data');
        }
        
        // Get main card and other cards for this activity
        const mainCard = currentActivity.mainCard;
        const otherCards = currentActivity.otherCards || [];
        
        if (otherCards.length < 1) {
          throw new Error('Need at least 1 other card for options');
        }
        
        // Use the main card as the selected card
        setSelectedCard(mainCard);
        
        // Parse examples and select a random one if examples exist
        let example = null;
        if (mainCard.examples) {
          try {
            const examples = typeof mainCard.examples === 'string' 
              ? JSON.parse(mainCard.examples) 
              : mainCard.examples;
            
            if (examples.length > 0) {
              example = examples[Math.floor(Math.random() * examples.length)];
            }
          } catch (e) {
            console.error("Error parsing examples:", e);
          }
        }
        
        if (!example) {
          // Create a default example if none exists
          example = {
            question: `Example using "${mainCard.front}"`,
            questionPhonetic: mainCard.phonetic,
            questionTranslation: `Translation for ${mainCard.front}`,
            answer: mainCard.back || "Example answer",
          };
        }
        
        setSelectedExample(example);
        
        // Parse word-by-word translations if available
        let wordByWordMap = {};
        if (example.questionWordByWord) {
          wordByWordMap = parseWordByWord(example.questionWordByWord);
        } else if (mainCard.wordByWord) {
          // Use the card's general word-by-word mapping if available
          wordByWordMap = typeof mainCard.wordByWord === 'string'
            ? parseWordByWord(mainCard.wordByWord)
            : (mainCard.wordByWord || {});
        }
        setQuestionWordByWordMap(wordByWordMap);
        
        // Map to keep track of which card corresponds to which option
        const mappedOptionCards = [mainCard, ...otherCards];
        setOptionCards(mappedOptionCards);
        
        // Create options - correct one from example, incorrect ones from other cards
        const correctOption = {
          text: example.answer,
          phonetic: example.answerPhonetic,
          isCorrect: true,
          cardIndex: 0,
          wordByWordMap: example.answerWordByWord 
            ? parseWordByWord(example.answerWordByWord)
            : (mainCard.wordByWord && typeof mainCard.wordByWord === 'string'
               ? parseWordByWord(mainCard.wordByWord)
               : (mainCard.wordByWord || {}))
        };
        
        // Create incorrect options from other cards
        const incorrectOptions = otherCards.map((card, index) => {
          // Try to get an answer from the card's examples, otherwise use the card's back
          let answerText = card.back || "Alternative answer";
          let answerPhonetic = "";
          let wordByWordMap = {};
          
          try {
            if (card.examples) {
              const cardExamples = typeof card.examples === 'string' 
                ? JSON.parse(card.examples) 
                : card.examples;
              
              if (cardExamples.length > 0) {
                const randomExample = cardExamples[Math.floor(Math.random() * cardExamples.length)];
                answerText = randomExample.answer || card.back;
                answerPhonetic = randomExample.answerPhonetic || "";
                
                // Extract word-by-word mapping if available
                if (randomExample.answerWordByWord) {
                  wordByWordMap = parseWordByWord(randomExample.answerWordByWord);
                } else if (card.wordByWord) {
                  wordByWordMap = typeof card.wordByWord === 'string'
                    ? parseWordByWord(card.wordByWord)
                    : (card.wordByWord || {});
                }
              }
            }
          } catch (e) {
            console.error("Error parsing examples for incorrect options:", e);
          }
          
          return {
            text: answerText,
            phonetic: answerPhonetic,
            isCorrect: false,
            cardIndex: index + 1,
            wordByWordMap: wordByWordMap
          };
        });
        
        // Combine and shuffle options
        const allOptions = [correctOption, ...incorrectOptions].sort(() => 0.5 - Math.random());
        setOptions(allOptions);
        setOptionsWordByWordMaps(allOptions.map(option => option.wordByWordMap));
        
        setSelectedOptionIndex(null);
        setAnswered(false);
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
  }, [activitySequence, currentRound, showResult, freezeOnWrong]);
  
  // Auto-play audio when component is mounted and data is loaded
  useEffect(() => {
    if (!loading && selectedExample && !freezeOnWrong) {
      // Short delay to ensure everything is rendered
      const timer = setTimeout(() => {
        playAudio();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [loading, selectedExample, freezeOnWrong]);
  
  // Reset component when showResult changes (new round)
  useEffect(() => {
    setSelectedOptionIndex(null);
    setAnswered(false);
  }, [showResult]);

  const playAudio = async () => {
    if (freezeOnWrong || !selectedExample) return;
    
    try {
      // Stop any existing audio
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
      
      setIsPlaying(true);
      
      // Load and play the audio from the example or from the card if example doesn't have audio
      const audioUri = selectedExample.questionAudio || selectedCard?.frontAudio;
      
      if (!audioUri) {
        Alert.alert('No Audio', 'This example does not have audio available.');
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
      Alert.alert('Error', 'Could not play audio');
      setIsPlaying(false);
    }
  };
  
  // Function to play option audio
  const playOptionAudio = async (option) => {
    if (freezeOnWrong || answered) return;
    
    try {
      // Stop any existing audio
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
      
      // Get the card and audio URI that corresponds to this option
      const selectedCardIndex = option.cardIndex;
      const card = optionCards[selectedCardIndex];
      
      // The audio we want to play should match the text that's displayed in the option
      // This ensures we're playing the correct answer audio for each option
      let audioUri = null;
      
      if (option.isCorrect) {
        // For correct option, use the answerAudio from the current example
        audioUri = selectedExample.answerAudio;
      } else if (card) {
        // For incorrect options, find the answer audio that matches this text
        if (card.examples) {
          try {
            const cardExamples = typeof card.examples === 'string' 
              ? JSON.parse(card.examples) 
              : card.examples;
            
            // Try to find an example with an answer that matches this option's text
            const matchingExample = cardExamples.find(
              ex => ex.answer && cleanText(ex.answer) === cleanText(option.text)
            );
            
            if (matchingExample && matchingExample.answerAudio) {
              audioUri = matchingExample.answerAudio;
            } else if (cardExamples.length > 0 && cardExamples[0].answerAudio) {
              // Fallback to first example's answer audio
              audioUri = cardExamples[0].answerAudio;
            }
          } catch (e) {
            console.error("Error parsing examples for audio:", e);
          }
        }
        
        // Fallback to frontAudio if no answerAudio is available
        if (!audioUri && card.frontAudio) {
          audioUri = card.frontAudio;
        }
      }
      
      if (!audioUri) {
        console.log("No answer audio available for this option");
        return;
      }
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );
      
      setSound(newSound);
    } catch (error) {
      console.error("Error playing option audio:", error);
    }
  };

  const handleSelectOption = (index) => {
    if (answered || freezeOnWrong) return;
    
    setSelectedOptionIndex(index);
    
    // Play the audio for this option
    playOptionAudio(options[index]);
  };
  
  const handleConfirm = () => {
    if (answered || selectedOptionIndex === null || freezeOnWrong) return;
    
    setAnswered(true);
    
    const isOptionCorrect = options[selectedOptionIndex].isCorrect;
    
    // Build popup data string
    let popupObj = {
      front: selectedCard.front,
      phonetic: selectedCard.phonetic,
      back: selectedCard.back,
      examples: [
        {
          question: selectedExample.question,
          questionPhonetic: selectedExample.questionPhonetic,
          questionTranslation: selectedExample.questionTranslation,
          questionAudio: selectedExample.questionAudio,
          answer: selectedExample.answer,
          answerPhonetic: selectedExample.answerPhonetic,
          answerAudio: selectedExample.answerAudio,
          translation: selectedExample.translation
        }
      ],
      userChoice: options[selectedOptionIndex].text
    };
    
    // Call the onAnswer callback with the result
    onAnswer?.(isOptionCorrect, popupObj);
  };

  // Function to remove any # characters from text
  const cleanText = (text) => {
    if (!text) return '';
    return text.replace(/#/g, '');
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
  if (!selectedCard || !selectedExample) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No examples available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.gameContent}>
        
        {/* Question Section */}
        <View style={styles.questionContainer}>
          <View style={styles.questionTextContainer}>
            <TouchableOpacity 
              style={styles.audioIconButton}
              onPress={playAudio}
              disabled={isPlaying || showResult || freezeOnWrong}
            >
              <Ionicons 
                name={isPlaying ? "volume-high" : "play-circle"} 
                size={22} 
                color={COLORS.primary} 
              />
              <Text style={styles.audioText}>Listen</Text>
            </TouchableOpacity>
            
            <View style={styles.sentenceWrapper}>
              <WordByWordTranslation 
                sentence={cleanText(selectedExample.question)}
                wordByWordMap={questionWordByWordMap}
                containerStyle={styles.wordByWordContainer}
                multiline={true}
                language={language}
              />
            </View>
            
            {selectedExample.questionPhonetic && (
              <Text style={styles.phoneticText}>{cleanText(selectedExample.questionPhonetic)}</Text>
            )}
            {selectedExample.questionTranslation && (
              <Text style={styles.translationText}>{cleanText(selectedExample.questionTranslation)}</Text>
            )}
          </View>
        </View>
        
        <Text style={styles.chooseText}>Choose the correct response:</Text>
        
        {/* Answer Options */}
        <View style={styles.answersContainer}>
          {options.map((answer, index) => {
            const isSelected = selectedOptionIndex === index;
            const showCorrectness = answered && isSelected;
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.answerButton,
                  isSelected && styles.selectedButton,
                  answered && answer.isCorrect && styles.correctButton,
                  answered && isSelected && !answer.isCorrect && styles.incorrectButton
                ]}
                onPress={() => handleSelectOption(index)}
                disabled={answered || freezeOnWrong}
              >
                <WordByWordTranslation 
                  sentence={cleanText(answer.text)}
                  wordByWordMap={answer.wordByWordMap || {}}
                  containerStyle={styles.wordByWordAnswerContainer}
                  multiline={true}
                  language={language}
                />
              </TouchableOpacity>
            );
          })}
          
          {/* Check button below options */}
          <TouchableOpacity 
            style={[
              styles.confirmButton, 
              selectedOptionIndex === null && styles.confirmButtonDisabled
            ]} 
            onPress={handleConfirm}
            disabled={selectedOptionIndex === null || answered || freezeOnWrong}
          >
            <Text style={styles.confirmButtonText}>Check</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    margin: 0,
    width: '100%',
    height: '100%',
  },
  gameContent: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.incorrect,
    textAlign: 'center',
  },
  questionContainer: {
    width: '100%',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 0,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  textWithAudioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  audioIconButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(28, 176, 246, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  audioText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 4,
  },
  questionTextContainer: {
    width: '100%',
    alignItems: 'flex-start',
    backgroundColor: COLORS.lightGray,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  sentenceWrapper: {
    width: '100%',
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: COLORS.white,
  },
  phoneticText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: 5,
  },
  translationText: {
    fontSize: 16,
    color: COLORS.primary,
    fontStyle: 'italic',
  },
  chooseText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  answersContainer: {
    width: '100%',
    flex: 1,
  },
  answerButton: {
    width: '100%',
    backgroundColor: COLORS.cardBackground,
    borderWidth: 2,
    borderColor: COLORS.mediumGray,
    borderRadius: 12,
    padding: 15,
    marginVertical: 8,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedButton: {
    borderColor: COLORS.blue,
    backgroundColor: COLORS.lightGray,
  },
  correctButton: {
    backgroundColor: COLORS.correctLight,
    borderColor: COLORS.primary,
  },
  incorrectButton: {
    backgroundColor: COLORS.incorrectLight,
    borderColor: COLORS.incorrect,
  },
  answerText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: COLORS.white,
  },
  correctOptionText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  incorrectOptionText: {
    color: COLORS.incorrect,
    fontWeight: 'bold',
  },
  answerPhonetic: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 5,
  },
  confirmButton: {
    backgroundColor: COLORS.blue,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: COLORS.blueDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.blueDark,
    marginTop: 15,
    alignSelf: 'center',
    width: '60%',
  },
  confirmButtonDisabled: {
    backgroundColor: COLORS.mediumGray,
    shadowOpacity: 0,
    elevation: 0,
    borderColor: COLORS.mediumGray,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  wordByWordContainer: {
    width: '100%',
    backgroundColor: 'transparent',
    padding: 0,
  },
  wordByWordAnswerContainer: {
    backgroundColor: 'transparent',
    padding: 0,
    marginTop: 4,
    width: '100%',
  },
});
