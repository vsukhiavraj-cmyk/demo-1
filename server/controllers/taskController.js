import Task from "../models/Task.js";
import Goal from "../models/Goal.js";
import WeeklyActivity from "../models/WeeklyActivity.js";
// AWS S3 dependencies removed - files are now stored locally in browser localStorage

function getLast7Days() {
  const days = [];
  const now = new Date();
  // Use UTC for day boundaries
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    days.push(d);
  }
  return days;
}

function getDayLabel(date) {
  // Use local time for day label
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
}

async function calculateAndStoreWeeklyActivity(userId) {
  const days = getLast7Days();
  const nextDay = (date) => {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  };

  // Fetch all tasks for the last 7 days
  const start = days[0];
  const end = nextDay(days[6]);
  const tasks = await Task.find({
    user: userId,
    scheduledDate: { $gte: start, $lt: end },
  });

  let totalTasks = 0,
    completedTasks = 0,
    avgCompletedSum = 0,
    streak = 0,
    bestDay = "",
    bestDayPct = 0;
  const dayStats = [];

  for (let i = 0; i < 7; i++) {
    const dayStart = days[i];
    const dayEnd = nextDay(dayStart);
    const dayTasks = tasks.filter(
      (t) => t.scheduledDate >= dayStart && t.scheduledDate < dayEnd
    );
    const dayTotal = dayTasks.length;
    const dayCompleted = dayTasks.filter(
      (t) => t.status === "completed"
    ).length;
    const pct = dayTotal ? (dayCompleted / dayTotal) * 100 : 0;

    dayStats.push({
      day: getDayLabel(dayStart),
      date: dayStart.toISOString(),
      goal: 100,
      completed: pct,
      hasTasks: dayTotal > 0,
      totalTasks: dayTotal,
      completedTasks: dayCompleted,
    });

    totalTasks += dayTotal;
    completedTasks += dayCompleted;
    avgCompletedSum += pct;

    if (pct > bestDayPct) {
      bestDayPct = pct;
      bestDay = getDayLabel(dayStart);
    }
  }

  // Calculate streak (consecutive days with 100% completion, ending with today)
  for (let i = 6; i >= 0; i--) {
    if (
      dayStats[i].completed === 100 &&
      dayStats[i].goal === 100 &&
      dayStats[i].hasTasks
    ) {
      streak++;
    } else {
      break;
    }
  }

  const avgGoal = 100;
  const avgCompleted = Math.round(avgCompletedSum / 7);

  // Store/update in WeeklyActivity
  await WeeklyActivity.findOneAndUpdate(
    { user: userId, weekStart: days[0] },
    {
      $set: {
        days: dayStats,
        totalTasks,
        completedTasks,
        avgGoal,
        avgCompleted,
        streak,
        bestDay,
        weekStart: days[0],
      },
    },
    { upsert: true }
  );
}



// SEQUENTIAL TASK SYSTEM - Get all tasks assigned for today
export const getDailyTask = async (userId, goalId) => {
  try {
    // Validate inputs
    if (!userId || !goalId) {
      throw new Error("User ID and Goal ID are required");
    }

    // Validate goalId format
    if (!goalId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error("Invalid goal ID format");
    }

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // Get ALL tasks assigned for today (pending, in_progress, completed)
    // Sort by sequenceOrder descending to show newest tasks first (stack behavior)
    const todaysTasks = await Task.find({
      user: userId,
      goal: goalId,
      assignedDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['pending', 'in_progress', 'completed'] }
    }).sort({ sequenceOrder: -1 });

    return todaysTasks;
  } catch (error) {
    console.error(`[getDailyTask] Error:`, error);
    throw error;
  }
};

// Get only assigned tasks (pending/completed) - HIDE ALL QUEUED TASKS
export const getAssignedTasksOnly = async (userId, goalId) => {
  try {
    if (!userId || !goalId) {
      throw new Error("User ID and Goal ID are required");
    }

    // Only return tasks that have been assigned (pending, in_progress, completed)
    // NEVER return queued tasks - they should be invisible to the user
    // Sort by assignedDate and sequenceOrder descending to show newest tasks first (stack behavior)
    const assignedTasks = await Task.find({
      user: userId,
      goal: goalId,
      status: { $in: ['pending', 'in_progress', 'completed'] }
    }).sort({ assignedDate: -1, sequenceOrder: -1 });
    return assignedTasks;
  } catch (error) {
    console.error(`[getAssignedTasksOnly] Error:`, error);
    throw error;
  }
};

export const requestNextTask = async (userId, goalId) => {
  try {
    // Validate inputs
    if (!userId || !goalId) {
      throw new Error("User ID and Goal ID are required");
    }

    // Check if user has any pending tasks - they must complete current tasks first
    const pendingTasks = await Task.find({
      user: userId,
      goal: goalId,
      status: 'pending'
    });

    if (pendingTasks.length > 0) {
      throw new Error("You must complete your current pending tasks before requesting new ones");
    }

    // Get the next task using getDailyTask logic
    const nextTasks = await getDailyTask(userId, goalId);
    return nextTasks;
  } catch (error) {
    console.error(`[requestNextTask] Error:`, error);
    throw error;
  }
};

// Get all tasks for the authenticated user with optional goal filtering
export const getTasks = async (req, res) => {
  try {
    const { goalId } = req.query;

    let query = { user: req.user._id };
    
    // Filter by goalId if provided - STRICT FILTERING
    if (goalId) {
      // Validate goalId format
      if (!goalId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: "Invalid goal ID format",
        });
      }
      // STRICT: Only return tasks that have this exact goalId
      query.goal = goalId;
    } else {
      // If no goalId provided, only return tasks that have NO goal field (legacy tasks)
      // This prevents showing all tasks when a specific goal should be selected
      query.goal = { $exists: false };
    }

    const tasks = await Task.find(query)
      .populate("goal", "field description timeline")
      .sort({ scheduledDate: -1 });

    const formattedTasks = tasks.map((task) => task.formattedData);

    res.json({
      success: true,
      data: formattedTasks,
      totalTasks: formattedTasks.length,
      filteredByGoal: !!goalId,
      goalId: goalId || null,
    });
  } catch (error) {
    console.error(`[getTasks] Error:`, error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
      error: error.message,
    });
  }
};

// Update a task - ENHANCED WITH GATED SEQUENTIAL LOGIC
export const updateTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task)
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });

    const updateData = req.body;
    const oldStatus = task.status;

    // Update allowed fields
    const allowedUpdates = [
      "title",
      "description",
      "type",
      "category",
      "difficulty",
      "priority",
      "estimatedTime",
      "status",
      "scheduledDate",
      "submissionType",
      "submissionFile",
      "submissionText",
      "submissionLink",
      "submittedAt",
      "actualTime",
      "sequenceOrder",
      "assignedDate",
    ];

    allowedUpdates.forEach((field) => {
      if (updateData[field] !== undefined) {
        task[field] = updateData[field];
      }
    });

    // SEQUENTIAL LOGIC: Task completion (no auto-assignment)
    if (oldStatus !== 'completed' && task.status === 'completed' && task.goal) {
      // No auto-assignment here - tasks are only assigned:
      // 1. At midnight (if no pending tasks)
      // 2. When user clicks "Generate New Task"
    }

    // Update legacy data field for backward compatibility
    task.data = {
      ...task.data,
      title: task.title,
      description: task.description,
      type: task.type,
      category: task.category,
      difficulty: task.difficulty,
      priority: task.priority,
      estimatedTime: task.estimatedTime,
      status: task.status,
      isAIGenerated: task.isAIGenerated,
      topics: task.topics,
      resources: task.resources,
      realWorldApplication: task.realWorldApplication,
      successCriteria: task.successCriteria,
      scheduledDate: task.scheduledDate,
      phase: task.phase,
      dayNumber: task.dayNumber,
      submissionType: task.submissionType,
      submissionFile: task.submissionFile,
      submissionText: task.submissionText,
      submissionLink: task.submissionLink,
      submittedAt: task.submittedAt,
      actualTime: task.actualTime,
      sequenceOrder: task.sequenceOrder,
      assignedDate: task.assignedDate,
    };

    await task.save();
    await calculateAndStoreWeeklyActivity(req.user._id);

    res.json({
      success: true,
      data: task.formattedData,
      nextTaskAssigned: oldStatus !== 'completed' && task.status === 'completed',
    });
  } catch (error) {
    console.error("Failed to update task:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update task",
      error: error.message,
    });
  }
};

// Delete a task
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!task)
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    await calculateAndStoreWeeklyActivity(req.user._id);
    res.json({ success: true, message: "Task deleted" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete task",
      error: error.message,
    });
  }
};

export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate("goal", "field description timeline");
    if (!task)
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    res.json({ success: true, data: task.formattedData });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch task",
      error: error.message,
    });
  }
};

// Get tasks by date - SEQUENTIAL SYSTEM: Only show tasks assigned to specific dates
export const getTasksByDate = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    const { date, goalId } = req.query;
    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const queryDate = new Date(date + "T00:00:00Z");
    const nextDate = new Date(queryDate);
    nextDate.setUTCDate(queryDate.getUTCDate() + 1);

    // Filter by goalId if provided
    if (goalId) {
      // Validate goalId format
      if (!goalId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: "Invalid goal ID format",
        });
      }

      // SEQUENTIAL LOGIC: Only show tasks that have been assigned to this specific date
      // Tasks get assignedDate when they become active (either at midnight or when user requests)
      let query = {
        user: req.user._id,
        goal: goalId,
        assignedDate: { $gte: queryDate, $lt: nextDate },
        status: { $in: ['pending', 'in_progress', 'completed'] }
      };

      const tasks = await Task.find(query).populate("goal", "field description timeline").sort({ sequenceOrder: -1 });

      const formattedTasks = tasks.map((task) => task.formattedData);

      return res.json({ 
        success: true, 
        data: formattedTasks,
        filteredByGoal: true,
        goalId: goalId,
        totalTasks: formattedTasks.length,
        date: date,
        isSequentialSystem: true,
      });
    } else {
      // No goalId provided - return legacy tasks
      let query = {
        user: req.user._id,
        goal: { $exists: false },
        scheduledDate: { $gte: queryDate, $lt: nextDate },
      };

      const tasks = await Task.find(query).populate("goal", "field description timeline");
      const formattedTasks = tasks.map((task) => task.formattedData);

      return res.json({ 
        success: true, 
        data: formattedTasks,
        filteredByGoal: false,
        goalId: null,
        totalTasks: formattedTasks.length,
        date: date,
        isSequentialSystem: false,
      });
    }
  } catch (err) {
    console.error("[getTasksByDate] Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// File upload functionality moved to client-side LocalFileManager
// This endpoint is no longer needed as files are stored locally in browser localStorage
export const uploadTaskSubmission = async (req, res) => {
  res.status(410).json({
    success: false,
    message: "File upload functionality has been moved to client-side local storage. Files are now stored directly in the browser.",
  });
};

// File viewing functionality moved to client-side LocalFileManager
// This endpoint is no longer needed as files are stored and viewed locally in browser localStorage
export const viewTaskSubmission = async (req, res) => {
  res.status(410).json({
    success: false,
    message: "File viewing functionality has been moved to client-side local storage. Files are now accessed directly in the browser.",
  });
};
