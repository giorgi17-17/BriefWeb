import { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabaseClient";
import { handleProcessBrief } from "../utils/api";
import { usePostHog } from "posthog-js/react";

export function useBrief(lectureId, user) {
  const [brief, setBrief] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [noBriefExists, setNoBriefExists] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const posthog = usePostHog();
  const pollingInterval = useRef(null);

  // Start polling for brief completion after timeout
  const startPollingForBrief = (filePath) => {
    let attempts = 0;
    const maxAttempts = 15; // Poll for up to 2.5 minutes (15 * 10 seconds)

    pollingInterval.current = setInterval(async () => {
      attempts++;
      console.log(
        `Polling attempt ${attempts}/${maxAttempts} for brief completion...`
      );

      try {
        const { data: pollingBrief, error: pollingError } = await supabase
          .from("briefs")
          .select("*")
          .eq("lecture_id", lectureId)
          .maybeSingle();

        if (!pollingError && pollingBrief) {
          console.log("Brief found during polling!");
          setBrief(pollingBrief);
          setCurrentPage(pollingBrief.current_page || 1);
          setNoBriefExists(false);
          setError(null);
          setIsPolling(false);
          clearInterval(pollingInterval.current);

          // Analytics tracking
          posthog?.capture("brief_found_via_polling", {
            lectureId,
            userId: user.id,
            fileId: filePath,
            attempts,
          });

          return;
        }

        if (attempts >= maxAttempts) {
          console.log("Polling timeout reached, stopping...");
          setError(
            "Brief generation is taking unusually long. Please try again or contact support if the issue persists."
          );
          setIsPolling(false);
          clearInterval(pollingInterval.current);
        }
      } catch (pollingErr) {
        console.error("Error during polling:", pollingErr);
        if (attempts >= maxAttempts) {
          setError(
            "Unable to check brief status. Please refresh the page or try again."
          );
          setIsPolling(false);
          clearInterval(pollingInterval.current);
        }
      }
    }, 10000); // Poll every 10 seconds
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

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

      console.log("Brief fetched from database:", data);
      console.log(
        "Total pages value:",
        data.total_pages,
        typeof data.total_pages
      );

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

      let briefData;
      try {
        briefData = await handleProcessBrief(user.id, lectureId, filePath);
      } catch (error) {
        // If timeout occurred, check if brief was actually created
        if (error.message.includes("timeout")) {
          console.log(
            "Timeout occurred, checking if brief was created in background..."
          );

          // Wait a moment for potential background completion
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Check database for the brief
          const { data: timeoutBrief, error: timeoutError } = await supabase
            .from("briefs")
            .select("*")
            .eq("lecture_id", lectureId)
            .maybeSingle();

          if (!timeoutError && timeoutBrief) {
            console.log("Brief was created successfully despite timeout!");
            setBrief(timeoutBrief);
            setCurrentPage(timeoutBrief.current_page || 1);
            setNoBriefExists(false);

            // Analytics tracking
            posthog?.capture("brief_generated_after_timeout", {
              lectureId,
              userId: user.id,
              fileId: filePath,
            });

            return;
          }

          // If no brief found, start polling for completion
          console.log("Brief not found immediately, starting polling...");
          setIsPolling(true);
          setError(
            "Brief generation is taking longer than expected. We're checking for completion..."
          );
          startPollingForBrief(filePath);
          return;
        }

        // Re-throw non-timeout errors
        throw error;
      }

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

      // Track brief generation with minimal properties
      try {
        posthog.capture("brief_generation", {
          lecture_id: lectureId,
          pages: briefData.totalPages,
        });
      } catch (error) {
        console.error("PostHog event error:", error);
      }
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
    isPolling,
    error,
    noBriefExists,
    fetchBrief,
    generateBrief,
    handlePageChange,
  };
}
