import PropTypes from "prop-types";
import { RefreshCw } from "lucide-react";

const BriefLoadingState = ({ isLoading, noBriefExists, selectedFile }) => {
  return (
    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
      {isLoading ? (
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Generating summary...
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
  noBriefExists: PropTypes.bool.isRequired,
  selectedFile: PropTypes.object
};

export default BriefLoadingState; 