const handlePayment = async () => {
  setIsProcessing(true);
  setPaymentError(null);

  try {
    // Get selected plan
    const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
    if (!selectedPlan) {
      throw new Error("No plan selected");
    }

    console.log("Creating payment order for plan:", selectedPlan);

    // Create payment order
    const response = await axios.post("/api/payments/create-order", {
      amount: selectedPlan.price,
      currency: "USD",
      description: `Subscription to ${selectedPlan.name} plan`,
      isSubscription: true,
      productId: selectedPlan.id,
    });

    // Log the response for debugging
    console.log("Payment order created:", response.data);

    // Check if we got a redirect URL
    if (!response.data.redirectUrl) {
      throw new Error("No redirect URL received from payment provider");
    }

    // Store order info in local storage to retrieve after redirect
    localStorage.setItem("pendingOrderId", response.data.orderId);
    localStorage.setItem("pendingPlanId", selectedPlanId);

    // Redirect to payment provider
    console.log("Redirecting to payment URL:", response.data.redirectUrl);
    window.location.href = response.data.redirectUrl;
  } catch (error) {
    console.error("Payment error:", error);
    setPaymentError(
      error.response?.data?.message ||
        error.message ||
        "Failed to process payment"
    );
    setIsProcessing(false);
  }
};
