import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

const QuizResults = ({
  score,
  onResetQuiz,
  showResults,
  isHistorical = false,
}) => {
  const { t } = useTranslation();

  if (!showResults) return null;

  return (
    <div className="text-center py-4 space-y-4">
      <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
        {isHistorical
          ? t("quiz.results.previousQuiz")
          : t("quiz.results.yourScore")}
      </h3>

      <div className="flex flex-col items-center">
        <div className="relative h-28 w-28 mb-3">
          <svg className="h-full w-full" viewBox="0 0 36 36">
            <path
              className="stroke-current text-gray-200 dark:text-gray-700"
              fill="none"
              strokeWidth="3"
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={`stroke-current ${
                score.percentage >= 80
                  ? "text-green-500"
                  : score.percentage >= 60
                  ? "text-yellow-500"
                  : "text-red-500"
              }`}
              fill="none"
              strokeWidth="3"
              strokeDasharray={`${score.percentage}, 100`}
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <text
              x="18"
              y="20.5"
              textAnchor="middle"
              className="font-bold text-gray-800 dark:text-gray-200 text-[0.5em]"
            >
              {t("quiz.results.percentage", { score: score.percentage })}
            </text>
          </svg>
        </div>

        <div className="text-lg text-gray-700 dark:text-gray-300 mb-3">
          {t("quiz.results.correct")} {score.correct} {t("quiz.results.of")}{" "}
          {score.total}
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onResetQuiz}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            isHistorical
              ? "bg-gray-600 hover:bg-gray-700 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isHistorical
            ? t("quiz.buttons.exitReview")
            : t("quiz.results.tryAgain")}
        </button>
      </div>
    </div>
  );
};

QuizResults.propTypes = {
  score: PropTypes.shape({
    correct: PropTypes.number.isRequired,
    total: PropTypes.number.isRequired,
    percentage: PropTypes.number.isRequired,
  }).isRequired,
  onResetQuiz: PropTypes.func.isRequired,
  showResults: PropTypes.bool.isRequired,
  isHistorical: PropTypes.bool,
};

export default QuizResults;
