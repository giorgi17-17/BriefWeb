// hooks/useBrief.js
import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-js/react";
import {
  getBrief,
  upsertBrief,
  computeProgressiveDelay,
} from "../utils/briefsApi";
import { debugLog, debugError } from "../utils/debugLogger";
import { handleProcessBrief } from "../utils/api"; // your existing function

const QK = {
  brief: (lectureId) => ["brief", lectureId],
};

function looksLowQuality(processed) {
  if (!processed?.pageSummaries?.length) return true;
  return processed.pageSummaries.some((raw) => {
    const summary = typeof raw === "string" ? raw : String(raw);
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

  // polling controls
  const [isPolling, setIsPolling] = useState(false);
  const pollAttemptsRef = useRef(0);
  const maxAttempts = 30;

  const enabled = Boolean(lectureId);

  const briefQuery = useQuery({
    queryKey: enabled ? QK.brief(lectureId) : ["brief", "noop"],
    queryFn: () => getBrief(lectureId),
    enabled,
    refetchOnWindowFocus: false,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    // Progressive refetch while polling for creation
    refetchInterval: (data) => {
      if (!isPolling) return false;
      if (data?.id) return false; // found → stop
      return computeProgressiveDelay(pollAttemptsRef.current);
    },
    onSuccess: (data) => {
      if (data?.id) {
        setIsPolling(false);
        pollAttemptsRef.current = 0;
        setUiError(null);
        setCurrentPage(data.current_page ?? 1);
      } else if (isPolling) {
        pollAttemptsRef.current += 1;
        if (pollAttemptsRef.current >= maxAttempts) {
          setIsPolling(false);
          setUiError(
            "Brief generation is taking unusually long. Please try again or contact support."
          );
        }
      }
    },
    onError: (err) => {
      debugError("Error fetching brief:", err);
      if (isPolling) {
        pollAttemptsRef.current += 1;
        if (pollAttemptsRef.current >= maxAttempts) {
          setIsPolling(false);
          setUiError("Unable to check brief status. Please refresh and try again.");
        }
      } else {
        setUiError("Failed to load brief");
      }
    },
  });

  const brief = briefQuery.data ?? null;
  const noBriefExists = briefQuery.isSuccess && !brief;

  const genMutation = useMutation({
    mutationFn: async (selectedFile) => {
      if (!user?.id) throw new Error("No user");
      if (!lectureId) throw new Error("No lectureId");
      if (!selectedFile?.id && !selectedFile?.path) throw new Error("No file selected");

      setUiError(null);

      const filePath =
        (selectedFile.path || "").split("/").pop() || String(selectedFile.id);

      // 1) hit your API
      let processed;
      try {
        processed = await handleProcessBrief(user.id, lectureId, filePath);
      } catch (e) {
        const msg = String(e?.message || "");
        if (msg.includes("timeout")) {
          debugLog("Timeout from /detailed-brief → start polling for completion…");
          setIsPolling(true);
          pollAttemptsRef.current = 0;

          const maybe = await getBrief(lectureId);
          if (maybe) return maybe;

          // keep polling; surface lightweight banner
          throw new Error(
            "Brief generation is taking longer than expected. Checking for completion..."
          );
        }
        throw e;
      }

      // 2) optional quality check (doesn't block UI)
      if (looksLowQuality(processed)) {
        debugLog("⚠️ Low-quality content detected (not blocking UI).");
      }

      // 3) persist to Supabase
      const saved = await upsertBrief(lectureId, user.id, processed);

      // 4) analytics
      try {
        posthog?.capture("brief_generation", {
          lecture_id: lectureId,
          pages: processed.totalPages,
        });
      } catch (err) {
        debugError("PostHog event error:", err);
      }

      return saved;
    },
    onMutate: () => {
      setIsPolling(true);
      pollAttemptsRef.current = 0;
    },
    onSuccess: (saved) => {
      qc.setQueryData(QK.brief(saved.lecture_id), saved);
      setIsPolling(false);
      pollAttemptsRef.current = 0;
      setCurrentPage(saved.current_page ?? 1);
      debugLog("✅ Brief generation successful");
    },
    onError: (err) => {
      debugError("Error generating brief:", err);
      setUiError(
        String(
          err?.message ||
            "Brief generation encountered an issue. Checking for completion..."
        )
      );
      setIsPolling(true); // continue polling as fallback
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

  const isLoading =
    briefQuery.isLoading ||
    genMutation.isPending ||
    (isPolling && !briefQuery.data && briefQuery.isFetching);

  return {
    // data
    brief,
    currentPage,

    // states
    isLoading,
    isPolling,
    error: uiError,
    noBriefExists,

    // actions
    fetchBrief: () => briefQuery.refetch(),
    generateBrief: (selectedFile) => genMutation.mutate(selectedFile),
    handlePageChange,
  };
}
