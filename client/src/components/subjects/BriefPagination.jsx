import PropTypes from "prop-types";
import { ChevronLeft, ChevronRight } from "lucide-react";

const BriefPagination = ({ currentPage, totalPages, onPageChange }) => {
  console.log("BriefPagination props:", { currentPage, totalPages });

  // Always show pagination controls, even for single-page briefs
  // if (!totalPages || totalPages <= 1) {
  //   console.log("Pagination hidden: totalPages is", totalPages);
  //   return null;
  // }

  // Set a minimum of 1 page
  const pages = totalPages || 1;

  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center space-x-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={`p-2 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500
            ${
              currentPage <= 1
                ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          onClick={() => onPageChange(currentPage + 1)} 
          disabled={currentPage >= pages}
          className={`p-2 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500
            ${
              currentPage >= pages
                ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
        Page {currentPage} of {pages}
      </span>
    </div>
  );
};

BriefPagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number,
  onPageChange: PropTypes.func.isRequired,
};

export default BriefPagination;
