import PropTypes from "prop-types";

const CaseStudyQuestion = ({
  question,
  userAnswer,
  onAnswerChange,
  showResults,
}) => {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg mb-4">
        <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2">
          Case Study
        </h3>
        <p className="text-gray-700 dark:text-gray-300">
          {question.case_description || question.question_text}
        </p>
      </div>

      <div>
        <h4 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">
          {question.prompt_text || "What would you recommend in this case?"}
        </h4>

        <textarea
          className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 theme-bg-primary theme-text-primary ${
            showResults
              ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
              : "bg-white dark:bg-gray-900"
          }`}
          placeholder="Type your analysis here..."
          rows={6}
          value={userAnswer || ""}
          onChange={(e) => onAnswerChange(question.id, e.target.value)}
          disabled={showResults}
        />
      </div>

      {showResults && question.model_answer && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-lg">
          <h4 className="font-medium text-green-700 dark:text-green-400 mb-2">
            Sample Analysis
          </h4>
          <p className="text-gray-800 dark:text-gray-200">
            {question.model_answer}
          </p>
        </div>
      )}
    </div>
  );
};

CaseStudyQuestion.propTypes = {
  question: PropTypes.shape({
    id: PropTypes.string.isRequired,
    question_text: PropTypes.string.isRequired,
    case_description: PropTypes.string,
    prompt_text: PropTypes.string,
    model_answer: PropTypes.string,
  }).isRequired,
  userAnswer: PropTypes.string,
  onAnswerChange: PropTypes.func.isRequired,
  showResults: PropTypes.bool.isRequired,
};

export default CaseStudyQuestion;
