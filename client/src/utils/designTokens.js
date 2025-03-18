/**
 * Design Tokens
 *
 * This file contains design token values extracted from our Tailwind configuration
 * for easy use in JavaScript files and components.
 */

// Brand Colors
export const brandColors = {
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
};

// UI Feedback Colors
export const uiColors = {
  success: "#10b981", // emerald-500
  error: "#ef4444", // red-500
  warning: "#f59e0b", // amber-500
  info: "#3b82f6", // blue-500
};

// Spacing values (in rem)
export const spacing = {
  0: "0rem",
  0.5: "0.125rem",
  1: "0.25rem",
  1.5: "0.375rem",
  2: "0.5rem",
  2.5: "0.625rem",
  3: "0.75rem",
  3.5: "0.875rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  7: "1.75rem",
  8: "2rem",
  9: "2.25rem",
  10: "2.5rem",
  11: "2.75rem",
  12: "3rem",
  14: "3.5rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
  28: "7rem",
  32: "8rem",
  36: "9rem",
  40: "10rem",
  44: "11rem",
  48: "12rem",
  52: "13rem",
  56: "14rem",
  60: "15rem",
  64: "16rem",
  72: "18rem",
  80: "20rem",
  96: "24rem",
};

// Breakpoints (in px)
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

// Font Sizes with line heights
export const fontSizes = {
  xs: { size: "0.75rem", lineHeight: "1rem" },
  sm: { size: "0.875rem", lineHeight: "1.25rem" },
  base: { size: "1rem", lineHeight: "1.5rem" },
  lg: { size: "1.125rem", lineHeight: "1.75rem" },
  xl: { size: "1.25rem", lineHeight: "1.75rem" },
  "2xl": { size: "1.5rem", lineHeight: "2rem" },
  "3xl": { size: "1.875rem", lineHeight: "2.25rem" },
  "4xl": { size: "2.25rem", lineHeight: "2.5rem" },
  "5xl": { size: "3rem", lineHeight: "1" },
  "6xl": { size: "3.75rem", lineHeight: "1" },
  "7xl": { size: "4.5rem", lineHeight: "1" },
  "8xl": { size: "6rem", lineHeight: "1" },
  "9xl": { size: "8rem", lineHeight: "1" },
};

// Font Weights
export const fontWeights = {
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
};

// Border Radius
export const borderRadius = {
  none: "0px",
  sm: "0.125rem",
  default: "0.25rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  "2xl": "1rem",
  "3xl": "1.5rem",
  full: "9999px",
};

// Helper function to get values from the design system
export const getDesignToken = (category, token) => {
  const categories = {
    color: { ...brandColors, ...uiColors },
    spacing,
    fontSize: fontSizes,
    fontWeight: fontWeights,
    borderRadius,
    breakpoint: breakpoints,
  };

  if (!categories[category]) {
    console.warn(`Design token category "${category}" not found`);
    return null;
  }

  if (!categories[category][token]) {
    console.warn(`Design token "${token}" not found in category "${category}"`);
    return null;
  }

  return categories[category][token];
};

export default {
  brandColors,
  uiColors,
  spacing,
  breakpoints,
  fontSizes,
  fontWeights,
  borderRadius,
  getDesignToken,
};
