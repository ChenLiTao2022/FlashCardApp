import React, { useEffect, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const screenWidth = Dimensions.get('window').width;
const numColumns = 4;
const cardMargin = 8;
const cardWidth = (screenWidth - (numColumns + 1) * cardMargin * 2) / numColumns;

const shuffleArray = (array) => {
  let newArr = array.slice();
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

const Card = ({ card, onPress }) => {
  if (card.isMatched) {
    return <View style={[styles.cardContainer, styles.matchedBorder]} />;
  }

  const frontInterpolate = card.animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '0deg']
  });
  const backInterpolate = card.animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={1} style={styles.cardContainer}>
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ perspective: 1000 }, { rotateX: frontInterpolate }],
            position: 'absolute',
            backfaceVisibility: 'hidden'
          }
        ]}
      >
        {card.side === 'text' ? (
          <Text style={styles.cardText}>{card.content}</Text>
        ) : (
          <View style={styles.imageContainer}>
            <Image
              source={{
                uri: card.imageUrl || (card.unsplashImages && card.unsplashImages[0]) || ''
              }}
              style={styles.cardImage}
              resizeMode="cover"
              onError={() => console.log('Image load failed:', card.imageUrl)}
              defaultSource={require('../../asset/placeholder.png')}
            />
            <Text style={styles.overlayText}>{card.english}</Text>
          </View>
        )}
      </Animated.View>

      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ perspective: 1000 }, { rotateX: backInterpolate }],
            backfaceVisibility: 'hidden'
          }
        ]}
      >
        <Image
          source={require('../../asset/placeholder.png')}
          style={styles.cardImage}
          resizeMode="cover"
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function MemoryGame({ dueCards, onAnswer, showResult }) {
  const [cards, setCards] = useState([]);
  const [flippedCards, setFlippedCards] = useState([]);
  const [gameCompleted, setGameCompleted] = useState(false);

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
      
      let gameCards = [];
      dueCards.forEach(item => {
        const parsedItem = parseCardData(item);
        const hasValidText = parsedItem.front?.trim().length > 0;
        const hasValidImage = parsedItem.imageUrl?.trim() || (parsedItem.unsplashImages && parsedItem.unsplashImages[0]);

        if (hasValidText && hasValidImage) {
          const cardText = {
            id: `${parsedItem.id}_text`,
            pairId: parsedItem.id,
            side: 'text',
            content: `${parsedItem.front}${parsedItem.phonetic ? ` (${parsedItem.phonetic})` : ''}`,
            isFlipped: false,
            isMatched: false,
            animation: new Animated.Value(0)
          };
          const cardImage = {
            id: `${parsedItem.id}_image`,
            pairId: parsedItem.id,
            side: 'image',
            english: parsedItem.back,
            imageUrl: parsedItem.imageUrl?.trim() || (parsedItem.unsplashImages && parsedItem.unsplashImages[0]),
            isFlipped: false,
            isMatched: false,
            animation: new Animated.Value(0)
          };
          gameCards.push(cardText, cardImage);
        }
      });

      if (gameCards.length < 4) {
        Alert.alert('Need More Cards', 'Requires at least 2 matching pairs');
        return;
      }

      const shuffled = shuffleArray(gameCards);
      setCards(shuffled);
      setFlippedCards([]);
    };

    initializeGame();
  }, [dueCards]);

  useEffect(() => {
    if (cards.length > 0 && cards.every(card => card.isMatched)) {
      const matchedPairIds = [...new Set(cards.map(card => card.pairId))];
      const matchedCards = dueCards.filter(card => matchedPairIds.includes(card.id));
      let popupString = '';
      matchedCards.forEach(card => {
        const parsedCard = parseCardData(card);
        const examples = parsedCard.examples || [];
        const example = examples.length > 0 ? examples[0] : null;
        popupString += `${parsedCard.front}\n`;
        if (parsedCard.phonetic) popupString += `${parsedCard.phonetic}\n`;
        popupString += `${parsedCard.back}\n`;
        if (example) {
          if (example.question) popupString += `${example.question}\n`;
          if (example.questionTranslation) popupString += `Translation: ${example.questionTranslation}\n`;
        }
        popupString += '\n';
      });
      onAnswer(true, popupString.trim());
      setGameCompleted(true);
    }
  }, [cards, dueCards, onAnswer]);

  const flipCard = (index) => {
    const card = cards[index];
    if (card.isFlipped || card.isMatched || flippedCards.length >= 2) return;

    Animated.timing(card.animation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true
    }).start();

    const updatedCards = cards.map((c, i) => 
      i === index ? { ...c, isFlipped: true } : c
    );
    setCards(updatedCards);

    const newFlipped = [...flippedCards, index];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      const first = updatedCards[newFlipped[0]];
      const second = updatedCards[newFlipped[1]];

      if (first.pairId === second.pairId && first.side !== second.side) {
        setTimeout(() => {
          const matchedCards = updatedCards.map((c, i) => {
            if (newFlipped.includes(i)) {
              return { ...c, isMatched: true };
            }
            return c;
          });
          setCards(matchedCards);
          setFlippedCards([]);
        }, 1000);
      } else {
        setTimeout(() => {
          const resetCards = updatedCards.map((c, i) => {
            if (newFlipped.includes(i)) {
              Animated.timing(c.animation, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true
              }).start();
              return { ...c, isFlipped: false };
            }
            return c;
          });
          setCards(resetCards);
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Find the Matching Cards</Text>
      <View style={styles.grid}>
        {cards.map((card, index) => (
          <Card key={card.id} card={card} onPress={() => flipCard(index)} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    margin: 10,
    width: '100%',
  },
  title: {
    fontSize: 20,

    textAlign: 'center',
    fontFamily: 'PressStart2P',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  cardContainer: {
    width: cardWidth,
    height: cardWidth * 1.5,
    margin: cardMargin,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
  },
  matchedBorder: {
    borderColor: 'green',
    borderWidth: 2,
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  cardText: {
    fontSize: 12,
    textAlign: 'center',
    color: 'black',

  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  overlayText: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    textAlign: 'center',
    padding: 2,
    fontSize: 12,
    fontFamily: 'PressStart2P',
  },
});