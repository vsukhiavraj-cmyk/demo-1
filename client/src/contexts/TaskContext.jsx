import React, { createContext, useContext, useState, useCallback } from 'react';
import { apiService } from '../services/api';
import { utcToLocalDateString } from '../utils/dateUtils';

const TaskContext = createContext();

export const useTaskContext = () => {
    const context = useContext(TaskContext);
    if (!context) {
        throw new Error('useTaskContext must be used within a TaskProvider');
    }
    return context;
};

export const TaskProvider = ({ children }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Real-time sync function that updates all components
    const syncTasks = useCallback(async (selectedDate = new Date()) => {
        try {
            setLoading(true);
            setError(null);

            // Fetch both all tasks and date-specific tasks using LOCAL date
            const localDateString = utcToLocalDateString(selectedDate);
            console.log('TaskContext: Syncing tasks for local date:', localDateString);

            const [allTasksRes, dateTasksRes] = await Promise.all([
                apiService.getTasks(),
                apiService.getTasksByDate(localDateString)
            ]);

            const allTasks = allTasksRes?.data?.tasks || [];
            const dateTasks = dateTasksRes?.data?.tasks || [];

            setTasks(allTasks);

            // Notify all listeners about the update
            window.dispatchEvent(new CustomEvent('tasksUpdated', {
                detail: {
                    allTasks,
                    dateTasks,
                    selectedDate
                }
            }));

            return { allTasks, dateTasks };
        } catch (err) {
            console.error('Failed to sync tasks:', err);
            setError('Failed to sync tasks');
            return { allTasks: [], dateTasks: [] };
        } finally {
            setLoading(false);
        }
    }, []);

    // Update task with real-time sync
    const updateTask = useCallback(async (taskId, taskData, selectedDate = new Date()) => {
        try {
            setLoading(true);
            setError(null);

            const response = await apiService.updateTask(taskId, taskData);

            // Immediately sync all data after update
            await syncTasks(selectedDate);

            return response;
        } catch (err) {
            console.error('Failed to update task:', err);
            setError('Failed to update task');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [syncTasks]);

    // Delete task with real-time sync
    const deleteTask = useCallback(async (taskId, selectedDate = new Date()) => {
        try {
            setLoading(true);
            setError(null);

            const response = await apiService.deleteTask(taskId);

            // Immediately sync all data after deletion
            await syncTasks(selectedDate);

            return response;
        } catch (err) {
            console.error('Failed to delete task:', err);
            setError('Failed to delete task');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [syncTasks]);

    const value = {
        tasks,
        loading,
        error,
        syncTasks,
        updateTask,
        deleteTask
    };

    return (
        <TaskContext.Provider value={value}>
            {children}
        </TaskContext.Provider>
    );
};