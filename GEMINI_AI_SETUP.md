# Gemini AI Integration Setup

## Overview

This project now uses Google's Gemini AI API to generate real-world tasks based on assessment data, goal setup, and roadmap steps.

## Setup Instructions

### 1. Get Gemini AI API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

### 2. Environment Variables

Add the following to your `.env` file in the server directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Features

#### AI-Powered Task Generation

- Generates personalized tasks based on:
  - User assessment data
  - Goal setup information
  - Current learning phase
  - User profile and preferences

#### Real-World Applications

- Tasks include real-world scenarios
- Practical project suggestions
- Industry-relevant exercises

#### Smart Recommendations

- Personalized learning recommendations
- Study tips based on progress
- Motivation and encouragement

### 4. API Endpoints

#### Generate Tasks

```
POST /api/ai/generate-tasks
```

Body:

```json
{
  "assessmentData": {...},
  "goalSetup": {...},
  "roadmapSteps": [...],
  "currentPhase": 1,
  "userProfile": {...},
  "learningPath": "ai-ml"
}
```

#### Generate Recommendations

```
POST /api/ai/recommendations
```

Body:

```json
{
  "userProfile": {...},
  "progressData": {...},
  "currentTasks": [...]
}
```

### 5. Fallback System

If the AI service is unavailable, the system automatically falls back to local task generation to ensure uninterrupted learning.

### 6. Error Handling

- Graceful degradation when AI is unavailable
- Detailed error logging
- User-friendly error messages

## Benefits

- **Personalized Learning**: Tasks tailored to individual needs
- **Real-World Focus**: Practical, applicable learning experiences
- **Adaptive Content**: Content adjusts based on progress and preferences
- **Scalable**: Can handle multiple learning paths and user types
