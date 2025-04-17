import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions
} from 'react-native';
import { Audio } from 'expo-av';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const cardSize = width * 0.28;

export default function PhoneticChoice({ dueCards, onAnswer, showResult }) {
  const [gameData, setGameData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState();
  const [soundWaveHeights, setSoundWaveHeights] = useState([10, 15, 20, 15]);
  const cardAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0)
  ]).current;
  
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
  
  useEffect(() => {
    const initializeGame = () => {
      if (!dueCards?.length) return;
      
      // Get cards that have phonetic data
      const cardsWithPhonetics = dueCards.filter(card => card.phonetic);
      
      if (cardsWithPhonetics.length === 0) {
        console.error("No cards with phonetic data available");
        return;
      }
      
      // Select a target card that has frontAudio
      const validTargets = cardsWithPhonetics.filter(card => card.frontAudio);
      const targetCard = validTargets.length > 0 
        ? parseCardData(validTargets[Math.floor(Math.random() * validTargets.length)]) 
        : parseCardData(cardsWithPhonetics[Math.floor(Math.random() * cardsWithPhonetics.length)]);
      
      // Get options (including the correct one)
      let options = [];
      options.push({
        id: targetCard.id,
        front: targetCard.front,
        phonetic: targetCard.phonetic,
        isCorrect: true
      });
      
      // Add incorrect options, avoid duplicates
      const otherCards = cardsWithPhonetics.filter(card => card.id !== targetCard.id);
      
      // If we have enough other cards, pick randomly
      if (otherCards.length >= 2) {
        const shuffledOthers = [...otherCards].sort(() => 0.5 - Math.random());
        
        for (let i = 0; i < 2 && options.length < 3; i++) {
          options.push({
            id: shuffledOthers[i].id,
            front: shuffledOthers[i].front,
            phonetic: shuffledOthers[i].phonetic,
            isCorrect: false
          });
        }
      } else {
        // Not enough other cards, create modified phonetics
        while (options.length < 3) {
          // Create a slightly modified version of the correct phonetic
          const fakeParts = targetCard.phonetic.split('');
          // Change a random character if the phonetic is long enough
          if (fakeParts.length > 2) {
            const randomIndex = Math.floor(Math.random() * fakeParts.length);
            const possibleReplacements = 'əɪʊeɑɔɒæɛɨʉʌɯɤɵœøɶɐɜɞʏʎʍʢʡβɸθðʃʒçʝɣχʁħʕhɦɬɮʋɹɻjɰlɭʟɱɳɲŋɴʙrʀʜʢʡ';
            fakeParts[randomIndex] = possibleReplacements[Math.floor(Math.random() * possibleReplacements.length)];
          }
          
          options.push({
            id: `fake-${options.length}`,
            front: targetCard.front,
            phonetic: fakeParts.join(''),
            isCorrect: false
          });
        }
      }
      
      // Shuffle the options
      options.sort(() => 0.5 - Math.random());
      
      setGameData({
        targetCard,
        options
      });
    };
    
    initializeGame();
    
    // Animate cards sequentially
    cardAnimations.forEach((anim, index) => {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: 500 + (index * 150),
        useNativeDriver: true,
      }).start();
    });
    
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [dueCards]);
  
  const playSound = async () => {
    if (isPlaying || !gameData?.targetCard?.frontAudio) return;
    
    setIsPlaying(true);
    
    try {
      // Play the actual pronunciation from the card's frontAudio field
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: gameData.targetCard.frontAudio }
      );
      setSound(newSound);
      
      // Add a listener to reset isPlaying when sound finishes
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
      
      await newSound.playAsync();
    } catch (error) {
      console.error("Error playing audio:", error);
      setIsPlaying(false);
      
      // Fallback to placeholder sound if the audio file can't be loaded
      try {
        const { sound: fallbackSound } = await Audio.Sound.createAsync(
          require('../../asset/tap.mp3')
        );
        await fallbackSound.playAsync();
        setTimeout(() => {
          setIsPlaying(false);
          fallbackSound.unloadAsync();
        }, 1000);
      } catch (fallbackError) {
        console.error("Error playing fallback sound:", fallbackError);
      }
    }
  };
  
  useEffect(() => {
    // Auto-play pronunciation after a short delay
    if (gameData?.targetCard?.front) {
      const timer = setTimeout(() => {
        playSound();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [gameData]);
  
  const handleOptionSelect = (selectedOption) => {
    if (!gameData) return;
    
    const isCorrect = selectedOption.isCorrect;
    const targetCard = gameData.targetCard;
    
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
      if (randomExample.questionPhonetic) popupString += `${randomExample.questionPhonetic}\n`;
      if (randomExample.questionTranslation) popupString += `Translation: ${randomExample.questionTranslation}\n`;
    }
    
    onAnswer?.(isCorrect, popupString);
  };
  
  if (!gameData) return null;
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose the correct phonetic</Text>
      
      <View style={styles.wordContainer}>
        <TouchableOpacity 
          style={[styles.speakerButton, isPlaying && styles.speakerActive]}
          onPress={playSound}
          disabled={isPlaying}
        >
          <FontAwesome name="volume-up" size={40} color={isPlaying ? "#fff" : "#007AFF"} />
          {isPlaying && (
            <View style={styles.soundWaveAnimation}>
              {soundWaveHeights.map((height, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.soundWave,
                    { 
                      height: height,
                      marginHorizontal: 3
                    }
                  ]} 
                />
              ))}
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.instructions}>
          Listen and select the correct phonetic
        </Text>
      </View>
      
      <View style={styles.optionsContainer}>
        {gameData.options.map((option, index) => (
          <Animated.View
            key={index}
            style={[
              styles.optionCardWrapper,
              {
                opacity: cardAnimations[index],
                transform: [
                  { 
                    translateY: cardAnimations[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0]
                    })
                  }
                ]
              }
            ]}
          >
            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => handleOptionSelect(option)}
            >
              <MaterialIcons name="record-voice-over" size={24} color="#666" style={styles.phoneticIcon} />
              <Text style={styles.phoneticText}>{option.phonetic}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    margin: 10,
    width: '100%',
  },
  title: {
    fontSize: 16,
    fontFamily: 'PressStart2P',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  wordContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  speakerButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 20,
    borderRadius: 50,
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    position: 'relative',
  },
  speakerActive: {
    backgroundColor: '#007AFF',
  },
  soundWaveAnimation: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    width: '100%',
    height: '100%',
    bottom: -15,
  },
  soundWave: {
    width: 4,
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  instructions: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    fontFamily: 'PressStart2P',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    flexWrap: 'wrap',
    marginTop: 20,
  },
  optionCardWrapper: {
    margin: 10,
  },
  optionCard: {
    width: cardSize,
    height: cardSize,
    backgroundColor: 'white',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    padding: 10,
    borderWidth: 2,
    borderColor: 'rgba(0,122,255,0.2)',
  },
  phoneticIcon: {
    marginBottom: 10,
  },
  phoneticText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    fontFamily: 'PressStart2P',
  },
});