"use client"

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { ShoppingCart, Package, X, ShoppingBag, Plus, Minus } from 'lucide-react';

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

  useEffect(() => {
    fetchMerchandise();
    
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

  const fetchMerchandise = async () => {
    setIsLoading(true);
    try {
      const merchCollection = collection(db, 'merchandise');
      const merchSnapshot = await getDocs(merchCollection);
      const merchList = merchSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(item => item.available && item.quantity > 0);
      
      setMerchandise(merchList);
    } catch (error) {
      console.error("Error fetching merchandise:", error);
      // Move toast to useEffect to avoid calling during render
      setMerchandise([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Add error handling in useEffect
  useEffect(() => {
    fetchMerchandise().catch(error => {
      toast({
        title: "Error",
        description: "Failed to load merchandise items",
        variant: "destructive"
      });
    });
  }, []);

  const getFilteredMerchandise = (category = null) => {
    let filtered = merchandise;
    
    if (category && category !== "all") {
      filtered = filtered.filter(item => item.category === category);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  };

  const addToCart = (item) => {
    setCartItems(prev => {
      // Check if item is already in cart
      const existingItemIndex = prev.findIndex(i => i.id === item.id);
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
          return updatedItems;
        }
        return prev;
      } else {
        // Item doesn't exist, add it
        return [...prev, { ...item, quantity: 1 }];
      }
    });

    // Move toast notifications outside of setState
    const existingItem = cartItems.find(i => i.id === item.id);
    if (existingItem) {
      if (existingItem.quantity < item.quantity) {
        toast({
          title: "Added to cart",
          description: `${item.name} quantity updated`,
        });
      } else {
        toast({
          title: "Maximum stock reached",
          description: `Only ${item.quantity} items available`,
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Added to cart",
        description: `${item.name} added to your cart`,
      });
    }
  };

  const removeFromCart = (itemId) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
    // Move toast outside of setState
    setTimeout(() => {
      toast({
        title: "Removed from cart",
        description: "Item removed from your cart",
      });
    }, 0);
  };

  const updateCartItemQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    // Find the original item to check stock limits
    const originalItem = merchandise.find(item => item.id === itemId);
    if (!originalItem) return;
    
    if (newQuantity > originalItem.quantity) {
      toast({
        title: "Maximum stock reached",
        description: `Only ${originalItem.quantity} items available`,
        variant: "destructive"
      });
      return;
    }
    
    setCartItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, quantity: newQuantity } 
          : item
      )
    );
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    try {
      // Basic validation
      const requiredFields = ['name', 'email', 'phone', 'address', 'city', 'pincode'];
      const missingFields = requiredFields.filter(field => !customerInfo[field]);
      
      if (missingFields.length > 0) {
        toast({
          title: "Please fill all required fields",
          description: `Missing: ${missingFields.join(', ')}`,
          variant: "destructive"
        });
        return;
      }
      
      // Create order in Firestore
      const orderData = {
        customer: customerInfo,
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          totalPrice: item.price * item.quantity
        })),
        totalAmount: calculateTotal(),
        status: 'pending',
        createdAt: new Date()
      };
      
      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Update inventory quantities
      for (const item of cartItems) {
        const merchRef = doc(db, 'merchandise', item.id);
        const merchDoc = await getDoc(merchRef);
        
        if (merchDoc.exists()) {
          const currentQuantity = merchDoc.data().quantity;
          const newQuantity = Math.max(0, currentQuantity - item.quantity);
          
          await updateDoc(merchRef, {
            quantity: newQuantity,
            available: newQuantity > 0
          });
        }
      }
      
      // Clear cart
      setCartItems([]);
      localStorage.removeItem('ngoMerchandiseCart');
      
      // Move success toast to after state updates
      setTimeout(() => {
        toast({
          title: "Order placed successfully!",
          description: `Order #${orderRef.id.slice(0, 8)} has been placed`,
        });
      }, 0);
      
      setIsCheckoutOpen(false);
    } catch (error) {
      console.error("Error processing order:", error);
      toast({
        title: "Checkout failed",
        description: "There was an error processing your order",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold mb-4 md:mb-0">NGO Merchandise Shop</h1>
        
        <div className="flex w-full md:w-auto space-x-2">
          <div className="relative w-full md:w-64">
            <Input
              type="text"
              placeholder="Search merchandise..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
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
        <TabsList className="grid grid-cols-5 max-w-md mx-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="clothing">Clothing</TabsTrigger>
          <TabsTrigger value="accessories">Accessories</TabsTrigger>
          <TabsTrigger value="books">Books</TabsTrigger>
          <TabsTrigger value="stationery">Stationery</TabsTrigger>
        </TabsList>

        {Object.entries({
          all: "All Merchandise",
          clothing: "Clothing",
          accessories: "Accessories",
          books: "Books",
          stationery: "Stationery",
        }).map(([value, title]) => (
          <TabsContent key={value} value={value} className="space-y-4">
            <h2 className="text-2xl font-semibold">{title}</h2>
            
            {isLoading ? (
              <div className="py-12 text-center">
                <p>Loading merchandise...</p>
              </div>
            ) : getFilteredMerchandise(value === "all" ? null : value).length === 0 ? (
              <div className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No merchandise found in this category</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {getFilteredMerchandise(value === "all" ? null : value).map((item) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    onAddToCart={() => addToCart(item)}
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
              Your Shopping Cart
            </DialogTitle>
          </DialogHeader>
          
          {cartItems.length === 0 ? (
            <div className="py-6 text-center">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Your cart is empty</p>
              <Button 
                className="mt-4" 
                variant="outline" 
                onClick={() => setIsCartOpen(false)}
              >
                Continue Shopping
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 max-h-[60vh] overflow-auto py-2">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b pb-4">
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
                        <p className="text-sm text-muted-foreground">₹{item.price} each</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center border rounded-md">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-none"
                          onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        
                        <span className="w-8 text-center">{item.quantity}</span>
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-none"
                          onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between font-semibold text-lg mb-4">
                  <span>Total:</span>
                  <span>₹{calculateTotal().toFixed(2)}</span>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setIsCartOpen(false)}
                  >
                    Continue Shopping
                  </Button>
                  
                  <Button 
                    className="flex-1 bg-[#1CAC78] hover:bg-[#158f63]"
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsCheckoutOpen(true);
                    }}
                  >
                    Checkout
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
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>
              Complete your order by providing shipping information.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                  placeholder="Enter your full name"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                  placeholder="your@email.com"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                  placeholder="Your phone number"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                  placeholder="Your shipping address"
                />
              </div>
              
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={customerInfo.city}
                  onChange={(e) => setCustomerInfo({...customerInfo, city: e.target.value})}
                  placeholder="Your city"
                />
              </div>
              
              <div>
                <Label htmlFor="pincode">PIN Code</Label>
                <Input
                  id="pincode"
                  value={customerInfo.pincode}
                  onChange={(e) => setCustomerInfo({...customerInfo, pincode: e.target.value})}
                  placeholder="PIN code"
                />
              </div>
            </div>
            
            {/* Order Summary */}
            <div>
              <h3 className="font-semibold mb-2">Order Summary</h3>
              <div className="max-h-[200px] overflow-auto border rounded-md p-2">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between py-1 border-b last:border-b-0">
                    <span>{item.name} × {item.quantity}</span>
                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-semibold mt-2">
                <span>Total:</span>
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
              Back to Cart
            </Button>
            <Button 
              className="bg-[#1CAC78] hover:bg-[#158f63]"
              onClick={handleCheckout}
            >
              Place Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductCard({ item, onAddToCart }) {
  const isDiscounted = item.discountPrice && item.discountPrice < item.price;
  
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
          {item.quantity <= 5 && (
            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
              Low Stock
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
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
}