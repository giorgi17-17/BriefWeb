/** @type {import('tailwindcss').Config} */
import forms from "@tailwindcss/forms";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      // Color System
      colors: {
        // Primary colors
        primary: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        // Brand colors - modify with your brand colors
        brand: {
          black: "#000000",
          white: "#FFFFFF",
          gray: {
            50: "#f9fafb",
            100: "#f3f4f6",
            200: "#e5e7eb",
            300: "#d1d5db",
            400: "#9ca3af",
            500: "#6b7280",
            600: "#4b5563",
            700: "#374151",
            800: "#1f2937",
            900: "#111827",
          },
          purple: {
            100: "#f3e8ff",
            300: "#d8b4fe",
            600: "#9333ea",
          },
          blue: {
            100: "#dbeafe",
            300: "#93c5fd",
            600: "#2563eb",
          },
          green: {
            100: "#dcfce7",
            300: "#86efac",
            600: "#16a34a",
          },
        },
        // UI feedback colors
        ui: {
          success: "#10b981", // emerald-500
          error: "#ef4444", // red-500
          warning: "#f59e0b", // amber-500
          info: "#3b82f6", // blue-500
        },
      },

      // Typography System
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Georgia", "serif"],
        mono: ["Roboto Mono", "monospace"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
        "5xl": ["3rem", { lineHeight: "3rem" }],
      },
      fontWeight: {
        light: "300",
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
      },

      // Spacing System
      spacing: {
        // Keep default Tailwind spacing and extend with any custom values
        128: "32rem",
        144: "36rem",
      },

      // Border Radius
      borderRadius: {
        none: "0",
        sm: "0.125rem",
        DEFAULT: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        full: "9999px",
      },

      // Shadows
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        DEFAULT:
          "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
        none: "none",
      },

      // Animation
      animation: {
        blob: "blob 7s infinite",
        "spin-slow": "spin 3s linear infinite",
        "bounce-slow": "bounce 3s infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        blob: {
          "0%": {
            transform: "translate(0px, 0px) scale(1)",
          },
          "33%": {
            transform: "translate(30px, -50px) scale(1.1)",
          },
          "66%": {
            transform: "translate(-20px, 20px) scale(0.9)",
          },
          "100%": {
            transform: "translate(0px, 0px) scale(1)",
          },
        },
      },

      // Blur effects
      backdropBlur: {
        xs: "2px",
      },

      // Gradients
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },

      // Z-index layers
      zIndex: {
        "-10": "-10",
        0: "0",
        10: "10",
        20: "20",
        30: "30",
        40: "40",
        50: "50",
        60: "60",
        70: "70",
        80: "80",
        90: "90",
        100: "100",
        auto: "auto",
      },
    },
  },
  plugins: [forms],
  safelist: [
    // Color patterns
    "bg-gradient-to-r",
    "bg-gradient-to-br",
    "from-emerald-50",
    "to-teal-50",
    "via-cyan-50",
    "from-emerald-500",
    "to-teal-500",

    // UI effects
    "blur-3xl",
    "backdrop-blur-sm",
    "bg-clip-text",
    "text-transparent",

    // Brand colors
    "bg-brand-black",
    "text-brand-black",
    "bg-brand-purple-100",
    "bg-brand-blue-100",
    "bg-brand-green-100",
    "text-brand-purple-600",
    "text-brand-blue-600",
    "text-brand-green-600",

    // UI feedback colors
    "text-ui-success",
    "text-ui-error",
    "text-ui-warning",
    "text-ui-info",
    "bg-ui-success",
    "bg-ui-error",
    "bg-ui-warning",
    "bg-ui-info",

    // Dark mode classes
    "dark:bg-gray-800",
    "dark:bg-gray-900",
    "dark:text-white",
    "dark:text-gray-200",
    "dark:text-gray-300",
    "dark:border-gray-700",
    "dark:border-gray-800",

    // Custom colors
    "bg-[#50d71e]",
    "dark:bg-[#001514]",
    "bg-[#45bd1a]",
    "dark:bg-[#001514]",
    "hover:bg-[#45bd1a]",
  ],
};
