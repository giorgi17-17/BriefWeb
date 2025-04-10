import PropTypes from "prop-types";
import { formatSummaryText } from "../../utils/briefFormatters";

const BriefContent = ({ brief, currentPage }) => {
  if (!brief) return null;

  return (
    <div className="space-y-3">
      <div
        className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 leading-relaxed prose-headings:font-medium prose-headings:mt-3 prose-headings:mb-1 prose-p:my-1.5 prose-p:text-base prose-li:text-base prose-li:my-0.5 prose-ol:my-1.5 prose-ul:my-1.5 prose-ol:pl-5 prose-ul:pl-5"
        dangerouslySetInnerHTML={{
          __html: formatSummaryText(brief.summaries[currentPage - 1]),
        }}
      />
    </div>
  );
};

BriefContent.propTypes = {
  brief: PropTypes.object,
  currentPage: PropTypes.number.isRequired
};

export default BriefContent; 