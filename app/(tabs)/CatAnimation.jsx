import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions
} from 'react-native';
import { changeAnimation, playAnimationOnce } from '../helpers/CatAnimationHelper';

// ----------------------------
// Animation Settings for Cat Sprite
// ----------------------------
export const frameWidth = 64 * 1.5;
export const frameHeight = 64 * 1.5;
export const animationInterval = 150;
export const CAT_SIZE = 0.5;

// ----------------------------
// Cat Animation Library
// ----------------------------
export const catAnimations = {
  Attack: { 
    frames: 7, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Attack.png'),
    defaultDirection: -1  // Faces right by default
  },
  Box1: { 
    frames: 12, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Box1.png'),
    defaultDirection: -1  // Faces left by default
  },
  Box2: { 
    frames: 10, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Box2.png'),
    defaultDirection: -1  // Faces left by default
  },
  Box3: { 
    frames: 12, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Box3.png'),
    defaultDirection: -1  // Faces left by default
  },
  Chilling: { 
    frames: 8, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Chilling.png'),
    defaultDirection: -1  // Faces left by default
  },
  Crying: { 
    frames: 4, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Crying.png'),
    defaultDirection: -1  // Faces left by default
  },
  Dance: { 
    frames: 4, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Dance.png'),
    defaultDirection: -1  // Faces left by default
  },
  Dead: { 
    frames: 1, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Dead.png'),
    defaultDirection: -1  // Faces right by default
  },
  Dead2: { 
    frames: 5, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Dead2.png'),
    defaultDirection: -1  // Faces right by default
  },
  Excited: { 
    frames: 3, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Excited.png'),
    defaultDirection: -1  // Faces left by default
  },
  Happy: { 
    frames: 10, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Happy.png'),
    defaultDirection: -1  // Faces left by default
  },
  Hurt: { 
    frames: 8, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Hurt.png'),
    defaultDirection: -1  // Faces right by default
  },
  Idle: { 
    frames: 6, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Idle.png'),
    defaultDirection: -1  // Faces left by default
  },
  Jump: { 
    frames: 12, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Jump.png'),
    defaultDirection: -1  // Faces right by default
  },
  Running: { 
    frames: 6, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Running.png'),
    defaultDirection: 1   // Faces right by default
  },
  Sleeping: { 
    frames: 4, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Sleeping.png'),
    defaultDirection: -1  // Faces left by default
  },
  Surprised: { 
    frames: 4, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Surprised.png'),
    defaultDirection: -1  // Faces left by default
  },
  Tickle: { 
    frames: 4, 
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Tickle.png'),
    defaultDirection: -1  // Faces left by default
  }
};

// Get an array of animation names for random selection
export const animationNames = Object.keys(catAnimations);

const CatAnimation = ({ 
  position = { x: 0, y: 0 }, 
  direction = 1, 
  animation = 'Idle',
  isSelected = false,
  onSelect = () => {},
  id = 'cat',
  zIndex = 10,
  roomRow,
  roomCol,
  roomCellSize,
  showDustParticles = false,
  showSpeechBubble = false,
  speechBubbleContent = "",
  speechBubblePosition = { top: 0, left: 0 },
  dustAnimations = []
}) => {
  const [frameIndex, setFrameIndex] = useState(0);
  const [currentAnimation, setCurrentAnimation] = useState(animation);
  const prevAnimationRef = useRef(animation);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Use the provided animation or default to 'Idle'
  useEffect(() => {
    if (animation !== prevAnimationRef.current) {
      // Quick fade out and back in for smooth transition
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 60,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Update animation and reference
      setCurrentAnimation(animation);
      prevAnimationRef.current = animation;
    }
  }, [animation, fadeAnim]);

  // Handle animation frames
  useEffect(() => {
    const animation = catAnimations[currentAnimation];
    if (!animation) return;
    
    // Advance frames
    const timer = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % animation.frames);
    }, animationInterval);
    
    // Clean up timer when component unmounts or dependencies change
    return () => clearInterval(timer);
  }, [currentAnimation]);

  // Get current animation data
  const animationData = catAnimations[currentAnimation];
  if (!animationData) return null;

  // Calculate position based on room coordinates if provided
  const left = roomCol !== undefined ? Math.floor(roomCol * roomCellSize) : position.x;
  const top = roomRow !== undefined ? Math.floor(roomRow * roomCellSize) : position.y;

  return (
    <React.Fragment>
      {/* Speech bubble if enabled */}
      {showSpeechBubble && (
        <View 
          style={{
            position: 'absolute',
            left: speechBubblePosition.left || left + (frameWidth * CAT_SIZE * 0.25),
            top: speechBubblePosition.top || top - 60,
            backgroundColor: 'white',
            borderRadius: 15,
            padding: 10,
            zIndex: Math.floor(roomRow || 0) + 20, 
            elevation: 5,
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 80,
            minHeight: 40,
          }}
        >
          <Text style={{ fontSize: 16, textAlign: 'center', flexWrap: 'wrap' }}>{speechBubbleContent}</Text>
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

      {/* Main cat sprite */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {
          onSelect(id);
        }}
        pointerEvents={isSelected ? 'none' : 'auto'}
        style={{
          position: 'absolute',
          left: left,
          top: top,
          width: frameWidth * CAT_SIZE,
          height: frameHeight * CAT_SIZE,
          opacity: isSelected ? 0.5 : 1,
          overflow: 'hidden',
          zIndex: zIndex || Math.floor(roomRow || 0) + 15,
          transform: [{ scaleX: direction }]
        }}
      >
        <Animated.Image
          source={animationData.source}
          style={{
            position: 'absolute',
            left: -Math.floor(frameIndex * frameWidth * CAT_SIZE),
            top: 0,
            width: frameWidth * animationData.frames * CAT_SIZE,
            height: frameHeight * CAT_SIZE,
            resizeMode: 'contain',
            opacity: fadeAnim,
          }}
        />
      </TouchableOpacity>

      {/* Dust particles if enabled */}
      {showDustParticles && (
        <View 
          style={{
            position: 'absolute',
            left: left - 10,
            top: top - 10,
            width: frameWidth * CAT_SIZE + 20,
            height: frameHeight * CAT_SIZE + 10,
            zIndex: Math.floor(roomRow || 0) + 16,
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
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                borderRadius: 2,
                opacity: anim.opacity
              }}
            />
          ))}
        </View>
      )}
    </React.Fragment>
  );
};

// Utility function to play an animation once and then return to previous animation
export const playCatAnimationOnce = (
  newAnimation,
  previousAnimation,
  setAnimation,
  onComplete = () => {}
) => {
  setAnimation(newAnimation);
  
  // Calculate duration based on animation frames
  const animationDuration = animationInterval * catAnimations[newAnimation].frames;
  
  // Reset to previous animation after it completes
  setTimeout(() => {
    setAnimation(previousAnimation);
    onComplete();
  }, animationDuration + 50);
};

// Helper function to get a random animation
export const getRandomAnimation = (exclude = []) => {
  const availableAnimations = animationNames.filter(name => !exclude.includes(name));
  const randomIndex = Math.floor(Math.random() * availableAnimations.length);
  return availableAnimations[randomIndex];
};

// Helper to determine appropriate animation based on stats
export const getAnimationBasedOnStats = (stats) => {
  const { hunger, clean, happy } = stats;

  // Priority order: hunger, cleanliness, happiness
  if (hunger < 20) return 'Crying';
  if (clean < 20) return 'Hurt';
  if (happy < 20) return 'Sleeping';
  
  // Happier animations for better stats
  if (hunger > 80 && clean > 80 && happy > 80) return 'Happy';
  if (hunger > 60 && clean > 60) return 'Chilling';
  
  // Default animation
  return 'Idle';
};

export default CatAnimation;
