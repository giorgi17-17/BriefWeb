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
import { useUserPlan } from "../../contexts/UserPlanContext";

const Brief = ({ selectedFile, user, lectureId }) => {
  const [brief, setBrief] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [noBriefExists, setNoBriefExists] = useState(false);
  const { isPremium } = useUserPlan();
  console.log(brief);
  useEffect(() => {
    if (lectureId) {
      fetchBrief();
    }
  }, [lectureId]);

  // Format the text to improve readability
  const formatSummaryText = (text) => {
    if (!text) return "";

    // First, deal with specific patterns in the example text
    // Replace patterns like "1. Real-Time Experience:" with proper headings
    let formattedText = text.replace(
      /(\d+)\.\s+([A-Z][a-z]+(?:[-\s][A-Z][a-z]+)*)\s*(?:\n\s*)?:/g,
      "\n$1. **$2**:\n"
    );

    // Fix broken words across line breaks (like "Experienc\ne")
    formattedText = formattedText.replace(/(\w+)\s*\n\s*([a-z]+)/g, "$1$2");

    // Clean up other line breaks and whitespace
    formattedText = formattedText.replace(/([^.!?:])\n+/g, "$1 ");

    // Specifically handle the dash list pattern in the example
    formattedText = formattedText.replace(/([.:]) -/g, "$1\n-");

    // Normalize other whitespace
    formattedText = formattedText.replace(/\s{2,}/g, " ").trim();

    // Add proper breaks for list items
    formattedText = formattedText.replace(/\.\s+(\d+)\./g, ".\n$1.");

    // Split by lines while preserving paragraphs
    const lines = formattedText.split(/\n/).filter((line) => line.trim());

    // Process each line to identify list items
    let inList = false;
    let listItems = [];
    let result = [];

    lines.forEach((line) => {
      // Check if this is a numbered list item
      const numberedMatch = line.match(/^\s*(\d+)\.\s+(.*)/);

      if (numberedMatch) {
        const [, number, content] = numberedMatch;

        // Check if it's a header-style item (looks like a title)
        if (content.includes(":") && content.length < 50) {
          // This is a section header
          if (inList) {
            // Close previous list if we were in one
            result.push(
              `<ol class="list-decimal pl-5 space-y-0.5 mb-2">${listItems.join(
                ""
              )}</ol>`
            );
            listItems = [];
            inList = false;
          }

          result.push(
            `<h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mt-3 mb-1">${number}. ${content.trim()}</h3>`
          );
        } else {
          // This is a regular list item
          if (!inList) {
            inList = true;
          }

          // Process content for any bold text
          const processedContent = content.replace(
            /\*\*([^*]+)\*\*/g,
            '<span class="font-semibold">$1</span>'
          );

          listItems.push(`<li class="my-0.5">${processedContent.trim()}</li>`);
        }
      } else if (
        line.match(/^\s*-\s+(.*)/) ||
        (line.match(/^\s+(.*)/) && inList)
      ) {
        // This is a sub-item or continuation
        const content = line.replace(/^\s*-\s+/, "").trim();

        if (content) {
          const processedContent = content.replace(
            /\*\*([^*]+)\*\*/g,
            '<span class="font-semibold">$1</span>'
          );

          // If it starts with a dash, it's a bullet item
          if (line.match(/^\s*-\s+/)) {
            listItems.push(
              `<li class="ml-4 list-disc my-0.5">${processedContent}</li>`
            );
          } else {
            // Otherwise it's a continuation of the previous item
            if (listItems.length > 0) {
              // Add to the previous item
              listItems[listItems.length - 1] = listItems[
                listItems.length - 1
              ].replace("</li>", ` ${processedContent}</li>`);
            } else {
              // No previous item, treat as new item
              listItems.push(`<li class="my-0.5">${processedContent}</li>`);
            }
          }
        }
      } else {
        // This is a regular paragraph
        if (inList) {
          // Close the list
          result.push(
            `<ol class="list-decimal pl-5 space-y-0.5 mb-2">${listItems.join(
              ""
            )}</ol>`
          );
          listItems = [];
          inList = false;
        }

        // Process this paragraph
        const processedPara = line.replace(
          /\*\*([^*]+)\*\*/g,
          '<span class="font-semibold">$1</span>'
        );

        result.push(`<p class="mb-2">${processedPara.trim()}</p>`);
      }
    });

    // Close any open list at the end
    if (inList && listItems.length > 0) {
      result.push(
        `<ol class="list-decimal pl-5 space-y-0.5 mb-2">${listItems.join(
          ""
        )}</ol>`
      );
    }

    // Final clean-up: ensure no empty paragraphs
    let html = result.join("").replace(/<p>\s*<\/p>/g, "");

    // If we don't have any content yet, wrap the original text
    if (!html) {
      html = `<p>${formattedText}</p>`;
    }

    return html;
  };

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
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center space-x-2 text-red-700 dark:text-red-300">
        <AlertCircle className="h-4 w-4" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Document Summary
          </h2>

          {/* Only show button if no brief exists yet OR user is premium */}
          {(noBriefExists || !brief || isPremium) && (
            <button
              onClick={generateBrief}
              disabled={isLoading || !selectedFile}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium
                ${
                  isLoading || !selectedFile
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    : "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                }`}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              {brief ? "Regenerate" : "Generate"} Summary
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {brief ? (
          <div className="space-y-3">
            <div
              className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 leading-relaxed prose-headings:font-medium prose-headings:mt-3 prose-headings:mb-1 prose-p:my-1.5 prose-p:text-base prose-li:text-base prose-li:my-0.5 prose-ol:my-1.5 prose-ul:my-1.5 prose-ol:pl-5 prose-ul:pl-5"
              dangerouslySetInnerHTML={{
                __html: formatSummaryText(brief.summaries[currentPage - 1]),
              }}
            />

            {brief.metadata && (
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-lg mb-2 text-gray-900 dark:text-gray-100">
                  Key Concepts
                </h4>
                <div className="flex flex-wrap gap-2">
                  {brief.metadata?.key_concepts?.length > 0 &&
                    brief.metadata.key_concepts.map((concept, i) => (
                      <span
                        key={i}
                        className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {concept}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {brief.metadata?.important_details?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-lg mb-3 text-gray-900 dark:text-gray-100">
                  Important Details
                </h4>
                <ul className="list-disc pl-5 space-y-2">
                  {brief.metadata.important_details.map((detail, i) => (
                    <li key={i} className="text-gray-700 dark:text-gray-300">
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {isLoading ? (
              <div className="flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Generating summary...
              </div>
            ) : noBriefExists ? (
              <div className="flex flex-col items-center space-y-2">
                <p>No summary has been generated yet</p>
                {selectedFile && (
                  <p className="text-sm text-gray-400 dark:text-gray-500">
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

      {/* Footer */}
      {brief && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <button
              className={`p-2 rounded-md ${
                currentPage === 1
                  ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Page {currentPage} of {brief.total_pages}
            </span>
            <button
              className={`p-2 rounded-md ${
                currentPage === brief.total_pages
                  ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === brief.total_pages}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <select
            className="border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
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
