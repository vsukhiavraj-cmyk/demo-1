import { create } from "zustand";
import api from "../services/api.js";

export const useDashboardStore = create((set, get) => ({
  data: null,
  isLoading: false,
  error: null,

  setData: (d) => set({ data: d }),

  fetchDashboardData: async (goalId = null) => {
    set({ isLoading: true, error: null });
    try {
      let url = "/dashboard";
      if (goalId) {
        url += `?goalId=${goalId}`;
      }
      const response = await api.get(url);
      const data = response.data?.data || response.data;
      set({ data, isLoading: false });
      return data;
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      set({ 
        error: error.response?.data?.message || "Failed to fetch dashboard data", 
        isLoading: false 
      });
      return null;
    }
  },

  fetchLearningStats: async (goalId = null) => {
    set({ isLoading: true, error: null });
    try {
      let url = "/learning/stats";
      if (goalId) {
        url += `?goalId=${goalId}`;
      }
      const response = await api.get(url);
      const stats = response.data?.data || response.data;
      set({ isLoading: false });
      return stats;
    } catch (error) {
      console.error("Error fetching learning stats:", error);
      set({ 
        error: error.response?.data?.message || "Failed to fetch learning stats", 
        isLoading: false 
      });
      return null;
    }
  },

  clearData: () => {
    set({ data: null, error: null });
  }
}));
