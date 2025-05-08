import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width, height } = Dimensions.get('window');

// ----------------------------
// Chest Slot Components
// ----------------------------
export const CHEST_FRAME_WIDTH = 48; // Original frame width on the sprite sheet
export const CHEST_FRAME_HEIGHT = 32; // Original frame height on the sprite sheet
export const CHEST_FRAMES_PER_ROW = 5;
export const CHEST_ANIMATION_INTERVAL = 150;

// Visible portion of the frame (reduced to show only the actual chest)
export const CHEST_VISIBLE_WIDTH = 30; // Updated from 26px to 30px as requested
export const CHEST_VISIBLE_HEIGHT = 22; // 32px - 10px from top = 22px

// ----------------------------
// Chest Unlock Confirmation Component
// ----------------------------
export function ChestUnlockConfirmation({ chestIndex, chestType, onConfirm, onCancel }) {
  // Frame dimensions
  const frameWidth = CHEST_VISIBLE_WIDTH;
  const frameHeight = CHEST_VISIBLE_HEIGHT;
  
  // Same chest positions as in ChestSlot
  const chestPositions = [
    { x: 0, y: 10 },    // First chest
    { x: 0, y: 74 },    // Second chest
    { x: 0, y: 138 },   // Third chest
    { x: 0, y: 202 }    // Fourth chest
  ];
  
  // Make sure the index is valid
  const validChestType = Math.min(Math.max(chestType || 0, 0), 3);
  const { x, y } = chestPositions[validChestType];
  
  return (
    <View style={styles.unlockConfirmationOverlay}>
      <View style={styles.unlockConfirmationContainer}>
        <Text style={styles.unlockConfirmationTitle}>Start unlocking Chest?</Text>
        
        <View style={styles.unlockChestImageContainer}>
          <View style={{
            width: frameWidth,
            height: frameHeight,
            transform: [{ scale: 2.5 }],
            overflow: 'hidden',
          }}>
            <Image
              source={require('../asset/Chests.png')}
              style={{
                position: 'absolute',
                top: -y,
                left: -x,
                width: 240,
                height: 256,
              }}
            />
          </View>
        </View>
        
        <View style={styles.unlockButtonsContainer}>
          <TouchableOpacity style={styles.unlockButton} onPress={() => onConfirm(chestIndex)}>
            <Text style={styles.unlockButtonText}>Start</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.cancelUnlockButton} onPress={onCancel}>
            <Text style={styles.unlockButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export function ChestSlot({ chestIndex = 1, onChestClick, timeRemaining, chestType, unlockable = false }) {
  // Frame dimensions from sprite sheet - but just use the visible portion
  const frameWidth = CHEST_VISIBLE_WIDTH;
  const frameHeight = CHEST_VISIBLE_HEIGHT;
  
  // Each chest takes up 2 rows, first frames are at:
  // First chest: 0,10
  // Second chest: 0,74
  // Third chest: 0,138
  // Fourth chest: 0,202
  const chestPositions = [
    { x: 0, y: 10 },    // First chest
    { x: 0, y: 74 },    // Second chest
    { x: 0, y: 138 },   // Third chest
    { x: 0, y: 202 }    // Fourth chest
  ];
  
  // Use the chest type if provided, otherwise use the chest index
  const displayChestIndex = chestType !== undefined ? chestType : chestIndex;
  
  // Use a different chest based on the provided index (1-3)
  // Make sure the index is valid (between 0-3)
  const validIndex = Math.min(Math.max(displayChestIndex, 0), 3);
  const { x, y } = chestPositions[validIndex];
  
  // Check if the chest is truly empty (null timeRemaining and not unlockable)
  const isEmpty = timeRemaining === null && !unlockable;
  
  // Determine if the chest is ready to open (timer at 0)
  const isReady = timeRemaining === 0;
  
  // Get the state of the chest (unlockable, locked, or ready)
  const chestState = unlockable ? 'unlockable' : (isReady ? 'ready' : 'locked');
  
  // Background color based on timer - gold when ready, transparent when not ready
  const backgroundColor = isReady ? '#FFD700' : 
                          unlockable ? '#8A2BE2' : // Purple for unlockable
                          'rgba(0,0,0,0.5)';      // Dark for locked
  
  // Format time if needed for minutes
  const formattedTime = () => {
    if (timeRemaining === 0) return 'Ready!';
    if (unlockable) return 'Tap to Start';
    if (timeRemaining < 60) return `${timeRemaining}s`;
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
  };
  
  return (
    <TouchableOpacity 
      style={[styles.chestSlotContainer, { width: 70, height: 70, backgroundColor }]}
      onPress={() => onChestClick && onChestClick(chestIndex, chestState)}
    >
      <View style={{ 
        width: 70, 
        height: 70, 
        alignItems: 'center', 
        justifyContent: 'center', 
        overflow: 'hidden',
        borderRadius: 10,
      }}>
        {/* Show chest if not empty OR unlockable */}
        {!isEmpty && (
          <View style={{
            width: frameWidth,
            height: frameHeight,
            transform: [{ scale: 1.8 }],
            overflow: 'hidden',
            marginTop: -3, // Adjust vertical position by moving up 3 pixels
          }}>
            <Image
              source={require('../asset/Chests.png')}
              style={{
                position: 'absolute',
                top: -y,
                left: -x,
                width: 240,
                height: 256,
              }}
            />
          </View>
        )}
        
        {/* Timer text or status label */}
        {!isEmpty && (
          <Text style={[
            styles.timerText, 
            isReady ? styles.readyTimerText : 
            unlockable ? styles.unlockableTimerText : {}
          ]}>
            {formattedTime()}
          </Text>
        )}
        
        {/* Show empty text when chest is empty */}
        {isEmpty && (
          <Text style={styles.emptyChestText}>Empty</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function ChestAnimationScreen({ chestIndex, onComplete }) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  
  // Animation values for the chest
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  
  // Generate random rewards based on chest type
  const [rewards, setRewards] = useState({
    gold: 0,
    food: []
  });
  
  // Correct chest positions for animation (each chest is 48x32, at 0,0, 0,64, 0,128, 0,192)
  const chestPositions = [
    { x: 0, y: 0 },    // First chest
    { x: 0, y: 64 },   // Second chest
    { x: 0, y: 128 },  // Third chest
    { x: 0, y: 192 }   // Fourth chest
  ];
  
  const { x, y } = chestPositions[chestIndex];
  
  // Calculate frames for this chest (5 frames per row, 2 rows per chest)
  const totalFrames = CHEST_FRAMES_PER_ROW * 2; // 10 frames total
  
  // Generate random rewards when component mounts
  useEffect(() => {
    // More valuable chests give better rewards
    const minGold = 50 + (chestIndex * 50);
    const maxGold = 100 + (chestIndex * 100);
    const goldAmount = Math.floor(Math.random() * (maxGold - minGold + 1)) + minGold;
    
    // Random food items
    const foodItems = ['Kibble', 'Fish', 'Chicken', 'Milk', 'CatTreat', 'Tuna', 'Meat', 'Shrimp'];
    const numFoodItems = Math.min(3, 1 + chestIndex); // More valuable chests give more items
    
    const selectedFood = [];
    for (let i = 0; i < numFoodItems; i++) {
      const randomIndex = Math.floor(Math.random() * foodItems.length);
      const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 of each item
      selectedFood.push({ name: foodItems[randomIndex], quantity });
    }
    
    setRewards({
      gold: goldAmount,
      food: selectedFood
    });
  }, [chestIndex]);
  
  // Start animation sequence
  useEffect(() => {
    // Start with the target scale instead of animating from 1 to 2.5
    // This prevents the brief size change
    scale.setValue(2.5);
    
    // Only animate opacity
    Animated.timing(opacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    // Start frame animation after a short delay
    const timeout = setTimeout(() => {
      // Animate through all frames
      const interval = setInterval(() => {
        setFrameIndex(prev => {
          const nextFrame = prev + 1;
          
          // If we've gone through all frames, show rewards
          if (nextFrame >= totalFrames) {
            clearInterval(interval);
            
            // Delay showing rewards to show the final frame
            setTimeout(() => {
              setAnimationComplete(true);
              setShowRewards(true);
            }, 500);
            
            return totalFrames - 1; // Stay on last frame
          }
          
          return nextFrame;
        });
      }, CHEST_ANIMATION_INTERVAL);
      
      return () => clearInterval(interval);
    }, 800);
    
    return () => clearTimeout(timeout);
  }, []);
  
  // Calculate position within sprite sheet based on frame
  // Frames are CHEST_FRAME_WIDTH (48px) wide and CHEST_FRAME_HEIGHT (32px) tall
  const frameRow = Math.floor(frameIndex / CHEST_FRAMES_PER_ROW);
  const frameCol = frameIndex % CHEST_FRAMES_PER_ROW;
  
  const frameX = x + (frameCol * CHEST_FRAME_WIDTH);
  const frameY = y + (frameRow * CHEST_FRAME_HEIGHT);
  
  // Get food emoji based on name
  const getFoodEmoji = (foodName) => {
    const foodEmojis = {
      'Kibble': '🥫',
      'Fish': '🐟',
      'Chicken': '🍗',
      'Milk': '🥛',
      'CatTreat': '🍪',
      'Tuna': '🐠',
      'Meat': '🥩',
      'Shrimp': '🦐'
    };
    return foodEmojis[foodName] || '🍽️';
  };
  
  // Handler for closing the rewards screen
  const handleClose = () => {
    // Pass back the rewards and chest index
    // Setting true for the third argument indicates this chest should be emptied
    onComplete && onComplete(rewards, chestIndex, true);
  };
  
  // Adjusted height for animation (remove 7px from top)
  const adjustedFrameHeight = 25; // 32px - 7px = 25px
  
  return (
    <View style={styles.chestAnimationContainer}>
      <TouchableOpacity 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0 
        }}
        activeOpacity={1}
        onPress={handleClose}
      />
      
      {/* Chest Animation */}
      {!showRewards && (
        <Animated.View style={[
          styles.chestAnimationWrapper,
          {
            opacity,
            transform: [{ scale }]
          }
        ]}>
          <View style={{
            width: CHEST_FRAME_WIDTH,
            height: adjustedFrameHeight, // Use adjusted height
            overflow: 'hidden',
            marginTop: -3, // Fix vertical alignment
          }}>
            <Image
              source={require('../asset/Chests.png')}
              style={{
                position: 'absolute',
                top: -(frameY + 7), // Add 7px offset to crop the top
                left: -frameX,
                width: 240,
                height: 256,
              }}
            />
          </View>
        </Animated.View>
      )}
      
      {/* Rewards Display */}
      {showRewards && (
        <TouchableOpacity 
          activeOpacity={1}
          style={styles.rewardsContainer}
          onPress={handleClose}
        >
          <Text style={styles.rewardsTitle}>Rewards</Text>
          
          <View style={styles.goldReward}>
            <Text style={styles.goldIcon}>💰</Text>
            <Text style={styles.goldAmount}>{rewards.gold}</Text>
          </View>
          
          <View style={styles.foodRewardsContainer}>
            {rewards.food.map((food, index) => (
              <View key={index} style={styles.foodItem}>
                <Text style={styles.foodEmoji}>{getFoodEmoji(food.name)}</Text>
                <Text style={styles.foodName}>{food.name}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Styles related to chest components
const styles = StyleSheet.create({
  // Chest animation styles
  chestAnimationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000, // Above everything else
  },
  chestAnimationWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Rewards styles
  rewardsContainer: {
    backgroundColor: 'rgba(50, 30, 0, 0.95)',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  rewardsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 20,
    textAlign: 'center',
  },
  goldReward: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 15,
    width: '100%',
    justifyContent: 'center',
  },
  goldIcon: {
    fontSize: 30,
    marginRight: 10,
  },
  goldAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  foodRewardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
    width: '100%',
  },
  foodItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    padding: 10,
    margin: 5,
    alignItems: 'center',
    width: 80,
  },
  foodEmoji: {
    fontSize: 24,
    marginBottom: 5,
  },
  foodName: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 3,
  },
  foodQuantity: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 14,
  },
  tapToCloseText: {
    color: 'white',
    fontSize: 14,
    opacity: 0.7,
    marginTop: 10,
  },
  timerText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 5,
  },
  readyTimerText: {
    color: '#FFD700',
  },
  unlockableTimerText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyChestText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  chestSlotContainer: {
    borderRadius: 15,
    padding: 5,
    alignItems: 'center',
    marginHorizontal: 5,
    backgroundColor: '#FFD700',
    zIndex: 9990, // High z-index to be above navigation
  },
  chestSlotRow: {
    position: 'absolute',
    bottom: 120,
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  unlockConfirmationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10001,
  },
  unlockConfirmationContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    alignItems: 'center',
  },
  unlockConfirmationTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  unlockChestImageContainer: {
    marginBottom: 10,
    marginTop: 10,
  },
  unlockButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    width: '100%',
  },
  unlockButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    elevation: 3,
    flex: 1,
  },
  unlockButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelUnlockButton: {
    backgroundColor: '#F44336',
    paddingVertical: 10,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    elevation: 3,
    flex: 1,
  },
});

export default {
  ChestSlot,
  ChestUnlockConfirmation,
  ChestAnimationScreen
};
