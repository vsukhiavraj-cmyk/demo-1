import express from "express";
import {
  generateTasksWithAI,
  generateRoadmapWithAI,
} from "../controllers/aiController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// POST /api/ai/generate-tasks - Generate tasks using Gemini AI
router.post("/generate-tasks", protect, generateTasksWithAI);

// POST /api/ai/generate-roadmap - Generate roadmap using Gemini AI
router.post("/generate-roadmap", protect, generateRoadmapWithAI);

export default router;
