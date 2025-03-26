import PropTypes from "prop-types";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

export const SubjectCard = ({ subject, onEdit, onDelete, isPremium }) => {
  const getFontSize = (text) => {
    if (text.length > 30) return "text-sm";
    if (text.length > 20) return "text-base";
    return "text-xl";
  };

  return (
    <div className="relative group flex items-center justify-center">
      <div className="border theme-border rounded-lg p-6 w-64 relative theme-card z-10 transition-all duration-400 transform hover:shadow-lg">
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            onClick={onEdit}
            className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-full transition-colors"
            aria-label="Edit subject"
          >
            <FiEdit2 size={16} />
          </button>

          {/* Only show delete button for premium users */}
          {isPremium && (
            <button
              onClick={onDelete}
              className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-full transition-colors"
              aria-label="Delete subject"
            >
              <FiTrash2 size={16} />
            </button>
          )}
        </div>
        <h3
          className={`${getFontSize(
            subject.name
          )} font-semibold mt-2 mb-2 flex items-center justify-center truncate theme-text-primary`}
        >
          {subject.name}
        </h3>
        <div className="text-sm theme-text-tertiary">
          {subject.lectureCount} Lectures
        </div>
      </div>
    </div>
  );
};

SubjectCard.propTypes = {
  subject: PropTypes.shape({
    name: PropTypes.string.isRequired,
    lectureCount: PropTypes.number.isRequired,
  }).isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  isPremium: PropTypes.bool,
};

SubjectCard.defaultProps = {
  isPremium: false,
};

export default SubjectCard;
