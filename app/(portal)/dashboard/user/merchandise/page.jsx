"use client"

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, query, where, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuth } from "firebase/auth";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { ShoppingCart, Package, X, ShoppingBag, Plus, Minus, Search } from 'lucide-react';
import { useGamification } from '@/context/GamificationContext';
import { useLanguage } from '@/context/LanguageContext'; // Import LanguageContext

export default function MerchandiseShop() {
  const [merchandise, setMerchandise] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
  });
  const [availableCategories, setAvailableCategories] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const [userId, setUserId] = useState(null);
  const { recordPurchase } = useGamification();
  const { language, translations } = useLanguage();

  useEffect(() => {
    if (toastMessage) {
      toast(toastMessage);
      setToastMessage(null);
    }
  }, [toastMessage]);

  useEffect(() => {
    fetchAllNGOMerchandise();
    
    // Try to load cart from localStorage
    const savedCart = localStorage.getItem('ngoMerchandiseCart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error("Error parsing saved cart:", error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('ngoMerchandiseCart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Get current user ID on component mount
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });
    
    return () => unsubscribe();
  }, []);

  const fetchAllNGOMerchandise = async () => {
    setIsLoading(true);
    try {
      let allMerchandise = [];
      const categories = new Set();
      
      // First, fetch all NGOs from 'ngo' collection (singular)
      const ngoSingularCollection = collection(db, 'ngo');
      const ngoSingularSnapshot = await getDocs(ngoSingularCollection);
      
      // For each NGO in the singular collection, get their merchandise
      for (const ngoDoc of ngoSingularSnapshot.docs) {
        const ngoId = ngoDoc.id;
        const ngoData = ngoDoc.data();
        const ngoName = ngoData.name || ngoData.ngoName || "Unnamed NGO";
        
        const merchCollection = collection(db, 'ngo', ngoId, 'merchandise');
        const merchSnapshot = await getDocs(merchCollection);
        
        const ngoMerchandise = merchSnapshot.docs.map(doc => {
          const data = doc.data();
          if (data.category) categories.add(data.category);
          
          return {
            id: doc.id,
            ngoId: ngoId,
            ngoName: ngoName,
            ngoCollection: 'ngo', // Track which collection this came from
            ...data
          };
        });
        
        allMerchandise = [...allMerchandise, ...ngoMerchandise];
      }
      
      // Then, fetch all NGOs from 'ngos' collection (plural)
      const ngosCollection = collection(db, 'ngos');
      const ngosSnapshot = await getDocs(ngosCollection);
      
      // For each NGO in the plural collection, get their merchandise
      for (const ngoDoc of ngosSnapshot.docs) {
        const ngoId = ngoDoc.id;
        const ngoData = ngoDoc.data();
        const ngoName = ngoData.name || ngoData.ngoName || "Unnamed NGO";
        
        const merchCollection = collection(db, 'ngos', ngoId, 'merchandise');
        const merchSnapshot = await getDocs(merchCollection);
        
        const ngoMerchandise = merchSnapshot.docs.map(doc => {
          const data = doc.data();
          if (data.category) categories.add(data.category);
          
          return {
            id: doc.id,
            ngoId: ngoId,
            ngoName: ngoName,
            ngoCollection: 'ngos', // Track which collection this came from
            ...data
          };
        });
        
        allMerchandise = [...allMerchandise, ...ngoMerchandise];
      }
      
      // Filter to only available items with quantity > 0
      const availableMerchandise = allMerchandise.filter(item => 
        item.available && item.quantity > 0
      );
      
      console.log(`Found ${availableMerchandise.length} merchandise items across all NGOs`);
      setMerchandise(availableMerchandise);
      setAvailableCategories(Array.from(categories));
    } catch (error) {
      console.error("Error fetching merchandise:", error);
      setMerchandise([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredMerchandise = (category = null) => {
    let filtered = merchandise;
    
    if (category && category !== "all") {
      filtered = filtered.filter(item => item.category === category);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.description && item.description.toLowerCase().includes(query)) ||
        (item.ngoName && item.ngoName.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  };

  const addToCart = useCallback((item) => {
    setCartItems(prev => {
      // Check if item is already in cart
      const existingItemIndex = prev.findIndex(i => 
        i.id === item.id && i.ngoId === item.ngoId && i.ngoCollection === item.ngoCollection
      );
      let updatedItems = [...prev];
      
      if (existingItemIndex >= 0) {
        // Item exists, increment quantity if possible
        const currentQty = updatedItems[existingItemIndex].quantity;
        
        // Check if we have enough stock
        if (currentQty < item.quantity) {
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: currentQty + 1
          };
          
          // Queue toast notification
          setToastMessage({
            title: translations.added_to_cart || "Added to cart",
            description: `${item.name} ${translations.quantity_updated || "quantity updated"}`,
          });
          
          return updatedItems;
        } else {
          // Queue toast notification for max stock
          setToastMessage({
            title: translations.maximum_stock_reached || "Maximum stock reached",
            description: `${translations.only || "Only"} ${item.quantity} ${translations.items_available || "items available"}`,
            variant: "destructive"
          });
          return prev;
        }
      } else {
        // Item doesn't exist, add it
        // Queue toast notification
        setToastMessage({
          title: translations.added_to_cart || "Added to cart",
          description: `${item.name} ${translations.added_to_your_cart || "added to your cart"}`,
        });
        
        return [...prev, { ...item, quantity: 1 }];
      }
    });
  }, [translations]);

  const removeFromCart = useCallback((itemId, ngoId, ngoCollection) => {
    setCartItems(prev => prev.filter(item => 
      !(item.id === itemId && item.ngoId === ngoId && item.ngoCollection === ngoCollection)
    ));
    
    setToastMessage({
      title: translations.removed_from_cart || "Removed from cart",
      description: translations.item_removed_from_cart || "Item removed from your cart",
    });
  }, [translations]);

  const updateCartItemQuantity = useCallback((itemId, ngoId, ngoCollection, newQuantity) => {
    if (newQuantity < 1) return;
    
    // Find the original item to check stock limits
    const originalItem = merchandise.find(item => 
      item.id === itemId && item.ngoId === ngoId && item.ngoCollection === ngoCollection
    );
    
    if (!originalItem) return;
    
    if (newQuantity > originalItem.quantity) {
      setToastMessage({
        title: translations.maximum_stock_reached || "Maximum stock reached",
        description: `${translations.only || "Only"} ${originalItem.quantity} ${translations.items_available || "items available"}`,
        variant: "destructive"
      });
      return;
    }
    
    setCartItems(prev => 
      prev.map(item => 
        (item.id === itemId && item.ngoId === ngoId && item.ngoCollection === ngoCollection)
          ? { ...item, quantity: newQuantity } 
          : item
      )
    );
  }, [merchandise, translations]);

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    try {
      // Basic validation
      const requiredFields = ['name', 'email', 'phone', 'address', 'city', 'pincode'];
      const missingFields = requiredFields.filter(field => !customerInfo[field]);
      
      if (missingFields.length > 0) {
        setToastMessage({
          title: translations.fill_required_fields || "Please fill all required fields",
          description: `${translations.missing || "Missing"}: ${missingFields.join(', ')}`,
          variant: "destructive"
        });
        return;
      }
      
      // Ensure user is logged in
      if (!userId) {
        setToastMessage({
          title: translations.login_required || "Login Required",
          description: translations.login_to_complete || "Please log in to complete your purchase",
          variant: "destructive"
        });
        return;
      }
      
      // Generate timestamp for consistent order tracking
      const timestamp = Date.now();
      const purchaseDate = new Date();
      
      // Create formatted date string for document IDs
      const year = purchaseDate.getFullYear();
      const month = String(purchaseDate.getMonth() + 1).padStart(2, '0');
      const day = String(purchaseDate.getDate()).padStart(2, '0');
      const hours = String(purchaseDate.getHours()).padStart(2, '0');
      const minutes = String(purchaseDate.getMinutes()).padStart(2, '0');
      const seconds = String(purchaseDate.getSeconds()).padStart(2, '0');
      
      const formattedDate = `${year}${month}${day}`;
      const formattedTime = `${hours}${minutes}${seconds}`;
      
      // Create order in Firestore
      const orderData = {
        customer: customerInfo,
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          totalPrice: item.price * item.quantity,
          ngoId: item.ngoId,
          ngoName: item.ngoName,
          ngoCollection: item.ngoCollection
        })),
        totalAmount: calculateTotal(),
        status: 'pending',
        createdAt: purchaseDate,
        timestamp: timestamp,
        formattedDate: formattedDate,
        formattedTime: formattedTime,
        buyerId: userId // Add buyer's user ID to the main order
      };
      
      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      const orderId = orderRef.id;
      
      // Group items by NGO for better processing
      const itemsByNgo = {};
      cartItems.forEach(item => {
        const ngoKey = `${item.ngoCollection}|${item.ngoId}`;
        if (!itemsByNgo[ngoKey]) {
          itemsByNgo[ngoKey] = [];
        }
        itemsByNgo[ngoKey].push(item);
      });
      
      // Update inventory quantities and save sales data for each NGO's merchandise
      for (const ngoKey in itemsByNgo) {
        const [ngoCollection, ngoId] = ngoKey.split('|');
        const ngoItems = itemsByNgo[ngoKey];
        
        // Create a batch sale record for the NGO
        const saleData = {
          orderId: orderId,
          orderDate: purchaseDate,
          timestamp: timestamp,
          formattedDate: formattedDate,
          formattedTime: formattedTime,
          buyerId: userId,
          customer: {
            name: customerInfo.name,
            email: customerInfo.email,
            city: customerInfo.city,
            userId: userId
          },
          items: ngoItems.map(item => ({
            merchandiseId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            totalPrice: item.price * item.quantity,
            category: item.category || 'uncategorized'
          })),
          totalAmount: ngoItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          status: 'pending'
        };
        
        // Generate a timestamp-based ID with random suffix for the sales document
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const salesDocId = `${formattedTime}_${formattedDate}_${userId.substring(0, 5)}_${randomSuffix}`;
        
        // Add to NGO's sales subcollection with custom document ID
        const salesDocRef = doc(db, ngoCollection, ngoId, 'sales', salesDocId);
        await setDoc(salesDocRef, saleData);
        
        // Update each merchandise item's inventory and sales history
        for (const item of ngoItems) {
          const merchRef = doc(db, item.ngoCollection, item.ngoId, 'merchandise', item.id);
          const merchDoc = await getDoc(merchRef);
          
          if (merchDoc.exists()) {
            const currentQuantity = merchDoc.data().quantity;
            const newQuantity = Math.max(0, currentQuantity - item.quantity);
            
            // Get existing buyers or initialize empty array
            const existingBuyers = merchDoc.data().buyers || [];
            
            // Add this buyer if not already in the list
            if (!existingBuyers.includes(userId)) {
              existingBuyers.push(userId);
            }
            
            // Update merchandise data with new quantity and sales info
            await updateDoc(merchRef, {
              quantity: newQuantity,
              available: newQuantity > 0,
              lastSold: purchaseDate,
              soldCount: (merchDoc.data().soldCount || 0) + item.quantity,
              buyers: existingBuyers, // Add to buyers list for this merchandise
              lastBuyerId: userId // Track most recent buyer
            });
            
            // Generate timestamp-based ID for sales history with readable format
            const itemShortId = item.id.substring(0, 5);
            const salesHistoryId = `${formattedTime}_${formattedDate}_${item.category || 'item'}_${itemShortId}`;
            
            // Also add a record to merchandise sales history subcollection with timestamp-based ID
            const salesHistoryRef = doc(db, item.ngoCollection, item.ngoId, 'merchandise', item.id, 'salesHistory', salesHistoryId);
            await setDoc(salesHistoryRef, {
              buyerId: userId,
              orderId: orderId,
              quantity: item.quantity,
              price: item.price,
              totalPrice: item.price * item.quantity,
              purchaseDate: purchaseDate,
              timestamp: timestamp,
              formattedDate: formattedDate,
              formattedTime: formattedTime,
              customerName: customerInfo.name
            });
          }
        }
      }
      
      // Record purchase for gamification
      try {
        // Extract and prepare relevant data for gamification system
        const purchaseData = {
          items: cartItems.map(item => ({
            id: item.id,
            category: item.category || 'uncategorized',
            tags: item.tags || [],
            price: item.price,
            quantity: item.quantity
          })),
          ngoId: Object.keys(itemsByNgo)[0].split('|')[1], // Use first NGO for simplicity
          totalAmount: calculateTotal()
        };
        
        // Record the purchase in the gamification system
        const gamificationResult = await recordPurchase(purchaseData);
        
        if (gamificationResult?.pointsAwarded) {
          // Add a message about points earned
          setToastMessage({
            title: translations.order_placed_successfully || "Order placed successfully!",
            description: `${translations.order || "Order"} #${orderId.slice(0, 8)} ${translations.has_been_placed || "has been placed"}. ${translations.you_earned || "You earned"} ${gamificationResult.pointsAwarded} ${translations.points || "points"}!`,
          });
        } else {
          setToastMessage({
            title: translations.order_placed_successfully || "Order placed successfully!",
            description: `${translations.order || "Order"} #${orderId.slice(0, 8)} ${translations.has_been_placed || "has been placed"}`,
          });
        }
      } catch (gamificationError) {
        console.error("Error recording gamification:", gamificationError);
        // Still show success message even if gamification fails
        setToastMessage({
          title: translations.order_placed_successfully || "Order placed successfully!",
          description: `${translations.order || "Order"} #${orderId.slice(0, 8)} ${translations.has_been_placed || "has been placed"}`,
        });
      }
      
      // Clear cart
      setCartItems([]);
      localStorage.removeItem('ngoMerchandiseCart');
      
      setIsCheckoutOpen(false);
    } catch (error) {
      console.error("Error processing order:", error);
      setToastMessage({
        title: translations.checkout_failed || "Checkout failed",
        description: translations.error_processing_order || "There was an error processing your order",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">{translations.ngo_merchandise_shop || "NGO Merchandise Shop"}</h1>
        
        <div className="flex w-full md:w-auto space-x-2">
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder={translations.search_merchandise || "Search merchandise..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10"
            />
          </div>
          
          <Button
            onClick={() => setIsCartOpen(true)}
            className="bg-[#1CAC78] hover:bg-[#158f63] relative"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartItems.length > 0 && (
              <Badge className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-red-500">
                {cartItems.reduce((total, item) => total + item.quantity, 0)}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="all">{translations.all || "All"}</TabsTrigger>
          {availableCategories.map(category => (
            <TabsTrigger key={category} value={category}>{category}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <h2 className="text-2xl font-semibold">{translations.all_merchandise || "All Merchandise"}</h2>
          
          {isLoading ? (
            <div className="py-12 text-center">
              <p>{translations.loading_merchandise || "Loading merchandise..."}</p>
            </div>
          ) : getFilteredMerchandise().length === 0 ? (
            <div className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{translations.no_merchandise_found || "No merchandise found"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {getFilteredMerchandise().map((item) => (
                <ProductCard
                  key={`${item.ngoCollection}-${item.ngoId}-${item.id}`}
                  item={item}
                  onAddToCart={() => addToCart(item)}
                  translations={translations}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {availableCategories.map(category => (
          <TabsContent key={category} value={category} className="space-y-4">
            <h2 className="text-2xl font-semibold">{category}</h2>
            
            {isLoading ? (
              <div className="py-12 text-center">
                <p>{translations.loading_merchandise || "Loading merchandise..."}</p>
              </div>
            ) : getFilteredMerchandise(category).length === 0 ? (
              <div className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{translations.no_merchandise_in_category || "No merchandise found in this category"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {getFilteredMerchandise(category).map((item) => (
                  <ProductCard
                    key={`${item.ngoCollection}-${item.ngoId}-${item.id}`}
                    item={item}
                    onAddToCart={() => addToCart(item)}
                    translations={translations}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Shopping Cart Dialog */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              {translations.your_shopping_cart || "Your Shopping Cart"}
            </DialogTitle>
          </DialogHeader>
          
          {cartItems.length === 0 ? (
            <div className="py-6 text-center">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">{translations.cart_empty || "Your cart is empty"}</p>
              <Button 
                className="mt-4" 
                variant="outline" 
                onClick={() => setIsCartOpen(false)}
              >
                {translations.continue_shopping || "Continue Shopping"}
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 max-h-[60vh] overflow-auto py-2">
                {cartItems.map((item) => (
                  <div key={`${item.ngoCollection}-${item.ngoId}-${item.id}`} className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-16 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                        {item.image && item.image !== 'na' ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium truncate max-w-[150px]">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">₹{item.price} {translations.each || "each"}</p>
                        <p className="text-xs text-muted-foreground">{item.ngoName}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center border rounded-md">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-none"
                          onClick={() => updateCartItemQuantity(item.id, item.ngoId, item.ngoCollection, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        
                        <span className="w-8 text-center">{item.quantity}</span>
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-none"
                          onClick={() => updateCartItemQuantity(item.id, item.ngoId, item.ngoCollection, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500"
                        onClick={() => removeFromCart(item.id, item.ngoId, item.ngoCollection)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between font-semibold text-lg mb-4">
                  <span>{translations.total || "Total"}:</span>
                  <span>₹{calculateTotal().toFixed(2)}</span>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setIsCartOpen(false)}
                  >
                    {translations.continue_shopping || "Continue Shopping"}
                  </Button>
                  
                  <Button 
                    className="flex-1 bg-[#1CAC78] hover:bg-[#158f63]"
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsCheckoutOpen(true);
                    }}
                  >
                    {translations.checkout || "Checkout"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{translations.checkout || "Checkout"}</DialogTitle>
            <DialogDescription>
              {translations.complete_order_info || "Complete your order by providing shipping information."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">{translations.full_name || "Full Name"}</Label>
                <Input
                  id="name"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                  placeholder={translations.enter_full_name || "Enter your full name"}
                />
              </div>
              
              <div>
                <Label htmlFor="email">{translations.email || "Email"}</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                  placeholder={translations.your_email || "your@email.com"}
                />
              </div>
              
              <div>
                <Label htmlFor="phone">{translations.phone || "Phone"}</Label>
                <Input
                  id="phone"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                  placeholder={translations.your_phone_number || "Your phone number"}
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="address">{translations.address || "Address"}</Label>
                <Input
                  id="address"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                  placeholder={translations.your_shipping_address || "Your shipping address"}
                />
              </div>
              
              <div>
                <Label htmlFor="city">{translations.city || "City"}</Label>
                <Input
                  id="city"
                  value={customerInfo.city}
                  onChange={(e) => setCustomerInfo({...customerInfo, city: e.target.value})}
                  placeholder={translations.your_city || "Your city"}
                />
              </div>
              
              <div>
                <Label htmlFor="pincode">{translations.pincode || "PIN Code"}</Label>
                <Input
                  id="pincode"
                  value={customerInfo.pincode}
                  onChange={(e) => setCustomerInfo({...customerInfo, pincode: e.target.value})}
                  placeholder={translations.pin_code || "PIN code"}
                />
              </div>
            </div>
            
            {/* Order Summary */}
            <div>
              <h3 className="font-semibold mb-2">{translations.order_summary || "Order Summary"}</h3>
              <div className="max-h-[200px] overflow-auto border rounded-md p-2">
                {cartItems.map((item) => (
                  <div key={`${item.ngoCollection}-${item.ngoId}-${item.id}`} className="flex justify-between py-1 border-b last:border-b-0">
                    <div>
                      <span>{item.name} × {item.quantity}</span>
                      <div className="text-xs text-muted-foreground">{translations.from || "From"}: {item.ngoName}</div>
                    </div>
                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-semibold mt-2">
                <span>{translations.total || "Total"}:</span>
                <span>₹{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCheckoutOpen(false);
                setIsCartOpen(true);
              }}
            >
              {translations.back_to_cart || "Back to Cart"}
            </Button>
            <Button 
              className="bg-[#1CAC78] hover:bg-[#158f63]"
              onClick={handleCheckout}
            >
              {translations.place_order || "Place Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductCard({ item, onAddToCart }) {
  const isDiscounted = item.discountPrice && item.discountPrice < item.price;
  const { translations } = useLanguage();
  
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-md">
      <div className="aspect-square bg-muted overflow-hidden">
        {item.image && item.image !== 'na' ? (
          <img
            src={item.image}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-muted">
            <Package className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
      </div>
      
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-lg truncate">{item.name}</CardTitle>
        <div className="flex items-center space-x-2 mt-1">
          {item.category && (
            <Badge variant="outline" className="text-xs">
              {item.category}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            {item.ngoName}
          </Badge>
          {item.quantity <= 5 && (
            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                {translations.low_stock || "Low Stock"}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        <p className="text-sm text-muted-foreground line-clamp-2 h-10">
          {item.description || "No description available"}
        </p>
        
        <div className="mt-2 flex items-center">
          {isDiscounted ? (
            <>
              <span className="text-lg font-bold">₹{item.discountPrice}</span>
              <span className="text-sm text-muted-foreground line-through ml-2">
                ₹{item.price}
              </span>
            </>
          ) : (
            <span className="text-lg font-bold">₹{item.price}</span>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full bg-[#1CAC78] hover:bg-[#158f63]"
          onClick={onAddToCart}
        >
          {translations.add_to_cart || "Add to Cart"}
        </Button>
      </CardFooter>
    </Card>
  );
}