import Goal from "../models/Goal.js";
import Task from "../models/Task.js";
import { generateTasksForContext } from "./aiController.js";
import catchAsync from "../utils/catchAsync.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import { enhanceResourcesWithDefaults } from "../utils/resourceValidator.js";
import { calculateTaskRequirements, validateTaskCount } from "../utils/taskCalculations.js";

// Fallback task creation when AI fails
const createFallbackTasks = (goalData, totalDays, expectedMinTasks) => {
  console.log(`Creating ${expectedMinTasks} fallback tasks for ${goalData.field}`);

  const tasks = [];
  const phases = goalData.roadmap?.phases || [
    { title: "Foundation", topics: ["Basics", "Setup"] },
    { title: "Intermediate", topics: ["Core Concepts", "Practice"] },
    { title: "Advanced", topics: ["Advanced Topics", "Projects"] },
    { title: "Mastery", topics: ["Real-world Application", "Portfolio"] }
  ];

  const tasksPerPhase = Math.ceil(expectedMinTasks / phases.length);

  for (let phaseIndex = 0; phaseIndex < phases.length; phaseIndex++) {
    const phase = phases[phaseIndex];
    const phaseNumber = phaseIndex + 1;

    for (let taskIndex = 0; taskIndex < tasksPerPhase && tasks.length < expectedMinTasks; taskIndex++) {
      const taskNumber = tasks.length + 1;

      tasks.push({
        title: `${goalData.field} - ${phase.title} Task ${taskIndex + 1}`,
        description: `Learn and practice ${phase.topics[taskIndex % phase.topics.length] || 'core concepts'} in ${goalData.field}. This is a structured learning task designed to build your skills progressively.`,
        type: taskIndex % 4 === 0 ? "project" : taskIndex % 3 === 0 ? "practice" : "learning",
        phase: phaseNumber,
        difficulty: Math.min(5, Math.max(1, phaseNumber + Math.floor(taskIndex / 3))),
        estimatedHours: 2,
        priority: taskIndex < 3 ? "high" : taskIndex < 6 ? "medium" : "low",
        topics: phase.topics || [goalData.field],
        resources: [
          {
            type: "documentation",
            title: `${goalData.field} Documentation`,
            url: `https://www.google.com/search?q=${encodeURIComponent(goalData.field + ' documentation')}`
          },
          {
            type: "video",
            title: `${goalData.field} Tutorial`,
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(goalData.field + ' tutorial')}`
          }
        ],
        realWorldApplication: `Apply ${goalData.field} concepts in real-world scenarios and projects.`,
        successCriteria: [
          `Understand the key concepts of ${phase.topics[0] || 'the topic'}`,
          `Complete practical exercises`,
          `Demonstrate knowledge through examples`
        ]
      });
    }
  }

  return {
    tasks,
    recommendations: [
      {
        type: "study_tip",
        title: "Consistent Practice",
        description: "Practice regularly and build projects to reinforce your learning."
      }
    ],
    estimatedDuration: `${Math.round(totalDays / 30)} months`
  };
};

// Utility function to clean up incomplete goals
const cleanupIncompleteGoals = async (userId) => {
  try {
    // Find goals that don't have tasks generated
    const incompleteGoals = await Goal.find({
      user: userId,
      $or: [
        { tasksGenerated: false },
        { tasksGenerated: { $exists: false } },
        { totalTasksGenerated: 0 },
        { totalTasksGenerated: { $exists: false } }
      ]
    });

    for (const goal of incompleteGoals) {
      // Delete any tasks that might exist for this incomplete goal
      await Task.deleteMany({ goal: goal._id });
      // Delete the incomplete goal
      await Goal.findByIdAndDelete(goal._id);
      console.log(`Cleaned up incomplete goal: ${goal._id} (${goal.field})`);
    }

    return incompleteGoals.length;
  } catch (error) {
    console.error("Error during cleanup of incomplete goals:", error);
    return 0;
  }
};

// Create new goal with AI-generated tasks
export const createGoalWithTasks = catchAsync(async (req, res) => {
  const {
    field,
    description,
    timeline,
    personalNeeds,
    strengths,
    weaknesses,
    userProfile,
    assessmentData,
    goalSetup,
    roadmap,
  } = req.body;

  // Debug: Log the received timeline value
  console.log(`Received timeline value: ${timeline} (type: ${typeof timeline})`);

  // Ensure timeline is a valid number
  const validTimeline = Math.max(1, Math.min(24, Number(timeline) || 1)); // Ensure between 1-24 months

  // Validate goal data
  const validation = Goal.validate({ field, description, timeline });
  if (!validation.isValid) {
    throw new ErrorResponse(
      `Validation failed: ${validation.errors.join(", ")}`,
      400
    );
  }

  // Create goal object but don't save yet - we'll only save if task generation succeeds
  const goalData = {
    user: req.user._id,
    field,
    description,
    timeline: validTimeline, // Use the validated timeline
    personalNeeds: personalNeeds || null,
    strengths: strengths || [],
    weaknesses: weaknesses || [],
    userProfile: userProfile || {},
    assessmentData: assessmentData || {},
    goalSetup: goalSetup || {},
    roadmap: roadmap || {},
  };

  let goal = null;
  let createdTasks = [];

  try {
    // First, generate AI tasks BEFORE saving the goal
    const taskRequirements = calculateTaskRequirements(validTimeline);
    const { totalDays, minTasks: expectedMinTasks, intensity } = taskRequirements;
    console.log(`Generating tasks for ${validTimeline} months (${totalDays} days) - Expected minimum: ${expectedMinTasks} tasks (${intensity} workload)`);

    let aiData = null;
    let retryCount = 0;
    const maxRetries = 3;

    // Debug roadmap structure
    console.log(`Roadmap structure:`, JSON.stringify(goalData.roadmap, null, 2));
    console.log(`Roadmap phases:`, JSON.stringify(goalData.roadmap?.phases, null, 2));

    // Retry task generation if insufficient tasks are generated
    while (retryCount < maxRetries) {
      try {
        aiData = await generateTasksForContext({
          userProfile: {
            experienceLevel: goalData.userProfile?.experienceLevel || 2,
            timeCommitment: goalData.userProfile?.timeCommitment || 3,
            learningStyle: goalData.userProfile?.preferredStyle || "balanced",
            motivation: goalData.userProfile?.motivation || 3,
          },
          assessment: goalData.assessmentData,
          goal: {
            ...goalData.goalSetup,
            field: goalData.field,
            personalNeeds: goalData.personalNeeds
          },
          roadmap: goalData.roadmap?.phases || [],
          currentPhase: 1,
          learningPath: goalData.roadmap?.id || "general",
          totalDays, // Pass total days for the prompt
          personalNeeds: goalData.personalNeeds
        });

        // Check if we got enough tasks
        if (aiData && aiData.tasks && aiData.tasks.length >= expectedMinTasks) {
          console.log(`✅ AI generated ${aiData.tasks.length} tasks (required: ${expectedMinTasks}) on attempt ${retryCount + 1}`);
          break;
        } else {
          retryCount++;
          const actualCount = aiData?.tasks?.length || 0;
          console.log(`❌ AI generated only ${actualCount} tasks (required: ${expectedMinTasks}) on attempt ${retryCount}. Retrying...`);

          if (retryCount >= maxRetries) {
            throw new Error(`AI failed to generate sufficient tasks after ${maxRetries} attempts. Generated: ${actualCount}, Required: ${expectedMinTasks}`);
          }
        }
      } catch (error) {
        retryCount++;
        console.error(`Task generation attempt ${retryCount} failed:`, error.message);
        console.error(`Full error:`, error);

        if (retryCount >= maxRetries) {
          // Create fallback tasks if AI completely fails
          aiData = createFallbackTasks(goalData, totalDays, expectedMinTasks);
          break;
        }
      }
    }

    // Validate that AI task generation was successful and returned tasks
    if (!aiData || !aiData.tasks || !Array.isArray(aiData.tasks) || aiData.tasks.length === 0) {
      throw new Error("AI task generation failed - no tasks were generated");
    }

    // Validate minimum task count for the timeline
    const validation = validateTaskCount(aiData.tasks.length, validTimeline);
    if (!validation.isValid) {
      throw new Error(`AI generated insufficient tasks: ${validation.generatedCount} tasks for ${totalDays} days (expected minimum: ${validation.requiredCount}, shortfall: ${validation.shortfall})`);
    }

    // Additional validation: ensure tasks have required fields
    const invalidTasks = aiData.tasks.filter(task =>
      !task.title ||
      !task.description ||
      typeof task.title !== 'string' ||
      typeof task.description !== 'string' ||
      task.title.trim().length === 0 ||
      task.description.trim().length === 0
    );

    if (invalidTasks.length > 0) {
      throw new Error(`AI generated ${invalidTasks.length} invalid tasks with missing or empty titles/descriptions`);
    }

    // Validate phase distribution
    const phaseDistribution = {};
    aiData.tasks.forEach(task => {
      const phase = Number(task.phase) || 1;
      phaseDistribution[phase] = (phaseDistribution[phase] || 0) + 1;
    });

    const expectedPhases = Math.max(3, Math.min(6, validTimeline)); // Expected phases based on timeline
    const actualPhases = goalData.roadmap?.phases?.length || expectedPhases;
    const numPhases = actualPhases;

    console.log(`Expected phases for ${validTimeline} months: ${expectedPhases}, Actual roadmap phases: ${actualPhases}`);

    const emptyPhases = [];
    for (let i = 1; i <= numPhases; i++) {
      if (!phaseDistribution[i] || phaseDistribution[i] === 0) {
        emptyPhases.push(i);
      }
    }

    if (emptyPhases.length > 0) {
      console.warn(`Warning: Phases ${emptyPhases.join(', ')} have no tasks assigned`);
    }

    console.log(`AI successfully generated ${aiData.tasks.length} valid tasks for goal creation`);
    console.log(`Phase distribution:`, phaseDistribution);

    // Only create and save the goal if task generation was successful
    goal = new Goal(goalData);
    await goal.save();

    // Now create tasks since we have a valid goal ID
    const tasks = aiData.tasks;
    const startDate = new Date();
    // numPhases already declared above, reusing it

    // Mark goal as generating tasks
    goal.tasksGenerated = false;
    goal.isGeneratingTasks = true;
    await goal.save();

    console.log(`Creating ${tasks.length} tasks distributed across ${numPhases} phases`);

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];

      // Improved phase distribution: use AI-provided phase or distribute evenly
      let phase = Number(task.phase) || Math.floor((i / tasks.length) * numPhases) + 1;
      phase = Math.max(1, Math.min(numPhases, phase)); // Ensure phase is within valid range

      // Distribute tasks across the timeline more evenly
      const dayOffset = Math.floor((i / tasks.length) * totalDays);
      const scheduledDate = new Date(startDate);
      scheduledDate.setDate(startDate.getDate() + dayOffset);

      // Calculate dayNumber within the timeline
      const dayNumber = dayOffset + 1;

      const newTask = new Task({
        user: req.user._id,
        goal: goal._id,
        title: task.title,
        description: task.description,
        type: task.type || "learning",
        category: task.topics?.[0] || "General",
        difficulty: task.difficulty || 3,
        priority: task.priority || "medium",
        estimatedTime: task.estimatedHours || 1,
        isAIGenerated: true,
        topics: task.topics || [],
        resources: enhanceResourcesWithDefaults(task.resources || [], task.topics || []).map(resource => ({
          ...resource,
          type: ['video', 'article', 'documentation', 'project', 'github', 'tutorial', 'course', 'book'].includes(resource.type)
            ? resource.type
            : 'article' // Default fallback for invalid types
        })),
        realWorldApplication: task.realWorldApplication || "",
        successCriteria: task.successCriteria || [],
        scheduledDate,
        phase,
        dayNumber,
        status: "queued", // All new tasks start as queued
        sequenceOrder: i + 1, // Set sequence order
      });

      await newTask.save();
      createdTasks.push(newTask);

      // Log phase distribution for debugging
      if (i < 10 || i % 20 === 0) {
        console.log(`Task ${i + 1}: Phase ${phase}, Day ${dayNumber}, Title: ${task.title.substring(0, 50)}...`);
      }
    }

    // Validate that we actually created tasks
    if (createdTasks.length === 0) {
      throw new Error("No tasks were successfully created in the database");
    }

    // After creating all tasks, assign the first one (GATED SEQUENTIAL SYSTEM)
    if (createdTasks.length > 0) {
      const firstTask = createdTasks[0];
      firstTask.status = 'pending'; // First task should be available immediately
      firstTask.assignedDate = new Date();
      await firstTask.save();
      console.log(`First task assigned: "${firstTask.title}" (Phase ${firstTask.phase})`);
    }

    // Update goal with task generation status - only mark as complete if we have tasks
    goal.tasksGenerated = true;
    goal.isGeneratingTasks = false;
    goal.totalTasksGenerated = createdTasks.length;
    await goal.save();

    // Success response - goal is fully created with tasks
    res.status(201).json({
      success: true,
      message: "Goal created successfully with AI-generated tasks!",
      data: {
        goal: goal.toJSON(),
        tasksGenerated: createdTasks.length,
        totalTasks: createdTasks.length,
        isGeneratingTasks: false,
      },
    });

  } catch (error) {
    console.error("Error in goal creation process:", error);

    // Clean up: If goal was created but task generation failed, delete the goal
    if (goal && goal._id) {
      try {
        // Delete any tasks that might have been created
        await Task.deleteMany({ goal: goal._id });
        // Delete the goal itself
        await Goal.findByIdAndDelete(goal._id);
        console.log("Cleaned up incomplete goal and tasks due to generation failure");
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);
      }
    }

    // Return error response - no goal was created
    throw new ErrorResponse(
      "Goal creation failed. Tasks could not be generated. Please try again.",
      500
    );
  }
});

// Get all goals for the authenticated user
export const getUserGoals = catchAsync(async (req, res) => {
  // Clean up any incomplete goals first
  await cleanupIncompleteGoals(req.user._id);

  // Only return goals that have tasks generated (complete goals)
  const goals = await Goal.find({
    user: req.user._id,
    tasksGenerated: true // Only show goals with successfully generated tasks
  })
    .populate({
      path: "tasks",
      select: "title status scheduledDate",
      options: { sort: { scheduledDate: -1 } },
    })
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: goals,
  });
});

// Get goal by ID with tasks
export const getGoalById = catchAsync(async (req, res) => {
  const goal = await Goal.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).populate({
    path: "tasks",
    options: { sort: { scheduledDate: 1 } },
  });

  if (!goal) {
    throw new ErrorResponse("Goal not found", 404);
  }

  res.json({
    success: true,
    data: goal,
  });
});

// Get tasks for a specific goal
export const getGoalTasks = catchAsync(async (req, res) => {
  const { goalId } = req.params;
  const { date } = req.query;

  // Verify goal belongs to user
  const goal = await Goal.findOne({ _id: goalId, user: req.user._id });
  if (!goal) {
    throw new ErrorResponse("Goal not found", 404);
  }

  let query = { goal: goalId, user: req.user._id };

  // If date is provided, filter by scheduled date
  if (date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    query.scheduledDate = { $gte: startDate, $lte: endDate };
  }

  const tasks = await Task.find(query).sort({ scheduledDate: -1 });

  // Format tasks for frontend compatibility
  const formattedTasks = tasks.map((task) => task.formattedData);

  res.json({
    success: true,
    data: formattedTasks,
  });
});

// Update goal
export const updateGoal = catchAsync(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });

  if (!goal) {
    throw new ErrorResponse("Goal not found", 404);
  }

  // Update allowed fields
  const allowedUpdates = [
    "status",
    "currentPhase",
    "currentDay",
    "description",
  ];
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      goal[field] = req.body[field];
    }
  });

  await goal.save();

  res.json({
    success: true,
    message: "Goal updated successfully",
    data: goal,
  });
});

// Delete goal and all associated tasks with transaction support
export const deleteGoal = catchAsync(async (req, res) => {
  const goalId = req.params.id;
  const userId = req.user._id;

  // Validate goalId format
  if (!goalId.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ErrorResponse("Invalid goal ID format", 400);
  }

  const goal = await Goal.findOne({ _id: goalId, user: userId });

  if (!goal) {
    throw new ErrorResponse("Goal not found", 404);
  }

  try {
    // Count tasks before deletion for logging
    const taskCount = await Task.countDocuments({ goal: goalId, user: userId });

    // Delete all tasks associated with this goal
    const taskDeletionResult = await Task.deleteMany({
      goal: goalId,
      user: userId
    });

    // Update user's activeGoalId if this was the active goal
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(userId);
    if (user && user.activeGoalId && user.activeGoalId.toString() === goalId) {
      // Find another goal to set as active, or set to null
      const otherGoals = await Goal.find({
        user: userId,
        _id: { $ne: goalId }
      }).limit(1);

      const newActiveGoalId = otherGoals.length > 0 ? otherGoals[0]._id : null;
      await User.findByIdAndUpdate(userId, {
        activeGoalId: newActiveGoalId,
        $pull: { goals: goalId }
      });
    } else {
      // Just remove the goal from user's goals array
      await User.findByIdAndUpdate(userId, {
        $pull: { goals: goalId }
      });
    }

    // Delete the goal
    await Goal.findByIdAndDelete(goalId);

    // Deletion completed successfully
    res.json({
      success: true,
      message: "Goal and all associated tasks deleted successfully",
      data: {
        deletedGoalId: goalId,
        goalField: goal.field,
        goalDescription: goal.description,
      },
    });

  } catch (error) {
    console.error("Error during goal deletion:", error);

    throw new ErrorResponse(
      "Failed to delete goal and associated data.",
      500
    );
  }
});

// Set active goal for user
export const setActiveGoal = catchAsync(async (req, res) => {
  const { goalId } = req.params;
  const userId = req.user._id;

  // Validate goalId format
  if (!goalId.match(/^[0-9a-fA-F]{24}$/)) {
    throw new ErrorResponse("Invalid goal ID format", 400);
  }

  // Verify goal belongs to user
  const goal = await Goal.findOne({ _id: goalId, user: userId });
  if (!goal) {
    throw new ErrorResponse("Goal not found", 404);
  }

  // Update user's activeGoalId
  const User = (await import("../models/User.js")).default;
  await User.findByIdAndUpdate(userId, { activeGoalId: goalId });

  res.json({
    success: true,
    message: "Active goal updated successfully",
    data: {
      activeGoalId: goalId,
      goalField: goal.field,
      goalDescription: goal.description,
    },
  });
});

// Clean up incomplete goals (goals without tasks)
export const cleanupIncompleteGoalsEndpoint = catchAsync(async (req, res) => {
  const cleanedCount = await cleanupIncompleteGoals(req.user._id);

  res.json({
    success: true,
    message: `Cleaned up ${cleanedCount} incomplete goals`,
    data: {
      cleanedGoalsCount: cleanedCount
    }
  });
});

// Regenerate AI tasks for an existing goal
export const regenerateGoalTasks = catchAsync(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });

  if (!goal) {
    throw new ErrorResponse("Goal not found", 404);
  }

  // Delete existing tasks for this goal
  await Task.deleteMany({ goal: goal._id });

  // Generate new AI tasks
  try {
    const aiData = await generateTasksForContext({
      userProfile: {
        experienceLevel: goal.userProfile?.experienceLevel || 2,
        timeCommitment: goal.userProfile?.timeCommitment || 3,
        learningStyle: goal.userProfile?.preferredStyle || "balanced",
        motivation: goal.userProfile?.motivation || 3,
      },
      assessment: goal.assessmentData,
      goal: goal.goalSetup,
      roadmap: goal.roadmap?.phases || [],
      currentPhase: goal.currentPhase || 1,
      learningPath: goal.roadmap?.id || "general",
    });

    if (aiData && aiData.tasks) {
      const tasks = aiData.tasks;
      const createdTasks = [];

      // Calculate dates for the entire timeline
      const startDate = new Date();
      const totalDays = goal.timeline * 30;
      const numPhases = goal.roadmap?.phases?.length || 4;

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];

        // Determine phase: prefer AI-provided phase
        let phase = Number(task.phase) || Math.floor((i / tasks.length) * numPhases) + 1;
        phase = Math.max(1, Math.min(numPhases, phase)); // Ensure phase is within valid range

        // Calculate dayNumber within the timeline
        const dayNumber = Math.floor((i / tasks.length) * totalDays) + 1;

        // Distribute tasks across the timeline
        const dayOffset = Math.floor((i / tasks.length) * totalDays);
        const scheduledDate = new Date(startDate);
        scheduledDate.setDate(startDate.getDate() + dayOffset);

        const newTask = new Task({
          user: req.user._id,
          goal: goal._id,
          title: task.title,
          description: task.description,
          type: task.type || "learning",
          category: task.topics?.[0] || "General",
          difficulty: task.difficulty || 3,
          priority: task.priority || "medium",
          estimatedTime: task.estimatedHours || 1,
          isAIGenerated: true,
          topics: task.topics || [],
          resources: enhanceResourcesWithDefaults(task.resources || [], task.topics || []).map(resource => ({
            ...resource,
            type: ['video', 'article', 'documentation', 'project', 'github', 'tutorial', 'course', 'book'].includes(resource.type)
              ? resource.type
              : 'article' // Default fallback for invalid types
          })),
          realWorldApplication: task.realWorldApplication || "",
          successCriteria: task.successCriteria || [],
          scheduledDate,
          phase,
          dayNumber,
          status: "queued", // All new tasks start as queued
          sequenceOrder: i + 1, // Set sequence order
        });

        await newTask.save();
        createdTasks.push(newTask);
      }

      // After creating all tasks, assign the first one
      if (createdTasks.length > 0) {
        const firstTask = createdTasks[0];
        firstTask.status = 'pending';
        firstTask.assignedDate = new Date();
        await firstTask.save();
      }

      // Update goal
      goal.tasksGenerated = true;
      goal.totalTasksGenerated = createdTasks.length;
      await goal.save();

      res.json({
        success: true,
        message: "Tasks regenerated successfully!",
        data: {
          goal: goal.toJSON(),
          tasksGenerated: createdTasks.length,
          totalTasks: createdTasks.length,
        },
      });
    } else {
      throw new Error("AI task generation failed");
    }
  } catch (error) {
    console.error("Error regenerating AI tasks:", error);
    throw new ErrorResponse("Failed to regenerate tasks", 500);
  }
});
