import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import {
  ArrowLeftIcon,
  Calendar,
  Clock,
  CheckCircle,
  BarChart3,
  Info,
} from "lucide-react";

export default function QuizHistory({
  quizHistory,
  loadingHistory,
  onLoadQuiz,
  onClose,
}) {
  const { t, i18n } = useTranslation();

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString(i18n.language === "ka" ? "ka-GE" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format time for display
  const formatTime = (date) => {
    return date.toLocaleTimeString(i18n.language === "ka" ? "ka-GE" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get appropriate score badge color
  const getScoreBadgeClass = (score) => {
    if (score >= 90)
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    if (score >= 75)
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    if (score >= 60)
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg p-4">
      <div className="flex items-center mb-6">
        <button
          onClick={onClose}
          className="mr-3 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeftIcon size={18} />
        </button>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
          {t("quiz.history.title")}
        </h2>
      </div>

      {loadingHistory ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : quizHistory.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-6 rounded-lg text-center">
          <Info className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
            {t("quiz.history.noHistory")}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t("quiz.noQuiz")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {quizHistory.map((submission) => (
            <div
              key={submission.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
              onClick={() => onLoadQuiz(submission.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-800 dark:text-gray-200">
                    {submission.quizTitle}
                  </h3>
                  <div className="flex flex-col sm:flex-row sm:items-center mt-1 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center mb-1 sm:mb-0">
                      <Calendar className="w-4 h-4 mr-1.5" />
                      <span>
                        {t("quiz.history.date")}{" "}
                        {formatDate(submission.completedAt)}
                      </span>
                    </div>
                    <div className="flex items-center sm:ml-3">
                      <Clock className="w-4 h-4 mr-1.5" />
                      <span>{formatTime(submission.completedAt)}</span>
                    </div>
                    {submission.lectureTitle && (
                      <div className="flex items-center mt-1 sm:mt-0 sm:ml-3 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                        {submission.lectureTitle}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span
                    className={`inline-flex items-center text-sm font-medium px-2.5 py-0.5 rounded-full ${getScoreBadgeClass(
                      submission.score
                    )}`}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    {t("quiz.history.score")} {submission.score}%
                  </span>
                  <div className="flex items-center mt-2 text-xs text-blue-600 dark:text-blue-400">
                    <BarChart3 className="w-3.5 h-3.5 mr-1" />
                    <span>{t("quiz.history.view")}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

QuizHistory.propTypes = {
  quizHistory: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      quizTitle: PropTypes.string.isRequired,
      score: PropTypes.number.isRequired,
      completedAt: PropTypes.instanceOf(Date).isRequired,
      lectureTitle: PropTypes.string,
    })
  ).isRequired,
  loadingHistory: PropTypes.bool.isRequired,
  onLoadQuiz: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
