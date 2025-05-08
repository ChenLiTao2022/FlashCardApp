import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { saveOwnedFurniture } from '../../helpers/StorageHelper';

// ----------------------------
// Constants from CatSection
// ----------------------------
export const CELL_SIZE = 32;
export const SHEET_SIZE = 1024;
export const ROOM_SCALE = 0.6;

// ----------------------------
// Helper Functions
// ----------------------------
export function createSpriteFromGrid(startRow, startCol, rowSpan, colSpan) {
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
export const decorationLibrary = {
  // Windows
  whiteWindow: createSpriteFromGrid(0, 0, 3, 3),
  brownWindow: createSpriteFromGrid(0, 3, 3, 3),
  greyWindow: createSpriteFromGrid(3, 0, 3, 3),
  goldenBrownWindow: createSpriteFromGrid(3, 3, 3, 3),
  beigeCurtainWindow: createSpriteFromGrid(7, 0, 2, 2),
  pinkStoneWindow: createSpriteFromGrid(7, 2, 2, 2),

  // Small Potted Plants
  lightPinkPottedPlant: createSpriteFromGrid(6, 4, 1, 1),
  greyPottedPlant: createSpriteFromGrid(6, 5, 1, 1),
  pinkPottedPlant: createSpriteFromGrid(7, 4, 1, 1),
  bluePottedPlant: createSpriteFromGrid(7, 5, 1, 1),
  yellowPottedPlant: createSpriteFromGrid(7, 4, 1, 1),
  darkBluePottedPlant: createSpriteFromGrid(7, 5, 1, 1),

  // Potted Trees
  brownPottedTree: createSpriteFromGrid(9, 4, 4, 2),
  darkBluePottedTree: createSpriteFromGrid(13, 4, 4, 2),
  pinkPottedTree: createSpriteFromGrid(17, 4, 4, 2),
  lightBluePottedTree: createSpriteFromGrid(21, 4, 4, 2),

  // Shelves
  pinkShelf: createSpriteFromGrid(9, 0, 4, 4),
  blueShelf: createSpriteFromGrid(13, 0, 4, 4),
  greenShelf: createSpriteFromGrid(17, 0, 4, 4),
  purpleShelf: createSpriteFromGrid(21, 0, 4, 4),
  yellowShelf: createSpriteFromGrid(25, 0, 4, 4),

  // Cat Trees (Scratching Posts)
  beigeCatTree: createSpriteFromGrid(0, 6, 4, 2),
  oliveCatTree: createSpriteFromGrid(0, 9, 4, 2),
  blueCatTree: createSpriteFromGrid(0, 12, 4, 2),
  whiteCatTreeBase: createSpriteFromGrid(13, 6, 3, 2),
  brownCatTreeBase: createSpriteFromGrid(16, 6, 3, 2),

  // Pet Beds
  blueBed: createSpriteFromGrid(4, 6, 3, 4),
  greyBed: createSpriteFromGrid(4, 10, 3, 4),
  pinkBed: createSpriteFromGrid(7, 6, 3, 4),
  greenBed: createSpriteFromGrid(7, 10, 3, 4),
  purpleBed: createSpriteFromGrid(10, 6, 3, 4),
  tealBed: createSpriteFromGrid(10, 10, 3, 4),

  // Food Bowls & Cans
  blueKibbleBowl: createSpriteFromGrid(13, 8, 2, 2),
  beigeKibbleBowl: createSpriteFromGrid(13, 10, 2, 2),
  purpleKibbleBowl: createSpriteFromGrid(15, 8, 2, 2),
  whiteKibbleBowl: createSpriteFromGrid(15, 10, 2, 2),
  redKibbleBowl: createSpriteFromGrid(17, 8, 2, 2),
  greenKibbleBowl: createSpriteFromGrid(17, 10, 2, 2),
  redFoodCan: createSpriteFromGrid(19, 17, 1, 1),
  brownFoodCan: createSpriteFromGrid(19, 18, 1, 1),
  greyFoodCan: createSpriteFromGrid(19, 19, 1, 1),
  pinkFoodCan: createSpriteFromGrid(19, 20, 1, 1),
  purpleFoodCan: createSpriteFromGrid(20, 17, 1, 1),
  greenFoodCan: createSpriteFromGrid(20, 18, 1, 1),
  tealFoodCan: createSpriteFromGrid(20, 19, 1, 1),
  greenFoodCan2: createSpriteFromGrid(20, 20, 1, 1),

  // Water Bowls
  blueWaterBowl: createSpriteFromGrid(13, 12, 2, 2),
  beigeWaterBowl: createSpriteFromGrid(13, 14, 2, 2),
  purpleWaterBowl: createSpriteFromGrid(15, 12, 2, 2),
  whiteWaterBowl: createSpriteFromGrid(15, 14, 2, 2),
  redWaterBowl: createSpriteFromGrid(17, 12, 2, 2),
  greenWaterBowl: createSpriteFromGrid(17, 14, 2, 2),

  // Cat Toys
  rainbowCubeToy: createSpriteFromGrid(19, 6, 1, 1),
  rainbowCubeToy2: createSpriteFromGrid(19, 7, 1, 1),
  tealDumbbellToy: createSpriteFromGrid(19, 12, 1, 1),
  brownDumbbellToy: createSpriteFromGrid(19, 13, 1, 1),
  lavenderDumbbellToy: createSpriteFromGrid(20, 12, 1, 1),
  maroonDumbbellToy: createSpriteFromGrid(20, 13, 1, 1),
  darkBlueDumbbellToy: createSpriteFromGrid(21, 12, 1, 1),
  brickRedDumbbellToy: createSpriteFromGrid(21, 13, 1, 1),
  lightBlueDumbbellToy: createSpriteFromGrid(22, 12, 1, 1),
  orangeDumbbellToy: createSpriteFromGrid(22, 13, 1, 1),
  skyBlueDumbbellToy: createSpriteFromGrid(23, 12, 1, 1),
  greenDumbbellToy: createSpriteFromGrid(23, 13, 1, 1),

  // Cat Toys – Fish Plushies
  fishPlushie1: createSpriteFromGrid(21, 6, 2, 2),
  fishPlushie2: createSpriteFromGrid(23, 6, 2, 2),
  fishPlushie3: createSpriteFromGrid(25, 6, 2, 2),
  tealFishPlushie: createSpriteFromGrid(27, 6, 2, 2),
  blueFishPlushie: createSpriteFromGrid(25, 4, 2, 2),
  redFishPlushie: createSpriteFromGrid(27, 4, 2, 2),

  // Cat Toys – Yarn Balls
  greenYarnBallLarge: createSpriteFromGrid(0, 14, 1, 1),
  greenYarnBallSmall: createSpriteFromGrid(0, 15, 1, 1),
  blueYarnBallLarge: createSpriteFromGrid(0, 16, 1, 1),
  blueYarnBallSmall: createSpriteFromGrid(0, 17, 1, 1),
  lightBlueYarnBallLarge: createSpriteFromGrid(1, 14, 1, 1),
  lightBlueYarnBallSmall: createSpriteFromGrid(1, 15, 1, 1),
  creamYarnBallLarge: createSpriteFromGrid(1, 16, 1, 1),
  creamYarnBallSmall: createSpriteFromGrid(1, 17, 1, 1),
  redYarnBallLarge: createSpriteFromGrid(2, 14, 1, 1),
  redYarnBallSmall: createSpriteFromGrid(2, 15, 1, 1),
  greyYarnBallLarge: createSpriteFromGrid(2, 16, 1, 1),
  greyYarnBallSmall: createSpriteFromGrid(2, 17, 1, 1),
  tealYarnBallLarge: createSpriteFromGrid(3, 14, 1, 1),
  tealYarnBallSmall: createSpriteFromGrid(3, 15, 1, 1),
  indigoYarnBallLarge: createSpriteFromGrid(3, 16, 1, 1),
  indigoYarnBallSmall: createSpriteFromGrid(3, 17, 1, 1),
  purpleYarnBallLarge: createSpriteFromGrid(4, 14, 1, 1),
  purpleYarnBallSmall: createSpriteFromGrid(4, 15, 1, 1),
  oliveYarnBallLarge: createSpriteFromGrid(4, 16, 1, 1),
  oliveYarnBallSmall: createSpriteFromGrid(4, 17, 1, 1),
  goldenBrownYarnBallLarge: createSpriteFromGrid(5, 14, 1, 1),
  goldenBrownYarnBallSmall: createSpriteFromGrid(5, 15, 1, 1),
  violetYarnBallLarge: createSpriteFromGrid(5, 16, 1, 1),
  violetYarnBallSmall: createSpriteFromGrid(5, 17, 1, 1),

  // Wall Art – Cat Posters
  creamCatPoster: createSpriteFromGrid(6, 14, 2, 1),
  blueCatPoster: createSpriteFromGrid(6, 15, 2, 1),
  brownCatPoster: createSpriteFromGrid(6, 16, 2, 1),
  cyanCatPoster: createSpriteFromGrid(8, 14, 2, 1),
  greyCatPoster: createSpriteFromGrid(8, 15, 2, 1),
  purpleCatPoster: createSpriteFromGrid(8, 16, 2, 1),

  // Wall Art – Heart Frames
  brownHeartFrame: createSpriteFromGrid(10, 14, 1, 1),
  greyHeartFrame: createSpriteFromGrid(10, 15, 1, 1),
  navyHeartFrame: createSpriteFromGrid(10, 16, 1, 1),
  oliveHeartFrame: createSpriteFromGrid(11, 14, 1, 1),
  whiteHeartFrame: createSpriteFromGrid(11, 15, 1, 1),
  purpleHeartFrame: createSpriteFromGrid(11, 16, 1, 1),
  pinkHeartFrame: createSpriteFromGrid(12, 14, 1, 1),
  yellowHeartFrame: createSpriteFromGrid(12, 15, 1, 1),
  greenHeartFrame: createSpriteFromGrid(12, 16, 1, 1),

  // Wall Art – Framed Plant Art
  framedPlantArt: createSpriteFromGrid(6, 22, 3, 2),

  // Climbing Towers
  beigeClimbingTowerWithStairs: createSpriteFromGrid(7, 17, 5, 4),
  beigeTallClimbingTowerWithStairs: createSpriteFromGrid(12, 17, 5, 4),

  // Bones & Mouse Toy
  smallBone: createSpriteFromGrid(19, 16, 1, 1),
  largeBone: createSpriteFromGrid(20, 16, 1, 1),
  mouseToy: createSpriteFromGrid(19, 14, 2, 2),

  // Cat Food Bags
  smallCatFoodBag: createSpriteFromGrid(17, 16, 2, 2),
  largeCatFoodBag: createSpriteFromGrid(17, 18, 2, 2),

  // Cat Towers
  whiteCatTower: createSpriteFromGrid(0, 18, 6, 3),
  blueCatTower: createSpriteFromGrid(0, 21, 6, 3),
  pinkCatTower: createSpriteFromGrid(0, 24, 6, 3),

  // Windows with Trims
  purpleTrimWindow: createSpriteFromGrid(0, 27, 4, 2),
  blackTrimWindow: createSpriteFromGrid(0, 29, 4, 2),
  greenTrimWindow: createSpriteFromGrid(4, 27, 4, 2),
  whiteTrimWindow: createSpriteFromGrid(4, 29, 4, 2),

  // Windows with Curtains
  whiteCurtainWindow: createSpriteFromGrid(9, 21, 5, 3),
  redCurtainWindow: createSpriteFromGrid(9, 24, 5, 3),
  blueCurtainWindow: createSpriteFromGrid(9, 27, 5, 3),

  // Furniture – Cat Stools
  creamCatStool: createSpriteFromGrid(19, 21, 2, 2),
  greyCatStool: createSpriteFromGrid(19, 23, 2, 2),
  redCatStool: createSpriteFromGrid(19, 25, 2, 2),
  blueCatStool: createSpriteFromGrid(19, 27, 2, 2),
  purpleCatStool: createSpriteFromGrid(19, 29, 2, 2),

  // Cat Furniture – Posts
  yellowCatPost: createSpriteFromGrid(21, 20, 3, 2),
  greenCatPost: createSpriteFromGrid(21, 22, 3, 2),
  pinkCatPost: createSpriteFromGrid(21, 24, 3, 2),
  tealCatPost: createSpriteFromGrid(21, 26, 3, 2),
  whiteCatPost: createSpriteFromGrid(21, 28, 3, 2),
  beigeCatPost: createSpriteFromGrid(21, 30, 3, 2),

  // Cat Furniture – Round Towers
  brownRoundCatTower: createSpriteFromGrid(15, 21, 3, 2),
  yellowRoundCatTower: createSpriteFromGrid(15, 23, 3, 2),
  blueRoundCatTower: createSpriteFromGrid(15, 25, 3, 2),
  redRoundCatTower: createSpriteFromGrid(15, 27, 3, 2),
  mintRoundCatTower: createSpriteFromGrid(15, 29, 3, 2),
};

// ----------------------------
// Furniture Prices
// ----------------------------
export const furniturePrices = {
  // Windows
  whiteWindow: 120,
  brownWindow: 120,
  greyWindow: 120,
  goldenBrownWindow: 150,
  beigeCurtainWindow: 100,
  pinkStoneWindow: 100,

  // Small Potted Plants
  lightPinkPottedPlant: 60,
  greyPottedPlant: 60,
  pinkPottedPlant: 60,
  bluePottedPlant: 60,
  yellowPottedPlant: 60,
  darkBluePottedPlant: 60,

  // Potted Trees
  brownPottedTree: 150,
  darkBluePottedTree: 150,
  pinkPottedTree: 150,
  lightBluePottedTree: 150,

  // Shelves
  pinkShelf: 200,
  blueShelf: 200,
  greenShelf: 200,
  purpleShelf: 200,
  yellowShelf: 200,

  // Cat Trees (Scratching Posts)
  beigeCatTree: 300,
  oliveCatTree: 300,
  blueCatTree: 300,
  whiteCatTreeBase: 250,
  brownCatTreeBase: 250,

  // Pet Beds
  blueBed: 180,
  greyBed: 180,
  pinkBed: 180,
  greenBed: 180,
  purpleBed: 180,
  tealBed: 180,

  // Food Bowls & Cans
  blueKibbleBowl: 40,
  beigeKibbleBowl: 40,
  purpleKibbleBowl: 40,
  whiteKibbleBowl: 40,
  redKibbleBowl: 40,
  greenKibbleBowl: 40,
  redFoodCan: 15,
  brownFoodCan: 15,
  greyFoodCan: 15,
  pinkFoodCan: 15,
  purpleFoodCan: 15,
  greenFoodCan: 15,
  tealFoodCan: 15,
  greenFoodCan2: 15,

  // Water Bowls
  blueWaterBowl: 30,
  beigeWaterBowl: 30,
  purpleWaterBowl: 30,
  whiteWaterBowl: 30,
  redWaterBowl: 30,
  greenWaterBowl: 30,

  // Cat Toys
  rainbowCubeToy: 70,
  rainbowCubeToy2: 70,
  tealDumbbellToy: 50,
  brownDumbbellToy: 50,
  lavenderDumbbellToy: 50,
  maroonDumbbellToy: 50,
  darkBlueDumbbellToy: 50,
  brickRedDumbbellToy: 50,
  lightBlueDumbbellToy: 50,
  orangeDumbbellToy: 50,
  skyBlueDumbbellToy: 50,
  greenDumbbellToy: 50,

  // Cat Toys – Fish Plushies
  fishPlushie1: 80,
  fishPlushie2: 80,
  fishPlushie3: 80,
  tealFishPlushie: 80,
  blueFishPlushie: 80,
  redFishPlushie: 80,

  // Cat Toys – Yarn Balls
  greenYarnBallLarge: 45,
  greenYarnBallSmall: 30,
  blueYarnBallLarge: 45,
  blueYarnBallSmall: 30,
  lightBlueYarnBallLarge: 45,
  lightBlueYarnBallSmall: 30,
  creamYarnBallLarge: 45,
  creamYarnBallSmall: 30,
  redYarnBallLarge: 45,
  redYarnBallSmall: 30,
  greyYarnBallLarge: 45,
  greyYarnBallSmall: 30,
  tealYarnBallLarge: 45,
  tealYarnBallSmall: 30,
  indigoYarnBallLarge: 45,
  indigoYarnBallSmall: 30,
  purpleYarnBallLarge: 45,
  purpleYarnBallSmall: 30,
  oliveYarnBallLarge: 45,
  oliveYarnBallSmall: 30,
  goldenBrownYarnBallLarge: 45,
  goldenBrownYarnBallSmall: 30,
  violetYarnBallLarge: 45,
  violetYarnBallSmall: 30,

  // Wall Art – Cat Posters
  creamCatPoster: 90,
  blueCatPoster: 90,
  brownCatPoster: 90,
  cyanCatPoster: 90,
  greyCatPoster: 90,
  purpleCatPoster: 90,

  // Wall Art – Heart Frames
  brownHeartFrame: 75,
  greyHeartFrame: 75,
  navyHeartFrame: 75,
  oliveHeartFrame: 75,
  whiteHeartFrame: 75,
  purpleHeartFrame: 75,
  pinkHeartFrame: 75,
  yellowHeartFrame: 75,
  greenHeartFrame: 75,

  // Wall Art – Framed Plant Art
  framedPlantArt: 110,

  // Climbing Towers
  beigeClimbingTowerWithStairs: 350,
  beigeTallClimbingTowerWithStairs: 400,

  // Bones & Mouse Toy
  smallBone: 25,
  largeBone: 35,
  mouseToy: 65,

  // Cat Food Bags
  smallCatFoodBag: 50,
  largeCatFoodBag: 90,

  // Cat Towers
  whiteCatTower: 400,
  blueCatTower: 400,
  pinkCatTower: 400,

  // Windows with Trims
  purpleTrimWindow: 160,
  blackTrimWindow: 160,
  greenTrimWindow: 160,
  whiteTrimWindow: 160,

  // Windows with Curtains
  whiteCurtainWindow: 180,
  redCurtainWindow: 180,
  blueCurtainWindow: 180,

  // Furniture – Cat Stools
  creamCatStool: 120,
  greyCatStool: 120,
  redCatStool: 120,
  blueCatStool: 120,
  purpleCatStool: 120,

  // Cat Furniture – Posts
  yellowCatPost: 220,
  greenCatPost: 220,
  pinkCatPost: 220,
  tealCatPost: 220,
  whiteCatPost: 220,
  beigeCatPost: 220,

  // Cat Furniture – Round Towers
  brownRoundCatTower: 280,
  yellowRoundCatTower: 280,
  blueRoundCatTower: 280,
  redRoundCatTower: 280,
  mintRoundCatTower: 280,
};

// ----------------------------
// FurnitureItem Component for furniture selection
// ----------------------------
export function FurnitureItem({ itemKey, onSelect, isPlaced, isOwned, price }) {
  const { x, y, width, height } = decorationLibrary[itemKey];
  
  // Standard target height for all furniture previews
  const standardPreviewHeight = 32;
  
  // Calculate the scale needed to make this item match the standard height
  const heightRatio = standardPreviewHeight / height;
  
  // Apply the same scale to width to maintain proportions
  const scaledWidth = width * heightRatio;
  
  return (
    <TouchableOpacity
      style={[styles.furnitureItem, isPlaced && styles.placedFurnitureItem]}
      onPress={() => onSelect(itemKey)}
    >
      <View style={[styles.furnitureImageContainer, {
        width: scaledWidth,
        height: standardPreviewHeight,
        alignSelf: 'center', // Center the image container horizontally
      }]}>
        <View style={{
          width: scaledWidth,
          height: standardPreviewHeight,
          overflow: 'hidden',
          alignSelf: 'center', // Center the image view horizontally
        }}>
          <Image
            source={require('../../asset/RetroCatsPaid/CatItems/Decorations/CatRoomDecorations.png')}
            style={{
              position: 'absolute',
              top: -y * heightRatio,
              left: -x * heightRatio,
              width: SHEET_SIZE * heightRatio,
              height: SHEET_SIZE * heightRatio,
            }}
          />
        </View>
      </View>
      {price && !isOwned && (
        <Text style={styles.priceTag}>💰 {price}</Text>
      )}
    </TouchableOpacity>
  );
}

// ----------------------------
// Group furniture items by category - ensure no duplicates
// ----------------------------
export function groupFurnitureByCategory(decorationLib) {
  // Helper to ensure no duplicates
  const processedKeys = new Set();
  
  // Process each category in order to avoid duplicates
  const addToCategory = (category, keys) => {
    const result = [];
    for (const key of keys) {
      if (!processedKeys.has(key)) {
        processedKeys.add(key);
        result.push(key);
      }
    }
    return result;
  };
  
  return {
    Windows: addToCategory('Windows', Object.keys(decorationLib).filter(key => 
      key.includes('Window') || key.includes('window'))),
    Plants: addToCategory('Plants', Object.keys(decorationLib).filter(key => 
      key.includes('Plant') || key.includes('plant') || 
      key.includes('Tree') || key.includes('tree'))),
    Beds: addToCategory('Beds', Object.keys(decorationLib).filter(key => 
      key.includes('Bed') || key.includes('bed'))),
    'Cat Trees': addToCategory('Cat Trees', Object.keys(decorationLib).filter(key => 
      key.includes('CatTree') || key.includes('catTree'))),
    Shelves: addToCategory('Shelves', Object.keys(decorationLib).filter(key => 
      key.includes('Shelf') || key.includes('shelf'))),
    Bowls: addToCategory('Bowls', Object.keys(decorationLib).filter(key => 
      key.includes('Bowl') || key.includes('bowl'))),
    Toys: addToCategory('Toys', Object.keys(decorationLib).filter(key => 
      key.includes('Toy') || key.includes('toy'))),
    Other: addToCategory('Other', Object.keys(decorationLib).filter(key => 
      !key.includes('Window') && !key.includes('window') &&
      !key.includes('Plant') && !key.includes('plant') && 
      !key.includes('Tree') && !key.includes('tree') &&
      !key.includes('Bed') && !key.includes('bed') &&
      !key.includes('CatTree') && !key.includes('catTree') &&
      !key.includes('Shelf') && !key.includes('shelf') &&
      !key.includes('Bowl') && !key.includes('bowl') &&
      !key.includes('Toy') && !key.includes('toy')))
  };
}

// ----------------------------
// Furniture Selection Panel Component
// ----------------------------
const FurnitureSelectionPanel = React.forwardRef(function FurnitureSelectionPanel(
  { 
    groupedFurniture, 
    onSelectFurniture, 
    currentDecorations, 
    onDone, 
    money, 
    setMoney,
    onInitiatePurchase,
    initialOwnedItems = {}
  }, 
  ref
) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  // Track which items are already placed in the room and which ones the user owns
  const [ownedItems, setOwnedItems] = useState(initialOwnedItems || {});
  
  // Update ownedItems when initialOwnedItems changes
  useEffect(() => {
    if (initialOwnedItems) {
      setOwnedItems(initialOwnedItems);
    }
  }, [initialOwnedItems]);
  
  // Expose method to add owned item
  React.useImperativeHandle(ref, () => ({
    addOwnedItem: (itemKey) => {
      setOwnedItems(prev => {
        const updated = {
          ...prev,
          [itemKey]: true
        };
        // Save to AsyncStorage whenever ownedItems changes
        saveOwnedFurniture(updated);
        return updated;
      });
    }
  }));
  
  // Go to furniture shop
  const handleGoToShop = () => {
    router.push({
      pathname: '/Shop',
      params: { tab: 'furniture' }
    });
  };
  
  // Track which items are placed in the room
  const placedItems = {};
  currentDecorations.forEach(deco => {
    if (deco.id !== 'cat') { // Skip the cat sprite
      placedItems[deco.itemKey] = true;
    }
  });
  
  // Show all items if no category is selected
  const furnitureToShow = selectedCategory 
    ? groupedFurniture[selectedCategory] 
    : Object.values(groupedFurniture).flat();
  
  // Group owned items by category for the Storage tab
  const ownedItemsByCategory = {};
  Object.keys(ownedItems).forEach(itemKey => {
    if (ownedItems[itemKey]) {
      // Find which category this item belongs to
      for (const [category, items] of Object.entries(groupedFurniture)) {
        if (items.includes(itemKey)) {
          if (!ownedItemsByCategory[category]) {
            ownedItemsByCategory[category] = [];
          }
          ownedItemsByCategory[category].push(itemKey);
          break;
        }
      }
    }
  });

  // Handle selecting furniture
  const handleSelectItem = (itemKey) => {
    if (ownedItems[itemKey]) {
      // If already owned, select it directly
      onSelectFurniture(itemKey);
    } else {
      // This case should not happen in the storage-only mode
      console.warn("Tried to select unowned item in Storage mode");
    }
  };
  
  // Check if there are any owned items
  const hasOwnedItems = Object.keys(ownedItemsByCategory).length > 0;
  
  return (
    <View style={styles.furnitureSelectionContainer} ref={ref}>
      {/* Storage title with shop and close buttons */}
      <View style={styles.storageTitleContainer}>
        <Text style={styles.storageTitle}>Decorations</Text>
        <View style={styles.headerButtonsContainer}>
          <TouchableOpacity style={styles.shopButton} onPress={handleGoToShop}>
            <Text style={styles.shopButtonText}>Go to Shop</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onDone}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Storage content */}
      <ScrollView style={styles.storageScrollView}>
        {hasOwnedItems ? (
          // Show owned items grouped by category
          Object.entries(ownedItemsByCategory).map(([category, items]) => (
            <View key={category} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsRow}>
                {items.map((itemKey) => (
                  <FurnitureItem 
                    key={itemKey} 
                    itemKey={itemKey} 
                    onSelect={handleSelectItem} 
                    isPlaced={placedItems[itemKey]} 
                    isOwned={ownedItems[itemKey]}
                  />
                ))}
              </ScrollView>
            </View>
          ))
        ) : (
          // Display message when no decorations are available
          <View style={styles.emptyStorageContainer}>
            <Text style={styles.emptyStorageText}>No decoration items in storage</Text>
            <TouchableOpacity style={styles.shopButton} onPress={handleGoToShop}>
              <Text style={styles.shopButtonText}>Go to Shop</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
});

export { FurnitureSelectionPanel };

// ----------------------------
// Styles for furniture components
// ----------------------------
const styles = StyleSheet.create({
  // Furniture Item styles
  furnitureItem: {
    width: 65,
    height: 65,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    margin: 5,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  placedFurnitureItem: {
    backgroundColor: 'rgba(100, 200, 255, 0.2)',
    borderColor: 'rgba(100, 200, 255, 0.4)',
  },
  furnitureImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceTag: {
    color: '#FFD700',
    fontSize: 12,
    marginTop: 4,
    fontWeight: 'bold',
  },
  
  // Furniture Selection Panel styles
  furnitureSelectionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(50, 50, 50, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 15,
    paddingBottom: 20,
    zIndex: 100,
  },
  storageTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  storageTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopButton: {
    backgroundColor: '#4F7942', // Forest green for shop button
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginRight: 10,
  },
  shopButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: 'rgba(200, 50, 50, 0.8)',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  storageScrollView: {
    flex: 1,
    marginTop: 10,
  },
  categorySection: {
    marginVertical: 10,
  },
  categoryTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  itemsRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  emptyStorageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyStorageText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    marginBottom: 20,
  },
});

