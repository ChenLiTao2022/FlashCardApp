import { FontAwesome } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Easing,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

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

// Placeholder image for when no image is available
const placeholderImage = require('../../asset/placeholder.png');

export default function PhoneticChoice({ activitySequence, currentRound, onAnswer, showResult, freezeOnWrong }) {
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [correctOption, setCorrectOption] = useState(null);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const optionAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const parseCardData = (card) => {
    // Clean up phoneticChoices if it exists
    let parsedChoices = [];
    if (card.phoneticChoices) {
      try {
        parsedChoices = JSON.parse(card.phoneticChoices);
      } catch (e) {
        console.warn('Error parsing phoneticChoices:', e);
      }
    }
    
    // Clean up images if they exist
    let parsedImages = [];
    if (card.images) {
      try {
        parsedImages = JSON.parse(card.images);
      } catch (e) {
        console.warn('Error parsing images:', e);
      }
    }
    
    // Clean up examples if they exist
    let parsedExamples = [];
    if (card.examples) {
      try {
        parsedExamples = JSON.parse(card.examples);
      } catch (e) {
        console.warn('Error parsing examples:', e);
      }
    }
    
    return {
      ...card,
      phoneticChoices: parsedChoices,
      images: parsedImages,
      examples: parsedExamples
    };
  };

  // Initialize game with current activity
  const initializeGame = () => {
    // If component is frozen due to wrong answer, don't reinitialize
    if (freezeOnWrong) {
      return;
    }
    
    if (!activitySequence || activitySequence.length === 0) {
      Alert.alert('Error', 'No activity sequence provided');
      return;
    }
    
    setLoading(true);
    
    try {
      // Get the current activity
      const currentActivity = activitySequence[currentRound - 1];
      
      if (!currentActivity || !currentActivity.mainCard) {
        throw new Error('Invalid activity data');
      }
      
      // Get the main card and other cards
      const mainCard = currentActivity.mainCard;
      const otherCards = currentActivity.otherCards || [];
      
      // Make sure we have at least 2 other cards for options
      if (otherCards.length < 2) {
        throw new Error('Need at least 2 other cards for options');
      }
      
      // Parse the main card
      const parsedCard = parseCardData(mainCard);
      setSelectedCard(parsedCard);
      
      // Check if the card has audio
      if (!parsedCard.frontAudio) {
        throw new Error('Main card must have audio for this exercise');
      }
      
      // Create options: the correct image and 2 other images from other cards
      // Get the image from the main card or use placeholder
      const correctImage = parsedCard.imageUrl || (parsedCard.images && parsedCard.images.length > 0 ? 
        parsedCard.images[0] : null);
      
      // Get images from other cards
      const otherImages = [];
      otherCards.forEach(card => {
        const parsed = parseCardData(card);
        const cardImage = parsed.imageUrl || (parsed.images && parsed.images.length > 0 ? 
          parsed.images[0] : null);
        
        if (cardImage) {
          otherImages.push(cardImage);
        }
      });
      
      // Take just two random other images
      const shuffledOtherImages = otherImages.sort(() => 0.5 - Math.random()).slice(0, 2);
      
      // If we don't have enough images, use null for placeholders
      while (shuffledOtherImages.length < 2) {
        shuffledOtherImages.push(null);
      }
      
      // Create the options array with the correct image and the other images
      const allOptions = [
        { image: correctImage, isCorrect: true },
        ...shuffledOtherImages.map(img => ({ image: img, isCorrect: false }))
      ];
      
      // Shuffle the options
      const shuffledOptions = allOptions.sort(() => 0.5 - Math.random());
      
      // Find index of correct option
      const correctIndex = shuffledOptions.findIndex(option => option.isCorrect);
      setCorrectOption(correctIndex);
      setOptions(shuffledOptions);
      
      // Start animations
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      
      // Staggered animation for options
      Animated.stagger(200, optionAnims.map(anim => 
        Animated.timing(anim, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        })
      )).start();
      
      setLoading(false);
      
 
    } catch (error) {
      console.error('Error initializing game:', error);
      Alert.alert('Error', 'Failed to initialize the game');
      setLoading(false);
    }
  };

  // Play the sound for the selected card
  const playSound = async () => {
    if (isPlaying || !selectedCard || !selectedCard.frontAudio) return;
    
    setIsPlaying(true);
    
    try {
      // Unload any existing sound first
      if (sound) {
        await sound.unloadAsync();
      }
      
      // Load and play the sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: selectedCard.frontAudio },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      
      // Set status update callback to know when playback finishes
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Error playing sound:', error);
      setIsPlaying(false);
    }
  };

  // Handle option selection
  const handleOptionSelect = (option, index) => {
    if (answered || showResult || freezeOnWrong) return;
    
    setSelectedOption(index);
    setAnswered(true);
    
    const isCorrect = option.isCorrect;
    
    // Create a rich popup data object with card details
    let popupData = {
      imageUrl: selectedCard.imageUrl,
      front: selectedCard.front,
      phonetic: selectedCard.phonetic,
      back: selectedCard.back,
      examples: selectedCard.examples || []
    };
    
    onAnswer?.(isCorrect, popupData);
  };

  // Initialize the game when activity sequence or current round changes
  useEffect(() => {
    // Skip initialization if frozen due to wrong answer
    if (!freezeOnWrong) {
      initializeGame();
    }
  }, [activitySequence, currentRound, freezeOnWrong]);

  // Separate useEffect specifically for auto-play audio when card is loaded
  useEffect(() => {
    // Don't play audio if the component is frozen due to wrong answer
    if (freezeOnWrong) {
      return;
    }
    
    if (selectedCard && selectedCard.frontAudio && !loading) {
      console.log("PhoneticChoice - Auto-playing audio for word:", selectedCard.front);
      // Use a longer timeout to ensure components are fully rendered
      const timer = setTimeout(() => {
        playSound();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [selectedCard, loading, freezeOnWrong]);

  // Clean up sounds when component unmounts
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.title}>Listen and choose the matching image</Text>
      
      {/* Audio pronunciation button */}
      <TouchableOpacity 
        style={styles.audioButton}
        onPress={playSound}
        disabled={isPlaying}
      >
        <FontAwesome 
          name="volume-up" 
          size={34} 
          color={isPlaying ? COLORS.primary : COLORS.white} 
        />
        <Text style={styles.audioText}>Listen</Text>
      </TouchableOpacity>
      
      {/* Image options */}
      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <Animated.View 
            key={index}
            style={[
              { 
                opacity: optionAnims[index],
                transform: [{
                  scale: optionAnims[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1]
                  })
                }] 
              }
            ]}
          >
            <TouchableOpacity
              style={[
                styles.optionButton,
                answered && selectedOption === index && (option.isCorrect ? styles.correctOption : styles.incorrectOption),
                answered && index === correctOption && styles.correctOption
              ]}
              onPress={() => handleOptionSelect(option, index)}
              disabled={answered || showResult}
            >
              {option.image ? (
                <Image 
                  source={{ uri: option.image }} 
                  style={styles.optionImage}
                  resizeMode="contain"
                  onError={(e) => {
                    console.log("Failed to load image:", e.nativeEvent.error);
                  }}
                />
              ) : (
                <Image 
                  source={placeholderImage} 
                  style={styles.optionImage}
                  resizeMode="contain"
                />
              )}
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
      
     
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: COLORS.white,
  },
  loadingText: {
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  audioButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    marginBottom: 25,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.mediumGray,
  },
  audioText: {
    marginTop: 5,
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    width: '100%',
    marginBottom: 20,
  },
  optionButton: {
    margin: 8,
    padding: 10,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.mediumGray,
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
  },
  optionImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  correctOption: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.correctLight,
  },
  incorrectOption: {
    borderColor: COLORS.incorrect,
    backgroundColor: COLORS.incorrectLight,
  },
  feedbackContainer: {
    alignItems: 'center',
    marginTop: 20,
    padding: 15,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 10,
    width: '100%',
  },
  feedbackText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  correctText: {
    color: COLORS.primary,
  },
  incorrectText: {
    color: COLORS.incorrect,
  },
  wordText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 5,
  },
  phoneticText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
    marginTop: 5,
  },
});