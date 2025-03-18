import dotenv from "dotenv";
import axios from "axios";
import { validatePayment, sanitizePaymentData } from "../utils/helpers.js";

dotenv.config();

// BOG API Configuration - Payment Processing
const BOG_API_BASE_URL = process.env.BOG_API_BASE_URL || "https://api.bog.ge";
const BOG_PAYMENT_DOMAIN =
  process.env.BOG_PAYMENT_DOMAIN || "https://payment.bog.ge";

// Correct endpoints based on documentation
const AUTH_ENDPOINT = "/payments/oauth2/token";
const ORDERS_ENDPOINT = "/payments/v1/ecommerce/orders";
const RECEIPT_ENDPOINT = "/payments/v1/receipt";

const BOG_PUBLIC_KEY = process.env.BOG_PUBLIC_KEY;
const BOG_SECRET_KEY = process.env.BOG_SECRET_KEY;
const BOG_TERMINAL_ID = process.env.BOG_TERMINAL_ID || "0000001";

// BOG-ID Authentication Configuration (for user identity verification)
const BOG_AUTH_CLIENT_ID =
  process.env.BOG_AUTH_CLIENT_ID || process.env.BOG_CLIENT_ID;
const BOG_AUTH_CLIENT_SECRET =
  process.env.BOG_AUTH_CLIENT_SECRET || process.env.BOG_CLIENT_SECRET;

// Module state for authentication
let accessToken = null;
let tokenExpiresAt = null;

// Mock database for payment methods (will be replaced with a real database)
const paymentMethods = [];

/**
 * Gets an authentication token from BOG API for payment processing
 * @returns {Promise<string>} The authentication token
 */
export const getAuthToken = async () => {
  try {
    // Check if we have a valid cached token
    if (accessToken && tokenExpiresAt && new Date() < tokenExpiresAt) {
      console.log("Using cached BOG API token");
      return accessToken;
    }

    console.log("Requesting new auth token from BOG API...");

    // Create Basic auth string in base64 format for payment processing
    const authString = `${BOG_PUBLIC_KEY}:${BOG_SECRET_KEY}`;
    const base64Auth = Buffer.from(authString).toString("base64");

    // Log the auth string for debugging (without revealing full credentials)
    console.log(
      `Auth string format: ${BOG_PUBLIC_KEY.substring(0, 4)}...:{SECRET}`
    );

    // Prepare request - BOG uses standard OAuth2 format with x-www-form-urlencoded
    const requestBody = new URLSearchParams();
    requestBody.append("grant_type", "client_credentials");

    // Make the token request - correctly formatted for BOG API
    const response = await fetch(`${BOG_API_BASE_URL}/payments/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${base64Auth}`,
      },
      body: requestBody,
    });

    console.log("Auth response status:", response.status);
    console.log(
      "Auth response headers:",
      Object.fromEntries([...response.headers.entries()])
    );

    // Check content type for HTML
    const contentType = response.headers.get("content-type");
    console.log("Auth response content type:", contentType);

    // Get response as text first
    const responseText = await response.text();

    // If response is HTML, log and handle appropriately
    if (contentType && contentType.includes("text/html")) {
      console.error(
        "Received HTML response instead of JSON during authentication:"
      );
      console.error(
        "First 500 chars of HTML:",
        responseText.substring(0, 500) + "..."
      );
      throw new Error(
        `Authentication API returned HTML instead of JSON. Status: ${response.status}`
      );
    }

    // Try to parse as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log("Auth response data keys:", Object.keys(responseData));
    } catch (parseError) {
      console.error("Failed to parse auth response as JSON:");
      console.error(
        "First 500 chars of response:",
        responseText.substring(0, 500) + "..."
      );
      throw new Error(`Invalid JSON in auth response: ${parseError.message}`);
    }

    // Check if access token exists
    if (!responseData || !responseData.access_token) {
      console.error("Received response but no access token:", responseData);
      throw new Error(
        "Received response from BOG API but no access token found"
      );
    }

    // Get token, expiry time, and cache them
    accessToken = `Bearer ${responseData.access_token}`;
    const expiresIn = responseData.expires_in || 3600; // Default to 1 hour if not specified
    tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    return accessToken;
  } catch (error) {
    console.error("Error getting BOG auth token:", error.message);

    // For development, create a mock token
    if (process.env.NODE_ENV === "development") {
      console.log("Creating mock auth token for testing...");
      accessToken = `Bearer mock_${Date.now()}`;
      tokenExpiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour from now
      return accessToken;
    }

    throw error;
  }
};

/**
 * Creates a payment order using Bank of Georgia payment API
 *
 * @param {Object} orderData - Order data including amount, currency, etc.
 * @returns {Promise<Object>} Order details including order ID and redirect URL
 */
export const createPaymentOrder = async (orderData) => {
  try {
    console.log("Creating BOG payment order with data:", orderData);

    // Get authentication token first
    const token = await getAuthToken();
    if (!token) {
      throw new Error("Failed to get authorization token");
    }

    // Prepare the payment order request based on BOG documentation
    const orderRequest = {
      callback_url: process.env.BOG_CALLBACK_URL,
      external_order_id: orderData.shopOrderId || `order_${Date.now()}`,
      purchase_units: {
        currency: orderData.currency || "USD",
        total_amount: orderData.amount,
        basket: [
          {
            quantity: 1,
            unit_price: orderData.amount,
            product_id: orderData.productId || "subscription",
            description: orderData.description || "BriefWeb Subscription",
          },
        ],
      },
      redirect_urls: {
        success: orderData.successUrl || process.env.BOG_PAYMENT_SUCCESS_URL,
        fail: orderData.failUrl || process.env.BOG_PAYMENT_FAILURE_URL,
      },
    };

    // For subscriptions, we might need to add additional fields
    if (orderData.isSubscription) {
      // Note: According to BOG docs, subscriptions may need to be configured differently
      // This would need to be discussed with the bank
      console.log("Creating subscription order");
    }

    console.log(
      "Sending order request:",
      JSON.stringify(orderRequest, null, 2)
    );

    // Send the request to BOG API
    const response = await fetch(`${BOG_API_BASE_URL}${ORDERS_ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "Accept-Language": orderData.locale || "en",
      },
      body: JSON.stringify(orderRequest),
    });

    // Check if response is JSON or HTML
    const contentType = response.headers.get("content-type");
    console.log("Response content type:", contentType);

    // First get the response as text to inspect
    const responseText = await response.text();

    // If we got HTML instead of JSON, log it properly
    if (contentType && contentType.includes("text/html")) {
      console.error("Received HTML response instead of JSON:");
      console.error("Response status:", response.status);
      console.error(
        "Response headers:",
        Object.fromEntries([...response.headers.entries()])
      );
      console.error(
        "First 500 chars of HTML:",
        responseText.substring(0, 500) + "..."
      );
      throw new Error(
        `Payment API returned HTML instead of JSON. Status: ${response.status}`
      );
    }

    // Parse the text as JSON if it wasn't HTML
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse response as JSON:");
      console.error(
        "First 500 chars of response:",
        responseText.substring(0, 500) + "..."
      );
      throw new Error(
        `Invalid JSON response from payment API: ${parseError.message}`
      );
    }

    console.log("BOG API response:", responseData);

    if (
      !responseData ||
      !responseData.id ||
      !responseData._links ||
      !responseData._links.redirect
    ) {
      console.error("Invalid response format from BOG API:", responseData);
      throw new Error("Invalid response format from payment API");
    }

    // Return the order details according to BOG API response format
    return {
      orderId: responseData.id,
      shopOrderId: orderRequest.external_order_id,
      status: "CREATED",
      redirectUrl: responseData._links.redirect.href,
    };
  } catch (error) {
    console.error("Error creating payment order:", error.message);

    // If we're in development mode, create a mock order
    if (process.env.NODE_ENV === "development") {
      console.log("Creating mock payment order in development mode");

      const mockOrderId = `order_${Date.now()}_${Math.random()
        .toString(36)
        .substring(5)}`;

      // Create a realistic redirect URL using proper format from BOG docs
      // According to docs: https://payment.bog.ge/?order_id={order_id}
      const redirectUrl = `${BOG_PAYMENT_DOMAIN}/?order_id=${mockOrderId}&success_url=${encodeURIComponent(
        process.env.BOG_PAYMENT_SUCCESS_URL
      )}&fail_url=${encodeURIComponent(process.env.BOG_PAYMENT_FAILURE_URL)}`;

      return {
        orderId: mockOrderId,
        shopOrderId: orderData.shopOrderId || `shop_${Date.now()}`,
        status: "CREATED",
        redirectUrl,
      };
    }

    throw error;
  }
};

/**
 * Get payment details from BOG
 * @param {string} orderId - The BOG order ID
 * @returns {Promise<Object>} Payment details
 */
export const getPaymentDetails = async (orderId) => {
  try {
    console.log(`Getting payment details for order: ${orderId}`);
    const token = await getAuthToken();

    // Check if this is a query string format
    let cleanOrderId = orderId;
    if (orderId.includes("?")) {
      cleanOrderId = orderId.split("?")[0];
    }

    // According to the BOG API docs, we need to call their receipt endpoint
    const response = await axios.get(
      `${BOG_API_BASE_URL}${RECEIPT_ENDPOINT}/${cleanOrderId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept-Language": "en",
        },
      }
    );

    console.log("Payment details retrieved successfully");
    console.log("Payment details:", JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error) {
    console.error(
      "Error getting BOG payment details:",
      error.response?.data || error.message
    );

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error(
        "Headers:",
        JSON.stringify(error.response.headers, null, 2)
      );
    }

    // For development testing, provide mock data if the real API fails
    if (process.env.NODE_ENV === "development") {
      console.log(`Providing mock payment details for order: ${orderId}`);

      // Extract status from orderId if it contains a query parameter
      let status = "success";
      if (orderId.includes("status=")) {
        const statusMatch = orderId.match(/status=([^&]+)/);
        if (statusMatch && statusMatch[1]) {
          status = statusMatch[1];
        }
      }

      // Create mock payment details that match BOG API response format
      return {
        id: orderId.includes("?") ? orderId.split("?")[0] : orderId,
        status: status === "success" ? "Completed" : "Failed",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        amount: {
          value: 300, // $3.00
          currency: "USD",
        },
        payment_method: "card",
        card:
          status === "success"
            ? {
                card_mask: "XXXX XXXX XXXX 1234",
                card_type: "VISA",
              }
            : null,
        transaction_id: `tx_${Date.now()}`,
        is_refunded: false,
        refunded_amount: 0,
      };
    }

    throw new Error("Failed to get payment details");
  }
};

/**
 * Process a subscription payment using a saved card token
 *
 * @param {Object} paymentData Payment data including subscription ID, amount, etc.
 * @returns {Promise<Object>} Payment result
 */
export const processSubscriptionPayment = async (paymentData) => {
  try {
    console.log(
      "Processing subscription payment:",
      JSON.stringify(paymentData, null, 2)
    );

    // Get authentication token
    const token = await getAuthToken();
    if (!token) {
      throw new Error(
        "Failed to get authorization token for subscription payment"
      );
    }

    // Prepare payment data
    const paymentRequest = {
      shop_order_id:
        paymentData.shopOrderId ||
        `sub_${Date.now()}_${Math.random().toString(36).substring(5)}`,
      terminal_id: BOG_TERMINAL_ID,
      payment_method: {
        type: "SAVED_CARD",
        saved_card_id: paymentData.savedCardId,
      },
      amount: {
        currency_code: paymentData.currency || "USD",
        value: paymentData.amount.toString(),
      },
      description:
        paymentData.description ||
        `Subscription payment for ${paymentData.subscriptionId}`,
    };

    console.log(
      "Sending subscription payment request:",
      JSON.stringify(paymentRequest, null, 2)
    );

    // Send payment request to BOG API
    const response = await fetch(`${BOG_API_BASE_URL}${ORDERS_ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(paymentRequest),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Subscription payment error:", responseData);
      throw new Error(
        `Subscription payment failed: ${
          responseData.message || "Unknown error"
        }`
      );
    }

    console.log("Subscription payment successful:", responseData);

    // Return payment details
    return {
      transactionId: responseData.id,
      status: responseData.status,
      amount: responseData.amount.value,
      currency: responseData.amount.currency_code,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error processing subscription payment:", error.message);

    // If in development mode, return mock payment result
    if (process.env.NODE_ENV === "development") {
      console.log(
        "Creating mock subscription payment result in development mode"
      );

      return {
        transactionId: `trans_${Date.now()}_${Math.random()
          .toString(36)
          .substring(5)}`,
        status: "COMPLETED",
        amount: paymentData.amount,
        currency: paymentData.currency || "USD",
        timestamp: new Date().toISOString(),
      };
    }

    throw error;
  }
};

/**
 * Save card for recurring payments (subscription)
 * @param {Object} cardData - Card data
 * @returns {Promise<Object>} Saved card details
 */
export const saveCardForRecurringPayments = async (cardData) => {
  try {
    console.log(
      "Saving card for recurring payments:",
      JSON.stringify(cardData, null, 2)
    );
    const token = await getAuthToken();

    // Format the save card request according to BOG API requirements
    const saveCardData = {
      // Required - URL for receiving notifications about saved card
      callback_url: process.env.BOG_CARD_SAVE_CALLBACK_URL,

      // Optional - card holder name
      card_holder_name: cardData.cardHolderName,

      // Required - specify that this card is for recurring payments
      card_saved_for: "recurrent_payment",

      // Required - expiry date for recurring payments (max 3 years from now)
      recurrent_payment_expiry_date:
        cardData.expiryDate ||
        new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],

      // Required - URLs for redirecting after card save process
      redirect_urls: {
        success: cardData.successUrl || process.env.CARD_SAVE_SUCCESS_URL,
        fail: cardData.failUrl || process.env.CARD_SAVE_FAIL_URL,
      },
    };

    console.log("Sending save card request to BOG API...");

    // According to the docs, we use the save-cards endpoint
    const response = await axios.post(
      `${BOG_API_BASE_URL}/payments/v1/ecommerce/save-cards`,
      saveCardData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept-Language": "en",
        },
      }
    );

    console.log("Card save request successful!");
    console.log("Response data:", JSON.stringify(response.data, null, 2));

    // According to the docs, response includes:
    // - card_save_id: ID of the saved card
    // - _links.redirect.href: URL to redirect user to complete card saving
    return {
      cardSaveId: response.data.card_save_id,
      redirectUrl: response.data._links.redirect.href,
    };
  } catch (error) {
    console.error("Error saving card for recurring payments:");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error(
        "Headers:",
        JSON.stringify(error.response.headers, null, 2)
      );
      console.error(
        "Response data:",
        JSON.stringify(error.response.data, null, 2)
      );
    } else {
      console.error(error.message || error);
    }

    // For development testing, provide mock data if the real API fails
    if (process.env.NODE_ENV === "development") {
      console.log("Providing mock card save response for testing");

      // Create a mock redirect URL that simulates the card save flow
      const baseUrl = process.env.BOG_API_BASE_URL || "https://api.bog.ge";
      const successUrl =
        cardData.successUrl || process.env.CARD_SAVE_SUCCESS_URL;
      const failUrl = cardData.failUrl || process.env.CARD_SAVE_FAIL_URL;

      const cardSaveId = `card_${Date.now()}`;
      const redirectUrl = `${baseUrl}/mock-card-save?cardSaveId=${cardSaveId}&successUrl=${encodeURIComponent(
        successUrl
      )}&failUrl=${encodeURIComponent(failUrl)}`;

      return {
        cardSaveId,
        redirectUrl,
      };
    }

    throw new Error("Failed to save card for recurring payments");
  }
};

/**
 * Delete a saved card
 * @param {string} savedCardId - The saved card ID
 * @returns {Promise<boolean>} Whether deletion was successful
 */
export const deleteSavedCard = async (savedCardId) => {
  try {
    const token = await getAuthToken();

    await axios.delete(
      `${BOG_API_BASE_URL}/payments/v1/ecommerce/save-cards/${savedCardId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return true;
  } catch (error) {
    console.error(
      "Error deleting saved card:",
      error.response?.data || error.message
    );
    throw new Error("Failed to delete saved card");
  }
};

/**
 * Verify BOG payment callback
 * @param {Object} callbackData - Callback data from BOG
 * @returns {Object} Verified payment data
 */
export const verifyPaymentCallback = (callbackData) => {
  // Here you would implement any verification logic
  // For example, checking signature if BOG provides one

  return {
    isValid: true,
    data: callbackData,
  };
};

/**
 * Calculate payment breakdown including any taxes, fees, etc.
 * @param {Object} options - Payment options
 * @param {number} options.amount - The payment amount in cents
 * @param {string} options.currency - The currency code
 * @param {Object} options.metadata - Additional metadata
 * @returns {Object} Payment breakdown
 */
export const calculatePaymentBreakdown = ({
  amount,
  currency,
  metadata = {},
}) => {
  const baseAmount = amount;
  // In a real implementation, you might calculate VAT or other fees
  // For now, we'll keep it simple
  const totalAmount = baseAmount;

  return {
    baseAmount,
    totalAmount,
    currency,
    metadata,
  };
};

/**
 * Save a payment method for future use
 * @param {Object} paymentMethod - The payment method to save
 * @param {string} paymentMethod.type - The payment method type (e.g., 'card', 'bank_account')
 * @param {string} paymentMethod.userId - The user ID associated with this payment method
 * @param {Object} paymentMethod.details - Payment method details
 * @returns {Object} The saved payment method
 */
export const savePaymentMethod = (paymentMethod) => {
  const { type, userId, details } = paymentMethod;

  if (!type || !userId || !details) {
    throw new Error("Invalid payment method data");
  }

  const newPaymentMethod = {
    id: `pm_${Date.now().toString(36)}`,
    type,
    userId,
    details,
    isDefault: paymentMethods.filter((pm) => pm.userId === userId).length === 0, // Make default if first
    createdAt: new Date().toISOString(),
  };

  paymentMethods.push(newPaymentMethod);
  return newPaymentMethod;
};

/**
 * Get payment methods for a user
 * @param {string} userId - The user ID
 * @returns {Array} Array of payment methods
 */
export const getPaymentMethods = (userId) => {
  return paymentMethods.filter((pm) => pm.userId === userId);
};

/**
 * Get a specific payment method
 * @param {string} paymentMethodId - The payment method ID
 * @returns {Object|null} The payment method or null if not found
 */
export const getPaymentMethod = (paymentMethodId) => {
  return paymentMethods.find((pm) => pm.id === paymentMethodId) || null;
};

/**
 * Delete a payment method
 * @param {string} paymentMethodId - The payment method ID
 * @param {string} userId - The user ID
 * @returns {boolean} Whether the deletion was successful
 */
export const deletePaymentMethod = (paymentMethodId, userId) => {
  const index = paymentMethods.findIndex(
    (pm) => pm.id === paymentMethodId && pm.userId === userId
  );

  if (index === -1) {
    return false;
  }

  paymentMethods.splice(index, 1);
  return true;
};

/**
 * Set a payment method as default
 * @param {string} paymentMethodId - The payment method ID
 * @param {string} userId - The user ID
 * @returns {boolean} Whether the operation was successful
 */
export const setDefaultPaymentMethod = (paymentMethodId, userId) => {
  const userPaymentMethods = paymentMethods.filter(
    (pm) => pm.userId === userId
  );

  // Reset all to non-default
  userPaymentMethods.forEach((pm) => {
    pm.isDefault = false;
  });

  // Set the specified one as default
  const paymentMethod = paymentMethods.find(
    (pm) => pm.id === paymentMethodId && pm.userId === userId
  );

  if (!paymentMethod) {
    return false;
  }

  paymentMethod.isDefault = true;
  return true;
};

/**
 * Test BOG API Configuration
 * @returns {Promise<Object>} Test result with status and message
 */
export const testBOGConfiguration = async () => {
  try {
    console.log("Testing BOG API Configuration...");
    console.log("BOG_API_BASE_URL:", BOG_API_BASE_URL);
    console.log("BOG_PUBLIC_KEY:", BOG_PUBLIC_KEY ? "Configured" : "Missing");
    console.log("BOG_SECRET_KEY:", BOG_SECRET_KEY ? "Configured" : "Missing");
    console.log(
      "BOG_TERMINAL_ID:",
      process.env.BOG_TERMINAL_ID ? "Configured" : "Missing"
    );

    // Test authentication
    const token = await getAuthToken();
    console.log("Successfully authenticated with BOG API");

    return {
      success: true,
      message: "BOG API credentials are valid",
      token: token ? "Valid token received" : "No token received",
    };
  } catch (error) {
    console.error("BOG API Configuration test failed:", error);
    return {
      success: false,
      message: "BOG API credentials are invalid or there's a connection issue",
      error: error.message,
    };
  }
};

/**
 * Generates a Bank of Georgia ID authentication URL for user verification
 * This is separate from payment processing
 * @param {Object} options - Options for the auth URL
 * @returns {string} The authentication URL
 */
export const generateBogIdAuthUrl = (options = {}) => {
  const clientId = BOG_AUTH_CLIENT_ID;
  const redirectUri = options.redirectUri || process.env.BOG_AUTH_REDIRECT_URI;

  // Set scope for what information you're requesting from the user
  // Options include: openid, corp, FPI, DI, BI, CI, BPI, PI
  const scope = options.scope || "openid corp";

  // Response type is always 'code' for OAuth2 authorization code flow
  const responseType = "code";

  // Build additional parameters array
  const additionalParams = [];

  // Enable mobile login options if requested
  if (options.loginWithMobile) {
    additionalParams.push("login_with_mobile=true");
  }

  // Set UI language if specified
  if (options.uiLocale) {
    additionalParams.push(`ui_locales=${options.uiLocale}`);
  }

  // Construct the full authorization URL
  const baseUrl =
    "https://account.bog.ge/auth/realms/bog-id/protocol/openid-connect/auth";
  const url = `${baseUrl}?client_id=${clientId}&response_type=${responseType}&scope=${encodeURIComponent(
    scope
  )}&redirect_uri=${encodeURIComponent(redirectUri)}${
    additionalParams.length ? "&" + additionalParams.join("&") : ""
  }`;

  console.log(`Generated BOG-ID authentication URL: ${url}`);
  return url;
};

/**
 * Handles the Bank of Georgia ID authentication callback
 * This is used for user identity verification, not payments
 * @param {string} code - The authorization code from BOG-ID
 * @returns {Promise<Object>} User information
 */
export const handleBogIdCallback = async (code) => {
  try {
    console.log(`Processing BOG-ID callback with code: ${code}`);

    // Step 1: Exchange the authorization code for an access token
    const tokenResponse = await axios.post(
      `${BOG_API_BASE_URL}/auth/realms/bog-id/protocol/openid-connect/token`,
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: BOG_AUTH_CLIENT_ID,
        client_secret: BOG_AUTH_CLIENT_SECRET,
        redirect_uri: process.env.BOG_AUTH_REDIRECT_URI,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("Received token response from BOG-ID");

    // Step 2: Get user information using the access token
    const userInfoResponse = await axios.get(
      `${BOG_API_BASE_URL}/auth/realms/bog-id/protocol/openid-connect/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${tokenResponse.data.access_token}`,
        },
      }
    );

    console.log("Retrieved user information from BOG-ID");

    // Return both the tokens and user information
    return {
      tokens: tokenResponse.data,
      userInfo: userInfoResponse.data,
    };
  } catch (error) {
    console.error("BOG-ID authentication callback error:", error.message);
    throw new Error(`Failed to process BOG-ID callback: ${error.message}`);
  }
};

// Export all functions as a single object for backward compatibility
export default {
  // Authentication and token handling
  getAuthToken,

  // Payment operations
  createPaymentOrder,
  getPaymentDetails,
  processSubscriptionPayment,

  // Card management
  saveCardForRecurringPayments,
  deleteSavedCard,

  // Payment verification and processing
  verifyPaymentCallback,
  calculatePaymentBreakdown,

  // Payment method management
  savePaymentMethod,
  getPaymentMethods,
  getPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,

  // Testing and debugging
  testBOGConfiguration,

  // BOG-ID authentication
  generateBogIdAuthUrl,
  handleBogIdCallback,
};
