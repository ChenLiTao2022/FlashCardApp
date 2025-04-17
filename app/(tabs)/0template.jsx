// DecksScreen.jsx

/*
  [{
    front: "Foreign word",                         // string
    back: "Native meaning",                         // string
    phonetic: "Phonetic transcription",             // string
    imageUrl: "Local image URI",                    // string
    examples: 
    "
      [
  {
    "question": "How do you ask for water?",
    "questionPhonetic": "nǐ yào hē shuǐ ma?",
    "questionAudio": "local-uri-for-question1-audio.mp3",
    "questionTranslation": "How do you ask for water?",
    "answer": "Water, please.",
    "answerPhonetic": "shuǐ, qǐng",
    "answerAudio": "local-uri-for-answer1-audio.mp3",
    "translation": "Water, please."
  },
  {
    "question": "Could I have some water?",
    "questionPhonetic": "wǒ kěyǐ yào yīxiē shuǐ ma?",
    "questionAudio": "local-uri-for-question2-audio.mp3",
    "questionTranslation": "Could I have some water?",
    "answer": "Yes, here you go.",
    "answerPhonetic": "duì, zhè shì",
    "answerAudio": "local-uri-for-answer2-audio.mp3",
    "translation": "Yes, here you go."
  },
  {
    "question": "Do you need water?",
    "questionPhonetic": "nǐ xūyào shuǐ ma?",
    "questionAudio": "local-uri-for-question3-audio.mp3",
    "questionTranslation": "Do you need water?",
    "answer": "I already have some.",
    "answerPhonetic": "wǒ yǐjīng yǒu le",
    "answerAudio": "local-uri-for-answer3-audio.mp3",
    "translation": "I already have some."
  },
  {
    "question": "Is there water in the fridge?",
    "questionPhonetic": "bīngxiāng lǐ yǒu shuǐ ma?",
    "questionAudio": "local-uri-for-question4-audio.mp3",
    "questionTranslation": "Is there water in the fridge?",
    "answer": "Yes, there is.",
    "answerPhonetic": "yǒu, yǒu",
    "answerAudio": "local-uri-for-answer4-audio.mp3",
    "translation": "Yes, there is."
  },
  {
    "question": "Would you like some water?",
    "questionPhonetic": "nǐ xiǎng bù xiǎng hē shuǐ?",
    "questionAudio": "local-uri-for-question5-audio.mp3",
    "questionTranslation": "Would you like some water?",
    "answer": "Sure, thank you.",
    "answerPhonetic": "kěyǐ, xièxiè",
    "answerAudio": "local-uri-for-answer5-audio.mp3",
    "translation": "Sure, thank you."
  }
]
    ",                // JSON string (array of example objects)
    unsplashImages: "[\"URI1\", \"URI2\", ...]",    // JSON string (array of image URIs)
    lastReviewDate: "ISO Date String",              // string
    nextReviewDate: "ISO Date String",              // string
    consecutiveCorrectAnswersCount: 0,              // integer
    wrongQueue: "[false,0]",                        // JSON string
    easeFactor: 1.5,                                  // real number
    frontAudio: "Local audio URI"                   // string
  }, {card2}, {card3}]
*/

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  ImageBackground,
  StyleSheet,
  Alert
} from 'react-native';
import * as SQLite from 'expo-sqlite';
import { useRouter } from 'expo-router';

const db = SQLite.openDatabaseSync('mydb.db');

export default function DecksScreen() {
  const router = useRouter();
  // State to hold available deck names (each deck is a table in SQLite).
  const [availableDecks, setAvailableDecks] = useState([]);
  // Currently selected deck's table name.
  const [selectedDeckName, setSelectedDeckName] = useState(null);
  // Cards loaded from the selected deck.
  const [cards, setCards] = useState([]);

  // useEffect that loads all deck names from SQLite when the component mounts.
  useEffect(() => {
    loadAllDecks();
  }, []);

  // Loads all available decks (table names) from the database.
  const loadAllDecks = () => {
    try {
      const tables = db.getAllSync(`
        SELECT name 
        FROM sqlite_master 
        WHERE type='table' 
          AND name NOT LIKE 'sqlite_%'
      `);
      // Map over the results to extract table names.
      setAvailableDecks(tables.map(t => t.name));
    } catch (error) {
      console.error('Error loading decks', error);
    }
  };

  // Loads all cards from a selected deck (table).
  const loadDeckCards = (deckName) => {
    try {
      const results = db.getAllSync(`SELECT * FROM ${deckName}`);
      setCards(results);
    } catch (error) {
      console.error('Error loading deck cards', error);
    }
  };

  // Called when a deck button is pressed.
  const onDeckPress = (deckName) => {
    setSelectedDeckName(deckName);
    loadDeckCards(deckName);
  };

  return (
    <ImageBackground source={require('../asset/background.png')} style={styles.background}>
      <View style={styles.container}>
        {/* If no deck is selected, show the deck selection row */}
        {selectedDeckName === null ? (
          <ScrollView 
            horizontal 
            contentContainerStyle={styles.deckSelectionContainer} 
            style={styles.deckSelectionRow}
          >
            {availableDecks.map((deckName, index) => (
              <TouchableOpacity
                key={index}
                style={styles.deckButton}
                onPress={() => onDeckPress(deckName)}
              >
                <Text style={styles.deckButtonText}>{deckName}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <>
            {/* Top deck selection bar for switching decks */}
            <ScrollView 
              horizontal 
              contentContainerStyle={styles.deckSelectionContainer} 
              style={styles.deckSelectionRow}
            >
              {availableDecks.map((deckName, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.deckButton, 
                    deckName === selectedDeckName && styles.selectedDeckButton
                  ]}
                  onPress={() => onDeckPress(deckName)}
                >
                  <Text style={styles.deckButtonText}>{deckName}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* New: Grid of cards (4 columns max) */}
            <ScrollView style={styles.cardGridContainer}>
              <View style={styles.cardGrid}>
                {cards.map((card, index) => (
                  <View key={index} style={styles.cardContainer}>
                    {/* Card Image */}
                    <Image
                      source={{ uri: card.imageUrl }}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />
                    {/* Foreign word */}
                    <Text style={styles.foreignText}>{card.front}</Text>
                    {/* Translation (optional, can be hidden if you only want the foreign word) */}
                    <Text style={styles.translationText}>{card.back}</Text>
                    {/* Hardcoded Level 1 badge */}
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelText}>Level 1</Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1
  },
  container: {
    flex: 1,
    padding: 20
  },
  deckSelectionRow: {
    marginVertical: 10
  },
  deckSelectionContainer: {
    alignItems: 'center'
  },
  deckButton: {
    marginHorizontal: 10,
    paddingVertical: 15,
    paddingHorizontal: 25,
    backgroundColor: '#fff',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  selectedDeckButton: {
    borderColor: '#007AFF'
  },
  deckButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },

  // --- Grid + Card styles ---
  cardGridContainer: {
    flex: 1,
    marginTop: 10
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  cardContainer: {
    width: '40%',          // Adjust to fit 2 or 3 or 4 columns based on your preference
    maxWidth: 200,         // You can also cap the max width
    aspectRatio: 0.7,      // Helps keep a consistent rectangular shape
    margin: 10,
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardImage: {
    width: '100%',
    height: '60%'
  },
  foreignText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#333'
  },
  translationText: {
    fontSize: 16,
    color: '#666',
    marginTop: 4
  },
  levelBadge: {
    marginTop: 6,
    backgroundColor: '#FFD700',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15
  },
  levelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  }
});
