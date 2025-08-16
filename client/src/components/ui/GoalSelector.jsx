import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Target, Loader2 } from 'lucide-react';
import { useGoalStore } from '../../store/goalStore.js';

const GoalSelector = ({ className = '' }) => {
  const { 
    goals, 
    activeGoalId, 
    setActiveGoal, 
    hasMultipleGoals, 
    getActiveGoal,
    isLoadingGoals 
  } = useGoalStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const activeGoal = getActiveGoal();

  // Don't render if user has only one goal or no goals
  if (!hasMultipleGoals() || isLoadingGoals) {
    return null;
  }

  const handleGoalChange = async (goalId) => {
    if (goalId === activeGoalId) {
      setIsOpen(false);
      return;
    }

    setIsChanging(true);
    setIsOpen(false);

    try {
      // Add a small delay for smooth transition
      await new Promise(resolve => setTimeout(resolve, 150));
      setActiveGoal(goalId);
    } catch (error) {
      console.error('Error changing goal:', error);
    } finally {
      // Keep loading state for a bit longer to show the transition
      setTimeout(() => setIsChanging(false), 500);
    }
  };

  const dropdownVariants = {
    hidden: {
      opacity: 0,
      y: -10,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      y: -10,
      scale: 0.95,
      transition: {
        duration: 0.15,
        ease: "easeIn"
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.2
      }
    })
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Selector Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isChanging}
        className="btn-primary btn-md w-full justify-between min-w-[200px]"
      >
        <div className="flex items-center space-x-2">
          <Target size={18} />
          <span className="text-sm font-medium">
            {isChanging ? 'Switching...' : (activeGoal?.field || 'Select Goal')}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {isChanging && <Loader2 size={16} className="animate-spin" />}
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={16} />
          </motion.div>
        </div>


      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute top-full left-0 right-0 mt-2 z-50"
          >
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
              <div className="py-2">
                {goals.map((goal, index) => (
                  <motion.button
                    key={goal._id}
                    custom={index}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    onClick={() => handleGoalChange(goal._id)}
                    className={`
                      w-full px-4 py-3 text-left flex items-center space-x-3
                      transition-colors duration-150
                      ${goal._id === activeGoalId 
                        ? 'bg-gradient-to-r from-yellow-500/20 to-gray-400/20 text-yellow-300' 
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }
                    `}
                  >
                    <Target 
                      size={16} 
                      className={goal._id === activeGoalId ? 'text-yellow-400' : 'text-gray-500'} 
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {goal.field}
                      </div>
                      {goal.description && (
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {goal.description}
                        </div>
                      )}
                    </div>
                    {goal._id === activeGoalId && (
                      <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default GoalSelector;