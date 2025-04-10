import PropTypes from "prop-types";

const OpenEndedQuestion = ({
  question,
  userAnswer,
  onAnswerChange,
  showResults,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
        {question.question_text}
      </h3>

      <div>
        <textarea
          className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 theme-bg-primary theme-text-primary ${
            showResults
              ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
              : "bg-white dark:bg-gray-900"
          }`}
          placeholder="Type your answer here..."
          rows={5}
          value={userAnswer || ""}
          onChange={(e) => onAnswerChange(question.id, e.target.value)}
          disabled={showResults}
        />
      </div>

      {showResults && question.model_answer && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-lg">
          <h4 className="font-medium text-green-700 dark:text-green-400 mb-2">
            Sample Answer
          </h4>
          <p className="text-gray-800 dark:text-gray-200">
            {question.model_answer}
          </p>
        </div>
      )}
    </div>
  );
};

OpenEndedQuestion.propTypes = {
  question: PropTypes.shape({
    id: PropTypes.string.isRequired,
    question_text: PropTypes.string.isRequired,
    model_answer: PropTypes.string,
  }).isRequired,
  userAnswer: PropTypes.string,
  onAnswerChange: PropTypes.func.isRequired,
  showResults: PropTypes.bool.isRequired,
};

export default OpenEndedQuestion;
