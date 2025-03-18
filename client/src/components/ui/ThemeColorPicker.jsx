import { useState } from "react";
import { setDarkBackground, setLightBackground } from "../../utils/themeUtils";
import { useTheme } from "../../contexts/ThemeContext";

// Predefined color options
const THEME_COLORS = {
  light: [
    { name: "White", value: "#ffffff" },
    { name: "Light Gray", value: "#f3f3f3" },
    { name: "Light Blue", value: "#F8F7FF" },
    { name: "Light Green", value: "#f0fdf4" },
    { name: "Light Purple", value: "#f5f3ff" },
  ],
  dark: [
    { name: "Dark Gray", value: "#252323" },
    { name: "Dark Blue", value: "#001514" },
    { name: "Dark Green", value: "#022c22" },
    { name: "Dark Purple", value: "#2e1065" },
    { name: "Black", value: "#000000" },
  ],
};

export default function ThemeColorPicker() {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  // Function to change light theme color
  const changeLightColor = (color) => {
    setLightBackground(color);
  };

  // Function to change dark theme color
  const changeDarkColor = (color) => {
    setDarkBackground(color);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-blue-500"
        aria-label="Color theme settings"
        title="Change theme colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="theme-text-primary"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <circle cx="12" cy="12" r="5"></circle>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1 px-2" role="menu" aria-orientation="vertical">
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Theme Colors
              </p>
            </div>

            {/* Light Mode Colors */}
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Light Mode Background
              </p>
              <div className="flex flex-wrap gap-2">
                {THEME_COLORS.light.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => changeLightColor(color.value)}
                    className="w-6 h-6 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Dark Mode Colors */}
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Dark Mode Background
              </p>
              <div className="flex flex-wrap gap-2">
                {THEME_COLORS.dark.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => changeDarkColor(color.value)}
                    className="w-6 h-6 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 mt-2">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full text-center text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
