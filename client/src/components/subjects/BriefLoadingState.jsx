import PropTypes from "prop-types";
import { RefreshCw, Clock } from "lucide-react";

const BriefLoadingState = ({
  isLoading,
  isPolling,
  noBriefExists,
  selectedFile,
}) => {
  return (
    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
      {isLoading ? (
        <div className="flex flex-col items-center space-y-3">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Generating summary...
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            This may take up to 2 minutes for complex documents
          </p>
        </div>
      ) : isPolling ? (
        <div className="flex flex-col items-center space-y-3">
          <div className="flex items-center justify-center">
            <Clock className="h-6 w-6 animate-pulse mr-2 text-blue-500" />
            Checking for completion...
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            The summary generation is taking longer than expected. We're
            checking if it completed in the background.
          </p>
        </div>
      ) : noBriefExists ? (
        <div className="flex flex-col items-center space-y-2">
          <p>No summary has been generated yet</p>
          {selectedFile && (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Click Generate Summary to create one
            </p>
          )}
        </div>
      ) : (
        "Select a file and click Generate to create a summary"
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
