import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, isReady } = useAuth();

  // Show loading state while authentication is being checked
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan mx-auto mb-4"></div>
          <p className="text-snow">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Once auth check is complete, redirect if not authenticated
  if (isReady && !isAuthenticated) {
    return <Navigate to="/auth/signin" replace />;
  }

  // Render protected content if authenticated
  return isAuthenticated ? children : null;
};

export default ProtectedRoute; 