/**
 * Direct test for Bank of Georgia API
 * This script tests the BOG API using different methods
 */

import axios from "axios";
import dotenv from "dotenv";
import https from "https";

dotenv.config();

// API Configuration
const BOG_API_BASE_URL = process.env.BOG_API_BASE_URL || "https://api.bog.ge";
const BOG_CLIENT_ID = process.env.BOG_PUBLIC_KEY;
const BOG_CLIENT_SECRET = process.env.BOG_SECRET_KEY;
const BOG_TERMINAL_ID = process.env.BOG_TERMINAL_ID;

// Create axios instance with SSL verification disabled (for testing only)
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

// Test configurations
const tests = [
  {
    name: "Basic Auth + Form Data",
    url: `${BOG_API_BASE_URL}/auth/v1/token`,
    method: async () => {
      const authData = new URLSearchParams();
      authData.append("grant_type", "client_credentials");
      authData.append("scope", "payments");

      return axiosInstance.post(`${BOG_API_BASE_URL}/auth/v1/token`, authData, {
        auth: {
          username: BOG_CLIENT_ID,
          password: BOG_CLIENT_SECRET,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
    },
  },
  {
    name: "Form Data with client_id and client_secret",
    url: `${BOG_API_BASE_URL}/auth/v1/token`,
    method: async () => {
      const authData = new URLSearchParams();
      authData.append("grant_type", "client_credentials");
      authData.append("scope", "payments");
      authData.append("client_id", BOG_CLIENT_ID);
      authData.append("client_secret", BOG_CLIENT_SECRET);

      return axiosInstance.post(`${BOG_API_BASE_URL}/auth/v1/token`, authData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
    },
  },
  {
    name: "Create a test order",
    url: `${BOG_API_BASE_URL}/payments/v1/ecommerce/orders`,
    method: async () => {
      // First get a token (try basic auth)
      try {
        const authData = new URLSearchParams();
        authData.append("grant_type", "client_credentials");
        authData.append("scope", "payments");

        const authResponse = await axiosInstance.post(
          `${BOG_API_BASE_URL}/auth/v1/token`,
          authData,
          {
            auth: {
              username: BOG_CLIENT_ID,
              password: BOG_CLIENT_SECRET,
            },
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );

        const token = authResponse.data.access_token;

        if (!token) {
          throw new Error("No access token received");
        }

        // Now create an order
        const orderData = {
          callback_url: process.env.BOG_CALLBACK_URL,
          external_order_id: `test_${Date.now()}`,
          purchase_units: {
            currency: "USD",
            total_amount: 300, // $3.00
            basket: [
              {
                quantity: 1,
                unit_price: 300,
                product_id: "test_subscription",
                description: "Test Subscription",
              },
            ],
          },
          redirect_urls: {
            success: process.env.PAYMENT_SUCCESS_URL,
            fail: process.env.PAYMENT_FAIL_URL,
          },
          payment_method: ["card"],
        };

        return axiosInstance.post(
          `${BOG_API_BASE_URL}/payments/v1/ecommerce/orders`,
          orderData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              "Accept-Language": "en",
            },
          }
        );
      } catch (error) {
        console.error("Error in auth step:", error.message);
        throw error;
      }
    },
  },
];

async function runTests() {
  console.log("=== BANK OF GEORGIA API TESTS ===");
  console.log("API Base URL:", BOG_API_BASE_URL);
  console.log("Public Key:", BOG_CLIENT_ID ? "Configured" : "Missing");
  console.log("Secret Key:", BOG_CLIENT_SECRET ? "Configured" : "Missing");
  console.log("Terminal ID:", BOG_TERMINAL_ID ? "Configured" : "Missing");
  console.log("\nRunning tests...\n");

  for (const test of tests) {
    console.log(`\n[TEST] ${test.name} - ${test.url}`);

    try {
      const response = await test.method();

      console.log("✅ Success!");
      console.log("Status:", response.status);
      console.log("Content-Type:", response.headers["content-type"]);

      if (response.headers["content-type"]?.includes("application/json")) {
        console.log("Response data:", JSON.stringify(response.data, null, 2));
      } else {
        const preview =
          typeof response.data === "string"
            ? response.data.substring(0, 100) + "..."
            : "Not a string";
        console.log("Response is not JSON. Preview:", preview);
      }
    } catch (error) {
      console.log("❌ Failed!");

      if (error.response) {
        console.log("Status:", error.response.status);
        console.log(
          "Headers:",
          JSON.stringify(error.response.headers, null, 2)
        );

        if (
          error.response.headers["content-type"]?.includes("application/json")
        ) {
          console.log(
            "Error data:",
            JSON.stringify(error.response.data, null, 2)
          );
        } else {
          const preview =
            typeof error.response.data === "string"
              ? error.response.data.substring(0, 100) + "..."
              : "Not a string";
          console.log("Error is not JSON. Preview:", preview);
        }
      } else {
        console.log("Error:", error.message);
      }
    }
  }
}

// Run the tests
runTests().catch((error) => {
  console.error("Unhandled error:", error);
});
