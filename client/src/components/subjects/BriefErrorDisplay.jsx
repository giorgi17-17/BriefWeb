import PropTypes from "prop-types";
import { AlertCircle } from "lucide-react";

const BriefErrorDisplay = ({ error }) => {
  if (!error) return null;

  return (
    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center space-x-2 text-red-700 dark:text-red-300">
      <AlertCircle className="h-4 w-4" />
      <span>{error}</span>
    </div>
  );
};

BriefErrorDisplay.propTypes = {
  error: PropTypes.string
};

export default BriefErrorDisplay; 