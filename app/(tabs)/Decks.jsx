// Decks.jsx
import { Audio } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    Image,
    ImageBackground,
    Modal,
    SafeAreaView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import AIPage from './AIPage'; // Import the AI page component
import ManualImport from './manualImport'; // Import the ManualImport component
import { WordByWordTranslation, isSpaceFreeLanguage, parseWordByWord } from './Review';

const db = SQLite.openDatabaseSync('mydb.db');
const { width, height } = Dimensions.get('window');
const CARD_SIZE = (width - 40) / 4;
const defaultExamples = Array(5).fill({
  question: '', questionPhonetic: '', questionAudio: '', questionTranslation: '',
  answer: '', answerPhonetic: '', answerAudio: '', translation: ''
});

export default function DecksScreen() {
  const [activeTab, setActiveTab] = useState('browse'); // "browse" is default
  const [createDeckOption, setCreateDeckOption] = useState(null); // null, 'ai', or 'manual'
  const [generatedCards, setGeneratedCards] = useState([]);
  const [availableDecks, setAvailableDecks] = useState([]);
  const [selectedDeckName, setSelectedDeckName] = useState(null);
  const [cards, setCards] = useState([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editedCard, setEditedCard] = useState({ 
    examples: defaultExamples,
    unsplashImages: [],
    wordByWord: "",
    language: 'English'
  });
  const [selectedExampleIndex, setSelectedExampleIndex] = useState(0);
  const [isListView, setIsListView] = useState(false); // Toggle between card view and list view
  const [expandedCards, setExpandedCards] = useState({}); // Track which cards have examples shown
  const [hasExistingInputs, setHasExistingInputs] = useState(false);
  
  // Advanced settings state variables
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [translatedLanguage, setTranslatedLanguage] = useState('English');
  const [numExamples, setNumExamples] = useState(2);
  
  // Deletion mode state variables
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedCardsForDeletion, setSelectedCardsForDeletion] = useState({});
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [deletionType, setDeletionType] = useState(null); // 'cards' or 'deck'
  const [confirmationText, setConfirmationText] = useState('');

  // Add state for word-by-word translation boxes
  const [wordByWordBoxes, setWordByWordBoxes] = useState([]);
  const [answerWordByWordBoxes, setAnswerWordByWordBoxes] = useState([]);

  const router = useRouter();
  const params = useLocalSearchParams();

  // Handle initialTab parameter to switch to Create Deck tab
  useEffect(() => {
    if (params.initialTab === 'create') {
      setActiveTab('create');
    }
  }, [params.initialTab]);

  // Load all decks when component mounts
  useEffect(() => {
    loadAllDecks();
  }, []);

  // When decks are loaded, select the first one by default
  useEffect(() => {
    if (availableDecks.length > 0 && !selectedDeckName && activeTab === 'browse') {
      setSelectedDeckName(availableDecks[0]);
      loadDeckCards(availableDecks[0]);
    }
  }, [availableDecks, activeTab]);

  // Filter out SQLite internal tables like "sqlite_sequence"
  const loadAllDecks = () => {
    try {
      const tables = db.getAllSync("SELECT name FROM sqlite_master WHERE type='table'");
      const filtered = tables.filter(t => t.name !== 'sqlite_sequence');
      
      // Add wordByWord column to each deck table if it doesn't exist
      filtered.forEach(table => {
        try {
          // Check if wordByWord column exists
          const columns = db.getAllSync(`PRAGMA table_info(${table.name})`);
          const hasWordByWord = columns.some(col => col.name === 'wordByWord');
          
          // Add column if it doesn't exist
          if (!hasWordByWord) {
            db.runSync(`ALTER TABLE ${table.name} ADD COLUMN wordByWord TEXT DEFAULT ''`);
            console.log(`Added wordByWord column to ${table.name}`);
          }
        } catch (err) {
          console.error(`Error adding wordByWord column to ${table.name}:`, err);
        }
      });
      
      setAvailableDecks(filtered.map(t => t.name));
    } catch (error) {
      Alert.alert('Error', 'Failed to load decks');
    }
  };

  const loadDeckCards = (deckName) => {
    try {
      const results = db.getAllSync(`SELECT * FROM ${deckName}`);
      setCards(results.map(card => ({
        ...card,
        examples: card.examples ? JSON.parse(card.examples) : defaultExamples,
        unsplashImages: card.unsplashImages ? JSON.parse(card.unsplashImages) : [],
        wordByWord: card.wordByWord || ""
      })));
    } catch (error) {
      Alert.alert('Error', 'Failed to load deck cards');
    }
  };

  // Function to toggle delete mode
  const toggleDeleteMode = () => {
    if (isDeleteMode) {
      // If exiting delete mode, clear selected cards
      setSelectedCardsForDeletion({});
    }
    setIsDeleteMode(!isDeleteMode);
  };

  // Function to toggle selection of a card for deletion
  const toggleCardSelection = (cardId) => {
    setSelectedCardsForDeletion(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  // Function to handle delete confirmation for cards
  const handleDeleteCards = () => {
    const selectedIds = Object.keys(selectedCardsForDeletion).filter(id => selectedCardsForDeletion[id]);
    
    if (selectedIds.length === 0) {
      Alert.alert('No Cards Selected', 'Please select at least one card to delete');
      return;
    }
    
    setConfirmationMessage(`Are you sure you want to delete ${selectedIds.length} card(s)?`);
    setDeletionType('cards');
    setIsConfirmModalVisible(true);
  };

  // Function to handle delete confirmation for a deck
  const handleDeleteDeck = () => {
    if (!selectedDeckName) {
      Alert.alert('No Deck Selected', 'Please select a deck to delete');
      return;
    }
    
    // First confirmation
    Alert.alert(
      'Delete Deck',
      `Are you sure you want to delete the deck "${selectedDeckName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes', 
          style: 'destructive',
          onPress: () => {
            // Show second confirmation with text input
            setConfirmationMessage(`You are deleting the deck "${selectedDeckName}" and it can't be undone. Type "Confirm" to delete.`);
            setDeletionType('deck');
            setIsConfirmModalVisible(true);
          }
        }
      ]
    );
  };

  // Function to perform actual deletion after confirmation
  const performDeletion = () => {
    try {
      if (deletionType === 'cards') {
        const selectedIds = Object.keys(selectedCardsForDeletion).filter(id => selectedCardsForDeletion[id]);
        
        // Create a SQL statement with placeholders
        const placeholders = selectedIds.map(() => '?').join(', ');
        const query = `DELETE FROM ${selectedDeckName} WHERE id IN (${placeholders})`;
        
        // Execute the delete query
        db.runSync(query, selectedIds);
        
        // Reload deck cards
        loadDeckCards(selectedDeckName);
        
        // Reset selection state
        setSelectedCardsForDeletion({});
        setIsDeleteMode(false);
        
        Alert.alert('Success', `${selectedIds.length} card(s) deleted successfully`);
      } 
      else if (deletionType === 'deck') {
        // Check if the confirmation text is correct
        if (confirmationText !== 'Confirm') {
          Alert.alert('Error', 'Please type "Confirm" to delete the deck');
          return;
        }
        
        // Drop the table
        db.runSync(`DROP TABLE IF EXISTS ${selectedDeckName}`);
        
        // Refresh available decks
        loadAllDecks();
        
        // Reset states
        setSelectedDeckName(null);
        setCards([]);
        setIsDeleteMode(false);
        setConfirmationText('');
        
        Alert.alert('Success', `Deck "${selectedDeckName}" deleted successfully`);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to delete: ${error.message}`);
    } finally {
      setIsConfirmModalVisible(false);
    }
  };

  // Function to handle when cards are generated by AI
  const handleGeneratedCards = (cards) => {
    setGeneratedCards(cards);
    setCreateDeckOption('manual');
  };

  // New function to track if there are existing inputs in ManualImport
  const handleInputsChange = (hasInputs) => {
    setHasExistingInputs(hasInputs);
  };

  // Handle a successful deck save from ManualImport
  const handleDeckSaved = (deckName) => {
    // Refresh available decks
    loadAllDecks();
    
    // Switch to browse tab
    setActiveTab('browse');
    setCreateDeckOption(null);
    
    // Set the selected deck to the newly created one
    setSelectedDeckName(deckName);
    
    // Load the cards from the new deck
    loadDeckCards(deckName);
  };

  // Helper function to parse word-by-word string into boxes array
  const parseWordByWordToBoxes = (wordByWordStr) => {
    if (!wordByWordStr) return [];
    
    const result = [];
    const pairs = wordByWordStr.split('|');
    
    pairs.forEach(pair => {
      const [word, translation] = pair.split('=');
      if (word && translation) {
        result.push({
          word: word.trim(),
          translation: translation.trim(),
          isProtected: false // Default to not protected
        });
      }
    });
    
    return result;
  };

  // Helper function to convert boxes array back to word-by-word string
  const boxesToWordByWordString = (boxes) => {
    return boxes.map(box => `${box.word}=${box.translation}`).join('|');
  };

  // Modify rebuildSentenceFromBoxes to handle spaces based on language
  const rebuildSentenceFromBoxes = (boxes, language) => {
    // If it's a language that doesn't use spaces (CJK languages), join without spaces
    if (isSpaceFreeLanguage(language)) {
      return boxes.map(box => box.word).join('');
    } 
    // Otherwise, join with spaces for languages like English, Spanish, German, etc.
    return boxes.map(box => box.word).join(' ');
  };

  // Function to update a question box
  const updateWordByWordBox = (index, field, value) => {
    const newBoxes = [...wordByWordBoxes];
    
    // Don't allow word changes if the word is protected (translation can still be changed)
    if (field === 'word' && newBoxes[index].isProtected) {
      return;
    }
    
    newBoxes[index] = {
      ...newBoxes[index],
      [field]: value
    };
    setWordByWordBoxes(newBoxes);
    
    // Update the questionWordByWord field in the editedCard
    const newExamples = [...editedCard.examples];
    newExamples[selectedExampleIndex].questionWordByWord = boxesToWordByWordString(newBoxes);
    
    // If updating a word (not a translation), rebuild and update the question sentence
    if (field === 'word') {
      // Get the language from editedCard
      const language = editedCard.language || 'English';
      newExamples[selectedExampleIndex].question = rebuildSentenceFromBoxes(newBoxes, language);
    }
    
    setEditedCard({...editedCard, examples: newExamples});
  };

  // Function to update an answer box
  const updateAnswerWordByWordBox = (index, field, value) => {
    const newBoxes = [...answerWordByWordBoxes];
    
    // Don't allow word changes if the word is protected (translation can still be changed)
    if (field === 'word' && newBoxes[index].isProtected) {
      return;
    }
    
    newBoxes[index] = {
      ...newBoxes[index],
      [field]: value
    };
    setAnswerWordByWordBoxes(newBoxes);
    
    // Update the answerWordByWord field in the editedCard
    const newExamples = [...editedCard.examples];
    newExamples[selectedExampleIndex].answerWordByWord = boxesToWordByWordString(newBoxes);
    
    // If updating a word (not a translation), rebuild and update the answer sentence
    if (field === 'word') {
      // Get the language from editedCard
      const language = editedCard.language || 'English';
      newExamples[selectedExampleIndex].answer = rebuildSentenceFromBoxes(newBoxes, language);
    }
    
    setEditedCard({...editedCard, examples: newExamples});
  };

  // Function to remove a question box
  const removeWordByWordBox = (index) => {
    // Don't allow removal if the word is protected
    if (wordByWordBoxes[index].isProtected) {
      Alert.alert('Protected Word', 'This word is part of the target vocabulary and cannot be removed.');
      return;
    }
    
    const newBoxes = wordByWordBoxes.filter((_, i) => i !== index);
    setWordByWordBoxes(newBoxes);
    
    // Update the questionWordByWord field in the editedCard
    const newExamples = [...editedCard.examples];
    newExamples[selectedExampleIndex].questionWordByWord = boxesToWordByWordString(newBoxes);
    setEditedCard({...editedCard, examples: newExamples});
  };

  // Function to remove an answer box
  const removeAnswerWordByWordBox = (index) => {
    // Don't allow removal if the word is protected
    if (answerWordByWordBoxes[index].isProtected) {
      Alert.alert('Protected Word', 'This word is part of the target vocabulary and cannot be removed.');
      return;
    }
    
    const newBoxes = answerWordByWordBoxes.filter((_, i) => i !== index);
    setAnswerWordByWordBoxes(newBoxes);
    
    // Update the answerWordByWord field in the editedCard
    const newExamples = [...editedCard.examples];
    newExamples[selectedExampleIndex].answerWordByWord = boxesToWordByWordString(newBoxes);
    setEditedCard({...editedCard, examples: newExamples});
  };

  // Function to add a new empty question box
  const addWordByWordBox = (index = null) => {
    const newBox = { word: '', translation: '', isProtected: false };
    let newBoxes;
    
    if (index === null) {
      // Add to the end
      newBoxes = [...wordByWordBoxes, newBox];
    } else {
      // Insert at specified position
      newBoxes = [
        ...wordByWordBoxes.slice(0, index + 1),
        newBox,
        ...wordByWordBoxes.slice(index + 1)
      ];
    }
    
    setWordByWordBoxes(newBoxes);
    
    // Update the questionWordByWord field in the editedCard
    const newExamples = [...editedCard.examples];
    newExamples[selectedExampleIndex].questionWordByWord = boxesToWordByWordString(newBoxes);
    setEditedCard({...editedCard, examples: newExamples});
  };

  // Function to add a new empty answer box
  const addAnswerWordByWordBox = (index = null) => {
    const newBox = { word: '', translation: '', isProtected: false };
    let newBoxes;
    
    if (index === null) {
      // Add to the end
      newBoxes = [...answerWordByWordBoxes, newBox];
    } else {
      // Insert at specified position
      newBoxes = [
        ...answerWordByWordBoxes.slice(0, index + 1),
        newBox,
        ...answerWordByWordBoxes.slice(index + 1)
      ];
    }
    
    setAnswerWordByWordBoxes(newBoxes);
    
    // Update the answerWordByWord field in the editedCard
    const newExamples = [...editedCard.examples];
    newExamples[selectedExampleIndex].answerWordByWord = boxesToWordByWordString(newBoxes);
    setEditedCard({...editedCard, examples: newExamples});
  };

  const playAudio = async (uri) => {
    if (!uri) return;
    try {
      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();
    } catch (error) {
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const saveCard = () => {
    try {
      db.runSync(
        `UPDATE ${selectedDeckName} SET
          front=?, back=?, phonetic=?, imageUrl=?, examples=?, unsplashImages=?, wordByWord=?
         WHERE id=?`,
        [
          editedCard.front,
          editedCard.back,
          editedCard.phonetic,
          editedCard.imageUrl,
          JSON.stringify(editedCard.examples),
          JSON.stringify(editedCard.unsplashImages),
          editedCard.wordByWord || "",
          editedCard.id
        ]
      );
      loadDeckCards(selectedDeckName);
      setIsEditModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save card');
    }
  };

  const renderCardItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.cardContainer,
        isDeleteMode && selectedCardsForDeletion[item.id] && styles.selectedCard
      ]}
      onPress={() => {
        if (isDeleteMode) {
          toggleCardSelection(item.id);
        } else {
          handleCardPress(item);
        }
      }}
    >
      {isDeleteMode && (
        <View style={styles.cardSelectionIndicator}>
          <Text style={styles.cardSelectionIcon}>
            {selectedCardsForDeletion[item.id] ? '✅' : '⬜'}
          </Text>
        </View>
      )}
      <View style={styles.textContainer}>
        <Text style={styles.foreignText} numberOfLines={1}>{item.front}</Text>
      </View>
      <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
      <View style={styles.textContainer}>
        <Text style={styles.translationText} numberOfLines={1}>{item.back}</Text>
      </View>
      <View style={styles.levelBadge}>
        <Text style={styles.levelText}>⚡️ Lv.1</Text>
        <Text style={styles.levelText}>Exp: {item.exp || 0}</Text>
      </View>
    </TouchableOpacity>
  );

  // Toggle examples for a specific card
  const toggleCardExamples = (cardId) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  // Add this utility function to remove hashtags
  const removeHashtags = (text) => {
    return text ? text.replace(/#/g, '') : '';
  };

  // Modify identifyProtectedWords function to support non-hashtag identification
  const identifyProtectedWords = (questionText, wordByWordBoxes, frontWord) => {
    if (!questionText) return wordByWordBoxes;
    
    // For legacy data that might have hashtags, extract words surrounded by # symbols
    const protectedWords = [];
    let match;
    const regex = /#([^#]+)#/g;
    
    while ((match = regex.exec(questionText)) !== null) {
      protectedWords.push(match[1]);
    }
    
    // Also add the front word (target vocabulary word) to the protected words
    if (frontWord && !protectedWords.includes(frontWord)) {
      protectedWords.push(frontWord);
    }
    
    // If no protected words, return as is
    if (protectedWords.length === 0) return wordByWordBoxes;
    
    // Mark boxes with protected words
    return wordByWordBoxes.map(box => ({
      ...box,
      isProtected: protectedWords.some(word => box.word.includes(word))
    }));
  };

  const handleCardPress = (card) => {
    // Remove hashtags from card content before displaying
    const processedCard = {
      ...card,
      wordByWord: card.wordByWord || "",
      examples: (card.examples || []).map(ex => ({
        ...ex,
        question: removeHashtags(ex.question),
        answer: removeHashtags(ex.answer)
      }))
    };
    
    setEditedCard(processedCard);
    
    // Parse question word-by-word for the first example to initialize boxes
    if (processedCard.examples && processedCard.examples[0]) {
      const example = processedCard.examples[0];
      
      // For question word-by-word
      let questionBoxes = parseWordByWordToBoxes(example.questionWordByWord || "");
      // Mark protected words using the front word of the card as the target
      questionBoxes = identifyProtectedWords(example.question, questionBoxes, card.front);
      setWordByWordBoxes(questionBoxes);
      
      // For answer word-by-word
      let answerBoxes = parseWordByWordToBoxes(example.answerWordByWord || "");
      // Mark protected words using the front word of the card as the target
      answerBoxes = identifyProtectedWords(example.answer, answerBoxes, card.front);
      setAnswerWordByWordBoxes(answerBoxes);
    } else {
      setWordByWordBoxes([]);
      setAnswerWordByWordBoxes([]);
    }
    
    setIsEditModalVisible(true);
  };

  // New function to update wordByWordBoxes when switching examples
  const handleExampleTabPress = (index) => {
    setSelectedExampleIndex(index);
    
    // Update word-by-word boxes based on selected example
    const example = editedCard.examples[index];
    if (example) {
      // For question word-by-word
      let questionBoxes = parseWordByWordToBoxes(example.questionWordByWord || "");
      // Mark protected words using the front word of the card
      questionBoxes = identifyProtectedWords(example.question, questionBoxes, editedCard.front);
      setWordByWordBoxes(questionBoxes);
      
      // For answer word-by-word
      let answerBoxes = parseWordByWordToBoxes(example.answerWordByWord || "");
      // Mark protected words using the front word of the card
      answerBoxes = identifyProtectedWords(example.answer, answerBoxes, editedCard.front);
      setAnswerWordByWordBoxes(answerBoxes);
    } else {
      setWordByWordBoxes([]);
      setAnswerWordByWordBoxes([]);
    }
  };

  // Render an item in list view - updated version
  const renderListItem = ({ item }) => {
    // Parse ISO dates for better formatting
    const lastReviewDate = new Date(item.lastReviewDate);
    const nextReviewDate = new Date(item.nextReviewDate);
    const formattedLastReview = lastReviewDate.toLocaleDateString();
    const formattedNextReview = nextReviewDate.toLocaleDateString();
    
    // Format time portion
    const lastReviewTime = lastReviewDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const nextReviewTime = nextReviewDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    const isSelected = selectedCardsForDeletion[item.id];
    
    // Process examples to remove hashtags
    const processedExamples = item.examples ? item.examples.map(ex => ({
      ...ex,
      question: removeHashtags(ex.question),
      answer: removeHashtags(ex.answer)
    })) : [];
    
    return (
      <TouchableOpacity 
        style={[
          styles.listItemContainer,
          isDeleteMode && isSelected && styles.selectedListItem
        ]}
        onPress={() => {
          if (isDeleteMode) {
            toggleCardSelection(item.id);
          } else {
            handleCardPress(item);
          }
        }}
      >
        {/* Selection indicator for delete mode */}
        {isDeleteMode && (
          <View style={styles.selectionIndicator}>
            <Text style={styles.selectionIcon}>{isSelected ? '✅' : '⬜'}</Text>
          </View>
        )}
        
        {/* Card header with word and meaning */}
        <View style={styles.listItemHeader}>
          <View style={styles.listItemMainInfo}>
            <Text style={styles.listItemFront}>{item.front}</Text>
            {item.frontAudio && (
              <TouchableOpacity onPress={() => playAudio(item.frontAudio)}>
                <Text style={styles.listItemAudioButton}>🔊</Text>
              </TouchableOpacity>
            )}
            {item.phonetic && <Text style={styles.listItemPhonetic}>{item.phonetic}</Text>}
          </View>
          
          <Text style={styles.listItemBack}>{item.back}</Text>
          
          {item.wordByWord && (
            <View style={styles.wordByWordContainer}>
              <WordByWordTranslation
                sentence={item.front}
                wordByWordMap={parseWordByWord(item.wordByWord)}
                containerStyle={styles.wordByWordListDisplay}
              />
            </View>
          )}
          
          {/* Show/Hide Examples button */}
          <TouchableOpacity 
            style={styles.examplesToggleButton}
            onPress={() => toggleCardExamples(item.id)}
          >
            <Text style={styles.examplesToggleText}>
              {expandedCards[item.id] ? 'Hide Examples' : 'Show Examples'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Expanded examples section */}
        {expandedCards[item.id] && (
          <View style={styles.examplesContainer}>
            <Text style={styles.listItemSectionTitle}>Examples:</Text>
            {(() => {
              try {
                return processedExamples.filter(ex => ex.question || ex.answer).map((ex, idx) => (
                  <View key={idx} style={styles.listItemExample}>
                    <Text style={styles.exampleNumber}>Example {idx+1}:</Text>
                    
                    {/* Question section */}
                    {ex.question && (
                      <View>
                        <View style={styles.exampleRow}>
                          <Text style={styles.listItemExampleLabel}>Q:</Text>
                          <Text style={styles.listItemExampleText}>{ex.question}</Text>
                          {ex.questionAudio && (
                            <TouchableOpacity onPress={() => playAudio(ex.questionAudio)}>
                              <Text style={styles.listItemAudioButton}>🔊</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        
                        {/* Question phonetic */}
                        {ex.questionPhonetic && (
                          <Text style={[styles.translationText, styles.phoneticText]}>
                            Phonetic: {ex.questionPhonetic}
                          </Text>
                        )}
                        
                        {/* Question translation */}
                        {ex.questionTranslation && (
                          <Text style={styles.translationText}>
                            Translation: {ex.questionTranslation}
                          </Text>
                        )}
                        
                        {/* Question word-by-word */}
                        {ex.questionWordByWord && (
                          <View style={styles.wordByWordWrapper}>
                            <Text style={styles.wordByWordLabel}>Word-by-Word:</Text>
                            <WordByWordTranslation
                              sentence={ex.question}
                              wordByWordMap={parseWordByWord(ex.questionWordByWord)}
                              containerStyle={styles.wordByWordListDisplay}
                            />
                          </View>
                        )}
                      </View>
                    )}
                    
                    {/* Answer section */}
                    {ex.answer && (
                      <View style={{marginTop: 5}}>
                        <View style={styles.exampleRow}>
                          <Text style={styles.listItemExampleLabel}>A:</Text>
                          <Text style={styles.listItemExampleText}>{ex.answer}</Text>
                          {ex.answerAudio && (
                            <TouchableOpacity onPress={() => playAudio(ex.answerAudio)}>
                              <Text style={styles.listItemAudioButton}>🔊</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        
                        {/* Answer phonetic */}
                        {ex.answerPhonetic && (
                          <Text style={[styles.translationText, styles.phoneticText]}>
                            Phonetic: {ex.answerPhonetic}
                          </Text>
                        )}
                        
                        {/* Answer translation */}
                        {ex.translation && (
                          <Text style={styles.translationText}>
                            Translation: {ex.translation}
                          </Text>
                        )}
                        
                        {/* Answer word-by-word */}
                        {ex.answerWordByWord && (
                          <View style={styles.wordByWordWrapper}>
                            <Text style={styles.wordByWordLabel}>Word-by-Word:</Text>
                            <WordByWordTranslation
                              sentence={ex.answer}
                              wordByWordMap={parseWordByWord(ex.answerWordByWord)}
                              containerStyle={styles.wordByWordListDisplay}
                            />
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                ));
              } catch (error) {
                return <Text style={{ color: 'red' }}>Error loading examples</Text>;
              }
            })()}
          </View>
        )}
        
        {/* Card metadata section */}
        <View style={styles.cardMetadata}>
          <View style={styles.metadataSection}>
            <Text style={styles.metadataLabel}>Study Progress:</Text>
            <Text style={styles.metadataText}>
              Correct streak: {item.consecutiveCorrectAnswersCount}
            </Text>
            <Text style={styles.metadataText}>
              Ease factor: {parseFloat(item.easeFactor).toFixed(1)}
            </Text>
            <Text style={styles.metadataText}>
              Experience: {item.exp || 0}
            </Text>
            {item.wrongQueue && (
              <Text style={styles.metadataText}>
                Wrong queue: {item.wrongQueue}
              </Text>
            )}
          </View>
          
          <View style={styles.metadataSection}>
            <Text style={styles.metadataLabel}>Review Dates:</Text>
            <Text style={styles.metadataText}>
              Last: {formattedLastReview} {lastReviewTime}
            </Text>
            <Text style={styles.metadataText}>
              Next: {formattedNextReview} {nextReviewTime}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Header Tabs (Browse Deck and Create Deck)
  const renderHeaderTabs = () => (
    <View style={styles.headerContainer}>
      <View style={styles.backButtonContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            // Check navigation source and go back to the appropriate screen
            if (params.navSource === 'studyScreen') {
              // Return to the study screen review mode
              router.push({
                pathname: '/',
                params: { showDeckSelection: 'true' }
              });
            } else {
              // Default is to go back to home screen
              router.push('/');
            }
          }}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
      
      {/* Only show tabs if not in creation mode */}
      {!(createDeckOption === 'manual' || createDeckOption === 'ai') && (
        <View style={styles.headerTabsContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'browse' && styles.selectedTabButton]}
            onPress={() => setActiveTab('browse')}
          >
            <Text style={[styles.tabText, activeTab === 'browse' && styles.selectedTabText]}>
              Browse Decks
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'create' && styles.selectedTabButton]}
            onPress={() => setActiveTab('create')}
          >
            <Text style={[styles.tabText, activeTab === 'create' && styles.selectedTabText]}>
              Create Deck
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Horizontal deck selection to be rendered in the cards list header
  const renderDeckSelection = () => (
    <FlatList
      horizontal
      data={availableDecks}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.deckButton, 
            item === selectedDeckName && styles.selectedDeckButton
          ]}
          onPress={() => {
            // In delete mode, pressing a deck button should trigger delete confirmation
            if (isDeleteMode) {
              setSelectedDeckName(item);
              handleDeleteDeck();
            } else {
              setSelectedDeckName(item);
              loadDeckCards(item);
            }
          }}
        >
          <Text style={styles.deckButtonText}>{item}</Text>
        </TouchableOpacity>
      )}
      keyExtractor={(item, index) => index.toString()}
      contentContainerStyle={styles.deckSelection}
    />
  );

  // Toggle View Button
  const renderToggleViewButton = () => (
    <View style={styles.toggleViewContainer}>
      <Text style={styles.toggleViewLabel}>List View</Text>
      <Switch
        value={isListView}
        onValueChange={setIsListView}
        trackColor={{ false: '#767577', true: '#00ff88' }}
        thumbColor={isListView ? '#00cc66' : '#f4f3f4'}
      />
      
      <TouchableOpacity 
        style={[styles.deleteButton, isDeleteMode && styles.deleteButtonActive]}
        onPress={toggleDeleteMode}
      >
        <Text style={styles.deleteButtonText}>
          {isDeleteMode ? 'Cancel' : 'Delete'}
        </Text>
      </TouchableOpacity>
      
      {isDeleteMode && (
        <TouchableOpacity 
          style={styles.confirmDeleteButton}
          onPress={handleDeleteCards}
        >
          <Text style={styles.deleteButtonText}>Confirm Delete</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // For the Browse tab, render content with proper keys and layout
  const renderBrowseContent = () => (
    <View style={styles.browseContainer}>
      <View style={styles.deckSelectionContainer}>
        {renderDeckSelection()}
      </View>
      
      <View style={styles.cardListContainer}>
        {isListView ? (
          <FlatList
            key="listView"
            data={cards}
            renderItem={renderListItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No cards in this deck</Text>
            }
          />
        ) : (
          <FlatList
            key="gridView"
            data={cards}
            renderItem={renderCardItem}
            numColumns={4}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.cardGrid}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No cards in this deck</Text>
            }
          />
        )}
      </View>
      
      {renderToggleViewButton()}
    </View>
  );
  
  // Render the Create Deck option buttons
  const renderCreateDeckOptions = () => (
    <View style={styles.createOptionsContainer}>
      <Text style={styles.createTitle}>Choose creation method</Text>
      
      <TouchableOpacity 
        style={styles.createOptionButton}
        onPress={() => setCreateDeckOption('ai')}
      >
        <Text style={styles.createOptionButtonText}>Create with AI (Recommended)</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.createOptionButton}
        onPress={() => setCreateDeckOption('manual')}
      >
        <Text style={styles.createOptionButtonText}>Manual Import</Text>
      </TouchableOpacity>
    </View>
  );

  // Render advanced settings component
  const renderAdvancedSettings = () => (
    <View style={styles.advancedSettingsContainer}>
      <TouchableOpacity 
        style={styles.advancedSettingsToggle}
        onPress={() => setShowAdvancedSettings(!showAdvancedSettings)}
      >
        <Text style={styles.advancedSettingsToggleText}>
          {showAdvancedSettings ? 'Hide Advanced Settings' : 'Advanced Settings'}
        </Text>
      </TouchableOpacity>
      
      {showAdvancedSettings && (
        <View style={styles.advancedSettingsContent}>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Translated Language:</Text>
            <TextInput
              style={styles.settingInput}
              value={translatedLanguage}
              onChangeText={setTranslatedLanguage}
              placeholder="English"
              placeholderTextColor="#999"
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Number of Examples:</Text>
            <View style={styles.numberSelector}>
              <TouchableOpacity 
                style={styles.numberButton}
                onPress={() => setNumExamples(Math.max(2, numExamples - 1))}
              >
                <Text style={styles.numberButtonText}>-</Text>
              </TouchableOpacity>
              
              <Text style={styles.numberValue}>{numExamples}</Text>
              
              <TouchableOpacity 
                style={styles.numberButton}
                onPress={() => setNumExamples(Math.min(5, numExamples + 1))}
              >
                <Text style={styles.numberButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  // Handle back button functionality for AIPage and ManualImport
  const handleBackToCreateOptions = () => {
    setCreateDeckOption(null);
  };

  return (
    <ImageBackground source={require('../asset/background.png')} style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        {/* Sticky Top Tabs - only show when not in AI/Manual creation mode */}
        {!(activeTab === 'create' && (createDeckOption === 'ai' || createDeckOption === 'manual')) && renderHeaderTabs()}
        
        {/* Content based on selected tab and option */}
        {activeTab === 'browse' && renderBrowseContent()}
        
        {activeTab === 'create' && !createDeckOption && renderCreateDeckOptions()}
        {activeTab === 'create' && createDeckOption === 'ai' && (
          <>
            <AIPage 
              onGeneratedCards={handleGeneratedCards} 
              hasExistingInputs={hasExistingInputs}
              translatedLanguage={translatedLanguage}
              numExamples={numExamples}
              onBack={handleBackToCreateOptions}
            />
            <View style={styles.advancedSettingsWrapper}>
              {renderAdvancedSettings()}
            </View>
          </>
        )}
        {activeTab === 'create' && createDeckOption === 'manual' && 
          <ManualImport 
            initialCards={generatedCards} 
            onDeckSaved={handleDeckSaved}
            onInputsChange={handleInputsChange}
            onBack={handleBackToCreateOptions}
          />
        }

        {/* Edit Modal */}
        <Modal visible={isEditModalVisible} animationType="slide">
          <SafeAreaView style={styles.modalContainer}>
            <FlatList
              data={[]}
              ListHeaderComponent={
                <View>
                  <View style={styles.modalTitle}>
                    <Text style={styles.modalTitleText}>Edit Card</Text>
                  </View>
                  
                  <View style={styles.formRow}>
                    <Text style={styles.rowLabel}>Foreign Word</Text>
                    <TextInput
                      style={styles.rowInput}
                      value={editedCard.front}
                      onChangeText={text => setEditedCard({...editedCard, front: text})}
                    />
                    <TouchableOpacity onPress={() => playAudio(editedCard.frontAudio)}>
                      <Text style={styles.audioButton}>🔊</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.formRow}>
                    <Text style={styles.rowLabel}>Phonetic</Text>
                    <TextInput
                      style={styles.rowInput}
                      value={editedCard.phonetic}
                      onChangeText={text => setEditedCard({...editedCard, phonetic: text})}
                    />
                  </View>
                  
                  <View style={styles.formRow}>
                    <Text style={styles.rowLabel}>Translation</Text>
                    <TextInput
                      style={styles.rowInput}
                      value={editedCard.back}
                      onChangeText={text => setEditedCard({...editedCard, back: text})}
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Image</Text>
                    {editedCard.imageUrl ? (
                      <View style={styles.imagePreviewContainer}>
                        <Image 
                          source={{ uri: editedCard.imageUrl }} 
                          style={styles.imagePreview} 
                          resizeMode="cover"
                        />
                        <TextInput
                          style={styles.imageUrlInput}
                          value={editedCard.imageUrl}
                          onChangeText={text => setEditedCard({...editedCard, imageUrl: text})}
                          placeholder="Image URL"
                        />
                      </View>
                    ) : (
                      <TextInput
                        style={styles.input}
                        value={editedCard.imageUrl}
                        onChangeText={text => setEditedCard({...editedCard, imageUrl: text})}
                        placeholder="Image URL"
                      />
                    )}
                  </View>
                  
                  <Text style={styles.sectionHeader}>Example Sentences</Text>
                  <View style={styles.exampleSelector}>
                    {[0, 1, 2, 3, 4].map((_, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.exampleTab, 
                          selectedExampleIndex === index && styles.activeExampleTab
                        ]}
                        onPress={() => handleExampleTabPress(index)}
                      >
                        <Text style={styles.exampleTabText}>{index + 1}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  {/* Question section with its word-by-word translation */}
                  <View style={styles.exampleSection}>
                    <View style={styles.sectionLabelContainer}>
                      <Text style={styles.sectionLabel}>Question</Text>
                    </View>
                    <TextInput
                      style={[styles.input, styles.readOnlyInput, styles.centeredText]}
                      value={editedCard.examples[selectedExampleIndex]?.question}
                      editable={false}
                      textAlign="center"
                    />
                    <View style={styles.audioButtonContainer}>
                      <TouchableOpacity 
                        onPress={() => playAudio(editedCard.examples[selectedExampleIndex]?.questionAudio)}
                        style={styles.centeredAudioButton}
                      >
                        <Text style={styles.audioButton}>🔊 Play Audio</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {/* Word-by-word boxes for question */}
                    <View style={styles.wordByWordBoxesContainer}>
                      {wordByWordBoxes.map((box, index) => (
                        <View key={index} style={styles.wordByWordBoxWrapper}>
                          <View style={[
                            styles.wordByWordBox,
                            box.isProtected && styles.protectedWordByWordBox
                          ]}>
                            {box.isProtected && (
                              <View style={styles.targetWordBadge}>
                                <Text style={styles.targetWordText}>TARGET WORD</Text>
                              </View>
                            )}
                            <TextInput
                              style={styles.translationInput}
                              value={box.translation}
                              onChangeText={(value) => updateWordByWordBox(index, 'translation', value)}
                              placeholder="Translation"
                              placeholderTextColor="#888"
                            />
                            <View style={styles.dividerLine} />
                            <TextInput
                              style={box.isProtected ? styles.protectedWordInput : styles.wordInput}
                              value={box.word}
                              onChangeText={(value) => updateWordByWordBox(index, 'word', value)}
                              placeholder="Word"
                              placeholderTextColor="#888"
                              editable={!box.isProtected} // Disable editing for protected words
                            />
                          </View>
                          
                          {/* Button row for each box */}
                          <View style={styles.boxButtonsRow}>
                            <TouchableOpacity 
                              style={styles.boxButton}
                              onPress={() => addWordByWordBox(index)}
                            >
                              <Text style={styles.boxButtonText}>+ Insert</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                              style={[
                                styles.boxButton, 
                                styles.removeBoxButton,
                                box.isProtected && styles.disabledButton
                              ]}
                              onPress={() => removeWordByWordBox(index)}
                              disabled={box.isProtected} // Disable remove button for protected words
                            >
                              <Text style={[
                                styles.boxButtonText,
                                box.isProtected && styles.disabledButtonText
                              ]}>- Remove</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                    
                    {/* Add new question box button */}
                    <TouchableOpacity 
                      style={styles.addBoxButton}
                      onPress={() => addWordByWordBox()}
                    >
                      <Text style={styles.addBoxButtonText}>+ Add Word Box</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Answer section with its word-by-word translation */}
                  <View style={styles.exampleSection}>
                    <View style={styles.sectionLabelContainer}>
                      <Text style={styles.sectionLabel}>Answer</Text>
                    </View>
                    <TextInput
                      style={[styles.input, styles.readOnlyInput, styles.centeredText]}
                      value={editedCard.examples[selectedExampleIndex]?.answer}
                      editable={false}
                      textAlign="center"
                    />
                    <View style={styles.audioButtonContainer}>
                      <TouchableOpacity 
                        onPress={() => playAudio(editedCard.examples[selectedExampleIndex]?.answerAudio)}
                        style={styles.centeredAudioButton}
                      >
                        <Text style={styles.audioButton}>🔊 Play Audio</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {/* Word-by-word boxes for answer */}
                    <View style={styles.wordByWordBoxesContainer}>
                      {answerWordByWordBoxes.map((box, index) => (
                        <View key={index} style={styles.wordByWordBoxWrapper}>
                          <View style={[
                            styles.wordByWordBox,
                            box.isProtected && styles.protectedWordByWordBox
                          ]}>
                            {box.isProtected && (
                              <View style={styles.targetWordBadge}>
                                <Text style={styles.targetWordText}>TARGET WORD</Text>
                              </View>
                            )}
                            <TextInput
                              style={styles.translationInput}
                              value={box.translation}
                              onChangeText={(value) => updateAnswerWordByWordBox(index, 'translation', value)}
                              placeholder="Translation"
                              placeholderTextColor="#888"
                            />
                            <View style={styles.dividerLine} />
                            <TextInput
                              style={box.isProtected ? styles.protectedWordInput : styles.wordInput}
                              value={box.word}
                              onChangeText={(value) => updateAnswerWordByWordBox(index, 'word', value)}
                              placeholder="Word"
                              placeholderTextColor="#888"
                              editable={!box.isProtected} // Disable editing for protected words
                            />
                          </View>
                          
                          {/* Button row for each box */}
                          <View style={styles.boxButtonsRow}>
                            <TouchableOpacity 
                              style={styles.boxButton}
                              onPress={() => addAnswerWordByWordBox(index)}
                            >
                              <Text style={styles.boxButtonText}>+ Insert</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                              style={[
                                styles.boxButton, 
                                styles.removeBoxButton,
                                box.isProtected && styles.disabledButton
                              ]}
                              onPress={() => removeAnswerWordByWordBox(index)}
                              disabled={box.isProtected} // Disable remove button for protected words
                            >
                              <Text style={[
                                styles.boxButtonText,
                                box.isProtected && styles.disabledButtonText
                              ]}>- Remove</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                    
                    {/* Add new answer box button */}
                    <TouchableOpacity 
                      style={styles.addBoxButton}
                      onPress={() => addAnswerWordByWordBox()}
                    >
                      <Text style={styles.addBoxButtonText}>+ Add Word Box</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditModalVisible(false)}>
                      <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveButton} onPress={saveCard}>
                      <Text style={styles.buttonText}>Save Changes</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              }
              keyExtractor={() => "edit-modal"}
            />
          </SafeAreaView>
        </Modal>
        
        {/* Confirmation Modal */}
        <Modal visible={isConfirmModalVisible} transparent animationType="fade">
          <View style={styles.confirmModalOverlay}>
            <View style={styles.confirmModalContent}>
              <Text style={styles.confirmModalTitle}>Confirm Deletion</Text>
              <Text style={styles.confirmModalMessage}>{confirmationMessage}</Text>
              
              {deletionType === 'deck' && (
                <TextInput
                  style={styles.confirmationInput}
                  placeholder="Type Confirm here"
                  placeholderTextColor="#999"
                  value={confirmationText}
                  onChangeText={setConfirmationText}
                />
              )}
              
              <View style={styles.confirmModalButtons}>
                <TouchableOpacity 
                  style={[styles.confirmModalButton, styles.cancelButton]}
                  onPress={() => {
                    setIsConfirmModalVisible(false);
                    setConfirmationText('');
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.confirmModalButton, styles.deleteButton]}
                  onPress={performDeletion}
                >
                  <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  // Layout and Background
  background: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  
  // Header and Navigation
  headerContainer: {
    marginTop: height * 0.03,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  backButtonContainer: {
    padding: 10,
  },
  headerTabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
  },
  backButton: {
    backgroundColor: '#3498db',
    borderRadius: 15,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2980b9',
    alignSelf: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,

  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#2c2c2c'
  },
  selectedTabButton: {
    backgroundColor: '#00ff88',
    borderWidth: 2,
    borderColor: '#00cc66'
  },
  tabText: {
    color: '#fff',
    fontSize: 16
  },
  selectedTabText: {
    color: '#000'
  },
  
  // Deck Selection
  deckSelection: { padding: 10, height: 70 },
  deckButton: {
    padding: 15,
    marginHorizontal: 5,
    backgroundColor: '#2c2c2c',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#404040',
    height: 55,
  },
  selectedDeckButton: { borderColor: '#00ff88' },
  deckButtonText: { color: '#fff', fontSize: 16 },
  
  // Card Grid View
  cardGrid: { 
    padding: 5,
    paddingBottom: 120
  },
  cardContainer: {
    width: CARD_SIZE,
    margin: 5,
    backgroundColor: '#2c2c2c',
    borderRadius: 10,
    padding: 10,
    borderWidth: 2,
    borderColor: '#404040'
  },
  cardImage: { 
    width: '100%', 
    aspectRatio: 1, 
    borderRadius: 8,
    marginVertical: 5 
  },
  textContainer: {
    backgroundColor: '#404040',
    borderRadius: 5,
    padding: 5,
    marginVertical: 2
  },
  foreignText: { color: '#fff', fontSize: 14, textAlign: 'center' },
  translationText: { color: '#ddd', fontSize: 12, textAlign: 'center' },
  levelBadge: {
    backgroundColor: '#00ff88',
    borderRadius: 8,
    padding: 3,
    alignSelf: 'center',
    marginTop: 5
  },
  levelText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  
  // Edit Modal
  modalContainer: { flex: 1, backgroundColor: '#1a1a1a', padding: 20 },
  modalTitle: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitleText: {
    color: '#00ff88',
    fontSize: 24,
    fontWeight: 'bold',
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  rowLabel: {
    color: '#00ff88',
    fontSize: 16,
    width: 120,
    marginRight: 10,
  },
  rowInput: {
    flex: 1,
    backgroundColor: '#2c2c2c',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#404040',
  },
  audioButton: { color: '#00ff88', marginTop: 5 },
  sectionHeader: {
    color: '#00ff88',
    fontSize: 18,
    marginVertical: 10
  },
  exampleSelector: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 },
  exampleTab: {
    padding: 8,
    borderRadius: 5,
    backgroundColor: '#2c2c2c',
    borderWidth: 1,
    borderColor: '#404040'
  },
  activeExampleTab: { borderColor: '#00ff88' },
  exampleTabText: { color: '#fff' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cancelButton: { backgroundColor: '#ff4444', padding: 15, borderRadius: 8, flex: 1, marginRight: 10 },
  saveButton: { backgroundColor: '#00cc66', padding: 15, borderRadius: 8, flex: 1, marginLeft: 10 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  
  // Create Deck Options
  createOptionsContainer: {
    flex: 1, 
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  createTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center'
  },
  createOptionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  createOptionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  emptyText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16
  },
  
  // List View
  listContainer: {
    padding: 10,
    paddingBottom: 120
  },
  listItemContainer: {
    backgroundColor: 'rgba(40, 40, 40, 0.9)',
    borderRadius: 10,
    marginBottom: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#444'
  },
  listItemHeader: {
    marginBottom: 10
  },
  listItemMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    flexWrap: 'wrap'
  },
  listItemFront: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00ff88',
    marginRight: 10
  },
  listItemBack: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 10
  },
  listItemPhonetic: {
    fontSize: 14,
    color: '#ccc',
    fontStyle: 'italic',
    marginRight: 10
  },
  listItemSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00ff88',
    marginTop: 5,
    marginBottom: 10
  },
  examplesContainer: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    padding: 10,
    marginVertical: 10
  },
  listItemExample: {
    marginBottom: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 10,
    borderRadius: 8
  },
  exampleNumber: {
    fontWeight: 'bold', 
    color: '#fff',
    marginBottom: 5
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5
  },
  listItemExampleLabel: {
    color: '#00ff88',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 5,
    width: 20
  },
  listItemExampleText: {
    color: '#eee',
    fontSize: 14,
    flex: 1
  },
  phoneticText: {
    fontStyle: 'italic',
    color: '#bbb'
  },
  listItemAudioButton: {
    color: '#00ff88',
    fontSize: 20,
    marginLeft: 10
  },
  examplesToggleButton: {
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    padding: 8,
    borderRadius: 5,
    alignSelf: 'flex-start',
    marginTop: 5
  },
  examplesToggleText: {
    color: '#00ff88',
    fontSize: 14,
    fontWeight: 'bold'
  },
  cardMetadata: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 5,
    padding: 10
  },
  metadataSection: {
    flex: 1
  },
  metadataLabel: {
    color: '#00ff88',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5
  },
  metadataText: {
    color: '#999',
    fontSize: 12,
    marginBottom: 2
  },
  
  // Toggle and Controls
  toggleViewContainer: {
    position: 'absolute',
    bottom: 70,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 20,
    zIndex: 100
  },
  toggleViewLabel: {
    color: '#fff',
    marginRight: 10
  },
  
  // Main Content Containers
  cardListContainer: {
    flex: 1,
    marginTop: 0,
  },
  browseContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  deckSelectionContainer: {
    height: 70,
  },
  
  // Deletion and Selection
  selectionIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    padding: 2,
    zIndex: 10,
  },
  selectionIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  selectedListItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    padding: 10,
    borderRadius: 5,
    marginLeft: 10
  },
  deleteButtonActive: {
    backgroundColor: '#555',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  confirmDeleteButton: {
    backgroundColor: '#ff4444',
    padding: 10,
    borderRadius: 5,
    marginLeft: 10
  },
  
  // Confirmation Modal
  confirmModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  confirmModalContent: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxWidth: 400
  },
  confirmModalTitle: {
    color: '#00ff88',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  confirmModalMessage: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center'
  },
  confirmModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  confirmModalButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5
  },
  cardSelectionIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    padding: 2,
    zIndex: 10,
  },
  cardSelectionIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  selectedCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  confirmationInput: {
    backgroundColor: '#2c2c2c',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#404040',
    marginBottom: 15
  },
  
  // Advanced Settings styles
  advancedSettingsContainer: {
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#555',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  advancedSettingsToggle: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#333',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555',
  },
  advancedSettingsToggleText: {
    color: '#00ff88',
    fontWeight: 'bold',
    fontSize: 16,
  },
  advancedSettingsContent: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(20, 20, 20, 0.8)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  settingItem: {
    marginBottom: 15,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 5,
  },
  settingInput: {
    backgroundColor: '#2c2c2c',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#404040',
  },
  numberSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  numberButton: {
    backgroundColor: '#444',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#555',
  },
  numberButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  numberValue: {
    color: '#fff',
    fontSize: 18,
    marginHorizontal: 15,
    fontWeight: 'bold',
  },
  
  // Advanced Settings Wrapper
  advancedSettingsWrapper: {

  },
  
  // Word-by-Word Translation styles
  wordByWordContainer: {
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    padding: 10,
  },
  translationHint: {
    color: '#cccccc',
    fontSize: 12,
    marginBottom: 5,
    fontStyle: 'italic',
  },
  previewContainer: {
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    padding: 10,
  },
  previewLabel: {
    color: '#00ff88',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  wordByWordPreview: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    padding: 8,
  },
  wordByWordListDisplay: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 8,
  },
  wordByWordWrapper: {
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    padding: 8,
  },
  wordByWordLabel: {
    color: '#00ff88',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  
  // Add new styles for word boxes
  wordByWordBoxesContainer: {
    marginTop: 10,
    width: '70%',
    alignSelf: 'center',
  },
  wordByWordBoxWrapper: {
    marginBottom: 15,
  },
  wordByWordBox: {
    backgroundColor: '#333',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
    overflow: 'hidden',
  },
  translationInput: {
    color: '#00ff88',
    padding: 10,
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: '#222',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#555',
  },
  wordInput: {
    color: '#fff',
    padding: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  protectedWordInput: {
    color: '#FFD700', // Gold color for protected words
    padding: 10,
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(100, 80, 0, 0.2)', // Slightly gold background
  },
  boxButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  boxButton: {
    backgroundColor: '#444',
    padding: 6,
    borderRadius: 4,
    flex: 1,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  removeBoxButton: {
    backgroundColor: '#662222',
  },
  boxButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  addBoxButton: {
    backgroundColor: '#005522',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  addBoxButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  helpText: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 5,
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  disabledButtonText: {
    color: '#888',
  },
  readOnlyInput: {
    backgroundColor: '#1a1a1a',
    color: '#ccc',
    borderColor: '#333',
  },
  targetWordBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    zIndex: 10,
  },
  targetWordText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  protectedWordByWordBox: {
    borderColor: '#FFD700',
    borderWidth: 2,
    marginTop: 12,
  },
  imagePreviewContainer: {
    marginVertical: 10,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  imageUrlInput: {
    backgroundColor: '#2c2c2c',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#404040'
  },
  exampleSection: {
    marginBottom: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  sectionLabelContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLabel: {
    color: '#00ff88',
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    paddingVertical: 5,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  centeredText: {
    textAlign: 'center',
    fontSize: 16,
  },
  audioButtonContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  centeredAudioButton: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
});
