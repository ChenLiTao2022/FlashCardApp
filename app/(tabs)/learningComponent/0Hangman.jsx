import { Audio } from 'expo-av';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');
const LETTER_SIZE = Math.floor(width * 0.08);
const MAX_ATTEMPTS = 6;

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

export default function Hangman({ activitySequence, currentRound, onAnswer, showResult, freezeOnWrong }) {
  // Game state
  const [targetCard, setTargetCard] = useState(null);
  const [guessedLetters, setGuessedLetters] = useState([]);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [sound, setSound] = useState(null);
  const [cleanedMeaning, setCleanedMeaning] = useState('');
  
  // Memoize the current activity to prevent unnecessary re-renders
  const currentActivity = useMemo(() => {
    if (!activitySequence || activitySequence.length === 0 || currentRound <= 0) {
      return null;
    }
    return activitySequence[currentRound - 1];
  }, [activitySequence, currentRound]);
  
  // Parse card data helper
  const parseCardData = (card) => {
    try {
      return {
        ...card,
        examples: card.examples ? JSON.parse(card.examples) : [],
        unsplashImages: card.unsplashImages ? JSON.parse(card.unsplashImages) : []
      };
    } catch (error) {
      console.error("Error parsing card data:", error);
      return card;
    }
  };
  
  // Function to remove parenthetical content from meaning
  const cleanParentheses = (text) => {
    if (!text) return '';
    
    let result = text;
    let stillHasParentheses = true;
    
    // Repeatedly remove parentheses until none remain
    // This handles nested parentheses by removing the outermost pairs first
    while (stillHasParentheses) {
      const regex = /\([^()]*\)/g;
      const newResult = result.replace(regex, '');
      
      // If the text didn't change, there are no more parentheses to remove
      if (newResult === result) {
        stillHasParentheses = false;
      }
      
      result = newResult;
    }
    
    // Clean up any double spaces created by removing parentheses
    return result.replace(/\s+/g, ' ').trim();
  };
  
  // Play audio for the word
  const playWordAudio = async () => {
    if (!targetCard || !targetCard.frontAudio) return;
    
    try {
      // Unload any existing sound
      if (sound) {
        await sound.unloadAsync();
      }
      
      // Load and play the audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: targetCard.frontAudio }
      );
      
      setSound(newSound);
      await newSound.playAsync();
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };

  // Initialize the game with the current activity's card
  useEffect(() => {
    // If game is frozen due to wrong answer, don't reinitialize
    if (freezeOnWrong) {
      return;
    }
    
    if (!currentActivity) {
      return;
    }
    
    try {
      // Get the current activity
      if (!currentActivity.mainCard) {
        throw new Error('Invalid activity data');
      }
      
      // Use the main card from the current activity
      const parsedCard = parseCardData(currentActivity.mainCard);
      setTargetCard(parsedCard);
      
      // Clean the meaning by removing parenthetical content
      const cleanedText = cleanParentheses(parsedCard.back);
      setCleanedMeaning(cleanedText);
      
      // Reset game state
      setGuessedLetters([]);
      setWrongAttempts(0);
      setGameOver(false);
      setWon(false);
      
    } catch (error) {
      console.error("Error initializing Hangman:", error);
      Alert.alert('Error', 'Could not load card for Hangman game');
    }
  }, [currentActivity, freezeOnWrong]);
  
  // Separate useEffect specifically for auto-play audio when card is loaded
  useEffect(() => {
    // Don't play audio if the component is frozen due to wrong answer
    if (freezeOnWrong) {
      return;
    }
    
    if (targetCard && targetCard.frontAudio) {
      // Use a longer timeout to ensure components are fully rendered
      const timer = setTimeout(() => {
        playWordAudio();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [targetCard, freezeOnWrong]);
  
  // Clean up sound when component unmounts
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Check if the meaning has been guessed or if player lost
  useEffect(() => {
    if (!targetCard || !cleanedMeaning) return;
    
    // Convert to lowercase for case-insensitive comparison
    const meaning = cleanedMeaning.toLowerCase();
    
    // Check if all letters in the meaning have been guessed
    const allLettersGuessed = [...meaning].every(letter => 
      letter === ' ' || letter === '-' || guessedLetters.includes(letter.toLowerCase())
    );
    
    if (allLettersGuessed && !gameOver) {
      setWon(true);
      setGameOver(true);
      // Small delay to show the completed meaning before calling onAnswer
      setTimeout(() => {
        handleGameEnd(true);
      }, 500);
    } else if (wrongAttempts >= MAX_ATTEMPTS && !gameOver) {
      setGameOver(true);
      // Small delay to show the final hangman state before calling onAnswer
      setTimeout(() => {
        handleGameEnd(false);
      }, 500);
    }
  }, [guessedLetters, wrongAttempts, cleanedMeaning, gameOver]);

  // Handle letter selection
  const handleLetterPress = (letter) => {
    if (gameOver || guessedLetters.includes(letter) || freezeOnWrong) return;
    
    // Add to guessed letters
    setGuessedLetters(prev => [...prev, letter]);
    
    // Check if the letter is in the meaning
    const meaning = cleanedMeaning.toLowerCase();
    if (!meaning.includes(letter)) {
      setWrongAttempts(prev => prev + 1);
    }
  };

  // Handle end of game
  const handleGameEnd = (isWin) => {
    if (!targetCard) return;
    
    // Create a rich popup data object with card details
    let popupData = {
      imageUrl: targetCard.imageUrl,
      front: targetCard.front,
      phonetic: targetCard.phonetic,
      back: targetCard.back,
      examples: targetCard.examples || []
    };
    
    // Format the response to match the pattern expected by Review
    onAnswer?.(isWin, popupData);
  };

  // Render the hangman figure based on wrong attempts
  const renderHangman = () => {
    return (
      <View style={styles.hangmanContainer}>
        <View style={styles.hangmanStateContainer}>
          {Array(MAX_ATTEMPTS).fill(0).map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.hangmanStateIndicator, 
                index < wrongAttempts ? styles.hangmanStateUsed : styles.hangmanStateAvailable
              ]} 
            />
          ))}
        </View>
      </View>
    );
  };

  // Render word to guess with blanks for unguessed letters
  const renderWord = () => {
    if (!targetCard || !cleanedMeaning) return null;
    
    return (
      <View style={styles.wordContainer}>
        {[...cleanedMeaning].map((letter, index) => {
          const isSpecialChar = letter === ' ' || letter === '-';
          const isGuessed = guessedLetters.includes(letter.toLowerCase());
          const shouldShow = isSpecialChar || isGuessed || gameOver;
          
          return (
            <View key={index} style={styles.letterBox}>
              {isSpecialChar ? (
                <Text style={styles.space}>{letter}</Text>
              ) : (
                <Text style={styles.letter}>
                  {shouldShow ? letter : '_'}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  // Render individual letter button
  const renderLetterButton = (letter) => {
    const isGuessed = guessedLetters.includes(letter);
    const meaning = cleanedMeaning?.toLowerCase() || '';
    const isInMeaning = meaning.includes(letter);
    
    let buttonStyle = [styles.letterButton];
    let textStyle = [styles.letterButtonText];
    
    if (isGuessed) {
      buttonStyle.push(isInMeaning ? styles.correctLetter : styles.wrongLetter);
      textStyle.push(styles.guessedLetterText);
    }
    
    return (
      <TouchableOpacity
        key={letter}
        style={buttonStyle}
        onPress={() => handleLetterPress(letter)}
        disabled={isGuessed || gameOver}
      >
        <Text style={textStyle}>{letter.toUpperCase()}</Text>
      </TouchableOpacity>
    );
  };

  // If no cards are available or target card hasn't been set yet
  if (!targetCard) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading game...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.gameContent}>
        <View style={styles.hintContainer}>
          <Text style={styles.hintTitle}>Guess the English meaning:</Text>
          <View style={styles.wordInfoContainer}>
            <Text style={styles.hintText}>{targetCard.front}</Text>
            {targetCard.phonetic && <Text style={styles.phoneticText}> ({targetCard.phonetic})</Text>}
            <TouchableOpacity 
              style={styles.audioButton}
              onPress={playWordAudio}
            >
              <Text style={styles.audioIcon}>🔊</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {renderHangman()}
        
        {renderWord()}
        
        <View style={styles.keyboardContainer}>
          <View style={styles.keyboardRow}>
            {['a','b','c','d','e','f','g'].map(letter => renderLetterButton(letter))}
          </View>
          
          <View style={styles.keyboardRow}>
            {['h','i','j','k','l','m','n'].map(letter => renderLetterButton(letter))}
          </View>
          
          <View style={styles.keyboardRow}>
            {['o','p','q','r','s','t','u'].map(letter => renderLetterButton(letter))}
          </View>
          
          <View style={styles.keyboardRow}>
            {['v','w','x','y','z'].map(letter => renderLetterButton(letter))}
          </View>
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
    justifyContent: 'space-between',
  },
  loadingText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginTop: 20,
  },
  hintContainer: {
    backgroundColor: COLORS.cardBackground,
    padding: 15,
    borderRadius: 16,
    marginVertical: 6,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  hintTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 5,
  },
  hintText: {
    fontSize: 18,
    color: COLORS.primary,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  wordInfoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneticText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  audioButton: {
    backgroundColor: 'rgba(88, 204, 2, 0.3)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
  },
  audioIcon: {
    fontSize: 16,
    color: COLORS.white,
  },
  hangmanContainer: {
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  hangmanStateContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 5,
  },
  hangmanStateIndicator: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    margin: 4,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  hangmanStateUsed: {
    backgroundColor: COLORS.incorrect,
  },
  hangmanStateAvailable: {
    backgroundColor: COLORS.primary,
  },
  wordContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: 6,
    padding: 10,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
    width: '100%',
  },
  letterBox: {
    width: 32,
    height: 40,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.mediumGray,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  letter: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  space: {
    fontSize: 24,
    color: 'transparent',
  },
  keyboardContainer: {
    width: '100%',
    marginTop: 5,
    marginBottom: 10,
    backgroundColor: COLORS.cardBackground,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.mediumGray,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 4,
  },
  letterButton: {
    width: 38,
    height: 38,
    backgroundColor: COLORS.blue,
    borderRadius: 10,
    margin: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.blueDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.blueDark,
  },
  letterButtonText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  correctLetter: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  wrongLetter: {
    backgroundColor: COLORS.incorrect,
    shadowColor: '#d62828',
    borderColor: '#d62828',
  },
  guessedLetterText: {
    color: COLORS.white,
  },
});