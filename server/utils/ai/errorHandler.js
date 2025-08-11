/**
 * Centralized error handling for AI services
 */

/**
 * Logs AI service errors with context
 * @param {string} service - Service name (e.g., "flashcard", "quiz")
 * @param {Error} error - The error object
 * @param {Object} context - Additional context information
 */
export function logAIError(service, error, context = {}) {
  console.error(`Error in ${service} service:`, error);

  if (error.response) {
    console.error("Error response data:", error.response.data);
    console.error("Error response status:", error.response.status);
  }

  if (context.input) {
    console.error("Input length:", context.input.length);
    console.error("Input preview:", context.input.substring(0, 100) + "...");
  }

  if (context.rawResponse) {
    console.error("Raw response length:", context.rawResponse.length);
    console.error(
      "Raw response preview:",
      context.rawResponse.substring(0, 200) + "..."
    );
  }

  if (error.stack) {
    console.error("Stack trace:", error.stack);
  }
}

/**
 * Creates a standardized error response
 * @param {string} service - Service name
 * @param {string} message - Error message
 * @param {Error} originalError - Original error object
 * @returns {Object} Standardized error object
 */
export function createErrorResponse(service, message, originalError = null) {
  return {
    success: false,
    error: message,
    service: service,
    timestamp: new Date().toISOString(),
    details: originalError ? originalError.message : null,
  };
}

/**
 * Wraps async functions with error handling
 * @param {Function} fn - Async function to wrap
 * @param {string} serviceName - Name of the service for logging
 * @returns {Function} Wrapped function with error handling
 */
export function withErrorHandling(fn, serviceName) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      logAIError(serviceName, error, {
        functionName: fn.name,
        args: args.map((arg) =>
          typeof arg === "string" ? arg.substring(0, 100) + "..." : typeof arg
        ),
      });
      throw error;
    }
  };
}

/**
 * Handles parse errors with logging
 * @param {string} service - Service name
 * @param {Error} parseError - Parse error
 * @param {string} rawContent - Raw content that failed to parse
 * @returns {Object} Error details
 */
export function handleParseError(service, parseError, rawContent) {
  console.error(`Parse error in ${service}:`, parseError);
  console.error("Raw content length:", rawContent ? rawContent.length : 0);

  if (rawContent) {
    console.error("Content preview:", rawContent.substring(0, 200) + "...");

    // Try to identify the problematic area
    const errorMatch = parseError.message.match(/position (\d+)/);
    if (errorMatch) {
      const position = parseInt(errorMatch[1]);
      console.error(
        "Error context:",
        rawContent.substring(Math.max(0, position - 50), position + 50)
      );
    }
  }

  return {
    service,
    error: parseError.message,
    contentLength: rawContent ? rawContent.length : 0,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Retries a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} initialDelay - Initial delay in milliseconds
 * @returns {*} Result of the function
 */
export async function retryWithBackoff(
  fn,
  maxRetries = 3,
  initialDelay = 1000
) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1} after ${delay}ms delay`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
