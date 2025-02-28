import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { handleProcessBrief } from "../../utils/api";
import { supabase } from "../../utils/supabaseClient";

const Brief = ({ selectedFile, user, lectureId }) => {
  const [brief, setBrief] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [noBriefExists, setNoBriefExists] = useState(false);
  console.log(brief)
  useEffect(() => {
    if (lectureId) {
      fetchBrief();
    }
  }, [lectureId]);

  const fetchBrief = async () => {
    try {
      const { data, error } = await supabase
        .from("briefs")
        .select("*")
        .eq("lecture_id", lectureId)
        .single();

      if (error) {
        // Check if the error is due to no rows returned
        if (error.code === "PGRST116") {
          setNoBriefExists(true);
          setError(null);
          return;
        }
        throw error;
      }

      setBrief(data);
      setCurrentPage(data.current_page || 1);
    } catch (err) {
      console.error("Error fetching brief:", err);
      setError("Failed to load brief");
    }
  };

  const generateBrief = async () => {
    if (!selectedFile?.id) {
      setError("No file selected");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const filePath = selectedFile.path.split("/").pop();

      const briefData = await handleProcessBrief(user.id, lectureId, filePath);

      // Check if a brief already exists
      const { data: existingBrief, error: fetchError } = await supabase
        .from("briefs")
        .select("*")
        .eq("lecture_id", lectureId)
        .single();

      let result;
      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      if (existingBrief) {
        // Update the existing brief
        const { data: updatedBrief, error: updateError } = await supabase
          .from("briefs")
          .update({
            total_pages: briefData.totalPages,
            summaries: briefData.pageSummaries,
            current_page: 1,
            metadata: {
              documentTitle: briefData.overview.documentTitle,
              mainThemes: briefData.overview.mainThemes,
              key_concepts: briefData.key_concepts,
              important_details: briefData.important_details,
            },
          })
          .eq("lecture_id", lectureId)
          .select()
          .single();

        if (updateError) throw updateError;
        result = updatedBrief;
      } else {
        // Insert a new brief
        const { data: insertedBrief, error: insertError } = await supabase
          .from("briefs")
          .insert({
            lecture_id: lectureId,
            user_id: user.id,
            total_pages: briefData.totalPages,
            summaries: briefData.pageSummaries,
            current_page: 1,
            metadata: {
              documentTitle: briefData.overview.documentTitle,
              mainThemes: briefData.overview.mainThemes,
              key_concepts: briefData.key_concepts,
              important_details: briefData.important_details,
            },
          })
          .select()
          .single();

        if (insertError) throw insertError;
        result = insertedBrief;
      }

      setBrief(result);
      setCurrentPage(1);
    } catch (err) {
      console.error("Error generating brief:", err);
      setError("Failed to generate brief");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= brief.total_pages) {
      setCurrentPage(newPage);
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2 text-red-700">
        <AlertCircle className="h-4 w-4" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Footer */}
      {brief && (
        <div className="p-4 border-t border-gray-200 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <button
              className={`p-2 rounded-md ${
                currentPage === 1
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {brief.total_pages}
            </span>
            <button
              className={`p-2 rounded-md ${
                currentPage === brief.total_pages
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === brief.total_pages}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <select
            className="border border-gray-200 rounded-md px-3 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={currentPage}
            onChange={(e) => handlePageChange(Number(e.target.value))}
          >
            {Array.from({ length: brief.total_pages }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Page {i + 1}
              </option>
            ))}
          </select>
        </div>
      )}
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Document Summary
          </h2>
          <button
            onClick={generateBrief}
            disabled={isLoading || !selectedFile}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium
              ${
                isLoading || !selectedFile
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            {brief ? "Regenerate" : "Generate"} Summary
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {brief ? (
          <div className="space-y-4">
            <div className="prose max-w-none">
              {brief.summaries[currentPage - 1]}
            </div>

            {brief.metadata && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="font-medium mb-2 text-gray-900">Key Concepts</h4>
                <div className="flex flex-wrap gap-2">
                  {brief.metadata?.key_concepts?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="font-medium mb-2 text-gray-900">
                        Key Concepts
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {brief.metadata.key_concepts.map((concept, i) => (
                          <span
                            key={i}
                            className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700"
                          >
                            {concept}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {isLoading ? (
              <div className="flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Generating summary...
              </div>
            ) : noBriefExists ? (
              <div className="flex flex-col items-center space-y-2">
                <p>No summary has been generated yet</p>
                {selectedFile && (
                  <p className="text-sm text-gray-400">
                    Click Generate Summary to create one
                  </p>
                )}
              </div>
            ) : (
              "Select a file and click Generate to create a summary"
            )}
          </div>
        )}
      </div>

      
    </div>
  );
};

Brief.propTypes = {
  selectedFile: PropTypes.shape({
    id: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    size: PropTypes.number,
    type: PropTypes.string,
  }),
  user: PropTypes.shape({
    id: PropTypes.string.isRequired,
    email: PropTypes.string,
  }).isRequired,
  lectureId: PropTypes.string.isRequired,
};

export default Brief;
