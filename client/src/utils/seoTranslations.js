/**
 * Translations for SEO metadata
 * Organized by page and language
 */

export const seoTranslations = {
  // Home page (landing page)
  home: {
    title: {
      en: "Briefly - Educational Platform for Students",
      ka: "Briefly - საგანმანათლებლო პლატფორმა სტუდენტებისთვის",
    },
    description: {
      en: "Briefly is an interactive educational platform for students providing AI-powered flashcards, concise learning materials, quizzes and study resources to improve learning outcomes.",
      ka: "Briefly არის ინტერაქტიული საგანმანათლებლო პლატფორმა სტუდენტებისთვის, რომელიც უზრუნველყოფს AI-ზე დაფუძნებულ ფლეშ-ბარათებს, მოკლე სასწავლო მასალებს, ქვიზებს და სასწავლო რესურსებს სწავლის შედეგების გასაუმჯობესებლად.",
    },
    keywords: {
      en: [
        "education",
        "learning platform",
        "student resources",
        "study materials",
        "online learning",
        "AI flashcards",
        "educational technology",
        "e-learning",
        "study app",
        "academic resources",
        "brief notes",
        "exam preparation",
      ],
      ka: [
        "განათლება",
        "სასწავლო პლატფორმა",
        "სტუდენტური რესურსები",
        "სასწავლო მასალები",
        "ონლაინ სწავლება",
        "AI ფლეშბარათები",
        "საგანმანათლებლო ტექნოლოგია",
        "ელექტრონული სწავლება",
        "სასწავლო აპლიკაცია",
        "აკადემიური რესურსები",
        "მოკლე ჩანაწერები",
        "გამოცდებისთვის მომზადება",
      ],
    },
  },

  // Lectures page
  lectures: {
    title: {
      en: "Lectures - Briefly Educational Platform",
      ka: "ლექციები - Briefly საგანმანათლებლო პლატფორმა",
    },
    description: {
      en: "Browse all lectures and educational resources. Access learning materials, notes, and course content.",
      ka: "დაათვალიერეთ ყველა ლექცია და საგანმანათლებლო რესურსი. წვდომა სასწავლო მასალებზე, ჩანაწერებზე და კურსის შინაარსზე.",
    },
    keywords: {
      en: [
        "lectures",
        "educational materials",
        "course content",
        "study resources",
        "learning",
      ],
      ka: [
        "ლექციები",
        "საგანმანათლებლო მასალები",
        "კურსის შინაარსი",
        "სასწავლო რესურსები",
        "სწავლა",
      ],
    },
  },

  // Dashboard page (protected)
  dashboard: {
    title: {
      en: "Dashboard - Briefly Educational Platform",
      ka: "პირადი გვერდი - Briefly საგანმანათლებლო პლატფორმა",
    },
    description: {
      en: "Access your subjects, create flashcards and briefs using AI. Organize your educational materials.",
      ka: "წვდომა თქვენს საგნებზე, ფლეშბარათების და ბრიფების შექმნა AI-ის გამოყენებით. ორგანიზება თქვენი საგანმანათლებლო მასალების.",
    },
  },

  // Generic translations (for dynamic pages)
  generic: {
    subject: {
      en: "%s Lectures",
      ka: "%s ლექციები",
    },
    lecture: {
      en: "%s - %s",
      ka: "%s - %s",
    },
  },
};

/**
 * Get a localized metadata field
 * @param {string} page - Page identifier
 * @param {string} field - Field name (title, description, keywords)
 * @param {string} lang - Language code
 * @param {Array} params - Optional parameters for string formatting
 * @returns {string|string[]} Localized field value
 */
export function getLocalizedSeoField(page, field, lang, params = []) {
  // Default to English if translation doesn't exist
  const defaultLang = "en";

  // Get the page translations
  const pageTranslations = seoTranslations[page] || seoTranslations.generic;
  if (!pageTranslations) return "";

  // Get the field translations
  const fieldTranslations = pageTranslations[field];
  if (!fieldTranslations) return "";

  // Get the localized value or fall back to English
  let value = fieldTranslations[lang] || fieldTranslations[defaultLang] || "";

  // If it's a string and has parameters, format it
  if (typeof value === "string" && params.length > 0) {
    params.forEach((param) => {
      value = value.replace(`%s`, param);
    });
  }

  return value;
}
