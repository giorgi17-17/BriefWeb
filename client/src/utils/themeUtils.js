/**
 * Theme Utility Functions
 *
 * Simplified theme system that relies on CSS variables.
 * This approach makes it easy to change colors in a single place
 * and have them reflected throughout the application.
 */

/**
 * Creates utility class for consistent theme styling
 *
 * @param {string} type - The type of utility (bg, text, border)
 * @param {string} variation - The variation (primary, secondary, tertiary)
 * @returns {string} The appropriate theme class
 */
export const theme = (type, variation = "primary") => {
  return `theme-${type}-${variation}`;
};

/**
 * Legacy function for compatibility with existing code
 * Creates class strings that include both light and dark mode variants
 * @param {Object} options - The style options
 * @param {string} options.light - The light mode class
 * @param {string} options.dark - The dark mode class
 * @returns {string} - The combined class string with dark mode variant
 */
export const themeCls = ({ light, dark }) => {
  return `${light} dark:${dark}`;
};

// Background utilities
export const background = (variation = "primary") => {
  return theme("bg", variation);
};

// Text utilities
export const text = (variation = "primary") => {
  return theme("text", variation);
};

// Border utilities
export const border = (variation = "primary") => {
  return theme("border", variation);
};

// Card utility
export const card = () => {
  return "theme-card";
};

/**
 * Helper to easily change theme colors
 *
 * @param {string} colorType - The color variable to update (e.g., '--dark-background')
 * @param {string} colorValue - The new color value (e.g., '#000000')
 */
export const updateThemeColor = (colorType, colorValue) => {
  document.documentElement.style.setProperty(colorType, colorValue);
};

/**
 * Updates the dark theme background color
 *
 * @param {string} color - The color to set for dark theme background
 */
export const setDarkBackground = (color) => {
  updateThemeColor("--dark-background", color);
};

/**
 * Updates the light theme background color
 *
 * @param {string} color - The color to set for light theme background
 */
export const setLightBackground = (color) => {
  updateThemeColor("--light-background", color);
};

export default {
  theme,
  themeCls,
  background,
  text,
  border,
  card,
  updateThemeColor,
  setDarkBackground,
  setLightBackground,
};
