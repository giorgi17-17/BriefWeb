/**
 * Simple test script for Bank of Georgia payment API integration
 * This tests both authentication and payment order creation
 */

import dotenv from 'dotenv';
import * as paymentService from './services/paymentService.js';

// Load environment variables
dotenv.config();

// Log key configurations
console.log('=== BOG API Configuration ===');
console.log('BOG_API_BASE_URL:', process.env.BOG_API_BASE_URL || 'https://api.bog.ge');
console.log('BOG_PUBLIC_KEY:', process.env.BOG_PUBLIC_KEY ? `Configured (length: ${process.env.BOG_PUBLIC_KEY.length}, has hyphens: ${process.env.BOG_PUBLIC_KEY.includes('-')})` : 'Missing');
console.log('BOG_SECRET_KEY:', process.env.BOG_SECRET_KEY ? `Configured (length: ${process.env.BOG_SECRET_KEY.length}, has hyphens: ${process.env.BOG_SECRET_KEY.includes('-')})` : 'Missing');
console.log('BOG_TERMINAL_ID:', process.env.BOG_TERMINAL_ID || 'Using default: 0000001');
console.log('BOG_PAYMENT_SUCCESS_URL:', process.env.BOG_PAYMENT_SUCCESS_URL || 'Missing');
console.log('BOG_PAYMENT_FAILURE_URL:', process.env.BOG_PAYMENT_FAILURE_URL || 'Missing');
console.log('');

// Test Authentication
async function testAuth() {
  console.log('=== Testing Authentication ===');
  try {
    const token = await paymentService.getAuthToken();
    console.log('✅ Authentication successful! Token:', token.substring(0, 15) + '...[truncated]');
    return token;
  } catch (error) {
    console.log('❌ Authentication failed:', error.message);
    return null;
  }
}

// Test Order Creation
async function testCreateOrder(token) {
  console.log('\n=== Testing Payment Order Creation ===');
  
  // Test data for order
  const orderData = {
    amount: 300,
    currency: 'USD',
    description: 'Test payment',
    shopOrderId: `test_order_${Date.now()}`,
    redirectUrl: process.env.BOG_PAYMENT_REDIRECT_URL,
    successUrl: process.env.BOG_PAYMENT_SUCCESS_URL,
    failUrl: process.env.BOG_PAYMENT_FAILURE_URL
  };
  
  try {
    console.log('Creating order with data:', orderData);
    const orderResult = await paymentService.createPaymentOrder(orderData);
    
    console.log('\n✅ Order creation successful!');
    console.log('Order ID:', orderResult.orderId);
    console.log('Shop Order ID:', orderResult.shopOrderId);
    console.log('Status:', orderResult.status);
    console.log('Redirect URL:', orderResult.redirectUrl);
    
    // Provide instructions for completing the payment
    console.log('\n👉 To complete the payment, open this URL in your browser:');
    console.log(orderResult.redirectUrl);
    
    return orderResult;
  } catch (error) {
    console.log('❌ Order creation failed:', error.message);
    return null;
  }
}

// Run the tests
async function runTests() {
  console.log('Starting BOG API tests...\n');
  
  // Test authentication
  const token = await testAuth();
  
  // Test order creation (even if auth failed, will use mock data in dev mode)
  const orderResult = await testCreateOrder(token);
  
  // Print summary
  console.log('\n=== Test Summary ===');
  console.log('Authentication:', token ? '✅ Passed' : '❌ Failed');
  console.log('Order Creation:', orderResult ? '✅ Passed' : '❌ Failed');
  
  if (orderResult) {
    console.log('\nYou can complete the test payment flow by opening the redirect URL in a browser.');
  }
}

// Execute tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});
