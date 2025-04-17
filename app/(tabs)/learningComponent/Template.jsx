import React, { useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Text, 
  Animated, 
  Easing,
  Dimensions
} from 'react-native';

const { width, height } = Dimensions.get('window');
const NAV_HEIGHT = 60;

export default function Template({ 
  progress, 
  onConfirm, 
  onSkip, 
  onBack, 
  children,
  toastMessage,
  toastType,
  popupData,
  onToastComplete,
  persistentToast,
  actionButtonText = 'Continue', // Default to "Continue"
  lives,
  coinsEarned = 10 // Default value
}) {
  // Animated refs for popup
  const popupScale = React.useRef(new Animated.Value(0.8)).current;
  const popupOpacity = React.useRef(new Animated.Value(0)).current;
  const popupTranslate = React.useRef(new Animated.Value(50)).current;
  
  useEffect(() => {
    if (toastMessage) {
      Animated.parallel([
        Animated.timing(popupScale, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(popupOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(popupTranslate, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      ]).start();
  
      if (!persistentToast) {
        const timer = setTimeout(() => {
          Animated.parallel([
            Animated.timing(popupScale, {
              toValue: 0.8,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(popupOpacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(popupTranslate, {
              toValue: 50,
              duration: 300,
              useNativeDriver: true,
            })
          ]).start(() => {
            onToastComplete?.();
          });
        }, 1500);
        return () => clearTimeout(timer);
      }
    } else {
      // Reset popups if no toast
      popupOpacity.setValue(0);
      popupScale.setValue(0.8);
      popupTranslate.setValue(50);
    }
  }, [toastMessage, onToastComplete, persistentToast, popupScale, popupOpacity, popupTranslate]);
  
  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navButton} onPress={onBack}>
          <Text style={styles.navButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <Text style={styles.livesText}>❤️ Lives: {lives}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
        <TouchableOpacity style={styles.navButton} onPress={onSkip}>
          <Text style={styles.navButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>
  
      {/* Content Area */}
      <View style={styles.contentArea}>
        {children}
      </View>
  
      {/* Continue Button (no popup visible => show button) */}
      {!toastMessage && (
        <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
          <Text style={styles.confirmButtonText}>{actionButtonText}</Text>
        </TouchableOpacity>
      )}
  
      {/* Popup Overlay */}
      {popupData && (
        <Animated.View
          style={[
            styles.popupContainer,
            { 
              transform: [{ translateY: popupTranslate }, { scale: popupScale }],
              opacity: popupOpacity,
              backgroundColor: toastType === 'summary' ? '#4A90E2' : 
                               toastType === 'correct' ? '#60B84B' : '#FF3B30',
            }
          ]}
        >
          <Text style={styles.popupTitle}>{toastMessage}</Text>
          {popupData && (
            <View style={styles.innerPopupContainer}>
              {Array.isArray(popupData) ? (
                // Memory Game Summary
                popupData.map((item, index) => (
                  <View key={index} style={styles.summaryItem}>
                    <Text style={styles.targetWord}>{item.foreignWord}</Text>
                    {item.phonetic && (
                      <Text style={styles.exampleInfo}>Phonetic: {item.phonetic}</Text>
                    )}
                    <Text style={styles.exampleInfo}>Meaning: {item.meaning}</Text>
                  </View>
                ))
              ) : (
                // PairOrNotPair Feedback
                <>
                  <Text style={styles.targetWord}>{popupData.foreignWord}</Text>
                  {popupData.example?.sentence && (
                    <Text style={styles.exampleSentence}>
                      {popupData.example.sentence}
                    </Text>
                  )}
                  {popupData.example && (
                    <Text style={styles.exampleInfo}>
                      {popupData.example.phonetic} - {popupData.example.translation}
                    </Text>
                  )}
                  <Text style={styles.exampleInfo}>Meaning: {popupData.targetMeaning}</Text>
                </>
              )}
            </View>
          )}
          {toastType === 'correct' && (
            <Text style={styles.rewardText}>
              🃏 You earned {coinsEarned} Gold 💰
            </Text>
          )}
          <TouchableOpacity 
            style={styles.popupButton} 
            onPress={onConfirm}
          >
            <Text style={styles.popupButtonText}>{actionButtonText}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}
  
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5',
  },
  navBar: {
    height: NAV_HEIGHT,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#4A90E2',
    elevation: 2,
    marginTop: 10,
  },
  navButton: {
    padding: 10,
  },
  navButtonText: {
    fontSize: 22,
    color: '#fff',
  },
  navCenter: {
    flex: 1,
    alignItems: 'center',
  },
  livesText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#fff',
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: '#ddd',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#28a745',
    borderRadius: 4,
  },
  contentArea: {
    flex: 1,
    width: '100%',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#007AFF',
    width: '90%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  popupContainer: {
    position: 'absolute',
    top: NAV_HEIGHT,
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  popupTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  innerPopupContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  summaryItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    width: '100%',
  },
  targetWord: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 5,
  },
  exampleInfo: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
  },
  exampleSentence: {
    fontSize: 20,
    color: '#333',
    marginBottom: 6,
    textAlign: 'center',
  },
  rewardText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
  popupButton: {
    backgroundColor: '#007AFF',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '90%',
    alignItems: 'center',
  },
  popupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
