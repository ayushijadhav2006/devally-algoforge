"use client"

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Loader2, UserCheck, Users, Database } from 'lucide-react';

export default function UserDataPage() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [jsonOutput, setJsonOutput] = useState('');

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      if (!currentUser) {
        throw new Error("No user is logged in. Please log in first.");
      }

      // Get the users collection
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      
      if (usersSnapshot.empty) {
        throw new Error("No users found in the database");
      }
      
      // Process user documents
      const userData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUsers(userData);
      
      // Format JSON for display
      const formattedJson = JSON.stringify(userData, null, 2);
      setJsonOutput(formattedJson);
      
      // Log to console for easy copy/paste
      console.log("Fetched Users:", userData);
      
      toast({
        title: "Success",
        description: `Retrieved ${userData.length} users from the database`
      });
      
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      setJsonOutput(JSON.stringify({ error: error.message }, null, 2));
    } finally {
      setLoading(false);
    }
  };
  
  const generateSampleData = () => {
    if (users.length === 0) {
      toast({
        title: "Error",
        description: "Please fetch users first",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Generate sample gamification data for each user
      const gamificationData = users.map(user => {
        // Random points between 100 and 2000
        const points = Math.floor(Math.random() * 1900) + 100;
        
        // Create badges based on points
        const badges = [];
        
        // Basic badges everyone gets
        badges.push({
          id: "first_purchase",
          name: "First Purchase",
          description: "Made your first merchandise purchase",
          icon: "🛍️",
          points: 50,
          dateAwarded: new Date(Date.now() - (Math.random() * 50 * 86400000))
        });
        
        badges.push({
          id: "donation_starter",
          name: "Donation Starter",
          description: "Made your first donation to a campaign",
          icon: "💰",
          points: 50,
          dateAwarded: new Date(Date.now() - (Math.random() * 45 * 86400000))
        });
        
        // Add more badges based on points
        if (points >= 500) {
          badges.push({
            id: "volunteer",
            name: "Volunteer",
            description: "Participated in an NGO activity or event",
            icon: "🤝",
            points: 100,
            dateAwarded: new Date(Date.now() - (Math.random() * 30 * 86400000))
          });
        }
        
        if (points >= 1000) {
          badges.push({
            id: "generous_donor",
            name: "Generous Donor",
            description: "Donated more than ₹1000 in total",
            icon: "💎",
            points: 100,
            dateAwarded: new Date(Date.now() - (Math.random() * 25 * 86400000))
          });
          
          badges.push({
            id: "collector",
            name: "Collector",
            description: "Purchased items from 3 different categories",
            icon: "🧩",
            points: 75,
            dateAwarded: new Date(Date.now() - (Math.random() * 20 * 86400000))
          });
        }
        
        if (points >= 1500) {
          badges.push({
            id: "loyal_supporter",
            name: "Loyal Supporter",
            description: "Supported the same NGO at least 3 times",
            icon: "⭐",
            points: 150,
            dateAwarded: new Date(Date.now() - (Math.random() * 15 * 86400000))
          });
          
          badges.push({
            id: "sustainability_champion",
            name: "Sustainability Champion",
            description: "Purchased 5 eco-friendly products",
            icon: "🌱",
            points: 125,
            dateAwarded: new Date(Date.now() - (Math.random() * 10 * 86400000))
          });
        }
        
        // Calculate stats based on points
        const totalPurchases = Math.floor(points / 100);
        const totalDonations = Math.floor(points / 200);
        const donationAmount = totalDonations * 500;
        
        const categories = ["clothing"];
        if (points > 300) categories.push("books");
        if (points > 600) categories.push("accessories");
        if (points > 900) categories.push("stationery");
        if (points > 1200) categories.push("eco-friendly");
        
        const activitiesJoined = Math.floor(points / 300);
        
        const ngoSupport = {
          "ngo123": Math.floor(points / 250),
        };
        
        if (points > 500) {
          ngoSupport["ngo456"] = Math.floor(points / 500);
        }
        
        if (points > 1000) {
          ngoSupport["ngo789"] = Math.floor(points / 750);
        }
        
        const ecoProducts = Math.floor(points / 400);
        const loginDays = Math.floor(points / 50);
        
        return {
          userId: user.id,
          userName: user.name || user.displayName || "User",
          gamificationData: {
            points,
            badges,
            stats: {
              totalPurchases,
              totalDonations,
              donationAmount,
              categories,
              activitiesJoined,
              ngoSupport,
              ecoProducts,
              loginDays,
              lastLogin: new Date(),
              profileComplete: true
            },
            createdAt: new Date(Date.now() - (30 * 86400000))
          }
        };
      });
      
      // Format and display the sample data
      const formattedJson = JSON.stringify(gamificationData, null, 2);
      setJsonOutput(formattedJson);
      
      // Also log to console for easy copy
      console.log("Sample Gamification Data:", gamificationData);
      
      toast({
        title: "Sample Data Generated",
        description: `Created sample data for ${gamificationData.length} users`
      });
      
    } catch (error) {
      console.error("Error generating sample data:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <Card className="mx-auto">
        <CardHeader>
          <CardTitle>User Data Explorer</CardTitle>
          <CardDescription>
            Retrieve existing user data from Firebase to help create appropriate sample gamification data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {!currentUser ? (
              <div className="p-4 border rounded-md bg-amber-50 text-amber-800">
                <p className="font-medium">Please log in to continue</p>
              </div>
            ) : null}
            
            <div className="flex space-x-4">
              <Button 
                onClick={fetchUsers} 
                disabled={loading || !currentUser}
                className="flex items-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Fetch Users
                  </>
                )}
              </Button>
              
              <Button 
                onClick={generateSampleData} 
                disabled={loading || users.length === 0}
                className="flex items-center"
                variant="outline"
              >
                <Database className="mr-2 h-4 w-4" />
                Generate Sample Data
              </Button>
              
              <Button 
                onClick={() => window.location.href = '/dashboard/test/populate-data'} 
                className="flex items-center"
                variant="secondary"
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Go to Data Population Page
              </Button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-sm text-gray-700">
                  {users.length > 0 
                    ? `Found ${users.length} users in the database` 
                    : "No users fetched yet"}
                </h3>
                {jsonOutput && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(jsonOutput);
                      toast({
                        title: "Copied!",
                        description: "Data copied to clipboard"
                      });
                    }}
                  >
                    Copy to Clipboard
                  </Button>
                )}
              </div>
              
              <Textarea
                className="font-mono text-xs h-96"
                value={jsonOutput}
                readOnly
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between text-sm text-gray-500">
          <p>
            This data is for development purposes only. You can use it to create appropriate sample gamification data.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
} 