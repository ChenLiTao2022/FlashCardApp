import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  
  const isActive = (path) => {
    return pathname === path || pathname.startsWith(path);
  };
  
  return (
    <LinearGradient
      colors={['#1F2F98', '#0A0A18']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.bottomNav}
    >
      <TouchableOpacity 
        onPress={() => router.push('/Decks', { animation: 'none' })} 
        style={styles.navItem}
      >
        {isActive('/Decks') ? (
          <LinearGradient
            colors={['#4CAF50', '#2E7D32']}
            style={styles.activeIconBackground}
          >
            <View style={styles.iconCircle}>
              <Text style={styles.navIcon}>📦</Text>
            </View>
          </LinearGradient>
        ) : (
          <View style={styles.iconCircle}>
            <Text style={styles.navIcon}>📦</Text>
          </View>
        )}
        <Text style={[styles.navLabel, isActive('/Decks') && styles.activeNavLabel]}>Deck</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={() => router.push('/Shop', { animation: 'none' })} 
        style={styles.navItem}
      >
        {isActive('/Shop') ? (
          <LinearGradient
            colors={['#4CAF50', '#2E7D32']}
            style={styles.activeIconBackground}
          >
            <View style={styles.iconCircle}>
              <Text style={styles.navIcon}>🛋️</Text>
            </View>
          </LinearGradient>
        ) : (
          <View style={styles.iconCircle}>
            <Text style={styles.navIcon}>🛋️</Text>
          </View>
        )}
        <Text style={[styles.navLabel, isActive('/Shop') && styles.activeNavLabel]}>Shop</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={() => router.push('/', { animation: 'none' })} 
        style={styles.navItem}
      >
        {isActive('/') ? (
          <LinearGradient
            colors={['#4CAF50', '#2E7D32']}
            style={styles.activeIconBackground}
          >
            <View style={styles.iconCircle}>
              <Text style={styles.navIcon}>🐾</Text>
            </View>
          </LinearGradient>
        ) : (
          <View style={styles.iconCircle}>
            <Text style={styles.navIcon}>🐾</Text>
          </View>
        )}
        <Text style={[styles.navLabel, isActive('/') && styles.activeNavLabel]}>Current</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navItem}
      >
        <View style={styles.iconCircle}>
          <Text style={styles.navIcon}>⚙️</Text>
        </View>
        <Text style={styles.navLabel}>More</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 5,
    paddingBottom: 5,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 2,
    width: width / 4,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  activeIconBackground: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  navIcon: {
    fontSize: 22,
  },
  navLabel: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  activeNavLabel: {
    color: '#4CAF50',
    fontWeight: 'bold',
  }
}); 