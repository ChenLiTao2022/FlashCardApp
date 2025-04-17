import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text as RNText,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal
} from 'react-native';
import Svg, { Path, Text } from 'react-native-svg';

const segments = 5; // 3 cards + money + ad
const segmentAngle = 360 / segments;
const { width } = Dimensions.get('window');
const wheelSize = width * 0.8;

export default function SpinWheel({ dueCards, onAnswer, showResult }) {
  const [selectedCards, setSelectedCards] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [currentCard, setCurrentCard] = useState(null);
  const [options, setOptions] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [animatingResult, setAnimatingResult] = useState(false);
  
  const spinValue = useRef(new Animated.Value(0)).current;
  const rotation = useRef(0);
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Select 3 random cards for the wheel (if available)
    const shuffled = [...dueCards].sort(() => 0.5 - Math.random()).slice(0, 3);
    setSelectedCards(shuffled);
  }, [dueCards]);

  // Animation for pulsing the selected segment
  useEffect(() => {
    if (selectedSegment !== null && !showQuiz && !showMessage) {
      setAnimatingResult(true);
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        })
      ]).start(() => {
        setAnimatingResult(false);
        // Now proceed with showing quiz or message
        processSelectedSegment(selectedSegment);
      });
    }
  }, [selectedSegment]);

  const getSegmentColor = (index) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFD93D', '#96CEB4'];
    return colors[index % colors.length];
  };

  const generateOptions = (correctCard) => {
    const options = [correctCard.back];
    
    // Add 2 random incorrect options from other cards
    while (options.length < 3) {
      const randomCard = dueCards[Math.floor(Math.random() * dueCards.length)];
      if (randomCard.id !== correctCard.id && !options.includes(randomCard.back)) {
        options.push(randomCard.back);
      }
    }
    
    // Shuffle options
    return options.sort(() => Math.random() - 0.5);
  };

  const handleOptionSelect = (option) => {
    const isCorrect = option === currentCard.back;
    
    // Build popup data string
    let popupString = `${currentCard.front}\n`;
    if (currentCard.phonetic) popupString += `${currentCard.phonetic}\n`;
    if (currentCard.back) popupString += `${currentCard.back}\n`;
    
    // Hide the quiz
    setShowQuiz(false);
    
    // Call the onAnswer callback
    onAnswer?.(isCorrect, popupString);
  };

  const spin = () => {
    if (spinning || showResult || animatingResult) return;
    
    setSpinning(true);
    const randomSpins = 5 + Math.random() * 5;
    const newRotation = rotation.current + (randomSpins * 360);
    
    Animated.timing(spinValue, {
      toValue: newRotation,
      duration: 5000,
      useNativeDriver: true
    }).start(() => {
      const actualRotation = newRotation % 360;
      // Adjust the selectedIndex calculation to match the top marker position
      // Since segmentAngle is 72 degrees (360/5), we need to ensure the right segment is selected
      const selectedIndex = segments - Math.floor(((actualRotation + 90) % 360) / segmentAngle) % segments;
      setSelectedSegment(selectedIndex);
      rotation.current = actualRotation;
      setSpinning(false);
    });
  };

  const processSelectedSegment = (index) => {
    if (index < 3 && selectedCards[index]) {
      // Card selected - show quiz
      const card = selectedCards[index];
      setCurrentCard(card);
      setOptions(generateOptions(card));
      setShowQuiz(true);
    } else if (index === 3) {
      // Money segment
      setMessageText("Money! 🎉 You earned 5 gold!");
      setShowMessage(true);
      setTimeout(() => {
        setShowMessage(false);
        onAnswer?.(true, "🎉 You earned 5 gold!");
      }, 1000);
    } else {
      // Ad segment
      setMessageText("ADs for now 📺");
      setShowMessage(true);
      setTimeout(() => {
        setShowMessage(false);
        onAnswer?.(false, "📺 Watch an ad to continue!");
      }, 1000);
    }
  };

  const handleResult = (index) => {
    // This is now just setting the selectedSegment
    // The actual processing will happen after animation in the useEffect
    setSelectedSegment(index);
  };

  const renderWheel = () => {
    const center = wheelSize / 2;
    const radius = wheelSize / 2;
    const textRadius = radius * 0.65;
    
    const segmentLabels = [
      selectedCards[0]?.front || 'Card1',
      selectedCards[1]?.front || 'Card2',
      selectedCards[2]?.front || 'Card3',
      'Money',
      'Ad'
    ];

    return (
      <Svg width={wheelSize} height={wheelSize}>
        {[...Array(segments)].map((_, i) => {
          const startAngle = i * segmentAngle - 90;
          const endAngle = (i + 1) * segmentAngle - 90;
          const midAngle = (startAngle + endAngle) / 2;
          
          const x1 = center + radius * Math.cos(startAngle * Math.PI / 180);
          const y1 = center + radius * Math.sin(startAngle * Math.PI / 180);
          const x2 = center + radius * Math.cos(endAngle * Math.PI / 180);
          const y2 = center + radius * Math.sin(endAngle * Math.PI / 180);

          const textX = center + textRadius * Math.cos(midAngle * Math.PI / 180);
          const textY = center + textRadius * Math.sin(midAngle * Math.PI / 180);
          
          const isSelected = selectedSegment === i;
          
          return (
            <React.Fragment key={i}>
              <Path
                d={`M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`}
                fill={getSegmentColor(i)}
                stroke={isSelected ? "#FFFFFF" : "transparent"}
                strokeWidth={isSelected ? 3 : 0}
              />
              <Text
                x={textX}
                y={textY}
                fill="#FFF"
                fontSize="14"
                fontWeight="bold"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {segmentLabels[i]}
              </Text>
            </React.Fragment>
          );
        })}
      </Svg>
    );
  };

  return (
    <View style={styles.container}>
      <RNText style={styles.title}>Spin the Wheel!</RNText>
      
      <View style={styles.wheelWrapper}>
        {/* Position the arrow directly at the top center, pointing down */}
        <View style={styles.arrowContainer}>
          <Svg width={30} height={30}>
            <Path
              d="M 0 0 L 30 0 L 15 15 Z"
              fill="#333"
            />
          </Svg>
        </View>
      
        <Animated.View style={[
          styles.wheelContainer, 
          {
            transform: [
              {
                rotate: spinValue.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg']
                })
              },
              { scale: selectedSegment !== null && animatingResult ? pulseAnimation : 1 }
            ]
          }
        ]}>
          {renderWheel()}
        </Animated.View>
      </View>

      <TouchableOpacity
        style={[
          styles.spinButton, 
          (spinning || showResult || showQuiz || showMessage || animatingResult) && 
          styles.disabledButton
        ]}
        onPress={spin}
        disabled={spinning || showResult || showQuiz || showMessage || animatingResult}
      >
        <RNText style={styles.buttonText}>
          {spinning ? 'Spinning...' : 'SPIN'}
        </RNText>
      </TouchableOpacity>
      
      {/* Quiz Modal */}
      <Modal
        visible={showQuiz}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <View style={styles.quizContainer}>
            <RNText style={styles.quizQuestion}>
              What is the meaning of "{currentCard?.front}"?
            </RNText>
            {currentCard?.phonetic && (
              <RNText style={styles.phonetic}>{currentCard.phonetic}</RNText>
            )}
            
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.optionButton}
                onPress={() => handleOptionSelect(option)}
              >
                <RNText style={styles.optionText}>{option}</RNText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
      
      {/* Message Modal */}
      <Modal
        visible={showMessage}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <View style={styles.messageContainer}>
            <RNText style={styles.messageText}>{messageText}</RNText>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    margin: 10,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'PressStart2P',
  },
  wheelWrapper: {
    width: wheelSize,
    height: wheelSize,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    position: 'relative',
  },
  wheelContainer: {
    width: wheelSize,
    height: wheelSize,
  },
  arrowContainer: {
    position: 'absolute',
    top: -15,
    zIndex: 10,
    alignItems: 'center',
  },
  spinButton: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginTop: 20,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'PressStart2P',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  quizContainer: {
    width: width * 0.8,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  quizQuestion: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'PressStart2P',
  },
  phonetic: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    fontFamily: 'PressStart2P',
  },
  optionButton: {
    width: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 10,
    padding: 15,
    marginVertical: 5,
  },
  optionText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'PressStart2P',
  },
  messageContainer: {
    width: width * 0.8,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  messageText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'PressStart2P',
  },
});
