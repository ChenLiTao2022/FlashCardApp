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

const db = SQLite.openDatabaseSync('mydb.db');
const { width, height } = Dimensions.get('window');

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
}) {
  const popupScale = useRef(new Animated.Value(0.8)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const popupTranslate = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (toastMessage) {
      Animated.parallel([
        Animated.timing(popupScale, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(popupOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(popupTranslate, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      popupOpacity.setValue(0);
      popupScale.setValue(0.8);
      popupTranslate.setValue(50);
    }
  }, [toastMessage]);

  return (
    <ImageBackground source={require('../asset/background.png')} style={styles.bgImage}>
      <View style={styles.container}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={onBack} style={styles.navButton}>
            <Text style={styles.navButtonText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSkip} style={styles.navButton}>
            <Text style={styles.navButtonText}>Skip →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Lives</Text>
            <Text style={styles.statValue}>{lives}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Round</Text>
            <Text style={styles.statValue}>{currentRound}/{totalRounds}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Gold</Text>
            <Text style={styles.statValue}>{gold}</Text>
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
              {spriteSrc && <CatAnimation spriteSrc={spriteSrc} frames={spriteFrames} />}

              <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.popupTitle}>{toastMessage}</Text>
                {popupData && (
                  <View style={styles.cardContainer}>
                    <View style={styles.cardContent}>
                      {popupData.split('\n').map((line, i) => (
                        <Text key={i} style={styles.cardText}>{line}</Text>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>

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
          <Text style={styles.cardResultValue}>{new Date(card.lastReviewDate).toLocaleDateString()}</Text>
        </View>
        <View style={styles.cardResultRow}>
          <Text style={styles.cardResultLabel}>Next Review:</Text>
          <Text style={styles.cardResultValue}>{new Date(card.nextReviewDate).toLocaleDateString()}</Text>
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

  const goodEvents = [
    { message: 'Correct!\n Found grilled fish\nHunger -3', sprite: require('../asset/RetroCatsPaid/Cats/Sprites/Dance.png'), frames: 4 },
    { message: 'Correct!\n Got head pats\n+2 gold', sprite: require('../asset/RetroCatsPaid/Cats/Sprites/Happy.png'), frames: 10 },
  ];

  const badEvents = [
    { message: '😾 Wrong!\n Got chased away\nPride -1', sprite: require('../asset/RetroCatsPaid/Cats/Sprites/Hurt.png'), frames: 8 },
    { message: '😾 Wrong!\n Caught in rain\nEnergy -2', sprite: require('../asset/RetroCatsPaid/Cats/Sprites/Sleeping.png'), frames: 4 },
  ];

  // Function to update a card's SRS parameters based on results
  const updateCardSRS = (card, correct) => {
    const newCard = { ...card };
    
    if (correct) {
      // All questions for this card were answered correctly
      const lastReviewDate = new Date().toISOString();
      const diffDays = Math.ceil(
        (new Date(card.nextReviewDate) - new Date(card.lastReviewDate)) / (1000 * 60 * 60 * 24)
      );
      
      // Calculate new interval based on ease factor (default 1.5)
      const newDiffDays = Math.max(1, Math.round(diffDays * parseFloat(card.easeFactor || 1.5)));
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + newDiffDays);
      
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
      // Move to next round
      setCurrentRound(r => r + 1);
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
      const event = (correct ? goodEvents : badEvents)[Math.floor(Math.random() * (correct ? goodEvents.length : badEvents.length))];
      setToastType(correct ? 'correct' : 'wrong');
      setToastMessage(event.message);
      setCurrentSprite(event.sprite);
      setCurrentFrames(event.frames);
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
  bgImage: { flex: 1 },
  container: { flex: 1, paddingTop: 30 },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: 'rgba(0,0,0,0.6)', marginHorizontal: 10, borderRadius: 10, marginTop: 10 },
  navButton: { padding: 10 },
  navButtonText: { color: 'white', fontSize: 16, fontFamily: 'PressStart2P' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, marginVertical: 5 },
  statBox: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 15, padding: 10, alignItems: 'center', marginHorizontal: 4, minWidth: 90, elevation: 3 },
  statLabel: { fontFamily: 'PressStart2P', fontSize: 10, color: '#333', marginBottom: 3 },
  statValue: { fontFamily: 'PressStart2P', fontSize: 14, color: '#333' },
  contentArea: { flex: 1, width: '100%', padding: 20, alignItems: 'center', justifyContent: 'center' },
  confirmButton: { backgroundColor: '#FF8C00', borderRadius: 25, paddingVertical: 15, marginHorizontal: 20, elevation: 8 },
  confirmButtonText: { fontFamily: 'PressStart2P', fontSize: 20, color: 'white', textAlign: 'center' },
  popupContainer: { 
    position: 'absolute',
    top: height * 0.22,
    left: 20,
    right: 20,
    zIndex: 999,
    backgroundColor: '#4CAF50', borderRadius: 20, padding: 20, margin: 20, maxHeight: height * 0.6 
  },
  popupContent: { alignItems: 'center', justifyContent: 'space-between', flex: 1 },
  scrollContainer: { width: '100%', maxHeight: height * 0.4 },
  scrollContent: { paddingVertical: 10 },
  cardContainer: { width: '100%', alignItems: 'center', marginVertical: 10 },
  cardContent: { backgroundColor: 'white', borderRadius: 10, padding: 10, width: '100%' },
  cardText: { fontFamily: 'PressStart2P', fontSize: 14, color: '#333', marginVertical: 2 },
  popupButton: { backgroundColor: '#4CAF50', borderRadius: 25, paddingVertical: 12, paddingHorizontal: 30, marginTop: 15, elevation: 5, alignSelf: 'stretch' },
  popupButtonText: { fontFamily: 'PressStart2P', fontSize: 18, color: 'white', textAlign: 'center' },
  popupTitle: { fontFamily: 'PressStart2P', fontSize: 16, color: 'white', textAlign: 'center', marginBottom: 15 },
  
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
    flex: 1, 
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
  }
});