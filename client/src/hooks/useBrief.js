import { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import { handleProcessBrief } from "../utils/api";

export function useBrief(lectureId, user) {
  const [brief, setBrief] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [noBriefExists, setNoBriefExists] = useState(false);

  // Fetch brief data from the database
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

  // Generate a brief from the selected file
  const generateBrief = async (selectedFile) => {
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

  // Handle page changes
  const handlePageChange = (newPage) => {
    if (brief && newPage >= 1 && newPage <= brief.total_pages) {
      setCurrentPage(newPage);
    }
  };

  // Load brief data on component mount
  useEffect(() => {
    if (lectureId) {
      fetchBrief();
    }

    return () => {
      // Cleanup
    };
  }, [lectureId]);

  return {
    brief,
    currentPage,
    isLoading,
    error,
    noBriefExists,
    fetchBrief,
    generateBrief,
    handlePageChange,
  };
}
