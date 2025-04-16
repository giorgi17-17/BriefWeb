import PropTypes from "prop-types";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

const QuizLoadingState = ({
  isLoading,
  isGenerating,
  noQuizExists,
  selectedFile,
}) => {
  const { t } = useTranslation();

  return (
    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
      {isLoading || isGenerating ? (
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          {isGenerating
            ? t("quiz.loading.evaluation")
            : t("quiz.loading.submission")}
        </div>
      ) : noQuizExists ? (
        <div className="flex flex-col items-center space-y-2">
          <p>{t("quiz.noQuiz")}</p>
          {selectedFile && (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {t("quiz.buttons.generate")}
            </p>
          )}
        </div>
      ) : (
        t("quiz.selectFile")
      )}
    </div>
  );
};

QuizLoadingState.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  isGenerating: PropTypes.bool.isRequired,
  noQuizExists: PropTypes.bool.isRequired,
  selectedFile: PropTypes.object,
};

export default QuizLoadingState;
