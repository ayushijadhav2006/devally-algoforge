"use client";

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const TypingText = ({ 
  text, 
  className = "", 
  speed = 40, 
  startDelay = 0,
  cursorDuration = 1000,
  showCursorOnComplete = true,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const intervalRef = useRef(null);
  const cursorIntervalRef = useRef(null);

  useEffect(() => {
    // Reset on text change
    setDisplayedText('');
    setIsComplete(false);
    
    // Clear existing intervals
    if (intervalRef.current) clearTimeout(intervalRef.current);
    if (cursorIntervalRef.current) clearInterval(cursorIntervalRef.current);
    
    // Start cursor blinking
    cursorIntervalRef.current = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, cursorDuration);

    // Start typing after delay
    intervalRef.current = setTimeout(() => {
      let currentIndex = 0;
      
      const typingInterval = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(prev => prev + text[currentIndex]);
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsComplete(true);
          
          // If we don't want cursor after completion, clear the interval
          if (!showCursorOnComplete) {
            clearInterval(cursorIntervalRef.current);
            setCursorVisible(false);
          }
        }
      }, speed);
      
      return () => clearInterval(typingInterval);
    }, startDelay);

    // Cleanup
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
      if (cursorIntervalRef.current) clearInterval(cursorIntervalRef.current);
    };
  }, [text, speed, startDelay, cursorDuration, showCursorOnComplete]);

  return (
    <motion.span 
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {displayedText}
      <span 
        className="inline-block w-[0.05em] h-[1.2em] bg-current ml-[0.1em] align-middle"
        style={{ 
          opacity: cursorVisible ? 1 : 0,
          transition: 'opacity 0.2s ease'
        }}
      />
    </motion.span>
  );
};

export default TypingText; 