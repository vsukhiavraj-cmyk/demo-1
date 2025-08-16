import React, { useState, useEffect } from "react";
import { TasksScreen } from "../components/tasks/TasksScreen";
import { aiAssistant } from "../services/aiLearningService";
import { useTasks } from "../contexts/TasksContext";
import { useGoalStore } from "../store/goalStore.js";
import { useAppStore } from "../store/appStore.js";
import { useTaskStore } from "../store/taskStore.js";
import GoalSelector from "../components/ui/GoalSelector.jsx";
import NoGoalsGuard from "../components/ui/NoGoalsGuard.jsx";

export default function TasksPage() {
  const { refreshTasks } = useTasks();
  const { goals, activeGoalId, getActiveGoal, hasGoals } = useGoalStore();
  const { setCurrentPage } = useAppStore();
  const { tasks, fetchTasks, isLoading: tasksLoading } = useTaskStore();
  
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const activeGoal = getActiveGoal();

  // Set current page for app store
  useEffect(() => {
    setCurrentPage('tasks');
  }, [setCurrentPage]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (hasGoals() && activeGoalId) {
          // Load tasks for the active goal using the task store
          await fetchTasks(activeGoalId);
          
          // Also load AI tasks for the goal
          try {
            const aiTasks = await aiAssistant.getAllTasks(activeGoalId);
            setAllTasks(aiTasks);
          } catch (aiError) {
            console.warn("Could not load AI tasks:", aiError);
            setAllTasks([]);
          }
        }

        // Refresh tasks from the main task system
        await refreshTasks(activeGoalId);
      } catch (error) {
        console.error("Error loading data:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Listen for goal changes
    const handleGoalChanged = async (event) => {
      const { activeGoalId: newGoalId } = event.detail;
      try {
        await fetchTasks(newGoalId);
        const aiTasks = await aiAssistant.getAllTasks(newGoalId);
        setAllTasks(aiTasks);
        setError(null);
      } catch (err) {
        console.error("Failed to refresh tasks after goal change:", err);
      }
    };

    // Listen for real-time task updates
    const handleTasksUpdated = async (event) => {
      console.log("[TasksPage] Received task update event:", event.detail);
      
      // If new tasks were generated or added, refresh the task list
      if (event.detail?.action === "tasksGenerated" || 
          event.detail?.action === "newTasksAdded") {
        
        // Only refresh if it's for the current active goal
        if (event.detail?.goalId === activeGoalId || !event.detail?.goalId) {
          console.log("[TasksPage] Refreshing tasks due to:", event.detail.action);
          
          try {
            // Refresh both regular tasks and AI tasks
            await fetchTasks(activeGoalId);
            const aiTasks = await aiAssistant.getAllTasks(activeGoalId);
            setAllTasks(aiTasks);
            await refreshTasks(activeGoalId);
            setError(null);
          } catch (error) {
            console.error("[TasksPage] Error refreshing tasks:", error);
          }
        }
      }
    };

    window.addEventListener("goalChanged", handleGoalChanged);
    window.addEventListener("tasksUpdated", handleTasksUpdated);

    return () => {
      window.removeEventListener("goalChanged", handleGoalChanged);
      window.removeEventListener("tasksUpdated", handleTasksUpdated);
    };
  }, [activeGoalId, hasGoals, fetchTasks, refreshTasks]);

  // Goal changing is now handled by the GoalSelector component and goal store

  const handleTaskComplete = async (taskId) => {
    // Refresh tasks after completion
    await refreshTasks(activeGoalId);

    // Reload tasks for the current goal
    if (activeGoalId) {
      try {
        await fetchTasks(activeGoalId);
        const aiTasks = await aiAssistant.getAllTasks(activeGoalId);
        setAllTasks(aiTasks);
      } catch (error) {
        console.error("Error reloading tasks:", error);
      }
    }
  };



  if (loading || tasksLoading) {
    return (
      <div className="bg-[#111111] min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading your tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#111111] min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-xl mb-4">Error loading tasks</div>
          <div className="text-gray-400 mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary btn-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <NoGoalsGuard>
      <div className="bg-[#111111] min-h-screen">
        {/* Header with Goal Selector */}
        <div className="p-4 border-b border-gray-800">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Your Learning Tasks
                </h1>
                {activeGoal && (
                  <p className="text-gray-400 text-sm mt-1">
                    Showing tasks for: <span className="text-blue-400 font-medium">{activeGoal.field}</span>
                    {activeGoal.timeline && (
                      <span className="ml-2">({activeGoal.timeline} months)</span>
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <GoalSelector />
              </div>
            </div>
          </div>
        </div>

        {/* Tasks Screen */}
        {activeGoal ? (
          <TasksScreen
            userProfile={activeGoal.userProfile}
            learningData={{
              currentPhase: activeGoal.currentPhase,
            }}
            aiTasksData={allTasks}
            roadmap={activeGoal.roadmap}
            goalData={activeGoal}
            onTaskComplete={handleTaskComplete}
          />
        ) : hasGoals() ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                No Goal Selected
              </h3>
              <p className="text-gray-400 mb-4">
                Please select a goal to view your tasks.
              </p>
              <p className="text-sm text-gray-500">
                Tasks are organized by goals to keep your learning focused.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </NoGoalsGuard>
  );
}
