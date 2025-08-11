/**
 * AI response validation utilities
 */

import uniqid from "uniqid";

/**
 * Validates flashcard structure and adds IDs
 * @param {Array} flashcards - Array of flashcards to validate
 * @returns {Array} Validated and transformed flashcards
 */
export function validateFlashcards(flashcards) {
  if (!Array.isArray(flashcards)) {
    throw new Error("Response must be an array");
  }

  if (flashcards.length === 0) {
    throw new Error("No flashcards were generated");
  }

  return flashcards.map((card, index) => {
    if (!card.question || typeof card.question !== "string") {
      throw new Error(`Invalid question in flashcard ${index + 1}`);
    }
    if (!card.answer || typeof card.answer !== "string") {
      throw new Error(`Invalid answer in flashcard ${index + 1}`);
    }

    // Check for potentially long questions or answers
    if (card.question.split(" ").length > 15) {
      console.warn(
        `Flashcard ${index + 1} has a long question (${
          card.question.split(" ").length
        } words)`
      );
    }

    if (card.answer.split(" ").length > 50) {
      console.warn(
        `Flashcard ${index + 1} has a long answer (${
          card.answer.split(" ").length
        } words)`
      );
    }

    return {
      id: uniqid(),
      question: card.question.trim(),
      answer: card.answer.trim(),
    };
  });
}

/**
 * Validates quiz structure and fixes common issues
 * @param {Object} quiz - Quiz object to validate
 * @returns {Object} Validated and fixed quiz
 */
export function validateQuiz(quiz) {
  if (!quiz.success || !Array.isArray(quiz.questions)) {
    throw new Error(
      "Invalid quiz format - missing success flag or questions array"
    );
  }

  if (quiz.questions.length === 0) {
    throw new Error("No questions found in generated quiz");
  }

  // Count questions by type
  const counts = {
    multiple_choice: 0,
    open_ended: 0,
    case_study_moderate: 0,
    case_study_advanced: 0,
  };

  // Validate and fix each question
  quiz.questions.forEach((question, index) => {
    // Add ID if missing
    if (!question.id) {
      question.id = uniqid();
    }

    // Validate and fix based on type
    switch (question.type) {
      case "multiple_choice":
        validateMultipleChoiceQuestion(question, index);
        counts.multiple_choice++;
        break;

      case "open_ended":
        validateOpenEndedQuestion(question, index);
        counts.open_ended++;
        break;

      case "case_study":
      case "case_study_moderate":
        validateCaseStudyQuestion(question, index, "moderate");
        counts.case_study_moderate++;
        break;

      case "case_study_advanced":
        validateCaseStudyQuestion(question, index, "advanced");
        counts.case_study_advanced++;
        break;

      default:
        // Unknown type - convert to multiple choice
        console.warn(
          `Fixed unknown question type "${question.type}" for question ${
            index + 1
          }`
        );
        question.type = "multiple_choice";
        createDefaultMultipleChoiceOptions(question);
        counts.multiple_choice++;
    }
  });

  console.log("Question counts:", counts);

  // Sort questions by type
  quiz.questions.sort((a, b) => {
    const order = {
      multiple_choice: 1,
      open_ended: 2,
      case_study_moderate: 3,
      case_study_advanced: 4,
    };
    return (order[a.type] || 99) - (order[b.type] || 99);
  });

  return quiz;
}

/**
 * Validates and fixes multiple choice questions
 */
function validateMultipleChoiceQuestion(question, index) {
  // Fix missing options array
  if (!Array.isArray(question.options)) {
    question.options = createDefaultMultipleChoiceOptions(question);
    console.warn(`Fixed missing options array for question ${index + 1}`);
  }

  // Fix options length
  if (question.options.length !== 4) {
    while (question.options.length < 4) {
      question.options.push({
        id: ["a", "b", "c", "d"][question.options.length],
        text: `Option ${["A", "B", "C", "D"][question.options.length]}`,
        correct: false,
      });
    }
    if (question.options.length > 4) {
      question.options = question.options.slice(0, 4);
    }
    console.warn(`Fixed options length for question ${index + 1}`);
  }

  // Ensure exactly one correct answer
  const correctOptions = question.options.filter((opt) => opt.correct === true);
  if (correctOptions.length !== 1) {
    question.options.forEach((opt) => (opt.correct = false));
    question.options[0].correct = true;
    console.warn(`Fixed correct answer count for question ${index + 1}`);
  }

  // Fix option IDs
  question.options.forEach((option, optIndex) => {
    option.id = ["a", "b", "c", "d"][optIndex];
  });
}

/**
 * Validates open-ended questions
 */
function validateOpenEndedQuestion(question, index) {
  if (!question.sampleAnswer) {
    question.sampleAnswer = "Sample answer was not provided by the AI.";
    console.warn(
      `Added missing sample answer for open-ended question ${index + 1}`
    );
  }
}

/**
 * Validates case study questions
 */
function validateCaseStudyQuestion(question, index, level) {
  if (!question.scenario) {
    question.scenario =
      level === "advanced"
        ? "Advanced scenario not provided."
        : "Scenario not provided.";
  }
  if (!question.sampleAnswer) {
    question.sampleAnswer = "Sample answer was not provided.";
  }
  if (question.type === "case_study") {
    question.type = `case_study_${level}`;
  }
}

/**
 * Creates default multiple choice options
 */
function createDefaultMultipleChoiceOptions() {
  return [
    { id: "a", text: "Option A", correct: true },
    { id: "b", text: "Option B", correct: false },
    { id: "c", text: "Option C", correct: false },
    { id: "d", text: "Option D", correct: false },
  ];
}

/**
 * Validates evaluation response structure
 * @param {Object} evaluation - Evaluation object to validate
 * @returns {boolean} True if valid
 */
export function validateEvaluation(evaluation) {
  return (
    typeof evaluation.score === "number" &&
    typeof evaluation.feedback === "string" &&
    typeof evaluation.isCorrect === "boolean"
  );
}

/**
 * Validates brief response structure
 * @param {Object} brief - Brief object to validate
 * @returns {boolean} True if valid
 */
export function validateBrief(brief) {
  return (
    brief.pageSummaries &&
    Array.isArray(brief.pageSummaries) &&
    brief.pageSummaries.length > 0
  );
}
