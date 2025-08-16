import express from "express";
import { protect } from "../middleware/auth.js";
import {
  getDashboardData,
  getStatusHistory,
  getCalendarDailyStats,
} from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/", protect, getDashboardData);
router.get("/status-history", protect, getStatusHistory);
router.get("/calendar-daily-stats", protect, getCalendarDailyStats);

export default router;
