import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  Switch,
  Image,
  ActivityIndicator,
  Modal
} from 'react-native';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { useRouter, useLocalSearchParams } from 'expo-router';

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
    easeFactor: 2,
  };
};

// Five example pairs per card – each pair consists of question and answer fields.
const defaultExamples = [
  { 
    question: '', questionPhonetic: '', questionAudio: '', questionTranslation: '',
    answer: '', answerPhonetic: '', answerAudio: '', translation: ''
  },
  { 
    question: '', questionPhonetic: '', questionAudio: '', questionTranslation: '',
    answer: '', answerPhonetic: '', answerAudio: '', translation: ''
  },
  { 
    question: '', questionPhonetic: '', questionAudio: '', questionTranslation: '',
    answer: '', answerPhonetic: '', answerAudio: '', translation: ''
  },
  { 
    question: '', questionPhonetic: '', questionAudio: '', questionTranslation: '',
    answer: '', answerPhonetic: '', answerAudio: '', translation: ''
  },
  { 
    question: '', questionPhonetic: '', questionAudio: '', questionTranslation: '',
    answer: '', answerPhonetic: '', answerAudio: '', translation: ''
  }
];

export default function App() {
  const router = useRouter();
  const { cards } = useLocalSearchParams();

  const [globalCheckbox, setGlobalCheckbox] = useState(false);
  const [inputTitle, setInputTitle] = useState('');
  
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

  // Parse passed cards from router params.
  useEffect(() => {
    if (cards) {
      try {
        const parsedCards = JSON.parse(cards);
        const newInputs = parsedCards.map(card => ({
          front: card.front || '',
          back: card.back || '',
          phonetic: card.phonetic || '',
          imageUrl: card.imageUrl || '',
          unsplashImages: card.unsplashImages || [],
          examples: card.examples || defaultExamples,
          frontAudio: card.frontAudio || '',
          lastReviewDate: card.lastReviewDate || new Date().toISOString(),
          nextReviewDate: card.nextReviewDate || new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
          consecutiveCorrectAnswersCount: card.consecutiveCorrectAnswersCount || 0,
          wrongQueue: card.wrongQueue || [false, 0],
          easeFactor: card.easeFactor || 2,
        }));
        setInputs(newInputs);
        setSelectedExamples(newInputs.map(() => 0));
      } catch (err) {
        console.error("Error parsing generated cards:", err);
      }
    }
  }, [cards]);

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

  // Save deck.
  const onSubmit = async () => {
    if (!inputTitle.trim()) return;
    try {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS ${inputTitle} (
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
          frontAudio TEXT
        )
      `);
      for (let card of inputs) {
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
      }
      inputs.forEach(({ front, back, phonetic, imageUrl, examples, unsplashImages, lastReviewDate, nextReviewDate, consecutiveCorrectAnswersCount, wrongQueue, easeFactor, frontAudio }) => {
        if (front?.trim() && back?.trim()) {
          db.runSync(
            `INSERT INTO ${inputTitle} (
              front, back, phonetic, imageUrl, examples, unsplashImages, 
              lastReviewDate, nextReviewDate, consecutiveCorrectAnswersCount, wrongQueue, easeFactor,
              frontAudio
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              front,
              back,
              phonetic,
              imageUrl,
              JSON.stringify(examples),
              JSON.stringify(unsplashImages),
              lastReviewDate,
              nextReviewDate,
              consecutiveCorrectAnswersCount,
              JSON.stringify(wrongQueue),
              easeFactor,
              frontAudio
            ]
          );
        }
      });
      console.log('Deck saved successfully!');
    } catch (e) {
      console.error('Submission error:', e);
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
      const items = db.getAllSync(`SELECT * FROM ${deckName}`);
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Top Section */}
      <View style={{ alignItems: 'center', marginBottom: 30 }}>
        <Text style={{ fontSize: 30 }}>Create New Flash Card</Text>
      </View>
      
      <View style={styles.aiButtonContainer}>
        <TouchableOpacity onPress={() => router.push('/AIPage')} style={styles.aiButton}>
          <Text style={styles.aiButtonText}>Generate With AI</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.customButton, {marginTop: 30}]} onPress={() => router.push('/Review')}>
          <Text style={styles.customButtonText}>Go to Review</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.customButton, {marginTop: 30}]} onPress={() => router.push('/pet/pet')}>
          <Text style={styles.customButtonText}>颜文字</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.globalToggleContainer}>
        <Text style={styles.globalToggleLabel}>Show Phonetic</Text>
        <Switch value={globalCheckbox} onValueChange={setGlobalCheckbox} />
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
              style={styles.input}
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
                  selectedExamples[index] === num && styles.exampleButtonActive
                ]}
                onPress={() => {
                  const newSelected = [...selectedExamples];
                  newSelected[index] = num;
                  setSelectedExamples(newSelected);
                }}
              >
                <Text style={ selectedExamples[index] === num 
                  ? styles.exampleButtonTextActive 
                  : styles.exampleButtonText }>
                  {num + 1}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Example Pair Inputs */}
          {/* Question */}
          <View style={styles.inputRow}>
            <TextInput 
              style={[styles.input, styles.flexInput]}
              placeholder="Example Question"
              value={item.examples[selectedExamples[index]]?.question}
              onChangeText={text => {
                const newInputs = [...inputs];
                newInputs[index].examples[selectedExamples[index]].question = text;
                setInputs(newInputs);
              }}
            />
            <TouchableOpacity 
              onPress={() => playAudio(item.examples[selectedExamples[index]]?.questionAudio)}
              style={styles.audioButtonContainer}
            >
              <Text style={styles.audioButton}>🔊</Text>
            </TouchableOpacity>
          </View>

          {globalCheckbox && (
            <TextInput 
              style={styles.input}
              placeholder="Phonetic for Question"
              value={item.examples[selectedExamples[index]]?.questionPhonetic}
              onChangeText={text => {
                const newInputs = [...inputs];
                newInputs[index].examples[selectedExamples[index]].questionPhonetic = text;
                setInputs(newInputs);
              }}
            />
          )}

          <TextInput 
            style={[styles.input, {marginTop: -10, marginBottom: 30}]}
            placeholder="Question Translation"
            value={item.examples[selectedExamples[index]]?.questionTranslation}
            onChangeText={text => {
              const newInputs = [...inputs];
              newInputs[index].examples[selectedExamples[index]].questionTranslation = text;
              setInputs(newInputs);
            }}
          />
          
          
          {/* Answer */}
          <View style={styles.inputRow}>
            <TextInput 
              style={[styles.input, styles.flexInput]}
              placeholder="Example Answer"
              value={item.examples[selectedExamples[index]]?.answer}
              onChangeText={text => {
                const newInputs = [...inputs];
                newInputs[index].examples[selectedExamples[index]].answer = text;
                setInputs(newInputs);
              }}
            />
            <TouchableOpacity 
              onPress={() => playAudio(item.examples[selectedExamples[index]]?.answerAudio)}
              style={styles.audioButtonContainer}
            >
              <Text style={styles.audioButton}>🔊</Text>
            </TouchableOpacity>
          </View>
          {globalCheckbox && (
            <TextInput 
              style={styles.input}
              placeholder="Phonetic for Answer"
              value={item.examples[selectedExamples[index]]?.answerPhonetic}
              onChangeText={text => {
                const newInputs = [...inputs];
                newInputs[index].examples[selectedExamples[index]].answerPhonetic = text;
                setInputs(newInputs);
              }}
            />
          )}
          <TextInput 
             style={[styles.input, {marginTop: -10}]}
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
      
      {/* Deck Title Input */}
      <View style={styles.topContainer}>
        <Text style={styles.topLabel}>Word Deck Title</Text>
        <TextInput
          style={styles.titleInput}
          placeholder="Enter deck title"
          value={inputTitle}
          onChangeText={setInputTitle}
        />
      </View>
      
      {/* Bottom Global Buttons */}
      <TouchableOpacity style={styles.customButton} onPress={onSubmit}>
        <Text style={styles.customButtonText}>Save Deck</Text>
      </TouchableOpacity>
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
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text>Answer: {ex.answer}</Text>
                  <TouchableOpacity onPress={() => playAudio(ex.answerAudio)}>
                    <Text style={styles.audioButton}> 🔊</Text>
                  </TouchableOpacity>
                </View>
                <Text>A Translation: {ex.translation}</Text>
              </View>
            ));
          })()}
          <Text>Last Review Date: {item.lastReviewDate}</Text>
          <Text>Next Review Date: {item.nextReviewDate}</Text>
          <Text>Consecutive Correct Answers: {item.consecutiveCorrectAnswersCount}</Text>
          <Text>Wrong Queue: {item.wrongQueue}</Text>
          <Text>Ease Factor: {item.easeFactor}</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 50, backgroundColor: '#f5f5f5' },
  topContainer: { marginBottom: 20 },
  topLabel: { fontSize: 18, marginBottom: 6, color: '#333' },
  titleInput: { borderWidth: 1, padding: 12, borderRadius: 8, backgroundColor: '#fff', borderColor: '#ddd' },
  aiButtonContainer: { alignItems: 'center', marginBottom: 20 },
  aiButton: { 
    backgroundColor: '#007AFF', 
    paddingVertical: 14, 
    paddingHorizontal: 24, 
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3
  },
  aiButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  globalToggleContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 20 },
  globalToggleLabel: { fontSize: 16, marginRight: 8, color: '#333' },
  cardContainer: { 
    marginBottom: 20, 
    padding: 20, 
    borderRadius: 10, 
    backgroundColor: '#fff', 
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
  roundDeleteButton: { alignSelf: 'center', width: '30%', borderRadius: 1, backgroundColor: 'red', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  roundDeleteButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  deckContainer: { marginBottom: 20 },
  deckButton: { backgroundColor: '#eee', padding: 12, marginVertical: 6, borderRadius: 8, alignItems: 'center' },
  deckButtonText: { fontSize: 16, color: '#333' },
  savedCard: { borderWidth: 1, padding: 15, marginVertical: 10, borderRadius: 8, backgroundColor: '#fff', borderColor: '#ddd' },
  wipeContainer: { marginVertical: 20, borderTopWidth: 1, borderTopColor: '#ccc', paddingTop: 20 },
  customButton: { backgroundColor: '#007AFF', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 10, marginBottom: 12, alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  customButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  autoImagesContainer: { marginVertical: 10, height: 90 },
  imageWrapper: { position: 'relative', marginRight: 8 },
  thumbnailPreview: { width: 80, height: 80, marginRight: 8, borderRadius: 8 },
  crossButton: { position: 'absolute', top: 4, right: 4, backgroundColor: 'red', borderRadius: 12, paddingHorizontal: 4, paddingVertical: 2, zIndex: 10 },
  crossButtonText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  modalOverlay: { 
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  modalContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 8, width: '90%' },
  searchHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  searchInput: { flex: 1, borderWidth: 1, padding: 10, marginRight: 10, borderRadius: 8, borderColor: '#ddd' },
  searchButton: { backgroundColor: '#007AFF', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6 },
  errorText: { color: 'red', textAlign: 'center', marginVertical: 10 },
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
  selectedText: { color: 'white', fontSize: 12, fontWeight: 'bold' }
});
