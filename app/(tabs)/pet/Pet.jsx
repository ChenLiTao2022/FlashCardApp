// YanWenZiPet.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal,
  Animated
} from 'react-native';

export default function YanWenZiPet() {
  // Game State
  const [hunger, setHunger] = useState(80);
  const [cleanliness, setCleanliness] = useState(75);
  const [gold, setGold] = useState(150);
  const [inventory, setInventory] = useState({ food: 3, soap: 2 });
  const [storeVisible, setStoreVisible] = useState(false);
  const [petExpression, setPetExpression] = useState('ʕ•ᴥ•ʔ');
  const [hasHouse, setHasHouse] = useState(false);
  
  // Fix 1: Use useRef for animated value
  const bobAnim = useRef(new Animated.Value(0)).current;

  // Bobbing animation
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(bobAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    );
    
    animation.start();
    return () => animation.stop();
  }, []);

  // Store Items
  const storeItems = [
    { name: '🍔 Meal', cost: 50, type: 'food' },
    { name: '🍟 Snack', cost: 30, type: 'food' },
    { name: '🛁 Clean', cost: 40, type: 'clean' },
    { name: '🏡 House', cost: 10, type: 'house' }
  ];

  // Game Actions
  const feed = () => {
    if (inventory.food > 0) {
      setHunger(h => Math.min(100, h + 20));
      setInventory(prev => ({ ...prev, food: prev.food - 1 }));
      setPetExpression('ʕ ᵔᴥᵔ ʔﾉ🍔');
      setTimeout(() => setPetExpression('ʕ•ᴥ•ʔ'), 1000);
    }
  };

  const clean = () => {
    if (inventory.soap > 0) {
      setCleanliness(c => Math.min(100, c + 25));
      setPetExpression('ʕ ᵔᴥᵔ ʔﾉ🚿');
      setInventory(prev => ({ ...prev, soap: prev.soap - 1 }));
      setTimeout(() => setPetExpression('ʕ•ᴥ•ʔ'), 1000);
    }
  };

  const buyItem = (item) => {
    if (gold >= item.cost) {
      setGold(g => g - item.cost);
      if (item.type === 'house') {
        setHasHouse(true);
      } else {
        setInventory(prev => ({
          ...prev,
          [item.type]: prev[item.type] + 1
        }));
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.goldText}>(・∀・)つ⑩ {gold}</Text>
        <View style={styles.statusItem}>
          <Text>🍔 {Math.round(hunger)}%</Text>
          <View style={styles.bar}>
            <View style={[styles.hungerFill, { width: `${hunger}%` }]} />
          </View>
        </View>
        <View style={styles.statusItem}>
          <Text>🛀 {Math.round(cleanliness)}%</Text>
          <View style={styles.bar}>
            <View style={[styles.cleanFill, { width: `${cleanliness}%` }]} />
          </View>
        </View>
      </View>

      {/* Fix 2: House positioning */}
      {hasHouse && (
        <View style={styles.house}>
          <Text style={styles.houseText}>
            {" x\n"+
             ".-. _______|\n"+
             "|=|/     /  \\ \n"+
             "| |_____|_\"\"_|\n"+
             "|_|_[X]_|____|"}
          </Text>
        </View>
      )}

      {/* Animated Pet */}
      <Animated.View 
        style={[
          styles.petContainer,
          { 
            transform: [{ 
              translateY: bobAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -10]
              }) 
            }] 
          }
        ]}
      >
        <TouchableOpacity onPress={feed}>
          <Text style={styles.pet}>{petExpression}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.button} onPress={feed}>
          <Text>🍔 Feed ({inventory.food})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={clean}>
          <Text>🛀 Clean ({inventory.soap})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => setStoreVisible(true)}>
          <Text>🏪 Store</Text>
        </TouchableOpacity>
      </View>

      {/* Store Modal */}
      <Modal visible={storeVisible} transparent>
        <View style={styles.modal}>
          <View style={styles.store}>
            <Text style={styles.storeTitle}>🏪 Store</Text>
            {storeItems.map((item, i) => (
              <TouchableOpacity 
                key={i} 
                style={styles.storeItem}
                onPress={() => buyItem(item)}
              >
                <Text>{item.name} - (・∀・)つ⑩ {item.cost}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setStoreVisible(false)}
            >
              <Text>✖ Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}


// Updated styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E6',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    marginTop: 10,
  },
  house: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    zIndex: 1, // Changed from -1 to 1
  },
  houseText: {
    fontSize: 10,
    lineHeight: 12,
    color: '#444',
    fontFamily: 'Courier',
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 5,
    borderRadius: 3,
  },
  statusItem: {
    alignItems: 'center',
  },
  bar: {
    width: 80,
    height: 10,
    backgroundColor: '#E0D5C4',
    borderRadius: 5,
    marginTop: 5,
  },
  hungerFill: {
    height: '100%',
    backgroundColor: '#FFB347',
    borderRadius: 5,
  },
  cleanFill: {
    height: '100%',
    backgroundColor: '#87CEEB',
    borderRadius: 5,
  },
  petContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pet: {
    fontSize: 48,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#FFEEDD',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0D5C4',
  },
  modal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  store: {
    backgroundColor: '#FFF5E6',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    borderWidth: 2,
    borderColor: '#E0D5C4',
  },
  storeTitle: {
    fontSize: 20,
    marginBottom: 15,
    textAlign: 'center',
  },
  storeItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#E0D5C4',
  },
  closeButton: {
    marginTop: 15,
    alignSelf: 'center',
    padding: 10,
  },
});