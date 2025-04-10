import { ChevronLeft } from "lucide-react";
import PropTypes from "prop-types";

const LectureHeader = ({  onBackClick }) => {
  return (
    <header className="flex items-center justify-between mb-4">
      <button
        onClick={onBackClick}
        className="flex items-center theme-text-secondary hover:text-blue-500 transition-colors"
      >
        <ChevronLeft className="w-5 h-5 mr-1" />
        <span className="font-medium">Back to Lectures</span>
      </button>
    </header>
  );
};

LectureHeader.propTypes = {
  lectureTitle: PropTypes.string.isRequired,
  subjectTitle: PropTypes.string,
  onBackClick: PropTypes.func.isRequired,
};

export default LectureHeader;
