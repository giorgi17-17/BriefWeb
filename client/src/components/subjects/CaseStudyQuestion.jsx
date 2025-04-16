import PropTypes from "prop-types";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { evaluateAnswer } from "../../utils/api";
import { Check, AlertCircle, Loader2, Star, LightbulbIcon } from "lucide-react";

const CaseStudyQuestion = ({
  question,
  userAnswer,
  onAnswerChange,
  showResults,
  aiEvaluation,
}) => {
  const { t } = useTranslation();
  const [manualAiEvaluation, setManualAiEvaluation] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState(null);

  // Use either the provided evaluation from the quiz submission or the manual one
  const evaluation = aiEvaluation || manualAiEvaluation;

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

  const handleEvaluateAnswer = async () => {
    if (!userAnswer || userAnswer.trim() === "") {
      setEvaluationError(
        "Please provide an answer before requesting feedback."
      );
      return;
    }

    setIsEvaluating(true);
    setEvaluationError(null);

    try {
      const modelAnswer = getModelAnswer();

      if (!question.question_text) {
        throw new Error("Question text is missing");
      }

      const evaluation = await evaluateAnswer(
        question.question_text,
        modelAnswer,
        userAnswer
      );
      setManualAiEvaluation(evaluation);
    } catch (error) {
      setEvaluationError("Failed to evaluate your answer. Please try again.");
      console.error("Error evaluating answer:", error);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Get model answer for the UI display
  const modelAnswer = getModelAnswer();

  // Get score category for styling
  const getScoreCategory = (score) => {
    if (score >= 90) return "excellent";
    if (score >= 80) return "great";
    if (score >= 70) return "good";
    return "fair";
  };

  // Get score text for display
  const getScoreText = (score) => {
    if (score >= 90) return "Excellent!";
    if (score >= 80) return "Great job!";
    if (score >= 70) return "Good work!";
    return "Nice effort!";
  };

  // Get appropriate styling based on score
  const getScoreStyling = (score) => {
    const category = getScoreCategory(score);

    const styles = {
      excellent: {
        bgColor: "bg-green-50 dark:bg-green-900/20",
        borderColor: "border-green-200 dark:border-green-800",
        iconBg: "bg-green-100 dark:bg-green-800",
        iconColor: "text-green-600 dark:text-green-300",
        textColor: "text-green-700 dark:text-green-400",
      },
      great: {
        bgColor: "bg-blue-50 dark:bg-blue-900/20",
        borderColor: "border-blue-200 dark:border-blue-800",
        iconBg: "bg-blue-100 dark:bg-blue-800",
        iconColor: "text-blue-600 dark:text-blue-300",
        textColor: "text-blue-700 dark:text-blue-400",
      },
      good: {
        bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
        borderColor: "border-indigo-200 dark:border-indigo-800",
        iconBg: "bg-indigo-100 dark:bg-indigo-800",
        iconColor: "text-indigo-600 dark:text-indigo-300",
        textColor: "text-indigo-700 dark:text-indigo-400",
      },
      fair: {
        bgColor: "bg-purple-50 dark:bg-purple-900/20",
        borderColor: "border-purple-200 dark:border-purple-800",
        iconBg: "bg-purple-100 dark:bg-purple-800",
        iconColor: "text-purple-600 dark:text-purple-300",
        textColor: "text-purple-700 dark:text-purple-400",
      },
    };

    return styles[category];
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg mb-4">
        <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2">
          {t("quiz.questions.caseStudy")}
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
          placeholder={t("quiz.questions.enterAnswer")}
          rows={6}
          value={userAnswer || ""}
          onChange={(e) => onAnswerChange(question.id, e.target.value)}
          disabled={showResults}
        />
      </div>

      {!showResults && !evaluation && (
        <div className="flex items-center justify-end space-x-2">
          {evaluationError && (
            <p className="text-red-500 text-sm mr-auto">{evaluationError}</p>
          )}
          <button
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              isEvaluating
                ? "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
            onClick={handleEvaluateAnswer}
            disabled={isEvaluating || !userAnswer}
          >
            {isEvaluating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t("quiz.loading.evaluation")}</span>
              </>
            ) : (
              <span>{t("quiz.questions.feedback")}</span>
            )}
          </button>
        </div>
      )}

      {evaluation && (
        <div
          className={`mt-4 p-4 border rounded-lg ${
            getScoreStyling(evaluation.score).bgColor
          } ${getScoreStyling(evaluation.score).borderColor}`}
        >
          <div className="flex items-start">
            <div
              className={`rounded-full p-1 mr-3 ${
                getScoreStyling(evaluation.score).iconBg
              } ${getScoreStyling(evaluation.score).iconColor}`}
            >
              <Star className="w-5 h-5" />
            </div>
            <div>
              <h4
                className={`font-medium mb-1 ${
                  getScoreStyling(evaluation.score).textColor
                } flex items-center`}
              >
                {getScoreText(evaluation.score)}{" "}
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

CaseStudyQuestion.propTypes = {
  question: PropTypes.shape({
    id: PropTypes.string.isRequired,
    question_text: PropTypes.string.isRequired,
    case_description: PropTypes.string,
    prompt_text: PropTypes.string,
    model_answer: PropTypes.string,
    options: PropTypes.array,
  }).isRequired,
  userAnswer: PropTypes.string,
  onAnswerChange: PropTypes.func.isRequired,
  showResults: PropTypes.bool.isRequired,
  aiEvaluation: PropTypes.object,
};

export default CaseStudyQuestion;
