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

// --- Config -----------------------------------------------------------------
const DEBUG_ENABLED = true

// Very basic redaction for potential sensitive fields
function redact(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const SENSITIVE_KEYS = new Set([
    "card",
    "pan",
    "cvv",
    "cvc",
    "expiry",
    "token",
    "authorization",
    "password",
    "secret",
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

// --- Route ------------------------------------------------------------------
router.post(
  "/process-payment",
  // MUST be before any app.use(express.json()) so req.body is a Buffer
  express.raw({ type: "*/*" }),
  async (req, res) => {
    const rid = requestId(req);
    const t0 = process.hrtime.bigint();
    const wantDebugInResponse = String(req.headers["x-debug"] || "").toLowerCase() === "1";
    const trail = []; // [{ t, step, data }]

    const dbg = (step, data) => {
      const line = { t: msSince(t0), step, data };
      trail.push(line);
      if (DEBUG_ENABLED) {
        console.log(`[process-payment][${rid}] ${line.t} ${step}`, data ?? "");
      }
    };

    try {
      /* 0) Request metadata */
      dbg("start", {
        ip: req.ip,
        ua: req.headers["user-agent"],
        contentType: req.headers["content-type"],
        rawLen: Buffer.isBuffer(req.body) ? req.body.length : null,
        sig: req.headers["x-bog-signature"] || req.headers["x-signature"] || null,
      });

      /* 1) Parse & flatten */
      const incoming = parseIncoming(req);
      dbg("parsed.incoming", redact(incoming));

      const data = incoming && typeof incoming === "object" && incoming.body
        ? incoming.body
        : incoming;
      dbg("flattened.data", redact(data));

      if (!data || typeof data !== "object") {
        dbg("error.missing_body");
        return res.status(400).json({
          message: "Missing webhook body",
          ...(wantDebugInResponse ? { debug: { rid, trail } } : {}),
        });
      }

      /* 2) Extract / normalize basics */
      const event = incoming?.event ?? data?.event ?? "order_payment";
      dbg("field.event", { event });

      const buyer = data?.buyer ?? {};
      let user_id = buyer?.user_id ?? buyer?.id ?? buyer?.userId ?? null;
      if (user_id != null) user_id = String(user_id);
      dbg("field.user_id", { user_id });

      if (!user_id || typeof user_id !== "string" || user_id.trim() === "") {
        dbg("error.missing_user_id");
        return res.status(400).json({
          message: "buyer.user_id not found",
          ...(wantDebugInResponse ? { debug: { rid, trail } } : {}),
        });
      }

      const orderId = data?.order_id ?? null;
      const externalOrderId = data?.external_order_id ?? null;
      dbg("field.order_ids", { orderId, externalOrderId });

      const pu = data?.purchase_units ?? {};
      const items = Array.isArray(pu?.items) ? pu.items : [];
      const first = items[0] ?? {};
      dbg("field.items.first", redact(first));

      const planCode = first?.product_id ?? "unknown";
      const planName = first?.description ?? planCode;
      dbg("field.plan", { planCode, planName });

      const { amountNum: reqAmtNum, amountStr: reqAmtStr } = parseAmount(pu?.request_amount);
      const { amountNum: trfAmtNum, amountStr: trfAmtStr } = parseAmount(pu?.transfer_amount);
      const amountNum = trfAmtNum ?? reqAmtNum;
      const amountStr = trfAmtStr ?? reqAmtStr;
      const currency = pu?.currency_code ?? "GEL";
      dbg("field.amounts", {
        request_amount: { reqAmtNum, reqAmtStr },
        transfer_amount: { trfAmtNum, trfAmtStr },
        chosen: { amountNum, amountStr, currency },
      });

      const paymentDetail = data?.payment_detail ?? {};
      const transactionId = paymentDetail?.transaction_id ?? null;
      const gatewayCode = paymentDetail?.code ?? null;
      const gatewayMessage = paymentDetail?.code_description ?? null;
      dbg("field.payment_detail", { transactionId, gatewayCode, gatewayMessage });

      const status = normalizeStatus(data?.order_status?.key, gatewayCode);
      dbg("field.status.normalized", { status, orderStatusKey: data?.order_status?.key });

      /* 3) Idempotency-safe writes (simple upserts) */
      const nowIso = new Date().toISOString();

      const planPayload = {
        user_id,
        plan_type: planCode,
        active: true,
        subject_limit: 0,
        updated_at: nowIso,
      };
      dbg("db.user_plans.upsert.payload", planPayload);

      const planRes = await supabaseClient
        .from("user_plans")
        .upsert(planPayload, { onConflict: "user_id" })
        .select()
        .maybeSingle();

      dbg("db.user_plans.upsert.result", {
        error: planRes.error ? String(planRes.error.message) : null,
        id: planRes.data?.id ?? null,
      });

      if (planRes.error) {
        dbg("error.user_plans_upsert", { error: planRes.error.message });
        return res.status(500).json({
          message: "Failed to upsert plan",
          ...(wantDebugInResponse ? { debug: { rid, trail } } : {}),
        });
      }

      const methodPayload = {
        user_id,
        method_name: "web", // change to "bog_web" if you want to distinguish
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
      dbg("db.payment_methods.upsert.payload", methodPayload);

      const methodRes = await supabaseClient
        .from("payment_methods")
        .upsert(methodPayload, { onConflict: "user_id,method_name" })
        .select()
        .maybeSingle();

      dbg("db.payment_methods.upsert.result", {
        error: methodRes.error ? String(methodRes.error.message) : null,
        id: methodRes.data?.id ?? null,
      });

      if (methodRes.error) {
        dbg("error.payment_methods_upsert", { error: methodRes.error.message });
        return res.status(500).json({
          message: "Failed to upsert payment method",
          ...(wantDebugInResponse ? { debug: { rid, trail } } : {}),
        });
      }

      /* 4) Optional dedupe (not implemented, just logged) */
      dbg("dedupe.skipped", {
        note: "Consider webhook_events with UNIQUE(transaction_id). Insert first to dedupe.",
      });

      /* 5) ACK */
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

      return res
        .status(200)
        .json(wantDebugInResponse ? { ...ack, debug: { rid, trail } } : ack);
    } catch (err) {
      const msg = err?.message ?? String(err);
      // keep trace in console for ops
      console.error(`[process-payment][${rid}] exception`, err);
      return res.status(400).json({
        message: "Bad request while processing payment",
        details: msg,
        ...(wantDebugInResponse ? { debug: { rid, trail } } : {}),
      });
    }
  }
);


export default router;
