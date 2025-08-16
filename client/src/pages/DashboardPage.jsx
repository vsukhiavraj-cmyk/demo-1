import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useLayoutEffect,
} from "react";
import { getDashboardData } from "../services/api.js";
import { useTasks } from "../contexts/TasksContext.jsx";
import { useGoalStore } from "../store/goalStore.js";
import { useAppStore } from "../store/appStore.js";
import { useDashboardStore } from "../store/dashboardStore.js";
import SummaryCard from "../components/dashboard/SummaryCard.jsx";
import { WeeklyBarChart } from "../components/dashboard/WeeklyBarChart.jsx";
import WeeklyPieChart from "../components/dashboard/WeeklyPieChart.jsx";
import { StatusHistoryChart } from "../components/dashboard/StatusHistoryChart.jsx";
import GoalSelector from "../components/ui/GoalSelector.jsx";
import NoGoalsGuard from "../components/ui/NoGoalsGuard.jsx";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import AnimatedTitle from "../components/ui/AnimatedTitle.jsx";
gsap.registerPlugin(ScrollTrigger);

// Animated Title Components
const StatusHistoryTitle = () => {
  return (
    <AnimatedTitle
      text="Status History"
      fontSize="48px"
      fontWeight="900"
      className="mb-4 text-center"
    />
  );
};

const YourStatisticsTitle = () => {
  return (
    <AnimatedTitle
      text="Your Statistics"
      fontSize="48px"
      fontWeight="900"
      className="mb-4 text-center"
    />
  );
};

export default function DashboardPage() {
  const { tasks: contextTasks, refreshTasks } = useTasks();
  const { activeGoalId, hasGoals, getActiveGoal } = useGoalStore();
  const { setCurrentPage } = useAppStore();
  const { data: dashboardData, fetchDashboardData, isLoading: dashboardLoading } = useDashboardStore();
  
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set current page for app store
  useEffect(() => {
    setCurrentPage('dashboard');
    // Scroll to top when dashboard page loads - immediate and reliable
    window.scrollTo(0, 0);
    // Then smooth scroll to ensure it's at the top
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  }, [setCurrentPage]);

  // Fetch dashboard data based on active goal
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Use goal-aware dashboard data fetching
        const data = await fetchDashboardData(activeGoalId);
        if (data) {
          setTasks(data.tasks || []);
          setSummary(data.summary || null);
        } else {
          // Fallback to original API if store method fails
          const { tasks, summary } = await getDashboardData();
          setTasks(tasks || []);
          setSummary(summary || null);
        }
        setError(null);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    // Only fetch data if we have goals
    if (hasGoals()) {
      fetchData();
    } else {
      setLoading(false);
    }

    // Listen for real-time task updates
    const handleTasksUpdated = async () => {
      console.log("Dashboard: Tasks updated, refreshing dashboard data...");
      try {
        if (hasGoals()) {
          const data = await fetchDashboardData(activeGoalId);
          if (data) {
            setTasks(data.tasks || []);
            setSummary(data.summary || null);
          }
        }
        setError(null);
      } catch (err) {
        console.error("Failed to refresh dashboard data:", err);
      }
    };

    // Listen for goal changes
    const handleGoalChanged = async (event) => {
      console.log("Dashboard: Goal changed, refreshing data...");
      const { activeGoalId: newGoalId } = event.detail;
      try {
        const data = await fetchDashboardData(newGoalId);
        if (data) {
          setTasks(data.tasks || []);
          setSummary(data.summary || null);
        }
        setError(null);
      } catch (err) {
        console.error("Failed to refresh dashboard data after goal change:", err);
      }
    };

    window.addEventListener("tasksUpdated", handleTasksUpdated);
    window.addEventListener("goalChanged", handleGoalChanged);

    return () => {
      window.removeEventListener("tasksUpdated", handleTasksUpdated);
      window.removeEventListener("goalChanged", handleGoalChanged);
    };
  }, [activeGoalId, hasGoals, fetchDashboardData]);

  const barChartData = useMemo(() => {
    if (!summary?.days || summary.days.length === 0) {
      return [
        { day: "Mon", goal: 0, completed: 0 },
        { day: "Tue", goal: 0, completed: 0 },
        { day: "Wed", goal: 0, completed: 0 },
        { day: "Thu", goal: 0, completed: 0 },
        { day: "Fri", goal: 0, completed: 0 },
        { day: "Sat", goal: 0, completed: 0 },
        { day: "Sun", goal: 0, completed: 0 },
      ];
    }

    const days = summary.days;
    // Sort tasks by assignedDate (when they were assigned to user) - newest first (stack behavior)
    const sortedTasks = [...tasks].sort((a, b) => {
      const dateA = getDateValue(a.assignedDate || a.createdAt);
      const dateB = getDateValue(b.assignedDate || b.createdAt);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1; // put invalid dates at the end
      if (!dateB) return -1;
      return dateB.getTime() - dateA.getTime(); // Reversed to show newest first
    });

    let prevUncompletedTaskIds = new Set();
    return days.map((d, idx) => {
      // Try to parse date from d.date first, then fallback to parsing d.day
      let dayDate = getDateValue(d.date);

      // If d.date doesn't work, try to construct date from d.day format like "19 Sat"
      if (!dayDate && d.day) {
        const dayMatch = d.day.match(/^(\d{1,2})\s+\w+$/);
        if (dayMatch) {
          const dayNumber = parseInt(dayMatch[1]);
          const currentDate = new Date();
          const currentYear = currentDate.getFullYear();
          const currentMonth = currentDate.getMonth();

          // Create date for this month and day
          dayDate = new Date(currentYear, currentMonth, dayNumber);

          // If the constructed date is invalid, skip
          if (isNaN(dayDate.getTime())) {
            dayDate = null;
          }
        }
      }

      if (!dayDate) {
        console.warn("Invalid date in summary data, skipping day:", d);
        return {
          day: d.day || `Day ${idx + 1}`,
          goal: 100,
          completed: 0,
          goalCount: 0,
          completedCount: 0,
        };
      }
      const chartDayUTC = dayDate.toISOString().slice(0, 10);
      const tasksUpToDay = sortedTasks.filter((t) => {
        const assignedAtDate = getDateValue(t.assignedDate || t.createdAt);
        return assignedAtDate && assignedAtDate <= dayDate;
      });
      // Tasks not completed as of this day (created before or on this day, and either not completed or completed after this day)
      const uncompletedAsOfDay = tasksUpToDay.filter((t) => {
        if (!t.data?.status || t.data.status !== "completed") return true;
        const updatedAtUTC = getUTCDateString(t.updatedAt);
        return updatedAtUTC > chartDayUTC;
      });
      // Tasks completed on this day (root updatedAt is this day, UTC)
      const completedToday = tasksUpToDay.filter((t) => {
        if (t.data?.status === "completed" && t.updatedAt) {
          const updatedAtUTC = getUTCDateString(t.updatedAt);
          return updatedAtUTC === chartDayUTC;
        }
        return false;
      });
      const goalCount = uncompletedAsOfDay.length;
      const completedCount = completedToday.length;
      return {
        day: d.day,
        goal: 100, // always 100% visually
        completed:
          goalCount > 0 ? Math.round((completedCount / goalCount) * 100) : 0,
        goalCount,
        completedCount,
      };
    });
  }, [summary, tasks]);

  const pieData = useMemo(() => {
    if (!tasks.length) {
      return {
        labels: ["Completed", "In Progress", "Pending"],
        datasets: [
          {
            data: [0, 0, 0],
            backgroundColor: ["#22c55e", "#f59e0b", "#ef4444"],
          },
        ],
      };
    }

    // Count tasks by their actual status with fallback to root level status
    const completed = tasks.filter(
      (t) => (t.data?.status || t.status) === "completed"
    ).length;
    const inProgress = tasks.filter(
      (t) => (t.data?.status || t.status) === "in-progress"
    ).length;
    const pending = tasks.filter(
      (t) => (t.data?.status || t.status) === "pending"
    ).length;

    return {
      labels: ["Completed", "In Progress", "Pending"],
      datasets: [
        {
          data: [completed, inProgress, pending],
          backgroundColor: ["#22c55e", "#f59e0b", "#ef4444"],
        },
      ],
    };
  }, [tasks]);

  // Dynamic data for StatusHistoryChart - calculates completion percentage for each day
  const statusHistoryData = useMemo(() => {
    if (!tasks.length) return [];

    const data = [];
    const today = new Date();

    // Calculate daily progress using the same logic as WeeklyBarChart
    const calculateDailyProgress = (allTasks, currentDate = new Date()) => {
      const startOfDay = new Date(currentDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(currentDate);
      endOfDay.setHours(23, 59, 59, 999);

      const parseDate = (dateStr) => new Date(dateStr);

      // TASKS THAT WERE ASSIGNED AT START OF DAY (use assignedDate)
      const tasksPendingAtStartOfDay = allTasks.filter((task) => {
        const assignedAt = parseDate(task.assignedDate || task.createdAt);
        const updatedAt = parseDate(task.updatedAt);
        const status = task.data?.status || task.status; // Fallback to root level status

        if (assignedAt > endOfDay) return false;
        if (status === "completed" && updatedAt < startOfDay) return false;
        return assignedAt <= endOfDay;
      });

      // TASKS COMPLETED TODAY
      const tasksCompletedToday = allTasks.filter((task) => {
        const updatedAt = parseDate(task.updatedAt);
        const status = task.data?.status || task.status; // Fallback to root level status
        return (
          status === "completed" &&
          updatedAt >= startOfDay &&
          updatedAt <= endOfDay
        );
      });

      const totalGoal = tasksPendingAtStartOfDay.length;
      const completedCount = tasksCompletedToday.length;
      const completionPercent =
        totalGoal === 0 ? 0 : Math.round((completedCount / totalGoal) * 100);

      return {
        totalGoal,
        completedCount,
        completionPercent: Math.max(0, Math.min(100, completionPercent)), // Clamp between 0-100
      };
    };

    // Generate data for the last 30 days (current month)
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      const progress = calculateDailyProgress(tasks, date);

      // Ensure the value is always a valid number
      const validValue =
        typeof progress.completionPercent === "number" &&
        !isNaN(progress.completionPercent)
          ? progress.completionPercent
          : 0;

      data.push({
        date: date.toISOString().split("T")[0],
        value: Math.max(0, Math.min(100, validValue)), // Double-clamp to ensure valid range
      });
    }

    return data;
  }, [tasks]);

  const upcomingTasks = useMemo(() => {
    if (!tasks.length) return [];

    return tasks
      .filter((t) => t.data?.status !== "completed")
      .sort((a, b) => new Date(a.assignedDate || a.createdAt) - new Date(b.assignedDate || b.createdAt))
      .slice(0, 5);
  }, [tasks]);

  // Pin and animate WeeklyBarChart section for the correct scroll distance
  const barSectionRef = useRef();
  const barsGridRef = useRef();

  // ## FINAL SCROLLYTELLING ANIMATION ##
  useLayoutEffect(() => {
    if (loading || !barSectionRef.current) return;

    const bars = gsap.utils.toArray(".weekly-bar-card");
    if (bars.length === 0) return;

    gsap.set(bars, { opacity: 0, y: 50 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: barSectionRef.current,
        pin: true,
        scrub: 2,
        start: "top",
        end: "bottom",
        anticipatePin: 1,
      },
    });

    bars.forEach((bar) => {
      tl.to(bar, {
        opacity: 1,
        y: 0,
        duration: 2,
        ease: "power2.inOut",
      });
    });

    return () => {
      if (tl.scrollTrigger) tl.scrollTrigger.kill();
      tl.kill();
    };
  }, [loading, barChartData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#111111]">
        <div className="text-xl text-snow">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#111111]">
        <div className="text-xl text-coral">{error}</div>
      </div>
    );
  }

  // Helper functions (unchanged from your previous version)
  const calculateAverage = (items, key) => {
    if (!items || items.length === 0) return 0;
    const total = items.reduce((acc, day) => acc + (day[key] || 0), 0);
    return Math.round(total / items.length);
  };

  const getBestDay = (items) => {
    if (!items || items.length === 0) return "N/A";
    return items.reduce(
      (best, day) => (day.completed > best.completed ? day : best),
      items[0]
    ).day;
  };

  // Helper to handle both string and {$date: ...} date formats
  function getDateValue(dateField) {
    if (!dateField) return null;
    if (typeof dateField === "string") {
      const d = new Date(dateField);
      if (!(d instanceof Date) || isNaN(d.getTime())) return null;
      return d;
    }
    if (typeof dateField === "object" && dateField.$date) {
      const d = new Date(dateField.$date);
      if (!(d instanceof Date) || isNaN(d.getTime())) return null;
      return d;
    }
    return null;
  }

  // Helper to get UTC date string (YYYY-MM-DD)
  function getUTCDateString(dateField) {
    try {
      const d = getDateValue(dateField);
      if (!d || !(d instanceof Date) || isNaN(d.getTime())) return "";
      return d.toISOString().slice(0, 10);
    } catch (e) {
      console.warn("Invalid date in getUTCDateString:", dateField, e);
      return "";
    }
  }

  return (
    <NoGoalsGuard>
      <div className="bg-[#111111] min-h-screen w-full">
        <div className="relative z-10 p-6 space-y-8 text-snow min-h-screen bg-[#111111]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <GoalSelector className="sm:w-auto" />
          </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            title="Total Tasks"
            value={summary?.totalTasks || 0}
            icon="📋"
            color="bg-cyan"
          />
          <SummaryCard
            title="Completed"
            value={summary?.completedTasks || 0}
            icon="✅"
            color="bg-mint"
          />
          <SummaryCard
            title="In Progress"
            value={summary?.inProgressTasks || 0}
            icon="🔄"
            color="bg-solar"
          />
          <SummaryCard
            title="Productivity"
            value={`${summary?.completionRate || 0}%`}
            icon="📊"
            color="bg-coral"
          />
        </div>

        {/* Weekly Bar Chart Section - Now First */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* IMPORTANT: This is the section that gets pinned and animated. */}
          <div
            ref={barSectionRef}
            className="lg:col-span-3 bg-deepTeal p-6 rounded-lg min-h-[400px] h-[32rem]"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              {/* Header section is fine */}
            </div>

            <div className="flex-1 min-h-[400px]">
              <WeeklyBarChart
                data={barChartData}
                barsGridRef={barsGridRef}
                allTasks={tasks}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
              {/* Footer stats section is fine */}
            </div>
          </div>
        </div>

        {/* Status History and Statistics Grid - Now Below */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status History Chart */}
          <div
            className="rounded-2xl p-6 border border-sky-200/50 dark:border-gray-700/50"
            style={{ backgroundColor: "#181D24" }}
          >
            <StatusHistoryTitle />
            {(() => {
              try {
                return (
                  <StatusHistoryChart
                    data={
                      statusHistoryData.length > 0
                        ? statusHistoryData
                        : [
                            {
                              date: new Date().toISOString().split("T")[0],
                              value: 0,
                            },
                          ]
                    }
                  />
                );
              } catch (error) {
                console.error("Error rendering StatusHistoryChart:", error);
                return (
                  <div className="flex items-center justify-center h-[400px] text-gray-400">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📊</div>
                      <div>Chart temporarily unavailable</div>
                    </div>
                  </div>
                );
              }
            })()}
          </div>

          {/* Your Statistics (Pie Chart) */}
          <div
            className="rounded-2xl p-6 border border-sky-200/50 dark:border-gray-700/50"
            style={{ backgroundColor: "#181D24" }}
          >
            <YourStatisticsTitle />
            <div className="h-[400px]">
              {(() => {
                try {
                  return <WeeklyPieChart data={pieData} />;
                } catch (error) {
                  console.error("Error rendering WeeklyPieChart:", error);
                  return (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <div className="text-center">
                        <div className="text-4xl mb-2">📊</div>
                        <div>Chart temporarily unavailable</div>
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>

        {/* Upcoming Tasks Section is fine */}
        </div>
      </div>
    </NoGoalsGuard>
  );
}
