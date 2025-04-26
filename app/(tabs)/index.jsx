import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  Alert
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import * as Font from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CatSection, {
  ChestSlot,
  ChestAnimationScreen,
  ChestUnlockConfirmation
} from './CatSection';
import BottomTabBar from '../components/BottomTabBar';
import { 
  loadMoney, 
  saveMoney, 
  loadDailyStreak, 
  loadDiamonds,
  savePlayerData
} from '../helpers/StorageHelper';

const db = SQLite.openDatabaseSync('mydb.db');

// for Chests.png, in total 4 chests, each one two rows, 5 frames per row 
// width = 240 / 5 = 48 
// height = 256 /8 = 32

// ----------------------------
// Main IndexPage Component
// ----------------------------
export default function IndexPage({ navigation }) {
  const [fontLoaded, setFontLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFurnitureMode, setIsFurnitureMode] = useState(false);
  
  // Add state for tracking whether we're in home mode (showing review/chests) or deco/feed mode
  const [isHomeMode, setIsHomeMode] = useState(true);
  
  // Add state for player data
  const [money, setMoney] = useState(10000);
  const [diamonds, setDiamonds] = useState(100);
  const [dailyStreak, setDailyStreak] = useState(0);
  
  // Add state for chest animation and unlock confirmation
  const [showChestAnimation, setShowChestAnimation] = useState(false);
  const [showUnlockConfirmation, setShowUnlockConfirmation] = useState(false);
  const [selectedChestIndex, setSelectedChestIndex] = useState(0);
  
  // Add state to track chest timers and availability
  const [chestTimers, setChestTimers] = useState([
    { total: 3, remaining: null, chestType: 0, unlockable: true },    // First chest: 3 seconds (unlockable)
    { total: 120, remaining: null, chestType: 1, unlockable: true },   // Second chest: 10 seconds (unlockable)
    { total: 1800, remaining: null, chestType: 2, unlockable: true },   // Third chest: 15 seconds (unlockable)
    { total: 4800, remaining: null, chestType: 3, unlockable: true }   // Fourth chest: 2 minutes (unlockable)
  ]);

  // Add this useEffect for font loading and initial loading screen
  useEffect(() => {
    const loadFont = async () => {
      await Font.loadAsync({
        'PressStart2P': require('../../assets/fonts/PressStart2P-Regular.ttf'),
      });
      setFontLoaded(true);
    };
    
    loadFont();
    
    // Load player data from AsyncStorage
    const loadPlayerData = async () => {
      try {
        // Load money, diamonds, and daily streak from consolidated storage
        const [moneyValue, diamondsValue, streakValue] = await Promise.all([
          loadMoney(),
          loadDiamonds(),
          loadDailyStreak()
        ]);
        
        setMoney(moneyValue);
        setDiamonds(diamondsValue);
        setDailyStreak(streakValue);
      } catch (error) {
        console.error('Error loading player data:', error);
      }
    };
    
    loadPlayerData();
    
    // Display loading screen for 2 seconds
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  // Add a useEffect for countdown timers
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setChestTimers(prevTimers => {
        const newTimers = [...prevTimers];
        let hasUpdates = false;
        
        for (let i = 0; i < newTimers.length; i++) {
          if (newTimers[i].remaining > 0) {
            newTimers[i].remaining -= 1;
            hasUpdates = true;
          }
        }
        
        return hasUpdates ? newTimers : prevTimers;
      });
    }, 1000);
    
    return () => clearInterval(timerInterval);
  }, []);

  // Add a useEffect to load chest timers from AsyncStorage on component mount
  useEffect(() => {
    const loadChestTimers = async () => {
      try {
        const savedTimersString = await AsyncStorage.getItem('chestTimers');
        if (savedTimersString) {
          const savedTimers = JSON.parse(savedTimersString);
          
          // Calculate remaining time for each active timer
          const updatedTimers = [...chestTimers].map((timer, index) => {
            if (savedTimers[index] && savedTimers[index].startTime) {
              const startTime = savedTimers[index].startTime;
              const totalTime = savedTimers[index].total;
              const chestType = savedTimers[index].chestType;
              const unlockable = savedTimers[index].unlockable;
              
              // Calculate elapsed time in seconds
              const now = Date.now();
              const elapsedSeconds = Math.floor((now - startTime) / 1000);
              
              // Calculate remaining time
              const remaining = Math.max(0, totalTime - elapsedSeconds);
              
              // If timer has completed, set remaining to 0
              if (remaining === 0) {
                return {
                  ...timer,
                  remaining: 0,
                  total: totalTime,
                  chestType: chestType,
                  unlockable: unlockable
                };
              } else {
                return {
                  ...timer,
                  remaining: remaining,
                  total: totalTime,
                  chestType: chestType,
                  unlockable: unlockable
                };
              }
            }
            return timer;
          });
          
          setChestTimers(updatedTimers);
        }
      } catch (error) {
        console.error("Error loading chest timers:", error);
      }
    };
    
    loadChestTimers();
  }, []);
  
  // Save chest timers to AsyncStorage whenever they change
  useEffect(() => {
    const saveChestTimers = async () => {
      try {
        // Create a saveable version of the timers that includes startTime
        const timersToSave = chestTimers.map(timer => {
          // Only include startTime for timers that are running
          if (timer.remaining !== null && timer.remaining > 0) {
            // Calculate the startTime based on remaining time
            const now = Date.now();
            const startTime = now - ((timer.total - timer.remaining) * 1000);
            
            return {
              ...timer,
              startTime
            };
          } else if (timer.remaining === 0) {
            // For completed timers
            return {
              ...timer,
              startTime: Date.now() - (timer.total * 1000) // Timer is done
            };
          }
          
          // For unlockable or null timers
          return {
            ...timer,
            startTime: null
          };
        });
        
        await AsyncStorage.setItem('chestTimers', JSON.stringify(timersToSave));
      } catch (error) {
        console.error("Error saving chest timers:", error);
      }
    };
    
    saveChestTimers();
  }, [chestTimers]);

  // Save money to player data in AsyncStorage whenever it changes
  useEffect(() => {
    const updateMoney = async () => {
      try {
        await saveMoney(money);
      } catch (error) {
        console.error('Error saving money:', error);
      }
    };
    
    updateMoney();
  }, [money]);

  // Handler for chest clicks
  const handleChestClick = (chestIndex, chestState) => {
    if (chestState === 'ready') {
      // Chest is ready to open (timer reached 0)
      setSelectedChestIndex(chestIndex);
      setShowChestAnimation(true);
    } else if (chestState === 'unlockable') {
      // Chest is unlockable, show confirmation
      setSelectedChestIndex(chestIndex);
      setShowUnlockConfirmation(true);
    } else {
      // Chest is locked (timer running)
      console.log(`Chest ${chestIndex} not ready yet. ${chestTimers[chestIndex].remaining}s remaining.`);
    }
  };
  
  // Modify handleUnlockConfirm to use Date.now() as startTime
  const handleUnlockConfirm = (chestIndex) => {
    // Check how many chests are currently unlocked (timer running or ready to open)
    const activeChests = chestTimers.filter(timer => 
      (timer.remaining !== null && !timer.unlockable) || timer.remaining === 0
    ).length;
    
    // Only allow unlocking if there are fewer than 2 active chests
    if (activeChests < 2) {
      // Start the timer for the chest
      setChestTimers(prevTimers => {
        const newTimers = [...prevTimers];
        newTimers[chestIndex] = {
          ...newTimers[chestIndex],
          remaining: newTimers[chestIndex].total,
          unlockable: false,
          startTime: Date.now() // Add the start time
        };
        return newTimers;
      });
    } else {
      // Show alert that maximum number of chests are already unlocked
      Alert.alert(
        "Maximum Chests Unlocked",
        "You can only have 2 chests unlocked at a time. Wait for a chest to be ready or open a ready chest.",
        [{ text: "OK" }]
      );
    }
    
    // Hide the confirmation dialog
    setShowUnlockConfirmation(false);
  };
  
  // Handle canceling chest unlock
  const handleUnlockCancel = () => {
    setShowUnlockConfirmation(false);
  };
  
  // Format time display for chest countdown
  const formatChestTime = (seconds) => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      if (remainingSeconds === 0) {
        return `${minutes}m`;
      } else {
        return `${minutes}m ${remainingSeconds}s`;
      }
    }
  };
  
  // Handler for when chest animation completes
  const handleChestAnimationComplete = async (rewards, chestIndex, shouldEmpty) => {
    // Clean up the chest animation state
    if (shouldEmpty) {
      setShowChestAnimation(false);
      setChestTimers(prevTimers => {
        const newTimers = [...prevTimers];
        newTimers[chestIndex] = {
          ...newTimers[chestIndex],
          remaining: null,
          unlockable: false
        };
        return newTimers;
      });
    } else {
      setShowChestAnimation(false);
      setChestTimers(prevTimers => {
        const newTimers = [...prevTimers];
        newTimers[chestIndex] = {
          ...newTimers[chestIndex],
          remaining: null,
          unlockable: true
        };
        return newTimers;
      });
    }

    if (rewards) {
      // Add food rewards to AsyncStorage
      const foodRewards = rewards.food || [];
      
      if (foodRewards.length > 0) {
        try {
          const pendingFoodRewardsStr = await AsyncStorage.getItem('pendingFoodRewards');
          let pendingFoodRewards = [];
          
          if (pendingFoodRewardsStr) {
            pendingFoodRewards = JSON.parse(pendingFoodRewardsStr);
          }
          
          // Add new food rewards to pending list
          pendingFoodRewards = [...pendingFoodRewards, ...foodRewards];
          await AsyncStorage.setItem('pendingFoodRewards', JSON.stringify(pendingFoodRewards));
        } catch (error) {
          console.error('Error updating pending food rewards:', error);
        }
      }
      
      // Update money in state and consolidated storage
      if (rewards.gold) {
        try {
          // Add the gold reward
          const updatedMoney = money + rewards.gold;
          
          // Update the state so UI reflects change immediately
          setMoney(updatedMoney);
          
          // Save the updated amount
          await saveMoney(updatedMoney);
        } catch (error) {
          console.error('Error updating money:', error);
        }
      }
    }
  };

  // New state variables for study mode and deck selection.
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [decks, setDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState(null);

  const router = useRouter();

  // Updated handleStudy function:
  // If in study mode and a deck is selected, pass the deckName to the Review screen.
  const handleStudy = async () => {
    if (isStudyMode && selectedDeck) {
      // Count how many chest slots are occupied (not null and not 0)
      const occupiedChests = chestTimers.filter(timer => timer.remaining !== null).length;
      
      // Store the current state of chest slots
      await AsyncStorage.setItem('occupiedChestsCount', occupiedChests.toString());
      
      router.push({
        pathname: '/Review',
        params: { deckName: selectedDeck.name }
      });
    } else {
      try {
        const results = db.getAllSync(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `);
        setDecks(results);
        setIsStudyMode(true);
      } catch (error) {
        console.error("Error retrieving deck list:", error);
      }
    }
  };

  // Handle furniture mode changes from CatSection
  const handleFurnitureModeChange = (isActive) => {
    setIsFurnitureMode(isActive);
    
    // When furniture mode is active, we're not in home mode
    if (isActive) {
      setIsHomeMode(false);
    }
  };

  // Add handler for mode changes from CatSection
  const handleModeChange = (isHome) => {
    setIsHomeMode(isHome);
  };

  // Handle adding a new chest when returning from review
  useFocusEffect(
    React.useCallback(() => {
      const checkForNewChest = async () => {
        try {
          // Check if there's a flag for a new chest in AsyncStorage
          const newChestFlag = await AsyncStorage.getItem('addNewChest');
          
          if (newChestFlag === 'true') {
            // Get the chest index that was awarded
            const chestIndexStr = await AsyncStorage.getItem('newChestIndex');
            const chestIndex = parseInt(chestIndexStr || '0');
            
            // Find the first empty chest slot
            const emptySlotIndex = chestTimers.findIndex(timer => timer.remaining === null && !timer.unlockable);
            
            if (emptySlotIndex !== -1) {
              // Map chest types to their correct durations
              const chestDurations = [3, 120, 1800, 4800]; // 3s, 10s, 15s, 2min based on original setup
              
              // Add the new chest to this slot but make it unlockable
              setChestTimers(prevTimers => {
                const newTimers = [...prevTimers];
                newTimers[emptySlotIndex] = {
                  total: chestDurations[chestIndex], // Use the correct duration based on chest type
                  remaining: null, // Not started yet
                  chestType: chestIndex, // Store which type of chest this is
                  unlockable: true // Make it unlockable
                };
                return newTimers;
              });
            }
            
            // Clear the flags
            await AsyncStorage.removeItem('addNewChest');
            await AsyncStorage.removeItem('newChestIndex');
          }
        } catch (error) {
          console.error("Error checking for new chest:", error);
        }
      };
      
      checkForNewChest();
      
      return () => {};
    }, [chestTimers])
  );



  if (!fontLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' }}>
        <Text style={{ color: 'white' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ImageBackground source={require('../asset/background.png')} style={styles.bgImage}>
      <View style={styles.container}>
        {/* Display study mode UI or CatSection */}
        {isStudyMode ? (
          <View style={styles.studyModeContainer}>
            <View style={styles.statusContainer}>
              <Text style={styles.selectDeckText}>Select A Deck</Text>
            </View>
            
            <ScrollView 
              horizontal 
              style={styles.deckListContainer}
              contentContainerStyle={styles.deckListContent}
            >
              {decks.map((deck, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.deckButton,
                    selectedDeck?.name === deck.name && styles.selectedDeckButton
                  ]}
                  onPress={() => {
                    const items = db.getAllSync(`SELECT * FROM ${deck.name}`);
                    const now = new Date();
                    const due = items.filter(card => now >= new Date(card.nextReviewDate));
                    setSelectedDeck({
                      name: deck.name,
                      totalCards: items.length,
                      dueCount: due.length,
                    });
                  }}
                >
                  <Text style={styles.deckButtonText}>{deck.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.deckInfoContainer}>
              {selectedDeck ? (
                <>
                  <Text style={styles.deckInfoTitle}>{selectedDeck.name}</Text>
                  <Text style={styles.deckInfoText}>Total Cards: {selectedDeck.totalCards}</Text>
                  <Text style={styles.deckInfoText}>Due Cards: {selectedDeck.dueCount}</Text>
                </>
              ) : (
                <Text style={styles.selectDeckPrompt}>Select a deck to begin</Text>
              )}
            </View>
          </View>
        ) : (
          <CatSection 
            onFurnitureModeChange={handleFurnitureModeChange} 
            onModeChange={handleModeChange}
            money={money}
            setMoney={setMoney}
            diamonds={diamonds}
            dailyStreak={dailyStreak}
          />
        )}

        {/* --- Study Navigation Buttons --- */}
        {(isHomeMode && !isFurnitureMode) || isStudyMode ? (
          <View style={styles.studyNavContainer}>
            <TouchableOpacity 
              style={[
                styles.studyButton, 
                isStudyMode && { backgroundColor: '#4CAF50' }
              ]} 
              onPress={handleStudy}
            >
              <Text style={styles.studyButtonText}>
                {isStudyMode ? 'START' : 'Review Flashcards'}
              </Text>
            </TouchableOpacity>
            {isStudyMode && (
              <TouchableOpacity style={styles.backButton} onPress={() => {
                setIsStudyMode(false);
                setSelectedDeck(null);
                setDecks([]);
              }}>
                <Text style={styles.backButtonText}>BACK</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* --- Chest Slots Row --- */}
        {(isHomeMode && !isFurnitureMode) ? (
          <View style={styles.chestSlotRow}>
            <ChestSlot 
              chestIndex={0} 
              onChestClick={handleChestClick} 
              timeRemaining={chestTimers[0].remaining}
              chestType={chestTimers[0].chestType || 0}
              unlockable={chestTimers[0].unlockable}
            />
            <ChestSlot 
              chestIndex={1} 
              onChestClick={handleChestClick} 
              timeRemaining={chestTimers[1].remaining}
              chestType={chestTimers[1].chestType || 1}
              unlockable={chestTimers[1].unlockable}
            />
            <ChestSlot 
              chestIndex={2} 
              onChestClick={handleChestClick} 
              timeRemaining={chestTimers[2].remaining}
              chestType={chestTimers[2].chestType || 2}
              unlockable={chestTimers[2].unlockable}
            />
            <ChestSlot 
              chestIndex={3} 
              onChestClick={handleChestClick} 
              timeRemaining={chestTimers[3].remaining}
              chestType={chestTimers[3].chestType || 3}
              unlockable={chestTimers[3].unlockable}
            />
          </View>
        ) : null}

        {/* --- Bottom Navigation --- */}
        {(isHomeMode && !isFurnitureMode) ? (
          <BottomTabBar />
        ) : null}
        
        {/* Chest Animation Screen */}
        {showChestAnimation && (
          <ChestAnimationScreen 
            chestIndex={selectedChestIndex}
            onComplete={(rewards, chestIndex, shouldEmpty) => 
              handleChestAnimationComplete(rewards, chestIndex, shouldEmpty)}
          />
        )}

        {/* Chest Unlock Confirmation Dialog */}
        {showUnlockConfirmation && (
          <ChestUnlockConfirmation 
            chestIndex={selectedChestIndex}
            chestType={chestTimers[selectedChestIndex].chestType}
            onConfirm={handleUnlockConfirm}
            onCancel={handleUnlockCancel}
          />
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: { flex: 1 },
  container: { flex: 1 },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 10,
    marginTop: 45, // Increased to avoid overlapping with phone's status bar
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  // Study Navigation container for GO/STUDY and BACK buttons.
  studyNavContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: '22%',
    alignSelf: 'center',
    zIndex: 999,
  },
  studyButton: {
    backgroundColor: '#FF8C00',
    borderRadius: 25,
    paddingVertical: 18,
    paddingHorizontal: 35,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  studyButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#E91E63',
    borderRadius: 25,
    paddingVertical: 18,
    paddingHorizontal: 35,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  backButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  chestSlotRow: {
    position: 'absolute',
    bottom: '12%',
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  // Navigation at bottom of the screen.
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#1A1A1A',
    paddingVertical: 3,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
  },
  navItem: {
    alignItems: 'center',
  },
  navIconContainer: {
    padding: 8,
  },
  navIcon: {
    fontSize: 28,
  },
  navLabel: {
    color: 'white',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  // Styles for study mode deck selection.
  selectDeckText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
  },
  deckListContainer: {
    maxHeight: 60,
    marginHorizontal: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  deckListContent: {
    paddingHorizontal: 10,
  },
  deckButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 15,
    marginHorizontal: 5,
  },
  selectedDeckButton: {
    backgroundColor: '#4CAF50',
  },
  deckButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  deckInfoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    padding: 12,
    marginHorizontal: 20,
    marginVertical: 15,
    minHeight: 80,
    maxHeight: 120,
  },
  deckInfoTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  deckInfoText: {
    color: 'white',
    fontSize: 16,
    marginVertical: 3,
  },
  selectDeckPrompt: {
    color: 'white',
    fontSize: 18,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  studyModeContainer: {
    flex: 1,
    paddingBottom: 180, // Add space for the buttons at the bottom
  },
});
