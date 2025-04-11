import { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabaseClient";
import { handleProcessBrief } from "../utils/api";

export function useBrief(lectureId, user) {
  const [brief, setBrief] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [noBriefExists, setNoBriefExists] = useState(false);
  const isMounted = useRef(true);
  const visibilityChangeHandler = useRef(null);
  const sessionRecoveryHandler = useRef(null);
  const lastSuccessfulFetch = useRef(Date.now());

  // Fetch brief data from the database
  const fetchBrief = async (forceRefresh = false) => {
    try {
      if (!isMounted.current) return;

      // For forced refreshes, always set loading back to true
      if (forceRefresh) {
        setIsLoading(true);
      } else if (!isLoading) {
        setIsLoading(true);
      }

      const { data, error } = await supabase
        .from("briefs")
        .select("*")
        .eq("lecture_id", lectureId)
        .single();

      if (!isMounted.current) return;

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
      // Clear any errors on successful fetch
      setError(null);
      // Update last successful fetch time
      lastSuccessfulFetch.current = Date.now();
    } catch (err) {
      if (!isMounted.current) return;
      console.error("Error fetching brief:", err);
      setError("Failed to load brief");
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
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

      if (!isMounted.current) return;

      // Check if a brief already exists
      const { data: existingBrief, error: fetchError } = await supabase
        .from("briefs")
        .select("*")
        .eq("lecture_id", lectureId)
        .single();

      if (!isMounted.current) return;

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

        if (!isMounted.current) return;

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

        if (!isMounted.current) return;

        if (insertError) throw insertError;
        result = insertedBrief;
      }

      setBrief(result);
      setCurrentPage(1);
      // Update last successful fetch time
      lastSuccessfulFetch.current = Date.now();
    } catch (err) {
      if (!isMounted.current) return;
      console.error("Error generating brief:", err);
      setError("Failed to generate brief");
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
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
    // Set mounted flag
    isMounted.current = true;

    // Handler for document visibility changes
    const handleVisibilityChange = () => {
      if (!isMounted.current) return;

      if (document.visibilityState === "visible") {
        const timeSinceLastFetch = Date.now() - lastSuccessfulFetch.current;
        const needsRefresh = timeSinceLastFetch > 60000; // 60 seconds

        console.log(
          `Brief: Page is visible, time since last fetch: ${Math.round(
            timeSinceLastFetch / 1000
          )}s`
        );

        // Refresh data when the page becomes visible again
        if (isMounted.current && lectureId && user) {
          try {
            console.log(
              `Brief: Reconnecting data services, force refresh: ${needsRefresh}`
            );
            fetchBrief(needsRefresh).catch((err) => {
              console.error(
                "Error refreshing brief after visibility change:",
                err
              );
            });
          } catch (e) {
            console.error("Error in brief visibility change handler:", e);
          }
        }
      }
    };

    // Handler for session recovery events
    const handleSessionRecovery = (event) => {
      if (!isMounted.current) return;

      console.log("Brief: Session recovery event received:", event.detail);

      if (event.detail.success && lectureId && user) {
        // Wait a moment to ensure the session is fully restored
        setTimeout(() => {
          if (!isMounted.current) return;

          console.log("Brief: Reloading data after session recovery");
          // Force a full data refresh after session recovery
          fetchBrief(true).catch((err) => {
            console.error("Error reloading brief after session recovery:", err);
          });
        }, 500);
      }
    };

    // Store the handler references for cleanup
    visibilityChangeHandler.current = handleVisibilityChange;
    sessionRecoveryHandler.current = handleSessionRecovery;

    // Add event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener(
      "supabase:sessionRecovered",
      handleSessionRecovery
    );

    if (lectureId) {
      fetchBrief();
    }

    return () => {
      // Cleanup
      isMounted.current = false;
      document.removeEventListener(
        "visibilitychange",
        visibilityChangeHandler.current
      );
      document.removeEventListener(
        "supabase:sessionRecovered",
        sessionRecoveryHandler.current
      );
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
