import PropTypes from "prop-types";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

export const SubjectCard = ({ subject, onEdit, onDelete }) => {
  const getFontSize = (text) => {
    if (text.length > 30) return "text-sm";
    if (text.length > 20) return "text-base";
    return "text-xl";
  };

  return (
    <div className="relative group flex items-center justify-center">
      {/* Gradient border overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-50 transition-opacity duration-300 rounded-lg"
        style={{
          background: `radial-gradient(circle, rgba(0, 0, 139, 0.4), rgba(139, 0, 0, 0.4), rgba(153, 153, 20, 0.4))`,
          backgroundSize: "200% 200%",
          animation: "rotateGradient 5s linear infinite",
          filter: "blur(10px)",
        }}
      />

      <style>
        {`
          @keyframes rotateGradient {
            0% {
              background-position: 50% 0%;
            }
            25% {
              background-position: 100% 50%;
            }
            50% {
              background-position: 50% 100%;
            }
            75% {
              background-position: 0% 50%;
            }
            100% {
              background-position: 50% 0%;
            }
          }
        `}
      </style>

      {/* Main card content */}
      <div className="border rounded-lg p-6 w-64 relative bg-white z-10 transition-transform duration-300">
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            onClick={onEdit}
            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
            aria-label="Edit subject"
          >
            <FiEdit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-red-600 hover:bg-red-100 rounded-full transition-colors"
            aria-label="Delete subject"
          >
            <FiTrash2 size={16} />
          </button>
        </div>
        <h3
          className={`${getFontSize(
            subject.name
          )} font-semibold mb-2 flex items-center justify-center truncate`}
        >
          {subject.name}
        </h3>
        <div className="text-sm text-gray-500">{subject.lectureCount} Lectures</div>
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
};

export default SubjectCard;
