import React from 'react';

export default function TaskList({ tasks }) {
  if (!tasks.length) {
    return <p className="text-grayMed">No tasks available.</p>;
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {tasks.map((task, index) => (
        <div 
          key={task._id || index} 
          className="flex justify-between items-center p-3 bg-deepTeal/50 rounded-lg border border-deepTeal"
        >
          <div className="flex-1">
            <div className="font-semibold text-snow">
              {task.data?.name || task.data?.title || 'Untitled Task'}
            </div>
            <div className="text-sm text-grayMed">
              {task.data?.notes || task.data?.description || 'No description'}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            task.data?.status === 'completed' 
              ? 'bg-mint/20 text-mint border border-mint/30' 
              : task.data?.status === 'in-progress'
              ? 'bg-solar/20 text-solar border border-solar/30'
              : 'bg-coral/20 text-coral border border-coral/30'
          }`}>
            {task.data?.status || 'pending'}
          </span>
        </div>
      ))}
    </div>
  );
} 