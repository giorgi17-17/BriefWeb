/**
 * Helper function to force a theme refresh
 * Call this function whenever you need to ensure theme changes are applied
 */
export const refreshTheme = () => {
  // Get current theme
  const currentTheme = document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";

  // Temporarily toggle theme class to force a re-render
  document.documentElement.classList.remove(currentTheme);

  // Force a browser reflow
  void document.documentElement.offsetHeight;

  // Add the theme class back
  document.documentElement.classList.add(currentTheme);

  console.log("Theme refreshed:", currentTheme);
};

/**
 * Execute immediately to refresh the theme when this file is imported
 */
setTimeout(() => {
  refreshTheme();
}, 100);
