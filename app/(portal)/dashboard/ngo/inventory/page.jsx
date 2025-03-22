"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Filter, Calendar, MapPin } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { FileText } from "lucide-react"
import { getAuth } from "firebase/auth"
import { toast } from "@/hooks/use-toast"

export default function NGOInventoryPage() {
  const [events, setEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [ngoId, setNgoId] = useState(null);
  const [ngoCollection, setNgoCollection] = useState("ngo"); // Default to singular collection

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
            description: "You must be logged in to view inventory",
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
      fetchActivities();
    }
  }, [ngoId]);

  const fetchActivities = async () => {
    if (!ngoId) return;
    
    setLoading(true);
    try {
      const activitiesCollection = collection(db, "activities");
      const activitiesSnapshot = await getDocs(activitiesCollection);

      const activitiesData = [];

      for (const docSnapshot of activitiesSnapshot.docs) {
        const activityDoc = docSnapshot.data();
        const activityId = docSnapshot.id; // Get the activity ID
        
        // Only include activities that belong to the current NGO
        if (activityDoc.ngoId === ngoId) {
          const inventoryCollection = collection(db, "activities", activityId, "inventory");
          const inventorySnapshot = await getDocs(inventoryCollection);
          const inventoryData = inventorySnapshot.docs.map(inventoryDoc => inventoryDoc.data());

          activitiesData.push({
            id: activityId,
            ...activityDoc,
            inventory: inventoryData,
          });
        }
      }

      console.log("Fetched activities with inventory for NGO:", ngoId, activitiesData);
      setEvents(activitiesData);

    } catch (error) {
      console.error("Error fetching activities:", error);
      toast({
        title: "Error",
        description: "Failed to load inventory data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter activities based on search term and status
  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.eventName?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || event.status?.toLowerCase() === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto p-4 space-y-8"
    >
      <h1 className="text-5xl font-bold mb-8">NGO Inventory Management</h1>

      <Card>
        <CardHeader>
          <CardTitle>Event-Wise Inventory Listing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow">
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-[#1CAC78] hover:bg-[#158f63]">
              <FileText className="mr-2 h-4 w-4" /> Generate PDF Report
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.length > 0 ? (
                filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.eventName || "N/A"}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4" />
                        {event.eventDate || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <MapPin className="mr-2 h-4 w-4" />
                        {event.location || "N/A"}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          event.status === "Upcoming" ? "outline" : event.status === "Ongoing" ? "default" : "secondary"
                        }
                      >
                        {event.status || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild>
                        <Link href={`/dashboard/ngo/inventory/analytics/${event.id}`}>View Inventory</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No events found for your NGO
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  )
}
