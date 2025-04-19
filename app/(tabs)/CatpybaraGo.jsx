// CatpybaraGo.jsx
import React, { useState, useRef, useEffect } from 'react';
import { View, Animated, Easing, Dimensions } from 'react-native';


const { width } = Dimensions.get('window');

const CatpybaraGo = ({ 
  showingPopup = false,
  onPopupEnterComplete = () => {},
  style = {},
  onAttackComplete = () => {} // New callback for when attack completes
}) => {
  const [trees, setTrees] = useState([]);
  const [clouds, setClouds] = useState([]);
  const [animationsActive, setAnimationsActive] = useState(true);
  const [dogVisible, setDogVisible] = useState(false);
  const [isAttacking, setIsAttacking] = useState(false); // New state for attack animation

  const treeTimerRef = useRef(null);
  const cloudTimerRef = useRef(null);
  const animationsRef = useRef({});
  const pauseTimerRef = useRef(null);
  const pausedAnimValues = useRef({});
  const treeCounter = useRef(0);
  const cloudCounter = useRef(0);
  const dogAnimRef = useRef(new Animated.Value(width)).current;
  const prevShowingPopupRef = useRef(showingPopup);

  // Function to trigger the attack animation
  const triggerAttack = () => {
    // Pause all animations during attack
    pauseAnimations();
    setIsAttacking(true);
  };

  // Handler for when attack animation completes
  const handleAttackComplete = () => {
    setIsAttacking(false);
    // Resume animations after attack
    startAnimations();
    // Notify parent component if needed
    onAttackComplete();
  };

  // Effect to manage dog animation based on popup visibility changes
  useEffect(() => {
    const wasShowingPopup = prevShowingPopupRef.current;
    prevShowingPopupRef.current = showingPopup;
    
    if (wasShowingPopup && !showingPopup) {
      // Popup changed from visible to hidden - show dog and animate it
      setDogVisible(true);
      dogAnimRef.setValue(width); // Start from right edge
      
      // Create unique ID for the dog animation so we can track it
      const dogId = `dog-${Date.now()}`;
      animationsRef.current[dogId] = dogAnimRef;
      
      // Use the same duration and movement as trees
      Animated.timing(dogAnimRef, {
        toValue: -100, // Move full distance like trees
        duration: 6000, // Same duration as trees
        useNativeDriver: true,
        easing: Easing.linear, // Same easing as trees
      }).start(({finished}) => {
        if (finished) {
          setDogVisible(false);
          delete animationsRef.current[dogId];
          delete pausedAnimValues.current[dogId];
        }
      });
    } 
    else if (!wasShowingPopup && showingPopup) {
      // When popup reappears, let the dog continue its animation to the left
      // No need to change anything here - the dog will complete its journey
      // The animation completion callback will handle removing the dog when it's off-screen
    }
  }, [showingPopup, dogAnimRef, animationsActive]);

  // Effect to manage animations based on popup visibility
  useEffect(() => {
    if (showingPopup) {
      setAnimationsActive(true);
      startAnimations();
      
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
    } else {
      pauseTimerRef.current = setTimeout(() => {
        if (!showingPopup && !isAttacking) { // Don't auto-pause if attacking
          pauseAnimations();
        }
      }, 2000);
    }
    
    return () => {
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
      }
    };
  }, [showingPopup, isAttacking]);

  // Effect to manage tree creation and animation
  useEffect(() => {
    if (treeTimerRef.current) {
      clearInterval(treeTimerRef.current);
      treeTimerRef.current = null;
    }
    
    if (animationsActive) {      
      treeTimerRef.current = setInterval(() => {
        createNewTree();
      }, 2000);
    }
    
    return () => {
      if (treeTimerRef.current) {
        clearInterval(treeTimerRef.current);
      }
    };
  }, [animationsActive]);

  // Effect to manage cloud creation and animation
  useEffect(() => {
    if (cloudTimerRef.current) {
      clearInterval(cloudTimerRef.current);
      cloudTimerRef.current = null;
    }
    
    if (animationsActive) {
      cloudTimerRef.current = setInterval(() => {
        createNewCloud();
      }, 5000);
    }
    
    return () => {
      if (cloudTimerRef.current) {
        clearInterval(cloudTimerRef.current);
      }
    };
  }, [animationsActive]);

  // Function to pause all running animations
  const pauseAnimations = () => {
    setAnimationsActive(false);
    
    Object.entries(animationsRef.current).forEach(([id, anim]) => {
      if (anim && typeof anim.stopAnimation === 'function') {
        anim.stopAnimation(value => {
          pausedAnimValues.current[id] = value;
        });
      }
    });
  };
  
  // Function to start/resume all animations
  const startAnimations = () => {
    setAnimationsActive(true);
    
    if (Object.keys(pausedAnimValues.current).length > 0) {
      resumeAnimations();
    }
  };
  
  // Function to resume paused animations from their last position
  const resumeAnimations = () => {
    Object.entries(animationsRef.current).forEach(([id, anim]) => {
      if (anim) {
        let element;
        
        if (id.includes('dog')) {
          // Special handling for dog animation
          element = { id };
        } else {
          // Find element in trees or clouds
          element = [...trees, ...clouds].find(el => el.id === id);
        }
        
        if (element) {
          const pausedValue = pausedAnimValues.current[id];
          
          if (pausedValue !== undefined) {
            anim.setValue(pausedValue);
            
            const remainingDistance = pausedValue + 100;
            const totalDistance = width + 100;
            const remainingPortion = remainingDistance / totalDistance;
            
            let baseDuration;
            if (id.includes('cloud')) {
              baseDuration = 15000;
            } else if (id.includes('dog') || id.includes('tree')) {
              baseDuration = 6000;
            } else {
              baseDuration = 6000; // Default
            }
            
            const adjustedDuration = baseDuration * remainingPortion;
            
            Animated.timing(anim, {
              toValue: -100,
              duration: adjustedDuration,
              useNativeDriver: true,
              easing: Easing.linear,
            }).start(({ finished }) => {
              if (finished) {
                if (id.includes('tree')) {
                  setTrees(prevTrees => prevTrees.filter(t => t.id !== id));
                } else if (id.includes('cloud')) {
                  setClouds(prevClouds => prevClouds.filter(c => c.id !== id));
                } else if (id.includes('dog')) {
                  setDogVisible(false);
                }
                delete animationsRef.current[id];
                delete pausedAnimValues.current[id];
              }
            });
          }
        }
      }
    });
  };
  
  // Cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      cleanupAllAnimations();
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
      }
    };
  }, []);

  // Function to create a new tree animation
  const createNewTree = () => {
    treeCounter.current += 1;
    const treeId = `tree-${Date.now()}-${treeCounter.current}`;
    const treeSize = 35;
    const treeBottom = 5;
    
    const treeAnim = new Animated.Value(width);
    animationsRef.current[treeId] = treeAnim;
    
    setTrees(prevTrees => [
      ...prevTrees,
      {
        id: treeId,
        emoji: '🌲',
        size: treeSize,
        bottom: treeBottom,
        anim: treeAnim,
      }
    ]);
    
    Animated.timing(treeAnim, {
      toValue: -100,
      duration: 6000,
      useNativeDriver: true,
      easing: Easing.linear,
    }).start(({ finished }) => {
      if (finished && animationsActive) {
        setTrees(prevTrees => prevTrees.filter(tree => tree.id !== treeId));
        delete animationsRef.current[treeId];
        delete pausedAnimValues.current[treeId];
      }
    });
  };

  // Function to create a new cloud animation
  const createNewCloud = () => {
    cloudCounter.current += 1;
    const cloudId = `cloud-${Date.now()}-${cloudCounter.current}`;
    const cloudSize = 28;
    
    const randomTop = Math.floor(Math.random() * 10) + 3;
    
    const cloudAnim = new Animated.Value(width);
    animationsRef.current[cloudId] = cloudAnim;
    
    setClouds(prevClouds => [
      ...prevClouds,
      {
        id: cloudId,
        emoji: '☁️',
        size: cloudSize,
        top: randomTop,
        anim: cloudAnim,
      }
    ]);
    
    Animated.timing(cloudAnim, {
      toValue: -100,
      duration: 15000,
      useNativeDriver: true,
      easing: Easing.linear,
    }).start(({ finished }) => {
      if (finished && animationsActive) {
        setClouds(prevClouds => prevClouds.filter(cloud => cloud.id !== cloudId));
        delete animationsRef.current[cloudId];
        delete pausedAnimValues.current[cloudId];
      }
    });
  };

  // Function to clean up all animation resources
  const cleanupAllAnimations = () => {
    if (treeTimerRef.current) {
      clearInterval(treeTimerRef.current);
      treeTimerRef.current = null;
    }
    
    if (cloudTimerRef.current) {
      clearInterval(cloudTimerRef.current);
      cloudTimerRef.current = null;
    }
    
    Object.values(animationsRef.current).forEach(anim => {
      if (anim && typeof anim.stop === 'function') {
        anim.stop();
      }
    });
    
    animationsRef.current = {};
    pausedAnimValues.current = {};
    setTrees([]);
    setClouds([]);
    setDogVisible(false); // Also hide the dog
  };

  return (
    <View style={[{ width: '100%', height: 102, position: 'relative', overflow: 'hidden' }, style]}>
      {/* Clouds */}
      {clouds.map(cloud => (
        <Animated.Text
          key={cloud.id}
          style={[
            {
              fontSize: cloud.size,
              top: cloud.top,
              transform: [{ translateX: cloud.anim }],
              position: 'absolute',
              left: 0,
              zIndex: 5,
            }
          ]}
        >
          {cloud.emoji}
        </Animated.Text>
      ))}
      
      {/* Trees */}
      {trees.map(tree => (
        <Animated.Text
          key={tree.id}
          style={[
            {
              fontSize: tree.size,
              bottom: tree.bottom,
              transform: [{ translateX: tree.anim }],
              position: 'absolute',
              left: 0,
              zIndex: 1,
            }
          ]}
        >
          {tree.emoji}
        </Animated.Text>
      ))}
      
      {/* Cat Character */}
      <View style={{ position: 'absolute', left: '25%', transform: [{ translateX: -32 }], bottom: 3, zIndex: 10 }}>
        
      </View>

      {/* Dog Character */}
      {dogVisible && (
        <Animated.Text
          style={{
            fontSize: 35,
            position: 'absolute',
            transform: [{ translateX: dogAnimRef }],
            bottom: 5,
            zIndex: 8,
          }}
        >
          🐶
        </Animated.Text>
      )}
    </View>
  );
};

// Add triggerAttack to the exports
CatpybaraGo.triggerAttack = function(ref) {
  if (ref && ref.current && typeof ref.current.triggerAttack === 'function') {
    ref.current.triggerAttack();
  }
};

export default CatpybaraGo;