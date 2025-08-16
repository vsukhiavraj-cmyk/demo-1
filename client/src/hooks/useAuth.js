import { useAuthStore } from '../store/authStore.js';

/**
 * Custom hook for authentication operations
 * Provides methods to check auth status and trigger re-authentication when needed
 */
export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isAuthChecked,
    isAuthLoading,
    login,
    signup,
    logout,
    checkAuth,
    recheckAuth,
    clearAuth,
    handleAuthFailure
  } = useAuthStore();

  /**
   * Trigger re-authentication check
   * Use this when you need to verify auth status after certain actions
   */
  const refreshAuth = async () => {
    await recheckAuth();
  };

  /**
   * Check if user is authenticated and auth check is complete
   */
  const isReady = isAuthChecked && !isAuthLoading;

  /**
   * Check if authentication is still being verified
   */
  const isLoading = isAuthLoading || !isAuthChecked;

  return {
    // Auth state
    user,
    isAuthenticated,
    isAuthChecked,
    isAuthLoading,
    isReady,
    isLoading,

    // Auth actions
    login,
    signup,
    logout,
    refreshAuth,
    clearAuth,
    handleAuthFailure,

    // Internal methods (use with caution)
    checkAuth,
    recheckAuth
  };
};

export default useAuth;