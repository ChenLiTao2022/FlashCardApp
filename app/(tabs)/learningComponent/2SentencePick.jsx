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

export default function SentencePick({ dueCards, onAnswer, showResult }) {
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedExample, setSelectedExample] = useState(null);
  const [sentenceWithBlank, setSentenceWithBlank] = useState('');
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [correctOption, setCorrectOption] = useState(null);
  
  // Animation values
  const titleAnimation = useRef(new Animated.Value(0)).current;
  const sentenceAnimation = useRef(new Animated.Value(0)).current;
  const optionsAnimation = useRef(new Animated.Value(0)).current;

  // Initialize and select a random card and example
  useEffect(() => {
    if (!dueCards || dueCards.length === 0) return;
    
    const init = async () => {
      setLoading(true);
      
      try {
        // Filter cards to those with examples containing the target word marked with #
        const cardsWithValidExamples = dueCards.filter(card => {
          try {
            const examples = card.examples ? JSON.parse(card.examples) : [];
            // Find examples that have the word marked with #
            return examples.some(ex => 
              (ex.question && ex.question.includes('#')) || 
              (ex.answer && ex.answer.includes('#'))
            );
          } catch (e) {
            return false;
          }
        });
        
        if (cardsWithValidExamples.length === 0) {
          Alert.alert('Not Enough Examples', 'None of the cards have examples with marked words.');
          return;
        }
        
        // Select a random card
        const randomCard = cardsWithValidExamples[Math.floor(Math.random() * cardsWithValidExamples.length)];
        setSelectedCard(randomCard);
        
        // Parse examples
        const examples = JSON.parse(randomCard.examples);
        
        // Filter examples to those that have the target word marked with #
        const validExamples = examples.filter(ex => 
          (ex.question && ex.question.includes('#')) || 
          (ex.answer && ex.answer.includes('#'))
        );
        
        if (validExamples.length === 0) {
          setLoading(false);
          return;
        }
        
        // Select a random example
        const randomExample = validExamples[Math.floor(Math.random() * validExamples.length)];
        setSelectedExample(randomExample);
        
        // Determine if we'll use the question or answer part of the example
        const usePart = Math.random() < 0.5 && randomExample.question.includes('#') 
          ? 'question' 
          : 'answer';
        
        // Get the sentence with the word to replace
        const sentence = randomExample[usePart];
        
        // Extract the target word and create a sentence with a blank
        const regex = /#(.*?)#/;
        const match = sentence.match(regex);
        
        if (match && match[1]) {
          const targetWord = match[1];
          // Replace the word with a blank
          const blankSentence = sentence.replace(/#.*?#/, '____');
          setSentenceWithBlank(blankSentence);
          
          // Set the correct option (the target card's front)
          setCorrectOption(randomCard.front);
          
          // Create options (including the correct one and 2 distractors)
          const otherCards = dueCards.filter(c => c.id !== randomCard.id);
          
          if (otherCards.length < 2) {
            Alert.alert('Not Enough Cards', 'Need at least 3 cards for options.');
            return;
          }
          
          // Shuffle and pick 2 random cards for distractors
          const shuffledOtherCards = [...otherCards].sort(() => 0.5 - Math.random());
          const distractors = shuffledOtherCards.slice(0, 2).map(c => c.front);
          
          // Combine and shuffle all options
          const allOptions = [randomCard.front, ...distractors];
          const shuffledOptions = [...allOptions].sort(() => 0.5 - Math.random());
          
          setOptions(shuffledOptions);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error initializing SentencePick:", error);
        Alert.alert('Error', 'Could not load example sentences');
        setLoading(false);
      }
    };
    
    init();
  }, [dueCards]);
  
  // Animation sequence when component renders
  useEffect(() => {
    if (!loading && selectedExample && options.length > 0) {
      // Reset animation values
      titleAnimation.setValue(0);
      sentenceAnimation.setValue(0);
      optionsAnimation.setValue(0);
      
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
        // Options
        Animated.timing(optionsAnimation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        })
      ]).start();
    }
  }, [loading, selectedExample, options]);
  
  // Reset component when showResult changes (new round)
  useEffect(() => {
    setSelectedOption(null);
    setAnswered(false);
  }, [showResult]);

  const handleChoice = (option) => {
    if (answered || showResult) return;
    
    setSelectedOption(option);
    setAnswered(true);
    
    const isCorrect = option === correctOption;
    
    // Build popup data string
    let popupString = '';
    
    if (selectedCard) {
      popupString += `${selectedCard.front}\n`;
      if (selectedCard.phonetic) popupString += `${selectedCard.phonetic}\n`;
      if (selectedCard.back) popupString += `${selectedCard.back}\n`;
    }
    
    popupString += `Sentence: ${sentenceWithBlank.replace('____', correctOption)}\n`;
    if (selectedExample.questionPhonetic || selectedExample.answerPhonetic) {
      popupString += `Phonetic: ${selectedExample.questionPhonetic || selectedExample.answerPhonetic}\n`;
    }
    if (selectedExample.questionTranslation || selectedExample.translation) {
      popupString += `Translation: ${selectedExample.questionTranslation || selectedExample.translation}\n`;
    }
    popupString += `Correct word: ${correctOption}\n`;
    popupString += `Your answer: ${option}\n`;
    
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
  if (!selectedCard || !selectedExample || !sentenceWithBlank || options.length === 0) {
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
        Fill in the Missing Word
      </Animated.Text>
      
      {/* Sentence Section */}
      <Animated.View 
        style={[
          styles.sentenceContainer,
          {
            opacity: sentenceAnimation,
            transform: [
              {
                translateY: sentenceAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })
              }
            ]
          }
        ]}
      >
        <Text style={styles.sentenceLabel}>Complete this sentence:</Text>
        <Text style={styles.sentenceText}>{sentenceWithBlank}</Text>
        {(selectedExample.questionPhonetic || selectedExample.answerPhonetic) && (
          <Text style={styles.phoneticText}>
            {selectedExample.questionPhonetic || selectedExample.answerPhonetic}
          </Text>
        )}
        {(selectedExample.questionTranslation || selectedExample.translation) && (
          <Text style={styles.translationText}>
            {selectedExample.questionTranslation || selectedExample.translation}
          </Text>
        )}
      </Animated.View>
      
      {/* Options */}
      <Animated.View 
        style={[
          styles.optionsContainer,
          {
            opacity: optionsAnimation,
            transform: [
              {
                translateY: optionsAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0]
                })
              }
            ]
          }
        ]}
      >
        {options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.optionButton,
              selectedOption === option && styles.selectedButton,
              answered && option === correctOption && styles.correctButton,
              answered && selectedOption === option && option !== correctOption && styles.incorrectButton
            ]}
            onPress={() => handleChoice(option)}
            disabled={answered || showResult}
          >
            <Text style={styles.optionButtonText}>{option}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
      
      {/* Feedback Section */}
      {answered && (
        <Animated.View 
          style={[
            styles.feedbackContainer,
            {
              opacity: optionsAnimation,
              transform: [
                {
                  scale: optionsAnimation.interpolate({
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
            selectedOption === correctOption ? styles.correctText : styles.incorrectText
          ]}>
            {selectedOption === correctOption ? "Correct!" : "Incorrect"}
          </Text>
          <Text style={styles.answerText}>
            The correct word is: {correctOption}
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
  optionsContainer: {
    width: '100%',
    marginTop: 10,
    marginBottom: 20,
  },
  optionButton: {
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
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
  optionButtonText: {
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
