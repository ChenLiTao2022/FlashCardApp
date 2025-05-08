// Review.jsx
// cardId: selectedDueCards[0].id, activity: 0 is the card that will be used for the first round
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import * as SQLite from 'expo-sqlite';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Hangman from './learningComponent/0Hangman';
import ImagePicker from './learningComponent/0ImagePicker.jsx';
import ImagePickerReverse from './learningComponent/0ImagePickerReverse.jsx';
import PairOrNotPair from './learningComponent/0PairOrNotPairWord.jsx';
import PhoneticChoice from './learningComponent/0WhichPhonetic.jsx';
import ForeignSentenceWrite from './learningComponent/2ForeignSentenceWrite.jsx';
import ListenResponse from './learningComponent/2ListenResponse.jsx';
import Match from './learningComponent/2MatchOrNot.jsx';
import SentencePairOrNotPair from './learningComponent/2PairOrNotPairSentence.jsx';
import SentenceJumble from './learningComponent/2SentenceJumble.jsx';
import SentenceJumbleAnswer from './learningComponent/2SentenceJumbleAnswer.jsx';
import SentenceJumbleTranslate from './learningComponent/2SentenceJumbleTranslate.jsx';
import SentencePick from './learningComponent/2SentencePick.jsx';
// Import getTemplateByLanguage from template file


const db = SQLite.openDatabaseSync('mydb.db');

// Global variable for deck language
let deckLanguage = '';

// Define reusable punctuation regex patterns
const PUNCTUATION_REGEX = /^[\s.,!?;:"()[\]{}，。！？；：""''「」『』【】《》〈〉（）]+$/;
const PUNCTUATION_REPLACE_REGEX = /[\s.,!?;:"()[\]{}，。！？；：""''「」『』【】《》〈〉（）]/g;

// Utility function to check if a language doesn't use spaces
export const isSpaceFreeLanguage = (language) => {
  const spaceFreeLanguages = ['Chinese', 'Japanese', 'Korean'];
  return spaceFreeLanguages.includes(language);
};

// Word-by-word translation utility functions and components
// These can be reused across different activity components

// Function to remove any # characters from text
export const cleanText = (text) => {
  if (!text) return '';
  return text.replace(/#/g, '');
};

// Parse word by word translations from a string format
export const parseWordByWord = (wordByWordStr) => {
  if (!wordByWordStr) return {};
  
  const mappings = {};
  const pairs = wordByWordStr.split('|');
  
  pairs.forEach(pair => {
    // Handles formats like "word=translation" or "多分=maybe"
    const [word, translation] = pair.split('=');
    if (word && translation) {
      mappings[word.trim()] = translation.trim();
    }
  });
  
  return mappings;
};

// Function to break a sentence into individual words
export const breakSentenceIntoWords = (sentence, targetWord, wordByWordMap = {}, language = '') => {
  if (!sentence) return [];
  
  // Remove the #s from the sentence
  const cleanedSentence = cleanText(sentence);
  
  // Replace the target word with a special marker if provided
  const sentenceWithMarker = targetWord ? 
    cleanedSentence.replace(targetWord, '___BLANK___') : 
    cleanedSentence;
  
  let words = [];
  
  // Use passed language parameter, fall back to global deckLanguage if not provided
  const langToUse = language || deckLanguage;
  
  // Check language to determine tokenization approach
  if (isSpaceFreeLanguage(langToUse)) {
    // For CJK languages without spaces (Chinese, Japanese, etc.)
    // First check if we have a wordByWord mapping
    if (Object.keys(wordByWordMap).length > 0) {
      // We'll use the wordByWordMap keys to identify word boundaries
      let remainingSentence = sentenceWithMarker;
      
      // Sort keys by length (longest first) to avoid partial matches
      const wordKeys = Object.keys(wordByWordMap).sort((a, b) => b.length - a.length);
      
      while (remainingSentence.length > 0) {
        // Check for the blank marker first
        if (remainingSentence.startsWith('___BLANK___')) {
          words.push('___BLANK___');
          remainingSentence = remainingSentence.substring(11);
          continue;
        }
        
        // Try to match with a word from the wordByWordMap
        let matched = false;
        for (const key of wordKeys) {
          if (remainingSentence.startsWith(key)) {
            words.push(key);
            remainingSentence = remainingSentence.substring(key.length);
            matched = true;
            break;
          }
        }
        
        // If no match found, take one character
        if (!matched) {
          words.push(remainingSentence[0]);
          remainingSentence = remainingSentence.substring(1);
        }
      }
    } else {
      // Fallback: For CJK without wordByWord mapping, just split by characters
      let i = 0;
      while (i < sentenceWithMarker.length) {
        if (sentenceWithMarker.substring(i, i + 11) === '___BLANK___') {
          words.push('___BLANK___');
          i += 11;
        } else {
          words.push(sentenceWithMarker[i]);
          i++;
        }
      }
    }
  } else {
    // For languages with spaces (English, German, etc.)
    // Split by spaces and keep punctuation
    const splitRegex = /(\s+|[.,!?;:"()[\]{}，。！？；：「」『』【】《》〈〉（）—–\-…、〜‧·@#%&*^_|\\/=<>'`~])/;
    const temp = sentenceWithMarker.split(splitRegex);
    words = temp.filter(w => w.trim() !== ''); // Remove empty items
  }
  
  return words;
};

// Component to display a tappable word
export const TappableWord = ({ word, translation, onPress, isActive, language }) => {
  const wordRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Don't show translation bubble for spaces and punctuation
  const hasTranslation = translation && !PUNCTUATION_REGEX.test(word);
  
  // Speak the word when tapped
  const speakWord = (text) => {
    // Remove punctuation from the text
    const cleanedText = text.replace(PUNCTUATION_REPLACE_REGEX, '');
    
    // If after removing punctuation the text is empty, don't speak it
    if (cleanedText.length === 0) return;
    
    console.log("Speaking word:", text);
    console.log("Using language for pronunciation:", language);
    
    // Configure speech options based on language
    const options = { 
      rate: 1,
      pitch: 1.0,
      onStart: () => setIsSpeaking(true),
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: (error) => {
        console.error("Speech error:", error);
        setIsSpeaking(false);
      }
    };
    console.log(language)
    // Set language code directly based on card language
    switch (language) {
      
      case 'Chinese':
        options.language = 'zh-CN';
        console.log("Using Chinese (zh-CN) pronunciation");
        break;
      case 'Japanese':
        options.language = 'ja-JP';
        console.log("Using Japanese (ja-JP) pronunciation");
        break;
      case 'German':
        options.language = 'de-DE';
        console.log("Using German (de-DE) pronunciation");
        break;
      case 'Spanish':
        options.language = 'es-ES';
        console.log("Using Spanish (es-ES) pronunciation");
        break;
      case 'French':
        options.language = 'fr-FR';
        console.log("Using French (fr-FR) pronunciation");
        break;
      case 'Italian':
        options.language = 'it-IT';
        console.log("Using Italian (it-IT) pronunciation");
        break;
      case 'Korean':
        options.language = 'ko-KR';
        console.log("Using Korean (ko-KR) pronunciation");
        break;
      case 'Russian':
        options.language = 'ru-RU';
        console.log("Using Russian (ru-RU) pronunciation");
        break;
      case 'Portuguese':
        options.language = 'pt-BR';
        console.log("Using Portuguese (pt-BR) pronunciation");
        break;
      case 'Arabic':
        options.language = 'ar-SA';
        console.log("Using Arabic (ar-SA) pronunciation");
        break;
      case 'Dutch':
        options.language = 'nl-NL';
        console.log("Using Dutch (nl-NL) pronunciation");
        break;
      case 'Hindi':
        options.language = 'hi-IN';
        console.log("Using Hindi (hi-IN) pronunciation");
        break;
      case 'Thai':
        options.language = 'th-TH';
        console.log("Using Thai (th-TH) pronunciation");
        break;
      case 'Vietnamese':
        options.language = 'vi-VN';
        console.log("Using Vietnamese (vi-VN) pronunciation");
        break;
      case 'Swedish':
        options.language = 'sv-SE';
        console.log("Using Swedish (sv-SE) pronunciation");
        break;
      case 'Turkish':
        options.language = 'tr-TR';
        console.log("Using Turkish (tr-TR) pronunciation");
        break;
      default:
        options.language = 'en-US';
        console.log("Using default German (en-US) pronunciation");
    }
    
    console.log("Speaking with options:", options);
    Speech.speak(text, options);
  };
  
  return (
    <TouchableOpacity 
      ref={wordRef}
      style={[
        styles.tappableWord,
        isSpeaking && styles.speakingWord
      ]}
      onPress={() => {
        // Speak the word
        speakWord(word);
        
        // Show translation bubble
        if (wordRef.current && hasTranslation) {
          wordRef.current.measure((x, y, width, height, pageX, pageY) => {
            onPress(word, translation, { 
              pageX,
              pageY,
              x,
              y,
              width,
              height
            });
          });
        } else if (!hasTranslation) {
          // Don't show bubble for spaces and punctuation
          return;
        } else {
          onPress(word, translation);
        }
      }}
      activeOpacity={hasTranslation ? 0.7 : 1}
    >
      <Text style={[
        styles.wordText,
        isActive && styles.activeWordText,
        hasTranslation && styles.translatableWordText,
        isSpeaking && styles.speakingWordText
      ]}>
        {word}
      </Text>
      {isSpeaking && (
        <View style={styles.speakingIndicator}>
          <Text style={styles.speakingIcon}>🔊</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Component to display a blank for the missing word
export const BlankSpace = () => {
  return (
    <View style={styles.blankSpace}>
      <Text style={styles.blankText}>____</Text>
    </View>
  );
};

// Component to display the translation hint
export const TranslationHint = ({ word, translation, position }) => {
  if (!word || !translation || !position) return null;
  
  // Calculate center point of the tapped word
  const centerX = position.x + (position.width / 2);
  
  return (
    <View 
      style={{
        position: 'absolute',
        left: centerX - 75, // Center the bubble (assuming ~150px width)
        top: -35, // Position above the text
        backgroundColor: '#1CB0F6', // Solid blue background
        padding: 6,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
        minWidth: 150, // Set minimum width to ensure consistency
      }}
    >
      <Text style={styles.hintText}>{translation}</Text>
    </View>
  );
};

// Word-by-word translation container component that can be reused
export const WordByWordTranslation = ({ 
  sentence, 
  wordByWordMap, 
  targetWord = null, 
  containerStyle = {},
  multiline = false,
  language = ''
}) => {
  const [activeTappedWord, setActiveTappedWord] = useState(null);
  const [activeTappedTranslation, setActiveTappedTranslation] = useState(null);
  const [activeTappedPosition, setActiveTappedPosition] = useState(null);
  const containerRef = useRef(null);
  
  // Process the sentence into words - pass the language parameter
  const words = breakSentenceIntoWords(sentence, targetWord, wordByWordMap, language);
  
  // Check if the language doesn't use spaces
  const noSpaces = isSpaceFreeLanguage(language);
  
  // Handle word tap - use simple position tracking
  const handleWordTap = (word, translation, position = null) => {
    if (word === activeTappedWord) {
      // If tapping the same word, hide the translation
      setActiveTappedWord(null);
      setActiveTappedTranslation(null);
      setActiveTappedPosition(null);
    } else if (position) {
      // Show translation for the tapped word with its position
      setActiveTappedWord(word);
      setActiveTappedTranslation(translation);
      
      // Use the complete position object for proper centering
      setActiveTappedPosition({
        x: position.pageX,
        width: position.width
      });
    } else {
      // Fallback if position not available
      setActiveTappedWord(word);
      setActiveTappedTranslation(translation);
      setActiveTappedPosition({ x: 50, width: 50 }); // Default position with width
    }
  };
  
  return (
    <View ref={containerRef} style={[styles.tappableWordsContainer, containerStyle]}>
      <View style={{ position: 'relative', width: '100%' }}>
        {activeTappedWord && activeTappedTranslation && activeTappedPosition && (
          <TranslationHint 
            word={activeTappedWord}
            translation={activeTappedTranslation}
            position={activeTappedPosition}
          />
        )}
      </View>
      
      {multiline ? (
        <View style={styles.tappableWordsMultilineContent}>
          {words.map((word, index) => {
            if (word === '___BLANK___') {
              return <BlankSpace key={`blank-${index}`} />;
            }
            
            const translation = wordByWordMap[word];
            const isActive = word === activeTappedWord;
            
            // Check if we need to add a space after this word
            const needsSpace = !noSpaces && 
                              index < words.length - 1 && 
                              !PUNCTUATION_REGEX.test(word) && 
                              !PUNCTUATION_REGEX.test(words[index + 1]);
            
            return (
              <React.Fragment key={`word-fragment-${index}`}>
                <TappableWord 
                  key={`word-${index}`}
                  word={word}
                  translation={translation}
                  onPress={handleWordTap}
                  isActive={isActive}
                  language={language}
                />
                {needsSpace && <Text style={styles.wordText}> </Text>}
              </React.Fragment>
            );
          })}
        </View>
      ) : (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.tappableWordsScrollContent}
        >
          {words.map((word, index) => {
            if (word === '___BLANK___') {
              return <BlankSpace key={`blank-${index}`} />;
            }
            
            const translation = wordByWordMap[word];
            const isActive = word === activeTappedWord;
            
            // Check if we need to add a space after this word
            const needsSpace = !noSpaces && 
                              index < words.length - 1 && 
                              !PUNCTUATION_REGEX.test(word) && 
                              !PUNCTUATION_REGEX.test(words[index + 1]);
            
            return (
              <React.Fragment key={`word-fragment-${index}`}>
                <TappableWord 
                  key={`word-${index}`}
                  word={word}
                  translation={translation}
                  onPress={handleWordTap}
                  isActive={isActive}
                  language={language}
                />
                {needsSpace && <Text style={styles.wordText}> </Text>}
              </React.Fragment>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

/* -------------------------------
   GameTemplate Component
---------------------------------*/
function GameTemplate({
  onConfirm,
  onSkip,
  onBack,
  children,
  toastMessage,
  toastType,
  popupData,
  actionButtonText = 'Continue',
  lives,
  currentRound,
  totalRounds,
  gold,
  currentCard,
  onPlayAudio,
}) {
  const popupScale = useRef(new Animated.Value(0.8)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const popupTranslate = useRef(new Animated.Value(50)).current;
  const [showingPopup, setShowingPopup] = useState(false);
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);

  // Reset example index when popup data changes
  useEffect(() => {
    setCurrentExampleIndex(0);
  }, [popupData]);

  // Handle popup appearance and animations
  useEffect(() => {
    if (toastMessage) {
      setShowingPopup(true);
      
      Animated.parallel([
        Animated.timing(popupScale, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(popupOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(popupTranslate, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      setShowingPopup(false);
      
      popupOpacity.setValue(0);
      popupScale.setValue(0.8);
      popupTranslate.setValue(50);
    }
  }, [toastMessage]);

  // Calculate progress percentage for round progress bar
  const roundProgress = (currentRound / totalRounds) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        {/* Navigation Buttons at the top */}
        <View style={styles.navButtonsContainer}>
          <TouchableOpacity onPress={onBack} style={styles.navButton}>
            <Text style={styles.navButtonText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSkip} style={styles.navButton}>
            <Text style={styles.navButtonText}>Skip →</Text>
          </TouchableOpacity>
        </View>
        
        {/* Stats below navigation buttons */}
        <View style={styles.statsInNav}>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>❤️</Text>
            <Text style={styles.statValue}>{lives}</Text>
          </View>
          
          <View style={styles.statItem}>
            <View style={styles.roundProgress}>
              <Text style={styles.statLabel}>Round {currentRound}/{totalRounds}</Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${roundProgress}%` }]} />
              </View>
            </View>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statValue}>{gold}</Text>
          </View>
        </View>
      </View>

      <View style={styles.contentArea}>{children}</View>

      {toastMessage && (
        <Animated.View
          style={[
            styles.popupContainer,
            {
              transform: [{ translateY: popupTranslate }, { scale: popupScale }],
              opacity: popupOpacity,
            },
          ]}
        >
          <View style={[
            styles.popupHeader,
            toastType === 'correct' ? styles.correctHeader : styles.incorrectHeader
          ]}>
            <Text style={[
              styles.popupTitle,
              toastType === 'wrong' ? styles.incorrectTitle : null
            ]}>
              {toastMessage}
            </Text>
          </View>
          
          <View style={styles.popupContent}>
            {/* Image display with overlaid word info */}
            {popupData && typeof popupData === 'object' && (
              <View style={styles.imageContainer}>
                {popupData.imageUrl ? (
                  <Image 
                    source={{ uri: popupData.imageUrl }} 
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.cardImage, {backgroundColor: '#e0e0e0'}]} />
                )}
                
                {/* Overlay word info */}
                <View style={styles.wordOverlay}>
                  <View style={styles.wordInfoTextContainer}>
                    <Text style={styles.frontText}>{popupData.front}</Text>
                    {popupData.phonetic && (
                      <Text style={styles.phoneticText}>[{popupData.phonetic}]</Text>
                    )}
                    {popupData.back && (
                      <Text style={styles.backText}>- {popupData.back}</Text>
                    )}
                    
                    {popupData.isPairActivity && (
                      <View style={styles.pairActivityInfo}>
                        <Text style={styles.pairActivityLabel}>Displayed meaning:</Text>
                        <Text style={styles.pairActivityText}>{popupData.displayedMeaning}</Text>
                       
                      </View>
                    )}
                    
                    {popupData.userChoice && !popupData.isPairActivity && popupData.front !== popupData.userChoice && (
                      <Text style={styles.userChoiceText}>
                        You selected: {popupData.userChoice}
                      </Text>
                    )}
                    
                    {/* Add navigation controls within the word overlay, after the meaning */}
                    {popupData.examples && popupData.examples.length > 1 && (
                      <View style={styles.wordNavigation}>
                        <TouchableOpacity
                          style={[
                            styles.wordNavButton,
                            currentExampleIndex === 0 && styles.navArrowDisabled
                          ]}
                          onPress={() => {
                            if (currentExampleIndex > 0) {
                              setCurrentExampleIndex(currentExampleIndex - 1);
                            }
                          }}
                          disabled={currentExampleIndex === 0}
                        >
                          <Text style={styles.wordNavButtonText}>←</Text>
                        </TouchableOpacity>
                        
                        <Text style={styles.wordNavCounterText}>
                          {currentExampleIndex + 1} / {popupData.examples.length}
                        </Text>
                        
                        <TouchableOpacity
                          style={[
                            styles.wordNavButton,
                            currentExampleIndex === popupData.examples.length - 1 && styles.navArrowDisabled
                          ]}
                          onPress={() => {
                            if (currentExampleIndex < popupData.examples.length - 1) {
                              setCurrentExampleIndex(currentExampleIndex + 1);
                            }
                          }}
                          disabled={currentExampleIndex === popupData.examples.length - 1}
                        >
                          <Text style={styles.wordNavButtonText}>→</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  
                  {/* Add audio button directly referencing the current card */}
                  {currentCard && currentCard.frontAudio && (
                    <TouchableOpacity 
                      style={styles.wordAudioButton}
                      onPress={() => onPlayAudio(currentCard.frontAudio)}
                    >
                      <Text style={styles.wordAudioIcon}>🔊</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
            
            {/* Examples with side navigation */}
            {popupData && typeof popupData === 'object' && popupData.examples && popupData.examples.length > 0 && (
              <ScrollView style={styles.examplesScrollView} contentContainerStyle={styles.examplesScrollContent}>
                <View style={styles.examplesOuterWrapper}>
                  <View style={styles.examplesWrapper}>
                    {/* Single example container */}
                    <View style={styles.exampleContainer}>
                      {/* Current example */}
                      {popupData.examples[currentExampleIndex] && (
                        <>
                          {/* Question section */}
                          <View style={styles.exampleSection}>
                            <View style={styles.exampleHeaderRow}>
                              <Text style={styles.exampleSectionTitle}>Question:</Text>
                              {popupData.examples[currentExampleIndex].questionAudio && (
                                <TouchableOpacity 
                                  style={styles.pronunciationButton}
                                  onPress={() => onPlayAudio(popupData.examples[currentExampleIndex].questionAudio)}
                                >
                                  <Text style={styles.pronunciationIcon}>🔊</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                            
                            <ScrollView style={styles.exampleContentScroll} nestedScrollEnabled={true}>
                              <Text style={styles.exampleQuestion}>{popupData.examples[currentExampleIndex].question}</Text>
                              {popupData.examples[currentExampleIndex].questionTranslation && (
                                <Text style={styles.exampleTranslation}>
                                  {popupData.examples[currentExampleIndex].questionTranslation}
                                </Text>
                              )}
                            </ScrollView>
                          </View>
                          
                          {/* Answer section */}
                          <View style={[styles.exampleSection, styles.answerSection]}>
                            <View style={styles.exampleHeaderRow}>
                              <Text style={styles.exampleSectionTitle}>Answer:</Text>
                              {popupData.examples[currentExampleIndex].answerAudio && (
                                <TouchableOpacity 
                                  style={styles.pronunciationButton}
                                  onPress={() => onPlayAudio(popupData.examples[currentExampleIndex].answerAudio)}
                                >
                                  <Text style={styles.pronunciationIcon}>🔊</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                            
                            <ScrollView style={styles.exampleContentScroll} nestedScrollEnabled={true}>
                              <Text style={styles.exampleAnswer}>{popupData.examples[currentExampleIndex].answer}</Text>
                              {popupData.examples[currentExampleIndex].translation && (
                                <Text style={styles.exampleTranslation}>
                                  {popupData.examples[currentExampleIndex].translation}
                                </Text>
                              )}
                            </ScrollView>
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}
            
            {/* Handle legacy string format */}
            {popupData && typeof popupData === 'string' && (
              <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
                <View style={styles.cardContainer}>
                  <View style={styles.cardContent}>
                    {popupData.split('\n').map((line, i) => (
                      <Text key={i} style={[
                        styles.cardText,
                        i === 0 ? styles.frontText : null,
                        i === 1 ? styles.phoneticText : null,
                        i === 2 ? styles.backText : null,
                      ]}>
                        {line}
                      </Text>
                    ))}
                  </View>
                </View>
              </ScrollView>
            )}
            
            {/* Continue button at bottom, but always visible */}
            <View style={styles.continueButtonContainer}>
              <TouchableOpacity onPress={onConfirm} style={styles.popupButton}>
                <Text style={styles.popupButtonText}>{actionButtonText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

/* -------------------------------
   ChestView Component for Evaluation
---------------------------------*/
const ChestView = ({ chestIndex }) => {
  // Use the same values as in ChestSlot in CatSection.jsx
  const frameWidth = 30; // CHEST_VISIBLE_WIDTH
  const frameHeight = 22; // CHEST_VISIBLE_HEIGHT
  
  // For first chest, it's at position (0,10) in the sprite sheet
  // Just use that value directly if chestIndex is 0
  const topOffset = chestIndex === 0 ? 10 : 
                    chestIndex === 1 ? 74 :
                    chestIndex === 2 ? 138 :
                    202; // fourth chest
  
  return (
    <View style={styles.chestViewContainer}>
      <Text style={styles.chestRewardText}>New Reward Chest!</Text>
      <View style={styles.chestImageContainer}>
        <View style={{
          width: frameWidth,
          height: frameHeight,
          transform: [{ scale: 2.5 }],
          overflow: 'hidden',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Image
            source={require('../asset/Chests.png')}
            style={{
              position: 'absolute',
              top: -topOffset,
              left: 0,
              width: 240,
              height: 256,
            }}
          />
        </View>
      </View>
    </View>
  );
};

/* -------------------------------
   CardResult Component for Evaluation Page
---------------------------------*/
const CardResult = ({ card, results, originalCard }) => {
  return (
    <View style={styles.cardResultContainer}>
      <Text style={styles.cardResultTitle}>{card.front}</Text>
      <View style={styles.cardResultContent}>
        <View style={styles.cardResultRow}>
          <Text style={styles.cardResultLabel}>Original Status:</Text>
          <Text style={styles.cardResultValue}>
            Ease Factor: {parseFloat(originalCard.easeFactor || 1.5).toFixed(1)} • 
            Streak: {originalCard.consecutiveCorrectAnswersCount || 0} • 
            In Wrong Queue: {JSON.parse(originalCard.wrongQueue || "[false,0]")[0] ? 'Yes' : 'No'}
          </Text>
        </View>
        <View style={styles.cardResultRow}>
          <Text style={styles.cardResultLabel}>New Status:</Text>
          <Text style={styles.cardResultValue}>
            Ease Factor: {parseFloat(card.easeFactor || 1.5).toFixed(1)} • 
            Streak: {card.consecutiveCorrectAnswersCount || 0} • 
            In Wrong Queue: {JSON.parse(card.wrongQueue || "[false,0]")[0] ? 'Yes' : 'No'}
          </Text>
        </View>
        <View style={styles.cardResultRow}>
          <Text style={styles.cardResultLabel}>Next Review:</Text>
          <Text style={styles.cardResultValue}>{new Date(card.nextReviewDate).toLocaleString()}</Text>
        </View>
        <View style={[styles.cardResultRow, styles.cardResultRowLast]}>
          <Text style={styles.cardResultLabel}>Performance:</Text>
          <Text style={[
            styles.cardResultValue,
            { color: results.every(r => r) ? '#4CAF50' : '#E91E63' }
          ]}>
            {results.filter(r => r).length}/{results.length} correct
          </Text>
        </View>
      </View>
    </View>
  );
};

/* -------------------------------
   Review Component
---------------------------------*/
export default function Review() {
  const router = useRouter();
  const { deckName } = useLocalSearchParams();
  const [reviewStarted, setReviewStarted] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [gold, setGold] = useState(0);
  const [lives, setLives] = useState(3);
  const [isCorrectAnswer, setIsCorrectAnswer] = useState(null);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [readyForPopup, setReadyForPopup] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState(null);
  const [popupData, setPopupData] = useState(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [totalRounds, setTotalRounds] = useState(2); // Changed to 2 for two games
  const [originalCardData, setOriginalCardData] = useState({});
  const [modifiedCardData, setModifiedCardData] = useState({});
  const [sound, setSound] = useState(null);
  const [occupiedChests, setOccupiedChests] = useState(0);
  const [showChest, setShowChest] = useState(false);
  const [chestImage, setChestImage] = useState(null);
  const [activitySequence, setActivitySequence] = useState([]);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [deckLanguage, setDeckLanguage] = useState(''); // Add state for deck language

  // Master function to assign cards to activities
  const assignCardsToActivities = (dueCards) => {
    if (dueCards.length < 1) {
      Alert.alert('Error', 'Need at least 1 card for the review session.');
      return false;
    }

    // Limit to 5 cards maximum
    const cardsToReview = dueCards.slice(0, 5);
    
    // Log card language information for debugging
    console.log("Cards to review:", cardsToReview.map(card => ({
      id: card.id,
      front: card.front,
      language: card.language || 'undefined'
    })));
    
    // Save original card data for each card
    const originalData = {};
    cardsToReview.forEach(card => {
      originalData[card.id] = {...card};
    });
    setOriginalCardData(originalData);

    // Use the first card's language as the deck language
    if (cardsToReview.length > 0) {
      // Check if any card has language property
      const deckLang = cardsToReview[0].language || '';
      
      if (deckLang) {
        console.log("Setting deck language from first card:", deckLang);
        setDeckLanguage(deckLang);
      } else {
        console.log("No language found in cards");
      }
    }

    // Define activities by difficulty
    const difficulty1Activities = [
      'Hangman',
      'PhoneticChoice',
      'PairOrNotPair',
      'ImagePickerReverse',
      'ImagePicker'
    ];
    
    const difficulty2Activities = [
      'ForeignSentenceWrite',
      'SentencePick',
      'Match',
      'SentencePairOrNotPair',
      'ListenResponse'
    ];
    
    const difficulty3Activities = [
      'SentenceJumbleAnswer',
      'SentenceJumbleTranslate',
      'SentenceJumble'
    ];
    
    // Create the activity sequence
    let sequence = [];
    let activityCounter = 1;
    
    // Get deck language (once) to use for all activities
    // Instead of re-declaring a new constant, let's reuse the existing state value
    console.log("Using deck language for all activities:", cardsToReview[0]?.language || '');
    
    // Start with SentencePairOrNotPair as the first activity
    sequence.push({
      id: activityCounter++,
      type: 'SentencePairOrNotPair',
      mainCard: cardsToReview[0],
      otherCards: cardsToReview.filter(c => c.id !== cardsToReview[0].id).slice(0, 2),
      completed: false,
      result: null,
      cardIndex: 0,
      language: cardsToReview[0]?.language || ''
    });
    
    cardsToReview.forEach((card, cardIndex) => {
      // Skip first activity for the first card since we already added SentencePairOrNotPair
      if (cardIndex === 0) {
        // Still generate activities for this card, but one less than normal
        const streakForRest = card.consecutiveCorrectAnswersCount || 0;
        const isInWrongQueueForRest = JSON.parse(card.wrongQueue || "[false,0]")[0];
        
        let availableActivities;
        if (streakForRest === 0 && !isInWrongQueueForRest || isInWrongQueueForRest) {
          availableActivities = [...difficulty1Activities];
        } else if (streakForRest < 3) {
          availableActivities = [...difficulty1Activities, ...difficulty2Activities];
        } else {
          availableActivities = [...difficulty1Activities, ...difficulty2Activities, ...difficulty3Activities];
        }
        
        const shuffledActivities = availableActivities.sort(() => Math.random() - 0.5);
        const cardActivities = shuffledActivities.slice(0, 2); // Only 2 more activities for first card
        
        cardActivities.forEach((activityType) => {
          sequence.push({
            id: activityCounter++,
            type: activityType,
            mainCard: card,
            otherCards: cardsToReview.filter(c => c.id !== card.id).slice(0, 2),
            completed: false,
            result: null,
            cardIndex: cardIndex, // Track which card this activity belongs to
            language: cardsToReview[0]?.language || '' // Use consistent language for all activities
          });
        });
        return;
      }
      
      // Get card streak
      const streak = card.consecutiveCorrectAnswersCount || 0;
      // Check wrong queue status
      const isInWrongQueue = JSON.parse(card.wrongQueue || "[false,0]")[0];
      
      // Determine available activities based on streak and wrong queue status
      let availableActivities;
      
      if (streak === 0 && !isInWrongQueue || isInWrongQueue) {
        // For cards with streak=0 and not in wrong queue, OR cards in wrong queue: only use difficulty 1
        availableActivities = [...difficulty1Activities];
      } else if (streak < 3) {
        // For streak < 3, use difficulty 1-2 activities
        availableActivities = [...difficulty1Activities, ...difficulty2Activities];
      } else {
        // For streak >= 3, use all difficulty levels
        availableActivities = [...difficulty1Activities, ...difficulty2Activities, ...difficulty3Activities];
      }
      
      // Shuffle available activities
      const shuffledActivities = availableActivities.sort(() => Math.random() - 0.5);
      
      // Take the first 3 activities for this card
      const cardActivities = shuffledActivities.slice(0, 3);
      
      // Create 3 activities for this card
      cardActivities.forEach((activityType) => {
        sequence.push({
          id: activityCounter++,
          type: activityType,
          mainCard: card,
          otherCards: cardsToReview.filter(c => c.id !== card.id).slice(0, 2), // Use up to 2 other cards
          completed: false,
          result: null,
          cardIndex: cardIndex, // Track which card this activity belongs to
          language: cardsToReview[0]?.language || '' // Use consistent language for all activities
        });
      });
    });
    
    // For the remaining activities (after the first), randomize their order
    const firstActivity = sequence[0];
    const restOfActivities = sequence.slice(1).sort(() => Math.random() - 0.5);
    sequence = [firstActivity, ...restOfActivities];

    setActivitySequence(sequence);
    setTotalRounds(sequence.length);
    setCurrentRound(1);
    setCurrentActivity(sequence[0]);
    
    return true;
  };

  // Function to update a card's SRS parameters based on results
  const updateCardSRS = (card, correct) => {
    const newCard = { ...card };
    
    if (correct) {
      // All questions for this card were answered correctly
      const lastReviewDate = new Date().toISOString();
      let diffHours = 6; // Default interval

      if (card.nextReviewDate !== card.lastReviewDate) {
        diffHours = Math.ceil(
          (new Date(card.nextReviewDate) - new Date(card.lastReviewDate)) / (1000 * 60 * 60)
        );
      }
      
      // Calculate new interval based on ease factor
      const nextReviewDate = new Date();
      nextReviewDate.setHours(nextReviewDate.getHours() + diffHours * card.easeFactor);
      
      newCard.lastReviewDate = lastReviewDate;
      newCard.nextReviewDate = nextReviewDate.toISOString();
      newCard.easeFactor = (parseFloat(card.easeFactor || 1.5) + 0.1).toFixed(1);
      newCard.consecutiveCorrectAnswersCount = (card.consecutiveCorrectAnswersCount || 0) + 1;
    } else {
      // At least one question was answered incorrectly
      const now = new Date().toISOString();
      newCard.wrongQueue = JSON.stringify([true, 0]);
      newCard.lastReviewDate = now;
      newCard.nextReviewDate = now;
      newCard.easeFactor = Math.max(1.3, parseFloat(card.easeFactor || 1.5) - 0.1).toFixed(1);
      newCard.consecutiveCorrectAnswersCount = 0;
    }
    
    return newCard;
  };

  // Function to play sound based on answer correctness
  const playSound = async (isCorrect) => {
    try {
      // Unload previous sound if it exists
      if (sound) {
        await sound.unloadAsync();
      }
      
      const soundFile = isCorrect 
        ? require('../asset/music/correct.mp3') 
        : require('../asset/music/wrong.mp3');
      
      const { sound: newSound } = await Audio.Sound.createAsync(soundFile);
      setSound(newSound);
      
      await newSound.setVolumeAsync(isCorrect ? 1 : 0.5);
      await newSound.playAsync();
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  // Function to play finish sound
  const playFinishSound = async () => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        require('../asset/music/finish.mp3')
      );
      setSound(newSound);
      await newSound.playAsync();
    } catch (error) {
      console.error('Error playing finish sound:', error);
    } 
  };

  // Clean up sound on component unmount
  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  useEffect(() => {
    if (deckName && !reviewStarted) {
      try {
        // Load the deck and set up the review
        const loadDeckAndSetup = async () => {
          try {
            // Get occupiedChests from AsyncStorage
            const occupiedChestsStr = await AsyncStorage.getItem('occupiedChestsCount');
            const chestCount = parseInt(occupiedChestsStr || '0');
            setOccupiedChests(chestCount);
            
            console.log("Loading deck:", deckName);
            
            // Retrieve all fields including language from the database
            const items = db.getAllSync(`SELECT * FROM ${deckName}`);
            
            // Log the first card to check for language property
            if (items && items.length > 0) {
              console.log("First card language:", items[0].language || "Not specified");
              
              // If the first card has a language property, use it for the deck
              if (items[0].language) {
                console.log("Setting deck language to:", items[0].language);
                setDeckLanguage(items[0].language);
              }
            }
            
            const now = new Date();
            
            // Filter cards into due cards
            const dueCards = items.filter(c => {
              return now >= new Date(c.nextReviewDate);
            }).sort((a, b) => new Date(a.nextReviewDate) - new Date(b.nextReviewDate));
            
            if (dueCards.length < 2) {
              Alert.alert('Not enough due cards', `Need at least 2, but got ${dueCards.length}.`);
              return;
            }
            
            // Assign cards to activities using the master function
            const success = assignCardsToActivities(dueCards);
            if (success) {
              setReviewStarted(true);
            }
          } catch (error) {
            console.error("Error loading deck:", error);
            Alert.alert("Error", `Failed to load deck: ${error.message}`);
          }
        };
        
        loadDeckAndSetup();
      } catch (e) {
        console.error(e);
        Alert.alert('Error', `Could not load deck ${deckName}`);
      }
    }
  }, [deckName, reviewStarted]);
  
  // Auto-continue effect when answer is locked - only for correct answers
  useEffect(() => {
    if (isAnswerLocked && !showResult && isCorrectAnswer === true) {
      handleContinue();
    }
  }, [isAnswerLocked, showResult, isCorrectAnswer]);

  // New effect to monitor when we're ready to show the popup for wrong answers
  useEffect(() => {
    if (readyForPopup && isAnswerLocked && !showResult && isCorrectAnswer === false) {
      handleContinue();
    }
  }, [readyForPopup, isAnswerLocked, showResult, isCorrectAnswer]);

  // Move to the next activity or finish
  const moveToNextActivity = () => {
    // Find the next incomplete activity
    const nextIndex = currentRound;
    
    if (nextIndex < activitySequence.length) {
      setCurrentRound(nextIndex + 1);
      setCurrentActivity(activitySequence[nextIndex]);
      setIsCorrectAnswer(null);
      setIsAnswerLocked(false);
      setReadyForPopup(false);
      setShowResult(false);
      setToastMessage('');
      setToastType(null);
      setPopupData(null);
    } else {
      // All activities completed, proceed to evaluation
      finishReview();
    }
  };

  const finishReview = () => {
    // Process all cards for evaluation
    const modified = {...originalCardData};
    
    // Group activities by card
    const cardActivities = {};
    
    activitySequence.forEach(activity => {
      if (activity.completed && activity.mainCard) {
        const cardId = activity.mainCard.id;
        
        if (!cardActivities[cardId]) {
          cardActivities[cardId] = [];
        }
        
        cardActivities[cardId].push(activity.result);
      }
    });
    
    // Update each card based on its activity results
    Object.keys(cardActivities).forEach(cardId => {
      const results = cardActivities[cardId];
      const allCorrect = results.every(r => r === true);
      
      // Update the card's SRS parameters
      modified[cardId] = updateCardSRS(originalCardData[cardId], allCorrect);
          modified[cardId].processed = true;
    });
    
    setModifiedCardData(modified);
    
    // Check if we can show a chest (when we have less than 4 occupied)
    if (occupiedChests < 4) {
      setShowChest(true);
      
      // Select a random chest index (0-3)
      const chestIndex = Math.floor(Math.random() * 4);
      setChestImage(chestIndex);
      
      // Store the selected chest index in AsyncStorage to pass it back to index
      AsyncStorage.setItem('newChestIndex', chestIndex.toString());
    }
    
    setShowEvaluation(true);
    playFinishSound();
  };

  const handleSkip = () => {
    if (!currentActivity) return;
    
    // Mark the current activity as skipped (wrong)
    const updatedSequence = [...activitySequence];
    const activityIndex = currentRound - 1;
    updatedSequence[activityIndex] = {
      ...updatedSequence[activityIndex],
      completed: true,
      result: false
    };
    setActivitySequence(updatedSequence);
    
    // Reduce lives
    setLives(l => l - 1);
    
    // Move to next activity or evaluation
    moveToNextActivity();
  };
  
  const handleAnswer = (isCorrect, popupObj) => {
    if (!currentActivity) return;
    
    setIsCorrectAnswer(isCorrect);
    
    // Set some state immediately to prevent UI changes during the delay
    if (!isCorrect) {
      setIsAnswerLocked(true); // Lock UI immediately for wrong answers
      setReadyForPopup(false); // Not ready for popup yet
    } else {
      // For correct answers, we're ready for popup right away
      setIsAnswerLocked(true);
      setReadyForPopup(true);
    }
    
    // Update the activity sequence with result
    const updatedSequence = [...activitySequence];
    const activityIndex = currentRound - 1;
    updatedSequence[activityIndex] = {
      ...updatedSequence[activityIndex],
      completed: true,
      result: isCorrect
    };
    setActivitySequence(updatedSequence);
    
    // Get the current activity's main card for popup
    let cardToShow = currentActivity.mainCard;
    
    // Create a consistent popup data structure using any data provided by the activity
    try {
      // Parse examples if needed
      let examplesArray = [];
      
      if (popupObj && popupObj.examples) {
        examplesArray = popupObj.examples;
      } else if (cardToShow.examples) {
        try {
          if (Array.isArray(cardToShow.examples)) {
            examplesArray = cardToShow.examples;
          } else {
            examplesArray = JSON.parse(cardToShow.examples || '[]');
          }
        } catch (error) {
          console.error('Error parsing examples:', error);
          examplesArray = [];
        }
      }
      
      // If no examples, create a default one
      if (examplesArray.length === 0) {
        examplesArray = [
          {
            question: `Example using "${cardToShow.front}"`,
            answer: cardToShow.back || "Example answer",
          }
        ];
      }
      
      // Create a standardized popup data object
      const standardPopupData = {
        imageUrl: popupObj?.imageUrl || cardToShow.imageUrl,
        front: popupObj?.front || cardToShow.front,
        phonetic: popupObj?.phonetic || cardToShow.phonetic,
        back: popupObj?.back || cardToShow.back,
        examples: examplesArray,
      };
      
      // Add activity-specific data if provided

      
      // Set the popup data
      setPopupData(standardPopupData);
    } catch (error) {
      console.error('Error creating popup data:', error);
      
      // Create a minimal fallback popup
      setPopupData({
        imageUrl: cardToShow.imageUrl,
        front: cardToShow.front,
        phonetic: cardToShow.phonetic,
        back: cardToShow.back,
        examples: []
      });
    }
    
    // If the answer is wrong, add a delay to proceed to next step
    if (!isCorrect) {
      playSound(isCorrect)
      setTimeout(() => {
        setReadyForPopup(true); // After 2 seconds, ready for popup
      }, 2000); // 2 second delay
    }
 
  };

  const handleContinue = () => {
    if (showResult) {
      // Reset state and move to next activity
      setShowResult(false);
      setToastMessage('');
      setToastType(null);
      setPopupData(null);
      setIsAnswerLocked(false);
      moveToNextActivity();
    } else if (isAnswerLocked) {
      const correct = isCorrectAnswer;
      
      // Update feedback
      if (correct) {
        setToastType('correct');
        setToastMessage('Correct!');
        setGold(g => g + 10);
        playSound(correct);
      } else {
        if (!toastType) {
          setToastType('wrong');
          setToastMessage('Wrong!');
          setLives(l => l - 1);
          
        }
      }
      
      // Play the result sound (correct/incorrect) for both correct and incorrect answers
      
      
      setShowResult(true);
    }
  };

  // Show evaluation page
  if (showEvaluation) {
    return (
      <View style={styles.container}>
        <View style={styles.evaluationHeader}>
          <Text style={styles.evaluationTitle}>Review Completed!</Text>
          {showChest ? (
            <ChestView chestIndex={chestImage} />
          ) : (
            <Text style={styles.evaluationSubtitle}>{gold} Gold</Text>
          )}
        </View>
        
        <ScrollView style={styles.evaluationScroll}>
          <View style={styles.evaluationContent}>
            {/* Card Results */}
            <Text style={styles.evaluationSectionTitle}>Reviewed Cards</Text>
            {activitySequence.map((activity, index) => (
              activity.completed && activity.mainCard && (
                <CardResult 
                  key={`card-${activity.mainCard.id}-${index}`}
                  card={modifiedCardData[activity.mainCard.id] || activity.mainCard}
                  results={[activity.result]}
                  originalCard={originalCardData[activity.mainCard.id] || activity.mainCard}
                />
              )
            ))}
          </View>
        </ScrollView>
        
        <View style={styles.evaluationButtons}>
          <TouchableOpacity 
            style={styles.evaluationButton} 
            onPress={async () => {
              try {
                // Update all modified cards in the database
                for (const cardId in modifiedCardData) {
                  if (modifiedCardData[cardId].processed) {
                    const card = modifiedCardData[cardId];
                    
                    // Update the card in the database
                    db.runSync(
                      `UPDATE ${deckName} SET 
                        lastReviewDate = ?,
                        nextReviewDate = ?,
                        easeFactor = ?,
                        consecutiveCorrectAnswersCount = ?,
                        wrongQueue = ?
                      WHERE id = ?`,
                      [
                        card.lastReviewDate,
                        card.nextReviewDate,
                        card.easeFactor,
                        card.consecutiveCorrectAnswersCount,
                        card.wrongQueue,
                        cardId
                      ]
                    );
                  }
                }

                if (showChest) {
                  // Set flag in AsyncStorage to add a new chest
                  await AsyncStorage.setItem('addNewChest', 'true');
                }
                
                // Navigate back after all updates are complete
                router.back();
              } catch (error) {
                console.error('Error updating cards:', error);
                Alert.alert('Error', 'Failed to save review results. Please try again.');
              }
            }}
          >
            <Text style={styles.evaluationButtonText}>CONTINUE</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Main review screen
  return (
    <ImageBackground source={require('../asset/background.png')} style={styles.bgImage}>
      {/* Debug info */}
      {__DEV__ && (
        <View style={{ position: 'absolute', top: 40, right: 10, backgroundColor: 'rgba(0,0,0,0.7)', padding: 5, borderRadius: 5, zIndex: 9999 }}>
          <Text style={{ color: 'white', fontSize: 10 }}>
            Deck Lang: {deckLanguage || 'none'}{'\n'}
            Activity Lang: {currentActivity?.language || 'none'}
          </Text>
        </View>
      )}
      <GameTemplate
        onConfirm={handleContinue}
        onSkip={handleSkip}
        onBack={() => router.back()}
        toastMessage={toastMessage}
        toastType={toastType}
        popupData={popupData}
        actionButtonText="Continue"
        lives={lives}
        currentRound={currentRound}
        totalRounds={totalRounds}
        gold={gold}
        currentCard={currentActivity?.mainCard}
        onPlayAudio={(audioUri) => {
          const playAudio = async (uri) => {
            try {
              const { sound: newSound } = await Audio.Sound.createAsync(
                { uri }
              );
              setSound(newSound);
              await newSound.playAsync();
            } catch (error) {
              console.error('Error playing audio:', error);
            }
          };
          playAudio(audioUri);
        }}
      >
        
        <View style={styles.divider} />
        {currentActivity && !showResult && currentActivity.type === 'ForeignSentenceWrite' && (
          <ForeignSentenceWrite
            // difficulty 2
            key={`foreign-sentence-write-${currentActivity.id}-${currentRound}`}
            activitySequence={activitySequence}
            currentRound={currentRound}
            onAnswer={(isCorrect, popupObj) => handleAnswer(isCorrect, popupObj)}
            showResult={showResult}
            freezeOnWrong={isAnswerLocked && !isCorrectAnswer}
            language={deckLanguage}
          />
        )}
        {currentActivity && !showResult && currentActivity.type === 'SentencePick' && (
          <SentencePick
          // difficulty 2
            key={`sentence-pick-${currentActivity.id}-${currentRound}`}
            activitySequence={activitySequence}
            currentRound={currentRound}
            onAnswer={(isCorrect, popupObj) => handleAnswer(isCorrect, popupObj)}
            showResult={showResult}
            freezeOnWrong={isAnswerLocked && !isCorrectAnswer}
            language={deckLanguage}
          />
        )}
        {currentActivity && !showResult && currentActivity.type === 'SentenceJumbleAnswer' && (
          // difficulty 3
          <SentenceJumbleAnswer 
            key={`sentence-jumble-answer-${currentActivity.id}-${currentRound}`}
            activitySequence={activitySequence}
            currentRound={currentRound}
            onAnswer={(isCorrect, popupObj) => handleAnswer(isCorrect, popupObj)}
            showResult={showResult}
            freezeOnWrong={isAnswerLocked && !isCorrectAnswer}
            language={deckLanguage}
          />
        )}
        {currentActivity && !showResult && currentActivity.type === 'SentenceJumbleTranslate' && (
          <SentenceJumbleTranslate 
           // difficulty 3
            key={`sentence-jumble-translate-${currentActivity.id}-${currentRound}`}
            activitySequence={activitySequence}
            currentRound={currentRound}
            onAnswer={(isCorrect, popupObj) => handleAnswer(isCorrect, popupObj)}
            showResult={showResult}
            freezeOnWrong={isAnswerLocked && !isCorrectAnswer}
            language={deckLanguage}
          />
        )}
        {currentActivity && !showResult && currentActivity.type === 'SentenceJumble' && (
          <SentenceJumble 
          // difficulty 3
            key={`sentence-jumble-${currentActivity.id}-${currentRound}`}
            activitySequence={activitySequence}
            currentRound={currentRound}
            onAnswer={(isCorrect, popupObj) => handleAnswer(isCorrect, popupObj)}
            showResult={showResult}
            freezeOnWrong={isAnswerLocked && !isCorrectAnswer}
            language={deckLanguage}
          />
        )}
        {currentActivity && !showResult && currentActivity.type === 'Match' && (
          <Match 
          //difficulty 2
            key={`match-${currentActivity.id}-${currentRound}`}
            activitySequence={activitySequence}
            currentRound={currentRound}
            onAnswer={(isCorrect, popupObj) => handleAnswer(isCorrect, popupObj)}
            showResult={showResult}
            freezeOnWrong={isAnswerLocked && !isCorrectAnswer}
            language={deckLanguage}
          />
        )}
         {currentActivity && !showResult && currentActivity.type === 'SentencePairOrNotPair' && (
          <SentencePairOrNotPair 
            // difficulty 2
            activitySequence={activitySequence}
            currentRound={currentRound}
            onAnswer={(isCorrect, popupObj) => handleAnswer(isCorrect, popupObj)}
            showResult={showResult} 
            freezeOnWrong={isAnswerLocked && !isCorrectAnswer}
            language={deckLanguage}
          />
        )}
        {currentActivity && !showResult && currentActivity.type === 'ListenResponse' && (
          <ListenResponse 
          //difficulty 2
            key={`listen-response-${currentActivity.id}-${currentRound}`}
            activitySequence={activitySequence}
            currentRound={currentRound}
            onAnswer={(isCorrect, popupObj) => handleAnswer(isCorrect, popupObj)}
            showResult={showResult}
            freezeOnWrong={isAnswerLocked && !isCorrectAnswer}
            language={ deckLanguage}
          />
        )}
        {currentActivity && !showResult && currentActivity.type === 'Hangman' && (
          <Hangman 
            // difficulty 1
            key={`hangman-${currentActivity.id}-${currentRound}`}
            activitySequence={activitySequence}
            currentRound={currentRound}
            onAnswer={(isCorrect) => handleAnswer(isCorrect)}
            showResult={showResult}
            freezeOnWrong={isAnswerLocked && !isCorrectAnswer}
            language={ deckLanguage}
          />
        )}
        {currentActivity && !showResult && currentActivity.type === 'PhoneticChoice' && (
          <PhoneticChoice 
            // difficulty 1
            activitySequence={activitySequence}
            currentRound={currentRound}
            onAnswer={(isCorrect, popupObj) => handleAnswer(isCorrect, popupObj)}
            showResult={showResult} 
            freezeOnWrong={isAnswerLocked && !isCorrectAnswer}
            language={ deckLanguage}
          />
        )}
       
        {currentActivity && !showResult && currentActivity.type === 'PairOrNotPair' && (
          <PairOrNotPair 
            // difficulty 1
            activitySequence={activitySequence}
            currentRound={currentRound}
            onAnswer={(isCorrect, popupObj) => handleAnswer(isCorrect, popupObj)}
            showResult={showResult} 
            freezeOnWrong={isAnswerLocked && !isCorrectAnswer}
            language={ deckLanguage}
          />
        )}
        {currentActivity && !showResult && currentActivity.type === 'ImagePickerReverse' && (
          <ImagePickerReverse 
            // difficulty 1
            activitySequence={activitySequence}
            currentRound={currentRound}
            onAnswer={(isCorrect) => handleAnswer(isCorrect)}
            showResult={showResult} 
            freezeOnWrong={isAnswerLocked && !isCorrectAnswer}
            language={ deckLanguage}
          />
        )}
        {currentActivity && !showResult && currentActivity.type === 'ImagePicker' && (
          <ImagePicker 
            // difficulty 1
            activitySequence={activitySequence}
            currentRound={currentRound}
            onAnswer={(isCorrect, popupObj) => handleAnswer(isCorrect, popupObj)}
            showResult={showResult} 
            freezeOnWrong={isAnswerLocked && !isCorrectAnswer}
            language={ deckLanguage}
          />
        )}
      </GameTemplate>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: { 
    flex: 1,
    backgroundColor: '#121212'
  },
  
  container: { 
    flex: 1, 
    paddingTop: 0,
    width: '100%',
    backgroundColor: '#121212'
  },
  
  // Additional styles for word-by-word translation feature
  tappableWord: {
    padding: 1,
    margin: 0,
    position: 'relative',
  },
  wordText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  activeWordText: {
    color: '#1CB0F6',
    fontWeight: '600',
  },
  translatableWordText: {

    textDecorationColor: 'rgba(28, 176, 246, 0.5)',
    textDecorationStyle: 'dotted',
  },
  speakingWord: {
    backgroundColor: 'rgba(28, 176, 246, 0.15)',
    borderRadius: 6,
  },
  speakingWordText: {
    color: '#1CB0F6',
    fontWeight: '600',
  },
  speakingIndicator: {
    position: 'absolute',
    top: -8,
    right: -6,
    backgroundColor: '#1CB0F6',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakingIcon: {
    fontSize: 8,
    color: 'white',
  },
  blankSpace: {
    padding: 5,
    margin: 2,
  },
  blankText: {
    fontSize: 18,
    color: '#58CC02',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  tappableWordsContainer: {
    width: '100%',
    marginBottom: 10,
    position: 'relative',
  },
  tappableWordsScrollContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingVertical: 10,
  },
  tappableWordsMultilineContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingVertical: 10,
    width: '100%',
  },
  hintText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },

  
  navBar: { 
    flexDirection: 'column', 
    justifyContent: 'flex-start', 
    padding: 15, 
    paddingTop: 30,
    backgroundColor: '#1E1E1E',
    marginHorizontal: 0, 
    borderRadius: 0, 
    marginTop: 0,
  },
  
  navButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  
  statsInNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8
  },
  
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  statIcon: {
    fontSize: 18,
    marginRight: 4
  },
  
  statValue: { 
    fontFamily: 'System',
    fontWeight: 'bold',
    fontSize: 16, 
    color: '#E0E0E0',
  },
  
  statLabel: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#BBBBBB',
    marginBottom: 3
  },
  
  roundProgress: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 150
  },
  
  progressBarContainer: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(80, 80, 80, 0.6)',
    borderRadius: 10,
    overflow: 'hidden'
  },
  
  progressBar: {
    height: '100%',
    backgroundColor: '#58CC02',
    borderRadius: 10
  },
  
  contentArea: { 
    flex: 1, 
    width: '100%', 
    padding: 0,
    alignItems: 'center', 
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: '#1A1A1A',
  },
  
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: '#333333',
    marginVertical: 5,
  },
  
  navButton: { 
    padding: 12,
    backgroundColor: 'rgba(40, 40, 40, 0.8)',
    borderRadius: 16,
    marginHorizontal: 5,
    flex: 1,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333333',
  },
  
  navButtonText: { 
    color: '#58CC02',
    fontSize: 14, 
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  
  popupContainer: { 
    position: 'absolute',
    top: 130,
    bottom: 40,
    left: 20,
    right: 20,
    zIndex: 5,
    backgroundColor: '#252525',
    borderRadius: 12, 
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: '#444444',
  },
  
  popupContent: { 
    flex: 1,
    alignItems: 'center', 
    width: '100%',
    paddingBottom: 0,
    justifyContent: 'space-between',
  },
  
  continueButtonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#252525',
    borderTopWidth: 1,
    borderTopColor: '#444444',
  },
  
  popupButton: { 
    backgroundColor: '#58CC02',
    borderRadius: 12, 
    paddingVertical: 12, 
    paddingHorizontal: 20, 
    width: '90%',
    shadowColor: '#45a100',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  
  popupButtonText: { 
    fontFamily: 'System', 
    fontSize: 17, 
    fontWeight: 'bold',
    color: 'white', 
    textAlign: 'center' 
  },
  
  imageContainer: {
    width: '100%',
    height: 160,
    marginBottom: 0,
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 0,
    borderBottomWidth: 1,
    borderColor: '#444444',
    position: 'relative',
    backgroundColor: '#1A1A1A',
  },
  
  cardImage: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  
  wordOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26, 26, 26, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    padding: 10,
    zIndex: 2,
  },
  
  wordInfoTextContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
    zIndex: 3,
  },
  
  frontText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
    zIndex: 3,
  },
  
  phoneticText: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 4,
    zIndex: 3,
  },
  
  backText: {
    fontSize: 20,
    color: '#FFD700',
    fontWeight: '500',
    textAlign: 'center',
    zIndex: 3,
  },
  
  wordAudioButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#58CC02',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  wordAudioIcon: {
    fontSize: 18,
    color: 'white',
  },
  
  examplesScrollView: {
    width: '100%',
    flex: 1,
    backgroundColor: '#252525',
  },
  
  examplesScrollContent: {
    alignItems: 'center',
    paddingBottom: 60,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  
  examplesOuterWrapper: {
    width: '100%',
    marginHorizontal: 0,
  },
  
  examplesWrapper: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  
  exampleContainer: {
    backgroundColor: '#333333',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#444444',
    width: '100%',
    position: 'relative',
    marginHorizontal: 0,
  },
  
  exampleSection: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#444444',
  },
  
  exampleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  
  exampleSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#CCCCCC',
    marginBottom: 2,
  },
  
  pronunciationButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#58CC02',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  
  pronunciationIcon: {
    fontSize: 14,
    color: 'white',
  },
  
  exampleContentScroll: {
    maxHeight: 80,
  },
  
  exampleQuestion: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#CCCCCC',
    marginBottom: 4,
  },
  
  exampleAnswer: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#CCCCCC',
    marginBottom: 4,
  },
  
  exampleTranslation: {
    fontSize: 13,
    color: '#FFD700',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  
  answerSection: {
    backgroundColor: 'rgba(88, 204, 2, 0.1)',
    borderRadius: 8,
    marginBottom: 8,
    paddingTop: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 0,
  },
  
  popupHeader: {
    width: '100%',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#444444',
  },
  
  correctHeader: {
    backgroundColor: '#2E5B01',
  },
  
  incorrectHeader: {
    backgroundColor: '#5B0000',
  },
  
  popupTitle: { 
    fontFamily: 'System', 
    fontSize: 20, 
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center', 
    marginTop: 0,
    marginBottom: 0,
    width: '100%',
    paddingHorizontal: 10,
  },
  
  incorrectTitle: {
    color: '#FFFFFF',
  },
  
  scrollContainer: {
    width: '100%',
    flex: 1,
    backgroundColor: '#252525',
  },
  
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 60,
    paddingTop: 10,
  },
  
  cardContainer: {
    width: '90%',
    backgroundColor: '#333333',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#444444',
  },
  
  cardContent: {
    width: '100%',
    alignItems: 'center',
  },
  
  cardText: {
    marginBottom: 4,
    color: '#CCCCCC',
  },
  
  evaluationHeader: { 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    margin: 15,
    marginTop: 50,
    borderWidth: 1,
    borderColor: '#333333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  
  evaluationTitle: { 
    fontFamily: 'System', 
    fontSize: 28, 
    fontWeight: 'bold',
    color: '#58CC02',
    marginBottom: 15,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  evaluationSubtitle: { 
    fontFamily: 'System', 
    fontSize: 24, 
    fontWeight: 'bold',
    color: '#FFB100',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  evaluationScroll: { 
    flex: 1,
    backgroundColor: '#121212',
  },
  
  evaluationContent: { 
    padding: 15,
  },
  
  evaluationSectionTitle: { 
    fontFamily: 'System', 
    fontSize: 20, 
    fontWeight: 'bold',
    color: '#FFFFFF',
    backgroundColor: '#252525',
    padding: 15, 
    borderRadius: 16, 
    marginVertical: 15,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  
  cardResultContainer: { 
    backgroundColor: '#252525',
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#333333'
  },
  
  cardResultTitle: { 
    fontSize: 22, 
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  
  cardResultContent: { 
    backgroundColor: '#333333',
    borderRadius: 16, 
    padding: 15,
    borderWidth: 1,
    borderColor: '#444444',
  },
  
  cardResultRow: { 
    flexDirection: 'column',
    marginVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#444444',
    paddingBottom: 12,
  },
  
  cardResultRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  
  cardResultLabel: { 
    fontSize: 16, 
    color: '#999999',
    fontWeight: '600',
    marginBottom: 4,
  },
  
  cardResultValue: { 
    fontSize: 16, 
    color: '#CCCCCC',
    fontWeight: '500',
  },
  
  evaluationButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 20,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  
  evaluationButton: { 
    backgroundColor: '#58CC02',
    borderRadius: 16, 
    paddingVertical: 16, 
    paddingHorizontal: 24,
    flex: 1, 
    marginHorizontal: 5,
    shadowColor: '#45a100',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#45a100',
  },
  
  evaluationButtonText: { 
    fontFamily: 'System', 
    fontSize: 18, 
    fontWeight: 'bold',
    color: 'white', 
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  
  chestViewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 15,
    width: '100%',
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  
  chestRewardText: {
    fontSize: 20,
    color: '#FFD700',
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  
  chestImageContainer: {
    width: 80,
    height: 80,
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: '#3A3000',
    borderWidth: 2,
    borderColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  
  // Add styles for word navigation
  wordNavigation: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
    zIndex: 4,
  },
  
  wordNavButton: {
    width: 30,
    height: 30,
    backgroundColor: 'rgba(51, 51, 51, 0.7)',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  
  wordNavButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#58CC02',
  },
  
  wordNavCounterText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#CCCCCC',
    marginHorizontal: 6,
  },
  
  navArrowDisabled: {
    backgroundColor: '#222222',
    opacity: 0.5,
  },
  
  userChoiceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 4,
  },
  
  pairActivityInfo: {
    width: '100%',
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10,
    alignItems: 'center',
    zIndex: 3,
    maxHeight: 180,
    overflow: 'visible',
  },
  
  pairActivityLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#CCCCCC',
    marginBottom: 2,
    marginTop: 4,
    zIndex: 3,
  },
  
  pairActivityText: {
    fontSize: 16,
    color: '#FFD700',
    marginBottom: 6,
    textAlign: 'center',
    zIndex: 3,
  },
});
