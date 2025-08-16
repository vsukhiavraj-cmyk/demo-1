// Task calculation utilities based on task_count_by_duration.js reference
// This ensures consistent task count calculations across the application

/**
 * Calculate optimal task requirements based on user capacity, experience level, and weekly availability
 * @param {number} months - Timeline in months (1-24)
 * @param {object} userProfile - User's assessment profile including timeCommitment, experienceLevel, and consistency
 * @returns {object} - Object containing task requirements optimized for user capacity
 */
export const calculateTaskRequirements = (months, userProfile = {}) => {
  // Ensure months is a valid number between 1-24
  const validMonths = Math.max(1, Math.min(24, Number(months) || 1));
  const totalDays = Math.max(30, Math.round(validMonths * 30));

  // Get user's daily time commitment, experience level, and weekly consistency with safe defaults
  // Ensure all values are valid numbers to prevent undefined errors
  const timeCommitment = Math.max(
    1,
    Math.min(5, Number(userProfile.timeCommitment) || 3)
  );
  const experienceLevel = Math.max(
    1,
    Math.min(5, Number(userProfile.experienceLevel) || 2)
  );
  const consistency = Math.max(
    1,
    Math.min(
      5,
      Number(userProfile.consistency) ||
        Number(userProfile.focusCapability) ||
        3
    )
  );

  // Validate that we have valid numbers
  if (isNaN(timeCommitment) || isNaN(experienceLevel) || isNaN(consistency)) {
    console.error("Invalid user profile values:", {
      timeCommitment,
      experienceLevel,
      consistency,
      userProfile,
    });
    throw new Error("Invalid user profile data - numeric values required");
  }

  // Map time commitment to actual daily hours
  const dailyHoursMap = {
    1: 1, // 1 hour per day
    2: 2, // 1-2 hours per day
    3: 3, // 2-4 hours per day
    4: 5, // 4-6 hours per day
    5: 7, // 6+ hours per day
  };

  // Map consistency to days per week
  const daysPerWeekMap = {
    1: 2, // Flexible schedule, when possible
    2: 3, // Flexible schedule, when possible
    3: 4, // Somewhat consistent, 3-4 days/week
    4: 6, // Mostly consistent, 5-6 days/week
    5: 7, // Very consistent, daily practice
  };

  const dailyHours = dailyHoursMap[Math.round(timeCommitment)] || 3;
  const daysPerWeek = daysPerWeekMap[Math.round(consistency)] || 5;

  // Calculate effective study days (not all calendar days)
  const weeksInTimeline = Math.round(totalDays / 7);
  const effectiveStudyDays = weeksInTimeline * daysPerWeek;

  // Calculate task complexity and duration based on user profile
  const taskComplexity = calculateTaskComplexity(
    timeCommitment,
    experienceLevel
  );

  // Determine optimal task count using hybrid approach (80% baseline + capacity adjustment + realistic completion check)
  const finalTaskCount = calculateOptimalTaskCount(
    totalDays,
    effectiveStudyDays,
    dailyHours,
    taskComplexity,
    daysPerWeek,
    experienceLevel,
    consistency
  );

  // Calculate target and recommended task counts based on final realistic count
  const finalTargetTasks = Math.round(finalTaskCount * 1.1); // 10% buffer
  const finalRecommendedTasks = Math.round(finalTaskCount * 1.2); // 20% more for comprehensive coverage

  const finalTasksPerStudyDay = finalTaskCount / effectiveStudyDays;
  const finalTasksPerWeek = finalTaskCount / weeksInTimeline;
  const weeklyHours = dailyHours * daysPerWeek;
  const avgHoursPerTask = getBaseTaskHours(
    dailyHours,
    daysPerWeek,
    taskComplexity
  );

  // Calculate capacity-based tasks for comparison (before realistic capping)
  const baseTaskHours = getBaseTaskHours(
    dailyHours,
    daysPerWeek,
    taskComplexity
  );
  const totalAvailableHours = weeklyHours * weeksInTimeline;
  const capacityBasedTasks = Math.round(totalAvailableHours / baseTaskHours);

  return {
    months: validMonths,
    totalDays,
    effectiveStudyDays,
    daysPerWeek,
    minTasks: finalTaskCount,
    targetTasks: finalTargetTasks,
    recommendedTasks: finalRecommendedTasks,
    dailyHours,
    timeCommitment,
    experienceLevel,
    consistency,
    tasksPerStudyDay: Math.round(finalTasksPerStudyDay * 10) / 10,
    tasksPerWeek: Math.round(finalTasksPerWeek * 10) / 10,
    avgHoursPerTask: Math.round(avgHoursPerTask * 10) / 10,
    taskComplexity: taskComplexity.level,
    taskType: taskComplexity.type,
    intensity: getWorkloadIntensity(finalTasksPerStudyDay, dailyHours),
    weeklyHours,
    baselineMinTasks: Math.round(totalDays * 0.8),
    capacityUtilization: Math.round(
      ((finalTasksPerWeek * avgHoursPerTask) / weeklyHours) * 100
    ),
    // New realistic completion info
    realisticMaxTasks: Math.round(
      effectiveStudyDays *
        Math.min(1.5, ((experienceLevel + consistency) / 10) * 2)
    ),
    realismFactor:
      Math.round(((experienceLevel + consistency) / 10) * 100) / 100,
    capacityBasedTasks: capacityBasedTasks,
    wasCapacityCapped: finalTaskCount < capacityBasedTasks,
  };
};

/**
 * Calculate task complexity based on user's time commitment and experience level
 * @param {number} timeCommitment - User's time commitment (1-5)
 * @param {number} experienceLevel - User's experience level (1-5)
 * @returns {object} - Task complexity configuration
 */
const calculateTaskComplexity = (timeCommitment, experienceLevel) => {
  // Higher time commitment + higher experience = more complex, comprehensive tasks
  const complexityScore = timeCommitment * 0.6 + experienceLevel * 0.4;

  if (complexityScore >= 4.5) {
    return {
      level: "Expert",
      type: "Comprehensive Projects",
      description: "Complex, multi-part projects combining multiple concepts",
      taskMultiplier: 0.8, // Still comprehensive but more tasks for engagement
    };
  } else if (complexityScore >= 3.5) {
    return {
      level: "Advanced",
      type: "Integrated Challenges",
      description: "Multi-topic tasks with real-world applications",
      taskMultiplier: 0.85, // Good balance of complexity and frequency
    };
  } else if (complexityScore >= 2.5) {
    return {
      level: "Intermediate",
      type: "Focused Sessions",
      description: "Single-topic deep dives with practical exercises",
      taskMultiplier: 0.9, // Slightly more tasks for engagement
    };
  } else {
    return {
      level: "Beginner",
      type: "Guided Learning",
      description: "Step-by-step learning with clear guidance",
      taskMultiplier: 1.0, // More frequent, smaller tasks for beginners
    };
  }
};

/**
 * Calculate optimal task count using hybrid approach: 80% baseline + user capacity adjustment + realistic completion check
 * @param {number} totalDays - Total calendar days in timeline
 * @param {number} effectiveStudyDays - Actual days user will study
 * @param {number} dailyHours - Available hours per day
 * @param {object} taskComplexity - Task complexity configuration
 * @param {number} daysPerWeek - Days per week user can study
 * @param {number} experienceLevel - User's experience level (1-5)
 * @param {number} consistency - User's consistency level (1-5)
 * @returns {number} - Optimal number of tasks
 */
const calculateOptimalTaskCount = (
  totalDays,
  effectiveStudyDays,
  dailyHours,
  taskComplexity,
  daysPerWeek,
  experienceLevel,
  consistency
) => {
  // Parameter validation to prevent undefined errors
  if (typeof experienceLevel !== "number" || typeof consistency !== "number") {
    console.error("Invalid parameters in calculateOptimalTaskCount:", {
      experienceLevel,
      consistency,
    });
    throw new Error(
      `Invalid parameters: experienceLevel=${experienceLevel}, consistency=${consistency}`
    );
  }

  // BASELINE: Use 80% of total calendar days as minimum (original proven approach)
  const baselineMinTasks = Math.round(totalDays * 0.8);

  // CAPACITY ADJUSTMENT: Calculate user's weekly learning capacity
  const weeklyHours = dailyHours * daysPerWeek;
  const weeksInTimeline = Math.round(totalDays / 7);
  const totalAvailableHours = weeklyHours * weeksInTimeline;

  // SMART TASK SIZING: Adjust task duration based on user capacity and experience
  // Lower capacity users get shorter, easier tasks
  // Higher capacity users get longer, more complex tasks
  const baseTaskHours = getBaseTaskHours(
    dailyHours,
    daysPerWeek,
    taskComplexity
  );
  const capacityBasedTasks = Math.round(totalAvailableHours / baseTaskHours);

  // HYBRID APPROACH: Use the higher of baseline or capacity-based count
  // This ensures we have enough tasks for engagement while respecting user capacity
  const optimalTaskCount = Math.max(baselineMinTasks, capacityBasedTasks);

  // REALISTIC COMPLETION CAPACITY CHECK
  // Consider user's experience level and consistency for realistic task completion
  const experienceMultiplier = experienceLevel / 5; // 0.2 to 1.0
  const consistencyMultiplier = consistency / 5; // 0.2 to 1.0
  const realismFactor = (experienceMultiplier + consistencyMultiplier) / 2; // Average of both

  // Calculate maximum tasks user can realistically complete
  // Based on: study days available, task complexity, and user capability
  // BUT: Don't let realism factor go below 0.5 to avoid too few tasks
  const adjustedRealismFactor = Math.max(0.5, realismFactor); // Minimum 50% capacity
  const maxTasksPerStudyDay = Math.min(
    1.5, // Never more than 1.5 tasks per study day
    adjustedRealismFactor * 2 // Experience/consistency affects max tasks per day
  );
  const realisticMaxTasks = Math.round(
    effectiveStudyDays * maxTasksPerStudyDay
  );

  // REASONABLE LIMITS: Ensure task count is within practical bounds
  // IMPORTANT: Always respect the 80% baseline as minimum
  const maxReasonableTasks = Math.max(
    baselineMinTasks, // Never go below 80% baseline
    Math.min(
      totalDays, // Never more than total days
      realisticMaxTasks, // Never more than user can realistically complete
      effectiveStudyDays * 1.5 // Original safety limit
    )
  );
  const minReasonableTasks = baselineMinTasks; // Use only the 80% baseline, no arbitrary minimum

  // Final task count: ALWAYS respect the 80% baseline minimum
  const finalTaskCount = Math.max(
    minReasonableTasks,
    Math.min(optimalTaskCount, maxReasonableTasks)
  );

  // Debug logging to understand task count calculation
  console.log(`🔍 Task Count Calculation Debug:
    - Total Days: ${totalDays}
    - Effective Study Days: ${effectiveStudyDays}
    - Experience Level: ${experienceLevel}/5
    - Consistency: ${consistency}/5
    - Realism Factor: ${realismFactor.toFixed(
      2
    )} → Adjusted: ${adjustedRealismFactor.toFixed(2)}
    - Max Tasks Per Study Day: ${maxTasksPerStudyDay.toFixed(2)}
    - Baseline Min Tasks (80%): ${baselineMinTasks}
    - Capacity Based Tasks: ${capacityBasedTasks}
    - Realistic Max Tasks: ${realisticMaxTasks}
    - Optimal Task Count: ${optimalTaskCount}
    - Max Reasonable Tasks: ${maxReasonableTasks}
    - FINAL TASK COUNT: ${finalTaskCount}`);

  return finalTaskCount;
};

/**
 * Calculate base task hours based on user capacity and complexity level
 * @param {number} dailyHours - Hours available per day
 * @param {number} daysPerWeek - Days per week available
 * @param {object} taskComplexity - Task complexity configuration
 * @returns {number} - Base hours per task
 */
const getBaseTaskHours = (dailyHours, daysPerWeek, taskComplexity) => {
  // Calculate user's weekly capacity
  const weeklyHours = dailyHours * daysPerWeek;

  // Base task hours depend on user's weekly capacity and experience level
  let baseHours;

  if (weeklyHours >= 35) {
    // High capacity (35+ hours/week)
    baseHours =
      taskComplexity.level === "Expert"
        ? 4
        : taskComplexity.level === "Advanced"
        ? 3
        : taskComplexity.level === "Intermediate"
        ? 2.5
        : 2;
  } else if (weeklyHours >= 20) {
    // Medium capacity (20-34 hours/week)
    baseHours =
      taskComplexity.level === "Expert"
        ? 3
        : taskComplexity.level === "Advanced"
        ? 2.5
        : taskComplexity.level === "Intermediate"
        ? 2
        : 1.5;
  } else if (weeklyHours >= 10) {
    // Low capacity (10-19 hours/week)
    baseHours =
      taskComplexity.level === "Expert"
        ? 2.5
        : taskComplexity.level === "Advanced"
        ? 2
        : taskComplexity.level === "Intermediate"
        ? 1.5
        : 1;
  } else {
    // Very low capacity (< 10 hours/week)
    baseHours =
      taskComplexity.level === "Expert"
        ? 2
        : taskComplexity.level === "Advanced"
        ? 1.5
        : taskComplexity.level === "Intermediate"
        ? 1
        : 0.5;
  }

  return baseHours;
};

/**
 * Get workload intensity level based on tasks per day and available hours
 * @param {number} tasksPerDay - Average tasks per day
 * @param {number} dailyHours - Available hours per day
 * @returns {string} - Intensity level
 */
const getWorkloadIntensity = (tasksPerDay, dailyHours = 3) => {
  const hoursPerTask = dailyHours / tasksPerDay;

  if (hoursPerTask <= 1.5) return "Intensive";
  if (hoursPerTask <= 2.5) return "Moderate";
  if (hoursPerTask <= 4) return "Light";
  return "Very Light";
};

/**
 * Get supported duration options with their task requirements
 * @param {object} userProfile - User's assessment profile
 * @returns {array} - Array of duration options with task counts
 */
export const getSupportedDurations = (userProfile = {}) => {
  const durations = [1, 2, 3, 4, 6, 12];

  return durations.map((months) => ({
    months,
    label: `${months} Month${months > 1 ? "s" : ""}`,
    ...calculateTaskRequirements(months, userProfile),
  }));
};

/**
 * Print task count breakdown for all supported durations (for debugging)
 * @param {object} userProfile - User's assessment profile for personalized breakdown
 */
export const printTaskCountBreakdown = (userProfile = {}) => {
  const timeCommitment = userProfile.timeCommitment || 3;
  const experienceLevel = userProfile.experienceLevel || 2;
  const dailyHoursMap = { 1: 1, 2: 2, 3: 3, 4: 5, 5: 7 };
  const dailyHours = dailyHoursMap[Math.round(timeCommitment)] || 3;

  console.log("=== SMART TASK GENERATION BREAKDOWN ===");
  console.log(
    `User Profile: Time Commitment ${timeCommitment}/5 (${dailyHours}h/day), Experience Level ${experienceLevel}/5`
  );
  console.log("\n📊 OPTIMIZED TASK COUNT BREAKDOWN:");
  console.log(
    "Duration | Tasks | Hrs/Task | Task Type | Complexity | Utilization"
  );
  console.log(
    "---------|-------|----------|-----------|------------|------------"
  );

  const durations = getSupportedDurations(userProfile);
  durations.forEach(
    ({
      label,
      minTasks,
      avgHoursPerTask,
      taskType,
      taskComplexity,
      capacityUtilization,
    }) => {
      console.log(
        `${label.padEnd(8)} | ${minTasks
          .toString()
          .padEnd(5)} | ${avgHoursPerTask
          .toString()
          .padEnd(8)} | ${taskType.padEnd(9)} | ${taskComplexity.padEnd(
          10
        )} | ${capacityUtilization}%`
      );
    }
  );

  console.log("\n⚡ SMART TASK APPROACH:");
  durations.forEach(({ label, minTasks, taskComplexity, avgHoursPerTask }) => {
    console.log(
      `${label}: ${minTasks} ${taskComplexity.toLowerCase()} tasks (${avgHoursPerTask}h each)`
    );
  });

  console.log("\n✅ INTELLIGENT TASK SIZING:");
  console.log(
    "• Low commitment users: More frequent, guided tasks (1-2h each)"
  );
  console.log("• High commitment users: Comprehensive projects (6-8h each)");
  console.log("• Task complexity scales with experience level");
  console.log("• Optimal learning pace maintained for all user types");
  console.log("• Better engagement through appropriately challenging content");
};
