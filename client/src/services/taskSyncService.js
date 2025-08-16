// Centralized Task Synchronization Service
// This service manages tasks across Dashboard, Tasks Page, and Learning Dashboard

class TaskSyncService {
    constructor() {
        this.listeners = [];
        this.tasks = this.loadTasks();
    }

    // Load tasks from localStorage
    loadTasks() {
        const savedTasks = localStorage.getItem('syncedTasks');
        return savedTasks ? JSON.parse(savedTasks) : [];
    }

    // Save tasks to localStorage
    saveTasks() {
        localStorage.setItem('syncedTasks', JSON.stringify(this.tasks));
        this.notifyListeners();
    }

    // Add a listener for task updates
    addListener(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(listener => listener !== callback);
        };
    }

    // Notify all listeners of task updates
    notifyListeners() {
        this.listeners.forEach(callback => callback(this.tasks));
    }

    // Get all tasks
    getAllTasks() {
        return this.tasks;
    }

    // Get tasks by type (ai-generated, manual, etc.)
    getTasksByType(type) {
        return this.tasks.filter(task => task.type === type);
    }

    // Get tasks by status
    getTasksByStatus(status) {
        return this.tasks.filter(task => task.status === status);
    }

    // Add a new task
    addTask(task) {
        const newTask = {
            ...task,
            id: task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: task.source || 'manual' // ai-generated, manual, imported
        };

        this.tasks.push(newTask);
        this.saveTasks();
        return newTask;
    }

    // Update a task
    updateTask(taskId, updates) {
        const taskIndex = this.tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
            this.tasks[taskIndex] = {
                ...this.tasks[taskIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.saveTasks();
            return this.tasks[taskIndex];
        }
        return null;
    }

    // Delete a task
    deleteTask(taskId) {
        const taskIndex = this.tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
            const deletedTask = this.tasks.splice(taskIndex, 1)[0];
            this.saveTasks();
            return deletedTask;
        }
        return null;
    }

    // Complete a task with submission data
    async completeTask(taskId, submissionData) {
        const task = this.tasks.find(task => task.id === taskId);
        if (task) {
            const completionData = {
                status: 'completed',
                completedAt: new Date().toISOString(),
                submissionType: submissionData.submissionType || 'text',
                submissionFile: submissionData.content || '',
                actualTime: submissionData.timeSpent || 0,
                submittedAt: new Date().toISOString(),
                isAIGenerated: submissionData.isAIGenerated || task.source === 'ai-generated',
                submissionData: {
                    submissionType: submissionData.submissionType || 'text',
                    content: submissionData.content || '',
                    files: submissionData.files || [],
                    timeSpent: submissionData.timeSpent || 0,
                    quality: submissionData.quality || 'good',
                    notes: submissionData.notes || ''
                },
                performance: {
                    efficiency: submissionData.efficiency || 100,
                    actualTime: submissionData.actualTime || task.estimatedTime,
                    grade: submissionData.grade || 85
                }
            };

            // Update local task
            const updatedTask = this.updateTask(taskId, completionData);

            // Save to database if it's an AI-generated task
            if (task.source === 'ai-generated' || submissionData.isAIGenerated) {
                try {
                    const { apiService } = await import('./api');

                    const taskData = {
                        name: task.title || task.name,
                        status: 'completed',
                        priority: task.priority || 'medium',
                        notes: task.description || '',
                        estimatedTime: task.estimatedTime,
                        completionTime: new Date().toLocaleTimeString(),
                        submissionType: submissionData.submissionType,
                        submissionFile: submissionData.content,
                        actualTime: submissionData.timeSpent,
                        submittedAt: new Date().toISOString(),
                        category: task.category || 'AI Generated',
                        isAIGenerated: true
                    };

                    await apiService.createTask({ data: taskData });
                } catch (error) {
                    console.error('Failed to save AI task to database:', error);
                }
            }

            return updatedTask;
        }
        return null;
    }

    // Sync AI-generated tasks from learning dashboard
    async syncAITasks(aiTasks) {
        // Remove old AI-generated tasks
        this.tasks = this.tasks.filter(task => task.source !== 'ai-generated');

        // Add new AI-generated tasks
        for (const aiTask of aiTasks) {
            const syncedTask = {
                ...aiTask,
                source: 'ai-generated',
                syncedAt: new Date().toISOString(),
                // Convert AI task format to standard task format
                title: aiTask.title,
                description: aiTask.description,
                category: aiTask.category,
                priority: aiTask.priority,
                estimatedTime: aiTask.estimatedTime,
                status: aiTask.status || 'pending',
                type: aiTask.type || 'learning',
                topics: aiTask.topics || [],
                difficulty: aiTask.difficulty || 3
            };
            this.tasks.push(syncedTask);

            // Save AI task to database only if it doesn't have a databaseId (not already saved)
            if (!aiTask.databaseId) {
                try {
                    const { apiService } = await import('./api');

                    const taskData = {
                        name: aiTask.title,
                        status: aiTask.status || 'pending',
                        priority: aiTask.priority || 'medium',
                        notes: aiTask.description || '',
                        estimatedTime: aiTask.estimatedTime,
                        category: aiTask.category || 'AI Generated',
                        isAIGenerated: true
                    };

                    const response = await apiService.createTask({ data: taskData });

                    // Store the database ID to prevent future duplicates
                    aiTask.databaseId = response.data.id || response.data._id;
                } catch (error) {
                    console.error('Failed to save AI task to database:', error);
                }
            }
        }

        this.saveTasks();
    }

    // Get task statistics
    getTaskStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(task => task.status === 'completed').length;
        const pending = this.tasks.filter(task => task.status === 'pending').length;
        const inProgress = this.tasks.filter(task => task.status === 'in-progress').length;

        return {
            total,
            completed,
            pending,
            inProgress,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }

    // Get tasks for today
    getTodaysTasks() {
        const today = new Date().toDateString();
        return this.tasks.filter(task => {
            const taskDate = new Date(task.createdAt).toDateString();
            return taskDate === today;
        });
    }

    // Clear all tasks (for testing/reset)
    clearAllTasks() {
        this.tasks = [];
        this.saveTasks();
    }

    // Clear only AI-generated tasks
    clearAITasks() {
        this.tasks = this.tasks.filter(task => task.source !== 'ai-generated');
        this.saveTasks();
    }
}

// Create and export singleton instance
export const taskSyncService = new TaskSyncService();

// Export utility functions
export const useTaskSync = () => {
    return {
        tasks: taskSyncService.getAllTasks(),
        addTask: (task) => taskSyncService.addTask(task),
        updateTask: (id, updates) => taskSyncService.updateTask(id, updates),
        deleteTask: (id) => taskSyncService.deleteTask(id),
        completeTask: (id, data) => taskSyncService.completeTask(id, data),
        getStats: () => taskSyncService.getTaskStats(),
        subscribe: (callback) => taskSyncService.addListener(callback)
    };
};