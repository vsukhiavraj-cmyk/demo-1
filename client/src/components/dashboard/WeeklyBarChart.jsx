import React, { useRef, useState } from 'react';
import AnimatedTitle from '../ui/AnimatedTitle.jsx';

const SPOTLIGHT_TEXT = 'Weekly Report';

export const WeeklyBarChart = ({ data, barsGridRef, allTasks = [] }) => {
  const chartSectionRef = useRef();
  const [hoveredBar, setHoveredBar] = useState(null);

  // Calculate daily progress using defensive data handling (from pie chart logic)
  const calculateDailyProgress = (allTasks, currentDate = new Date()) => {
    // Defensive: Ensure allTasks is an array
    const safeTasks = Array.isArray(allTasks) ? allTasks : [];

    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const parseDate = (dateStr) => {
      if (!dateStr) return new Date(0);
      const parsed = new Date(dateStr);
      return isNaN(parsed.getTime()) ? new Date(0) : parsed;
    };

    // CARRY FORWARD LOGIC: Tasks that should be "active" on this day
    // This includes:
    // 1. Tasks assigned on or before this day that are still pending/in-progress (carry forward)
    // 2. Tasks that were completed by this day (to show total workload)
    
    const activeTasksForDay = safeTasks.filter(task => {
      if (!task || !task.assignedDate) return false;

      const assignedAt = parseDate(task.assignedDate);
      const updatedAt = parseDate(task.updatedAt);
      const status = task.status || task.data?.status;
      
      // Task must have been assigned before or on this day
      if (assignedAt > endOfDay) return false;

      // Include task if:
      // 1. It's still pending/in-progress (carry forward from previous days)
      // 2. OR it was completed by this day (to show it was part of workload)
      if (status === 'pending' || status === 'in_progress') {
        return true; // Carry forward pending/in-progress tasks
      } else if (status === 'completed') {
        // Only include completed tasks if they were completed by this day
        return updatedAt <= endOfDay;
      }
      
      return false;
    });

    // TASKS COMPLETED BY THIS DAY (from active tasks)
    const tasksCompletedByDay = activeTasksForDay.filter(task => {
      const status = task.status || task.data?.status;
      return status === 'completed';
    });



    // Defensive: Ensure data fields are numbers (from pie chart)
    const totalGoal = Number(activeTasksForDay.length) || 0;
    const completedCount = Number(tasksCompletedByDay.length) || 0;
    const completionPercent = totalGoal === 0 ? 0 : Math.round((completedCount / totalGoal) * 100);

    return {
      totalGoal,
      completedCount,
      completionPercent: Math.max(0, Math.min(100, completionPercent)), // Clamp between 0-100
    };
  };

  // Generate data for the last 7 days with defensive handling (enhanced with pie chart logic)
  const today = new Date();
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const dataToRender = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - i));
    const dayOfWeek = dayLabels[date.getDay()] || 'N/A';
    const dateString = date.toLocaleDateString('en-CA'); // 'YYYY-MM-DD' in local time

    const progress = calculateDailyProgress(allTasks, date);

    // Defensive: Ensure all values are numbers and within valid ranges (from pie chart)
    const totalTasks = Number(progress.totalGoal) || 0;
    const completedTasks = Number(progress.completedCount) || 0;
    const completionPercent = Number(progress.completionPercent) || 0;

    return {
      day: dayOfWeek,
      date: dateString,
      goal: totalTasks > 0 ? 100 : 0, // Only show blue bar if there are tasks assigned on this day
      completed: completionPercent, // Show actual completion percentage (0% if no tasks completed)
      totalTasks,
      completedTasks,
      completionPercent,
      // Enhanced color and styling properties (from pie chart)
      goalColor: '#3b82f6', // blue-500
      completedColor: '#22c55e', // green-500
      hoverGoalColor: '#2563eb', // blue-600
      hoverCompletedColor: '#16a34a', // green-600
      gradient: 'from-blue-500 to-blue-600',
      completedGradient: 'from-green-500 to-green-600',
    };
  });

  // Check if we have any meaningful data (from pie chart empty state logic)
  const hasData = dataToRender.some(item => item.totalTasks > 0 || item.completedTasks > 0);
  const totalTasksAcrossWeek = dataToRender.reduce((sum, item) => sum + item.totalTasks, 0);
  const totalCompletedAcrossWeek = dataToRender.reduce((sum, item) => sum + item.completedTasks, 0);







  return (
    <>
      <AnimatedTitle 
        text={SPOTLIGHT_TEXT}
        fontSize="48px"
        fontWeight="900"
        className="mb-4 text-center"
      />
      <div ref={chartSectionRef} className="w-full bg-transparent h-full">
        {/* Chart Container - Extended to include day labels */}
        <div className="relative bg-[#181D24] rounded-xl p-6 pb-16 border border-sky-200/50 dark:bg-gray-800/60 dark:border-gray-700/50 h-96">
          {/* Y-axis labels */}
          <div className="absolute left-2 top-4 bottom-16">
            <div className="relative h-full">
              {[100, 80, 60, 40, 20, 0].map((value) => (
                <div
                  key={value}
                  className="absolute text-white text-xs flex items-center"
                  style={{ bottom: `${value}%`, transform: 'translateY(50%)' }}
                >
                  {value}%
                </div>
              ))}
            </div>
          </div>

          {/* Horizontal Grid Lines */}
          <div className="absolute left-10 right-2 top-4 bottom-16">
            <div className="relative h-full">
              {[100, 80, 60, 40, 20, 0].map((value) => (
                <div
                  key={value}
                  className={`absolute w-full border-t border-white/20 ${value === 0 ? 'border-b-2 border-white/30' : ''}`}
                  style={{ bottom: `${value}%` }}
                />
              ))}
            </div>
          </div>

          {/* Chart Bars Area */}
          <div
            ref={barsGridRef}
            className="absolute left-10 right-10 top-4 bottom-16 flex justify-between gap-1 z-10 overflow-hidden"
          >
            {dataToRender.map((item, index) => {
              const isLast = index === dataToRender.length - 1;
              return (
                <div
                  key={item.day + (item.date || index)}
                  className="weekly-bar-card h-full flex flex-col items-center relative"
                  style={{
                    animation: `fadeInUp 0.4s ease-out ${index * 1.0}s both`,
                  }}
                >
                  {/* Bars Container - takes full height */}
                  <div className="w-full h-full flex justify-center gap-1 relative">
                    {/* Goal Bar (blue, left) - Always full height */}
                    <div className="relative w-8 min-w-[24px] h-full">
                      <div className="relative flex flex-col justify-end group h-full">
                        <div
                          className="absolute bottom-0 w-full min-h-[2px] bg-blue-500 hover:bg-blue-400 shadow-sm transition-all duration-300 z-[50]"
                          style={{
                            height: `${item.goal > 0 ? Math.max(2, item.goal) : 0}%`,
                            borderTopLeftRadius: '20px',
                            borderTopRightRadius: '20px'
                          }}
                        >
                          <div className={`absolute top-2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-[9999] ${index <= 1
                            ? 'left-0 transform-none' // First 2 bars: align left
                            : index >= dataToRender.length - 2
                              ? 'right-0 transform-none' // Last 2 bars: align right
                              : 'left-1/2 transform -translate-x-1/2' // Middle bars: center
                            }`}>
                            Active Tasks (including carry forward): {item.totalTasks}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Completed Bar (green, right) - Height based on completion percentage */}
                    <div className="relative w-8 min-w-[24px] h-full">
                      <div className="relative flex flex-col justify-end group h-full">
                        <div
                          className="absolute bottom-0 w-full min-h-[2px] bg-green-500 hover:bg-green-400 shadow-sm transition-all duration-300 z-[50]"
                          style={{
                            height: `${item.completed > 0 ? Math.max(2, item.completed) : 0}%`,
                            borderTopLeftRadius: '20px',
                            borderTopRightRadius: '20px'
                          }}
                        >
                          <div className={`absolute top-2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-[9999] ${index <= 1
                            ? 'left-0 transform-none' // First 2 bars: align left
                            : index >= dataToRender.length - 2
                              ? 'right-0 transform-none' // Last 2 bars: align right
                              : 'left-1/2 transform -translate-x-1/2' // Middle bars: center
                            }`}>
                            Completed Tasks: {item.completedTasks}<br />Completion: {item.completionPercent}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Day Labels Container - positioned inside the chart container with exact same alignment as bars */}
          <div className="absolute left-10 right-10 bottom-2 flex justify-between gap-1 z-10">
            {dataToRender.map((item, index) => {
              const isLast = index === dataToRender.length - 1;
              return (
                <div
                  key={`label-${item.day}-${item.date || index}`}
                  className="weekly-bar-card flex justify-center items-center"
                  style={{
                    animation: `fadeInUp 0.4s ease-out ${index * 1.0 + 0.4}s both`,
                  }}
                >
                  {isLast ? (
                    <div className="border-2 border-black dark:border-white shadow-[0_0_0_4px_rgba(128,128,128,0.15)] dark:shadow-[0_0_0_4px_rgba(128,128,128,0.25)] rounded-xl z-20 bg-[#181D24] px-2 py-1 font-medium text-sm text-center text-white/80 transition-all duration-300 hover:scale-105">
                      <div>{new Date(item.date).getDate()} {item.day}</div>
                    </div>
                  ) : (
                    <div className="font-medium text-sm text-center text-white/80 transition-all duration-300 hover:scale-105">
                      <div>{new Date(item.date).getDate()} {item.day}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default WeeklyBarChart;