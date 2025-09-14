import PropTypes from "prop-types";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
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

  const baseBtn =
    "flex items-center justify-center rounded text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40";
  const ghost =
    "px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:text-gray-300 disabled:dark:text-gray-600 disabled:hover:bg-transparent disabled:cursor-not-allowed";
  const primary =
    "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400 disabled:cursor-not-allowed";

  return (
    <div
      className="
        mt-6 pt-4 border-t border-gray-200 dark:border-gray-700
        /* keep space above mobile bottom nav (edit the CSS var if needed) */
        mb-[calc(var(--mobileBottomBar,72px)+env(safe-area-inset-bottom))]
        sm:mb-0
      "
    >
      {/* Mobile-first: wrap + reorder; Desktop: row */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-between">
        {/* Prev */}
        <button
          onClick={() => onNavigateQuestion(-1)}
          disabled={currentQuestionIndex === 0 || loading}
          className={`${baseBtn} ${ghost} order-1`}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t("quiz.navigation.previous")}
        </button>

        {/* Counter (mobile: full width centered; desktop: inline) */}
        <span
          className="
            order-3 w-full text-center text-xs text-gray-600 dark:text-gray-400
            sm:order-2 sm:w-auto sm:text-sm
          "
        >
          {t("quiz.navigation.counter", {
            current: currentQuestionIndex + 1,
            total: totalQuestions,
            defaultValue: `Question ${currentQuestionIndex + 1} of ${totalQuestions}`,
          })}
        </span>

        {/* Next / Submit / Results Next */}
        {showResults ? (
          <button
            onClick={() => onNavigateQuestion(1)}
            disabled={currentQuestionIndex === totalQuestions - 1 || loading}
            className={`${baseBtn} ${ghost} order-2 sm:order-3`}
          >
            {t("quiz.navigation.next")}
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        ) : isLastQuestion ? (
          <button
            onClick={onSubmitQuiz}
            disabled={loading || !hasAnsweredCurrent}
            className={`${baseBtn} ${primary}
                        order-2 sm:order-3
                        w-full sm:w-auto`}
          >
            {t("quiz.navigation.submit")}
            <ArrowRight className="h-4 w-4 ml-1" />
          </button>
        ) : (
          <button
            onClick={() => onNavigateQuestion(1)}
            disabled={currentQuestionIndex === totalQuestions - 1 || loading}
            className={`${baseBtn} ${ghost} order-2 sm:order-3`}
          >
            {t("quiz.navigation.next")}
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        )}
      </div>
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
