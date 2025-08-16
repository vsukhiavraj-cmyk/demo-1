import Goal from "../models/Goal.js";
import Task from "../models/Task.js";
import catchAsync from "../utils/catchAsync.js";
import ErrorResponse from "../utils/ErrorResponse.js";

// Get learning phases for a specific goal or all goals
export const getLearningPhases = catchAsync(async (req, res) => {
  const { goalId } = req.query;
  const userId = req.user._id;

  let query = { user: userId };
  
  // Filter by goalId if provided
  if (goalId) {
    // Validate goalId format
    if (!goalId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid goal ID format",
      });
    }
    query._id = goalId;
  }

  // Fetch goals with their roadmap phases
  const goals = await Goal.find(query);

  if (goalId && goals.length === 0) {
    throw new ErrorResponse("Goal not found", 404);
  }

  if (goals.length === 0) {
    // No goals found, return empty response
    return res.json({
      success: true,
      data: [],
      totalPhases: 0,
      filteredByGoal: !!goalId,
      goalId: goalId || null,
    });
  }

  // Process each goal to extract learning phases with progress
  const learningPhases = [];

  for (const goal of goals) {
    if (!goal.roadmap || !goal.roadmap.phases) {
      continue;
    }

    // Get tasks for this goal to calculate phase progress
    const goalTasks = await Task.find({ 
      goal: goal._id, 
      user: userId 
    });

    // Process each phase
    for (let i = 0; i < goal.roadmap.phases.length; i++) {
      const phase = goal.roadmap.phases[i];
      const phaseNumber = i + 1;

      // Get tasks for this phase
      const phaseTasks = goalTasks.filter(task => task.phase === phaseNumber);
      const completedTasks = phaseTasks.filter(task => task.status === 'completed');
      
      // Calculate progress
      const totalTasks = phaseTasks.length;
      const completedCount = completedTasks.length;
      const progressPercentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
      
      // Determine phase status
      let status = 'not_started';
      if (phaseNumber < goal.currentPhase) {
        status = 'completed';
      } else if (phaseNumber === goal.currentPhase) {
        status = progressPercentage === 100 ? 'completed' : 'in_progress';
      } else {
        status = 'not_started';
      }

      learningPhases.push({
        goalId: goal._id,
        goalField: goal.field,
        goalDescription: goal.description,
        phaseNumber,
        title: phase.title || phase.name || `Phase ${phaseNumber}`,
        description: phase.description || '',
        duration: phase.duration || 0,
        topics: phase.topics || [],
        projects: phase.projects || [],
        learningObjectives: phase.learningObjectives || [],
        successCriteria: phase.successCriteria || [],
        resources: phase.resources || [],
        status,
        progress: {
          totalTasks,
          completedTasks: completedCount,
          progressPercentage,
        },
        isCurrentPhase: phaseNumber === goal.currentPhase,
        estimatedStartDate: calculatePhaseStartDate(goal, phaseNumber),
        estimatedEndDate: calculatePhaseEndDate(goal, phaseNumber),
      });
    }
  }

  // Sort phases by goal and phase number
  learningPhases.sort((a, b) => {
    if (a.goalId.toString() !== b.goalId.toString()) {
      return a.goalId.toString().localeCompare(b.goalId.toString());
    }
    return a.phaseNumber - b.phaseNumber;
  });

  res.json({
    success: true,
    data: learningPhases,
    totalPhases: learningPhases.length,
    filteredByGoal: !!goalId,
    goalId: goalId || null,
  });
});

// Helper function to calculate phase start date
function calculatePhaseStartDate(goal, phaseNumber) {
  if (!goal.createdAt || !goal.roadmap || !goal.roadmap.phases) {
    return null;
  }

  const goalStartDate = new Date(goal.createdAt);
  let daysOffset = 0;

  // Calculate cumulative duration of previous phases
  for (let i = 0; i < phaseNumber - 1; i++) {
    const phase = goal.roadmap.phases[i];
    const phaseDuration = phase.duration || 1; // Default to 1 month if not specified
    daysOffset += phaseDuration * 30; // Convert months to days
  }

  const phaseStartDate = new Date(goalStartDate);
  phaseStartDate.setDate(goalStartDate.getDate() + daysOffset);
  return phaseStartDate;
}

// Helper function to calculate phase end date
function calculatePhaseEndDate(goal, phaseNumber) {
  if (!goal.createdAt || !goal.roadmap || !goal.roadmap.phases) {
    return null;
  }

  const phaseStartDate = calculatePhaseStartDate(goal, phaseNumber);
  if (!phaseStartDate) {
    return null;
  }

  const currentPhase = goal.roadmap.phases[phaseNumber - 1];
  const phaseDuration = currentPhase.duration || 1; // Default to 1 month if not specified
  
  const phaseEndDate = new Date(phaseStartDate);
  phaseEndDate.setDate(phaseStartDate.getDate() + (phaseDuration * 30));
  return phaseEndDate;
}

// Get learning progress summary
export const getLearningProgress = catchAsync(async (req, res) => {
  const { goalId } = req.query;
  const userId = req.user._id;

  let query = { user: userId };
  
  if (goalId) {
    // Validate goalId format
    if (!goalId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid goal ID format",
      });
    }
    query._id = goalId;
  }

  const goals = await Goal.find(query);

  if (goalId && goals.length === 0) {
    throw new ErrorResponse("Goal not found", 404);
  }

  if (goals.length === 0) {
    // No goals found, return empty response
    return res.json({
      success: true,
      data: [],
      filteredByGoal: !!goalId,
      goalId: goalId || null,
    });
  }

  const progressSummary = [];

  for (const goal of goals) {
    // Get all tasks for this goal
    const goalTasks = await Task.find({ 
      goal: goal._id, 
      user: userId 
    });

    const totalTasks = goalTasks.length;
    const completedTasks = goalTasks.filter(task => task.status === 'completed').length;
    const inProgressTasks = goalTasks.filter(task => task.status === 'in-progress').length;
    const pendingTasks = goalTasks.filter(task => task.status === 'pending').length;

    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Calculate phase progress manually since we're using lean()
    let phaseProgress = { progress: 0, currentPhase: 1, totalPhases: 0, isCompleted: false };
    if (goal.roadmap && goal.roadmap.phases) {
      const totalPhases = goal.roadmap.phases.length;
      const currentPhase = goal.currentPhase || 1;
      const progress = totalPhases > 0 ? Math.round(((currentPhase - 1) / totalPhases) * 100) : 0;
      
      phaseProgress = {
        progress,
        currentPhase,
        totalPhases,
        isCompleted: currentPhase > totalPhases,
      };
    }

    progressSummary.push({
      goalId: goal._id,
      goalField: goal.field,
      goalDescription: goal.description,
      timeline: goal.timeline,
      overallProgress,
      phaseProgress: phaseProgress.progress,
      currentPhase: phaseProgress.currentPhase,
      totalPhases: phaseProgress.totalPhases,
      isCompleted: phaseProgress.isCompleted,
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        pending: pendingTasks,
      },
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
    });
  }

  res.json({
    success: true,
    data: progressSummary,
    filteredByGoal: !!goalId,
    goalId: goalId || null,
  });
});