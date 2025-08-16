import express from "express";
import VoiceController from "../controllers/voiceController.js";

const router = express.Router();

// GET /api/voice/status - Get voice service status
router.get("/status", VoiceController.getVoiceStatus);

// POST /api/voice/process - Process voice input
router.post("/process", VoiceController.processVoice);

// POST /api/voice/test - Test voice service
router.post("/test", VoiceController.testVoice);

export default router;
