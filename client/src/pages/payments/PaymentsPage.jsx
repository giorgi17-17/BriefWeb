import { useState } from "react";
import { PaymentProvider, usePayment } from "../../contexts/PaymentContext";
import { Check } from "lucide-react";

const PaymentButton = () => {
  const { createSubscriptionOrder, redirectToPayment, loading } = usePayment();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Fixed $3 payment
  const amount = 300; // $3.00 in cents
  const currency = "USD";
  const description = "Premium Access";

  const handlePayment = async () => {
    setIsRedirecting(true);

    try {
      // Get current URL to construct success and failure URLs
      const baseUrl = window.location.origin;

      // Create a payment order with BOG
      const orderData = await createSubscriptionOrder({
        amount,
        currency,
        description,
        successUrl: `${baseUrl}/payment-success`,
        failUrl: `${baseUrl}/payment-failure`,
      });

      // Redirect to BOG payment page
      redirectToPayment(orderData.redirectUrl);
    } catch (err) {
      console.error("Error initiating payment:", err);
      setIsRedirecting(false);
      alert("Payment failed to initialize. Please try again.");
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading || isRedirecting}
      className="flex items-center justify-center px-8 py-3 text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-colors"
    >
      {loading || isRedirecting ? (
        <div className="flex items-center">
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Redirecting...
        </div>
      ) : (
        <div className="flex items-center">Upgrade to Pro</div>
      )}
    </button>
  );
};

const PaymentsPage = () => {
  return (
    <PaymentProvider>
      <div className="min-h-screen bg-white theme-bg-primary py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Simple, Transparent Pricing
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
              Choose the perfect plan for your study needs with no hidden fees
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-8 bg-white dark:bg-gray-800">
              <div className="mb-5">
                <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                  Free
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">
                  Great place to get started
                </p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                    $0
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 ml-1">
                    /forever
                  </span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="mr-2 mt-1">
                    <Check
                      size={16}
                      className="text-green-500 dark:text-green-400"
                    />
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Up to 3 subjects
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1">
                    <Check
                      size={16}
                      className="text-green-500 dark:text-green-400"
                    />
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    5 lectures per subject
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1">
                    <Check
                      size={16}
                      className="text-green-500 dark:text-green-400"
                    />
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Generate up to 20 flashcards
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1">
                    <Check
                      size={16}
                      className="text-green-500 dark:text-green-400"
                    />
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Basic note summarization
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1">
                    <Check
                      size={16}
                      className="text-green-500 dark:text-green-400"
                    />
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    PDF file support up to 5MB
                  </span>
                </li>
              </ul>

              <button
                className="w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                disabled
              >
                Current Plan
              </button>
            </div>

            {/* Pro Plan */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-8 relative bg-white dark:bg-gray-800">
              <div className="absolute top-0 right-0 bg-black text-white text-xs px-3 py-1 uppercase font-bold rounded-bl-lg rounded-tr-lg">
                Popular
              </div>

              <div className="mb-5">
                <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                  Pro
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">
                  Everything you need to ace your classes
                </p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                    $2
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 ml-1">
                    /week
                  </span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="mr-2 mt-1">
                    <Check
                      size={16}
                      className="text-green-500 dark:text-green-400"
                    />
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Unlimited subjects
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1">
                    <Check
                      size={16}
                      className="text-green-500 dark:text-green-400"
                    />
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Unlimited lectures
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1">
                    <Check
                      size={16}
                      className="text-green-500 dark:text-green-400"
                    />
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Generate unlimited flashcards
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1">
                    <Check
                      size={16}
                      className="text-green-500 dark:text-green-400"
                    />
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Advanced AI-powered summaries
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1">
                    <Check
                      size={16}
                      className="text-green-500 dark:text-green-400"
                    />
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    PDF file support up to 50MB
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1">
                    <Check
                      size={16}
                      className="text-green-500 dark:text-green-400"
                    />
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Priority support
                  </span>
                </li>
              </ul>

              <div className="flex justify-center">
                <PaymentButton />
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Secure payment processed by Bank of Georgia. Your payment
              information is never stored on our servers.
            </p>
          </div>
        </div>
      </div>
    </PaymentProvider>
  );
};

export default PaymentsPage;
