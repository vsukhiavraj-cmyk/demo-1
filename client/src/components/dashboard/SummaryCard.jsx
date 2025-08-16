import React from 'react';

export default function SummaryCard({ title, value, icon, color }) {
  return (
    <div className={`flex items-center p-6 bg-deepTeal rounded-lg min-h-[120px]`}>
      <div className={`p-3 rounded-full ${color} text-snow mr-4 flex-shrink-0`}>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="flex flex-col justify-center flex-1">
        <div className="text-grayMed text-sm mb-1 leading-tight">{title}</div>
        <div className="text-2xl font-bold text-snow leading-tight">{value}</div>
      </div>
    </div>
  );
} 