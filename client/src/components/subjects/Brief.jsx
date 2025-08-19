import { useUserPlan } from "../../contexts/UserPlanContext";
import { useBrief } from "../../hooks/useBrief";
import PropTypes from "prop-types";
import { useEffect } from "react";
import { debugLog } from "../../utils/debugLogger";
import ErrorBoundary from "../ErrorBoundary";

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
    isPolling,
    error,
    noBriefExists,
    generateBrief,
    handlePageChange,
  } = useBrief(lectureId, user);

  useEffect(() => {
    if (brief) {
      debugLog("✅ Brief component received updated brief data:", {
        briefId: brief.id,
        totalPages: brief.total_pages,
        currentPage,
        summariesLength: brief.summaries ? brief.summaries.length : 0,
        hasSummaries: !!brief.summaries,
        firstSummaryPreview: brief.summaries?.[0]?.substring(0, 50) + "..."
      });
    } else {
      debugLog("⚠️ Brief component has no brief data");
    }
  }, [brief, currentPage]);

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
    <ErrorBoundary message="Error loading document summary">
      <div className="w-full rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header with Generate button */}
      <BriefHeader
        brief={brief}
        noBriefExists={noBriefExists}
        isLoading={isLoading}
        isPolling={isPolling}
        selectedFile={selectedFile}
        isPremium={isPremium}
        onGenerateBrief={handleGenerateBrief}
      />

      {/* Content area */}
      <div className="p-4">
        {brief ? (
          <div key={brief.id || brief.lecture_id}>
            {/* Pagination controls */}
            {brief.total_pages > 1 ? (
              <BriefPagination
                currentPage={currentPage}
                totalPages={brief.total_pages}
                onPageChange={handlePageChange}
              />
            ) : (
              <div className="mb-4 text-right">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Single page document
                </span>
              </div>
            )}
            {/* Main content - Add key to force re-render */}
            <BriefContent 
              key={`${brief.id}-${currentPage}`}
              brief={brief} 
              currentPage={currentPage} 
            />

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
            isPolling={isPolling}
            noBriefExists={noBriefExists}
            selectedFile={selectedFile}
          />
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
};

Brief.propTypes = {
  selectedFile: PropTypes.shape({
    id: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
  }),
  user: PropTypes.object.isRequired,
  lectureId: PropTypes.string.isRequired,
};

export default Brief;
