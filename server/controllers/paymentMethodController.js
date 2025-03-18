import paymentService from "../services/paymentService.js";

// Save a payment method
export const savePaymentMethod = async (req, res) => {
  try {
    const { type, userId, details } = req.body;

    if (!type || !userId || !details) {
      return res
        .status(400)
        .json({ error: "Type, userId, and details are required" });
    }

    const paymentMethod = paymentService.savePaymentMethod({
      type,
      userId,
      details,
    });

    res.status(201).json({ success: true, data: paymentMethod });
  } catch (error) {
    console.error("Error saving payment method:", error);
    res.status(500).json({ error: "Failed to save payment method" });
  }
};

// Get payment methods for a user
export const getPaymentMethods = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const paymentMethods = paymentService.getPaymentMethods(userId);

    res.status(200).json({
      success: true,
      count: paymentMethods.length,
      data: paymentMethods,
    });
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    res.status(500).json({ error: "Failed to fetch payment methods" });
  }
};

// Get a specific payment method
export const getPaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Payment method ID is required" });
    }

    const paymentMethod = paymentService.getPaymentMethod(id);

    if (!paymentMethod) {
      return res.status(404).json({ error: "Payment method not found" });
    }

    res.status(200).json({ success: true, data: paymentMethod });
  } catch (error) {
    console.error("Error fetching payment method:", error);
    res.status(500).json({ error: "Failed to fetch payment method" });
  }
};

// Delete a payment method
export const deletePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!id || !userId) {
      return res
        .status(400)
        .json({ error: "Payment method ID and user ID are required" });
    }

    const deleted = paymentService.deletePaymentMethod(id, userId);

    if (!deleted) {
      return res
        .status(404)
        .json({
          error: "Payment method not found or does not belong to the user",
        });
    }

    res
      .status(200)
      .json({ success: true, message: "Payment method deleted successfully" });
  } catch (error) {
    console.error("Error deleting payment method:", error);
    res.status(500).json({ error: "Failed to delete payment method" });
  }
};

// Set a payment method as default
export const setDefaultPaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!id || !userId) {
      return res
        .status(400)
        .json({ error: "Payment method ID and user ID are required" });
    }

    const updated = paymentService.setDefaultPaymentMethod(id, userId);

    if (!updated) {
      return res
        .status(404)
        .json({
          error: "Payment method not found or does not belong to the user",
        });
    }

    res
      .status(200)
      .json({
        success: true,
        message: "Default payment method updated successfully",
      });
  } catch (error) {
    console.error("Error updating default payment method:", error);
    res.status(500).json({ error: "Failed to update default payment method" });
  }
};
