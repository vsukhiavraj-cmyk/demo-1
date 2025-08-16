import React, { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import {
  assessmentQuestions,
  aiAssistant,
} from "../../services/aiLearningService";

export const AssessmentScreen = ({ onComplete }) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState("");

  const sections = Object.keys(assessmentQuestions);
  const currentSectionQuestions = assessmentQuestions[sections[currentSection]];
  const question = currentSectionQuestions[currentQuestion];

  const handleAnswerSelect = (value, weight, category) => {
    setSelectedAnswer(value);
  };

  const handleNext = () => {
    if (!selectedAnswer) return;

    // Save response
    const response = {
      questionId: question.id,
      value: selectedAnswer,
      weight:
        question.options.find((opt) => opt.value === selectedAnswer)?.weight ||
        1,
      category: question.category,
    };

    setResponses([...responses, response]);
    setSelectedAnswer("");

    // Move to next question
    if (currentQuestion < currentSectionQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
      setCurrentQuestion(0);
    } else {
      // Assessment complete
      completeAssessment([...responses, response]);
    }
  };

  const handlePrevious = () => {
    // Remove the last response
    const newResponses = [...responses];
    newResponses.pop();
    setResponses(newResponses);

    // Move to previous question
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    } else if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      const prevSectionQuestions =
        assessmentQuestions[sections[currentSection - 1]];
      setCurrentQuestion(prevSectionQuestions.length - 1);
    }

    // Set the selected answer for the previous question
    if (newResponses.length > 0) {
      const lastResponse = newResponses[newResponses.length - 1];
      setSelectedAnswer(lastResponse.value);
    } else {
      setSelectedAnswer("");
    }
  };

  const completeAssessment = (allResponses) => {
    const userProfile = aiAssistant.analyzeUserProfile(allResponses);
    onComplete(userProfile, allResponses);
  };

  const totalQuestions = Object.values(assessmentQuestions).reduce(
    (sum, section) => sum + section.length,
    0
  );
  const currentQuestionNumber = responses.length + 1;
  const progress = (currentQuestionNumber / totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      <div className="w-full">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 font-poppins">
              Learning Assessment
            </h1>
            <p className="text-gray-300 text-lg mb-6 dark:text-gray-300">
              Help us understand your learning style and create a personalized
              roadmap
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-gray-700 rounded-full h-3 mb-4 dark:bg-gray-700">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-white text-sm">
              Question {currentQuestionNumber} of {totalQuestions} •{" "}
              {sections[currentSection].replace(/([A-Z])/g, " $1").trim()}
            </p>
          </div>

          {/* Question Card */}
          <Card className="!bg-[#181D24] backdrop-blur-md border border-gray-700 rounded-3xl shadow-2xl">
            <CardContent className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-6">
                  {question.question}
                </h2>

                <div className="space-y-4">
                  {question.options.map((option, index) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        handleAnswerSelect(
                          option.value,
                          option.weight,
                          question.category
                        )
                      }
                      className={`w-full p-6 rounded-xl border-2 transition-all duration-300 text-left ${
                        selectedAnswer === option.value
                          ? "border-cyan-400 bg-cyan-500/20 text-white"
                          : "border-gray-600 bg-[#181D24] text-white hover:border-gray-500 hover:bg-gray-700/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selectedAnswer === option.value
                              ? "border-cyan-400 bg-cyan-400"
                              : "border-sky-300 dark:border-gray-400"
                          }`}
                        >
                          {selectedAnswer === option.value && (
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                          )}
                        </div>
                        <span className="text-lg font-medium">
                          {option.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="text-white text-sm">
                    Section:{" "}
                    {sections[currentSection].replace(/([A-Z])/g, " $1").trim()}
                  </div>

                  {/* Previous Button */}
                  {(currentSection > 0 || currentQuestion > 0) && (
                    <Button
                      onClick={handlePrevious}
                      className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white rounded-xl transition-all duration-300 font-bold"
                    >
                      ← Previous
                    </Button>
                  )}
                </div>

                {/* Next Button */}
                <Button
                  onClick={handleNext}
                  disabled={!selectedAnswer}
                  variant="primary"
                  size="lg"
                >
                  {currentSection === sections.length - 1 &&
                  currentQuestion === currentSectionQuestions.length - 1
                    ? "Complete Assessment"
                    : "Next →"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section Overview */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">
            {sections.map((section, index) => (
              <div
                key={section}
                className={`p-4 rounded-xl text-center transition-all duration-300 ${
                  index < currentSection
                    ? "bg-green-500/20 border border-green-400/30"
                    : index === currentSection
                    ? "bg-cyan-500/20 border border-cyan-400/30"
                    : "bg-[#181D24] border border-gray-600"
                }`}
              >
                <div
                  className={`text-2xl mb-2 ${
                    index < currentSection
                      ? "text-green-400"
                      : index === currentSection
                      ? "text-cyan-400"
                      : "text-white"
                  }`}
                >
                  {index < currentSection
                    ? "✅"
                    : index === currentSection
                    ? "🔄"
                    : "⏳"}
                </div>
                <div
                  className={`text-sm font-semibold ${
                    index < currentSection
                      ? "text-green-400"
                      : index === currentSection
                      ? "text-cyan-400"
                      : "text-white"
                  }`}
                >
                  {section.replace(/([A-Z])/g, " $1").trim()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentScreen;
