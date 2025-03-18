import { createContext, useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Check localStorage for saved theme or default to 'light'
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    // Check if user has a system preference
    if (!savedTheme) {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      return prefersDark ? "dark" : "light";
    }
    return savedTheme;
  });

  // Toggle between light and dark themes
  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === "light" ? "dark" : "light";
      localStorage.setItem("theme", newTheme);
      return newTheme;
    });
  };

  // Apply theme class to document element when theme changes
  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// Custom hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export default ThemeContext;
