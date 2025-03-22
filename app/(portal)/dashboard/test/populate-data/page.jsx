"use client"

import { useState, useEffect } from 'react';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

export default function PopulateDataPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [existingData, setExistingData] = useState(false);
  const [customData, setCustomData] = useState('');
  const [isCustomDataValid, setIsCustomDataValid] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      if (user) {
        checkExistingData(user.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    try {
      if (customData.trim() === '') {
        setIsCustomDataValid(false);
        return;
      }
      
      const parsed = JSON.parse(customData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setIsCustomDataValid(true);
      } else {
        setIsCustomDataValid(false);
      }
    } catch (e) {
      setIsCustomDataValid(false);
    }
  }, [customData]);

  const checkExistingData = async (userId) => {
    try {
      const gamificationRef = doc(db, 'gamification', userId);
      const gamificationDoc = await getDoc(gamificationRef);
      setExistingData(gamificationDoc.exists());
    } catch (error) {
      console.error("Error checking for existing data:", error);
    }
  };

  const addDefaultTestData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!currentUser) {
        throw new Error("No user is logged in. Please log in first.");
      }
      
      const currentUserId = currentUser.uid;
      console.log("Current user ID:", currentUserId);
      
      // Create test data for current user and 4 test users
      const testUsers = [
        {id: "test_user1", points: 750, name: "John Doe"},
        {id: "test_user2", points: 1250, name: "Jane Smith"},
        {id: "test_user3", points: 350, name: "Alex Johnson"},
        {id: "test_user4", points: 1800, name: "Maria Garcia"},
        {id: currentUserId, points: 520, name: currentUser.displayName || "Current User"}
      ];
      
      // Process each user
      for (const user of testUsers) {
        try {
          // Create badges based on points
          const badges = [];
          
          // First Purchase badge (everyone gets this)
          badges.push({
            id: "first_purchase",
            name: "First Purchase",
            description: "Made your first merchandise purchase",
            icon: "🛍️",
            points: 50,
            dateAwarded: new Date(Date.now() - (20 * 86400000))
          });
          
          // Donation Starter badge (everyone gets this)
          badges.push({
            id: "donation_starter",
            name: "Donation Starter",
            description: "Made your first donation to a campaign",
            icon: "💰",
            points: 50,
            dateAwarded: new Date(Date.now() - (15 * 86400000))
          });
          
          // Add volunteer badge if points >= 500
          if (user.points >= 500) {
            badges.push({
              id: "volunteer",
              name: "Volunteer",
              description: "Participated in an NGO activity or event",
              icon: "🤝",
              points: 100,
              dateAwarded: new Date(Date.now() - (10 * 86400000))
            });
          }
          
          // Add higher level badges
          if (user.points >= 1000) {
            badges.push({
              id: "generous_donor",
              name: "Generous Donor",
              description: "Donated more than ₹1000 in total",
              icon: "💎",
              points: 100,
              dateAwarded: new Date(Date.now() - (8 * 86400000))
            });
            
            badges.push({
              id: "collector",
              name: "Collector",
              description: "Purchased items from 3 different categories",
              icon: "🧩",
              points: 75,
              dateAwarded: new Date(Date.now() - (6 * 86400000))
            });
          }
          
          if (user.points >= 1500) {
            badges.push({
              id: "loyal_supporter",
              name: "Loyal Supporter",
              description: "Supported the same NGO at least 3 times",
              icon: "⭐",
              points: 150,
              dateAwarded: new Date(Date.now() - (4 * 86400000))
            });
            
            badges.push({
              id: "sustainability_champion",
              name: "Sustainability Champion",
              description: "Purchased 5 eco-friendly products",
              icon: "🌱",
              points: 125,
              dateAwarded: new Date(Date.now() - (2 * 86400000))
            });
          }
          
          // Calculate stats based on points
          const totalPurchases = Math.floor(user.points / 100);
          const totalDonations = Math.floor(user.points / 200);
          const donationAmount = totalDonations * 500;
          
          const categories = ["clothing"];
          if (user.points > 300) categories.push("books");
          if (user.points > 600) categories.push("accessories");
          if (user.points > 900) categories.push("stationery");
          if (user.points > 1200) categories.push("eco-friendly");
          
          const activitiesJoined = Math.floor(user.points / 300);
          
          const ngoSupport = {
            "ngo123": Math.floor(user.points / 250),
          };
          
          if (user.points > 500) {
            ngoSupport["ngo456"] = Math.floor(user.points / 500);
          }
          
          if (user.points > 1000) {
            ngoSupport["ngo789"] = Math.floor(user.points / 750);
          }
          
          const ecoProducts = Math.floor(user.points / 400);
          const loginDays = Math.floor(user.points / 50);
          
          // Create the gamification data
          const gamificationData = {
            points: user.points,
            badges: badges,
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
            createdAt: new Date(Date.now() - (30 * 86400000)) // 30 days ago
          };
          
          // Create the gamification data document
          await setDoc(doc(db, 'gamification', user.id), gamificationData);
          console.log(`Added gamification data for ${user.name} (${user.id})`);
          
          // If this is a test user, create a basic user profile too
          if (user.id.startsWith('test_')) {
            await setDoc(doc(db, 'users', user.id), {
              name: user.name,
              email: `${user.id}@example.com`,
              createdAt: new Date(Date.now() - (30 * 86400000))
            });
            console.log(`Added user profile for ${user.name}`);
          }
        } catch (error) {
          console.error(`Error adding data for ${user.id}:`, error);
          throw error;
        }
      }
      
      setSuccess(true);
      toast({
        title: "Success",
        description: "Sample gamification data was added successfully!",
      });
      
      // Refresh existing data state
      checkExistingData(currentUserId);
      
    } catch (error) {
      console.error("Error adding sample data:", error);
      setError(error.message);
      toast({
        title: "Error",
        description: `Failed to add sample data: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addCustomData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!currentUser) {
        throw new Error("No user is logged in. Please log in first.");
      }
      
      if (!isCustomDataValid) {
        throw new Error("Invalid JSON data format. Please provide valid data.");
      }
      
      const customUsers = JSON.parse(customData);
      console.log("Processing custom user data:", customUsers);
      
      // Process each custom user data
      let processedCount = 0;
      
      for (const userData of customUsers) {
        try {
          const userId = userData.userId;
          const gamificationData = userData.gamificationData;
          
          if (!userId || !gamificationData) {
            console.warn("Skipping invalid user data entry:", userData);
            continue;
          }
          
          // Format dates properly - Firebase can't store Date objects directly from JSON parse
          if (gamificationData.createdAt) {
            gamificationData.createdAt = new Date(gamificationData.createdAt);
          } else {
            gamificationData.createdAt = new Date(Date.now() - (30 * 86400000));
          }
          
          if (gamificationData.badges && Array.isArray(gamificationData.badges)) {
            gamificationData.badges = gamificationData.badges.map(badge => ({
              ...badge,
              dateAwarded: badge.dateAwarded ? new Date(badge.dateAwarded) : new Date()
            }));
          }
          
          if (gamificationData.stats && gamificationData.stats.lastLogin) {
            gamificationData.stats.lastLogin = new Date(gamificationData.stats.lastLogin);
          }
          
          // Create the gamification data document
          await setDoc(doc(db, 'gamification', userId), gamificationData);
          console.log(`Added gamification data for user ID: ${userId}`);
          processedCount++;
          
        } catch (error) {
          console.error(`Error adding data for user:`, userData, error);
          // Continue with other users even if one fails
        }
      }
      
      if (processedCount > 0) {
        setSuccess(true);
        toast({
          title: "Success",
          description: `Added gamification data for ${processedCount} users!`,
        });
        
        // Refresh existing data state for current user
        checkExistingData(currentUser.uid);
      } else {
        throw new Error("Failed to add data for any users");
      }
      
    } catch (error) {
      console.error("Error adding custom data:", error);
      setError(error.message);
      toast({
        title: "Error",
        description: `Failed to add custom data: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const overwriteData = async () => {
    if (window.confirm("This will overwrite any existing gamification data. Are you sure?")) {
      await addDefaultTestData();
    }
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Populate Sample Gamification Data</CardTitle>
              <CardDescription>
                Add sample gamification data to your Firebase database for testing purposes.
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = '/dashboard/test/user-data'}
              className="flex items-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Get User Data
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {!currentUser ? (
              <div className="p-4 border rounded-md bg-amber-50 text-amber-800">
                <p className="font-medium">Please log in to continue</p>
              </div>
            ) : existingData ? (
              <div className="p-4 border rounded-md bg-blue-50 text-blue-800">
                <p className="font-medium">Gamification data already exists for your account.</p>
                <p className="text-sm mt-2">You can still add test data, but it will overwrite your existing data.</p>
              </div>
            ) : null}
            
            {error && (
              <div className="p-4 border rounded-md bg-red-50 text-red-800 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}
            
            {success && (
              <div className="p-4 border rounded-md bg-green-50 text-green-800 flex items-start gap-2">
                <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Success!</p>
                  <p className="text-sm">Sample data has been added to your database.</p>
                </div>
              </div>
            )}
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Default Test Data</h3>
                <div className="bg-gray-50 p-4 rounded-md mb-4">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Sample Data Details:</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• John Doe: 750 points, 3 badges</li>
                    <li>• Jane Smith: 1250 points, 5 badges</li>
                    <li>• Alex Johnson: 350 points, 2 badges</li>
                    <li>• Maria Garcia: 1800 points, 7 badges</li>
                    <li>• Your Account: 520 points, 3 badges</li>
                  </ul>
                </div>
                
                {existingData ? (
                  <Button onClick={overwriteData} disabled={loading} className="w-full">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Overwriting...
                      </>
                    ) : "Use Default Test Data"}
                  </Button>
                ) : (
                  <Button onClick={addDefaultTestData} disabled={loading || !currentUser} className="w-full">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding Data...
                      </>
                    ) : "Use Default Test Data"}
                  </Button>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Custom User Data</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Paste JSON data from the user data explorer here:
                </p>
                <Textarea 
                  value={customData} 
                  onChange={(e) => setCustomData(e.target.value)} 
                  placeholder='[{"userId": "user1", "gamificationData": {...}}]'
                  className="font-mono text-xs h-36 mb-2"
                />
                
                <Button 
                  onClick={addCustomData} 
                  disabled={loading || !currentUser || !isCustomDataValid} 
                  variant="outline"
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding Custom Data...
                    </>
                  ) : "Use Custom Data"}
                </Button>
                
                {customData && !isCustomDataValid && (
                  <p className="text-sm text-red-500 mt-2">
                    Invalid JSON format. Please provide data in the correct format.
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="secondary" 
            onClick={() => window.location.href = '/dashboard/user/leaderboard'}
          >
            Go to Leaderboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 