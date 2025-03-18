import { useNavigate } from "react-router-dom";
import { FiAlertTriangle, FiArrowLeft, FiRefreshCw } from "react-icons/fi";

const PaymentFailurePage = () => {
  const navigate = useNavigate();

  const handleTryAgain = () => {
    navigate("/payments");
  };

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <FiAlertTriangle
            className="h-6 w-6 text-red-600"
            aria-hidden="true"
          />
        </div>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Payment Failed
        </h1>

        <p className="mt-4 text-base text-gray-500">
          We're sorry, but your payment could not be processed at this time.
          Your card has not been charged.
        </p>

        <div className="mt-8 border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
          <h2 className="text-lg font-medium mb-4 text-left">
            Some possible reasons include:
          </h2>
          <ul className="list-disc text-left pl-5 space-y-2 text-sm text-gray-600">
            <li>Insufficient funds in your account</li>
            <li>The card has expired</li>
            <li>The card information was entered incorrectly</li>
            <li>The payment was declined by your bank</li>
            <li>Temporary technical issues with the payment system</li>
          </ul>
        </div>

        <div className="mt-10 flex justify-center space-x-4">
          <button
            type="button"
            onClick={handleTryAgain}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FiRefreshCw className="mr-2 -ml-1 h-5 w-5" aria-hidden="true" />
            Try Again
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

export default PaymentFailurePage;
