/**
 * Language detection and processing utilities
 */

/**
 * Detects if text contains Georgian characters
 * @param {string} text - Text to analyze
 * @returns {boolean} True if Georgian characters are found
 */
export function containsGeorgian(text) {
  return /[\u10A0-\u10FF]/.test(text);
}

/**
 * Detects the primary language of text
 * @param {string} text - Text to analyze
 * @returns {string} "Georgian" or "English"
 */
export function detectLanguage(text) {
  return containsGeorgian(text) ? "Georgian" : "English";
}

/**
 * Detects language from multiple text sources
 * @param {...string} texts - Multiple text sources to check
 * @returns {string} "Georgian" or "English"
 */
export function detectLanguageFromMultiple(...texts) {
  for (const text of texts) {
    if (text && containsGeorgian(text)) {
      return "Georgian";
    }
  }
  return "English";
}

/**
 * Validates that response language matches expected language
 * @param {string} expectedLanguage - Expected language ("Georgian" or "English")
 * @param {string} responseText - Response text to validate
 * @returns {Object} Validation result with warnings
 */
export function validateResponseLanguage(expectedLanguage, responseText) {
  const responseContainsGeorgian = containsGeorgian(responseText);
  const warnings = [];

  if (expectedLanguage === "Georgian" && !responseContainsGeorgian) {
    warnings.push(
      "WARNING: Input was in Georgian but response doesn't contain Georgian characters!"
    );
  } else if (expectedLanguage === "English" && responseContainsGeorgian) {
    warnings.push(
      "WARNING: Input was not in Georgian but response contains Georgian characters!"
    );
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    detectedLanguage: responseContainsGeorgian ? "Georgian" : "English",
  };
}

/**
 * Gets language-specific fallback text
 * @param {string} language - Target language
 * @param {string} context - Context for fallback (e.g., "evaluation", "quiz")
 * @returns {string} Appropriate fallback text
 */
export function getLanguageFallback(language, context) {
  const fallbacks = {
    Georgian: {
      evaluation:
        "თქვენი პასუხი მიღებულია. იგი აჩვენებს საკითხის ძირითად გაგებას.",
      quiz: "ვერ შევქმენით კითხვარი. გთხოვთ სცადოთ მოგვიანებით.",
      flashcard: "ბარათების გენერაცია ვერ მოხერხდა.",
      brief: "შეჯამების შექმნა ვერ მოხერხდა.",
    },
    English: {
      evaluation:
        "Your answer has been received. It shows basic understanding of the topic.",
      quiz: "We couldn't generate a quiz. Please try again later.",
      flashcard: "Failed to generate flashcards.",
      brief: "Failed to generate brief.",
    },
  };

  return (
    fallbacks[language]?.[context] ||
    fallbacks.English[context] ||
    "An error occurred."
  );
}
