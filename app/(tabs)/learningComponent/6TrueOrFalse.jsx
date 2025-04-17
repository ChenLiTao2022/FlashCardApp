// ./learningComponent/TrueOrFalse.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { 
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView
} from 'react-native';

export default function TrueOrFalse({ dueCards, onAnswer, showResult }) {
  // Randomly select target card and generate question
  const { targetCard, displayedBack, isCorrect } = useMemo(() => {
    if (!dueCards || dueCards.length === 0) return { targetCard: null, displayedBack: "", isCorrect: false };
    
    const targetIndex = Math.floor(Math.random() * dueCards.length);
    const targetCard = dueCards[targetIndex];
    
    // 50% chance to show correct back
    const isCorrect = Math.random() < 0.5;
    
    // Get alternate back if needed
    let alternateBack = targetCard.back;
    const otherCards = dueCards.filter(card => card.id !== targetCard.id);
    if (otherCards.length > 0) {
      const altIndex = Math.floor(Math.random() * otherCards.length);
      alternateBack = otherCards[altIndex].back;
    }

    return {
      targetCard,
      displayedBack: isCorrect ? targetCard.back : alternateBack,
      isCorrect
    };
  }, [dueCards]);

  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answered, setAnswered] = useState(false);

  // Reset when showResult changes (new question)
  useEffect(() => {
    setSelectedAnswer(null);
    setAnswered(false);
  }, [showResult]);

  const handleAnswerSelect = (answer) => {
    if (answered || showResult) return;
    
    setSelectedAnswer(answer);
    setAnswered(true);
    
    // Build popup data string
    let popupString = `${targetCard.front}\n`;
    if (targetCard.phonetic) popupString += `${targetCard.phonetic}\n`;
    if (targetCard.back) popupString += `${targetCard.back}\n`;
    
    // Determine if the user is correct
    const isUserCorrect = answer === isCorrect;
    
    // Call the onAnswer callback with the result
    onAnswer?.(isUserCorrect, popupString);
  };

  const getButtonStyle = (answer) => ({
    ...styles.answerButton,
    backgroundColor: answered 
      ? (answer === isCorrect ? '#28a745' : '#d9534f')
      : selectedAnswer === answer ? '#007AFF' : '#f8f9fa',
    borderColor: answered 
      ? (answer === isCorrect ? '#28a745' : '#d9534f')
      : selectedAnswer === answer ? '#007AFF' : '#dee2e6'
  });

  if (!targetCard) return <View style={styles.container}><Text>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Is this the correct translation?
      </Text>
      
      <ScrollView 
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
      >
        <Text style={styles.frontText}>{targetCard.front}</Text>
        {targetCard.phonetic && (
          <Text style={styles.phoneticText}>{targetCard.phonetic}</Text>
        )}
        
        {/* Image Section - made smaller */}
        {targetCard.imageUrl ? (
          <Image 
            source={{ uri: targetCard.imageUrl }}
            style={styles.cardImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}

        <View style={styles.meaningContainer}>
          <Text style={styles.meaningLabel}>Translation:</Text>
          <Text style={styles.meaningText}>{displayedBack}</Text>
        </View>

        <View style={styles.questionContainer}>
          
        </View>
      </ScrollView>

      <View style={styles.buttonsWrapper}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={getButtonStyle(true)}
            onPress={() => handleAnswerSelect(true)}
            disabled={answered || showResult}
          >
            <Text style={[
              styles.buttonText, 
              selectedAnswer === true && !answered ? styles.selectedButtonText : null
            ]}>✅ True</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={getButtonStyle(false)}
            onPress={() => handleAnswerSelect(false)}
            disabled={answered || showResult}
          >
            <Text style={[
              styles.buttonText, 
              selectedAnswer === false && !answered ? styles.selectedButtonText : null
            ]}>❌ False</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'PressStart2P',
    textAlign: 'center',
  },
  scrollContent: {
    width: '100%',
    flex: 1,
  },
  scrollContentContainer: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  frontText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 5,
    textAlign: 'center'
  },
  phoneticText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 10,
    fontStyle: 'italic'
  },
  meaningContainer: {
    backgroundColor: '#ecf0f1',
    borderRadius: 12,
    padding: 10,
    width: '100%',
    marginBottom: 10
  },
  meaningLabel: {
    fontSize: 14,
    color: '#95a5a6',
    marginBottom: 5
  },
  meaningText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
    textAlign: 'center'
  },
  questionContainer: {
    marginBottom: 10,
    width: '100%',
  },
  buttonsWrapper: {
    width: '100%',
    marginTop: 5,
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  answerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50'
  },
  selectedButtonText: {
    color: '#fff'
  },
  cardImage: {
    width: '90%',
    height: 120,
    borderRadius: 12,
    marginBottom: 10,
  },
  placeholderImage: {
    width: '90%',
    height: 120,
    backgroundColor: '#ecf0f1',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  placeholderText: {
    fontSize: 14,
    color: '#95a5a6',
  }
});
