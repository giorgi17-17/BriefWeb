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

/* ---------------- Helpers ---------------- */
function requestId(req) {
  const hdr = req.headers["x-request-id"];
  if (hdr && typeof hdr === "string") return hdr;
  if (crypto.randomUUID) return crypto.randomUUID();
  return "rid_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

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

function parseAmount(value) {
  if (value == null) return { amountNum: null, amountStr: null };
  const str = String(value);
  const num = Number(str);
  return Number.isFinite(num)
    ? { amountNum: num, amountStr: str }
    : { amountNum: null, amountStr: str };
}

function normalizeStatus(orderStatusKey, gatewayCode) {
  if (orderStatusKey && typeof orderStatusKey === "string") return orderStatusKey;
  if (String(gatewayCode) === "100") return "completed";
  return "unknown";
}

const DEBUG_ENABLED = true;

function redact(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const SENSITIVE_KEYS = new Set([
    "card", "pan", "cvv", "cvc", "expiry", "token", "authorization", "password", "secret",
  ]);
  const seen = new WeakSet();
  function _clone(o) {
    if (o && typeof o === "object") {
      if (seen.has(o)) return "[circular]";
      seen.add(o);
    }
    if (Array.isArray(o)) return o.map(_clone);
    if (o && typeof o === "object") {
      const out = {};
      for (const [k, v] of Object.entries(o)) {
        out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? "[redacted]" : _clone(v);
      }
      return out;
    }
    return o;
  }
  return _clone(obj);
}

function msSince(start) {
  const diffNs = Number(process.hrtime.bigint() - start);
  return (diffNs / 1_000_000).toFixed(1) + "ms";
}

/* ---------------- Route ---------------- */
router.post(
  "/process-payment",
  express.raw({ type: "*/*" }),
  async (req, res) => {
    const rid = requestId(req);
    const t0 = process.hrtime.bigint();
    const wantDebugInResponse = String(req.headers["x-debug"] || "").toLowerCase() === "1";
    const trail = [];
    const dbg = (step, data) => {
      const line = { t: msSince(t0), step, data };
      trail.push(line);
      if (DEBUG_ENABLED) console.log(`[process-payment][${rid}] ${line.t} ${step}`, data ?? "");
    };

    try {
      // 0) meta
      dbg("start", { /* ... */ });

      // 1) parse
      const incoming = parseIncoming(req);
      const data = incoming && typeof incoming === "object" && incoming.body ? incoming.body : incoming;
      dbg("flattened.data", redact(data));
      if (!data || typeof data !== "object") {
        return res.status(400).json({ message: "Missing webhook body", ...(wantDebugInResponse ? { debug: { rid, trail } } : {}) });
      }

      // 2) extract / normalize
      const event = (incoming && incoming.event) || data.event || "order_payment";
      const buyer = data.buyer || {};
      let user_id = buyer.user_id ?? buyer.id ?? buyer.userId ?? null;
      if (user_id != null) user_id = String(user_id);

      const orderId = data.order_id ?? null;
      const externalOrderId = data.external_order_id ?? null;

      // NEW: require external_order_id as the idempotency key
      if (!externalOrderId || typeof externalOrderId !== "string" || externalOrderId.trim() === "") {
        dbg("error.missing_external_order_id");
        return res.status(400).json({
          message: "external_order_id not found",
          ...(wantDebugInResponse ? { debug: { rid, trail } } : {}),
        });
      }

      // (optional) still require user_id so we can attach to a user
      if (!user_id || typeof user_id !== "string" || user_id.trim() === "") {
        dbg("error.missing_user_id");
        return res.status(400).json({
          message: "buyer.user_id not found",
          ...(wantDebugInResponse ? { debug: { rid, trail } } : {}),
        });
      }

      // ...items/amount/status extraction stays the same...

      // 3) writes — use external_order_id for onConflict
      const nowIso = new Date().toISOString();

      // include external_order_id as a top-level column
      const planPayload = {
        external_order_id: externalOrderId,   // <-- NEW
        user_id,
        plan_type: planCode,
        active: true,
        subject_limit: 0,
        updated_at: nowIso,
      };
      dbg("db.user_plans.upsert.payload", planPayload);

      // conflict target changed to external_order_id
      const planRes = await supabaseClient
        .from("user_plans")
        .upsert(planPayload, { onConflict: "external_order_id", defaultToNull: false })
        .select()
        .maybeSingle();

      if (planRes.error) {
        dbg("error.user_plans_upsert", { error: planRes.error.message });
        return res.status(500).json({ message: "Failed to upsert plan", ...(wantDebugInResponse ? { debug: { rid, trail } } : {}) });
      }

      const methodPayload = {
        external_order_id: externalOrderId,   // <-- NEW
        user_id,                              // keep for join/filtering
        method_name: "web",
        details: {
          planCode,
          planName,
          lastOrderId: orderId,
          externalOrderId, // also keep inside details if you like
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
        created_at: nowIso,
      };
      dbg("db.payment_methods.upsert.payload", methodPayload);

      // conflict target changed to external_order_id (you can include method_name too if your UNIQUE is composite)
      const methodRes = await supabaseClient
        .from("payment_methods")
        .upsert(methodPayload, { onConflict: "external_order_id", defaultToNull: false })
        .select()
        .maybeSingle();

      if (methodRes.error) {
        dbg("error.payment_methods_upsert", { error: methodRes.error.message });
        return res.status(500).json({ message: "Failed to upsert payment method", ...(wantDebugInResponse ? { debug: { rid, trail } } : {}) });
      }

      // 5) ack
      const ack = {
        ok: true,
        rid,
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
        planRowId: planRes.data?.id ?? null,
        methodRowId: methodRes.data?.id ?? null,
      };
      dbg("ack", ack);
      return res.status(200).json(wantDebugInResponse ? { ...ack, debug: { rid, trail } } : ack);
    } catch (err) {
      // ...
    }
  }
);
export default router;
