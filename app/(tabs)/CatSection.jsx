import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { areAnimationsLoaded, checkAnimationLoadedState, playAnimationOnce, saveAnimationLoadedState, setAnimationsLoaded } from '../helpers/CatAnimationHelper';
import {
  loadDailyStreak,
  loadFoodData,
  loadOwnedFurniture,
  loadStats,
  resetStorage,
  saveFoodData,
  saveOwnedFood,
  savePurchasedFoods,
  saveStats
} from '../helpers/StorageHelper';
import {
  createSpriteFromGrid,
  decorationLibrary,
  furniturePrices,
  groupFurnitureByCategory,
  ROOM_SCALE,
  SHEET_SIZE
} from './learningComponent/CatFurniture';
// Import the chest components from ChestSection

const { width, height } = Dimensions.get('window');

// Define styles object for components to use
const styles = StyleSheet.create({
  // Common styles
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  
  // Room area styles
  roomBackground: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  
  // Chest slot styles
  chestSlotContainer: {
    width: 70,
    height: 70,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#8a6e51',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
  },
  timerText: {
    position: 'absolute',
    bottom: 5,
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 3,
  },
  readyTimerText: {
    backgroundColor: 'rgba(218, 165, 32, 0.7)',
    color: '#000',
  },
  unlockableTimerText: {
    backgroundColor: 'rgba(138, 43, 226, 0.7)',
    color: '#FFF',
  },
  emptyChestText: {
    color: '#888',
    fontStyle: 'italic',
  },
  
  // Chest unlock confirmation styles
  unlockConfirmationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  unlockConfirmationContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  unlockConfirmationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  unlockChestImageContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  unlockButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  unlockButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  cancelUnlockButton: {
    backgroundColor: '#F44336',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  unlockButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  
  // Money indicator styles
  moneyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    zIndex: 10,
  },
  moneyIcon: {
    fontSize: 20,
    marginRight: 5,
  },
  moneyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  streakIcon: {
    fontSize: 18,
    marginRight: 3,
  },
  streakCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  
  // Speech bubble styles
  speechBubble: {
    position: 'absolute',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
    borderColor: '#ddd',
    borderWidth: 1,
    maxWidth: 150,
    zIndex: 1000,
  },
  speechBubbleText: {
    fontSize: 16,
    textAlign: 'center',
  },
  
  // Furniture selection styles
  furnitureSelectionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 100,
  },
  storageTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  storageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 10,
  },
  shopButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#f44336',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  storageScrollView: {
    flex: 1,
  },
  categorySection: {
    marginBottom: 15,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  itemsRow: {
    paddingHorizontal: 5,
  },
  noItemsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
  },
  noItemsText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  shopNowButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  shopNowText: {
    color: 'white',
    fontWeight: 'bold',
  },
  
  // Food item styles
  foodItemContainer: {
    width: 90,
    height: 110,
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
    margin: 6,
    alignItems: 'center',
    padding: 10,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  foodImageContainer: {
    width: 60,
    height: 60,
    backgroundColor: 'white',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#eee',
  },
  foodEmoji: {
    fontSize: 30,
    textAlign: 'center',
  },
  foodName: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
    fontWeight: '500',
    marginTop: 4,
  },
  quantityBadge: {
    position: 'absolute',
    top: -5,
    left: -5,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'white',
  },
  quantityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  priceBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 10,
  },
  priceText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  preferenceIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'white',
  },
  preferenceIndicatorText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Food details modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  foodDetailModal: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '85%',
    alignItems: 'center',
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  foodDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  preferenceTag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    marginBottom: 15,
  },
  preferenceText: {
    color: 'white',
    fontWeight: 'bold',
  },
  foodDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  nutritionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  nutritionText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  ownedQuantityText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  feedButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buyButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f44336',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginLeft: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  quantityLabel: {
    fontSize: 14,
    marginRight: 10,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  quantityButton: {
    backgroundColor: '#eee',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quantityButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  quantityValue: {
    paddingHorizontal: 15,
    fontWeight: 'bold',
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  
  // Food selection panel
  foodSelectionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 100,
  },
  foodPanelScrollView: {
    flex: 1,
  },
  foodPanelScrollContent: {
    paddingVertical: 10,
  },
  foodCategoryContainer: {
    marginBottom: 20,
  },
  foodCategoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  foodRowScroll: {
    marginBottom: 5,
  },
  emptyStorageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStorageText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  
  // Furniture item styles
  furnitureItem: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
    margin: 6,
    alignItems: 'center',
    padding: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    position: 'relative',
    justifyContent: 'center',
  },
  placedFurnitureItem: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    backgroundColor: '#E8F5E9',
  },
  furnitureImageContainer: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceTag: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    fontSize: 10,
    color: 'white',
  },
});

// ----------------------------
// Dynamic Room Settings
// ----------------------------
export const screenWidth = width;
export const screenHeight = height;
export const ROOM_BG_SIZE = Math.min(screenWidth * 1, screenHeight * 1); // Responsive room size
export const ROOM_ROWS = 32;
export const ROOM_COLS = 32;
export const ROOM_CELL_SIZE = ROOM_BG_SIZE / ROOM_ROWS;

// ----------------------------
// Animation Settings for Cat Sprite
// ----------------------------
export const frameWidth = 64 * 1.5;
export const frameHeight = 64 * 1.5;
export const animationInterval = 150;

// ----------------------------
// Cat Animation Library
// ----------------------------
export const catAnimations = {
  Attack: { 
    frames: 7, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Attack.png') 
  },
  Box1: { 
    frames: 12, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Box1.png') 
  },
  Box2: { 
    frames: 10, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Box2.png') 
  },
  Box3: { 
    frames: 12, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Box3.png') 
  },
  Chilling: { 
    frames: 8, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Chilling.png') 
  },
  Crying: { 
    frames: 4, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Crying.png') 
  },
  Dance: { 
    frames: 4, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Dance.png') 
  },
  Dead: { 
    frames: 1, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Dead.png') 
  },
  Dead2: { 
    frames: 5, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Dead2.png') 
  },
  Excited: { 
    frames: 3, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Excited.png') 
  },
  Happy: { 
    frames: 10, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Happy.png') 
  },
  Hurt: { 
    frames: 8, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Hurt.png') 
  },
  Idle: { 
    frames: 6, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Idle.png') 
  },
  Jump: { 
    frames: 12, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Jump.png') 
  },
  Running: { 
    frames: 6, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Running.png') 
  },
  Sleeping: { 
    frames: 4, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Sleeping.png') 
  },
  Surprised: { 
    frames: 4, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Surprised.png') 
  },
  Tickle: { 
    frames: 4, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Tickle.png') 
  }
};

// Get an array of animation names for random selection
export const animationNames = Object.keys(catAnimations);

// ----------------------------
// Cat Size Option
// ----------------------------
export const CAT_SIZE = 0.5;

// ----------------------------
// Other Constants & Helper Functions
// ----------------------------
// These constants are now imported from CatFurniture.jsx

// ----------------------------
// Sprite Library
// ----------------------------
export const spriteLibrary = {
  catFood: createSpriteFromGrid(17, 18, 2, 2),
};

// ----------------------------
// RoomDecorationItem Component (Tap-to-select)
// ----------------------------
export function RoomDecorationItem({ id, itemKey, roomRow, roomCol, isSelected, onSelect, frameIndex, currentAnimation, direction = 1, onCatTap }) {
  if (itemKey === 'catSprite') {
    const animation = catAnimations[currentAnimation];
    // Round position values for React Native view
    const left = Math.floor(roomCol * ROOM_CELL_SIZE);
    const top = Math.floor(roomRow * ROOM_CELL_SIZE);
    
    // Add a reference to track the previous animation
    const prevAnimationRef = useRef(currentAnimation);
    const directionRef = useRef(direction);
    
    // Keep track of animation changes but don't fade
    useEffect(() => {
      if (prevAnimationRef.current !== currentAnimation) {
        // Just update the reference without any animation
        prevAnimationRef.current = currentAnimation;
      }
    }, [currentAnimation]);
    
    // Keep track of direction changes
    useEffect(() => {
      directionRef.current = direction;
    }, [direction]);
    
    // Determine the effective direction based on:
    // 1. The explicit direction prop (which overrides defaults)
    // 2. The default direction of the current animation (if no explicit direction)
    const effectiveDirection = direction;
    
    // Scale up the Running animation by 10%
    const isRunningAnimation = currentAnimation === 'Running';
    const scaleFactor = isRunningAnimation ? 1.1 : 1.0; // 10% larger for running
    
    // Calculate adjusted sizes for the animation
    const adjustedWidth = frameWidth * CAT_SIZE * scaleFactor;
    const adjustedHeight = frameHeight * CAT_SIZE * scaleFactor;
    
    // Adjust position to center the larger animation
    const adjustedLeft = isRunningAnimation ? left - (adjustedWidth - frameWidth * CAT_SIZE) / 2 : left;
    const adjustedTop = isRunningAnimation ? top - (adjustedHeight - frameHeight * CAT_SIZE) / 2 : top;
    
    // Always use direction for flipping, regardless of animation
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {
          if (onCatTap && id === 'cat') {
            onCatTap();
          } else if (!isSelected && typeof onSelect === 'function') {
            // First check if onSelect is a function
            const shouldPreventDefault = onSelect(null);
            if (!shouldPreventDefault) {
              onSelect(id);
            }
          }
        }}
        pointerEvents={isSelected ? 'none' : 'auto'}
        style={{
          position: 'absolute',
          left: adjustedLeft,
          top: adjustedTop,
          width: adjustedWidth,
          height: adjustedHeight,
          opacity: isSelected ? 0.5 : 1,
          overflow: 'hidden',
          zIndex: Math.floor(roomRow) + 15, // Higher z-index to ensure cat appears above boundary box
          transform: [{ scaleX: effectiveDirection }] // Flip based on direction
        }}
      >
        <Image
          source={animation.source}
          style={{
            position: 'absolute',
            left: -Math.floor(frameIndex * frameWidth * CAT_SIZE * scaleFactor),
            top: 0,
            width: frameWidth * animation.frames * CAT_SIZE * scaleFactor,
            height: frameHeight * CAT_SIZE * scaleFactor,
            resizeMode: 'contain',
          }}
        />
      </TouchableOpacity>
    );
  } else {
    const { x, y, width, height } = decorationLibrary[itemKey];
    // Round position values for React Native view
    const left = Math.floor(roomCol * ROOM_CELL_SIZE);
    const top = Math.floor(roomRow * ROOM_CELL_SIZE);
    
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (!isSelected && typeof onSelect === 'function') {
            onSelect(id);
          }
        }}
        style={{
          position: 'absolute',
          left: left,
          top: top,
          width: width * ROOM_SCALE,
          height: height * ROOM_SCALE,
          opacity: isSelected ? 0.5 : 1,
          overflow: 'hidden',
          zIndex: Math.floor(roomRow + 1), // Z-index based on y-coordinate, +1 to prioritize furniture over cat
          // Only allow touch events when not selected
          pointerEvents: isSelected ? 'none' : 'auto',
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
// Chest Slot Components from ChestSection.jsx
// ----------------------------
// Removed duplicated chest constants and components - now imported from ChestSection.jsx

export const STATS_COLORS = {
  hunger: '#FFA600',
  clean: '#66C7F4',
  happy: '#4CAF50',
};

// ----------------------------
// Food Prices
// ----------------------------
export const foodPrices = {
  // Comfort Foods (medium priced)
  CreamySalmonPate: 30,
  WarmChickenBroth: 25,
  TunaFlakes: 28,
  CrispyBaconBits: 32,
  CheeseMeltMorsels: 30,
  OceanWhitefishStew: 35,
  MashedSweetPotatoMedley: 28,
  ButteryBreadCrumbs: 25,
  TurkeyRicePorridge: 30,
  ChickenNoodleSoup: 32,
  
  // Street Memories (cheapest)
  LeftoverPizzaCrust: 15,
  DiscardedSandwich: 18,
  MilkFromTrashBin: 15,
  StreetFishScraps: 22,
  TinCanTuna: 20,
  SpoiledBeefBits: 15,
  CannedSardineDrippings: 18,
  StaleBreadCrumbs: 15,
  WiltedLettuceBits: 15,
  GardenSnailSnack: 25,
  
  // Playful Treats (slightly above average)
  CatnipCookies: 38,
  SalmonJerkyStrips: 35,
  CrunchyTunaBiscuits: 32,
  MouseshapedCheeseTreats: 30,
  YarnBallCandy: 28,
  ButterflySprinkles: 30,
  FrogshapedMousseBites: 32,
  HedgehogCrunchies: 35,
  FeatherCrispNibbles: 35,
  LadybugBerryBites: 30,
  
  // Healthy Essentials (average)
  VitaminRichKibble: 28,
  ProbioticYogurt: 25,
  SpinachCatBiscuits: 22,
  CarrotPuree: 20,
  SweetPotatoChips: 25,
  ParsleyPowerPellets: 22,
  CornFiberCrunch: 20,
  AppleCiderGel: 25,
  Omega3FishOilBites: 30,
  BrownRiceVegMix: 25,
  
  // Luxury Indulgences (most expensive)
  LobsterDelight: 55,
  DuckALOrange: 48,
  CaviarMousse: 60,
  TruffleCatTreats: 45,
  CrabShrimpMedley: 52,
  WagyuBeefSliders: 58,
  GourmetPrawnSupreme: 50,
  VenisonStew: 45,
  QuailEggCustard: 48,
  BrieSalmonFloss: 52
};

// ----------------------------
// Food Library with Categories
// ----------------------------
export const foodCategories = {
  "Comfort Foods": [
    "CreamySalmonPate", "WarmChickenBroth", "TunaFlakes", "CrispyBaconBits", 
    "CheeseMeltMorsels", "OceanWhitefishStew", "MashedSweetPotatoMedley",
    "ButteryBreadCrumbs", "TurkeyRicePorridge", "ChickenNoodleSoup"
  ],
  "Street Memories": [
    "LeftoverPizzaCrust", "DiscardedSandwich", "MilkFromTrashBin", "StreetFishScraps", 
    "TinCanTuna", "SpoiledBeefBits", "CannedSardineDrippings", "StaleBreadCrumbs",
    "WiltedLettuceBits", "GardenSnailSnack"
  ],
  "Playful Treats": [
    "CatnipCookies", "SalmonJerkyStrips", "CrunchyTunaBiscuits", "MouseshapedCheeseTreats", 
    "YarnBallCandy", "ButterflySprinkles", "FrogshapedMousseBites", "HedgehogCrunchies",
    "FeatherCrispNibbles", "LadybugBerryBites"
  ],
  "Healthy Essentials": [
    "VitaminRichKibble", "ProbioticYogurt", "SpinachCatBiscuits", "CarrotPuree", 
    "SweetPotatoChips", "ParsleyPowerPellets", "CornFiberCrunch", "AppleCiderGel",
    "Omega3FishOilBites", "BrownRiceVegMix"
  ],
  "Luxury Indulgences": [
    "LobsterDelight", "DuckALOrange", "CaviarMousse", "TruffleCatTreats", 
    "CrabShrimpMedley", "WagyuBeefSliders", "GourmetPrawnSupreme", "VenisonStew",
    "QuailEggCustard", "BrieSalmonFloss"
  ]
};

export const foodLibrary = {
  // Comfort Foods
  CreamySalmonPate: { 
    emoji: "🍣", 
    happiness: 20, 
    hunger: 25, 
    category: "Comfort Foods",
    preference: "Likes",
    description: "Reminds her of her first comforting meal after rescue."
  },
  WarmChickenBroth: { 
    emoji: "🍗", 
    happiness: 18, 
    hunger: 15, 
    category: "Comfort Foods",
    preference: "Likes",
    description: "Warms her, recalling gentle care when ill."
  },
  TunaFlakes: { 
    emoji: "🐟", 
    happiness: 12, 
    hunger: 20, 
    category: "Comfort Foods",
    preference: "Neutral",
    description: "Familiar taste but sometimes too salty."
  },
  CrispyBaconBits: { 
    emoji: "🥓", 
    happiness: 22, 
    hunger: 18, 
    category: "Comfort Foods",
    preference: "Likes",
    description: "Crunchy indulgence that makes her feel pampered."
  },
  CheeseMeltMorsels: { 
    emoji: "🧀", 
    happiness: 20, 
    hunger: 15, 
    category: "Comfort Foods",
    preference: "Likes",
    description: "Rich flavor that soothes her starved memories."
  },
  OceanWhitefishStew: { 
    emoji: "🐠", 
    happiness: 18, 
    hunger: 22, 
    category: "Comfort Foods",
    preference: "Likes",
    description: "Gentle taste reminding her of safety by the sea."
  },
  MashedSweetPotatoMedley: { 
    emoji: "🥔", 
    happiness: 15, 
    hunger: 20, 
    category: "Comfort Foods",
    preference: "Likes",
    description: "Soft texture that comforts her like a hug."
  },
  ButteryBreadCrumbs: { 
    emoji: "🍞", 
    happiness: 16, 
    hunger: 15, 
    category: "Comfort Foods",
    preference: "Likes",
    description: "Simple warmth recalling home-baked treats."
  },
  TurkeyRicePorridge: { 
    emoji: "🍲", 
    happiness: 17, 
    hunger: 25, 
    category: "Comfort Foods",
    preference: "Likes",
    description: "Soft meal that reminds her of tender care."
  },
  ChickenNoodleSoup: { 
    emoji: "🍜", 
    happiness: 19, 
    hunger: 22, 
    category: "Comfort Foods",
    preference: "Likes",
    description: "Brothy warmth echoing kind hands that rescued her."
  },

  // Street Memories
  LeftoverPizzaCrust: { 
    emoji: "🍕", 
    happiness: 5, 
    hunger: 15, 
    category: "Street Memories",
    preference: "Dislikes",
    description: "Memories of hunger and scavenging."
  },
  DiscardedSandwich: { 
    emoji: "🥪", 
    happiness: 6, 
    hunger: 18, 
    category: "Street Memories",
    preference: "Dislikes",
    description: "Stale taste reminding her of cold nights."
  },
  MilkFromTrashBin: { 
    emoji: "🍼", 
    happiness: 10, 
    hunger: 12, 
    category: "Street Memories",
    preference: "Neutral",
    description: "Mixed feelings from survival instincts."
  },
  StreetFishScraps: { 
    emoji: "🐟", 
    happiness: 15, 
    hunger: 20, 
    category: "Street Memories",
    preference: "Likes",
    description: "Grateful for rare fulfilling meal on the streets."
  },
  TinCanTuna: { 
    emoji: "🥫", 
    happiness: 10, 
    hunger: 18, 
    category: "Street Memories",
    preference: "Neutral",
    description: "Necessary but too metallic for comfort."
  },
  SpoiledBeefBits: { 
    emoji: "🍖", 
    happiness: 5, 
    hunger: 15, 
    category: "Street Memories",
    preference: "Dislikes",
    description: "Sour smell echoing days of neglect."
  },
  CannedSardineDrippings: { 
    emoji: "🥫", 
    happiness: 10, 
    hunger: 16, 
    category: "Street Memories",
    preference: "Neutral",
    description: "Fills her belly but lacks warmth."
  },
  StaleBreadCrumbs: { 
    emoji: "🥖", 
    happiness: 6, 
    hunger: 12, 
    category: "Street Memories",
    preference: "Dislikes",
    description: "Dry taste recalling abandoned days."
  },
  WiltedLettuceBits: { 
    emoji: "🥗", 
    happiness: 8, 
    hunger: 10, 
    category: "Street Memories",
    preference: "Neutral",
    description: "Bland reminder of desperate foraging."
  },
  GardenSnailSnack: { 
    emoji: "🐌", 
    happiness: 16, 
    hunger: 15, 
    category: "Street Memories",
    preference: "Likes",
    description: "Unexpected delicacy in harsh times."
  },

  // Playful Treats
  CatnipCookies: { 
    emoji: "🐾", 
    happiness: 30, 
    hunger: 10, 
    category: "Playful Treats",
    preference: "Likes",
    description: "Saturday afternoons chasing butterflies."
  },
  SalmonJerkyStrips: { 
    emoji: "🦴", 
    happiness: 25, 
    hunger: 15, 
    category: "Playful Treats",
    preference: "Likes",
    description: "Playful texture fueling her energy."
  },
  CrunchyTunaBiscuits: { 
    emoji: "🍪", 
    happiness: 22, 
    hunger: 12, 
    category: "Playful Treats",
    preference: "Likes",
    description: "Fun crunch that sparks joyous play."
  },
  MouseshapedCheeseTreats: { 
    emoji: "🐭", 
    happiness: 15, 
    hunger: 10, 
    category: "Playful Treats",
    preference: "Neutral",
    description: "Adorable shape, ordinary taste."
  },
  YarnBallCandy: { 
    emoji: "🧶", 
    happiness: 8, 
    hunger: 8, 
    category: "Playful Treats",
    preference: "Dislikes",
    description: "Playful appearance but bland flavor."
  },
  ButterflySprinkles: { 
    emoji: "🦋", 
    happiness: 12, 
    hunger: 6, 
    category: "Playful Treats",
    preference: "Neutral",
    description: "Pretty but not very tasty."
  },
  FrogshapedMousseBites: { 
    emoji: "🐸", 
    happiness: 13, 
    hunger: 10, 
    category: "Playful Treats",
    preference: "Neutral",
    description: "Novel shape, indifferent taste."
  },
  HedgehogCrunchies: { 
    emoji: "🦔", 
    happiness: 20, 
    hunger: 12, 
    category: "Playful Treats",
    preference: "Likes",
    description: "Fun crunch that tickles her tongue."
  },
  FeatherCrispNibbles: { 
    emoji: "🦜", 
    happiness: 22, 
    hunger: 10, 
    category: "Playful Treats",
    preference: "Likes",
    description: "Light flavor that feels like flight."
  },
  LadybugBerryBites: { 
    emoji: "🐞", 
    happiness: 13, 
    hunger: 8, 
    category: "Playful Treats",
    preference: "Neutral",
    description: "Sweet but too small for satisfaction."
  },

  // Healthy Essentials
  VitaminRichKibble: { 
    emoji: "🌾", 
    happiness: 15, 
    hunger: 25, 
    category: "Healthy Essentials",
    preference: "Likes",
    description: "Energy boost aiding her recovery."
  },
  ProbioticYogurt: { 
    emoji: "🥛", 
    happiness: 10, 
    hunger: 12, 
    category: "Healthy Essentials",
    preference: "Neutral",
    description: "Healthful but too bland."
  },
  SpinachCatBiscuits: { 
    emoji: "🥦", 
    happiness: 5, 
    hunger: 15, 
    category: "Healthy Essentials",
    preference: "Dislikes",
    description: "Unpleasant texture reminding of vet visits."
  },
  CarrotPuree: { 
    emoji: "🥕", 
    happiness: 10, 
    hunger: 15, 
    category: "Healthy Essentials",
    preference: "Neutral",
    description: "Healthy but not her favorite."
  },
  SweetPotatoChips: { 
    emoji: "🍠", 
    happiness: 18, 
    hunger: 20, 
    category: "Healthy Essentials",
    preference: "Likes",
    description: "Soft sweetness nourishing her body."
  },
  ParsleyPowerPellets: { 
    emoji: "🌿", 
    happiness: 8, 
    hunger: 15, 
    category: "Healthy Essentials",
    preference: "Neutral",
    description: "Good for digestion, lacks flavor."
  },
  CornFiberCrunch: { 
    emoji: "🌽", 
    happiness: 10, 
    hunger: 18, 
    category: "Healthy Essentials",
    preference: "Neutral",
    description: "Filling but plain."
  },
  AppleCiderGel: { 
    emoji: "🍎", 
    happiness: 12, 
    hunger: 10, 
    category: "Healthy Essentials",
    preference: "Neutral",
    description: "Tangy health boost, minor excitement."
  },
  Omega3FishOilBites: { 
    emoji: "🍣", 
    happiness: 16, 
    hunger: 15, 
    category: "Healthy Essentials",
    preference: "Likes",
    description: "Shiny coat support reminding of care."
  },
  BrownRiceVegMix: { 
    emoji: "🍚", 
    happiness: 10, 
    hunger: 22, 
    category: "Healthy Essentials",
    preference: "Neutral",
    description: "Balanced nutrition, forgettable taste."
  },

  // Luxury Indulgences
  LobsterDelight: { 
    emoji: "🦞", 
    happiness: 28, 
    hunger: 25, 
    category: "Luxury Indulgences",
    preference: "Likes",
    description: "Lavish treat making her feel cherished."
  },
  DuckALOrange: { 
    emoji: "🦆", 
    happiness: 15, 
    hunger: 22, 
    category: "Luxury Indulgences",
    preference: "Neutral",
    description: "Fancy aroma, unfamiliar flavor."
  },
  CaviarMousse: { 
    emoji: "🥂", 
    happiness: 25, 
    hunger: 20, 
    category: "Luxury Indulgences",
    preference: "Likes",
    description: "Luxurious texture that pampers her palate."
  },
  TruffleCatTreats: { 
    emoji: "🍄", 
    happiness: 5, 
    hunger: 15, 
    category: "Luxury Indulgences",
    preference: "Dislikes",
    description: "Too rich and earthy for her liking."
  },
  CrabShrimpMedley: { 
    emoji: "🦀", 
    happiness: 26, 
    hunger: 25, 
    category: "Luxury Indulgences",
    preference: "Likes",
    description: "Seafood feast celebrating her rescue."
  },
  WagyuBeefSliders: { 
    emoji: "🥩", 
    happiness: 27, 
    hunger: 28, 
    category: "Luxury Indulgences",
    preference: "Likes",
    description: "Premium taste that honors her survival."
  },
  GourmetPrawnSupreme: { 
    emoji: "🍤", 
    happiness: 15, 
    hunger: 20, 
    category: "Luxury Indulgences",
    preference: "Neutral",
    description: "Tasty but a bit too delicate."
  },
  VenisonStew: { 
    emoji: "🍖", 
    happiness: 15, 
    hunger: 28, 
    category: "Luxury Indulgences",
    preference: "Neutral",
    description: "Hearty but reminds her of tough times."
  },
  QuailEggCustard: { 
    emoji: "🥚", 
    happiness: 22, 
    hunger: 18, 
    category: "Luxury Indulgences",
    preference: "Likes",
    description: "Silky smoothness comforting her spirit."
  },
  BrieSalmonFloss: { 
    emoji: "🧀", 
    happiness: 24, 
    hunger: 20, 
    category: "Luxury Indulgences",
    preference: "Likes",
    description: "Creamy blend evoking warm cuddles."
  }
};

// Get an array of food names for selection
export const foodNames = Object.keys(foodLibrary);

// ----------------------------
// Food Item Component for selection
// ----------------------------
function FoodItem({ foodKey, onSelect, quantity, price, isOwned, onShowDetails }) {
  const food = foodLibrary[foodKey];
  
  const handlePress = () => {
    if (onShowDetails) {
      onShowDetails(foodKey);
    } else {
      onSelect(foodKey);
    }
  };
  
  if (!food) return null;
  
  // Get preference display and color
  const getPreferenceColor = (preference) => {
    switch (preference) {
      case 'Likes': return '#4CAF50'; // Green
      case 'Neutral': return '#FFC107'; // Amber
      case 'Dislikes': return '#F44336'; // Red
      default: return '#888888'; // Gray for unknown
    }
  };
  
  return (
    <TouchableOpacity style={styles.foodItemContainer} onPress={handlePress}>
      {/* Move quantity badge to the top left of the overall container */}
      {quantity > 0 && (
        <View style={styles.quantityBadge}>
          <Text style={styles.quantityText}>{quantity}</Text>
        </View>
      )}
      
      {/* Move preference indicator to the top right of the overall container */}
      <View style={[
        styles.preferenceIndicator, 
        { backgroundColor: isOwned ? getPreferenceColor(food.preference) : '#888888' }
      ]}>
        <Text style={styles.preferenceIndicatorText}>
          {isOwned ? food.preference.charAt(0) : '?'}
        </Text>
      </View>
      
      <View style={styles.foodImageContainer}>
        <Text style={styles.foodEmoji}>{food.emoji}</Text>
        {!isOwned && price && (
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>💰 {price}</Text>
          </View>
        )}
      </View>
      <Text style={styles.foodName}>{food.displayName || foodKey.replace(/([A-Z])/g, ' $1').trim()}</Text>
    </TouchableOpacity>
  );
}

// Add this export statement right after the component definition
export { FoodItem };

// Food Details Modal Component - moved from FoodItem to be rendered at the app root level
function FoodDetailsModal({ foodKey, onBuy, onCancel, visible, price, isPurchased, ownedQuantity = 0, onFeed }) {
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const food = foodLibrary[foodKey];
  
  if (!visible || !food) return null;
  
  const handleBuy = () => {
    // Pass the quantity to the purchase handler
    onBuy(foodKey, selectedQuantity);
  };
  
  // Function to get color based on preference
  const getPreferenceColor = (preference) => {
    switch (preference) {
      case 'Likes': return '#4CAF50'; // Green
      case 'Neutral': return '#FFC107'; // Amber
      case 'Dislikes': return '#F44336'; // Red
      default: return '#FFFFFF'; // White
    }
  };
  
  return (
    <View style={styles.modalOverlay}>
      <View style={styles.foodDetailModal}>
        {/* Close button (X) at top right */}
        <TouchableOpacity style={styles.modalCloseButton} onPress={onCancel}>
          <Text style={styles.modalCloseButtonText}>✕</Text>
        </TouchableOpacity>
        
        <Text style={styles.foodDetailTitle}>
          {food.emoji} {foodKey.replace(/([A-Z])/g, ' $1').trim()}
        </Text>
        
        <View style={[styles.preferenceTag, { backgroundColor: isPurchased ? getPreferenceColor(food.preference) : '#888' }]}>
          <Text style={styles.preferenceText}>Preference: {isPurchased ? food.preference : '???'}</Text>
        </View>
        
        <Text style={styles.foodDescription}>{food.description}</Text>
        
        <View style={styles.nutritionInfo}>
          <Text style={styles.nutritionText}>Hunger: +{food.hunger}</Text>
          <Text style={styles.nutritionText}>Happiness: {isPurchased ? `+${food.happiness}` : '???'}</Text>
        </View>
        
        {/* Show owned quantity if any */}
        {ownedQuantity > 0 && (
          <Text style={styles.ownedQuantityText}>Owned: {ownedQuantity}</Text>
        )}
        
        {ownedQuantity > 0 ? (
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.feedButton, { flex: 1 }]} 
              onPress={() => {
                onCancel(); // Close modal
                onFeed(foodKey); // Feed the cat
              }}
            >
              <Text style={styles.buttonText}>Feed Cat</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.quantityContainer}>
              <Text style={styles.quantityLabel}>Quantity:</Text>
              <View style={styles.quantitySelector}>
                <TouchableOpacity 
                  style={styles.quantityButton}
                  onPress={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                >
                  <Text style={styles.quantityButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.quantityValue}>{selectedQuantity}</Text>
                <TouchableOpacity 
                  style={styles.quantityButton}
                  onPress={() => setSelectedQuantity(selectedQuantity + 1)}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <Text style={styles.totalPrice}>Total: 💰 {price * selectedQuantity}</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.buyButton} onPress={handleBuy}>
                <Text style={styles.buttonText}>Buy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// Add this export statement right after the component definition
export { FoodDetailsModal };

// ----------------------------
// Food Selection Panel Component
// ----------------------------
const FoodSelectionPanel = React.memo(React.forwardRef(function FoodSelectionPanel(
  { 
    onSelectFood, 
    onClose,
    money, 
    setMoney,
    onInitiatePurchase,
    onShowFoodDetails,
    purchasedFoods,
    ownedFood,
    setOwnedFood
  }, 
  ref
) {
  const router = useRouter();
  
  // Expose method to add owned food
  React.useImperativeHandle(ref, () => ({
    addOwnedFood: (foodKey) => {
      setOwnedFood(prev => ({
        ...prev,
        [foodKey]: (prev[foodKey] || 0) + 1
      }));
    }
  }));
  
  // Handle selecting food
  const handleSelectItem = (foodKey, quantity = 1) => {
    if (ownedFood[foodKey] > 0) {
      // If already owned, use it directly
      onSelectFood(foodKey);
      // Reduce quantity
      setOwnedFood(prev => ({
        ...prev,
        [foodKey]: Math.max(0, prev[foodKey] - 1)
      }));
    } else {
      // This case should not happen in the storage-only mode
      console.warn("Tried to select unowned food in Storage mode");
    }
  };
  
  // Go to shop food section
  const handleGoToShop = () => {
    router.push({
      pathname: '/Shop',
      params: { tab: 'food' }
    });
  };
  
  // Group owned foods by category
  const getOwnedFoodsByCategory = () => {
    const result = {};
    
    
    Object.entries(ownedFood).forEach(([foodKey, quantity]) => {
      if (quantity > 0) {
        const food = foodLibrary[foodKey];
        if (food) {
          const category = food.category;
          if (!result[category]) {
            result[category] = [];
          }
          result[category].push({ key: foodKey, quantity });
          
        } else {
          console.warn(`Food key ${foodKey} not found in foodLibrary`);
        }
      }
    });
    
    return result;
  };
  
  // Use useMemo to prevent recalculating on every render
  const ownedFoodsByCategory = useMemo(() => getOwnedFoodsByCategory(), [ownedFood]);
  const hasFoodItems = Object.keys(ownedFoodsByCategory).length > 0;
  
  return (
    <View style={styles.foodSelectionContainer} ref={ref}>
      {/* Food storage title with close button */}
      <View style={styles.storageTitleContainer}>
        <Text style={styles.storageTitle}>Food Storage</Text>
        <View style={styles.headerButtonsContainer}>
          <TouchableOpacity style={styles.shopButton} onPress={handleGoToShop}>
            <Text style={styles.shopButtonText}>Go to Shop</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Rest of food panel content */}
      <ScrollView 
        style={styles.foodPanelScrollView}
        contentContainerStyle={styles.foodPanelScrollContent}
      >
        {hasFoodItems ? (
          // Display foods by category in horizontal rows
          Object.entries(ownedFoodsByCategory).map(([category, foods]) => (
            <View key={category} style={styles.foodCategoryContainer}>
              <Text style={styles.foodCategoryTitle}>{category}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.foodRowScroll}>
                {foods.map(({ key, quantity }) => (
                  <FoodItem 
                    key={key} 
                    foodKey={key} 
                    onSelect={handleSelectItem} 
                    quantity={quantity}
                    isOwned={true}
                    onShowDetails={onShowFoodDetails}
                  />
                ))}
              </ScrollView>
            </View>
          ))
        ) : (
          // Display message when no food is available
          <View style={styles.emptyStorageContainer}>
            <Text style={styles.emptyStorageText}>No food items in storage</Text>
            <TouchableOpacity style={styles.shopButton} onPress={handleGoToShop}>
              <Text style={styles.shopButtonText}>Go to Shop</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      
      {/* Shop button was moved to the top */}
    </View>
  );
}));

// Add this export statement right after the component definition
export { FoodSelectionPanel };

// ----------------------------
// Speech Bubble Component
// ----------------------------
function SpeechBubble({ message, position }) {
  return (
    <View style={[styles.speechBubble, { top: position.top, left: position.left }]}>
      <Text style={styles.speechBubbleText}>{message}</Text>
    </View>
  );
}

export default function CatSection({ navigation, route, onFurnitureModeChange, onModeChange, money, setMoney }) {
  // Add router at component level, not inside handlers
  const router = useRouter();
  
  const [stats, setStats] = useState({
    hunger: 50, // Default to 50% if not in AsyncStorage
    clean: 40,  // Default to 40% if not in AsyncStorage (changed from 50%)
    happy: 50,  // Default to 50% happiness level
    name: "Whiskers", // Default cat name
    age: "2 years", // Default cat age
    weight: "4.5 kg" // Default cat weight
  });

  // Animation loading states
  const [animationsLoaded, setAnimationsLoadedState] = useState(areAnimationsLoaded());
  const [preloadingAnimation, setPreloadingAnimation] = useState('');
  const [preloadingFrameIndex, setPreloadingFrameIndex] = useState(0);
  
  // Add running state to track if cat is running
  const [isRunning, setIsRunning] = useState(false);
  
  // Preload all animations by playing them off-screen - only if not already loaded
  useEffect(() => {
    const initializeAnimations = async () => {
      // First check if animations were previously loaded
      const previouslyLoaded = await checkAnimationLoadedState();
      
      if (previouslyLoaded) {
        console.log('Animations were previously loaded, skipping preload');
        setAnimationsLoadedState(true);
        return;
      }
      
      // Only load if not already loaded globally
      if (!areAnimationsLoaded() && !animationsLoaded) {
        console.log('Loading all animations...');
        setPreloadingAnimation('All animations');
        
        try {
          // For React Native, we'll use a simpler approach by rendering all animations offscreen at once
          setTimeout(() => {
            console.log('All animations preloaded!');
            // Set both local and global animation loaded state
            setAnimationsLoadedState(true);
            setAnimationsLoaded(); // Set global flag
            saveAnimationLoadedState(); // Save to AsyncStorage for app restarts
            setPreloadingAnimation(null);
          }, 500); // Short timeout to ensure the hidden preloader has time to render
        } catch (err) {
          console.error('Error preloading animations:', err);
          // Set loaded anyway to prevent blocking the app
          setAnimationsLoadedState(true);
          setAnimationsLoaded(); // Set global flag even if there was an error
          setPreloadingAnimation(null);
        }
      } else {
        console.log('Animations already loaded, skipping preload');
      }
    };
    
    initializeAnimations();
    console.log('hihihi')
  }, []);
  
  // Add daily streak state
  const [dailyStreak, setDailyStreak] = useState(0);
  
  // Money is now passed as a prop, so we don't need to declare it here
  
  // Add diamonds state
  const [diamonds, setDiamonds] = useState(100);
  
  // Add owned food state at component level
  const [ownedFood, setOwnedFood] = useState({
    CreamySalmonPate: 5,
    TunaFlakes: 3,
    ChickenNoodleSoup: 2,
    ButteryBreadCrumbs: 4,
    CatnipCookies: 1
  });
  
  // Add owned furniture state at component level
  const [ownedFurniture, setOwnedFurniture] = useState({});

  // Add state for dust particles
  const [showDustParticles, setShowDustParticles] = useState(false);

  // Load player data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load cat data from AsyncStorage
        const [
          storedStats, 
          streakValue, 
          foodData,
          ownedFurnitureItems
        ] = await Promise.all([
          loadStats(),
          loadDailyStreak(),
          loadFoodData(),
          loadOwnedFurniture()
        ]);
        
        // Make sure we have stats in the expected format (replace 'bored' with 'happy' if needed)
        const formattedStats = { ...storedStats };
        if ('bored' in formattedStats && !('happy' in formattedStats)) {
          formattedStats.happy = formattedStats.bored;
          delete formattedStats.bored;
          
          // Save the corrected format back to storage
          saveStats(formattedStats);
        }
        
        // Update state with AsyncStorage data
        setStats(formattedStats);
        setDailyStreak(streakValue);
        
        // Process the consolidated food data into separate state variables
        const ownedFoodItems = {};
        const purchasedFoodsData = {};
          
        // Convert the consolidated data into the two separate formats
        Object.entries(foodData).forEach(([key, data]) => {
          if (data.quantity > 0) {
            ownedFoodItems[key] = data.quantity;
          }
          if (data.purchased) {
            purchasedFoodsData[key] = true;
          }
        });
        
        setOwnedFood(ownedFoodItems);
        setPurchasedFoods(purchasedFoodsData);
        setOwnedFurniture(ownedFurnitureItems);
        
        // Process any pending food rewards from chests
        const pendingRewards = await AsyncStorage.getItem('pendingFoodRewards');
        if (pendingRewards) {
          try {
            const foodRewards = JSON.parse(pendingRewards);
            if (foodRewards && foodRewards.length > 0) {
              // Update the consolidated food data with rewards
              foodRewards.forEach(foodKey => {
                if (!foodData[foodKey]) {
                  foodData[foodKey] = { quantity: 0, purchased: true };
                }
                foodData[foodKey].quantity += 1;
              });
              
              // Save the updated food data
              await saveFoodData(foodData);
              
              // Also update the local state for UI
              const updatedOwnedFood = { ...ownedFoodItems };
              foodRewards.forEach(foodKey => {
                updatedOwnedFood[foodKey] = (updatedOwnedFood[foodKey] || 0) + 1;
              });
              
              setOwnedFood(updatedOwnedFood);
              
              // Clear the pending rewards
              await AsyncStorage.removeItem('pendingFoodRewards');
              
              // Show a notification
              setSpeechBubbleContent(`Got new food: ${foodRewards.join(', ')}`);
              setShowSpeechBubble(true);
              setTimeout(() => setShowSpeechBubble(false), 3000);
            }
          } catch (e) {
            console.error('Error processing food rewards:', e);
          }
        }
        
        // Ensure parent components know we're in default mode (show deck selection and rewards)
        setIsEditMode(false);
        setIsFeedingMode(false);
        
        // Explicitly notify parent components
        if (onFurnitureModeChange) {
          onFurnitureModeChange(false);
        }
        if (onModeChange) {
          onModeChange(true);
        }
        
      } catch (error) {
        console.error('Error loading cat data:', error);
      }
    };
    
    loadData();
  }, []);
  
  // Reload data when the screen is focused to ensure it's up to date
  // This is particularly important for food data when coming back from Shop
  useFocusEffect(
    React.useCallback(() => {
      const refreshData = async () => {
        try {
          // Load all data that might have changed
          const [
            foodData,
            currentStats
          ] = await Promise.all([
            loadFoodData(),
            loadStats()
          ]);
          
          // Convert to the formats needed by the current component
          const ownedFoodItems = {};
          const purchasedFoodsData = {};
          
          // Process the consolidated data into the two separate formats
          Object.entries(foodData).forEach(([key, data]) => {
            if (data.quantity > 0) {
              ownedFoodItems[key] = data.quantity;
            }
            if (data.purchased) {
              purchasedFoodsData[key] = true;
            }
          });
          
          // Make sure we have stats in the expected format
          const formattedStats = { ...currentStats };
          if ('bored' in formattedStats && !('happy' in formattedStats)) {
            formattedStats.happy = formattedStats.bored;
            delete formattedStats.bored;
            
            // Save the corrected format back to storage
            saveStats(formattedStats);
          }
          
          // Update state with refreshed data
          setStats(formattedStats);
          setOwnedFood(ownedFoodItems);
          setPurchasedFoods(purchasedFoodsData);
        } catch (error) {
          console.error('Error refreshing data on focus:', error);
        }
      };
      
      refreshData();
      
      return () => {};
    }, [])
  );
  
  // Save stats whenever they change
  useEffect(() => {
    if (Object.values(stats).some(val => val !== 0)) {
      saveStats(stats);
    }
  }, [stats]);
  
  // Save owned food to AsyncStorage whenever it changes
  useEffect(() => {
    if (Object.keys(ownedFood).length > 0) {
      saveOwnedFood(ownedFood);
    }
  }, [ownedFood]);
  
  // Save purchased foods to AsyncStorage whenever they change
  useEffect(() => {
    if (Object.keys(purchasedFoods).length > 0) {
      savePurchasedFoods(purchasedFoods);
    }
  }, [purchasedFoods]);
  

  const [isEditMode, setIsEditMode] = useState(false);
  const [isFeedingMode, setIsFeedingMode] = useState(false);
  const [showRemoveButton, setShowRemoveButton] = useState(false);
  const [selectedItemForRemoval, setSelectedItemForRemoval] = useState(null);
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const [speechBubbleContent, setSpeechBubbleContent] = useState("");
  const [speechBubblePosition, setSpeechBubblePosition] = useState({ top: 0, left: 0 });
  
  // Fix missing isMovingFurniture state variable
  const [isMovingFurniture, setIsMovingFurniture] = useState(false);
  const [originalPosition, setOriginalPosition] = useState(null);
  
  // Simplified cat state - only keep direction for sprite rendering
  const [catDirection, setCatDirection] = useState(1); // 1 = right, -1 = left
  const [frameIndex, setFrameIndex] = useState(0);
  const [currentAnimation, setCurrentAnimation] = useState('Idle');

  // Notify parent component when furniture mode changes
  useEffect(() => {
    if (onFurnitureModeChange) {
      // Only notify for edit mode, not feeding mode
      onFurnitureModeChange(isEditMode);
    }
  }, [isEditMode, onFurnitureModeChange]);

  const [decorations, setDecorations] = useState([
    // Only include the cat, no initial furniture
    { id: 'cat', itemKey: 'catSprite', roomRow: Math.floor(ROOM_ROWS / 2), roomCol: Math.floor(ROOM_COLS / 2) },
  ]);

  const [selectedDecorationId, setSelectedDecorationId] = useState(null);
  
  // Cat sprite animation effect - keep this for animation frames
  useEffect(() => {
    const animation = catAnimations[currentAnimation];
    
    if (!animation) {
      console.warn(`Animation "${currentAnimation}" not found in catAnimations library`);
      return;
    }
    
    // Advance frames
    const timer = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % animation.frames);
    }, animationInterval);
    
    // Clean up timer when component unmounts or dependencies change
    return () => clearInterval(timer);
  }, [currentAnimation, animationInterval]); // Add animationInterval as dependency

  // Track the position of the selected decoration for the remove button
  const [removeButtonPosition, setRemoveButtonPosition] = useState({ top: 0, left: 0 });
  
  // Make the room area take a ref so we can force click it
  const roomAreaRef = useRef(null);

  // State to track if we're in moving mode (completely separate from selection)
  const [movingMode, setMovingMode] = useState(false);
  
  // Reference to store original touch position when moving starts
  const touchStartRef = useRef({ x: 0, y: 0 });

  // Completely override the RoomDecorationItem's default behavior when selected
  const handleRoomAreaOverride = (event) => {
    // Directly call the room area press handler with the event
    if (isEditMode && selectedDecorationId) {
      handleRoomAreaPress(event);
      // Prevent the original onPress from being called
      return true;
    }
    return false;
  };

  const handleSelectDecoration = (id) => {
    // Only allow selecting decorations when in edit mode
    if (isEditMode && id !== 'cat') {
      const selectedDeco = decorations.find(d => d.id === id);
      if (selectedDeco) {
        // Save original position in case user cancels the move
        setOriginalPosition({
          id: selectedDeco.id,
          roomRow: selectedDeco.roomRow,
          roomCol: selectedDeco.roomCol
        });
        
        // Calculate position for remove button to be directly above the item
        const { roomRow, roomCol, itemKey } = selectedDeco;
        
        let iconOffsetY = 0; // Reduced offset to be directly at the top of the item
        let iconOffsetX = 0;  // Center by default
        
        if (decorationLibrary[itemKey]) {
          const { width } = decorationLibrary[itemKey];
          iconOffsetX = (width * ROOM_SCALE) / 2; // Center over the item
        }
        
        setRemoveButtonPosition({
          top: roomRow * ROOM_CELL_SIZE - iconOffsetY,
          left: roomCol * ROOM_CELL_SIZE + iconOffsetX - 10, // Center the X button
        });
      }
      
      // Always set selected and show buttons when selecting a new decoration
      setSelectedDecorationId(id);
      setShowRemoveButton(true);
      setSelectedItemForRemoval(id);
      setIsMovingFurniture(true);
      setMovingMode(true); // Set moving mode to true
    }
  };

  // Handle confirming the new furniture position
  const handleConfirmPosition = () => {
    setShowRemoveButton(false);
    setSelectedDecorationId(null);
    setSelectedItemForRemoval(null);
    setIsMovingFurniture(false);
    setOriginalPosition(null);
    setMovingMode(false);
  };

  // Handle canceling the move and returning to original position
  const handleCancelMove = () => {
    if (originalPosition) {
      // Return the item to its original position
      setDecorations(
        decorations.map((decoration) =>
          decoration.id === originalPosition.id
            ? { ...decoration, roomRow: originalPosition.roomRow, roomCol: originalPosition.roomCol }
            : decoration
        )
      );
    }
    setShowRemoveButton(false);
    setSelectedDecorationId(null);
    setSelectedItemForRemoval(null);
    setIsMovingFurniture(false);
    setOriginalPosition(null);
    setMovingMode(false);
  };

  // Handle removing an item from the room
  const handleRemoveItem = () => {
    if (selectedItemForRemoval) {
      setDecorations(decorations.filter(deco => deco.id !== selectedItemForRemoval));
      setSelectedDecorationId(null);
      setShowRemoveButton(false);
      setSelectedItemForRemoval(null);
      setIsMovingFurniture(false);
      setOriginalPosition(null);
      setMovingMode(false);
    }
  };

  // Group furniture items by category
  const groupedFurniture = groupFurnitureByCategory(decorationLibrary);

  const handleSelectFurniture = (itemKey) => {
    // Check if this item is already placed
    const existingItem = decorations.find(deco => deco.itemKey === itemKey && deco.id !== 'cat');
    
    if (existingItem) {
      // If it's already placed, remove it from placed and highlight it
      setSelectedDecorationId(existingItem.id);
      setShowRemoveButton(true);
      setSelectedItemForRemoval(existingItem.id);
      setIsMovingFurniture(true);
      setMovingMode(true); // Set moving mode to true for existing items
      
      // Save original position in case user cancels the move
      setOriginalPosition({
        id: existingItem.id,
        roomRow: existingItem.roomRow,
        roomCol: existingItem.roomCol
      });
      
      // Set the position for the remove/confirm buttons directly above the furniture
      const { roomRow, roomCol } = existingItem;
      let iconOffsetY = 0; // Reduced offset to be directly at the top of the item
      let iconOffsetX = 0;
      
      if (decorationLibrary[itemKey]) {
        const { width } = decorationLibrary[itemKey];
        iconOffsetX = (width * ROOM_SCALE) / 2; // Center over the item
      }
      
      setRemoveButtonPosition({
        top: roomRow * ROOM_CELL_SIZE - iconOffsetY,
        left: roomCol * ROOM_CELL_SIZE + iconOffsetX - 10, // Center the X button
      });
    } else {
      // Create a new decoration with the selected furniture
      const newId = `decoration-${Date.now()}`;
      const newDecoration = {
        id: newId,
        itemKey: itemKey,
        roomRow: 15, // Default position - center of room
        roomCol: 15, // Default position - center of room
      };
      
      // Add the new decoration
      setDecorations([...decorations, newDecoration]);
      
      // Set selection state
      setSelectedDecorationId(newId);
      setIsMovingFurniture(true);
      setMovingMode(true); // Set moving mode to true for new items
      
      // Set the position for the remove/confirm buttons directly above the furniture
      const roomRow = 15; // Same as default position above
      const roomCol = 15;
      let iconOffsetY = 0; // Reduced offset to be directly at the top of the item
      let iconOffsetX = 0;
      
      if (decorationLibrary[itemKey]) {
        const { width } = decorationLibrary[itemKey];
        iconOffsetX = (width * ROOM_SCALE) / 2; // Center over the item
      }
      
      setRemoveButtonPosition({
        top: roomRow * ROOM_CELL_SIZE - iconOffsetY,
        left: roomCol * ROOM_CELL_SIZE + iconOffsetX - 10, // Center the X button
      });
      
      // Show the remove button
      setShowRemoveButton(true);
      setSelectedItemForRemoval(newId);
    }
  };

  // We need to separate the touch start and the actual press handler
  const handleRoomTouchStart = (event) => {
    if (isEditMode) {
      // Store the initial touch position
      touchStartRef.current = {
        x: event.nativeEvent.locationX,
        y: event.nativeEvent.locationY
      };
    }
  };

  const [showPetOptions, setShowPetOptions] = useState(false);

  const handleRoomAreaPress = (event) => {
    // If we have a selected decoration, move it (only when in edit mode)
    if (isEditMode && selectedDecorationId && movingMode) {
      const { locationX, locationY } = event.nativeEvent;
      const selectedDecoration = decorations.find(d => d.id === selectedDecorationId);
      
      // If we don't find the decoration, it might have been removed
      if (!selectedDecoration) {
        setSelectedDecorationId(null);
        setShowRemoveButton(false);
        setIsMovingFurniture(false);
        setMovingMode(false);
        return;
      }
      
      // Get the dimensions of the selected decoration
      let decoWidth, decoHeight;
      if (selectedDecoration.itemKey === 'catSprite') {
        decoWidth = frameWidth * CAT_SIZE;
        decoHeight = frameHeight * CAT_SIZE;
      } else {
        const deco = decorationLibrary[selectedDecoration.itemKey];
        decoWidth = deco.width * ROOM_SCALE;
        decoHeight = deco.height * ROOM_SCALE;
      }
      
      // Calculate new position
      const newLeft = locationX - (decoWidth / 2);
      const newTop = locationY - (decoHeight / 2);
      const newCol = Math.round(newLeft / ROOM_CELL_SIZE);
      const newRow = Math.round(newTop / ROOM_CELL_SIZE);
      
      // Update the decoration position
      setDecorations(
        decorations.map((decoration) =>
          decoration.id === selectedDecorationId
            ? { ...decoration, roomRow: newRow, roomCol: newCol }
            : decoration
        )
      );
      
      // Update remove button position
      let iconOffsetY = 0; // Reduced offset to match handleSelectDecoration
      let iconOffsetX = decoWidth / 2; // Center over the item
      
      setRemoveButtonPosition({
        top: newRow * ROOM_CELL_SIZE - iconOffsetY,
        left: newCol * ROOM_CELL_SIZE + iconOffsetX - 10, // Center the X button
      });
    } else {
      // If tapping on empty area while not moving, hide any remove buttons
      setShowRemoveButton(false);
      setSelectedDecorationId(null);
      setSelectedItemForRemoval(null);
      setIsMovingFurniture(false);
      setOriginalPosition(null);
      setMovingMode(false);
    }
  };

  // Toggle edit mode handler
  const handleToggleEditMode = () => {
    const newEditMode = !isEditMode;
    setIsEditMode(newEditMode);
    
    // Reset selection state when toggling edit mode
    setSelectedDecorationId(null);
    setShowRemoveButton(false);
    setSelectedItemForRemoval(null);
    
    // Exit feeding mode if needed
    if (newEditMode) {
      setIsFeedingMode(false);
    }
    
    // Notify parent component about furniture mode change
    if (onFurnitureModeChange) {
      onFurnitureModeChange(newEditMode);
    }
  };

  // Update feeding mode handler
  const handleFeedMode = () => {
    setIsFeedingMode(!isFeedingMode);
    
    // Exit edit mode if needed
    if (!isFeedingMode) {
      setIsEditMode(false);
      // Notify parent component about furniture mode change
      if (onFurnitureModeChange) {
        onFurnitureModeChange(false);
      }
    }
  };

  // Handle selecting food from storage
  const handleSelectFood = (foodKey) => {
    // Skip if cat is running
    if (isRunning) return;
    
    // Find the food and update stats
    const food = foodLibrary[foodKey];
    if (food && animationsLoaded && !isAnimating) {
      // Set animating state
      setIsAnimating(true);
      
      // Update hunger and happiness stats
      setStats(prevStats => ({
        ...prevStats,
        hunger: Math.min(100, prevStats.hunger + food.hunger),
        happy: Math.min(100, prevStats.happy + food.happiness)
      }));
      
      // Play appropriate animation based on food preference
      const playFeedingAnimation = async () => {
        const preferenceToAnimation = {
          'Likes': 'Happy',
          'Neutral': 'Idle',
          'Dislikes': 'Hurt'
        };
        
        // Get animation based on preference or default to 'Excited'
        const feedAnimation = preferenceToAnimation[food.preference] || 'Excited';
        
        // Save the current animation to go back to
        const previousAnim = currentAnimation;
        
        // Reset frame index before animation to reduce flickering
        setFrameIndex(0);
        
        // Play the eating animation then return to previous state
        await playAnimationOnce(
          feedAnimation, 
          previousAnim, 
          setCurrentAnimation,
          setFrameIndex,
          catAnimations,
          animationInterval
        );
        
        // Reset animating state
        setIsAnimating(false);
      };
      
      // Start animation sequence
      playFeedingAnimation();
      
      // Update the food in the consolidated food data structure
      loadFoodData().then(foodData => {
        if (foodData[foodKey]) {
          // Reduce the quantity by 1
          foodData[foodKey].quantity = Math.max(0, foodData[foodKey].quantity - 1);
          
          // Save back to AsyncStorage
          saveFoodData(foodData).then(() => {
            // Also update local state for immediate UI response
            setOwnedFood(prev => {
              const newQuantity = Math.max(0, (prev[foodKey] || 0) - 1);
              return {
                ...prev,
                [foodKey]: newQuantity
              };
            });
          });
        }
      }).catch(error => {
        console.error('Error updating food data after feeding:', error);
      });
      
      // Show emoji speech bubble based on cat's preference for this food
      const getReactionEmoji = (preference) => {
        const reactions = {
          'Likes': ["😋", "😻", "🤤", "😍", "😸"],
          'Neutral': ["😐", "🙂", "😶", "🤔", "😑"],
          'Dislikes': ["🤢", "😾", "😖", "😫", "😤"]
        };
        
        const options = reactions[preference] || reactions['Neutral'];
        const randomIndex = Math.floor(Math.random() * options.length);
        return options[randomIndex];
      };
      
      const reactionEmoji = getReactionEmoji(food.preference);
      // Just show the emoji and food emoji
      setSpeechBubbleContent(`${reactionEmoji} ${food.emoji}`);
      
      // Position the speech bubble above the cat
      const catDeco = decorations.find(d => d.id === 'cat');
      if (catDeco) {
        setSpeechBubblePosition({
          top: catDeco.roomRow * ROOM_CELL_SIZE - 40,
          left: catDeco.roomCol * ROOM_CELL_SIZE
        });
      }
      
      setShowSpeechBubble(true);
      
      // Hide speech bubble after 2 seconds
      setTimeout(() => {
        setShowSpeechBubble(false);
      }, 2000);
      
      // Notify parent we're still in food mode
      if (onModeChange) {
        onModeChange(false);
      }
    }
  };

  // Exit feeding mode
  const handleExitFeedMode = () => {
    setIsFeedingMode(false);
    
    // Notify parent we're back in home mode (show review button and chests)
    if (onModeChange) {
      onModeChange(true);
    }
  };

  // Create refs for each dust particle animation
  const dustAnimations = useRef(Array.from({ length: 15 }).map(() => ({
    top: new Animated.Value(Math.random() * (frameHeight * CAT_SIZE)),
    left: new Animated.Value(Math.random() * (frameWidth * CAT_SIZE)),
    opacity: new Animated.Value(0.2 + Math.random() * 0.3) // More translucent
  }))).current;

  // Add renderDecorations function back
  const renderDecorations = () => {
    return (
      <>
        {decorations.map((deco) => {
          // Skip rendering cat directly, as we'll render it later
          if (deco.id === 'cat') return null;
          
          return (
            <RoomDecorationItem
              key={deco.id}
              id={deco.id}
              itemKey={deco.itemKey}
              roomRow={deco.roomRow}
              roomCol={deco.roomCol}
              isSelected={selectedDecorationId === deco.id}
              onSelect={(id) => {
                // If decoration mode is active, use handleSelectFurniture to select the item
                if (isEditMode) {
                  // Use handleSelectFurniture to select the item from the room
                  handleSelectFurniture(deco.itemKey);
                  return true; // Prevent default action
                }
                // Otherwise, use the default room area override
                return handleRoomAreaOverride(id);
              }}
              frameIndex={frameIndex}
              currentAnimation={currentAnimation}
              direction={catDirection}
            />
          );
        })}
        
        {/* Render cat separately */}
        {decorations.map((deco) => {
          if (deco.id === 'cat') {
            return (
              <React.Fragment key={deco.id}>
                {/* Speech bubble for cleaning - positioned directly above cat */}
                {showCleanSpeechBubble && (
                  <View 
                    style={{
                      position: 'absolute',
                      left: deco.roomCol * ROOM_CELL_SIZE + (frameWidth * CAT_SIZE * 0.25),
                      top: deco.roomRow * ROOM_CELL_SIZE - 60,
                      backgroundColor: 'white',
                      borderRadius: 15,
                      padding: 10,
                      zIndex: Math.floor(deco.roomRow) + 20, // Higher zIndex to appear above dust
                      elevation: 5,
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 80,
                      minHeight: 40,
                    }}
                  >
                    <Text style={{ fontSize: 16, textAlign: 'center', flexWrap: 'wrap' }}>{cleanSpeechContent}</Text>
                    <View style={{
                      position: 'absolute',
                      bottom: -10,
                      left: 15,
                      width: 0,
                      height: 0,
                      borderLeftWidth: 10,
                      borderRightWidth: 10,
                      borderTopWidth: 15,
                      borderLeftColor: 'transparent',
                      borderRightColor: 'transparent',
                      borderTopColor: 'white',
                    }} />
                  </View>
                )}
                
                <RoomDecorationItem
                  id={deco.id}
                  itemKey={deco.itemKey}
                  roomRow={deco.roomRow}
                  roomCol={deco.roomCol}
                  isSelected={selectedDecorationId === deco.id}
                  onSelect={handleRoomAreaOverride}
                  frameIndex={frameIndex}
                  currentAnimation={currentAnimation}
                  direction={catDirection}
                  onCatTap={handleCatTap}
                />
                
                {/* Dust particles when showing */}
                {showDustParticles && (
                  <View 
                    style={{
                      position: 'absolute',
                      left: deco.roomCol * ROOM_CELL_SIZE - 10,
                      top: deco.roomRow * ROOM_CELL_SIZE - 10,
                      width: frameWidth * CAT_SIZE + 20,
                      height: frameHeight * CAT_SIZE + 20,
                      zIndex: Math.floor(deco.roomRow) + 16,
                    }}
                  >
                    {dustAnimations.map((anim, index) => (
                      <Animated.View 
                        key={index}
                        style={{
                          position: 'absolute',
                          transform: [
                            { translateX: anim.left },
                            { translateY: anim.top },
                            { rotate: `${Math.random() * 360}deg` }
                          ],
                          width: 3 + Math.random() * 4,
                          height: 3 + Math.random() * 4,
                          backgroundColor: 'rgba(0, 0, 0, 0.5)', // Black, translucent
                          borderRadius: 2,
                          opacity: anim.opacity
                        }}
                      />
                    ))}
                  </View>
                )}
              </React.Fragment>
            );
          }
          return null;
        })}
      </>
    );
  };

  // Update the MoneyIndicator component
  const MoneyIndicator = () => (
    <View style={styles.moneyIndicator}>
      <View style={styles.streakContainer}>
        <Text style={styles.streakIcon}>🔥</Text>
        <Text style={styles.streakCount}>{dailyStreak}</Text>
      </View>
      <Text style={styles.moneyIcon}>💰</Text>
      <Text style={styles.moneyText}>{money}</Text>
    </View>
  );

  // Add purchase confirmation states
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseItem, setPurchaseItem] = useState(null);
  const [purchaseType, setPurchaseType] = useState(null); // 'furniture' or 'food'
  
  // Handle initiating a purchase
  const handleInitiatePurchase = (item, type, quantity = 1) => {
    setPurchaseItem(item);
    setPurchaseType(type);
    // Also store the quantity for food purchases
    setPurchaseQuantity(quantity);
    setIsPurchasing(true);
  };
  
  // Add state for purchase quantity
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  
  // Handle confirming a purchase
  const handleConfirmPurchase = () => {
    if (!purchaseItem) return;
    
    if (purchaseType === 'furniture') {
      const price = furniturePrices[purchaseItem] || 0;
      
      if (money >= price) {
        // Deduct money and immediately save
        const newMoney = money - price;
        setMoney(newMoney);
        
        // Update local owned furniture state
        setOwnedFurniture(prev => {
          const updated = {
            ...prev,
            [purchaseItem]: true
          };
          return updated;
        });
        
        // Add to owned items in furniture panel
        if (furnitureRef.current && furnitureRef.current.addOwnedItem) {
          furnitureRef.current.addOwnedItem(purchaseItem);
        }
      } else {
        alert('Not enough money to buy this item!');
      }
    } else if (purchaseType === 'food') {
      const price = foodPrices[purchaseItem] || 0;
      const totalPrice = price * purchaseQuantity;
      
      if (money >= totalPrice) {
        // Deduct money based on quantity
        const newMoney = money - totalPrice;
        setMoney(newMoney);
        
        // Add to owned food in food panel, respect quantity
        if (foodPanelRef.current && foodPanelRef.current.addOwnedFood) {
          for (let i = 0; i < purchaseQuantity; i++) {
            foodPanelRef.current.addOwnedFood(purchaseItem);
          }
        }
      } else {
        alert('Not enough money to buy this food!');
      }
    }
    
    // Reset purchase state
    setIsPurchasing(false);
    setPurchaseItem(null);
    setPurchaseType(null);
    setPurchaseQuantity(1);
  };
  
  // Handle canceling a purchase
  const handleCancelPurchase = () => {
    setIsPurchasing(false);
    setPurchaseItem(null);
    setPurchaseType(null);
  };
  
  // Create refs for panels
  const furnitureRef = useRef(null);
  const foodPanelRef = useRef(null);

  // Food detail modal state
  const [selectedFoodForDetails, setSelectedFoodForDetails] = useState(null);
  const [isFoodDetailsVisible, setIsFoodDetailsVisible] = useState(false);

  // Food detail modal handlers
  const handleShowFoodDetails = (foodKey) => {
    setSelectedFoodForDetails(foodKey);
    setIsFoodDetailsVisible(true);
  };

  const handleBuyFood = (foodKey, quantity) => {
    setIsFoodDetailsVisible(false);
    
    // Use the consolidated food data structure
    loadFoodData().then(foodData => {
      // Initialize this food item if it doesn't exist
      if (!foodData[foodKey]) {
        foodData[foodKey] = { quantity: 0, purchased: false };
      }
      
      // Mark as purchased
      foodData[foodKey].purchased = true;
      
      // Save the updated food data
      saveFoodData(foodData).then(() => {
        // Also update local state for UI
        setPurchasedFoods(prev => ({
          ...prev,
          [foodKey]: true
        }));
        
        // Initialize the purchase
        handleInitiatePurchase(foodKey, 'food', quantity);
      });
    }).catch(error => {
      console.error('Error updating food purchase status:', error);
    });
  };

  const handleCancelFoodDetails = () => {
    setIsFoodDetailsVisible(false);
    setSelectedFoodForDetails(null);
  };

  // Add a new state for purchased foods in the CatSection component
  const [purchasedFoods, setPurchasedFoods] = useState({});

  // Update pet options state effect
  useEffect(() => {
    if (onFurnitureModeChange) {
      // Consider pet options as a type of furniture mode
      onFurnitureModeChange(isEditMode || showPetOptions);
    }
  }, [isEditMode, showPetOptions]);

  // Remove the handleModeToggle function and replace with separate handlers for decoration and food
  const handleDecorationPress = () => {
    console.log('Decorate button clicked - entering decoration mode');
    setIsEditMode(true);
    setIsFeedingMode(false);
    
    // Notify parent component about furniture mode change
    if (onFurnitureModeChange) {
      onFurnitureModeChange(true);
    }
    
    // Notify parent we're in deco mode (hide review button and chests)
    if (onModeChange) {
      onModeChange(false);
    }
  };

  const handleFoodPress = () => {
    console.log('Food button clicked - entering food mode');
    setIsFeedingMode(true);
    setIsEditMode(false);
    
    // Notify parent we're in food mode (hide review button and chests)
    if (onModeChange) {
      onModeChange(false);
    }
  };

  const handleCloseDecoMode = () => {
    // Reset all decoration-related states
    setIsEditMode(false);
    setSelectedDecorationId(null);
    setShowRemoveButton(false);
    setSelectedItemForRemoval(null);
    setIsMovingFurniture(false);
    setOriginalPosition(null);
    setMovingMode(false);
    
    // Notify parent component about furniture mode change
    if (onFurnitureModeChange) {
      onFurnitureModeChange(false);
    }
    
    // Notify parent we're back in home mode (show review button and chests)
    if (onModeChange) {
      onModeChange(true);
    }
  };

  const handleCloseFoodMode = () => {
    // Reset all food-related states
    setIsFeedingMode(false);
    
    // Notify parent we're back in home mode (show review button and chests)
    if (onModeChange) {
      onModeChange(true);
    }
  };

  // Check cleanliness and show dust particles if below 50%
  useEffect(() => {
    // If cleanliness is below 50%, show dust particles
    if (stats.clean < 50 && !showDustParticles) {
      setShowDustParticles(true);
      
      // Animate each dust particle
      dustAnimations.forEach(anim => {
        // Reset position
        anim.top.setValue(Math.random() * (frameHeight * CAT_SIZE));
        anim.left.setValue(Math.random() * (frameWidth * CAT_SIZE));
        
        // Create slow floating animation
        Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(anim.top, {
                toValue: Math.random() * (frameHeight * CAT_SIZE),
                duration: 3000 + Math.random() * 2000, // Slow movement: 3-5 seconds
                useNativeDriver: true
              }),
              Animated.timing(anim.left, {
                toValue: Math.random() * (frameWidth * CAT_SIZE),
                duration: 3000 + Math.random() * 2000, // Slow movement: 3-5 seconds
                useNativeDriver: true
              })
            ])
          ])
        ).start();
      });
    } else if (stats.clean >= 50 && showDustParticles) {
      // If cleanliness is 50% or above, hide dust particles
      setShowDustParticles(false);
    }
  }, [stats.clean]); // Run this effect whenever cleanliness changes

  // Add state for clean button cooldown
  const [cleanButtonCooldown, setCleanButtonCooldown] = useState(false);
  // Add state for speech bubble
  const [showCleanSpeechBubble, setShowCleanSpeechBubble] = useState(false);
  // Add state for speech bubble content
  const [cleanSpeechContent, setCleanSpeechContent] = useState("");

  // Array of emoji combinations for the speech bubble
  const cleaningEmojiCombinations = [
    '🛁',
    '🧼',
    '🧽',
    '💦',
    '💨',
    '🛁',
    '🫧',
    '🧴',
    '🧤',
    '✨',
    '🧻',
    '🪥',
  ];

  // Add a function to handle cleaning the cat
  const handleCleanCat = () => {
    // Skip if cat is running
    if (isRunning) return;
    
    // Only if dirty enough, animations are loaded, and not already animating
    if (stats.clean < 70 && animationsLoaded && !isAnimating) {
      // Set animating state
      setIsAnimating(true);
      
      // Update cleanliness only, remove happiness bonus
      setStats(prevStats => ({
        ...prevStats,
        clean: 100 // Fully clean the cat
      }));
      
      // Play a happy animation sequence
      const playCleanliness = async () => {
        try {
          // Save the current animation
          const previousAnim = currentAnimation;
          
          // Show dust particles
          setShowDustParticles(true);
          
          // Animate dust particles - modified to make them float up and fade out
          dustAnimations.forEach(anim => {
            Animated.sequence([
              Animated.timing(anim.top, {
                toValue: -50 - Math.random() * 50, // Float higher
                duration: 1500, // Longer duration
                useNativeDriver: true,
              }),
              Animated.timing(anim.opacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
              }),
            ]).start();
          });
          
          // Reset frame index before animation to reduce flickering
          setFrameIndex(0);
          
          // Changed from 'Tickle' to 'Happy' animation
          setCurrentAnimation('Happy');
          
          // Wait for animation to complete
          setTimeout(() => {
            // Return to previous animation
            setCurrentAnimation(previousAnim);
            
            // Hide dust particles
            setShowDustParticles(false);
            
            // Reset dust animation values for next time
            dustAnimations.forEach(anim => {
              anim.top.setValue(Math.random() * (frameHeight * CAT_SIZE));
              anim.left.setValue(Math.random() * (frameWidth * CAT_SIZE));
              anim.opacity.setValue(0.2 + Math.random() * 0.3);
            });
            
            // Reset animating state
            setIsAnimating(false);
          }, 3000); // Give more time for animation to be visible
        } catch (error) {
          console.error("Error in playCleanliness:", error);
          // Reset states in case of error
          setIsAnimating(false);
          setShowCleanSpeechBubble(false);
          setShowDustParticles(false);
          setCurrentAnimation('Idle');
        }
      };
      
      // Start the cleaning sequence
      playCleanliness();
    } else {
      Alert.alert("Already Clean", "Your cat is already pretty clean!");
    }
  };

  // Add function to set all stats to 0 (for testing)
  const handleResetStats = () => {
    // Reset stats for testing
    setStats({
      hunger: 50,
      clean: 40,
      happy: 50
    });
    
    // Reset owned food for testing (add to this emergency reset)
    resetStorage().then(() => {
      Alert.alert('Storage Reset', 'AsyncStorage has been reset to new defaults. Please restart the app.');
      
      // Re-load defaults
      loadData();
    }).catch(error => {
      console.error('Error resetting storage:', error);
      Alert.alert('Error', 'Failed to reset storage.');
    });
  };

  // Show dust particles effect when cat is dirty
  useEffect(() => {
    // If cat is dirty (cleanliness < 50), show dust particles
    if (stats.clean < 50 && !showDustParticles) {
      setShowDustParticles(true);
    } else if (stats.clean >= 50 && showDustParticles) {
      // If cat becomes clean again, hide dust particles
      setShowDustParticles(false);
    }
  }, [stats.clean]); // Run this effect whenever cleanliness changes

  // Add this function to the CatSection component
  const handleCatTap = () => {
    // Skip if cat is already running
    if (isRunning) return;
    
    // Only play happy animation if cat is clean, animations are loaded, and not already animating
    if (stats.clean > 50 && animationsLoaded && !isEditMode && !isFeedingMode && !isAnimating) {
      // Set animating state to true
      setIsAnimating(true);
      
      // Increase happiness by 5 points
      setStats(prevStats => ({
        ...prevStats,
        happy: Math.min(100, prevStats.happy + 5)
      }));
      
      // Use the animation helper to play the animation once
      const playHappyAnimation = async () => {
        // Save current animation
        const previousAnim = currentAnimation;
        
        // Reset frame index before animation to reduce flickering
        setFrameIndex(0);
        
        // Play the happy animation and then return to previous state
        await playAnimationOnce(
          'Happy', 
          previousAnim,
          setCurrentAnimation,
          setFrameIndex,
          catAnimations,
          animationInterval
        );
        
        // Set animating state back to false when done
        setIsAnimating(false);
      };
      
      // Start animation
      playHappyAnimation();
      
      // Show a random emoji speech bubble
      const happyEmojis = [
        "😺", "😸", "😻", "💕", "❤️"
      ];
      
      // Set speech content and position
      const catDeco = decorations.find(d => d.id === 'cat');
      if (catDeco) {
        setSpeechBubbleContent(happyEmojis[Math.floor(Math.random() * happyEmojis.length)]);
        setSpeechBubblePosition({
          top: catDeco.roomRow * ROOM_CELL_SIZE - 40,
          left: catDeco.roomCol * ROOM_CELL_SIZE
        });
        
        // Show and hide after 1.5 seconds instead of 2 seconds
        setShowSpeechBubble(true);
        setTimeout(() => {
          setShowSpeechBubble(false);
        }, 1500);
      }
    }
  };

  // Add a state to track when animation is in progress
  const [isAnimating, setIsAnimating] = useState(false);

  // Add a function to handle toggling the cat's running animation to the right
  const handleToggleRunning = () => {
    // Only toggle if animations are loaded and not already animating
    if (animationsLoaded && !isAnimating) {
      // Toggle running state
      setIsRunning(prevState => !prevState);
      
      // Set the cat's animation
      if (!isRunning) {
        // Set animating state to prevent multiple runs
        setIsAnimating(true);
        
        // Switch to running animation
        setCurrentAnimation('Running');
        
        // Running animation faces right by default (defaultDirection: 1)
        // Keep the natural direction for running right
        setCatDirection(1);
        
        // Find cat decoration
        const catDeco = decorations.find(d => d.id === 'cat');
        if (catDeco) {
          // Calculate 5% of screen width
          const moveDistance = width * 0.05;
          
          // Calculate new position (moving to the right)
          const newCol = catDeco.roomCol + (moveDistance / ROOM_CELL_SIZE);
          
          // Animate the cat moving
          const startTime = Date.now();
          const startCol = catDeco.roomCol;
          const duration = 1000; // 1 second for the animation
          
          const animateMovement = () => {
            const elapsedTime = Date.now() - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            
            // Linear interpolation between start and end positions
            const currentCol = startCol + (progress * (newCol - startCol));
            
            // Update cat position
            setDecorations(prevDecorations => 
              prevDecorations.map(deco => 
                deco.id === 'cat' 
                  ? { ...deco, roomCol: currentCol } 
                  : deco
              )
            );
            
            // Continue animation if not complete
            if (progress < 1) {
              requestAnimationFrame(animateMovement);
            } else {
              // Animation complete
              setIsAnimating(false);
              
              // IMPORTANT: When switching to idle after running right:
              // Idle animation naturally faces left (defaultDirection: -1)
              // We need to flip it to face right, so use -1 to flip
              setCatDirection(-1);
              
              // Then switch to idle animation 
              setCurrentAnimation('Idle');
              
              setIsRunning(false);
            }
          };
          
          // Start the animation
          requestAnimationFrame(animateMovement);
        }
      } else {
        // Switch back to idle animation
        setCurrentAnimation('Idle');
      }
    }
  };
}
