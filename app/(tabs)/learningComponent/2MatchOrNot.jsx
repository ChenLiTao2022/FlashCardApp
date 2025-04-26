import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Easing
} from 'react-native';

export default function MatchOrNot({ dueCards, onAnswer, showResult }) {
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [displayedSentence, setDisplayedSentence] = useState('');
  const [displayedTranslation, setDisplayedTranslation] = useState('');
  const [selectedChoice, setSelectedChoice] = useState(null); // null, 'match', 'notMatch'
  const [answered, setAnswered] = useState(false);
  const [isMatch, setIsMatch] = useState(false);
  const [originalWord, setOriginalWord] = useState('');
  const [replacedWord, setReplacedWord] = useState('');
  
  // Animation values
  const titleAnimation = useRef(new Animated.Value(0)).current;
  const sentenceAnimation = useRef(new Animated.Value(0)).current;
  const translationAnimation = useRef(new Animated.Value(0)).current;
  const buttonsAnimation = useRef(new Animated.Value(0)).current;
  
  // Initialize and select a random card
  useEffect(() => {
    if (!dueCards || dueCards.length === 0) return;
    
    const init = async () => {
      setLoading(true);
      
      try {
        // Select a random card from due cards
        const randomCard = dueCards[Math.floor(Math.random() * dueCards.length)];
        setSelectedCard(randomCard);
        
        // Parse examples from the card
        let examples = [];
        try {
          examples = JSON.parse(randomCard.examples);
        } catch (err) {
          console.error("Error parsing examples:", err);
          Alert.alert('Error', 'Could not parse examples');
          return;
        }
        
        if (!examples || examples.length === 0) {
          setLoading(false);
          return;
        }
        
        // Randomly select an example pair
        const randomExample = examples[Math.floor(Math.random() * examples.length)];
        
        // Decide whether to use the question or answer as our displayed sentence (50/50)
        const useQuestion = Math.random() < 0.5;
        let sentence = useQuestion ? randomExample.question : randomExample.answer;
        const translation = useQuestion ? randomExample.questionTranslation : randomExample.translation;
        
        // Extract the original word (wrapped in #...#)
        const wordMatch = sentence.match(/#(.*?)#/);
        if (wordMatch && wordMatch[1]) {
          setOriginalWord(wordMatch[1]);
          
          // Determine if this should be a match or not (50% chance)
          //const shouldBeMatch = Math.random() < 0.5;
          //setIsMatch(shouldBeMatch);
          const shouldBeMatch = false;
          setIsMatch(shouldBeMatch);
          
          if (!shouldBeMatch) {
            // If not a match, replace the word with another card's front
            const otherCards = dueCards.filter(card => card.id !== randomCard.id);
            if (otherCards.length > 0) {
              const randomOtherCard = otherCards[Math.floor(Math.random() * otherCards.length)];
              setReplacedWord(randomOtherCard.front);
              sentence = sentence.replace(/#(.*?)#/g, `#${randomOtherCard.front}#`);
            }
          }
        }
        
        // Remove # markers for display
        sentence = sentence.replace(/#/g, '');
        setDisplayedSentence(sentence);
        setDisplayedTranslation(translation);
        
        setLoading(false);
      } catch (error) {
        console.error("Error initializing MatchOrNot:", error);
        Alert.alert('Error', 'Could not load cards');
        setLoading(false);
      }
    };
    
    init();
  }, [dueCards]);
  
  // Animation sequence when component renders
  useEffect(() => {
    if (!loading && displayedSentence && displayedTranslation) {
      // Reset animation values
      titleAnimation.setValue(0);
      sentenceAnimation.setValue(0);
      translationAnimation.setValue(0);
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
        // Sentence container
        Animated.timing(sentenceAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }),
        // Translation container
        Animated.timing(translationAnimation, {
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
  }, [loading, displayedSentence, displayedTranslation]);
  
  // Reset component when showResult changes (new round)
  useEffect(() => {
    setSelectedChoice(null);
    setAnswered(false);
  }, [showResult]);

  const handleChoice = (choice) => {
    if (answered || showResult) return;
    
    setSelectedChoice(choice);
    setAnswered(true);
    
    const isCorrect = (choice === 'match' && isMatch) || (choice === 'notMatch' && !isMatch);
    
    // Build popup data string
    let popupString = '';
    
    if (selectedCard) {
      popupString += `Sentence: ${displayedSentence}\n`;
      popupString += `Translation: ${displayedTranslation}\n`;
      
      if (!isMatch) {
        popupString += `Original word: ${originalWord}\n`;
        popupString += `Replaced with: ${replacedWord}\n`;
      }
      
      popupString += `They ${isMatch ? 'DO' : 'DO NOT'} match.\n`;
      popupString += `Your answer: ${choice === 'match' ? 'They match' : 'They don\'t match'}\n`;
    }
    
    // Call the onAnswer callback with the result
    onAnswer?.(isCorrect, popupString);
  };

  // Handle loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading cards...</Text>
      </View>
    );
  }
  
  // Handle case where no card could be found or no examples
  if (!selectedCard || !displayedSentence || !displayedTranslation) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No examples available for this card</Text>
      </View>
    );
  }

  return (
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
        Do These Match?
      </Animated.Text>
      
      {/* Sentence Section */}
      <Animated.View 
        style={[
          styles.sentenceContainer,
          {
            opacity: sentenceAnimation,
            transform: [
              {
                translateX: sentenceAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-100, 0]
                })
              }
            ]
          }
        ]}
      >
        <Text style={styles.sentenceLabel}>Sentence:</Text>
        <Text style={styles.sentenceText}>{displayedSentence}</Text>
      </Animated.View>
      
      {/* Translation Section */}
      <Animated.View 
        style={[
          styles.translationContainer,
          {
            opacity: translationAnimation,
            transform: [
              {
                translateX: translationAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0]
                })
              }
            ]
          }
        ]}
      >
        <Text style={styles.sentenceLabel}>Translation:</Text>
        <Text style={styles.sentenceText}>{displayedTranslation}</Text>
      </Animated.View>
      

      {/* Choices */}
      <Animated.View 
        style={[
          styles.choicesContainer,
          {
            opacity: buttonsAnimation,
            transform: [
              {
                translateY: buttonsAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0]
                })
              }
            ]
          }
        ]}
      >
        <TouchableOpacity
          style={[
            styles.choiceButton,
            selectedChoice === 'match' && styles.selectedButton,
            answered && isMatch && styles.correctButton,
            answered && !isMatch && selectedChoice === 'match' && styles.incorrectButton
          ]}
          onPress={() => handleChoice('match')}
          disabled={answered || showResult}
        >
          <Text style={styles.choiceButtonText}>Yes, They Match</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.choiceButton,
            selectedChoice === 'notMatch' && styles.selectedButton,
            answered && !isMatch && styles.correctButton,
            answered && isMatch && selectedChoice === 'notMatch' && styles.incorrectButton
          ]}
          onPress={() => handleChoice('notMatch')}
          disabled={answered || showResult}
        >
          <Text style={styles.choiceButtonText}>No, They Don't Match</Text>
        </TouchableOpacity>
      </Animated.View>
      
      {/* Feedback Section */}
      {answered && (
        <Animated.View 
          style={[
            styles.feedbackContainer,
            {
              opacity: buttonsAnimation,
              transform: [
                {
                  scale: buttonsAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1]
                  })
                }
              ]
            }
          ]}
        >
          <Text style={[
            styles.feedbackText,
            (selectedChoice === 'match' && isMatch) || (selectedChoice === 'notMatch' && !isMatch) 
              ? styles.correctText 
              : styles.incorrectText
          ]}>
            {(selectedChoice === 'match' && isMatch) || (selectedChoice === 'notMatch' && !isMatch) 
              ? "Correct!" 
              : "Incorrect"}
          </Text>
          <Text style={styles.answerText}>
            These {isMatch ? 'DO match' : 'DO NOT match'}.
          </Text>
          {!isMatch && (
            <Text style={styles.answerText}>
              "{replacedWord}" was used instead of "{originalWord}".
            </Text>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    margin: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    fontFamily: 'PressStart2P',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
  sentenceContainer: {
    width: '100%',
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  translationContainer: {
    width: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  sentenceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#555',
  },
  sentenceText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  phoneticText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
    textAlign: 'center',
    color: '#333',
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    margin: 5,
    alignItems: 'center',
  },
  selectedButton: {
    borderColor: '#007AFF',
    borderWidth: 2,
    backgroundColor: '#f0f8ff',
  },
  correctButton: {
    borderColor: '#28a745',
    backgroundColor: '#d4edda',
  },
  incorrectButton: {
    borderColor: '#dc3545',
    backgroundColor: '#f8d7da',
  },
  choiceButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  feedbackContainer: {
    width: '100%',
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 10,
    alignItems: 'center',
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  correctText: {
    color: 'green',
  },
  incorrectText: {
    color: 'red',
  },
  answerText: {
    fontSize: 16,
    marginVertical: 2,
  },
}); 