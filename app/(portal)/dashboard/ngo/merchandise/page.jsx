"use client"

import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, query, where, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, FileImage, Edit, Trash2, PlusCircle, ShoppingBag, LineChart, DollarSign, Package } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getAuth } from "firebase/auth";

export default function MerchandiseManagement() {
  const [merchandise, setMerchandise] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openAnalyticsDialog, setOpenAnalyticsDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [ngoId, setNgoId] = useState(null);
  const [ngoCollection, setNgoCollection] = useState("ngo"); // Default to singular collection
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  const [newItem, setNewItem] = useState({
    name: '',
    price: 0,
    quantity: 0,
    image: 'na',
    available: true,
    description: '',
    category: 'clothing',
    otherCategory: ''
  });

  // Mock analytics data
  const [analyticData, setAnalyticData] = useState({
    totalSold: 0,
    revenue: 0,
    monthlySales: [
      { month: 'Jan', sales: 0 },
      { month: 'Feb', sales: 0 },
      { month: 'Mar', sales: 0 },
      { month: 'Apr', sales: 0 },
      { month: 'May', sales: 0 },
      { month: 'Jun', sales: 0 }
    ],
    recentSales: [],
    topBuyers: []
  });

  useEffect(() => {
    // Get the currently logged in NGO's ID
    const getCurrentNgoId = async () => {
      try {
        // Get the current user from Firebase Auth
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (user) {
          const userId = user.uid;
          
          // First approach: Check if the user document has an ngoId field
          const userDocRef = doc(db, "users", userId);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists() && userDoc.data().ngoId) {
            // If user document has ngoId, use it directly
            const ngoId = userDoc.data().ngoId;
            console.log("Found NGO ID in user document:", ngoId);
            setNgoId(ngoId);
            // For user documents, we need to determine which collection to use
            // Try to find if the ngoId exists in 'ngo' collection first
            const ngoDocRef = doc(db, "ngo", ngoId);
            const ngoDoc = await getDoc(ngoDocRef);
            if (ngoDoc.exists()) {
              setNgoCollection("ngo");
            } else {
              // Try 'ngos' collection as fallback
              const ngosDocRef = doc(db, "ngos", ngoId);
              const ngosDoc = await getDoc(ngosDocRef);
              if (ngosDoc.exists()) {
                setNgoCollection("ngos");
              }
            }
            return;
          }
          
          // Second approach: Try the "ngos" collection (plural)
          const ngosQuery = query(collection(db, "ngos"), where("userId", "==", userId));
          const ngosSnapshot = await getDocs(ngosQuery);
          
          if (!ngosSnapshot.empty) {
            const ngoDoc = ngosSnapshot.docs[0];
            console.log("Found NGO in 'ngos' collection:", ngoDoc.id);
            setNgoId(ngoDoc.id);
            setNgoCollection("ngos");
            return;
          }
          
          // Third approach: Try the "ngo" collection (singular)
          const ngoQuery = query(collection(db, "ngo"), where("userId", "==", userId));
          const ngoSnapshot = await getDocs(ngoQuery);
          
          if (!ngoSnapshot.empty) {
            const ngoDoc = ngoSnapshot.docs[0];
            console.log("Found NGO in 'ngo' collection:", ngoDoc.id);
            setNgoId(ngoDoc.id);
            setNgoCollection("ngo");
            return;
          }
          
          console.error("No NGO found for current user");
          toast({
            title: "Error",
            description: "Could not find NGO profile for your account",
            variant: "destructive"
          });
        } else {
          console.error("No user is logged in");
          toast({
            title: "Error",
            description: "You must be logged in to manage merchandise",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error getting NGO ID:", error);
      }
    };
    
    getCurrentNgoId();
  }, []);

  useEffect(() => {
    if (ngoId) {
      fetchMerchandise();
    }
  }, [ngoId]);

  const fetchMerchandise = async () => {
    if (!ngoId) return;
    
    setIsLoading(true);
    try {
      console.log(`Fetching merchandise from ${ngoCollection}/${ngoId}/merchandise`);
      // Reference to the merchandise subcollection under the NGO's document
      const merchCollection = collection(db, ngoCollection, ngoId, 'merchandise');
      const merchSnapshot = await getDocs(merchCollection);
      const merchList = merchSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMerchandise(merchList);
    } catch (error) {
      console.error("Error fetching merchandise:", error);
      toast({
        title: "Error",
        description: "Failed to load merchandise data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentItem({
          ...currentItem,
          newImage: file,
          imagePreview: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // This function prepares the currentItem for editing when the edit modal opens
  const prepareItemForEdit = (item) => {
    // Check if the category is one of the predefined categories
    const predefinedCategories = ['clothing', 'accessories', 'books', 'stationery', 'other'];
    const categoryIsCustom = !predefinedCategories.includes(item.category);
    
    const preparedItem = {
      ...item,
      // If the category is custom, set category to 'other' and otherCategory to the custom value
      category: categoryIsCustom ? 'other' : item.category,
      otherCategory: categoryIsCustom ? item.category : ''
    };
    
    return preparedItem;
  };

  const uploadImageToFirebase = async (file) => {
    if (!file) return null;
    
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name}`;
      const storageRef = ref(storage, `merchandise-images/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive"
      });
      return null;
    }
  };

  const handleAddMerchandise = async () => {
    if (!ngoId) {
      toast({
        title: "Error",
        description: "NGO ID not found. Please try again later.",
        variant: "destructive"
      });
      return;
    }
    
    setIsUploading(true);
    try {
      let imageUrl = 'na';
      
      if (selectedImage) {
        imageUrl = await uploadImageToFirebase(selectedImage);
        if (!imageUrl) {
          setIsUploading(false);
          return; // Stop if image upload failed
        }
      }

      // Generate a unique ID for the new merchandise
      const merchandiseRef = doc(collection(db, ngoCollection, ngoId, 'merchandise'));
      
      // Handle the category - use otherCategory if category is "other"
      const finalCategory = newItem.category === 'other' && newItem.otherCategory.trim() 
        ? newItem.otherCategory.trim() 
        : newItem.category;
      
      // Prepare the merchandise data
      const merchandiseData = {
        ...newItem,
        category: finalCategory, // Use the final category value
        price: Number(newItem.price),
        quantity: Number(newItem.quantity),
        image: imageUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
        ngoId: ngoId,
        id: merchandiseRef.id // Include the ID in the document data for easier reference
      };

      // Remove the otherCategory field as it's not needed in the database
      delete merchandiseData.otherCategory;

      // Set the document data with the generated ID
      await setDoc(merchandiseRef, merchandiseData);
      
      setOpenAddDialog(false);
      setNewItem({
        name: '',
        price: 0,
        quantity: 0,
        image: 'na',
        available: true,
        description: '',
        category: 'clothing',
        otherCategory: ''
      });
      toast({
        title: "Success",
        description: "Merchandise added successfully"
      });
      fetchMerchandise();
    } catch (error) {
      console.error("Error adding merchandise:", error);
      toast({
        title: "Error",
        description: "Failed to add merchandise",
        variant: "destructive"
      });
    }
  };

  const handleUpdateMerchandise = async () => {
    if (!ngoId) {
      toast({
        title: "Error",
        description: "NGO ID not found. Please try again later.",
        variant: "destructive"
      });
      return;
    }
    
    setIsUploading(true);
    try {
      let imageUrl = currentItem.image;
      
      if (currentItem.newImage) {
        imageUrl = await uploadImageToFirebase(currentItem.newImage);
        if (!imageUrl) {
          setIsUploading(false);
          return; // Stop if image upload failed
        }
      }

      const { newImage, imagePreview, otherCategory, ...itemToUpdate } = currentItem;
      
      // Handle the category - use otherCategory if category is "other"
      if (itemToUpdate.category === 'other' && otherCategory && otherCategory.trim()) {
        itemToUpdate.category = otherCategory.trim();
      }
      
      // Reference to the specific merchandise document in the NGO's subcollection
      const docRef = doc(db, ngoCollection, ngoId, 'merchandise', currentItem.id);
      
      // Update the merchandise data
      await updateDoc(docRef, {
        ...itemToUpdate,
        price: Number(itemToUpdate.price),
        quantity: Number(itemToUpdate.quantity),
        image: imageUrl,
        updatedAt: new Date(),
        ngoId: ngoId  // Ensure the NGO ID is still associated
      });
      setOpenEditDialog(false);
      toast({
        title: "Success",
        description: "Merchandise updated successfully"
      });
      fetchMerchandise();
    } catch (error) {
      console.error("Error updating merchandise:", error);
      toast({
        title: "Error",
        description: "Failed to update merchandise",
        variant: "destructive"
      });
    }
  };

  const handleDeleteMerchandise = async () => {
    if (!ngoId) {
      toast({
        title: "Error",
        description: "NGO ID not found. Please try again later.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Delete from the NGO's merchandise subcollection
      const docRef = doc(db, ngoCollection, ngoId, 'merchandise', currentItem.id);
      await deleteDoc(docRef);
      setOpenDeleteDialog(false);
      toast({
        title: "Success",
        description: "Merchandise deleted successfully"
      });
      fetchMerchandise();
    } catch (error) {
      console.error("Error deleting merchandise:", error);
      toast({
        title: "Error",
        description: "Failed to delete merchandise",
        variant: "destructive"
      });
    }
  };

  const generateMockAnalytics = (item) => {
    // In a real app, you would fetch this data from your database
    const totalSold = Math.floor(Math.random() * 50);
    const revenue = totalSold * item.price;
    
    const monthlySales = [
      { month: 'Jan', sales: Math.floor(Math.random() * 10) },
      { month: 'Feb', sales: Math.floor(Math.random() * 10) },
      { month: 'Mar', sales: Math.floor(Math.random() * 10) },
      { month: 'Apr', sales: Math.floor(Math.random() * 10) },
      { month: 'May', sales: Math.floor(Math.random() * 10) },
      { month: 'Jun', sales: Math.floor(Math.random() * 10) }
    ];
    
    setAnalyticData({
      totalSold,
      revenue,
      monthlySales,
      recentSales: [],
      topBuyers: [] 
    });
  };

  const fetchRealAnalytics = async (item) => {
    setIsLoading(true);
    try {
      // Fetch sales history directly from the merchandise's salesHistory subcollection
      const salesHistoryRef = collection(db, ngoCollection, ngoId, 'merchandise', item.id, 'salesHistory');
      const salesHistorySnapshot = await getDocs(salesHistoryRef);
      
      if (salesHistorySnapshot.empty) {
        console.log("No sales history found for this merchandise");
        // Set default values when no sales data is available
        setAnalyticData({
          totalSold: item.soldCount || 0,
          revenue: 0,
          monthlySales: [
            { month: 'Jan', sales: 0 },
            { month: 'Feb', sales: 0 },
            { month: 'Mar', sales: 0 },
            { month: 'Apr', sales: 0 },
            { month: 'May', sales: 0 },
            { month: 'Jun', sales: 0 }
          ],
          recentSales: [],
          topBuyers: []
        });
        setIsLoading(false);
        return;
      }
      
      // Process sales history data
      const salesHistory = salesHistorySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Calculate total sold and revenue
      const totalSold = item.soldCount || salesHistory.reduce((sum, sale) => sum + sale.quantity, 0);
      const revenue = salesHistory.reduce((sum, sale) => sum + sale.totalPrice, 0);
      
      // Process monthly sales data
      const currentYear = new Date().getFullYear();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Initialize all months with zero sales
      const monthlySalesMap = {};
      monthNames.forEach(month => {
        monthlySalesMap[month] = 0;
      });
      
      // Aggregate sales by month
      salesHistory.forEach(sale => {
        const saleDate = sale.purchaseDate ? new Date(sale.purchaseDate.toDate()) : new Date();
        // Only count sales from the current year
        if (saleDate.getFullYear() === currentYear) {
          const monthName = monthNames[saleDate.getMonth()];
          monthlySalesMap[monthName] += sale.quantity;
        }
      });
      
      // Convert to array format for chart display
      const monthlySales = monthNames.map(month => ({
        month,
        sales: monthlySalesMap[month]
      }));
      
      // Get recent sales (latest 5)
      const recentSales = [...salesHistory]
        .sort((a, b) => {
          const dateA = a.purchaseDate ? new Date(a.purchaseDate.toDate()) : new Date(0);
          const dateB = b.purchaseDate ? new Date(b.purchaseDate.toDate()) : new Date(0);
          return dateB - dateA;
        })
        .slice(0, 5);
      
      // Calculate top buyers
      const buyerMap = {};
      salesHistory.forEach(sale => {
        const buyerId = sale.buyerId || 'unknown';
        if (!buyerMap[buyerId]) {
          buyerMap[buyerId] = {
            buyerId,
            customerName: sale.customerName || 'Unknown Customer',
            totalQuantity: 0,
            totalSpent: 0,
            lastPurchase: null
          };
        }
        
        buyerMap[buyerId].totalQuantity += sale.quantity;
        buyerMap[buyerId].totalSpent += sale.totalPrice;
        
        const saleDate = sale.purchaseDate ? new Date(sale.purchaseDate.toDate()) : null;
        if (saleDate && (!buyerMap[buyerId].lastPurchase || saleDate > new Date(buyerMap[buyerId].lastPurchase))) {
          buyerMap[buyerId].lastPurchase = saleDate;
        }
      });
      
      // Get top 3 buyers by quantity
      const topBuyers = Object.values(buyerMap)
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 3);
      
      setAnalyticData({
        totalSold,
        revenue,
        monthlySales,
        recentSales,
        topBuyers
      });
      
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
      
      // Fallback to default values
      setAnalyticData({
        totalSold: item.soldCount || 0,
        revenue: 0,
        monthlySales: [
          { month: 'Jan', sales: 0 },
          { month: 'Feb', sales: 0 },
          { month: 'Mar', sales: 0 },
          { month: 'Apr', sales: 0 },
          { month: 'May', sales: 0 },
          { month: 'Jun', sales: 0 }
        ],
        recentSales: [],
        topBuyers: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewAnalytics = (item) => {
    setCurrentItem(item);
    
    // Use real analytics data if available, otherwise use mock data
    if (ngoId) {
      fetchRealAnalytics(item);
    } else {
      generateMockAnalytics(item);
    }
    
    setOpenAnalyticsDialog(true);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Merchandise Management</h1>
        <Button onClick={() => setOpenAddDialog(true)} className="bg-[#1CAC78] hover:bg-[#158f63]">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Merchandise
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Items</TabsTrigger>
          <TabsTrigger value="available">Available</TabsTrigger>
          <TabsTrigger value="outofstock">Out of Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <p>Loading merchandise...</p>
            ) : merchandise.length === 0 ? (
              <p>No merchandise items found.</p>
            ) : (
              merchandise.map((item) => (
                <MerchandiseCard 
                  key={item.id} 
                  item={item} 
                  onEdit={() => {
                    setCurrentItem(prepareItemForEdit({...item}));
                    setOpenEditDialog(true);
                  }}
                  onDelete={() => {
                    setCurrentItem(item);
                    setOpenDeleteDialog(true);
                  }}
                  onViewAnalytics={() => handleViewAnalytics(item)}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="available">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <p>Loading merchandise...</p>
            ) : (
              merchandise
                .filter(item => item.available && item.quantity > 0)
                .map((item) => (
                  <MerchandiseCard 
                    key={item.id} 
                    item={item} 
                    onEdit={() => {
                      setCurrentItem(prepareItemForEdit({...item}));
                      setOpenEditDialog(true);
                    }}
                    onDelete={() => {
                      setCurrentItem(item);
                      setOpenDeleteDialog(true);
                    }}
                    onViewAnalytics={() => handleViewAnalytics(item)}
                  />
                ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="outofstock">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <p>Loading merchandise...</p>
            ) : (
              merchandise
                .filter(item => !item.available || item.quantity <= 0)
                .map((item) => (
                  <MerchandiseCard 
                    key={item.id} 
                    item={item} 
                    onEdit={() => {
                      setCurrentItem(prepareItemForEdit({...item}));
                      setOpenEditDialog(true);
                    }}
                    onDelete={() => {
                      setCurrentItem(item);
                      setOpenDeleteDialog(true);
                    }}
                    onViewAnalytics={() => handleViewAnalytics(item)}
                  />
                ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Merchandise Dialog */}
      <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Merchandise</DialogTitle>
            <DialogDescription>
              Add a new merchandise item to your store.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newItem.name}
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Price
              </Label>
              <Input
                id="price"
                type="number"
                value={newItem.price}
                onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Quantity
              </Label>
              <Input
                id="quantity"
                type="number"
                value={newItem.quantity}
                onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Category
              </Label>
              <Select 
                value={newItem.category}
                onValueChange={(value) => setNewItem({...newItem, category: value})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clothing">Clothing</SelectItem>
                  <SelectItem value="accessories">Accessories</SelectItem>
                  <SelectItem value="books">Books</SelectItem>
                  <SelectItem value="stationery">Stationery</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Show text input for other category */}
            {newItem.category === 'other' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="otherCategory" className="text-right">
                  Specify Category
                </Label>
                <Input
                  id="otherCategory"
                  value={newItem.otherCategory}
                  onChange={(e) => setNewItem({...newItem, otherCategory: e.target.value})}
                  placeholder="Enter custom category"
                  className="col-span-3"
                />
              </div>
            )}

            {/* Add Image Upload Field */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="image" className="text-right">
                Image
              </Label>
              <div className="col-span-3">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  ref={fileInputRef}
                  className="col-span-3"
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="h-32 w-32 object-cover rounded-md" 
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={newItem.description}
                onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="available" className="text-right">
                Available
              </Label>
              <div className="col-span-3">
                <Switch
                  id="available"
                  checked={newItem.available}
                  onCheckedChange={(checked) => setNewItem({...newItem, available: checked})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpenAddDialog(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAddMerchandise}>
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Merchandise Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Merchandise</DialogTitle>
            <DialogDescription>
              Update merchandise details.
            </DialogDescription>
          </DialogHeader>
          {currentItem && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={currentItem.name}
                  onChange={(e) => setCurrentItem({...currentItem, name: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-price" className="text-right">
                  Price
                </Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={currentItem.price}
                  onChange={(e) => setCurrentItem({...currentItem, price: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-quantity" className="text-right">
                  Quantity
                </Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  value={currentItem.quantity}
                  onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-category" className="text-right">
                  Category
                </Label>
                <Select 
                  value={currentItem.category || 'clothing'}
                  onValueChange={(value) => setCurrentItem({...currentItem, category: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clothing">Clothing</SelectItem>
                    <SelectItem value="accessories">Accessories</SelectItem>
                    <SelectItem value="books">Books</SelectItem>
                    <SelectItem value="stationery">Stationery</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Show text input for other category in edit modal */}
              {currentItem.category === 'other' && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-otherCategory" className="text-right">
                    Specify Category
                  </Label>
                  <Input
                    id="edit-otherCategory"
                    value={currentItem.otherCategory || ''}
                    onChange={(e) => setCurrentItem({...currentItem, otherCategory: e.target.value})}
                    placeholder="Enter custom category"
                    className="col-span-3"
                  />
                </div>
              )}

              {/* Add Image Upload Field for Edit */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-image" className="text-right">
                  Image
                </Label>
                <div className="col-span-3">
                  <Input
                    id="edit-image"
                    type="file"
                    accept="image/*"
                    onChange={handleEditImageChange}
                    ref={editFileInputRef}
                    className="col-span-3"
                  />
                  {currentItem.imagePreview ? (
                    <div className="mt-2">
                      <img 
                        src={currentItem.imagePreview} 
                        alt="Preview" 
                        className="h-32 w-32 object-cover rounded-md" 
                      />
                    </div>
                  ) : currentItem.image && currentItem.image !== 'na' ? (
                    <div className="mt-2">
                      <img 
                        src={currentItem.image} 
                        alt="Current" 
                        className="h-32 w-32 object-cover rounded-md" 
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="edit-description"
                  value={currentItem.description || ''}
                  onChange={(e) => setCurrentItem({...currentItem, description: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-available" className="text-right">
                  Available
                </Label>
                <div className="col-span-3">
                  <Switch
                    id="edit-available"
                    checked={currentItem.available}
                    onCheckedChange={(checked) => setCurrentItem({...currentItem, available: checked})}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpenEditDialog(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleUpdateMerchandise}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this merchandise item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpenDeleteDialog(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteMerchandise}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={openAnalyticsDialog} onOpenChange={setOpenAnalyticsDialog}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Sales Analytics: {currentItem?.name}</DialogTitle>
            <DialogDescription>
              View sales performance for this merchandise item.
            </DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <div className="py-6 text-center">
              <p>Loading analytics data...</p>
            </div>
          ) : (
            <div className="py-4">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Sold</p>
                        <p className="text-2xl font-bold">{analyticData.totalSold}</p>
                      </div>
                      <ShoppingBag className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                        <p className="text-2xl font-bold">₹{analyticData.revenue.toFixed(2)}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Current Stock</p>
                        <p className="text-2xl font-bold">{currentItem?.quantity || 0}</p>
                      </div>
                      <Package className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Main Content Area - 2 Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column - Monthly Sales */}
                <Card className="md:row-span-2 h-full">
                  <CardHeader>
                    <CardTitle>Monthly Sales ({new Date().getFullYear()})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      {/* A simple bar chart visualization - in a real app, you'd use a proper chart library */}
                      <div className="flex h-full items-end space-x-2">
                        {analyticData.monthlySales.map((month) => (
                          <div key={month.month} className="flex flex-col items-center flex-1">
                            <div 
                              className="w-full bg-primary rounded-t" 
                              style={{ 
                                height: `${(month.sales / Math.max(...analyticData.monthlySales.map(m => m.sales) || 1)) * 250}px`,
                                minHeight: month.sales > 0 ? '10px' : '0px'
                              }}
                            />
                            <div className="text-xs mt-2">{month.month}</div>
                            <div className="text-xs font-medium">{month.sales}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Right Column - Top Section */}
                {analyticData.recentSales.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {analyticData.recentSales.map((sale, index) => {
                          const date = sale.purchaseDate ? new Date(sale.purchaseDate.toDate()) : null;
                          return (
                            <div key={index} className="flex justify-between items-center border-b pb-2">
                              <div>
                                <p className="font-medium">{sale.customerName || 'Unknown Customer'}</p>
                                <p className="text-sm text-muted-foreground">
                                  {date ? date.toLocaleDateString() : 'Unknown date'} • Qty: {sale.quantity}
                                </p>
                              </div>
                              <p className="font-medium">₹{sale.totalPrice.toFixed(2)}</p>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Right Column - Bottom Section */}
                {analyticData.topBuyers.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Buyers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {analyticData.topBuyers.map((buyer, index) => (
                          <div key={index} className="flex justify-between items-center border-b pb-2">
                            <div>
                              <p className="font-medium">{buyer.customerName}</p>
                              <p className="text-sm text-muted-foreground">
                                Total purchases: {buyer.totalQuantity} items
                              </p>
                            </div>
                            <p className="font-medium">₹{buyer.totalSpent.toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" onClick={() => setOpenAnalyticsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MerchandiseCard({ item, onEdit, onDelete, onViewAnalytics }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{item.name}</CardTitle>
          <Badge variant={item.available && item.quantity > 0 ? "success" : "destructive"}>
            {item.available && item.quantity > 0 ? "Available" : "Out of Stock"}
          </Badge>
        </div>
        <CardDescription>
          {item.category || 'No category'} 
          {item.description && ` - ${item.description}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-2">
          <div className="bg-muted h-32 rounded-md flex items-center justify-center">
            {item.image !== 'na' ? (
              <img 
                src={item.image} 
                alt={item.name} 
                className="h-full w-full object-cover rounded-md" 
              />
            ) : (
              <FileImage className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
          <div className="flex justify-between items-center mt-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Price</p>
              <p className="text-lg font-bold">₹{item.price}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Stock</p>
              <p className="text-lg font-bold">{item.quantity}</p>
            </div>
          </div>
        </div>
      </CardContent>
      <div className="flex justify-between p-4 pt-0">
        <Button variant="outline" size="sm" onClick={onViewAnalytics}>
          <BarChart className="mr-2 h-4 w-4" />
          Analytics
        </Button>
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}