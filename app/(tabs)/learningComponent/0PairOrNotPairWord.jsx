import { FontAwesome } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// Dark theme colors
const COLORS = {
  primary: '#58CC02', 
  primaryDark: '#2E5B01', 
  background: '#1A1A1A',
  cardBackground: '#252525', 
  white: '#FFFFFF',
  lightGray: '#333333', 
  mediumGray: '#444444',
  textPrimary: '#CCCCCC', 
  textSecondary: '#999999', 
  incorrect: '#FF4B4B', 
  correctLight: 'rgba(88, 204, 2, 0.2)', 
  incorrectLight: 'rgba(255, 75, 75, 0.2)', 
  blue: '#1CB0F6', 
  blueDark: '#0e82b4', 
};

export default function PairOrNotPair({ activitySequence, currentRound, onAnswer, showResult, freezeOnWrong }) {
  const [loading, setLoading] = useState(true);
  const [displayedMeaning, setDisplayedMeaning] = useState(null);
  const [selectedChoice, setSelectedChoice] = useState(null); // null, 'pair', 'notPair'
  const [answered, setAnswered] = useState(false);
  const [isPair, setIsPair] = useState(false);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mainCard, setMainCard] = useState(null);
  const initialized = useRef(false);
  
  const parseCardData = (card) => {
    try {
      // Parse examples if they exist
      const examples = card.examples ? JSON.parse(card.examples) : [];
      
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
        
        // Get the main card and other cards
        const mainCardData = parseCardData(currentActivity.mainCard);
        const otherCards = currentActivity.otherCards ? 
          currentActivity.otherCards.map(card => parseCardData(card)) : [];
        
        // Make sure we have at least 1 other card for a non-matching option
        if (otherCards.length === 0) {
          throw new Error('Need at least 1 other card for options');
        }
        
        setMainCard(mainCardData);
        
        // Determine if this should be a pair (50% chance) - only once on mount
        const shouldBePair = Math.random() < 0.5;
        setIsPair(shouldBePair);
        
        // For the meaning, either use the matching meaning or a random different meaning
        if (shouldBePair) {
          // If pair, use the card's own meaning
          setDisplayedMeaning(mainCardData.back);
        } else {
          // If not pair, use a different card's meaning
          const randomOtherCard = otherCards[Math.floor(Math.random() * otherCards.length)];
          setDisplayedMeaning(randomOtherCard.back);
        }
        
        initialized.current = true;
        setLoading(false);
        
      } catch (error) {
        console.error("Error initializing PairOrNotPair:", error);
        Alert.alert('Error', 'Could not load cards');
        setLoading(false);
      }
    };
    
    init();
  }, [activitySequence, currentRound, freezeOnWrong]); 
  
  // Separate useEffect specifically for auto-play audio when the card is loaded
  useEffect(() => {
    // Don't play audio if the component is frozen due to wrong answer
    if (freezeOnWrong) {
      return;
    }
    
    if (mainCard && mainCard.frontAudio && !loading) {
      console.log("PairOrNotPair - Auto-playing audio for word:", mainCard.front);
      // Use a longer timeout to ensure components are fully rendered
      const timer = setTimeout(() => {
        playWordAudio();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [mainCard, loading, freezeOnWrong]);

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

  const playWordAudio = async () => {
    if (isPlaying || !mainCard || !mainCard.frontAudio) return;
    
    setIsPlaying(true);
    
    try {
      // Unload any existing sound
      if (sound) {
        await sound.unloadAsync();
      }
      
      // Load and play the audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: mainCard.frontAudio }
      );
      
      setSound(newSound);
      
      // Add a listener to reset isPlaying when sound finishes
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
      
      await newSound.playAsync();
    } catch (error) {
      console.error("Error playing audio:", error);
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
      displayedMeaning: displayedMeaning,
      userChoice: choice === 'pair' ? 'They Match' : 'They Don\'t Match',
      correctAnswer: isPair ? 'They Match' : 'They Don\'t Match'
    };
    
    // Call the onAnswer callback with the result and popup data
    onAnswer?.(isCorrect, popupData);
  };

  // Handle loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading cards...</Text>
      </View>
    );
  }
  
  // Handle case where no card could be found
  if (!mainCard || !displayedMeaning) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Not enough cards available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Do These Match?</Text>
      
      {/* Word Section */}
      <View style={styles.sentenceContainer}>
        <View style={styles.wordHeader}>
          <Text style={styles.sentenceLabel}>Word:</Text>
          <TouchableOpacity 
            style={styles.audioButton}
            onPress={playWordAudio}
            disabled={isPlaying}
          >
            <FontAwesome 
              name="volume-up" 
              size={20} 
              color={isPlaying ? COLORS.primary : COLORS.white} 
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.sentenceText}>{mainCard.front}</Text>
        {mainCard.phonetic && (
          <Text style={styles.phoneticText}>{mainCard.phonetic}</Text>
        )}
      </View>
      
      {/* Meaning Section */}
      <View style={styles.sentenceContainer}>
        <Text style={styles.sentenceLabel}>Meaning:</Text>
        <Text style={styles.sentenceText}>{displayedMeaning}</Text>
      </View>
      
      {/* Choices */}
      <View style={styles.choicesContainer}>
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
          ]}>They Match</Text>
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
          ]}>They Don't Match</Text>
        </TouchableOpacity>
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
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
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
    color: COLORS.white,
  },
  phoneticText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: 5,
  },
  translationText: {
    fontSize: 14,
    color: COLORS.textPrimary,
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
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
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
    color: COLORS.textPrimary,
  },
});
