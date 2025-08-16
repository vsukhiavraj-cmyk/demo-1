import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { useTasks } from '../../contexts/TasksContext';
import FileUpload from './FileUpload';

export const AITaskSubmitButton = ({ task, className = "", onSubmissionComplete }) => {
  const { submitTask, viewTaskSubmission, loading } = useTasks();
  
  // Submission form states
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [submissionType, setSubmissionType] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Timer functionality
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && startTime) {
      interval = setInterval(() => {
        setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else if (!isTimerRunning) {
      clearInterval(interval