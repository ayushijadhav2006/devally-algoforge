"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Trophy, Medal, Crown, Award, 
  Users, Search, ArrowUpDown, Download, Filter
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, where, doc, getDoc } from 'firebase/firestore';
import { useGamification } from '@/context/GamificationContext';
import { useAuth } from '@/context/AuthContext';

export default function LeaderboardPage() {
  const [leaderboardUsers, setLeaderboardUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { userPoints, userLevel } = useGamification();
  const { user } = useAuth();
  const [userRank, setUserRank] = useState(null);
  
  useEffect(() => {
    fetchLeaderboard();
  }, [filter]);
  
  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // Query gamification collection to get top users sorted by points
      let leaderboardQuery = query(
        collection(db, 'gamification'),
        orderBy('points', 'desc'),
        limit(50)
      );

      const querySnapshot = await getDocs(leaderboardQuery);
      
      // For each user in gamification collection, get their profile data
      const usersData = await Promise.all(
        querySnapshot.docs.map(async (docSnapshot) => {
          const gamificationData = docSnapshot.data();
          const userId = docSnapshot.id;
          
          // Check if this is the current user and track their rank
          if (user && userId === user.uid) {
            setUserRank(querySnapshot.docs.findIndex(d => d.id === userId) + 1);
          }
          
          // Get user profile
          const userDocRef = doc(db, 'users', userId);
          const userDoc = await getDoc(userDocRef);
          const userData = userDoc.exists() ? userDoc.data() : null;
          
          return {
            id: userId,
            points: gamificationData.points || 0,
            level: determineLevelFromPoints(gamificationData.points || 0),
            badges: gamificationData.badges || [],
            name: userData?.name || "Anonymous User",
            photoURL: userData?.photoURL || null,
            email: userData?.email || null,
            isCurrentUser: user && userId === user.uid
          };
        })
      );
      
      setLeaderboardUsers(usersData);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Determine level from points based on the level structure
  const determineLevelFromPoints = (points) => {
    const LEVELS = [
      { level: 1, name: "Beginner", pointsRequired: 0 },
      { level: 2, name: "Supporter", pointsRequired: 100 },
      { level: 3, name: "Contributor", pointsRequired: 250 },
      { level: 4, name: "Champion", pointsRequired: 500 },
      { level: 5, name: "Hero", pointsRequired: 1000 },
      { level: 6, name: "Legend", pointsRequired: 2000 }
    ];
    
    // Find the highest level the user qualifies for
    const level = [...LEVELS].reverse().find(level => points >= level.pointsRequired);
    return level || LEVELS[0];
  };
  
  // Get badge for top 3 positions
  const getRankBadge = (index) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-amber-700" />;
    return null;
  };
  
  // Filter users based on search term
  const filteredUsers = leaderboardUsers.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  return (
    <div className="container mx-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Crown className="h-6 w-6 text-yellow-500" /> 
              Leaderboard
            </h1>
            <p className="text-muted-foreground mt-1">
              See how you rank against other supporters
            </p>
          </div>
          
          {userRank && (
            <Card className="mt-4 md:mt-0 bg-primary/5 border-primary/20">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Your Rank</div>
                    <div className="text-xl font-bold">{userRank}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>

      {/* Search and filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search users..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" className="gap-1">
            <ArrowUpDown className="h-4 w-4" />
            Sort
          </Button>
        </div>
      </div>

      {/* Leaderboard Table */}
      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span>Top Supporters</span>
            <Badge variant="outline" className="font-normal">
              {filteredUsers.length} users
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No users found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Rank</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">User</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Level</th>
                    <th className="text-right py-3 px-2 text-muted-foreground font-medium">Points</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Badges</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((userData, index) => (
                    <motion.tr 
                      key={userData.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      className={`border-b hover:bg-muted/30 transition-colors ${userData.isCurrentUser ? 'bg-primary/5' : ''}`}
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold">{index + 1}</span>
                          {getRankBadge(index)}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={userData.photoURL} />
                            <AvatarFallback>{userData.name?.charAt(0) || '?'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{userData.name}</div>
                            {userData.isCurrentUser && (
                              <Badge variant="outline" className="text-xs font-normal">You</Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1">
                          <span className="text-primary font-medium">Level {userData.level.level}</span>
                          <span className="text-xs text-muted-foreground">({userData.level.name})</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right font-medium">
                        {userData.points.toLocaleString()}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1 flex-wrap">
                          {userData.badges.slice(0, 3).map((badge, i) => (
                            <Badge key={i} variant="outline" className="py-0">
                              {badge.icon} {badge.name}
                            </Badge>
                          ))}
                          {userData.badges.length > 3 && (
                            <Badge variant="outline" className="py-0">
                              +{userData.badges.length - 3}
                            </Badge>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 