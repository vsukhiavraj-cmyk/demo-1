import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import cookieParser from "cookie-parser";
import helmet from "helmet";

dotenv.config();

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import routes and middleware
console.log("Loading routes and middleware...");
import apiRoutes from "./routes/index.js";
import errorHandler from "./middleware/errorHandler.js";
import notFound from "./middleware/notFound.js";
import { startTaskScheduler } from "./services/taskScheduler.js";
console.log("✅ All imports loaded successfully");

const app = express();
const PORT = process.env.PORT || 5000;

// Security and CORS Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Allow file downloads
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Environment-specific CORS configuration
const corsOptions = {
  credentials: true,
  optionsSuccessStatus: 200,
};

if (process.env.NODE_ENV === 'production') {
  // Production CORS - only allow specific domains
  corsOptions.origin = [
    process.env.CLIENT_URL,
    process.env.PRODUCTION_DOMAIN
  ].filter(Boolean); // Remove undefined values
} else {
  // Development CORS - allow localhost variants
  corsOptions.origin = [
    process.env.CLIENT_URL || "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:3000" // React default
  ];
}

app.use(cors(corsOptions));

// Body parsing middleware - MUST be before routes
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// Serve uploaded files with authentication (SECURITY FIX)
// Remove the static serving - files will be served through authenticated routes only
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug middleware to log all requests
// app.use((req, res, next) => {
//   console.log(`${req.method} ${req.path}`, req.body);
//   next();
// });

// Mount API routes
app.use("/api", apiRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  const clientBuildPath = path.join(__dirname, "..", "frontend", "dist");
  app.use(express.static(clientBuildPath));

  // Catch-all handler to serve index.html for client-side routing
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(clientBuildPath, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send("API is running in development mode...");
  });
}

// 404 and Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    console.log("Starting server...");
    console.log("Connecting to MongoDB:", process.env.MONGODB_URI ? "URI configured" : "URI missing");
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected successfully.");
    
    // Start the task scheduler for midnight assignments
    console.log("Starting task scheduler...");
    startTaskScheduler();
    console.log("✅ Task scheduler started.");
    
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 Server accessible at: http://localhost:${PORT}`);
      console.log(`📊 API endpoints available at: http://localhost:${PORT}/api`);
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error("❌ Server error:", error.message);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Try a different port.`);
      }
    });

  } catch (error) {
    console.error("❌ Server startup failed:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
};

startServer();

export default app;
