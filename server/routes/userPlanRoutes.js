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

function parseIncoming(req) {
  const raw = req.body;
  if (!raw) return {};
  if (typeof raw === "object" && !Buffer.isBuffer(raw)) return raw; // just in case
  try {
    const text = Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw);
    return JSON.parse(text);
  } catch {
    return {}; // don’t throw on bad JSON
  }
}

/** prefer numeric if safe, but keep original string for storage */
function parseAmount(value) {
  if (value == null) return { amountNum: null, amountStr: null };
  const str = String(value);
  const num = Number(str);
  return Number.isFinite(num)
    ? { amountNum: num, amountStr: str }
    : { amountNum: null, amountStr: str };
}

/** normalize status from multiple places */
function normalizeStatus(orderStatusKey, gatewayCode) {
  // BOG often uses code "100" == success
  if (orderStatusKey && typeof orderStatusKey === "string") return orderStatusKey;
  if (String(gatewayCode) === "100") return "completed";
  return "unknown";
}

router.post(
  "/process-payment",
  // MUST be before any app.use(express.json())
  express.raw({ type: "*/*" }),
  async (req, res) => {
    try {
      // 1) Parse and flatten
      const incoming = parseIncoming(req);
      const data = incoming?.body ?? incoming;

      if (!data || typeof data !== "object") {
        return res.status(400).json({ message: "Missing webhook body" });
      }

      // 2) Extract/normalize basics
      const event = incoming?.event ?? data?.event ?? "order_payment";

      const buyer = data?.buyer ?? {};
      let user_id =
        buyer?.user_id ?? buyer?.id ?? buyer?.userId ?? null;
      if (user_id != null) user_id = String(user_id);

      if (!user_id || typeof user_id !== "string" || user_id.trim() === "") {
        return res.status(400).json({ message: "buyer.user_id not found" });
      }

      const orderId = data?.order_id ?? null;
      const externalOrderId = data?.external_order_id ?? null;

      const pu = data?.purchase_units ?? {};
      const items = Array.isArray(pu?.items) ? pu.items : [];
      const first = items[0] ?? {};

      const planCode = first?.product_id ?? "unknown";
      const planName = first?.description ?? planCode;

      const { amountNum: reqAmtNum, amountStr: reqAmtStr } = parseAmount(
        pu?.request_amount
      );
      const { amountNum: trfAmtNum, amountStr: trfAmtStr } = parseAmount(
        pu?.transfer_amount
      );

      // prefer transfer amount; fallback to request amount
      const amountNum = trfAmtNum ?? reqAmtNum;
      const amountStr = trfAmtStr ?? reqAmtStr;

      const currency = pu?.currency_code ?? "GEL";

      const paymentDetail = data?.payment_detail ?? {};
      const transactionId = paymentDetail?.transaction_id ?? null;
      const gatewayCode = paymentDetail?.code ?? null;
      const gatewayMessage = paymentDetail?.code_description ?? null;

      const status = normalizeStatus(data?.order_status?.key, gatewayCode);

      // 3) Idempotency-safe writes (simple upserts)
      // Assumptions:
      // - user_plans has a unique constraint on (user_id) OR (user_id, plan_type)
      // - payment_methods has a unique constraint on (user_id, method_name)
      // If you don’t have these, create them, or switch to insert-only.
      const nowIso = new Date().toISOString();

      const planPayload = {
        user_id,
        plan_type: planCode,
        active: true,
        subject_limit: 0,
        updated_at: nowIso,
      };

      const { data: planRow, error: planErr } = await supabaseClient
        .from("user_plans")
        .upsert(planPayload, { onConflict: "user_id" })
        .select()
        .maybeSingle();

      if (planErr) {
        console.error("user_plans upsert error:", planErr);
        return res.status(500).json({ message: "Failed to upsert plan" });
      }

      const methodPayload = {
        user_id,
        method_name: "web", // or "bog_web" if you want to distinguish
        details: {
          planCode,
          planName,
          lastOrderId: orderId,
          externalOrderId,
          payment: {
            status,
            amount: amountStr ?? (amountNum != null ? String(amountNum) : null),
            amountNumeric: amountNum,
            currency,
            transactionId,
            gatewayCode,
            gatewayMessage,
            receivedAt: nowIso,
          },
        },
        updated_at: nowIso,
        created_at: nowIso, // harmless if the table defaults this
      };

      const { data: methodRow, error: methodErr } = await supabaseClient
        .from("payment_methods")
        .upsert(methodPayload, { onConflict: "user_id,method_name" })
        .select()
        .maybeSingle();

      if (methodErr) {
        console.error("payment_methods upsert error:", methodErr);
        return res.status(500).json({ message: "Failed to upsert payment method" });
      }

      // 4) Optional: light dedupe guard by transactionId
      // If you have a `webhook_events` table with unique (transaction_id), insert there first.
      // Skipped here to keep it simple.

      // 5) ACK quickly
      return res.status(200).json({
        ok: true,
        event,
        userId: user_id,
        orderId,
        externalOrderId,
        planCode,
        planName,
        status,
        amount: amountNum ?? amountStr ?? null,
        amountRaw: amountStr ?? null,
        currency,
        planRowId: planRow?.id ?? null,
        methodRowId: methodRow?.id ?? null,
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
