import PropTypes from "prop-types";

const QuizResults = ({ score, onResetQuiz, showResults }) => {
  if (!showResults) return null;

  return (
    <div className="text-center py-6 space-y-6">
      <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
        Quiz Results
      </h3>
      
      <div className="flex flex-col items-center">
        <div className="relative h-32 w-32 mb-4">
          <svg className="h-full w-full" viewBox="0 0 36 36">
            <path
              className="stroke-current text-gray-200 dark:text-gray-700"
              fill="none"
              strokeWidth="3"
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={`stroke-current ${
                score.percentage >= 80
                  ? "text-green-500"
                  : score.percentage >= 60
                  ? "text-yellow-500"
                  : "text-red-500"
              }`}
              fill="none"
              strokeWidth="3"
              strokeDasharray={`${score.percentage}, 100`}
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <text
              x="18"
              y="20.5"
              textAnchor="middle"
              className="font-bold text-gray-800 dark:text-gray-200 text-[0.5em]"
            >
              {score.percentage}%
            </text>
          </svg>
        </div>
        
        <div className="text-lg text-gray-700 dark:text-gray-300">
          You answered {score.correct} out of {score.total} questions correctly
        </div>
      </div>
      
      <div className="pt-4">
        <button
          onClick={onResetQuiz}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          Retake Quiz
        </button>
      </div>
    </div>
  );
};

QuizResults.propTypes = {
  score: PropTypes.shape({
    correct: PropTypes.number.isRequired,
    total: PropTypes.number.isRequired,
    percentage: PropTypes.number.isRequired
  }).isRequired,
  onResetQuiz: PropTypes.func.isRequired,
  showResults: PropTypes.bool.isRequired
};

export default QuizResults; 