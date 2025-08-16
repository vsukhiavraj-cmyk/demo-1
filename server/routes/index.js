import express from "express";
import authRoutes from "./authRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import taskRoutes from "./taskRoutes.js";
import goalRoutes from "./goalRoutes.js";
import learningRoutes from "./learningRoutes.js";
import achieverRoutes from "./achieverRoutes.js";
import testimonialRoutes from "./testimonialRoutes.js";
import aiRoutes from "./aiRoutes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/tasks", taskRoutes);
router.use("/goals", goalRoutes);
router.use("/learning", learningRoutes);
router.use("/achievers", achieverRoutes);
router.use("/testimonials", testimonialRoutes);
router.use("/ai", aiRoutes);

//
// Simple health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "API is healthy" });
});

export default router;
