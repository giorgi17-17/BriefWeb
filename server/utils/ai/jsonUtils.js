/**
 * JSON parsing and sanitization utilities for AI responses
 */

/**
 * Cleans and extracts JSON from AI response text
 * @param {string} text - Raw response text
 * @returns {string} Cleaned JSON string
 */
export function cleanJsonResponse(text) {
  // Remove code fences and markdown
  let cleaned = text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  // Try to extract JSON object or array
  const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return cleaned;
}

/**
 * Sanitizes JSON string by removing control characters and fixing common issues
 * @param {string} jsonString - JSON string to sanitize
 * @returns {string} Sanitized JSON string
 */
export function sanitizeJsonString(jsonString) {
  return (
    jsonString
      // Remove ALL control characters (including non-printable characters)
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
      // Fix common newline issues
      .replace(/\r\n/g, "\n")
      // Replace all types of quotes with straight quotes
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      // Remove any BOM or other invisible markers
      .replace(/^\uFEFF/, "")
      // Fix backslash escaping
      .replace(/\\\\/g, "\\")
  );
}

/**
 * Attempts to fix common JSON parsing errors
 * @param {string} jsonString - JSON string that failed to parse
 * @param {Error} parseError - The parse error that occurred
 * @returns {string} Potentially fixed JSON string
 */
export function attemptJsonFix(jsonString, parseError) {
  const errorMessage = parseError.message;
  const errorMatch = errorMessage.match(/position (\d+)/);

  if (!errorMatch || !errorMatch[1]) {
    return jsonString;
  }

  const errorPos = parseInt(errorMatch[1]);
  const beforeError = jsonString.substring(0, errorPos);
  const afterError = jsonString.substring(errorPos);

  console.error(
    "JSON error context:",
    jsonString.substring(Math.max(0, errorPos - 50), errorPos + 50)
  );

  // Handle specific error types
  if (errorMessage.includes("control character")) {
    // For control character errors, completely sanitize the entire JSON
    return jsonString.replace(/[^\x20-\x7E]/g, "");
  } else if (errorMessage.includes("Expected")) {
    // Structure issues - try to correct JSON structure
    if (errorMessage.includes("Expected ','")) {
      return beforeError + "," + afterError;
    } else if (errorMessage.includes("Expected '}'")) {
      return beforeError + "}" + afterError;
    } else if (errorMessage.includes("Expected property name")) {
      return beforeError + '"fixed_property": null' + afterError;
    }
  } else if (afterError.startsWith('"') && beforeError.endsWith('"')) {
    // Likely an unescaped quote - replace it
    return beforeError + '\\"' + afterError.substring(1);
  } else if (errorMessage.includes("Unexpected")) {
    // Last resort - just remove the problematic character
    return beforeError + afterError.substring(1);
  }

  return jsonString;
}

/**
 * Parses JSON with multiple fallback strategies
 * @param {string} text - Text to parse as JSON
 * @param {Object} options - Parsing options
 * @returns {Object} Parsed JSON object or null
 */
export function parseJsonWithFallbacks(text, options = {}) {
  const { logErrors = true, maxAttempts = 3 } = options;

  let jsonString = cleanJsonResponse(text);
  jsonString = sanitizeJsonString(jsonString);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      if (logErrors && attempt === 0) {
        console.error("JSON parse error:", error);
        console.error("Error position:", error.message);
      }

      if (attempt < maxAttempts - 1) {
        jsonString = attemptJsonFix(jsonString, error);

        // Additional aggressive cleanup for subsequent attempts
        if (attempt === 1) {
          // Convert to simple ASCII-safe representation
          jsonString = jsonString
            .replace(/[^\x20-\x7E]/g, "")
            // Make sure all property names are properly quoted
            .replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
        }
      }
    }
  }

  return null;
}

/**
 * Escapes quotes in JSON field values
 * @param {string} jsonString - JSON string to process
 * @returns {string} JSON with escaped quotes in values
 */
export function escapeJsonQuotes(jsonString) {
  // Escape quotes in property names
  jsonString = jsonString.replace(
    /"([^"]*)":/g,
    (match, p1) => `"${p1.replace(/"/g, '\\"')}":`
  );

  // Escape quotes in values
  jsonString = jsonString.replace(
    /: ?"([^"]*)"/g,
    (match, p1) => `: "${p1.replace(/"/g, '\\"')}"`
  );

  return jsonString;
}
