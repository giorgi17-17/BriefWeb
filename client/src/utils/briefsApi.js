// utils/briefsApi.js
import { supabase } from "./supabaseClient";
import { debugLog } from "./debugLogger";

export async function getBrief(lectureId) {
  const { data, error } = await supabase
    .from("briefs")
    .select("*")
    .eq("lecture_id", lectureId)
    .maybeSingle();

  if (error) {
    // PGRST116 ~ "no rows"; maybeSingle usually prevents throwing but be safe
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data ?? null;
}

/**
 * Upserts by lecture_id. (Recommended DB constraint:)
 *   ALTER TABLE public.briefs ADD CONSTRAINT briefs_lecture_id_key UNIQUE (lecture_id);
 */
export async function upsertBrief(lectureId, userId, processed) {
  const row = {
    lecture_id: lectureId,
    user_id: userId,
    total_pages: processed.totalPages,
    summaries: processed.pageSummaries,
    current_page: 1,
    metadata: {
      documentTitle: processed.overview?.documentTitle,
      mainThemes: processed.overview?.mainThemes,
      key_concepts: processed.key_concepts,
      important_details: processed.important_details,
      fileInfo: processed.overview?.fileInfo,
      generatedAt: processed.metadata?.generatedAt,
    },
  };

  const { data, error } = await supabase
    .from("briefs")
    .upsert(row, { onConflict: "lecture_id" })
    .select()
    .single();

  if (error) throw error;
  debugLog("✅ Brief upserted:", data?.id);
  return data;
}

export function computeProgressiveDelay(attempts) {
  // 1..5 → 2s, 6..10 → 3s, 11..20 → 5s, 21+ → 8s
  if (attempts <= 5) return 2000;
  if (attempts <= 10) return 3000;
  if (attempts <= 20) return 5000;
  return 8000;
}
