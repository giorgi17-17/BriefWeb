import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Check, AlertCircle, LightbulbIcon } from "lucide-react";

const OpenEndedQuestion = ({
  question,
  userAnswer,
  onAnswerChange,
  showResults,
  aiEvaluation,
}) => {
  const { t } = useTranslation();

  // Use the provided evaluation from the quiz submission
  const evaluation = aiEvaluation;

  // Get model answer from the first option (which should be the sample answer)
  const getModelAnswer = () => {
    if (question.model_answer) {
      return question.model_answer;
    }

    // Check if options exist and find the correct option (sample answer)
    if (question.options && question.options.length > 0) {
      const correctOption = question.options.find(
        (option) => option.is_correct === true
      );
      if (correctOption) {
        return correctOption.option_text;
      }
    }

    return ""; // Fallback to empty string if no model answer is found
  };

  // Get model answer for the UI display
  const modelAnswer = getModelAnswer();

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
          placeholder={t("quiz.questions.enterAnswer")}
          rows={5}
          value={userAnswer || ""}
          onChange={(e) => onAnswerChange(question.id, e.target.value)}
          disabled={showResults}
        />
      </div>

      {evaluation && (
        <div
          className={`mt-4 p-4 border rounded-lg ${
            evaluation.isCorrect
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
          }`}
        >
          <div className="flex items-start">
            <div
              className={`rounded-full p-1 mr-3 ${
                evaluation.isCorrect
                  ? "bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300"
                  : "bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-300"
              }`}
            >
              {evaluation.isCorrect ? (
                <Check className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h4
                className={`font-medium mb-1 ${
                  evaluation.isCorrect
                    ? "text-green-700 dark:text-green-400"
                    : "text-red-700 dark:text-red-400"
                } flex items-center`}
              >
                {evaluation.isCorrect
                  ? t("quiz.results.correct")
                  : t("quiz.questions.feedback")}{" "}
                <span className="ml-2 text-sm font-normal">
                  ({evaluation.score}/100)
                </span>
              </h4>
              <p className="text-gray-700 dark:text-gray-300">
                {evaluation.feedback}
              </p>
            </div>
          </div>
        </div>
      )}

      {showResults && modelAnswer && !evaluation && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-lg">
          <div className="flex items-start">
            <div className="rounded-full p-1 mr-3 bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300">
              <LightbulbIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-medium text-green-700 dark:text-green-400 mb-2">
                {t("quiz.questions.modelAnswer")}
              </h4>
              <p className="text-gray-800 dark:text-gray-200">{modelAnswer}</p>
            </div>
          </div>
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
    options: PropTypes.array,
  }).isRequired,
  userAnswer: PropTypes.string,
  onAnswerChange: PropTypes.func.isRequired,
  showResults: PropTypes.bool.isRequired,
  aiEvaluation: PropTypes.object,
};

export default OpenEndedQuestion;
