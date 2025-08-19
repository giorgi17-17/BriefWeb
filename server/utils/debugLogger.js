/**
 * Debug logger utility for server-side code
 * This prevents sensitive information leakage in production
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Log debug messages only in development
 * @param {...any} args - Arguments to log
 */
export const debugLog = (...args) => {
  if (isDevelopment) {
    console.log('[DEBUG]', new Date().toISOString(), ...args);
  }
};

/**
 * Log warnings only in development
 * @param {...any} args - Arguments to log
 */
export const debugWarn = (...args) => {
  if (isDevelopment) {
    console.warn('[WARN]', new Date().toISOString(), ...args);
  }
};

/**
 * Log errors (always logged, but with different detail levels)
 * @param {...any} args - Arguments to log
 */
export const debugError = (...args) => {
  const timestamp = new Date().toISOString();
  if (isDevelopment) {
    console.error('[ERROR]', timestamp, ...args);
  } else {
    // In production, log minimal error info
    console.error('[ERROR]', timestamp, args[0]?.message || args[0] || 'An error occurred');
  }
};

/**
 * Log with a custom label
 * @param {string} label - Label for the log
 * @param {...any} args - Arguments to log
 */
export const debugLogWithLabel = (label, ...args) => {
  if (isDevelopment) {
    console.log(`[${label}]`, new Date().toISOString(), ...args);
  }
};

/**
 * Performance logging utility for async operations
 * @param {string} label - Label for the performance metric
 * @param {Function} fn - Function to measure
 * @returns {any} - Result of the function
 */
export const debugPerformance = async (label, fn) => {
  if (isDevelopment) {
    const start = Date.now();
    const result = await fn();
    const end = Date.now();
    console.log(`[PERF] ${label}: ${end - start}ms`);
    return result;
  }
  return await fn();
};

/**
 * Log API operations
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint
 * @param {Object} details - Additional details
 */
export const debugAPI = (method, endpoint, details = {}) => {
  if (isDevelopment) {
    console.log(`[API] ${method} ${endpoint}`, {
      timestamp: new Date().toISOString(),
      ...details
    });
  }
};

/**
 * Log AI service operations
 * @param {string} service - AI service name
 * @param {string} operation - Operation being performed
 * @param {Object} details - Additional details
 */
export const debugAI = (service, operation, details = {}) => {
  if (isDevelopment) {
    console.log(`[AI-${service}] ${operation}`, {
      timestamp: new Date().toISOString(),
      ...details
    });
  }
};