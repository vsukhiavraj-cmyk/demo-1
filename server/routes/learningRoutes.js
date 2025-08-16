import express from "express";
import { protect } from "../middleware/auth.js";
import {
  getLearningPhases,
  getLearningProgress,
} from "../controllers/learningController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/learning/phases - Get learning phases with optional goal filtering
router.get("/phases", getLearningPhases);

// GET /api/learning/progress - Get learning progress summary with optional goal filtering
router.get("/progress", getLearningProgress);

export default router;