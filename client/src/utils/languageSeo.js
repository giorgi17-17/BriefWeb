/**
 * Utility functions for multilingual SEO
 */

// Default supported languages
const SUPPORTED_LANGUAGES = ["en", "ka"]; // English and Georgian (add more as needed)

/**
 * Get canonical URL with language code
 * @param {string} path - Current page path
 * @param {string} lang - Current language code
 * @param {string} baseUrl - Base URL of the website
 * @returns {string} Canonical URL
 */
export function getCanonicalUrl(path, lang, baseUrl = "https://briefly.ge") {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}/${lang}${cleanPath}`;
}

/**
 * Generate alternate language links for hreflang tags
 * @param {string} path - Current page path
 * @param {string} currentLang - Current language code
 * @param {string[]} languages - Supported languages
 * @param {string} baseUrl - Base URL of the website
 * @returns {Array<{lang: string, url: string}>} Array of language and URL pairs
 */
export function getAlternateLanguages(
  path,
  currentLang,
  languages = SUPPORTED_LANGUAGES,
  baseUrl = "https://briefly.ge"
) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return languages.map((lang) => ({
    lang: lang === "en" ? "en" : `${lang}`,
    url: `${baseUrl}/${lang}${cleanPath}`,
  }));
}

/**
 * Get localized meta description based on the current language
 * @param {Object} translations - Object with translations keyed by language
 * @param {string} lang - Current language code
 * @returns {string} Localized description
 */
export function getLocalizedDescription(translations, lang) {
  return translations[lang] || translations["ka"] || "";
}

/**
 * Get structured data with localized content
 * @param {Object} baseStructuredData - Base structured data object
 * @param {Object} localizedFields - Object with localized fields for each language
 * @param {string} lang - Current language code
 * @returns {Object} Localized structured data
 */
export function getLocalizedStructuredData(
  baseStructuredData,
  localizedFields,
  lang
) {
  const fields = localizedFields[lang] || localizedFields["ka"] || {};

  return {
    ...baseStructuredData,
    ...fields,
  };
}
