"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import BadgeNotification from '@/components/BadgeNotification';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronsUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Create context
const NotificationContext = createContext({
  showBadgeNotification: () => {},
  showLevelUpNotification: () => {},
  showPointsNotification: () => {},
});

export function NotificationProvider({ children }) {
  const [badges, setBadges] = useState([]);
  const [showBadges, setShowBadges] = useState(false);
  const [levelUp, setLevelUp] = useState(null);
  const [points, setPoints] = useState(null);
  
  // Show badge notification
  const showBadgeNotification = (newBadges) => {
    if (!newBadges || newBadges.length === 0) return;
    
    setBadges(newBadges);
    setShowBadges(true);
  };
  
  // Show level up notification
  const showLevelUpNotification = (levelData) => {
    if (!levelData) return;
    
    setLevelUp(levelData);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setLevelUp(null);
    }, 5000);
  };
  
  // Show points notification
  const showPointsNotification = (pointsData) => {
    if (!pointsData) return;
    
    setPoints(pointsData);
    
    // Auto dismiss after 3 seconds
    setTimeout(() => {
      setPoints(null);
    }, 3000);
  };
  
  // Close badge notification
  const closeBadgeNotification = () => {
    setShowBadges(false);
    setBadges([]);
  };
  
  // Close level up notification
  const closeLevelUpNotification = () => {
    setLevelUp(null);
  };
  
  // Close points notification
  const closePointsNotification = () => {
    setPoints(null);
  };
  
  const value = {
    showBadgeNotification,
    showLevelUpNotification,
    showPointsNotification,
  };
  
  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Badge Notification */}
      {showBadges && (
        <BadgeNotification 
          badges={badges} 
          onClose={closeBadgeNotification} 
        />
      )}
      
      {/* Level Up Notification */}
      <AnimatePresence>
        {levelUp && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-2" />
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <ChevronsUp className="h-5 w-5 text-indigo-500" />
                  Level Up!
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={closeLevelUpNotification}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="mt-4 text-center">
                <div className="text-3xl font-bold">Level {levelUp.level}</div>
                <div className="mt-1 text-lg font-medium text-primary">{levelUp.name}</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Congratulations! You've reached a new impact level.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Points Notification */}
      <AnimatePresence>
        {points && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed bottom-5 right-5 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 px-4 flex items-center gap-2"
          >
            <div className="p-1.5 rounded-full bg-green-100">
              <ChevronsUp className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <span className="text-sm font-medium">+{points.amount}</span>
              <span className="text-xs text-muted-foreground ml-1">points</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
} 