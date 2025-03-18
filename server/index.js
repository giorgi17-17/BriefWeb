// index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRoutes from "./routes/api.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS for your frontend domain
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// Simple test route
app.get("/test", (req, res) => {
  res.json({ message: "Server is running correctly" });
});

// Mock payment page to simulate BOG payment gateway
app.get("/mock-payment", (req, res) => {
  const { orderId, amount, currency, successUrl, failUrl } = req.query;

  // Create a simple HTML payment page
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mock BOG Payment Gateway</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        margin: 0;
        padding: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background-color: #f5f5f5;
      }
      .container {
        background-color: white;
        border-radius: 10px;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
        padding: 40px;
        max-width: 500px;
        width: 100%;
      }
      h1 {
        color: #333;
        margin-top: 0;
        text-align: center;
      }
      .payment-details {
        margin-bottom: 30px;
      }
      .payment-details p {
        margin: 10px 0;
        display: flex;
        justify-content: space-between;
      }
      .btn {
        display: inline-block;
        padding: 12px 24px;
        background-color: #ff6600;
        color: white;
        border: none;
        border-radius: 5px;
        font-size: 16px;
        cursor: pointer;
        text-decoration: none;
        margin-right: 10px;
        text-align: center;
      }
      .btn-success {
        background-color: #28a745;
      }
      .btn-danger {
        background-color: #dc3545;
      }
      .btn-container {
        display: flex;
        justify-content: space-between;
        margin-top: 30px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Bank of Georgia Payment</h1>
      <div class="payment-details">
        <p><strong>Order ID:</strong> <span>${orderId}</span></p>
        <p><strong>Amount:</strong> <span>${(Number(amount) / 100).toFixed(
          2
        )} ${currency}</span></p>
        <p><strong>Card Number:</strong> <input type="text" value="4111 1111 1111 1111" readonly /></p>
        <p><strong>Expiry Date:</strong> <input type="text" value="12/25" readonly /></p>
        <p><strong>CVV:</strong> <input type="text" value="123" readonly /></p>
      </div>
      <div class="btn-container">
        <a href="${successUrl}" class="btn btn-success">Complete Payment</a>
        <a href="${failUrl}" class="btn btn-danger">Cancel Payment</a>
      </div>
    </div>
  </body>
  </html>
  `;

  res.send(html);
});

// Mock card save page to simulate BOG card save flow
app.get("/mock-card-save", (req, res) => {
  const { cardSaveId, successUrl, failUrl } = req.query;

  // Create a simple HTML card save page
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mock BOG Card Save</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        margin: 0;
        padding: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background-color: #f5f5f5;
      }
      .container {
        background-color: white;
        border-radius: 10px;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
        padding: 40px;
        max-width: 500px;
        width: 100%;
      }
      h1 {
        color: #333;
        margin-top: 0;
        text-align: center;
      }
      .card-details {
        margin-bottom: 30px;
      }
      .card-details p {
        margin: 10px 0;
        display: flex;
        justify-content: space-between;
      }
      .btn {
        display: inline-block;
        padding: 12px 24px;
        background-color: #ff6600;
        color: white;
        border: none;
        border-radius: 5px;
        font-size: 16px;
        cursor: pointer;
        text-decoration: none;
        margin-right: 10px;
        text-align: center;
      }
      .btn-success {
        background-color: #28a745;
      }
      .btn-danger {
        background-color: #dc3545;
      }
      .btn-container {
        display: flex;
        justify-content: space-between;
        margin-top: 30px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Save Card for Subscription</h1>
      <div class="card-details">
        <p><strong>Card Save ID:</strong> <span>${cardSaveId}</span></p>
        <p><strong>Card Number:</strong> <input type="text" value="4111 1111 1111 1111" readonly /></p>
        <p><strong>Expiry Date:</strong> <input type="text" value="12/25" readonly /></p>
        <p><strong>CVV:</strong> <input type="text" value="123" readonly /></p>
        <p><strong>Card Holder:</strong> <input type="text" value="John Doe" readonly /></p>
      </div>
      <p>This card will be used for recurring subscription payments.</p>
      <div class="btn-container">
        <a href="${successUrl}?cardSaveId=${cardSaveId}" class="btn btn-success">Save Card</a>
        <a href="${failUrl}" class="btn btn-danger">Cancel</a>
      </div>
    </div>
  </body>
  </html>
  `;

  res.send(html);
});

// Routes
app.use("/api", apiRoutes);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
