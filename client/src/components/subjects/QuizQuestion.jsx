import PropTypes from "prop-types";
import MultipleChoiceQuestion from "./MultipleChoiceQuestion";
import OpenEndedQuestion from "./OpenEndedQuestion";
import CaseStudyQuestion from "./CaseStudyQuestion";

const QuizQuestion = ({
  question,
  userAnswer,
  onSelectAnswer,
  onOpenEndedAnswer,
  showResults,
  aiEvaluations,
}) => {
  if (!question) return null;

  const questionEvaluation = aiEvaluations?.[question.id];

  switch (question.question_type) {
    case "multiple_choice":
      return (
        <MultipleChoiceQuestion
          question={question}
          userAnswer={userAnswer}
          onSelectAnswer={onSelectAnswer}
          showResults={showResults}
        />
      );

    case "open_ended":
      return (
        <OpenEndedQuestion
          question={question}
          userAnswer={userAnswer}
          onAnswerChange={onOpenEndedAnswer}
          showResults={showResults}
          aiEvaluation={questionEvaluation}
        />
      );

    case "case_study":
    case "case_study_moderate":
    case "case_study_advanced":
      return (
        <CaseStudyQuestion
          question={question}
          userAnswer={userAnswer}
          onAnswerChange={onOpenEndedAnswer}
          showResults={showResults}
          aiEvaluation={questionEvaluation}
        />
      );

    default:
      return (
        <div className="p-4 border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-yellow-700 dark:text-yellow-500">
            Unknown question type: {question.question_type}
          </p>
        </div>
      );
  }
};

QuizQuestion.propTypes = {
  question: PropTypes.shape({
    id: PropTypes.string.isRequired,
    question_text: PropTypes.string.isRequired,
    question_type: PropTypes.string.isRequired,
    options: PropTypes.array,
  }),
  userAnswer: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  onSelectAnswer: PropTypes.func.isRequired,
  onOpenEndedAnswer: PropTypes.func.isRequired,
  showResults: PropTypes.bool.isRequired,
  aiEvaluations: PropTypes.object,
};

export default QuizQuestion;
