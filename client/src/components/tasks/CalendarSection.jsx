import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { apiService } from "../../services/api";
import { useTasks } from "../../contexts/TasksContext";
import { useGoalStore } from "../../store/goalStore.js";
import {
  getCurrentLocalDate,
  utcToLocalDateString,
  isFutureDate,
} from "../../utils/dateUtils";
import AnimatedTitle from "../ui/AnimatedTitle.jsx";

const SPOTLIGHT_TEXT = "Smart Calendar";

export const CalendarSection = ({ selectedDate, onDateSelect }) => {
  const { refreshTasks } = useTasks();
  const { activeGoalId } = useGoalStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dailyStats, setDailyStats] = useState({});
  const [loading, setLoading] = useState(false);

  // Typewriter animation state
  const container = useRef();
  const [typed, setTyped] = useState("");
  const [spotlightPos, setSpotlightPos] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [isInView, setIsInView] = useState(false);

  // Start animation immediately for testing, then scroll-based
  useEffect(() => {
    // Start animation immediately when component mounts
    const timer = setTimeout(() => {
      setIsInView(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // IntersectionObserver to trigger and reset typewriter
  useEffect(() => {
    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Reset animation state and start fresh
          setTyped("");
          setIsDone(false);
          setSpotlightPos(0);
          // Small delay to ensure clean start
          setTimeout(() => setIsInView(true), 50);
        } else {
          setIsInView(false);
          setTyped("");
          setIsDone(false);
          setSpotlightPos(0);
        }
      },
      { threshold: 0.2, rootMargin: "50px" }
    );
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  // Typewriter effect (only when in view) - PLAY ONCE PER ENTRY
  useEffect(() => {
    if (!isInView) return;

    if (typed.length < SPOTLIGHT_TEXT.length) {
      const timeout = setTimeout(() => {
        const nextChar = typed.length + 1;
        setTyped(SPOTLIGHT_TEXT.slice(0, nextChar));
        setSpotlightPos(nextChar);
      }, 120); // Slightly slower for better visibility
      return () => clearTimeout(timeout);
    } else if (typed.length === SPOTLIGHT_TEXT.length && !isDone) {
      // Animation complete - add final glow effect and STOP (no loop)
      const timeout = setTimeout(() => setIsDone(true), 500);
      return () => clearTimeout(timeout);
    }
    // Removed the looping logic - animation plays once and stops
  }, [typed, isInView, isDone]);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchMonthlyStats = async () => {
      if (abortController.signal.aborted) return;

      setLoading(true);
      try {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const stats = {};

        // Fetch tasks for each day of the month from backend (with delay to prevent overwhelming)
        for (let day = 1; day <= daysInMonth; day++) {
          if (abortController.signal.aborted) break;

          const date = new Date(year, month, day);
          const dateStr = utcToLocalDateString(date);

          try {
            // Only fetch if we have an active goal - strict filtering
            if (!activeGoalId) {
              stats[dateStr] = {
                date: dateStr,
                totalTasks: 0,
                completedTasks: 0,
                inProgressTasks: 0,
                pendingTasks: 0,
                productivityScore: 0,
                tasks: [],
              };
              continue;
            }
            
            const res = await apiService.getTasksByDate(dateStr, activeGoalId);

            if (!abortController.signal.aborted) {
              const dayTasks = res.data?.tasks || [];
              
              // Double-check: filter out any tasks that don't belong to the active goal
              const filteredTasks = dayTasks.filter(task => {
                const taskGoalId = task.goal?._id || task.goal;
                const belongsToActiveGoal = taskGoalId === activeGoalId;
                if (!belongsToActiveGoal && taskGoalId) {
                  console.warn(`[CalendarSection] Filtering out task "${task.name}" - belongs to goal ${taskGoalId}, not ${activeGoalId}`);
                }
                return belongsToActiveGoal || !taskGoalId; // Include legacy tasks without goal
              });
              
              const totalTasks = filteredTasks.length;
              const completedTasks = filteredTasks.filter(
                (t) => t.status === "completed"
              ).length;
              const inProgressTasks = filteredTasks.filter(
                (t) => t.status === "in-progress"
              ).length;
              const pendingTasks = filteredTasks.filter(
                (t) => t.status === "pending"
              ).length;

              stats[dateStr] = {
                date: dateStr,
                totalTasks,
                completedTasks,
                inProgressTasks,
                pendingTasks,
                productivityScore:
                  totalTasks > 0
                    ? Math.round((completedTasks / totalTasks) * 100)
                    : 0,
                tasks: filteredTasks,
              };
            }
          } catch (err) {
            if (err.name !== "AbortError" && !abortController.signal.aborted) {
              stats[dateStr] = {
                date: dateStr,
                totalTasks: 0,
                completedTasks: 0,
                inProgressTasks: 0,
                pendingTasks: 0,
                productivityScore: 0,
                tasks: [],
              };
            }
          }

          // Small delay to prevent overwhelming the server
          if (!abortController.signal.aborted && day < daysInMonth) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }

        if (!abortController.signal.aborted) {
          setDailyStats(stats);
        }
      } catch (err) {
        if (err.name !== "AbortError" && !abortController.signal.aborted) {
          console.error("Failed to load calendar data:", err);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchMonthlyStats();

    // Listen for real-time task updates
    const handleTasksUpdated = () => {
      if (!abortController.signal.aborted) {
        fetchMonthlyStats();
      }
    };

    window.addEventListener("tasksUpdated", handleTasksUpdated);

    return () => {
      abortController.abort();
      window.removeEventListener("tasksUpdated", handleTasksUpdated);
    };
  }, [currentMonth, activeGoalId]);

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getStatsForDate = (date) => {
    const dateStr = utcToLocalDateString(date);
    return (
      dailyStats[dateStr] || {
        date: dateStr,
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        pendingTasks: 0,
        productivityScore: 0,
        tasks: [],
      }
    );
  };

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    if (direction === "prev") {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const getCompletionColor = (completionRate) => {
    if (completionRate >= 90) return "bg-green-500";
    if (completionRate >= 70) return "bg-blue-500";
    if (completionRate >= 50) return "bg-yellow-500";
    if (completionRate >= 30) return "bg-orange-500";
    return "bg-red-500";
  };

  const getCompletionIcon = (completionRate) => {
    if (completionRate >= 90) return "🏆";
    if (completionRate >= 70) return "🎯";
    if (completionRate >= 50) return "📈";
    if (completionRate >= 30) return "⚡";
    return "📋";
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          className="h-24 border border-gray-700/50 bg-gray-800/30"
        ></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      );
      const dayStats = getStatsForDate(date);
      const isSelected = selectedDate.toDateString() === date.toDateString();
      const isToday = new Date().toDateString() === date.toDateString();
      const isFuture = isFutureDate(date);
      const completionRate = dayStats.productivityScore;
      const hasData = dayStats.totalTasks > 0;

      days.push(
        <div
          key={day}
          onClick={async () => {
            // Allow selection for days with tasks, block only future days with no tasks
            if (isFutureDate(date) && !hasData) {
              return;
            }
            onDateSelect(date);
            // Trigger refresh for the selected date
            await refreshTasks();
          }}
          className={`h-28 border border-gray-700/50 p-3 transition-all duration-300 relative overflow-hidden rounded-lg ${isFuture && !hasData
            ? "cursor-not-allowed opacity-50 bg-gray-800/30"
            : "cursor-pointer hover:bg-gradient-to-r hover:from-gray-600 hover:to-gray-700 hover:border-gray-500/70"
            } ${isSelected
              ? "bg-gradient-to-r from-gray-600 to-gray-700 border-gray-500 ring-2 ring-gray-400/50"
              : ""
            } ${isToday ? "ring-2 ring-yellow-400/70" : ""} ${hasData && !isFuture
              ? "bg-gradient-to-br from-gray-700/50 to-gray-800/50 border-gray-600/50"
              : hasData && isFuture
                ? "bg-gradient-to-br from-gray-600/30 to-gray-700/30 border-gray-500/50"
                : !isFuture
                  ? "bg-gray-800/20"
                  : ""
            }`}
        >
          <div
            className={`text-sm font-bold mb-1 ${isFuture && !hasData
              ? "text-gray-500"
              : isToday
                ? "text-yellow-400"
                : hasData
                  ? "text-white"
                  : "text-gray-400"
              }`}
          >
            {day}
          </div>

          {hasData && (
            <div className="space-y-1">
              <div className="w-full bg-gray-600/50 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${getCompletionColor(
                    completionRate
                  )}`}
                  style={{ width: `${completionRate}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white font-semibold">
                  {dayStats.completedTasks}/{dayStats.totalTasks}
                </span>
                <span className="text-lg">
                  {getCompletionIcon(completionRate)}
                </span>
              </div>
              <div
                className={`text-xs font-bold text-center ${completionRate >= 70
                  ? "text-green-400"
                  : completionRate >= 50
                    ? "text-yellow-400"
                    : "text-red-400"
                  }`}
              >
                {completionRate}%
              </div>
            </div>
          )}

          {/* Today Indicator */}
          {isToday && (
            <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          )}

          {/* High Productivity Badge */}
          {hasData && completionRate >= 90 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center">
              <span className="text-xs">⭐</span>
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Calculate spotlight position in px (estimate per char)
  const charWidth = 28; // px, adjust for font-size
  const spotlightX = Math.max(32, 32 + (spotlightPos - 1) * charWidth);

  // Spotlight mask style - only apply if animation is active
  const maskStyle =
    !isDone && typed.length > 0
      ? {
        WebkitMaskImage: `radial-gradient(circle 50px at ${spotlightX}px 50%, white 90%, transparent 100%)`,
        maskImage: `radial-gradient(circle 50px at ${spotlightX}px 50%, white 90%, transparent 100%)`,
        transition: "all 0.1s ease",
      }
      : {};

  return (
    <Card
      ref={container}
      className="bg-gray-900/50 border border-gray-700/50 rounded-3xl shadow-2xl dark:bg-white/10 dark:border-white/20"
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <AnimatedTitle
              text={SPOTLIGHT_TEXT}
              fontSize="48px"
              fontWeight="900"
            />
            {activeGoalId && (
              <p className="text-gray-400 text-sm mt-2">
                📊 Filtered by active goal
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigateMonth("prev")}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full border-0 text-white transition-all duration-300 hover:scale-110"
            >
              ‹
            </Button>
            <h3 className="text-xl font-semibold text-white min-w-[200px] text-center dark:text-white">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <Button
              onClick={() => navigateMonth("next")}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full border-0 text-white transition-all duration-300 hover:scale-110"
            >
              ›
            </Button>
          </div>
        </div>

        {loading && (
          <div className="text-center text-gray-500 py-8">
            Loading calendar...
          </div>
        )}

        {/* Calendar Grid */}
        {!loading && (
          <div className="bg-gray-800/60 rounded-xl p-6 border border-gray-700/50 mb-6">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-3">
              {dayNames.map((day) => (
                <div
                  key={day}
                  className="h-12 flex items-center justify-center text-gray-300 font-semibold text-base"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">{renderCalendarDays()}</div>
          </div>
        )}

        {/* Enhanced Legend */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="flex items-center gap-2 bg-gray-800/50 p-2 rounded-lg border border-gray-700/50">
            <div className="w-3 h-3 bg-green-500 rounded flex-shrink-0"></div>
            <span className="text-gray-300 text-xs">90%+ Done</span>
          </div>
          <div className="flex items-center gap-2 bg-gray-800/50 p-2 rounded-lg border border-gray-700/50">
            <div className="w-3 h-3 bg-blue-500 rounded flex-shrink-0"></div>
            <span className="text-gray-300 text-xs">70-89% Done</span>
          </div>
          <div className="flex items-center gap-2 bg-gray-800/50 p-2 rounded-lg border border-gray-700/50">
            <div className="w-3 h-3 bg-yellow-500 rounded flex-shrink-0"></div>
            <span className="text-gray-300 text-xs">50-69% Done</span>
          </div>
          <div className="flex items-center gap-2 bg-gray-800/50 p-2 rounded-lg border border-gray-700/50">
            <div className="w-3 h-3 ring-2 ring-yellow-400 rounded flex-shrink-0"></div>
            <span className="text-gray-300 text-xs">Today</span>
          </div>
          <div className="flex items-center gap-2 bg-gray-800/50 p-2 rounded-lg border border-gray-700/50">
            <div className="w-3 h-3 bg-gradient-to-r from-gray-600 to-gray-700 rounded flex-shrink-0"></div>
            <span className="text-gray-300 text-xs">Future Tasks</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
