/**
 * AI Service Configuration
 */

// Configuration for optimization strategy
export const OPTIMIZATION_CONFIG = {
  // Always use multi-page optimization (even for single pages)
  MIN_PAGES_FOR_OPTIMIZATION: 1,
  // Maximum total content size for single call (in characters)
  MAX_CONTENT_SIZE_FOR_SINGLE_CALL: 50000,
  // Maximum number of pages for single call
  MAX_PAGES_FOR_SINGLE_CALL: 20,
  // Enable token monitoring
  ENABLE_TOKEN_MONITORING: true,
};

// AI Generation configuration
export const GENERATION_CONFIG = {
  flashcards: {
    temperature: 0.7,
    minCards: 25,
    maxCards: 35,
    maxQuestionWords: 15,
    maxAnswerWords: 50,
  },
  quiz: {
    temperature: 0.4,
    multipleChoiceCount: 10,
    openEndedCount: 3,
    caseStudyCount: 2,
    optionsPerQuestion: 4,
  },
  evaluation: {
    temperature: 0.1,
    minScore: 0,
    maxScore: 100,
  },
  brief: {
    temperature: 0.5, // Lower temperature for more consistent formatting
    targetWordsPerPage: 280, // Optimal length for brief summaries
    minWordsPerPage: 200, // Reasonable minimum for educational value
    maxWordsPerPage: 350, // Prevent overly long content
    optimalWordsPerPage: 280, // Aligned with target
    strictFormatting: true, // Enable strict formatting validation
    useMarkdown: true, // Use markdown for better structure
  },
};

// Content exclusion rules
export const CONTENT_EXCLUSIONS = {
  excludePatterns: [
    "course syllabus",
    "grading policies",
    "evaluation criteria",
    "course logistics",
    "schedule",
    "deadlines",
    "attendance",
    "lecturers",
    "professors",
    "credentials",
    "background",
    "primary objective of the course",
    "percentage of the grade",
    "study materials",
    "requirements",
  ],
};

// Language detection configuration
export const LANGUAGE_CONFIG = {
  georgianUnicodeRange: /[\u10A0-\u10FF]/,
  defaultLanguage: "English",
  supportedLanguages: ["English", "Georgian"],
};

// Cost estimation configuration
export const COST_CONFIG = {
  costPerThousandTokens: 0.0005, // USD
  englishCharsPerToken: 4,
  georgianCharsPerToken: 2,
  responseTokenRatio: 0.3, // Estimated response tokens as ratio of input
};

// Retry configuration
export const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // milliseconds
  backoffMultiplier: 2,
};

// Response validation configuration
export const VALIDATION_CONFIG = {
  maxJsonParseAttempts: 3,
  enableAggressiveSanitization: true,
  logParseErrors: true,
};
