import PropTypes from "prop-types";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

const BriefHeader = ({
  brief,
  noBriefExists,
  isLoading,
  isPolling,
  selectedFile,
  isPremium,
  onGenerateBrief,
}) => {
  const { t } = useTranslation();

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {t("lectures.lectureDetails.briefs.title")}
        </h2>

        {/* Only show button if no brief exists yet OR user is premium */}
        {(noBriefExists || !brief || isPremium) && (
          <button
            onClick={onGenerateBrief}
            disabled={isLoading || isPolling || !selectedFile}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium
              ${isLoading || isPolling || !selectedFile
                ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
              }`}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading || isPolling ? "animate-spin" : ""
                }`}
            />
            {isPolling
              ? t("lectures.lectureDetails.briefs.checkingStatus")
              : isLoading
                ? t("lectures.lectureDetails.briefs.generating")
                : brief
                  ? t("lectures.lectureDetails.briefs.regenerate")
                  : t("lectures.lectureDetails.briefs.generate")}{" "}
            {t("lectures.lectureDetails.briefs.summarySuffix")}
          </button>
        )}
      </div>
    </div>
  );
};

BriefHeader.propTypes = {
  brief: PropTypes.object,
  noBriefExists: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  isPolling: PropTypes.bool.isRequired,
  selectedFile: PropTypes.object,
  isPremium: PropTypes.bool.isRequired,
  onGenerateBrief: PropTypes.func.isRequired,
};

export default BriefHeader;
