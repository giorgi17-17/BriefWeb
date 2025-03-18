# Bank of Georgia Payment Integration

## Current Status

The integration with Bank of Georgia (BOG) payment API is currently in development mode. We've identified several issues with the API connection that should be addressed before going live:

### API Configuration Issues

1. **API Endpoints**: Based on the official BOG documentation, we're using these endpoints:

   - Authentication: `/payments/oauth2/token`
   - Order Creation: `/payments/v1/ecommerce/orders`
   - Payment Receipt: `/payments/v1/receipt`

2. **Base URL**: Using `https://api.bog.ge` as the API base URL.

3. **Payment Domain**: Redirecting to `https://payment.bog.ge` for the payment UI.

4. **Request Format**: The exact format according to BOG documentation is now implemented for order creation:

   ```json
   {
     "callback_url": "https://example.com/callback",
     "external_order_id": "id123",
     "purchase_units": {
       "currency": "GEL",
       "total_amount": 1,
       "basket": [
         {
           "quantity": 1,
           "unit_price": 1,
           "product_id": "product123"
         }
       ]
     },
     "redirect_urls": {
       "fail": "https://example.com/fail",
       "success": "https://example.com/success"
     }
   }
   ```

5. **Response Format**: We're expecting this response format:
   ```json
   {
     "id": "{order_id}",
     "_links": {
       "details": {
         "href": "https://api.bog.ge/payments/v1/receipt/{order_id}"
       },
       "redirect": {
         "href": "https://payment.bog.ge/?order_id={order_id}"
       }
     }
   }
   ```

### Mock Implementation

To facilitate development and testing without relying on the API working perfectly, we've implemented a robust mock system that:

1. Creates mock auth tokens when authentication fails
2. Generates realistic order IDs
3. Creates realistic redirect URLs that match BOG's format: `https://payment.bog.ge/?order_id={order_id}`
4. Returns appropriate data structures that match what the real API would return

### Current API Issues

We're encountering the following issues with the BOG API:

1. 404 Not Found on authentication endpoint
2. "Bearer token is malformed" error on payment order creation

These issues suggest that either:

- The API endpoints are not correct
- The credentials are not valid
- There's a specific way to format the requests that we're missing

### Payment Flow

The payment flow works as follows:

1. User selects a subscription plan and initiates payment
2. Client sends a request to create a payment order
3. Server creates an order with BOG (or mock in development)
4. Server returns the redirect URL to the client
5. Client redirects the user to the BOG payment page at `https://payment.bog.ge/?order_id={order_id}`
6. After payment, BOG redirects the user back to our success or failure URL

### Next Steps

Before going to production, the following steps should be completed:

1. **Contact BOG Support**: Provide them with the errors you're seeing and ask for:

   - Correct API endpoints
   - Proper request formats
   - Test credentials for development
   - Any SDK or sample code they might have

2. **Test with Sandbox**: If BOG has a sandbox environment, use that for testing.

3. **Implement Webhook Handler**: Ensure the `callback_url` endpoint is properly implemented to handle payment notifications.

4. **Verify Redirect URLs**: Make sure the success and failure redirect URLs are configured to handle returning users.

## Testing

For development testing, a test script (`server/testBog.js`) has been created. This script:

1. Tests authentication with BOG
2. Tests creating a payment order
3. Falls back to mock data if API calls fail
4. Provides a redirect URL for testing the full payment flow

Run the test script with:

```
node server/testBog.js
```

## Production Considerations

When moving to production:

1. Update the `.env` file to use production credentials
2. Set `NODE_ENV=production` to disable fallback to mock implementations
3. Update redirect URLs to production domains
4. Implement proper error handling and notifications for payment failures
5. Set up monitoring for the payment system

## Troubleshooting

If you encounter issues with the BOG API:

1. Check the logs for detailed error messages
2. Verify your credentials and formatted correctly
3. Try testing the API endpoints directly using a tool like Postman
4. Contact BOG support for assistance with API issues
