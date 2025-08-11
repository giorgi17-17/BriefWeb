/**
 * Token usage monitoring and optimization utilities
 */

import { COST_CONFIG } from "../../config/ai/aiConfig.js";

/**
 * Enhanced cost configuration with accurate Gemini API pricing
 * Based on Google AI Studio pricing as of 2024
 */
export const GEMINI_COST_CONFIG = {
  // Gemini 2.0 Flash Lite pricing for PAID TIER
  costPer1MInputTokens: 0.075, // $0.075 per 1M tokens
  costPer1MOutputTokens: 0.3, // $0.30 per 1M tokens

  // Paid tier has much higher limits (for reference only)
  paidTierRequestsPerMinute: 1000, // Much higher limits
  paidTierTokensPerMinute: 4000000, // 4M tokens per minute
};

/**
 * Advanced token counting with multiple strategies
 * Implements several approaches to get accurate token counts
 * @param {string} modelName - Gemini model name
 * @param {string|Array} content - Content to count tokens for
 * @returns {Promise<Object>} Token count result
 */
export async function countInputTokens(modelName, content) {
  console.log("🔍 Attempting advanced token counting...");

  // Strategy 1: Try Gemini countTokens API (if available)
  try {
    const { geminiAI } = await import("../../config/gemini.js");
    const model = geminiAI.getGenerativeModel({ model: modelName });

    // Check if countTokens method exists
    if (typeof model.countTokens === "function") {
      console.log("   • Trying Gemini countTokens API...");
      const result = await model.countTokens(content);

      if (result && (result.totalTokens || result.total_tokens)) {
        const tokens = result.totalTokens || result.total_tokens;
        console.log(`   ✅ Success with countTokens API: ${tokens} tokens`);
        return {
          inputTokens: tokens,
          hasActualCount: true,
          source: "gemini_count_tokens_api",
        };
      }
    } else {
      console.log("   ⚠️ countTokens method not available in this version");
    }
  } catch (error) {
    console.log(`   ❌ countTokens API failed: ${error.message}`);
  }

  // Strategy 2: Use improved estimation based on Gemini's actual tokenization
  console.log("   • Using improved estimation...");
  const textContent =
    typeof content === "string"
      ? content
      : Array.isArray(content)
      ? extractTextFromContent(content)
      : String(content);

  const tokenCount = estimateTokensAccurately(textContent);

  console.log(`   ✅ Estimated tokens: ${tokenCount}`);
  return {
    inputTokens: tokenCount,
    hasActualCount: false,
    source: "improved_estimation",
    method: "character_analysis",
  };
}

/**
 * Extract text content from various content formats
 * @param {Array|Object|string} content - Content in various formats
 * @returns {string} Extracted text
 */
function extractTextFromContent(content) {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && item.text) return item.text;
        if (item && item.parts) return extractTextFromContent(item.parts);
        return String(item);
      })
      .join(" ");
  }

  if (content && typeof content === "object") {
    if (content.text) return content.text;
    if (content.parts) return extractTextFromContent(content.parts);
  }

  return String(content);
}

/**
 * Improved token estimation based on Gemini's actual tokenization patterns
 * Uses more sophisticated analysis than simple character counting
 * @param {string} text - Text to analyze
 * @returns {number} Estimated token count
 */
function estimateTokensAccurately(text) {
  if (!text || text.length === 0) return 0;

  // Detect language
  const containsGeorgian = /[\u10A0-\u10FF]/.test(text);
  const containsCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(text);

  // Base ratios based on research of Gemini tokenization
  let baseRatio;
  if (containsGeorgian) {
    baseRatio = 1.8; // Georgian: ~1.8 chars per token
  } else if (containsCJK) {
    baseRatio = 2.5; // CJK languages: ~2.5 chars per token
  } else {
    baseRatio = 3.8; // English/Latin: ~3.8 chars per token
  }

  // Adjust for content characteristics
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const avgWordLength =
    words.length > 0
      ? words.reduce((sum, word) => sum + word.length, 0) / words.length
      : 0;

  // Shorter words = more tokens, longer words = fewer tokens
  let lengthAdjustment = 1.0;
  if (avgWordLength < 4) {
    lengthAdjustment = 1.2; // More tokens for short words
  } else if (avgWordLength > 8) {
    lengthAdjustment = 0.85; // Fewer tokens for long words
  }

  // Adjust for special characters and formatting
  const specialChars = (text.match(/[^\w\s]/g) || []).length;
  const specialCharAdjustment = Math.min(specialChars * 0.01, 0.2); // Max 20% increase

  // Calculate final token count
  const adjustedRatio = baseRatio * lengthAdjustment;
  const estimatedTokens = Math.ceil(
    text.length / adjustedRatio + specialCharAdjustment
  );

  return Math.max(1, estimatedTokens); // Minimum 1 token
}

/**
 * Enhanced extraction of actual token usage from Gemini API response
 * Handles multiple response formats and provides detailed debugging
 * @param {Object} response - Gemini API response object
 * @returns {Object} Actual token usage data
 */
export function extractActualTokenUsage(response) {
  console.log("🔍 Extracting token usage from API response...");

  try {
    // Debug: Log response structure
    if (response) {
      console.log("   • Response keys:", Object.keys(response));
    } else {
      console.warn("   ❌ No response object provided");
      return createEmptyUsage("no_response");
    }

    // Strategy 1: Check for usageMetadata (most common)
    if (response.usageMetadata) {
      console.log(
        "   • Found usageMetadata:",
        Object.keys(response.usageMetadata)
      );

      const usage = response.usageMetadata;

      // Handle different property name formats
      const inputTokens =
        usage.promptTokenCount || usage.prompt_token_count || 0;
      const outputTokens =
        usage.candidatesTokenCount || usage.candidates_token_count || 0;
      const totalTokens =
        usage.totalTokenCount ||
        usage.total_token_count ||
        inputTokens + outputTokens;

      if (inputTokens > 0 || outputTokens > 0) {
        console.log(
          `   ✅ Extracted: ${inputTokens} input, ${outputTokens} output, ${totalTokens} total`
        );
        return {
          inputTokens,
          outputTokens,
          totalTokens,
          hasActualCounts: true,
          source: "gemini_usage_metadata",
          rawMetadata: usage,
        };
      } else {
        console.warn("   ⚠️ usageMetadata found but all counts are 0");
      }
    }

    // Strategy 2: Check for alternative metadata locations
    if (response.metadata && response.metadata.usage) {
      console.log("   • Trying alternative metadata location...");
      const usage = response.metadata.usage;
      const inputTokens = usage.inputTokens || usage.input_tokens || 0;
      const outputTokens = usage.outputTokens || usage.output_tokens || 0;

      if (inputTokens > 0 || outputTokens > 0) {
        console.log(
          `   ✅ Found in metadata.usage: ${inputTokens} input, ${outputTokens} output`
        );
        return {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          hasActualCounts: true,
          source: "alternative_metadata",
        };
      }
    }

    // Strategy 3: Check if it's embedded in candidates
    if (response.candidates && response.candidates.length > 0) {
      console.log("   • Checking candidates for token info...");
      for (const candidate of response.candidates) {
        if (candidate.tokenCount || candidate.token_count) {
          const tokens = candidate.tokenCount || candidate.token_count;
          console.log(`   ✅ Found token count in candidate: ${tokens}`);
          return {
            inputTokens: 0, // Unknown from this source
            outputTokens: tokens,
            totalTokens: tokens,
            hasActualCounts: true,
            source: "candidate_token_count",
          };
        }
      }
    }

    // Strategy 4: Log full response for debugging
    console.log("   ❌ No token usage found in response");
    console.log("   🔍 Full response structure for debugging:");
    console.log(JSON.stringify(response, null, 2));

    return createEmptyUsage("no_token_data");
  } catch (error) {
    console.error("   ❌ Error extracting token usage:", error.message);
    return createEmptyUsage("extraction_error", error.message);
  }
}

/**
 * Creates empty usage object with error information
 * @param {string} source - Source of the issue
 * @param {string} error - Optional error message
 * @returns {Object} Empty usage object
 */
function createEmptyUsage(source, error = null) {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    hasActualCounts: false,
    source,
    error,
    debugInfo: "Check console logs for response structure details",
  };
}

/**
 * Calculates actual cost based on real token usage
 * @param {Object} actualUsage - Actual token usage from API response
 * @param {boolean} isPaidTier - Whether using paid tier
 * @returns {Object} Detailed cost breakdown
 */
export function calculateActualCost(actualUsage, isPaidTier = true) {
  // Always use paid tier pricing since user is on paid plan
  const config = {
    inputCostPerMillion: GEMINI_COST_CONFIG.costPer1MInputTokens,
    outputCostPerMillion: GEMINI_COST_CONFIG.costPer1MOutputTokens,
  };

  const inputCost =
    (actualUsage.inputTokens / 1000000) * config.inputCostPerMillion;
  const outputCost =
    (actualUsage.outputTokens / 1000000) * config.outputCostPerMillion;
  const totalCost = inputCost + outputCost;

  return {
    inputTokens: actualUsage.inputTokens,
    outputTokens: actualUsage.outputTokens,
    totalTokens: actualUsage.totalTokens,
    inputCost,
    outputCost,
    totalCost,
    isPaidTier,
    hasActualCounts: actualUsage.hasActualCounts,
    pricing: {
      inputCostPerMillion: config.inputCostPerMillion,
      outputCostPerMillion: config.outputCostPerMillion,
    },
  };
}

/**
 * Enhanced logging for actual token usage and costs
 * @param {string} serviceType - Type of service
 * @param {Object} actualCost - Actual cost calculation result
 * @param {Object} estimatedCost - Previous estimated cost for comparison
 */
export function logActualVsEstimatedCost(
  serviceType,
  actualCost,
  estimatedCost = null
) {
  console.log("\n" + "🔍".repeat(50));
  console.log(`🔍 ACTUAL COST ANALYSIS FOR ${serviceType.toUpperCase()}`);
  console.log("🔍".repeat(50));

  console.log("\n📊 ACTUAL TOKEN USAGE:");
  console.log(`   • Input tokens: ${actualCost.inputTokens.toLocaleString()}`);
  console.log(
    `   • Output tokens: ${actualCost.outputTokens.toLocaleString()}`
  );
  console.log(`   • Total tokens: ${actualCost.totalTokens.toLocaleString()}`);
  console.log(
    `   • Data source: ${
      actualCost.hasActualCounts ? "API Response" : "Estimated"
    }`
  );

  if (actualCost.isPaidTier) {
    console.log("\n💰 ACTUAL COST (PAID TIER):");
    console.log(`   • Input cost: $${actualCost.inputCost.toFixed(6)}`);
    console.log(`   • Output cost: $${actualCost.outputCost.toFixed(6)}`);
    console.log(`   • Total cost: $${actualCost.totalCost.toFixed(6)}`);
  } else {
    console.log("\n🆓 COST STATUS:");
    console.log(`   • Tier: FREE`);
    console.log(`   • Input cost: $0.00 (Free tier)`);
    console.log(`   • Output cost: $0.00 (Free tier)`);
    console.log(`   • Total cost: $0.00`);
  }

  if (estimatedCost && actualCost.hasActualCounts) {
    console.log("\n📈 ESTIMATION ACCURACY:");
    const tokenAccuracy =
      actualCost.totalTokens > 0
        ? (Math.min(estimatedCost.totalTokens, actualCost.totalTokens) /
            Math.max(estimatedCost.totalTokens, actualCost.totalTokens)) *
          100
        : 0;
    console.log(
      `   • Estimated tokens: ${estimatedCost.totalTokens.toLocaleString()}`
    );
    console.log(
      `   • Actual tokens: ${actualCost.totalTokens.toLocaleString()}`
    );
    console.log(`   • Accuracy: ${tokenAccuracy.toFixed(1)}%`);

    if (actualCost.isPaidTier && estimatedCost.totalCost) {
      const costAccuracy =
        actualCost.totalCost > 0
          ? (Math.min(estimatedCost.totalCost, actualCost.totalCost) /
              Math.max(estimatedCost.totalCost, actualCost.totalCost)) *
            100
          : 0;
      console.log(
        `   • Estimated cost: $${estimatedCost.totalCost.toFixed(6)}`
      );
      console.log(`   • Actual cost: $${actualCost.totalCost.toFixed(6)}`);
      console.log(`   • Cost accuracy: ${costAccuracy.toFixed(1)}%`);
    }
  }

  console.log("🔍".repeat(50));
}

/**
 * Estimates token usage for text and prompts with detailed cost breakdown
 * @deprecated Use trackActualCost() after API call for accurate costs
 * @param {string} text - The main text content
 * @param {string} promptTemplate - The prompt template text
 * @param {string} serviceType - Type of service (flashcard, quiz, evaluation, brief)
 * @returns {Object} Token usage estimation details
 */
export function estimateTokenUsage(
  text,
  promptTemplate = "",
  serviceType = "general"
) {
  console.log("\n" + "=".repeat(80));
  console.log(`💰 COST CALCULATION FOR ${serviceType.toUpperCase()} SERVICE`);
  console.log("=".repeat(80));

  // Detect language and get appropriate token ratio
  const containsGeorgian = /[\u10A0-\u10FF]/.test(text);
  const language = containsGeorgian ? "Georgian" : "English";
  const charToTokenRatio = containsGeorgian
    ? COST_CONFIG.georgianCharsPerToken
    : COST_CONFIG.englishCharsPerToken;

  console.log(`📝 Language detected: ${language}`);
  console.log(
    `📊 Character-to-token ratio: ${charToTokenRatio} chars per token`
  );

  // Calculate input tokens
  const inputTextTokens = Math.ceil(text.length / charToTokenRatio);
  const promptTokens = Math.ceil(promptTemplate.length / charToTokenRatio);
  const totalInputTokens = inputTextTokens + promptTokens;

  // Estimate response tokens based on service type
  let responseTokenRatio = COST_CONFIG.responseTokenRatio;
  switch (serviceType) {
    case "flashcard":
      responseTokenRatio = 0.4; // Flashcards generate more content
      break;
    case "quiz":
      responseTokenRatio = 0.5; // Quizzes are content-heavy
      break;
    case "evaluation":
      responseTokenRatio = 0.1; // Evaluations are shorter
      break;
    case "brief":
      responseTokenRatio = 0.6; // Briefs are very detailed
      break;
  }

  const estimatedResponseTokens = Math.ceil(
    totalInputTokens * responseTokenRatio
  );
  const totalTokens = totalInputTokens + estimatedResponseTokens;

  // Calculate costs
  const inputCost =
    (totalInputTokens / 1000) * COST_CONFIG.costPerThousandTokens;
  const outputCost =
    (estimatedResponseTokens / 1000) * COST_CONFIG.costPerThousandTokens;
  const totalCost = inputCost + outputCost;

  // Log detailed breakdown
  console.log("\n📥 INPUT ANALYSIS:");
  console.log(
    `   • File/Text content: ${text.length.toLocaleString()} characters → ${inputTextTokens.toLocaleString()} tokens`
  );
  console.log(
    `   • Prompt template: ${promptTemplate.length.toLocaleString()} characters → ${promptTokens.toLocaleString()} tokens`
  );
  console.log(
    `   • Total input tokens: ${totalInputTokens.toLocaleString()} tokens`
  );
  console.log(`   • Input cost: $${inputCost.toFixed(6)}`);

  console.log("\n📤 OUTPUT ESTIMATION:");
  console.log(
    `   • Response ratio for ${serviceType}: ${(
      responseTokenRatio * 100
    ).toFixed(1)}% of input`
  );
  console.log(
    `   • Estimated response tokens: ${estimatedResponseTokens.toLocaleString()} tokens`
  );
  console.log(`   • Output cost: $${outputCost.toFixed(6)}`);

  console.log("\n💵 TOTAL COST BREAKDOWN:");
  console.log(`   • Total tokens: ${totalTokens.toLocaleString()} tokens`);
  console.log(`   • Rate: $${COST_CONFIG.costPerThousandTokens}/1K tokens`);
  console.log(`   • Total estimated cost: $${totalCost.toFixed(6)}`);

  const result = {
    language,
    charToTokenRatio,
    inputTextTokens,
    promptTokens,
    totalInputTokens,
    estimatedResponseTokens,
    totalTokens,
    inputCost,
    outputCost,
    totalCost,
    serviceType,
    // Legacy fields for compatibility
    textTokens: inputTextTokens,
    costEstimate: totalCost,
  };

  console.log("=".repeat(80));
  return result;
}

/**
 * Checks if content should use multi-page optimization
 * @param {Array} pages - Array of page content
 * @param {Object} config - Optimization configuration
 * @returns {boolean} Whether to use multi-page optimization
 */
export function shouldUseMultiPageOptimization(pages, config) {
  const validPages = pages.filter((page) => page.trim().length > 0);
  const totalContentSize = validPages.reduce(
    (sum, page) => sum + page.length,
    0
  );

  return (
    validPages.length >= config.MIN_PAGES_FOR_OPTIMIZATION &&
    totalContentSize <= config.MAX_CONTENT_SIZE_FOR_SINGLE_CALL &&
    validPages.length <= config.MAX_PAGES_FOR_SINGLE_CALL
  );
}

/**
 * Logs token optimization metrics with detailed cost comparison
 * @param {Array} pages - Array of pages being processed
 * @param {Object} tokenEstimate - Token estimation object
 */
export function logOptimizationMetrics(pages, tokenEstimate) {
  console.log("\n" + "🚀".repeat(40));
  console.log("🚀 MULTI-PAGE OPTIMIZATION ANALYSIS");
  console.log("🚀".repeat(40));

  const pageCount = pages.length;
  const validPageCount = pages.filter((page) => page.trim().length > 0).length;

  // Calculate costs for different scenarios
  const singleCallCost = tokenEstimate.totalCost || tokenEstimate.costEstimate;
  const separateCallsCost = singleCallCost * validPageCount;
  const costSavings = separateCallsCost - singleCallCost;
  const percentageSavings = (costSavings / separateCallsCost) * 100;

  console.log("\n📊 PROCESSING STRATEGY:");
  console.log(`   • Total pages: ${pageCount}`);
  console.log(`   • Valid pages: ${validPageCount}`);
  console.log(`   • Strategy: Single combined API call`);
  console.log(`   • Alternative: ${validPageCount} separate API calls`);

  console.log("\n💰 COST COMPARISON:");
  console.log(`   • Single call cost: $${singleCallCost.toFixed(6)}`);
  console.log(
    `   • Separate calls cost: $${separateCallsCost.toFixed(
      6
    )} (${validPageCount} × $${singleCallCost.toFixed(6)})`
  );
  console.log(`   • Cost savings: $${costSavings.toFixed(6)}`);
  console.log(`   • Percentage savings: ${percentageSavings.toFixed(1)}%`);

  console.log("\n⚡ EFFICIENCY GAINS:");
  console.log(`   • API calls reduction: ${validPageCount - 1} fewer calls`);
  console.log(
    `   • Processing time: ~${Math.round((validPageCount - 1) * 100)}% faster`
  );
  console.log(`   • Token efficiency: Shared prompt overhead`);

  if (tokenEstimate.totalTokens) {
    console.log(
      `   • Total tokens: ${tokenEstimate.totalTokens.toLocaleString()}`
    );
    console.log(
      `   • Input tokens: ${tokenEstimate.totalInputTokens.toLocaleString()}`
    );
    console.log(
      `   • Estimated output: ${tokenEstimate.estimatedResponseTokens.toLocaleString()}`
    );
  }

  console.log("🚀".repeat(40));
}

/**
 * Logs cost calculation for individual services
 * @param {string} serviceName - Name of the service
 * @param {Object} tokenEstimate - Token estimation object
 * @param {Object} additionalInfo - Additional service-specific info
 */
export function logServiceCost(
  serviceName,
  tokenEstimate,
  additionalInfo = {}
) {
  console.log("\n" + "💵".repeat(30));
  console.log(`💵 ${serviceName.toUpperCase()} SERVICE COST`);
  console.log("💵".repeat(30));

  console.log(`📝 Service: ${serviceName}`);
  console.log(`🌍 Language: ${tokenEstimate.language}`);
  console.log(`📊 Total cost: $${tokenEstimate.totalCost.toFixed(6)}`);

  if (additionalInfo.fileSize) {
    console.log(
      `📄 File size: ${additionalInfo.fileSize.toLocaleString()} characters`
    );
  }

  if (additionalInfo.expectedOutput) {
    console.log(`📤 Expected output: ${additionalInfo.expectedOutput}`);
  }

  console.log("💵".repeat(30));
}

/**
 * Comprehensive cost tracking that combines estimation and actual usage
 * @param {string} serviceType - Type of service
 * @param {string} text - Input text content
 * @param {string} promptTemplate - Prompt template used
 * @param {Object} apiResponse - Gemini API response object
 * @param {boolean} isPaidTier - Whether using paid tier
 * @returns {Object} Complete cost tracking data
 */
/**
 * NEW: Track actual costs using real token counts from Gemini API
 * @param {string} serviceType - Type of service
 * @param {Object} apiResponse - Gemini API response object with usageMetadata
 * @param {boolean} isPaidTier - Whether using paid tier
 * @param {Object} inputTokenCount - Pre-counted input tokens (optional)
 * @returns {Object} Complete actual cost tracking data
 */
export function trackActualCostFromResponse(
  serviceType,
  apiResponse,
  inputTokenCount = null
) {
  console.log("\n" + "💰".repeat(60));
  console.log(`💰 PAID TIER COST TRACKING - ${serviceType.toUpperCase()}`);
  console.log("💰".repeat(60));

  // Extract actual usage from API response
  const actualUsage = extractActualTokenUsage(apiResponse);

  // Use pre-counted input tokens if available, otherwise use response data
  const finalInputTokens =
    inputTokenCount?.inputTokens || actualUsage.inputTokens;
  const inputDataSource = inputTokenCount?.source || actualUsage.source;

  const finalUsage = {
    ...actualUsage,
    inputTokens: finalInputTokens,
    inputDataSource,
  };

  // Calculate actual costs (always paid tier)
  const actualCost = calculateActualCost(finalUsage, true);

  // Log detailed actual usage
  console.log("\n📊 ACTUAL TOKEN USAGE:");
  console.log(
    `   • Input tokens: ${actualCost.inputTokens.toLocaleString()} (${inputDataSource})`
  );
  console.log(
    `   • Output tokens: ${actualCost.outputTokens.toLocaleString()} (${
      actualUsage.source
    })`
  );
  console.log(`   • Total tokens: ${actualCost.totalTokens.toLocaleString()}`);
  console.log(
    `   • Data quality: ${
      actualUsage.hasActualCounts ? "✅ REAL DATA" : "⚠️ ESTIMATED"
    }`
  );

  console.log("\n💰 ACTUAL COST (PAID TIER):");
  console.log(`   • Input cost: $${actualCost.inputCost.toFixed(6)}`);
  console.log(`   • Output cost: $${actualCost.outputCost.toFixed(6)}`);
  console.log(`   • Total cost: $${actualCost.totalCost.toFixed(6)}`);
  console.log(
    `   • Rate: $${GEMINI_COST_CONFIG.costPer1MInputTokens}/1M input, $${GEMINI_COST_CONFIG.costPer1MOutputTokens}/1M output`
  );

  // Create comprehensive tracking data
  const trackingData = {
    serviceType,
    timestamp: new Date().toISOString(),
    actualUsage: finalUsage,
    actualCost,
    isActualData: actualUsage.hasActualCounts,
    isPaidTier: true,
    dataSources: {
      input: inputDataSource,
      output: actualUsage.source,
    },
  };

  // Record usage for paid tier tracking (async, don't wait)
  import("./paidTierReporting.js")
    .then((reporting) => {
      reporting.recordPaidUsage(trackingData);
    })
    .catch((error) =>
      console.warn("Failed to record paid usage:", error.message)
    );

  console.log("💰".repeat(60));
  return trackingData;
}

/**
 * DEPRECATED: Use trackActualCostFromResponse instead
 * @deprecated
 */
export function trackActualCost(
  serviceType,
  text,
  promptTemplate,
  apiResponse,
  isPaidTier = false
) {
  console.warn(
    `⚠️ trackActualCost is deprecated. Use trackActualCostFromResponse for ${serviceType}`
  );

  // Extract actual usage from API response
  const actualUsage = extractActualTokenUsage(apiResponse);

  // Calculate actual costs
  const actualCost = calculateActualCost(actualUsage, isPaidTier);

  return {
    serviceType,
    timestamp: new Date().toISOString(),
    actualUsage,
    actualCost,
    deprecated: true,
  };
}

/**
 * Simple cost summary for paid tier usage
 * @param {Object} usageStats - Usage statistics
 * @returns {Object} Cost summary
 */
export function getPaidTierCostSummary(usageStats) {
  const totalCost = Object.values(usageStats.services || {}).reduce(
    (sum, service) => sum + (service.totalCost || 0),
    0
  );

  return {
    totalCostToday: usageStats.costToday || 0,
    totalCostLifetime: totalCost,
    requestsToday: usageStats.requestsToday || 0,
    tokensToday: usageStats.tokensToday || 0,
    averageCostPerRequest:
      usageStats.requestsToday > 0
        ? usageStats.costToday / usageStats.requestsToday
        : 0,
    averageTokensPerRequest:
      usageStats.requestsToday > 0
        ? usageStats.tokensToday / usageStats.requestsToday
        : 0,
  };
}
