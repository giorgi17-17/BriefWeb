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
