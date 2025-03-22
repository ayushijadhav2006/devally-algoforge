"use client"

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FileImage, Search, ShoppingBag } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getAuth } from "firebase/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function UserMerchandisePage() {
  const [merchandise, setMerchandise] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availableNGOs, setAvailableNGOs] = useState([]);
  const [selectedNGO, setSelectedNGO] = useState("all");

  useEffect(() => {
    fetchNGOs();
  }, []);

  useEffect(() => {
    fetchMerchandise();
  }, [selectedNGO]);

  const fetchNGOs = async () => {
    try {
      const ngosCollection = collection(db, "ngos");
      const ngoSnapshot = await getDocs(ngosCollection);
      const ngoList = ngoSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || doc.data().ngoName || "Unnamed NGO",
        ...doc.data()
      }));

      // Also check the singular 'ngo' collection if it exists
      const ngoSingularCollection = collection(db, "ngo");
      const ngoSingularSnapshot = await getDocs(ngoSingularCollection);
      const ngoSingularList = ngoSingularSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || doc.data().ngoName || "Unnamed NGO",
        collection: "ngo", // Mark which collection it came from
        ...doc.data()
      }));

      const combinedNGOs = [...ngoList.map(ngo => ({ ...ngo, collection: "ngos" })), ...ngoSingularList];
      setAvailableNGOs(combinedNGOs);
    } catch (error) {
      console.error("Error fetching NGOs:", error);
      toast({
        title: "Error",
        description: "Failed to load NGO data",
        variant: "destructive"
      });
    }
  };

  const fetchMerchandise = async () => {
    setIsLoading(true);
    try {
      let merchandiseItems = [];

      if (selectedNGO === "all") {
        // Fetch merchandise from all NGOs
        for (const ngo of availableNGOs) {
          const ngoCollection = ngo.collection || "ngos"; // Default to plural if not specified
          const merchPath = `${ngoCollection}/${ngo.id}/merchandise`;
          console.log(`Fetching merchandise from ${merchPath}`);
          
          const merchCollectionRef = collection(db, ngoCollection, ngo.id, 'merchandise');
          const merchSnapshot = await getDocs(merchCollectionRef);
          
          const ngoMerchandise = merchSnapshot.docs.map(doc => ({
            id: doc.id,
            ngoId: ngo.id,
            ngoName: ngo.name,
            ngoCollection: ngoCollection,
            ...doc.data()
          }));
          
          merchandiseItems = [...merchandiseItems, ...ngoMerchandise];
        }
      } else {
        // Fetch merchandise from the selected NGO
        const selectedNGOData = availableNGOs.find(ngo => ngo.id === selectedNGO);
        if (selectedNGOData) {
          const ngoCollection = selectedNGOData.collection || "ngos";
          const merchPath = `${ngoCollection}/${selectedNGO}/merchandise`;
          console.log(`Fetching merchandise from ${merchPath}`);
          
          const merchCollectionRef = collection(db, ngoCollection, selectedNGO, 'merchandise');
          const merchSnapshot = await getDocs(merchCollectionRef);
          
          merchandiseItems = merchSnapshot.docs.map(doc => ({
            id: doc.id,
            ngoId: selectedNGO,
            ngoName: selectedNGOData.name,
            ngoCollection: ngoCollection,
            ...doc.data()
          }));
        }
      }

      // Only show merchandise that is available and has quantity > 0
      merchandiseItems = merchandiseItems.filter(item => item.available && item.quantity > 0);
      
      console.log(`Found ${merchandiseItems.length} available merchandise items`);
      setMerchandise(merchandiseItems);
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

  // Filter merchandise based on search query and category
  const filteredMerchandise = merchandise.filter((item) => {
    const matchesSearch = item.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category?.toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  // Get unique categories from merchandise
  const uniqueCategories = [...new Set(merchandise.map(item => item.category))].filter(Boolean);

  const addToCart = (item) => {
    // Placeholder for cart functionality
    toast({
      title: "Added to Cart",
      description: `${item.name} has been added to your cart.`
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">NGO Merchandise</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search merchandise..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {uniqueCategories.map(category => (
              <SelectItem key={category} value={category.toLowerCase()}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={selectedNGO} onValueChange={setSelectedNGO}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select NGO" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All NGOs</SelectItem>
            {availableNGOs.map(ngo => (
              <SelectItem key={ngo.id} value={ngo.id}>{ngo.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-10">Loading merchandise...</div>
      ) : filteredMerchandise.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-xl">No merchandise items found.</p>
          <p className="text-gray-500 mt-2">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredMerchandise.map((item) => (
            <Card key={`${item.ngoId}-${item.id}`} className="overflow-hidden">
              <div className="w-full h-48 bg-gray-100">
                {item.image && item.image !== 'na' ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileImage className="h-16 w-16 text-gray-300" />
                  </div>
                )}
              </div>
              
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{item.name}</CardTitle>
                  <Badge variant="outline">{item.category || 'Uncategorized'}</Badge>
                </div>
                <CardDescription>
                  From: {item.ngoName || 'Unknown NGO'}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <p className="text-sm mb-4">
                  {item.description || 'No description available.'}
                </p>
                <div className="flex justify-between items-center">
                  <p className="text-lg font-bold">₹{item.price}</p>
                  <p className="text-sm text-gray-500">{item.quantity} available</p>
                </div>
              </CardContent>
              
              <CardFooter>
                <Button className="w-full bg-[#1CAC78] hover:bg-[#158f63]" onClick={() => addToCart(item)}>
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Add to Cart
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
