import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import i18n from "../utils/i18n";
import { LANGUAGES } from "../utils/languageConfig";
import { LanguageContext } from "./LanguageContextValue";

export function LanguageProvider({ children }) {
  // Get initial language from localStorage or default to Georgian
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return localStorage.getItem("language") || "ka";
  });

  // Change language function
  const changeLanguage = (langCode) => {
    if (LANGUAGES.some((lang) => lang.code === langCode)) {
      setCurrentLanguage(langCode);
      i18n.changeLanguage(langCode);
      localStorage.setItem("language", langCode);
    }
  };

  // Set initial language
  useEffect(() => {
    i18n.changeLanguage(currentLanguage);
  }, [currentLanguage]);

  // Get current language details
  const getCurrentLanguageDetails = () => {
    return (
      LANGUAGES.find((lang) => lang.code === currentLanguage) || LANGUAGES[0]
    );
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        changeLanguage,
        languages: LANGUAGES,
        getCurrentLanguageDetails,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

// Add prop validation
LanguageProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
