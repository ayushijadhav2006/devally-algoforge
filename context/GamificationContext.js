"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import { useNotifications } from '@/providers/NotificationProvider';

const GamificationContext = createContext({});

// Define achievement badges and requirements
const ACHIEVEMENTS = {
  FIRST_PURCHASE: {
    id: 'first_purchase',
    name: 'First Purchase',
    description: 'Made your first merchandise purchase',
    points: 50,
    icon: '🛍️',
    criteria: (stats) => stats.totalPurchases >= 1
  },
  DONATION_STARTER: {
    id: 'donation_starter',
    name: 'Donation Starter',
    description: 'Made your first donation to a campaign',
    points: 50,
    icon: '💰',
    criteria: (stats) => stats.totalDonations >= 1
  },
  GENEROUS_DONOR: {
    id: 'generous_donor',
    name: 'Generous Donor',
    description: 'Donated more than ₹1000 in total',
    points: 100,
    icon: '💎',
    criteria: (stats) => stats.donationAmount >= 1000
  },
  COLLECTOR: {
    id: 'collector',
    name: 'Collector', 
    description: 'Purchased items from 3 different categories',
    points: 75,
    icon: '🧩',
    criteria: (stats) => stats.categories.length >= 3
  },
  VOLUNTEER: {
    id: 'volunteer',
    name: 'Volunteer',
    description: 'Participated in an NGO activity or event',
    points: 100,
    icon: '🤝',
    criteria: (stats) => stats.activitiesJoined >= 1
  },
  LOYAL_SUPPORTER: {
    id: 'loyal_supporter',
    name: 'Loyal Supporter',
    description: 'Supported the same NGO at least 3 times',
    points: 150,
    icon: '⭐',
    criteria: (stats) => Object.values(stats.ngoSupport || {}).some(count => count >= 3)
  },
  SUSTAINABILITY_CHAMPION: {
    id: 'sustainability_champion',
    name: 'Sustainability Champion',
    description: 'Purchased 5 eco-friendly products',
    points: 125,
    icon: '🌱',
    criteria: (stats) => stats.ecoProducts >= 5
  }
};

// Points system values
const POINT_VALUES = {
  PURCHASE: 10,           // Points per purchase
  DONATION: 10,           // Base points per donation
  DONATION_AMOUNT: 0.1,   // Additional points per ₹100 donated
  ACTIVITY_JOIN: 50,      // Points for joining an activity
  CONSECUTIVE_DAYS: 5,    // Points for logging in consecutive days
  PROFILE_COMPLETE: 30,   // Points for completing profile
};

// Levels configuration
const LEVELS = [
  { level: 1, name: "Beginner", pointsRequired: 0 },
  { level: 2, name: "Supporter", pointsRequired: 100 },
  { level: 3, name: "Contributor", pointsRequired: 250 },
  { level: 4, name: "Champion", pointsRequired: 500 },
  { level: 5, name: "Hero", pointsRequired: 1000 },
  { level: 6, name: "Legend", pointsRequired: 2000 }
];

export function GamificationProvider({ children }) {
  const { user } = useAuth();
  const [userPoints, setUserPoints] = useState(0);
  const [userBadges, setUserBadges] = useState([]);
  const [userStats, setUserStats] = useState({
    totalPurchases: 0,
    totalDonations: 0,
    donationAmount: 0,
    categories: [],
    activitiesJoined: 0,
    ngoSupport: {},
    ecoProducts: 0,
    loginDays: 0,
    lastLogin: null,
    profileComplete: false
  });
  const [userLevel, setUserLevel] = useState(LEVELS[0]);
  const [loading, setLoading] = useState(true);
  const { showBadgeNotification, showLevelUpNotification, showPointsNotification } = useNotifications();
  const [previousLevel, setPreviousLevel] = useState(null);

  // Initialize or fetch user gamification data
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const userGamificationRef = doc(db, 'gamification', user.uid);
    
    const unsubscribe = onSnapshot(userGamificationRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setUserPoints(data.points || 0);
        setUserBadges(data.badges || []);
        setUserStats(data.stats || {
          totalPurchases: 0,
          totalDonations: 0,
          donationAmount: 0,
          categories: [],
          activitiesJoined: 0,
          ngoSupport: {},
          ecoProducts: 0,
          loginDays: 0,
          lastLogin: null,
          profileComplete: false
        });
        
        // Calculate user level based on points
        const newLevel = LEVELS.reduce((prev, curr) => 
          (userPoints >= curr.pointsRequired) ? curr : prev
        );
        setUserLevel(newLevel);
      } else {
        // Initialize user gamification document if it doesn't exist
        initializeUserGamification(user.uid);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, userPoints]);

  // Add this useEffect to check for level changes
  useEffect(() => {
    if (!loading && previousLevel && userLevel && previousLevel.level < userLevel.level) {
      // User has leveled up
      showLevelUpNotification(userLevel);
    }
    
    setPreviousLevel(userLevel);
  }, [userLevel, loading, previousLevel, showLevelUpNotification]);

  // Function to initialize a new user's gamification data
  const initializeUserGamification = async (userId) => {
    try {
      const userGamificationRef = doc(db, 'gamification', userId);
      await setDoc(userGamificationRef, {
        points: 0,
        badges: [],
        stats: {
          totalPurchases: 0,
          totalDonations: 0,
          donationAmount: 0,
          categories: [],
          activitiesJoined: 0,
          ngoSupport: {},
          ecoProducts: 0,
          loginDays: 0,
          lastLogin: new Date(),
          profileComplete: false
        },
        createdAt: new Date()
      });
    } catch (error) {
      console.error("Error initializing gamification data:", error);
    }
  };

  // Add points to user
  const addPoints = async (points, reason) => {
    if (!user) return;
    
    try {
      const newPoints = userPoints + points;
      const userGamificationRef = doc(db, 'gamification', user.uid);
      
      await updateDoc(userGamificationRef, {
        points: newPoints,
        pointsHistory: {
          [new Date().toISOString()]: {
            points,
            reason,
            timestamp: new Date()
          }
        }
      });
      
      // Show points notification
      showPointsNotification({ amount: points, reason });
      
      return newPoints;
    } catch (error) {
      console.error("Error adding points:", error);
      return userPoints;
    }
  };

  // Update user stats
  const updateStats = async (newStats) => {
    if (!user) return;
    
    try {
      const userGamificationRef = doc(db, 'gamification', user.uid);
      const updatedStats = { ...userStats, ...newStats };
      
      await updateDoc(userGamificationRef, {
        stats: updatedStats
      });
      
      // Check for new achievements after updating stats
      checkForAchievements(updatedStats);
      
      return updatedStats;
    } catch (error) {
      console.error("Error updating stats:", error);
      return userStats;
    }
  };

  // Check and award new achievements
  const checkForAchievements = async (stats) => {
    if (!user) return [];
    
    const newBadges = [];
    
    // Check each achievement to see if criteria are met
    Object.values(ACHIEVEMENTS).forEach(achievement => {
      // If user doesn't already have this badge and meets criteria
      if (!userBadges.find(badge => badge.id === achievement.id) && 
          achievement.criteria(stats)) {
        newBadges.push({
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          points: achievement.points,
          dateAwarded: new Date()
        });
      }
    });
    
    // If there are new badges to award
    if (newBadges.length > 0) {
      try {
        const userGamificationRef = doc(db, 'gamification', user.uid);
        const updatedBadges = [...userBadges, ...newBadges];
        
        // Calculate points from new achievements
        const pointsToAdd = newBadges.reduce(
          (sum, badge) => sum + (ACHIEVEMENTS[badge.id.toUpperCase()]?.points || 0), 
          0
        );
        
        await updateDoc(userGamificationRef, {
          badges: updatedBadges,
          points: userPoints + pointsToAdd
        });
        
        // Show badge notification
        showBadgeNotification(newBadges);
        
        // Return the newly earned badges so the UI can display them
        return newBadges;
      } catch (error) {
        console.error("Error awarding badges:", error);
        return [];
      }
    }
    
    return [];
  };

  // Record a purchase for gamification
  const recordPurchase = async (purchaseData) => {
    if (!user) return;
    
    try {
      // Extract data from purchase
      const { items, ngoId, totalAmount } = purchaseData;
      
      // Calculate stats updates
      const newCategories = [...new Set([
        ...userStats.categories,
        ...items.map(item => item.category)
      ])];
      
      // Update NGO support count
      const ngoSupport = { ...userStats.ngoSupport };
      ngoSupport[ngoId] = (ngoSupport[ngoId] || 0) + 1;
      
      // Count eco-friendly products if they have the eco tag
      const ecoProducts = items.filter(item => 
        item.tags && item.tags.includes('eco-friendly')
      ).length;
      
      // Update stats
      const updatedStats = await updateStats({
        totalPurchases: userStats.totalPurchases + 1,
        categories: newCategories,
        ngoSupport,
        ecoProducts: userStats.ecoProducts + ecoProducts
      });
      
      // Award points
      const purchasePoints = POINT_VALUES.PURCHASE * items.length;
      await addPoints(purchasePoints, `Purchase of ${items.length} items`);
      
      // Check for new badges
      const newBadges = await checkForAchievements(updatedStats);
      
      return { 
        updatedStats, 
        pointsAwarded: purchasePoints,
        newBadges
      };
    } catch (error) {
      console.error("Error recording purchase:", error);
      return { pointsAwarded: 0, newBadges: [] };
    }
  };

  // Record a donation for gamification
  const recordDonation = async (donationData) => {
    if (!user) return;
    
    try {
      const { amount, campaignId, ngoId } = donationData;
      
      // Update NGO support count
      const ngoSupport = { ...userStats.ngoSupport };
      ngoSupport[ngoId] = (ngoSupport[ngoId] || 0) + 1;
      
      // Update stats
      const updatedStats = await updateStats({
        totalDonations: userStats.totalDonations + 1,
        donationAmount: userStats.donationAmount + amount,
        ngoSupport
      });
      
      // Award points - base points plus bonus based on amount
      const donationPoints = POINT_VALUES.DONATION + 
        Math.floor((amount / 100) * POINT_VALUES.DONATION_AMOUNT);
      
      await addPoints(donationPoints, `Donation of ₹${amount}`);
      
      // Check for new badges
      const newBadges = await checkForAchievements(updatedStats);
      
      return { 
        updatedStats, 
        pointsAwarded: donationPoints,
        newBadges
      };
    } catch (error) {
      console.error("Error recording donation:", error);
      return { pointsAwarded: 0, newBadges: [] };
    }
  };

  // Record activity participation
  const recordActivityJoin = async (activityData) => {
    if (!user) return;
    
    try {
      const { activityId, ngoId } = activityData;
      
      // Update NGO support count
      const ngoSupport = { ...userStats.ngoSupport };
      ngoSupport[ngoId] = (ngoSupport[ngoId] || 0) + 1;
      
      // Update stats
      const updatedStats = await updateStats({
        activitiesJoined: userStats.activitiesJoined + 1,
        ngoSupport
      });
      
      // Award points
      await addPoints(POINT_VALUES.ACTIVITY_JOIN, `Joined activity ${activityId}`);
      
      // Check for new badges
      const newBadges = await checkForAchievements(updatedStats);
      
      return { 
        updatedStats, 
        pointsAwarded: POINT_VALUES.ACTIVITY_JOIN,
        newBadges
      };
    } catch (error) {
      console.error("Error recording activity join:", error);
      return { pointsAwarded: 0, newBadges: [] };
    }
  };

  // Get next level information
  const getNextLevel = () => {
    const currentLevelIndex = LEVELS.findIndex(level => level.level === userLevel.level);
    if (currentLevelIndex < LEVELS.length - 1) {
      return LEVELS[currentLevelIndex + 1];
    }
    return null; // User is at max level
  };

  // Get progress to next level as percentage
  const getLevelProgress = () => {
    const nextLevel = getNextLevel();
    if (!nextLevel) return 100; // Already at max level
    
    const currentLevelPoints = userLevel.pointsRequired;
    const nextLevelPoints = nextLevel.pointsRequired;
    const pointsRange = nextLevelPoints - currentLevelPoints;
    const userProgress = userPoints - currentLevelPoints;
    
    return Math.min(Math.floor((userProgress / pointsRange) * 100), 100);
  };

  const value = {
    userPoints,
    userBadges,
    userStats,
    userLevel,
    loading,
    addPoints,
    updateStats,
    recordPurchase,
    recordDonation,
    recordActivityJoin,
    getNextLevel,
    getLevelProgress,
    ACHIEVEMENTS,
    LEVELS
  };

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  return useContext(GamificationContext);
} 