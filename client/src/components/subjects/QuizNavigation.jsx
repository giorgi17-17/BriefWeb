import PropTypes from "prop-types";
import { ChevronLeft, ChevronRight, ArrowRight, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

const QuizNavigation = ({
  currentQuestionIndex,
  totalQuestions,
  onNavigateQuestion,
  onSubmitQuiz,
  onResetQuiz,
  loading,
  isLastQuestion,
  hasAnsweredCurrent,
  showResults,
}) => {
  const { t } = useTranslation();

  if (totalQuestions === 0) return null;

  return (
    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
      <button
        onClick={() => onNavigateQuestion(-1)}
        disabled={currentQuestionIndex === 0 || loading}
        className={`flex items-center p-2 rounded text-sm font-medium ${
          currentQuestionIndex === 0 || loading
            ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        }`}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        {t("quiz.navigation.previous")}
      </button>

      <span className="text-sm text-gray-600 dark:text-gray-400">
        Question {currentQuestionIndex + 1} of {totalQuestions}
      </span>

      {showResults ? (
        <button
          onClick={() => onNavigateQuestion(1)}
          disabled={currentQuestionIndex === totalQuestions - 1 || loading}
          className={`flex items-center p-2 rounded text-sm font-medium ${
            currentQuestionIndex === totalQuestions - 1 || loading
              ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          {t("quiz.navigation.next")}
          <ChevronRight className="h-4 w-4 ml-1" />
        </button>
      ) : isLastQuestion ? (
        <button
          onClick={onSubmitQuiz}
          disabled={loading || !hasAnsweredCurrent}
          className={`flex items-center px-4 py-2 rounded text-sm font-medium ${
            loading || !hasAnsweredCurrent
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          } text-white transition-colors`}
        >
          {t("quiz.navigation.submit")}
          <ArrowRight className="h-4 w-4 ml-1" />
        </button>
      ) : (
        <button
          onClick={() => onNavigateQuestion(1)}
          disabled={currentQuestionIndex === totalQuestions - 1 || loading}
          className={`flex items-center p-2 rounded text-sm font-medium ${
            currentQuestionIndex === totalQuestions - 1 || loading
              ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          {t("quiz.navigation.next")}
          <ChevronRight className="h-4 w-4 ml-1" />
        </button>
      )}
    </div>
  );
};

QuizNavigation.propTypes = {
  currentQuestionIndex: PropTypes.number.isRequired,
  totalQuestions: PropTypes.number.isRequired,
  onNavigateQuestion: PropTypes.func.isRequired,
  onSubmitQuiz: PropTypes.func.isRequired,
  onResetQuiz: PropTypes.func,
  loading: PropTypes.bool.isRequired,
  isLastQuestion: PropTypes.bool.isRequired,
  hasAnsweredCurrent: PropTypes.bool.isRequired,
  showResults: PropTypes.bool.isRequired,
};

export default QuizNavigation;
