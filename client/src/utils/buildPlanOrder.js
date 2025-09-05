export const safeUUID = () =>
    (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  
  export const maskPhone = (phone) => {
    if (!phone) return undefined;
    const s = String(phone).replace(/\D/g, "");
    return s.replace(/(\d{3})(\d{3})(\d{4})/, "$1***$3");
  };
  
  export const maskEmail = (email) => {
    if (!email) return undefined;
    const [local, domain] = String(email).split("@");
    if (!domain || local.length < 3) return email;
    return `${local[0]}${"*".repeat(local.length - 2)}${local.slice(-1)}@${domain}`;
  };
  

  export function buildPlanOrderBodyDummy({
    user = {},                 // { username, email, company_phone }
    price = 0,              // GEL; tiny amount for tests
    currency = "GEL",
    planCode = "PLAN_BASIC",
    planName = "Basic Plan (1M)",
    paymentMethods = ["card"], // you can also allow 'google_pay', 'apple_pay', etc.
    callbackUrl = "https://briefweb.onrender.com/api/user-plans/process-payment",
    successUrl, 
    failUrl,
    capture = "automatic"       // 'manual' for preauth flow, 'automatic' for direct capture
  } = {}) {
    const basket = [
      {
        product_id: planName,     // required
        description: planCode,    // optional
        quantity: 1,              // required (>=1)
        unit_price: Number(price),// required
        total_price: Number(price),
      }
    ];
  
    return {
      callback_url: callbackUrl,               
      external_order_id: safeUUID(),           
      buyer: {
        full_name: user?.username || "Plan User",
        masked_email: maskEmail(user?.email),  
        masked_phone: maskPhone(user?.phone)
      },
      application_type: "web",
      purchase_units: {
        basket,                                
        total_amount: Number(price),           
        currency: currency,                     
      },
      capture,                                
      redirect_urls: {                          
        success: successUrl,
        fail: failUrl,
      },
      payment_method: paymentMethods,          
    };
  }
