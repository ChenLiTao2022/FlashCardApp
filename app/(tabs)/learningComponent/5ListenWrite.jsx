import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

export default function ListenWrite({ dueCards, onAnswer, showResult }) {
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedExample, setSelectedExample] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [isPlayingNormal, setIsPlayingNormal] = useState(false);
  const [isPlayingSlow, setIsPlayingSlow] = useState(false);
  const [sound, setSound] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(null);
  
  const inputRef = useRef(null);

  // Initialize and select a random card and example
  useEffect(() => {
    if (!dueCards || dueCards.length === 0) return;
    
    const init = async () => {
      setLoading(true);
      
      try {
        // Select a random card that has examples
        const cardsWithExamples = dueCards.filter(card => {
          try {
            const examples = card.examples ? JSON.parse(card.examples) : [];
            return examples.length > 0;
          } catch (e) {
            return false;
          }
        });
        
        if (cardsWithExamples.length === 0) {
          Alert.alert('No Examples', 'None of the cards have example sentences with audio.');
          return;
        }
        
        const randomCard = cardsWithExamples[Math.floor(Math.random() * cardsWithExamples.length)];
        setSelectedCard(randomCard);
        
        // Parse examples and select a random one
        const examples = JSON.parse(randomCard.examples);
        const randomExample = examples[Math.floor(Math.random() * examples.length)];
        setSelectedExample(randomExample);
        
        setLoading(false);
      } catch (error) {
        console.error("Error initializing ListenWrite:", error);
        Alert.alert('Error', 'Could not load example sentences');
        setLoading(false);
      }
    };
    
    init();
    
    // Cleanup function
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [dueCards]);
  
  // Reset component when showResult changes (new round)
  useEffect(() => {
    setUserInput('');
    setAnswered(false);
    setCorrect(null);
  }, [showResult]);

  const playAudio = async (slowDown = false) => {
    if (!selectedExample?.questionAudio) {
      Alert.alert('No Audio', 'This example does not have audio available.');
      return;
    }
    
    try {
      // Stop any existing audio
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
      
      if (slowDown) {
        setIsPlayingSlow(true);
      } else {
        setIsPlayingNormal(true);
      }
      
      // Load and play the audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: selectedExample.questionAudio },
        { 
          shouldPlay: true,
          rate: slowDown ? 0.7 : 1.0  // Play slower if slowDown is true
        }
      );
      
      setSound(newSound);
      
      // Wait for audio to finish
      newSound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish) {
          if (slowDown) {
            setIsPlayingSlow(false);
          } else {
            setIsPlayingNormal(false);
          }
        }
      });
    } catch (error) {
      console.error("Error playing audio:", error);
      Alert.alert('Error', 'Could not play audio');
      setIsPlayingNormal(false);
      setIsPlayingSlow(false);
    }
  };

  const checkAnswer = () => {
    if (!userInput.trim() || answered) return;
    
    Keyboard.dismiss();
    
    // Compare user input with correct sentence (case insensitive)
    const normalizedInput = userInput.trim().toLowerCase();
    const normalizedCorrect = selectedExample.question.toLowerCase();
    
    const isCorrect = normalizedInput === normalizedCorrect;
    setCorrect(isCorrect);
    setAnswered(true);
    
    // Build popup data string
    let popupString = '';
    
    if (selectedCard) {
      popupString += `${selectedCard.front}\n`;
      if (selectedCard.phonetic) popupString += `${selectedCard.phonetic}\n`;
      if (selectedCard.back) popupString += `${selectedCard.back}\n`;
    }
    
    popupString += `Sentence: ${selectedExample.question}\n`;
    if (selectedExample.questionPhonetic) {
      popupString += `Phonetic: ${selectedExample.questionPhonetic}\n`;
    }
    if (selectedExample.questionTranslation) {
      popupString += `Translation: ${selectedExample.questionTranslation}\n`;
    }
    if (!isCorrect) {
      popupString += `Your answer: ${userInput}\n`;
    }
    
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
  
  // Handle case where no card or example could be found
  if (!selectedCard || !selectedExample) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No examples available</Text>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Text style={styles.title}>Listen and Write</Text>
        
        {/* Audio Controls Section */}
        <View style={styles.audioControlsContainer}>
          <TouchableOpacity 
            style={styles.audioButton}
            onPress={() => playAudio(false)}
            disabled={isPlayingNormal || isPlayingSlow || showResult}
          >
            <Ionicons 
              name={isPlayingNormal ? "volume-high" : "play-circle"} 
              size={45} 
              color="#007AFF" 
            />
            <Text style={styles.audioButtonText}>
              {isPlayingNormal ? "Playing..." : "Normal Speed"}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.audioButton}
            onPress={() => playAudio(true)}
            disabled={isPlayingNormal || isPlayingSlow || showResult}
          >
            <Ionicons 
              name={isPlayingSlow ? "volume-medium" : "play-circle-outline"} 
              size={45} 
              color="#4ECDC4" 
            />
            <Text style={styles.audioButtonText}>
              {isPlayingSlow ? "Playing..." : "Slow Speed"}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Input Section */}
        <View style={styles.inputContainer}>
          <Text style={styles.instructionText}>Write what you hear:</Text>
          <TextInput
            ref={inputRef}
            style={[
              styles.textInput,
              answered && (correct ? styles.correctInput : styles.incorrectInput)
            ]}
            value={userInput}
            onChangeText={setUserInput}
            placeholder="Type the sentence here..."
            multiline={true}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!answered && !showResult}
          />
          
          {answered && (
            <View style={styles.feedbackContainer}>
              <Text style={[
                styles.feedbackText,
                correct ? styles.correctText : styles.incorrectText
              ]}>
                {correct ? "Correct!" : "Incorrect"}
              </Text>
              {!correct && (
                <Text style={styles.correctAnswerText}>
                  Correct answer: {selectedExample.question}
                </Text>
              )}
            </View>
          )}
        </View>
        
        {/* Check Answer Button */}
        <TouchableOpacity
          style={[
            styles.checkButton,
            (!userInput.trim() || answered || showResult) && styles.disabledButton
          ]}
          onPress={checkAnswer}
          disabled={!userInput.trim() || answered || showResult}
        >
          <Text style={styles.checkButtonText}>Check</Text>
        </TouchableOpacity>
        
        {/* Translation Hint (Initially Hidden) */}
        {selectedExample.questionTranslation && (
          <TouchableOpacity 
            style={styles.hintButton}
            onPress={() => Alert.alert("Translation", selectedExample.questionTranslation)}
            disabled={showResult}
          >
            <Text style={styles.hintButtonText}>Show Translation Hint</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableWithoutFeedback>
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
  audioControlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  audioButton: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.6)',
    width: '45%',
  },
  audioButtonText: {
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  instructionText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  textInput: {
    width: '100%',
    height: 120,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: 'white',
    textAlignVertical: 'top',
  },
  correctInput: {
    borderColor: 'green',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  incorrectInput: {
    borderColor: 'red',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  feedbackContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  correctText: {
    color: 'green',
  },
  incorrectText: {
    color: 'red',
  },
  correctAnswerText: {
    marginTop: 5,
    fontSize: 14,
    fontStyle: 'italic',
  },
  checkButton: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginTop: 10,
    marginBottom: 15,
  },
  checkButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  hintButton: {
    marginTop: 10,
  },
  hintButtonText: {
    color: '#007AFF',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
