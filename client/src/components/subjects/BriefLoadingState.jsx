import PropTypes from "prop-types";
import { RefreshCw, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

const BriefLoadingState = ({
  isLoading,
  isPolling,
  noBriefExists,
  selectedFile,
}) => {
  const { t } = useTranslation();


  return (
    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
      {isLoading ? (
        <div className="flex flex-col items-center space-y-3">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            {t('lectures.lectureDetails.briefs.generatingTitle')}
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {t('lectures.lectureDetails.briefs.generatingHint')}
          </p>
        </div>
      ) : isPolling ? (
        <div className="flex flex-col items-center space-y-3">
          <div className="flex items-center justify-center">
            <Clock className="h-6 w-6 animate-pulse mr-2 text-blue-500" />
            {t('lectures.lectureDetails.briefs.pollingTitle')}
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {t('lectures.lectureDetails.briefs.noSummaryHint')}
          </p>
        </div>
      ) : noBriefExists ? (
        <div className="flex flex-col items-center space-y-2">
          <p>{t('lectures.lectureDetails.briefs.noSummaryYet')}</p>
          {selectedFile && (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {t('lectures.lectureDetails.briefs.generateCta')}
            </p>
          )}
        </div>
      ) : (
        t('lectures.lectureDetails.briefs.selectFileHint')
      )}
    </div>
  );
};

BriefLoadingState.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  isPolling: PropTypes.bool.isRequired,
  noBriefExists: PropTypes.bool.isRequired,
  selectedFile: PropTypes.object,
};

export default BriefLoadingState;
