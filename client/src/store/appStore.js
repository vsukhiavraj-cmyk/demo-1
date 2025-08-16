import { create } from "zustand";
import { useGoalStore } from "./goalStore.js";
import { useTaskStore } from "./taskStore.js";
import { useDashboardStore } from "./dashboardStore.js";
import { useAuthStore } from "./authStore.js";

// Main app store that coordinates between other stores
export const useAppStore = create((set, get) => ({
  // Current page tracking
  currentPage: null,
  
  // Loading states
  isInitializing: false,
  
  // Actions
  setCurrentPage: (page) => {
    set({ currentPage: page });
  },

  // Initialize the app - called on app start
  initializeApp: async () => {
    set({ isInitializing: true });
    
    try {
      // Check authentication first
      const authStore = useAuthStore.getState();
      await authStore.checkAuth();
      
      // If authenticated, initialize goals
      if (authStore.isAuthenticated) {
        const goalStore = useGoalStore.getState();
        try {
          await goalStore.initializeGoals();
        } catch (goalError) {
          console.warn("Failed to initialize goals:", goalError);
          // Don't throw - let the UI handle the goal loading error
        }
      }
    } catch (error) {
      console.error("Error initializing app:", error);
      // Don't throw - let individual components handle their errors
    } finally {
      set({ isInitializing: false });
    }
  },

  // Refetch data for current page based on active goal
  refetchCurrentPageData: async () => {
    const { currentPage } = get();
    const goalStore = useGoalStore.getState();
    const activeGoalId = goalStore.activeGoalId;
    
    if (!activeGoalId) return;

    try {
      switch (currentPage) {
        case 'dashboard':
          const dashboardStore = useDashboardStore.getState();
          await dashboardStore.fetchDashboardData(activeGoalId);
          break;
          
        case 'tasks':
          const taskStore = useTaskStore.getState();
          await taskStore.fetchTasks(activeGoalId);
          break;
          
        case 'learning':
          const learningDashboardStore = useDashboardStore.getState();
          await learningDashboardStore.fetchLearningStats(activeGoalId);
          break;
          
        default:
          // For other pages, emit the custom event
          window.dispatchEvent(new CustomEvent('goalChanged', { 
            detail: { activeGoalId } 
          }));
          break;
      }
    } catch (error) {
      console.error("Error refetching page data:", error);
    }
  },

  // Handle logout - clear all stores
  handleLogout: () => {
    const goalStore = useGoalStore.getState();
    const taskStore = useTaskStore.getState();
    const dashboardStore = useDashboardStore.getState();
    
    goalStore.clearGoalData();
    dashboardStore.clearData();
    // Task store will be cleared by its own persistence mechanism
    
    set({ currentPage: null, isInitializing: false });
  },

  // Get combined app state for debugging
  getAppState: () => {
    const authStore = useAuthStore.getState();
    const goalStore = useGoalStore.getState();
    const taskStore = useTaskStore.getState();
    const dashboardStore = useDashboardStore.getState();
    
    return {
      app: get(),
      auth: {
        isAuthenticated: authStore.isAuthenticated,
        user: authStore.user,
        isAuthChecked: authStore.isAuthChecked
      },
      goals: {
        goals: goalStore.goals,
        activeGoalId: goalStore.activeGoalId,
        hasGoals: goalStore.hasGoals(),
        hasMultipleGoals: goalStore.hasMultipleGoals()
      },
      tasks: {
        tasksCount: taskStore.tasks.length,
        isLoading: taskStore.isLoading
      },
      dashboard: {
        hasData: !!dashboardStore.data,
        isLoading: dashboardStore.isLoading
      }
    };
  }
}));

// Update the goal store's refetchCurrentPageData to use the app store
const originalGoalStore = useGoalStore.getState();
useGoalStore.setState({
  ...originalGoalStore,
  refetchCurrentPageData: () => {
    const appStore = useAppStore.getState();
    appStore.refetchCurrentPageData();
  }
});