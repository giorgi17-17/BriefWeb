import { Book } from "lucide-react";
import PropTypes from "prop-types";

const SubjectCard = ({ subject, onClick }) => {
  const { title, description, lectureCount } = subject;

  const iconColors = [
    "text-blue-500",
    "text-purple-500",
    "text-green-500",
    "text-yellow-500",
    "text-red-500",
    "text-indigo-500",
  ];

  // Generate a stable color based on the subject title
  const colorIndex =
    subject.title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    iconColors.length;

  return (
    <div
      className="theme-card rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-300"
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`p-2 rounded-lg ${iconColors[colorIndex]} bg-opacity-20 theme-bg-secondary`}
          >
            <Book className="h-5 w-5" />
          </div>
          <h2 className="font-semibold text-lg theme-text-primary line-clamp-1">
            {title}
          </h2>
        </div>
        {description && (
          <p className="theme-text-secondary text-sm line-clamp-2 mb-4">
            {description}
          </p>
        )}
        <div className="flex justify-between items-center mt-1">
          <p className="theme-text-tertiary text-sm">
            {lectureCount} {lectureCount === 1 ? "lecture" : "lectures"}
          </p>
          <span className="text-xs theme-bg-secondary theme-text-secondary px-2 py-0.5 rounded-full">
            View subject
          </span>
        </div>
      </div>
    </div>
  );
};

SubjectCard.propTypes = {
  subject: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    lectureCount: PropTypes.number.isRequired,
  }).isRequired,
  onClick: PropTypes.func.isRequired,
};

export default SubjectCard;
