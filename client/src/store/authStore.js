import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  login as apiLogin,
  signup as apiSignup,
  logout as apiLogout,
} from "../services/api.js";
import api from "../services/api.js";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isAuthChecked: false, // Flag to track if auth check has been performed
      isAuthLoading: false, // Loading state for auth check

      login: async (credentials) => {
        try {
          const response = await apiLogin(credentials);
          const { user, token } = response.data;

          // Store token for future requests
          if (token) {
            localStorage.setItem("token", token);
          }

          set({ user, isAuthenticated: true, isAuthChecked: true });
          return { user, token };
        } catch (error) {
          // Provide user-friendly error messages
          let errorMessage = 'Login failed. Please try again.';
          
          if (error.response?.status === 401) {
            errorMessage = error.response?.data?.message || 'Invalid email or password.';
          } else if (error.response?.status === 422) {
            errorMessage = error.response?.data?.message || 'Please check your input and try again.';
          } else if (error.response?.status >= 500) {
            errorMessage = 'Server error. Please try again later.';
          } else if (!error.response) {
            errorMessage = 'Network error. Please check your connection and try again.';
          }
          
          // Create a new error with user-friendly message
          const userError = new Error(errorMessage);
          userError.response = error.response;
          userError.originalError = error;
          
          throw userError;
        }
      },

      signup: async (userData) => {
        try {
          const response = await apiSignup(userData);
          const { user, token } = response.data;

          // Store token for future requests
          if (token) {
            localStorage.setItem("token", token);
          }

          set({ user, isAuthenticated: true, isAuthChecked: true });
          return { user, token };
        } catch (error) {
          // Provide user-friendly error messages
          let errorMessage = 'Signup failed. Please try again.';
          
          if (error.response?.status === 409) {
            errorMessage = error.response?.data?.message || 'An account with this email already exists.';
          } else if (error.response?.status === 422) {
            errorMessage = error.response?.data?.message || 'Please check your input and try again.';
          } else if (error.response?.status >= 500) {
            errorMessage = 'Server error. Please try again later.';
          } else if (!error.response) {
            errorMessage = 'Network error. Please check your connection and try again.';
          }
          
          // Create a new error with user-friendly message
          const userError = new Error(errorMessage);
          userError.response = error.response;
          userError.originalError = error;
          
          throw userError;
        }
      },

      logout: async () => {
        try {
          await apiLogout();
        } catch (error) {
          console.error("Logout API call failed:", error);
        } finally {
          localStorage.removeItem("token");
          set({ 
            user: null, 
            isAuthenticated: false, 
            isAuthChecked: true // Keep as checked after logout
          });
        }
      },

      // Check authentication status with server
      checkAuth: async () => {
        const { isAuthChecked, isAuthLoading } = get();
        
        // Prevent multiple simultaneous checks
        if (isAuthChecked || isAuthLoading) {
          return;
        }

        const token = localStorage.getItem("token");
        
        // If no token, mark as checked and not authenticated
        if (!token) {
          set({ 
            isAuthenticated: false, 
            user: null, 
            isAuthChecked: true,
            isAuthLoading: false 
          });
          return;
        }

        set({ isAuthLoading: true });

        try {
          // Verify token with server
          const response = await api.get("/auth/me");
          const userData = response.data.data;

          set({ 
            user: userData, 
            isAuthenticated: true, 
            isAuthChecked: true,
            isAuthLoading: false 
          });
        } catch (error) {
          console.error("Auth check failed:", error);
          
          // Determine error message based on error type
          let errorMessage = 'Authentication verification failed';
          if (error.response?.status === 401) {
            errorMessage = 'Your session has expired. Please log in again.';
          } else if (error.response?.status >= 500) {
            errorMessage = 'Server error during authentication check. Please try again.';
          } else if (!error.response) {
            errorMessage = 'Network error during authentication check. Please check your connection.';
          }
          
          // Token is invalid, remove it and clear auth state
          localStorage.removeItem("token");
          set({ 
            user: null, 
            isAuthenticated: false, 
            isAuthChecked: true,
            isAuthLoading: false 
          });
          
          // Log the specific error for debugging
          console.error("Auth check error details:", errorMessage);
        }
      },

      // Force re-check authentication (for manual refresh scenarios)
      recheckAuth: async () => {
        set({ isAuthChecked: false, isAuthLoading: false });
        await get().checkAuth();
      },

      // Initialize auth state from localStorage on app start
      initializeAuth: () => {
        const token = localStorage.getItem("token");
        if (token) {
          // Don't set isAuthenticated yet, let checkAuth verify the token
          set({ isAuthenticated: false, isAuthChecked: false });
        } else {
          set({ isAuthenticated: false, isAuthChecked: true });
        }
      },

      // Clear auth state (for testing or manual logout)
      clearAuth: () => {
        localStorage.removeItem("token");
        set({ 
          user: null, 
          isAuthenticated: false, 
          isAuthChecked: true,
          isAuthLoading: false 
        });
      },

      // Handle authentication failures (called by API interceptor)
      handleAuthFailure: (errorMessage = 'Authentication failed') => {
        // Clear token and auth state
        localStorage.removeItem("token");
        set({ 
          user: null, 
          isAuthenticated: false, 
          isAuthChecked: true,
          isAuthLoading: false 
        });
        
        // Log the error for debugging
        console.error('Authentication failure:', errorMessage);
        
        // Return the error message for the caller to handle
        return errorMessage;
      },
    }),
    {
      name: "auth-storage", // key in localStorage
      storage: createJSONStorage(() => localStorage), // defaults to localStorage
      partialize: (state) => ({
        // persist only these fields
        user: state.user,
        // Don't persist isAuthenticated - it should be determined by token validation
        // Don't persist isAuthChecked - it should reset on app reload
      }),
    }
  )
);
