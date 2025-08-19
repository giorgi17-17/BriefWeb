/**
 * Debug logger utility that only logs in development environment
 * This prevents sensitive information leakage in production
 */

const isDevelopment = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

/**
 * Log debug messages only in development
 * @param {...any} args - Arguments to log
 */
export const debugLog = (...args) => {
  if (isDevelopment) {
    console.log('[DEBUG]', ...args);
  }
};

/**
 * Log warnings only in development
 * @param {...any} args - Arguments to log
 */
export const debugWarn = (...args) => {
  if (isDevelopment) {
    console.warn('[WARN]', ...args);
  }
};

/**
 * Log errors (always logged, but with different detail levels)
 * @param {...any} args - Arguments to log
 */
export const debugError = (...args) => {
  if (isDevelopment) {
    console.error('[ERROR]', ...args);
  } else {
    // In production, log minimal error info
    console.error('[ERROR]', args[0]?.message || args[0] || 'An error occurred');
  }
};

/**
 * Log with a custom label
 * @param {string} label - Label for the log
 * @param {...any} args - Arguments to log
 */
export const debugLogWithLabel = (label, ...args) => {
  if (isDevelopment) {
    console.log(`[${label}]`, ...args);
  }
};

/**
 * Performance logging utility
 * @param {string} label - Label for the performance metric
 * @param {Function} fn - Function to measure
 * @returns {any} - Result of the function
 */
export const debugPerformance = async (label, fn) => {
  if (isDevelopment) {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    console.log(`[PERF] ${label}: ${(end - start).toFixed(2)}ms`);
    return result;
  }
  return await fn();
};

/**
 * Group related logs together
 * @param {string} label - Group label
 * @param {Function} fn - Function containing grouped logs
 */
export const debugGroup = (label, fn) => {
  if (isDevelopment) {
    console.group(`[${label}]`);
    fn();
    console.groupEnd();
  }
};