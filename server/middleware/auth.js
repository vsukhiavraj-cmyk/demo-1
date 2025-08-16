import jwt from "jsonwebtoken";
import User from "../models/User.js";
import catchAsync from "../utils/catchAsync.js";
import ErrorResponse from "../utils/ErrorResponse.js";

// Middleware to protect routes - requires authentication
export const protect = async (req, res, next) => {
  let token;

  // console.log(
  //   "Protect middleware - Authorization header present:",
  //   !!req.headers.authorization
  // ); // DEBUG
  // console.log("Protect middleware - cookies present:", !!req.cookies.token); // DEBUG

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
    // console.log("Token extracted from Authorization header"); // DEBUG
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
    // console.log("Token extracted from cookie"); // DEBUG
  }

  if (!token) {
    // console.log("No token found in request"); // DEBUG
    return next(new ErrorResponse("Not authorized to access this route", 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log("Token verified for user ID:", decoded.id); // DEBUG
    req.user = await User.findById(decoded.id);
    // console.log(
    //   "User authenticated:",
    //   req.user ? req.user.email : "User not found"
    // ); // DEBUG
    next();
  } catch (err) {
    // console.log("Token verification failed:", err.message); // DEBUG
    return next(new ErrorResponse("Not authorized to access this route", 401));
  }
};

// Optional auth middleware - doesn't require authentication but adds user if available
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    // Get token from cookie or Authorization header
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from token
        const user = await User.findById(decoded.id);

        if (user) {
          req.user = user;
        }
      } catch (jwtError) {
        // Token is invalid, but we don't fail the request
        console.warn("Invalid token in optional auth:", jwtError.message);
      }
    }

    next();
  } catch (error) {
    console.error("Optional auth middleware error:", error);
    // Don't fail the request for optional auth errors
    next();
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};
