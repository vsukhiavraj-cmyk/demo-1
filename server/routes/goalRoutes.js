import express from "express";
import { protect } from "../middleware/auth.js";
import {
  createGoalWithTasks,
  getUserGoals,
  getGoalById,
  getGoalTasks,
  updateGoal,
  deleteGoal,
  setActiveGoal,
  regenerateGoalTasks,
  cleanupIncompleteGoalsEndpoint,
} from "../controllers/goalController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// POST /api/goals/create - Create new goal with AI-generated tasks (enhanced with personalNeeds)
router.post("/create", createGoalWithTasks);

// POST /api/goals - Create new goal with AI-generated tasks (legacy endpoint)
router.post("/", createGoalWithTasks);

// GET /api/goals - Get all goals for the user
router.get("/", getUserGoals);

// GET /api/goals/:id - Get goal by ID with tasks
router.get("/:id", getGoalById);

// GET /api/goals/:goalId/tasks - Get tasks for a specific goal
router.get("/:goalId/tasks", getGoalTasks);

// PUT /api/goals/:id - Update goal
router.put("/:id", updateGoal);

// PUT /api/goals/:goalId/active - Set active goal for user
router.put("/:goalId/active", setActiveGoal);

// DELETE /api/goals/:id - Delete goal and all associated tasks
router.delete("/:id", deleteGoal);

// POST /api/goals/:id/regenerate-tasks - Regenerate AI tasks for a goal
router.post("/:id/regenerate-tasks", regenerateGoalTasks);

// POST /api/goals/cleanup - Clean up incomplete goals
router.post("/cleanup", cleanupIncompleteGoalsEndpoint);

export default router;
