// hooks/useBrief.js
import { useRef, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-js/react";
import { getBrief, upsertBrief, computeProgressiveDelay } from "../utils/briefsApi";
import { debugLog, debugError } from "../utils/debugLogger";
import { handleProcessBrief } from "../utils/api"; // your existing function

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
      if (data?.id) return false; // found -> stop polling
      return computeProgressiveDelay(pollAttemptsRef.current);
    },
    onSuccess: (data) => {
      // reset page when brief appears; stay quiet otherwise
      if (data?.id) {
        setIsPolling(false);
        pollAttemptsRef.current = 0;
        setUiError(null);
        setCurrentPage(data.current_page ?? 1);
      } else if (isPolling) {
        // keep the backoff growing, but no time-limit messages
        pollAttemptsRef.current += 1;
      }
    },
    onError: (err) => {
      debugError("Error fetching brief:", err);
      // Only show an error for real failures; do not show time-pressure notices
      setUiError("Failed to load brief");
      // Don't force-stop polling here; let the caller decide (we expose cancel/restart)
    },
  });

  const brief = briefQuery.data ?? null;
  const noBriefExists = briefQuery.isSuccess && !brief;

  // Track PostHog only once when the brief first lands (if generation was async)
  const trackedFirstArrivalRef = useRef(false);
  if (brief?.id && !trackedFirstArrivalRef.current) {
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

  const genMutation = useMutation({
    async mutationFn(selectedFile) {
      if (!user?.id) throw new Error("No user");
      if (!lectureId) throw new Error("No lectureId");
      if (!selectedFile?.id && !selectedFile?.path) throw new Error("No file selected");

      setUiError(null);

      const filePath =
        (selectedFile.path || "").split("/").pop() || String(selectedFile.id);

      // 1) hit your API
      try {
        const processed = await handleProcessBrief(user.id, lectureId, filePath);

        // 2) optional quality check (non-blocking)
        if (looksLowQuality(processed)) {
          debugLog("⚠️ Low-quality content detected (not blocking UI).");
        }

        // 3) persist (if your API doesn't persist on its own)
        const saved = await upsertBrief(lectureId, user.id, processed);

        // 4) analytics (immediate path)
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
          setIsPolling(true);
          pollAttemptsRef.current = 0;

          // Resolve without error; onSuccess handler will ignore falsy results,
          // and the query will keep polling until the brief shows up.
          return undefined;
        }

        // Real error → bubble up
        throw e;
      }
    },
    onMutate: () => {
      // Start polling as soon as user triggers generation.
      setIsPolling(true);
      pollAttemptsRef.current = 0;
    },
    onSuccess: (saved) => {
      // If we received a saved brief immediately, commit it and stop polling.
      if (saved?.id) {
        qc.setQueryData(QK.brief(saved.lecture_id || lectureId), saved);
        setIsPolling(false);
        pollAttemptsRef.current = 0;
        setCurrentPage(saved.current_page ?? 1);
        debugLog("✅ Brief generation successful (immediate)");
      }
      // Otherwise, do nothing; polling continues quietly until query finds it.
    },
    onError: (err) => {
      debugError("Error generating brief:", err);
      // Only real failure gets an error message; no time pressure text.
      setUiError("Brief generation failed. Please try again.");
      // Stop polling on hard failure; caller can restart if desired.
      setIsPolling(false);
    },
    onSettled: async () => {
      if (lectureId) {
        await qc.invalidateQueries({ queryKey: QK.brief(lectureId) });
      }
    },
  });

  function handlePageChange(newPage) {
    const total = brief?.total_pages ?? 0;
    if (brief && newPage >= 1 && newPage <= total) {
      setCurrentPage(newPage);
    }
  }

  // Friendly status for UI
  const status = useMemo(() => {
    if (uiError) return "error";
    if (briefQuery.isLoading) return "loading";
    if (genMutation.isPending || isPolling) return "generating";
    if (brief?.id) return "ready";
    return "idle";
  }, [uiError, briefQuery.isLoading, genMutation.isPending, isPolling, brief?.id]);

  const isLoading =
    briefQuery.isLoading ||
    genMutation.isPending ||
    (isPolling && !briefQuery.data && briefQuery.isFetching);

  // Manual controls if you need them in UI
  const cancelPolling = () => {
    setIsPolling(false);
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
