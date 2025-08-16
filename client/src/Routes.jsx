import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import SignUpPage from './pages/SignUpPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import LearningDashboardPage from './pages/LearningDashboardPage.jsx';
import AssessmentPage from './pages/AssessmentPage.jsx';

import ProtectedRoute from './components/auth/ProtectedRoute.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/signin" element={<AuthPage />} />
      <Route path="/auth/signup" element={<SignUpPage />} />
      <Route path="/about" element={<AboutPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <TasksPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/learning-dashboard"
        element={
          <ProtectedRoute>
            <LearningDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assessment"
        element={
          <ProtectedRoute>
            <AssessmentPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<HomePage />} />
    </Routes>
  );
} 