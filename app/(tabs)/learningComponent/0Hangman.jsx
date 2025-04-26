import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Easing
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
  
  // Animation values
  const hintAnimation = useRef(new Animated.Value(0)).current;
  const hangmanAnimation = useRef(new Animated.Value(0)).current;
  const wordAnimation = useRef(new Animated.Value(0)).current;
  const keyboardRowAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0)
  ]).current;
  
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
  
  // Start animations when game is initialized
  useEffect(() => {
    if (targetCard) {
      // Reset all animations
      hintAnimation.setValue(0);
      hangmanAnimation.setValue(0);
      wordAnimation.setValue(0);
      keyboardRowAnimations.forEach(anim => anim.setValue(0));
      
      // Run animations in sequence
      Animated.sequence([
        // Hint animation
        Animated.timing(hintAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5))
        }),
        
        // Hangman animation
        Animated.timing(hangmanAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }),
        
        // Word container animation
        Animated.timing(wordAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }),
        
        // Keyboard rows animation (staggered)
        Animated.stagger(150, 
          keyboardRowAnimations.map(anim => 
            Animated.timing(anim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic)
            })
          )
        )
      ]).start();
    }
  }, [targetCard]);

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
      <Animated.View 
        style={[
          styles.hangmanContainer,
          {
            opacity: hangmanAnimation,
            transform: [
              {
                translateY: hangmanAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0]
                })
              }
            ]
          }
        ]}
      >
        <View style={styles.hangmanStateContainer}>
          {Array(MAX_ATTEMPTS).fill(0).map((_, index) => (
            <Animated.View 
              key={index} 
              style={[
                styles.hangmanStateIndicator, 
                index < wrongAttempts ? styles.hangmanStateUsed : styles.hangmanStateAvailable,
                {
                  opacity: hangmanAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1]
                  }),
                  transform: [
                    {
                      scale: hangmanAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1]
                      })
                    }
                  ]
                }
              ]} 
            />
          ))}
        </View>
      </Animated.View>
    );
  };

  // Render word to guess with blanks for unguessed letters
  const renderWord = () => {
    if (!targetCard) return null;
    
    const meaning = targetCard.back;
    return (
      <Animated.View 
        style={[
          styles.wordContainer,
          {
            opacity: wordAnimation,
            transform: [
              {
                translateY: wordAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })
              }
            ]
          }
        ]}
      >
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
      </Animated.View>
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
        <Animated.View 
          style={[
            styles.hintContainer,
            {
              opacity: hintAnimation,
              transform: [
                {
                  translateY: hintAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-30, 0]
                  })
                }
              ]
            }
          ]}
        >
          <Text style={styles.hintTitle}>Guess the English meaning:</Text>
          <View style={styles.wordInfoContainer}>
            <Text style={styles.hintText}>{targetCard.front}</Text>
            {targetCard.phonetic && <Text style={styles.phoneticText}> ({targetCard.phonetic})</Text>}
          </View>
        </Animated.View>
        
        {renderHangman()}
        
        {renderWord()}
        
        <View style={styles.keyboardContainer}>
          <Animated.View 
            style={[
              styles.keyboardRow,
              {
                opacity: keyboardRowAnimations[0],
                transform: [
                  {
                    translateY: keyboardRowAnimations[0].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0]
                    })
                  }
                ]
              }
            ]}
          >
            {['a','b','c','d','e','f','g'].map(letter => renderLetterButton(letter))}
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.keyboardRow,
              {
                opacity: keyboardRowAnimations[1],
                transform: [
                  {
                    translateY: keyboardRowAnimations[1].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0]
                    })
                  }
                ]
              }
            ]}
          >
            {['h','i','j','k','l','m','n'].map(letter => renderLetterButton(letter))}
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.keyboardRow,
              {
                opacity: keyboardRowAnimations[2],
                transform: [
                  {
                    translateY: keyboardRowAnimations[2].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0]
                    })
                  }
                ]
              }
            ]}
          >
            {['o','p','q','r','s','t','u'].map(letter => renderLetterButton(letter))}
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.keyboardRow,
              {
                opacity: keyboardRowAnimations[3],
                transform: [
                  {
                    translateY: keyboardRowAnimations[3].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0]
                    })
                  }
                ]
              }
            ]}
          >
            {['v','w','x','y','z'].map(letter => renderLetterButton(letter))}
          </Animated.View>
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
    backgroundColor: 'white',
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
    color: '#777',
    marginTop: 20,
  },
  hintContainer: {
    backgroundColor: '#F7F7F7',
    padding: 15,
    borderRadius: 16,
    marginVertical: 6,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#DDDDDD',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  hintTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4b4b4b',
    marginBottom: 5,
  },
  hintText: {
    fontSize: 18,
    color: '#1CB0F6',
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
    color: '#777',
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
    backgroundColor: '#FF4B4B',
  },
  hangmanStateAvailable: {
    backgroundColor: '#58CC02',
  },
  wordContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: 6,
    padding: 5,
  },
  letterBox: {
    width: 32,
    height: 40,
    borderBottomWidth: 2,
    borderBottomColor: '#4b4b4b',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  letter: {
    fontSize: 24,
    color: '#4b4b4b',
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
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 4,
  },
  letterButton: {
    width: 38,
    height: 38,
    backgroundColor: '#1CB0F6',
    borderRadius: 10,
    margin: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0e82b4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  letterButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  correctLetter: {
    backgroundColor: '#58CC02',
    shadowColor: '#45a100',
  },
  wrongLetter: {
    backgroundColor: '#FF4B4B',
    shadowColor: '#d62828',
  },
  guessedLetterText: {
    color: 'white',
  },
});