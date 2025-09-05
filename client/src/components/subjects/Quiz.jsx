import { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { useUserPlan } from "../../contexts/UserPlanContext";
import { useQuiz } from "../../hooks/useQuiz";
import { Loader2 } from "lucide-react";

// Import our components
import QuizHeader from "./QuizHeader";
import QuizOptions from "./QuizOptions";
import QuizQuestion from "./QuizQuestion";
import QuizNavigation from "./QuizNavigation";
import QuizResults from "./QuizResults";
import QuizLoadingState from "./QuizLoadingState";
import QuizErrorDisplay from "./QuizErrorDisplay";
import QuizHistory from "./QuizHistory";

const Quiz = ({
  selectedFile,
  quiz,
  quizQuestions,
  loading,
  isGenerating,
  error,
  currentQuestionIndex,
  userAnswers,
  aiEvaluations,
  showResults,
  noQuizExists,
  quizOptions,
  quizHistory,
  loadingHistory,
  showHistory,
  selectedHistoryQuiz,
  handleOptionChange,
  generateQuiz,
  handleSelectAnswer,
  handleOpenEndedAnswer,
  handleSubmitQuiz,
  navigateQuestion,
  resetQuiz,
  calculateScore,
  loadHistoryQuiz,
  toggleHistory,
  exitHistoryQuiz
}) => {
  const { t } = useTranslation();
  const { isPremium } = useUserPlan();
  const [showOptions, setShowOptions] = useState(false);

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

  // If we're showing quiz history, display it
  if (showHistory) {
    return (
      <QuizHistory
        quizHistory={quizHistory}
        loadingHistory={loadingHistory}
        onLoadQuiz={loadHistoryQuiz}
        onClose={toggleHistory}
      />
    );
  }

  // Get all open-ended and case study questions for results view
  const openEndedQuestions = quizQuestions.filter(
    (q) =>
      q.question_type === "open_ended" ||
      q.question_type === "case_study" ||
      q.question_type === "case_study_moderate" ||
      q.question_type === "case_study_advanced"
  );

  return (
    <div className="w-full rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 relative">
      {/* Header with Generate button */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
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
            toggleHistory={toggleHistory}
          />
        </div>
      </div>

      {/* Content area */}
      <div className="p-4 min-h-[400px]">
        {/* Overlay loading spinner for quiz submission */}
        {loading && !isGenerating && !showResults && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center z-10">
            <div className="flex flex-col items-center space-y-4">
              <Loader2
                size={48}
                className="animate-spin text-gray-600 dark:text-gray-400"
              />
              <p className="text-gray-700 dark:text-gray-300 font-medium">
                {selectedHistoryQuiz
                  ? t("quiz.loading.submission")
                  : t("quiz.loading.evaluation")}
              </p>
            </div>
          </div>
        )}

        {/* Quiz generation options */}
        <QuizOptions
          quizOptions={quizOptions}
          onOptionChange={handleOptionChange}
          showOptions={showOptions}
        />

        {/* Main quiz area - shows loading state if quiz is being loaded */}
        {quiz && quizQuestions.length > 0 ? (
          <div className="quiz-content">
            {/* Conditional rendering for results or quiz questions */}
            {showResults ? (
              <>
                {/* Quiz results */}
                <QuizResults
                  score={score}
                  onResetQuiz={
                    selectedHistoryQuiz ? exitHistoryQuiz : resetQuiz
                  }
                  showResults={showResults}
                  isHistorical={!!selectedHistoryQuiz}
                />

                {/* Open-ended Questions Feedback Section */}
                {openEndedQuestions.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
                      {t("quiz.questions.feedback")}
                    </h3>
                    <div className="space-y-10">
                      {openEndedQuestions.map((question) => (
                        <div
                          key={question.id}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-6"
                        >
                          <QuizQuestion
                            question={question}
                            userAnswer={userAnswers[question.id]}
                            onSelectAnswer={handleSelectAnswer}
                            onOpenEndedAnswer={handleOpenEndedAnswer}
                            showResults={showResults}
                            aiEvaluations={aiEvaluations}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Quiz-taking mode */
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
                  aiEvaluations={aiEvaluations}
                />

                {/* Navigation controls */}
                <QuizNavigation
                  currentQuestionIndex={currentQuestionIndex}
                  totalQuestions={quizQuestions.length}
                  onNavigateQuestion={navigateQuestion}
                  onSubmitQuiz={handleSubmitQuiz}
                  onResetQuiz={resetQuiz}
                  loading={loading}
                  isLastQuestion={isLastQuestion}
                  hasAnsweredCurrent={!!hasAnsweredCurrent}
                  showResults={showResults}
                />
              </div>
            )}
          </div>
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
