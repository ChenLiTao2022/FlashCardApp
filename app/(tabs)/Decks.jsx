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
  TextInput
} from 'react-native';
import * as SQLite from 'expo-sqlite';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import AIPage from './AIPage'; // Import the AI page component

const db = SQLite.openDatabaseSync('mydb.db');
const { width, height } = Dimensions.get('window');
const CARD_SIZE = (width - 40) / 4;
const defaultExamples = Array(5).fill({
  question: '', questionPhonetic: '', questionAudio: '', questionTranslation: '',
  answer: '', answerPhonetic: '', answerAudio: '', translation: ''
});

export default function DecksScreen() {
  const [selectedTab, setSelectedTab] = useState('browse'); // "browse" is default
  const [availableDecks, setAvailableDecks] = useState([]);
  const [selectedDeckName, setSelectedDeckName] = useState(null);
  const [cards, setCards] = useState([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editedCard, setEditedCard] = useState({ 
    examples: defaultExamples,
    unsplashImages: [] 
  });
  const [selectedExampleIndex, setSelectedExampleIndex] = useState(0);

  useEffect(() => {
    loadAllDecks();
  }, []);

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
      style={styles.cardContainer}
      onPress={() => handleCardPress(item)}
    >
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

  // Header Tabs (Browse and Import)
  const renderHeaderTabs = () => (
    <View style={styles.headerTabsContainer}>
      <TouchableOpacity
        style={[styles.tabButton, selectedTab === 'browse' && styles.selectedTabButton]}
        onPress={() => setSelectedTab('browse')}
      >
        <Text style={[styles.tabText, selectedTab === 'browse' && styles.selectedTabText]}>
          Browse
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabButton, selectedTab === 'import' && styles.selectedTabButton]}
        onPress={() => setSelectedTab('import')}
      >
        <Text style={[styles.tabText, selectedTab === 'import' && styles.selectedTabText]}>
          Import
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
            setSelectedDeckName(item);
            loadDeckCards(item);
          }}
        >
          <Text style={styles.deckButtonText}>{item}</Text>
        </TouchableOpacity>
      )}
      keyExtractor={(item, index) => index.toString()}
      contentContainerStyle={styles.deckSelection}
    />
  );

  // For the Browse tab, render a single FlatList for cards, with the deck selection as a header.
  const renderBrowseContent = () => (
    <FlatList
      data={cards}
      renderItem={renderCardItem}
      numColumns={4}
      keyExtractor={item => item.id.toString()}
      contentContainerStyle={styles.cardGrid}
      ListHeaderComponent={renderDeckSelection}
    />
  );

  return (
    <ImageBackground source={require('../asset/background.png')} style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        {/* Sticky Top Tabs */}
        {renderHeaderTabs()}
        {selectedTab === 'browse' && renderBrowseContent()}
        {selectedTab === 'import' && <AIPage />}  {/* Mount AIPage for the Import tab */}

        {/* Edit Modal */}
        <Modal visible={isEditModalVisible} animationType="slide">
          <SafeAreaView style={styles.modalContainer}>
            <FlatList
              data={[]}
              ListHeaderComponent={
                <View>
                  <Text style={styles.modalTitle}>Edit Card</Text>
                  {/* [Edit fields identical as before] */}
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
  cardGrid: { padding: 5 },
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
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' }
});
