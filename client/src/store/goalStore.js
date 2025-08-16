import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api, { aiApi, createGoalWithUnlimitedTime } from "../services/api.js";

export const useGoalStore = create(
  persist(
    (set, get) => ({
      // Goal state
      goals: [],
      activeGoalId: null,
      isLoadingGoals: false,
      isGeneratingTasks: false,
      error: null,

      // Actions
      setActiveGoal: (goalId) => {
        set({ activeGoalId: goalId });
        // Trigger data refetch for current page
        get().refetchCurrentPageData();
      },

      setGoals: (goals) => {
        set({ goals });
        // Set active goal to most recent if none selected and goals exist
        const currentActiveGoalId = get().activeGoalId;
        if (!currentActiveGoalId && goals.length > 0) {
          // Find the most recently created goal
          const mostRecentGoal = goals.reduce((latest, current) => {
            const latestDate = new Date(latest.createdAt || latest._id);
            const currentDate = new Date(current.createdAt || current._id);
            return currentDate > latestDate ? current : latest;
          });
          set({ activeGoalId: mostRecentGoal._id });
        }
      },

      fetchGoals: async () => {
        set({ isLoadingGoals: true, error: null });
        try {
          const response = await api.get("/goals");
          const goals = response.data?.data || [];
          get().setGoals(goals);
          set({ isLoadingGoals: false });
          return goals;
        } catch (error) {
          console.error("Error fetching goals:", error);
          
          // Handle different error scenarios
          let errorMessage = "Failed to fetch goals";
          
          if (error.response?.status === 401) {
            errorMessage = "Please log in to view your goals";
          } else if (error.response?.status === 403) {
            errorMessage = "You don't have permission to view goals";
          } else if (error.response?.status >= 500) {
            errorMessage = "Server error. Please try again later";
          } else if (!error.response) {
            errorMessage = "Network error. Please check your connection";
          } else {
            errorMessage = error.response?.data?.message || errorMessage;
          }
          
          set({ 
            error: errorMessage, 
            isLoadingGoals: false 
          });
          return [];
        }
      },

      createGoal: async (goalData) => {
        set({ isGeneratingTasks: true, error: null });
        try {
          // Use unlimited time API to ensure all tasks are generated
          const response = await createGoalWithUnlimitedTime(goalData);
          const newGoal = response.data?.data?.goal || response.data?.data;
          
          if (newGoal) {
            // Add new goal to the list
            const currentGoals = get().goals;
            const updatedGoals = [...currentGoals, newGoal];
            get().setGoals(updatedGoals);
            
            // Set new goal as active
            set({ activeGoalId: newGoal._id });
          }
          
          set({ isGeneratingTasks: false });
          return response.data?.data; // Return the full response data
        } catch (error) {
          console.error("Error creating goal:", error);
          set({ 
            error: error.response?.data?.message || "Failed to create goal", 
            isGeneratingTasks: false 
          });
          throw error;
        }
      },

      deleteGoal: async (goalId) => {
        set({ isLoadingGoals: true, error: null });
        try {
          await api.delete(`/goals/${goalId}`);
          
          // Remove goal from the list
          const currentGoals = get().goals;
          const updatedGoals = currentGoals.filter(goal => goal._id !== goalId);
          
          // If deleted goal was active, set new active goal
          const currentActiveGoalId = get().activeGoalId;
          let newActiveGoalId = currentActiveGoalId;
          
          if (currentActiveGoalId === goalId) {
            newActiveGoalId = updatedGoals.length > 0 ? updatedGoals[0]._id : null;
          }
          
          set({ 
            goals: updatedGoals, 
            activeGoalId: newActiveGoalId,
            isLoadingGoals: false 
          });
          
          // Trigger data refetch if there's still an active goal
          if (newActiveGoalId) {
            get().refetchCurrentPageData();
          }
          
          return true;
        } catch (error) {
          console.error("Error deleting goal:", error);
          set({ 
            error: error.response?.data?.message || "Failed to delete goal", 
            isLoadingGoals: false 
          });
          throw error;
        }
      },

      setActiveGoalOnServer: async (goalId) => {
        try {
          await api.put(`/goals/${goalId}/active`);
          set({ activeGoalId: goalId });
          get().refetchCurrentPageData();
          return true;
        } catch (error) {
          console.error("Error setting active goal on server:", error);
          // Still update local state even if server update fails
          set({ activeGoalId: goalId });
          get().refetchCurrentPageData();
          return false;
        }
      },

      refetchCurrentPageData: () => {
        // This will be implemented to trigger data refetch based on current route
        // For now, we'll emit a custom event that components can listen to
        const activeGoalId = get().activeGoalId;
        if (activeGoalId) {
          window.dispatchEvent(new CustomEvent('goalChanged', { 
            detail: { activeGoalId } 
          }));
        }
      },

      // Getters
      getActiveGoal: () => {
        const { goals, activeGoalId } = get();
        return goals.find(goal => goal._id === activeGoalId) || null;
      },

      hasMultipleGoals: () => {
        return get().goals.length > 1;
      },

      hasGoals: () => {
        return get().goals.length > 0;
      },

      // Clear all goal data (for logout)
      clearGoalData: () => {
        set({
          goals: [],
          activeGoalId: null,
          isLoadingGoals: false,
          isGeneratingTasks: false,
          error: null
        });
      },

      // Initialize goals on app start
      initializeGoals: async () => {
        const { goals } = get();
        if (goals.length === 0) {
          await get().fetchGoals();
        }
      }
    }),
    {
      name: "goal-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Persist goals and activeGoalId
        goals: state.goals,
        activeGoalId: state.activeGoalId,
      }),
    }
  )
);