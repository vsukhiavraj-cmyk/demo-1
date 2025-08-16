import { GoogleGenerativeAI } from "@google/generative-ai";
import catchAsync from "../utils/catchAsync.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import { calculateTaskRequirements } from "../utils/taskCalculations.js";

// This helper function is no longer the primary defense but is kept for basic cleanup.
function validateAndSanitizeTasksResponse(data) {
  try {
    if (!data || typeof data !== "object")
      throw new Error("Response is not a valid object");
    if (!Array.isArray(data.tasks)) data.tasks = [];
    // Basic sanitization can remain
    return data;
  } catch (error) {
    console.error("Error validating tasks response:", error.message);
    return {
      tasks: [],
      recommendations: [],
      estimatedDuration: "Not specified",
    };
  }
}

let genAI;
try {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY not found in environment variables");
  } else {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log("Gemini AI initialized successfully");
  }
} catch (error) {
  console.error("Failed to initialize Gemini AI:", error.message);
}

// UPDATED AI PROMPT FOR ROADMAP GENERATION
function generateRoadmapPrompt(context) {
  const { userProfile, timeframe } = context;
  const taskRequirements = calculateTaskRequirements(timeframe, userProfile);

  return `
You are an expert learning path designer. Your task is to generate a personalized learning roadmap as a single, clean JSON object.

**CONTEXT:**
- **User Profile:** ${JSON.stringify(userProfile)}
- **Learning Path:** ${context.learningPath}
- **Timeframe:** ${timeframe} months

**CRITICAL REQUIREMENTS:**
1.  **Calculate Success Prediction:** Based on the user's profile (experienceLevel, timeCommitment, motivation), calculate a successPrediction score between 0.0 and 1.0. A strong profile (higher scores) should result in a higher prediction.
2.  **Determine Personalized Schedule:** Based on the user's profile, determine the optimal dailyHours, sessionsPerDay, and weeklyStructure. You MUST use these pre-calculated values based on their assessment: dailyHours=${
    taskRequirements.dailyHours
  }, sessionsPerDay=${
    Math.round(taskRequirements.dailyHours / 1.5) || 1
  }, studyDays=${taskRequirements.daysPerWeek}.
3.  **Create Learning Phases:** Create EXACTLY ${Math.max(
    3,
    Math.min(6, timeframe)
  )} learning phases.
4.  **Durations Must Be Numbers:** "totalDuration" and each phase "duration" MUST be numbers, and their sum must equal the total timeframe.
5.  **Resource Quality**: All resource URLs must be real, working links.
6.  **OUTPUT JSON ONLY:** Your entire response must be ONLY the JSON object, starting with { and ending with }. Do not include any other text, explanations, markdown, or comments.

**JSON OUTPUT FORMAT:**
{
  "title": "Personalized Learning Roadmap",
  "description": "A learning journey tailored to your goals.",
  "totalDuration": ${timeframe},
  "successPrediction": 0.88,
  "personalizedSchedule": {
    "dailyHours": ${taskRequirements.dailyHours},
    "sessionsPerDay": ${Math.round(taskRequirements.dailyHours / 1.5) || 1},
    "weeklyStructure": { "studyDays": ${
      taskRequirements.daysPerWeek
    }, "restDays": ${7 - taskRequirements.daysPerWeek} }
  },
  "phases": [
    {
      "phase": 1,
      "title": "Phase 1 Title",
      "description": "Phase 1 description.",
      "duration": 1,
      "topics": ["Topic 1"],
      "projects": ["Project 1"],
      "resources": [
        { "type": "documentation", "title": "Resource Title", "url": "https://example.com" }
      ]
    }
  ]
}
`;
}

// UPDATED AI PROMPT FOR TASK GENERATION
function generateAIPrompt(context) {
  const { totalDays, userProfile, roadmap } = context;
  const taskRequirements = calculateTaskRequirements(
    Math.round(totalDays / 30),
    userProfile
  );
  const { minTasks: expectedMinTasks } = taskRequirements;
  const numPhases = roadmap.phases.length || 4;

  return `
You are an expert curriculum designer. Your task is to generate a personalized set of tasks based on a pre-defined roadmap and user profile.

**CONTEXT:**
- **User Profile:** ${JSON.stringify(userProfile)}
- **Learning Goal:** ${context.goal?.field || "Not specified"}
- **Timeline:** ${totalDays} days
- **Personal Needs:** ${context.personalNeeds || "Not specified"}
- **Roadmap to Follow:** ${JSON.stringify(roadmap)}
- **Personalized Daily Schedule:** You MUST design tasks to fit into a schedule of ${
    roadmap.personalizedSchedule.dailyHours
  } hours per day.

**🚨 CRITICAL INSTRUCTIONS - FOLLOW EXACTLY 🚨**

**1. TASK COUNT CALCULATION (80% Rule):**
You MUST generate a minimum number of tasks based on this formula:
- **Formula**: Minimum Tasks = ${totalDays} (Total Days) × 0.8
- **Calculation**: ${totalDays} × 0.8 = ${expectedMinTasks} tasks.
- **YOU MUST GENERATE AT LEAST ${expectedMinTasks} TASKS.**

**2. INTELLIGENT DAILY TASK SIZING:**
- The user's daily study commitment is ${
    roadmap.personalizedSchedule.dailyHours
  } hours.
- **You MUST size tasks accordingly.** For example, for a 3-hour commitment, you could generate ONE complex 3-hour task, OR TWO 1.5-hour tasks. Use your judgment based on the topic's difficulty.
- The 'estimatedTime' for each task must be a single **number** (e.g., 1.5, 2, 3).

**3. PHASE & TOPIC ADHERENCE:**
- Distribute the tasks across all ${numPhases} phases as defined in the provided roadmap.
- Ensure all topics listed in each phase of the roadmap are covered by the tasks. **NO EMPTY PHASES.**

**4. TASK QUALITY & STRUCTURE:**
- Every task must have a unique title, detailed description, and clear submission requirements.
- Every task MUST include 4-6 diverse, REAL, and WORKING URLs for resources.
- The quality must be consistent from the first task to the last.

**5. OUTPUT JSON ONLY:** Your entire response must be ONLY the JSON object, starting with { and ending with }. Do not include any other text, explanations, markdown, or comments.

**JSON OUTPUT FORMAT (Strictly adhere to this structure):**
{
  "tasks": [
    {
      "title": "Specific Task Title",
      "description": "Overview of the task.",
      "taskInstructions": "1. First step...",
      "submissionRequirements": { "format": "PDF", "deliverables": ["Deliverable 1"]},
      "type": "learning",
      "phase": 1,
      "sequenceOrder": 1,
      "difficulty": 3,
      "estimatedTime": 1.5,
      "priority": "medium",
      "status": "queued",
      "topics": ["Relevant Topic 1"],
      "resources": [
        {"type": "documentation", "title": "Official Docs", "url": "https://example.com"}
      ],
      "realWorldApplication": "How this skill is used.",
      "successCriteria": ["Measurable success criterion."]
    }
  ]
}
`;
}

/**
 * Reusable helper to generate a personalized roadmap from the AI.
 * @param {object} context - The context for the AI prompt.
 * @returns {Promise<object>} - The generated roadmap object.
 */
export const generateRoadmapForContext = async (context) => {
  if (!genAI)
    throw new ErrorResponse("Gemini AI is not properly initialized.", 500);

  const prompt = generateRoadmapPrompt(context);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  console.log("Making request to AI for roadmap generation...");
  const response = await model.generateContent(prompt);
  let jsonText = response.response.text();

  // --- LOGGING FOR DEBUGGING ---
  console.log("=== RAW AI ROADMAP RESPONSE ===\n", jsonText);

  // --- ROBUST JSON EXTRACTION ---
  const firstBrace = jsonText.indexOf("{");
  const lastBrace = jsonText.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error("AI response did not contain a valid JSON object.");
  }
  jsonText = jsonText.substring(firstBrace, lastBrace + 1);
  console.log("=== CLEANED ROADMAP JSON ===\n", jsonText);

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("AI roadmap response failed to parse:", error.message);
    throw new Error(`AI roadmap response is not valid JSON: ${error.message}`);
  }
};

/**
 * Reusable helper to generate tasks based on a context (which now includes a roadmap).
 * @param {object} context - The context for the AI prompt.
 * @returns {Promise<object>} - The generated tasks object.
 */
export const generateTasksForContext = async (context) => {
  if (!genAI)
    throw new ErrorResponse("Gemini AI is not properly initialized.", 500);

  const prompt = generateAIPrompt(context);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  console.log("Making request to AI for task generation...");
  const response = await model.generateContent(prompt);
  let jsonText = response.response.text();

  // --- LOGGING FOR DEBUGGING ---
  console.log("=== RAW AI TASK RESPONSE ===\n", jsonText);

  // --- ROBUST JSON EXTRACTION ---
  const firstBrace = jsonText.indexOf("{");
  const lastBrace = jsonText.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error("AI response did not contain a valid JSON object.");
  }
  jsonText = jsonText.substring(firstBrace, lastBrace + 1);
  console.log("=== CLEANED TASK JSON ===\n", jsonText);

  try {
    const parsedData = JSON.parse(jsonText);
    // The validation function is no longer strictly needed with robust extraction, but can be kept for sanitizing fields
    return parsedData;
  } catch (error) {
    console.error("AI task response failed to parse:", error.message);
    throw new Error(`AI task response is not valid JSON: ${error.message}`);
  }
};

// The API endpoint controllers are now wrappers for the above helpers
export const generateRoadmapWithAI = catchAsync(async (req, res) => {
  const roadmap = await generateRoadmapForContext(req.body);
  res.status(200).json({ success: true, data: roadmap });
});

export const generateTasksWithAI = catchAsync(async (req, res) => {
  const tasks = await generateTasksForContext(req.body);
  res.status(200).json({ success: true, data: tasks });
});
