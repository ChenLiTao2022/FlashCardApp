import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const KEYS = {
  PLAYER_DATA: 'playerData',
  PENDING_REWARDS: 'pendingFoodRewards'
};

// Default values
export const DEFAULTS = {
  PLAYER_DATA: {
    money: 10000,
    diamonds: 100,
    dailyStreak: 0,
    pet: {
      name: 'Whiskers',
      age: 1,
      weight: 4.5
    },
    stats: {
      hunger: 50,
      clean: 50,
      happy: 50
    },
    furniture: {
      owned: {},
      placement: [
        { id: 'cat', itemKey: 'catSprite', roomRow: 12, roomCol: 12 }
      ]
    },
    food: {
      items: {
        CreamySalmonPate: { quantity: 5, purchased: true },
        TunaFlakes: { quantity: 3, purchased: true },
        ChickenNoodleSoup: { quantity: 2, purchased: true },
        ButteryBreadCrumbs: { quantity: 4, purchased: true },
        CatnipCookies: { quantity: 1, purchased: true }
      }
    }
  }
};

/**
 * Loads player data from AsyncStorage
 * @returns {Promise<Object>} The player data or default values
 */
export const loadPlayerData = async () => {
  try {
    const storedData = await AsyncStorage.getItem(KEYS.PLAYER_DATA);
    if (storedData) {
      return JSON.parse(storedData);
    }
    
    // Check if we need to migrate from old format
    const migrationResult = await migrateFromOldFormat();
    if (migrationResult) {
      return migrationResult;
    }
    
    // If no player data stored and no migration, initialize with defaults
    await savePlayerData(DEFAULTS.PLAYER_DATA);
    return DEFAULTS.PLAYER_DATA;
  } catch (error) {
    console.error('Error loading player data:', error);
    return DEFAULTS.PLAYER_DATA;
  }
};

/**
 * Saves player data to AsyncStorage
 * @param {Object} playerData - The player data to save
 * @returns {Promise<void>}
 */
export const savePlayerData = async (playerData) => {
  try {
    await AsyncStorage.setItem(KEYS.PLAYER_DATA, JSON.stringify(playerData));
  } catch (error) {
    console.error('Error saving player data:', error);
  }
};

/**
 * Migrates from old storage format to new consolidated format
 * @returns {Promise<Object|null>} The migrated player data or null if migration not needed
 */
export const migrateFromOldFormat = async () => {
  try {
    // Check if old keys exist
    const oldMoneyItem = await AsyncStorage.getItem('catMoney');
    const oldStatsItem = await AsyncStorage.getItem('catStats');
    const oldDailyStreakItem = await AsyncStorage.getItem('dailyStreak');
    const oldOwnedFurnitureItem = await AsyncStorage.getItem('ownedFurnitureItems');
    const oldOwnedFoodItem = await AsyncStorage.getItem('ownedFood');
    const oldPurchasedFoodsItem = await AsyncStorage.getItem('purchasedFoods');
    
    // If none of the old keys exist, no migration needed
    if (!oldMoneyItem && !oldStatsItem && !oldDailyStreakItem && !oldOwnedFurnitureItem && 
        !oldOwnedFoodItem && !oldPurchasedFoodsItem) {
      return null;
    }
    
    // Build new player data object from old data
    const playerData = { ...DEFAULTS.PLAYER_DATA };
    
    if (oldMoneyItem) {
      const parsedMoney = parseInt(oldMoneyItem, 10);
      if (!isNaN(parsedMoney)) {
        playerData.money = parsedMoney;
      }
    }
    
    if (oldStatsItem) {
      try {
        const oldStats = JSON.parse(oldStatsItem);
        playerData.stats = {
          hunger: oldStats.hunger ?? DEFAULTS.PLAYER_DATA.stats.hunger,
          clean: oldStats.clean ?? DEFAULTS.PLAYER_DATA.stats.clean,
        };
      } catch (e) {
        console.error('Error parsing old stats:', e);
      }
    }
    
    if (oldDailyStreakItem) {
      const parsedStreak = parseInt(oldDailyStreakItem, 10);
      if (!isNaN(parsedStreak)) {
        playerData.dailyStreak = parsedStreak;
      }
    }
    
    if (oldOwnedFurnitureItem) {
      try {
        const oldFurniture = JSON.parse(oldOwnedFurnitureItem);
        if (oldFurniture) {
          playerData.furniture = {
            ...playerData.furniture,
            owned: oldFurniture
          };
        }
      } catch (e) {
        console.error('Error parsing old furniture:', e);
      }
    }
    
    if (oldOwnedFoodItem) {
      try {
        const oldFood = JSON.parse(oldOwnedFoodItem);
        if (oldFood) {
          playerData.food = {
            ...playerData.food,
            owned: oldFood
          };
        }
      } catch (e) {
        console.error('Error parsing old food:', e);
      }
    }
    
    if (oldPurchasedFoodsItem) {
      try {
        const oldPurchasedFoods = JSON.parse(oldPurchasedFoodsItem);
        if (oldPurchasedFoods) {
          playerData.food = {
            ...playerData.food,
            purchased: oldPurchasedFoods
          };
        }
      } catch (e) {
        console.error('Error parsing old purchased foods:', e);
      }
    }
    
    // Save the migrated data
    await savePlayerData(playerData);
    
    // Clean up old keys
    await AsyncStorage.multiRemove([
      'catMoney', 
      'catStats', 
      'dailyStreak', 
      'ownedFurnitureItems',
      'ownedFood',
      'purchasedFoods'
    ]);
    
    return playerData;
  } catch (error) {
    console.error('Error during migration:', error);
    return null;
  }
};

// Helper functions for individual player data properties

/**
 * Loads money from player data
 * @returns {Promise<number>} The money amount or default value
 */
export const loadMoney = async () => {
  const playerData = await loadPlayerData();
  return playerData.money;
};

/**
 * Saves money to player data
 * @param {number} amount - The amount of money to save
 * @returns {Promise<void>}
 */
export const saveMoney = async (amount) => {
  const playerData = await loadPlayerData();
  playerData.money = amount;
  await savePlayerData(playerData);
};

/**
 * Loads diamonds from player data
 * @returns {Promise<number>} The diamonds amount or default value
 */
export const loadDiamonds = async () => {
  const playerData = await loadPlayerData();
  return playerData.diamonds;
};

/**
 * Saves diamonds to player data
 * @param {number} amount - The amount of diamonds to save
 * @returns {Promise<void>}
 */
export const saveDiamonds = async (amount) => {
  const playerData = await loadPlayerData();
  playerData.diamonds = amount;
  await savePlayerData(playerData);
};

/**
 * Loads cat stats from player data
 * @returns {Promise<Object>} The cat stats or default values
 */
export const loadStats = async () => {
  const playerData = await loadPlayerData();
  return playerData.stats;
};

/**
 * Saves cat stats to player data
 * @param {Object} stats - The stats object to save
 * @returns {Promise<void>}
 */
export const saveStats = async (stats) => {
  const playerData = await loadPlayerData();
  playerData.stats = stats;
  await savePlayerData(playerData);
};

/**
 * Loads daily streak from player data
 * @returns {Promise<number>} The daily streak or default value
 */
export const loadDailyStreak = async () => {
  const playerData = await loadPlayerData();
  return playerData.dailyStreak;
};

/**
 * Saves daily streak to player data
 * @param {number} streak - The daily streak to save
 * @returns {Promise<void>}
 */
export const saveDailyStreak = async (streak) => {
  const playerData = await loadPlayerData();
  playerData.dailyStreak = streak;
  await savePlayerData(playerData);
};

/**
 * Loads owned furniture items from player data
 * @returns {Promise<Object>} The owned furniture items or default values
 */
export const loadOwnedFurniture = async () => {
  const playerData = await loadPlayerData();
  return playerData.furniture?.owned || DEFAULTS.PLAYER_DATA.furniture.owned;
};

/**
 * Saves owned furniture items to player data
 * @param {Object} ownedItems - The owned furniture items to save
 * @returns {Promise<void>}
 */
export const saveOwnedFurniture = async (ownedItems) => {
  const playerData = await loadPlayerData();
  if (!playerData.furniture) {
    playerData.furniture = { ...DEFAULTS.PLAYER_DATA.furniture };
  }
  playerData.furniture.owned = ownedItems;
  await savePlayerData(playerData);
};

/**
 * Loads furniture placement data from player data
 * @returns {Promise<Array>} The furniture placement data or default values
 */
export const loadFurniturePlacement = async () => {
  const playerData = await loadPlayerData();
  return playerData.furniture?.placement || DEFAULTS.PLAYER_DATA.furniture.placement;
};

/**
 * Saves furniture placement data to player data
 * @param {Array} placementData - The furniture placement data to save
 * @returns {Promise<void>}
 */
export const saveFurniturePlacement = async (placementData) => {
  const playerData = await loadPlayerData();
  if (!playerData.furniture) {
    playerData.furniture = { ...DEFAULTS.PLAYER_DATA.furniture };
  }
  playerData.furniture.placement = placementData;
  await savePlayerData(playerData);
};

/**
 * Loads food data from player data
 * @returns {Promise<Object>} The food data
 */
export const loadFoodData = async () => {
  const playerData = await loadPlayerData();
  const result = playerData.food?.items || DEFAULTS.PLAYER_DATA.food.items;
  console.log('[DEBUG] loadFoodData result:', JSON.stringify(result));
  return result;
};

/**
 * Saves food data to player data
 * @param {Object} foodData - The food data to save
 * @returns {Promise<void>}
 */
export const saveFoodData = async (foodData) => {
  console.log('[DEBUG] saveFoodData called with:', JSON.stringify(foodData));
  const playerData = await loadPlayerData();
  if (!playerData.food) {
    playerData.food = { ...DEFAULTS.PLAYER_DATA.food };
  }
  playerData.food.items = foodData;
  await savePlayerData(playerData);
};

// For backward compatibility - these will now use the consolidated data structure
export const loadOwnedFood = async () => {
  const foodData = await loadFoodData();
  // Convert to the old format
  const result = {};
  Object.entries(foodData).forEach(([key, data]) => {
    if (data.quantity > 0) {
      result[key] = data.quantity;
    }
  });
  return result;
};

export const saveOwnedFood = async (ownedFood) => {
  console.log('[DEBUG] saveOwnedFood called with:', JSON.stringify(ownedFood));
  // Convert from old format and merge with existing data
  const foodData = await loadFoodData();
  
  // Update quantities while preserving purchased status
  Object.entries(ownedFood).forEach(([key, quantity]) => {
    if (!foodData[key]) {
      foodData[key] = { purchased: false, quantity: 0 };
    }
    foodData[key].quantity = quantity;
  });
  
  await saveFoodData(foodData);
};

export const loadPurchasedFoods = async () => {
  const foodData = await loadFoodData();
  // Convert to the old format
  const result = {};
  Object.entries(foodData).forEach(([key, data]) => {
    if (data.purchased) {
      result[key] = true;
    }
  });
  return result;
};

export const savePurchasedFoods = async (purchasedFoods) => {
  console.log('[DEBUG] savePurchasedFoods called with:', JSON.stringify(purchasedFoods));
  // Convert from old format and merge with existing data
  const foodData = await loadFoodData();
  
  // Update purchased status while preserving quantities
  Object.entries(purchasedFoods).forEach(([key, purchased]) => {
    if (!foodData[key]) {
      foodData[key] = { purchased: false, quantity: 0 };
    }
    foodData[key].purchased = purchased;
  });
  
  await saveFoodData(foodData);
};

/**
 * Loads pet information (name, age, weight) from player data
 * @returns {Promise<Object>} The pet information or default values
 */
export const loadPetInfo = async () => {
  const playerData = await loadPlayerData();
  return playerData.pet || DEFAULTS.PLAYER_DATA.pet;
};

/**
 * Saves pet information to player data
 * @param {Object} petInfo - The pet information to save
 * @returns {Promise<void>}
 */
export const savePetInfo = async (petInfo) => {
  const playerData = await loadPlayerData();
  playerData.pet = petInfo;
  await savePlayerData(playerData);
};

/**
 * Resets AsyncStorage completely and initializes with defaults
 * @returns {Promise<void>}
 */
export const resetStorage = async () => {
  try {
    // Clear all AsyncStorage data
    await AsyncStorage.clear();
    
    // Re-initialize with defaults
    await savePlayerData(DEFAULTS.PLAYER_DATA);
    
    console.log('AsyncStorage has been reset to defaults');
    return true;
  } catch (error) {
    console.error('Error resetting AsyncStorage:', error);
    return false;
  }
};
