"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Filter, Calendar, MapPin, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { db, storage } from "@/lib/firebase"; // You'll need to create this firebase config file
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, doc, getDoc, where, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { toast } from "@/hooks/use-toast";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customCategory, setCustomCategory] = useState("");
  const [ngoId, setNgoId] = useState(null);
  const [ngoCollection, setNgoCollection] = useState("ngo"); // Default to singular collection
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  
  // Form state
  const [productData, setProductData] = useState({
    productName: "",
    category: "",
    quantity: "",
    description: "",
    productImage: "", // You might want to use Firebase Storage for actual image upload
  });

  // First, get the NGO ID of the authenticated user
  useEffect(() => {
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
            description: "You must be logged in to manage products",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error getting NGO ID:", error);
      }
    };
    
    getCurrentNgoId();
  }, []);

  // Fetch products from Firestore once we have the NGO ID
  useEffect(() => {
    if (!ngoId) return;
    
    const fetchProducts = async () => {
      try {
        setLoading(true);
        console.log(`Fetching products from ${ngoCollection}/${ngoId}/products`);
        
        // Reference to the products subcollection under the NGO's document
        const productsCollection = collection(db, ngoCollection, ngoId, 'products');
        const productsSnapshot = await getDocs(productsCollection);
        
        const productsData = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        setProducts(productsData);
      } catch (error) {
        console.error("Error fetching products: ", error);
        toast({
          title: "Error",
          description: "Failed to load product data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [ngoId, ngoCollection]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProductData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (value, field) => {
    setProductData((prev) => ({
      ...prev,
      [field]: value,
    }));
    
    // Reset custom category when another category is selected
    if (field === "category" && value !== "Other") {
      setCustomCategory("");
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

  const uploadImageToFirebase = async (file) => {
    if (!file) return null;
    
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name}`;
      const storageRef = ref(storage, `product-images/${fileName}`);
      
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!ngoId) {
      toast({
        title: "Error",
        description: "NGO ID not found. Please try again later.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      // If "Other" is selected, use the custom category value
      const finalCategory = productData.category === "Other" && customCategory.trim() ? 
        customCategory.trim() : productData.category;
      
      // Upload image if selected
      let imageUrl = productData.productImage;
      if (selectedImage) {
        imageUrl = await uploadImageToFirebase(selectedImage);
        if (!imageUrl) {
          setIsSubmitting(false);
          return; // Stop if image upload failed
        }
      }
      
      // Generate a unique ID for the new product
      const productRef = doc(collection(db, ngoCollection, ngoId, 'products'));
      
      // Prepare the product data
      const productToAdd = {
        ...productData,
        productImage: imageUrl,
        category: finalCategory,
        quantity: parseInt(productData.quantity) || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        ngoId: ngoId,
        id: productRef.id // Include the ID in the document data for easier reference
      };

      // Remove custom category field if it exists
      if ('customCategory' in productToAdd) {
        delete productToAdd.customCategory;
      }

      // Add document to Firestore with the generated ID
      await setDoc(productRef, productToAdd);
      
      // Add the new product to the state with its ID
      setProducts(prevProducts => [productToAdd, ...prevProducts]);
      
      // Reset form and close modal
      setProductData({
        productName: "",
        category: "",
        quantity: "",
        description: "",
        productImage: "",
      });
      setCustomCategory("");
      setSelectedImage(null);
      setImagePreview(null);
      setIsModalOpen(false);
      
      toast({
        title: "Success",
        description: "Product added successfully"
      });
      
    } catch (error) {
      console.error("Error adding product: ", error);
      toast({
        title: "Error",
        description: "Failed to add product",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add this helper function at the top level of your component
  const isValidUrl = (urlString) => {
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Add this computed value before the return statement
  const filteredProducts = products.filter(product =>
    product.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto p-4 space-y-8"
    >
      <h1 className="text-5xl font-bold mb-8">NGO Products Management</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Products Listing</CardTitle>
          <Button 
            className="bg-[#1CAC78] hover:bg-[#158f63] ml-auto"
            onClick={() => setIsModalOpen(true)}
          >
            Add Product
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
            <Button className="bg-[#1CAC78] hover:bg-[#158f63]">
              <Filter className="mr-2 h-4 w-4" /> Apply Filters
            </Button>
          </div>

          {/* Products Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Image</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Loading products...</TableCell>
                </TableRow>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.productImage && isValidUrl(product.productImage) ? (
                        <div className="relative w-24 h-24">
                          <Image
                            src={product.productImage}
                            alt={product.productName}
                            width={96}
                            height={96}
                            className="object-cover rounded-md"
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-24 bg-gray-200 flex items-center justify-center text-gray-500 rounded-md">
                          No image
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{product.productName}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{product.quantity}</TableCell>
                    <TableCell>
                      <Button asChild>
                        <Link href={`/dashboard/ngo/inventory/product/${product.id}`}>
                          View Product
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">No products found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Product Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open);
        if (!open) {
          // Reset form state when dialog is closed
          setProductData({
            productName: "",
            category: "",
            quantity: "",
            description: "",
            productImage: "",
          });
          setCustomCategory("");
          setSelectedImage(null);
          setImagePreview(null);
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="productName">Product Name</Label>
                <Input
                  id="productName"
                  name="productName"
                  value={productData.productName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="productImage">Product Image</Label>
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                    </Button>
                    <Input
                      id="productImage"
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                    {selectedImage && (
                      <span className="text-sm text-muted-foreground">
                        {selectedImage.name}
                      </span>
                    )}
                  </div>
                  
                  {imagePreview && (
                    <div className="mt-2">
                      <div className="relative h-40 w-full overflow-hidden rounded border border-muted">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                  
                  {!selectedImage && (
                    <Input
                      id="productImageUrl"
                      name="productImage"
                      value={productData.productImage}
                      onChange={handleInputChange}
                      placeholder="Or enter image URL"
                      className="mt-2"
                    />
                  )}
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={productData.category} 
                  onValueChange={(value) => handleSelectChange(value, "category")}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Electronics">Electronics</SelectItem>
                    <SelectItem value="Food">Food</SelectItem>
                    <SelectItem value="Clothing">Clothing</SelectItem>
                    <SelectItem value="Healthcare">Healthcare</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Custom Category Input - Only shows when "Other" is selected */}
              {productData.category === "Other" && (
                <div className="grid gap-2">
                  <Label htmlFor="customCategory">Specify Category</Label>
                  <Input
                    id="customCategory"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter custom category"
                    required
                  />
                </div>
              )}
              
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  value={productData.quantity}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={productData.description}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-[#1CAC78] hover:bg-[#158f63]"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}