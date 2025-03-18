import express from "express";
import {
  createPaymentIntent,
  processSubscriptionPayment,
  saveCard,
  getPaymentDetails,
  getPayments,
  handleCallback,
  testBOGConfiguration,
  initiateAuth,
  handleAuthCallback,
} from "../controllers/paymentController.js";
import {
  savePaymentMethod,
  getPaymentMethods,
  getPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
} from "../controllers/paymentMethodController.js";

const router = express.Router();

// Payment routes
router.post("/create-order", createPaymentIntent);
router.post("/subscription", processSubscriptionPayment);
router.post("/save-card", saveCard);
router.get("/details/:orderId", getPaymentDetails);
router.get("/history", getPayments);
router.post("/callback", handleCallback);
router.get("/test-config", testBOGConfiguration);

// BOG-ID Authentication routes
router.post("/auth/initiate", initiateAuth);
router.get("/auth/callback", handleAuthCallback);

// Payment Method routes
router.post("/methods", savePaymentMethod);
router.get("/methods/user/:userId", getPaymentMethods);
router.get("/methods/:id", getPaymentMethod);
router.delete("/methods/:id", deletePaymentMethod);
router.patch("/methods/:id/set-default", setDefaultPaymentMethod);

export default router;
