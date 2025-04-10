import { useUserPlan } from "../../contexts/UserPlanContext";
import { useBrief } from "../../hooks/useBrief";
import PropTypes from "prop-types";

// Import our new components
import BriefHeader from "./BriefHeader";
import BriefContent from "./BriefContent";
import KeyConcepts from "./KeyConcepts";
import ImportantDetails from "./ImportantDetails";
import BriefPagination from "./BriefPagination";
import BriefLoadingState from "./BriefLoadingState";
import BriefErrorDisplay from "./BriefErrorDisplay";

const Brief = ({ selectedFile, user, lectureId }) => {
  const { isPremium } = useUserPlan();

  // Use our custom hook for brief data and operations
  const {
    brief,
    currentPage,
    isLoading,
    error,
    noBriefExists,
    generateBrief,
    handlePageChange,
  } = useBrief(lectureId, user);

  // Handler for generate brief button
  const handleGenerateBrief = () => {
    if (selectedFile) {
      generateBrief(selectedFile);
    }
  };

  // If there's an error, display it
  if (error) {
    return <BriefErrorDisplay error={error} />;
  }

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header with Generate button */}
      <BriefHeader
        brief={brief}
        noBriefExists={noBriefExists}
        isLoading={isLoading}
        selectedFile={selectedFile}
        isPremium={isPremium}
        onGenerateBrief={handleGenerateBrief}
      />

      {/* Content area */}
      <div className="p-4">
        {brief ? (
          <div>
            {/* Pagination controls */}
            <BriefPagination
              currentPage={currentPage}
              totalPages={brief.total_pages}
              onPageChange={handlePageChange}
            />
            {/* Main content */}
            <BriefContent brief={brief} currentPage={currentPage} />

            {/* Key concepts */}
            {brief.metadata?.key_concepts && (
              <KeyConcepts concepts={brief.metadata.key_concepts} />
            )}

            {/* Important details */}
            {brief.metadata?.important_details && (
              <ImportantDetails details={brief.metadata.important_details} />
            )}

            
          </div>
        ) : (
          <BriefLoadingState
            isLoading={isLoading}
            noBriefExists={noBriefExists}
            selectedFile={selectedFile}
          />
        )}
      </div>
    </div>
  );
};

Brief.propTypes = {
  selectedFile: PropTypes.object,
  user: PropTypes.object.isRequired,
  lectureId: PropTypes.string.isRequired,
};

export default Brief;
