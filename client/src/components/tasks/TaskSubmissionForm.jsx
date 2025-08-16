import React from 'react';
import { Button } from '../ui/button';
import FileUpload from './FileUpload';

export const TaskSubmissionForm = ({
    task,
    submissionType,
    setSubmissionType,
    selectedFile,
    onFileSelect,
    timeSpent,
    isTimerRunning,
    onStartTimer,
    onPauseTimer,
    formatTime,
    uploading,
    onSubmit,
    onCancel
}) => {
    if (task.status === 'completed') {
        return (
            <div className="space-y-4">
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-green-400 text-xl">✅</span>
                        <span className="text-green-400 font-semibold">Task Completed</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-400">Submission Type:</span>
                            <span className="text-white ml-2 font-medium">
                                {task.submissionType === 'pdf' ? '📄 PDF' : '📊 Excel'}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-400">Time Spent:</span>
                            <span className="text-white ml-2 font-medium">
                                {task.timeSpent || 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span className="text-xl">📤</span>
                Submit Task: {task.name}
            </h4>

            {/* Timer Section */}
            <div className="bg-gray-700/50 rounded-lg p-4">
                <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <span className="text-xl">⏱️</span>
                    Task Timer
                </h5>
                <div className="flex items-center justify-between">
                    <div className="text-3xl font-mono text-cyan-400">
                        {formatTime(timeSpent)}
                    </div>
                    <div className="flex gap-2">
                        {!isTimerRunning ? (
                            <Button
                                onClick={onStartTimer}
                                className="bg-green-500 hover:bg-green-400 text-white px-4 py-2"
                            >
                                ▶️ Start
                            </Button>
                        ) : (
                            <Button
                                onClick={onPauseTimer}
                                className="bg-yellow-500 hover:bg-yellow-400 text-white px-4 py-2"
                            >
                                ⏸️ Pause
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Submission Type Selection */}
            <div>
                <h5 className="text-white font-semibold mb-3">Select Submission Type</h5>
                <div className="grid grid-cols-2 gap-4">
                    <Button
                        onClick={() => setSubmissionType('pdf')}
                        className={`p-4 border-2 rounded-lg transition-all ${submissionType === 'pdf'
                            ? 'border-red-500 bg-red-500/20 text-red-400'
                            : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-red-400'
                            }`}
                    >
                        <div className="text-center">
                            <div className="text-2xl mb-2">📄</div>
                            <div className="font-medium">PDF Document</div>
                        </div>
                    </Button>
                    <Button
                        onClick={() => setSubmissionType('excel')}
                        className={`p-4 border-2 rounded-lg transition-all ${submissionType === 'excel'
                            ? 'border-green-500 bg-green-500/20 text-green-400'
                            : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-green-400'
                            }`}
                    >
                        <div className="text-center">
                            <div className="text-2xl mb-2">📊</div>
                            <div className="font-medium">Excel File</div>
                        </div>
                    </Button>
                </div>
            </div>

            {/* File Upload */}
            {submissionType && (
                <div>
                    <h5 className="text-white font-semibold mb-3">Upload Your File</h5>
                    <FileUpload
                        onChange={onFileSelect}
                        disabled={uploading}
                        acceptedTypes={submissionType === 'pdf' ? '.pdf' : '.xlsx,.xls,.csv'}
                    />
                    {selectedFile && (
                        <div className="mt-2 p-3 bg-gray-700/50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">
                                    {submissionType === 'pdf' ? '📄' : '📊'}
                                </span>
                                <span className="text-white font-medium">{selectedFile.name}</span>
                                <span className="text-gray-400 text-sm">
                                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Button
                    onClick={onSubmit}
                    disabled={!submissionType || !selectedFile || uploading}
                    className="flex-1 btn-primary btn-md min-h-[48px]"
                >
                    {uploading ? (
                        <>
                            <span className="mr-2">⏳</span>
                            Submitting...
                        </>
                    ) : (
                        <>
                            <span className="mr-2">📤</span>
                            Submit Task
                        </>
                    )}
                </Button>
                <Button
                    onClick={onCancel}
                    className="sm:px-6 bg-gray-600 hover:bg-gray-500 text-white py-3 min-h-[48px]"
                >
                    Cancel
                </Button>
            </div>
        </div>
    );
};