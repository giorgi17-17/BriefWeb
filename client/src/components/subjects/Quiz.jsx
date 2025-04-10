import { useState } from "react";
import PropTypes from "prop-types";
import { useUserPlan } from "../../contexts/UserPlanContext";
import { useQuiz } from "../../hooks/useQuiz";

// Import our new components
import QuizHeader from "./QuizHeader";
import QuizOptions from "./QuizOptions";
import QuizQuestion from "./QuizQuestion";
import QuizNavigation from "./QuizNavigation";
import QuizResults from "./QuizResults";
import QuizLoadingState from "./QuizLoadingState";
import QuizErrorDisplay from "./QuizErrorDisplay";

const Quiz = ({ selectedFile, user, lectureId }) => {
  const { isPremium } = useUserPlan();
  const [showOptions, setShowOptions] = useState(false);

  // Use our custom hook for quiz data and functionality
  const {
    quiz,
    quizQuestions,
    loading,
    isGenerating,
    error,
    currentQuestionIndex,
    userAnswers,
    showResults,
    noQuizExists,
    quizOptions,
    handleOptionChange,
    generateQuiz,
    handleSelectAnswer,
    handleOpenEndedAnswer,
    handleSubmitQuiz,
    navigateQuestion,
    resetQuiz,
    calculateScore,
  } = useQuiz(lectureId, user);

  // Toggle options panel visibility
  const toggleOptionsPanel = () => {
    setShowOptions((prev) => !prev);
  };

  // Handle generate quiz button click
  const handleGenerateQuiz = () => {
    generateQuiz(selectedFile);
      setShowOptions(false);
  };

  // Get the current question
  const currentQuestion = quizQuestions[currentQuestionIndex];

  // Check if user has answered the current question
  const hasAnsweredCurrent = currentQuestion && userAnswers[currentQuestion.id];

  // Check if this is the last question
  const isLastQuestion = currentQuestionIndex === quizQuestions.length - 1;

  // Calculate score for results
  const score = calculateScore();

  // If there's an error, display it
  if (error) {
    return <QuizErrorDisplay error={error} />;
  }

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header with Generate button */}
      <QuizHeader
        quiz={quiz}
        noQuizExists={noQuizExists}
        isLoading={loading}
        isGenerating={isGenerating}
        selectedFile={selectedFile}
        isPremium={isPremium}
        onGenerateQuiz={handleGenerateQuiz}
        toggleOptionsPanel={toggleOptionsPanel}
        showOptions={showOptions}
      />

      {/* Content area */}
      <div className="p-4">
        {/* Quiz generation options */}
        <QuizOptions
          quizOptions={quizOptions}
          onOptionChange={handleOptionChange}
          showOptions={showOptions}
        />

        {quizQuestions.length > 0 ? (
          <>
            {showResults ? (
              <QuizResults
                score={score}
                onResetQuiz={resetQuiz}
                showResults={showResults}
              />
            ) : (
            <div>
                {/* Current question */}
                <QuizQuestion
                  question={currentQuestion}
                  userAnswer={
                    currentQuestion && userAnswers[currentQuestion.id]
                  }
                  onSelectAnswer={handleSelectAnswer}
                  onOpenEndedAnswer={handleOpenEndedAnswer}
                  showResults={showResults}
                />

                {/* Navigation controls */}
                <QuizNavigation
                  currentQuestionIndex={currentQuestionIndex}
                  totalQuestions={quizQuestions.length}
                  onNavigateQuestion={navigateQuestion}
                  onSubmitQuiz={handleSubmitQuiz}
                  loading={loading}
                  isLastQuestion={isLastQuestion}
                  hasAnsweredCurrent={!!hasAnsweredCurrent}
                  showResults={showResults}
                />
              </div>
            )}
          </>
        ) : (
          <QuizLoadingState
            isLoading={loading}
            isGenerating={isGenerating}
            noQuizExists={noQuizExists}
            selectedFile={selectedFile}
          />
        )}
      </div>
    </div>
  );
};

Quiz.propTypes = {
  selectedFile: PropTypes.object,
  user: PropTypes.object.isRequired,
  lectureId: PropTypes.string.isRequired,
};

export default Quiz;
