"use client"

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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

export default function MerchandiseManagement() {
  const [merchandise, setMerchandise] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openAnalyticsDialog, setOpenAnalyticsDialog] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [newItem, setNewItem] = useState({
    name: '',
    price: 0,
    quantity: 0,
    image: 'na',
    available: true,
    description: '',
    category: 'clothing'
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
    ]
  });

  useEffect(() => {
    fetchMerchandise();
  }, []);

  const fetchMerchandise = async () => {
    setIsLoading(true);
    try {
      const merchCollection = collection(db, 'merchandise');
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

  const handleAddMerchandise = async () => {
    try {
      await addDoc(collection(db, 'merchandise'), {
        ...newItem,
        price: Number(newItem.price),
        quantity: Number(newItem.quantity)
      });
      setOpenAddDialog(false);
      setNewItem({
        name: '',
        price: 0,
        quantity: 0,
        image: 'na',
        available: true,
        description: '',
        category: 'clothing'
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
    try {
      const docRef = doc(db, 'merchandise', currentItem.id);
      await updateDoc(docRef, {
        ...currentItem,
        price: Number(currentItem.price),
        quantity: Number(currentItem.quantity)
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
    try {
      const docRef = doc(db, 'merchandise', currentItem.id);
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
      monthlySales
    });
  };

  const handleViewAnalytics = (item) => {
    setCurrentItem(item);
    generateMockAnalytics(item);
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
                    setCurrentItem({...item});
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
                      setCurrentItem({...item});
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
                      setCurrentItem({...item});
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Sales Analytics: {currentItem?.name}</DialogTitle>
            <DialogDescription>
              View sales performance for this merchandise item.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
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
                      <p className="text-2xl font-bold">₹{analyticData.revenue}</p>
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
            
            <Card>
              <CardHeader>
                <CardTitle>Monthly Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] w-full">
                  {/* A simple bar chart visualization - in a real app, you'd use a proper chart library */}
                  <div className="flex h-full items-end space-x-2">
                    {analyticData.monthlySales.map((month) => (
                      <div key={month.month} className="flex flex-col items-center flex-1">
                        <div 
                          className="w-full bg-primary rounded-t" 
                          style={{ 
                            height: `${(month.sales / Math.max(...analyticData.monthlySales.map(m => m.sales))) * 150}px`,
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
          </div>
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