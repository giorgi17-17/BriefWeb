import { useState, useEffect } from "react";
import { usePayment } from "../../contexts/PaymentContext";
import {
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
} from "react-icons/fi";

// Mock user ID for demo purposes
const DEMO_USER_ID = "user_12345";

const PaymentHistory = () => {
  const { paymentHistory, fetchPaymentHistory, loading, error } = usePayment();
  const [filter, setFilter] = useState("all"); // 'all', 'succeeded', 'pending', 'failed'

  useEffect(() => {
    // Fetch payment history on component mount
    fetchPaymentHistory({ userId: DEMO_USER_ID });
  }, [fetchPaymentHistory]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    fetchPaymentHistory({
      userId: DEMO_USER_ID,
      status: newFilter === "all" ? undefined : newFilter,
    });
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Format amount for display
  const formatAmount = (amount, currency) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount / 100);
  };

  // Get status icon based on payment status
  const getStatusIcon = (status) => {
    switch (status) {
      case "succeeded":
        return <FiCheckCircle className="h-5 w-5 text-green-500" />;
      case "processing":
      case "created":
        return <FiClock className="h-5 w-5 text-yellow-500" />;
      case "failed":
        return <FiXCircle className="h-5 w-5 text-red-500" />;
      default:
        return <FiAlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  // Get status text color based on payment status
  const getStatusTextClass = (status) => {
    switch (status) {
      case "succeeded":
        return "text-green-700 bg-green-100";
      case "processing":
      case "created":
        return "text-yellow-700 bg-yellow-100";
      case "failed":
        return "text-red-700 bg-red-100";
      default:
        return "text-gray-700 bg-gray-100";
    }
  };

  if (loading && paymentHistory.length === 0) {
    return (
      <div className="p-4 bg-white rounded-md shadow">
        <p className="text-gray-500">Loading payment history...</p>
      </div>
    );
  }

  if (error && paymentHistory.length === 0) {
    return (
      <div className="p-4 bg-red-50 rounded-md">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Payment History
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          View your recent payment transactions
        </p>
      </div>

      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === "all"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => handleFilterChange("all")}
          >
            All
          </button>
          <button
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === "succeeded"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => handleFilterChange("succeeded")}
          >
            Succeeded
          </button>
          <button
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === "created"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => handleFilterChange("created")}
          >
            Pending
          </button>
          <button
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === "failed"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => handleFilterChange("failed")}
          >
            Failed
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {paymentHistory.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">No payment history found.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Description
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Amount
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paymentHistory.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(payment.created_at)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {payment.description || "Payment"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatAmount(payment.amount, payment.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 mr-2">
                        {getStatusIcon(payment.status)}
                      </div>
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusTextClass(
                          payment.status
                        )}`}
                      >
                        {payment.status.charAt(0).toUpperCase() +
                          payment.status.slice(1)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;
