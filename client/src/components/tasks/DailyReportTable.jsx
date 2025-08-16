import React, { useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { useTasks } from "../../contexts/TasksContext";
import { useGoalStore } from "../../store/goalStore.js";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CategoryTaskCards } from "./CategoryTaskCards";
import { TaskSubmitButton } from "./TaskSubmitButton";
import AnimatedTitle from "../ui/AnimatedTitle.jsx";
import ResourceDisplay from "./ResourceDisplay.jsx";

const SPOTLIGHT_TEXT = "Daily Tasks";

export const DailyReportTable = ({
  selectedDate,
  onDateSelect,
  onTaskComplete,
}) => {
  const { refreshTasks, viewTaskSubmission, getTasksByDate, getDailyTasks, requestNextTask } =
    useTasks();
  const { activeGoalId } = useGoalStore();
  const [selectedTask, setSelectedTask] = useState(null); // Master-Detail: Selected task for detail view
  const [expandedTask, setExpandedTask] = useState(null);
  const [submissionTask, setSubmissionTask] = useState(null);
  const [showCategoryView, setShowCategoryView] = useState(false);
  const [combinedTasks, setCombinedTasks] = useState([]);
  const [isGatedSequential, setIsGatedSequential] = useState(false);
  const [taskUpdateNotification, setTaskUpdateNotification] = useState(null);

  // Typewriter animation state
  const container = useRef();
  const submissionFormRef = useRef();
  const [typed, setTyped] = useState("");
  const [spotlightPos, setSpotlightPos] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [isInView, setIsInView] = useState(false);

  // IntersectionObserver to trigger and reset typewriter
  useEffect(() => {
    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        } else {
          setIsInView(false);
          setTyped("");
          setIsDone(false);
          setSpotlightPos(0);
        }
      },
      { threshold: 0.3 }
    );
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (!isInView) return;
    if (typed.length < SPOTLIGHT_TEXT.length) {
      const timeout = setTimeout(() => {
        setTyped(SPOTLIGHT_TEXT.slice(0, typed.length + 1));
        setSpotlightPos(typed.length + 1);
      }, 60);
      return () => clearTimeout(timeout);
    } else if (typed.length === SPOTLIGHT_TEXT.length) {
      setIsDone(true);
    }
  }, [typed, isInView]);

  // Fetch tasks for selected date - SEQUENTIAL TASK SYSTEM
  useEffect(() => {
    async function fetchTasks() {
      if (!selectedDate) {
        setCombinedTasks([]);
        setIsGatedSequential(false);
        return;
      }
      
      // Only fetch if we have an active goal
      if (!activeGoalId) {
        setCombinedTasks([]);
        setIsGatedSequential(false);
        return;
      }
      
      // Check if this is today's date
      const today = new Date();
      const isToday = selectedDate.toDateString() === today.toDateString();
      
      try {
        let tasks;
        let gatedSequential = false;
        
        if (isToday) {
          // For today, get the current active task(s) from sequential system
          tasks = await getDailyTasks(activeGoalId);
          gatedSequential = true;
        } else {
          // For other dates, get tasks that have been assigned to that specific date
          tasks = await getTasksByDate(selectedDate, activeGoalId);
        }
        
        // Filter tasks for the active goal
        const filteredTasks = tasks.filter(task => {
          const taskGoalId = task.goal?._id || task.goal;
          const belongsToActiveGoal = taskGoalId === activeGoalId;
          if (!belongsToActiveGoal && taskGoalId) {
            console.warn(`[DailyReportTable] Filtering out task "${task.name}" - belongs to goal ${taskGoalId}, not ${activeGoalId}`);
          }
          return belongsToActiveGoal || !taskGoalId;
        });
        
        setCombinedTasks(filteredTasks);
        setIsGatedSequential(gatedSequential);
      } catch (error) {
        console.error(`[DailyReportTable] Error fetching tasks:`, error);
        setCombinedTasks([]);
        setIsGatedSequential(false);
      }
    }
    fetchTasks();
  }, [selectedDate, activeGoalId, getTasksByDate, getDailyTasks]);

  // Listen for real-time task updates
  useEffect(() => {
    const handleTasksUpdated = async (event) => {
      console.log("[DailyReportTable] Received task update event:", event.detail);
      
      // If new tasks were generated or added, refresh the task list
      if (event.detail?.action === "tasksGenerated" || 
          event.detail?.action === "newTasksAdded" ||
          event.detail?.action === "completed") {
        
        // Only refresh if it's for the current active goal
        if (event.detail?.goalId === activeGoalId || !event.detail?.goalId) {
          console.log("[DailyReportTable] Refreshing tasks due to:", event.detail.action);
          
          try {
            // Check if this is today's date
            const today = new Date();
            const isToday = selectedDate.toDateString() === today.toDateString();
            
            let tasks;
            let gatedSequential = false;
            
            if (isToday) {
              // For today, get the current active task(s) from sequential system
              tasks = await getDailyTasks(activeGoalId);
              gatedSequential = true;
            } else {
              // For other dates, get tasks that have been assigned to that specific date
              tasks = await getTasksByDate(selectedDate, activeGoalId);
            }
            
            // Filter tasks for the active goal
            const filteredTasks = tasks.filter(task => {
              const taskGoalId = task.goal?._id || task.goal;
              const belongsToActiveGoal = taskGoalId === activeGoalId;
              return belongsToActiveGoal || !taskGoalId;
            });
            
            setCombinedTasks(filteredTasks);
            setIsGatedSequential(gatedSequential);
            
            // Show notification for new tasks
            if (event.detail?.action === "tasksGenerated" || event.detail?.action === "newTasksAdded") {
              setTaskUpdateNotification("New tasks have been added! 🎉");
              setTimeout(() => setTaskUpdateNotification(null), 3000);
            }
            
          } catch (error) {
            console.error("[DailyReportTable] Error refreshing tasks:", error);
          }
        }
      }
    };

    window.addEventListener("tasksUpdated", handleTasksUpdated);

    return () => {
      window.removeEventListener("tasksUpdated", handleTasksUpdated);
    };
  }, [selectedDate, activeGoalId, getTasksByDate, getDailyTasks]);

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "in_progress":
        return "bg-yellow-100/80 text-yellow-700 border-yellow-300 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30";
      case "pending":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium":
        return "bg-yellow-100/80 text-yellow-700 border-yellow-300 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30";
      case "low":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return "✅";
      case "in_progress":
        return "🔄";
      case "pending":
        return "⏳";
      default:
        return "❓";
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "high":
        return "🔴";
      case "medium":
        return "🟡";
      case "low":
        return "🟢";
      default:
        return "⚪";
    }
  };

  // Helper to check if a date is today
  const isTodayDate = (date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };



  const handleTaskSubmissionComplete = async (taskId) => {
    setSubmissionTask(null);
    setExpandedTask(null); // Close the submission form
    
    try {
      // First refresh the global tasks context
      await refreshTasks(activeGoalId);
      
      // Then refresh the local task list immediately
      if (activeGoalId) {
        const today = new Date();
        const isToday = selectedDate.toDateString() === today.toDateString();
        
        let refreshedTasks;
        if (isToday) {
          // For today, get current sequential tasks
          refreshedTasks = await getDailyTasks(activeGoalId);
        } else {
          // For other dates, get tasks assigned to that date
          refreshedTasks = await getTasksByDate(selectedDate, activeGoalId);
        }
        
        // Update the local task list
        setCombinedTasks(refreshedTasks);
        
        // Update the selected task if it's the one that was just completed
        if (selectedTask && selectedTask.id === taskId) {
          const updatedTask = refreshedTasks.find(task => task.id === taskId);
          if (updatedTask) {
            setSelectedTask(updatedTask);
          }
        }
      }
      
      // Call the parent callback to refresh AI tasks data
      if (onTaskComplete) {
        await onTaskComplete(taskId);
      }
      
      // Show immediate success notification
      setTaskUpdateNotification("Task submitted successfully! ✅ Processing...");
      
      // Update notification after refresh
      setTimeout(() => {
        setTaskUpdateNotification("Task completed! 🎉 View your submission above.");
        setTimeout(() => setTaskUpdateNotification(null), 5000);
      }, 1000);
    } catch (error) {
      console.error("Failed to refresh tasks after completion:", error);
      // Fallback: force a page refresh if the update fails
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  };

  const handleRequestNextTask = async () => {
    try {
      if (!activeGoalId) {
        alert("No active goal selected. Please select a goal first.");
        return;
      }
      
      const result = await requestNextTask(activeGoalId);
      
      // requestNextTask returns an array of tasks directly
      if (result && Array.isArray(result) && result.length > 0) {
        setCombinedTasks(result);
        alert("Next task assigned successfully!");
      } else {
        alert("No more tasks available in the sequence");
      }
    } catch (error) {
      console.error("Failed to request next task:", error);
      console.error("Error response:", error.response);
      
      // Provide more specific error messages
      let errorMessage = "Failed to request next task";
      if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || "Bad request - please check your goal selection";
        console.error("400 Error details:", error.response.data);
      } else if (error.response?.status === 401) {
        errorMessage = "Please log in again";
      } else if (error.response?.status >= 500) {
        errorMessage = "Server error - please try again later";
      } else if (error.message?.includes('Network Error')) {
        errorMessage = "Cannot connect to server. Please make sure the server is running.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    }
  };



  // Master-Detail: Handle task selection
  const handleTaskClick = (task) => {
    setSelectedTask(selectedTask?.id === task.id ? null : task);
  };

  // Function to scroll to submission form
  const scrollToSubmissionForm = () => {
    setTimeout(() => {
      if (submissionFormRef.current) {
        submissionFormRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100); // Small delay to ensure the form is rendered
  };

  // Handle submit task button click
  const handleSubmitTaskClick = (taskId) => {
    setExpandedTask(taskId);
    scrollToSubmissionForm();
  };

  // Calculate summary statistics
  const totalTasks = combinedTasks.length;
  const completedTasks = combinedTasks.filter(
    (task) => task.status === "completed"
  ).length;
  const pendingTasks = combinedTasks.filter(
    (task) => task.status === "pending"
  ).length;
  const aiGeneratedTasks = combinedTasks.filter(
    (task) => task.isAIGenerated
  ).length;

  return (
    <div className="bg-mint-100 border border-mint-200 rounded-3xl shadow-2xl dark:bg-white/10 dark:border-white/20 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <AnimatedTitle text={SPOTLIGHT_TEXT} fontSize="48px" fontWeight="900" />
          {activeGoalId && (
            <p className="text-gray-400 text-sm mt-2">
              🎯 Showing tasks for your active goal only
            </p>
          )}
          {taskUpdateNotification && (
            <div className="mt-3 bg-green-500/20 text-green-400 px-4 py-2 rounded-lg border border-green-500/30 animate-pulse">
              {taskUpdateNotification}
            </div>
          )}
        </div>
      </div>

      {/* Date Selection and Summary */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <DatePicker
            selected={selectedDate}
            onChange={(date) => onDateSelect(date)}
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            dateFormat="MMMM d, yyyy"
          />
          {isTodayDate(selectedDate) && (
            <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              Today
            </span>
          )}
        </div>

        {/* Summary Statistics */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg">
            Total: {totalTasks}
          </div>
          <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-lg">
            Completed: {completedTasks}
          </div>
          <div className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-lg">
            Pending: {pendingTasks}
          </div>
          {aiGeneratedTasks > 0 && (
            <div className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-lg">
              🤖 AI: {aiGeneratedTasks}
            </div>
          )}
        </div>
      </div>

      {/* Task Actions */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Button
          onClick={() => setShowCategoryView(!showCategoryView)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            showCategoryView
              ? "bg-purple-600 hover:bg-purple-700 text-white"
              : "bg-gray-600 hover:bg-gray-700 text-white"
          }`}
        >
          {showCategoryView ? "List View" : "Category View"}
        </Button>

        {/* Gated Sequential Task System Controls */}
        {isGatedSequential && isTodayDate(selectedDate) && (
          <>
            <Button
              onClick={handleRequestNextTask}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              🎯 Generate New Task
            </Button>

          </>
        )}
        

      </div>



      {/* Task List - SINGLE EXPANDABLE VIEW */}
      {showCategoryView ? (
        <CategoryTaskCards tasks={combinedTasks} onTaskClick={handleTaskClick} />
      ) : (
        <div className="w-full">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            📋 Your Tasks
            {combinedTasks.length > 0 && (
              <span className="text-sm bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                {combinedTasks.length} task{combinedTasks.length !== 1 ? 's' : ''}
              </span>
            )}
          </h3>
          
          {/* Dynamic Task List - No Scrollbar, Grows with Content */}
          <div className="space-y-4">
            {combinedTasks.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">📝</div>
                <h4 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  No tasks for {selectedDate.toLocaleDateString()}
                </h4>
                <p className="text-gray-500 dark:text-gray-400">
                  {activeGoalId ? (
                    <>
                      {isTodayDate(selectedDate)
                        ? "No tasks scheduled for your active goal today."
                        : "No tasks scheduled for your active goal on this date."}
                      <br />
                      <span className="text-blue-400">Try switching goals or creating new tasks.</span>
                    </>
                  ) : (
                    isTodayDate(selectedDate)
                      ? "Add a task to get started with your day!"
                      : "No tasks scheduled for this date."
                  )}
                </p>
              </div>
            ) : (
              combinedTasks.map((task, index) => (
                <div
                  key={task.id}
                  className={`border border-gray-200 dark:border-gray-700 rounded-lg transition-all duration-300 ${
                    selectedTask?.id === task.id ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
                  }`}
                  style={{ backgroundColor: '#181D24' }}
                >
                  {/* Task Card Header - Always Visible */}
                  <div
                    onClick={() => handleTaskClick(task)}
                    className="p-6 cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                            {task.title || task.name}
                          </h4>
                          {task.sequenceOrder && (
                            <span className="text-sm bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                              #{task.sequenceOrder}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 mb-3">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                              task.status
                            )}`}
                          >
                            {getStatusIcon(task.status)} {task.status}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(
                              task.priority
                            )}`}
                          >
                            {getPriorityIcon(task.priority)} {task.priority}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            📂 {task.category}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            ⏱️ {task.estimatedTime}h
                          </span>
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-3">
                          {task.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          {task.phase && <span>📊 Phase {task.phase}</span>}
                          {task.assignedDate && <span>📅 {new Date(task.assignedDate).toLocaleDateString()}</span>}
                          {task.isAIGenerated && <span>🤖 AI Generated</span>}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 ml-4">
                        {isTodayDate(selectedDate) && task.status !== "completed" && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTask(task);
                              handleSubmitTaskClick(task.id);
                            }}
                            className="task-action-button"
                          >
                            🚀 Submit
                          </Button>
                        )}
                        
                        {task.status === "completed" && (task.submissionFile || task.submission || task.data?.submissionFile) && (
                          <Button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await viewTaskSubmission(task.id);
                              } catch (error) {
                                console.error("Failed to view submission:", error);
                                alert("Failed to view submission: " + error.message);
                              }
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                          >
                            View Submission
                          </Button>
                        )}
                        
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTaskClick(task);
                          }}
                          className="task-action-button"
                        >
                          {selectedTask?.id === task.id ? '📖 Hide Details' : '📖 Details'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Task Details - Only Visible When Selected */}
                  {selectedTask?.id === task.id && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-6" style={{ backgroundColor: '#181D24' }}>
                      <div className="space-y-6">
                        {/* Detailed Information */}
                        {task.realWorldApplication && (
                          <div>
                            <h5 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                              🌍 Real-World Application
                            </h5>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                              {task.realWorldApplication}
                            </p>
                          </div>
                        )}

                        {task.successCriteria && task.successCriteria.length > 0 && (
                          <div>
                            <h5 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                              ✅ Success Criteria
                            </h5>
                            <ul className="text-gray-600 dark:text-gray-300 space-y-1">
                              {task.successCriteria.map((criterion, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-green-500 mt-1">•</span>
                                  <span>{criterion}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <ResourceDisplay resources={task.resources || task.data?.resources} />

                        {task.topics && task.topics.length > 0 && (
                          <div>
                            <h5 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                              🏷️ Topics
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {task.topics.map((topic, idx) => (
                                <span
                                  key={idx}
                                  className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full dark:bg-blue-900 dark:text-blue-200"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Task Submission Form */}
                        {expandedTask === task.id && isTodayDate(selectedDate) && (
                          <div ref={submissionFormRef} className="border-t border-gray-200 dark:border-gray-700 pt-6">
                            <h5 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                              🚀 Submit Your Work
                            </h5>
                            <TaskSubmitButton
                              task={task}
                              expandedTask={expandedTask}
                              setExpandedTask={setExpandedTask}
                              showSubmissionForm={task.status !== "completed"}
                              onSubmissionComplete={handleTaskSubmissionComplete}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Submission Modal */}
      {submissionTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              Task Submission
            </h3>
            <div className="space-y-4">
              {submissionTask.submission?.data?.fileUrl ? (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Submitted File
                  </h4>
                  <a
                    href={submissionTask.submission.data.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    View Submission
                  </a>
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-300">
                  No submission file found.
                </p>
              )}
            </div>
            <Button
              onClick={() => setSubmissionTask(null)}
              className="mt-6 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
