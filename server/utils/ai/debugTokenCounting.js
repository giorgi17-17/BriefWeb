/**
 * Diagnostic Tools for Token Counting Issues
 * Helps debug and resolve token counting problems with Gemini API
 */

import { geminiAI, geminiModel } from "../../config/gemini.js";
import {
  countInputTokens,
  extractActualTokenUsage,
  trackActualCostFromResponse,
} from "./tokenUtils.js";

/**
 * Comprehensive diagnostic test for token counting
 * @param {string} testText - Text to test with
 * @returns {Promise<Object>} Diagnostic results
 */
export async function runTokenCountingDiagnostic(
  testText = "Hello, this is a test prompt for token counting."
) {
  console.log("🔧 RUNNING COMPREHENSIVE TOKEN COUNTING DIAGNOSTIC");
  console.log("=".repeat(80));

  const results = {
    timestamp: new Date().toISOString(),
    testText,
    textLength: testText.length,
    tests: {},
    conclusions: [],
  };

  // Test 1: Library Version Info
  console.log("\n1️⃣ LIBRARY VERSION INFO:");
  try {
    const packageInfo = await import("@google/genai/package.json", {
      assert: { type: "json" },
    });
    console.log(
      `   • @google/genai version: ${packageInfo.default?.version || "unknown"}`
    );
    results.tests.libraryVersion = packageInfo.default?.version || "unknown";
  } catch (error) {
    console.log(`   • Could not determine library version: ${error.message}`);
    results.tests.libraryVersion = "unknown";
  }

  // Test 2: Model Instance Creation
  console.log("\n2️⃣ MODEL INSTANCE CREATION:");
  try {
    const model = geminiAI.getGenerativeModel({ model: geminiModel });
    console.log(`   ✅ Model instance created successfully`);
    console.log(`   • Model name: ${geminiModel}`);
    console.log(
      `   • Available methods: ${Object.getOwnPropertyNames(
        Object.getPrototypeOf(model)
      ).join(", ")}`
    );

    results.tests.modelCreation = {
      success: true,
      modelName: geminiModel,
      availableMethods: Object.getOwnPropertyNames(
        Object.getPrototypeOf(model)
      ),
    };

    // Check if countTokens exists
    const hasCountTokens = typeof model.countTokens === "function";
    console.log(
      `   • countTokens method available: ${
        hasCountTokens ? "✅ YES" : "❌ NO"
      }`
    );
    results.tests.countTokensAvailable = hasCountTokens;
  } catch (error) {
    console.log(`   ❌ Failed to create model instance: ${error.message}`);
    results.tests.modelCreation = { success: false, error: error.message };
    results.conclusions.push("CRITICAL: Cannot create model instance");
  }

  // Test 3: Input Token Counting
  console.log("\n3️⃣ INPUT TOKEN COUNTING:");
  try {
    const inputResult = await countInputTokens(geminiModel, testText);
    console.log(`   • Result:`, inputResult);

    results.tests.inputTokenCounting = inputResult;

    if (inputResult.hasActualCount) {
      console.log(
        `   ✅ SUCCESS: Got actual token count via ${inputResult.source}`
      );
      results.conclusions.push(
        `Input counting works via ${inputResult.source}`
      );
    } else {
      console.log(`   ⚠️ FALLBACK: Using estimation (${inputResult.source})`);
      results.conclusions.push(
        `Input counting fell back to estimation: ${inputResult.source}`
      );
    }
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    results.tests.inputTokenCounting = { error: error.message };
    results.conclusions.push("ISSUE: Input token counting completely failed");
  }

  // Test 4: API Response Structure
  console.log("\n4️⃣ API RESPONSE STRUCTURE:");
  try {
    const model = geminiAI.getGenerativeModel({ model: geminiModel });
    const response = await model.generateContent(testText);

    console.log(`   • Response type: ${typeof response}`);
    console.log(`   • Response keys: ${Object.keys(response)}`);

    // Check for text property
    if (response.text) {
      console.log(
        `   ✅ Response has text: "${response.text.substring(0, 50)}..."`
      );
    } else {
      console.log(`   ❌ No text property found`);
    }

    results.tests.apiResponse = {
      responseType: typeof response,
      responseKeys: Object.keys(response),
      hasText: !!response.text,
      textPreview: response.text?.substring(0, 100),
    };

    // Test 5: Token Usage Extraction
    console.log("\n5️⃣ TOKEN USAGE EXTRACTION:");
    const usageResult = extractActualTokenUsage(response);
    console.log(`   • Extraction result:`, usageResult);

    results.tests.tokenExtraction = usageResult;

    if (usageResult.hasActualCounts) {
      console.log(
        `   ✅ SUCCESS: Extracted actual tokens from ${usageResult.source}`
      );
      results.conclusions.push(
        `Output token extraction works via ${usageResult.source}`
      );
    } else {
      console.log(
        `   ❌ FAILED: Could not extract actual tokens (${usageResult.source})`
      );
      results.conclusions.push(
        `Output token extraction failed: ${usageResult.source}`
      );
    }

    // Test 6: Complete Cost Tracking
    console.log("\n6️⃣ COMPLETE COST TRACKING:");
    try {
      const costResult = trackActualCostFromResponse("diagnostic", response);
      console.log(`   ✅ Cost tracking completed`);
      results.tests.costTracking = { success: true, result: costResult };
      results.conclusions.push("Cost tracking system functional");
    } catch (error) {
      console.log(`   ❌ Cost tracking failed: ${error.message}`);
      results.tests.costTracking = { success: false, error: error.message };
      results.conclusions.push("Cost tracking system has issues");
    }
  } catch (error) {
    console.log(`   ❌ API call failed: ${error.message}`);
    results.tests.apiResponse = { error: error.message };
    results.conclusions.push("CRITICAL: Cannot make API calls");
  }

  // Final Analysis
  console.log("\n🔍 DIAGNOSTIC CONCLUSIONS:");
  console.log("=".repeat(50));
  results.conclusions.forEach((conclusion, index) => {
    console.log(`${index + 1}. ${conclusion}`);
  });

  // Recommendations
  console.log("\n💡 RECOMMENDATIONS:");
  const recommendations = generateRecommendations(results);
  recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });
  results.recommendations = recommendations;

  console.log("\n" + "=".repeat(80));
  return results;
}

/**
 * Generate recommendations based on diagnostic results
 * @param {Object} results - Diagnostic results
 * @returns {Array<string>} Recommendations
 */
function generateRecommendations(results) {
  const recommendations = [];

  if (!results.tests.modelCreation?.success) {
    recommendations.push(
      "Fix model creation issues first - check API key and imports"
    );
  }

  if (!results.tests.countTokensAvailable) {
    recommendations.push(
      "countTokens method not available - use improved estimation only"
    );
  }

  if (results.tests.inputTokenCounting?.hasActualCount === false) {
    recommendations.push(
      "Input token counting using estimation - consider upgrading library version"
    );
  }

  if (results.tests.tokenExtraction?.hasActualCounts === false) {
    recommendations.push(
      "Output token extraction failed - check API response format or library version"
    );
  }

  if (results.tests.apiResponse?.error) {
    recommendations.push(
      "API calls failing - check network, authentication, and model availability"
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("All systems appear to be working correctly!");
  }

  return recommendations;
}

/**
 * Quick test to check if token counting is working
 * @returns {Promise<boolean>} True if working
 */
export async function quickTokenCountTest() {
  try {
    const result = await countInputTokens(geminiModel, "Test");
    return result.hasActualCount || result.inputTokens > 0;
  } catch (error) {
    console.error("Quick test failed:", error.message);
    return false;
  }
}

/**
 * Export diagnostic data for sharing
 * @param {Object} diagnosticResults - Results from runTokenCountingDiagnostic
 * @returns {string} JSON string for sharing
 */
export function exportDiagnosticData(diagnosticResults) {
  const exportData = {
    ...diagnosticResults,
    systemInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString(),
    },
  };

  return JSON.stringify(exportData, null, 2);
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const testText = process.argv[2] || "Hello, this is a diagnostic test.";

  runTokenCountingDiagnostic(testText)
    .then((results) => {
      console.log("\n📄 Export this diagnostic data if you need help:");
      console.log(exportDiagnosticData(results));
    })
    .catch((error) => {
      console.error("Diagnostic failed:", error);
      process.exit(1);
    });
}
