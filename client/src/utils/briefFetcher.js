/**
 * Brief fetcher utilities
 *
 * These utilities help with fetching and counting briefs from multiple subjects.
 * They're designed to handle large lists of subject IDs by chunking them into smaller requests.
 *
 * Note: Brief statistics have been removed from the profile page to simplify the UI,
 * but these utilities remain available for the dashboard and other places where
 * brief data needs to be fetched.
 */

import { supabase } from "./supabaseClient";

/**
 * Fetch briefs for multiple subjects using a more reliable approach
 * @param {string[]} subjectIds - Array of subject IDs to fetch briefs for
 * @param {Object} options - Additional options for the query
 * @returns {Promise<Object>} - Query result with data and error properties
 */
export const fetchBriefsForSubjects = async (subjectIds, options = {}) => {
  try {
    // Default selections if not provided
    const select = options.select || "*";

    if (!subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
      return { data: [], error: null };
    }

    // For large lists, split into chunks to avoid query size limitations
    if (subjectIds.length > 10) {
      console.log(
        `Breaking large subject list (${subjectIds.length}) into chunks`
      );
      const chunkSize = 10;
      const chunks = [];

      for (let i = 0; i < subjectIds.length; i += chunkSize) {
        chunks.push(subjectIds.slice(i, i + chunkSize));
      }

      // Process each chunk and combine results
      let allData = [];
      let lastError = null;

      for (const chunk of chunks) {
        const { data, error } = await supabase
          .from("briefs")
          .select(select)
          .in("subject_id", chunk);

        if (error) {
          console.error("Error fetching briefs chunk:", error);
          lastError = error;
        }

        if (data) {
          allData = [...allData, ...data];
        }
      }

      return { data: allData, error: lastError };
    }

    // For smaller lists, use a single query
    return await supabase
      .from("briefs")
      .select(select)
      .in("subject_id", subjectIds);
  } catch (error) {
    console.error("Unexpected error in fetchBriefsForSubjects:", error);
    return { data: null, error };
  }
};

/**
 * Count briefs for multiple subjects
 * @param {string[]} subjectIds - Array of subject IDs to count briefs for
 * @returns {Promise<Object>} - Query result with count data and error properties
 */
export const countBriefsForSubjects = async (subjectIds) => {
  if (!subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
    return { count: 0, error: null };
  }

  try {
    const { data, error, count } = await supabase
      .from("briefs")
      .select("id", { count: "exact", head: true })
      .in("subject_id", subjectIds);

    return { count, error };
  } catch (error) {
    console.error("Error counting briefs:", error);
    return { count: 0, error };
  }
};
