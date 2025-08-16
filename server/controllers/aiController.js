import { GoogleGenerativeAI } from "@google/generative-ai";
import catchAsync from "../utils/catchAsync.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import { calculateTaskRequirements } from "../utils/taskCalculations.js";

// JSON sanitization functions to handle AI response formatting issues
function sanitizeJsonResponse(jsonText) {
  try {
    let original = jsonText;

    // Step 1: Remove markdown code blocks if present
    if (jsonText.includes("```json")) {
      jsonText = jsonText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    }

    // Step 2: Remove any other markdown code blocks
    jsonText = jsonText.replace(/```[\s\S]*?```/g, '').trim();

    // Step 3: Extract JSON content between first { and last }
    const firstBrace = jsonText.indexOf('{');
    const lastBrace = jsonText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonText = jsonText.substring(firstBrace, lastBrace + 1);
    }

    // Step 4: Remove comments first (before other processing)
    jsonText = jsonText.replace(/\/\/.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments

    // Step 5: Handle control characters and line breaks carefully
    let inString = false;
    let escaped = false;
    let result = '';

    for (let i = 0; i < jsonText.length; i++) {
      const char = jsonText[i];
      const charCode = char.charCodeAt(0);

      // Track if we're inside a string
      if (char === '"' && !escaped) {
        inString = !inString;
      }
      escaped = (char === '\\' && !escaped);

      // Handle control characters
      if (charCode >= 0 && charCode <= 31 && charCode !== 9) { // Control chars except tab
        if (inString) {
          // Inside string: replace with space
          result += ' ';
        } else {
          // Outside string: remove completely
          continue;
        }
      } else {
        result += char;
      }
    }

    jsonText = result;

    // Step 6: Clean up whitespace
    jsonText = jsonText.replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();

    // Step 7: Fix trailing commas and other JSON issues (URL-aware)
    jsonText = jsonText.replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
      .replace(/,\s*,/g, ',') // Remove duplicate commas
      // Advanced URL preservation before general cleanup
      .replace(/"url":\s*"https:\s*\/\/([^"]*?)"/g, '"url": "https://$1"') // Fix https:// splits
      .replace(/"url":\s*"http:\s*\/\/([^"]*?)"/g, '"url": "http://$1"') // Fix http:// splits
      .replace(/"url":\s*"https:\s*([^"]*?)"/g, '"url": "https://$1"') // Fix https: splits
      .replace(/"url":\s*"http:\s*([^"]*?)"/g, '"url": "http://$1"') // Fix http: splits
      .replace(/"url":\s*"\/\/([^"]*?)"/g, '"url": "https://$1"') // Fix protocol-less URLs
      .replace(/"url":\s*"www\.([^"]*?)"/g, '"url": "https://www.$1"') // Fix www URLs
      // Fix broken URLs that became null
      .replace(/"url":\s*"https:\s*null"/g, '"url": ""')
      .replace(/"url":\s*"http:\s*null"/g, '"url": ""')
      .replace(/"url":\s*null/g, '"url": ""')
      // General cleanup (but preserve URLs)
      .replace(/:\s*,(?!\s*["}])/g, ': "",') // Replace empty values with empty string
      .replace(/:\s*([}\]])/g, ': ""$1'); // Replace missing values with empty string

    return jsonText;
  } catch (error) {
    console.error('Error in sanitizeJsonResponse:', error.message);
    return jsonText; // Return original if sanitization fails
  }
}

function aggressiveJsonCleanup(jsonText) {
  try {
    // More aggressive cleanup for stubborn cases
    let cleaned = jsonText;
    // Remove any non-printable characters except newlines and tabs
    cleaned = cleaned.replace(/[^\x20-\x7E\n\t]/g, '');

    // Advanced URL preservation and fixing
    // Fix broken URLs with various patterns
    cleaned = cleaned.replace(/"url":\s*"https:\s*null"/g, '"url": ""');
    cleaned = cleaned.replace(/"url":\s*"http:\s*null"/g, '"url": ""');

    // Fix URLs that got split by sanitization
    cleaned = cleaned.replace(/"url":\s*"https:\s*\/\/([^"]*?)"/g, '"url": "https://$1"');
    cleaned = cleaned.replace(/"url":\s*"http:\s*\/\/([^"]*?)"/g, '"url": "http://$1"');
    cleaned = cleaned.replace(/"url":\s*"https:\s*([^"]*?)"/g, '"url": "https://$1"');
    cleaned = cleaned.replace(/"url":\s*"http:\s*([^"]*?)"/g, '"url": "http://$1"');

    // Fix URLs that lost their protocol
    cleaned = cleaned.replace(/"url":\s*"\/\/([^"]*?)"/g, '"url": "https://$1"');
    cleaned = cleaned.replace(/"url":\s*"www\.([^"]*?)"/g, '"url": "https://www.$1"');

    // Fix URLs that got truncated
    cleaned = cleaned.replace(/"url":\s*"([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^"]*?)"/g, (match, url) => {
      if (!url.startsWith('http')) {
        return `"url": "https://${url}"`;
      }
      return match;
    });

    // Fix malformed strings by ensuring proper escaping
    cleaned = cleaned.replace(/\\(?!["\\/bfnrt])/g, '\\\\'); // Escape backslashes

    // Rebuild the JSON structure by extracting key-value pairs
    const lines = cleaned.split('\n');
    const cleanedLines = lines.map(line => {
      // Remove any line that doesn't look like valid JSON
      if (line.trim() === '' || line.trim().startsWith('//')) {
        return '';
      }

      // Fix common string value issues
      line = line.replace(/:\s*([^",{\[\]}\s][^",{\[\]}\n]*?)(\s*[,}\]])/g, (match, value, ending) => {
        // Don't quote numbers, booleans, null, or objects/arrays
        if (/^(\d+\.?\d*|true|false|null|\{|\[)/.test(value.trim())) {
          return `: ${value.trim()}${ending}`;
        }
        // Quote string values
        return `: "${value.trim()}"${ending}`;
      });

      return line;
    }).filter(line => line.trim() !== '');

    cleaned = cleanedLines.join('\n');

    // Final cleanup
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
      .replace(/([}\]]),(\s*[}\]])/g, '$1$2'); // Remove commas before closing brackets

    return cleaned;
  } catch (error) {
    console.error('Error in aggressiveJsonCleanup:', error.message);
    return jsonText; // Return original if cleanup fails
  }
}

// Validate and sanitize the parsed JSON structure
function validateAndSanitizeTasksResponse(data) {
  try {
    // Ensure required structure exists
    if (!data || typeof data !== 'object') {
      throw new Error('Response is not a valid object');
    }

    // Ensure tasks array exists
    if (!Array.isArray(data.tasks)) {
      console.warn('Tasks array missing or invalid, creating empty array');
      data.tasks = [];
    }

    // Sanitize each task
    data.tasks = data.tasks.map((task, index) => {
      const sanitizedTask = {
        id: task.id || `task-${index + 1}`,
        title: String(task.title || `Task ${index + 1}`),
        description: String(task.description || ''),
        type: task.type || 'learning',
        phase: Number(task.phase) || 1,
        sequenceOrder: Number(task.sequenceOrder) || index + 1,
        difficulty: Math.min(5, Math.max(1, Number(task.difficulty) || 1)),
        estimatedHours: String(task.estimatedHours || '1-2 hours'),
        priority: task.priority || 'medium',
        status: task.status || 'queued',
        topics: Array.isArray(task.topics) ? task.topics : [],
        resources: Array.isArray(task.resources) ? task.resources.map(resource => ({
          type: resource.type || 'article',
          title: String(resource.title || ''),
          url: String(resource.url || '')
        })) : [],
        realWorldApplication: String(task.realWorldApplication || ''),
        successCriteria: Array.isArray(task.successCriteria) ? task.successCriteria : [],
        prerequisites: Array.isArray(task.prerequisites) ? task.prerequisites : [],
        unlockConditions: String(task.unlockConditions || '')
      };
      return sanitizedTask;
    });

    // Ensure other required fields
    data.recommendations = Array.isArray(data.recommendations) ? data.recommendations : [];
    data.estimatedDuration = String(data.estimatedDuration || 'Not specified');

    return data;
  } catch (error) {
    console.error('Error validating tasks response:', error.message);
    // Return minimal valid structure
    return {
      tasks: [],
      recommendations: [],
      estimatedDuration: 'Not specified'
    };
  }
}

// Request throttling to prevent rate limits
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 5000; // 5 seconds between requests

const throttleRequest = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    console.log(`Throttling request: waiting ${waitTime}ms to prevent rate limits`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
};

// Initialize Gemini AI with error handling
let genAI;
try {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not found in environment variables');
  } else {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('Gemini AI initialized successfully');
  }
} catch (error) {
  console.error('Failed to initialize Gemini AI:', error.message);
}

// Helper function to implement retry logic with exponential backoff
const retryWithBackoff = async (fn, maxRetries = 10, baseDelay = 5000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // Check if it's a 429 rate limit error
      if (error.status === 429 && attempt < maxRetries) {
        // Check if it's a daily quota limit (don't retry these)
        if (error.message && (error.message.includes('quota') || error.message.includes('QuotaFailure') || error.message.includes('free_tier_requests'))) {
          console.error(`🚨 DAILY QUOTA EXCEEDED: ${error.message}`);
          console.error(`💡 You've hit Google's daily API limit. Please wait 24 hours or upgrade your API plan.`);
          throw new Error(`Daily API quota exceeded. Please try again tomorrow or upgrade your API plan.`);
        }

        const delay = Math.min(60000, baseDelay * Math.pow(2, attempt - 1)); // Cap at 60 seconds
        console.log(`🚦 Rate limit hit (429). Waiting ${delay}ms before retry... (Attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Check if it's a 503 Service Unavailable error
      if (error.status === 503 && attempt < maxRetries) {
        const delay = Math.max(baseDelay * Math.pow(2, attempt - 1), 5000); // Minimum 5s for 503 errors
        console.log(`Gemini API overloaded (503). Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Check for other retryable errors (500 server error)
      if (error.status === 500 && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Server error (500). Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // If it's the last attempt or non-retryable error, throw it
      throw error;
    }
  }
};

// Rate limiting storage
const rateLimitStore = new Map();
const MAX_REQUESTS_PER_WINDOW = 5; // 5 requests per window (more conservative)
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window

// Simple rate limiting function
function checkRateLimit(userId) {
  const now = Date.now();
  const userKey = userId || 'anonymous';

  if (!rateLimitStore.has(userKey)) {
    rateLimitStore.set(userKey, []);
  }

  const userRequests = rateLimitStore.get(userKey);
  // Remove old requests outside the window
  const recentRequests = userRequests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  rateLimitStore.set(userKey, recentRequests);

  // Check if user has exceeded the limit
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return false; // Rate limited
  }

  // Add current request
  recentRequests.push(now);
  rateLimitStore.set(userKey, recentRequests);

  return true; // Allow request
}

// Helper function to get task complexity guidance based on user profile
function getTaskComplexityGuidance(taskRequirements) {
  const { taskComplexity, avgHoursPerTask, experienceLevel, timeCommitment } = taskRequirements;
  switch (taskComplexity) {
    case "Expert":
      return `- Create comprehensive PROJECT-BASED tasks (${avgHoursPerTask} hours each)
- Combine 5-7 related concepts into single, complex challenges
- Include full development lifecycle: planning, implementation, testing, deployment
- Integrate multiple technologies and real-world constraints
- Focus on system design, architecture decisions, and optimization
- Each task should be a complete mini-project with deliverables`;
    case "Advanced":
      return `- Design INTEGRATED CHALLENGE tasks (${avgHoursPerTask} hours each)
- Combine 3-5 related topics into cohesive learning experiences
- Include both theoretical understanding and practical implementation
- Add real-world scenarios and problem-solving components
- Incorporate best practices, debugging, and optimization
- Each task should have multiple learning objectives and outcomes`;
    case "Intermediate":
      return `- Create FOCUSED SESSION tasks (${avgHoursPerTask} hours each)
- Combine 2-3 related concepts for deeper understanding
- Balance theory with hands-on practice and exercises
- Include guided projects and structured problem-solving
- Add code reviews, testing, and documentation components
- Each task should build practical skills with clear applications`;
    case "Beginner":
      return `- Design GUIDED LEARNING tasks (${avgHoursPerTask} hours each)
- Focus on single concepts with step-by-step progression
- Provide clear instructions, examples, and practice exercises
- Include frequent checkpoints and validation steps
- Add supportive resources and troubleshooting guides
- Each task should build confidence through achievable goals`;
    default:
      return `- Create balanced tasks (${avgHoursPerTask} hours each) appropriate for the user's level`;
  }
}

// Helper function to generate AI prompt for task generation
function generateAIPrompt(context) {
  // ROBUST PARAMETER VALIDATION
  let totalDays = context.totalDays || 30;
  if (isNaN(totalDays) || totalDays <= 0) {
    console.error(`❌ Invalid totalDays value: ${totalDays}. Using default of 30.`);
    totalDays = 30;
  }

  // Ensure userProfile exists with validated values
  const userProfile = context.userProfile || {};
  if (!userProfile.timeCommitment || !userProfile.experienceLevel || !userProfile.consistency) {
    console.warn('⚠️ Missing userProfile values, using defaults');
  }

  // Use the standardized task calculation with user profile
  const timeline = Math.round(totalDays / 30); // Convert back to months for calculation

  let taskRequirements;
  try {
    taskRequirements = calculateTaskRequirements(timeline, userProfile);
  } catch (error) {
    console.error('❌ Error calculating task requirements:', error.message);
    // Fallback to safe defaults
    taskRequirements = {
      minTasks: Math.round(totalDays * 0.8),
      targetTasks: Math.round(totalDays * 0.8 * 1.1),
      recommendedTasks: Math.round(totalDays * 0.8 * 1.2),
      taskComplexity: 'Intermediate',
      avgHoursPerTask: '3-4 hours',
      daysPerWeek: 5,
      dailyHours: 3,
      effectiveStudyDays: Math.round(totalDays * 0.7),
      experienceLevel: 2,
      consistency: 3,
      intensity: 'Moderate'
    };
  }

  const expectedTaskCount = taskRequirements.minTasks;
  const targetTaskCount = taskRequirements.targetTasks;
  const recommendedTaskCount = taskRequirements.recommendedTasks;
  const roadmapPhases = context.roadmap || [];
  const numPhases = roadmapPhases.length || 4;

  // CRITICAL VALIDATION: Ensure expectedTaskCount is valid
  if (!expectedTaskCount || isNaN(expectedTaskCount) || expectedTaskCount <= 0) {
    console.error(`❌ CRITICAL: Invalid expectedTaskCount: ${expectedTaskCount}`);
    throw new Error(`Invalid task count calculation. Expected: ${expectedTaskCount}, TotalDays: ${totalDays}`);
  }

  console.log('🔍 AI PROMPT GENERATION DEBUG:');
  console.log(`   📅 Total Days: ${totalDays}`);
  console.log(`   📊 Expected Task Count: ${expectedTaskCount}`);
  console.log(`   🎯 Target Task Count: ${targetTaskCount}`);
  console.log(`   📈 Recommended Task Count: ${recommendedTaskCount}`);
  console.log(`   🏗️ Number of Phases: ${numPhases}`);
  console.log(`   ⚡ Task Complexity: ${taskRequirements.taskComplexity}`);
  console.log(`   ⏱️ Avg Hours Per Task: ${taskRequirements.avgHoursPerTask}`);
  console.log(`   📚 User Profile:`, JSON.stringify(userProfile, null, 2));
  console.log(`   🗺️ Roadmap Phases:`, JSON.stringify(roadmapPhases, null, 2));

  // Check if this is gap-filling generation
  const isGapFilling = context.gapAnalysis && context.existingTaskCount > 0;
  const gapInfo = isGapFilling ? context.gapAnalysis : null;

  return `You are an expert curriculum designer. A user has provided the following information to create a personalized learning roadmap.

${isGapFilling ? `
🔍 **GAP-FILLING MODE ACTIVATED**
You are generating additional tasks to complete an existing learning roadmap.

**EXISTING TASK ANALYSIS:**
- Current tasks: ${gapInfo.totalExisting}
- Still needed: ${gapInfo.stillNeeded}
- Phase distribution: ${JSON.stringify(gapInfo.phaseDistribution)}
- Underrepresented phases: ${gapInfo.underrepresentedPhases.join(', ')}
- Uncovered topics: ${gapInfo.uncoveredTopics.map(t => `${t.topic} (Phase ${t.phase})`).join(', ')}

**🔥 CRITICAL GAP-FILLING REQUIREMENTS:**
- 🔥 FOCUS ON PHASES: ${gapInfo.underrepresentedPhases.join(', ')} (these need more tasks)
- 🔥 PRIORITIZE UNCOVERED TOPICS: ${gapInfo.uncoveredTopics.map(t => `"${t.topic}" (Phase ${t.phase})`).join(', ')}
- 🔥 EACH UNCOVERED TOPIC MUST GET AT LEAST 1-2 TASKS
- 🔥 AVOID OVER-GENERATING for phases that already have enough tasks
- 🔥 ENSURE BALANCED DISTRIBUTION across all ${numPhases} phases
**🚨 EXACT TASK COUNT CALCULATION FOR GAP-FILLING 🚨:**
- Current tasks already generated: ${gapInfo.totalExisting}
- Total tasks needed: ${gapInfo.totalExisting + gapInfo.stillNeeded}
- EXACT TASKS TO GENERATE NOW: ${gapInfo.stillNeeded}
- Mathematical verification: ${gapInfo.totalExisting} + ${gapInfo.stillNeeded} = ${gapInfo.totalExisting + gapInfo.stillNeeded} total tasks

**🔥🔥🔥 CRITICAL: GENERATE EXACTLY ${gapInfo.stillNeeded} TASKS 🔥🔥🔥**
- NOT 1 task, NOT 3 tasks, NOT 5 tasks - EXACTLY ${gapInfo.stillNeeded} TASKS
- COUNT YOUR TASKS: 1, 2, 3... STOP AT ${gapInfo.stillNeeded}
- VERIFY: Your response must contain exactly ${gapInfo.stillNeeded} task objects
- 🔥 NO TOPIC CAN REMAIN UNCOVERED AFTER THIS GENERATION
` : ''}

**User's Skill Assessment Data:**
${JSON.stringify(context.assessment)}

**Primary Learning Goal:**
${context.goal?.field || 'Not specified'}

**Desired Timeline:**
${totalDays} days (${Math.round(totalDays / 30)} months)

**🚨 CRITICAL TASK GENERATION REQUIREMENTS - MUST BE FOLLOWED EXACTLY 🚨**

**🚨 MATHEMATICAL TASK COUNT CALCULATION - FOLLOW THIS LOGIC EXACTLY �:**

**STEP 1: CALCULATE MINIMUM TASKS REQUIRED**
- Timeline: ${totalDays} calendar days (${Math.round(totalDays / 30)} months)
- Mathematical Formula: MINIMUM TASKS = ${totalDays} days × 0.8 = ${Math.round(totalDays * 0.8)} tasks
- This is the 80% rule: You need at least 80% coverage of the timeline for effective learning

**STEP 2: VERIFY YOUR CALCULATION**
- ${totalDays} × 0.8 = ${Math.round(totalDays * 0.8)} tasks (MINIMUM REQUIRED)
- Target for optimal learning: ${Math.round(totalDays * 0.8 * 1.1)} tasks (10% buffer)
- Never generate fewer than ${Math.round(totalDays * 0.8)} tasks

**🔥🔥🔥 CRITICAL REQUIREMENT 🔥🔥🔥:**
- YOU MUST GENERATE AT LEAST ${Math.round(totalDays * 0.8)} TASKS
- NOT 3 TASKS, NOT 4 TASKS, NOT 10 TASKS - AT LEAST ${Math.round(totalDays * 0.8)} TASKS
- COUNT YOUR TASKS: 1, 2, 3, 4, 5... KEEP COUNTING UNTIL YOU REACH ${Math.round(totalDays * 0.8)} OR MORE
- 🔥 MAINTAIN CONSISTENT QUALITY: Every task must have complete resources, instructions, and requirements

**USER CAPACITY ANALYSIS:**
- USER SCHEDULE: ${taskRequirements.daysPerWeek} days/week, ${taskRequirements.dailyHours}h/day (${taskRequirements.effectiveStudyDays} effective study days)
- USER PROFILE: Experience Level ${taskRequirements.experienceLevel}/5, Consistency ${taskRequirements.consistency}/5
- TASK COMPLEXITY: ${taskRequirements.taskComplexity} level (${taskRequirements.taskType})
- TASK DURATION: Each task should be ${taskRequirements.avgHoursPerTask} hours (${taskRequirements.taskComplexity} complexity)
- WEEKLY PACING: ${taskRequirements.tasksPerWeek} tasks per week to match user's ${taskRequirements.daysPerWeek}-day schedule

**MANDATORY DISTRIBUTION REQUIREMENTS:**
${isGapFilling ? `
- 🔥 FOCUS ON UNDERREPRESENTED PHASES: ${gapInfo.underrepresentedPhases.join(', ')}
- 🔥 PHASE GAPS TO FILL: ${Object.entries(gapInfo.phaseGaps).map(([phase, gap]) => `Phase ${phase} needs ${gap} more tasks`).join(', ')}
- 🔥 PRIORITIZE UNCOVERED TOPICS: ${gapInfo.uncoveredTopics.map(t => `"${t.topic}" in Phase ${t.phase}`).join(', ')}
- 🔥 AVOID OVER-GENERATING for phases that already have sufficient tasks
- 🔥 GENERATE EXACTLY ${gapInfo.stillNeeded} TASKS to balance the distribution
` : `
**� DPHASE DISTRIBUTION CALCULATION 🚨:**
- Total tasks to generate: ${Math.round(totalDays * 0.8)} tasks minimum
- Number of phases: ${numPhases} phases
- Tasks per phase calculation: ${Math.round(totalDays * 0.8)} ÷ ${numPhases} = ~${Math.ceil(Math.round(totalDays * 0.8) / numPhases)} tasks per phase
- Minimum per phase: ${Math.floor(Math.round(totalDays * 0.8) / numPhases)} tasks

**🔥 DISTRIBUTION REQUIREMENTS:**
- 🔥 GENERATE AT LEAST ${Math.round(totalDays * 0.8)} TASKS TOTAL
- 🔥 DISTRIBUTE ACROSS ALL ${numPhases} PHASES EVENLY
- 🔥 EACH PHASE GETS ~${Math.ceil(Math.round(totalDays * 0.8) / numPhases)} TASKS
- 🔥 NO PHASE CAN BE LEFT EMPTY OR UNDER-POPULATED
- 🔥 COVER ALL TOPICS from each phase in the roadmap
`}

**🔥 SPECIFIC PHASE REQUIREMENTS FOR INITIAL GENERATION:**
${!isGapFilling && roadmapPhases.length > 0 ? roadmapPhases.map((phase, index) => `
**Phase ${index + 1}: ${phase.title}**
- Generate ~${Math.ceil(expectedTaskCount / numPhases)} tasks for this phase
- 🔥 MANDATORY TOPICS TO COVER: ${phase.topics ? phase.topics.map(topic => `"${topic}"`).join(', ') : 'All phase topics'}
- 🔥 ENSURE EACH TOPIC GETS AT LEAST 1-2 TASKS
- Duration focus: ${phase.duration} months of the timeline
- Projects to include: ${phase.projects ? phase.projects.join(', ') : 'Phase-appropriate projects'}
- 🔥 NO TOPIC CAN BE SKIPPED OR IGNORED
`).join('') : ''}

**User's Personal Needs & Constraints:**
${context.personalNeeds || 'Not specified'}

**Additional Context:**
- User Profile: ${JSON.stringify(context.userProfile)}
- Goal Setup: ${JSON.stringify(context.goal)}
- Roadmap Phases: ${JSON.stringify(context.roadmap)}
- Learning Path: ${context.learningPath}

## Your Task:
Generate a comprehensive learning roadmap that implements a **GATED SEQUENTIAL TASK SYSTEM** with **INTELLIGENT TASK COMPLEXITY** matching the user's capacity and experience level.

**TASK COMPLEXITY GUIDANCE FOR ${taskRequirements.taskComplexity} LEVEL:**
${getTaskComplexityGuidance(taskRequirements)}

**🔥 MANDATORY RESOURCE QUALITY REQUIREMENTS - EVERY TASK MUST HAVE:**
- **EXACTLY 4-6 DIVERSE RESOURCES PER TASK** - NO EXCEPTIONS
- **RESOURCE DIVERSITY MANDATORY**: documentation, tutorials, examples, videos, articles
- **ALL URLs MUST BE REAL, WORKING, COMPLETE LINKS** to actual content
- **PREFER OFFICIAL DOCUMENTATION** and well-maintained repositories
- **MATCH RESOURCE DIFFICULTY** to user's ${taskRequirements.experienceLevel}/5 experience level
- **FOR YOUTUBE**: Use search URLs like \`https://www.youtube.com/results?search_query=YOUR+SEARCH+TERMS\`
- **QUALITY CONSISTENCY**: Every task gets the same resource quality regardless of generation order

## CRITICAL REQUIREMENTS:

### Timeline Distribution:
- **MANDATORY**: Generate AT LEAST ${expectedTaskCount} tasks for ${totalDays} days.
- **PHASE DISTRIBUTION**: Distribute tasks evenly across ALL ${numPhases} phases.
- **NO EMPTY PHASES**: Every phase MUST have tasks assigned.

### Sequential Design:
- Each task must build upon previous tasks with clear learning dependencies.
- Use "sequenceOrder" field (1, 2, 3, etc.) to define exact completion order.

### 🔥 MANDATORY TASK DESIGN SPECIFICATIONS - EVERY TASK MUST HAVE:
- **INTELLIGENT COMPLEXITY**: Create ${taskRequirements.taskComplexity} level tasks
- **OPTIMAL DURATION**: Each task should be ${taskRequirements.avgHoursPerTask} hours
- **UNIQUE TASK TITLES**: Create specific, descriptive titles (no generic names)
- **CLEAR TASK INSTRUCTIONS**: Provide detailed step-by-step instructions
- **DETAILED SUBMISSION REQUIREMENTS**: Complete format, content, deliverables, criteria
- **CONSISTENT QUALITY**: Every task gets the same level of detail and completeness
- **NO QUALITY DEGRADATION**: Task #1 and Task #${expectedTaskCount} must have identical quality standards
- **PHASE DISTRIBUTION**: Ensure tasks are distributed as: ${!isGapFilling ? `Phase 1: ~${Math.ceil(expectedTaskCount / numPhases)} tasks, Phase 2: ~${Math.ceil(expectedTaskCount / numPhases)} tasks, etc.` : 'Focus on underrepresented phases'}

RESPONSE FORMAT (JSON ONLY - NO MARKDOWN OR EXTRA TEXT):
{
  "tasks": [
    {
      "id": "unique-task-id",
      "title": "Specific, descriptive title",
      "description": "Brief overview of what the user will learn and accomplish",
      "taskInstructions": "Step-by-step instructions: 1. Do this... 2. Then do this... 3. Finally...",
      "submissionRequirements": {
        "format": "PDF",
        "requiredContent": ["Specific item 1", "Specific item 2"],
        "deliverables": ["Main deliverable 1", "Supporting deliverable 2"],
        "evaluationCriteria": ["Quality criterion 1", "Completeness criterion 2"]
      },
      "type": "learning",
      "phase": 1,
      "sequenceOrder": 1,
      "difficulty": 2,
      "estimatedHours": "${taskRequirements.avgHoursPerTask} hours",
      "priority": "medium",
      "status": "queued",
      "topics": ["topic1", "topic2"],
      "resources": [
        {"type": "documentation", "title": "Official Docs", "url": "[https://official-docs-url.com/specific-page](https://official-docs-url.com/specific-page)"},
        {"type": "tutorial", "title": "Step-by-step Tutorial", "url": "[https://tutorial-website.com/specific-tutorial](https://tutorial-website.com/specific-tutorial)"},
        {"type": "github", "title": "Example Repo", "url": "[https://github.com/username/repository-name](https://github.com/username/repository-name)"},
        {"type": "video", "title": "Video Tutorial Search", "url": "[https://www.youtube.com/results?search_query=specific+topic+tutorial](https://www.youtube.com/results?search_query=specific+topic+tutorial)"}
      ],
      "realWorldApplication": "How this applies to real-world scenarios",
      "successCriteria": ["measurable criterion1", "measurable criterion2"],
      "prerequisites": ["previous task topics"],
      "unlockConditions": "What must be completed to unlock this task"
    }
  ],
  "recommendations": [
    {"type": "study_tip", "title": "Recommendation title", "description": "Detailed recommendation"}
  ],
  "estimatedDuration": "Total estimated time for all tasks",
  "totalTasks": ${targetTaskCount}
}

**CRITICAL JSON REQUIREMENTS:**
- ABSOLUTELY NO MARKDOWN: Do not wrap your response in \`\`\`json or\`\`\` code blocks
- PURE JSON ONLY: Your response must be raw JSON that starts with { and ends with }
- NO EXPLANATORY TEXT: Do not add any text before or after the JSON object
- NO COMMENTS: Do not include // or /* */ comments anywhere in the JSON
- NO TRAILING COMMAS: Remove any trailing commas after the last element in arrays or objects
- DOUBLE QUOTES ONLY: ALL strings must use double quotes (""), never single quotes
- PROPER BRACKETS: Ensure all brackets [ ] and braces { } are properly matched and closed
- NO UNESCAPED CHARACTERS: NO unescaped quotes or backslashes within string values
- NO LINE BREAKS: NO line breaks or newlines (\\n) within string values. Replace them with spaces
- DIRECT JSON OUTPUT: Your entire response must be parsable by JSON.parse() without any preprocessing

## 🚨 FINAL VALIDATION CHECKLIST - VERIFY BEFORE RESPONDING 🚨:
CRITICAL REQUIREMENTS - CHECK EACH ONE:
- [ ] 🔥 GENERATED EXACTLY ${expectedTaskCount} OR MORE TASKS (COUNT THEM!)
- [ ] 🔥 TASK COUNT IS AT LEAST ${expectedTaskCount} - RECOUNT IF NECESSARY
${isGapFilling ? `
- [ ] 🔥 FOCUSED ON UNDERREPRESENTED PHASES: ${gapInfo.underrepresentedPhases.join(', ')}
- [ ] 🔥 COVERED MISSING TOPICS: ${gapInfo.uncoveredTopics.map(t => t.topic).join(', ')}
- [ ] 🔥 GENERATED EXACTLY ${gapInfo.stillNeeded} TASKS (NO MORE, NO LESS)
- [ ] 🔥 BALANCED THE PHASE DISTRIBUTION GAPS
` : `
- [ ] 🔥 ALL ${numPhases} PHASES HAVE ADEQUATE TASKS DISTRIBUTED
- [ ] 🔥 EACH PHASE HAS AT LEAST ${Math.floor(expectedTaskCount / numPhases)} TASKS
- [ ] 🔥 TARGET ~${Math.ceil(expectedTaskCount / numPhases)} TASKS PER PHASE ACHIEVED
- [ ] 🔥 ALL PHASE TOPICS FROM ROADMAP ARE COVERED (EACH TOPIC HAS 1-2 TASKS)
- [ ] 🔥 NO PHASE IS OVER-REPRESENTED OR UNDER-REPRESENTED
- [ ] 🔥 NO TOPIC IS SKIPPED OR IGNORED IN ANY PHASE
`}
- [ ] 🔥 EVERY SINGLE TASK HAS 4-6 DIVERSE RESOURCES WITH REAL URLS
- [ ] 🔥 EVERY TASK HAS COMPLETE SUBMISSION REQUIREMENTS
- [ ] 🔥 EVERY TASK HAS DETAILED INSTRUCTIONS AND DESCRIPTIONS
- [ ] 🔥 QUALITY IS CONSISTENT ACROSS ALL TASKS (NO SHORTCUTS!)
- [ ] 🔥 THE ENTIRE RESPONSE IS VALID JSON STARTING WITH { AND ENDING WITH }
- [ ] 🔥 NO MARKDOWN, NO COMMENTS, NO EXTRA TEXT OUTSIDE JSON

**QUALITY CONSISTENCY CHECK:**
- Task #1 quality = Task #${Math.floor(expectedTaskCount / 2)} quality = Task #${expectedTaskCount} quality
- Every task must have the same level of detail, resources, and completeness
- NO TASK SHOULD BE RUSHED OR INCOMPLETE

**FINAL PHASE & TOPIC COVERAGE CHECK:**
${!isGapFilling ? `
- Count tasks per phase: Phase 1: ___ tasks, Phase 2: ___ tasks, Phase 3: ___ tasks, Phase 4: ___ tasks
- Each phase should have ~${Math.ceil(expectedTaskCount / numPhases)} tasks
- If any phase has fewer than ${Math.floor(expectedTaskCount / numPhases)} tasks, ADD MORE TASKS TO THAT PHASE!
- TOPIC COVERAGE CHECK: Ensure each topic in each phase has at least 1-2 tasks
- Count tasks per topic and verify no topic is missed
` : `
- Focus on phases: ${gapInfo ? gapInfo.underrepresentedPhases.join(', ') : 'as specified'}
- Generate exactly ${gapInfo ? gapInfo.stillNeeded : expectedTaskCount} tasks for gap-filling
- PRIORITIZE UNCOVERED TOPICS: ${gapInfo ? gapInfo.uncoveredTopics.map(t => t.topic).join(', ') : 'as specified'}
- Ensure each uncovered topic gets at least 1-2 tasks
`}

**🚨🚨🚨 FINAL CRITICAL VALIDATION - MUST VERIFY BEFORE RESPONDING 🚨🚨🚨**

**MANDATORY TASK COUNT VERIFICATION:**
- [ ] 🔥 I HAVE GENERATED EXACTLY ${expectedTaskCount} OR MORE TASKS
- [ ] 🔥 I COUNTED MY TASKS: 1, 2, 3, 4, 5... UP TO ${expectedTaskCount}+
- [ ] 🔥 MY RESPONSE CONTAINS AT LEAST ${expectedTaskCount} TASK OBJECTS IN THE "tasks" ARRAY
- [ ] 🔥 MATHEMATICAL CHECK: ${totalDays} days × 0.8 = ${Math.round(totalDays * 0.8)} minimum tasks ✓

**PHASE DISTRIBUTION VERIFICATION:**
${!isGapFilling ? `
- [ ] 🔥 PHASE 1 HAS ~${Math.ceil(expectedTaskCount / numPhases)} TASKS
- [ ] 🔥 PHASE 2 HAS ~${Math.ceil(expectedTaskCount / numPhases)} TASKS  
- [ ] 🔥 PHASE 3 HAS ~${Math.ceil(expectedTaskCount / numPhases)} TASKS
- [ ] 🔥 PHASE 4 HAS ~${Math.ceil(expectedTaskCount / numPhases)} TASKS
- [ ] 🔥 NO PHASE IS EMPTY OR HAS FEWER THAN ${Math.floor(expectedTaskCount / numPhases)} TASKS
` : `
- [ ] 🔥 I GENERATED EXACTLY ${gapInfo ? gapInfo.stillNeeded : expectedTaskCount} TASKS (NOT MORE, NOT LESS)
- [ ] 🔥 I FOCUSED ON UNDERREPRESENTED PHASES: ${gapInfo ? gapInfo.underrepresentedPhases.join(', ') : 'as specified'}
- [ ] 🔥 I COVERED ALL UNCOVERED TOPICS: ${gapInfo ? gapInfo.uncoveredTopics.map(t => t.topic).join(', ') : 'as specified'}
`}

**QUALITY VERIFICATION:**
- [ ] 🔥 EVERY TASK HAS 4-6 DIVERSE RESOURCES WITH REAL URLS
- [ ] 🔥 EVERY TASK HAS DETAILED INSTRUCTIONS AND SUBMISSION REQUIREMENTS
- [ ] 🔥 ALL TASK TITLES ARE SPECIFIC AND DESCRIPTIVE (NO "Task 1", "Task 2")
- [ ] 🔥 ALL TASKS HAVE COMPLETE DESCRIPTIONS (20+ CHARACTERS)

**JSON FORMAT VERIFICATION:**
- [ ] 🔥 MY RESPONSE IS PURE JSON (NO MARKDOWN, NO EXTRA TEXT)
- [ ] 🔥 MY RESPONSE STARTS WITH { AND ENDS WITH }
- [ ] 🔥 NO TRAILING COMMAS, NO COMMENTS, NO LINE BREAKS IN STRINGS
- [ ] 🔥 ALL STRINGS USE DOUBLE QUOTES, ALL BRACKETS ARE MATCHED

**🚨 CRITICAL ERROR CHECK 🚨**
IF ANY CHECKBOX ABOVE IS UNCHECKED, I MUST FIX THE ISSUE BEFORE RESPONDING!
IF I HAVE FEWER THAN ${expectedTaskCount} TASKS, I MUST ADD MORE TASKS IMMEDIATELY!
IF ANY PHASE IS UNDER-REPRESENTED, I MUST ADD MORE TASKS TO THAT PHASE!
DO NOT SUBMIT A RESPONSE WITH INSUFFICIENT OR LOW-QUALITY TASKS!`;
}

// Helper function to generate roadmap prompt
function generateRoadmapPrompt(context) {
  return `You are an expert learning path designer. Generate a personalized learning roadmap based on the following context.

CONTEXT:
- User Profile: ${JSON.stringify(context.userProfile)}
- Learning Path: ${context.learningPath}
- Timeframe: ${context.timeframe} months
- Custom Goal: ${context.customGoal || "Not specified"}
- Motivation: ${context.motivation || "Not specified"}

REQUIREMENTS:
1. Create EXACTLY ${Math.max(3, Math.min(6, context.timeframe))} learning phases.
2. Each phase must have a clear focus, topics, projects, and success criteria.
3. The "totalDuration" field MUST be a NUMBER equal to ${context.timeframe}.
4. Each phase "duration" must be a NUMBER, and all phase durations must sum to ${context.timeframe}.
5. All resource URLs must be real, working, complete links. For YouTube, use search URLs.

RESPONSE FORMAT (JSON ONLY - NO MARKDOWN OR EXTRA TEXT):
{
  "title": "Personalized Learning Roadmap",
  "description": "Brief description of the learning journey",
  "totalDuration": ${context.timeframe},
  "successPrediction": 0.85,
  "personalizedSchedule": {
    "dailyHours": 3,
    "sessionsPerDay": 2,
    "breakIntervals": 15,
    "weeklyStructure": {"studyDays": 5, "restDays": 2}
  },
  "phases": [
    {
      "phase": 1,
      "title": "Phase Title",
      "description": "What you'll accomplish in this phase",
      "duration": 1.5,
      "topics": ["Topic 1", "Topic 2"],
      "projects": ["Project 1", "Project 2"],
      "learningObjectives": ["Objective 1", "Objective 2"],
      "successCriteria": ["Criteria 1", "Criteria 2"],
      "resources": [
        {
          "type": "documentation",
          "title": "Resource Title",
          "description": "Brief description of this resource",
          "url": "[https://actual-working-url.com](https://actual-working-url.com)"
        }
      ]
    }
  ]
}

**CRITICAL JSON REQUIREMENTS:**
- ABSOLUTELY NO MARKDOWN: Do not wrap your response in \`\`\`json or\`\`\` code blocks
- PURE JSON ONLY: Your response must be raw JSON that starts with { and ends with }
- NO EXPLANATORY TEXT: Do not add any text before or after the JSON object
- NUMBERS FOR DURATION: The "totalDuration" and phase "duration" fields MUST be numbers, not strings
- NO COMMENTS: Do not include // or /* */ comments anywhere in the JSON
- NO TRAILING COMMAS: Remove any trailing commas after the last element in arrays or objects
- DOUBLE QUOTES ONLY: ALL strings must use double quotes (""), never single quotes
- PROPER BRACKETS: Ensure all brackets [ ] and braces { } are properly matched and closed
- NO UNESCAPED CHARACTERS: NO unescaped quotes or backslashes within string values
- NO LINE BREAKS: NO line breaks or newlines (\\n) within string values. Replace them with spaces
- DIRECT JSON OUTPUT: Your entire response must be parsable by JSON.parse() without any preprocessing

## FINAL VALIDATION CHECKLIST:
Before generating your response, verify:
- [ ] The entire response is a single, valid JSON object.
- [ ] "totalDuration" and all phase "duration" values are NUMBERS.
- [ ] All phase durations add up exactly to "totalDuration".
- [ ] ALL resource URLs are REAL, COMPLETE, and WORKING.
- [ ] There are NO newlines or control characters inside any string value.
- [ ] There are NO trailing commas.
- [ ] The response contains NO markdown or extra text outside the JSON object.`;
}

// Helper function to generate recommendations prompt
function generateRecommendationsPrompt(userProfile, progressData, currentTasks) {
  return `You are an expert learning coach. Generate personalized learning recommendations based on the user's profile and progress.

CONTEXT:
- User Profile: ${JSON.stringify(userProfile)}
- Progress Data: ${JSON.stringify(progressData)}
- Current Tasks: ${JSON.stringify(currentTasks)}

REQUIREMENTS:
1. Analyze the user's progress and identify areas for improvement.
2. Provide specific, actionable recommendations, study tips, and motivational messages.
3. Suggest relevant, high-quality resources with real, working URLs.

RESPONSE FORMAT (JSON ONLY - NO MARKDOWN OR EXTRA TEXT):
{
  "improvementAreas": [
    {
      "area": "area name",
      "description": "what needs improvement",
      "priority": "high",
      "suggestions": ["suggestion 1", "suggestion 2"]
    }
  ],
  "studyTips": [
    {
      "tip": "tip title",
      "description": "detailed explanation",
      "applicableTo": "when to use this tip"
    }
  ],
  "motivation": {
    "message": "encouraging message",
    "nextSteps": ["step 1", "step 2"]
  },
  "resources": [
    {
      "type": "article",
      "title": "resource title",
      "url": "[https://actual-working-url.com](https://actual-working-url.com)",
      "description": "why this resource is helpful"
    }
  ]
}

**CRITICAL JSON REQUIREMENTS:**
- ABSOLUTELY NO MARKDOWN: Do not wrap your response in \`\`\`json or\`\`\` code blocks
- PURE JSON ONLY: Your response must be raw JSON that starts with { and ends with }
- NO EXPLANATORY TEXT: Do not add any text before or after the JSON object
- NO COMMENTS: Do not include // or /* */ comments anywhere in the JSON
- NO TRAILING COMMAS: Remove any trailing commas after the last element in arrays or objects
- DOUBLE QUOTES ONLY: ALL strings must use double quotes (""), never single quotes
- PROPER BRACKETS: Ensure all brackets [ ] and braces { } are properly matched and closed
- NO UNESCAPED CHARACTERS: NO unescaped quotes or backslashes within string values
- NO LINE BREAKS: NO line breaks or newlines (\\n) within string values. Replace them with spaces
- DIRECT JSON OUTPUT: Your entire response must be parsable by JSON.parse() without any preprocessing
- VALID URLS: Ensure all URLs are complete and valid`;
}

// Reusable helper to call Gemini and return structured tasks data (no Express res usage)
export const generateTasksForContext = async (context) => {
  try {
    // Check if API key is configured and AI is initialized
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables");
    }

    if (!genAI) {
      throw new Error("Gemini AI is not properly initialized");
    }

    console.log('🔍 Context received for task generation');

    // Basic parameter setup
    const timeline = Number(context.goal?.timeline || context.timeline || 1);
    const totalDays = context.totalDays || Math.max(30, Math.round(timeline * 30));

    const userProfile = {
      timeCommitment: Number(context.userProfile?.timeCommitment) || 3,
      experienceLevel: Number(context.userProfile?.experienceLevel) || 2,
      consistency: Number(context.userProfile?.consistency || context.userProfile?.focusCapability) || 3,
      ...context.userProfile
    };

    const validatedContext = {
      ...context,
      totalDays,
      userProfile,
      personalNeeds: context.personalNeeds || context.goal?.personalNeeds
    };

    const prompt = generateAIPrompt(validatedContext);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log('Making request to Gemini API...');
    const response = await model.generateContent(prompt, {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    });

    let jsonText = response.response.text().trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const generatedTasks = JSON.parse(jsonText);
    const validatedResponse = validateAndSanitizeTasksResponse(generatedTasks);

    console.log(`✅ Generated ${validatedResponse.tasks.length} tasks`);

    return {
      tasks: validatedResponse.tasks,
      recommendations: validatedResponse.recommendations,
      estimatedDuration: validatedResponse.estimatedDuration,
    };
  } catch (error) {
    console.error('AI task generation failed:', error.message);
    throw new Error(`AI task generation failed: ${error.message}`);
  }
};

// Generate real-world tasks using Gemini AI
export const generateTasksWithAI = catchAsync(async (req, res) => {
  const {
    assessmentData,
    goalSetup,
    roadmapSteps,
    currentPhase,
    userProfile,
    learningPath,
  } = req.body;

  const userId = req.user?.id || 'anonymous';

  // Check rate limit
  if (!checkRateLimit(userId)) {
    throw new ErrorResponse("Too many AI requests. Please wait a minute before trying again.", 429);
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new ErrorResponse(
      "Gemini AI is not configured. Please contact support to enable AI-powered task generation.",
      500
    );
  }

  // Create context for Gemini AI
  const timeline = goalSetup?.timeline || 1; // Get timeline in months
  const totalDays = Math.max(30, Math.round(timeline * 30)); // Convert to days with minimum 30

  const context = {
    userProfile: {
      experienceLevel: userProfile?.experienceLevel || 2,
      timeCommitment: userProfile?.timeCommitment || 3,
      consistency: userProfile?.focusCapability || 3, // Use focusCapability as consistency measure
      learningStyle: userProfile?.preferredStyle || "balanced",
      motivation: userProfile?.motivation || 3,
    },
    assessment: assessmentData,
    goal: goalSetup,
    roadmap: roadmapSteps,
    currentPhase,
    currentDay: 1,
    learningPath,
    totalDays, // Add totalDays to context
  };

  try {
    const generated = await generateTasksForContext(context);
    res.status(200).json({ success: true, data: generated });
  } catch (error) {
    console.error("Gemini AI Error:", error);
    // Provide more specific error messages for common issues
    if (error.status === 503) {
      throw new ErrorResponse("Gemini AI service is temporarily overloaded. Please try again in a few minutes.", 503);
    } else if (error.status === 429) {
      throw new ErrorResponse("Too many requests to Gemini AI. Please wait a moment and try again.", 429);
    } else if (error.message.includes('timeout')) {
      throw new ErrorResponse("AI request timed out. Please try again with a simpler request.", 408);
    } else if (error.message.includes('JSON')) {
      throw new ErrorResponse("AI response format error. Please try again.", 422);
    }

    throw new ErrorResponse("Failed to generate tasks with AI", 500);
  }
});

// Generate roadmap with AI
export const generateRoadmap = catchAsync(async (req, res) => {
  const userId = req.user?.id || 'anonymous';

  // Check rate limit
  if (!checkRateLimit(userId)) {
    throw new ErrorResponse("Too many AI requests. Please wait a minute before trying again.", 429);
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new ErrorResponse(
      "Gemini AI is not configured. Please contact support to enable AI-powered roadmap generation.",
      500
    );
  }

  try {
    const roadmap = await generateTasksForContext(req.body);
    res.status(200).json({ success: true, data: roadmap });
  } catch (error) {
    console.error("Roadmap generation error:", error);

    if (error.status === 503) {
      throw new ErrorResponse("Gemini AI service is temporarily overloaded. Please try again in a few minutes.", 503);
    } else if (error.status === 429) {
      throw new ErrorResponse("Too many requests to Gemini AI. Please wait a moment and try again.", 429);
    } else if (error.message.includes('timeout')) {
      throw new ErrorResponse("AI request timed out. Please try again with a simpler request.", 408);
    }

    throw new ErrorResponse("Failed to generate roadmap", 500);
  }
});

// Generate personalized roadmap with AI
export const generateRoadmapWithAI = catchAsync(async (req, res) => {
  const { userProfile, learningPath, timeframe, customGoal, motivation } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    throw new ErrorResponse(
      "Gemini AI is not configured. Please contact support to enable AI-powered roadmap generation.",
      500
    );
  }

  const context = {
    userProfile,
    learningPath,
    timeframe,
    customGoal,
    motivation,
  };

  const prompt = generateRoadmapPrompt(context);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const response = await retryWithBackoff(async () => {
      // Throttle requests to prevent rate limits
      await throttleRequest();

      return await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
    }, 3, 2000);

    // Get raw AI response without any processing
    let jsonText = response.response.text();
    console.log('=== RAW AI ROADMAP RESPONSE ===');
    console.log('Length:', jsonText.length);
    console.log('Raw response:');
    console.log(jsonText);
    console.log('=== END RAW RESPONSE ===');

    // Remove markdown code blocks if present
    let cleanJsonText = jsonText.trim();
    if (cleanJsonText.startsWith('```json')) {
      cleanJsonText = cleanJsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanJsonText.startsWith('```')) {
      cleanJsonText = cleanJsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    console.log('=== CLEANED ROADMAP JSON (after markdown removal) ===');
    console.log('Cleaned length:', cleanJsonText.length);
    console.log('First 200 chars:', cleanJsonText.substring(0, 200));
    console.log('=== END CLEANED JSON ===');

    let generatedRoadmap;
    try {
      generatedRoadmap = JSON.parse(cleanJsonText);
      console.log('✅ AI roadmap response parsed successfully after markdown removal!');
    } catch (error) {
      console.error('❌ AI roadmap response failed to parse even after markdown removal:', error.message);
      console.error('Error at position:', error.message.match(/\d+/)?.[0] || 'unknown');

      // Return the raw response as text so we can see what's wrong
      return res.status(200).json({
        success: false,
        error: 'JSON Parse Error',
        rawResponse: jsonText,
        cleanedResponse: cleanJsonText,
        parseError: error.message
      });
    }

    res.status(200).json({
      success: true,
      data: generatedRoadmap,
    });
  } catch (error) {
    console.error("Gemini AI Error:", error);
    // Provide more specific error messages for common issues
    if (error.status === 503) {
      throw new ErrorResponse("Gemini AI service is temporarily overloaded. Please try again in a few minutes.", 503);
    } else if (error.status === 429) {
      throw new ErrorResponse("Too many requests to Gemini AI. Please wait a moment and try again.", 429);
    } else if (error.message.includes('timeout')) {
      throw new ErrorResponse("AI request timed out. Please try again with a simpler request.", 408);
    }

    throw new ErrorResponse("Failed to generate roadmap with AI", 500);
  }
});

// Generate personalized learning recommendations
export const generateLearningRecommendations = catchAsync(async (req, res) => {
  const { userProfile, progressData, currentTasks } = req.body;
  const userId = req.user?.id || 'anonymous';

  // Check rate limit
  if (!checkRateLimit(userId)) {
    throw new ErrorResponse("Too many AI requests. Please wait a minute before trying again.", 429);
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new ErrorResponse(
      "Gemini AI is not configured. Please contact support to enable AI-powered recommendations.",
      500
    );
  }

  const prompt = generateRecommendationsPrompt(userProfile, progressData, currentTasks);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const response = await retryWithBackoff(async () => {
      // Throttle requests to prevent rate limits
      await throttleRequest();

      return await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
    }, 3, 2000);

    // Extract JSON from AI response
    let jsonText = response.response.text();

    // Remove markdown code blocks if present
    let cleanJsonText = jsonText.trim();
    if (cleanJsonText.startsWith('```json')) {
      cleanJsonText = cleanJsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanJsonText.startsWith('```')) {
      cleanJsonText = cleanJsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    console.log('=== CLEANED RECOMMENDATIONS JSON (after markdown removal) ===');
    console.log('Cleaned length:', cleanJsonText.length);
    console.log('First 200 chars:', cleanJsonText.substring(0, 200));
    console.log('=== END CLEANED JSON ===');

    let recommendations;
    try {
      // Try to parse the cleaned response
      recommendations = JSON.parse(cleanJsonText);
      console.log('✅ AI recommendations response parsed successfully after markdown removal!');
    } catch (error) {
      console.error('❌ AI recommendations response failed to parse even after markdown removal:', error.message);
      console.error('Error at position:', error.message.match(/\d+/)?.[0] || 'unknown');

      // Return error with raw response for debugging
      throw new Error(`JSON Parse Error: ${error.message}. Raw response length: ${jsonText.length}`);
    }

    res.status(200).json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    console.error("Gemini AI Error:", error);
    // Provide more specific error messages for common issues
    if (error.status === 503) {
      throw new ErrorResponse("Gemini AI service is temporarily overloaded. Please try again in a few minutes.", 503);
    } else if (error.status === 429) {
      throw new ErrorResponse("Too many requests to Gemini AI. Please wait a moment and try again.", 429);
    } else if (error.message.includes('timeout')) {
      throw new ErrorResponse("AI request timed out. Please try again with a simpler request.", 408);
    }

    throw new ErrorResponse("Failed to generate recommendations", 500);
  }
});

// Get task requirements for a given timeline (debugging endpoint)
export const getTaskRequirements = catchAsync(async (req, res) => {
  const { months } = req.params;
  const { userProfile } = req.body; // Accept user profile in request body

  const requirements = calculateTaskRequirements(Number(months), userProfile);

  res.status(200).json({
    success: true,
    data: requirements
  });
});