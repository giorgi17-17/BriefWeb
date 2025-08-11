/**
 * Flashcard Generation Service
 */

import { geminiAI, geminiModel } from "../../config/gemini.js";
import {
  detectLanguage,
  validateResponseLanguage,
} from "../../utils/ai/languageUtils.js";
import { parseJsonWithFallbacks } from "../../utils/ai/jsonUtils.js";
import { validateFlashcards } from "../../utils/ai/validationUtils.js";
import { logAIError, handleParseError } from "../../utils/ai/errorHandler.js";
import { createFallbackFlashcards } from "../../utils/ai/fallbackStrategies.js";
import { getFlashcardPrompt } from "../../config/ai/promptTemplates.js";
import { GENERATION_CONFIG } from "../../config/ai/aiConfig.js";
import {
  estimateTokenUsage,
  logServiceCost,
  trackActualCostFromResponse,
  countInputTokens,
} from "../../utils/ai/tokenUtils.js";

/**
 * Generates flashcards from extracted text using AI
 * @param {string} extractedText - Text to generate flashcards from
 * @returns {Promise<Array>} Array of flashcards with questions and answers
 */
export async function generateFlashcards(extractedText) {
  try {
    console.log("Generating flashcards with Gemini API...");

    // Detect language
    const textLanguage = detectLanguage(extractedText);
    console.log(`Detected language is ${textLanguage}`);

    // Generate prompt
    const prompt = getFlashcardPrompt(textLanguage, extractedText);

    // Count input tokens using Gemini API
    console.log("🔍 Counting input tokens...");
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
        temperature: GENERATION_CONFIG.flashcards.temperature,
      },
    });

    console.log("Received response from Gemini API");

    // Track actual costs using real token data
    const costTracking = trackActualCostFromResponse(
      "flashcard",
      response,
      inputTokenCount
    );

    // Get response text
    let flashcardsContent = response.text;
    console.log(
      "Raw text response:",
      typeof flashcardsContent,
      flashcardsContent
        ? flashcardsContent.substring(0, 100) + "..."
        : "null or empty"
    );

    // Validate language of response
    const languageValidation = validateResponseLanguage(
      textLanguage,
      flashcardsContent
    );
    if (!languageValidation.isValid) {
      languageValidation.warnings.forEach((warning) => console.warn(warning));
    }

    // Parse JSON response
    const parsedFlashcards = parseJsonWithFallbacks(flashcardsContent, {
      logErrors: true,
      maxAttempts: 3,
    });

    if (!parsedFlashcards) {
      throw new Error(
        "Failed to parse Gemini response after multiple attempts"
      );
    }

    // Validate and transform flashcards
    const flashcardsWithId = validateFlashcards(parsedFlashcards);

    console.log(`Successfully generated ${flashcardsWithId.length} flashcards`);

    if (response.promptFeedback) {
      console.log("Prompt Feedback:", response.promptFeedback);
    }

    return flashcardsWithId;
  } catch (error) {
    if (error.message && error.message.includes("parse")) {
      handleParseError("flashcard", error, response?.text);
    } else {
      logAIError("flashcard", error, {
        input: extractedText,
        rawResponse: response?.text,
      });
    }

    // Return fallback flashcards
    const fallbackLanguage = detectLanguage(extractedText);
    return createFallbackFlashcards(fallbackLanguage);
  }
}
