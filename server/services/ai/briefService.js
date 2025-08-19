/**
 * Brief Generation Service
 */

import {
  geminiAI,
  geminiModel,
  geminiModelBrief,
} from "../../config/gemini.js";
import { detectLanguage } from "../../utils/ai/languageUtils.js";
import { parseJsonWithFallbacks } from "../../utils/ai/jsonUtils.js";
import { validateBrief } from "../../utils/ai/validationUtils.js";
import { logAIError, handleParseError } from "../../utils/ai/errorHandler.js";
import {
  createFallbackBrief,
  createStructuredFallbackSummary,
} from "../../utils/ai/fallbackStrategies.js";
import { getBriefPrompt } from "../../config/ai/promptTemplates.js";
import {
  trackActualCostFromResponse,
  countInputTokens,
} from "../../utils/ai/tokenUtils.js";
import { GENERATION_CONFIG } from "../../config/ai/aiConfig.js";
import { debugLog, debugWarn, debugError, debugAI } from "../../utils/debugLogger.js";

// Optimized batch processing configuration - tuned for performance
const BATCH_CONFIG = {
  PAGES_PER_BATCH: 12, // Optimal batch size based on testing
  MAX_PARALLEL_BATCHES: 3, // Balanced parallel processing
  DELAY_BETWEEN_BATCHES: 0, // No artificial delays
};

/**
 * Generates a multi-page brief using parallel batch processing for performance
 * @param {Array<string>} allPages - Array of page texts
 * @returns {Promise<Object>} Brief with page summaries
 */
export async function generateMultiPageBrief(allPages) {
  debugAI('Gemini', 'generateMultiPageBrief', { pageCount: allPages.length });

  const expectedPageCount = allPages.length;

  // Fast path for small documents (avoid batching overhead entirely)
  if (allPages.length <= 15) { // Increased threshold for single-call processing
    debugLog(`Using optimized single-call processing for ${allPages.length} pages`);
    return generateSingleBatchBrief(allPages, 0, expectedPageCount);
  } else {
    // For larger documents, use parallel batch processing
    debugLog(`Using batch processing for ${allPages.length} pages`);
    return generateParallelBatchBrief(allPages);
  }
}

/**
 * Process pages in parallel batches for better performance
 * @param {Array<string>} allPages - All pages to process
 * @returns {Promise<Object>} Combined brief results
 */
async function generateParallelBatchBrief(allPages) {
  const totalPages = allPages.length;
  debugLog(`Using parallel batch processing for ${totalPages} pages`);

  // Split pages into batches
  const batches = [];
  for (let i = 0; i < totalPages; i += BATCH_CONFIG.PAGES_PER_BATCH) {
    const batchPages = allPages.slice(i, i + BATCH_CONFIG.PAGES_PER_BATCH);
    batches.push({
      pages: batchPages,
      startIndex: i,
      batchNumber: Math.floor(i / BATCH_CONFIG.PAGES_PER_BATCH) + 1,
    });
  }

  debugLog(
    `Created ${batches.length} batches of up to ${BATCH_CONFIG.PAGES_PER_BATCH} pages each`
  );

  try {
    // Process batches in parallel groups to avoid rate limits
    const allResults = [];
    for (
      let i = 0;
      i < batches.length;
      i += BATCH_CONFIG.MAX_PARALLEL_BATCHES
    ) {
      const batchGroup = batches.slice(
        i,
        i + BATCH_CONFIG.MAX_PARALLEL_BATCHES
      );
      debugLog(
        `Processing batch group ${
          Math.floor(i / BATCH_CONFIG.MAX_PARALLEL_BATCHES) + 1
        }/${Math.ceil(batches.length / BATCH_CONFIG.MAX_PARALLEL_BATCHES)}`
      );
      
      // No artificial delays - rely on natural processing time

      const groupResults = await Promise.all(
        batchGroup.map((batch) =>
          generateSingleBatchBrief(
            batch.pages,
            batch.startIndex,
            totalPages
          ).catch((error) => {
            debugError(`Batch ${batch.batchNumber} failed:`, error);
            return createFallbackBrief(batch.pages, error.message);
          })
        )
      );

      allResults.push(...groupResults);
    }

    // Combine all batch results
    const combinedSummaries = [];
    for (const result of allResults) {
      if (result && result.pageSummaries) {
        combinedSummaries.push(...result.pageSummaries);
      }
    }

    // Sort by page number to maintain order
    combinedSummaries.sort((a, b) => a.pageNumber - b.pageNumber);

    debugLog(
      `Successfully processed ${combinedSummaries.length} pages in parallel`
    );

    const rawResult = {
      pageSummaries: combinedSummaries,
    };

    // Standardize the brief structure
    const standardizedBrief = standardizeBriefStructure(rawResult);
    
    if (!validateBriefStructure(standardizedBrief)) {
      debugWarn('Brief structure validation failed, using fallback');
      return createFallbackBriefStructure(allPages, 'Brief structure validation failed');
    }

    return standardizedBrief;
  } catch (error) {
    debugError("Parallel batch processing failed:", error);
    // Fallback to single call if parallel processing fails
    return generateSingleBatchBrief(allPages, 0, totalPages);
  }
}

/**
 * Generates brief for a single batch of pages
 * @param {Array<string>} batchPages - Pages in this batch
 * @param {number} startIndex - Starting index for page numbers
 * @param {number} totalPageCount - Total pages in document
 * @returns {Promise<Object>} Brief with page summaries
 */
async function generateSingleBatchBrief(
  batchPages,
  startIndex,
  totalPageCount
) {
  debugLog(
    `Processing batch: ${batchPages.length} pages starting at index ${startIndex}`
  );

  let response = null;

  try {
    // Combine batch pages into a single text with clear separators
    const combinedText = batchPages
      .map((pageText, index) => {
        const cleanedPage = pageText.trim();
        if (!cleanedPage) return null;
        const pageNumber = startIndex + index + 1;
        return `=== PAGE ${pageNumber} ===\n${cleanedPage}\n`;
      })
      .filter(Boolean)
      .join("\n");

    debugLog(
      `Batch combined text length: ${combinedText.length} characters`
    );

    // Detect language from the first non-empty page
    const firstPage = batchPages.find((page) => page.trim().length > 0) || "";
    const textLanguage = detectLanguage(firstPage);
    debugLog(`Detected language is ${textLanguage}`);

    // Generate prompt
    const prompt = getBriefPrompt(textLanguage, combinedText);

    // Use the same API format as flashcardService.js (which works)
    debugLog('=== GEMINI API CALL DEBUG ===');
    debugLog('Model:', geminiModelBrief);
    debugLog('Temperature:', GENERATION_CONFIG.brief.temperature);
    debugLog('Prompt length:', prompt.length);
    debugLog('Prompt preview (first 200 chars):', prompt.substring(0, 200));
    
    try {
      // Call AI API using working format from flashcardService
      response = await geminiAI.models.generateContent({
        model: geminiModelBrief,
        contents: prompt,
        generationConfig: {
          temperature: GENERATION_CONFIG.brief.temperature,
          maxOutputTokens: 8192, // Ensure we get full content
          topP: 0.95,
          topK: 40,
        },
      });
      
      debugLog('✅ API call succeeded');
      debugLog('Response type:', typeof response);
      debugLog('Response keys:', Object.keys(response || {}));
      
    } catch (apiError) {
      debugError('❌ API call failed:', apiError.message);
      debugError('Full API error:', apiError);
      throw apiError;
    }

    debugLog("Received AI response for multi-page brief");

    // Track actual costs using response data only
    const costTracking = trackActualCostFromResponse(
      "brief",
      response,
      null // No pre-counted tokens
    );

    // Extract text from response using same format as flashcardService
    debugLog('=== RESPONSE EXTRACTION DEBUG ===');
    debugLog('Response has text property:', 'text' in response);
    debugLog('Response.text type:', typeof response.text);
    
    let responseText = response.text;
    debugLog("✅ Extracted response text, length:", responseText.length);
    debugLog("First 500 chars of response:", responseText.substring(0, 500));
    
    if (responseText.length < 100) {
      debugError("⚠️ Response seems very short! This might indicate an issue.");
    }

    // DEBUG: Log if raw response contains HTML
    const containsHtml =
      /<[^>]*>/.test(responseText) ||
      /class\s*=/.test(responseText) ||
      /style\s*=/.test(responseText) ||
      /"font-/.test(responseText);

    if (containsHtml) {
      debugWarn("RAW AI RESPONSE CONTAINS HTML/CSS!");
      debugLog("First 500 chars:", responseText.substring(0, 500));

      // Show specific HTML patterns
      const htmlMatches = responseText.match(/<[^>]*>/g);
      const cssMatches = responseText.match(/"[^"]*font-[^"]*"/g);

      if (htmlMatches)
        debugLog("HTML in raw response:", htmlMatches.slice(0, 3));
      if (cssMatches)
        debugLog("CSS in raw response:", cssMatches.slice(0, 3));
    } else {
      debugLog("Raw AI response appears clean (no HTML detected)");
    }

    // Only truncate if response is extremely large (over 200KB)
    if (responseText.length > 200000) {
      debugWarn(`Very large response (${responseText.length} chars), carefully truncating...`);
      // Find the last complete JSON object
      const lastCompleteSummary = responseText.lastIndexOf('"summary"');
      if (lastCompleteSummary > 100000) {
        const truncatePoint = responseText.indexOf('}', lastCompleteSummary + 1000);
        if (truncatePoint > 0) {
          responseText = responseText.substring(0, truncatePoint) + '}]}';
        }
      }
    }

    // Enhanced JSON parsing with better debugging
    debugLog('=== JSON PARSING DEBUG ===');
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
      debugLog("✅ Successfully parsed JSON response");
      debugLog("Parsed response structure:", {
        hasPageSummaries: !!parsedResponse?.pageSummaries,
        summariesIsArray: Array.isArray(parsedResponse?.pageSummaries),
        summariesCount: parsedResponse?.pageSummaries?.length
      });
    } catch (error) {
      debugError("❌ Initial JSON parse failed:", error.message);
      debugLog("Response preview that failed to parse:", responseText.substring(0, 1000));
      
      // Try to extract JSON from response if it's wrapped in other text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        debugLog("Found JSON object in response, attempting to parse extracted JSON...");
        try {
          parsedResponse = JSON.parse(jsonMatch[0]);
          debugLog("Successfully parsed extracted JSON");
        } catch (extractError) {
          debugError("Failed to parse extracted JSON:", extractError.message);
        }
      }
      
      if (!parsedResponse) {
        // Final fallback with basic repair
        debugLog("Attempting final JSON repair...");
        const cleanedJson = responseText
          .replace(/```json\s*/g, '') // Remove markdown code blocks
          .replace(/```\s*/g, '')
          .replace(/[\x00-\x1F\x7F]/g, '') // Remove control chars
          .trim();
        
        try {
          parsedResponse = JSON.parse(cleanedJson);
          debugLog("Successfully parsed repaired JSON");
        } catch (finalError) {
          debugError("JSON parsing failed completely:", finalError.message);
          debugError("First 2000 chars of problematic response:", responseText.substring(0, 2000));
          return createFallbackBrief(batchPages, "Failed to parse AI response");
        }
      }
    }

    // Validate the parsed response
    if (!validateBrief(parsedResponse)) {
      debugError("Brief validation failed. Response structure:", {
        hasPageSummaries: !!parsedResponse?.pageSummaries,
        summariesIsArray: Array.isArray(parsedResponse?.pageSummaries),
        summariesLength: parsedResponse?.pageSummaries?.length,
        firstSummary: parsedResponse?.pageSummaries?.[0]
      });
      throw new Error(
        "Invalid response format: missing or invalid pageSummaries"
      );
    }
    
    debugLog(`Parsed response contains ${parsedResponse.pageSummaries.length} summaries`);

    // Ensure we have summaries for all pages
    const expectedPageCount = batchPages.filter(
      (page) => page.trim().length > 0
    ).length;
    const actualPageCount = parsedResponse.pageSummaries.length;

    if (actualPageCount < expectedPageCount) {
      debugWarn(
        `Expected ${expectedPageCount} page summaries, got ${actualPageCount}`
      );

      // Add fallback summaries for missing pages
      for (let i = actualPageCount; i < expectedPageCount; i++) {
        const pageText = batchPages[i].trim();
        if (pageText) {
          // Create a structured fallback summary instead of raw text
          const structuredFallback = createStructuredFallbackSummary(
            pageText,
            i + 1
          );
          const fallbackTitle = generatePageTitle(pageText, i + 1);
          parsedResponse.pageSummaries.push({
            pageNumber: i + 1,
            title: fallbackTitle,
            summary: structuredFallback,
          });
        }
      }
    }

    // Log brief generation progress
    debugLog(
      `Total summaries generated: ${parsedResponse.pageSummaries.length}`
    );

    // Validate and fix titles without verbose logging
    parsedResponse.pageSummaries.forEach((page, index) => {
      // Validate and fix titles
      if (
        !page.title ||
        typeof page.title !== "string" ||
        page.title.length < 3
      ) {
        debugWarn(`Invalid title detected for page ${page.pageNumber || index + 1}! Generating fallback...`);
        const fallbackTitle = generatePageTitle(
          page.summary || "",
          page.pageNumber || index + 1
        );
        page.title = fallbackTitle;
      }
    });

    // Strict validation to ensure educational quality
    debugLog('=== CONTENT QUALITY VALIDATION ===');
    
    parsedResponse.pageSummaries = parsedResponse.pageSummaries.map((page, index) => {
      debugLog(`\n--- Validating Page ${page.pageNumber || index + 1} ---`);
      
      // Title validation
      let finalTitle = page.title && page.title.length > 10 ? page.title : `Page ${page.pageNumber} Educational Content`;
      debugLog(`Title: "${finalTitle}" (${finalTitle.length} chars)`);
      
      // Summary validation with strict length and content checks
      let cleanSummary = page.summary || "No summary available";
      cleanSummary = cleanSummary.replace(/^(This page|This section|The page)\s+/i, '').trim();
      
      // Apply HTML/CSS cleaning to each summary
      cleanSummary = fixBrokenHtmlFormatting(cleanSummary);
      
      const wordCount = cleanSummary.split(/\s+/).filter(word => word.length > 0).length;
      const { minWordsPerPage, targetWordsPerPage } = GENERATION_CONFIG.brief;
      
      debugLog(`Summary length: ${wordCount} words (target: ${targetWordsPerPage}, min: ${minWordsPerPage})`);
      debugLog(`Summary preview: "${cleanSummary.substring(0, 100)}..."`);
      
      // Detect topic-list style content (bad content)
      const isTopicList = (
        cleanSummary.includes('themes are explored') ||
        cleanSummary.includes('topics covered') ||
        cleanSummary.includes('concepts include') ||
        /^[\d\.]\s*[A-Z][a-z\s]+\n[-•]/.test(cleanSummary) ||
        cleanSummary.split(/[.!?]+/).length < 3 // Less than 3 sentences
      );
      
      debugLog(`Content quality: isTopicList=${isTopicList}, wordCount=${wordCount}, adequate=${wordCount >= minWordsPerPage && !isTopicList}`);
      
      // Strict enforcement - reject inadequate content
      if (wordCount < minWordsPerPage || isTopicList) {
        debugError(`❌ Page ${page.pageNumber}: Content inadequate - using educational fallback`);
        debugLog(`  - Word count: ${wordCount}/${minWordsPerPage} (minimum)`);
        debugLog(`  - Is topic list: ${isTopicList}`);
        
        // Generate educational fallback content
        const pageText = batchPages[index] ? batchPages[index].substring(0, 300) : '';
        cleanSummary = generateEducationalFallback(pageText, page.pageNumber, finalTitle);
        debugLog(`✅ Generated educational fallback (${cleanSummary.split(' ').length} words)`);
      } else if (wordCount < targetWordsPerPage * 0.8) {
        // Content is acceptable but could be enhanced
        debugWarn(`⚠️ Page ${page.pageNumber}: Content acceptable but below target (${wordCount}/${targetWordsPerPage} words)`);
      } else {
        debugLog(`✅ Page ${page.pageNumber}: Content quality good (${wordCount} words)`);
      }

      return {
        ...page,
        title: finalTitle,
        summary: cleanSummary,
      };
    });

    // Adjust page numbers to match the batch's position in the document
    parsedResponse.pageSummaries = parsedResponse.pageSummaries.map(
      (page, index) => ({
        ...page,
        pageNumber: startIndex + index + 1,
      })
    );

    // Final success summary
    const totalWords = parsedResponse.pageSummaries.reduce((sum, page) => 
      sum + page.summary.split(/\s+/).length, 0);
    const avgWordsPerPage = Math.round(totalWords / parsedResponse.pageSummaries.length);
    
    debugLog('=== BATCH GENERATION COMPLETE ===');
    debugLog(`✅ Generated ${parsedResponse.pageSummaries.length} page summaries`);
    debugLog(`📊 Total words: ${totalWords} (avg: ${avgWordsPerPage} per page)`);
    debugLog(`🎯 Target words per page: ${GENERATION_CONFIG.brief.targetWordsPerPage}`);
    debugLog(`📋 Sample title: "${parsedResponse.pageSummaries[0]?.title}"`);
    debugLog('=====================================');

    // For batch processing, we validate count per batch
    const expectedBatchCount = batchPages.length;
    if (parsedResponse.pageSummaries.length !== expectedBatchCount) {
      debugWarn(
        `Batch page count mismatch! Expected ${expectedBatchCount}, got ${parsedResponse.pageSummaries.length}`
      );

      // Fix the page count by adjusting the summaries
      parsedResponse = correctPageCount(
        parsedResponse,
        batchPages,
        expectedBatchCount
      );
    }

    // For batch processing, return the raw structure (will be standardized at the top level)
    return parsedResponse;
  } catch (error) {
    if (error.message && error.message.includes("parse")) {
      handleParseError("brief", error, response?.text);
    } else {
      logAIError("brief", error, {
        pageCount: batchPages.length,
        totalLength: batchPages.reduce((sum, page) => sum + page.length, 0),
        rawResponse: response?.text,
      });
    }

    // Create fallback summaries with correct page numbers
    const fallbackResult = createFallbackBrief(batchPages, error.message);
    if (fallbackResult && fallbackResult.pageSummaries) {
      fallbackResult.pageSummaries = fallbackResult.pageSummaries.map(
        (page, index) => ({
          ...page,
          pageNumber: startIndex + index + 1,
        })
      );
    }
    return fallbackResult;
  }
}

/**
 * Corrects page count mismatch by splitting or merging summaries
 * @param {Object} parsedResponse - The AI response with wrong page count
 * @param {Array<string>} originalPages - Original page content
 * @param {number} expectedCount - Expected number of pages
 * @returns {Object} - Corrected response with proper page count
 */
function correctPageCount(parsedResponse, originalPages, expectedCount) {
  const currentCount = parsedResponse.pageSummaries.length;

  debugLog(`Correcting page count from ${currentCount} to ${expectedCount}`);

  if (currentCount < expectedCount) {
    // AI merged pages - we need to split them
    return splitMergedSummaries(parsedResponse, originalPages, expectedCount);
  } else {
    // AI split pages - we need to merge them
    return mergeSplitSummaries(parsedResponse, originalPages, expectedCount);
  }
}

/**
 * Splits merged summaries to match expected page count
 */
function splitMergedSummaries(parsedResponse, originalPages, expectedCount) {
  const summaries = parsedResponse.pageSummaries;
  const ratio = expectedCount / summaries.length;

  const newSummaries = [];
  let pageIndex = 0;

  for (const summary of summaries) {
    const pagesPerSummary = Math.round(ratio);
    const summaryText = summary.summary;

    // Split the summary content proportionally
    const words = summaryText.split(/\s+/);
    const wordsPerPage = Math.ceil(words.length / pagesPerSummary);

    for (let i = 0; i < pagesPerSummary && pageIndex < expectedCount; i++) {
      const start = i * wordsPerPage;
      const end = Math.min((i + 1) * wordsPerPage, words.length);
      const pageWords = words.slice(start, end);

      newSummaries.push({
        pageNumber: pageIndex + 1,
        title: `${summary.title} - Part ${i + 1}`,
        summary: pageWords.join(" "),
      });

      pageIndex++;
    }
  }

  // Ensure we have exactly the expected count
  while (newSummaries.length < expectedCount) {
    const pageNum = newSummaries.length + 1;
    newSummaries.push({
      pageNumber: pageNum,
      title: `Page ${pageNum}`,
      summary: createStructuredFallbackSummary(
        originalPages[pageNum - 1] || "",
        pageNum
      ),
    });
  }

  return { pageSummaries: newSummaries.slice(0, expectedCount) };
}

/**
 * Merges split summaries to match expected page count
 */
function mergeSplitSummaries(parsedResponse, originalPages, expectedCount) {
  const summaries = parsedResponse.pageSummaries;
  const summariesPerPage = Math.ceil(summaries.length / expectedCount);

  const newSummaries = [];

  for (let i = 0; i < expectedCount; i++) {
    const start = i * summariesPerPage;
    const end = Math.min((i + 1) * summariesPerPage, summaries.length);
    const pageSummaries = summaries.slice(start, end);

    if (pageSummaries.length === 0) break;

    // Merge the summaries
    const mergedTitle = pageSummaries[0].title;
    const mergedSummary = pageSummaries.map((s) => s.summary).join("\n\n");

    newSummaries.push({
      pageNumber: i + 1,
      title: mergedTitle,
      summary: mergedSummary,
    });
  }

  return { pageSummaries: newSummaries };
}

/**
 * Validates and enhances a summary to ensure proper structure and length
 * @param {string} summary - The summary text to validate
 * @param {number} pageNumber - The page number for context
 * @returns {string} - Enhanced summary
 */
function validateAndEnhanceSummary(summary, pageNumber) {
  if (!summary || typeof summary !== "string") {
    debugWarn(`Page ${pageNumber}: Invalid summary type, using fallback`);
    return `Page ${pageNumber} content could not be processed properly. This may contain administrative information or content that requires manual review.`;
  }

  const trimmedSummary = summary.trim();

  if (trimmedSummary.length === 0) {
    debugWarn(`Page ${pageNumber}: Empty summary, using fallback`);
    return `Page ${pageNumber} appears to be empty or contains no extractable content.`;
  }

  // Check word count
  const wordCount = trimmedSummary
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
  const { minWordsPerPage, targetWordsPerPage } = GENERATION_CONFIG.brief;

  if (wordCount < minWordsPerPage / 2) {
    debugWarn(
      `Page ${pageNumber}: Summary too short (${wordCount} words), may need enhancement`
    );

    // Add context to short summaries
    const enhancedSummary = `${trimmedSummary}\n\nThis page contains limited content that may benefit from additional context or manual review to fully understand its educational significance.`;
    return enhancedSummary;
  }

  if (wordCount > targetWordsPerPage * 1.5) {
    debugWarn(
      `Page ${pageNumber}: Summary very long (${wordCount} words), but keeping full content for educational value`
    );
  }

  return trimmedSummary;
}

/**
 * Validates the structure of a summary for proper formatting
 * @param {string} summary - The summary text to validate
 * @returns {Object} - Validation results
 */
function validateSummaryStructure(summary) {
  if (!summary) {
    return {
      isValid: false,
      wordCount: 0,
      hasStructure: false,
      issues: ["Empty summary"],
    };
  }

  const issues = [];
  const wordCount = summary
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  // Check word count against targets
  const { minWordsPerPage, targetWordsPerPage, maxWordsPerPage } =
    GENERATION_CONFIG.brief;

  if (wordCount < minWordsPerPage) {
    issues.push(`Below minimum length: ${wordCount}/${minWordsPerPage} words`);
  }

  if (wordCount > maxWordsPerPage) {
    issues.push(
      `Exceeds maximum length: ${wordCount}/${maxWordsPerPage} words`
    );
  }

  // Check for structural elements
  const hasNumberedSections =
    /^\d+\.\s+[A-Z]/.test(summary) || /\n\d+\.\s+[A-Z]/.test(summary);
  const hasBulletPoints = /^[-•]\s+/.test(summary) || /\n[-•]\s+/.test(summary);
  const hasStructure = hasNumberedSections || hasBulletPoints;

  if (!hasStructure) {
    issues.push(
      "No structural formatting (numbered sections or bullet points) detected"
    );
  }

  // Check for proper paragraph structure
  const lines = summary.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length < 3) {
    issues.push("Content appears to lack proper paragraph structure");
  }

  // Check for educational indicators
  const hasEducationalContent =
    /explain|understand|concept|example|application|significant|important/i.test(
      summary
    );
  if (!hasEducationalContent) {
    issues.push("May lack educational depth indicators");
  }

  return {
    isValid: issues.length === 0,
    wordCount,
    hasStructure,
    hasNumberedSections,
    hasBulletPoints,
    lineCount: lines.length,
    issues,
  };
}

/**
 * Extracts partial content from malformed JSON responses
 * @param {string} responseText - The malformed JSON response
 * @returns {Array} - Array of extracted page summaries
 */
function extractPartialJsonContent(responseText) {
  debugLog("Attempting to extract partial content from malformed JSON");

  const extractedSummaries = [];

  try {
    // Look for summary patterns in the text
    const summaryPatterns = [
      /"summary":\s*"([^"]+(?:\\"[^"]*)*?)"/g,
      /"summary":\s*"([^"]*?)"/g,
      /pageNumber":\s*(\d+)[^}]*?"summary":\s*"([^"]*?)"/g,
    ];

    summaryPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(responseText)) !== null) {
        let summary = "";
        let pageNumber = 1;

        if (match.length === 3) {
          // Pattern with page number
          pageNumber = parseInt(match[1]);
          summary = match[2];
        } else {
          // Pattern without page number
          summary = match[1];
          pageNumber = extractedSummaries.length + 1;
        }

        if (summary && summary.length > 50) {
          // Clean up the summary
          summary = summary
            .replace(/\\"/g, '"')
            .replace(/\\n/g, "\n")
            .replace(/\s+/g, " ")
            .trim();

          extractedSummaries.push({
            pageNumber,
            title: `Page ${pageNumber} Content`,
            summary,
          });
        }
      }
    });

    // If no summaries found, try to extract any substantial text blocks
    if (extractedSummaries.length === 0) {
      const textBlocks = responseText.match(/"[^"]{100,}"/g);
      if (textBlocks) {
        textBlocks.slice(0, 10).forEach((block, index) => {
          const cleanText = block
            .replace(/^"|"$/g, "")
            .replace(/\\"/g, '"')
            .replace(/\\n/g, "\n")
            .trim();

          if (cleanText.length > 100) {
            extractedSummaries.push({
              pageNumber: index + 1,
              title: `Page ${index + 1} Content`,
              summary: cleanText,
            });
          }
        });
      }
    }

    debugLog(
      `Extracted ${extractedSummaries.length} summaries from partial JSON`
    );
    return extractedSummaries;
  } catch (error) {
    debugError("Error extracting partial JSON content:", error);
    return [];
  }
}

/**
 * Validates and cleans a title to ensure it's meaningful
 * @param {string} title - The title to validate
 * @param {number} pageNumber - The page number for fallback
 * @returns {string} - Validated title
 */
function validateAndCleanTitle(title, pageNumber) {
  // Check if title exists and is a string
  if (!title || typeof title !== "string") {
    debugWarn(
      `Page ${pageNumber}: Title is not a valid string, needs generation`
    );
    return null; // Return null to trigger better title generation
  }

  // Trim and check length
  const cleanTitle = title.trim();

  // Check for single character or very short titles
  if (cleanTitle.length < 10) {
    debugWarn(
      `Page ${pageNumber}: Title too short ("${cleanTitle}"), needs better title`
    );
    return null;
  }

  // List of generic titles to reject
  const genericTitles = [
    /^page\s*\d*\s*(content|topics?|overview)?$/i,
    /^(overview|introduction|summary|content|topics?)$/i,
    /^(key\s+)?(points?|concepts?|information)$/i,
    /^(business|course|chapter)\s*(concepts?|information)?$/i,
    /^(section|unit|module)\s*\d*$/i,
    /^(data|info|details?)$/i,
    /^page\s+\d+$/i,
  ];

  // Check if title is generic
  const isGeneric = genericTitles.some((pattern) => pattern.test(cleanTitle));
  if (isGeneric) {
    debugWarn(
      `Page ${pageNumber}: Title is too generic ("${cleanTitle}"), needs descriptive title`
    );
    return null;
  }

  // Check if title is just a number or single word
  if (
    /^[\d\W]+$/.test(cleanTitle) ||
    (cleanTitle.split(/\s+/).length < 3 && cleanTitle.length < 15)
  ) {
    debugWarn(
      `Page ${pageNumber}: Title not descriptive enough ("${cleanTitle}"), needs improvement`
    );
    return null;
  }

  // Remove any trailing punctuation except for question marks
  const processedTitle = cleanTitle.replace(/[.,;:!]+$/, "").trim();

  // Ensure title doesn't exceed reasonable length
  if (processedTitle.length > 100) {
    return processedTitle.substring(0, 97) + "...";
  }

  debugLog(`Page ${pageNumber}: Title validated: "${processedTitle}"`);
  return processedTitle;
}

/**
 * Validates and cleans summary text to remove forbidden phrases
 * @param {string} summary - The summary to validate
 * @param {number} pageNumber - The page number for context
 * @returns {string} - Cleaned summary
 */
function validateAndCleanSummary(summary, pageNumber) {
  if (!summary || typeof summary !== "string") {
    return `Page ${pageNumber} content could not be processed properly.`;
  }

  let cleanedSummary = summary.trim();

  // First, ensure the content has proper structure
  cleanedSummary = ensureContentStructure(cleanedSummary);

  // Fix broken HTML formatting from AI responses
  cleanedSummary = fixBrokenHtmlFormatting(cleanedSummary);

  // List of forbidden starting phrases to remove
  const forbiddenPhrases = [
    /^This page\s+(describes?|covers?|explains?|discusses?|presents?|contains?|includes?|provides?)\s*/i,
    /^This chapter\s+(describes?|covers?|explains?|discusses?|presents?|contains?|includes?|provides?)\s*/i,
    /^This section\s+(describes?|covers?|explains?|discusses?|presents?|contains?|includes?|provides?)\s*/i,
    /^The page\s+(describes?|covers?|explains?|discusses?|presents?|contains?|includes?|provides?)\s*/i,
    /^The content\s+(describes?|covers?|explains?|discusses?|presents?|contains?|includes?|provides?)\s*/i,
    /^Students are tasked with\s*/i,
    /^The core aim is\s*/i,
    /^This document\s+(describes?|covers?|explains?|discusses?|presents?|contains?|includes?|provides?)\s*/i,
    /^Here we\s+(discuss|explore|examine|look at)\s*/i,
    /^In this page,?\s*/i,
    /^On this page,?\s*/i,
  ];

  // Remove forbidden phrases from the beginning
  for (const phrase of forbiddenPhrases) {
    if (phrase.test(cleanedSummary)) {
      console.log(
        `Page ${pageNumber}: Removing forbidden phrase from summary start`
      );
      cleanedSummary = cleanedSummary.replace(phrase, "");

      // Capitalize the first letter of the cleaned summary
      if (cleanedSummary.length > 0) {
        cleanedSummary =
          cleanedSummary.charAt(0).toUpperCase() + cleanedSummary.slice(1);
      }
      break;
    }
  }

  // Additional cleaning: Remove "Page X:" or similar prefixes
  cleanedSummary = cleanedSummary.replace(/^Page\s+\d+\s*:\s*/i, "");

  // Ensure summary is not empty after cleaning
  if (!cleanedSummary.trim()) {
    return `Content for page ${pageNumber} requires manual review.`;
  }

  return cleanedSummary;
}

/**
 * Generates a descriptive title by analyzing page content
 * @param {string} pageText - The content of the page
 * @param {number} pageNumber - The page number
 * @returns {string} - Generated descriptive title
 */
function generateDescriptiveTitle(pageText, pageNumber) {
  const cleanText = pageText.trim();

  if (!cleanText) {
    return `Page ${pageNumber} Content`;
  }

  // Try multiple strategies to extract a descriptive title

  // 1. Look for numbered main sections
  const sectionMatch = cleanText.match(/^\d+\.\s+([A-Z][^.\n]{10,60})/m);
  if (sectionMatch && sectionMatch[1]) {
    const sectionTitle = sectionMatch[1].trim();
    if (sectionTitle.length >= 15) {
      debugLog(`Page ${pageNumber}: Found section title: "${sectionTitle}"`);
      return sectionTitle;
    }
  }

  // 2. Extract key concepts and terms
  const keyTerms = extractKeyTerms(cleanText);
  if (keyTerms.length >= 2) {
    const descriptiveTitle = createTitleFromKeyTerms(keyTerms, cleanText);
    if (descriptiveTitle) {
      debugLog(
        `Page ${pageNumber}: Created title from key terms: "${descriptiveTitle}"`
      );
      return descriptiveTitle;
    }
  }

  // 3. Look for definition patterns
  const definitionMatch = cleanText.match(
    /([A-Z][a-zA-Z\s]{5,40})(?:\s+(?:is|are|means|refers to|can be defined as))\s+/i
  );
  if (definitionMatch && definitionMatch[1]) {
    const term = definitionMatch[1].trim();
    return `${term} Definition and Explanation`;
  }

  // 4. Look for comparison patterns
  const comparisonMatch = cleanText.match(
    /(?:comparing|difference between|versus|vs\.?)\s+([A-Za-z\s,&]{10,50})/i
  );
  if (comparisonMatch && comparisonMatch[1]) {
    return `Comparing ${comparisonMatch[1].trim()}`;
  }

  // 5. Look for process/steps patterns
  const processMatch = cleanText.match(
    /(?:steps|process|procedure|how to)\s+([A-Za-z\s]{10,40})/i
  );
  if (processMatch && processMatch[1]) {
    return `Process of ${processMatch[1].trim()}`;
  }

  // 6. Analyze content structure for main topic
  const mainTopic = analyzeMainTopic(cleanText);
  if (mainTopic) {
    debugLog(`Page ${pageNumber}: Identified main topic: "${mainTopic}"`);
    return mainTopic;
  }

  // 7. Last resort - extract from first substantial sentence
  const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [];
  for (const sentence of sentences.slice(0, 3)) {
    const cleanSentence = sentence.trim();
    if (cleanSentence.length > 30) {
      const titleFromSentence = createTitleFromSentence(cleanSentence);
      if (titleFromSentence && titleFromSentence.length >= 15) {
        return titleFromSentence;
      }
    }
  }

  return `Page ${pageNumber} Analysis`;
}

/**
 * Extracts key terms from text for title generation
 * @param {string} text - The text to analyze
 * @returns {Array<string>} - Array of key terms
 */
function extractKeyTerms(text) {
  const keyTerms = [];

  // Look for capitalized terms (proper nouns, important concepts)
  const capitalizedTerms = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];

  // Filter and deduplicate
  const termCounts = {};
  capitalizedTerms.forEach((term) => {
    if (
      term.length > 3 &&
      !["The", "This", "That", "These", "Those"].includes(term)
    ) {
      termCounts[term] = (termCounts[term] || 0) + 1;
    }
  });

  // Sort by frequency and take top terms
  Object.entries(termCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([term]) => keyTerms.push(term));

  return keyTerms;
}

/**
 * Creates a descriptive title from key terms
 * @param {Array<string>} keyTerms - Key terms extracted from content
 * @param {string} fullText - Full text for context
 * @returns {string|null} - Generated title or null
 */
function createTitleFromKeyTerms(keyTerms, fullText) {
  if (keyTerms.length === 0) return null;

  // Check if terms are related to specific patterns
  const lowerText = fullText.toLowerCase();

  if (lowerText.includes("advantage") || lowerText.includes("benefit")) {
    return `${keyTerms[0]} Advantages and Benefits`;
  }

  if (lowerText.includes("disadvantage") || lowerText.includes("limitation")) {
    return `${keyTerms[0]} Limitations and Challenges`;
  }

  if (
    lowerText.includes("type") ||
    lowerText.includes("form") ||
    lowerText.includes("structure")
  ) {
    return `Types of ${keyTerms[0]} Structures`;
  }

  if (lowerText.includes("process") || lowerText.includes("procedure")) {
    return `${keyTerms[0]} Process Overview`;
  }

  // Default: combine top terms
  if (keyTerms.length >= 2) {
    return `${keyTerms[0]} and ${keyTerms[1]} Overview`;
  }

  return `${keyTerms[0]} Fundamentals`;
}

/**
 * Analyzes text to identify the main topic
 * @param {string} text - Text to analyze
 * @returns {string|null} - Main topic or null
 */
function analyzeMainTopic(text) {
  // Look for repeated important terms
  const words = text.split(/\s+/);
  const importantWords = {};

  words.forEach((word) => {
    const cleaned = word.replace(/[^\w]/g, "").toLowerCase();
    if (cleaned.length > 4 && !commonWords.includes(cleaned)) {
      importantWords[cleaned] = (importantWords[cleaned] || 0) + 1;
    }
  });

  // Find most frequent important words
  const topWords = Object.entries(importantWords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);

  if (topWords.length >= 2) {
    // Capitalize and create title
    const capitalizedWords = topWords.map(
      (w) => w.charAt(0).toUpperCase() + w.slice(1)
    );
    return `${capitalizedWords[0]} and ${capitalizedWords[1]} Analysis`;
  }

  return null;
}

/**
 * Creates a title from a sentence
 * @param {string} sentence - Sentence to convert
 * @returns {string|null} - Title or null
 */
function createTitleFromSentence(sentence) {
  // Remove common starting words
  const cleaned = sentence
    .replace(/^(This|The|An?|In|On|At|From|To|For|With|About)\s+/i, "")
    .replace(/[.!?]+$/, "")
    .trim();

  // Extract meaningful words
  const words = cleaned
    .split(/\s+/)
    .filter(
      (word) => word.length > 2 && !commonWords.includes(word.toLowerCase())
    );

  if (words.length >= 3) {
    // Take first 5-7 meaningful words
    const titleWords = words.slice(0, 7).join(" ");

    // Ensure proper capitalization
    return titleWords
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  return null;
}

// Common words to exclude from analysis
const commonWords = [
  "the",
  "and",
  "but",
  "for",
  "with",
  "that",
  "this",
  "these",
  "those",
  "are",
  "was",
  "were",
  "been",
  "have",
  "has",
  "had",
  "will",
  "would",
  "can",
  "could",
  "should",
  "may",
  "might",
  "must",
  "shall",
  "also",
  "very",
  "much",
  "many",
  "some",
  "more",
  "most",
  "other",
  "another",
  "such",
  "only",
  "just",
  "even",
  "still",
  "already",
  "however",
];

/**
 * Ensures content has proper structure even if AI didn't format it correctly
 * @param {string} content - The content to structure
 * @returns {string} - Structured content
 */
function ensureContentStructure(content) {
  // Check if content already has numbered sections
  if (/^\d+\.\s+[A-Z]/m.test(content)) {
    // Content appears to have structure, just ensure spacing
    return content
      .replace(/(\d+\.\s+[A-Z][^\n]+)\n(?!\n)/g, "$1\n\n") // Add double line after section headers
      .replace(/([.!?])\n(?![-•\d])/g, "$1\n\n"); // Add double line between paragraphs
  }

  // Content lacks structure - try to add it
  const paragraphs = content.split(/\n\s*\n+/).filter((p) => p.trim());

  if (paragraphs.length === 0) return content;

  // If content is just one big paragraph, try to break it up
  if (paragraphs.length === 1 && paragraphs[0].length > 300) {
    const sentences = paragraphs[0].match(/[^.!?]+[.!?]+/g) || [paragraphs[0]];

    // Look for topic changes or key concepts
    let structured = "";
    let sectionNum = 1;
    let currentSection = "";

    sentences.forEach((sentence, index) => {
      const trimmed = sentence.trim();

      // Check if this sentence introduces a new concept
      if (
        index > 0 &&
        (/^[A-Z][a-z]+ (?:is|are|means|refers to|can be|involves)/i.test(
          trimmed
        ) ||
          /^(?:Another|Additionally|Furthermore|Moreover|Also)/i.test(
            trimmed
          ) ||
          index % 4 === 0) // Break every 4 sentences if no other pattern found
      ) {
        // Start new section
        if (currentSection) {
          // Extract a title from the first sentence of the section
          const titleMatch = currentSection.match(/^([A-Z][a-zA-Z\s]{10,40})/);
          const title = titleMatch
            ? titleMatch[1].trim()
            : `Key Concept ${sectionNum}`;

          structured += `${sectionNum}. ${title}\n\n${currentSection}\n\n`;
          sectionNum++;
          currentSection = trimmed;
        }
      } else {
        currentSection += (currentSection ? " " : "") + trimmed;
      }
    });

    // Add the last section
    if (currentSection) {
      const titleMatch = currentSection.match(/^([A-Z][a-zA-Z\s]{10,40})/);
      const title = titleMatch
        ? titleMatch[1].trim()
        : `Key Concept ${sectionNum}`;
      structured += `${sectionNum}. ${title}\n\n${currentSection}`;
    }

    return structured || content;
  }

  // Multiple paragraphs - add structure to each
  return paragraphs
    .map((para, index) => {
      // If paragraph starts with a capital letter and is relatively short, might be a heading
      if (para.length < 100 && /^[A-Z]/.test(para) && !para.includes(".")) {
        return `${index + 1}. ${para}`;
      }
      return para;
    })
    .join("\n\n");
}

/**
 * Fixes broken HTML formatting that sometimes appears in AI responses
 * @param {string} content - Content that may have broken HTML
 * @returns {string} - Content with fixed formatting
 */
function fixBrokenHtmlFormatting(content) {
  if (!content || typeof content !== "string") {
    return content;
  }

  // Ultra-aggressive HTML/CSS cleaning for AI-generated content
  let fixed = content
    // Remove all HTML tags completely (any < > pattern)
    .replace(/<[^>]*>/g, "")
    
    // AGGRESSIVE: Remove any quoted strings containing CSS class patterns
    .replace(/"[^"]*(?:font-|text-|bg-|border-|p-|m-|w-|h-|flex|block|inline|grid)[^"]*"/g, "")
    .replace(/"[^"]*(?:semibold|medium|bold|italic|underline|uppercase|lowercase)[^"]*"/g, "")  
    .replace(/"[^"]*(?:gray-|blue-|red-|green-|white|black|purple-|pink-|yellow-)[^"]*"/g, "")
    .replace(/"[^"]*(?:dark:|hover:|focus:|sm:|md:|lg:|xl:)[^"]*"/g, "")
    .replace(/"[^"]*(?:-\d+|space-|gap-|rounded|shadow)[^"]*"/g, "")
    
    // Remove specific problem patterns mentioned by user
    .replace(/font-semibold\s+text-gray-900\s+dark:text-gray-100/g, "")
    .replace(/class="[^"]*"/g, "")
    .replace(/className="[^"]*"/g, "")
    
    // Remove any standalone CSS class names (without quotes)
    .replace(/\b(?:font-(?:semibold|medium|bold)|text-(?:gray-\d+|lg|xl|sm)|dark:text-gray-\d+|bg-\w+)\b/g, "")
    .replace(/\b(?:p-\d+|m-\d+|w-\d+|h-\d+|flex|block|inline|grid|rounded|shadow)\b/g, "")
    
    // Remove backslash-escaped quotes around CSS classes  
    .replace(/\\"[^"]*(?:font-|text-|class)[^"]*\\"/g, "")
    
    // Remove HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, "")
    .replace(/&[a-zA-Z]+;/g, "")

    // Clean up any remaining HTML attribute patterns
    .replace(/\s*(?:class|style|id)\s*=\s*"[^"]*"/g, "")
    .replace(/\s*(?:class|style|id)\s*=\s*'[^']*'/g, "")

    // Remove orphaned quotes, brackets, and CSS fragments
    .replace(/\s*">\s*/g, " ")
    .replace(/\s*<[^>]*>\s*/g, " ")
    .replace(/\s*\\?"[^"]*(?:font|text|class|style)[^"]*\\?"\s*/g, " ")
    .replace(/>\s*</g, " ")

    // Clean up markdown formatting
    .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold markdown
    .replace(/\*(.*?)\*/g, "$1") // Remove italic markdown  
    .replace(/`(.*?)`/g, "$1") // Remove code markdown
    .replace(/#{1,6}\s+/g, "") // Remove markdown headers

    // Fix spacing and formatting
    .replace(/\s{3,}/g, " ") // Reduce multiple spaces to single space
    .replace(/\n\s*\n\s*\n+/g, "\n\n") // Limit to double line breaks
    .replace(/^\s+|\s+$/gm, "") // Trim whitespace from each line
    .replace(/^\s+|\s+$/g, ""); // Trim overall

  // If we removed content, log it with details
  if (fixed !== content) {
    debugLog("Cleaned HTML/formatting from AI response");
    debugLog("Original content preview:", content.substring(0, 200));
    debugLog("Cleaned content preview:", fixed.substring(0, 200));

    // Log specific HTML patterns found
    const htmlTags = content.match(/<[^>]*>/g);
    const cssClasses = content.match(/"[^"]*(?:font-|text-|class=)[^"]*"/g);

    if (htmlTags) {
      debugLog("HTML tags found:", htmlTags.slice(0, 5));
    }
    if (cssClasses) {
      debugLog("CSS classes found:", cssClasses.slice(0, 5));
    }
  }

  return fixed;
}

/**
 * Generates a descriptive title for a page based on its content
 * @param {string} pageText - The content of the page
 * @param {number} pageNumber - The page number
 * @returns {string} - Generated title
 */
function generatePageTitle(pageText, pageNumber) {
  const cleanText = pageText.trim();

  if (!cleanText) {
    return `Page ${pageNumber} Content`;
  }

  // Look for obvious titles or headings
  const titlePatterns = [
    /^([A-Z][A-Za-z\s]{5,40})\s*$/m,
    /^([A-Z][A-Za-z\s:]{10,50})/,
    /([A-Z][A-Za-z\s]{8,40})(?:\s*[-:]\s*)/,
    /Exhibit\s+[\d.]+\s+([A-Z][A-Za-z\s]{5,40})/i,
    /Chapter\s+\d+[\s:]+([A-Z][A-Za-z\s]{5,40})/i,
  ];

  for (const pattern of titlePatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      const title = match[1].trim();
      if (title.length >= 5 && title.length <= 50) {
        return title;
      }
    }
  }

  // Detect content type and create appropriate title
  if (
    /(?:question|activity|exercise|critical thinking|discuss)/i.test(cleanText)
  ) {
    if (/critical thinking/i.test(cleanText)) {
      return "Critical Thinking Exercise";
    } else if (/question/i.test(cleanText)) {
      return "Discussion Questions";
    } else {
      return "Learning Activity";
    }
  }

  if (/(?:definition|means|refers to|defined as)/i.test(cleanText)) {
    const definitionMatch = cleanText.match(
      /([A-Z][a-zA-Z\s]{3,25})(?:\s*[-:]|\s+is\s+|\s+means\s+)/
    );
    if (definitionMatch) {
      return `${definitionMatch[1].trim()} Definition`;
    }
    return "Key Definitions";
  }

  if (/(?:advantage|benefit|characteristic|feature)/i.test(cleanText)) {
    const topicMatch = cleanText.match(
      /(?:advantage|benefit)s?\s+of\s+([A-Z][a-zA-Z\s]{5,30})/i
    );
    if (topicMatch) {
      return `Advantages of ${topicMatch[1].trim()}`;
    }
    return "Key Advantages";
  }

  if (/(?:syllabus|grading|policy|instructor|contact)/i.test(cleanText)) {
    return "Course Information";
  }

  // Extract first significant phrase
  const sentences = cleanText
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 10);
  if (sentences.length > 0) {
    const firstSentence = sentences[0].trim();
    const words = firstSentence.split(/\s+/).slice(0, 6).join(" ");
    if (words.length > 5 && words.length <= 50) {
      return words;
    }
  }

  // Fallback
  return `Page ${pageNumber} Topics`;
}

/**
 * Generates educational fallback content when AI produces inadequate summaries
 * @param {string} pageText - Original page text
 * @param {number} pageNumber - Page number
 * @param {string} title - Page title
 * @returns {string} - Educational content
 */
function generateEducationalFallback(pageText, pageNumber, title) {
  const { minWordsPerPage, targetWordsPerPage } = GENERATION_CONFIG.brief;
  
  // Extract key concepts from the page text
  const sentences = pageText.match(/[^.!?]+[.!?]+/g) || [];
  const keywords = pageText.match(/\b[A-Z][a-z]{3,}\b/g) || [];
  const uniqueKeywords = [...new Set(keywords)].slice(0, 5);
  
  let fallbackContent = `1. Educational Overview of ${title.replace(/Page \d+ /, '').replace(/Educational Content/, 'Key Concepts')}\n\n`;
  
  // Add concept explanation
  fallbackContent += `This page covers important educational concepts that require careful study and understanding. `;
  
  if (uniqueKeywords.length > 0) {
    fallbackContent += `The key topics discussed include ${uniqueKeywords.slice(0, 3).join(', ')}, each of which plays a crucial role in the overall subject matter.\n\n`;
  } else {
    fallbackContent += `The content presents fundamental principles that students need to master for comprehensive understanding.\n\n`;
  }
  
  // Add detailed sections based on available content
  if (sentences.length > 0) {
    fallbackContent += `2. Core Learning Points\n\n`;
    
    // Process first few sentences to create educational content
    for (let i = 0; i < Math.min(3, sentences.length); i++) {
      const sentence = sentences[i].trim();
      if (sentence.length > 20) {
        fallbackContent += `The material explains that ${sentence.toLowerCase().replace(/^[a-z]/, c => c.toUpperCase())} `;
        fallbackContent += `This concept is significant because it provides foundation knowledge that students can apply in practical situations. `;
        fallbackContent += `Understanding this principle helps learners develop critical thinking skills and analytical capabilities.\n\n`;
      }
    }
  }
  
  // Add application section
  fallbackContent += `3. Practical Applications and Learning Outcomes\n\n`;
  fallbackContent += `Students studying this material will gain valuable insights into real-world applications. `;
  fallbackContent += `The concepts presented here connect to broader educational themes and provide essential knowledge for advanced study. `;
  fallbackContent += `Mastery of these ideas enables learners to analyze complex situations, make informed decisions, and apply theoretical knowledge in practical contexts.\n\n`;
  
  // Add study guidance
  fallbackContent += `For effective learning, students should review the key concepts multiple times, practice applying the principles in different scenarios, and connect these ideas to previous course material. `;
  fallbackContent += `This comprehensive approach ensures deep understanding and long-term retention of the educational content.`;
  
  // Ensure minimum word count
  const currentWordCount = fallbackContent.split(/\s+/).length;
  if (currentWordCount < minWordsPerPage) {
    fallbackContent += `\n\n4. Additional Learning Considerations\n\n`;
    fallbackContent += `The depth and complexity of this material requires sustained attention and active engagement from students. `;
    fallbackContent += `Effective study strategies include summarizing key points, creating concept maps, discussing ideas with peers, and seeking clarification on challenging concepts. `;
    fallbackContent += `Regular review and practice application of these principles will reinforce learning and improve academic performance. `;
    fallbackContent += `Students are encouraged to explore additional resources and examples to enhance their understanding of these important educational concepts.`;
  }
  
  return fallbackContent;
}

/**
 * Repairs common quote-related JSON issues in AI responses
 * @param {string} jsonText - The malformed JSON text
 * @returns {string} - Repaired JSON text
 */
function repairQuotesInJson(jsonText) {
  debugLog("Attempting aggressive quote repair...");

  let repaired = jsonText;

  // Strategy 1: Find and escape unescaped quotes within string values
  // Look for patterns like: "text with "quotes" inside"
  repaired = repaired.replace(
    /"([^"]*)"([^"]*)"([^"]*)"(\s*[,}])/g,
    '"$1\\"$2\\"$3"$4'
  );

  // Strategy 2: Replace common problematic patterns
  repaired = repaired
    // Fix "long battery life" type issues
    .replace(/"([^"]*)"([^"]*)"([^"]*)/g, (match, p1, p2, p3) => {
      // If this looks like a property value (has comma or brace after), fix it
      if (/"[^"]*"[^"]*"[^"]*"(\s*[,}])/.test(match + '"')) {
        return `"${p1}\\"${p2}\\"${p3}`;
      }
      return match;
    })
    // Fix single quotes in content that should be escaped
    .replace(/([''])/g, "'")
    // Fix em-dashes and other problematic characters
    .replace(/[–—]/g, "-")
    // Remove any control characters
    .replace(/[\x00-\x1F\x7F]/g, "");

  // Strategy 3: If we still have issues, try to isolate and fix specific problem areas
  try {
    JSON.parse(repaired);
    debugLog("Quote repair successful");
    return repaired;
  } catch (error) {
    debugLog("Quote repair partially successful, applying final fixes...");

    // Last resort: replace problematic quotes with safe alternatives
    repaired = repaired.replace(
      /"([^"]*)"([^"]*)"([^"]*)"(\s*[,}])/g,
      '"$1 $2 $3"$4'
    );

    return repaired;
  }
}
