import cron from 'node-cron';
import Task from '../models/Task.js';
import Goal from '../models/Goal.js';

// Midnight task assignment - runs at 12:00 AM every day
export const startTaskScheduler = () => {
  // Run at midnight (00:00) every day
  cron.schedule('0 0 * * *', async () => {
    await assignMidnightTasks();
  }, {
    timezone: "UTC" // Use UTC to avoid timezone issues
  });
};

// Assign next sequential task to all active goals at midnight
const assignMidnightTasks = async () => {
  try {
    // Get all active goals
    const activeGoals = await Goal.find({ 
      isActive: true // Assuming goals have an isActive field
    }).populate('user');

    for (const goal of activeGoals) {
      try {
        await assignNextTaskForGoal(goal.user._id, goal._id);
      } catch (error) {
        console.error(`[TaskScheduler] Failed to assign task for goal ${goal._id}:`, error);
        // Continue with other goals even if one fails
      }
    }
  } catch (error) {
    console.error('[TaskScheduler] Error in midnight task assignment:', error);
  }
};

// Assign next sequential task for a specific goal (only if no pending tasks)
const assignNextTaskForGoal = async (userId, goalId) => {
  try {
    // CRITICAL: Check if user has ANY incomplete tasks for this goal
    const incompleteTasks = await Task.find({
      user: userId,
      goal: goalId,
      status: { $in: ['pending', 'in_progress'] }
    });

    if (incompleteTasks.length > 0) {
      return;
    }

    // Find next queued task
    const nextQueuedTask = await Task.findOne({
      user: userId,
      goal: goalId,
      status: 'queued'
    }).sort({ sequenceOrder: 1 });

    if (nextQueuedTask) {
      // Assign the task to today
      const today = new Date();
      nextQueuedTask.status = 'pending';
      nextQueuedTask.assignedDate = today;
      nextQueuedTask.scheduledDate = today;
      await nextQueuedTask.save();
    }
  } catch (error) {
    console.error(`[TaskScheduler] Error assigning task for user ${userId}, goal ${goalId}:`, error);
    throw error;
  }
};

// Manual task assignment (when user clicks "Generate New Task")
export const assignNextTaskManually = async (userId, goalId) => {
  try {
    // Check if user has ANY incomplete tasks
    const incompleteTasks = await Task.find({
      user: userId,
      goal: goalId,
      status: { $in: ['pending', 'in_progress'] }
    });

    if (incompleteTasks.length > 0) {
      throw new Error("You must complete all your current tasks before requesting new ones");
    }

    // Find next queued task
    const nextQueuedTask = await Task.findOne({
      user: userId,
      goal: goalId,
      status: 'queued'
    }).sort({ sequenceOrder: 1 });

    if (!nextQueuedTask) {
      // Check if goal is completed (all tasks are completed)
      const totalTasks = await Task.countDocuments({
        user: userId,
        goal: goalId
      });

      const completedTasks = await Task.countDocuments({
        user: userId,
        goal: goalId,
        status: 'completed'
      });

      if (totalTasks > 0 && completedTasks === totalTasks) {
        // Update goal status to completed
        await Goal.findByIdAndUpdate(goalId, { 
          status: 'completed',
          completedAt: new Date()
        });
        throw new Error("Congratulations! You have completed all tasks for this goal. Your goal is now marked as completed.");
      } else {
        throw new Error("No more tasks available in the sequence. Please check if there are any issues with task generation.");
      }
    }

    // Assign the task to today
    const today = new Date();
    nextQueuedTask.status = 'pending';
    nextQueuedTask.assignedDate = today;
    nextQueuedTask.scheduledDate = today;
    await nextQueuedTask.save();
    
    return [nextQueuedTask];
  } catch (error) {
    console.error(`[TaskScheduler] Error in manual task assignment:`, error);
    throw error;
  }
};

export default {
  startTaskScheduler,
  assignNextTaskManually
};