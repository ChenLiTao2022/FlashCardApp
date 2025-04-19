// catAnimations.js

/**
 * Cat Animations Library
 * 
 * This library organizes all cat sprite animations for easy access and use
 * throughout the application.
 */
import React, { useRef, useEffect, useState } from 'react';
import { View, Animated } from 'react-native';

/**
 * RunningCat Component
 * A stationary running cat animation for the navigation bar
 */
export const RunningCat = ({ spriteSrc, frames = 6, frameDuration = 100, isPaused = false }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef(null);

  useEffect(() => {
    let currentFrame = 0;

    const startAnimation = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      intervalRef.current = setInterval(() => {
        currentFrame = (currentFrame + 1) % frames;
        translateX.setValue(-currentFrame * 64); // Assuming 64px is the width of one frame
      }, frameDuration);
    };

    const stopAnimation = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    if (!isPaused) {
      startAnimation();
    } else {
      stopAnimation();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [frames, frameDuration, translateX, isPaused]);

  return (
    <View style={{ width: 64, height: 64, overflow: 'hidden' }}>
      <Animated.Image
        source={spriteSrc}
        style={{ 
          width: 64 * frames, 
          height: 64, 
          transform: [{ translateX }] 
        }}
      />
    </View>
  );
};

/**
 * AnimatedCat Component
 * A cat that can transition between animations
 */
export const AnimatedCat = ({ 
  isPaused = false, 
  showPopup = false,
  onPopupEnterComplete = () => {},
  transitionTime = 2000,
}) => {
  const [currentAnimation, setCurrentAnimation] = useState('idle'); // Start with idle
  const [internalPaused, setInternalPaused] = useState(isPaused);
  const popupTimerRef = useRef(null);
  const transitionTimerRef = useRef(null);
  
  useEffect(() => {
    // When a popup appears
    if (showPopup) {
      // Clear any existing transition timer
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
      
      // Switch to running when popup appears
      setCurrentAnimation('running');
      setInternalPaused(false);
      
      // Notify parent immediately
      onPopupEnterComplete();
      
      // Clear any existing timers
      if (popupTimerRef.current) {
        clearTimeout(popupTimerRef.current);
        popupTimerRef.current = null;
      }
    } else {
      // When popup disappears, switch to idle animation
      setCurrentAnimation('idle');
      
      setInternalPaused(isPaused);
    }
    
    return () => {
      if (popupTimerRef.current) {
        clearTimeout(popupTimerRef.current);
      }
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, [showPopup, isPaused, onPopupEnterComplete]);
  
  // External control of animation state
  useEffect(() => {
    if (isPaused) {
      setInternalPaused(true);
    } else {
      setInternalPaused(false);
    }
  }, [isPaused]);
  
  // Select sprite based on current animation
  const getAnimationSprite = () => {
    switch(currentAnimation) {
      case 'idle':
        return {
          spriteSrc: ANIMATIONS.IDLE.source,
          frames: ANIMATIONS.IDLE.frames,
          frameDuration: ANIMATIONS.IDLE.frameDuration,
        };
      case 'running':
      default:
        return {
          spriteSrc: ANIMATIONS.RUNNING.source,
          frames: ANIMATIONS.RUNNING.frames,
          frameDuration: ANIMATIONS.RUNNING.frameDuration,
        };
    }
  };
  
  const { spriteSrc, frames, frameDuration } = getAnimationSprite();
  const isIdle = currentAnimation === 'idle';
  
  return (
    <View style={{ 
      width: 64, 
      height: 64, 
      overflow: 'hidden',
      transform: [{ scaleX: isIdle ? -1 : 1 }, {scale: isIdle ? 0.8 : 1}] // Flip horizontally when idle
    }}>
      <RunningCat
        spriteSrc={spriteSrc}
        frames={frames}
        frameDuration={frameDuration}
        isPaused={internalPaused}
      />
    </View>
  );
};

// Export future mini-game components here

// Animation categories
const CATEGORIES = {
  POSITIVE: 'positive',
  NEGATIVE: 'negative',
  NEUTRAL: 'neutral',
  ACTION: 'action',
  REST: 'rest'
};

// All available animations with their properties
const ANIMATIONS = {
  ATTACK: {
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Attack.png'),
    frames: 7,
    frameDuration: 100,
    category: CATEGORIES.ACTION,
    description: 'Cat attacking',
    messages: [
      'Found a mouse!\nHunting +5',
      'Caught a bird!\nHunting skill +3',
      'Attacking a toy!\nEnergy -2'
    ]
  },
  BOX1: {
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Box1.png'),
    frames: 12,
    frameDuration: 100,
    category: CATEGORIES.POSITIVE,
    description: 'Cat playing in box style 1',
    messages: [
      'Found a cozy box!\nComfort +5',
      'This box is perfect!\nHappiness +3',
      'New hiding spot!\nSecurity +4'
    ]
  },
  BOX2: {
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Box2.png'),
    frames: 10,
    frameDuration: 100,
    category: CATEGORIES.POSITIVE,
    description: 'Cat playing in box style 2',
    messages: [
      'Box fits perfectly!\nComfort +4',
      'Ambush from box!\nStealth +3',
      'Box exploration!\nCuriosity +5'
    ]
  },
  BOX3: {
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Box3.png'),
    frames: 12,
    frameDuration: 100,
    category: CATEGORIES.POSITIVE,
    description: 'Cat playing in box style 3',
    messages: [
      'Box fortress!\nDefense +5',
      'Cardboard palace!\nStyle +4',
      'Box kingdom!\nDomination +3'
    ]
  },
  CHILLING: {
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Chilling.png'),
    frames: 8,
    frameDuration: 120,
    category: CATEGORIES.NEUTRAL,
    description: 'Cat relaxing',
    messages: [
      'Just chilling...\nStress -3',
      'Relaxing time\nEnergy +2',
      'Cool as a cat\nCalmness +4'
    ]
  },
  CRYING: {
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Crying.png'),
    frames: 4,
    frameDuration: 200,
    category: CATEGORIES.NEGATIVE,
    description: 'Cat crying',
    messages: [
      'Bowl is empty!\nHunger +3',
      'Need attention!\nLoneliness +4',
      'Sad meows...\nHappiness -2'
    ]
  },
  DANCE: {
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Dance.png'),
    frames: 4,
    frameDuration: 120,
    category: CATEGORIES.POSITIVE,
    description: 'Cat dancing',
    messages: [
      'Happy dance!\nMood +5',
      'Victory dance!\nPride +3',
      'Dancing with joy!\nHappiness +4'
    ]
  },
  DEAD: {
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Dead.png'),
    frames: 1,
    frameDuration: 500,
    category: CATEGORIES.REST,
    description: 'Cat laying upside down',
    messages: [
      'Playing dead!\nActing +5',
      'Belly exposed!\nTrust +4',
      'Maximum relaxation\nStress -5'
    ]
  },
  DEAD2: {
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Dead2.png'),
    frames: 5,
    frameDuration: 200,
    category: CATEGORIES.NEGATIVE,
    description: 'Cat fainted',
    messages: [
      'Too tired...\nEnergy -4',
      'Dramatically fainted\nDrama +5',
      'Exhausted!\nStamina -3'
    ]
  },
  EXCITED: {
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Excited.png'),
    frames: 10,
    frameDuration: 80,
    category: CATEGORIES.POSITIVE,
    description: 'Cat excited',
    messages: [
      'Very excited!\nEnergy +4',
      'Treats incoming!\nHappiness +5',
      'Super thrilled!\nPlayfulness +3'
    ]
  },
  HAPPY: {
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Happy.png'),
    frames: 10,
    frameDuration: 100,
    category: CATEGORIES.POSITIVE,
    description: 'Cat happy',
    messages: [
      'Very happy!\nMood +4',
      'Got pets!\nAffection +5',
      'Purring loudly\nContentment +3'
    ]
  },
  HURT: {
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Hurt.png'),
    frames: 8,
    frameDuration: 120,
    category: CATEGORIES.NEGATIVE,
    description: 'Cat hurt',
    messages: [
      'Stepped on tail!\nPain +3',
      'Fell off shelf\nGrace -2',
      'Ouch! That hurt!\nCaution +4'
    ]
  },
  IDLE: {
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Idle.png'),
    frames: 6,
    frameDuration: 150,
    category: CATEGORIES.NEUTRAL,
    description: 'Cat idle',
    messages: [
      'Just waiting...\nPatience +3',
      'Observing quietly\nAlertness +2',
      'Cat.exe is running\nProcess +1'
    ]
  },
  JUMP: {
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Jump.png'),
    frames: 12,
    frameDuration: 80,
    category: CATEGORIES.ACTION,
    description: 'Cat jumping',
    messages: [
      'Perfect jump!\nAgility +4',
      'Leaped high!\nStrength +3',
      'Surprise attack!\nStealth +5'
    ]
  },
  RUNNING: {
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Running.png'),
    frames: 6,
    frameDuration: 100,
    category: CATEGORIES.ACTION,
    description: 'Cat running',
    messages: [
      'Zoomies time!\nSpeed +5',
      'Late night sprint\nEnergy -2',
      'Chasing shadows\nPlayfulness +3'
    ]
  },
  SLEEPING: {
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Sleeping.png'),
    frames: 4,
    frameDuration: 300,
    category: CATEGORIES.REST,
    description: 'Cat sleeping',
    messages: [
      'Sweet dreams\nEnergy +4',
      'Nap time\nRestfulness +3',
      'ZZZzzz...\nRecovery +5'
    ]
  },
  SURPRISED: {
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Surprised.png'),
    frames: 4,
    frameDuration: 150,
    category: CATEGORIES.NEUTRAL,
    description: 'Cat surprised',
    messages: [
      'Cucumber spotted!\nFear +5',
      'Unexpected noise!\nAlertness +3',
      'What was that?!\nCaution +4'
    ]
  },
  TICKLE: {
    source: require('../asset/RetroCatsPaid/Cats/Sprites/Tickle.png'),
    frames: 4,
    frameDuration: 150,
    category: CATEGORIES.POSITIVE,
    description: 'Cat being tickled',
    messages: [
      'Belly rubs!\nHappiness +4',
      'Ticklish spot!\nPlayfulness +3',
      'Gentle pets\nAffection +5'
    ]
  }
};

// Get animations by category
const getAnimationsByCategory = (category) => {
  return Object.values(ANIMATIONS).filter(anim => anim.category === category);
};

// Get a random animation from a specific category
const getRandomAnimation = (category) => {
  const animationsInCategory = getAnimationsByCategory(category);
  return animationsInCategory[Math.floor(Math.random() * animationsInCategory.length)];
};

// Get a random positive animation (for correct answers)
const getRandomPositiveAnimation = () => {
  return getRandomAnimation(CATEGORIES.POSITIVE);
};

// Get a random negative animation (for wrong answers)
const getRandomNegativeAnimation = () => {
  return getRandomAnimation(CATEGORIES.NEGATIVE);
};

// Get a random animation with message
const getRandomAnimationWithMessage = (isPositive = true) => {
  const animation = isPositive ? getRandomPositiveAnimation() : getRandomNegativeAnimation();
  const messageIndex = Math.floor(Math.random() * animation.messages.length);
  
  return {
    sprite: animation.source,
    frames: animation.frames,
    frameDuration: animation.frameDuration,
    message: animation.messages[messageIndex]
  };
};

export default {
  ANIMATIONS,
  CATEGORIES,
  getAnimationsByCategory,
  getRandomAnimation,
  getRandomPositiveAnimation,
  getRandomNegativeAnimation,
  getRandomAnimationWithMessage
};