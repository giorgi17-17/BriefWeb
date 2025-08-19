import { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabaseClient";
import { handleProcessBrief } from "../utils/api";
import { usePostHog } from "posthog-js/react";
import { debugLog, debugError } from "../utils/debugLogger";

export function useBrief(lectureId, user) {
  const [brief, setBrief] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [noBriefExists, setNoBriefExists] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const posthog = usePostHog();
  const pollingInterval = useRef(null);
  const isMounted = useRef(true);
  const abortController = useRef(null);

  // Optimized polling with progressive intervals
  const startPollingForBrief = (filePath) => {
    let attempts = 0;
    const maxAttempts = 30; // Increased attempts to ensure we catch the brief

    const pollWithProgressiveDelay = async () => {
      attempts++;
      debugLog(
        `🔄 Polling attempt ${attempts}/${maxAttempts} for brief completion...`
      );

      try {
        const { data: pollingBrief, error: pollingError } = await supabase
          .from("briefs")
          .select("*")
          .eq("lecture_id", lectureId)
          .maybeSingle();

        if (!pollingError && pollingBrief) {
          debugLog("✅ Brief found during polling! Updating UI...");
          if (isMounted.current) {
            // Force update all states to ensure UI updates
            setBrief(pollingBrief);
            setCurrentPage(pollingBrief.current_page || 1);
            setNoBriefExists(false);
            setError(null);
            setIsPolling(false);
            setIsLoading(false); // Stop loading spinner when good content is found
            
            // Log for debugging
            debugLog("Brief state updated:", {
              hasBrief: true,
              totalPages: pollingBrief.total_pages,
              summariesCount: pollingBrief.summaries?.length
            });
          }
          // Polling stopped naturally

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
          debugLog("Polling timeout reached, stopping...");
          if (isMounted.current) {
            setError(
              "Brief generation is taking unusually long. Please try again or contact support if the issue persists."
            );
            setIsPolling(false);
            setIsLoading(false); // Stop loading on timeout
          }
          return;
        }
        
        // More aggressive polling: faster initial checks
        const delay = attempts <= 5 ? 2000 : attempts <= 10 ? 3000 : attempts <= 20 ? 5000 : 8000;
        debugLog(`⏱️ Next poll in ${delay}ms`);
        setTimeout(pollWithProgressiveDelay, delay);
      } catch (pollingErr) {
        debugError("Error during polling:", pollingErr);
        if (attempts >= maxAttempts) {
          if (isMounted.current) {
            setError(
              "Unable to check brief status. Please refresh the page or try again."
            );
            setIsPolling(false);
            setIsLoading(false); // Stop loading on error timeout
          }
          return;
        }
        
        // Retry with progressive delay on error too (same aggressive timing)
        const delay = attempts <= 5 ? 2000 : attempts <= 10 ? 3000 : attempts <= 20 ? 5000 : 8000;
        debugLog(`⏱️ Retrying after error in ${delay}ms`);
        setTimeout(pollWithProgressiveDelay, delay);
      }
    };
    
    // Start polling immediately
    pollWithProgressiveDelay();
  };

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
      // Polling will stop automatically when component unmounts due to isMounted check
      if (abortController.current) {
        abortController.current.abort();
        abortController.current = null;
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

      debugLog("Brief fetched from database:", {
        totalPages: data.total_pages,
        pageCount: data.summaries?.length
      });

      if (isMounted.current) {
        setBrief(data);
        setCurrentPage(data.current_page || 1);
      }
    } catch (err) {
      debugError("Error fetching brief:", err);
      if (isMounted.current) {
        setError("Failed to load brief");
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
      let shouldContinueLoading = false;

      let briefData;
      try {
        briefData = await handleProcessBrief(user.id, lectureId, filePath);
        
        // Quality check - if content seems like fallback/poor quality, start polling instead
        const isLowQuality = briefData && briefData.pageSummaries && briefData.pageSummaries.some(page => {
          const summary = page.summary || page;
          const wordCount = summary.split(/\s+/).length;
          const hasTopicList = (
            summary.includes('Several important themes are explored') ||
            summary.includes('Core Concepts') ||
            summary.includes('Key concepts build upon foundational') ||
            wordCount < 100 // Lower threshold since we reduced target to 200-280 words
          );
          return hasTopicList;
        });

        if (isLowQuality) {
          debugLog("⚠️ Detected low-quality content, but will still process it");
          // Don't block the content - let user see it even if quality is lower
          // This ensures the UI always updates after generation
        }
        
      } catch (error) {
        // If timeout occurred, check if brief was actually created
        if (error.message.includes("timeout")) {
          debugLog(
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
            debugLog("✅ Brief was created successfully despite timeout! Updating UI...");
            if (isMounted.current) {
              setBrief(timeoutBrief);
              setCurrentPage(timeoutBrief.current_page || 1);
              setNoBriefExists(false);
              setError(null);
              setIsPolling(false);
              setIsLoading(false);
            }

            // Analytics tracking
            posthog?.capture("brief_generated_after_timeout", {
              lectureId,
              userId: user.id,
              fileId: filePath,
            });

            return;
          }

          // If no brief found, start polling for completion
          debugLog("Brief not found immediately, starting polling...");
          shouldContinueLoading = true;
          if (isMounted.current) {
            setIsPolling(true);
            setError(
              "Brief generation is taking longer than expected. We're checking for completion..."
            );
            startPollingForBrief(filePath);
          }
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
        debugLog("Updating existing brief with new data");
        const { data: updatedBrief, error: updateError } = await supabase
          .from("briefs")
          .update({
            total_pages: briefData.totalPages,
            summaries: briefData.pageSummaries,
            current_page: 1,
            metadata: {
              documentTitle: briefData.overview?.documentTitle,
              mainThemes: briefData.overview?.mainThemes,
              key_concepts: briefData.key_concepts,
              important_details: briefData.important_details,
            },
          })
          .eq("lecture_id", lectureId)
          .select()
          .single();

        if (updateError) {
          debugError("Failed to update brief:", updateError);
          throw updateError;
        }
        debugLog("✅ Brief updated successfully:", updatedBrief.id);
        result = updatedBrief;
      } else {
        // Insert a new brief
        debugLog("Inserting new brief into database");
        const { data: insertedBrief, error: insertError } = await supabase
          .from("briefs")
          .insert({
            lecture_id: lectureId,
            user_id: user.id,
            total_pages: briefData.totalPages,
            summaries: briefData.pageSummaries,
            current_page: 1,
            metadata: {
              documentTitle: briefData.overview?.documentTitle,
              mainThemes: briefData.overview?.mainThemes,
              key_concepts: briefData.key_concepts,
              important_details: briefData.important_details,
            },
          })
          .select()
          .single();

        if (insertError) {
          debugError("Failed to insert brief:", insertError);
          throw insertError;
        }
        debugLog("✅ Brief inserted successfully:", insertedBrief.id);
        result = insertedBrief;
      }

      if (isMounted.current) {
        debugLog("✅ Brief generation successful, updating all states");
        setBrief(result);
        setCurrentPage(1);
        setNoBriefExists(false);
        setError(null);
        setIsPolling(false);
        setIsLoading(false);
        
        // Force a re-render by updating a dummy state if needed
        debugLog("Brief saved to state:", {
          id: result.id,
          totalPages: result.total_pages,
          summariesCount: result.summaries?.length
        });
        
        // Failsafe: If brief still doesn't appear, fetch it directly
        if (!result.summaries || result.summaries.length === 0) {
          debugLog("⚠️ Brief might be incomplete, fetching fresh from database...");
          setTimeout(() => fetchBrief(), 1000);
        }
      }

      // Track brief generation with minimal properties
      try {
        posthog.capture("brief_generation", {
          lecture_id: lectureId,
          pages: briefData.totalPages,
        });
      } catch (error) {
        debugError("PostHog event error:", error);
      }
    } catch (err) {
      debugError("Error generating brief:", err);
      
      // Important: Even on error, check if brief was created in background
      debugLog("Checking if brief was created despite error...");
      const { data: errorCheckBrief, error: checkError } = await supabase
        .from("briefs")
        .select("*")
        .eq("lecture_id", lectureId)
        .maybeSingle();
      
      if (!checkError && errorCheckBrief) {
        debugLog("✅ Brief found despite error! Updating UI...");
        if (isMounted.current) {
          setBrief(errorCheckBrief);
          setCurrentPage(errorCheckBrief.current_page || 1);
          setNoBriefExists(false);
          setError(null);
          setIsPolling(false);
          setIsLoading(false);
        }
        return;
      }
      
      // If still no brief, show error and start polling as fallback
      if (isMounted.current) {
        setError("Brief generation encountered an issue. Checking for completion...");
        setIsPolling(true);
        startPollingForBrief(filePath);
      }
    } finally {
      if (isMounted.current && !shouldContinueLoading && !isPolling) {
        // Only stop loading if we're not continuing to poll
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
