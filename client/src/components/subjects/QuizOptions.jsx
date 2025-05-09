import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

const QuizOptions = ({ quizOptions, onOptionChange, showOptions }) => {
  const { t } = useTranslation();

  if (!showOptions) return null;

  return (
    <div className="p-4 mb-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-3">
        {t("quiz.options.title")}
      </h3>

      <div className="space-y-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="includeMultipleChoice"
            checked={quizOptions.includeMultipleChoice}
            onChange={(e) =>
              onOptionChange("includeMultipleChoice", e.target.checked)
            }
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label
            htmlFor="includeMultipleChoice"
            className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
          >
            {t("quiz.options.multipleChoice")}
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="includeOpenEnded"
            checked={quizOptions.includeOpenEnded}
            onChange={(e) =>
              onOptionChange("includeOpenEnded", e.target.checked)
            }
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label
            htmlFor="includeOpenEnded"
            className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
          >
            {t("quiz.options.openEnded")}
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="includeCaseStudies"
            checked={quizOptions.includeCaseStudies}
            onChange={(e) =>
              onOptionChange("includeCaseStudies", e.target.checked)
            }
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label
            htmlFor="includeCaseStudies"
            className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
          >
            {t("quiz.options.caseStudy")}
          </label>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Select at least one question type to generate.
      </p>
    </div>
  );
};

QuizOptions.propTypes = {
  quizOptions: PropTypes.shape({
    includeMultipleChoice: PropTypes.bool.isRequired,
    includeOpenEnded: PropTypes.bool.isRequired,
    includeCaseStudies: PropTypes.bool.isRequired,
  }).isRequired,
  onOptionChange: PropTypes.func.isRequired,
  showOptions: PropTypes.bool.isRequired,
};

export default QuizOptions;
