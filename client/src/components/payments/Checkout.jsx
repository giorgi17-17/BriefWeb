import { useState } from "react";
import { usePayment } from "../../contexts/PaymentContext";
import { FiCheckCircle, FiAlertCircle, FiCreditCard } from "react-icons/fi";

const Checkout = ({
  amount,
  currency = "GEL",
  onSuccess,
  onCancel,
  description,
}) => {
  const { createSubscriptionOrder, redirectToPayment, loading, error } =
    usePayment();

  const [paymentStatus, setPaymentStatus] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Format the amount for display
  const formatAmount = (amount, currency) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount / 100);
  };

  const handleSubscribe = async () => {
    setIsRedirecting(true);

    try {
      // Get current URL to construct success and failure URLs
      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/payment/success`;
      const failUrl = `${baseUrl}/payment/failure`;

      console.log("Initiating subscription with URLs:", {
        successUrl,
        failUrl,
      });

      // Create a subscription order with BOG
      const orderData = await createSubscriptionOrder({
        amount,
        currency,
        description: description || "BriefWeb Subscription",
        successUrl,
        failUrl,
        metadata: {
          isSubscription: true,
        },
      });

      console.log("Subscription order created:", orderData);

      // Ensure we have a redirect URL
      if (!orderData.redirectUrl) {
        throw new Error("No redirect URL received from payment provider");
      }

      // Store order info in localStorage for retrieval after redirect
      localStorage.setItem("pendingOrderId", orderData.orderId);

      // Redirect to BOG payment page
      console.log("Redirecting to payment URL:", orderData.redirectUrl);
      redirectToPayment(orderData.redirectUrl);
    } catch (err) {
      console.error("Error initiating subscription:", err);
      setPaymentStatus({
        status: "failed",
        message: err.message || "Failed to initiate subscription",
      });
      setIsRedirecting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  if (loading || isRedirecting) {
    return (
      <div className="text-center py-10 space-y-6">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
          <svg
            className="animate-spin h-6 w-6 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
        <p className="text-gray-600">
          {isRedirecting ? "Redirecting to payment page..." : "Processing..."}
        </p>
      </div>
    );
  }

  if (error || (paymentStatus && paymentStatus.status === "failed")) {
    return (
      <div className="text-center py-10 space-y-6">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
          <FiAlertCircle className="h-6 w-6 text-red-600" />
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900">Payment Failed</h3>
          <p className="mt-2 text-sm text-gray-500">
            {paymentStatus?.message ||
              error ||
              "There was an error processing your payment. Please try again."}
          </p>
        </div>

        <div>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Subscribe Now</h2>
        <p className="text-sm text-gray-500 mt-1">
          Complete your subscription by providing payment details
        </p>
      </div>

      <div className="bg-gray-50 p-4 rounded-md mb-6">
        <h3 className="text-lg font-medium mb-2">Subscription Summary</h3>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">
            {description || "Monthly Subscription"}
          </span>
          <span className="font-medium">{formatAmount(amount, currency)}</span>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Billed monthly. Cancel anytime.
        </p>
      </div>

      <div className="bg-blue-50 p-4 rounded-md mb-6 border border-blue-100">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <FiCreditCard className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Secure Payment
            </h3>
            <p className="mt-1 text-sm text-blue-600">
              You'll be redirected to a secure payment page to complete your
              subscription.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <button
          onClick={handleCancel}
          className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Subscribe Now
        </button>
      </div>
    </div>
  );
};

export default Checkout;
