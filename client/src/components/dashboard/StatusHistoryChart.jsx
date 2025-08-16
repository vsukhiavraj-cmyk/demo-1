import React, { useState } from 'react';

export const StatusHistoryChart = ({ data }) => {
    const [hoveredIndex, setHoveredIndex] = useState(null);

    const history = data || [];
    const safeHistory = history.map(item => ({
        date: item?.date || new Date().toISOString().split('T')[0],
        value: typeof item?.value === 'number' && !isNaN(item.value) && isFinite(item.value)
            ? Math.max(0, Math.min(100, item.value))
            : 0
    }));

    // Ensure we have valid data for calculations
    const values = safeHistory.map((d) => d.value).filter(v => typeof v === 'number' && !isNaN(v));
    const dataMaxValue = values.length > 0 ? Math.max(...values) : 0;
    const dataMinValue = values.length > 0 ? Math.min(...values) : 0;
    
    // Always show a meaningful scale, even when all values are 0%
    const maxValue = dataMaxValue === 0 && dataMinValue === 0 ? 100 : Math.max(dataMaxValue, 10);
    const minValue = 0; // Always start from 0% for percentage charts
    const range = maxValue - minValue || 1; // Prevent division by zero

    // Generate SVG path for the line chart
    const generatePath = () => {
        if (safeHistory.length === 0) return 'M 20,330 L 380,330'; // Flat line at bottom

        const width = 400;
        const height = 350;
        const padding = 20;

        const points = safeHistory.map((item, index) => {
            const x = padding + (index / Math.max(safeHistory.length - 1, 1)) * (width - 2 * padding);
            const normalizedValue = isNaN(item.value) ? 0 : item.value;
            const y = height - padding - ((normalizedValue - minValue) / range) * (height - 2 * padding);

            // Ensure coordinates are valid numbers
            const validX = isNaN(x) ? padding : x;
            const validY = isNaN(y) ? height - padding : y;

            return `${validX},${validY}`;
        });

        if (points.length === 0) return 'M 20,330 L 380,330';
        return `M ${points.join(' L ')}`;
    };

    // Generate area path for gradient fill
    const generateAreaPath = () => {
        if (safeHistory.length === 0) return `M 20,${350 - 20} L 380,${350 - 20} L 380,${350 - 20} L 20,${350 - 20} Z`;

        const width = 400;
        const height = 350;
        const padding = 20;

        const points = safeHistory.map((item, index) => {
            const x = padding + (index / Math.max(safeHistory.length - 1, 1)) * (width - 2 * padding);
            const normalizedValue = isNaN(item.value) ? 0 : item.value;
            const y = height - padding - ((normalizedValue - minValue) / range) * (height - 2 * padding);

            // Ensure coordinates are valid numbers
            const validX = isNaN(x) ? padding : x;
            const validY = isNaN(y) ? height - padding : y;

            return `${validX},${validY}`;
        });

        if (points.length === 0) return `M 20,${height - padding} L 380,${height - padding} L 380,${height - padding} L 20,${height - padding} Z`;

        const firstPoint = points[0];
        const lastPoint = points[points.length - 1];

        if (!firstPoint || !lastPoint) return `M 20,${height - padding} L 380,${height - padding} L 380,${height - padding} L 20,${height - padding} Z`;

        const lastX = lastPoint.split(',')[0];
        const firstX = firstPoint.split(',')[0];

        // Ensure X coordinates are valid numbers
        const validLastX = isNaN(parseFloat(lastX)) ? 380 : lastX;
        const validFirstX = isNaN(parseFloat(firstX)) ? 20 : firstX;

        return `M ${validFirstX},${height - padding} L ${points.join(' L ')} L ${validLastX},${height - padding} Z`;
    };

    // Helper to format date as 'MMM d'
    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    return (
        <div className="w-full h-[500px] bg-gradient-to-br from-sky-100/50 to-sky-200/50 rounded-2xl p-6 backdrop-blur-sm border border-sky-200/50 dark:from-gray-900/50 dark:to-gray-800/50 dark:border-white/10">
            {/* Chart Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="text-sky-600 text-sm dark:text-gray-400">Progress Over Time</div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
                    <span className="text-indigo-700 text-sm dark:text-white">Performance</span>
                </div>
            </div>

            {/* Chart Area */}
            <div className="relative w-full h-[350px] overflow-hidden">
                <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 400 350"
                    className="absolute inset-0"
                >
                    {/* Grid Lines */}
                    <defs>
                        <pattern
                            id="grid"
                            width="40"
                            height="35"
                            patternUnits="userSpaceOnUse"
                        >
                            <path
                                d="M 40 0 L 0 0 0 35"
                                fill="none"
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="0.5"
                            />
                        </pattern>

                        {/* Gradient for area fill */}
                        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(147, 51, 234, 0.3)" />
                            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.1)" />
                        </linearGradient>

                        {/* Gradient for line */}
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="50%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                    </defs>

                    {/* Grid */}
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Area under curve */}
                    <path
                        d={generateAreaPath()}
                        fill="url(#areaGradient)"
                        className="animate-fadeIn"
                    />

                    {/* Main line */}
                    <path
                        d={generatePath()}
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-fadeIn"
                        style={{
                            filter: 'drop-shadow(0 0 8px rgba(147, 51, 234, 0.5))',
                        }}
                    />
                </svg>

                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-sky-600 text-xs py-4 dark:text-gray-400">
                    <span>{maxValue}%</span>
                    <span>{Math.round(maxValue / 2)}%</span>
                    <span>0%</span>
                </div>

                {/* X-axis labels */}
                <div className="absolute bottom-0 left-0 w-full flex justify-between text-sky-600 text-xs px-6 dark:text-gray-400">
                    {safeHistory.length > 0 ? (
                        <>
                            <span>{formatDate(safeHistory[0].date)}</span>
                            <span>{formatDate(safeHistory[Math.floor(safeHistory.length / 2)].date)}</span>
                            <span>{formatDate(safeHistory[safeHistory.length - 1].date)}</span>
                        </>
                    ) : (
                        <>
                            <span>Jan 1</span>
                            <span>Jan 6</span>
                            <span>Jan 12</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};