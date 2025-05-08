import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  Animated,
  Easing
} from 'react-native';
import { Audio } from 'expo-av';
import { FontAwesome } from '@expo/vector-icons';

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

export default function ListenWrite({ activitySequence, currentRound, onAnswer, showResult, freezeOnWrong }) {
  const [loading, setLoading] = useState(true);
  const [mainCard, setMainCard] = useState(null);
  const [selectedExample, setSelectedExample] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingSlow, setIsPlayingSlow] = useState(false);
  const [sound, setSound] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(null);
  const initialized = useRef(false);
  
  const inputRef = useRef(null);

  // Animation values
  const titleAnimation = useRef(new Animated.Value(0)).current;
  const audioControlsAnimation = useRef(new Animated.Value(0)).current;
  const inputAnimation = useRef(new Animated.Value(0)).current;
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
        
        // Filter examples that have audio
        const examplesWithAudio = mainCardData.examples.filter(
          example => example.questionAudio
        );
        
        if (examplesWithAudio.length === 0) {
          throw new Error('No examples with audio available');
        }
        
        // Store main card
        setMainCard(mainCardData);
        
        // Select a random example with audio
        const randomExample = examplesWithAudio[Math.floor(Math.random() * examplesWithAudio.length)];
        setSelectedExample(randomExample);
        
        initialized.current = true;
        setLoading(false);
      } catch (error) {
        console.error("Error initializing ListenWrite:", error);
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
  }, [activitySequence, currentRound, freezeOnWrong]);
  
  // Auto-play audio when component is mounted and data is loaded
  useEffect(() => {
    if (!loading && selectedExample && !freezeOnWrong) {
      // Short delay to ensure everything is rendered
      const timer = setTimeout(() => {
        playAudio(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [loading, selectedExample, freezeOnWrong]);
  
  // Animation sequence when component renders
  useEffect(() => {
    if (!loading && selectedExample && !freezeOnWrong) {
      // Reset animation values
      titleAnimation.setValue(0);
      audioControlsAnimation.setValue(0);
      inputAnimation.setValue(0);
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
        // Audio controls
        Animated.timing(audioControlsAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }),
        // Input container
        Animated.timing(inputAnimation, {
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
  }, [loading, selectedExample, freezeOnWrong]);
  
  // Reset component when showResult changes (new round)
  useEffect(() => {
    // Only reset if not frozen due to wrong answer
    if (!freezeOnWrong) {
    setUserInput('');
    setAnswered(false);
    setCorrect(null);
    }
  }, [showResult, freezeOnWrong]);

  const playAudio = async (slowDown = false) => {
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
      
      if (slowDown) {
        setIsPlayingSlow(true);
        setIsPlaying(false);
      } else {
        setIsPlayingNormal(true);
        setIsPlayingSlow(false);
      }
      
      // Load and play the audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: selectedExample.questionAudio },
        { 
          shouldPlay: true,
          rate: slowDown ? 0.7 : 1.0  // Play slower if slowDown is true
        }
      );
      
      setSound(newSound);
      
      // Wait for audio to finish
      newSound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish) {
          if (slowDown) {
            setIsPlayingSlow(false);
          } else {
            setIsPlayingNormal(false);
          }
        }
      });
    } catch (error) {
      console.error("Error playing audio:", error);
      Alert.alert('Error', 'Could not play audio');
      setIsPlayingNormal(false);
      setIsPlayingSlow(false);
    }
  };

  const checkAnswer = () => {
    if (!userInput.trim() || answered || freezeOnWrong) return;
    
    Keyboard.dismiss();
    
    // Compare user input with correct sentence (case insensitive)
    const normalizedInput = userInput.trim().toLowerCase();
    const normalizedCorrect = selectedExample.question.toLowerCase();
    
    const isCorrect = normalizedInput === normalizedCorrect;
    setCorrect(isCorrect);
    setAnswered(true);
    
    // Create a rich popup data object with card details
    const popupData = {
      imageUrl: mainCard.imageUrl,
      front: mainCard.front,
      phonetic: mainCard.phonetic,
      back: mainCard.back,
      isListenWriteActivity: true,
      question: selectedExample.question,
      userAnswer: userInput,
      questionPhonetic: selectedExample.questionPhonetic,
      questionTranslation: selectedExample.questionTranslation
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
  
  // Handle case where no card or example could be found
  if (!mainCard || !selectedExample) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No examples available</Text>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
          Listen and Write
        </Animated.Text>
        
        {/* Audio Controls Section */}
        <Animated.View 
          style={[
            styles.audioControlsContainer,
            {
              opacity: audioControlsAnimation,
              transform: [
                {
                  translateY: audioControlsAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0]
                  })
                }
              ]
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.audioButton}
            onPress={() => playAudio(false)}
            disabled={isPlaying || isPlayingSlow || showResult || freezeOnWrong}
          >
            <FontAwesome 
              name={isPlaying ? "volume-up" : "play-circle"} 
              size={30} 
              color={COLORS.primary} 
            />
            <Text style={styles.audioButtonText}>
              {isPlaying ? "Playing..." : "Normal Speed"}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.audioButton}
            onPress={() => playAudio(true)}
            disabled={isPlaying || isPlayingSlow || showResult || freezeOnWrong}
          >
            <FontAwesome 
              name={isPlayingSlow ? "volume-down" : "play-circle-o"} 
              size={30} 
              color={COLORS.blue} 
            />
            <Text style={styles.audioButtonText}>
              {isPlayingSlow ? "Playing..." : "Slow Speed"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
        
        {/* Input Section */}
        <Animated.View 
          style={[
            styles.inputContainer,
            {
              opacity: inputAnimation,
              transform: [
                {
                  translateY: inputAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0]
                  })
                }
              ]
            }
          ]}
        >
          <Text style={styles.instructionText}>Write what you hear:</Text>
          <TextInput
            ref={inputRef}
            style={[
              styles.textInput,
              answered && (correct ? styles.correctInput : styles.incorrectInput)
            ]}
            value={userInput}
            onChangeText={setUserInput}
            placeholder="Type the sentence here..."
            placeholderTextColor={COLORS.textSecondary}
            multiline={true}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!answered && !showResult && !freezeOnWrong}
          />
          
          {answered && (
            <View style={styles.feedbackContainer}>
              <Text style={[
                styles.feedbackText,
                correct ? styles.correctText : styles.incorrectText
              ]}>
                {correct ? "Correct!" : "Incorrect"}
              </Text>
              {!correct && (
                <Text style={styles.correctAnswerText}>
                  Correct answer: {cleanText(selectedExample.question)}
                </Text>
              )}
            </View>
          )}
        </Animated.View>
        
        {/* Check Answer Button */}
        <Animated.View
          style={[
            {
              width: '100%',
              alignItems: 'center',
              opacity: buttonsAnimation,
              transform: [
                {
                  translateY: buttonsAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0]
                  })
                }
              ]
            }
          ]}
        >
          <TouchableOpacity
            style={[
              styles.checkButton,
              (!userInput.trim() || answered || showResult || freezeOnWrong) && styles.disabledButton
          ]}
          onPress={checkAnswer}
            disabled={!userInput.trim() || answered || showResult || freezeOnWrong}
        >
          <Text style={styles.checkButtonText}>Check</Text>
        </TouchableOpacity>
        
          {/* Translation Hint */}
        {selectedExample.questionTranslation && (
          <TouchableOpacity 
            style={styles.hintButton}
            onPress={() => Alert.alert("Translation", selectedExample.questionTranslation)}
              disabled={showResult || freezeOnWrong}
          >
            <Text style={styles.hintButtonText}>Show Translation Hint</Text>
          </TouchableOpacity>
        )}
        </Animated.View>
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
  audioControlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  audioButton: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: COLORS.cardBackground,
    width: '45%',
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  audioButtonText: {
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
    color: COLORS.textPrimary,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  instructionText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.textPrimary,
  },
  textInput: {
    width: '100%',
    height: 120,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: COLORS.cardBackground,
    textAlignVertical: 'top',
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
  feedbackContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  correctText: {
    color: COLORS.primary,
  },
  incorrectText: {
    color: COLORS.incorrect,
  },
  correctAnswerText: {
    marginTop: 5,
    fontSize: 14,
    fontStyle: 'italic',
    color: COLORS.textPrimary,
  },
  checkButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  checkButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: COLORS.mediumGray,
    opacity: 0.7,
  },
  hintButton: {
    marginTop: 10,
  },
  hintButtonText: {
    color: COLORS.blue,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
