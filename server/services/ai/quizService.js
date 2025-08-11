/**
 * Quiz Generation Service
 */

import { geminiAI, geminiModel } from "../../config/gemini.js";
import { parseJsonWithFallbacks } from "../../utils/ai/jsonUtils.js";
import { validateQuiz } from "../../utils/ai/validationUtils.js";
import { logAIError, handleParseError } from "../../utils/ai/errorHandler.js";
import { createFallbackQuiz } from "../../utils/ai/fallbackStrategies.js";
import { getQuizPrompt } from "../../config/ai/promptTemplates.js";
import { GENERATION_CONFIG } from "../../config/ai/aiConfig.js";
import {
  estimateTokenUsage,
  logServiceCost,
  trackActualCostFromResponse,
  countInputTokens,
} from "../../utils/ai/tokenUtils.js";

/**
 * Generates a quiz from extracted text using AI
 * @param {string} extractedText - Text to generate quiz from
 * @param {Object} quizOptions - Options for quiz generation
 * @returns {Promise<Object>} Generated quiz with questions
 */
export async function generateQuiz(extractedText, quizOptions = {}) {
  try {
    console.log("Generating quiz with options:", quizOptions);

    // Generate prompt
    const prompt = getQuizPrompt(extractedText, quizOptions);

    // Count input tokens using Gemini API
    console.log("🔍 Counting input tokens for quiz...");
    const inputTokenCount = await countInputTokens(geminiModel, prompt);

    if (inputTokenCount.hasActualCount) {
      console.log(
        `✅ Actual input tokens: ${inputTokenCount.inputTokens.toLocaleString()}`
      );
    } else {
      console.log(
        `⚠️ Estimated input tokens: ${inputTokenCount.inputTokens.toLocaleString()}`
      );
    }

    // Call AI API
    const response = await geminiAI.models.generateContent({
      model: geminiModel,
      contents: prompt,
      generationConfig: {
        temperature: GENERATION_CONFIG.quiz.temperature,
      },
    });

    // Track actual costs using real token data
    const costTracking = trackActualCostFromResponse(
      "quiz",
      response,
      inputTokenCount
    );

    let quizContent = response.text;
    console.log("Raw quiz content length:", quizContent.length);
    console.log("Quiz content preview:", quizContent.substring(0, 200) + "...");

    // Parse JSON response with multiple attempts
    const parsedQuiz = parseJsonWithFallbacks(quizContent, {
      logErrors: true,
      maxAttempts: 3,
    });

    if (!parsedQuiz) {
      console.error("Failed to parse quiz after all attempts");
      return createFallbackQuiz(quizOptions);
    }

    // Validate and fix quiz structure
    try {
      const validatedQuiz = validateQuiz(parsedQuiz);

      if (response.promptFeedback) {
        console.log("Prompt Feedback:", response.promptFeedback);
      }

      return validatedQuiz;
    } catch (validationError) {
      console.error("Quiz validation error:", validationError);
      return createFallbackQuiz(quizOptions);
    }
  } catch (error) {
    if (error.message && error.message.includes("parse")) {
      handleParseError("quiz", error, response?.text);
    } else {
      logAIError("quiz", error, {
        input: extractedText,
        rawResponse: response?.text,
        options: quizOptions,
      });
    }

    // Return fallback quiz
    return createFallbackQuiz(quizOptions);
  }
}
