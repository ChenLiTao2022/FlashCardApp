import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
  Dimensions,
  Pressable,
  Animated,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import * as Font from 'expo-font';

const db = SQLite.openDatabaseSync('mydb.db');

const { width, height } = Dimensions.get('window');

// ----------------------------
// Dynamic Room Settings
// ----------------------------
const screenWidth = width;
const ROOM_BG_SIZE = screenWidth * 0.9; // Room takes up 95% of the device's width
const ROOM_ROWS = 32;
const ROOM_COLS = 32;
const ROOM_CELL_SIZE = ROOM_BG_SIZE / ROOM_ROWS;

// ----------------------------
// Animation Settings for Cat Sprite (Box2.png)
// ----------------------------
const frameWidth = 64 * 1.5;
const frameHeight = 64 * 1.5;
const frameCount = 10;
const animationInterval = 150;

// ----------------------------
// Cat Size Option
// ----------------------------
const CAT_SIZE = 0.5;

// ----------------------------
// Other Constants & Helper Functions
// ----------------------------
const CELL_SIZE = 32;
const SHEET_SIZE = 1024;
const ROOM_SCALE = 0.6;

function createSpriteFromGrid(startRow, startCol, rowSpan, colSpan) {
  return {
    x: startCol * CELL_SIZE,
    y: startRow * CELL_SIZE,
    width: colSpan * CELL_SIZE,
    height: rowSpan * CELL_SIZE,
  };
}

// ----------------------------
// Decoration Library for Furniture Items
// ----------------------------
const decorationLibrary = {
  testDeco: createSpriteFromGrid(0, 0, 3, 3),
  catBed: createSpriteFromGrid(4, 6, 3, 4),
  catTower: createSpriteFromGrid(7, 17, 5, 4),
  catFood: createSpriteFromGrid(13, 8, 2, 2),
  windowLeft: createSpriteFromGrid(9, 21, 5, 3),
  catFlag: createSpriteFromGrid(6, 14, 2, 1),
  plant: createSpriteFromGrid(9, 4, 4, 2),
  leftSmallWindow: createSpriteFromGrid(7, 0, 2, 2),
  shelf: createSpriteFromGrid(21, 0, 4, 4),
  toy: createSpriteFromGrid(15, 21, 3, 2),
};

const spriteLibrary = {
  catFood: createSpriteFromGrid(17, 18, 2, 2),
};

// ----------------------------
// RoomDecorationItem Component (Tap-to-select)
// ----------------------------
function RoomDecorationItem({ id, itemKey, roomRow, roomCol, isSelected, onSelect, frameIndex }) {
  if (itemKey === 'catSprite') {
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {
          if (!isSelected && !onSelect(null)) onSelect(id);
        }}
        pointerEvents={isSelected ? 'none' : 'auto'}
        style={{
          position: 'absolute',
          left: roomCol * ROOM_CELL_SIZE,
          top: roomRow * ROOM_CELL_SIZE,
          width: frameWidth * CAT_SIZE,
          height: frameHeight * CAT_SIZE,
          opacity: isSelected ? 0.5 : 1,
          overflow: 'hidden',
        }}
      >
        <Image
          source={require('../asset/RetroCatsPaid/Cats/Sprites/Box2.png')}
          style={{
            position: 'absolute',
            left: -frameIndex * frameWidth * CAT_SIZE,
            top: 0,
            width: frameWidth * frameCount * CAT_SIZE,
            height: frameHeight * CAT_SIZE,
            resizeMode: 'contain',
          }}
        />
      </TouchableOpacity>
    );
  } else {
    const { x, y, width, height } = decorationLibrary[itemKey];
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {
          if (!isSelected) {
            onSelect(id);
          }
        }}
        pointerEvents={isSelected ? 'none' : 'auto'}
        style={{
          position: 'absolute',
          left: roomCol * ROOM_CELL_SIZE,
          top: roomRow * ROOM_CELL_SIZE,
          width: width * ROOM_SCALE,
          height: height * ROOM_SCALE,
          opacity: isSelected ? 0.5 : 1,
          overflow: 'hidden',
        }}
      >
        <Image
          source={require('../asset/RetroCatsPaid/CatItems/Decorations/CatRoomDecorations.png')}
          style={{
            position: 'absolute',
            top: -y * ROOM_SCALE,
            left: -x * ROOM_SCALE,
            width: SHEET_SIZE * ROOM_SCALE,
            height: SHEET_SIZE * ROOM_SCALE,
            resizeMode: 'contain',
          }}
        />
      </TouchableOpacity>
    );
  }
}

// ----------------------------
// Cat Food Slot Components
// ----------------------------
function CatFoodSlotLeft() {
  const { x, y, width: cellWidth } = spriteLibrary.catFood;
  const CAT_FOOD_IMG_SCALE = 60 / cellWidth;
  return (
    <View style={[styles.catFoodContainer, { width: 70, height: 70 }]}>
      <View style={{ width: 70, height: 70, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Image
          source={require('../asset/RetroCatsPaid/CatItems/Decorations/CatRoomDecorations.png')}
          style={{
            position: 'absolute',
            top: -y * CAT_FOOD_IMG_SCALE,
            left: -x * CAT_FOOD_IMG_SCALE,
            width: SHEET_SIZE * CAT_FOOD_IMG_SCALE,
            height: SHEET_SIZE * CAT_FOOD_IMG_SCALE,
            resizeMode: 'contain',
          }}
        />
      </View>
      <Text style={styles.foodLabel} numberOfLines={1}>3 hours</Text>
    </View>
  );
}

function CatFoodSlot() {
  return (
    <View style={[styles.catFoodContainer, { width: 70, height: 70 }]}>
      <Text style={styles.genericFoodText} numberOfLines={1}>Cat Food</Text>
    </View>
  );
}

// ----------------------------
// Main IndexPage Component
// ----------------------------
export default function IndexPage({ navigation }) {
  const [fontLoaded, setFontLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Add this useEffect for font loading and initial loading screen
  useEffect(() => {
    const loadFont = async () => {
      await Font.loadAsync({
        'PressStart2P': require('../../assets/fonts/PressStart2P-Regular.ttf'),
      });
      setFontLoaded(true);
    };
    
    loadFont();
    
    // Display loading screen for 2 seconds
    const timer = setTimeout(() => {
      
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  const [stats] = useState({
    hunger: 80,
    clean: 75,
    bored: 60,
    love: 90,
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  // currentRoomIndex: 0 for current room, 1 for locked room.
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const [decorations, setDecorations] = useState([
    { id: '1', itemKey: 'testDeco', roomRow: 7, roomCol: 20 },
    { id: '2', itemKey: 'catBed', roomRow: 11, roomCol: 13 },
    { id: '3', itemKey: 'catTower', roomRow: 12, roomCol: 22 },
    { id: '4', itemKey: 'catFood', roomRow: 19, roomCol: 20 },
    { id: '5', itemKey: 'windowLeft', roomRow: 7, roomCol: 5 },
    { id: '6', itemKey: 'catFlag', roomRow: 7, roomCol: 19 },
    { id: '7', itemKey: 'plant', roomRow: 10, roomCol: 19 },
    { id: '8', itemKey: 'plant', roomRow: 12, roomCol: 8 },
    { id: '9', itemKey: 'leftSmallWindow', roomRow: 6, roomCol: 12 },
    { id: '10', itemKey: 'shelf', roomRow: 15, roomCol: 2 },
    { id: '11', itemKey: 'toy', roomRow: 21, roomCol: 12 },
    { id: 'cat', itemKey: 'catSprite', roomRow: Math.floor(ROOM_ROWS / 2), roomCol: Math.floor(ROOM_COLS / 2) },
  ]);

  const [selectedDecorationId, setSelectedDecorationId] = useState(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const router = useRouter();

  // New state variables for study mode and deck selection.
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [decks, setDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState(null);

  // Cat sprite animation effect.
  useEffect(() => {
    const timer = setInterval(() => setFrameIndex(prev => (prev + 1) % frameCount), animationInterval);
    return () => clearInterval(timer);
  }, []);

  const handleSelectDecoration = (id) => {
    if (selectedDecorationId === null) {
      setSelectedDecorationId(id);
    }
  };

  const handleRoomAreaPress = (event) => {
    if (currentRoomIndex !== 0) return;
    if (!showPanel) {
      setShowPanel(true);
      return;
    }
    if (!selectedDecorationId) return;
    const { locationX, locationY } = event.nativeEvent;
    const selectedDecoration = decorations.find(d => d.id === selectedDecorationId);
    let decoWidth, decoHeight;
    if (selectedDecoration.itemKey === 'catSprite') {
      decoWidth = frameWidth * CAT_SIZE;
      decoHeight = frameHeight * CAT_SIZE;
    } else {
      const deco = decorationLibrary[selectedDecoration.itemKey];
      decoWidth = deco.width * ROOM_SCALE;
      decoHeight = deco.height * ROOM_SCALE;
    }
    const newLeft = locationX - (decoWidth / 2);
    const newTop = locationY - (decoHeight / 2);
    const newCol = Math.round(newLeft / ROOM_CELL_SIZE);
    const newRow = Math.round(newTop / ROOM_CELL_SIZE);
    setDecorations(
      decorations.map((decoration) =>
        decoration.id === selectedDecorationId
          ? { ...decoration, roomRow: newRow, roomCol: newCol }
          : decoration
      )
    );
    setSelectedDecorationId(null);
  };

  // Updated handleStudy function:
  // If in study mode and a deck is selected, pass the deckName to the Review screen.
  const handleStudy = () => {
    if (isStudyMode && selectedDeck) {
      router.push({
        pathname: '/Review',
        params: { deckName: selectedDeck.name },
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

  // Arrow Navigation for switching rooms.
  const handleArrowPress = (direction) => {
    if (direction === 'right' && currentRoomIndex === 0) {
      Animated.timing(translateX, {
        toValue: -ROOM_BG_SIZE,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setCurrentRoomIndex(1));
    } else if (direction === 'left' && currentRoomIndex === 1) {
      Animated.timing(translateX, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setCurrentRoomIndex(0));
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' }}>
        <Pressable 
          onPress={() => setIsLoading(false)}
          style={{ width: '100%', height: '100%' }}
        >
          <Image 
            source={require('../asset/front.webp')} 
            style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
          />
        </Pressable>
      </View>
    );
  }

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
        {/* --- Status Bar --- */}
        <View style={styles.statusContainer}>
          {isStudyMode ? (
            <Text style={styles.selectDeckText}>Select A Deck</Text>
          ) : (
            Object.entries(stats).map(([key, value]) => (
              <View key={key} style={styles.statusBar}>
                <Text style={styles.statusLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                <View style={styles.barBackground}>
                  <View style={[styles.barFill, { width: `${value}%`, backgroundColor: STATS_COLORS[key] }]} />
                </View>
                <Text style={styles.percentageText}>{value}%</Text>
              </View>
            ))
          )}
        </View>

        {/* --- Deck Selection / Action Buttons --- */}
        {isStudyMode ? (
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
        ) : (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={() => setIsEditMode(!isEditMode)}>
              <Text style={styles.actionButtonIcon}>✏️</Text>
              <Text style={styles.actionButtonText}>{isEditMode ? 'Done' : 'Edit'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonIcon}>🍗</Text>
              <Text style={styles.actionButtonText}>Feed</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonIcon}>🧹</Text>
              <Text style={styles.actionButtonText}>Clean</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonIcon}>🎮</Text>
              <Text style={styles.actionButtonText}>Play</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* --- Room Area --- */}
        <View style={styles.roomAreaWrapper}>
          {isStudyMode ? (
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
          ) : (
            <>
              <Animated.View style={[styles.animatedRoomContainer, { transform: [{ translateX }] }]}>
                <Pressable style={styles.roomArea} onPress={handleRoomAreaPress}>
                  <Image
                    source={require('../asset/RetroCatsPaid/Catroom/Rooms/Room1.png')}
                    style={styles.roomImage}
                    resizeMode="contain"
                  />
                  {decorations.map((decoration) => (
                    <RoomDecorationItem
                      key={decoration.id}
                      id={decoration.id}
                      itemKey={decoration.itemKey}
                      roomRow={decoration.roomRow}
                      roomCol={decoration.roomCol}
                      isSelected={decoration.id === selectedDecorationId}
                      onSelect={handleSelectDecoration}
                      frameIndex={frameIndex}
                    />
                  ))}
                </Pressable>
                <Pressable style={styles.roomArea} pointerEvents="none">
                  <Image
                    source={require('../asset/RetroCatsPaid/Catroom/Rooms/Room1.png')}
                    style={styles.roomImage}
                    resizeMode="contain"
                  />
                  <View style={styles.lockOverlay}>
                    <Text style={styles.lockText}>Locked</Text>
                  </View>
                </Pressable>
              </Animated.View>
              {currentRoomIndex === 1 && (
                <TouchableOpacity style={styles.leftArrow} onPress={() => handleArrowPress('left')}>
                  <Text style={styles.arrowText}>←</Text>
                </TouchableOpacity>
              )}
              {currentRoomIndex === 0 && (
                <TouchableOpacity style={styles.rightArrow} onPress={() => handleArrowPress('right')}>
                  <Text style={styles.arrowText}>→</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* --- Study Navigation Buttons --- */}
        <View style={styles.studyNavContainer}>
          <TouchableOpacity 
            style={[
              styles.studyButton, 
              isStudyMode && { backgroundColor: '#4CAF50' }
            ]} 
            onPress={handleStudy}
          >
            <Text style={styles.studyButtonText}>
              {isStudyMode ? 'START' : 'ADVENTURE'}
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

        {/* --- Cat Food Boxes Row --- */}
        <View style={styles.catFoodRow}>
          <CatFoodSlotLeft />
          <CatFoodSlot />
          <CatFoodSlot />
          <CatFoodSlot />
        </View>

        {/* --- Bottom Navigation --- */}
        <View style={styles.bottomNav}>
          <TouchableOpacity onPress={() => router.push('/PetShop')} style={styles.navItem}>
            <View style={styles.navIconContainer}>
              <Text style={styles.navIcon}>🛒</Text>
            </View>
            <Text style={styles.navLabel}>Shop</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/Decks')} style={styles.navItem}>
            <View style={styles.navIconContainer}>
              <Text style={styles.navIcon}>📦</Text>
            </View>
            <Text style={styles.navLabel}>Deck</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <View style={styles.navIconContainer}>
              <Text style={styles.navIcon}>🐾</Text>
            </View>
            <Text style={styles.navLabel}>Current</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem}>
            <View style={styles.navIconContainer}>
              <Text style={styles.navIcon}>⚙️</Text>
            </View>
            <Text style={styles.navLabel}>More</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const STATS_COLORS = {
  hunger: '#FFA600',
  clean: '#66C7F4',
  bored: '#FF5252',
  love: '#FF69B4',
};

const styles = StyleSheet.create({
  bgImage: { flex: 1 },
  container: { flex: 1 },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 10,
    marginTop: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  statusBar: {
    width: '48%',
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    color: 'white',
    fontWeight: 'bold',
  },
  barBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginHorizontal: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    color: 'white',
    fontSize: 12,
  },
  // Arrow styles
  leftArrow: {
    position: 'absolute',
    left: 10,
    top: '50%',
    zIndex: 1000,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 10,
    transform: [{ translateY: -20 }],
  },
  rightArrow: {
    position: 'absolute',
    right: 10,
    top: '50%',
    zIndex: 1000,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 10,
    transform: [{ translateY: -20 }],
  },
  arrowText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  // Action buttons (non-study mode)
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 10,
    borderRadius: 15,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 3,
    minWidth: 70,
  },
  actionButtonIcon: {
    fontSize: 18,
    marginVertical: 2,
  },
  actionButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  roomAreaWrapper: {
    alignSelf: 'center',
    marginVertical: 20,
    width: ROOM_BG_SIZE,
    height: ROOM_BG_SIZE,
    overflow: 'hidden',
    position: 'relative',
  },
  animatedRoomContainer: {
    flexDirection: 'row',
    width: ROOM_BG_SIZE * 2,
    height: ROOM_BG_SIZE,
  },
  roomArea: {
    width: ROOM_BG_SIZE,
    height: ROOM_BG_SIZE,
    position: 'relative',
  },
  roomImage: { width: '100%', height: '100%' },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
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
  catFoodRow: {
    position: 'absolute',
    bottom: '11%',
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  catFoodContainer: {
    borderRadius: 15,
    padding: 5,
    alignItems: 'center',
    marginHorizontal: 5,
    backgroundColor: '#FFD700',
  },
  genericFoodText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  foodLabel: {
    position: 'absolute',
    bottom: -20,
    left: '50%',
    transform: [{ translateX: -25 }],
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    backgroundColor: '#0008',
    paddingHorizontal: 5,
    borderRadius: 4,
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
    marginTop: 10,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    padding: 20,
  },
  deckInfoTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  deckInfoText: {
    color: 'white',
    fontSize: 18,
    marginVertical: 5,
  },
  selectDeckPrompt: {
    color: 'white',
    fontSize: 18,
    fontStyle: 'italic',
  },
});
