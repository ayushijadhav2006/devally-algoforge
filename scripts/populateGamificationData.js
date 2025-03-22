// This script can be run from your browser console while logged in to add sample gamification data

import { db } from '../lib/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Use this script to populate your Firebase Firestore with sample gamification data
 * Run it from the browser console while logged in to your application
 */

// Function to create a Firestore timestamp (since we can't use serverTimestamp in the browser console)
const createTimestamp = (daysAgo = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

// Sample users with gamification data
const sampleUsers = [
  {
    name: "John Doe",
    userId: "user1", // Replace with a real user ID from your users collection
    points: 750,
    badges: [
      {
        id: "first_purchase",
        name: "First Purchase",
        description: "Made your first merchandise purchase",
        icon: "🛍️",
        points: 50,
        dateAwarded: createTimestamp(30)
      },
      {
        id: "donation_starter",
        name: "Donation Starter",
        description: "Made your first donation to a campaign",
        icon: "💰",
        points: 50,
        dateAwarded: createTimestamp(25)
      },
      {
        id: "volunteer",
        name: "Volunteer",
        description: "Participated in an NGO activity or event",
        icon: "🤝",
        points: 100,
        dateAwarded: createTimestamp(10)
      }
    ],
    stats: {
      totalPurchases: 5,
      totalDonations: 3,
      donationAmount: 2500,
      categories: ["clothing", "books", "accessories"],
      activitiesJoined: 2,
      ngoSupport: {
        "ngo123": 4,
        "ngo456": 2
      },
      ecoProducts: 2,
      loginDays: 15,
      lastLogin: createTimestamp(1),
      profileComplete: true
    }
  },
  {
    name: "Jane Smith",
    userId: "user2", // Replace with a real user ID
    points: 1250,
    badges: [
      {
        id: "first_purchase",
        name: "First Purchase",
        description: "Made your first merchandise purchase",
        icon: "🛍️",
        points: 50,
        dateAwarded: createTimestamp(45)
      },
      {
        id: "donation_starter",
        name: "Donation Starter",
        description: "Made your first donation to a campaign",
        icon: "💰",
        points: 50,
        dateAwarded: createTimestamp(40)
      },
      {
        id: "generous_donor",
        name: "Generous Donor",
        description: "Donated more than ₹1000 in total",
        icon: "💎",
        points: 100,
        dateAwarded: createTimestamp(30)
      },
      {
        id: "collector",
        name: "Collector",
        description: "Purchased items from 3 different categories",
        icon: "🧩",
        points: 75,
        dateAwarded: createTimestamp(20)
      },
      {
        id: "volunteer",
        name: "Volunteer",
        description: "Participated in an NGO activity or event",
        icon: "🤝",
        points: 100,
        dateAwarded: createTimestamp(15)
      }
    ],
    stats: {
      totalPurchases: 8,
      totalDonations: 5,
      donationAmount: 3500,
      categories: ["clothing", "books", "accessories", "stationery"],
      activitiesJoined: 3,
      ngoSupport: {
        "ngo123": 6,
        "ngo456": 4,
        "ngo789": 2
      },
      ecoProducts: 4,
      loginDays: 25,
      lastLogin: createTimestamp(0),
      profileComplete: true
    }
  },
  {
    name: "Alex Johnson",
    userId: "user3", // Replace with a real user ID
    points: 350,
    badges: [
      {
        id: "first_purchase",
        name: "First Purchase",
        description: "Made your first merchandise purchase",
        icon: "🛍️",
        points: 50,
        dateAwarded: createTimestamp(15)
      },
      {
        id: "donation_starter",
        name: "Donation Starter",
        description: "Made your first donation to a campaign",
        icon: "💰",
        points: 50,
        dateAwarded: createTimestamp(10)
      }
    ],
    stats: {
      totalPurchases: 2,
      totalDonations: 1,
      donationAmount: 500,
      categories: ["clothing", "accessories"],
      activitiesJoined: 0,
      ngoSupport: {
        "ngo123": 2
      },
      ecoProducts: 1,
      loginDays: 7,
      lastLogin: createTimestamp(2),
      profileComplete: true
    }
  },
  {
    name: "Maria Garcia",
    userId: "user4", // Replace with a real user ID
    points: 1800,
    badges: [
      {
        id: "first_purchase",
        name: "First Purchase",
        description: "Made your first merchandise purchase",
        icon: "🛍️",
        points: 50,
        dateAwarded: createTimestamp(60)
      },
      {
        id: "donation_starter",
        name: "Donation Starter",
        description: "Made your first donation to a campaign",
        icon: "💰",
        points: 50,
        dateAwarded: createTimestamp(55)
      },
      {
        id: "generous_donor",
        name: "Generous Donor",
        description: "Donated more than ₹1000 in total",
        icon: "💎",
        points: 100,
        dateAwarded: createTimestamp(45)
      },
      {
        id: "collector",
        name: "Collector",
        description: "Purchased items from 3 different categories",
        icon: "🧩",
        points: 75,
        dateAwarded: createTimestamp(40)
      },
      {
        id: "volunteer",
        name: "Volunteer",
        description: "Participated in an NGO activity or event",
        icon: "🤝",
        points: 100,
        dateAwarded: createTimestamp(35)
      },
      {
        id: "loyal_supporter",
        name: "Loyal Supporter",
        description: "Supported the same NGO at least 3 times",
        icon: "⭐",
        points: 150,
        dateAwarded: createTimestamp(25)
      },
      {
        id: "sustainability_champion",
        name: "Sustainability Champion",
        description: "Purchased 5 eco-friendly products",
        icon: "🌱",
        points: 125,
        dateAwarded: createTimestamp(15)
      }
    ],
    stats: {
      totalPurchases: 15,
      totalDonations: 8,
      donationAmount: 6000,
      categories: ["clothing", "books", "accessories", "stationery", "eco-friendly"],
      activitiesJoined: 5,
      ngoSupport: {
        "ngo123": 10,
        "ngo456": 6,
        "ngo789": 4
      },
      ecoProducts: 7,
      loginDays: 45,
      lastLogin: createTimestamp(0),
      profileComplete: true
    }
  },
  {
    name: "Current User",
    userId: "currentUser", // This will be replaced with the current user's ID
    points: 520,
    badges: [
      {
        id: "first_purchase",
        name: "First Purchase",
        description: "Made your first merchandise purchase",
        icon: "🛍️",
        points: 50,
        dateAwarded: createTimestamp(20)
      },
      {
        id: "donation_starter",
        name: "Donation Starter",
        description: "Made your first donation to a campaign",
        icon: "💰",
        points: 50,
        dateAwarded: createTimestamp(15)
      },
      {
        id: "volunteer",
        name: "Volunteer",
        description: "Participated in an NGO activity or event",
        icon: "🤝",
        points: 100,
        dateAwarded: createTimestamp(10)
      }
    ],
    stats: {
      totalPurchases: 3,
      totalDonations: 2,
      donationAmount: 1200,
      categories: ["clothing", "books"],
      activitiesJoined: 1,
      ngoSupport: {
        "ngo123": 3,
        "ngo456": 1
      },
      ecoProducts: 1,
      loginDays: 12,
      lastLogin: createTimestamp(0),
      profileComplete: true
    }
  }
];

// Function to populate the gamification data
async function populateGamificationData() {
  try {
    console.log("Starting to populate gamification data...");
    
    // Get the current user's ID
    const auth = firebase.auth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.error("No user is logged in. Please log in first.");
      return;
    }
    
    const currentUserId = currentUser.uid;
    console.log("Current user ID:", currentUserId);
    
    // Process each sample user
    for (const user of sampleUsers) {
      // If this is the "currentUser" entry, use the actual current user's ID
      const userId = user.userId === "currentUser" ? currentUserId : user.userId;
      
      // Create a reference to the gamification document
      const gamificationRef = doc(db, 'gamification', userId);
      
      // Set the data
      await setDoc(gamificationRef, {
        points: user.points,
        badges: user.badges,
        stats: user.stats,
        createdAt: createTimestamp(60) // Created 60 days ago
      });
      
      console.log(`Added gamification data for user: ${user.name} (${userId})`);
    }
    
    console.log("Successfully populated gamification data!");
  } catch (error) {
    console.error("Error populating gamification data:", error);
  }
}

// Copy this function and run it in your browser console
async function addSampleGamificationData() {
  // Simplified version for direct browser console execution
  try {
    // Get the current user's ID
    const currentUserId = firebase.auth().currentUser.uid;
    console.log("Current user ID:", currentUserId);
    
    // Sample data for 5 users including the current user
    const users = [
      {id: "user1", points: 750},
      {id: "user2", points: 1250},
      {id: "user3", points: 350},
      {id: "user4", points: 1800},
      {id: currentUserId, points: 520}
    ];
    
    for (const user of users) {
      // Create badges based on points
      const badges = [];
      
      // First Purchase badge (everyone gets this)
      badges.push({
        id: "first_purchase",
        name: "First Purchase",
        description: "Made your first merchandise purchase",
        icon: "🛍️",
        points: 50,
        dateAwarded: new Date(Date.now() - (Math.random() * 50 * 86400000))
      });
      
      // Donation Starter badge (everyone gets this)
      badges.push({
        id: "donation_starter",
        name: "Donation Starter",
        description: "Made your first donation to a campaign",
        icon: "💰",
        points: 50,
        dateAwarded: new Date(Date.now() - (Math.random() * 45 * 86400000))
      });
      
      // Add more badges based on points
      if (user.points >= 500) {
        badges.push({
          id: "volunteer",
          name: "Volunteer",
          description: "Participated in an NGO activity or event",
          icon: "🤝",
          points: 100,
          dateAwarded: new Date(Date.now() - (Math.random() * 30 * 86400000))
        });
      }
      
      if (user.points >= 1000) {
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
      
      if (user.points >= 1500) {
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
      
      // Calculate stats based on points and badges
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
        createdAt: new Date(Date.now() - (60 * 86400000)) // 60 days ago
      };
      
      // Add the data to Firestore
      await firebase.firestore().collection('gamification').doc(user.id).set(gamificationData);
      console.log(`Added gamification data for user: ${user.id}`);
    }
    
    console.log("Successfully added sample gamification data!");
  } catch (error) {
    console.error("Error adding sample data:", error);
  }
}

// Execute the function to populate the data
populateGamificationData();

// Browser Console Friendly Version
// Copy and paste this into your browser console when logged in
async function addTestData() {
  const currentUser = firebase.auth().currentUser;
  if (!currentUser) {
    console.error("No user is logged in. Please log in first.");
    return;
  }
  
  const currentUserId = currentUser.uid;
  console.log("Current user ID:", currentUserId);
  
  // Create test data for current user and 4 other users
  const testUsers = [
    {id: "test_user1", points: 750, name: "John Doe"},
    {id: "test_user2", points: 1250, name: "Jane Smith"},
    {id: "test_user3", points: 350, name: "Alex Johnson"},
    {id: "test_user4", points: 1800, name: "Maria Garcia"},
    {id: currentUserId, points: 520, name: currentUser.displayName || "Current User"}
  ];
  
  for (const user of testUsers) {
    try {
      // Create data for this user
      const badges = [];
      
      // Everyone gets these two badges
      badges.push({
        id: "first_purchase",
        name: "First Purchase",
        description: "Made your first merchandise purchase",
        icon: "🛍️",
        points: 50,
        dateAwarded: new Date(Date.now() - (20 * 86400000))
      });
      
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
      
      // Sample user stats
      const userStats = {
        totalPurchases: Math.floor(user.points / 100),
        totalDonations: Math.floor(user.points / 200),
        donationAmount: Math.floor(user.points / 200) * 500,
        categories: ["clothing", "books"],
        activitiesJoined: user.points >= 500 ? 1 : 0,
        ngoSupport: { "ngo123": Math.floor(user.points / 250) },
        ecoProducts: Math.floor(user.points / 400),
        loginDays: Math.floor(user.points / 50),
        lastLogin: new Date(),
        profileComplete: true
      };
      
      // Create the gamification data document
      await firebase.firestore().collection('gamification').doc(user.id).set({
        points: user.points,
        badges: badges,
        stats: userStats,
        createdAt: new Date(Date.now() - (30 * 86400000))
      });
      
      console.log(`Added gamification data for ${user.name} (${user.id})`);
      
      // If this is a test user (not the current user), also create a basic user profile
      if (user.id.startsWith('test_')) {
        await firebase.firestore().collection('users').doc(user.id).set({
          name: user.name,
          email: `${user.id}@example.com`,
          createdAt: new Date(Date.now() - (30 * 86400000))
        });
        console.log(`Added user profile for ${user.name}`);
      }
      
    } catch (error) {
      console.error(`Error adding data for ${user.id}:`, error);
    }
  }
  
  console.log("✅ Done adding test data!");
} 