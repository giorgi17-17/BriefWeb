import { useState } from "react";
import { usePayment } from "../../contexts/PaymentContext";
import { FiCreditCard, FiCalendar, FiLock, FiUser } from "react-icons/fi";

const PaymentMethodForm = ({ userId, onSuccess, onCancel }) => {
  const { savePaymentMethod, loading, error } = usePayment();

  const [formData, setFormData] = useState({
    cardNumber: "",
    cardholderName: "",
    expiryDate: "",
    cvc: "",
  });

  const [formErrors, setFormErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Basic formatting
    let formattedValue = value;

    if (name === "cardNumber") {
      // Format card number with spaces (e.g., 4242 4242 4242 4242)
      formattedValue = value
        .replace(/\s/g, "")
        .replace(/(\d{4})/g, "$1 ")
        .trim();
    } else if (name === "expiryDate") {
      // Format expiry date (MM/YY)
      formattedValue = value
        .replace(/\D/g, "")
        .replace(/^(\d{2})(\d)/, "$1/$2")
        .substring(0, 5);
    } else if (name === "cvc") {
      // Only allow digits and limit to 4 characters
      formattedValue = value.replace(/\D/g, "").substring(0, 4);
    }

    setFormData({ ...formData, [name]: formattedValue });
  };

  const validateForm = () => {
    const errors = {};

    // Validate card number (simple validation)
    if (!formData.cardNumber) {
      errors.cardNumber = "Card number is required";
    } else if (formData.cardNumber.replace(/\s/g, "").length < 16) {
      errors.cardNumber = "Please enter a valid card number";
    }

    // Validate cardholder name
    if (!formData.cardholderName) {
      errors.cardholderName = "Cardholder name is required";
    }

    // Validate expiry date
    if (!formData.expiryDate) {
      errors.expiryDate = "Expiry date is required";
    } else if (!/^\d{2}\/\d{2}$/.test(formData.expiryDate)) {
      errors.expiryDate = "Please enter a valid expiry date (MM/YY)";
    } else {
      // Check if the expiry date is in the future
      const [month, year] = formData.expiryDate.split("/");
      const now = new Date();
      const cardDate = new Date(2000 + parseInt(year), parseInt(month) - 1);

      if (cardDate < now) {
        errors.expiryDate = "Card has expired";
      }
    }

    // Validate CVC
    if (!formData.cvc) {
      errors.cvc = "CVC is required";
    } else if (formData.cvc.length < 3) {
      errors.cvc = "Please enter a valid CVC";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // Format data for API
      const cardNumber = formData.cardNumber.replace(/\s/g, "");
      const [expMonth, expYear] = formData.expiryDate.split("/");

      // In a real implementation, this would be processed through a secure payment processor
      // Never send raw card details to your own server
      await savePaymentMethod({
        userId,
        type: "card",
        details: {
          last4: cardNumber.slice(-4),
          expMonth,
          expYear,
          brand: getCardBrand(cardNumber),
          cardholderName: formData.cardholderName,
        },
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Error saving payment method:", err);
    }
  };

  // Helper function to determine card brand from number
  const getCardBrand = (cardNumber) => {
    const number = cardNumber.replace(/\s/g, "");

    if (/^4/.test(number)) return "Visa";
    if (/^5[1-5]/.test(number)) return "Mastercard";
    if (/^3[47]/.test(number)) return "American Express";
    if (/^6(?:011|5)/.test(number)) return "Discover";

    return "Unknown";
  };

  return (
    <div className="bg-white p-4 rounded-md shadow">
      <h3 className="text-lg font-medium mb-4">Add Payment Method</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-md">{error}</div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="cardNumber"
            className="block text-sm font-medium text-gray-700"
          >
            Card Number
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiCreditCard className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="cardNumber"
              name="cardNumber"
              value={formData.cardNumber}
              onChange={handleChange}
              placeholder="1234 5678 9012 3456"
              className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                formErrors.cardNumber ? "border-red-300" : "border-gray-300"
              }`}
            />
          </div>
          {formErrors.cardNumber && (
            <p className="text-red-600 text-sm">{formErrors.cardNumber}</p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="cardholderName"
            className="block text-sm font-medium text-gray-700"
          >
            Cardholder Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiUser className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="cardholderName"
              name="cardholderName"
              value={formData.cardholderName}
              onChange={handleChange}
              placeholder="John Doe"
              className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                formErrors.cardholderName ? "border-red-300" : "border-gray-300"
              }`}
            />
          </div>
          {formErrors.cardholderName && (
            <p className="text-red-600 text-sm">{formErrors.cardholderName}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label
              htmlFor="expiryDate"
              className="block text-sm font-medium text-gray-700"
            >
              Expiry Date
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiCalendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="expiryDate"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                placeholder="MM/YY"
                className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  formErrors.expiryDate ? "border-red-300" : "border-gray-300"
                }`}
              />
            </div>
            {formErrors.expiryDate && (
              <p className="text-red-600 text-sm">{formErrors.expiryDate}</p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="cvc"
              className="block text-sm font-medium text-gray-700"
            >
              CVC
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiLock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="cvc"
                name="cvc"
                value={formData.cvc}
                onChange={handleChange}
                placeholder="123"
                className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  formErrors.cvc ? "border-red-300" : "border-gray-300"
                }`}
              />
            </div>
            {formErrors.cvc && (
              <p className="text-red-600 text-sm">{formErrors.cvc}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading}
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Payment Method"}
          </button>
        </div>
      </form>

      <div className="mt-4 text-xs text-gray-500">
        <p>
          This is a demo implementation. In a real application, never send card
          details directly to your server. Instead, use a secure payment
          processor like Stripe or PayPal.
        </p>
      </div>
    </div>
  );
};

export default PaymentMethodForm;
