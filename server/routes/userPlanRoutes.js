import express from "express";
import {
  validateSubjectCreation,
  isPremiumUser,
} from "../middleware/planValidation.js";
import { supabaseClient } from "../config/supabaseClient.js";

import { getPaymentDetails, approvePreAuthorization, cancelPreAuthorization, getToken } from '../controllers/paymentController.js'

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


// Payment endpoints
router.get("/payments/order", getToken);
router.post("/payments/:orderId/authorization/approve", approvePreAuthorization);
router.post("/payments/:orderId/authorization/cancel", cancelPreAuthorization);
router.post(
  "/process-payment",
  // Keep this BEFORE any global app.use(express.json())
  express.raw({ type: "*/*" }),
  async (req, res) => {
    try {
      // 1) Parse and normalize to the "inner" body you showed
      const incoming = parseIncoming(req);
      const data = incoming?.body ?? incoming; // prefer nested `body`, else top-level

      // 2) Validate basics
      if (!data) {
        return res.status(400).json({ message: "Missing webhook body" });
      }
      const event = incoming?.event ?? data?.event ?? null;
      const orderStatusKey = data?.order_status?.key ?? null;

      const buyer = data?.buyer ?? {};
      const user_id =
        buyer?.user_id || buyer?.id || buyer?.userId;

      if (!user_id || typeof user_id !== "string") {
        return res.status(400).json({ message: "buyer.user_id not found" });
      }

      // 3) Extract useful fields
      const orderId = data?.order_id ?? null;
      const externalOrderId = data?.external_order_id ?? null;

      const pu = data?.purchase_units ?? {};
      const items = Array.isArray(pu?.items) ? pu.items : [];
      const first = items[0] ?? {};

      const planCode = first?.product_id ?? "unknown";
      const planName = first?.description ?? planCode;

      // amounts may be strings ("0.1")
      const requestAmount = pu?.request_amount != null ? Number(pu.request_amount) : null;
      const transferAmount = pu?.transfer_amount != null ? Number(pu.transfer_amount) : null;
      const amount = Number.isFinite(transferAmount) ? transferAmount :
                     Number.isFinite(requestAmount)  ? requestAmount  : null;

      const currency = pu?.currency_code ?? "GEL";

      const paymentDetail = data?.payment_detail ?? {};
      const transactionId = paymentDetail?.transaction_id ?? null;
      const gatewayCode = paymentDetail?.code ?? null; // '100' => success per your sample
      const gatewayMessage = paymentDetail?.code_description ?? null;

      // Normalize payment status
      const status =
        orderStatusKey ||
        (gatewayCode === "100" ? "completed" : "unknown");

      await supabaseClient.from('user_plans').insert({
        user_id,
        plan_type: planCode,
        active: true,
        subject_limit: 0
      })

      await supabaseClient.from('payment_methods').insert({
        user_id,
        method_name: "web",
        details: {
          planCode,
          planName,
          lastOrderId: orderId,
          externalOrderId,
          payment: {
            status,
            amount,
            currency,
            transactionId,
            gatewayCode,
            gatewayMessage,
            receivedAt: new Date().toISOString(),
          }
        },
        created_at: new Date()
      })

      if (error) {
        console.error("Supabase admin.updateUserById error:", error);
        return res.status(500).json({
          message: "Failed to update user metadata",
          details: error.message,
        });
      }

      // 5) Acknowledge fast
      return res.status(200).json({
        ok: true,
        event: event || "order_payment",
        userId: user_id,
        orderId,
        externalOrderId,
        planCode,
        planName,
        status,
        amount,
        currency,
        supabaseUserId: upd?.user?.id ?? null,
      });
    } catch (err) {
      console.error("process-payment error:", err?.message || err);
      return res.status(400).json({
        message: "Bad request while processing payment",
        details: err?.message ?? String(err),
      });
    }
  }
);


export default router;
