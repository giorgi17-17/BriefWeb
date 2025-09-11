// hooks/useBrief.js
import { useRef, useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-js/react";
import { getBrief, upsertBrief, computeProgressiveDelay } from "../utils/briefsApi";
import { debugLog, debugError } from "../utils/debugLogger";
import { handleProcessBrief } from "../utils/api";

const QK = {
  brief: (lectureId) => ["brief", lectureId],
};

function looksLowQuality(processed) {
  if (!processed?.pageSummaries?.length) return true;
  return processed.pageSummaries.some((raw) => {
    const summary = typeof raw === "string" ? raw : String(raw ?? "");
    const wc = summary.trim().split(/\s+/).length;
    return (
      summary.includes("Several important themes are explored") ||
      summary.includes("Core Concepts") ||
      summary.includes("Key concepts build upon foundational") ||
      wc < 100
    );
  });
}

export function useBrief(lectureId, user) {
  const posthog = usePostHog();
  const qc = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [uiError, setUiError] = useState(null);

  // silent polling controls
  const [isPolling, setIsPolling] = useState(false);
  const pollAttemptsRef = useRef(0);
  const trackedFirstArrivalRef = useRef(false);

  const enabled = Boolean(lectureId);

  const briefQuery = useQuery({
    queryKey: enabled ? QK.brief(lectureId) : ["brief", "noop"],
    queryFn: () => getBrief(lectureId),
    enabled,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    // progressive backoff while we wait for background generation
    refetchInterval: (data) => {
      if (!isPolling) return false;
      // Stop polling if we have a brief with valid content
      if (data?.id && data?.summaries?.length > 0) {
        return false;
      }
      return computeProgressiveDelay(pollAttemptsRef.current);
    },
  });

  const brief = briefQuery.data ?? null;
  const noBriefExists = briefQuery.isSuccess && !brief?.id;

  // Effect to handle polling state changes based on brief data
  useEffect(() => {
    if (brief?.id && brief?.summaries?.length > 0 && isPolling) {
      debugLog("✅ Brief found during polling, stopping polling");
      setIsPolling(false);
      pollAttemptsRef.current = 0;
      setUiError(null);
      setCurrentPage(brief.current_page ?? 1);
      
      // Track PostHog event if this is the first time we're seeing this brief
      if (!trackedFirstArrivalRef.current) {
        trackedFirstArrivalRef.current = true;
        try {
          if (brief?.total_pages) {
            posthog?.capture("brief_generation_arrived", {
              lecture_id: lectureId,
              pages: brief.total_pages,
              via: "polling",
            });
          }
        } catch (err) {
          debugError("PostHog arrival event error:", err);
        }
      }
    }
  }, [brief?.id, brief?.summaries?.length, isPolling, lectureId, posthog]);

  // Handle query errors
  useEffect(() => {
    if (briefQuery.isError && briefQuery.error) {
      debugError("Error fetching brief:", briefQuery.error);
      setUiError("Failed to load brief");
      // Don't stop polling here - let it continue trying
    }
  }, [briefQuery.isError, briefQuery.error]);

  // Handle polling increment
  useEffect(() => {
    if (isPolling && briefQuery.isSuccess && !brief?.id) {
      pollAttemptsRef.current += 1;
    }
  }, [isPolling, briefQuery.isSuccess, brief?.id]);

  const genMutation = useMutation({
    async mutationFn(selectedFile) {
      if (!user?.id) throw new Error("No user");
      if (!lectureId) throw new Error("No lectureId");
      if (!selectedFile?.id && !selectedFile?.path) throw new Error("No file selected");

      setUiError(null);

      const filePath =
        (selectedFile.path || "").split("/").pop() || String(selectedFile.id);

      try {
        const processed = await handleProcessBrief(user.id, lectureId, filePath);

        // optional quality check (non-blocking)
        if (looksLowQuality(processed)) {
          debugLog("⚠️ Low-quality content detected (not blocking UI).");
        }

        // persist (if your API doesn't persist on its own)
        const saved = await upsertBrief(lectureId, user.id, processed);

        // analytics (immediate path)
        try {
          posthog?.capture("brief_generation", {
            lecture_id: lectureId,
            pages: processed.totalPages,
            via: "immediate",
          });
        } catch (err) {
          debugError("PostHog event error:", err);
        }

        return saved;
      } catch (e) {
        const msg = String(e?.message || "").toLowerCase();

        // If the server indicates "still processing" (timeout/202/etc),
        // we silently switch to polling and DO NOT throw or show time-pressure messages.
        if (msg.includes("timeout") || msg.includes("processing") || msg.includes("202")) {
          debugLog("Server indicates processing; enabling silent polling…");
          // Don't throw error, just return undefined to indicate polling mode
          return undefined;
        }

        // Real error → bubble up
        throw e;
      }
    },
    onMutate: () => {
      // Start polling as soon as user triggers generation
      setIsPolling(true);
      pollAttemptsRef.current = 0;
      trackedFirstArrivalRef.current = false; // Reset tracking for new generation
    },
    onSuccess: (saved) => {
      // If we received a saved brief immediately, commit it and stop polling
      if (saved?.id && saved?.summaries?.length > 0) {
        qc.setQueryData(QK.brief(saved.lecture_id || lectureId), saved);
        setIsPolling(false);
        pollAttemptsRef.current = 0;
        setCurrentPage(saved.current_page ?? 1);
        debugLog("✅ Brief generation successful (immediate)");
      }
      // If saved is undefined, polling will continue automatically
      else if (saved === undefined) {
        debugLog("📡 Brief generation in progress, polling enabled");
        // Polling state is already set in onMutate
      }
    },
    onError: (err) => {
      debugError("Error generating brief:", err);
      setUiError("Brief generation failed. Please try again.");
      // Stop polling on hard failure
      setIsPolling(false);
      pollAttemptsRef.current = 0;
    },
    onSettled: async () => {
      if (lectureId) {
        await qc.invalidateQueries({ queryKey: QK.brief(lectureId) });
      }
    },
  });

  function handlePageChange(newPage) {
    const total = brief?.total_pages ?? 0;
    const target = Math.max(1, Math.min(newPage, total)); // clamp

    if (!brief || target === currentPage) return;

    setCurrentPage(target);

    // Respect reduced motion & fall back if smooth not supported
    const prefersReduced =
      typeof window !== "undefined" &&
      "matchMedia" in window &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if ("scrollBehavior" in document.documentElement.style) {
      window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
    } else {
      window.scrollTo(0, 0);
    }
  }

  // Improved status calculation
  const status = useMemo(() => {
    if (uiError) return "error";
    if (briefQuery.isLoading && !brief) return "loading";
    if (genMutation.isPending) return "generating";
    if (isPolling) return "generating";
    if (brief?.id && brief?.summaries?.length > 0) return "ready";
    return "idle";
  }, [uiError, briefQuery.isLoading, genMutation.isPending, isPolling, brief?.id, brief?.summaries?.length]);

  // Improved loading calculation - avoid flickering
  const isLoading = useMemo(() => {
    // Show loading if we're actively generating or if we're polling without any brief data yet
    return genMutation.isPending || (isPolling && !brief?.id);
  }, [genMutation.isPending, isPolling, brief?.id]);

  // Manual controls if you need them in UI
  const cancelPolling = () => {
    setIsPolling(false);
    pollAttemptsRef.current = 0;
  };

  const restartPolling = () => {
    setUiError(null);
    pollAttemptsRef.current = 0;
    setIsPolling(true);
    // kick a refetch immediately
    briefQuery.refetch();
  };

  return {
    // data
    brief,
    currentPage,

    // states
    status,        // "idle" | "loading" | "generating" | "ready" | "error"
    isLoading,
    isPolling,
    error: uiError,
    noBriefExists,

    // actions
    fetchBrief: () => briefQuery.refetch(),
    generateBrief: (selectedFile) => genMutation.mutate(selectedFile),
    handlePageChange,
    cancelPolling,
    restartPolling,
  };
}