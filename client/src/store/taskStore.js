import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { apiService } from "../services/api.js";

const useTaskStore = create(
  persist(
    (set, get) => ({
      tasks: [],
      isLoading: false,
      error: null,

      // Actions
      fetchTasks: async (goalId = null) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiService.getTasks(goalId);
          const tasks = response.data?.tasks || [];
          set({ tasks: Array.isArray(tasks) ? tasks : [], isLoading: false });
        } catch (error) {
          set({ error: error.message, isLoading: false });
        }
      },

      fetchTasksByDate: async (date, goalId = null) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiService.getTasksByDate(date, goalId);
          const tasks = response.data?.tasks || [];
          set({ tasks: Array.isArray(tasks) ? tasks : [], isLoading: false });
        } catch (error) {
          set({ error: error.message, isLoading: false });
        }
      },

      addTask: async (taskData) => {
        set({ isLoading: true, error: null });
        try {
          // Note: createTask method would need to be added to apiService
          const response = await apiService.createTask(taskData);
          set((state) => ({
            tasks: [...state.tasks, response.data],
            isLoading: false,
          }));
        } catch (error) {
          set({ error: error.message, isLoading: false });
        }
      },

      updateTask: async (taskId, updates) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiService.updateTask(taskId, updates);
          set((state) => ({
            tasks: state.tasks.map((task) =>
              task.id === taskId ? { ...task, ...response.data } : task
            ),
            isLoading: false,
          }));
        } catch (error) {
          set({ error: error.message, isLoading: false });
        }
      },

      deleteTask: async (taskId) => {
        set({ isLoading: true, error: null });
        try {
          await apiService.deleteTask(taskId);
          set((state) => ({
            tasks: state.tasks.filter((task) => task.id !== taskId),
            isLoading: false,
          }));
        } catch (error) {
          set({ error: error.message, isLoading: false });
        }
      },

      submitTask: async (taskId, submissionData) => {
        return get().updateTask(taskId, {
          ...submissionData,
          status: "completed",
          submittedAt: new Date().toISOString(),
        });
      },

      // Getters
      getTasksByStatus: (status) => {
        return get().tasks.filter((task) => task.status === status);
      },

      getTaskStats: () => {
        const tasks = get().tasks;
        return {
          total: tasks.length,
          completed: tasks.filter((t) => t.status === "completed").length,
          pending: tasks.filter((t) => t.status === "pending").length,
          inProgress: tasks.filter((t) => t.status === "in-progress").length,
        };
      },
    }),
    {
      name: "task-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // persist only these fields
        tasks: state.tasks,
      }),
    }
  )
);

export { useTaskStore };
