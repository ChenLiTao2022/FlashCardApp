import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
  Dimensions
} from 'react-native';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');
const cardSize = width * 0.6;
const cardHeight = cardSize * 0.6;

export default function PairOrNotPair({ dueCards, onAnswer, showResult }) {
  const [gameData, setGameData] = useState(null);
  const flipAnimation = useRef(new Animated.Value(0)).current;

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
      
      const targetIndex = Math.floor(Math.random() * dueCards.length);
      const targetCard = parseCardData(dueCards[targetIndex]);
      const isPair = Math.random() < 0.5;
      const nonPairCard = dueCards.find(card => card.id !== targetCard.id);
      const imageCard = isPair ? targetCard : parseCardData(nonPairCard);
      
      setGameData({ targetCard, imageCard, isPair });
    };

    initializeGame();
    
    // Reset animation when game data changes
    flipAnimation.setValue(0);
    Animated.timing(flipAnimation, {
      toValue: 1,
      duration: 500,
      delay: 500,
      useNativeDriver: true,
    }).start();
  }, [dueCards, flipAnimation]);

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  // Updated answer handler to include a structured popupData object
  const handleAnswerSelection = (userChoice) => {
    if (!gameData) return;
    
    const isCorrect = userChoice === gameData.isPair;
    const targetCard = gameData.targetCard;
    
    // Get random example
    const examples = targetCard.examples || [];
    const randomExample = examples.length > 0 
      ? examples[Math.floor(Math.random() * examples.length)]
      : null;

    // Build popup data string
    let popupString = `${targetCard.front}\n`;
    if (targetCard.phonetic) popupString += `${targetCard.phonetic}\n`;
    if(targetCard.back) popupString += `${targetCard.back}\n`
    if (randomExample) {
      if (randomExample.question) popupString += `${randomExample.question}\n`;
      if (randomExample.questionTranslation) popupString += `Translation: ${randomExample.questionTranslation}\n`;
    }

    onAnswer?.(isCorrect, popupString);
  };

  if (!gameData) return null;

  return (
    <View style={styles.container}>
      <View style={styles.cardsContainer}>
        {/* Top Card */}
        <View style={styles.cardWrapper}>
          <Animated.View
            style={[
              styles.card,
              styles.cardFront,
              { height: cardHeight, width: cardSize, transform: [{ rotateY: frontInterpolate }] },
            ]}
          >
            <Image
              source={require('../../asset/placeholder.png')}
              style={styles.placeholderImage}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.card,
              styles.cardBack,
              { height: cardHeight, width: cardSize, transform: [{ rotateY: backInterpolate }] },
            ]}
          >
            <View style={styles.cardContent}>
              <Text style={styles.word}>{gameData.targetCard?.front}</Text>
              <Text style={styles.phonetic}>{gameData.targetCard?.phonetic}</Text>
            </View>
          </Animated.View>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.andText}>AND</Text>
          <View style={styles.line} />
        </View>

        {/* Bottom Card */}
        <View style={styles.cardWrapper}>
          <Animated.View
            style={[
              styles.card,
              styles.cardFront,
              { height: cardHeight, width: cardSize, transform: [{ rotateY: frontInterpolate }] },
            ]}
          >
            <Image
              source={require('../../asset/placeholder.png')}
              style={styles.placeholderImage}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.card,
              styles.cardBack,
              { height: cardHeight, width: cardSize, transform: [{ rotateY: backInterpolate }] },
            ]}
          >
            <View style={styles.cardContent}>
              <Text style={styles.meaning}>{gameData.imageCard?.back}</Text>
            </View>
          </Animated.View>
        </View>
      </View>

      {/* Answer Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => handleAnswerSelection(true)}
        >
          <Text style={styles.buttonText}>Pair</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => handleAnswerSelection(false)}
        >
          <Text style={styles.buttonText}>Not Pair</Text>
        </TouchableOpacity>
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
  cardsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWrapper: {
    marginVertical: 10,
    height: cardHeight,
    width: cardSize,
  },
  card: {
    position: 'absolute',
    borderRadius: 15,
    backfaceVisibility: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFront: {
    backgroundColor: 'transparent',
  },
  cardBack: {
    backgroundColor: 'white',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  cardContent: {
    padding: 15,
    alignItems: 'center',
  },
  word: {
    fontSize: 20,
    color: '#2D2D2D',
    marginBottom: 5,
  },
  phonetic: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  meaning: {
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 10,
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 12,
    color: 'white',
    fontFamily: 'PressStart2P',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '90%',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  andText: {
    marginHorizontal: 15,
    color: '#6C757D',
  },
});
