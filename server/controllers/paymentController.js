import dotenv from "dotenv";
import { generateUniqueID } from "../utils/helpers.js";
import paymentService from "../services/paymentService.js";

dotenv.config();

// Mock database for payments (will be replaced with a real database)
const payments = [];

// Create a payment intent (initiates BOG payment process)
export const createPaymentIntent = async (req, res) => {
  try {
    const {
      amount,
      currency,
      description,
      metadata,
      isSubscription,
      successUrl,
      failUrl,
    } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    // Get redirect URLs from environment variables or request body
    const redirectUrl = process.env.BOG_PAYMENT_REDIRECT_URL;
    const paymentSuccessUrl = successUrl || process.env.BOG_PAYMENT_SUCCESS_URL;
    const paymentFailureUrl = failUrl || process.env.BOG_PAYMENT_FAILURE_URL;

    console.log("Creating payment order with redirect URLs:", {
      redirectUrl,
      successUrl: paymentSuccessUrl,
      failUrl: paymentFailureUrl,
    });

    // Create an order with BOG
    const paymentOrder = await paymentService.createPaymentOrder({
      amount,
      currency: currency || "USD", // Default to USD
      description: description || "BriefWeb Subscription",
      isSubscription: isSubscription || false,
      redirectUrl,
      successUrl: paymentSuccessUrl,
      failUrl: paymentFailureUrl,
      shopOrderId: `order_${Date.now()}`,
      productId: metadata?.productId || "subscription",
      metadata,
    });

    // Store the payment intent in your database here if needed

    res.status(201).json({
      success: true,
      data: {
        orderId: paymentOrder.orderId,
        shopOrderId: paymentOrder.shopOrderId,
        redirectUrl: paymentOrder.redirectUrl,
      },
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to create payment intent" });
  }
};

// Process subscription payment with saved card
export const processSubscriptionPayment = async (req, res) => {
  try {
    const { savedCardId, amount, currency, description, expiryDate } = req.body;

    if (!savedCardId || !amount) {
      return res
        .status(400)
        .json({ error: "Saved card ID and amount are required" });
    }

    const subscriptionPayment = await paymentService.processSubscriptionPayment(
      {
        savedCardId,
        amount,
        currency: currency || "GEL",
        description: description || "Monthly Subscription",
        recurringPaymentExpiryDate: expiryDate,
      }
    );

    res.status(200).json({ success: true, data: subscriptionPayment });
  } catch (error) {
    console.error("Error processing subscription payment:", error);
    res.status(500).json({
      error: error.message || "Failed to process subscription payment",
    });
  }
};

// Save card for recurring payments
export const saveCard = async (req, res) => {
  try {
    const { cardHolderName, expiryDate, successUrl, failUrl } = req.body;

    if (!cardHolderName || !expiryDate) {
      return res
        .status(400)
        .json({ error: "Card holder name and expiry date are required" });
    }

    const saveCardResult = await paymentService.saveCardForRecurringPayments({
      cardHolderName,
      expiryDate,
      successUrl,
      failUrl,
    });

    res.status(201).json({ success: true, data: saveCardResult });
  } catch (error) {
    console.error("Error saving card:", error);
    res.status(500).json({ error: error.message || "Failed to save card" });
  }
};

// Handle BOG payment callback
export const handleCallback = async (req, res) => {
  try {
    const callbackData = req.body;
    console.log(
      "Received BOG callback:",
      JSON.stringify(callbackData, null, 2)
    );

    // According to BOG documentation, the callback contains:
    // - order_id: The BOG order ID
    // - status: The payment status (COMPLETED, REJECTED, etc.)
    // - payment_hash: A hash for verification (optional)
    // - external_order_id: Your original order ID

    // Verify the callback data is authentic
    const verifiedData = paymentService.verifyPaymentCallback(callbackData);

    if (!verifiedData.isValid) {
      console.error(
        "Invalid callback data:",
        JSON.stringify(callbackData, null, 2)
      );
      return res.status(400).json({ error: "Invalid callback data" });
    }

    // Extract key information
    const { order_id, status, external_order_id } = callbackData;

    // Process based on payment status
    if (status === "COMPLETED") {
      // Payment was successful
      console.log(
        `Payment successful for order ${order_id} (external ID: ${external_order_id})`
      );

      // Here you would typically:
      // 1. Update the order status in your database
      // 2. Create a subscription record if this was a subscription payment
      // 3. Store the card_id if it was returned and subscription is enabled
      // 4. Send confirmation to the user

      // For saved cards, you might have additional data
      if (callbackData.saved_card_id) {
        console.log(`Card saved with ID: ${callbackData.saved_card_id}`);
        // Store the saved card ID for future recurring payments
      }

      // Return 200 OK to acknowledge receipt
      return res.status(200).json({ status: "success" });
    } else {
      // Payment failed or was rejected
      console.log(
        `Payment failed for order ${order_id} (external ID: ${external_order_id}), status: ${status}`
      );

      // Here you would typically:
      // 1. Update the order status in your database
      // 2. Notify the user about the failed payment
      // 3. Possibly retry or provide instructions for retry

      // Return 200 OK to acknowledge receipt (don't return error to BOG)
      return res.status(200).json({ status: "failure" });
    }
  } catch (error) {
    console.error("Error handling BOG callback:", error);

    // Still return 200 to BOG to prevent retries, but log the error
    return res
      .status(200)
      .json({ status: "error", message: "Internal server error" });
  }
};

// Get payment details
export const getPaymentDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    const paymentDetails = await paymentService.getPaymentDetails(orderId);

    res.status(200).json({ success: true, data: paymentDetails });
  } catch (error) {
    console.error("Error fetching payment details:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to fetch payment details" });
  }
};

// Get all payments
export const getPayments = async (req, res) => {
  try {
    // In a real implementation, you would fetch payments from your database
    // and potentially filter or paginate them

    res.status(200).json({
      success: true,
      message:
        "This endpoint would return a list of payments from your database",
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
};

// Test BOG API Configuration
export const testBOGConfiguration = async (req, res) => {
  try {
    const testResult = await paymentService.testBOGConfiguration();

    if (testResult.success) {
      res.status(200).json({
        success: true,
        message: testResult.message,
        details: {
          token: testResult.token,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: testResult.message,
        error: testResult.error,
      });
    }
  } catch (error) {
    console.error("Error testing BOG configuration:", error);
    res.status(500).json({
      success: false,
      message: "Failed to test BOG configuration",
      error: error.message,
    });
  }
};

// Initiate BOG-ID authentication for subscription payments
export const initiateAuth = async (req, res) => {
  try {
    const {
      redirectUri,
      scope = "openid corp",
      loginWithMobile = false,
      uiLocale = "en",
    } = req.body;

    // Generate the authentication URL
    const authUrl = paymentService.generateBogIdAuthUrl({
      redirectUri,
      scope,
      loginWithMobile,
      uiLocale,
    });

    res.status(200).json({
      success: true,
      data: { authUrl },
    });
  } catch (error) {
    console.error("Error initiating BOG-ID authentication:", error);
    res.status(500).json({
      error: error.message || "Failed to initiate authentication",
    });
  }
};

// Handle BOG-ID authentication callback
export const handleAuthCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: "Authorization code is required" });
    }

    // Process the authentication callback
    const authResult = await paymentService.handleBogIdCallback(code);

    // Here you would typically:
    // 1. Store user information in your database
    // 2. Associate the user with their BOG identity
    // 3. Generate a session or token for your application

    // For simplicity, we'll redirect to a success page with the user info
    const redirectUrl = `${
      process.env.CLIENT_URL
    }/auth-success?userId=${encodeURIComponent(authResult.userInfo.sub)}`;

    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error handling BOG-ID callback:", error);
    res.redirect(
      `${process.env.CLIENT_URL}/auth-failure?error=${encodeURIComponent(
        error.message
      )}`
    );
  }
};
