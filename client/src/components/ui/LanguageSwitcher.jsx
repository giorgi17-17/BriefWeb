import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../../utils/languageHooks";

function LanguageSwitcher() {
  const {
    currentLanguage,
    changeLanguage,
    languages,
    getCurrentLanguageDetails,
  } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = getCurrentLanguageDetails();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="flex items-center justify-center p-2 text-lg rounded-md theme-text-secondary hover:theme-text-primary transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change language"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span aria-hidden="true">{currentLang.flag}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 theme-bg-primary ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
          {languages.map((language) => (
            <button
              key={language.code}
              className={`${
                language.code === currentLanguage
                  ? "theme-text-primary font-medium"
                  : "theme-text-secondary"
              } flex w-full items-center px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800`}
              onClick={() => {
                changeLanguage(language.code);
                setIsOpen(false);
              }}
            >
              <span className="mr-2">{language.flag}</span>
              <span>{language.nativeName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;
