import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    Image,
    ImageBackground,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import {
    loadFoodData,
    loadMoney,
    loadOwnedFood,
    loadOwnedFurniture,
    loadPurchasedFoods,
    saveFoodData,
    saveMoney,
    saveOwnedFood,
    saveOwnedFurniture,
    savePurchasedFoods
} from '../helpers/StorageHelper';
import {
    decorationLibrary,
    foodCategories,
    foodLibrary,
    foodPrices,
    furniturePrices,
    groupFurnitureByCategory,
    SHEET_SIZE
} from './CatSection';

const { width } = Dimensions.get('window');

// FurnitureItem Component 
function FurnitureItem({ itemKey, onSelect, isOwned, price }) {
  const item = decorationLibrary[itemKey];
  if (!item) return null;
  
  const { x, y, width, height } = item;
  
  // Standard target height for all furniture previews
  const standardPreviewHeight = 60;
  
  // Calculate the scale needed to make this item match the standard height
  const heightRatio = standardPreviewHeight / height;
  
  // Apply the same scale to width to maintain proportions
  const scaledWidth = width * heightRatio;
  const scaledHeight = standardPreviewHeight;
  
  return (
    <TouchableOpacity
      style={styles.furnitureItem}
      onPress={() => onSelect(itemKey)}
    >
      <View style={{
        width: scaledWidth,
        height: scaledHeight,
        overflow: 'hidden',
        marginVertical: 5,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Image
          source={require('../asset/RetroCatsPaid/CatItems/Decorations/CatRoomDecorations.png')}
          style={{
            position: 'absolute',
            top: -y * heightRatio,
            left: -x * heightRatio,
            width: SHEET_SIZE * heightRatio,
            height: SHEET_SIZE * heightRatio,
            resizeMode: 'contain',
          }}
        />
      </View>
      
      <Text style={styles.furnitureName}>
        {itemKey.replace(/([A-Z])/g, ' $1').trim()}
      </Text>
      
      {price && !isOwned && (
        <Text style={styles.priceTag}>💰 {price}</Text>
      )}
      {isOwned && (
        <Text style={styles.ownedTag}>Bought</Text>
      )}
    </TouchableOpacity>
  );
}

// FoodItem Component
function FoodItem({ foodKey, onSelect, isOwned, price, quantity = 0 }) {
  const food = foodLibrary[foodKey];
  if (!food) return null;
  
  // Get preference display and color
  const getPreferenceColor = (preference) => {
    switch (preference) {
      case 'Likes': return '#4CAF50'; // Green
      case 'Neutral': return '#FFC107'; // Amber
      case 'Dislikes': return '#F44336'; // Red
      default: return '#888888'; // Gray for unknown
    }
  };
  
  return (
    <TouchableOpacity 
      style={styles.foodItem}
      onPress={() => onSelect(foodKey)}
    >
      {quantity > 0 && (
        <View style={styles.quantityBadge}>
          <Text style={styles.quantityText}>{quantity}</Text>
        </View>
      )}
      
      {/* Add preference indicator for owned foods */}
      {isOwned && (
        <View style={[
          styles.preferenceIndicator, 
          { backgroundColor: getPreferenceColor(food.preference) }
        ]}>
          <Text style={styles.preferenceIndicatorText}>
            {food.preference.charAt(0)}
          </Text>
        </View>
      )}
      
      <View style={styles.foodImageContainer}>
        <Text style={styles.foodEmoji}>{food.emoji}</Text>
        {!isOwned && price && (
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>💰 {price}</Text>
          </View>
        )}
      </View>
      <Text style={styles.foodName}>
        {foodKey.replace(/([A-Z])/g, ' $1').trim()}
      </Text>
    </TouchableOpacity>
  );
}

// Food Detail Modal Component
function FoodDetailsModal({ foodKey, onBuy, onCancel, visible, price, isPurchased }) {
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const food = foodLibrary[foodKey];
  
  if (!visible || !food) return null;
  
  const handleBuy = () => {
    onBuy(foodKey, selectedQuantity);
  };
  
  // Get color based on preference
  const getPreferenceColor = (preference) => {
    switch (preference) {
      case 'Likes': return '#4CAF50'; // Green
      case 'Neutral': return '#FFC107'; // Amber
      case 'Dislikes': return '#F44336'; // Red
      default: return '#888888'; // Gray for unknown
    }
  };
  
  return (
    <View style={styles.modalOverlay}>
      <View style={styles.foodDetailModal}>
        <Text style={styles.foodDetailTitle}>
          {food.emoji} {foodKey.replace(/([A-Z])/g, ' $1').trim()}
        </Text>
        
        {/* Show preference instead of category */}
        <View style={[
          styles.preferenceTag, 
          { backgroundColor: isPurchased ? getPreferenceColor(food.preference) : '#888888' }
        ]}>
          <Text style={styles.preferenceText}>
            {isPurchased ? `Preference: ${food.preference}` : 'Preference: Unknown'}
          </Text>
        </View>
        
        <Text style={styles.foodDescription}>{food.description}</Text>
        
        <View style={styles.nutritionInfo}>
          <Text style={styles.nutritionText}>Hunger: +{food.hunger}</Text>
          <Text style={styles.nutritionText}>
            Happiness: {isPurchased ? `+${food.happiness}` : '???'}
          </Text>
        </View>
        
        <View style={styles.quantityContainer}>
          <Text style={styles.quantityLabel}>Quantity:</Text>
          <View style={styles.quantitySelector}>
            <TouchableOpacity 
              style={styles.quantityButton}
              onPress={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantityValue}>{selectedQuantity}</Text>
            <TouchableOpacity 
              style={styles.quantityButton}
              onPress={() => setSelectedQuantity(selectedQuantity + 1)}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.totalPrice}>Total: 💰 {price * selectedQuantity}</Text>
        
        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.buyButton} onPress={handleBuy}>
            <Text style={styles.buttonText}>Buy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// Main Shop component
export default function Shop() {
  // Common state
  const [money, setMoney] = useState(0);
  const [shopTab, setShopTab] = useState('furniture'); // 'furniture' or 'food'
  const router = useRouter();
  
  // Check for URL parameters to determine which tab to show
  useEffect(() => {
    if (router.query?.tab === 'food') {
      setShopTab('food');
    } else if (router.query?.tab === 'furniture') {
      setShopTab('furniture');
    }
  }, [router.query]);
  
  // Furniture state
  const [ownedItems, setOwnedItems] = useState({});
  const [furnitureCategories, setFurnitureCategories] = useState([]);
  const [selectedFurnitureCategory, setSelectedFurnitureCategory] = useState(null);
  const [isPurchasingFurniture, setIsPurchasingFurniture] = useState(false);
  const [purchaseFurnitureItem, setPurchaseFurnitureItem] = useState(null);
  
  // Food state
  const [ownedFood, setOwnedFood] = useState({});
  const [selectedFoodCategory, setSelectedFoodCategory] = useState(null);
  const [isPurchasingFood, setIsPurchasingFood] = useState(false);
  const [purchaseFoodItem, setPurchaseFoodItem] = useState(null);
  const [showFoodDetails, setShowFoodDetails] = useState(false);
  const [selectedFoodForDetails, setSelectedFoodForDetails] = useState(null);
  const [purchasedFoods, setPurchasedFoods] = useState({});
  
  // Data
  const groupedFurniture = groupFurnitureByCategory(decorationLibrary);
  
  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load data with helper functions
        const [moneyAmount, ownedFurnitureItems, ownedFoodItems, purchasedFoodItems] = await Promise.all([
          loadMoney(),
          loadOwnedFurniture(),
          loadOwnedFood(),
          loadPurchasedFoods()
        ]);
        
        // Set state with loaded data
        setMoney(moneyAmount);
        setOwnedItems(ownedFurnitureItems);
        setOwnedFood(ownedFoodItems);
        setPurchasedFoods(purchasedFoodItems);
        
        // Set up categories
        setFurnitureCategories(Object.keys(groupedFurniture));
      } catch (error) {
        console.error('Error loading shop data:', error);
      }
    };
    
    loadData();
  }, []);
  
  // Save owned items whenever they change
  useEffect(() => {
    if (Object.keys(ownedItems).length > 0) {
      saveOwnedFurniture(ownedItems);
    }
  }, [ownedItems]);
  
  // Save owned food whenever it changes
  useEffect(() => {
    if (Object.keys(ownedFood).length > 0) {
      saveOwnedFood(ownedFood);
    }
  }, [ownedFood]);
  
  // Save purchased foods whenever they change
  useEffect(() => {
    if (Object.keys(purchasedFoods).length > 0) {
      savePurchasedFoods(purchasedFoods);
    }
  }, [purchasedFoods]);
  
  // ---- FURNITURE HANDLERS ----
  
  // Handle initiating a furniture purchase
  const handleInitiateFurniturePurchase = (itemKey) => {
    setPurchaseFurnitureItem(itemKey);
    setIsPurchasingFurniture(true);
  };
  
  // Handle confirming a furniture purchase
  const handleConfirmFurniturePurchase = async () => {
    if (!purchaseFurnitureItem) return;
    
    const price = furniturePrices[purchaseFurnitureItem] || 0;
    
    if (money >= price) {
      // Deduct money
      const newMoney = money - price;
      setMoney(newMoney);
      saveMoney(newMoney);
      
      // Add to owned items
      const updatedOwnedItems = {
        ...ownedItems,
        [purchaseFurnitureItem]: true
      };
      
      setOwnedItems(updatedOwnedItems);
      saveOwnedFurniture(updatedOwnedItems);
      
      Alert.alert(
        "Purchase Successful", 
        "Item has been added to your collection!"
      );
    } else {
      Alert.alert(
        "Insufficient Funds", 
        "You don't have enough money to purchase this item."
      );
    }
    
    // Reset purchase state
    setIsPurchasingFurniture(false);
    setPurchaseFurnitureItem(null);
  };
  
  // Handle canceling a furniture purchase
  const handleCancelFurniturePurchase = () => {
    setIsPurchasingFurniture(false);
    setPurchaseFurnitureItem(null);
  };
  
  // Handle selecting a furniture item
  const handleSelectFurnitureItem = (itemKey) => {
    if (ownedItems[itemKey]) {
      Alert.alert(
        "Item Owned", 
        "You already own this item. Access it from the decoration panel in your room."
      );
    } else {
      handleInitiateFurniturePurchase(itemKey);
    }
  };
  
  // ---- FOOD HANDLERS ----
  
  // Handle showing food details
  const handleShowFoodDetails = (foodKey) => {
    setSelectedFoodForDetails(foodKey);
    setShowFoodDetails(true);
  };
  
  // Handle buying food
  const handleBuyFood = async (foodKey, quantity) => {
    const price = foodPrices[foodKey] || 0;
    const totalPrice = price * quantity;
    
    if (money >= totalPrice) {
      // Deduct money
      const newMoney = money - totalPrice;
      setMoney(newMoney);
      saveMoney(newMoney);
      
      try {
        // Load current food data
        const foodData = await loadFoodData();
        
        // Initialize this food if it doesn't exist
        if (!foodData[foodKey]) {
          foodData[foodKey] = { quantity: 0, purchased: false };
        }
        
        // Update quantity and purchased status
        foodData[foodKey].quantity += quantity;
        foodData[foodKey].purchased = true;
        
        console.log('[DEBUG] Purchasing food:', foodKey, 'quantity:', quantity);
        console.log('[DEBUG] Updated foodData in Shop:', JSON.stringify(foodData));
        
        // Save consolidated food data
        await saveFoodData(foodData);
        
        // Update component state
        // Update owned food state (for UI consistency)
        setOwnedFood(prevOwned => ({
          ...prevOwned,
          [foodKey]: (prevOwned[foodKey] || 0) + quantity
        }));
        
        // Update purchased foods state (for UI consistency)
        setPurchasedFoods(prev => ({
          ...prev,
          [foodKey]: true
        }));
        
        Alert.alert(
          "Purchase Successful", 
          `${quantity} ${foodKey.replace(/([A-Z])/g, ' $1').trim()} added to your inventory!`
        );
      } catch (error) {
        console.error('Error updating food data:', error);
        Alert.alert('Error', 'There was a problem adding the food to your inventory.');
      }
    } else {
      Alert.alert(
        "Insufficient Funds", 
        "You don't have enough money to purchase this food."
      );
    }
    
    // Reset food detail state
    setShowFoodDetails(false);
    setSelectedFoodForDetails(null);
  };
  
  // Handle cancelling food purchase
  const handleCancelFoodDetails = () => {
    setShowFoodDetails(false);
    setSelectedFoodForDetails(null);
  };
  
  // Handle selecting a food item
  const handleSelectFoodItem = (foodKey) => {
    handleShowFoodDetails(foodKey);
  };
  
  // Handle going back to the index page
  const handleBackToHome = () => {
    router.push('/');
  };
  
  return (
    <ImageBackground source={require('../asset/background.png')} style={styles.background}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackToHome}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Pet Shop</Text>
          <View style={styles.moneyContainer}>
            <Text style={styles.moneyIcon}>💰</Text>
            <Text style={styles.moneyText}>{money}</Text>
          </View>
        </View>
        
        {/* Shop Type Tabs */}
        <View style={styles.shopTypeTabsContainer}>
          <TouchableOpacity 
            style={[
              styles.shopTypeTab, 
              shopTab === 'furniture' && styles.selectedShopTypeTab
            ]}
            onPress={() => setShopTab('furniture')}
          >
            <Text style={styles.shopTypeTabText}>Furniture</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.shopTypeTab, 
              shopTab === 'food' && styles.selectedShopTypeTab
            ]}
            onPress={() => setShopTab('food')}
          >
            <Text style={styles.shopTypeTabText}>Food</Text>
          </TouchableOpacity>
        </View>
        
        {/* FURNITURE SHOP */}
        {shopTab === 'furniture' && (
          <>
            {/* Category Tabs */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categoryTabsContainer}
            >
              <TouchableOpacity 
                style={[
                  styles.categoryTab, 
                  selectedFurnitureCategory === null && styles.selectedCategoryTab
                ]}
                onPress={() => setSelectedFurnitureCategory(null)}
              >
                <Text style={styles.categoryTabText}>All</Text>
              </TouchableOpacity>
              
              {furnitureCategories.map(category => (
                <TouchableOpacity 
                  key={category}
                  style={[
                    styles.categoryTab, 
                    selectedFurnitureCategory === category && styles.selectedCategoryTab
                  ]}
                  onPress={() => setSelectedFurnitureCategory(category)}
                >
                  <Text style={styles.categoryTabText}>{category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Furniture Items */}
            <FlatList
              style={styles.itemListContainer}
              data={selectedFurnitureCategory ? [selectedFurnitureCategory] : furnitureCategories}
              keyExtractor={(item) => item}
              renderItem={({ item: category }) => (
                <View style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  <FlatList
                    data={groupedFurniture[category]}
                    keyExtractor={(item) => item}
                    numColumns={3}
                    renderItem={({ item: itemKey }) => (
                      <FurnitureItem 
                        itemKey={itemKey}
                        onSelect={handleSelectFurnitureItem}
                        isOwned={ownedItems[itemKey]}
                        price={furniturePrices[itemKey]}
                      />
                    )}
                    contentContainerStyle={styles.itemsGrid}
                  />
                </View>
              )}
              ListFooterComponent={<View style={styles.bottomSpacer} />}
            />
            
            {/* Furniture Purchase Confirmation */}
            {isPurchasingFurniture && purchaseFurnitureItem && (
              <View style={styles.modalOverlay}>
                <View style={styles.purchaseModal}>
                  <Text style={styles.modalTitle}>Confirm Purchase</Text>
                  <Text style={styles.itemName}>
                    {purchaseFurnitureItem.replace(/([A-Z])/g, ' $1').trim()}
                  </Text>
                  <Text style={styles.priceConfirmation}>
                    Price: 💰 {furniturePrices[purchaseFurnitureItem] || 0}
                  </Text>
                  
                  <View style={styles.modalButtonsContainer}>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={handleCancelFurniturePurchase}
                    >
                      <Text style={styles.modalButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.confirmButton]}
                      onPress={handleConfirmFurniturePurchase}
                    >
                      <Text style={styles.modalButtonText}>Buy</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
        
        {/* FOOD SHOP */}
        {shopTab === 'food' && (
          <>
            {/* Food Category Tabs */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categoryTabsContainer}
            >
              <TouchableOpacity 
                style={[
                  styles.categoryTab, 
                  selectedFoodCategory === null && styles.selectedCategoryTab
                ]}
                onPress={() => setSelectedFoodCategory(null)}
              >
                <Text style={styles.categoryTabText}>All</Text>
              </TouchableOpacity>
              
              {Object.keys(foodCategories).map(category => (
                <TouchableOpacity 
                  key={category}
                  style={[
                    styles.categoryTab, 
                    selectedFoodCategory === category && styles.selectedCategoryTab
                  ]}
                  onPress={() => setSelectedFoodCategory(category)}
                >
                  <Text style={styles.categoryTabText}>{category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Food Items */}
            <FlatList
              style={styles.itemListContainer}
              data={selectedFoodCategory ? [selectedFoodCategory] : Object.keys(foodCategories)}
              keyExtractor={(item) => item}
              renderItem={({ item: category }) => (
                <View style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  <FlatList
                    data={foodCategories[category]}
                    keyExtractor={(item) => item}
                    numColumns={3}
                    renderItem={({ item: foodKey }) => (
                      <FoodItem 
                        foodKey={foodKey}
                        onSelect={handleSelectFoodItem}
                        isOwned={purchasedFoods[foodKey]}
                        price={foodPrices[foodKey]}
                        quantity={ownedFood[foodKey] || 0}
                      />
                    )}
                  />
                </View>
              )}
              ListFooterComponent={<View style={styles.bottomSpacer} />}
            />
            
            {/* Food Details Modal */}
            {showFoodDetails && selectedFoodForDetails && (
              <FoodDetailsModal 
                foodKey={selectedFoodForDetails}
                onBuy={handleBuyFood}
                onCancel={handleCancelFoodDetails}
                visible={showFoodDetails}
                price={foodPrices[selectedFoodForDetails] || 0}
                isPurchased={purchasedFoods[selectedFoodForDetails]}
              />
            )}
          </>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
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
  moneyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  moneyIcon: {
    fontSize: 20,
    marginRight: 5,
  },
  moneyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  shopTypeTabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  shopTypeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  selectedShopTypeTab: {
    backgroundColor: '#9C27B0',
  },
  shopTypeTabText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  categoryTabsContainer: {
    maxHeight: 50,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 10,
  },
  categoryTab: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
    marginHorizontal: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  selectedCategoryTab: {
    backgroundColor: '#4CAF50',
  },
  categoryTabText: {
    color: 'white',
    fontWeight: 'bold',
  },
  itemListContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  categorySection: {
    marginVertical: 15,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 5,
    borderRadius: 5,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  foodItemsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  furnitureItem: {
    width: '30%',
    backgroundColor: 'rgba(40,40,40,0.9)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    margin: 5,
    borderWidth: 1,
    borderColor: '#444',
  },
  furnitureName: {
    color: 'white',
    textAlign: 'center',
    marginTop: 5,
    fontSize: 12,
  },
  foodItem: {
    width: '30%',
    backgroundColor: 'rgba(40,40,40,0.9)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    margin: 5,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#444',
  },
  foodImageContainer: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodEmoji: {
    fontSize: 30,
  },
  foodName: {
    color: 'white',
    textAlign: 'center',
    marginTop: 5,
    fontSize: 12,
  },
  quantityBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 1,
  },
  quantityText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  preferenceIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  preferenceIndicatorText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  priceBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 5,
  },
  priceText: {
    color: '#FFD700',
    fontSize: 12,
  },
  priceTag: {
    color: '#FFD700',
    fontWeight: 'bold',
    marginTop: 5,
  },
  ownedTag: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 5,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  purchaseModal: {
    backgroundColor: '#2A2A2A',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  foodDetailModal: {
    backgroundColor: '#2A2A2A',
    borderRadius: 15,
    padding: 20,
    width: '85%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  foodDetailTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  itemName: {
    fontSize: 18,
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  priceConfirmation: {
    fontSize: 20,
    color: '#FFD700',
    marginBottom: 20,
  },
  preferenceTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginBottom: 10,
  },
  preferenceText: {
    color: 'white',
    fontWeight: 'bold',
  },
  foodDescription: {
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  nutritionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 15,
  },
  nutritionText: {
    color: 'white',
    fontWeight: 'bold',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  quantityLabel: {
    color: 'white',
    marginRight: 10,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    backgroundColor: '#9C27B0',
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  quantityButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  quantityValue: {
    color: 'white',
    fontSize: 18,
    marginHorizontal: 10,
  },
  totalPrice: {
    color: '#FFD700',
    fontSize: 20,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  buyButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 25,
    width: '45%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E91E63',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 25,
    width: '45%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    width: '45%',
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bottomSpacer: {
    height: 80, // Add space at the bottom to account for the tab bar
  },
});
