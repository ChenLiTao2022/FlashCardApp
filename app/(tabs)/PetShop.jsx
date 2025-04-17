// ShopScreen.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; // Make sure to install via: expo install expo-linear-gradient

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.26;           // Slightly wider cards
const CARD_HEIGHT = CARD_WIDTH * 1.5;        // Taller cards: height is 1.5 * card width
const CARD_MARGIN = 15;

export default function ShopScreen() {
  // Data for shop sections with 6 items each:
  const [dailyDeals, setDailyDeals] = useState([
    { id: 1, title: 'Kibble Pack', cost: 300, emoji: '🍖', purchased: false },
    { id: 2, title: 'Catnip', cost: 50, emoji: '🌿', purchased: false },
    { id: 3, title: 'Scratcher', cost: 150, emoji: '🪵', purchased: false },
    { id: 4, title: 'Fish Feast', cost: 400, emoji: '🐟', purchased: false },
    { id: 5, title: 'Milk Treat', cost: 250, emoji: '🥛', purchased: false },
    { id: 6, title: 'Premium Meal', cost: 600, emoji: '🍲', purchased: false }
  ]);

  const [catItems, setCatItems] = useState([
    { id: 1, title: 'Tabby', cost: 500, emoji: '🐈' },
    { id: 2, title: 'Siamese', cost: 750, emoji: '🐱' },
    { id: 3, title: 'Persian', cost: 800, emoji: '😺' },
    { id: 4, title: 'Maine Coon', cost: 900, emoji: '🐈‍⬛' },
    { id: 5, title: 'Bengal', cost: 850, emoji: '😻' },
    { id: 6, title: 'Calico', cost: 700, emoji: '🐾' }
  ]);

  const [currencyPacks, setCurrencyPacks] = useState([
    { id: 1, title: 'Small Coin Pack', cost: '$0.99', emoji: '💰' },
    { id: 2, title: 'Medium Coin Pack', cost: '$4.99', emoji: '💵' },
    { id: 3, title: 'Large Coin Pack', cost: '$9.99', emoji: '🪙' },
    { id: 4, title: 'Mega Coin Pack', cost: '$19.99', emoji: '💎' },
    { id: 5, title: 'Ultra Coin Pack', cost: '$29.99', emoji: '🏆' },
    { id: 6, title: 'Ultimate Coin Pack', cost: '$49.99', emoji: '🎖️' }
  ]);

  const [furAccessories, setFurAccessories] = useState([
    { id: 1, title: 'Silky Collar', cost: 120, emoji: '💎' },
    { id: 2, title: 'Fancy Bow', cost: 200, emoji: '🎀' },
    { id: 3, title: 'Sparkly Tag', cost: 80, emoji: '✨' },
    { id: 4, title: 'Glitter Hat', cost: 150, emoji: '👒' },
    { id: 5, title: 'Velvet Jacket', cost: 300, emoji: '🧥' },
    { id: 6, title: 'Golden Anklet', cost: 250, emoji: '👑' }
  ]);

  const [catToys, setCatToys] = useState([
    { id: 1, title: 'Feather Wand', cost: 90, emoji: '🪶' },
    { id: 2, title: 'Laser Pointer', cost: 60, emoji: '🔦' },
    { id: 3, title: 'Ball of Yarn', cost: 40, emoji: '🧶' },
    { id: 4, title: 'Crinkle Toy', cost: 70, emoji: '📦' },
    { id: 5, title: 'Catnip Mouse', cost: 55, emoji: '🐭' },
    { id: 6, title: 'Rattle Ball', cost: 65, emoji: '🎲' }
  ]);

  const handlePurchase = (section, id) => {
    if (section === 'daily') {
      setDailyDeals(prev =>
        prev.map(item => (item.id === id ? { ...item, purchased: true } : item))
      );
    } else if (section === 'cat') {
      alert(`Purchased Cat Item ${id}`);
    } else if (section === 'currency') {
      alert(`Purchased Currency Pack ${id}`);
    } else if (section === 'fur') {
      alert(`Purchased Fur Accessory ${id}`);
    } else if (section === 'toys') {
      alert(`Purchased Cat Toy ${id}`);
    }
  };

  const renderCard = ({ item, section }) => (
    <View style={styles.card}>
      <Text style={styles.cardEmoji}>{item.emoji}</Text>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {item.title}
      </Text>
      {section === 'daily' && item.purchased ? (
        <View style={styles.purchasedContainer}>
          <Text style={styles.purchasedText}>COLLECTED!</Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => handlePurchase(section, item.id)}
          style={styles.buyButton}
        >
          <Text style={styles.buyButtonText}>{item.cost}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Helper function to render a shop section.
  const renderSection = (title, data, sectionKey) => (
    <View style={[styles.sectionContainer, sectionKey === 'daily' && { marginTop: height * 0.03 }]}>
      <View style={styles.sectionTitleContainer}>
        <View style={styles.sectionTitleBar} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => renderCard({ item, section: sectionKey })}
        contentContainerStyle={styles.flatListContainer}
      />
    </View>
  );

  return (
    <LinearGradient
      colors={['#1F1F1F', '#2F2F2F']}
      style={styles.backgroundGradient}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {renderSection('Daily Deals', dailyDeals, 'daily')}
          {renderSection('Cat Items', catItems, 'cat')}
          {renderSection('Yarn Balls', currencyPacks, 'currency')}
          {renderSection('Fur Accessories', furAccessories, 'fur')}
          {renderSection('Cat Toys', catToys, 'toys')}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  backgroundGradient: {
    flex: 1
  },
  safeArea: {
    flex: 1
  },
  scrollContainer: {
    paddingBottom: 60,
    paddingHorizontal: 10,
  },
  sectionContainer: {
    marginBottom: 25,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 20,
    marginBottom: 10
  },
  sectionTitleBar: {
    width: 6,
    height: 24,
    backgroundColor: '#FFD700',
    marginRight: 10,
    borderRadius: 3
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF'
  },
  flatListContainer: {
    paddingLeft: 20,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginRight: CARD_MARGIN,
    backgroundColor: '#3C3C3C',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
  cardEmoji: {
    fontSize: 40,
    textAlign: 'center',
    marginTop: 4
  },
  cardTitle: {
    color: '#FFF',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 5,
    flexWrap: 'wrap'
  },
  buyButton: {
    backgroundColor: '#FFD700',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 6,
    minWidth: 70,
    alignItems: 'center'
  },
  buyButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14
  },
  purchasedContainer: {
    backgroundColor: '#555',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 6
  },
  purchasedText: {
    color: '#0f0',
    fontWeight: 'bold',
    fontSize: 12
  }
});
