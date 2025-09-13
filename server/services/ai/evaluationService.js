/**
 * Answer Evaluation Service
 */

import { geminiAI, geminiModel } from "../../config/gemini.js";
import {
  detectLanguageFromMultiple,
  getLanguageFallback,
} from "../../utils/ai/languageUtils.js";
import { parseJsonWithFallbacks } from "../../utils/ai/jsonUtils.js";
// import { validateEvaluation } from "../../utils/ai/validationUtils.js";
import { logAIError } from "../../utils/ai/errorHandler.js";
import {
  createFallbackEvaluation,
  handleInvalidResponse,
} from "../../utils/ai/fallbackStrategies.js";
import { buildOpenAnswerEvalPrompt } from "../../config/ai/promptTemplates.js";
import { GENERATION_CONFIG } from "../../config/ai/aiConfig.js";
import {
  trackActualCostFromResponse,
  countInputTokens,
} from "../../utils/ai/tokenUtils.js";

import { isEmptyAnswer, normalizeWeights, extractJsonObject, validateEvaluation } from '../../utils/helpers.js'

/**
 * @param {string} questionText
 * @param {string} modelAnswer
 * @param {string} userAnswer
 * @param {{
 *   languageOverride?: string,
 *   weights?: { accuracy?: number, completeness?: number, understanding?: number, clarity?: number },
 *   strict?: boolean
 * }} options
 */
export async function evaluateOpenEndedAnswer(questionText, modelAnswer, userAnswer, options = {}) {
  try {
    console.log("Evaluating open-ended answer with AI…");

    const lang =
      options.languageOverride ||
      detectLanguageFromMultiple(questionText, modelAnswer, userAnswer) ||
      "English";

    // If there's no meaningful answer, return a full structured fallback
    if (isEmptyAnswer(userAnswer)) {
      return createFallbackEvaluation({ language: lang, hasUserAnswer: false, modelAnswer });
    }

    // Normalize weights with sane defaults (sum ~= 100)
    const weights = normalizeWeights(options.weights);

    // Build prompt
    const prompt = buildOpenAnswerEvalPrompt({
      language: lang,
      questionText,
      modelAnswer,
      userAnswer,
      weights,
      strict: !!options.strict,
    });

    // Token counting (optional but kept if util exists)
    const inputTokenCount = await countInputTokens(geminiModel, prompt).catch(() => ({
      hasActualCount: false,
      inputTokens: 0,
    }));
    if (inputTokenCount?.hasActualCount) {
      console.log(`Input tokens: ${inputTokenCount.inputTokens}`);
    }

    // Call Gemini
    const response = await geminiAI.models.generateContent({
      model: geminiModel,
      contents: prompt,
      generationConfig: {
        temperature: GENERATION_CONFIG?.evaluation?.temperature ?? 0.2,
      },
    });

    // Extract text safely (Gemini SDKs differ; keep this generic)
    let raw = response?.text ?? response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!raw || typeof raw !== "string") {
      console.warn("Empty model response; returning fallback.");
      return createFallbackEvaluation({ language: lang, hasUserAnswer: true, modelAnswer });
    }

    // Try to extract a JSON object from the response
    const jsonCandidate = extractJsonObject(raw);
    if (!jsonCandidate) {
      console.warn("Model response is not JSON; returning fallback.");
      return createFallbackEvaluation({ language: lang, hasUserAnswer: true, modelAnswer });
    }

    // Parse with your repair helper (or JSON.parse)
    const parsed = parseJsonWithFallbacks
      ? parseJsonWithFallbacks(jsonCandidate, { logErrors: true, maxAttempts: 2 })
      : JSON.parse(jsonCandidate);

    if (!validateEvaluation(parsed)) {
      console.warn("Invalid evaluation format; returning fallback.");
      return createFallbackEvaluation({ language: lang, hasUserAnswer: true, modelAnswer });
    }

    // Language sanity check (very light; extend as needed)
    if (lang === "Georgian") {
      const hasGe = /[\u10A0-\u10FF]/.test(parsed.feedback || "") || /[\u10A0-\u10FF]/.test(parsed.improved_answer || "");
      if (!hasGe) {
        console.warn("Feedback/improved_answer not in Georgian; applying language fallback message.");
        parsed.feedback = getLanguageFallback(lang, "evaluation") || parsed.feedback;
      }
    }

    return parsed;
  } catch (error) {
    logAIError?.("evaluation", error, {
      questionLength: questionText?.length,
      modelAnswerLength: modelAnswer?.length,
      userAnswerLength: userAnswer?.length,
    });
    const lang = options.languageOverride || detectLanguageFromMultiple(questionText, modelAnswer, userAnswer) || "English";
    return createFallbackEvaluation({ language: lang, hasUserAnswer: true, modelAnswer });
  }
}
