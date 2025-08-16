import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AssessmentScreen from "../components/learning/AssessmentScreen";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  learningPaths,
  aiAssistant,
  assessmentQuestions,
} from "../services/aiLearningService";
import { useGoalStore } from "../store/goalStore";

const AssessmentPage = () => {
  const navigate = useNavigate();
  const { createGoal, isGeneratingTasks } = useGoalStore();
  const [currentStep, setCurrentStep] = useState("pathSelection"); // pathSelection, assessment, goalSetup, roadmap
  const [selectedPath, setSelectedPath] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [goalData, setGoalData] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [goalCreationError, setGoalCreationError] = useState(null);
  const [aiProgress, setAiProgress] = useState({ stage: '', progress: 0 });

  // Load saved data from localStorage on component mount
  useEffect(() => {
    // Check if this is a fresh goal creation (user clicked "Create New Goal")
    const isNewGoalCreation = new URLSearchParams(window.location.search).get('new') === 'true';

    if (isNewGoalCreation) {
      // Clear any existing assessment data for fresh start
      localStorage.removeItem("aiLearning_userProfile");
      localStorage.removeItem("aiLearning_goalData");
      localStorage.removeItem("aiLearning_roadmap");
      localStorage.removeItem("aiLearning_currentStep");
      localStorage.removeItem("aiLearning_assessmentResponses");
      localStorage.removeItem("aiLearning_assessmentData");
      localStorage.removeItem("aiLearning_learningData");
      localStorage.removeItem("aiLearning_selectedPath");

      // Start fresh with path selection
      setCurrentStep("pathSelection");
      setUserProfile(null);
      setGoalData(null);
      setRoadmap(null);
      return;
    }

    const savedProfile = localStorage.getItem("aiLearning_userProfile");
    const savedGoalData = localStorage.getItem("aiLearning_goalData");
    const savedRoadmap = localStorage.getItem("aiLearning_roadmap");
    const savedLearningData = localStorage.getItem("aiLearning_learningData");
    const savedStep = localStorage.getItem("aiLearning_currentStep");
    const savedSelectedPath = localStorage.getItem("aiLearning_selectedPath");

    // Only redirect to learning dashboard if user is not creating a new goal
    // and has complete learning setup
    if (savedProfile && savedGoalData && savedRoadmap && savedLearningData) {
      navigate("/learning-dashboard");
      return;
    }

    // Load saved progress for incomplete goal creation
    if (savedSelectedPath) {
      setSelectedPath(savedSelectedPath);
    }
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
    }
    if (savedGoalData) {
      setGoalData(JSON.parse(savedGoalData));
    }
    if (savedRoadmap) {
      setRoadmap(JSON.parse(savedRoadmap));
    }
    if (savedStep) {
      setCurrentStep(savedStep);
    }
  }, [navigate]);

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Check if user has existing incomplete assessment data
  const hasIncompleteData = () => {
    const savedProfile = localStorage.getItem("aiLearning_userProfile");
    const savedGoalData = localStorage.getItem("aiLearning_goalData");
    const savedRoadmap = localStorage.getItem("aiLearning_roadmap");
    const savedLearningData = localStorage.getItem("aiLearning_learningData");

    // Has some data but not complete
    return (savedProfile || savedGoalData || savedRoadmap) && !savedLearningData;
  };

  // Show option to continue or start fresh if user has incomplete data
  const showContinueOption = hasIncompleteData() && !new URLSearchParams(window.location.search).get('new');

  if (showContinueOption) {
    return (
      <div className="min-h-screen bg-[#111111] text-white flex items-center justify-center">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="!bg-[#181D24] backdrop-blur-md border border-gray-700 rounded-3xl shadow-2xl">
            <CardContent className="p-8 text-center">
              <h1 className="text-3xl font-bold text-white mb-6">
                Continue Previous Assessment?
              </h1>
              <p className="text-gray-300 mb-8">
                We found an incomplete assessment. Would you like to continue where you left off or start fresh?
              </p>

              <div className="space-y-4">
                <Button
                  onClick={() => {
                    // Continue with existing data
                    const savedStep = localStorage.getItem("aiLearning_currentStep");
                    if (savedStep) {
                      setCurrentStep(savedStep);
                    } else {
                      setCurrentStep("assessment");
                    }
                  }}
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  Continue Previous Assessment
                </Button>

                <Button
                  onClick={() => {
                    // Start fresh
                    localStorage.removeItem("aiLearning_userProfile");
                    localStorage.removeItem("aiLearning_goalData");
                    localStorage.removeItem("aiLearning_roadmap");
                    localStorage.removeItem("aiLearning_currentStep");
                    localStorage.removeItem("aiLearning_assessmentResponses");
                    localStorage.removeItem("aiLearning_assessmentData");
                    localStorage.removeItem("aiLearning_selectedPath");

                    setCurrentStep("pathSelection");
                    setSelectedPath("");
                    setUserProfile(null);
                    setGoalData(null);
                    setRoadmap(null);
                  }}
                  variant="outline"
                  size="lg"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Start Fresh Assessment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handlePathSelection = (pathId) => {
    setSelectedPath(pathId);
    localStorage.setItem("aiLearning_selectedPath", pathId);
    localStorage.setItem("aiLearning_currentStep", "assessment");
    setCurrentStep("assessment");
  };

  const handleAssessmentComplete = (profile, responses) => {
    setUserProfile(profile);

    // Save detailed assessment data for future AI model integration
    const assessmentData = {
      userProfile: profile,
      responses: responses,
      selectedPath: selectedPath,
      timestamp: new Date().toISOString(),
      completedSections: Object.keys(assessmentQuestions),
      totalQuestions: Object.values(assessmentQuestions).reduce(
        (sum, section) => sum + section.length,
        0
      ),
      responsesByCategory: responses.reduce((acc, response) => {
        if (!acc[response.category]) {
          acc[response.category] = [];
        }
        acc[response.category].push(response);
        return acc;
      }, {}),
    };

    localStorage.setItem("aiLearning_userProfile", JSON.stringify(profile));
    localStorage.setItem(
      "aiLearning_assessmentResponses",
      JSON.stringify(responses)
    );
    localStorage.setItem(
      "aiLearning_assessmentData",
      JSON.stringify(assessmentData)
    );
    localStorage.setItem("aiLearning_currentStep", "goalSetup");
    setCurrentStep("goalSetup");
  };

  const handleGoalSetupComplete = async (goals) => {
    setGoalData(goals);

    // Show loading state for roadmap generation
    setCurrentStep("generatingRoadmap");

    try {
      // Generate roadmap with AI
      const generatedRoadmap = await aiAssistant.generateRoadmapWithAI(goals);

      setRoadmap(generatedRoadmap);
      localStorage.setItem("aiLearning_goalData", JSON.stringify(goals));
      localStorage.setItem(
        "aiLearning_roadmap",
        JSON.stringify(generatedRoadmap)
      );
      localStorage.setItem("aiLearning_currentStep", "roadmap");
      setCurrentStep("roadmap");
    } catch (error) {
      console.error("Error generating roadmap:", error);
      alert("Failed to generate roadmap. Please try again.");
      setCurrentStep("goalSetup");
    }
  };

  const handleStartLearning = async () => {
    setGoalCreationError(null);
    
    // Calculate expected number of tasks
    const timeline = roadmap?.totalDuration || goalData?.timeframe || 3;
    const expectedTasks = timeline * 30; // ~30 tasks per month
    
    // Start progress simulation with focus on task generation
    const progressStages = [
      { stage: 'Analyzing your learning profile...', duration: 5000 },
      { stage: 'Designing personalized curriculum...', duration: 8000 },
      { stage: `Generating ${expectedTasks} AI-powered tasks...`, duration: 15000 },
      { stage: 'Optimizing task difficulty and sequencing...', duration: 8000 },
      { stage: 'Finalizing your learning journey...', duration: 4000 }
    ];
    
    let currentStageIndex = 0;
    let progress = 0;
    
    const progressInterval = setInterval(() => {
      if (currentStageIndex < progressStages.length) {
        const stage = progressStages[currentStageIndex];
        setAiProgress({ 
          stage: stage.stage, 
          progress: Math.min(progress + 2, 95) // Gradual progress, cap at 95% until completion
        });
        progress += 2;
        
        // Move to next stage after some progress
        if (progress >= (currentStageIndex + 1) * 20) {
          currentStageIndex++;
          if (currentStageIndex < progressStages.length) {
            setAiProgress({ 
              stage: progressStages[currentStageIndex].stage, 
              progress: progress
            });
          }
        }
      }
    }, 2000); // Update every 2 seconds

    try {
      // Pull persisted assessment data if available
      const storedAssessment = JSON.parse(
        localStorage.getItem("aiLearning_assessmentData") || "{}"
      );

      // Build payload without referencing itself
      const timeline = roadmap?.totalDuration || goalData?.timeframe || 1;
      // Ensure timeline is a valid number
      const validTimeline = Math.max(1, Math.min(24, Number(timeline) || 1));
      
      const payload = {
        field: roadmap?.title || goalData?.learningPath || "Learning Goal",
        description:
          (goalData && goalData.customGoal) ||
          `Master ${roadmap?.title || "Goal"}`,
        timeline: validTimeline,
        personalNeeds: goalData?.personalNeeds || "",
        strengths: userProfile?.strengths || [],
        weaknesses: userProfile?.challenges || [],
        roadmap: roadmap || {},
        userProfile: userProfile || {},
        assessmentData: storedAssessment || {},
        goalSetup: goalData || {},
        currentPhase: 1,
        currentDay: 1,
      };
      
      console.log(`Creating goal with timeline: ${validTimeline} months`);

      // Use the goal store to create the goal (this automatically sets it as active)
      const created = await createGoal(payload);

      // Store the created goal data for backward compatibility
      localStorage.setItem("aiLearning_goalData", JSON.stringify(payload));
      localStorage.setItem(
        "aiLearning_learningData",
        JSON.stringify({
          goalData: payload,
          roadmap,
          userProfile,
          currentPhase: 1,
        })
      );
      localStorage.removeItem("aiLearning_currentStep");

      // Complete progress and navigate
      clearInterval(progressInterval);
      setAiProgress({ stage: 'Complete! Redirecting to your tasks...', progress: 100 });
      
      setTimeout(() => {
        navigate("/tasks");
      }, 1000);
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Error creating goal with tasks:", error);
      
      let errorMessage = "Failed to create goal with comprehensive tasks. Please try again.";
      
      // Handle specific error types
      if (error.response?.status >= 500) {
        errorMessage = "Server error occurred while generating your comprehensive learning plan. Please try again in a few moments.";
      } else if (!error.response) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setGoalCreationError(errorMessage);
    }
  };

  // Path Selection Component
  const PathSelectionStep = () => {
    const pathOptions = Object.values(learningPaths);

    return (
      <div className="min-h-screen bg-[#111111] text-white">
        <div className="w-full">
          <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 font-poppins">
                Choose Your Career Path
              </h1>
              <p className="text-lg mb-6 text-sky-700 dark:text-gray-300">
                Select the career path you want to pursue, then we'll personalize your learning journey
              </p>
            </div>

            {/* Learning Path Selection */}
            <Card className="!bg-[#181D24] backdrop-blur-md border border-gray-700 rounded-3xl shadow-2xl mb-8">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pathOptions.map((path) => (
                    <button
                      key={path.id}
                      onClick={() => handlePathSelection(path.id)}
                      className="p-6 rounded-xl border-2 transition-all duration-300 text-left border-white/20 bg-white/5 hover:border-cyan-400 hover:bg-cyan-500/10"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${path.difficulty === "advanced"
                            ? "bg-red-500/20"
                            : path.difficulty === "intermediate"
                              ? "bg-yellow-500/20"
                              : "bg-green-500/20"
                            }`}
                        >
                          {path.id === "ai-ml"
                            ? "🤖"
                            : path.id === "fullstack-web"
                              ? "💻"
                              : path.id === "cloud-computing"
                                ? "☁️"
                                : "📊"}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-lg mb-2 text-indigo-700 dark:text-white">
                            {path.title}
                          </h4>
                          <p className="text-sky-700 text-sm mb-3 dark:text-gray-300">
                            {path.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs">
                            <span
                              className={`px-2 py-1 rounded-full ${path.difficulty === "advanced"
                                ? "bg-red-500/20 text-red-400"
                                : path.difficulty === "intermediate"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : "bg-green-500/20 text-green-400"
                                }`}
                            >
                              {path.difficulty}
                            </span>
                            <span className="text-mint-700 dark:text-gray-400">
                              {path.duration.min}-{path.duration.max} months
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  // Goal Setup Component (now just timeline and personal needs)
  const GoalSetupStep = () => {
    const [timeframe, setTimeframe] = useState("");
    const [customGoal, setCustomGoal] = useState("");
    const [motivation, setMotivation] = useState("");
    const [personalNeeds, setPersonalNeeds] = useState("");

    const handleSubmit = () => {
      if (!timeframe) return;

      const goals = {
        learningPath: selectedPath,
        timeframe: parseInt(timeframe),
        customGoal,
        motivation,
        personalNeeds,
        userProfile,
      };

      handleGoalSetupComplete(goals);
    };

    const selectedPathData = learningPaths[selectedPath];

    return (
      <div className="min-h-screen bg-[#111111] text-white">
        <div className="w-full">
          <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 font-poppins">
                Set Your Learning Timeline
              </h1>
              <p className="text-lg mb-6 text-sky-700 dark:text-gray-300">
                You've chosen {selectedPathData?.title}. Now let's set your timeline and preferences.
              </p>
            </div>

            {/* User Profile Summary */}
            <Card className="!bg-[#181D24] backdrop-blur-md border border-gray-700 rounded-3xl shadow-2xl mb-8">
              <CardContent className="p-6">
                <h3 className="text-white font-bold text-xl mb-4">
                  Your Learning Profile
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-sky-700 font-semibold text-sm dark:text-cyan-400">
                      Learning Speed
                    </div>
                    <div className="text-indigo-700 text-lg font-bold dark:text-white">
                      {userProfile.learningSpeed >= 3.5
                        ? "Fast"
                        : userProfile.learningSpeed >= 2.5
                          ? "Average"
                          : "Methodical"}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lavender-700 font-semibold text-sm dark:text-purple-400">
                      Focus Ability
                    </div>
                    <div className="text-indigo-700 text-lg font-bold dark:text-white">
                      {userProfile.focusCapability >= 3.5
                        ? "Excellent"
                        : userProfile.focusCapability >= 2.5
                          ? "Good"
                          : "Developing"}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-mint-700 font-semibold text-sm dark:text-green-400">
                      Time Commitment
                    </div>
                    <div className="text-indigo-700 text-lg font-bold dark:text-white">
                      {userProfile.timeCommitment >= 3.5
                        ? "High"
                        : userProfile.timeCommitment >= 2.5
                          ? "Medium"
                          : "Limited"}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-pink-700 font-semibold text-sm dark:text-orange-400">
                      Experience
                    </div>
                    <div className="text-indigo-700 text-lg font-bold dark:text-white">
                      {userProfile.experienceLevel >= 3.5
                        ? "Advanced"
                        : userProfile.experienceLevel >= 2.5
                          ? "Intermediate"
                          : "Beginner"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Selected Path Summary */}
            <Card className="!bg-[#181D24] backdrop-blur-md border border-gray-700 rounded-3xl shadow-2xl mb-8">
              <CardContent className="p-6">
                <h3 className="text-white font-bold text-xl mb-4">
                  Your Selected Path
                </h3>
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${selectedPathData?.difficulty === "advanced"
                      ? "bg-red-500/20"
                      : selectedPathData?.difficulty === "intermediate"
                        ? "bg-yellow-500/20"
                        : "bg-green-500/20"
                      }`}
                  >
                    {selectedPath === "ai-ml"
                      ? "🤖"
                      : selectedPath === "fullstack-web"
                        ? "💻"
                        : selectedPath === "cloud-computing"
                          ? "☁️"
                          : "📊"}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg mb-2 text-indigo-700 dark:text-white">
                      {selectedPathData?.title}
                    </h4>
                    <p className="text-sky-700 text-sm mb-3 dark:text-gray-300">
                      {selectedPathData?.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs">
                      <span
                        className={`px-2 py-1 rounded-full ${selectedPathData?.difficulty === "advanced"
                          ? "bg-red-500/20 text-red-400"
                          : selectedPathData?.difficulty === "intermediate"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-green-500/20 text-green-400"
                          }`}
                      >
                        {selectedPathData?.difficulty}
                      </span>
                      <span className="text-mint-700 dark:text-gray-400">
                        {selectedPathData?.duration.min}-{selectedPathData?.duration.max} months
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => setCurrentStep("pathSelection")}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Change Path
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Timeframe Selection */}
            <Card className="!bg-[#181D24] backdrop-blur-md border border-gray-700 rounded-3xl shadow-2xl mb-8">
              <CardContent className="p-8">
                <h3 className="text-white font-bold text-2xl mb-6">
                  Target Timeframe
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[2, 3, 4, 6].map((months) => (
                    <button
                      key={months}
                      onClick={() => setTimeframe(months.toString())}
                      className={`p-6 rounded-xl border-2 transition-all duration-300 text-center ${timeframe === months.toString()
                        ? "border-cyan-400 bg-cyan-500/20"
                        : "border-sky-200 bg-sky-50/50 hover:border-sky-300 hover:bg-sky-100/50 dark:border-white/20 dark:bg-white/5 dark:hover:border-white/40 dark:hover:bg-white/10"
                        }`}
                    >
                      <div className="text-3xl mb-2">⏰</div>
                      <div className="text-indigo-700 font-bold text-xl dark:text-white">
                        {months} Months
                      </div>
                      <div className="text-sky-600 text-sm mt-1 dark:text-gray-400">
                        {months === 2
                          ? "Intensive"
                          : months === 3
                            ? "Focused"
                            : months === 4
                              ? "Balanced"
                              : "Comfortable"}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Personal Needs Section */}
            <Card className="!bg-[#181D24] backdrop-blur-md border border-gray-700 rounded-3xl shadow-2xl mb-8">
              <CardContent className="p-8">
                <h3 className="text-white font-bold text-2xl mb-6">
                  Personal Needs & Constraints
                </h3>
                <p className="text-gray-300 mb-6">
                  Tell us about your specific needs, preferences, or constraints to make your learning path more personalized.
                  For example: preferred technologies, time availability, learning style preferences, or any specific requirements.
                </p>

                <textarea
                  value={personalNeeds}
                  onChange={(e) => setPersonalNeeds(e.target.value)}
                  placeholder="Example: I prefer MERN stack technologies, can only study 2 hours in the evenings, need practical projects for my portfolio, have experience with basic HTML/CSS..."
                  className="w-full p-4 rounded-xl border-2 border-gray-600 bg-[#111111] text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none transition-all duration-300 resize-vertical min-h-[120px] max-h-[300px]"
                  maxLength={2000}
                />

                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-400 text-sm">
                    Optional - helps create a more tailored learning experience
                  </span>
                  <span className={`text-sm ${personalNeeds.length > 1800 ? 'text-red-400' : 'text-gray-400'}`}>
                    {personalNeeds.length}/2000
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="text-center">
              <Button
                onClick={handleSubmit}
                disabled={!timeframe}
                variant="primary"
                size="xl"
              >
                Generate My Personalized Roadmap 🚀
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Roadmap Component
  const RoadmapStep = () => {
    const [currentPhase, setCurrentPhase] = useState(1);

    const totalDuration = roadmap?.totalDuration ? 
      `${roadmap.totalDuration} months` : 
      `${roadmap?.phases?.reduce((sum, phase) => sum + (typeof phase.duration === 'number' ? phase.duration : parseFloat(phase.duration) || 0), 0) || 0} months`;
    const successProbability = Math.round(
      (roadmap?.successPrediction || 0) * 100
    );

    return (
      <div className="min-h-screen bg-[#111111] text-white">
        <div className="w-full">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 font-poppins">
                Your Personalized Roadmap
              </h1>
              <p className="text-lg mb-6 text-sky-700 dark:text-gray-300">
                AI-generated learning path tailored to your profile and goals
              </p>
            </div>

            {/* Success Prediction */}
            <Card className="!bg-[#181D24] backdrop-blur-md border border-gray-700 rounded-3xl shadow-2xl mb-8">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-bold text-2xl mb-2">
                      Success Prediction
                    </h3>
                    <p className="text-gray-300">
                      Based on your profile and chosen timeline, our AI predicts
                      your success probability
                    </p>
                  </div>
                  <div className="text-center">
                    <div
                      className={`text-6xl font-bold mb-2 ${successProbability >= 80
                        ? "text-blue-500 dark:text-green-400"
                        : successProbability >= 60
                          ? "text-cyan-500 dark:text-yellow-400"
                          : "text-red-400"
                        }`}
                    >
                      {successProbability}%
                    </div>
                    <div className="text-gray-300 text-sm">Success Rate</div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-800/50 p-4 rounded-xl">
                    <div className="text-cyan-400 font-semibold text-sm">
                      Total Duration
                    </div>
                    <div className="text-white text-xl font-bold">
                      {totalDuration}
                    </div>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-xl">
                    <div className="text-indigo-400 font-semibold text-sm">
                      Daily Commitment
                    </div>
                    <div className="text-white text-xl font-bold">
                      {roadmap?.personalizedSchedule?.dailyHours || 0}h/day
                    </div>
                  </div>
                  <div className="bg-gray-800/50 p-4 rounded-xl">
                    <div className="text-blue-400 font-semibold text-sm">
                      Study Sessions
                    </div>
                    <div className="text-white text-xl font-bold">
                      {roadmap?.personalizedSchedule?.sessionsPerDay || 0}/day
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Learning Phases */}
            <Card className="!bg-[#181D24] backdrop-blur-md border border-gray-700 rounded-3xl shadow-2xl mb-8">
              <CardContent className="p-8">
                <h3 className="text-white font-bold text-2xl mb-6">
                  Learning Phases
                </h3>

                <div className="space-y-6">
                  {roadmap?.phases?.map((phase, index) => (
                    <div
                      key={phase.phase}
                      className={`p-6 rounded-xl border-2 transition-all duration-300 ${currentPhase === phase.phase
                        ? "border-cyan-400 bg-cyan-500/20"
                        : "border-sky-200 bg-sky-50/50 dark:border-white/20 dark:bg-white/5"
                        }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${currentPhase === phase.phase
                              ? "bg-cyan-500 text-white"
                              : currentPhase > phase.phase
                                ? "bg-green-500 text-white"
                                : "bg-gray-600 text-gray-300"
                              }`}
                          >
                            {currentPhase > phase.phase ? "✓" : phase.phase}
                          </div>
                          <div>
                            <h4 className="text-indigo-700 font-bold text-xl dark:text-white">
                              {phase.title}
                            </h4>
                            <p className="text-sky-700 dark:text-gray-300">
                              Phase {phase.phase} • {phase.duration} weeks
                            </p>
                          </div>
                        </div>

                        {phase.adjustedForUser && (
                          <div className="bg-purple-500/20 px-3 py-1 rounded-full border border-purple-400/30">
                            <span className="text-purple-400 text-sm font-semibold">
                              AI Adjusted
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h5 className="text-indigo-700 font-semibold mb-3 dark:text-white">
                            Topics Covered
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {phase.topics?.map((topic, topicIndex) => (
                              <span
                                key={topicIndex}
                                className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm border border-blue-400/30"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h5 className="text-indigo-700 font-semibold mb-3 dark:text-white">
                            Key Projects
                          </h5>
                          <ul className="space-y-2">
                            {phase.projects?.map((project, projectIndex) => (
                              <li
                                key={projectIndex}
                                className="text-sky-700 flex items-center gap-2 dark:text-gray-300"
                              >
                                <span className="text-green-400">•</span>
                                {project}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Error Message */}
            {goalCreationError && (
              <Card className="!bg-red-900/20 backdrop-blur-md border border-red-500/30 rounded-3xl shadow-2xl mb-8">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="text-red-400 text-2xl">⚠️</div>
                    <div>
                      <h3 className="text-red-400 font-bold text-lg mb-2">
                        Goal Creation Failed
                      </h3>
                      <p className="text-red-300 text-sm">
                        {goalCreationError}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Start Learning Button */}
            <div className="text-center">
              {!isGeneratingTasks && (() => {
                const timeline = roadmap?.totalDuration || goalData?.timeframe || 3;
                const expectedTasks = timeline * 30; // ~30 tasks per month
                
                return (
                  <div className="mb-4">
                    <p className="text-gray-300 mb-2 text-sm">
                      🤖 Our AI will generate <strong>{expectedTasks} personalized tasks</strong> for your {timeline}-month learning journey.
                    </p>
                    <p className="text-gray-400 text-xs">
                      This process takes time to ensure quality - we generate comprehensive daily tasks, projects, and assessments.
                    </p>
                  </div>
                );
              })()}
              <Button
                onClick={handleStartLearning}
                disabled={isGeneratingTasks}
                variant="primary"
                size="xl"
              >
                {isGeneratingTasks ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <span>{aiProgress.stage || 'Initializing comprehensive task generation...'}</span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full max-w-md">
                      <div className="bg-gray-700/80 rounded-full h-4 border border-gray-600/50 overflow-hidden">
                        <div 
                          className="bg-white h-full rounded-full transition-all duration-1000 ease-out shadow-lg"
                          style={{ 
                            width: `${Math.max(aiProgress.progress, 0)}%`,
                            boxShadow: '0 0 8px rgba(255, 255, 255, 0.3)'
                          }}
                        ></div>
                      </div>
                      <div className="text-center text-sm text-gray-300 mt-2 font-medium">
                        {Math.round(Math.max(aiProgress.progress, 0))}% Complete
                      </div>
                    </div>
                    
                    {/* Task Generation Info */}
                    <div className="text-center text-xs text-gray-500 max-w-md">
                      <p>🎯 Generating comprehensive daily tasks, projects, and assessments</p>
                      <p>⏱️ Quality task generation takes time - please be patient</p>
                    </div>
                  </div>
                ) : (
                  "Start My Learning Journey 🚀"
                )}
              </Button>

              {!isGeneratingTasks && (
                <p className="text-gray-400 text-sm mt-4">
                  Your AI assistant will track your progress and adjust the plan
                  as needed
                </p>
              )}

              {isGeneratingTasks && (
                <div className="mt-6 space-y-2">
                  <p className="text-cyan-400 text-sm">
                    🤖 AI is generating your personalized tasks...
                  </p>
                  <p className="text-gray-400 text-xs">
                    This may take a few moments. Please don't close this page.
                  </p>
                  <div className="flex justify-center items-center gap-2 mt-4">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
                    <div
                      className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"
                      style={{ animationDelay: "0.5s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"
                      style={{ animationDelay: "1s" }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading component for roadmap generation
  const GeneratingRoadmapStep = () => {
    return (
      <div className="min-h-screen bg-[#111111] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold mb-4">
            Generating Your Personalized Roadmap
          </h2>
          <p className="text-gray-300 mb-6">
            Our AI is analyzing your profile and creating a customized learning
            path...
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-400">
                Analyzing your learning style
              </span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div
                className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"
                style={{ animationDelay: "0.5s" }}
              ></div>
              <span className="text-sm text-gray-400">
                Designing learning phases
              </span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div
                className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"
                style={{ animationDelay: "1s" }}
              ></div>
              <span className="text-sm text-gray-400">
                Calculating optimal timeline
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Main render logic
  if (currentStep === "pathSelection") {
    return <PathSelectionStep />;
  }

  if (currentStep === "assessment" && selectedPath) {
    return <AssessmentScreen onComplete={handleAssessmentComplete} />;
  }

  if (currentStep === "goalSetup" && userProfile && selectedPath) {
    return <GoalSetupStep />;
  }

  if (currentStep === "generatingRoadmap") {
    return <GeneratingRoadmapStep />;
  }

  if (currentStep === "roadmap" && goalData && roadmap && userProfile) {
    return <RoadmapStep />;
  }

  // Fallback to path selection if something goes wrong
  return <PathSelectionStep />;
};
export default AssessmentPage;
