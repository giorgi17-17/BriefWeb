/**
 * Test script to verify accurate token counting implementation
 * Run this to test if Gemini API token counting is working correctly
 */

import { geminiAI, geminiModel } from "../../config/gemini.js";
import {
  countInputTokens,
  extractActualTokenUsage,
  trackActualCostFromResponse,
} from "./tokenUtils.js";

/**
 * Test the new token counting implementation
 */
export async function testTokenCounting() {
  console.log("🧪 Testing accurate token counting implementation...\n");

  const testPrompt =
    "Generate 3 simple flashcards about photosynthesis. Each flashcard should have a question and answer.";

  try {
    // Test 1: Count input tokens with new advanced method
    console.log("📊 Test 1: Advanced Input Token Counting");
    console.log(`Test prompt: "${testPrompt}"`);

    const inputCount = await countInputTokens(geminiModel, testPrompt);
    console.log(`Input token result:`, inputCount);

    if (inputCount.hasActualCount) {
      console.log("✅ SUCCESS: Got actual token count from Gemini API");
    } else {
      console.log(
        `⚠️ ESTIMATION: Using ${inputCount.source} (${
          inputCount.method || "unknown method"
        })`
      );
    }

    // Test 2: Generate content and extract usage
    console.log("\n📊 Test 2: Generating content and extracting token usage");

    const model = geminiAI.getGenerativeModel({ model: geminiModel });
    const response = await model.generateContent(testPrompt);

    console.log("✅ Content generated successfully");

    // Test 3: Extract token usage from response
    const actualUsage = extractActualTokenUsage(response);
    console.log("Token usage from response:", actualUsage);

    if (actualUsage.hasActualCounts) {
      console.log("✅ SUCCESS: Got actual token counts from API response");
      console.log(`   • Input tokens: ${actualUsage.inputTokens}`);
      console.log(`   • Output tokens: ${actualUsage.outputTokens}`);
      console.log(`   • Total tokens: ${actualUsage.totalTokens}`);
    } else {
      console.log("❌ FAILED: No usageMetadata in response");
      console.log("Response structure:", Object.keys(response));
    }

    // Test 4: Complete cost tracking
    console.log("\n📊 Test 3: Complete cost tracking");
    const costTracking = trackActualCostFromResponse(
      "test",
      response,
      inputCount
    );

    console.log("✅ Cost tracking completed");

    // Summary
    console.log("\n📋 SUMMARY:");
    console.log(
      `Input counting: ${
        inputCount.hasActualCount
          ? "✅ ACTUAL"
          : `⚠️ ESTIMATED (${inputCount.source})`
      }`
    );
    console.log(
      `Output counting: ${
        actualUsage.hasActualCounts
          ? "✅ ACTUAL"
          : `❌ FAILED (${actualUsage.source})`
      }`
    );
    console.log(
      `Data quality: ${
        inputCount.hasActualCount && actualUsage.hasActualCounts
          ? "100% REAL"
          : actualUsage.hasActualCounts
          ? "OUTPUT REAL, INPUT ESTIMATED"
          : inputCount.hasActualCount
          ? "INPUT REAL, OUTPUT ESTIMATED"
          : "BOTH ESTIMATED"
      }`
    );

    if (actualUsage.hasActualCounts) {
      console.log(
        "\n✅ SUCCESS: At least output token counting is working with real API data!"
      );
      return true;
    } else if (inputCount.hasActualCount) {
      console.log(
        "\n⚠️ PARTIAL SUCCESS: Input tokens real, but output extraction failed"
      );
      return false;
    } else {
      console.log(
        "\n⚠️ ESTIMATION MODE: Both input and output using estimation - run diagnostic for details"
      );
      return false;
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack:", error.stack);
    return false;
  }
}

/**
 * Quick API response inspection
 */
export async function inspectApiResponse() {
  console.log("🔍 Inspecting Gemini API response structure...\n");

  try {
    const model = geminiAI.getGenerativeModel({ model: geminiModel });
    const response = await model.generateContent("Hello world");

    console.log("Response keys:", Object.keys(response));
    console.log("Response type:", typeof response);

    if (response.usageMetadata) {
      console.log("✅ usageMetadata found!");
      console.log("usageMetadata keys:", Object.keys(response.usageMetadata));
      console.log("usageMetadata content:", response.usageMetadata);
    } else {
      console.log("❌ No usageMetadata found");
      console.log("Full response:", JSON.stringify(response, null, 2));
    }
  } catch (error) {
    console.error("Error inspecting response:", error);
  }
}

// If run directly, execute tests
if (import.meta.url === `file://${process.argv[1]}`) {
  testTokenCounting().then((success) => {
    process.exit(success ? 0 : 1);
  });
}
