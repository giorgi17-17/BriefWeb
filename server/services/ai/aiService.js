/**
 * Main AI Service Orchestrator
 * Coordinates all AI-related operations
 */

import { generateFlashcards } from "./flashcardService.js";
import { generateQuiz } from "./quizService.js";
import { evaluateOpenEndedAnswer } from "./evaluationService.js";
import { generateMultiPageBrief } from "./briefService.js";
import { withErrorHandling } from "../../utils/ai/errorHandler.js";

/**
 * AI Service class that orchestrates all AI operations
 */
class AIService {
  constructor() {
    // Wrap all methods with error handling
    this.generateFlashcards = withErrorHandling(
      generateFlashcards,
      "flashcards"
    );
    this.generateQuiz = withErrorHandling(generateQuiz, "quiz");
    this.evaluateOpenEndedAnswer = withErrorHandling(
      evaluateOpenEndedAnswer,
      "evaluation"
    );
    this.generateMultiPageBrief = withErrorHandling(
      generateMultiPageBrief,
      "brief"
    );
  }

  /**
   * Gets service status and configuration
   * @returns {Object} Service status information
   */
  getStatus() {
    return {
      status: "operational",
      services: {
        flashcards: true,
        quiz: true,
        evaluation: true,
        brief: true,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

// Create singleton instance
const aiService = new AIService();

// Export individual functions for backward compatibility
export {
  generateFlashcards,
  generateQuiz,
  evaluateOpenEndedAnswer,
  generateMultiPageBrief,
};

// Export the service instance as default
export default aiService;
