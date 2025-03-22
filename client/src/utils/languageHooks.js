import { useContext } from "react";
import { LanguageContext } from "../contexts/LanguageContextValue";

// Export hook for easy usage
export const useLanguage = () => useContext(LanguageContext);
