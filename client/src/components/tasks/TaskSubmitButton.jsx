import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { useTasks } from "../../contexts/TasksContext";
import FileUpload from "./FileUpload";


export const TaskSubmitButton = ({
  task,
  className = "",
  onSubmissionStart,
  onSubmissionComplete,
  expandedTask,
  setExpandedTask,
  showSubmissionForm = false,
}) => {
  const { submitTask, viewTaskSubmission, downloadTaskSubmission, loading } =
    useTasks();
  const [submissionType, setSubmissionType] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState("");
  const [showRetry, setShowRetry] = useState(false);

  // Timer functionality
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && startTime) {
      interval = setInterval(() => {
        setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else if (!isTimerRunning) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, startTime]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startTimer = () => {
    setStartTime(Date.now() - timeSpent * 1000);
    setIsTimerRunning(true);
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    const extension = file.name.split(".").pop().toLowerCase();
    if (["pdf"].includes(extension)) {
      setSubmissionType("pdf");
    } else if (["xlsx", "xls", "csv"].includes(extension)) {
      setSubmissionType("excel");
    }
  };

  const handleSubmit = async () => {
    if (!submissionType || !selectedFile) {
      alert("Please select a submission type and upload a file");
      return;
    }

    // Ensure we have a valid taskId
    const taskId = task?.id || task?._id;
    if (!taskId) {
      console.error("[TaskSubmitButton] No valid taskId found:", task);
      alert("Task ID not found. Please refresh the page and try again.");
      return;
    }

    setSubmitting(true);
    setSubmissionStep("Preparing submission...");
    setShowRetry(false);

    try {
      if (onSubmissionStart) onSubmissionStart();

      setSubmissionStep("Uploading file...");

      await submitTask({
        taskId: taskId,
        submissionType,
        file: selectedFile,
        timeSpent,
        task: task,
      });

      setSubmissionStep("Finalizing...");

      // Reset form
      setSubmissionType("");
      setSelectedFile(null);
      setTimeSpent(0);
      setIsTimerRunning(false);
      setStartTime(null);

      // Close the expanded task view
      if (setExpandedTask) {
        setExpandedTask(null);
      }

      setSubmissionStep("Complete!");
      
      // Notify parent component that submission is complete
      if (onSubmissionComplete) {
        await onSubmissionComplete(taskId);
      }
    } catch (error) {
      setSubmissionStep("");
      setShowRetry(true);

      console.error("[TaskSubmitButton] Submission failed:", {
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
      });

      // Provide specific error messages based on error type
      let errorMessage = "Please try again.";
      if (error.message.includes("File upload failed")) {
        errorMessage =
          "File upload failed. Please check your internet connection and try again.";
      } else if (error.message.includes("Task update failed")) {
        errorMessage = "Task could not be updated. Please try again.";
      } else if (error.message.includes("Network Error")) {
        errorMessage =
          "Network error. Please check your connection and try again.";
      } else if (error.response?.status === 401) {
        errorMessage = "Authentication failed. Please log in again.";
      } else if (error.response?.status === 404) {
        errorMessage = "Task not found. Please refresh the page and try again.";
      } else if (error.response?.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      alert(`Failed to submit task: ${errorMessage}`);
    } finally {
      setSubmitting(false);
      setSubmissionStep("");
    }
  };

  const handleViewSubmission = async () => {
    try {
      if (task.submissionFile || task.data?.submissionFile) {
        // Use the viewTaskSubmission function from TasksContext
        await viewTaskSubmission(task.id);
      } else {
        alert("No submission file found for this task.");
      }
    } catch (error) {
      console.error("[TaskSubmitButton] Failed to view submission:", error);

      // Show user-friendly error message
      const errorMessage = error.message || "Failed to view submission file.";
      alert(`Unable to open submission file: ${errorMessage}`);
    }
  };

  const handleButtonClick = () => {
    if (task.status === "completed" && (task.submissionFile || task.data?.submissionFile)) {
      handleViewSubmission();
    } else {
      // Expand the task to show submission form
      if (setExpandedTask) {
        setExpandedTask(expandedTask === task.id ? null : task.id);
      }
    }
  };

  // Determine button text and style
  const isCompleted = task.status === "completed" && (task.submissionFile || task.data?.submissionFile);
  const buttonText = isCompleted ? "View Submission" : "Submit Task";
  const buttonStyle = isCompleted
    ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400"
    : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400";

  // Only show the submission form if this task is expanded and we're in submission mode
  const shouldShowForm =
    showSubmissionForm && expandedTask === task.id && !isCompleted;

  return (
    <>
      {/* Only show the main button when form is not displayed */}
      {!shouldShowForm && (
        <Button
          onClick={handleButtonClick}
          disabled={loading || submitting}
          className={`${buttonStyle} text-white transition-all duration-300 shadow-lg ${className}`}
        >
          {submitting ? (
            <>
              <span className="mr-2 animate-spin">⏳</span>
              Submitting...
            </>
          ) : (
            <>
              <span className="mr-2">{isCompleted ? "👁️" : "🚀"}</span>
              {buttonText}
            </>
          )}
        </Button>
      )}

      {/* Submission Form - Only shown when task is expanded */}
      {shouldShowForm && (
        <div className="w-full bg-gray-800/90 rounded-xl p-4 space-y-4 animate-fadeIn border border-gray-700/50">
          {/* Compact Header */}
          <div className="text-center pb-2 border-b border-gray-700/50">
            <h4 className="text-lg font-semibold text-white">Submit Task</h4>
          </div>



          {/* Compact File Type Selection */}
          <div>
            <h5 className="text-white font-medium mb-2 flex items-center gap-2">
              <span>📋</span>
              File Type
            </h5>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => setSubmissionType("pdf")}
                className={`p-3 border rounded-lg transition-all text-center ${
                  submissionType === "pdf"
                    ? "border-red-500 bg-red-500/20 text-red-400"
                    : "border-gray-600 bg-gray-700/50 text-gray-300 hover:border-red-400"
                }`}
              >
                <div className="text-lg mb-1">📄</div>
                <div className="text-sm font-medium">PDF</div>
              </Button>
              <Button
                onClick={() => setSubmissionType("excel")}
                className={`p-3 border rounded-lg transition-all text-center ${
                  submissionType === "excel"
                    ? "border-green-500 bg-green-500/20 text-green-400"
                    : "border-gray-600 bg-gray-700/50 text-gray-300 hover:border-green-400"
                }`}
              >
                <div className="text-lg mb-1">📊</div>
                <div className="text-sm font-medium">Excel</div>
              </Button>
            </div>
          </div>

          {/* Compact File Upload */}
          {submissionType && (
            <div className="animate-fadeIn">
              <h5 className="text-white font-medium mb-2 flex items-center gap-2">
                <span>📁</span>
                Upload File
              </h5>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <FileUpload
                  onChange={handleFileSelect}
                  disabled={submitting}
                  acceptedTypes={
                    submissionType === "pdf" ? ".pdf" : ".xlsx,.xls,.csv"
                  }
                />
                {selectedFile && (
                  <div className="mt-2 p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-lg">
                        {submissionType === "pdf" ? "📄" : "📊"}
                      </span>
                      <div className="flex-1">
                        <div className="text-white font-medium">
                          {selectedFile.name}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                      <span className="text-green-400">✅</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Compact Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-gray-700/50">
            <Button
              onClick={handleSubmit}
              disabled={!submissionType || !selectedFile || submitting}
              className="flex-1 btn-primary btn-md"
            >
              {submitting ? (
                <>
                  <span className="mr-2 animate-spin">⏳</span>
                  {submissionStep || "Submitting..."}
                </>
              ) : showRetry ? (
                <>
                  <span className="mr-2">🔄</span>
                  Retry
                </>
              ) : (
                <>
                  <span className="mr-2">🚀</span>
                  Submit
                </>
              )}
            </Button>
            <Button
              onClick={() => setExpandedTask && setExpandedTask(null)}
              className="px-4 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-lg"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
