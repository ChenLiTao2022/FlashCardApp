// Review.jsx
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
} from 'react-native';
import * as SQLite from 'expo-sqlite';
import PairOrNotPair from './learningComponent/2PairOrNotPair';
import ListenResponse from './learningComponent/4ListenResponse';
import MemoryGame from './learningComponent/1MemoryGame';
import SpinWheel from './learningComponent/3SpinWheel';
import TrueOrFalse from './learningComponent/6TrueOrFalse';
import ListenWrite from './learningComponent/5ListenWrite';
import SentencePairOrNotPair from './learningComponent/7PairOrNotPair';
import Hangman from './learningComponent/0Hangman';
import PhoneticChoice from './learningComponent/8WhichPhonetic';
import { useRouter, useLocalSearchParams } from 'expo-router';
import catAnimations from './CatAnimations.jsx';
import { RunningCat, AnimatedCat } from './CatAnimations.jsx';

const db = SQLite.openDatabaseSync('mydb.db');
const { width, height } = Dimensions.get('window');

// Add adventure situations - 20 different scenarios
const adventureSituations = [
  "Kitty ventures out of the house looking for adventure...",
  "Kitty discovers a mysterious alley with glowing eyes watching from the shadows...",
  "Kitty climbs to the top of a tall tree and surveys its kingdom from above...",
  "Kitty finds an unattended fish market stall with delicious treasures...",
  "Kitty follows a butterfly through a colorful garden of strange plants...",
  "Kitty sneaks into a neighbor's backyard BBQ party...",
  "Kitty explores an abandoned warehouse full of interesting smells...",
  "Kitty races against neighborhood squirrels in the park...",
  "Kitty discovers a warm laundry basket fresh from the dryer...",
  "Kitty investigates strange noises coming from under the porch...",
  "Kitty finds a sunny spot by the window in the library...",
  "Kitty follows the scent of cooking to a restaurant's back door...",
  "Kitty chases fallen leaves blowing in the autumn wind...",
  "Kitty finds a forgotten toy mouse under the couch...",
  "Kitty stalks the mysterious red dot that appears on walls...",
  "Kitty patrols the neighborhood fence line looking for intruders...",
  "Kitty discovers a box left on the doorstep and investigates...",
  "Kitty watches birds at the feeder through the window...",
  "Kitty explores the roof and finds a perfect napping spot...",
  "Kitty follows a trail of interesting scents through the garden..."
];

// Add good and bad outcomes for each round
const goodOutcomes = [
  "The sushi chef one block away gave kitty some raw sashimi. Hunger -2.",
  "A kind elderly woman offered kitty some fresh cream. Thirst -3.",
  "Kitty found a sunny spot to nap in the park. Energy +3.",
  "Children gently petted kitty and gave treats. Happiness +2.",
  "Kitty found an open window to a warm house. Comfort +3.",
  "A family having a picnic shared some turkey. Hunger -3.",
  "Kitty discovered a hidden cache of catnip. Joy +4.",
  "A friendly dog surprisingly offered to share toys. Friendship +2.",
  "Kitty was adopted for the day by a nice family. Love +3.",
  "Kitty found a comfortable box to hide in. Security +2."
];

const badOutcomes = [
  "Kitty got chased by a neighborhood dog. Pride -1.",
  "It started to rain and kitty got soaked. Comfort -2.",
  "Kitty got stuck in a tree and needed help. Dignity -3.",
  "Kitty knocked over a trash can making a mess. Stealth -2.",
  "A grumpy homeowner shooed kitty away. Feelings -1.",
  "Kitty's prey escaped at the last moment. Hunting -2.",
  "Kitty stepped in a puddle and got paws wet. Comfort -1.",
  "Kitty got lost and took hours to find home. Energy -3.",
  "Kitty was startled by a loud car horn. Courage -2.",
  "A rival cat challenged kitty's territory. Confidence -1."
];

/* -------------------------------
   CatAnimation Component (Frame-by-Frame)
---------------------------------*/
const CatAnimation = ({ spriteSrc, frames }) => {
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let currentFrame = 0;
    const frameDuration = 100;
    const interval = setInterval(() => {
      currentFrame = (currentFrame + 1) % frames;
      translateX.setValue(-currentFrame * 64);
    }, frameDuration);

    return () => clearInterval(interval);
  }, [frames, translateX]);

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
  progress,
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
  hideConfirm,
  spriteSrc,
  spriteFrames,
  adventureText
}) {
  const popupScale = useRef(new Animated.Value(0.8)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const popupTranslate = useRef(new Animated.Value(50)).current;
  const [showingPopup, setShowingPopup] = useState(false);

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
    <ImageBackground source={require('../asset/background.png')} style={styles.bgImage}>
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
          
          {/* Cat Adventure Text Container - smaller text, full width */}
          <View style={styles.catAnimationContainer}>
            <Text style={styles.adventureText}>{adventureText || "Kitty ventures out..."}</Text>
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
                backgroundColor: toastType === 'correct' ? '#4CAF50' : '#E91E63',
              },
            ]}
          >
            <View style={styles.popupContent}>
              <Text style={styles.popupTitle}>{toastMessage}</Text>
              
              {popupData && (
                <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
                  <View style={styles.cardContainer}>
                    <View style={styles.cardContent}>
                      {popupData.split('\n').map((line, i) => (
                        <Text key={i} style={styles.cardText}>{line.replace(/#/g, '')}</Text>
                      ))}
                    </View>
                  </View>
                </ScrollView>
              )}
              
              <TouchableOpacity onPress={onConfirm} style={styles.popupButton}>
                <Text style={styles.popupButtonText}>{actionButtonText}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>
    </ImageBackground>
  );
}

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
          <Text style={styles.cardResultLabel}>Last Review:</Text>
          <Text style={styles.cardResultValue}>{new Date(card.lastReviewDate).toLocaleString()}</Text>
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
  const [dueCards, setDueCards] = useState([]);
  const [optionalCards, setOptionalCards] = useState([]);
  const [currentActivity, setCurrentActivity] = useState(0);
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
  const [currentCardId, setCurrentCardId] = useState(null);
  const [totalRounds, setTotalRounds] = useState(0);
  const [roundToCardActivityMap, setRoundToCardActivityMap] = useState({});
  const [modifiedCards, setModifiedCards] = useState({});
  const [originalCards, setOriginalCards] = useState({});
  const [adventureText, setAdventureText] = useState(adventureSituations[0]);

  const goodEvents = [
    { message: 'Correct!\nThe sushi chef one block away gave it raw sashimi.\nHunger -2', sprite: require('../asset/RetroCatsPaid/Cats/Sprites/Dance.png'), frames: 4 },
    { message: 'Correct!\nKitty found a sunny spot to nap in the park.\nEnergy +3', sprite: require('../asset/RetroCatsPaid/Cats/Sprites/Happy.png'), frames: 10 },
    { message: 'Correct!\nA kind neighbor gave kitty some treats.\n+2 gold', sprite: require('../asset/RetroCatsPaid/Cats/Sprites/Happy.png'), frames: 10 },
  ];

  const badEvents = [
    { message: 'Wrong!\nKitty got chased by a neighborhood dog.\nPride -1', sprite: require('../asset/RetroCatsPaid/Cats/Sprites/Hurt.png'), frames: 8 },
    { message: 'Wrong!\nKitty got caught in the rain.\nEnergy -2', sprite: require('../asset/RetroCatsPaid/Cats/Sprites/Sleeping.png'), frames: 4 },
  ];

  // Function to update a card's SRS parameters based on results
  const updateCardSRS = (card, correct) => {
    const newCard = { ...card };
    
    if (correct) {
      // All questions for this card were answered correctly
      const lastReviewDate = new Date().toISOString();

      let diffHours = 0

      if (card.nextReviewDate !== card.lastReviewDate) {
        console.log(`this is when they are different: ${diffHours}`)
        diffHours = Math.ceil(
          (new Date(card.nextReviewDate) - new Date(card.lastReviewDate)) / (1000 * 60 * 60)
        )
      } else {
        console.log(`this is when they are the same: ${diffHours}`)
        diffHours = 6
      }
      
      
      // Calculate new interval based on ease factor (default 1.5)
      const nextReviewDate = new Date();
      nextReviewDate.setHours(nextReviewDate.getHours() + diffHours * card.easeFactor)
      
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

  // Function to update optional cards
  const updateOptionalCard = (card, correct) => {
    if (!correct) return card; // No changes if answered incorrectly
    
    const newCard = { ...card };
    const wrongQueue = JSON.parse(card.wrongQueue || "[false,0]");
    
    if (!wrongQueue[0]) { // If not in wrong queue
      if (wrongQueue[1] === 0) {
        newCard.wrongQueue = JSON.stringify([false, 1]);
      } else if (wrongQueue[1] === 1) {
        newCard.wrongQueue = JSON.stringify([false, 2]);
      } else if (wrongQueue[1] === 2) {
        newCard.wrongQueue = JSON.stringify([true, 0]);
      }
    }
    
    // Ensure ease factor is stored as string
    newCard.easeFactor = parseFloat(card.easeFactor || 1.5).toFixed(1);
    
    return newCard;
  };

  useEffect(() => {
    if (deckName && !reviewStarted) {
      try {
        const items = db.getAllSync(`SELECT * FROM ${deckName}`);
        
        // Store all cards
        setAllCards(items);
        
        const now = new Date();
        
        // Regular cards (wrongQueue is false)
        const regularCards = items.filter(c => {
          const wrongQueue = JSON.parse(c.wrongQueue || "[false,0]");
          return !wrongQueue[0] && now >= new Date(c.nextReviewDate);
        });
        
        // Sort by next review date (furthest first)
        regularCards.sort((a, b) => new Date(a.nextReviewDate) - new Date(b.nextReviewDate));
        
        // Wrong queue cards (wrongQueue is true)
        const wrongQueueCards = items.filter(c => {
          const wrongQueue = JSON.parse(c.wrongQueue || "[false,0]");
          return wrongQueue[0];
        });
        
        // Sort by last review date (oldest first)
        wrongQueueCards.sort((a, b) => new Date(a.lastReviewDate) - new Date(b.lastReviewDate));
        
        if (regularCards.length < 3) {
          Alert.alert('Not enough due cards', `Need at least 3, but got ${regularCards.length}.`);
          return;
        }
        
        // Take up to 5 regular cards
        const selectedDueCards = regularCards.slice(0, Math.min(5, regularCards.length));
        
        // Take up to 2 wrong queue cards
        const selectedOptionalCards = wrongQueueCards.slice(0, Math.min(2, wrongQueueCards.length));
        
        // Store original cards for comparison later
        const originals = {};
        [...selectedDueCards, ...selectedOptionalCards].forEach(card => {
          originals[card.id] = { ...card };
        });
        setOriginalCards(originals);
        
        // Calculate total rounds and create round-to-card-activity mapping
        let roundCount = 1;
        const roundMap = {};
        
        // For each regular card, assign 3 activities (0-8)
        selectedDueCards.forEach((card, idx) => {
          // Assign activities based on card index
          const activities = [];
          if (idx === 0) activities.push(0, 1, 2);
          else if (idx === 1) activities.push(3, 4, 5);
          else if (idx === 2) activities.push(6, 7, 8);
          else if (idx === 3) activities.push(0, 3, 6); // Additional cards use activities again
          else if (idx === 4) activities.push(1, 4, 7);
          
          // Map each activity to a round
          activities.forEach(activity => {
            roundMap[roundCount] = { cardId: card.id, activity, isOptional: false };
            roundCount++;
          });
        });
        
        // For optional cards, assign 1 activity each
        selectedOptionalCards.forEach((card, idx) => {
          const activity = idx === 0 ? 0 : 1; // First uses activity 0, second uses activity 1
          roundMap[roundCount] = { cardId: card.id, activity, isOptional: true };
          roundCount++;
        });
        
        setDueCards(selectedDueCards);
        setOptionalCards(selectedOptionalCards);
        setRoundToCardActivityMap(roundMap);
        setTotalRounds(roundCount - 1);
        
        setReviewStarted(true);
      } catch (e) {
        console.error(e);
        Alert.alert('Error', `Could not load deck ${deckName}`);
      }
    }
  }, [deckName, reviewStarted]);

  // Determine current card and activity based on round
  useEffect(() => {
    if (reviewStarted && roundToCardActivityMap[currentRound]) {
      const { cardId, activity, isOptional } = roundToCardActivityMap[currentRound];
      setCurrentCardId(cardId);
      setCurrentActivity(activity);
    }
  }, [currentRound, reviewStarted, roundToCardActivityMap]);
  
  // Auto-continue effect when answer is locked
  useEffect(() => {
    if (isAnswerLocked && !showResult) {
      handleContinue();
    }
  }, [isAnswerLocked, showResult]);

  const handleRoundComplete = () => {
    // Check if we've reached the end of all rounds
    if (currentRound >= totalRounds) {
      // Prepare evaluation data
      const newModifiedCards = { ...modifiedCards };
      
      // Process regular cards
      dueCards.forEach(card => {
        const cardId = card.id;
        const results = Object.entries(cardResults)
          .filter(([round, result]) => roundToCardActivityMap[parseInt(round)]?.cardId === cardId)
          .map(([_, result]) => result);
        
        const allCorrect = results.length > 0 && results.every(r => r);
        
        if (!newModifiedCards[cardId]) {
          newModifiedCards[cardId] = { ...card };
        }
        
        newModifiedCards[cardId] = updateCardSRS(newModifiedCards[cardId], allCorrect);
      });
      
      // Process optional cards
      optionalCards.forEach(card => {
        const cardId = card.id;
        const results = Object.entries(cardResults)
          .filter(([round, result]) => roundToCardActivityMap[parseInt(round)]?.cardId === cardId)
          .map(([_, result]) => result);
        
        const allCorrect = results.length > 0 && results.every(r => r);
        
        if (!newModifiedCards[cardId]) {
          newModifiedCards[cardId] = { ...card };
        }
        
        newModifiedCards[cardId] = updateOptionalCard(newModifiedCards[cardId], allCorrect);
      });
      
      setModifiedCards(newModifiedCards);
      setShowEvaluation(true);
    } else {
      // Move to next round and update adventure text
      setCurrentRound(r => r + 1);
      // Set a new random adventure text from the array
      const nextIndex = Math.floor(Math.random() * adventureSituations.length);
      setAdventureText(adventureSituations[nextIndex]);
    }
  };

  const handleSkip = () => {
    // Mark the current round as wrong if skipped
    if (currentRound) {
      const newResults = { ...cardResults };
      newResults[currentRound] = false; // Count as wrong answer
      setCardResults(newResults);
    }
    
    // Reduce lives and proceed to next round
    setLives(l => l - 1);
    handleRoundComplete();
  };
  
  const handleAnswer = (isCorrect, popupObj) => {
    setIsCorrectAnswer(isCorrect);
    setPopupData(popupObj);
    setIsAnswerLocked(true);
    
    // Record the result for this round
    const newResults = { ...cardResults };
    newResults[currentRound] = isCorrect;
    setCardResults(newResults);
  };

  const handleContinue = () => {
    if (showResult) {
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
      const animation = catAnimations.getRandomAnimationWithMessage(correct);
      
      // Update adventure text based on correct/incorrect answer
      if (correct) {
        const goodIndex = Math.floor(Math.random() * goodOutcomes.length);
        const goodEvent = goodEvents[Math.floor(Math.random() * goodEvents.length)];
        setAdventureText(goodOutcomes[goodIndex]);
        setToastType('correct');
        setToastMessage('Correct!'); // Simplified message
        setCurrentSprite(goodEvent.sprite);
        setCurrentFrames(goodEvent.frames);
      } else {
        const badIndex = Math.floor(Math.random() * badOutcomes.length);
        const badEvent = badEvents[Math.floor(Math.random() * badEvents.length)];
        setAdventureText(badOutcomes[badIndex]);
        setToastType('wrong');
        setToastMessage('Wrong!'); // Simplified message
        setCurrentSprite(badEvent.sprite);
        setCurrentFrames(badEvent.frames);
      }
      
      setShowResult(true);
      
      if (correct) setGold(g => g + 10);
      else setLives(l => l - 1);
      setProgress(p => Math.min(p + 100 / totalRounds, 100));
    }
  };

  const handleRestart = () => {
    setShowEvaluation(false);
    setCurrentRound(1);
    setCurrentActivity(0);
    setGold(0);
    setLives(3);
    setCardResults({});
    setProgress(0);
    setModifiedCards({});
  };

  const getCurrentCard = () => {
    if (!currentCardId) return null;
    
    // Check in regular cards first
    const regularCard = dueCards.find(c => c.id === currentCardId);
    if (regularCard) return regularCard;
    
    // Then check in optional cards
    return optionalCards.find(c => c.id === currentCardId);
  };

  // Show evaluation page
  if (showEvaluation) {
    return (
      <ImageBackground source={require('../asset/background.png')} style={styles.bgImage}>
        <View style={styles.container}>
          <View style={styles.evaluationHeader}>
            <Text style={styles.evaluationTitle}>Review Completed!</Text>
            <Text style={styles.evaluationSubtitle}>Final Score: {gold} Gold</Text>
          </View>
          
          <ScrollView style={styles.evaluationScroll}>
            <View style={styles.evaluationContent}>
              {/* Regular Cards Results */}
              <Text style={styles.evaluationSectionTitle}>Main Cards</Text>
              {dueCards.map(card => {
                const cardId = card.id;
                const results = Object.entries(cardResults)
                  .filter(([round, result]) => roundToCardActivityMap[parseInt(round)]?.cardId === cardId)
                  .map(([_, result]) => result);
                return (
                  <CardResult 
                    key={cardId}
                    card={modifiedCards[cardId] || card}
                    results={results}
                    originalCard={originalCards[cardId] || card}
                  />
                );
              })}
              
              {/* Optional Cards Results */}
              {optionalCards.length > 0 && (
                <>
                  <Text style={styles.evaluationSectionTitle}>Optional Cards</Text>
                  {optionalCards.map(card => {
                    const cardId = card.id;
                    const results = Object.entries(cardResults)
                      .filter(([round, result]) => roundToCardActivityMap[parseInt(round)]?.cardId === cardId)
                      .map(([_, result]) => result);
                    return (
                      <CardResult 
                        key={cardId}
                        card={modifiedCards[cardId] || card}
                        results={results}
                        originalCard={originalCards[cardId] || card}
                      />
                    );
                  })}
                </>
              )}
            </View>
          </ScrollView>
          
          <View style={styles.evaluationButtons}>
            <TouchableOpacity style={styles.evaluationButton} onPress={handleRestart}>
              <Text style={styles.evaluationButtonText}>Restart Review</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.evaluationButton} onPress={() => router.back()}>
              <Text style={styles.evaluationButtonText}>Back to Deck</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    );
  }

  const currentCard = getCurrentCard();

  return (
    <ImageBackground source={require('../asset/background.png')} style={styles.bgImage}>
      <GameTemplate
        progress={progress}
        onConfirm={handleContinue}
        onSkip={handleSkip}
        onBack={() => router.back()}
        toastMessage={toastMessage}
        toastType={toastType}
        popupData={popupData}
        actionButtonText={'Continue'}
        lives={lives}
        currentRound={currentRound}
        totalRounds={totalRounds}
        gold={gold}
        hideConfirm={!showResult}
        spriteSrc={currentSprite}
        spriteFrames={currentFrames}
        adventureText={adventureText}
      >
        {currentCard && !showResult && (
          <>
            {currentActivity === 8 && (
              <SentencePairOrNotPair 
                key={`${currentCardId}-${currentActivity}-${currentRound}`} 
                dueCards={[currentCard, ...dueCards.filter(c => c.id !== currentCardId)]} 
                onAnswer={handleAnswer} 
                showResult={showResult} 
              />
            )}
            {currentActivity === 7 && (
              <TrueOrFalse 
                key={`${currentCardId}-${currentActivity}-${currentRound}`} 
                dueCards={[currentCard, ...dueCards.filter(c => c.id !== currentCardId)]} 
                onAnswer={handleAnswer} 
                showResult={showResult} 
              />
            )}
            {currentActivity === 6 && (
              <ListenWrite 
                key={`${currentCardId}-${currentActivity}-${currentRound}`} 
                dueCards={[currentCard, ...dueCards.filter(c => c.id !== currentCardId)]} 
                onAnswer={handleAnswer} 
                showResult={showResult} 
              />
            )}
            {currentActivity === 5 && (
              <ListenResponse 
                key={`${currentCardId}-${currentActivity}-${currentRound}`} 
                dueCards={[currentCard, ...dueCards.filter(c => c.id !== currentCardId)]} 
                onAnswer={handleAnswer} 
                showResult={showResult} 
              />
            )}
            {currentActivity === 4 && (
              <SpinWheel 
                key={`${currentCardId}-${currentActivity}-${currentRound}`} 
                dueCards={[currentCard, ...dueCards.filter(c => c.id !== currentCardId)]} 
                onAnswer={handleAnswer} 
                showResult={showResult} 
              />
            )}
            {currentActivity === 3 && (
              <PairOrNotPair 
                key={`${currentCardId}-${currentActivity}-${currentRound}`} 
                dueCards={[currentCard, ...dueCards.filter(c => c.id !== currentCardId)]} 
                onAnswer={handleAnswer} 
                showResult={showResult} 
              />
            )}
            {currentActivity === 2 && (
              <MemoryGame 
                key={`${currentCardId}-${currentActivity}-${currentRound}`} 
                dueCards={[currentCard, ...dueCards.filter(c => c.id !== currentCardId)]} 
                onAnswer={handleAnswer} 
                showResult={showResult} 
              />
            )}
            {currentActivity === 1 && (
              <Hangman 
                key={`${currentCardId}-${currentActivity}-${currentRound}`} 
                dueCards={[currentCard, ...dueCards.filter(c => c.id !== currentCardId)]} 
                onAnswer={handleAnswer} 
                showResult={showResult} 
              />
            )}
            {currentActivity === 0 && (
              <PhoneticChoice 
                key={`${currentCardId}-${currentActivity}-${currentRound}`} 
                dueCards={[currentCard, ...dueCards.filter(c => c.id !== currentCardId)]} 
                onAnswer={handleAnswer} 
                showResult={showResult} 
              />
            )}
          </>
        )}
      </GameTemplate>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: { 
    flex: 1 
  },
  
  container: { 
    flex: 1, 
    paddingTop: 30 
  },
  
  // Updated navbar styles
  navBar: { 
    flexDirection: 'column', 
    justifyContent: 'flex-start', 
    padding: 15, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    marginHorizontal: 10, 
    borderRadius: 10, 
    marginTop: 10,
  },
  
  catAnimationContainer: {
    width: '100%',
    height: 60,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 8,
    marginTop: 5,
  },
  
  adventureText: {
    fontFamily: 'PressStart2P',
    fontSize: 10,
    color: 'white',
    textAlign: 'center',
    lineHeight: 16,
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
    fontFamily: 'PressStart2P', 
    fontSize: 14, 
    color: 'white'
  },
  
  statLabel: {
    fontFamily: 'PressStart2P',
    fontSize: 10,
    color: 'white',
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
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden'
  },
  
  progressBar: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4
  },
  
  contentArea: { 
    flex: 1, 
    width: '100%', 
    padding: 20, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  
  navButton: { 
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    marginHorizontal: 5,
    flex: 1,
    alignItems: 'center',
  },
  
  navButtonText: { 
    color: 'white', 
    fontSize: 14, 
    fontFamily: 'PressStart2P' 
  },
  
  popupContainer: { 
    position: 'absolute',
    top: 230, // Add more gap below the nav bar
    bottom: 20, // Stretch all the way down to near the bottom
    alignSelf: 'center',
    zIndex: 999,
    backgroundColor: '#4CAF50', 
    borderRadius: 10, 
    padding: 15, 
    marginHorizontal: 10, // Match nav bar margins
    width: width - 20, // Match nav bar width (screen width - margins)
  },
  
  popupContent: { 
    alignItems: 'center', 
    justifyContent: 'space-between',
    width: '100%',
    flex: 1,
  },
  
  scrollContainer: { 
    width: '100%',
    flex: 1,
    marginVertical: 10,
  },
  
  scrollContent: { 
    paddingVertical: 5,
    alignItems: 'center',
  },
  
  cardContainer: { 
    width: '100%', 
    alignItems: 'center', 
    marginVertical: 5 
  },
  
  cardContent: { 
    backgroundColor: 'rgba(255,255,255,0.9)', 
    borderRadius: 10, 
    padding: 10, 
    width: '100%' 
  },
  
  cardText: { 
    fontFamily: 'System',
    fontSize: 16, 
    color: '#333', 
    marginVertical: 2,
    textAlign: 'center',
  },
  
  popupButton: { 
    backgroundColor: 'rgba(0,0,0,0.2)', 
    borderRadius: 10, 
    paddingVertical: 10, 
    paddingHorizontal: 20, 
    marginTop: 15, 
    width: '100%'
  },
  
  popupButtonText: { 
    fontFamily: 'PressStart2P', 
    fontSize: 18, 
    color: 'white', 
    textAlign: 'center' 
  },
  
  popupTitle: { 
    fontFamily: 'PressStart2P', 
    fontSize: 20, 
    color: 'white', 
    textAlign: 'center', 
    marginBottom: 15 
  },
  
  // Evaluation screen styles
  evaluationHeader: { 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 15,
    margin: 10,
    marginTop: 50 
  },
  
  evaluationTitle: { 
    fontFamily: 'PressStart2P', 
    fontSize: 24, 
    color: 'white', 
    marginBottom: 10 
  },
  
  evaluationSubtitle: { 
    fontFamily: 'PressStart2P', 
    fontSize: 18, 
    color: '#FFD700' 
  },
  
  evaluationScroll: { 
    flex: 1 
  },
  
  evaluationContent: { 
    padding: 10 
  },
  
  evaluationSectionTitle: { 
    fontFamily: 'PressStart2P', 
    fontSize: 18, 
    color: 'white', 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    padding: 10, 
    borderRadius: 10, 
    marginVertical: 10 
  },
  
  cardResultContainer: { 
    backgroundColor: 'rgba(255,255,255,0.9)', 
    borderRadius: 15, 
    padding: 15, 
    marginBottom: 15 
  },
  
  cardResultTitle: { 
    fontSize: 16, 
    fontWeight: 'bold',
    color: '#333', 
    marginBottom: 10 
  },
  
  cardResultContent: { 
    backgroundColor: '#f5f5f5', 
    borderRadius: 10, 
    padding: 10 
  },
  
  cardResultRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginVertical: 5 
  },
  
  cardResultLabel: { 
    fontSize: 12, 
    color: '#666' 
  },
  
  cardResultValue: { 
    fontSize: 12, 
    color: '#333' 
  },
  
  evaluationButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 20 
  },
  
  evaluationButton: { 
    backgroundColor: '#FF8C00', 
    borderRadius: 20, 
    padding: 15, 
    flex: 1, 
    marginHorizontal: 5 
  },
  
  evaluationButtonText: { 
    fontFamily: 'PressStart2P', 
    fontSize: 14, 
    color: 'white', 
    textAlign: 'center' 
  },
});