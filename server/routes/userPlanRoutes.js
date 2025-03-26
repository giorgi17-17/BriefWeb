import express from "express";
import {
  validateSubjectCreation,
  isPremiumUser,
} from "../middleware/planValidation.js";
import { supabaseClient } from "../config/supabaseClient.js";

const router = express.Router();

/**
 * Get user plan details
 */
router.get("/plan", async (req, res) => {
  const userId = req.query.user_id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User ID is required",
    });
  }

  try {
    const { data, error } = await supabaseClient
      .from("user_plans")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching user plan:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching user plan",
      });
    }

    // If no plan found, return default free plan settings
    if (!data) {
      return res.status(200).json({
        success: true,
        plan: {
          plan_type: "free",
          subject_limit: 3,
          created_at: new Date().toISOString(),
        },
      });
    }

    return res.status(200).json({
      success: true,
      plan: data,
    });
  } catch (error) {
    console.error("Server error fetching user plan:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * Check if a user can create a subject
 */
router.get("/can-create-subject", validateSubjectCreation, (req, res) => {
  return res.status(200).json({
    success: true,
    can_create: true,
  });
});

/**
 * Check if user is premium
 */
router.get("/is-premium", async (req, res) => {
  const userId = req.query.user_id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "User ID is required",
    });
  }

  try {
    const isPremium = await isPremiumUser(userId);

    return res.status(200).json({
      success: true,
      is_premium: isPremium,
    });
  } catch (error) {
    console.error("Error checking premium status:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking premium status",
    });
  }
});

export default router;
