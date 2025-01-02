import PropTypes from "prop-types";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

export const SubjectCard = ({ subject, onEdit, onDelete }) => {
  const getFontSize = (text) => {
    if (text.length > 30) return 'text-sm';
    if (text.length > 20) return 'text-base';
    return 'text-xl';
  };

  return (
    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow w-64 relative group">
      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
          aria-label="Edit subject"
        >
          <FiEdit2 size={16} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition-colors"
          aria-label="Delete subject"
        >
          <FiTrash2 size={16} />
        </button>
      </div>
      <h3 className={`${getFontSize(subject.name)} font-semibold mb-2 flex items-center justify-center truncate`}>
        {subject.name}
      </h3>
      <div className="text-sm text-gray-500">
        {/* {subject.lectureCount} Lectures */}
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
  onDelete: PropTypes.func
};
