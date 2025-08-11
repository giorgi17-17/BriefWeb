/**
 * Brief Generation Service
 */

import { geminiAI, geminiModel } from "../../config/gemini.js";
import { detectLanguage } from "../../utils/ai/languageUtils.js";
import { parseJsonWithFallbacks } from "../../utils/ai/jsonUtils.js";
import { validateBrief } from "../../utils/ai/validationUtils.js";
import { logAIError, handleParseError } from "../../utils/ai/errorHandler.js";
import { createFallbackBrief } from "../../utils/ai/fallbackStrategies.js";
import { getBriefPrompt } from "../../config/ai/promptTemplates.js";
import {
  estimateTokenUsage,
  shouldUseMultiPageOptimization,
  logOptimizationMetrics,
  trackActualCostFromResponse,
  countInputTokens,
} from "../../utils/ai/tokenUtils.js";
import {
  GENERATION_CONFIG,
  OPTIMIZATION_CONFIG,
} from "../../config/ai/aiConfig.js";

/**
 * Generates a multi-page brief using optimized token usage
 * @param {Array<string>} allPages - Array of page texts
 * @returns {Promise<Object>} Brief with page summaries
 */
export async function generateMultiPageBrief(allPages) {
  console.log("Generating multi-page brief with optimized token usage...");
  console.log(`Processing ${allPages.length} pages in a single AI call`);

  try {
    // Combine all pages into a single text with clear separators
    const combinedText = allPages
      .map((pageText, index) => {
        const cleanedPage = pageText.trim();
        if (!cleanedPage) return null;
        return `=== PAGE ${index + 1} ===\n${cleanedPage}\n`;
      })
      .filter(Boolean)
      .join("\n");

    console.log(`Combined text length: ${combinedText.length} characters`);

    // Detect language from the first non-empty page
    const firstPage = allPages.find((page) => page.trim().length > 0) || "";
    const textLanguage = detectLanguage(firstPage);
    console.log(`Detected language is ${textLanguage}`);

    // Generate prompt
    const prompt = getBriefPrompt(textLanguage, combinedText);

    // Count input tokens using Gemini API
    console.log("🔍 Counting input tokens for brief...");
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
        temperature: GENERATION_CONFIG.brief.temperature,
      },
    });

    console.log("Received AI response for multi-page brief");

    // Track actual costs using real token data
    const costTracking = trackActualCostFromResponse(
      "brief",
      response,
      inputTokenCount
    );

    let responseText = response.text;
    console.log("Raw response length:", responseText.length);

    // Parse JSON response
    const parsedResponse = parseJsonWithFallbacks(responseText, {
      logErrors: true,
      maxAttempts: 2,
    });

    if (!parsedResponse) {
      console.error("Failed to parse brief response");
      return createFallbackBrief(allPages, "Failed to parse AI response");
    }

    // Validate the parsed response
    if (!validateBrief(parsedResponse)) {
      throw new Error(
        "Invalid response format: missing or invalid pageSummaries"
      );
    }

    // Ensure we have summaries for all pages
    const expectedPageCount = allPages.filter(
      (page) => page.trim().length > 0
    ).length;
    const actualPageCount = parsedResponse.pageSummaries.length;

    if (actualPageCount < expectedPageCount) {
      console.warn(
        `Expected ${expectedPageCount} page summaries, got ${actualPageCount}`
      );

      // Add fallback summaries for missing pages
      for (let i = actualPageCount; i < expectedPageCount; i++) {
        const pageText = allPages[i].trim();
        if (pageText) {
          parsedResponse.pageSummaries.push({
            pageNumber: i + 1,
            summary: `Page ${i + 1}: ${pageText.substring(0, 200)}${
              pageText.length > 200 ? "..." : ""
            }`,
          });
        }
      }
    }

    console.log(
      `Successfully generated ${parsedResponse.pageSummaries.length} page summaries`
    );
    return parsedResponse;
  } catch (error) {
    if (error.message && error.message.includes("parse")) {
      handleParseError("brief", error, response?.text);
    } else {
      logAIError("brief", error, {
        pageCount: allPages.length,
        totalLength: allPages.reduce((sum, page) => sum + page.length, 0),
        rawResponse: response?.text,
      });
    }

    // Create fallback summaries
    return createFallbackBrief(allPages, error.message);
  }
}
