import React from 'react';
import Chart from '../../utils/chartSetup.js';
import { Pie } from 'react-chartjs-2';

export default function WeeklyPieChart({ data }) {
  // Extract values with better fallback logic and NaN protection
  let completed = 0;
  let inProgress = 0;
  let pending = 0;

  if (data) {
    // Try direct properties first with NaN protection
    if (data.completed !== undefined) {
      const val = Number(data.completed);
      completed = isNaN(val) ? 0 : val;
    }
    if (data.inProgress !== undefined) {
      const val = Number(data.inProgress);
      inProgress = isNaN(val) ? 0 : val;
    }
    if (data.pending !== undefined) {
      const val = Number(data.pending);
      pending = isNaN(val) ? 0 : val;
    }

    // Fallback to Chart.js format if direct properties don't exist
    if (completed === 0 && inProgress === 0 && pending === 0 && data.datasets?.[0]?.data) {
      const chartData = data.datasets[0].data;
      // Check if the original data has labels to understand the correct mapping
      if (data.labels) {
        // Map based on original labels
        data.labels.forEach((label, index) => {
          const rawValue = Number(chartData[index]);
          const value = isNaN(rawValue) ? 0 : rawValue;
          const labelLower = label.toLowerCase().trim();

          if (labelLower.includes('completed')) {
            completed = value;
          } else if (labelLower.includes('in-progress') || labelLower.includes('progress')) {
            inProgress = value;
          } else if (labelLower.includes('pending')) {
            pending = value;
          } else if (labelLower.includes('remaining')) {
            // Split "Remaining" between In Progress and Pending
            // Since we can't know the exact split, we'll assume a reasonable distribution
            // This is a temporary solution until backend provides proper breakdown
            const halfRemaining = Math.floor(value / 2);
            inProgress = halfRemaining;
            pending = value - halfRemaining;
          }
        });
      } else {
        // Default mapping if no labels with NaN protection
        const val0 = Number(chartData[0]);
        const val1 = Number(chartData[1]);
        const val2 = Number(chartData[2]);

        completed = isNaN(val0) ? 0 : val0;
        pending = isNaN(val1) ? 0 : val1; // Swap: pending is likely at index 1
        inProgress = isNaN(val2) ? 0 : val2; // Swap: inProgress is likely at index 2
      }
    }
  }

  // Transform data to handle three segments: Completed, In Progress, Pending
  const transformedData = {
    labels: ['Completed', 'In Progress', 'Pending'],
    datasets: [
      {
        data: [completed, inProgress, pending],
        backgroundColor: [
          '#22c55e', // green for Completed
          '#f59e0b', // amber for In Progress  
          '#ef4444'  // red for Pending
        ],
        borderColor: [
          '#16a34a', // darker green
          '#d97706', // darker amber
          '#dc2626'  // darker red
        ],
        borderWidth: 2
      }
    ]
  };

  return (
    <Pie
      data={transformedData}
      options={{
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#F8FAFC' } }
        }
      }}
    />
  );
} 