import PropTypes from "prop-types";
import { Check, X } from "lucide-react";

const MultipleChoiceQuestion = ({
  question,
  userAnswer,
  onSelectAnswer,
  showResults,
}) => {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
        {question.question_text}
      </h3>

      <div className="space-y-2">
        {question.options.map((option) => {
          const isSelected = userAnswer === option.id;
          const isCorrect = option.is_correct;
          const isWrongSelection = showResults && isSelected && !isCorrect;
          const isCorrectAnswer = showResults && isCorrect;

          return (
            <div
              key={option.id}
              className={`flex p-3 border rounded-lg transition-colors ${
                isSelected && !showResults
                  ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20"
                  : isWrongSelection
                  ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20"
                  : isCorrectAnswer
                  ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
              onClick={() =>
                !showResults && onSelectAnswer(question.id, option.id)
              }
            >
              <div className="flex-1">
                <p
                  className={`${
                    showResults && isCorrect
                      ? "text-green-700 dark:text-green-400 font-medium"
                      : isWrongSelection
                      ? "text-red-700 dark:text-red-400 font-medium"
                      : isSelected
                      ? "text-blue-700 dark:text-blue-400 font-medium"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {option.option_text}
                </p>
              </div>

              {showResults && isCorrect && (
                <Check className="text-green-500 dark:text-green-400 h-5 w-5 ml-2" />
              )}

              {isWrongSelection && (
                <X className="text-red-500 dark:text-red-400 h-5 w-5 ml-2" />
              )}

              {isSelected && !showResults && (
                <div className="w-2 h-2 rounded-full bg-blue-500 self-center ml-2"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

MultipleChoiceQuestion.propTypes = {
  question: PropTypes.shape({
    id: PropTypes.string.isRequired,
    question_text: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        option_text: PropTypes.string.isRequired,
        is_correct: PropTypes.bool,
      })
    ).isRequired,
  }).isRequired,
  userAnswer: PropTypes.string,
  onSelectAnswer: PropTypes.func.isRequired,
  showResults: PropTypes.bool.isRequired,
};

export default MultipleChoiceQuestion;
