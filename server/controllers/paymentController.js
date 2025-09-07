import axios from 'axios'

// ---------- Config ----------
const BOG_OAUTH_TOKEN_URL =
  process.env.BOG_OAUTH_TOKEN_URL ||
  "https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token";

const BOG_API_BASE = process.env.BOG_API_BASE || "https://api.bog.ge";
const BOG_CLIENT_ID = process.env.BOG_CLIENT_ID
const BOG_SECRET_ID = process.env.BOG_SECRET_ID

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
  
    const basic = Buffer.from(`${BOG_CLIENT_ID}:${BOG_SECRET_ID}`).toString("base64");
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
  
    cachedToken = { accessToken, expiresAt: now + (expiresIn - 30) * 1000 };
    return accessToken; // <-- return string
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

