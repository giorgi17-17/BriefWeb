/**
 * Answer Evaluation Service
 */

import { geminiAI, geminiModel } from "../../config/gemini.js";
import {
  detectLanguageFromMultiple,
  getLanguageFallback,
} from "../../utils/ai/languageUtils.js";
import { parseJsonWithFallbacks } from "../../utils/ai/jsonUtils.js";
import { validateEvaluation } from "../../utils/ai/validationUtils.js";
import { logAIError } from "../../utils/ai/errorHandler.js";
import {
  createFallbackEvaluation,
  handleInvalidResponse,
} from "../../utils/ai/fallbackStrategies.js";
import { getEvaluationPrompt } from "../../config/ai/promptTemplates.js";
import { GENERATION_CONFIG } from "../../config/ai/aiConfig.js";
import {
  trackActualCostFromResponse,
  countInputTokens,
} from "../../utils/ai/tokenUtils.js";

/**
 * Evaluates an open-ended answer using AI
 * @param {string} questionText - The question text
 * @param {string} modelAnswer - The model/expected answer
 * @param {string} userAnswer - The user's answer to evaluate
 * @returns {Promise<Object>} Evaluation result with score, feedback, and correctness
 */
export async function evaluateOpenEndedAnswer(
  questionText,
  modelAnswer,
  userAnswer
) {
  try {
    console.log("Evaluating open-ended answer with AI...");

    // Check if user provided an answer
    if (!userAnswer || userAnswer.trim() === "") {
      const language = detectLanguageFromMultiple(questionText, modelAnswer);
      return createFallbackEvaluation(language, false);
    }

    // Detect language from all text sources
    const language = detectLanguageFromMultiple(
      questionText,
      modelAnswer,
      userAnswer
    );
    console.log(`Detected language for evaluation: ${language}`);

    // Generate prompt
    const prompt = getEvaluationPrompt(
      language,
      questionText,
      modelAnswer,
      userAnswer
    );

    // Count input tokens using Gemini API
    console.log("🔍 Counting input tokens for evaluation...");
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
        temperature: GENERATION_CONFIG.evaluation.temperature,
      },
    });

    // Track actual costs using real token data
    const costTracking = trackActualCostFromResponse(
      "evaluation",
      response,
      inputTokenCount
    );

    let evaluationContent = response.text;
    console.log(
      "Raw evaluation content:",
      evaluationContent.substring(0, 200) + "..."
    );

    // Handle conversational responses
    if (!evaluationContent.startsWith("{")) {
      console.warn("Response is not JSON, providing fallback evaluation");
      return createFallbackEvaluation(language, true);
    }

    // Parse JSON response
    const parsedEvaluation = parseJsonWithFallbacks(evaluationContent, {
      logErrors: true,
      maxAttempts: 2,
    });

    if (!parsedEvaluation) {
      console.error("Failed to parse evaluation response");
      return createFallbackEvaluation(language, true);
    }

    // Validate evaluation structure
    if (!validateEvaluation(parsedEvaluation)) {
      throw new Error("Invalid evaluation format");
    }

    // Check for AI refusal patterns
    const refusalPhrases = [
      "cannot evaluate",
      "unable to evaluate",
      "don't understand",
      "provide the student's answer",
    ];

    const hasRefusal = refusalPhrases.some((phrase) =>
      parsedEvaluation.feedback.toLowerCase().includes(phrase)
    );

    if (hasRefusal) {
      return handleInvalidResponse(
        "evaluation",
        parsedEvaluation.feedback,
        language
      );
    }

    // Validate feedback language matches expected language
    const feedbackHasGeorgian = /[\u10A0-\u10FF]/.test(
      parsedEvaluation.feedback
    );
    if (language === "Georgian" && !feedbackHasGeorgian) {
      console.warn(
        "Feedback doesn't contain Georgian characters even though content is in Georgian"
      );
      parsedEvaluation.feedback = getLanguageFallback(language, "evaluation");
    }

    return parsedEvaluation;
  } catch (error) {
    logAIError("evaluation", error, {
      questionLength: questionText?.length,
      modelAnswerLength: modelAnswer?.length,
      userAnswerLength: userAnswer?.length,
    });

    // Return fallback evaluation
    const fallbackLanguage = detectLanguageFromMultiple(
      questionText,
      modelAnswer,
      userAnswer
    );
    return createFallbackEvaluation(fallbackLanguage, true);
  }
}
