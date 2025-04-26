/**
 * Helper utilities for managing cat animations and preventing flickering
 * during transitions between different animation states
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Global flag to track if animations have been loaded
let animationsGloballyLoaded = false;

// Function to check if animations are already loaded
export const areAnimationsLoaded = () => {
  return animationsGloballyLoaded;
};

// Function to set animations as loaded
export const setAnimationsLoaded = () => {
  animationsGloballyLoaded = true;
};

/**
 * Changes the cat animation with an immediate transition
 * 
 * @param {string} newAnimation - The new animation name to transition to
 * @param {function} setCurrentAnimation - State setter for the current animation
 * @param {function} setFrameIndex - State setter for the animation frame index
 * @returns {Promise} A promise that resolves when the animation has changed
 */
export const changeAnimation = (
  newAnimation,
  setCurrentAnimation, 
  setFrameIndex
) => {
  return new Promise((resolve) => {
    // Reset the frame index first to start the animation from the beginning
    setFrameIndex(0);
    
    // Immediately change the animation source (no delay)
    setCurrentAnimation(newAnimation);
    
    // Resolve immediately
    resolve();
  });
};

/**
 * Changes the cat animation and then automatically changes back after animation completes
 * 
 * @param {string} newAnimation - The temporary animation to show
 * @param {string} previousAnimation - The animation to return to after completion
 * @param {function} setCurrentAnimation - State setter for the current animation
 * @param {function} setFrameIndex - State setter for the animation frame index
 * @param {object} animationData - Object containing animation data (needs frames property)
 * @param {number} interval - The interval between animation frames in ms
 * @returns {Promise} A promise that resolves when the animation sequence completes
 */
export const playAnimationOnce = (
  newAnimation,
  previousAnimation,
  setCurrentAnimation,
  setFrameIndex,
  animationData,
  interval
) => {
  return new Promise((resolve) => {
    // First reset frame index
    setFrameIndex(0);
    
    // Immediately change to the new animation
    setCurrentAnimation(newAnimation);
    
    // Calculate animation duration
    const frames = animationData[newAnimation]?.frames || 4;
    const animationDuration = interval * frames;
    
    // After animation completes, set back to previous animation
    setTimeout(() => {
      // Reset frame index before changing back
      setFrameIndex(0);
      
      // Change back to previous animation
      setCurrentAnimation(previousAnimation);
      resolve();
    }, animationDuration); // Just the exact duration needed
  });
};

// Save animation loaded state for app restarts
export const saveAnimationLoadedState = async () => {
  try {
    await AsyncStorage.setItem('animations_loaded', 'true');
  } catch (e) {
    console.error('Failed to save animation loaded state', e);
  }
};

// Check if animations were previously loaded from AsyncStorage
export const checkAnimationLoadedState = async () => {
  try {
    const value = await AsyncStorage.getItem('animations_loaded');
    if (value === 'true') {
      animationsGloballyLoaded = true;
      return true;
    }
    return false;
  } catch (e) {
    console.error('Failed to load animation state', e);
    return false;
  }
};
