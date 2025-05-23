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

export default function PairOrNotPair({ dueCards, onAnswer, showResult }) {
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [questionExample, setQuestionExample] = useState(null);
  const [answerExample, setAnswerExample] = useState(null);
  const [selectedChoice, setSelectedChoice] = useState(null); // null, 'pair', 'notPair'
  const [answered, setAnswered] = useState(false);
  const [isPair, setIsPair] = useState(false);
  
  // Animation values
  const titleAnimation = useRef(new Animated.Value(0)).current;
  const questionAnimation = useRef(new Animated.Value(0)).current;
  const answerAnimation = useRef(new Animated.Value(0)).current;
  const buttonsAnimation = useRef(new Animated.Value(0)).current;

  // Initialize and select a random card and examples
  useEffect(() => {
    if (!dueCards || dueCards.length === 0) return;
    
    const init = async () => {
      setLoading(true);
      
      try {
        // Select a random card that has examples
        const cardsWithExamples = dueCards.filter(card => {
          try {
            const examples = card.examples ? JSON.parse(card.examples) : [];
            return examples.length > 1; // Need at least 2 examples
          } catch (e) {
            return false;
          }
        });
        
        if (cardsWithExamples.length === 0) {
          Alert.alert('Not Enough Examples', 'None of the cards have enough example sentences.');
          return;
        }
        
        const randomCard = cardsWithExamples[Math.floor(Math.random() * cardsWithExamples.length)];
        setSelectedCard(randomCard);
        
        // Parse examples and select two random ones
        const examples = JSON.parse(randomCard.examples);
        
        // Select a random question example
        const questionIndex = Math.floor(Math.random() * examples.length);
        const question = examples[questionIndex];
        setQuestionExample(question);
        
        // Determine if this should be a pair (50% chance)
        const shouldBePair = Math.random() < 0.5;
        setIsPair(shouldBePair);
        
        // For the answer, either use the matching answer or a random different answer
        if (shouldBePair) {
          // If pair, use the matching answer
          setAnswerExample(question);
        } else {
          // If not pair, use a different example's answer
          const otherExamples = examples.filter((_, index) => index !== questionIndex);
          const randomOtherExample = otherExamples[Math.floor(Math.random() * otherExamples.length)];
          setAnswerExample(randomOtherExample);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error initializing PairOrNotPair:", error);
        Alert.alert('Error', 'Could not load example sentences');
        setLoading(false);
      }
    };
    
    init();
  }, [dueCards]);
  
  // Animation sequence when component renders
  useEffect(() => {
    if (!loading && questionExample && answerExample) {
      // Reset animation values
      titleAnimation.setValue(0);
      questionAnimation.setValue(0);
      answerAnimation.setValue(0);
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
        // Question container
        Animated.timing(questionAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }),
        // Answer container
        Animated.timing(answerAnimation, {
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
  }, [loading, questionExample, answerExample]);
  
  // Reset component when showResult changes (new round)
  useEffect(() => {
    setSelectedChoice(null);
    setAnswered(false);
  }, [showResult]);

  const handleChoice = (choice) => {
    if (answered || showResult) return;
    
    setSelectedChoice(choice);
    setAnswered(true);
    
    const isCorrect = (choice === 'pair' && isPair) || (choice === 'notPair' && !isPair);
    
    // Build popup data string
    let popupString = '';
    
    if (selectedCard) {
      popupString += `${selectedCard.front}\n`;
      if (selectedCard.phonetic) popupString += `${selectedCard.phonetic}\n`;
      if (selectedCard.back) popupString += `${selectedCard.back}\n`;
    }
    
    popupString += `Question: ${questionExample.question}\n`;
    popupString += `Answer: ${answerExample.answer}\n`;
    popupString += `They ${isPair ? 'DO' : 'DO NOT'} form a pair.\n`;
    popupString += `Your answer: ${choice === 'pair' ? 'They pair' : 'They don\'t pair'}\n`;
    
    // Call the onAnswer callback with the result
    onAnswer?.(isCorrect, popupString);
  };

  // Handle loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading examples...</Text>
      </View>
    );
  }
  
  // Handle case where no card or examples could be found
  if (!selectedCard || !questionExample || !answerExample) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Not enough examples available</Text>
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
        Do These Sentences Match?
      </Animated.Text>
      
      {/* Question Section */}
      <Animated.View 
        style={[
          styles.sentenceContainer,
          {
            opacity: questionAnimation,
            transform: [
              {
                translateX: questionAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-100, 0]
                })
              }
            ]
          }
        ]}
      >
        <Text style={styles.sentenceLabel}>Question:</Text>
        <Text style={styles.sentenceText}>{questionExample.question}</Text>
        {questionExample.questionPhonetic && (
          <Text style={styles.phoneticText}>{questionExample.questionPhonetic}</Text>
        )}
        {questionExample.questionTranslation && (
          <Text style={styles.translationText}>{questionExample.questionTranslation}</Text>
        )}
      </Animated.View>
      
      {/* Answer Section */}
      <Animated.View 
        style={[
          styles.sentenceContainer,
          {
            opacity: answerAnimation,
            transform: [
              {
                translateX: answerAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0]
                })
              }
            ]
          }
        ]}
      >
        <Text style={styles.sentenceLabel}>Answer:</Text>
        <Text style={styles.sentenceText}>{answerExample.answer}</Text>
        {answerExample.answerPhonetic && (
          <Text style={styles.phoneticText}>{answerExample.answerPhonetic}</Text>
        )}
        {answerExample.translation && (
          <Text style={styles.translationText}>{answerExample.translation}</Text>
        )}
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
            selectedChoice === 'pair' && styles.selectedButton,
            answered && isPair && styles.correctButton,
            answered && !isPair && selectedChoice === 'pair' && styles.incorrectButton
          ]}
          onPress={() => handleChoice('pair')}
          disabled={answered || showResult}
        >
          <Text style={styles.choiceButtonText}>They Match</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.choiceButton,
            selectedChoice === 'notPair' && styles.selectedButton,
            answered && !isPair && styles.correctButton,
            answered && isPair && selectedChoice === 'notPair' && styles.incorrectButton
          ]}
          onPress={() => handleChoice('notPair')}
          disabled={answered || showResult}
        >
          <Text style={styles.choiceButtonText}>They Don't Match</Text>
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
            (selectedChoice === 'pair' && isPair) || (selectedChoice === 'notPair' && !isPair) 
              ? styles.correctText 
              : styles.incorrectText
          ]}>
            {(selectedChoice === 'pair' && isPair) || (selectedChoice === 'notPair' && !isPair) 
              ? "Correct!" 
              : "Incorrect"}
          </Text>
          <Text style={styles.answerText}>
            These sentences {isPair ? 'DO match' : 'DO NOT match'}.
          </Text>
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
  translationText: {
    fontSize: 14,
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
  },
});
