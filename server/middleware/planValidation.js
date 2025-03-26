import { supabaseClient } from "../config/supabaseClient.js";

/**
 * Middleware to check if a user can create a subject based on their plan
 */
export const validateSubjectCreation = async (req, res, next) => {
  try {
    const userId = req.body.user_id || req.query.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID is required for this operation",
      });
    }

    // First, get the user's plan details
    const { data: planData, error: planError } = await supabaseClient
      .from("user_plans")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (planError && planError.code !== "PGRST116") {
      // PGRST116 is "no rows returned"
      console.error("Error fetching user plan:", planError);
      return res.status(500).json({
        success: false,
        message: "Error verifying user plan",
      });
    }

    // If no plan found, or plan is premium, user can create subject
    if (!planData || planData.plan_type === "premium") {
      return next();
    }

    // For free plan, check the subject count
    const { count, error: countError } = await supabaseClient
      .from("subjects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      console.error("Error counting subjects:", countError);
      return res.status(500).json({
        success: false,
        message: "Error verifying subject limit",
      });
    }

    // Check if user has reached the limit
    if (count >= planData.subject_limit) {
      return res.status(403).json({
        success: false,
        message: `You have reached the limit of ${planData.subject_limit} subjects on the free plan`,
        upgrade_required: true,
        limit_reached: true,
      });
    }

    // User can create more subjects
    next();
  } catch (error) {
    console.error("Plan validation error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while validating plan",
    });
  }
};

/**
 * Middleware to check if a user can create a lecture based on their plan
 * Free users are limited to 5 lectures per subject
 */
export const validateLectureCreation = async (req, res, next) => {
  try {
    const userId = req.body.user_id;
    const subjectId = req.body.subject_id;

    if (!userId || !subjectId) {
      return res.status(401).json({
        success: false,
        message: "User ID and Subject ID are required for this operation",
      });
    }

    // First, get the user's plan details
    const { data: planData, error: planError } = await supabaseClient
      .from("user_plans")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (planError && planError.code !== "PGRST116") {
      console.error("Error fetching user plan:", planError);
      return res.status(500).json({
        success: false,
        message: "Error verifying user plan",
      });
    }

    // If no plan found (defaults to free) or plan is free, check lecture count
    if (!planData || planData.plan_type === "free") {
      // Count lectures in this subject
      const { count, error: countError } = await supabaseClient
        .from("lectures")
        .select("*", { count: "exact", head: true })
        .eq("subject_id", subjectId);

      if (countError) {
        console.error("Error counting lectures:", countError);
        return res.status(500).json({
          success: false,
          message: "Error verifying lecture limit",
        });
      }

      // Free users can create up to 5 lectures per subject
      const MAX_FREE_LECTURES_PER_SUBJECT = 5;
      if (count >= MAX_FREE_LECTURES_PER_SUBJECT) {
        return res.status(403).json({
          success: false,
          message: `You have reached the limit of ${MAX_FREE_LECTURES_PER_SUBJECT} lectures per subject on the free plan`,
          upgrade_required: true,
          limit_reached: true,
        });
      }
    }

    // Premium users or free users under the limit can proceed
    next();
  } catch (error) {
    console.error("Lecture validation error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while validating lecture creation",
    });
  }
};

/**
 * Utility function to check if a user is on a premium plan
 */
export const isPremiumUser = async (userId) => {
  try {
    const { data, error } = await supabaseClient
      .from("user_plans")
      .select("plan_type")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error checking premium status:", error);
      return false;
    }

    return data && data.plan_type === "premium";
  } catch (error) {
    console.error("Error checking premium status:", error);
    return false;
  }
};
