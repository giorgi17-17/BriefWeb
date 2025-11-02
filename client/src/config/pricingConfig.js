/**
 * Pricing and Discount Configuration
 * 
 * This file contains all pricing-related configuration including discount settings.
 * To enable/disable discounts, simply change the 'enabled' property.
 */

export const DISCOUNT_CONFIG = {
  // Main discount toggle - set to true to enable discounts
  enabled: false,
  
  // Discount percentage (e.g., 50 = 50% off)
  percentage: 50,
  
  // Indicates this is specifically for Bank of Georgia student cardholders
  studentCardOnly: true,
  
  // Optional: You can add expiry date for time-limited offers
  // validUntil: '2024-12-31',
};

/**
 * Calculate discounted price
 * @param {number} originalPrice - The original price
 * @param {number} discountPercentage - Discount percentage (0-100)
 * @returns {number} - Discounted price rounded to 2 decimal places
 */
export const calculateDiscountedPrice = (originalPrice, discountPercentage) => {
  const discounted = originalPrice * (1 - discountPercentage / 100);
  return Math.round(discounted * 100) / 100; // Round to 2 decimal places
};

/**
 * Get pricing information with discount applied if enabled
 * @param {number} basePrice - Base price before discount
 * @returns {object} - Pricing information object
 */
export const getPricingInfo = (basePrice) => {
  if (!DISCOUNT_CONFIG.enabled || basePrice === 0) {
    return {
      originalPrice: basePrice,
      finalPrice: basePrice,
      hasDiscount: false,
      discountPercentage: 0,
      savings: 0
    };
  }

  const discountedPrice = calculateDiscountedPrice(basePrice, DISCOUNT_CONFIG.percentage);
  
  return {
    originalPrice: basePrice,
    finalPrice: discountedPrice,
    hasDiscount: true,
    discountPercentage: DISCOUNT_CONFIG.percentage,
    savings: basePrice - discountedPrice
  };
};

/**
 * Base pricing for different plans
 */
export const BASE_PRICES = {
  free: 0,
  pro: 6.99
};
