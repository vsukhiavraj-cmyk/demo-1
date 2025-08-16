import express from "express";
import AchieverController from "../controllers/achieverController.js";

const router = express.Router();

// GET /api/achievers - Get all achievers
router.get("/", AchieverController.getAllAchievers);

// GET /api/achievers/:id - Get achiever by ID
router.get("/:id", AchieverController.getAchieverById);

// GET /api/achievers/field/:field - Get achievers by field
router.get("/field/:field", AchieverController.getAchieversByField);

// POST /api/achievers - Create new achiever
router.post("/", AchieverController.createAchiever);

export default router;
