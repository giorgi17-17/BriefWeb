import PropTypes from "prop-types";
import { RefreshCw } from "lucide-react";

const QuizLoadingState = ({ isLoading, isGenerating, noQuizExists, selectedFile }) => {
  return (
    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
      {isLoading || isGenerating ? (
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          {isGenerating ? "Generating quiz..." : "Loading quiz..."}
        </div>
      ) : noQuizExists ? (
        <div className="flex flex-col items-center space-y-2">
          <p>No quiz has been generated yet</p>
          {selectedFile && (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Click Generate Quiz to create one
            </p>
          )}
        </div>
      ) : (
        "Select a file and click Generate to create a quiz"
      )}
    </div>
  );
};

QuizLoadingState.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  isGenerating: PropTypes.bool.isRequired,
  noQuizExists: PropTypes.bool.isRequired,
  selectedFile: PropTypes.object
};

export default QuizLoadingState; 