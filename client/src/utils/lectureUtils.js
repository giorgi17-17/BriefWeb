/**
 * Utility functions for lecture title management and translation
 * Ensures consistent lecture naming across languages
 */

/**
 * Generate a lecture title in English for database storage
 * @param {number} lectureNumber - The lecture number (1, 2, 3, etc.)
 * @returns {string} English lecture title
 */
export function generateLectureTitle(lectureNumber) {
  return `Lecture ${lectureNumber}`;
}

/**
 * Extract lecture number from a title (works with both English and Georgian)
 * @param {string} title - The lecture title
 * @returns {number|null} The lecture number or null if not found
 */
export function extractLectureNumber(title) {
  // Match patterns like "Lecture 1", "ლექცია 1", etc.
  const englishMatch = title.match(/^Lecture\s+(\d+)$/i);
  const georgianMatch = title.match(/^ლექცია\s+(\d+)$/i);

  if (englishMatch) {
    return parseInt(englishMatch[1], 10);
  }

  if (georgianMatch) {
    return parseInt(georgianMatch[1], 10);
  }

  return null;
}

/**
 * Format lecture title for display based on current language
 * @param {string} dbTitle - The title stored in database (should be in English)
 * @param {string} currentLanguage - Current UI language ('en' or 'ka')
 * @param {function} t - Translation function from react-i18next
 * @returns {string} Formatted title for display
 */
export function formatLectureDisplayTitle(dbTitle, currentLanguage, t) {
  // If title is already in English format, translate if needed
  const lectureNumber = extractLectureNumber(dbTitle);

  if (lectureNumber !== null) {
    // We have a numbered lecture, format according to current language
    if (currentLanguage === "ka") {
      return `${t("lectures.lectureDetails.lecture")} ${lectureNumber}`;
    } else {
      return `Lecture ${lectureNumber}`;
    }
  }

  // If we can't extract a number, return the title as-is
  // This handles edge cases or custom titles
  return dbTitle;
}

/**
 * Check if a title is in the standard lecture format
 * @param {string} title - The lecture title
 * @returns {boolean} True if title follows standard lecture naming pattern
 */
export function isStandardLectureTitle(title) {
  return extractLectureNumber(title) !== null;
}

/**
 * Create lecture title translations object for both languages
 * @param {number} lectureNumber - The lecture number
 * @returns {object} Object with translations for both languages
 */
export function createLectureTitleTranslations(lectureNumber) {
  return {
    en: `Lecture ${lectureNumber}`,
    ka: `ლექცია ${lectureNumber}`,
  };
}
