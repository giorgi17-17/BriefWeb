/**
 * Generates a unique ID string
 * @returns {string} A unique ID
 */
export const generateUniqueID = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${timestamp}_${randomStr}`;
};

/**
 * Formats a currency amount
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code (e.g., USD, EUR)
 * @returns {string} Formatted currency
 */
export const formatCurrency = (amount, currency = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount / 100);
};

/**
 * Validates a payment object
 * @param {Object} payment - The payment object to validate
 * @returns {Object} An object with isValid and errors properties
 */
export const validatePayment = (payment) => {
  const errors = {};

  if (
    !payment.amount ||
    typeof payment.amount !== "number" ||
    payment.amount <= 0
  ) {
    errors.amount = "A valid amount greater than 0 is required";
  }

  if (!payment.currency || typeof payment.currency !== "string") {
    errors.currency = "Valid currency is required";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Creates a safe JSON response by removing sensitive data
 * @param {Object} paymentData - The payment data to sanitize
 * @returns {Object} Sanitized payment data
 */
export const sanitizePaymentData = (paymentData) => {
  const { client_secret, ...safeData } = paymentData;
  return {
    ...safeData,
    client_secret: client_secret ? `${client_secret.substring(0, 5)}...` : null,
  };
};



export function isEmptyAnswer(s) {
  if (s == null) return true;
  const v = String(s).trim().toLowerCase();
  if (!v) return true;
  const empties = new Set(["n/a", "na", "idk", "i don't know", "dont know", "-", "—", "none", "null"]);
  return empties.has(v);
}

// Extract the first JSON object found in a string (robust to markdown/code fences)
export function extractJsonObject(s) {
  if (!s) return null;
  // Strip backticks fences if present
  const cleaned = s.replace(/```[\s\S]*?```/g, (block) => block.replace(/```(json)?/gi, "").replace(/```/g, "")).trim();

  // Simple brace matching to find the first top-level JSON object
  let depth = 0, start = -1;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        return cleaned.slice(start, i + 1);
      }
    }
  }
  return null;
}

export function normalizeWeights(w = {}) {
  const def = { accuracy: 40, completeness: 30, understanding: 20, clarity: 10 };
  const merged = {
    accuracy: Number.isFinite(w.accuracy) ? Number(w.accuracy) : def.accuracy,
    completeness: Number.isFinite(w.completeness) ? Number(w.completeness) : def.completeness,
    understanding: Number.isFinite(w.understanding) ? Number(w.understanding) : def.understanding,
    clarity: Number.isFinite(w.clarity) ? Number(w.clarity) : def.clarity,
  };
  const sum = merged.accuracy + merged.completeness + merged.understanding + merged.clarity;
  // Normalize to ~100 if user passed odd totals
  if (sum > 0 && sum !== 100) {
    merged.accuracy = Math.round((merged.accuracy / sum) * 100);
    merged.completeness = Math.round((merged.completeness / sum) * 100);
    merged.understanding = Math.round((merged.understanding / sum) * 100);
    merged.clarity = 100 - (merged.accuracy + merged.completeness + merged.understanding);
  }
  return merged;
}

// Validate shape of model output
export function validateEvaluation(obj) {
  if (!obj || typeof obj !== "object") return false;
  const hasScore = Number.isFinite(obj.score);
  const hasVerdict = ["correct", "partially_correct", "incorrect", "no_answer"].includes(obj.verdict);
  const hasArrays = Array.isArray(obj.matched_key_points) && Array.isArray(obj.missing_key_points) && Array.isArray(obj.suggestions);
  const hasText = typeof obj.feedback === "string" && typeof obj.improved_answer === "string";
  return hasScore && hasVerdict && hasArrays && hasText;
}