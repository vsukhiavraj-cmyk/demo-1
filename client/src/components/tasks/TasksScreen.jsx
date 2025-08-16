import React, { useState, useEffect, useRef } from "react";
import { CalendarSection } from "./CalendarSection";
import { DailyReportTable } from "./DailyReportTable";
import { useTasks } from "../../contexts/TasksContext";
import { useGoalStore } from "../../store/goalStore.js";
import AnimatedTitle from "../ui/AnimatedTitle.jsx";

const SPOTLIGHT_TEXT = "AI-Enhanced Task Performance Report";

// Import the TaskReportSection from the provided code
export const TaskReportSection = ({ tasks }) => {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [reportView, setReportView] = useState("overview");

  // Typewriter animation state
  const container = useRef();
  const [typed, setTyped] = useState("");
  const [spotlightPos, setSpotlightPos] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [isInView, setIsInView] = useState(false);

  // IntersectionObserver to trigger and reset typewriter
  useEffect(() => {
    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        } else {
          setIsInView(false);
          setTyped("");
          setIsDone(false);
          setSpotlightPos(0);
        }
      },
      { threshold: 0.3 }
    );
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  // Typewriter effect (only when in view)
  useEffect(() => {
    if (!isInView) return;
    if (typed.length < SPOTLIGHT_TEXT.length) {
      const timeout = setTimeout(() => {
        setTyped(SPOTLIGHT_TEXT.slice(0, typed.length + 1));
        setSpotlightPos(typed.length + 1);
      }, 60);
      return () => clearTimeout(timeout);
    } else if (typed.length === SPOTLIGHT_TEXT.length) {
      setIsDone(true);
    }
  }, [typed, isInView]);

  // Enhanced task statistics calculation with fixed efficiency calculation
  const getAdvancedTaskStats = () => {
    const completed = tasks.filter((task) => task.status === "completed");
    const inProgress = tasks.filter((task) => task.status === "in_progress");
    const pending = tasks.filter((task) => task.status === "pending");
    const overdue = tasks.filter((task) => task.status === "overdue");
    const aiGenerated = tasks.filter((task) => task.isAIGenerated);

    const totalEstimatedTime = tasks.reduce(
      (sum, task) => sum + (task.estimatedTime || 0),
      0
    );
    const totalActualTime = completed.reduce(
      (sum, task) => sum + (task.actualTime || 0),
      0
    );

    // Fixed efficiency calculation
    const efficiencyScores = completed
      .filter((task) => task.actualTime && task.actualTime > 0)
      .map((task) => (task.estimatedTime / task.actualTime) * 100);
    const averageEfficiency =
      efficiencyScores.length > 0
        ? efficiencyScores.reduce((sum, score) => sum + score, 0) /
          efficiencyScores.length
        : 0;

    const timeSaved = Math.max(0, totalEstimatedTime - totalActualTime);
    const productivityScore =
      completed.length > 0 ? (completed.length / tasks.length) * 100 : 0;

    // Calculate skill development metrics
    const skillsGained = completed.reduce((skills, task) => {
      if (task.skillsGained) {
        skills.push(...task.skillsGained);
      }
      return skills;
    }, []);
    const uniqueSkills = [...new Set(skillsGained)];

    // Calculate average grade
    const gradesReceived = completed
      .filter((task) => task.grade)
      .map((task) => task.grade);
    const averageGrade =
      gradesReceived.length > 0
        ? gradesReceived.reduce((sum, grade) => sum + grade, 0) /
          gradesReceived.length
        : 0;

    // Calculate category distribution
    const categoryStats = tasks.reduce((acc, task) => {
      acc[task.category] = (acc[task.category] || 0) + 1;
      return acc;
    }, {});

    return {
      total: tasks.length,
      completed: completed.length,
      inProgress: inProgress.length,
      pending: pending.length,
      overdue: overdue.length,
      aiGenerated: aiGenerated.length,
      totalEstimatedTime: Math.round(totalEstimatedTime * 10) / 10,
      totalActualTime: Math.round(totalActualTime * 10) / 10,
      averageEfficiency: Math.round(averageEfficiency),
      timeSaved: Math.round(timeSaved * 10) / 10,
      productivityScore: Math.round(productivityScore),
      skillsGained: uniqueSkills.length,
      completionRate: Math.round(
        (completed.length / Math.max(tasks.length, 1)) * 100
      ),
      averageGrade: Math.round(averageGrade),
      categoryStats,
    };
  };

  const stats = getAdvancedTaskStats();

  const handleExportReport = (format) => {
    const reportData = {
      period: selectedPeriod,
      stats,
      generatedAt: new Date().toISOString(),
      totalTasks: tasks.length,
      aiGeneratedTasks: stats.aiGenerated,
    };
    alert(
      `📊 ${format.toUpperCase()} Performance Report Generated Successfully!`
    );
  };

  // Calculate spotlight position in px (estimate per char)
  const charWidth = 22; // px, adjust for font-size
  const spotlightX = 32 + (spotlightPos - 1) * charWidth;

  // Spotlight mask style
  const maskStyle = !isDone
    ? {
        WebkitMaskImage: `radial-gradient(circle 38px at ${spotlightX}px 50%, white 80%, transparent 100%)`,
        maskImage: `radial-gradient(circle 38px at ${spotlightX}px 50%, white 80%, transparent 100%)`,
        transition: "WebkitMaskImage 0.1s, maskImage 0.1s",
      }
    : {};

  return (
    <div
      ref={container}
      className="bg-mint-100 border border-mint-200 rounded-3xl shadow-2xl dark:bg-white/10 dark:border-white/20 p-8 mb-8"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <AnimatedTitle text={SPOTLIGHT_TEXT} fontSize="48px" fontWeight="900" />
          <p className="text-gray-400 text-sm mt-2">
            📈 Performance metrics for your active goal
          </p>
        </div>
      </div>

      {/* Enhanced Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
        <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 p-6 rounded-2xl border border-blue-400/30 hover:scale-105 transition-transform duration-300">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">📋</span>
            <div className="text-blue-400 font-bold text-lg">Total Tasks</div>
          </div>
          <div className="text-indigo-700 text-3xl font-bold mb-2 dark:text-white">
            {stats.total}
          </div>
          <div className="text-blue-300 text-sm">Across all courses</div>
        </div>
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-6 rounded-2xl border border-purple-400/30 hover:scale-105 transition-transform duration-300">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">🤖</span>
            <div className="text-purple-400 font-bold text-lg">
              AI Generated
            </div>
          </div>
          <div className="text-indigo-700 text-3xl font-bold mb-2 dark:text-white">
            {stats.aiGenerated}
          </div>
          <div className="text-purple-300 text-sm">
            {Math.round((stats.aiGenerated / Math.max(stats.total, 1)) * 100)}%
            of total
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-6 rounded-2xl border border-green-400/30 hover:scale-105 transition-transform duration-300">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">✅</span>
            <div className="text-green-400 font-bold text-lg">
              Completion Rate
            </div>
          </div>
          <div className="text-indigo-700 text-3xl font-bold mb-2 dark:text-white">
            {stats.completionRate}%
          </div>
          <div className="text-green-300 text-sm">
            {stats.completed} of {stats.total} completed
          </div>
        </div>
        <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 p-6 rounded-2xl border border-orange-400/30 hover:scale-105 transition-transform duration-300">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">⚡</span>
            <div className="text-orange-400 font-bold text-lg">
              Efficiency Score
            </div>
          </div>
          <div className="text-indigo-700 text-3xl font-bold mb-2 dark:text-white">
            {stats.averageEfficiency}%
          </div>
          <div className="text-orange-300 text-sm">Average performance</div>
        </div>
        <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 p-6 rounded-2xl border border-yellow-400/30 hover:scale-105 transition-transform duration-300">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">🎓</span>
            <div className="text-yellow-400 font-bold text-lg">
              Average Grade
            </div>
          </div>
          <div className="text-indigo-700 text-3xl font-bold mb-2 dark:text-white">
            {stats.averageGrade}%
          </div>
          <div className="text-yellow-300 text-sm">Academic performance</div>
        </div>
      </div>

      {/* Enhanced Export Options */}
      <div className="flex items-center justify-between bg-gradient-to-r from-indigo-500/20 to-purple-500/20 p-6 rounded-2xl border border-indigo-400/30">
        <div>
          <h3 className="text-white font-bold text-xl mb-2">
            📊 Generate AI-Enhanced Performance Report
          </h3>
          <p className="text-gray-300 text-sm">
            Export your detailed task performance analysis for {tasks.length}{" "}
            tasks
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => handleExportReport("pdf")}
            className="btn-danger btn-lg"
          >
            Export PDF Report
          </button>
          <button
            onClick={() => handleExportReport("excel")}
            className="btn-primary btn-lg"
          >
            Export Excel Report
          </button>
        </div>
      </div>
    </div>
  );
};

export const TasksScreen = ({
  learningData,
  goalData,
  aiTasksData,
  roadmap,
  userProfile,
  onTaskComplete,
}) => {
  const { refreshTasks } = useTasks();
  const { activeGoalId } = useGoalStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [allTasks, setAllTasks] = useState(
    Array.isArray(aiTasksData) ? aiTasksData : []
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Update all tasks when aiTasksData changes
  useEffect(() => {
    setAllTasks(Array.isArray(aiTasksData) ? aiTasksData : []);
  }, [aiTasksData]);

  // Listen for real-time task updates
  useEffect(() => {
    const handleTasksUpdated = async (event) => {
      console.log("[TasksScreen] Received task update event:", event.detail);
      
      // If new tasks were generated or added, refresh the task list
      if (event.detail?.action === "tasksGenerated" || 
          event.detail?.action === "newTasksAdded") {
        
        // Only refresh if it's for the current active goal
        if (event.detail?.goalId === activeGoalId || !event.detail?.goalId) {
          console.log("[TasksScreen] Refreshing tasks due to:", event.detail.action);
          
          try {
            // Refresh tasks from the context
            await refreshTasks(activeGoalId);
            
            // The parent component (TasksPage) should handle updating aiTasksData
            // which will trigger the useEffect above to update allTasks
            
          } catch (error) {
            console.error("[TasksScreen] Error refreshing tasks:", error);
          }
        }
      }
    };

    window.addEventListener("tasksUpdated", handleTasksUpdated);

    return () => {
      window.removeEventListener("tasksUpdated", handleTasksUpdated);
    };
  }, [activeGoalId, refreshTasks]);





  return (
    <div className="bg-[#111111] min-h-full">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Goal Title */}
        {goalData && (
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              {goalData.field}
            </h1>
            <p className="text-gray-400 text-sm">
              {goalData.timeline} months • Phase {learningData?.currentPhase || 1}
            </p>
          </div>
        )}

        {/* Main Vertical Layout */}
        <div className="flex flex-col gap-8">
          {/* Calendar Section - Full Width */}
          <div className="w-full">
            <CalendarSection
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />
          </div>

          {/* Daily Report Table Section - Full Width */}
          <div className="w-full">
            <DailyReportTable
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              aiTasks={allTasks}
              learningData={learningData}
              userProfile={userProfile}
              onTaskComplete={onTaskComplete}
            />
          </div>

          {/* Task Performance Report Section - Full Width */}
          <div className="w-full">
            <TaskReportSection tasks={allTasks} />
          </div>
        </div>
      </div>


    </div>
  );
};
