import { GOOGLE_TTS_API_KEY } from '@env';
import { Picker } from '@react-native-picker/picker';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    ImageBackground,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { isSpaceFreeLanguage } from './Review';

const db = SQLite.openDatabaseSync('mydb.db');
const UNSPLASH_ACCESS_KEY = 'XLXdkohIyYL6-UZ7IPua_sUcUi2k_BgDtPXkrbh7HJw';
const { width } = Dimensions.get('window');
const IMAGE_SIZE = width / 3 - 10;

const getDefaultTrackingData = () => {
  const now = new Date();
  const sixHoursLater = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  return {
    lastReviewDate: now.toISOString(),
    nextReviewDate: sixHoursLater.toISOString(),
    consecutiveCorrectAnswersCount: 0,
    wrongQueue: [false, 0],
    easeFactor: 1.5,
    exp: 0,
  };
};

// Five example pairs per card – each pair consists of question and answer fields.
const defaultExamples = [
  { 
    question: '', questionPhonetic: '', questionAudio: '', questionTranslation: '', questionWordByWord: '',
    answer: '', answerPhonetic: '', answerAudio: '', translation: '', answerWordByWord: ''
  },
  { 
    question: '', questionPhonetic: '', questionAudio: '', questionTranslation: '', questionWordByWord: '',
    answer: '', answerPhonetic: '', answerAudio: '', translation: '', answerWordByWord: ''
  },
  { 
    question: '', questionPhonetic: '', questionAudio: '', questionTranslation: '', questionWordByWord: '',
    answer: '', answerPhonetic: '', answerAudio: '', translation: '', answerWordByWord: ''
  },
  { 
    question: '', questionPhonetic: '', questionAudio: '', questionTranslation: '', questionWordByWord: '',
    answer: '', answerPhonetic: '', answerAudio: '', translation: '', answerWordByWord: ''
  },
  { 
    question: '', questionPhonetic: '', questionAudio: '', questionTranslation: '', questionWordByWord: '',
    answer: '', answerPhonetic: '', answerAudio: '', translation: '', answerWordByWord: ''
  }
];

// Language to voice mapping - same as AIPage.jsx
const languageVoices = {
  Chinese: { primary: 'cmn-CN-Wavenet-A', secondary: 'cmn-CN-Wavenet-C' },
  German: { primary: 'de-DE-Wavenet-A', secondary: 'de-DE-Wavenet-B' },
  Japanese: { primary: 'ja-JP-Wavenet-A', secondary: 'ja-JP-Wavenet-D' }
};

// Display the word-by-word content in a readable format
const formatWordByWord = (wordByWordString) => {
  if (!wordByWordString) return '';
  
  try {
    const wordByWordObj = JSON.parse(wordByWordString);
    return Object.entries(wordByWordObj)
      .map(([word, translation]) => `${word}=${translation}`)
      .join('|');
  } catch (e) {
    return wordByWordString; // If it's already formatted or there's an error, return as is
  }
};

// Parse a formatted word-by-word string into entries for display
const parseWordByWord = (formattedString) => {
  if (!formattedString) return [];
  
  try {
    return formattedString.split('|').filter(Boolean).map(pair => {
      const parts = pair.split('=');
      if (parts.length === 1) {
        return { word: parts[0], translation: '' };
      }
      return { word: parts[0], translation: parts[1] };
    });
  } catch (e) {
    return [];
  }
};

// Add this function after parseWordByWord to create boxes from word-by-word
const parseWordByWordToBoxes = (wordByWordString) => {
  if (!wordByWordString) return [];
  
  const result = [];
  const pairs = wordByWordString.split('|');
  
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

// Add this function to convert boxes back to the word-by-word string format
const boxesToWordByWordString = (boxes) => {
  return boxes.map(box => `${box.word}=${box.translation}`).join('|');
};

// Add this function to identify protected words
const identifyProtectedWords = (sentence, wordByWordBoxes, targetWord) => {
  if (!sentence) return wordByWordBoxes;
  
  const protectedWords = [];
  
  // Add the target word to protected words if it exists
  if (targetWord && targetWord.trim()) {
    protectedWords.push(targetWord);
  }
  
  // Mark boxes with protected words
  return wordByWordBoxes.map(box => ({
    ...box,
    isProtected: protectedWords.some(word => box.word.includes(word))
  }));
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

// Add function to remove hashtags from text
const removeHashtags = (text) => {
  return text ? text.replace(/#/g, '') : '';
};

// Audio generation function
const getAudioLocal = async (text, isSecondary = false, language = 'Chinese') => {
  if (!text) return null;
  
  const cleanedText = text.replace(/#/g, '');
  
  // Get the appropriate voices for the specified language
  const voices = languageVoices[language] || languageVoices.Chinese; // Default to Chinese if language not found
  
  const voiceName = isSecondary ? voices.secondary : voices.primary;
  const languageCode = voiceName.split('-').slice(0, 2).join('-');
  
  console.log("Generating audio for text:", cleanedText, "with voice:", voiceName, "language:", language);
  try {
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: cleanedText },
          voice: { languageCode: languageCode, name: voiceName },
          audioConfig: { audioEncoding: 'MP3' }
        }),
      }
    );
    const data = await response.json();
    if (data.audioContent) {
      const fileName = `tts_${Date.now()}_${Math.random().toString(36).substring(2,8)}.mp3`;
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, data.audioContent, { encoding: FileSystem.EncodingType.Base64 });
      console.log("Audio generated and stored at:", fileUri);
      return fileUri;
    } else {
      console.error("TTS failed:", data);
      return null;
    }
  } catch (error) {
    console.error("Error in getAudioLocal:", error);
    return null;
  }
};

export default function ManualImport({ initialCards, onDeckSaved, onInputsChange, onBack }) {
  const [globalCheckbox, setGlobalCheckbox] = useState(false);
  const [inputTitle, setInputTitle] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('Chinese');
  const [progressModal, setProgressModal] = useState({
    visible: false,
    progress: 0,
    total: 0,
    completed: false,
    message: 'Preparing to save cards...'
  });
  
  const [inputs, setInputs] = useState([
    { 
      front: '', 
      back: '', 
      phonetic: '',
      imageUrl: '', 
      unsplashImages: [], 
      examples: defaultExamples,
      frontAudio: '',
      ...getDefaultTrackingData()
    },
    { 
      front: '', 
      back: '', 
      phonetic: '',
      imageUrl: '', 
      unsplashImages: [],
      examples: defaultExamples,
      frontAudio: '',
      ...getDefaultTrackingData()
    },
    { 
      front: '', 
      back: '', 
      phonetic: '',
      imageUrl: '', 
      unsplashImages: [],
      examples: defaultExamples,
      frontAudio: '',
      ...getDefaultTrackingData()
    }
  ]);
  
  const [displayToDo, setDisplayToDo] = useState([]);
  const [availableDecks, setAvailableDecks] = useState([]);
  
  // Image search state – now include selectedImages (for multiple selection)
  const [imageSearch, setImageSearch] = useState({
    visible: false,
    currentIndex: null,
    images: [],
    page: 1,
    loading: false,
    error: null,
    selectedImages: [] // For multiple selection
  });
  
  // Modal search term state for the image modal
  const [modalSearchTerm, setModalSearchTerm] = useState('');

  // Track the active example pair index for each card.
  const [selectedExamples, setSelectedExamples] = useState(inputs.map(() => 0));
  useEffect(() => {
    setSelectedExamples(inputs.map(() => 0));
  }, [inputs.length]);

  // Check if we have any non-empty inputs and notify parent
  useEffect(() => {
    const hasContent = inputs.some(item => 
      item.front.trim() !== '' || item.back.trim() !== ''
    );
    
    if (onInputsChange) {
      onInputsChange(hasContent);
    }
  }, [inputs]);

  // Use initialCards from props if available
  useEffect(() => {
    if (initialCards && initialCards.length > 0) {
      // Process the examples to format word-by-word data if needed
      const processedCards = initialCards.map(card => {
        // Process each example's word-by-word data and remove hashtags
        const processedExamples = card.examples.map(example => ({
          ...example,
          question: removeHashtags(example.question || ''),
          answer: removeHashtags(example.answer || ''),
          questionWordByWord: example.questionWordByWord ? formatWordByWord(example.questionWordByWord) : '',
          answerWordByWord: example.answerWordByWord ? formatWordByWord(example.answerWordByWord) : ''
        }));
        
        return {
          ...card,
          examples: processedExamples
        };
      });
      
      setInputs(processedCards);
      setSelectedExamples(processedCards.map(() => 0));
      
      // Initialize word-by-word boxes for the first card's first example
      if (processedCards.length > 0 && processedCards[0].examples && processedCards[0].examples[0]) {
        updateWordByWordBoxesForCard(0, 0);
      }
    }
  }, [initialCards]);

  // Update language based on initialCards (from AIPage)
  useEffect(() => {
    if (initialCards && initialCards.length > 0 && initialCards[0].language) {
      setSelectedLanguage(initialCards[0].language);
    }
  }, [initialCards]);

  // When "Search for Image" is pressed, open the modal and clear previous selections.
  const onOpenImageSearch = (cardIndex) => {
    setImageSearch({
      visible: true,
      currentIndex: cardIndex,
      images: [],
      page: 1,
      loading: false,
      error: null,
      selectedImages: []
    });
    setModalSearchTerm('');
  };

  // Function to fetch images from Unsplash.
  const searchImages = async (searchTerm, page) => {
    try {
      if (!searchTerm?.trim()) {
        setImageSearch(prev => ({
          ...prev, 
          images: [],
          error: 'No search term',
          loading: false
        }));
        return;
      }
      setImageSearch(prev => ({ ...prev, loading: true, error: null }));
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTerm)}&page=${page}&per_page=30`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
      );
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      if (!data?.results) throw new Error('Invalid API response');
      setImageSearch(prev => ({
        ...prev,
        images: page === 1 
          ? data.results.filter(photo => photo?.urls?.small) 
          : [
              ...prev.images,
              ...data.results.filter(photo => photo?.urls?.small)
            ],
        loading: false,
        error: data.results.length === 0 ? 'No images found' : null
      }));
    } catch (error) {
      setImageSearch(prev => ({
        ...prev,
        error: error.message || 'Unknown error',
        loading: false,
        images: []
      }));
    }
  };

  // Toggle image selection instead of immediately closing the modal.
  const toggleImageSelection = (imageUrl) => {
    const { selectedImages } = imageSearch;
    let newSelected = [...selectedImages];
    if (newSelected.includes(imageUrl)) {
      newSelected = newSelected.filter(url => url !== imageUrl);
    } else {
      newSelected.push(imageUrl);
    }
    setImageSearch(prev => ({ ...prev, selectedImages: newSelected }));
  };

  // Confirm selection: assign the selected images to the card.
  const confirmImageSelection = () => {
    const newInputs = [...inputs];
    const cardIndex = imageSearch.currentIndex;
    if (cardIndex != null && newInputs[cardIndex]) {
      newInputs[cardIndex].unsplashImages = imageSearch.selectedImages;
      // Optionally, set the main image to the first selected image.
      newInputs[cardIndex].imageUrl = imageSearch.selectedImages[0] || '';
      setInputs(newInputs);
    }
    setImageSearch(prev => ({ ...prev, visible: false }));
  };

  // Delete a specific image from a card.
  const onDeleteImage = (cardIndex, imgUrl) => {
    const newInputs = [...inputs];
    newInputs[cardIndex].unsplashImages = newInputs[cardIndex].unsplashImages.filter(url => url !== imgUrl);
    if (newInputs[cardIndex].imageUrl === imgUrl) {
      newInputs[cardIndex].imageUrl = '';
    }
    setInputs(newInputs);
  };

  // Play audio helper.
  const playAudio = async (fileUri) => {
    if (!fileUri) {
      console.log("No audio URI to play.");
      return;
    }
    try {
      const sound = new Audio.Sound();
      await sound.loadAsync({ uri: fileUri });
      await sound.playAsync();
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };

  // Save deck with progress updates
  const onSubmit = async () => {
    if (!inputTitle.trim()) {
      Alert.alert('Error', 'Please enter a deck title');
      return;
    }
    
    // Check for at least 2 examples with content
    for (let i = 0; i < inputs.length; i++) {
      if (inputs[i].front?.trim() && inputs[i].back?.trim()) {
        // Only check cards that have front and back filled in
        let validExamples = 0;
        for (const example of inputs[i].examples) {
          if (example.question?.trim() && example.answer?.trim()) {
            validExamples++;
          }
        }
        
        if (validExamples < 2) {
          Alert.alert(
            'More Examples Needed', 
            `Card ${i+1} (${inputs[i].front}) needs at least 2 examples with both question and answer. Currently has ${validExamples}.`,
            [{ text: 'OK' }]
          );
          return;
        }
      }
    }
    
    // Calculate total operations for progress tracking
    const validCards = inputs.filter(card => card.front?.trim() && card.back?.trim());
    const totalOperations = validCards.length * 2; // Database + audio operations
    
    // Show progress modal
    setProgressModal({
      visible: true,
      progress: 0,
      total: totalOperations,
      completed: false,
      message: 'Creating deck...'
    });
    
    try {
      // Sanitize table name to avoid SQL injection and syntax errors
      const safeTableName = inputTitle.replace(/[^a-zA-Z0-9_]/g, '_');
      
      // Check if database is properly initialized
      if (!db) {
        throw new Error('Database not initialized');
      }
      
      // Use try-catch for each database operation
      try {
        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS "${safeTableName}" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            front TEXT,
            back TEXT,
            phonetic TEXT,
            imageUrl TEXT,
            examples TEXT,
            unsplashImages TEXT,
            lastReviewDate TEXT,
            nextReviewDate TEXT,
            consecutiveCorrectAnswersCount INTEGER,
            wrongQueue TEXT,
            easeFactor REAL,
            frontAudio TEXT,
            exp INTEGER,
            language TEXT
          )
        `;
        
        db.execSync(createTableQuery);
        
        setProgressModal(prev => ({
          ...prev,
          progress: prev.progress + 1,
          message: 'Deck created. Processing cards...'
        }));
      } catch (tableError) {
        console.error('Error creating table:', tableError);
        Alert.alert('Database Error', 'Failed to create deck table: ' + tableError.message);
        setProgressModal(prev => ({ ...prev, visible: false }));
        return;
      }
      
      // Process cards: generate audio and download images
      for (let i = 0; i < inputs.length; i++) {
        const card = inputs[i];
        
        // Only process cards with content
        if (!card.front?.trim() || !card.back?.trim()) continue;
        
        setProgressModal(prev => ({
          ...prev,
          message: `Processing card ${i+1}/${inputs.length}: ${card.front}`
        }));
        
        // Generate audio for front word if not already present
        if (!card.frontAudio) {
          try {
            card.frontAudio = await getAudioLocal(card.front, false, selectedLanguage);
          } catch (audioError) {
            console.error("Error generating front audio:", audioError);
          }
        }
        
        // Generate audio for each example
        for (let j = 0; j < card.examples.length; j++) {
          const example = card.examples[j];
          if (example.question?.trim() && !example.questionAudio) {
            try {
              example.questionAudio = await getAudioLocal(example.question, false, selectedLanguage);
            } catch (audioError) {
              console.error(`Error generating question audio for example ${j+1}:`, audioError);
            }
          }
          
          if (example.answer?.trim() && !example.answerAudio) {
            try {
              example.answerAudio = await getAudioLocal(example.answer, true, selectedLanguage);
            } catch (audioError) {
              console.error(`Error generating answer audio for example ${j+1}:`, audioError);
            }
          }
        }
        
        // Download image if it's a URL and not already a local file
        if (card.imageUrl && !card.imageUrl.startsWith(FileSystem.documentDirectory)) {
          const fileName = `unsplash_${Date.now()}_${Math.random().toString(36).substring(2,8)}.jpg`;
          const localPath = FileSystem.documentDirectory + fileName;
          try {
            const downloadRes = await FileSystem.downloadAsync(card.imageUrl, localPath);
            card.imageUrl = downloadRes.uri;
          } catch (downloadError) {
            console.error("Error downloading image:", downloadError);
          }
        }
        
        setProgressModal(prev => ({
          ...prev,
          progress: prev.progress + 1
        }));
      }
      
      setProgressModal(prev => ({
        ...prev,
        message: 'Saving cards to database...'
      }));
      
      let cardsSaved = 0;
      
      for (const card of inputs) {
        const { front, back, phonetic, imageUrl, examples, unsplashImages, 
                lastReviewDate, nextReviewDate, consecutiveCorrectAnswersCount, 
                wrongQueue, easeFactor, frontAudio, exp } = card;
        
        if (front?.trim() && back?.trim()) {
          try {
            // Make sure examples and unsplashImages are valid JSON strings
            const examplesString = JSON.stringify(examples || []);
            const unsplashImagesString = JSON.stringify(unsplashImages || []);
            const wrongQueueString = JSON.stringify(wrongQueue || [false, 0]);
            
            db.runSync(
              `INSERT INTO "${safeTableName}" (
                front, back, phonetic, imageUrl, examples, unsplashImages, 
                lastReviewDate, nextReviewDate, consecutiveCorrectAnswersCount, wrongQueue, easeFactor,
                frontAudio, exp, language
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                front,
                back,
                phonetic || '',
                imageUrl || '',
                examplesString,
                unsplashImagesString,
                lastReviewDate || new Date().toISOString(),
                nextReviewDate || new Date().toISOString(),
                consecutiveCorrectAnswersCount || 0,
                wrongQueueString,
                easeFactor || 1.5,
                frontAudio || '',
                exp || 0,
                selectedLanguage
              ]
            );
            cardsSaved++;
            
            setProgressModal(prev => ({
              ...prev,
              progress: prev.progress + 1
            }));
          } catch (insertError) {
            console.error('Error inserting card:', insertError, 'Card:', front);
            // Continue with other cards even if one fails
          }
        }
      }
      
      // Mark completion
      setProgressModal(prev => ({
        ...prev,
        completed: true,
        message: `Successfully saved ${cardsSaved} cards to deck "${inputTitle}"`
      }));
      
    } catch (e) {
      console.error('Submission error:', e);
      setProgressModal(prev => ({
        ...prev,
        completed: true,
        message: `Error: ${e.message}`
      }));
    }
  };
  
  // Handle "Continue" button press in the progress modal
  const handleContinue = () => {
    setProgressModal(prev => ({ ...prev, visible: false }));
    
    // Only navigate if there was no error
    if (progressModal.completed && progressModal.message.includes("Successfully")) {
      const safeTableName = inputTitle.replace(/[^a-zA-Z0-9_]/g, '_');
      if (onDeckSaved) {
        onDeckSaved(safeTableName);
      }
    }
  };

  const loadAllDecks = () => {
    try {
      const tables = db.getAllSync(`
        SELECT name 
        FROM sqlite_master 
        WHERE type='table'
          AND name NOT LIKE 'sqlite_%'
      `);
      setAvailableDecks(tables);
    } catch (e) {
      console.error('Error loading decks:', e);
    }
  };

  const loadDeck = (deckName) => {
    try {
      const items = db.getAllSync(`SELECT * FROM "${deckName}"`);
      setDisplayToDo(items);
    } catch (e) {
      console.error('Error loading deck:', e);
    }
  };

  const dropAllTables = () => {
    try {
      const tables = db.getAllSync(`
        SELECT name 
        FROM sqlite_master 
        WHERE type='table'
          AND name NOT LIKE 'sqlite_%'
      `);
      tables.forEach((table) => {
        db.execSync(`DROP TABLE IF EXISTS ${table.name}`);
      });
      setDisplayToDo([]);
      setInputTitle('');
      setInputs([
        { front: '', back: '', phonetic: '', imageUrl: '', unsplashImages: [], examples: defaultExamples, frontAudio: '', ...getDefaultTrackingData() },
        { front: '', back: '', phonetic: '', imageUrl: '', unsplashImages: [], examples: defaultExamples, frontAudio: '', ...getDefaultTrackingData() },
        { front: '', back: '', phonetic: '', imageUrl: '', unsplashImages: [], examples: defaultExamples, frontAudio: '', ...getDefaultTrackingData() }
      ]);
      console.log('Database wiped successfully');
    } catch (e) {
      console.error('Error wiping database:', e);
    }
  };

  const onDeleteCard = (cardIndex) => {
    const newInputs = [...inputs];
    newInputs.splice(cardIndex, 1);
    setInputs(newInputs);
  };

  // Add a component to display word-by-word translations
  const WordByWordDisplay = ({ wordByWordString }) => {
    const entries = parseWordByWord(wordByWordString);
    
    if (entries.length === 0) return null;
    
    return (
      <View style={styles.wordByWordContainer}>
        {entries.map((entry, index) => (
          <View key={index} style={styles.wordByWordEntry}>
            <Text style={styles.wordByWordForeign}>{entry.word}</Text>
            <Text style={styles.wordByWordNative}>{entry.translation}</Text>
          </View>
        ))}
      </View>
    );
  };

  // State for word-by-word translation editing
  const [wordByWordBoxes, setWordByWordBoxes] = useState([]);
  const [answerWordByWordBoxes, setAnswerWordByWordBoxes] = useState([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  // Function to update word-by-word boxes when switching cards or examples
  const updateWordByWordBoxesForCard = (cardIndex, exampleIndex) => {
    if (!inputs[cardIndex] || !inputs[cardIndex].examples || !inputs[cardIndex].examples[exampleIndex]) {
      setWordByWordBoxes([]);
      setAnswerWordByWordBoxes([]);
      return;
    }
    
    setActiveCardIndex(cardIndex);
    
    const example = inputs[cardIndex].examples[exampleIndex];
    const targetWord = inputs[cardIndex].front;
    
    // For question word-by-word
    let questionBoxes = parseWordByWordToBoxes(example.questionWordByWord || "");
    questionBoxes = identifyProtectedWords(example.question, questionBoxes, targetWord);
    setWordByWordBoxes(questionBoxes);
    
    // For answer word-by-word
    let answerBoxes = parseWordByWordToBoxes(example.answerWordByWord || "");
    answerBoxes = identifyProtectedWords(example.answer, answerBoxes, targetWord);
    setAnswerWordByWordBoxes(answerBoxes);
  };
  
  // Update word-by-word boxes when example tab changes
  useEffect(() => {
    const cardIndex = activeCardIndex;
    const exampleIndex = selectedExamples[cardIndex];
    if (cardIndex !== undefined && exampleIndex !== undefined) {
      updateWordByWordBoxesForCard(cardIndex, exampleIndex);
    }
  }, [selectedExamples]);
  
  // Update the updateWordByWordBox function to use language-aware spacing
  const updateWordByWordBox = (index, field, value) => {
    const newBoxes = [...wordByWordBoxes];
    
    // Don't allow word changes if the word is protected
    if (field === 'word' && newBoxes[index].isProtected) {
      return;
    }
    
    newBoxes[index] = {
      ...newBoxes[index],
      [field]: value
    };
    setWordByWordBoxes(newBoxes);
    
    // Update the questionWordByWord field in the inputs
    const cardIndex = activeCardIndex;
    const exampleIndex = selectedExamples[cardIndex];
    
    const newInputs = [...inputs];
    newInputs[cardIndex].examples[exampleIndex].questionWordByWord = boxesToWordByWordString(newBoxes);
    
    // If updating a word (not a translation), rebuild and update the question sentence
    if (field === 'word') {
      // Get the current language selection
      const language = selectedLanguage;
      newInputs[cardIndex].examples[exampleIndex].question = rebuildSentenceFromBoxes(newBoxes, language);
    }
    
    setInputs(newInputs);
  };
  
  // Update the updateAnswerWordByWordBox function to use language-aware spacing
  const updateAnswerWordByWordBox = (index, field, value) => {
    const newBoxes = [...answerWordByWordBoxes];
    
    // Don't allow word changes if the word is protected
    if (field === 'word' && newBoxes[index].isProtected) {
      return;
    }
    
    newBoxes[index] = {
      ...newBoxes[index],
      [field]: value
    };
    setAnswerWordByWordBoxes(newBoxes);
    
    // Update the answerWordByWord field in the inputs
    const cardIndex = activeCardIndex;
    const exampleIndex = selectedExamples[cardIndex];
    
    const newInputs = [...inputs];
    newInputs[cardIndex].examples[exampleIndex].answerWordByWord = boxesToWordByWordString(newBoxes);
    
    // If updating a word (not a translation), rebuild and update the answer sentence
    if (field === 'word') {
      // Get the current language selection
      const language = selectedLanguage;
      newInputs[cardIndex].examples[exampleIndex].answer = rebuildSentenceFromBoxes(newBoxes, language);
    }
    
    setInputs(newInputs);
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
    
    // Update the questionWordByWord field in the inputs
    const cardIndex = activeCardIndex;
    const exampleIndex = selectedExamples[cardIndex];
    
    const newInputs = [...inputs];
    newInputs[cardIndex].examples[exampleIndex].questionWordByWord = boxesToWordByWordString(newBoxes);
    setInputs(newInputs);
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
    
    // Update the answerWordByWord field in the inputs
    const cardIndex = activeCardIndex;
    const exampleIndex = selectedExamples[cardIndex];
    
    const newInputs = [...inputs];
    newInputs[cardIndex].examples[exampleIndex].answerWordByWord = boxesToWordByWordString(newBoxes);
    setInputs(newInputs);
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
    
    // Update the questionWordByWord field in the inputs
    const cardIndex = activeCardIndex;
    const exampleIndex = selectedExamples[cardIndex];
    
    const newInputs = [...inputs];
    newInputs[cardIndex].examples[exampleIndex].questionWordByWord = boxesToWordByWordString(newBoxes);
    setInputs(newInputs);
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
    
    // Update the answerWordByWord field in the inputs
    const cardIndex = activeCardIndex;
    const exampleIndex = selectedExamples[cardIndex];
    
    const newInputs = [...inputs];
    newInputs[cardIndex].examples[exampleIndex].answerWordByWord = boxesToWordByWordString(newBoxes);
    setInputs(newInputs);
  };

  return (
    <ImageBackground source={require('../asset/background.png')} style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        {/* Center-aligned back button */}
        <View style={styles.topButtonContainer}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={onBack}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        
        {/* Main header with title */}
        <View style={styles.headerContainer}>
          <Text style={styles.stepTitle}>Manual Import</Text>
        </View>
        
        {/* Sticky Deck Title and Save Button */}
        <View style={styles.stickyHeader}>
          <View style={styles.deckTitleInput}>
            <TextInput
              style={styles.titleInput}
              placeholder="Deck Title"
              placeholderTextColor="white"
              value={inputTitle}
              onChangeText={setInputTitle}
            />
          </View>
          <TouchableOpacity style={styles.saveDeckButton} onPress={onSubmit}>
            <Text style={styles.saveDeckButtonText}>Save Deck</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.globalControlsContainer}>
            <View style={styles.globalToggleContainer}>
              <Text style={[styles.globalToggleLabel, {color: 'white'}]}>Show Phonetic</Text>
              <Switch value={globalCheckbox} onValueChange={setGlobalCheckbox} />
            </View>
            
            <View style={styles.languageDropdownContainer}>
              <Text style={styles.languageDropdownLabel}>Language:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedLanguage}
                  style={styles.languagePicker}
                  onValueChange={(itemValue) => setSelectedLanguage(itemValue)}
                  dropdownIconColor="#fff"
                >
                  {Object.keys(languageVoices).map(lang => (
                    <Picker.Item key={lang} label={lang} value={lang} color="#000" />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
          
          {/* Card Editor */}
          {inputs.map((item, index) => (
            <View key={index} style={styles.cardContainer}>
              <Text style={styles.cardHeader}>Card {index + 1}</Text>
              
              {/* Foreign Word */}
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.flexInput]}
                  placeholder="Foreign Word"
                  value={item.front}
                  onChangeText={text => {
                    const newInputs = [...inputs];
                    newInputs[index].front = text;
                    setInputs(newInputs);
                  }}
                />
                <TouchableOpacity 
                  onPress={() => playAudio(item.frontAudio)}
                  style={styles.audioButtonContainer}
                >
                  <Text style={styles.audioButton}>🔊</Text>
                </TouchableOpacity>
              </View>
              {globalCheckbox && (
                <TextInput
                  style={[styles.input]}
                  placeholder="Phonetic"
                  value={item.phonetic}
                  onChangeText={text => {
                    const newInputs = [...inputs];
                    newInputs[index].phonetic = text;
                    setInputs(newInputs);
                  }}
                />
              )}
              <TextInput
                style={styles.input}
                placeholder="Native Meaning"
                value={item.back}
                onChangeText={text => {
                  const newInputs = [...inputs];
                  newInputs[index].back = text;
                  setInputs(newInputs);
                }}
              />
              
              {/* Search for Image */}
              <TouchableOpacity
                style={styles.imageButton}
                onPress={() => onOpenImageSearch(index)}
              >
                <Text>📷 Search for Image</Text>
              </TouchableOpacity>
              
              {/* Thumbnails */}
              {item.unsplashImages && item.unsplashImages.length > 0 && (
                <ScrollView horizontal style={styles.autoImagesContainer}>
                  {item.unsplashImages.map((imgUrl, i) => (
                    <View key={i} style={styles.imageWrapper}>
                      <TouchableOpacity
                        onPress={() => {
                          const newInputs = [...inputs];
                          newInputs[index].imageUrl = imgUrl;
                          setInputs(newInputs);
                        }}
                      >
                        <Image
                          source={{ uri: imgUrl }}
                          style={styles.thumbnailPreview}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.crossButton}
                        onPress={() => onDeleteImage(index, imgUrl)}
                      >
                        <Text style={styles.crossButtonText}>X</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
              
              {/* Example Sentence Section */}
              <Text style={styles.sectionHeader}>Example Sentence</Text>
              <View style={styles.exampleSelector}>
                {[0, 1, 2, 3, 4].map(num => (
                  <TouchableOpacity 
                    key={num} 
                    style={[
                      styles.exampleButton, 
                      selectedExamples[index] === num && styles.exampleButtonActive,
                      num < 2 ? styles.requiredExampleButton : {}
                    ]}
                    onPress={() => {
                      const newSelected = [...selectedExamples];
                      newSelected[index] = num;
                      setSelectedExamples(newSelected);
                      // Update active card index when switching examples
                      setActiveCardIndex(index);
                    }}
                  >
                    <Text style={[
                      selectedExamples[index] === num 
                        ? styles.exampleButtonTextActive 
                        : styles.exampleButtonText,
                      num < 2 ? styles.requiredExampleButtonText : {}
                    ]}>
                      {num + 1}{num < 2 ? '*' : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.exampleRequiredNote}>* Required examples</Text>
              
              {/* Example Pair Inputs */}
              {/* Question Section */}
              <View style={styles.exampleSection}>
                <View style={styles.sectionLabelContainer}>
                  <Text style={styles.sectionLabel}>Question</Text>
                </View>
                <TextInput 
                  style={[styles.input, styles.readOnlyInput, styles.centeredText]}
                  placeholder="Example Question"
                  value={item.examples[selectedExamples[index]]?.question}
                  editable={false}
                  textAlign="center"
                />
                <View style={styles.audioButtonContainer}>
                  <TouchableOpacity 
                    onPress={() => playAudio(item.examples[selectedExamples[index]]?.questionAudio)}
                    style={styles.centeredAudioButton}
                  >
                    <Text style={styles.audioButton}>🔊 Play Audio</Text>
                  </TouchableOpacity>
                </View>
              
                {/* Word-by-word boxes for question */}
                {index === activeCardIndex && (
                  <View style={styles.wordByWordBoxesContainer}>
                    {wordByWordBoxes.map((box, boxIndex) => (
                      <View key={boxIndex} style={styles.wordByWordBoxWrapper}>
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
                            onChangeText={(value) => updateWordByWordBox(boxIndex, 'translation', value)}
                            placeholder="Translation"
                            placeholderTextColor="#888"
                          />
                          <View style={styles.dividerLine} />
                          <TextInput
                            style={box.isProtected ? styles.protectedWordInput : styles.wordInput}
                            value={box.word}
                            onChangeText={(value) => updateWordByWordBox(boxIndex, 'word', value)}
                            placeholder="Word"
                            placeholderTextColor="#888"
                            editable={!box.isProtected} // Disable editing for protected words
                          />
                        </View>
                        
                        {/* Button row for each box */}
                        <View style={styles.boxButtonsRow}>
                          <TouchableOpacity 
                            style={styles.boxButton}
                            onPress={() => addWordByWordBox(boxIndex)}
                          >
                            <Text style={styles.boxButtonText}>+ Insert</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={[
                              styles.boxButton, 
                              styles.removeBoxButton,
                              box.isProtected && styles.disabledButton
                            ]}
                            onPress={() => removeWordByWordBox(boxIndex)}
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
                )}
                
                {/* Add new question box button */}
                {index === activeCardIndex && (
                  <TouchableOpacity 
                    style={styles.addBoxButton}
                    onPress={() => addWordByWordBox()}
                  >
                    <Text style={styles.addBoxButtonText}>+ Add Word Box</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TextInput 
                style={[styles.input, {marginBottom: 30}]}
                placeholder="Question Translation"
                value={item.examples[selectedExamples[index]]?.questionTranslation}
                onChangeText={text => {
                  const newInputs = [...inputs];
                  newInputs[index].examples[selectedExamples[index]].questionTranslation = text;
                  setInputs(newInputs);
                }}
              />
              
              {/* Answer Section */}
              <View style={styles.exampleSection}>
                <View style={styles.sectionLabelContainer}>
                  <Text style={styles.sectionLabel}>Answer</Text>
                </View>
                <TextInput 
                  style={[styles.input, styles.readOnlyInput, styles.centeredText]}
                  placeholder="Example Answer"
                  value={item.examples[selectedExamples[index]]?.answer}
                  editable={false}
                  textAlign="center"
                />
                <View style={styles.audioButtonContainer}>
                  <TouchableOpacity 
                    onPress={() => playAudio(item.examples[selectedExamples[index]]?.answerAudio)}
                    style={styles.centeredAudioButton}
                  >
                    <Text style={styles.audioButton}>🔊 Play Audio</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Word-by-word boxes for answer */}
                {index === activeCardIndex && (
                  <View style={styles.wordByWordBoxesContainer}>
                    {answerWordByWordBoxes.map((box, boxIndex) => (
                      <View key={boxIndex} style={styles.wordByWordBoxWrapper}>
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
                            onChangeText={(value) => updateAnswerWordByWordBox(boxIndex, 'translation', value)}
                            placeholder="Translation"
                            placeholderTextColor="#888"
                          />
                          <View style={styles.dividerLine} />
                          <TextInput
                            style={box.isProtected ? styles.protectedWordInput : styles.wordInput}
                            value={box.word}
                            onChangeText={(value) => updateAnswerWordByWordBox(boxIndex, 'word', value)}
                            placeholder="Word"
                            placeholderTextColor="#888"
                            editable={!box.isProtected} // Disable editing for protected words
                          />
                        </View>
                        
                        {/* Button row for each box */}
                        <View style={styles.boxButtonsRow}>
                          <TouchableOpacity 
                            style={styles.boxButton}
                            onPress={() => addAnswerWordByWordBox(boxIndex)}
                          >
                            <Text style={styles.boxButtonText}>+ Insert</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={[
                              styles.boxButton, 
                              styles.removeBoxButton,
                              box.isProtected && styles.disabledButton
                            ]}
                            onPress={() => removeAnswerWordByWordBox(boxIndex)}
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
                )}
                
                {/* Add new answer box button */}
                {index === activeCardIndex && (
                  <TouchableOpacity 
                    style={styles.addBoxButton}
                    onPress={() => addAnswerWordByWordBox()}
                  >
                    <Text style={styles.addBoxButtonText}>+ Add Word Box</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TextInput 
                style={[styles.input, {marginTop: 10}]}
                placeholder="Answer Translation"
                value={item.examples[selectedExamples[index]]?.translation}
                onChangeText={text => {
                  const newInputs = [...inputs];
                  newInputs[index].examples[selectedExamples[index]].translation = text;
                  setInputs(newInputs);
                }}
              />
              
              {/* Delete Card Button (Round Red Button) */}
              <TouchableOpacity style={styles.roundDeleteButton} onPress={() => onDeleteCard(index)}>
                <Text style={styles.roundDeleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))}
          
          {/* Add Card Button (Circular) */}
          <View style={styles.addCardContainer}>
            <TouchableOpacity style={styles.addCardButton} onPress={() => 
              setInputs([...inputs, { 
                front: '', 
                back: '', 
                phonetic: '',
                imageUrl: '',
                unsplashImages: [],
                examples: defaultExamples,
                frontAudio: '',
                ...getDefaultTrackingData()
              }])
            }>
              <Text style={styles.addCardText}>+</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.customButton} onPress={loadAllDecks}>
            <Text style={styles.customButtonText}>Load All Decks</Text>
          </TouchableOpacity>
          
          {availableDecks.length > 0 && (
            <View style={styles.deckContainer}>
              <Text style={styles.sectionHeader}>Available Decks</Text>
              {availableDecks.map((deck, idx) => (
                <TouchableOpacity key={idx} style={styles.deckButton} onPress={() => loadDeck(deck.name)}>
                  <Text style={styles.deckButtonText}>{deck.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {displayToDo.length > 0 ? displayToDo.map(item => (
            <View key={item.id} style={styles.savedCard}>
              <Text>Front: {item.front}</Text>
              <TouchableOpacity onPress={() => playAudio(item.frontAudio)}>
                <Text style={styles.audioButton}>🔊</Text>
              </TouchableOpacity>
              <Text>Back: {item.back}</Text>
              <Text>Phonetic: {item.phonetic}</Text>
              <Text>Image URL: {item.imageUrl}</Text>
              <Text>Examples:</Text>
              {(() => {
                let examples = [];
                try {
                  examples = JSON.parse(item.examples);
                } catch (error) {
                  console.error("Error parsing examples for card", item.front, error);
                  examples = item.examples;
                }
                return examples.map((ex, idx) => (
                  <View key={idx} style={styles.exampleRow}>
                    <Text style={{ fontWeight: 'bold' }}>Example {idx+1}:</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text>Question: {ex.question}</Text>
                      <TouchableOpacity onPress={() => playAudio(ex.questionAudio)}>
                        <Text style={styles.audioButton}> 🔊</Text>
                      </TouchableOpacity>
                    </View>
                    <Text>Q Translation: {ex.questionTranslation}</Text>
                    <Text>Q Word-by-word: {ex.questionWordByWord}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text>Answer: {ex.answer}</Text>
                      <TouchableOpacity onPress={() => playAudio(ex.answerAudio)}>
                        <Text style={styles.audioButton}> 🔊</Text>
                      </TouchableOpacity>
                    </View>
                    <Text>A Translation: {ex.translation}</Text>
                    <Text>A Word-by-word: {ex.answerWordByWord}</Text>
                  </View>
                ));
              })()}
              <Text>Last Review Date: {item.lastReviewDate}</Text>
              <Text>Next Review Date: {item.nextReviewDate}</Text>
              <Text>Consecutive Correct Answers: {item.consecutiveCorrectAnswersCount}</Text>
              <Text>Wrong Queue: {item.wrongQueue}</Text>
              <Text>Ease Factor: {item.easeFactor}</Text>
              <Text>Experience Points: {item.exp || 0}</Text>
              <TouchableOpacity style={styles.deckButton} onPress={() => onDeleteCard(item.id)}>
                <Text style={styles.deckButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))
          : <Text style={{textAlign: 'center'}}>No cards to display.</Text>}
          
          <View style={styles.wipeContainer}>
            <TouchableOpacity style={styles.customButton} onPress={dropAllTables}>
              <Text style={styles.customButtonText}>Wipe Entire Database (Testing Only)</Text>
            </TouchableOpacity>
          </View>
          
          {/* --- Modal for Image Search (using RN Modal) --- */}
          <Modal visible={imageSearch.visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.sectionHeader}>Search Images</Text>
                {/* Search Field Row */}
                <View style={styles.searchHeader}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Enter search term"
                    value={modalSearchTerm}
                    onChangeText={setModalSearchTerm}
                  />
                  <TouchableOpacity
                    style={styles.searchButton}
                    onPress={() => {
                      // Allow search even if term is empty but then show error.
                      if (!modalSearchTerm.trim()) {
                        setImageSearch(prev => ({
                          ...prev,
                          error: 'No search term',
                          images: [],
                          loading: false
                        }));
                        return;
                      }
                      setImageSearch(prev => ({ ...prev, error: null, loading: true, images: [] }));
                      searchImages(modalSearchTerm, 1);
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Search</Text>
                  </TouchableOpacity>
                </View>
                {/* If no search term is entered, show a helpful message */}
                {!modalSearchTerm.trim() && (
                  <Text style={styles.errorText}>Please enter a search term above.</Text>
                )}
                {imageSearch.loading && <ActivityIndicator size="large" style={{ marginVertical: 10 }} />}
                {imageSearch.error && <Text style={styles.errorText}>{imageSearch.error}</Text>}
                <ScrollView contentContainerStyle={styles.imageGrid}>
                  {imageSearch.images.map((img, i) => {
                    const url = img.urls.small;
                    const isSelected = imageSearch.selectedImages.includes(url);
                    return (
                      <TouchableOpacity key={i} onPress={() => toggleImageSelection(url)}>
                        <View>
                          <Image source={{ uri: url }} style={styles.imageItem} />
                          {isSelected && (
                            <View style={styles.selectedOverlay}>
                              <Text style={styles.selectedText}>✓</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity 
                  style={[styles.customButton, { alignSelf: 'center' }]}
                  onPress={confirmImageSelection}
                >
                  <Text style={styles.customButtonText}>Confirm</Text>
                </TouchableOpacity>
                <Text style={styles.poweredByText}>Powered by Unsplash</Text>
              </View>
            </View>
          </Modal>
          
          {/* Progress Modal */}
          <Modal
            visible={progressModal.visible}
            transparent
            animationType="fade"
            onRequestClose={() => {}}
          >
            <View style={styles.progressModalOverlay}>
              <View style={styles.progressModalContainer}>
                <Text style={styles.progressModalTitle}>
                  {progressModal.completed ? 'Complete!' : 'Saving Deck'}
                </Text>
                
                <Text style={styles.progressModalMessage}>{progressModal.message}</Text>
                
                {!progressModal.completed && (
                  <>
                    <ActivityIndicator size="large" color="#00ff88" style={styles.progressSpinner} />
                    <View style={styles.progressBarContainer}>
                      <View 
                        style={[
                          styles.progressBar, 
                          { width: `${(progressModal.progress / progressModal.total) * 100}%` }
                        ]} 
                      />
                    </View>
                  </>
                )}
                
                {progressModal.completed && (
                  <TouchableOpacity 
                    style={styles.continueButton}
                    onPress={handleContinue}
                  >
                    <Text style={styles.continueButtonText}>Continue</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Modal>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  container: { padding: 20, paddingTop: 20, backgroundColor: 'transparent' },
  stepIndicator: { 
    fontSize: 16, 
    color: '#fff', 
    textAlign: 'center', 
    marginBottom: 8 
  },
  stepTitle: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#00ff88', 
    textAlign: 'center', 
    marginBottom: 16 
  },
  stickyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 1000,
  },
  deckTitleInput: {
    flex: 1,
    marginRight: 10,
  },
  titleInput: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2c2c2c',
    borderColor: '#404040',
    color: '#fff',
    height: 45,
  },
  saveDeckButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    justifyContent: 'center',
  },
  saveDeckButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  globalControlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
    padding: 10,
  },
  globalToggleContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
  },
  languageDropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageDropdownLabel: {
    fontSize: 16,
    marginRight: 8,
    color: '#fff',
  },
  pickerContainer: {
    backgroundColor: 'rgba(60, 60, 60, 0.8)',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#555',
    width: 150,
    justifyContent: 'center',
  },
  languagePicker: {
    height: 50,
    width: 150,
    color: Platform.OS === 'ios' ? '#000' : '#fff',
    backgroundColor: Platform.OS === 'ios' ? '#fff' : 'transparent',
  },
  cardContainer: { 
    marginBottom: 20, 
    padding: 20, 
    borderRadius: 10, 
    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3
  },
  cardHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#007AFF' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  flexInput: { flex: 1 },
  input: { borderWidth: 1, padding: 10, borderRadius: 8, backgroundColor: '#fff', borderColor: '#ddd', marginBottom: 10 },
  imageButton: { backgroundColor: '#eef', padding: 12, borderRadius: 8, alignItems: 'center', marginVertical: 12, borderColor: '#ccd' },
  sectionHeader: { fontSize: 18, marginBottom: 8, fontWeight: 'bold', color: '#333' },
  exampleSelector: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  exampleButton: { paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderRadius: 6, minWidth: 40, alignItems: 'center', marginHorizontal: 2, borderColor: '#007AFF' },
  exampleButtonActive: { backgroundColor: '#007AFF' },
  exampleButtonText: { color: '#007AFF', fontWeight: 'bold' },
  exampleButtonTextActive: { color: '#fff', fontWeight: 'bold' },
  exampleRow: { marginBottom: 10 },
  audioButtonContainer: { marginLeft: 10 },
  audioButton: { color: 'blue', fontSize: 22 },
  addCardContainer: { alignItems: 'center', marginBottom: 20 },
  addCardButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', shadowColor: "#000", shadowOpacity: 0.25, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  addCardText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  roundDeleteButton: { alignSelf: 'center', width: '30%', borderRadius: 20, backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center', marginTop: 10, padding: 8 },
  roundDeleteButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  deckContainer: { marginBottom: 20 },
  deckButton: { backgroundColor: '#2c2c2c', padding: 12, marginVertical: 6, borderRadius: 8, alignItems: 'center' },
  deckButtonText: { fontSize: 16, color: '#fff' },
  savedCard: { borderWidth: 1, padding: 15, marginVertical: 10, borderRadius: 8, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderColor: '#404040' },
  wipeContainer: { marginVertical: 20, borderTopWidth: 1, borderTopColor: '#404040', paddingTop: 20 },
  customButton: { backgroundColor: '#007AFF', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 10, marginBottom: 12, alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  customButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  autoImagesContainer: { marginVertical: 10, height: 90 },
  imageWrapper: { position: 'relative', marginRight: 8 },
  thumbnailPreview: { width: 80, height: 80, marginRight: 8, borderRadius: 8 },
  crossButton: { position: 'absolute', top: 4, right: 4, backgroundColor: 'red', borderRadius: 12, paddingHorizontal: 4, paddingVertical: 2, zIndex: 10 },
  crossButtonText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  modalOverlay: { 
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)', 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  modalContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 8, width: '90%' },
  searchHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  searchInput: { flex: 1, borderWidth: 1, padding: 10, marginRight: 10, borderRadius: 8, borderColor: '#ddd' },
  searchButton: { backgroundColor: '#007AFF', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6 },
  errorText: { color: '#FF3B30', textAlign: 'center', marginVertical: 10 },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', marginTop: 10 },
  imageItem: { width: IMAGE_SIZE, height: IMAGE_SIZE, margin: 4, backgroundColor: '#f0f0f0', borderRadius: 8, overflow: 'hidden' },
  poweredByText: { marginTop: 10, textAlign: 'center', fontSize: 12, color: '#666' },
  // Overlay for selected images in the modal
  selectedOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 2
  },
  selectedText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  requiredExampleButton: { borderColor: '#FF3B30', borderWidth: 2 },
  requiredExampleButtonText: { fontWeight: 'bold' },
  exampleRequiredNote: { fontSize: 12, color: '#888', marginBottom: 10, textAlign: 'center' },
  wordByWordContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  wordByWordEntry: {
    marginRight: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  wordByWordForeign: {
    fontWeight: 'bold',
    color: '#007AFF',
    fontSize: 14,
  },
  wordByWordNative: {
    color: '#666',
    fontSize: 12,
  },
  progressModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressModalContainer: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  progressModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00ff88',
    marginBottom: 15,
  },
  progressModalMessage: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  progressSpinner: {
    marginBottom: 20,
  },
  progressBarContainer: {
    width: '100%',
    height: 10,
    backgroundColor: '#333',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00ff88',
  },
  continueButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 20,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginTop: 60,
    marginBottom: 5,
    width: '100%',
  },
  topButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 10,
    width: '100%',
    zIndex: 10,
  },
  backButton: {
    backgroundColor: '#3498db',
    borderRadius: 15,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2980b9',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  globalToggleLabel: {
    fontSize: 16,
    marginRight: 8,
    color: '#fff',
  },
  // Add these new styles for word-by-word editing
  readOnlyInput: {
    backgroundColor: '#1a1a1a',
    color: '#ccc',
    borderColor: '#333',
  },
  centeredText: {
    textAlign: 'center',
    fontSize: 16,
  },
  centeredAudioButton: {
    backgroundColor: 'rgba(0, 120, 255, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
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
  protectedWordByWordBox: {
    borderColor: '#FFD700',
    borderWidth: 2,
    marginTop: 12,
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
  exampleSection: {
    marginBottom: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  sectionLabelContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLabel: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    paddingVertical: 5,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  disabledButton: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  disabledButtonText: {
    color: '#888',
  },
});
