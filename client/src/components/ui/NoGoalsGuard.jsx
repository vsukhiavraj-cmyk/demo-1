import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Target, Plus, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useGoalStore } from '../../store/goalStore.js';
import { useAuthStore } from '../../store/authStore.js';
import Button from './button.jsx';

const NoGoalsGuard = ({ children }) => {
  const navigate = useNavigate();
  const { hasGoals, isLoadingGoals, error, fetchGoals } = useGoalStore();
  const { isAuthenticated, isAuthChecked } = useAuthStore();

  // Show loading state while checking authentication or goals
  if (!isAuthChecked || isLoadingGoals) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <div className="text-white text-lg">
            {!isAuthChecked ? 'Checking authentication...' : 'Loading your goals...'}
          </div>
        </div>
      </div>
    );
  }

  // Handle unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
            className="w-24 h-24 bg-gradient-to-r from-yellow-500 to-gray-400 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Target size={40} className="text-white" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-2xl font-bold text-white mb-4"
          >
            Sign in to access your goals
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="text-gray-400 mb-8 leading-relaxed"
          >
            Create an account or sign in to start your personalized learning journey with AI-powered goals and tasks.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="space-y-4"
          >
            <Button
              onClick={() => navigate('/auth/signin')}
              variant="primary"
              size="lg"
              className="w-full"
            >
              Sign In
            </Button>
            <Button
              onClick={() => navigate('/auth/signup')}
              variant="outline"
              size="lg"
              className="w-full border-yellow-500 text-yellow-500 hover:bg-yellow-50"
            >
              Create Account
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Handle errors when fetching goals
  if (error) {
    const isNetworkError = error.includes('Network error') || error.includes('connection');
    const isAuthError = error.includes('log in') || error.includes('permission');
    
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
            className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            {isNetworkError ? <WifiOff size={40} className="text-white" /> : <AlertCircle size={40} className="text-white" />}
          </motion.div>

          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-2xl font-bold text-white mb-4"
          >
            {isNetworkError ? 'Connection Problem' : 'Unable to Load Goals'}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="text-gray-400 mb-8 leading-relaxed"
          >
            {error}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="space-y-4"
          >
            <Button
              onClick={() => fetchGoals()}
              variant="primary"
              size="lg"
              className="w-full"
            >
              Try Again
            </Button>
            {isAuthError && (
              <Button
                onClick={() => navigate('/auth/signin')}
                variant="outline"
                size="lg"
                className="w-full border-yellow-500 text-yellow-500 hover:bg-yellow-50"
              >
                Sign In
              </Button>
            )}
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Show no goals message if user has no goals
  if (!hasGoals()) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
            className="w-24 h-24 bg-gradient-to-r from-yellow-500 to-gray-400 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Target size={40} className="text-white" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-2xl font-bold text-white mb-4"
          >
            No learning goal found
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="text-gray-400 mb-8 leading-relaxed"
          >
            Create your first learning goal to get started with personalized tasks, 
            progress tracking, and AI-powered learning recommendations.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <Button
              onClick={() => navigate('/assessment?new=true')}
              variant="primary"
              size="lg"
              className="inline-flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>Create New Goal</span>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="mt-6 text-sm text-gray-500"
          >
            This will take you through a quick assessment to create your personalized learning path.
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Render children if user has goals
  return children;
};

export default NoGoalsGuard;