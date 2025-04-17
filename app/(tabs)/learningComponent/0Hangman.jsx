import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions
} from 'react-native';

const { width } = Dimensions.get('window');
const LETTER_SIZE = Math.floor(width * 0.08);
const MAX_ATTEMPTS = 6;

export default function Hangman({ dueCards, onAnswer, showResult }) {
  // Game state
  const [targetCard, setTargetCard] = useState(null);
  const [guessedLetters, setGuessedLetters] = useState([]);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  
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

  // Initialize the game with a random card
  useEffect(() => {
    if (!dueCards?.length) return;
    
    const targetIndex = Math.floor(Math.random() * dueCards.length);
    const parsedCard = parseCardData(dueCards[targetIndex]);
    setTargetCard(parsedCard);
    setGuessedLetters([]);
    setWrongAttempts(0);
    setGameOver(false);
    setWon(false);
  }, [dueCards]);

  // Check if the meaning has been guessed or if player lost
  useEffect(() => {
    if (!targetCard) return;
    
    // Convert to lowercase for case-insensitive comparison
    const meaning = targetCard.back.toLowerCase();
    
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
  }, [guessedLetters, wrongAttempts, targetCard, gameOver]);

  // Handle letter selection
  const handleLetterPress = (letter) => {
    if (gameOver || guessedLetters.includes(letter)) return;
    
    // Add to guessed letters
    setGuessedLetters(prev => [...prev, letter]);
    
    // Check if the letter is in the meaning
    const meaning = targetCard.back.toLowerCase();
    if (!meaning.includes(letter)) {
      setWrongAttempts(prev => prev + 1);
    }
  };

  // Handle end of game
  const handleGameEnd = (isWin) => {
    if (!targetCard) return;
    
    // Get random example
    const examples = targetCard.examples || [];
    const randomExample = examples.length > 0 
      ? examples[Math.floor(Math.random() * examples.length)]
      : null;

    // Build popup data string
    let popupString = `${targetCard.front}\n`;
    if (targetCard.phonetic) popupString += `${targetCard.phonetic}\n`;
    if (targetCard.back) popupString += `${targetCard.back}\n`;
    if (randomExample) {
      if (randomExample.question) popupString += `${randomExample.question}\n`;
      if (randomExample.questionTranslation) popupString += `Translation: ${randomExample.questionTranslation}\n`;
    }

    onAnswer?.(isWin, popupString);
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
    if (!targetCard) return null;
    
    const meaning = targetCard.back;
    return (
      <View style={styles.wordContainer}>
        {[...meaning].map((letter, index) => {
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
    const meaning = targetCard?.back.toLowerCase() || '';
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
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    margin: 10,
    width: '100%',
  },
  gameContent: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
    marginTop: 20,
  },
  hintContainer: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 15,
    marginVertical: 6,
    width: '100%',
    alignItems: 'center',
  },
  hintTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  hintText: {
    fontSize: 18,
    color: '#007AFF',
    textAlign: 'center',
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
  },
  hangmanStateUsed: {
    backgroundColor: '#E91E63',
  },
  hangmanStateAvailable: {
    backgroundColor: '#4CAF50',
  },
  wordContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: 6,
    padding: 5,
  },
  letterBox: {
    width: 26,
    height: 36,
    borderBottomWidth: 2,
    borderBottomColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 3,
  },
  letter: {
    fontSize: 24,
    color: '#333',
    fontWeight: 'bold',
  },
  space: {
    fontSize: 24,
    color: 'transparent',
  },
  keyboardContainer: {
    width: '100%',
    marginTop: 5,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 3,
  },
  letterButton: {
    width: 38,
    height: 38,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    margin: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  letterButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: 'bold',
  },
  correctLetter: {
    backgroundColor: '#4CAF50',
  },
  wrongLetter: {
    backgroundColor: '#E91E63',
  },
  guessedLetterText: {
    color: 'white',
  },
});