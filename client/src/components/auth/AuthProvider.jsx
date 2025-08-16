import React, { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore.js';

/**
 * AuthProvider component that handles initial authentication check
 * This component runs once when the app loads and verifies the user's authentication status
 */
export default function AuthProvider({ children }) {
  const { checkAuth, isAuthChecked, isAuthLoading } = useAuthStore();

  useEffect(() => {
    // Only run the auth check once when the component mounts
    if (!isAuthChecked && !isAuthLoading) {
      checkAuth();
    }
  }, []); // Empty dependency array ensures this runs only once

  // Show loading state while checking authentication
  if (!isAuthChecked && isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan mx-auto mb-4"></div>
          <p className="text-snow">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Render children once auth check is complete
  return children;
}