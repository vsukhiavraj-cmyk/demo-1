import Goal from "../models/Goal.js";
import Task from "../models/Task.js";
import {
  generateRoadmapForContext,
  generateTasksForContext,
} from "./aiController.js";
import catchAsync from "../utils/catchAsync.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import { enhanceResourcesWithDefaults } from "../utils/resourceValidator.js";
import { calculateTaskRequirements } from "../utils/taskCalculations.js";

// (cleanupIncompleteGoals function remains the same)
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
        { totalTasksGenerated: { $exists: false } },
      ],
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
    userProfile,
    assessmentData,
    goalSetup,
  } = req.body;

  const validTimeline = Math.max(1, Math.min(24, Number(timeline) || 1));

  let goal = null; // Define goal here to be accessible in the catch block

  try {
    // --- STEP 1: Generate the Personalized Roadmap ---
    const roadmapContext = {
      userProfile,
      learningPath: goalSetup.learningPath,
      timeframe: validTimeline,
      customGoal: goalSetup.customGoal,
      motivation: goalSetup.motivation,
    };
    const generatedRoadmap = await generateRoadmapForContext(roadmapContext);

    if (
      !generatedRoadmap ||
      !generatedRoadmap.phases ||
      !generatedRoadmap.personalizedSchedule
    ) {
      throw new ErrorResponse("AI failed to generate a valid roadmap.", 500);
    }

    // --- STEP 2: Use the Roadmap to Generate Tasks ---
    const goalDataForTasks = {
      user: req.user._id,
      field,
      description,
      timeline: validTimeline,
      personalNeeds,
      userProfile,
      assessmentData,
      goalSetup,
      roadmap: generatedRoadmap, // Use the newly generated roadmap
    };

    const taskRequirements = calculateTaskRequirements(
      validTimeline,
      userProfile
    );
    const { totalDays } = taskRequirements;

    const taskContext = { ...goalDataForTasks, totalDays };
    const aiTaskData = await generateTasksForContext(taskContext);

    if (!aiTaskData || !aiTaskData.tasks || aiTaskData.tasks.length === 0) {
      throw new ErrorResponse(
        "AI failed to generate any tasks for the roadmap.",
        500
      );
    }

    // --- STEP 3: Save Everything to the Database ---
    goal = new Goal(goalDataForTasks);
    goal.isGeneratingTasks = true; // Mark as in-progress
    await goal.save();

    const createdTasks = [];
    const tasksToCreate = aiTaskData.tasks;
    const startDate = new Date();
    const numPhases = goal.roadmap?.phases?.length || 4;

    for (let i = 0; i < tasksToCreate.length; i++) {
      const task = tasksToCreate[i];
      const dayOffset = Math.floor((i / tasksToCreate.length) * totalDays);
      const scheduledDate = new Date(startDate);
      scheduledDate.setDate(startDate.getDate() + dayOffset);

      const estimatedTime =
        parseFloat(String(task.estimatedTime).split(" ")[0]) || 1;

      const newTask = new Task({
        user: req.user._id,
        goal: goal._id,
        title: task.title,
        description: task.description,
        type: task.type || "learning",
        category: task.topics?.[0] || "General",
        difficulty: task.difficulty || 3,
        priority: task.priority || "medium",
        estimatedTime,
        isAIGenerated: true,
        topics: task.topics || [],
        resources: enhanceResourcesWithDefaults(task.resources, task.topics),
        realWorldApplication: task.realWorldApplication || "",
        successCriteria: task.successCriteria || [],
        scheduledDate,
        phase:
          Number(task.phase) ||
          Math.floor((i / tasksToCreate.length) * numPhases) + 1,
        status: "queued",
        sequenceOrder: i + 1,
      });
      await newTask.save();
      createdTasks.push(newTask);
    }

    if (createdTasks.length > 0) {
      const firstTask = createdTasks[0];
      firstTask.status = "pending";
      firstTask.assignedDate = new Date();
      await firstTask.save();
    }

    // Finalize goal creation
    goal.tasksGenerated = true;
    goal.isGeneratingTasks = false;
    goal.totalTasksGenerated = createdTasks.length;
    await goal.save();

    res.status(201).json({
      success: true,
      message: "Goal and tasks created successfully!",
      data: {
        goal: goal.toJSON(),
        tasksGenerated: createdTasks.length,
      },
    });
  } catch (error) {
    console.error("Error in goal creation process:", error);
    // If the goal was partially saved before an error, clean it up.
    if (goal && goal._id) {
      await Task.deleteMany({ goal: goal._id });
      await Goal.findByIdAndDelete(goal._id);
    }
    // Forward the specific error from the AI or processing steps
    throw new ErrorResponse(
      error.message || "Failed to create goal with AI tasks. Please try again.",
      500
    );
  }
});

// (The rest of the file remains the same)
// Get all goals for the authenticated user
export const getUserGoals = catchAsync(async (req, res) => {
  // Clean up any incomplete goals first
  await cleanupIncompleteGoals(req.user._id);

  // Only return goals that have tasks generated (complete goals)
  const goals = await Goal.find({
    user: req.user._id,
    tasksGenerated: true, // Only show goals with successfully generated tasks
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
      user: userId,
    });

    // Update user's activeGoalId if this was the active goal
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(userId);
    if (user && user.activeGoalId && user.activeGoalId.toString() === goalId) {
      // Find another goal to set as active, or set to null
      const otherGoals = await Goal.find({
        user: userId,
        _id: { $ne: goalId },
      }).limit(1);

      const newActiveGoalId = otherGoals.length > 0 ? otherGoals[0]._id : null;
      await User.findByIdAndUpdate(userId, {
        activeGoalId: newActiveGoalId,
        $pull: { goals: goalId },
      });
    } else {
      // Just remove the goal from user's goals array
      await User.findByIdAndUpdate(userId, {
        $pull: { goals: goalId },
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

    throw new ErrorResponse("Failed to delete goal and associated data.", 500);
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
      cleanedGoalsCount: cleanedCount,
    },
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
        let phase =
          Number(task.phase) || Math.floor((i / tasks.length) * numPhases) + 1;
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
          resources: enhanceResourcesWithDefaults(
            task.resources || [],
            task.topics || []
          ).map((resource) => ({
            ...resource,
            type: [
              "video",
              "article",
              "documentation",
              "project",
              "github",
              "tutorial",
              "course",
              "book",
            ].includes(resource.type)
              ? resource.type
              : "article", // Default fallback for invalid types
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
        firstTask.status = "pending";
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
