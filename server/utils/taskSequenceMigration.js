import Task from "../models/Task.js";
import Goal from "../models/Goal.js";

/**
 * Migration utility for the Gated Sequential Task System
 * This helps convert existing tasks to use the new sequential system
 */

export const migrateTasksToSequential = async (userId, goalId) => {
  try {
    // Find all tasks for this goal that don't have sequence orders
    const tasks = await Task.find({
      user: userId,
      goal: goalId,
      $or: [
        { sequenceOrder: { $exists: false } },
        { sequenceOrder: null },
        { sequenceOrder: 0 }
      ]
    }).sort({ createdAt: 1, scheduledDate: 1 });

    if (tasks.length === 0) {
      return { success: true, migratedCount: 0, message: "No tasks to migrate" };
    }

    let migratedCount = 0;
    let firstPendingAssigned = false;

    // Assign sequence orders based on creation date and scheduled date
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      task.sequenceOrder = i + 1;
      
      // Set initial status based on current status
      if (task.status === 'completed') {
        // Keep completed tasks as completed
        task.status = 'completed';
      } else if (task.status === 'in_progress') {
        // Convert in_progress to pending (already assigned)
        task.status = 'pending';
        task.assignedDate = task.assignedDate || new Date();
        firstPendingAssigned = true;
      } else {
        // Set all other tasks to queued
        task.status = 'queued';
        task.assignedDate = null;
      }
      
      await task.save();
      migratedCount++;
    }

    // If no task was already pending/in_progress, assign the first queued task
    if (!firstPendingAssigned) {
      const firstQueuedTask = await Task.findOne({
        user: userId,
        goal: goalId,
        status: 'queued'
      }).sort({ sequenceOrder: 1 });

      if (firstQueuedTask) {
        firstQueuedTask.status = 'pending';
        firstQueuedTask.assignedDate = new Date();
        await firstQueuedTask.save();
      }
    }

    return {
      success: true,
      migratedCount,
      message: `Successfully migrated ${migratedCount} tasks to sequential system`
    };

  } catch (error) {
    console.error(`[Migration] Error migrating tasks:`, error);
    return {
      success: false,
      error: error.message,
      message: "Failed to migrate tasks to sequential system"
    };
  }
};

export const migrateAllUserTasks = async (userId) => {
  try {
    // Get all goals for this user
    const goals = await Goal.find({ user: userId });
    
    if (goals.length === 0) {
      return {
        success: true,
        migratedGoals: 0,
        totalMigratedTasks: 0,
        message: "No goals found to migrate"
      };
    }

    let totalMigratedTasks = 0;
    let migratedGoals = 0;

    // Migrate tasks for each goal
    for (const goal of goals) {
      const result = await migrateTasksToSequential(userId, goal._id);
      if (result.success && result.migratedCount > 0) {
        totalMigratedTasks += result.migratedCount;
        migratedGoals++;
      }
    }

    return {
      success: true,
      migratedGoals,
      totalMigratedTasks,
      message: `Successfully migrated ${totalMigratedTasks} tasks across ${migratedGoals} goals`
    };

  } catch (error) {
    console.error(`[Migration] Error in full user migration:`, error);
    return {
      success: false,
      error: error.message,
      message: "Failed to migrate user tasks"
    };
  }
};

export const validateSequentialIntegrity = async (userId, goalId) => {
  try {
    const tasks = await Task.find({
      user: userId,
      goal: goalId
    }).sort({ sequenceOrder: 1 });

    const issues = [];
    let expectedSequence = 1;
    let hasPending = false;
    let pendingCount = 0;

    for (const task of tasks) {
      // Check sequence order integrity
      if (task.sequenceOrder !== expectedSequence) {
        issues.push(`Task "${task.title}" has sequence ${task.sequenceOrder}, expected ${expectedSequence}`);
      }
      expectedSequence++;

      // Check status integrity
      if (task.status === 'pending') {
        pendingCount++;
        hasPending = true;
      }
    }

    // Check that there's at most one pending task
    if (pendingCount > 1) {
      issues.push(`Found ${pendingCount} pending tasks, should have at most 1`);
    }

    // Check that if there are queued tasks, there should be exactly one pending task
    const queuedTasks = tasks.filter(t => t.status === 'queued');
    if (queuedTasks.length > 0 && !hasPending) {
      issues.push(`Found ${queuedTasks.length} queued tasks but no pending task`);
    }

    return {
      success: issues.length === 0,
      issues,
      totalTasks: tasks.length,
      pendingTasks: pendingCount,
      queuedTasks: queuedTasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length
    };

  } catch (error) {
    console.error(`[Migration] Error validating sequential integrity:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};