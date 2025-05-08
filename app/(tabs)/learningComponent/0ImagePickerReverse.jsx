import { Audio } from 'expo-av';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// Import a test image to verify images are working
const testImage = require('../../asset/placeholder.png');

// Dark theme colors
const COLORS = {
  primary: '#58CC02', // Keep Duolingo green
  primaryDark: '#2E5B01', // Darker green for pressed states
  background: '#1A1A1A', // Dark background
  cardBackground: '#252525', // Slightly lighter than background
  white: '#FFFFFF',
  lightGray: '#333333', // Dark gray for card backgrounds
  mediumGray: '#444444', // Medium gray for borders
  textPrimary: '#CCCCCC', // Light gray for text
  textSecondary: '#999999', // Darker gray for secondary text
  incorrect: '#FF4B4B', // Keep red for incorrect answers
  correctLight: 'rgba(88, 204, 2, 0.2)', // More transparent green background
  incorrectLight: 'rgba(255, 75, 75, 0.2)', // More transparent red background
};

export default function ImagePickerReverse({ activitySequence, currentRound, onAnswer, showResult, freezeOnWrong }) {
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [options, setOptions] = useState([]);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [sound, setSound] = useState(null);
  
  // Initialize the game
  useEffect(() => {
    // If component is frozen due to wrong answer, don't reinitialize
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
        
        // The main card is the correct one
        const correctCard = currentActivity.mainCard;
        setSelectedCard(correctCard);
        
        // Get other cards for wrong options
        const otherCards = currentActivity.otherCards || [];
        
        if (otherCards.length < 2) {
          throw new Error('Need at least 2 other cards for options');
        }
        
        // Create all options and shuffle them
        const allOptions = [
          { card: correctCard, isCorrect: true },
          { card: otherCards[0], isCorrect: false },
          { card: otherCards[1], isCorrect: false }
        ].sort(() => 0.5 - Math.random());
        
        setOptions(allOptions);
        setSelectedOptionIndex(null);
        setAnswered(false);
        setLoading(false);
        

        if (!showResult) {
          setTimeout(() => {
            playWordAudio(correctCard);
          }, 100);
        }
      } catch (error) {
        console.error("Error initializing ImagePickerReverse:", error);
        Alert.alert('Error', 'Could not load cards');
        setLoading(false);
      }
    };
    
    init();
    
    // Clean up sound when component unmounts or changes
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [activitySequence, currentRound, showResult, freezeOnWrong]);
  
  // Play the audio for the word
  const playWordAudio = async (card) => {
    // Don't play audio if component is frozen due to wrong answer
    if (freezeOnWrong) return;
    
    try {
      // Unload previous sound if it exists
      if (sound) {
        await sound.unloadAsync();
      }
      
      if (card && card.frontAudio) {
        const { sound: newSound } = await Audio.Sound.createAsync({ uri: card.frontAudio });
        setSound(newSound);
        await newSound.playAsync();
      } else {
        console.log("No audio available for this card");
      }
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };
  
  // Handle image selection
  const handleSelectOption = (index) => {
    if (answered || freezeOnWrong) return;
    
    setSelectedOptionIndex(index);
    setAnswered(true);
    
    const isOptionCorrect = options[index].isCorrect;

    
    // Create a rich popup data object with card details
    let popupData = {
      imageUrl: selectedCard.imageUrl,
      front: selectedCard.front,
      phonetic: selectedCard.phonetic,
      back: selectedCard.back,
      examples: selectedCard.examples || []
    };
    
    // Call the onAnswer callback with the result and popup data
    onAnswer?.(isOptionCorrect, popupData);
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
  


  return (
    <View style={styles.container}>
      {/* Word Display Section */}
      <View style={styles.wordContainer}>
        <Text style={styles.wordText}>{selectedCard.front}</Text>

        <TouchableOpacity 
          style={styles.speakerButton} 
          onPress={() => playWordAudio(selectedCard)}
        >
          <Text style={styles.speakerIcon}>🔊</Text>
        </TouchableOpacity>
      </View>
      
      {/* Question Text */}
      <Text style={styles.questionText}>Choose the matching image</Text>
      
      {/* Image Options Section */}
      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={`option-${index}`}
            style={[
              styles.imageOption,
              selectedOptionIndex === index && styles.selectedOption,
              answered && option.isCorrect && styles.correctOption,
              answered && selectedOptionIndex === index && !option.isCorrect && styles.incorrectOption
            ]}
            onPress={() => !answered && handleSelectOption(index)}
            disabled={answered}
          >
            {option.card.imageUrl ? (
              <Image 
                source={{ uri: option.card.imageUrl }} 
                style={styles.optionImage}
                resizeMode="contain"
              />
            ) : (
              <Image 
                source={testImage} 
                style={styles.optionImage}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
      
     
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.background,
    borderRadius: 16,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.incorrect,
    textAlign: 'center',
  },
  wordContainer: {
    width: '100%',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  wordText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 5,
  },
  phoneticText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: 5,
  },
  speakerButton: {
    position: 'absolute',
    right: 15,
    top: '50%',
    marginTop: -15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakerIcon: {
    fontSize: 24,
    color: COLORS.primary,
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 20,
  },
  optionsContainer: {
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    marginTop: 10,
  },
  imageOption: {
    width: '100%',
    height: width * 0.25,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.mediumGray,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: 'row',
  },
  optionImage: {
    height: '85%',
    aspectRatio: 1,
  },
  selectedOption: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.lightGray,
  },
  correctOption: {
    backgroundColor: COLORS.correctLight,
    borderColor: COLORS.primary,
  },
  incorrectOption: {
    backgroundColor: COLORS.incorrectLight,
    borderColor: COLORS.incorrect,
  },
  feedbackContainer: {
    width: '100%',
    marginTop: 20,
    alignItems: 'center',
  },
  feedbackText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  correctFeedbackText: {
    color: COLORS.primary,
  },
  incorrectFeedbackText: {
    color: COLORS.incorrect,
  },
  answerContainer: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  answerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  answerPhoneticText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  meaningText: {
    fontSize: 18,
    color: COLORS.textPrimary,
    marginTop: 8,
    textAlign: 'center',
  },
});
