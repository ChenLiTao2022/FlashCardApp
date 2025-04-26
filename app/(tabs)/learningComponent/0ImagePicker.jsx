import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { Audio } from 'expo-av';

// Import a test image to verify images are working
const testImage = require('../../asset/placeholder.png');

// Duolingo-inspired colors
const COLORS = {
  primary: '#58CC02', // Duolingo green
  primaryDark: '#58A700', // Darker green for borders/pressed states
  white: '#FFFFFF',
  lightGray: '#F7F7F7',
  mediumGray: '#E5E5E5',
  darkGray: '#4B4B4B',
  incorrect: '#FF4B4B', // Red for incorrect answers
  correctLight: '#D7FFB8', // Light green background
  incorrectLight: '#FFC1C1', // Light red background
};

export default function ImagePicker({ dueCards, onAnswer, showResult }) {
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [options, setOptions] = useState([]);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [sound, setSound] = useState(null);
  const [optionCards, setOptionCards] = useState([]);
  
  // Initialize the game
  useEffect(() => {
    if (!dueCards || dueCards.length < 3) {
      Alert.alert('Error', 'Need at least 3 cards to play this game');
      return;
    }
    
    const init = async () => {
      setLoading(true);
      
      try {
        // Select a random card for the correct answer
        const correctCardIndex = Math.floor(Math.random() * dueCards.length);
        const correctCard = dueCards[correctCardIndex];
        setSelectedCard(correctCard);
        
        // Log the selected card for debugging
        console.log("Selected Card for ImagePicker:", JSON.stringify(correctCard, null, 2));
        
        // Get two other random cards for wrong options
        const otherCards = dueCards
          .filter((_, index) => index !== correctCardIndex)
          .sort(() => 0.5 - Math.random())
          .slice(0, 2);
        
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
        setIsCorrect(false);
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
  }, [dueCards, showResult]);
  
  // Play the audio for the selected option
  const playAudio = async (index) => {
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
    if (answered) return;
    
    // Play audio for the selected option
    playAudio(index);
    
    // Just select the option, don't answer yet
    setSelectedOptionIndex(index);
  };
  
  // Handle confirm button press
  const handleConfirm = () => {
    if (answered || selectedOptionIndex === null) return;
    
    setAnswered(true);
    
    const isOptionCorrect = options[selectedOptionIndex].isCorrect;
    setIsCorrect(isOptionCorrect);
    
    // Build popup data string for feedback
    let popupString = '';
    
    if (selectedCard) {
      popupString += `Word: ${selectedCard.front}\n`;
      if (selectedCard.phonetic) popupString += `Phonetic: ${selectedCard.phonetic}\n`;
      popupString += `Meaning: ${selectedCard.back}\n`;
      popupString += `Your choice: ${options[selectedOptionIndex].text}\n`;
      
      if (!isOptionCorrect) {
        popupString += `Correct answer: ${selectedCard.front}\n`;
      }
    }
    
    // Call the onAnswer callback with the result
    onAnswer?.(isOptionCorrect, popupString);
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
  
  // Handle case where no card or not enough options
  if (!selectedCard || options.length < 3) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Not enough cards available</Text>
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
      
      {/* Feedback Section (shown after answering) */}
      {answered && (
        <View style={styles.feedbackContainer}>
          <Text style={[
            styles.feedbackText,
            isCorrect ? styles.correctFeedbackText : styles.incorrectFeedbackText
          ]}>
            {isCorrect ? "Correct!" : "Incorrect!"}
          </Text>
          <View style={styles.answerContainer}>
            <Text style={styles.answerText}>
              {selectedCard.front}
            </Text>
            {selectedCard.phonetic && (
              <Text style={styles.answerPhoneticText}>
                {selectedCard.phonetic}
              </Text>
            )}
            <Text style={styles.meaningText}>
              {selectedCard.back}
            </Text>
          </View>
        </View>
      )}
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
    backgroundColor: COLORS.white,
    borderRadius: 16,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.darkGray,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.incorrect,
    textAlign: 'center',
  },
  imageContainer: {
    width: '100%',
    height: width * 0.5,
    backgroundColor: 'transparent',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
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
    color: COLORS.darkGray,
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
    backgroundColor: COLORS.white,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.mediumGray,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
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
    color: COLORS.darkGray,
  },
  correctOptionText: {
    color: COLORS.primaryDark,
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
  },
  answerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  answerPhoneticText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: COLORS.darkGray,
    marginTop: 4,
  },
  meaningText: {
    fontSize: 18,
    color: COLORS.darkGray,
    marginTop: 8,
    textAlign: 'center',
  },
});
