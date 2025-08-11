/**
 * Fallback strategies for AI service failures
 */

import uniqid from "uniqid";
import { getLanguageFallback } from "./languageUtils.js";

/**
 * Creates a fallback quiz when generation fails
 * @param {Object} quizOptions - Quiz generation options
 * @returns {Object} Fallback quiz structure
 */
export function createFallbackQuiz(quizOptions = {}) {
  console.log("Creating fallback quiz");

  const quiz = {
    success: true,
    questions: [],
  };

  // Add multiple choice questions if requested
  if (quizOptions.includeMultipleChoice !== false) {
    quiz.questions.push({
      id: uniqid(),
      type: "multiple_choice",
      question: "We couldn't generate a custom quiz. Here's a sample question.",
      options: [
        { id: "a", text: "Option A", correct: true },
        { id: "b", text: "Option B", correct: false },
        { id: "c", text: "Option C", correct: false },
        { id: "d", text: "Option D", correct: false },
      ],
    });
  }

  // Add open-ended question if requested
  if (quizOptions.includeOpenEnded) {
    quiz.questions.push({
      id: uniqid(),
      type: "open_ended",
      question: "Sample open-ended question",
      sampleAnswer: "This is a sample answer for the open-ended question.",
    });
  }

  // Add case study if requested
  if (quizOptions.includeCaseStudies) {
    quiz.questions.push({
      id: uniqid(),
      type: "case_study_moderate",
      scenario: "This is a sample scenario for a case study.",
      question: "Sample case study question",
      sampleAnswer: "This is a sample answer for the case study question.",
    });
  }

  return quiz;
}

/**
 * Creates fallback flashcards when generation fails
 * @param {string} language - Target language for fallback
 * @returns {Array} Fallback flashcards
 */
export function createFallbackFlashcards(language = "English") {
  console.log("Creating fallback flashcards");

  const fallbacks = {
    Georgian: [
      {
        id: uniqid(),
        question: "ვერ შევქმენით ბარათები",
        answer: "გთხოვთ სცადოთ მოგვიანებით",
      },
    ],
    English: [
      {
        id: uniqid(),
        question: "Failed to generate flashcards",
        answer: "Please try again later",
      },
    ],
  };

  return fallbacks[language] || fallbacks.English;
}

/**
 * Creates fallback evaluation when AI evaluation fails
 * @param {string} language - Target language
 * @param {boolean} hasUserAnswer - Whether user provided an answer
 * @returns {Object} Fallback evaluation
 */
export function createFallbackEvaluation(
  language = "English",
  hasUserAnswer = true
) {
  if (!hasUserAnswer) {
    return {
      score: 0,
      feedback:
        language === "Georgian"
          ? "პასუხი არ არის მოწოდებული. გთხოვთ დაწეროთ პასუხი შეფასების მისაღებად."
          : "No answer provided. Please write an answer to receive feedback.",
      isCorrect: false,
    };
  }

  const fallbacks = {
    Georgian: {
      score: 70,
      feedback:
        "თქვენი პასუხი შეფასებულია. მასში კარგად არის წარმოდგენილი საკვანძო აზრები. გააუმჯობესეთ დეტალების ხარისხი და ლოგიკური კავშირები მომავალში.",
      isCorrect: true,
    },
    English: {
      score: 70,
      feedback:
        "Your answer has been evaluated. It presents key ideas well. In the future, improve the quality of details and logical connections.",
      isCorrect: true,
    },
  };

  return fallbacks[language] || fallbacks.English;
}

/**
 * Creates fallback brief summaries when generation fails
 * @param {Array} pages - Original pages to summarize
 * @param {string} error - Error message
 * @returns {Object} Fallback brief structure
 */
export function createFallbackBrief(pages, error = null) {
  console.log("Creating fallback brief summaries");

  const fallbackSummaries = pages
    .map((pageText, index) => {
      const cleanedPage = pageText.trim();
      if (!cleanedPage) return null;

      return {
        pageNumber: index + 1,
        summary: `Page ${index + 1}: ${cleanedPage.substring(0, 200)}${
          cleanedPage.length > 200 ? "..." : ""
        }`,
      };
    })
    .filter(Boolean);

  const result = {
    pageSummaries: fallbackSummaries,
  };

  if (error) {
    result.error = error;
  }

  return result;
}

/**
 * Creates generic fallback response based on language and context
 * @param {string} language - Target language
 * @param {string} context - Context type (evaluation, quiz, flashcard, brief)
 * @returns {Object} Appropriate fallback response
 */
export function createGenericFallback(language, context) {
  const fallbackText = getLanguageFallback(language, context);

  switch (context) {
    case "evaluation":
      return createFallbackEvaluation(language);
    case "quiz":
      return createFallbackQuiz();
    case "flashcard":
      return createFallbackFlashcards(language);
    case "brief":
      return createFallbackBrief([]);
    default:
      return {
        success: false,
        error: fallbackText,
      };
  }
}

/**
 * Handles invalid AI responses with appropriate fallbacks
 * @param {string} service - Service name
 * @param {string} responseText - Invalid response text
 * @param {string} language - Target language
 * @returns {Object} Appropriate fallback based on service
 */
export function handleInvalidResponse(
  service,
  responseText,
  language = "English"
) {
  console.warn(`Invalid response from ${service} service`);

  // Check if AI is refusing to process
  const refusalPhrases = [
    "cannot evaluate",
    "unable to evaluate",
    "don't understand",
    "provide the student's answer",
    "I'll evaluate once I receive",
    "need more information",
  ];

  const isRefusal = refusalPhrases.some((phrase) =>
    responseText.toLowerCase().includes(phrase)
  );

  if (isRefusal) {
    console.warn(`AI refused to process ${service} request`);
  }

  return createGenericFallback(language, service);
}
