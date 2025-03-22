"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Award, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export function BadgeNotification({ badges, onClose }) {
  const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0);
  
  useEffect(() => {
    // Auto close after 10 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 10000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  if (!badges || badges.length === 0) return null;
  
  const currentBadge = badges[currentBadgeIndex];
  
  // Get icon component based on emoji
  const getIcon = (icon) => {
    switch(icon) {
      case '🏆': return <Trophy className="h-8 w-8 text-yellow-500" />;
      case '⭐': return <Star className="h-8 w-8 text-yellow-500" />;
      default: return <Award className="h-8 w-8 text-blue-500" />;
    }
  };
  
  // Navigate between badges
  const nextBadge = () => {
    if (currentBadgeIndex < badges.length - 1) {
      setCurrentBadgeIndex(currentBadgeIndex + 1);
    } else {
      onClose();
    }
  };
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed top-5 right-5 z-50 max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden"
      >
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-2" />
        <div className="p-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Achievement Unlocked!
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mt-4 flex gap-4 items-center">
            <div className="bg-primary/10 p-4 rounded-full flex-shrink-0">
              {currentBadge.icon ? (
                <div className="text-3xl">{currentBadge.icon}</div>
              ) : (
                getIcon(currentBadge.type)
              )}
            </div>
            
            <div>
              <h3 className="font-bold text-lg">{currentBadge.name}</h3>
              <p className="text-sm text-muted-foreground">{currentBadge.description}</p>
              <div className="mt-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  +{currentBadge.points} points
                </Badge>
              </div>
            </div>
          </div>
          
          {badges.length > 1 && (
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {currentBadgeIndex + 1} of {badges.length}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={nextBadge}
              >
                {currentBadgeIndex < badges.length - 1 ? "Next Badge" : "Close"}
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default BadgeNotification; 