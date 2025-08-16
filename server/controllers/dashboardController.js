import Task from "../models/Task.js";


// Utility function for refined data preparation
function getPast7DaysData(tasks, today = new Date()) {
  const result = [];
  const allDays = [];

  // build the last 7 days list
  for (let i = 6; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    allDays.push(day);
  }

  // normalize dates
  const processedTasks = tasks.map((t) => ({
    ...t,
    createdAt: new Date(t.createdAt),
    completionDate: t.status === "completed" ? new Date(t.updatedAt) : null,
  }));

  // total tasks count (not needed for backlog)
  const totalTasks = processedTasks.length;

  allDays.forEach((day) => {
    // Set the day to end of day for proper comparison
    const endOfDay = new Date(day);
    endOfDay.setHours(23, 59, 59, 999);

    // count all created on or before this day
    const totalCreated = processedTasks.filter(
      (t) => t.createdAt <= endOfDay
    ).length;

    // count all completed on or before this day
    const totalCompleted = processedTasks.filter(
      (t) =>
        t.status === "completed" &&
        t.completionDate &&
        t.completionDate <= endOfDay
    ).length;

    // compute backlog = created minus completed
    const backlog = totalCreated - totalCompleted;

    // count tasks COMPLETED exactly on the day (for the "Completed" bar)
    const completedOnDay = processedTasks.filter(
      (t) =>
        t.status === "completed" &&
        t.completionDate &&
        t.completionDate.toDateString() === day.toDateString()
    ).length;

    // console.log(
    //   `Day ${day.toDateString()}: totalCreated=${totalCreated}, totalCompleted=${totalCompleted}, backlog=${backlog}, completedOnDay=${completedOnDay}`
    // )
    ;

    result.push({
      label: day.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
      }),
      goal: backlog,
      completed: completedOnDay,
    });
  });

  // console.log("getPast7DaysData - Input tasks:", tasks.length);
  // console.log("getPast7DaysData - Result:", result);

  return result;
}

// Calculate streak and badges
function calculateStreak(past7Data) {
  let streak = 0;
  for (let i = past7Data.length - 1; i >= 0; i--) {
    if (past7Data[i].completed > 0) streak += 1;
    else break;
  }
  return streak;
}

function calculateBadges(completedTasks, streak, totalTasks) {
  const badges = [];

  if (streak >= 5)
    badges.push({
      type: "streak",
      message: `${streak}-day streak!`,
      icon: "🔥",
    });
  if (completedTasks >= 100)
    badges.push({
      type: "milestone",
      message: "100 Tasks Completed!",
      icon: "🏆",
    });
  if (completedTasks >= 50)
    badges.push({
      type: "milestone",
      message: "50 Tasks Completed!",
      icon: "🎯",
    });
  if (streak >= 7)
    badges.push({ type: "streak", message: "Week Warrior!", icon: "⚡" });
  if (totalTasks > 0 && completedTasks / totalTasks >= 0.8) {
    badges.push({
      type: "efficiency",
      message: "80%+ Completion Rate!",
      icon: "📈",
    });
  }

  return badges;
}

// GET /api/dashboard with optional goal filtering
export const getDashboardData = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { goalId } = req.query;

    // 1. Build query with optional goal filtering
    let query = { user: userId };
    if (goalId) {
      // Validate goalId format
      if (!goalId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: "Invalid goal ID format",
        });
      }
      query.goal = goalId;
    }

    // 2. Fetch ONLY ASSIGNED tasks for this user (hide queued tasks from dashboard)
    // CRITICAL: Only show tasks that have been assigned to the user (have assignedDate)
    query.status = { $in: ['pending', 'in_progress', 'completed'] }; // Only assigned tasks
    query.assignedDate = { $exists: true, $ne: null }; // Only tasks that have been assigned
    const tasks = await Task.find(query).lean();
    
    // Transform tasks to match frontend expectations
    const transformedTasks = tasks.map((task) => ({
      _id: task._id,
      name: task.data?.name || task.data?.title || "Untitled Task",
      status: task.status || task.data?.status || "pending", // Use root level status first
      notes: task.data?.notes || task.data?.description,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      assignedDate: task.assignedDate, // CRITICAL: Include assignedDate for WeeklyBarChart
      dueDate: task.data?.dueDate,
      importance: task.data?.importance,
      type: task.data?.type,
      data: {
        ...task.data,
        status: task.status || task.data?.status || "pending", // Ensure status is in data too
        assignedDate: task.assignedDate, // Include in data for compatibility
      }, // Keep original data for compatibility
    }));

    // 2. Calculate refined past 7 days data
    const past7Progress = getPast7DaysData(transformedTasks);
    // console.log("Backend - past7Progress calculated:", past7Progress);
    // console.log("Backend - tasks count:", transformedTasks.length);

    // 3. Calculate summary stats
    const completedTasks = transformedTasks.filter(
      (t) => t.status === "completed"
    ).length;
    const totalTasks = transformedTasks.length;
    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 4. Calculate streak and badges
    const streak = calculateStreak(past7Progress);
    const badges = calculateBadges(completedTasks, streak, totalTasks);

    // 5. Calculate AI insights
    const overdueTasks = transformedTasks.filter(
      (t) => t.status === "overdue"
    ).length;
    const aiInsights = [];

    if (completionRate < 50) {
      aiInsights.push(
        "Your completion rate is below 50%. Try breaking tasks into smaller chunks!"
      );
    }
    if (overdueTasks > 0) {
      aiInsights.push(
        `You have ${overdueTasks} overdue task(s). Consider reprioritizing!`
      );
    }
    if (streak === 0) {
      aiInsights.push(
        "Start your productivity streak today! Complete at least one task."
      );
    }

    // 6. Create summary object
    const summary = {
      totalTasks,
      completedTasks,
      completionRate,
      streak,
      badges,
      aiInsights,
      bestDay: findBestDay(past7Progress),
      days: past7Progress.map((day) => ({
        day: day.label,
        goal: day.goal,
        completed: day.completed,
      })),
    };

    res.json({
      success: true,
      tasks: transformedTasks,
      summary,
      past7Progress,
      filteredByGoal: !!goalId,
      goalId: goalId || null,
    });
  } catch (err) {
    console.error("Dashboard data fetch error:", err);
    next(err);
  }
};

// Helper function to find best day
function findBestDay(past7Progress) {
  if (!past7Progress || past7Progress.length === 0) return "N/A";

  const bestDay = past7Progress.reduce((best, current) =>
    current.completed > best.completed ? current : best
  );

  return bestDay.label;
}

// helpers
const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - ((day + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
};

const sameDay = (d1, d2) =>
  new Date(d1).toDateString() === new Date(d2).toDateString();

const average = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

const bestDayName = (days) =>
  days.reduce((p, c) => (c.completed > p.completed ? c : p)).day;

export const getStatusHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const tasks = await Task.find({ 
      user: userId,
      status: { $in: ['pending', 'in_progress', 'completed'] }, // Only assigned tasks
      assignedDate: { $exists: true, $ne: null } // Only tasks that have been assigned
    });
    const days = 14;
    const history = [];

    function calculateDailyProgress(allTasks, currentDate = new Date()) {
      const startOfDay = new Date(currentDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(currentDate);
      endOfDay.setHours(23, 59, 59, 999);

      const parseDate = (dateStr) => new Date(dateStr);

      // TASKS THAT WERE PENDING AT START OF DAY
      const tasksPendingAtStartOfDay = allTasks.filter((task) => {
        const createdAt = parseDate(task.createdAt);
        const updatedAt = parseDate(task.updatedAt);
        const status = task.data?.status;

        if (createdAt > endOfDay) return false;
        if (status === "completed" && updatedAt < startOfDay) return false;
        return createdAt <= endOfDay;
      });

      // TASKS COMPLETED TODAY
      const tasksCompletedToday = allTasks.filter((task) => {
        const updatedAt = parseDate(task.updatedAt);
        const status = task.data?.status;
        return (
          status === "completed" &&
          updatedAt >= startOfDay &&
          updatedAt <= endOfDay
        );
      });

      const totalGoal = tasksPendingAtStartOfDay.length;
      const completedCount = tasksCompletedToday.length;
      const completionPercent =
        totalGoal === 0 ? 0 : Math.round((completedCount / totalGoal) * 100);

      return {
        totalGoal,
        completedCount,
        completionPercent,
      };
    }

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const { completionPercent } = calculateDailyProgress(tasks, date);
      history.push({
        date: date.toISOString().slice(0, 10),
        value: completionPercent,
      });
    }

    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch status history",
      error: error.message,
    });
  }
};

// New: Calendar daily stats for a month
export const getCalendarDailyStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { month, year } = req.query;
    if (!month || !year) {
      return res
        .status(400)
        .json({ success: false, message: "Month and year are required" });
    }
    const monthInt = parseInt(month, 10);
    const yearInt = parseInt(year, 10);
    if (isNaN(monthInt) || isNaN(yearInt)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid month or year" });
    }
    // Get start and end of month
    const startDate = new Date(yearInt, monthInt, 1);
    const endDate = new Date(yearInt, monthInt + 1, 0, 23, 59, 59, 999);
    // Fetch all ASSIGNED tasks for this user in this month (hide queued tasks)
    const tasks = await Task.find({
      user: userId,
      assignedDate: { $gte: startDate, $lte: endDate }, // Use assignedDate instead of createdAt
      status: { $in: ['pending', 'in_progress', 'completed'] }, // Only assigned tasks
      assignedDate: { $exists: true, $ne: null } // Only tasks that have been assigned
    });
    // Prepare daily stats
    const daysInMonth = new Date(yearInt, monthInt + 1, 0).getDate();
    const dailyStats = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(yearInt, monthInt, day);
      const nextDate = new Date(yearInt, monthInt, day + 1);
      const dateStr = date.toISOString().split("T")[0];
      const dayTasks = tasks.filter(
        (t) => t.createdAt >= date && t.createdAt < nextDate
      );
      const totalTasks = dayTasks.length;
      const completedTasks = dayTasks.filter(
        (t) => t.data.status === "completed"
      ).length;
      const inProgressTasks = dayTasks.filter(
        (t) => t.data.status === "in-progress"
      ).length;
      const pendingTasks = dayTasks.filter(
        (t) => t.data.status === "pending"
      ).length;
      const overdueTasks = dayTasks.filter(
        (t) => t.data.status === "overdue"
      ).length;
      dailyStats[dateStr] = {
        date: dateStr,
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        overdueTasks,
        tasks: dayTasks, // Optionally include task details
      };
    }
    res.json({ success: true, dailyStats });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch calendar daily stats",
      error: error.message,
    });
  }
};
