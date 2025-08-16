import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    goal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal",
      required: true,
    },
    // Task details
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["learning", "practice", "project", "review"],
      default: "learning",
    },
    category: {
      type: String,
      default: "General",
      trim: true,
    },
    difficulty: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    estimatedTime: {
      type: Number, // in hours
      default: 1,
    },
    status: {
      type: String,
      enum: ["queued", "pending", "in_progress", "completed", "cancelled"],
      default: "queued",
    },
    // Gated Sequential Task System fields
    sequenceOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    assignedDate: {
      type: Date,
      default: null,
    },
    // AI-specific fields
    isAIGenerated: {
      type: Boolean,
      default: false,
    },
    topics: [
      {
        type: String,
        trim: true,
      },
    ],
    resources: [
      {
        type: {
          type: String,
          enum: ["video", "article", "documentation", "project", "github", "tutorial", "course", "book"],
        },
        title: String,
        url: String,
        description: String,
      },
    ],
    realWorldApplication: {
      type: String,
      trim: true,
    },
    successCriteria: [
      {
        type: String,
        trim: true,
      },
    ],
    // Task scheduling
    scheduledDate: {
      type: Date,
      required: false, // Not required for queued tasks
    },
    phase: {
      type: Number,
      default: 1,
    },
    // Submission data
    submissionType: {
      type: String,
      enum: ["pdf", "excel", "link", "text", "none"],
    },
    submissionFile: {
      type: String, // localStorage key for client-side stored files
    },
    submissionText: {
      type: String,
    },
    submissionLink: {
      type: String,
    },
    submittedAt: {
      type: Date,
    },
    actualTime: {
      type: Number, // actual time spent in hours
    },
    // Legacy data field for backward compatibility
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
TaskSchema.index({ user: 1, goal: 1 });
TaskSchema.index({ user: 1, scheduledDate: 1 });
TaskSchema.index({ user: 1, status: 1 });
TaskSchema.index({ goal: 1, scheduledDate: 1 });
// Gated Sequential Task System indexes
TaskSchema.index({ user: 1, goal: 1, status: 1, sequenceOrder: 1 });
TaskSchema.index({ goal: 1, status: 1, sequenceOrder: 1 });

// Virtual for formatted task data (for backward compatibility)
TaskSchema.virtual("formattedData").get(function () {
  return {
    id: this._id,
    name: this.title,
    title: this.title,
    description: this.description,
    status: this.status,
    priority: this.priority,
    notes: this.description,
    estimatedTime: this.estimatedTime,
    completionTime: this.actualTime,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    submissionType: this.submissionType,
    submissionFile: this.submissionFile,
    actualTime: this.actualTime,
    submittedAt: this.submittedAt,
    category: this.category,
    isAIGenerated: this.isAIGenerated,
    // Include AI-specific fields at root level for easier access
    topics: this.topics,
    resources: this.resources,
    realWorldApplication: this.realWorldApplication,
    successCriteria: this.successCriteria,
    phase: this.phase,
    sequenceOrder: this.sequenceOrder,
    assignedDate: this.assignedDate,
    goal: this.goal,
    data: {
      ...this.data,
      title: this.title,
      description: this.description,
      type: this.type,
      category: this.category,
      difficulty: this.difficulty,
      priority: this.priority,
      estimatedTime: this.estimatedTime,
      status: this.status,
      isAIGenerated: this.isAIGenerated,
      topics: this.topics,
      resources: this.resources,
      realWorldApplication: this.realWorldApplication,
      successCriteria: this.successCriteria,
      scheduledDate: this.scheduledDate,
      phase: this.phase,
      sequenceOrder: this.sequenceOrder,
      assignedDate: this.assignedDate,
      submissionType: this.submissionType,
      submissionFile: this.submissionFile,
      submissionText: this.submissionText,
      submissionLink: this.submissionLink,
      submittedAt: this.submittedAt,
      actualTime: this.actualTime,
    },
  };
});

// Ensure virtuals are included when converting to JSON
TaskSchema.set("toJSON", { virtuals: true });
TaskSchema.set("toObject", { virtuals: true });

const Task = mongoose.model("Task", TaskSchema);
export default Task;
