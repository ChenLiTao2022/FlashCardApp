// Review.jsx
// cardId: selectedDueCards[0].id, activity: 0 is the card that will be used for the first round
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ImageBackground,
  Dimensions,
  TouchableOpacity,
  Animated,
  ScrollView,
  Easing,
  Image,
} from 'react-native';
import * as SQLite from 'expo-sqlite';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PairOrNotPair from './learningComponent/0PairOrNotPairWord.jsx';
import ListenResponse from './learningComponent/2ListenResponse.jsx';
import MemoryGame from './learningComponent/1MemoryGame';
import SpinWheel from './learningComponent/1SpinWheel.jsx';
import Match from './learningComponent/2MatchOrNot.jsx';
import ListenWrite from './learningComponent/2ListenWrite.jsx';
import SentencePairOrNotPair from './learningComponent/2PairOrNotPairSentence.jsx';
import Hangman from './learningComponent/0Hangman';
import PhoneticChoice from './learningComponent/0WhichPhonetic.jsx';
import SentencePick from './learningComponent/2SentencePick.jsx';
import ForeignSentenceWrite from './learningComponent/2ForeignSentenceWrite.jsx';
import SentenceJumble from './learningComponent/2SentenceJumble.jsx';
import Unjumble from './learningComponent/2Unjumble.jsx';
import ImagePicker from './learningComponent/0ImagePicker.jsx';
import ImagePickerReverse from './learningComponent/0ImagePickerReverse.jsx';
import { useRouter, useLocalSearchParams } from 'expo-router';


const db = SQLite.openDatabaseSync('mydb.db');
const { width, height } = Dimensions.get('window');

/* -------------------------------
   CatAnimation Component (Frame-by-Frame)
---------------------------------*/
const CatAnimation = ({ spriteSrc, frames }) => {
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!spriteSrc || !frames) return;
    
    let currentFrame = 0;
    const frameDuration = 100;
    const interval = setInterval(() => {
      currentFrame = (currentFrame + 1) % frames;
      translateX.setValue(-currentFrame * 64);
    }, frameDuration);

    return () => clearInterval(interval);
  }, [frames, translateX, spriteSrc]);

  if (!spriteSrc || !frames) return null;

  return (
    <View style={{ width: 64, height: 64, overflow: 'hidden', marginBottom: 10 }}>
      <Animated.Image
        source={spriteSrc}
        style={{ width: 64 * frames, height: 64, transform: [{ translateX }] }}
      />
    </View>
  );
};

/* -------------------------------
   GameTemplate Component
---------------------------------*/
function GameTemplate({
  onConfirm,
  onSkip,
  onBack,
  children,
  toastMessage,
  toastType,
  popupData,
  actionButtonText = 'Continue',
  lives,
  currentRound,
  totalRounds,
  gold,
  currentCard,
  onPlayAudio,
}) {
  const popupScale = useRef(new Animated.Value(0.8)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const popupTranslate = useRef(new Animated.Value(50)).current;
  const [showingPopup, setShowingPopup] = useState(false);
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);

  // Reset example index when popup data changes
  useEffect(() => {
    setCurrentExampleIndex(0);
  }, [popupData]);

  // Handle popup appearance and animations
  useEffect(() => {
    if (toastMessage) {
      setShowingPopup(true);
      
      Animated.parallel([
        Animated.timing(popupScale, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(popupOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(popupTranslate, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      setShowingPopup(false);
      
      popupOpacity.setValue(0);
      popupScale.setValue(0.8);
      popupTranslate.setValue(50);
    }
  }, [toastMessage]);

  // Calculate progress percentage for round progress bar
  const roundProgress = (currentRound / totalRounds) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        {/* Navigation Buttons at the top */}
        <View style={styles.navButtonsContainer}>
          <TouchableOpacity onPress={onBack} style={styles.navButton}>
            <Text style={styles.navButtonText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSkip} style={styles.navButton}>
            <Text style={styles.navButtonText}>Skip →</Text>
          </TouchableOpacity>
        </View>
        
        {/* Stats below navigation buttons */}
        <View style={styles.statsInNav}>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>❤️</Text>
            <Text style={styles.statValue}>{lives}</Text>
          </View>
          
          <View style={styles.statItem}>
            <View style={styles.roundProgress}>
              <Text style={styles.statLabel}>Round {currentRound}/{totalRounds}</Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${roundProgress}%` }]} />
              </View>
            </View>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statValue}>{gold}</Text>
          </View>
        </View>
      </View>

      <View style={styles.contentArea}>{children}</View>

      {toastMessage && (
        <Animated.View
          style={[
            styles.popupContainer,
            {
              transform: [{ translateY: popupTranslate }, { scale: popupScale }],
              opacity: popupOpacity,
            },
          ]}
        >
          <View style={[
            styles.popupHeader,
            toastType === 'correct' ? styles.correctHeader : styles.incorrectHeader
          ]}>
            <Text style={[
              styles.popupTitle,
              toastType === 'wrong' ? styles.incorrectTitle : null
            ]}>
              {toastMessage}
            </Text>
          </View>
          
          <View style={styles.popupContent}>
            {/* Image display with overlaid word info */}
            {popupData && typeof popupData === 'object' && (
              <View style={styles.imageContainer}>
                {popupData.imageUrl ? (
                  <Image 
                    source={{ uri: popupData.imageUrl }} 
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.cardImage, {backgroundColor: '#e0e0e0'}]} />
                )}
                
                {/* Overlay word info */}
                <View style={styles.wordOverlay}>
                  <View style={styles.wordInfoTextContainer}>
                    <Text style={styles.frontText}>{popupData.front}</Text>
                    {popupData.phonetic && (
                      <Text style={styles.phoneticText}>[{popupData.phonetic}]</Text>
                    )}
                    {popupData.back && (
                      <Text style={styles.backText}>- {popupData.back}</Text>
                    )}
                  </View>
                  
                  {popupData.frontAudio && (
                    <TouchableOpacity 
                      style={styles.wordAudioButton}
                      onPress={() => onPlayAudio(popupData.frontAudio)}
                    >
                      <Text style={styles.wordAudioIcon}>🔊</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
            
            {/* Examples with side navigation */}
            {popupData && typeof popupData === 'object' && popupData.examples && popupData.examples.length > 0 && (
              <ScrollView style={styles.examplesScrollView} contentContainerStyle={styles.examplesScrollContent}>
                <View style={styles.examplesOuterWrapper}>
                  <View style={styles.examplesWrapper}>
                    {/* Left arrow navigation */}
                    {popupData.examples.length > 1 && (
                      <TouchableOpacity 
                        style={[
                          styles.sideNavigationArrow, 
                          styles.leftArrow,
                          currentExampleIndex === 0 && styles.arrowDisabled
                        ]} 
                        onPress={() => {
                          if (currentExampleIndex > 0) {
                            setCurrentExampleIndex(currentExampleIndex - 1);
                          }
                        }}
                        disabled={currentExampleIndex === 0}
                      >
                        <Text style={styles.sideArrowText}>←</Text>
                      </TouchableOpacity>
                    )}
                    
                    {/* Display only single current example */}
                    <View style={styles.exampleContainer}>
                      {/* Current example */}
                      {popupData.examples[currentExampleIndex] && (
                        <>
                          {/* Question section */}
                          <View style={styles.exampleSection}>
                            <View style={styles.exampleHeaderRow}>
                              <Text style={styles.exampleSectionTitle}>Question:</Text>
                              {popupData.examples[currentExampleIndex].questionAudio && (
                                <TouchableOpacity 
                                  style={styles.pronunciationButton}
                                  onPress={() => onPlayAudio(popupData.examples[currentExampleIndex].questionAudio)}
                                >
                                  <Text style={styles.pronunciationIcon}>🔊</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                            
                            <ScrollView style={styles.exampleContentScroll} nestedScrollEnabled={true}>
                              <Text style={styles.exampleQuestion}>{popupData.examples[currentExampleIndex].question}</Text>
                              <Text style={styles.examplePhonetic}>{popupData.examples[currentExampleIndex].questionPhonetic}</Text>
                            </ScrollView>
                          </View>
                          
                          {/* Answer section */}
                          <View style={[styles.exampleSection, styles.answerSection]}>
                            <View style={styles.exampleHeaderRow}>
                              <Text style={styles.exampleSectionTitle}>Answer:</Text>
                              {popupData.examples[currentExampleIndex].answerAudio && (
                                <TouchableOpacity 
                                  style={styles.pronunciationButton}
                                  onPress={() => onPlayAudio(popupData.examples[currentExampleIndex].answerAudio)}
                                >
                                  <Text style={styles.pronunciationIcon}>🔊</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                            
                            <ScrollView style={styles.exampleContentScroll} nestedScrollEnabled={true}>
                              <Text style={styles.exampleAnswer}>{popupData.examples[currentExampleIndex].answer}</Text>
                              <Text style={styles.examplePhonetic}>{popupData.examples[currentExampleIndex].answerPhonetic}</Text>
                            </ScrollView>
                          </View>
                          
                          {/* Example counter at bottom right */}
                          {popupData.examples.length > 1 && (
                            <View style={styles.exampleCountIndicator}>
                              <Text style={styles.exampleCountText}>
                                {currentExampleIndex + 1} / {popupData.examples.length}
                              </Text>
                            </View>
                          )}
                        </>
                      )}
                    </View>
                    
                    {/* Right arrow navigation */}
                    {popupData.examples.length > 1 && (
                      <TouchableOpacity 
                        style={[
                          styles.sideNavigationArrow, 
                          styles.rightArrow,
                          currentExampleIndex === popupData.examples.length - 1 && styles.arrowDisabled
                        ]} 
                        onPress={() => {
                          if (currentExampleIndex < popupData.examples.length - 1) {
                            setCurrentExampleIndex(currentExampleIndex + 1);
                          }
                        }}
                        disabled={currentExampleIndex === popupData.examples.length - 1}
                      >
                        <Text style={styles.sideArrowText}>→</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </ScrollView>
            )}
            
            {/* Handle legacy string format */}
            {popupData && typeof popupData === 'string' && (
              <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
                <View style={styles.cardContainer}>
                  <View style={styles.cardContent}>
                    {popupData.split('\n').map((line, i) => (
                      <Text key={i} style={[
                        styles.cardText,
                        i === 0 ? styles.frontText : null,
                        i === 1 ? styles.phoneticText : null,
                        i === 2 ? styles.backText : null,
                      ]}>
                        {line}
                      </Text>
                    ))}
                  </View>
                </View>
              </ScrollView>
            )}
            
            {/* Continue button at bottom, but always visible */}
            <View style={styles.continueButtonContainer}>
              <TouchableOpacity onPress={onConfirm} style={styles.popupButton}>
                <Text style={styles.popupButtonText}>{actionButtonText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

/* -------------------------------
   ChestView Component for Evaluation
---------------------------------*/
const ChestView = ({ chestIndex }) => {
  // Use the same values as in ChestSlot in CatSection.jsx
  const frameWidth = 30; // CHEST_VISIBLE_WIDTH
  const frameHeight = 22; // CHEST_VISIBLE_HEIGHT
  
  // For first chest, it's at position (0,10) in the sprite sheet
  // Just use that value directly if chestIndex is 0
  const topOffset = chestIndex === 0 ? 10 : 
                    chestIndex === 1 ? 74 :
                    chestIndex === 2 ? 138 :
                    202; // fourth chest
  
  return (
    <View style={styles.chestViewContainer}>
      <Text style={styles.chestRewardText}>New Reward Chest!</Text>
      <View style={styles.chestImageContainer}>
        <View style={{
          width: frameWidth,
          height: frameHeight,
          transform: [{ scale: 2.5 }],
          overflow: 'hidden',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Image
            source={require('../asset/Chests.png')}
            style={{
              position: 'absolute',
              top: -topOffset,
              left: 0,
              width: 240,
              height: 256,
            }}
          />
        </View>
      </View>
      <Text style={styles.chestInstructionText}>This chest will be added to your collection</Text>
    </View>
  );
};

/* -------------------------------
   CardResult Component for Evaluation Page
---------------------------------*/
const CardResult = ({ card, results, originalCard }) => {
  return (
    <View style={styles.cardResultContainer}>
      <Text style={styles.cardResultTitle}>{card.front}</Text>
      <View style={styles.cardResultContent}>
        <View style={styles.cardResultRow}>
          <Text style={styles.cardResultLabel}>Original Status:</Text>
          <Text style={styles.cardResultValue}>
            Ease Factor: {parseFloat(originalCard.easeFactor || 1.5).toFixed(1)} • 
            Streak: {originalCard.consecutiveCorrectAnswersCount || 0} • 
            In Wrong Queue: {JSON.parse(originalCard.wrongQueue || "[false,0]")[0] ? 'Yes' : 'No'}
          </Text>
        </View>
        <View style={styles.cardResultRow}>
          <Text style={styles.cardResultLabel}>New Status:</Text>
          <Text style={styles.cardResultValue}>
            Ease Factor: {parseFloat(card.easeFactor || 1.5).toFixed(1)} • 
            Streak: {card.consecutiveCorrectAnswersCount || 0} • 
            In Wrong Queue: {JSON.parse(card.wrongQueue || "[false,0]")[0] ? 'Yes' : 'No'}
          </Text>
        </View>
        <View style={styles.cardResultRow}>
          <Text style={styles.cardResultLabel}>Next Review:</Text>
          <Text style={styles.cardResultValue}>{new Date(card.nextReviewDate).toLocaleString()}</Text>
        </View>
        <View style={styles.cardResultRow}>
          <Text style={styles.cardResultLabel}>Performance:</Text>
          <Text style={[
            styles.cardResultValue,
            { color: results.every(r => r) ? '#4CAF50' : '#E91E63' }
          ]}>
            {results.filter(r => r).length}/{results.length} correct
          </Text>
        </View>
      </View>
    </View>
  );
};

/* -------------------------------
   Review Component
---------------------------------*/
export default function Review() {
  const router = useRouter();
  const { deckName } = useLocalSearchParams();
  const [reviewStarted, setReviewStarted] = useState(false);
  const [allCards, setAllCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [otherCards, setOtherCards] = useState([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [gold, setGold] = useState(0);
  const [lives, setLives] = useState(3);
  const [isCorrectAnswer, setIsCorrectAnswer] = useState(null);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState(null);
  const [popupData, setPopupData] = useState(null);
  const [progress, setProgress] = useState(0);
  const [currentSprite, setCurrentSprite] = useState(null);
  const [currentFrames, setCurrentFrames] = useState(null);
  const [cardResults, setCardResults] = useState({});
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [totalRounds, setTotalRounds] = useState(1); // Only one round now
  const [originalCardData, setOriginalCardData] = useState(null);
  const [modifiedCardData, setModifiedCardData] = useState(null);
  const [sound, setSound] = useState(null);
  const [occupiedChests, setOccupiedChests] = useState(0);
  const [showChest, setShowChest] = useState(false);
  const [chestImage, setChestImage] = useState(null);

  const goodEvents = [
    { message: 'Correct!', sprite: require('../asset/RetroCatsPaid/Cats/Sprites/Dance.png'), frames: 4 },
    { message: 'Correct!', sprite: require('../asset/RetroCatsPaid/Cats/Sprites/Happy.png'), frames: 10 },
  ];

  const badEvents = [
    { message: 'Wrong!', sprite: require('../asset/RetroCatsPaid/Cats/Sprites/Hurt.png'), frames: 8 },
    { message: 'Wrong!', sprite: require('../asset/RetroCatsPaid/Cats/Sprites/Sleeping.png'), frames: 4 },
  ];

  // Function to update a card's SRS parameters based on results
  const updateCardSRS = (card, correct) => {
    const newCard = { ...card };
    
    if (correct) {
      // All questions for this card were answered correctly
      const lastReviewDate = new Date().toISOString();
      let diffHours = 6; // Default interval

      if (card.nextReviewDate !== card.lastReviewDate) {
        diffHours = Math.ceil(
          (new Date(card.nextReviewDate) - new Date(card.lastReviewDate)) / (1000 * 60 * 60)
        );
      }
      
      // Calculate new interval based on ease factor
      const nextReviewDate = new Date();
      nextReviewDate.setHours(nextReviewDate.getHours() + diffHours * card.easeFactor);
      
      newCard.lastReviewDate = lastReviewDate;
      newCard.nextReviewDate = nextReviewDate.toISOString();
      newCard.easeFactor = (parseFloat(card.easeFactor || 1.5) + 0.1).toFixed(1);
      newCard.consecutiveCorrectAnswersCount = (card.consecutiveCorrectAnswersCount || 0) + 1;
    } else {
      // At least one question was answered incorrectly
      const now = new Date().toISOString();
      newCard.wrongQueue = JSON.stringify([true, 0]);
      newCard.lastReviewDate = now;
      newCard.nextReviewDate = now;
      newCard.easeFactor = Math.max(1.3, parseFloat(card.easeFactor || 1.5) - 0.1).toFixed(1);
      newCard.consecutiveCorrectAnswersCount = 0;
    }
    
    return newCard;
  };

  // Function to play sound based on answer correctness
  const playSound = async (isCorrect) => {
    try {
      // Unload previous sound if it exists
      if (sound) {
        await sound.unloadAsync();
      }
      
      // Load the appropriate sound file
      const soundFile = isCorrect 
        ? require('../asset/music/correct.mp3') 
        : require('../asset/music/wrong.mp3');
      
      const { sound: newSound } = await Audio.Sound.createAsync(soundFile);
      setSound(newSound);
      
      await newSound.setVolumeAsync(isCorrect ? 0.5 : 1.0);
      await newSound.playAsync();
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  // Function to play finish sound
  const playFinishSound = async () => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        require('../asset/music/finish.mp3')
      );
      setSound(newSound);
      await newSound.playAsync();
    } catch (error) {
      console.error('Error playing finish sound:', error);
    } 
  };

  // Clean up sound on component unmount
  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  useEffect(() => {
    if (deckName && !reviewStarted) {
      try {
        // Load the deck and set up the review
        const loadDeckAndSetup = async () => {
          try {
            // Get occupiedChests from AsyncStorage
            const occupiedChestsStr = await AsyncStorage.getItem('occupiedChestsCount');
            const chestCount = parseInt(occupiedChestsStr || '0');
            setOccupiedChests(chestCount);
            
            const items = db.getAllSync(`SELECT * FROM ${deckName}`);
            setAllCards(items);
            
            const now = new Date();
            
            // Filter cards into due cards
            const dueCards = items.filter(c => {
              return now >= new Date(c.nextReviewDate);
            }).sort((a, b) => new Date(a.nextReviewDate) - new Date(b.nextReviewDate));
            
            if (dueCards.length < 3) {
              Alert.alert('Not enough due cards', `Need at least 3, but got ${dueCards.length}.`);
              return;
            }

            // Select one card for review and two others for options
            const selectedDueCard = dueCards[0];
            setSelectedCard(selectedDueCard);
            setOriginalCardData({...selectedDueCard});
            
            // Select two other cards for options in ImagePickerReverse
            setOtherCards(dueCards.slice(1, 3));
            
            // Set total rounds to 1 (just one activity)
            setTotalRounds(1);
            setCurrentRound(1);
            setReviewStarted(true);
          } catch (error) {
            console.error("Error loading deck:", error);
            Alert.alert("Error", `Failed to load deck: ${error.message}`);
          }
        };
        
        loadDeckAndSetup();
      } catch (e) {
        console.error(e);
        Alert.alert('Error', `Could not load deck ${deckName}`);
      }
    }
  }, [deckName, reviewStarted]);
  
  // Auto-continue effect when answer is locked
  useEffect(() => {
    if (isAnswerLocked && !showResult) {
      handleContinue();
    }
  }, [isAnswerLocked, showResult]);

  const handleRoundComplete = () => {
    // Process the card for evaluation
    if (selectedCard) {
      const result = cardResults[1] || false; // Get result from round 1
      const updatedCard = updateCardSRS(selectedCard, result);
      setModifiedCardData(updatedCard);
    }
    
    // Check if we can show a chest (when we have less than 4 occupied)
    if (occupiedChests < 4) {
      setShowChest(true);
      
      // Select a random chest index (0-3)
      const chestIndex = Math.floor(Math.random() * 4);
      setChestImage(chestIndex);
      
      // Store the selected chest index in AsyncStorage to pass it back to index
      AsyncStorage.setItem('newChestIndex', chestIndex.toString());
    }
    
    setShowEvaluation(true);
    playFinishSound();
  };

  const handleSkip = () => {
    // Mark current round as wrong if skipped
    setCardResults(prev => ({...prev, [currentRound]: false}));
    
    setLives(l => l - 1);
    handleRoundComplete();
  };
  
  const handleAnswer = (isCorrect, popupObj) => {
    setIsCorrectAnswer(isCorrect);
    
    // Create a rich popup data object with card details
    if (selectedCard) {
      try {
        // Parse examples for the card
        const examplesArray = Array.isArray(selectedCard.examples) 
          ? selectedCard.examples 
          : JSON.parse(selectedCard.examples || '[]');
        
        setPopupData({
          imageUrl: selectedCard.imageUrl,
          front: selectedCard.front,
          phonetic: selectedCard.phonetic,
          back: selectedCard.back,
          frontAudio: selectedCard.frontAudio,
          examples: examplesArray
        });
      } catch (error) {
        console.error('Error parsing examples:', error);
        setPopupData({
          imageUrl: selectedCard.imageUrl,
          front: selectedCard.front,
          phonetic: selectedCard.phonetic,
          back: selectedCard.back,
          frontAudio: selectedCard.frontAudio,
          examples: []
        });
      }
    }
    
    setIsAnswerLocked(true);
    
    // Record the result for this round
    setCardResults(prev => ({...prev, [currentRound]: isCorrect}));
  };

  const handleContinue = () => {
    if (showResult) {
      // Reset state and move to evaluation
      setShowResult(false);
      setToastMessage('');
      setToastType(null);
      setCurrentSprite(null);
      setCurrentFrames(null);
      setPopupData(null);
      setIsAnswerLocked(false);
      handleRoundComplete();
    } else if (isAnswerLocked) {
      const correct = isCorrectAnswer;
      
      // Update feedback
      if (correct) {
        const goodEvent = goodEvents[Math.floor(Math.random() * goodEvents.length)];
        setToastType('correct');
        setToastMessage('Correct!');
        setCurrentSprite(goodEvent.sprite);
        setCurrentFrames(goodEvent.frames);
        setGold(g => g + 10);
      } else {
        const badEvent = badEvents[Math.floor(Math.random() * badEvents.length)];
        setToastType('wrong');
        setToastMessage('Wrong!');
        setCurrentSprite(badEvent.sprite);
        setCurrentFrames(badEvent.frames);
        setLives(l => l - 1);
      }
      
      // Play result sound first, then word audio after a delay
      playSound(correct);
      
      // Get the current card for its audio
      if (selectedCard && selectedCard.frontAudio) {
        // Set a timeout to play the word audio after the result sound
        setTimeout(async () => {
          try {
            if (sound) {
              await sound.unloadAsync();
            }
            
            const { sound: wordSound } = await Audio.Sound.createAsync(
              { uri: selectedCard.frontAudio }
            );
            setSound(wordSound);
            await wordSound.playAsync();
          } catch (error) {
            console.error('Error playing word audio:', error);
          }
        }, 1200); // Wait for result sound to complete
      }
      
      setShowResult(true);
      setProgress(100); // Set progress to 100% as there's only one round
    }
  };

  // Show evaluation page
  if (showEvaluation) {
    return (
      <View style={styles.container}>
        <View style={styles.evaluationHeader}>
          <Text style={styles.evaluationTitle}>Review Completed!</Text>
          {showChest ? (
            <ChestView chestIndex={chestImage} />
          ) : (
            <Text style={styles.evaluationSubtitle}>{gold} Gold</Text>
          )}
        </View>
        
        <ScrollView style={styles.evaluationScroll}>
          <View style={styles.evaluationContent}>
            {/* Card Result */}
            <Text style={styles.evaluationSectionTitle}>Reviewed Card</Text>
            {selectedCard && (
              <CardResult 
                key={selectedCard.id}
                card={modifiedCardData || selectedCard}
                results={[cardResults[1] || false]}
                originalCard={originalCardData || selectedCard}
              />
            )}
          </View>
        </ScrollView>
        
        <View style={styles.evaluationButtons}>
          <TouchableOpacity 
            style={styles.evaluationButton} 
            onPress={async () => {
              if (showChest) {
                // Set flag in AsyncStorage to add a new chest
                await AsyncStorage.setItem('addNewChest', 'true');
              }
              router.back();
            }}
          >
            <Text style={styles.evaluationButtonText}>CONTINUE</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Main review screen
  return (
    <ImageBackground source={require('../asset/background.png')} style={styles.bgImage}>
      <GameTemplate
        onConfirm={handleContinue}
        onSkip={handleSkip}
        onBack={() => router.back()}
        toastMessage={toastMessage}
        toastType={toastType}
        popupData={popupData}
        actionButtonText="Continue"
        lives={lives}
        currentRound={currentRound}
        totalRounds={totalRounds}
        gold={gold}
        currentCard={selectedCard}
        onPlayAudio={(audioUri) => {
          const playAudio = async (uri) => {
            try {
              if (sound) {
                await sound.unloadAsync();
              }
              const { sound: newSound } = await Audio.Sound.createAsync(
                { uri }
              );
              setSound(newSound);
              await newSound.playAsync();
            } catch (error) {
              console.error('Error playing audio:', error);
            }
          };
          playAudio(audioUri);
        }}
      >
        <View style={styles.divider} />
        {selectedCard && !showResult && (
          <ImagePickerReverse 
            key={`${selectedCard.id}-0-1`} 
            dueCards={[selectedCard, ...otherCards]} 
            onAnswer={(isCorrect) => handleAnswer(isCorrect)}
            showResult={showResult} 
          />
        )}
      </GameTemplate>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: { 
    flex: 1,
    backgroundColor: '#121212'
  },
  
  container: { 
    flex: 1, 
    paddingTop: 0,
    width: '100%',
    backgroundColor: '#121212'
  },
  
  navBar: { 
    flexDirection: 'column', 
    justifyContent: 'flex-start', 
    padding: 15, 
    paddingTop: 30,
    backgroundColor: '#1E1E1E',
    marginHorizontal: 0, 
    borderRadius: 0, 
    marginTop: 0,
  },
  
  navButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  
  statsInNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8
  },
  
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  statIcon: {
    fontSize: 18,
    marginRight: 4
  },
  
  statValue: { 
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 16, 
    color: '#E0E0E0',
  },
  
  statLabel: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#BBBBBB',
    marginBottom: 3
  },
  
  roundProgress: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 150
  },
  
  progressBarContainer: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(80, 80, 80, 0.6)',
    borderRadius: 10,
    overflow: 'hidden'
  },
  
  progressBar: {
    height: '100%',
    backgroundColor: '#58CC02',
    borderRadius: 10
  },
  
  contentArea: { 
    flex: 1, 
    width: '100%', 
    padding: 0,
    alignItems: 'center', 
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#1A1A1A',
  },
  
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: '#333333',
    marginVertical: 5,
  },
  
  navButton: { 
    padding: 12,
    backgroundColor: 'rgba(40, 40, 40, 0.8)',
    borderRadius: 16,
    marginHorizontal: 5,
    flex: 1,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333333',
  },
  
  navButtonText: { 
    color: '#58CC02',
    fontSize: 14, 
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  
  popupContainer: { 
    position: 'absolute',
    top: 120,
    bottom: 30,
    left: 15,
    right: 15,
    zIndex: 5,
    backgroundColor: '#252525',
    borderRadius: 20, 
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: '#333333',
  },
  
  popupContent: { 
    flex: 1,
    alignItems: 'center', 
    width: '100%',
    paddingBottom: 0,
    justifyContent: 'space-between',
  },
  
  continueButtonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 15,
    backgroundColor: '#252525',
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  
  popupButton: { 
    backgroundColor: '#58CC02',
    borderRadius: 16, 
    paddingVertical: 14, 
    paddingHorizontal: 20, 
    width: '90%',
    shadowColor: '#45a100',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  
  popupButtonText: { 
    fontFamily: 'System', 
    fontSize: 18, 
    fontWeight: 'bold',
    color: 'white', 
    textAlign: 'center' 
  },
  
  imageContainer: {
    width: '90%',
    height: 180,
    marginBottom: 15,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333333',
    position: 'relative',
  },
  
  cardImage: {
    width: '100%',
    height: '100%',
  },
  
  wordOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    padding: 15,
  },
  
  wordInfoTextContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  frontText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 5,
  },
  
  phoneticText: {
    fontSize: 20,
    fontStyle: 'italic',
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 5,
  },
  
  backText: {
    fontSize: 22,
    color: '#FFD700',
    fontWeight: '500',
    textAlign: 'center',
  },
  
  wordAudioButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#58CC02',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  
  wordAudioIcon: {
    fontSize: 20,
    color: 'white',
  },
  
  examplesScrollView: {
    width: '100%',
    flex: 1,
  },
  
  examplesScrollContent: {
    alignItems: 'center',
    paddingBottom: 70,
  },
  
  examplesOuterWrapper: {
    width: '90%',
    marginHorizontal: 20,
  },
  
  examplesWrapper: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  
  exampleContainer: {
    backgroundColor: '#333333',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#444444',
    width: '90%',
    position: 'relative',
    marginHorizontal: 10,
  },
  
  sideNavigationArrow: {
    width: 40,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333333',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10,
  },
  
  leftArrow: {
    marginRight: 5,
  },
  
  rightArrow: {
    marginLeft: 5,
  },
  
  sideArrowText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#58CC02',
  },
  
  arrowDisabled: {
    backgroundColor: '#222222',
    opacity: 0.5,
  },
  
  exampleCountIndicator: {
    position: 'absolute',
    right: 10,
    bottom: -10,
    backgroundColor: '#333333',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444444',
  },
  
  exampleCountText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#CCCCCC',
  },
  
  exampleSection: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#444444',
  },
  
  exampleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  exampleSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#CCCCCC',
    marginBottom: 4,
  },
  
  pronunciationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#58CC02',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  
  pronunciationIcon: {
    fontSize: 16,
    color: 'white',
  },
  
  exampleContentScroll: {
    maxHeight: 100,
  },
  
  exampleQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#CCCCCC',
    marginBottom: 5,
  },
  
  exampleAnswer: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#CCCCCC',
    marginBottom: 5,
  },
  
  examplePhonetic: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#999999',
    marginBottom: 5,
  },
  
  answerSection: {
    backgroundColor: 'rgba(88, 204, 2, 0.1)',
    borderRadius: 8,
    marginBottom: 10,
    paddingTop: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 0,
  },
  
  popupHeader: {
    width: '100%',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  
  correctHeader: {
    backgroundColor: '#2E5B01',
  },
  
  incorrectHeader: {
    backgroundColor: '#5B0000',
  },
  
  popupTitle: { 
    fontFamily: 'System', 
    fontSize: 22, 
    fontWeight: 'bold',
    color: '#58CC02',
    textAlign: 'center', 
    marginTop: 15,
    marginBottom: 15,
    width: '100%',
    paddingHorizontal: 15,
  },
  
  incorrectTitle: {
    color: '#FFFFFF',
  },
  
  scrollContainer: {
    width: '100%',
    flex: 1
  },
  
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 70
  },
  
  cardContainer: {
    width: '90%',
    backgroundColor: '#333333',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  
  cardContent: {
    width: '100%',
    alignItems: 'center',
  },
  
  cardText: {
    marginBottom: 5,
    color: '#CCCCCC',
  },
  
  evaluationHeader: { 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    margin: 10,
    marginTop: 50,
  },
  
  evaluationTitle: { 
    fontFamily: 'System', 
    fontSize: 24, 
    fontWeight: 'bold',
    color: '#CCCCCC',
    marginBottom: 10 
  },
  
  evaluationSubtitle: { 
    fontFamily: 'System', 
    fontSize: 18, 
    fontWeight: 'bold',
    color: '#FFB100'
  },
  
  evaluationScroll: { 
    flex: 1,
    backgroundColor: '#121212',
  },
  
  evaluationContent: { 
    padding: 10 
  },
  
  evaluationSectionTitle: { 
    fontFamily: 'System', 
    fontSize: 18, 
    fontWeight: 'bold',
    color: '#CCCCCC',
    backgroundColor: '#252525',
    padding: 15, 
    borderRadius: 16, 
    marginVertical: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  
  cardResultContainer: { 
    backgroundColor: '#252525',
    borderRadius: 16, 
    padding: 15, 
    marginBottom: 15,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#333333'
  },
  
  cardResultTitle: { 
    fontSize: 18, 
    fontWeight: 'bold',
    color: '#CCCCCC',
    marginBottom: 10 
  },
  
  cardResultContent: { 
    backgroundColor: '#333333',
    borderRadius: 16, 
    padding: 12 
  },
  
  cardResultRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginVertical: 5 
  },
  
  cardResultLabel: { 
    fontSize: 14, 
    color: '#999999',
    fontWeight: '600'
  },
  
  cardResultValue: { 
    fontSize: 14, 
    color: '#CCCCCC',
    fontWeight: '500'
  },
  
  evaluationButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 20,
    backgroundColor: '#1A1A1A',
  },
  
  evaluationButton: { 
    backgroundColor: '#58CC02',
    borderRadius: 16, 
    padding: 16, 
    flex: 1, 
    marginHorizontal: 5,
    shadowColor: '#45a100',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  
  evaluationButtonText: { 
    fontFamily: 'System', 
    fontSize: 16, 
    fontWeight: 'bold',
    color: 'white', 
    textAlign: 'center' 
  },
  
  chestViewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 15,
    padding: 20,
    marginTop: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: '#333333',
  },
  
  chestRewardText: {
    fontFamily: 'PressStart2P',
    fontSize: 20,
    color: '#FFD700',
    marginBottom: 15,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  
  chestImageContainer: {
    width: 80,
    height: 80,
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: '#3A3000',
    borderWidth: 2,
    borderColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    marginVertical: 15,
  },
  
  chestInstructionText: {
    fontFamily: 'PressStart2P',
    fontSize: 14,
    color: '#CCCCCC',
    marginTop: 10,
    textAlign: 'center',
  },
});