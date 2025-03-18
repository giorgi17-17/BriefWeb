import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const PaymentContext = createContext();

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error("usePayment must be used within a PaymentProvider");
  }
  return context;
};

export const PaymentProvider = ({ children }) => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch payment methods for a user
  const fetchPaymentMethods = async (userId) => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `${API_URL}/payments/methods/user/${userId}`
      );
      setPaymentMethods(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch payment methods");
      console.error("Error fetching payment methods:", err);
    } finally {
      setLoading(false);
    }
  };

  // Save a new payment method
  const savePaymentMethod = async (paymentMethodData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_URL}/payments/methods`,
        paymentMethodData
      );
      setPaymentMethods((prev) => [...prev, response.data.data]);
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save payment method");
      console.error("Error saving payment method:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete a payment method
  const deletePaymentMethod = async (paymentMethodId, userId) => {
    setLoading(true);
    setError(null);

    try {
      await axios.delete(`${API_URL}/payments/methods/${paymentMethodId}`, {
        data: { userId },
      });
      setPaymentMethods((prev) =>
        prev.filter((pm) => pm.id !== paymentMethodId)
      );
      return true;
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete payment method");
      console.error("Error deleting payment method:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Set a payment method as default
  const setDefaultPaymentMethod = async (paymentMethodId, userId) => {
    setLoading(true);
    setError(null);

    try {
      await axios.patch(
        `${API_URL}/payments/methods/${paymentMethodId}/set-default`,
        { userId }
      );
      setPaymentMethods((prev) =>
        prev.map((pm) => ({
          ...pm,
          isDefault: pm.id === paymentMethodId,
        }))
      );
      return true;
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to set default payment method"
      );
      console.error("Error setting default payment method:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Create a payment intent
  const createPaymentIntent = async (paymentData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_URL}/payments/create-payment-intent`,
        paymentData
      );
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create payment intent");
      console.error("Error creating payment intent:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Process a payment
  const processPayment = async (paymentIntentId, paymentMethod) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/payments/process-payment`, {
        paymentIntentId,
        paymentMethod,
      });
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.error || "Failed to process payment");
      console.error("Error processing payment:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Create a subscription order with BOG
  const createSubscriptionOrder = async (paymentData) => {
    setLoading(true);
    setError(null);

    try {
      console.log("Creating subscription order with data:", paymentData);

      // Get current URL as base for success/failure URLs if not provided
      const baseUrl = window.location.origin;
      const successUrl = paymentData.successUrl || `${baseUrl}/payment/success`;
      const failUrl = paymentData.failUrl || `${baseUrl}/payment/failure`;

      const response = await axios.post(`${API_URL}/payments/create-order`, {
        amount: paymentData.amount,
        currency: paymentData.currency || "USD",
        description: paymentData.description || "BriefWeb Subscription",
        isSubscription: true,
        successUrl,
        failUrl,
        metadata: paymentData.metadata,
      });

      console.log("Subscription order created:", response.data);

      // The response contains the orderId, shopOrderId and redirectUrl
      if (!response.data.data || !response.data.data.redirectUrl) {
        throw new Error("No redirect URL received from payment service");
      }

      return response.data.data;
    } catch (err) {
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        "Failed to create subscription order";
      setError(errorMessage);
      console.error("Error creating subscription order:", err);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Save a card for recurring payments
  const saveCardForRecurringPayments = async (cardData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/payments/save-card`, {
        cardHolderName: cardData.cardHolderName,
        expiryDate: cardData.expiryDate,
        successUrl: cardData.successUrl,
        failUrl: cardData.failUrl,
      });

      // The response contains the cardSaveId and redirectUrl
      return response.data.data;
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to save card for recurring payments"
      );
      console.error("Error saving card for recurring payments:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Process a subscription payment with a saved card
  const processSubscriptionPayment = async (subscriptionData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/payments/subscription`, {
        savedCardId: subscriptionData.savedCardId,
        amount: subscriptionData.amount,
        currency: subscriptionData.currency || "GEL",
        description: subscriptionData.description || "Monthly Subscription",
        expiryDate: subscriptionData.expiryDate,
      });

      return response.data.data;
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to process subscription payment"
      );
      console.error("Error processing subscription payment:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Redirect to BOG payment page
  const redirectToPayment = (redirectUrl) => {
    window.location.href = redirectUrl;
  };

  // Get payment details by order ID
  const getPaymentDetails = async (orderId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `${API_URL}/payments/details/${orderId}`
      );
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.error || "Failed to get payment details");
      console.error("Error getting payment details:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch payment history
  const fetchPaymentHistory = async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/payments/history`, {
        params: filters,
      });
      setPaymentHistory(response.data.data || []);
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch payment history");
      console.error("Error fetching payment history:", err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const value = {
    paymentMethods,
    paymentHistory,
    loading,
    error,
    fetchPaymentMethods,
    savePaymentMethod,
    deletePaymentMethod,
    setDefaultPaymentMethod,
    createPaymentIntent,
    processPayment,
    createSubscriptionOrder,
    saveCardForRecurringPayments,
    processSubscriptionPayment,
    redirectToPayment,
    getPaymentDetails,
    fetchPaymentHistory,
  };

  return (
    <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>
  );
};
