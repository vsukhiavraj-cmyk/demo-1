import mongoose from "mongoose";

const weeklyActivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  weekStart: { type: Date, required: true }, // Start of the week (e.g., Monday)
  days: [
    {
      day: { type: String }, // e.g., 'Mon', 'Tue', ...
      goal: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
    },
  ],
  totalTasks: { type: Number, default: 0 },
  completedTasks: { type: Number, default: 0 },
  avgGoal: { type: Number, default: 0 }, // average goal completion %
  avgCompleted: { type: Number, default: 0 }, // average completed %
  streak: { type: Number, default: 0 }, // days in a row
  bestDay: { type: String }, // day of best performance
  createdAt: { type: Date, default: Date.now },
});

weeklyActivitySchema.index({ user: 1, weekStart: 1 }, { unique: true });

export default mongoose.model("WeeklyActivity", weeklyActivitySchema);
