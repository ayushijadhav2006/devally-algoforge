"use client";

import { useState, useEffect } from "react";
import { 
  collection,
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  updateDoc, 
  increment, 
  setDoc, 
  getDoc,
  onSnapshot
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarIcon, HeartIcon, ShoppingBagIcon } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

const NGORecommendation = ({ userData }) => {
  const [recommendedNGO, setRecommendedNGO] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [merchandise, setMerchandise] = useState(null);
  const { translations } = useLanguage();
  const user = auth.currentUser;
  const router = useRouter();

  // Fetch recommended NGO
  useEffect(() => {
    const fetchRecommendedNGO = async () => {
      if (!userData) return;
      
      try {
        // Simplified query that doesn't require a complex index
        const ngoQuery = query(
          collection(db, "ngo"),
          orderBy("ngoRating", "desc"),
          limit(5)  // Get top 5 to randomize from
        );
        
        const ngoSnapshot = await getDocs(ngoQuery);
        
        if (!ngoSnapshot.empty) {
          // Get a random NGO from the top rated ones
          const ngoList = ngoSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Filter NGOs with rating >= 3 after fetching
          const highRatedNGOs = ngoList.filter(ngo => (ngo.ngoRating || 0) >= 3);
          
          if (highRatedNGOs.length === 0) {
            console.log("No highly rated NGOs found");
            return;
          }
          
          // Check if user already follows each NGO
          if (user?.uid) {
            // Check follows status for each NGO
            const followStatusChecks = await Promise.all(
              highRatedNGOs.map(async (ngo) => {
                try {
                  const followerRef = doc(db, "ngo", ngo.id, "followers", user.uid);
                  const followerSnap = await getDoc(followerRef);
                  return {
                    ...ngo,
                    isFollowed: followerSnap.exists()
                  };
                } catch (error) {
                  console.error("Error checking follow status:", error);
                  return {
                    ...ngo,
                    isFollowed: false
                  };
                }
              })
            );
            
            // Filter NGOs the user is not following
            const notFollowedNGOs = followStatusChecks.filter(ngo => !ngo.isFollowed);
            
            if (notFollowedNGOs.length > 0) {
              // Pick a random NGO from the not followed ones
              const randomIndex = Math.floor(Math.random() * notFollowedNGOs.length);
              setRecommendedNGO(notFollowedNGOs[randomIndex]);
              setIsFollowing(false);
            } else if (highRatedNGOs.length > 0) {
              // If user follows all top NGOs, still show one but mark as following
              const randomIndex = Math.floor(Math.random() * highRatedNGOs.length);
              setRecommendedNGO(highRatedNGOs[randomIndex]);
              setIsFollowing(true);
            }
          } else {
            // If no user is logged in, just pick a random NGO from high rated ones
            const randomIndex = Math.floor(Math.random() * highRatedNGOs.length);
            setRecommendedNGO(highRatedNGOs[randomIndex]);
            setIsFollowing(false);
          }
        } else {
          console.log("No NGOs found");
        }
      } catch (error) {
        console.error("Error fetching recommended NGO:", error);
      }
    };

    fetchRecommendedNGO();

    // Set up a listener if the user is authenticated
    if (user?.uid && recommendedNGO) {
      const followerRef = doc(db, "ngo", recommendedNGO.id, "followers", user.uid);
      const unsubscribe = onSnapshot(followerRef, (snapshot) => {
        setIsFollowing(snapshot.exists());
      });

      return () => unsubscribe();
    }
  }, [userData, user]);

  // Set up real-time merchandise listener
  useEffect(() => {
    if (!user?.uid) return;
    
    // This will run whenever the following status changes
    const fetchMerchandise = async () => {
      try {
        // Get a list of NGOs the user follows
        const followedNGOs = [];
        
        // Query for all NGOs
        const ngoQuery = query(collection(db, "ngo"), limit(20));
        const ngoSnapshot = await getDocs(ngoQuery);
        
        // Check each NGO if the user is a follower
        await Promise.all(
          ngoSnapshot.docs.map(async (ngoDoc) => {
            const followerRef = doc(db, "ngo", ngoDoc.id, "followers", user.uid);
            const followerSnap = await getDoc(followerRef);
            
            if (followerSnap.exists()) {
              followedNGOs.push({
                id: ngoDoc.id,
                ...ngoDoc.data()
              });
            }
          })
        );
        
        if (followedNGOs.length > 0) {
          const randomNGO = followedNGOs[Math.floor(Math.random() * followedNGOs.length)];
          
          // Set up a listener for merchandise
          const merchandiseQuery = query(
            collection(db, "merchandise"),
            where("ngoId", "==", randomNGO.id),
            limit(1)
          );
          
          const unsubscribe = onSnapshot(merchandiseQuery, (snapshot) => {
            if (!snapshot.empty) {
              const merchandiseData = {
                id: snapshot.docs[0].id,
                ...snapshot.docs[0].data(),
                ngo: randomNGO
              };
              setMerchandise(merchandiseData);
            } else {
              setMerchandise(null);
            }
          });
          
          return () => unsubscribe();
        }
      } catch (error) {
        console.error("Error setting up merchandise listener:", error);
      }
    };

    fetchMerchandise();
  }, [user, isFollowing]); // Re-run when following status changes

  const handleFollow = async () => {
    if (!user?.uid || !recommendedNGO || isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Add user to the NGO's followers subcollection
      const followerRef = doc(db, "ngo", recommendedNGO.id, "followers", user.uid);
      await setDoc(followerRef, {
        useremail: user.email || "",
        username: userData?.name || ""
      });
      
      // Update NGO document to increment followers count
      const ngoRef = doc(db, "ngo", recommendedNGO.id);
      await updateDoc(ngoRef, {
        followers: increment(1)
      });
      
      setIsFollowing(true);
      
      // Immediately fetch merchandise after following
      fetchMerchandise();
      
    } catch (error) {
      console.error("Error following NGO:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Added this function to fetch merchandise immediately after following
  const fetchMerchandise = async () => {
    if (!user?.uid) return;
    
    try {
      // Get a list of NGOs the user follows, including the one just followed
      const followedNGOs = [];
      
      // First add the NGO we just followed
      if (recommendedNGO) {
        followedNGOs.push(recommendedNGO);
      }
      
      // Query for other NGOs just in case
      const ngoQuery = query(collection(db, "ngo"), limit(20));
      const ngoSnapshot = await getDocs(ngoQuery);
      
      await Promise.all(
        ngoSnapshot.docs.map(async (ngoDoc) => {
          if (ngoDoc.id === recommendedNGO?.id) return; // Skip the one we just added
          
          const followerRef = doc(db, "ngo", ngoDoc.id, "followers", user.uid);
          const followerSnap = await getDoc(followerRef);
          
          if (followerSnap.exists()) {
            followedNGOs.push({
              id: ngoDoc.id,
              ...ngoDoc.data()
            });
          }
        })
      );
      
      if (followedNGOs.length > 0) {
        const randomNGO = followedNGOs[Math.floor(Math.random() * followedNGOs.length)];
        
        const merchandiseQuery = query(
          collection(db, "merchandise"),
          where("ngoId", "==", randomNGO.id),
          limit(1)
        );
        
        const merchandiseSnapshot = await getDocs(merchandiseQuery);
        
        if (!merchandiseSnapshot.empty) {
          const merchandiseData = {
            id: merchandiseSnapshot.docs[0].id,
            ...merchandiseSnapshot.docs[0].data(),
            ngo: randomNGO
          };
          setMerchandise(merchandiseData);
        }
      }
    } catch (error) {
      console.error("Error fetching merchandise:", error);
    }
  };

  // Navigate to NGO profile page
  const navigateToNGOProfile = () => {
    if (recommendedNGO?.id) {
      router.push(`/ngo/${recommendedNGO.id}`);
    }
  };

  // Format mission text to be shorter
  const shortMission = recommendedNGO?.mission && recommendedNGO.mission.length > 100 
    ? `${recommendedNGO.mission.substring(0, 100)}...` 
    : recommendedNGO?.mission;

  return (
    <div className="space-y-8">
      {/* NGO Recommendation */}
      {recommendedNGO && (
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle>
              {translations.recommended_for_you || "Recommended For You"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="flex flex-col md:flex-row gap-4 items-start cursor-pointer"
              onClick={navigateToNGOProfile}
            >
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={recommendedNGO.logoUrl} alt={recommendedNGO.ngoName} />
                  <AvatarFallback>{recommendedNGO.ngoName?.charAt(0) || "N"}</AvatarFallback>
                </Avatar>
                {recommendedNGO.isVerified === "verified" && (
                  <Badge className="absolute -bottom-2 -right-2 bg-blue-500">
                    Verified
                  </Badge>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{recommendedNGO.ngoName}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="flex items-center">
                        <StarIcon className="h-4 w-4 text-yellow-500 mr-1" />
                        {recommendedNGO.ngoRating || 4}
                      </span>
                      <span>•</span>
                      <span>{recommendedNGO.followers || 0} {translations.followers || "Followers"}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-2">
                  <p className="text-sm text-gray-700">{shortMission}</p>
                </div>
                
                <div className="mt-3 flex flex-wrap gap-2">
                  {recommendedNGO.categories && recommendedNGO.categories.slice(0, 2).map((category, index) => (
                    <Badge key={index} variant="outline" className="bg-gray-100">
                      {category}
                    </Badge>
                  ))}
                  {recommendedNGO.categories && recommendedNGO.categories.length > 2 && (
                    <Badge variant="outline" className="bg-gray-100">
                      +{recommendedNGO.categories.length - 2} more
                    </Badge>
                  )}
                </div>
                
                <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                  <Button
                    onClick={handleFollow}
                    disabled={isFollowing || isLoading}
                    className={`flex gap-2 ${
                      isFollowing ? "bg-gray-200 text-gray-700" : "bg-blue-600 hover:bg-blue-700"
                    }`}
                    size="sm"
                  >
                    <HeartIcon className="h-4 w-4" />
                    {isLoading 
                      ? translations.following_ngo || "Following..." 
                      : isFollowing 
                        ? translations.following || "Following" 
                        : translations.follow || "Follow"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Merchandise Recommendation */}
      {merchandise && (
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle>
              {translations.merchandise_from_followed_ngo || "Merchandise From NGO You Follow"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-32 h-32 bg-gray-100 rounded-md overflow-hidden">
                <img 
                  src={merchandise.imageUrl || "/placeholder-merchandise.jpg"} 
                  alt={merchandise.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge 
                      className="mb-2 bg-blue-100 text-blue-800 hover:bg-blue-100 cursor-pointer"
                      onClick={() => merchandise.ngo?.id && router.push(`/ngo/${merchandise.ngo.id}`)}
                    >
                      {merchandise.ngo?.ngoName || "NGO Merchandise"}
                    </Badge>
                    <h3 className="text-xl font-semibold">{merchandise.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{merchandise.description}</p>
                  </div>
                  <div className="text-lg font-bold">₹{merchandise.price}</div>
                </div>
                
                <div className="mt-4">
                  <Link href={`/merchandise/${merchandise.id}`}>
                    <Button 
                      className="flex gap-2 bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <ShoppingBagIcon className="h-4 w-4" />
                      {translations.view_merchandise || "View Merchandise"}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NGORecommendation;