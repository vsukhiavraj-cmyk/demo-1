import express from "express";
import {
  signup,
  login,
  logout,
  getProfile,
  updateDetails,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// POST /api/auth/signup - Register new user
router.post("/signup", signup);

// POST /api/auth/login - Login user
router.post("/login", login);

// POST /api/auth/logout - Logout user
router.post("/logout", logout);

// GET /api/auth/profile - Get current user profile (protected route)
router.get("/me", protect, getProfile);

// POST /api/auth/change-password - Change password (protected route)
router.put("/change-password", protect, changePassword);

// POST /api/auth/forgotpassword - Forgot password
router.post("/forgot-password", forgotPassword);

// PUT /api/auth/resetpassword/:resettoken - Reset password
router.put("/reset-password/:resettoken", resetPassword);

// PUT /api/auth/updatedetails - Update user details
router.put("/update-details", protect, updateDetails);

export default router;
