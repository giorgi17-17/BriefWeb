import express from "express";
import {
  validateSubjectCreation,
  isPremiumUser,
} from "../middleware/planValidation.js";
import { supabaseClient } from "../config/supabaseClient.js";
import crypto from 'crypto'

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

// routes/processPayment.js
// CommonJS; adjust imports/paths as needed for your project.

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
  if (typeof raw === "object" && !Buffer.isBuffer(raw)) return raw; // already parsed
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
  // keep raw to accept BOG’s webhook regardless of content-type quirks
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
      dbg("start", { /* meta omitted */ });

      // 1) parse
      const incoming = parseIncoming(req);
      const data = incoming && typeof incoming === "object" && incoming.body ? incoming.body : incoming;
      dbg("flattened.data", redact(data));
      if (!data || typeof data !== "object") {
        return res.status(400).json({ message: "Missing webhook body", ...(wantDebugInResponse ? { debug: { rid, trail } } : {}) });
      }

      // 2) extract / normalize
      const event = (incoming && incoming.event) || data.event || "order_payment";

      const orderId = data.order_id ?? null;
      const externalOrderId = data.external_order_id ?? null;

      if (!externalOrderId || typeof externalOrderId !== "string" || externalOrderId.trim() === "") {
        dbg("error.missing_external_order_id");
        return res.status(400).json({
          message: "external_order_id not found",
          ...(wantDebugInResponse ? { debug: { rid, trail } } : {}),
        });
      }

      // purchase units, amounts
      const pu = data.purchase_units || {};
      const items = Array.isArray(pu.items) ? pu.items : [];
      const first = items[0] || {};
      const planCode = first.product_id ?? "unknown";
      const planName = first.description ?? planCode;

      const { amountNum: reqAmtNum, amountStr: reqAmtStr } = parseAmount(pu.request_amount);
      const { amountNum: trfAmtNum, amountStr: trfAmtStr } = parseAmount(pu.transfer_amount);
      const amountNum = trfAmtNum ?? reqAmtNum;
      const amountStr = trfAmtStr ?? reqAmtStr;
      const currency = pu.currency_code ?? "GEL";

      const paymentDetail = data.payment_detail || {};
      const transactionId = paymentDetail.transaction_id ?? null;
      const gatewayCode = paymentDetail.code ?? null;
      const gatewayMessage = paymentDetail.code_description ?? null;

      const status = normalizeStatus(data?.order_status?.key, gatewayCode);

      // 3) resolve user_id by external_order_id
      const nowIso = new Date().toISOString();

      const existingPlan = await supabaseClient
        .from("user_plans")
        .select("id,user_id")
        .eq("external_order_id", externalOrderId)
        .maybeSingle();

      if (existingPlan.error) {
        dbg("error.user_plans_lookup", { error: existingPlan.error.message });
        return res.status(500).json({ message: "Failed to lookup plan", ...(wantDebugInResponse ? { debug: { rid, trail } } : {}) });
      }

      const boundUserId = existingPlan.data?.user_id ?? null;

      if (!boundUserId) {
        // Race case: webhook before pre-create binding — park it
        const pendingIns = await supabaseClient
          .from("payment_events_pending")
          .insert({
            external_order_id: externalOrderId,
            payload: data,
            received_at: nowIso,
          })
          .select()
          .maybeSingle();

        if (pendingIns.error) {
          dbg("error.pending_insert", { error: pendingIns.error.message });
          // Even if pending insert fails, avoid re-trying the whole webhook infinitely.
        } else {
          dbg("pending.stored", { externalOrderId, pendingId: pendingIns.data?.id });
        }

        return res.status(202).json({
          ok: true,
          pending: true,
          reason: "No user binding for external_order_id yet",
          externalOrderId,
          ...(wantDebugInResponse ? { debug: { rid, trail } } : {}),
        });
      }

      // 4) update the bound plan row (idempotent by external_order_id)
      const planPayload = {
        external_order_id: externalOrderId,
        user_id: boundUserId,
        plan_type: planName,
        active: status === "completed",
        subject_limit: 0,
        updated_at: nowIso,
      };
      dbg("db.user_plans.update.payload", planPayload);

      const planRes = await supabaseClient
        .from("user_plans")
        .update(planPayload)
        .eq("external_order_id", externalOrderId)
        .select()
        .maybeSingle();

      if (planRes.error || !planRes.data) {
        dbg("error.user_plans_update", { error: planRes.error?.message, missing: !planRes.data });
        return res.status(500).json({ message: "Failed to update plan", ...(wantDebugInResponse ? { debug: { rid, trail } } : {}) });
      }

      // 5) insert (or upsert) payment method row
      const methodPayload = {
        external_order_id: externalOrderId,
        user_id: boundUserId, // optional, but helpful
        method_name: "web",
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
        created_at: nowIso,
      };
      dbg("db.payment_methods.insert.payload", methodPayload);

      const methodRes = await supabaseClient
        .from("payment_methods")
        .insert(methodPayload)
        .select()
        .maybeSingle();

      if (methodRes.error) {
        dbg("error.payment_methods_insert", { error: methodRes.error.message });
        return res.status(500).json({ message: "Failed to upsert payment method", ...(wantDebugInResponse ? { debug: { rid, trail } } : {}) });
      }

      // 6) ack
      const ack = {
        ok: true,
        rid,
        event,
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
      console.error(`[process-payment][${rid}] exception`, err);
      return res.status(400).json({
        message: "Bad request while processing payment",
        details: err?.message ?? String(err),
        ...(String(req.headers["x-debug"] || "").toLowerCase() === "1" ? { debug: { rid, trail } } : {}),
      });
    }
  }
);

export default router;
