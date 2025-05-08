import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Font from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  loadDailyStreak,
  loadDiamonds,
  loadMoney
} from '../helpers/StorageHelper';

const db = SQLite.openDatabaseSync('mydb.db');
const { width, height } = Dimensions.get('window');

// ----------------------------
// Main IndexPage Component
// ----------------------------
export default function IndexPage() {
  // Essential state
  const [fontLoaded, setFontLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [money, setMoney] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [dailyStreak, setDailyStreak] = useState(0);
  
  // Study mode states
  const [decks, setDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [showStudyRoom, setShowStudyRoom] = useState(true);
  
  // Room transition states
  const [currentRoom, setCurrentRoom] = useState('study'); // 'study', 'cat', 'coffee', or 'deck'
  const studyRoomPosition = useRef(new Animated.Value(0)).current;
  const catRoomPosition = useRef(new Animated.Value(width)).current;
  const coffeeShopPosition = useRef(new Animated.Value(-width)).current;
  const deckRoomPosition = useRef(new Animated.Value(-width)).current; // Position Deck Room to the left of the Study Room
  const [isAnimating, setIsAnimating] = useState(false);

  // Add cat animation states

  
  const router = useRouter();
  
  // Load fonts
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Font.loadAsync({
          'PressStart2P': require('../../assets/fonts/PressStart2P-Regular.ttf'),
        });
        setFontLoaded(true);
        
        // Load player data
        const [moneyValue, diamondsValue, streakValue] = await Promise.all([
          loadMoney(),
          loadDiamonds(),
          loadDailyStreak()
        ]);
        
        setMoney(moneyValue);
        setDiamonds(diamondsValue);
        setDailyStreak(streakValue);
        
        // Get list of decks
        const results = db.getAllSync(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `);
        setDecks(results);
        
        // End loading state
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading initial data:', error);
        setIsLoading(false);
      }
    };
    
    loadInitialData();
  }, []);

  // Function to handle room transition
  const handleRoomTransition = (direction, targetRoom) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    
    if (currentRoom === 'study') {
      if (targetRoom === 'cat') {
        // Going from study to cat room (right)
        Animated.timing(studyRoomPosition, {
          toValue: -width,
          duration: 500,
          useNativeDriver: true
        }).start();
        
        Animated.timing(catRoomPosition, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true
        }).start(() => {
          setCurrentRoom('cat');
          setIsAnimating(false);
        });
      } else if (targetRoom === 'deck') {
        // Going from study to deck room (left)
        Animated.timing(studyRoomPosition, {
          toValue: width,
          duration: 500,
          useNativeDriver: true
        }).start();
        
        Animated.timing(deckRoomPosition, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true
        }).start(() => {
          setCurrentRoom('deck');
          setIsAnimating(false);
        });
      }
    } else if (currentRoom === 'cat') {
      // Going from cat room back to study
      Animated.timing(catRoomPosition, {
        toValue: width,
        duration: 500,
        useNativeDriver: true
      }).start();
      
      Animated.timing(studyRoomPosition, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true
      }).start(() => {
        setCurrentRoom('study');
        setIsAnimating(false);
      });
    } else if (currentRoom === 'coffee') {
      if (targetRoom === 'deck') {
        // Going from coffee shop to deck room
        Animated.timing(coffeeShopPosition, {
          toValue: -width,
          duration: 500,
          useNativeDriver: true
        }).start();
        
        Animated.timing(deckRoomPosition, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true
        }).start(() => {
          setCurrentRoom('deck');
          setIsAnimating(false);
        });
      }
    } else if (currentRoom === 'deck') {
      if (targetRoom === 'study') {
        // Going from deck room to study
        Animated.timing(deckRoomPosition, {
          toValue: -width,
          duration: 500,
          useNativeDriver: true
        }).start();
        
        Animated.timing(studyRoomPosition, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true
        }).start(() => {
          setCurrentRoom('study');
          setIsAnimating(false);
        });
      } else if (targetRoom === 'coffee') {
        // Going from deck room to coffee shop
        Animated.timing(deckRoomPosition, {
          toValue: width,
          duration: 500,
          useNativeDriver: true
        }).start();
        
        Animated.timing(coffeeShopPosition, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true
        }).start(() => {
          setCurrentRoom('coffee');
          setIsAnimating(false);
        });
      }
    }
  };
  
  // Function to enter the selected room and go to deck selection
  const handleEnterRoom = (room) => {
    if (room === 'deck') {
      router.push('/Decks');
    } else if (room === 'shop') {
      router.push('/Shop');
    } else {
      setShowStudyRoom(false);
    }
  };
  
  // New function to go back to room selection
  const handleBackToRooms = () => {
    setShowStudyRoom(true);
  };
  
  // Handler functions
  const handleStudy = useCallback(async () => {
    if (selectedDeck) {
      const occupiedChests = 0; // No chests are occupied in the new version
      await AsyncStorage.setItem('occupiedChestsCount', occupiedChests.toString());
      
      router.push({
        pathname: '/Review',
        params: { deckName: selectedDeck.name }
      });
    }
  }, [selectedDeck, router]);



  if (!fontLoaded || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <>
          {showStudyRoom ? (
            <ImageBackground 
              source={require('../asset/background.png')} 
              style={styles.bgImage}
              resizeMode="cover"
            >
              <View style={styles.studyRoomContainer}>
                {/* Study Room View */}
                <Animated.View 
                  style={[
                    styles.roomImageContainer,
                    { transform: [{ translateX: studyRoomPosition }] }
                  ]}
                >
                  <Image 
                    source={require('../asset/RetroCatsPaid/CatItems/Rooms/studyRoom.png')} 
                    style={styles.studyRoomImage} 
                    resizeMode="contain"
                  />
                  
                  <TouchableOpacity 
                    style={styles.enterButton} 
                    onPress={() => handleEnterRoom('study')}
                    disabled={isAnimating}
                  >
                    <Text style={styles.enterButtonText}>Enter Study Room</Text>
                  </TouchableOpacity>
                </Animated.View>
                
                {/* Cat Room View */}
                <Animated.View 
                  style={[
                    styles.roomImageContainer,
                    { transform: [{ translateX: catRoomPosition }] }
                  ]}
                >
                  <Image 
                    source={require('../asset/RetroCatsPaid/CatItems/Rooms/petRoom.png')} 
                    style={styles.studyRoomImage} 
                    resizeMode="contain"
                  />
                  
                  <TouchableOpacity 
                    style={[styles.enterButton, styles.decorateButton]} 
                    onPress={() => handleEnterRoom('cat')}
                    disabled={isAnimating}
                  >
                    <Text style={styles.enterButtonText}>Enter Cat Room</Text>
                  </TouchableOpacity>
                </Animated.View>
                
                {/* Coffee Shop View */}
                <Animated.View 
                  style={[
                    styles.roomImageContainer,
                    { transform: [{ translateX: coffeeShopPosition }] }
                  ]}
                >
                  <View style={styles.coffeeShopScreenContainer}>
                    {/* Shop image on top */}
                    <View style={styles.shopContainer}>
                      <Image 
                        source={require('../asset/RetroCatsPaid/CatItems/Rooms/shop.png')} 
                        style={styles.shopImage} 
                        resizeMode="contain"
                      />
                      
                      <Pressable 
                        style={[styles.enterButton, styles.shopButton]} 
                        onPress={() => handleEnterRoom('shop')}
                        disabled={isAnimating}
                      >
                        <Text style={styles.buttonText}>Enter Shop</Text>
                      </Pressable>
                    </View>

                    {/* Coffee Shop image below */}
                    <View style={styles.coffeeShopContainer}>
                      <Image 
                        source={require('../asset/RetroCatsPaid/CatItems/Rooms/coffeeShop.png')} 
                        style={styles.coffeeShopImage} 
                        resizeMode="contain"
                      />
                      
                      <Pressable 
                        style={[styles.enterButton, styles.coffeeShopButton]} 
                        onPress={() => handleEnterRoom('coffeeShop')}
                        disabled={isAnimating}
                      >
                        <Text style={styles.buttonText}>Enter Coffee Shop</Text>
                      </Pressable>
                    </View>
                  </View>
                </Animated.View>
                
                {/* Deck Room View */}
                <Animated.View 
                  style={[
                    styles.roomImageContainer,
                    { transform: [{ translateX: deckRoomPosition }] }
                  ]}
                >
                  <Image 
                    source={require('../asset/RetroCatsPaid/CatItems/Rooms/DeckRoom.png')} 
                    style={styles.studyRoomImage} 
                    resizeMode="contain"
                  />
                  
                  <TouchableOpacity 
                    style={styles.enterButton} 
                    onPress={() => handleEnterRoom('deck')}
                    disabled={isAnimating}
                  >
                    <Text style={styles.enterButtonText}>Enter Deck Room</Text>
                  </TouchableOpacity>
                </Animated.View>
                
                {/* Navigation buttons for each room */}
                {/* Coffee Shop Arrows */}
                {currentRoom === 'coffee' && (
                  <TouchableOpacity 
                    style={styles.rightArrow} 
                    onPress={() => handleRoomTransition('right', 'deck')}
                    disabled={isAnimating}
                  >
                    <Text style={styles.arrowText}>→</Text>
                  </TouchableOpacity>
                )}
                
                {/* Deck Room Arrows */}
                {currentRoom === 'deck' && (
                  <>
                    {/* Left Arrow (to Coffee Shop) */}
                    <TouchableOpacity 
                      style={styles.leftArrow} 
                      onPress={() => handleRoomTransition('left', 'coffee')}
                      disabled={isAnimating}
                    >
                      <Text style={styles.arrowText}>←</Text>
                    </TouchableOpacity>
                    
                    {/* Right Arrow (to Study Room) */}
                    <TouchableOpacity 
                      style={styles.rightArrow} 
                      onPress={() => handleRoomTransition('right', 'study')}
                      disabled={isAnimating}
                    >
                      <Text style={styles.arrowText}>→</Text>
                    </TouchableOpacity>
                  </>
                )}
                
                {/* Study Room Arrows */}
                {currentRoom === 'study' && (
                  <>
                    {/* Left Arrow (to Deck Room) */}
                    <TouchableOpacity 
                      style={styles.leftArrow} 
                      onPress={() => handleRoomTransition('left', 'deck')}
                      disabled={isAnimating}
                    >
                      <Text style={styles.arrowText}>←</Text>
                    </TouchableOpacity>
                    
                    {/* Right Arrow (to Cat Room) */}
                    <TouchableOpacity 
                      style={styles.rightArrow} 
                      onPress={() => handleRoomTransition('right', 'cat')}
                      disabled={isAnimating}
                    >
                      <Text style={styles.arrowText}>→</Text>
                    </TouchableOpacity>
                  </>
                )}
                
                {/* Cat Room Arrow */}
                {currentRoom === 'cat' && (
                  <TouchableOpacity 
                    style={styles.leftArrow} 
                    onPress={() => handleRoomTransition('left', 'study')}
                    disabled={isAnimating}
                  >
                    <Text style={styles.arrowText}>←</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ImageBackground>
          ) : (
            <ImageBackground 
              source={require('../asset/background.png')} 
              style={styles.bgImage}
              resizeMode="cover"
            >
              <View style={styles.mainContainer}>
                {/* Select a Deck Container */}
                <LinearGradient
                  colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.4)']}
                  style={styles.selectionContainer}
                >
                  <View style={styles.headerContainer}>
                    <TouchableOpacity 
                      style={styles.backButton} 
                      onPress={handleBackToRooms}
                    >
                      <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.selectDeckText}>Select A Deck</Text>
                    <View style={styles.backButtonPlaceholder} />
                  </View>
                  
                  <ScrollView 
                    style={styles.deckListContainer}
                    contentContainerStyle={styles.deckListContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {decks.length > 0 ? (
                      decks.map((deck, index) => {
                        // Fetch card info when rendering
                        const items = db.getAllSync(`SELECT * FROM ${deck.name}`);
                        const now = new Date();
                        const due = items.filter(card => now >= new Date(card.nextReviewDate));
                        const totalCards = items.length;
                        const dueCount = due.length;
                        
                        return (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.deckRow,
                              selectedDeck?.name === deck.name && styles.selectedDeckRow
                            ]}
                            onPress={() => {
                              setSelectedDeck({
                                name: deck.name,
                                totalCards,
                                dueCount,
                              });
                            }}
                          >
                            <Text style={styles.deckNameText}>{deck.name}</Text>
                            <View style={styles.deckRowStats}>
                              <View style={styles.deckRowStatItem}>
                                <Text style={styles.deckRowStatLabel}>Total</Text>
                                <Text style={styles.deckRowStatValue}>{totalCards}</Text>
                              </View>
                              <View style={styles.deckRowStatItem}>
                                <Text style={styles.deckRowStatLabel}>Due</Text>
                                <Text style={styles.deckRowStatValue}>{dueCount}</Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    ) : (
                      <View style={styles.emptyDeckContainer}>
                        <Text style={styles.emptyDeckText}>No decks available</Text>
                      </View>
                    )}
                  </ScrollView>
                  
                  {/* Play button */}
                  <View style={styles.studyNavContainer}>
                    <TouchableOpacity 
                      style={[styles.startButton, !selectedDeck && styles.disabledStartButton]}
                      onPress={handleStudy}
                      disabled={!selectedDeck}
                    >
                      <Text style={styles.studyButtonText}>PLAY</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>

                {/* Cat Section */}
                <View style={styles.catSectionContainer}>
                  <Text style={styles.placeholderText}>Cat Stats Coming Soon</Text>
                </View>

             
              </View>
            </ImageBackground>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212'
  },
  loadingText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18
  },
  bgImage: { 
    flex: 1,
    width: '100%',
    height: '100%'
  },
  container: { 
    flex: 1,
    position: 'relative'
  },
  mainContainer: {
    flex: 1,
    position: 'relative'
  },
  selectDeckText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginVertical: 10,
  },
  studyNavContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 15,
    marginBottom: 5,
  },
  startButton: {
    backgroundColor: '#00cc66',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  studyButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  selectionContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 20,
    marginTop: 50,
    borderRadius: 12,
    marginHorizontal: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    flex: 0.5,
  },
  catSectionContainer: {
    flex: 0.3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deckListContainer: {
    width: '100%',
    flex: 1,
  },
  deckListContent: {
    paddingVertical: 5,
    paddingHorizontal: 2,
  },
  deckRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    marginVertical: 5,
    marginHorizontal: 2,
    height: 55,
  },
  selectedDeckRow: {
    backgroundColor: '#4CAF50',
    borderColor: '#5DC264',
  },
  deckNameText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    maxWidth: '60%',
  },
  deckRowStats: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    minWidth: 120,
  },
  deckRowStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 15,
  },
  deckRowStatLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginRight: 4,
  },
  deckRowStatValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyDeckContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyDeckText: {
    color: 'white',
    fontSize: 18,
    fontStyle: 'italic',
  },
  disabledStartButton: {
    backgroundColor: 'rgba(128, 128, 128, 0.6)',
    borderColor: 'rgba(128, 128, 128, 0.3)',
    opacity: 0.7,
  },
  chestContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingBottom: 15,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    paddingTop: 10,
  },
  chestRewardLabel: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  chestSlotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 10,
  },
  studyRoomContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    position: 'relative'
  },
  roomImageContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: width,
    height: height
  },
  studyRoomImage: {
    width: width * 0.9,
    height: width * 0.9,
    alignSelf: 'center'
  },
  enterButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#f4a261',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e76f51',
    position: 'absolute',
    bottom: 50,
    zIndex: 10
  },
  enterButtonText: {
    fontFamily: 'PressStart2P',
    color: '#fff',
    fontSize: 16,
    textAlign: 'center'
  },
  leftArrow: {
    position: 'absolute',
    left: 20,
    top: '50%',
    backgroundColor: 'rgba(244, 162, 97, 0.8)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e76f51',
    zIndex: 10
  },
  rightArrow: {
    position: 'absolute',
    right: 20,
    top: '50%',
    backgroundColor: 'rgba(244, 162, 97, 0.8)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e76f51',
    zIndex: 10
  },
  arrowText: {
    fontFamily: 'PressStart2P',
    color: '#fff',
    fontSize: 20,
    textAlign: 'center'
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  backButton: {
    backgroundColor: 'rgba(244, 162, 97, 0.8)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e76f51',
  },
  backButtonText: {
    fontFamily: 'PressStart2P',
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  backButtonPlaceholder: {
    width: 40,
  },
  coffeeShopScreenContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    paddingVertical: 20,
  },
  shopContainer: {
    width: width * 0.8,
    height: height * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 30,
  },
  shopImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  coffeeShopContainer: {
    width: width * 0.8,
    height: height * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  shopButton: {
    position: 'absolute',
    bottom: -20,
    backgroundColor: '#f4a261',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e76f51',
    zIndex: 20,
  },
  coffeeShopButton: {
    position: 'absolute',
    bottom: -20,
    backgroundColor: '#f4a261',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e76f51',
    zIndex: 20,
  },
  coffeeShopImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  buttonText: {
    color: '#2a2a2a',
    fontWeight: 'bold',
    fontSize: 16,
  },
  decorateButton: {
    backgroundColor: '#4a6fa5',
    borderColor: '#304d6d',
  },
  placeholderText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
