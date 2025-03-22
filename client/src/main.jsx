import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import "./utils/refreshTheme"; // Import the theme refresh utility
// Import i18n instance
import "./utils/i18n";
import { LanguageProvider } from "./contexts/LanguageContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>
);
