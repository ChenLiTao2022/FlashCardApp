import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';

export default function PairOrNotPair({ dueCards, onAnswer, showResult }) {
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [displayedMeaning, setDisplayedMeaning] = useState(null);
  const [selectedChoice, setSelectedChoice] = useState(null); // null, 'pair', 'notPair'
  const [answered, setAnswered] = useState(false);
  const [isPair, setIsPair] = useState(false);
  
  // Initialize and select a random card
  useEffect(() => {
    if (!dueCards || dueCards.length === 0) return;
    
    const init = async () => {
      setLoading(true);
      
      try {
        // Select a random card from due cards
        const randomCard = dueCards[Math.floor(Math.random() * dueCards.length)];
        setSelectedCard(randomCard);
        
        // Determine if this should be a pair (50% chance)
        const shouldBePair = Math.random() < 0.5;
        setIsPair(shouldBePair);
        
        // For the meaning, either use the matching meaning or a random different meaning
        if (shouldBePair) {
          // If pair, use the card's own meaning
          setDisplayedMeaning(randomCard.back);
        } else {
          // If not pair, use a different card's meaning
          const otherCards = dueCards.filter(card => card.id !== randomCard.id);
          if (otherCards.length === 0) {
            // If no other cards available, still use a different meaning
            // This is just a fallback in case there's only one card
            setDisplayedMeaning("Different meaning for testing");
          } else {
            const randomOtherCard = otherCards[Math.floor(Math.random() * otherCards.length)];
            setDisplayedMeaning(randomOtherCard.back);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error initializing PairOrNotPair:", error);
        Alert.alert('Error', 'Could not load cards');
        setLoading(false);
      }
    };
    
    init();
  }, [dueCards]);
  
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
      popupString += `Word: ${selectedCard.front}\n`;
      if (selectedCard.phonetic) popupString += `Phonetic: ${selectedCard.phonetic}\n`;
      popupString += `Actual meaning: ${selectedCard.back}\n`;
      popupString += `Displayed meaning: ${displayedMeaning}\n`;
      popupString += `They ${isPair ? 'DO' : 'DO NOT'} form a pair.\n`;
      popupString += `Your answer: ${choice === 'pair' ? 'They pair' : 'They don\'t pair'}\n`;
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
  
  // Handle case where no card could be found
  if (!selectedCard || !displayedMeaning) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Not enough cards available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Do These Match?</Text>
      
      {/* Word Section */}
      <View style={styles.sentenceContainer}>
        <Text style={styles.sentenceLabel}>Word:</Text>
        <Text style={styles.sentenceText}>{selectedCard.front}</Text>
        {selectedCard.phonetic && (
          <Text style={styles.phoneticText}>{selectedCard.phonetic}</Text>
        )}
      </View>
      
      {/* Meaning Section */}
      <View style={styles.sentenceContainer}>
        <Text style={styles.sentenceLabel}>Meaning:</Text>
        <Text style={styles.sentenceText}>{displayedMeaning}</Text>
      </View>
      
      {/* Choices */}
      <View style={styles.choicesContainer}>
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
      </View>
      
      {/* Feedback Section */}
      {answered && (
        <View style={styles.feedbackContainer}>
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
            These {isPair ? 'DO match' : 'DO NOT match'}.
          </Text>
        </View>
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
