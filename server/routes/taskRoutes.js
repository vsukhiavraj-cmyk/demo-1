import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { protect } from "../middleware/auth.js";
import {
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTasksByDate,
} from "../controllers/taskController.js";
import Task from "../models/Task.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename); // Corrected this line

const router = express.Router();

// All routes below require authentication
router.use(protect);

// Import the new gated sequential functions
import {
  getDailyTask,
  requestNextTask,
  getAssignedTasksOnly,
} from "../controllers/taskController.js";
import { assignNextTaskManually } from "../services/taskScheduler.js";

// GET /api/tasks/daily - Get daily task using gated sequential logic
router.get("/daily", async (req, res) => {
  try {
    const { goalId } = req.query;

    if (!goalId) {
      return res.status(400).json({
        success: false,
        message: "Goal ID is required for daily tasks",
      });
    }

    const dailyTasks = await getDailyTask(req.user._id, goalId);
    const formattedTasks = dailyTasks.map((task) => task.formattedData);

    res.json({
      success: true,
      data: formattedTasks,
      totalTasks: formattedTasks.length,
      goalId: goalId,
      isGatedSequential: true,
    });
  } catch (error) {
    console.error("[GET /api/tasks/daily] Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch daily tasks",
      error: error.message,
    });
  }
});

// GET /api/tasks/assigned - Get only assigned tasks (for calendar and dashboard)
router.get("/assigned", async (req, res) => {
  try {
    const { goalId } = req.query;

    if (!goalId) {
      return res.status(400).json({
        success: false,
        message: "Goal ID is required for assigned tasks",
      });
    }

    const assignedTasks = await getAssignedTasksOnly(req.user._id, goalId);
    const formattedTasks = assignedTasks.map((task) => task.formattedData);

    res.json({
      success: true,
      data: formattedTasks,
      totalTasks: formattedTasks.length,
      goalId: goalId,
      onlyAssignedTasks: true,
      message: "Only showing assigned tasks (hiding queued tasks)",
    });
  } catch (error) {
    console.error("[GET /api/tasks/assigned] Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch assigned tasks",
      error: error.message,
    });
  }
});

// POST /api/tasks/request-next - Request next task in sequence
router.post("/request-next", async (req, res) => {
  try {
    const { goalId } = req.body;

    if (!goalId) {
      return res.status(400).json({
        success: false,
        message: "Goal ID is required to request next task",
      });
    }

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Use the new scheduler for manual task assignment
    const nextTasks = await assignNextTaskManually(req.user._id, goalId);
    const formattedTasks = nextTasks.map((task) => task.formattedData);

    res.json({
      success: true,
      data: formattedTasks,
      totalTasks: formattedTasks.length,
      goalId: goalId,
      message:
        formattedTasks.length > 0
          ? "Next task assigned successfully"
          : "No more tasks available",
    });
  } catch (error) {
    console.error("[POST /api/tasks/request-next] Error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// GET /api/tasks - Get all tasks for user OR get tasks by date if date query param exists
router.get("/", async (req, res, next) => {
  if (req.query.date) {
    return getTasksByDate(req, res, next);
  }
  return getTasks(req, res, next);
});

// GET /api/tasks/:id - Get a single task by id
router.get("/:id", getTaskById);

// PUT /api/tasks/:id - Update a task
router.put("/:id", updateTask);

// POST /api/tasks/:id/submit - Submit a task (frontend expects this)
router.post("/:id/submit", updateTask);

// DELETE /api/tasks/:id - Delete a task
router.delete("/:id", deleteTask);

// GET /api/tasks/test-file-access - Test file access functionality (development only)
if (process.env.NODE_ENV !== "production") {
  router.get("/test-file-access", async (req, res) => {
    try {
      const uploadsDir = path.join(__dirname, "../uploads");
      const submissionsDir = path.join(uploadsDir, "submissions");

      // Check directory structure
      const result = {
        uploadsDir: {
          path: uploadsDir,
          exists: fs.existsSync(uploadsDir),
        },
        submissionsDir: {
          path: submissionsDir,
          exists: fs.existsSync(submissionsDir),
        },
        files: [],
      };

      if (fs.existsSync(submissionsDir)) {
        const files = fs.readdirSync(submissionsDir).slice(0, 5); // First 5 files
        result.files = files.map((file) => {
          const filePath = path.join(submissionsDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: stats.size,
            modified: stats.mtime,
            accessible: fs.constants.R_OK,
          };
        });
      }

      res.json({
        success: true,
        message: "File access test completed",
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "File access test failed",
        error: error.message,
      });
    }
  });
}

// Helper function to get MIME type based on file extension
function getMimeType(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  const mimeTypes = {
    pdf: "application/pdf",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    csv: "text/csv",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

// Debug endpoint to check sequential task system
router.get("/debug-sequential-system", protect, async (req, res) => {
  try {
    const { goalId } = req.query;

    if (!goalId) {
      return res.status(400).json({
        success: false,
        message: "Goal ID is required",
      });
    }

    // Get all tasks for this goal
    const allTasks = await Task.find({
      user: req.user._id,
      goal: goalId,
    }).sort({ sequenceOrder: 1 });

    // Categorize tasks
    const queuedTasks = allTasks.filter((t) => t.status === "queued");
    const pendingTasks = allTasks.filter((t) => t.status === "pending");
    const completedTasks = allTasks.filter((t) => t.status === "completed");
    const assignedTasks = allTasks.filter((t) => t.assignedDate);

    res.json({
      success: true,
      data: {
        totalTasks: allTasks.length,
        queuedTasks: queuedTasks.length,
        pendingTasks: pendingTasks.length,
        completedTasks: completedTasks.length,
        assignedTasks: assignedTasks.length,
        taskBreakdown: {
          queued: queuedTasks.map((t) => ({
            id: t._id,
            title: t.title,
            sequenceOrder: t.sequenceOrder,
            status: t.status,
            assignedDate: t.assignedDate,
          })),
          pending: pendingTasks.map((t) => ({
            id: t._id,
            title: t.title,
            sequenceOrder: t.sequenceOrder,
            status: t.status,
            assignedDate: t.assignedDate,
          })),
          completed: completedTasks.map((t) => ({
            id: t._id,
            title: t.title,
            sequenceOrder: t.sequenceOrder,
            status: t.status,
            assignedDate: t.assignedDate,
          })),
        },
      },
    });
  } catch (error) {
    console.error("Error analyzing sequential system:", error);
    res.status(500).json({
      success: false,
      message: "Failed to analyze sequential system",
      error: error.message,
    });
  }
});

// Debug endpoint to check task-goal relationships
router.get("/debug-goal-relationships", protect, async (req, res) => {
  try {
    const { Goal } = await import("../models/Goal.js");

    // Get all tasks for this user
    const allTasks = await Task.find({ user: req.user._id });

    // Get all goals for this user
    const allGoals = await Goal.find({ user: req.user._id });

    // Analyze task-goal relationships
    const tasksWithGoal = allTasks.filter((task) => task.goal);
    const tasksWithoutGoal = allTasks.filter((task) => !task.goal);

    const goalStats = {};
    allGoals.forEach((goal) => {
      const goalTasks = allTasks.filter(
        (task) => task.goal && task.goal.toString() === goal._id.toString()
      );
      goalStats[goal._id] = {
        goalName: goal.field,
        taskCount: goalTasks.length,
        tasks: goalTasks.map((t) => ({
          id: t._id,
          name: t.title,
          status: t.status,
        })),
      };
    });

    res.json({
      success: true,
      data: {
        totalTasks: allTasks.length,
        totalGoals: allGoals.length,
        tasksWithGoal: tasksWithGoal.length,
        tasksWithoutGoal: tasksWithoutGoal.length,
        goalStats,
        orphanTasks: tasksWithoutGoal.map((t) => ({
          id: t._id,
          name: t.title,
          status: t.status,
        })),
      },
    });
  } catch (error) {
    console.error("Error analyzing task-goal relationships:", error);
    res.status(500).json({
      success: false,
      message: "Failed to analyze task-goal relationships",
      error: error.message,
    });
  }
});

// Import migration utilities
import {
  migrateTasksToSequential,
  migrateAllUserTasks,
  validateSequentialIntegrity,
} from "../utils/taskSequenceMigration.js";

// Utility endpoint to initialize existing tasks with sequence orders
router.post("/initialize-sequences", protect, async (req, res) => {
  try {
    const { goalId } = req.body;

    if (!goalId) {
      return res.status(400).json({
        success: false,
        message: "Goal ID is required",
      });
    }

    const result = await migrateTasksToSequential(req.user._id, goalId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        migratedCount: result.migratedCount,
        goalId,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error initializing task sequences:", error);
    res.status(500).json({
      success: false,
      message: "Failed to initialize task sequences",
      error: error.message,
    });
  }
});

// Migrate all tasks for the current user
router.post("/migrate-all-sequences", protect, async (req, res) => {
  try {
    const result = await migrateAllUserTasks(req.user._id);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        migratedGoals: result.migratedGoals,
        totalMigratedTasks: result.totalMigratedTasks,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error migrating all task sequences:", error);
    res.status(500).json({
      success: false,
      message: "Failed to migrate all task sequences",
      error: error.message,
    });
  }
});

// Validate sequential integrity for a goal
router.get("/validate-sequences/:goalId", protect, async (req, res) => {
  try {
    const { goalId } = req.params;

    const result = await validateSequentialIntegrity(req.user._id, goalId);

    res.json({
      success: result.success,
      validation: result,
      goalId,
    });
  } catch (error) {
    console.error("Error validating task sequences:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate task sequences",
      error: error.message,
    });
  }
});

// Utility endpoint to fix invalid resource types
router.post("/fix-resource-types", protect, async (req, res) => {
  try {
    // Find all tasks with invalid resource types for this user
    const tasksWithInvalidResources = await Task.find({
      user: req.user._id,
      "resources.type": {
        $nin: [
          "video",
          "article",
          "documentation",
          "project",
          "github",
          "tutorial",
          "course",
          "book",
        ],
      },
    });

    let fixedCount = 0;
    for (const task of tasksWithInvalidResources) {
      let hasChanges = false;

      // Fix each resource
      task.resources = task.resources.map((resource) => {
        const validTypes = [
          "video",
          "article",
          "documentation",
          "project",
          "github",
          "tutorial",
          "course",
          "book",
        ];

        if (!validTypes.includes(resource.type)) {
          console.log(
            `Fixing resource type "${resource.type}" -> "article" for task: ${task.title}`
          );
          resource.type = "article"; // Default to article
          hasChanges = true;
        }

        return resource;
      });

      if (hasChanges) {
        await task.save();
        fixedCount++;
      }
    }

    res.json({
      success: true,
      message: `Fixed ${fixedCount} tasks with invalid resource types`,
      fixedCount,
    });
  } catch (error) {
    console.error("Error fixing resource types:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fix resource types",
      error: error.message,
    });
  }
});

// Test endpoint to create a task with sample resources
router.post("/create-test-task", protect, async (req, res) => {
  try {
    // Get user's first goal or create a dummy one
    const { Goal } = await import("../models/Goal.js");
    let goal = await Goal.findOne({ user: req.user._id });

    if (!goal) {
      goal = new Goal({
        user: req.user._id,
        field: "Test Goal",
        description: "Test goal for resource display",
        timeline: 30,
      });
      await goal.save();
    }

    const testTask = new Task({
      user: req.user._id,
      goal: goal._id,
      title: "Test Task with Resources",
      description:
        "This is a test task to verify resource display functionality. Click 'Details' to see the resources section.",
      type: "learning",
      category: "Testing",
      difficulty: 3,
      priority: "medium",
      estimatedTime: 1,
      status: "pending",
      isAIGenerated: true,
      topics: ["React", "JavaScript", "Testing"],
      resources: [
        {
          type: "documentation",
          title: "React Official Documentation",
          url: "https://reactjs.org/docs/getting-started.html",
        },
        {
          type: "video",
          title: "React Tutorial for Beginners",
          url: "https://www.youtube.com/watch?v=Ke90Tje7VS0",
        },
        {
          type: "article",
          title: "Modern React Best Practices",
          url: "https://blog.logrocket.com/modern-react-best-practices/",
        },
        {
          type: "project",
          title: "React Examples Repository",
          url: "https://github.com/facebook/react",
        },
      ],
      realWorldApplication:
        "Building modern web applications with React components and hooks",
      successCriteria: [
        "Understand React components and JSX",
        "Create a simple React application",
        "Use React hooks effectively",
        "Implement component state management",
      ],
      scheduledDate: new Date(),
      phase: 1,
      sequenceOrder: 1,
      assignedDate: new Date(),
    });

    await testTask.save();

    res.json({
      success: true,
      message:
        "Test task created successfully! Check your daily tasks and click 'Details' to see resources.",
      task: testTask.formattedData,
    });
  } catch (error) {
    console.error("Error creating test task:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create test task",
      error: error.message,
    });
  }
});
export default router;
