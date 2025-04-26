// Decks.jsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  FlatList,
  StyleSheet,
  Alert,
  Dimensions,
  Modal,
  ImageBackground,
  SafeAreaView,
  TextInput,
  Switch
} from 'react-native';
import * as SQLite from 'expo-sqlite';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import AIPage from './AIPage'; // Import the AI page component
import ManualImport from './manualImport'; // Import the ManualImport component
import BottomTabBar from '../components/BottomTabBar'; // Import the bottom tab bar

const db = SQLite.openDatabaseSync('mydb.db');
const { width, height } = Dimensions.get('window');
const CARD_SIZE = (width - 40) / 4;
const defaultExamples = Array(5).fill({
  question: '', questionPhonetic: '', questionAudio: '', questionTranslation: '',
  answer: '', answerPhonetic: '', answerAudio: '', translation: ''
});

export default function DecksScreen() {
  const [selectedTab, setSelectedTab] = useState('browse'); // "browse" is default
  const [createDeckOption, setCreateDeckOption] = useState(null); // null, 'ai', or 'manual'
  const [generatedCards, setGeneratedCards] = useState([]);
  const [availableDecks, setAvailableDecks] = useState([]);
  const [selectedDeckName, setSelectedDeckName] = useState(null);
  const [cards, setCards] = useState([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editedCard, setEditedCard] = useState({ 
    examples: defaultExamples,
    unsplashImages: [] 
  });
  const [selectedExampleIndex, setSelectedExampleIndex] = useState(0);
  const [isListView, setIsListView] = useState(false); // Toggle between card view and list view
  const [expandedCards, setExpandedCards] = useState({}); // Track which cards have examples shown
  const [hasExistingInputs, setHasExistingInputs] = useState(false);
  
  // Deletion mode state variables
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedCardsForDeletion, setSelectedCardsForDeletion] = useState({});
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [deletionType, setDeletionType] = useState(null); // 'cards' or 'deck'

  // Add this state for confirmation text input
  const [confirmationText, setConfirmationText] = useState('');

  // Load all decks when component mounts
  useEffect(() => {
    loadAllDecks();
  }, []);

  // When decks are loaded, select the first one by default
  useEffect(() => {
    if (availableDecks.length > 0 && !selectedDeckName && selectedTab === 'browse') {
      setSelectedDeckName(availableDecks[0]);
      loadDeckCards(availableDecks[0]);
    }
  }, [availableDecks, selectedTab]);

  // Filter out SQLite internal tables like "sqlite_sequence"
  const loadAllDecks = () => {
    try {
      const tables = db.getAllSync("SELECT name FROM sqlite_master WHERE type='table'");
      const filtered = tables.filter(t => t.name !== 'sqlite_sequence');
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
        unsplashImages: card.unsplashImages ? JSON.parse(card.unsplashImages) : []
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
    setSelectedTab('browse');
    setCreateDeckOption(null);
    
    // Set the selected deck to the newly created one
    setSelectedDeckName(deckName);
    
    // Load the cards from the new deck
    loadDeckCards(deckName);
  };

  const handleCardPress = (card) => {
    setEditedCard(card);
    setIsEditModalVisible(true);
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
          front=?, back=?, phonetic=?, imageUrl=?, examples=?, unsplashImages=?
         WHERE id=?`,
        [
          editedCard.front,
          editedCard.back,
          editedCard.phonetic,
          editedCard.imageUrl,
          JSON.stringify(editedCard.examples),
          JSON.stringify(editedCard.unsplashImages),
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
                const examples = item.examples;
                return examples.filter(ex => ex.question || ex.answer).map((ex, idx) => (
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
    <View style={styles.headerTabsContainer}>
      <TouchableOpacity
        style={[styles.tabButton, selectedTab === 'browse' && styles.selectedTabButton]}
        onPress={() => {
          setSelectedTab('browse');
          setCreateDeckOption(null);
        }}
      >
        <Text style={[styles.tabText, selectedTab === 'browse' && styles.selectedTabText]}>
          Browse Deck
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabButton, selectedTab === 'create' && styles.selectedTabButton]}
        onPress={() => {
          setSelectedTab('create');
          setCreateDeckOption(null);
        }}
      >
        <Text style={[styles.tabText, selectedTab === 'create' && styles.selectedTabText]}>
          Create Deck
        </Text>
      </TouchableOpacity>
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

  return (
    <ImageBackground source={require('../asset/background.png')} style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        {/* Sticky Top Tabs */}
        {renderHeaderTabs()}
        
        {/* Content based on selected tab and option */}
        {selectedTab === 'browse' && renderBrowseContent()}
        
        {selectedTab === 'create' && !createDeckOption && renderCreateDeckOptions()}
        {selectedTab === 'create' && createDeckOption === 'ai' && 
          <AIPage 
            onGeneratedCards={handleGeneratedCards} 
            hasExistingInputs={hasExistingInputs}
          />
        }
        {selectedTab === 'create' && createDeckOption === 'manual' && 
          <ManualImport 
            initialCards={generatedCards} 
            onDeckSaved={handleDeckSaved}
            onInputsChange={handleInputsChange}
          />
        }

        {/* Edit Modal */}
        <Modal visible={isEditModalVisible} animationType="slide">
          <SafeAreaView style={styles.modalContainer}>
            <FlatList
              data={[]}
              ListHeaderComponent={
                <View>
                  <Text style={styles.modalTitle}>Edit Card</Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Foreign Word</Text>
                    <TextInput
                      style={styles.input}
                      value={editedCard.front}
                      onChangeText={text => setEditedCard({...editedCard, front: text})}
                    />
                    <TouchableOpacity onPress={() => playAudio(editedCard.frontAudio)}>
                      <Text style={styles.audioButton}>🔊 Play Audio</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Phonetic</Text>
                    <TextInput
                      style={styles.input}
                      value={editedCard.phonetic}
                      onChangeText={text => setEditedCard({...editedCard, phonetic: text})}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Translation</Text>
                    <TextInput
                      style={styles.input}
                      value={editedCard.back}
                      onChangeText={text => setEditedCard({...editedCard, back: text})}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Image URL</Text>
                    <TextInput
                      style={styles.input}
                      value={editedCard.imageUrl}
                      onChangeText={text => setEditedCard({...editedCard, imageUrl: text})}
                    />
                  </View>
                  <Text style={styles.sectionHeader}>Example Sentences</Text>
                  <View style={styles.exampleSelector}>
                    {[0, 1, 2, 3, 4].map(index => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.exampleTab, 
                          selectedExampleIndex === index && styles.activeExampleTab
                        ]}
                        onPress={() => setSelectedExampleIndex(index)}
                      >
                        <Text style={styles.exampleTabText}>{index + 1}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Question</Text>
                    <TextInput
                      style={styles.input}
                      value={editedCard.examples[selectedExampleIndex]?.question}
                      onChangeText={text => {
                        const newExamples = [...editedCard.examples];
                        newExamples[selectedExampleIndex].question = text;
                        setEditedCard({...editedCard, examples: newExamples});
                      }}
                    />
                    <TouchableOpacity onPress={() => playAudio(editedCard.examples[selectedExampleIndex]?.questionAudio)}>
                      <Text style={styles.audioButton}>🔊 Play Audio</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Answer</Text>
                    <TextInput
                      style={styles.input}
                      value={editedCard.examples[selectedExampleIndex]?.answer}
                      onChangeText={text => {
                        const newExamples = [...editedCard.examples];
                        newExamples[selectedExampleIndex].answer = text;
                        setEditedCard({...editedCard, examples: newExamples});
                      }}
                    />
                    <TouchableOpacity onPress={() => playAudio(editedCard.examples[selectedExampleIndex]?.answerAudio)}>
                      <Text style={styles.audioButton}>🔊 Play Audio</Text>
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
        
        {/* Bottom Tab Bar */}
        <BottomTabBar />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  headerTabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: height * 0.03,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.8)'
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
  deckSelection: { padding: 10, height: 70 },
  deckButton: {
    padding: 15,
    marginHorizontal: 5,
    backgroundColor: '#2c2c2c',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#404040'
  },
  selectedDeckButton: { borderColor: '#00ff88' },
  deckButtonText: { color: '#fff', fontSize: 16 },
  cardGrid: { 
    padding: 5,
    paddingBottom: 120 // Increase padding for the toggle buttons and tab bar
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
  modalContainer: { flex: 1, backgroundColor: '#1a1a1a', padding: 20 },
  modalTitle: {
    color: '#00ff88',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  inputGroup: { marginBottom: 15 },
  label: { color: '#00ff88', fontSize: 16, marginBottom: 5 },
  input: {
    backgroundColor: '#2c2c2c',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#404040'
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
    fontWeight: 'bold'
  },
  emptyText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16
  },
  // List view styles
  listContainer: {
    padding: 10,
    paddingBottom: 120 // Increase padding for the toggle buttons and tab bar
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
  translationText: {
    color: '#aaa',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 5,
    marginLeft: 25
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
  phoneticText: {
    fontStyle: 'italic',
    color: '#bbb'
  },
  toggleViewContainer: {
    position: 'absolute',
    bottom: 70, // Increase from 20 to 70 to account for the tab bar
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
});
