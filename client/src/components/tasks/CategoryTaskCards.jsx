import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';

export const CategoryTaskCards = ({ tasks, onTaskClick = () => {} }) => {
    // Group tasks by category
    const tasksByCategory = tasks.reduce((acc, task) => {
        const category = task.category || task.type || 'General';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(task);
        return acc;
    }, {});

    const getCategoryIcon = (category) => {
        switch (category.toLowerCase()) {
            case 'assignment':
                return '📕';
            case 'selfstudy':
                return '📗';
            case 'lecture':
                return '📘';
            case 'project':
                return '🚀';
            case 'exam':
                return '📝';
            case 'research':
                return '🔬';
            default:
                return '📋';
        }
    };

    const getCategoryColor = (category) => {
        switch (category.toLowerCase()) {
            case 'assignment':
                return 'from-red-500/20 to-pink-500/20 border-red-500/30';
            case 'selfstudy':
                return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
            case 'lecture':
                return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30';
            case 'project':
                return 'from-purple-500/20 to-indigo-500/20 border-purple-500/30';
            case 'exam':
                return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30';
            case 'research':
                return 'from-teal-500/20 to-cyan-500/20 border-teal-500/30';
            default:
                return 'from-gray-500/20 to-gray-600/20 border-gray-500/30';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'in-progress':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'pending':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high':
                return 'text-red-400';
            case 'medium':
                return 'text-yellow-400';
            case 'low':
                return 'text-green-400';
            default:
                return 'text-gray-400';
        }
    };

    if (Object.keys(tasksByCategory).length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <div className="text-gray-400 text-xl">No tasks found</div>
                <div className="text-gray-500 text-sm mt-2">Create some tasks to see them organized by category</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="text-3xl">📂</span>
                Tasks by Category
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(tasksByCategory).map(([category, categoryTasks]) => {
                    const completedTasks = categoryTasks.filter(task => task.status === 'completed');
                    const completionRate = Math.round((completedTasks.length / categoryTasks.length) * 100);

                    return (
                        <Card
                            key={category}
                            className={`border rounded-2xl hover:scale-105 transition-all duration-300 ${getCategoryColor(category).split(' ').slice(-1)[0]}`}
                            style={{ backgroundColor: '#181D24' }}
                        >
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">{getCategoryIcon(category)}</span>
                                        <div>
                                            <h4 className="text-white font-bold text-lg capitalize">
                                                {category.replace(/([A-Z])/g, ' $1').trim()}
                                            </h4>
                                            <p className="text-gray-300 text-sm">
                                                {categoryTasks.length} task{categoryTasks.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-2xl font-bold ${completionRate >= 80 ? 'text-green-400' :
                                            completionRate >= 50 ? 'text-yellow-400' : 'text-red-400'
                                            }`}>
                                            {completionRate}%
                                        </div>
                                        <div className="text-gray-400 text-xs">Complete</div>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-4">
                                    <div className="w-full bg-gray-700 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-1000 ${completionRate >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                                                completionRate >= 50 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                                    'bg-gradient-to-r from-red-500 to-pink-500'
                                                }`}
                                            style={{ width: `${completionRate}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Task List */}
                                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                                    {categoryTasks.slice(0, 5).map((task) => (
                                        <div
                                            key={task.id}
                                            className="bg-white/10 rounded-lg p-3 hover:bg-white/20 transition-all cursor-pointer"
                                            onClick={() => onTaskClick(task)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-white font-medium text-sm truncate">
                                                        {task.name}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(task.status)}`}>
                                                            {task.status}
                                                        </span>
                                                        <span className={`text-xs ${getPriorityColor(task.priority)}`}>
                                                            {task.priority}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="ml-2">
                                                    {task.status === 'completed' ? (
                                                        <span className="text-green-400 text-lg">✅</span>
                                                    ) : (
                                                        <span className="text-gray-400 text-lg">⏳</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {categoryTasks.length > 5 && (
                                        <div className="text-center text-gray-400 text-sm py-2">
                                            +{categoryTasks.length - 5} more tasks
                                        </div>
                                    )}
                                </div>

                                {/* Category Stats */}
                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                    <div className="bg-white/5 rounded-lg p-2">
                                        <div className="text-white font-bold">{completedTasks.length}</div>
                                        <div className="text-gray-400">Done</div>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-2">
                                        <div className="text-white font-bold">
                                            {categoryTasks.filter(t => t.status === 'in-progress').length}
                                        </div>
                                        <div className="text-gray-400">Active</div>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-2">
                                        <div className="text-white font-bold">
                                            {categoryTasks.filter(t => t.status === 'pending').length}
                                        </div>
                                        <div className="text-gray-400">Pending</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};