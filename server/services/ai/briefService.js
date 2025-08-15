/**
 * Brief Generation Service
 */

import { geminiAI, geminiModel } from "../../config/gemini.js";
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
      model: geminiModelBrief,
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

    // Check for extremely large responses that might cause parsing issues
    if (responseText.length > 100000) {
      console.warn(
        `Response very large (${responseText.length} chars), truncating to prevent JSON parsing issues`
      );
      // Try to find a safe truncation point within JSON structure
      const lastCompleteEntry = responseText.lastIndexOf('"}');
      if (lastCompleteEntry > 50000) {
        responseText = responseText.substring(0, lastCompleteEntry + 2) + "]}";
      } else {
        responseText = responseText.substring(0, 80000);
      }
    }

    // Parse JSON response with enhanced error handling
    const parsedResponse = parseJsonWithFallbacks(responseText, {
      logErrors: true,
      maxAttempts: 3,
    });

    if (!parsedResponse) {
      console.error(
        "Failed to parse brief response, using content extraction fallback"
      );
      console.error("Response length:", responseText.length);
      console.error("Response preview:", responseText.substring(0, 500));

      // Try to extract partial content from malformed JSON
      const extractedContent = extractPartialJsonContent(responseText);
      if (extractedContent && extractedContent.length > 0) {
        console.log(
          `Extracted ${extractedContent.length} partial summaries from malformed JSON`
        );
        return { pageSummaries: extractedContent };
      }

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

    // ENHANCED LOGGING: Log complete structure of parsed response
    console.log("🔍 === BRIEF GENERATION DEBUG ===");
    console.log(
      `Total summaries generated: ${parsedResponse.pageSummaries.length}`
    );

    // Log each page summary with title details
    parsedResponse.pageSummaries.forEach((page, index) => {
      console.log(`📄 Page ${page.pageNumber || index + 1}:`);
      console.log(
        `   Title: "${page.title}" (length: ${
          page.title ? page.title.length : 0
        })`
      );
      console.log(`   Title type: ${typeof page.title}`);
      console.log(
        `   Summary length: ${page.summary ? page.summary.length : 0} chars`
      );
      console.log(
        `   Summary preview: ${
          page.summary ? page.summary.substring(0, 100) + "..." : "No summary"
        }`
      );

      // Validate and fix titles
      if (
        !page.title ||
        typeof page.title !== "string" ||
        page.title.length < 3
      ) {
        console.warn(`   ⚠️ Invalid title detected! Generating fallback...`);
        const fallbackTitle = generatePageTitle(
          page.summary || "",
          page.pageNumber || index + 1
        );
        page.title = fallbackTitle;
        console.log(`   ✅ New title: "${page.title}"`);
      }
    });
    console.log("🔍 === END DEBUG ===");

    // Validate and clean summaries
    parsedResponse.pageSummaries = parsedResponse.pageSummaries.map((page) => {
      // Validate title
      const validatedTitle = validateAndCleanTitle(page.title, page.pageNumber);

      // If title is invalid, generate a better one from content
      let finalTitle = validatedTitle;
      if (!validatedTitle) {
        console.log(
          `Page ${page.pageNumber}: Generating descriptive title from content analysis...`
        );
        finalTitle = generateDescriptiveTitle(
          page.summary || "",
          page.pageNumber
        );
      }

      return {
        ...page,
        title: finalTitle,
        summary: validateAndCleanSummary(page.summary, page.pageNumber),
      };
    });

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

/**
 * Validates and enhances a summary to ensure proper structure and length
 * @param {string} summary - The summary text to validate
 * @param {number} pageNumber - The page number for context
 * @returns {string} - Enhanced summary
 */
function validateAndEnhanceSummary(summary, pageNumber) {
  if (!summary || typeof summary !== "string") {
    console.warn(`Page ${pageNumber}: Invalid summary type, using fallback`);
    return `Page ${pageNumber} content could not be processed properly. This may contain administrative information or content that requires manual review.`;
  }

  const trimmedSummary = summary.trim();

  if (trimmedSummary.length === 0) {
    console.warn(`Page ${pageNumber}: Empty summary, using fallback`);
    return `Page ${pageNumber} appears to be empty or contains no extractable content.`;
  }

  // Check word count
  const wordCount = trimmedSummary
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
  const { minWordsPerPage, targetWordsPerPage } = GENERATION_CONFIG.brief;

  if (wordCount < minWordsPerPage / 2) {
    console.warn(
      `Page ${pageNumber}: Summary too short (${wordCount} words), may need enhancement`
    );

    // Add context to short summaries
    const enhancedSummary = `${trimmedSummary}\n\nThis page contains limited content that may benefit from additional context or manual review to fully understand its educational significance.`;
    return enhancedSummary;
  }

  if (wordCount > targetWordsPerPage * 1.5) {
    console.warn(
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
  console.log("Attempting to extract partial content from malformed JSON");

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

    console.log(
      `Extracted ${extractedSummaries.length} summaries from partial JSON`
    );
    return extractedSummaries;
  } catch (error) {
    console.error("Error extracting partial JSON content:", error);
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
    console.warn(
      `Page ${pageNumber}: Title is not a valid string, needs generation`
    );
    return null; // Return null to trigger better title generation
  }

  // Trim and check length
  const cleanTitle = title.trim();

  // Check for single character or very short titles
  if (cleanTitle.length < 10) {
    console.warn(
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
    console.warn(
      `Page ${pageNumber}: Title is too generic ("${cleanTitle}"), needs descriptive title`
    );
    return null;
  }

  // Check if title is just a number or single word
  if (
    /^[\d\W]+$/.test(cleanTitle) ||
    (cleanTitle.split(/\s+/).length < 3 && cleanTitle.length < 15)
  ) {
    console.warn(
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

  console.log(`Page ${pageNumber}: Title validated: "${processedTitle}"`);
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
      console.log(`Page ${pageNumber}: Found section title: "${sectionTitle}"`);
      return sectionTitle;
    }
  }

  // 2. Extract key concepts and terms
  const keyTerms = extractKeyTerms(cleanText);
  if (keyTerms.length >= 2) {
    const descriptiveTitle = createTitleFromKeyTerms(keyTerms, cleanText);
    if (descriptiveTitle) {
      console.log(
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
    console.log(`Page ${pageNumber}: Identified main topic: "${mainTopic}"`);
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
  // The main issue: AI is generating literal HTML class strings instead of proper markup
  // Pattern like: "font-semibold text-gray-900 dark:text-gray-100">Some text

  // Fix broken HTML class strings that appear as literal text
  let fixed = content
    // Remove literal CSS class strings that appear as text
    .replace(/"font-semibold text-gray-900 dark:text-gray-100">/g, "")
    .replace(/"font-medium text-gray-900 dark:text-gray-100">/g, "")
    .replace(/"text-gray-700 dark:text-gray-300">/g, "")
    .replace(/"list-disc pl-6 my-4 space-y-2">/g, "")
    .replace(/"font-medium">/g, "")
    .replace(/"font-semibold">/g, "")
    .replace(/"italic">/g, "")

    // Fix cases where the AI puts class names before text
    .replace(/\s*"[^"]*font-[^"]*">\s*/g, " ")
    .replace(/\s*"[^"]*text-[^"]*">\s*/g, " ")

    // Clean up any orphaned quote marks or HTML fragments
    .replace(/\s*">\s*/g, " ")
    .replace(/\s*<[^>]*>\s*/g, " ")

    // Fix double spaces
    .replace(/\s{2,}/g, " ");

  console.log("🔧 Fixed HTML formatting issues in content");

  return fixed.trim();
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
