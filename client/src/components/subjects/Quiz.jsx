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
  exitHistoryQuiz,
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
  // Allow submission without answering open-ended or case study questions
  const hasAnsweredCurrent =
    currentQuestion &&
    (userAnswers[currentQuestion.id] ||
      currentQuestion.question_type === "open_ended" ||
      currentQuestion.question_type === "case_study" ||
      currentQuestion.question_type === "case_study_moderate" ||
      currentQuestion.question_type === "case_study_advanced");

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
    <div className="w-full relative">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 sm:px-4">
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
      <div className="px-3 sm:px-4 py-4 sm:py-6 min-h-[50vh] sm:min-h-[60vh] max-w-4xl mx-auto">
        {/* Overlay loading spinner for quiz submission/eval */}
        {loading && !isGenerating && !showResults && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/70 flex items-center justify-center z-20">
            <div className="flex flex-col items-center gap-3 sm:gap-4">
              <Loader2
                size={44}
                className="animate-spin text-gray-600 dark:text-gray-300"
              />
              <p className="text-sm sm:text-base text-gray-700 dark:text-gray-200 font-medium text-center">
                {selectedHistoryQuiz
                  ? t("quiz.loading.submission")
                  : t("quiz.loading.evaluation")}
              </p>
            </div>
          </div>
        )}

        {/* Options */}
        <div className="mb-4 sm:mb-6">
          <QuizOptions
            quizOptions={quizOptions}
            onOptionChange={handleOptionChange}
            showOptions={showOptions}
          />
        </div>

        {/* Main quiz area */}
        {quiz && quizQuestions.length > 0 ? (
          <div className="quiz-content">
            {showResults ? (
              <>
                {/* Results card */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15151b] p-4 sm:p-6">
                  <QuizResults
                    score={score}
                    onResetQuiz={
                      selectedHistoryQuiz ? exitHistoryQuiz : resetQuiz
                    }
                    showResults={showResults}
                    isHistorical={!!selectedHistoryQuiz}
                  />
                </div>

                {/* Open-ended feedback (grid on md+) */}
                {openEndedQuestions.length > 0 && (
                  <section className="mt-6 sm:mt-8">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
                      {t("quiz.questions.feedback")}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      {openEndedQuestions.map((question) => (
                        <div
                          key={question.id}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6 bg-white dark:bg-[#15151b]"
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
                  </section>
                )}
              </>
            ) : (
              /* Quiz-taking mode */
              <div className="space-y-4 sm:space-y-6">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15151b] p-4 sm:p-6">
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
                </div>

                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-[#15151b]/60 p-3 sm:p-4">
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
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15151b]">
            <QuizLoadingState
              isLoading={loading}
              isGenerating={isGenerating}
              noQuizExists={noQuizExists}
              selectedFile={selectedFile}
            />
          </div>
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
