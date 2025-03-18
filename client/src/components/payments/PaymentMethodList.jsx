import { useState, useEffect } from "react";
import { usePayment } from "../../contexts/PaymentContext";
import { FiCreditCard, FiTrash2, FiCheck, FiPlus } from "react-icons/fi";

const PaymentMethodList = ({ userId, onSelect, selectedMethodId }) => {
  const {
    paymentMethods,
    loading,
    error,
    fetchPaymentMethods,
    deletePaymentMethod,
    setDefaultPaymentMethod,
  } = usePayment();

  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchPaymentMethods(userId);
    }
  }, [userId, fetchPaymentMethods]);

  const handleDelete = async (e, methodId) => {
    e.stopPropagation();
    if (
      window.confirm("Are you sure you want to delete this payment method?")
    ) {
      setIsDeleting(true);
      try {
        await deletePaymentMethod(methodId, userId);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleSetDefault = async (e, methodId) => {
    e.stopPropagation();
    try {
      await setDefaultPaymentMethod(methodId, userId);
    } catch (error) {
      console.error("Error setting default payment method:", error);
    }
  };

  const renderPaymentMethodIcon = (type) => {
    return <FiCreditCard className="h-5 w-5 text-gray-600" />;
  };

  if (loading && !isDeleting) {
    return (
      <div className="p-4 rounded-md bg-gray-50">
        <p className="text-gray-500">Loading payment methods...</p>
      </div>
    );
  }

  if (error && !isDeleting) {
    return (
      <div className="p-4 rounded-md bg-red-50">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Your Payment Methods</h3>

      {paymentMethods.length === 0 ? (
        <div className="p-4 rounded-md bg-gray-50">
          <p className="text-gray-500">No payment methods added yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {paymentMethods.map((method) => (
            <li
              key={method.id}
              className={`
                flex items-center justify-between p-3 rounded-md border 
                ${
                  method.isDefault
                    ? "border-blue-300 bg-blue-50"
                    : "border-gray-200"
                } 
                ${selectedMethodId === method.id ? "ring-2 ring-blue-500" : ""}
                hover:bg-gray-50 cursor-pointer
              `}
              onClick={() => onSelect && onSelect(method.id)}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {renderPaymentMethodIcon(method.type)}
                </div>
                <div>
                  <p className="font-medium">
                    {method.type === "card"
                      ? `•••• •••• •••• ${method.details.last4}`
                      : method.type}
                  </p>
                  <p className="text-sm text-gray-500">
                    {method.type === "card"
                      ? `Expires ${method.details.expMonth}/${method.details.expYear}`
                      : method.details.description || ""}
                  </p>
                </div>
                {method.isDefault && (
                  <span className="ml-2 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                    Default
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {!method.isDefault && (
                  <button
                    onClick={(e) => handleSetDefault(e, method.id)}
                    className="p-1 text-gray-500 hover:text-blue-500 rounded-md"
                    title="Set as default"
                  >
                    <FiCheck className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={(e) => handleDelete(e, method.id)}
                  className="p-1 text-gray-500 hover:text-red-500 rounded-md"
                  title="Delete payment method"
                  disabled={isDeleting}
                >
                  <FiTrash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {onSelect && (
        <button
          className="mt-4 flex items-center justify-center w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          onClick={() => onSelect("new")}
        >
          <FiPlus className="mr-2 h-4 w-4" />
          Add Payment Method
        </button>
      )}
    </div>
  );
};

export default PaymentMethodList;
