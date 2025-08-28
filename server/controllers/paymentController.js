import axios from 'axios'

// ---------- Config ----------
const BOG_OAUTH_TOKEN_URL =
  process.env.BOG_OAUTH_TOKEN_URL ||
  "https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token";

const BOG_API_BASE = process.env.BOG_API_BASE || "https://api.bog.ge";
const BOG_CLIENT_ID = process.env.BOG_CLIENT_ID || "10000974";
const BOG_SECRET_ID = process.env.BOG_SECRET_ID || "WHLMBfzgjQo0";

if (!BOG_CLIENT_ID || !BOG_SECRET_ID) {
  console.error("[payments] Missing BOG_CLIENT_ID or BOG_SECRET_ID env vars.");
}

// axios for BOG Payments API
const bogApi = axios.create({
  baseURL: `${BOG_API_BASE}/payments/v1`,
  timeout: 15000,
});

// ---------- Token cache ----------
let cachedToken = null; // { accessToken: string, expiresAt: number }

async function getPaymentToken() {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 5000) {
    return cachedToken.accessToken;
  }

  const basic = Buffer.from(`${BOG_CLIENT_ID}:${BOG_SECRET_ID}`).toString(
    "base64"
  );
  const form = new URLSearchParams({ grant_type: "client_credentials" });

  const { data } = await axios.post(BOG_OAUTH_TOKEN_URL, form.toString(), {
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    timeout: 15000,
  });

  const accessToken = data.access_token;
  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600;

  cachedToken = {
    accessToken,
    // small safety buffer
    expiresAt: now + (expiresIn - 30) * 1000,
  };

  return accessToken;
}

// ---------- Small helpers ----------
function toPositiveNumber(v) {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ---------- Controller functions ----------
export async function getPaymentDetails(req, res) {
    const paymentApiUrl = 'https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token';


    console.log("BOG_CLIENT_ID", BOG_CLIENT_ID)

    const authHeader = 'Basic ' + Buffer.from(`${BOG_CLIENT_ID}:${BOG_SECRET_ID}`).toString('base64');
  

    console.log("authHeader", authHeader)

    try {
      // Step 1: Get the Bearer Token
      const authResponse = await axios.post(paymentApiUrl, 
        new URLSearchParams({
          grant_type: 'client_credentials',
        }).toString(), {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
      
      return authResponse.data.access_token;
    } catch (error) {
      console.error('Payment API Error:', error);
      throw new Error('Failed to retrieve payment token.');
    }
}

export async function approvePreAuthorization(req, res) {
  try {
    const { orderId } = req.params;
    const { amount, description } = req.body || {};

    const amt = toPositiveNumber(amount);
    if (!amt) {
      return res.status(400).json({
        message: "Invalid request body",
        details: "`amount` must be a positive number",
      });
    }

    const token = await getPaymentToken();
    const { data } = await bogApi.post(
      `/payment/authorization/approve/${orderId}`,
      { amount: amt, description },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json(data);
  } catch (err) {
    res.status(err?.response?.status || 502).json({
      message: "Failed to confirm pre-authorization",
      details: err?.response?.data || err?.message,
    });
  }
}

export async function cancelPreAuthorization(req, res) {
  try {
    const { orderId } = req.params;
    const { description } = req.body || {};

    if (!description || typeof description !== "string") {
      return res.status(400).json({
        message: "Invalid request body",
        details: "`description` is required (string)",
      });
    }

    const token = await getPaymentToken();
    const { data } = await bogApi.post(
      `/payment/authorization/cancel/${orderId}`,
      { description },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json(data);
  } catch (err) {
    res.status(err?.response?.status || 502).json({
      message: "Failed to reject pre-authorization",
      details: err?.response?.data || err?.message,
    });
  }
}

// (Optional) expose token controller only if you want an internal tool.
// NOT mounted in routes below by default.
export async function getToken(req, res) {
  try {
    const token = await getPaymentToken();
    res.json({ token });
  } catch (err) {
    res.status(502).json({
      message: "Failed to retrieve payment token",
      details: err?.message,
    });
  }
}

