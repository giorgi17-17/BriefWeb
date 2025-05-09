import PropTypes from "prop-types";
import { RefreshCw, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { History } from "lucide-react";

const QuizHeader = ({
  quiz,
  noQuizExists,
  isLoading,
  isGenerating,
  selectedFile,
  isPremium,
  onGenerateQuiz,
  toggleOptionsPanel,
  showOptions,
  toggleHistory,
}) => {
  const { t } = useTranslation();

  return (
    <div className="p-4 w-full">
      <div className="flex justify-between items-center">
        {/* <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {t("quiz.title")}
        </h2> */}

        {/* Left side - History button */}
        <div>
          {/* Quiz History button */}
          <button
            onClick={toggleHistory}
            className="flex items-center space-x-1.5 text-sm font-medium text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 px-3 py-1.5 rounded-full hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors"
          >
            <History size={16} />
            <span>{t("quiz.historyTitle")}</span>
          </button>
        </div>

        {/* Right side - Settings and Generate buttons */}
        <div className="flex items-center space-x-2">
          {/* Settings button */}
          <button
            onClick={toggleOptionsPanel}
            className={`p-2 rounded-md ${
              showOptions
                ? "bg-gray-50 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400"
                : "text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-400"
            }`}
            aria-label={t("quiz.buttons.settings")}
          >
            <Settings size={18} />
          </button>

          {/* Only show generate button if no quiz exists yet OR user is premium */}
          {(noQuizExists || !quiz || isPremium) && (
            <button
              onClick={onGenerateQuiz}
              disabled={isLoading || isGenerating || !selectedFile}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium
                ${
                  isLoading || isGenerating || !selectedFile
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    : "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                }`}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${
                  isLoading || isGenerating ? "animate-spin" : ""
                }`}
              />
              {quiz ? t("quiz.buttons.regenerate") : t("quiz.buttons.generate")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

QuizHeader.propTypes = {
  quiz: PropTypes.object,
  noQuizExists: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  isGenerating: PropTypes.bool.isRequired,
  selectedFile: PropTypes.object,
  isPremium: PropTypes.bool.isRequired,
  onGenerateQuiz: PropTypes.func.isRequired,
  toggleOptionsPanel: PropTypes.func.isRequired,
  showOptions: PropTypes.bool.isRequired,
  toggleHistory: PropTypes.func.isRequired,
};

export default QuizHeader;
