import express from "express";
import ChatController from "../controllers/chatController.js";

const router = express.Router();

// POST /api/chat - Process chat message
router.post("/", ChatController.processChat);

// GET /api/chat/suggestions - Get chat suggestions
router.get("/suggestions", ChatController.getSuggestions);

// GET /api/chat/history/:userId - Get chat history
router.get("/history/:userId", ChatController.getChatHistory);

export default router;
