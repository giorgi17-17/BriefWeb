import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePayment } from "../../contexts/PaymentContext";
import { FiCheckCircle, FiArrowLeft } from "react-icons/fi";

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getPaymentDetails } = usePayment();

  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Extract order ID from query parameters
    const searchParams = new URLSearchParams(location.search);
    const orderId = searchParams.get("order_id");

    const fetchPaymentDetails = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        const details = await getPaymentDetails(orderId);
        setPaymentDetails(details);
      } catch (err) {
        console.error("Error fetching payment details:", err);
        setError("Could not load payment details");
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [location.search, getPaymentDetails]);

  const handleGoToAccount = () => {
    navigate("/profile");
  };

  const handleGoHome = () => {
    navigate("/");
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Verifying your payment...
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <FiCheckCircle
            className="h-6 w-6 text-green-600"
            aria-hidden="true"
          />
        </div>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Payment Successful!
        </h1>

        <p className="mt-4 text-base text-gray-500">
          Thank you for your subscription. Your account has been upgraded.
        </p>

        {error && (
          <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {paymentDetails && (
          <div className="mt-8 border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
            <h2 className="text-lg font-medium mb-4">Transaction Details</h2>
            <dl className="divide-y divide-gray-100 text-left">
              <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt className="text-sm font-medium text-gray-500">Order ID</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {paymentDetails.order_id || "N/A"}
                </dd>
              </div>
              <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt className="text-sm font-medium text-gray-500">Amount</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {paymentDetails.amount
                    ? `${paymentDetails.amount} ${paymentDetails.currency}`
                    : "N/A"}
                </dd>
              </div>
              <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt className="text-sm font-medium text-gray-500">Date</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {paymentDetails.transaction_date
                    ? new Date(paymentDetails.transaction_date).toLocaleString()
                    : "N/A"}
                </dd>
              </div>
              <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {paymentDetails.status || "Completed"}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        )}

        <div className="mt-10 flex justify-center space-x-4">
          <button
            type="button"
            onClick={handleGoToAccount}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to My Account
          </button>
          <button
            type="button"
            onClick={handleGoHome}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FiArrowLeft className="mr-2 -ml-1 h-5 w-5" aria-hidden="true" />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
