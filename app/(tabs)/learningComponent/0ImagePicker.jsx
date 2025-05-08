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
};

export default function ImagePicker({ activitySequence, currentRound, onAnswer, showResult, freezeOnWrong }) {
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [options, setOptions] = useState([]);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [sound, setSound] = useState(null);
  const [optionCards, setOptionCards] = useState([]);
  
  // Initialize the game
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
        
        if (otherCards.length < 2) {
          throw new Error('Need at least 2 other cards for options');
        }
        
        // The main card is the correct answer
        const correctCard = mainCard;
        setSelectedCard(correctCard);
        
        // Log the selected card for debugging
        console.log("Selected Card for ImagePicker:", JSON.stringify(correctCard, null, 2));
        
        // Map to keep track of which card corresponds to which option
        const mappedOptionCards = [correctCard, ...otherCards];
        
        // Create all options and shuffle them
        const allOptions = [
          { text: correctCard.front, isCorrect: true, cardIndex: 0 },
          { text: otherCards[0].front, isCorrect: false, cardIndex: 1 },
          { text: otherCards[1].front, isCorrect: false, cardIndex: 2 }
        ].sort(() => 0.5 - Math.random());
        
        setOptionCards(mappedOptionCards);
        setOptions(allOptions);
        setSelectedOptionIndex(null);
        setAnswered(false);
        setLoading(false);
      } catch (error) {
        console.error("Error initializing ImagePicker:", error);
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
  
  // Play the audio for the selected option
  const playAudio = async (index) => {
    if (freezeOnWrong) return;
    
    try {
      // Unload previous sound if it exists
      if (sound) {
        await sound.unloadAsync();
      }
      
      // Get the card associated with this option
      const selectedCardIndex = options[index].cardIndex;
      const card = optionCards[selectedCardIndex];
      
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
  
  // Handle option selection
  const handleSelectOption = (index) => {
    if (answered || freezeOnWrong) return;
    
    // Play audio for the selected option
    playAudio(index);
    
    // Just select the option, don't answer yet
    setSelectedOptionIndex(index);
  };
  
  // Handle confirm button press
  const handleConfirm = () => {
    if (answered || selectedOptionIndex === null || freezeOnWrong) return;
    
    setAnswered(true);
    
    const isOptionCorrect = options[selectedOptionIndex].isCorrect;
    
    // Get the selected card and the correct card to pass to the parent
    const selectedCardIndex = options[selectedOptionIndex].cardIndex;
    const selectedOptionCard = optionCards[selectedCardIndex];
    const correctCard = optionCards[0]; // First card is always the correct one
    
    // Call the onAnswer callback with the result and card info
    onAnswer?.(isOptionCorrect, {
      imageUrl: correctCard.imageUrl,
      front: correctCard.front,
      phonetic: correctCard.phonetic,
      back: correctCard.back,
      examples: Array.isArray(correctCard.examples) ? correctCard.examples : 
               (typeof correctCard.examples === 'string' ? 
                 (correctCard.examples ? JSON.parse(correctCard.examples) : []) : 
                 [{question: "Example with " + correctCard.front, answer: correctCard.back || ""}]),
      userChoice: options[selectedOptionIndex].text
    });
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
      {/* Image Section */}
      <View style={styles.imageContainer}>
        {selectedCard.imageUrl ? (
          <Image 
            source={{ uri: selectedCard.imageUrl }} 
            style={styles.image}
            resizeMode="contain"
            onError={() => console.log("Failed to load image")}
          />
        ) : (
          <Image 
            source={testImage} 
            style={styles.placeholderImage}
            resizeMode="contain"
          />
        )}
      </View>
      
      {/* Question Text and Confirm Button */}
      <View style={styles.headerContainer}>
        <Text style={styles.questionText}>Choose the correct word</Text>
        <TouchableOpacity 
          style={[
            styles.confirmButton, 
            selectedOptionIndex === null && styles.confirmButtonDisabled
          ]} 
          onPress={handleConfirm}
          disabled={selectedOptionIndex === null || answered}
        >
          <Text style={styles.confirmButtonText}>Check</Text>
        </TouchableOpacity>
      </View>
      
      {/* Options Section */}
      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={`option-${index}`}
            style={[
              styles.optionButton,
              selectedOptionIndex === index && styles.selectedOption,
              answered && option.isCorrect && styles.correctOption,
              answered && selectedOptionIndex === index && !option.isCorrect && styles.incorrectOption
            ]}
            onPress={() => !answered && handleSelectOption(index)}
            disabled={answered}
          >
            <Text style={[
              styles.optionText,
              (answered && option.isCorrect) && styles.correctOptionText,
              (answered && selectedOptionIndex === index && !option.isCorrect) && styles.incorrectOptionText
            ]}>
              {option.text}
            </Text>
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
  imageContainer: {
    width: '100%',
    height: width * 0.5,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '90%',
    height: '90%',
  },
  placeholderImage: {
    width: '50%',
    height: '50%',
    opacity: 0.3,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    flex: 1,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  confirmButtonDisabled: {
    backgroundColor: COLORS.mediumGray,
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  optionsContainer: {
    width: '100%',
    marginTop: 10,
  },
  optionButton: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.cardBackground,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.mediumGray,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
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
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  correctOptionText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  incorrectOptionText: {
    color: COLORS.incorrect,
    fontWeight: 'bold',
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
