/**
 * Brief Generation Service with Enhanced Language Control
 */

import {
  geminiAI,
  geminiModel,
  geminiModelBrief,
} from "../../config/gemini.js";
import { detectLanguage, validateResponseLanguage, getLanguageFallback } from "../../utils/ai/languageUtils.js";
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

// Language validation configuration
const LANGUAGE_CONFIG = {
  MAX_RETRY_ATTEMPTS: 2,
  LANGUAGE_CONFIDENCE_THRESHOLD: 0.8, // 80% of content should be in target language
  MIXED_LANGUAGE_TOLERANCE: 0.1, // Allow 10% mixed content for technical terms
};

/**
 * Enhanced language detection with content analysis
 * @param {string} text - Text to analyze
 * @returns {Object} Language analysis result
 */
function analyzeLanguageContent(text) {
  if (!text || typeof text !== "string") {
    return { language: "English", confidence: 0, details: "No text provided" };
  }

  // Count Georgian characters
  const georgianMatches = text.match(/[\u10A0-\u10FF\u1C90-\u1CBF]/g) || [];
  const georgianCount = georgianMatches.length;

  // Count Latin characters (excluding numbers and punctuation)
  const latinMatches = text.match(/[A-Za-z]/g) || [];
  const latinCount = latinMatches.length;

  const totalLetters = georgianCount + latinCount;
  
  if (totalLetters === 0) {
    return { language: "English", confidence: 0, details: "No alphabetic characters found" };
  }

  const georgianRatio = georgianCount / totalLetters;
  const latinRatio = latinCount / totalLetters;

  // Determine primary language
  let primaryLanguage;
  let confidence;

  if (georgianRatio > 0.5) {
    primaryLanguage = "Georgian";
    confidence = georgianRatio;
  } else {
    primaryLanguage = "English";
    confidence = latinRatio;
  }

  return {
    language: primaryLanguage,
    confidence,
    details: {
      georgianCount,
      latinCount,
      georgianRatio,
      latinRatio,
      totalLetters
    }
  };
}

/**
 * Validates if AI response matches expected language with strict rules
 * @param {string} responseText - AI generated text to validate
 * @param {string} expectedLanguage - Expected language ("Georgian" or "English")
 * @returns {Object} Validation result with detailed analysis
 */
function validateLanguageStrict(responseText, expectedLanguage) {
  const analysis = analyzeLanguageContent(responseText);
  
  debugLog(`Language validation - Expected: ${expectedLanguage}, Detected: ${analysis.language}`);
  debugLog(`Language confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
  debugLog(`Language details:`, analysis.details);

  const isValid = analysis.language === expectedLanguage && 
                  analysis.confidence >= LANGUAGE_CONFIG.LANGUAGE_CONFIDENCE_THRESHOLD;

  const warnings = [];
  if (!isValid) {
    if (analysis.language !== expectedLanguage) {
      warnings.push(`Language mismatch: Expected ${expectedLanguage}, got ${analysis.language}`);
    }
    if (analysis.confidence < LANGUAGE_CONFIG.LANGUAGE_CONFIDENCE_THRESHOLD) {
      warnings.push(`Low language confidence: ${(analysis.confidence * 100).toFixed(1)}% (threshold: ${LANGUAGE_CONFIG.LANGUAGE_CONFIDENCE_THRESHOLD * 100}%)`);
    }
  }

  // Check for mixed language content
  if (expectedLanguage === "Georgian" && analysis.details.latinRatio > LANGUAGE_CONFIG.MIXED_LANGUAGE_TOLERANCE) {
    warnings.push(`Too much Latin text in Georgian content: ${(analysis.details.latinRatio * 100).toFixed(1)}%`);
  }
  if (expectedLanguage === "English" && analysis.details.georgianRatio > LANGUAGE_CONFIG.MIXED_LANGUAGE_TOLERANCE) {
    warnings.push(`Too much Georgian text in English content: ${(analysis.details.georgianRatio * 100).toFixed(1)}%`);
  }

  return {
    isValid,
    warnings,
    analysis,
    confidence: analysis.confidence
  };
}

/**
 * Enhanced brief prompt with stronger language enforcement
 * @param {string} language - Target language
 * @param {string} combinedText - Combined page text
 * @returns {string} Enhanced prompt with stricter language rules
 */
function getEnhancedBriefPrompt(language, combinedText) {
  const { targetWordsPerPage, minWordsPerPage } = GENERATION_CONFIG.brief;
  const pageCount = (combinedText.match(/=== PAGE \d+ ===/g) || []).length || 1;

  // Override with longer word counts
  const minWords = 300;
  const targetWords = 500;

  const languageInstructions = language === "Georgian" ? 
    `
CRITICAL LANGUAGE REQUIREMENT - GEORGIAN OUTPUT:
- Use ONLY Georgian script (Mkhedruli: ა-ჰ, Mtavruli: Ა-Ჰ)
- FORBIDDEN: Any Latin letters (A-Z, a-z) except in proper nouns or technical terms
- Write ALL content, titles, and explanations in Georgian
- Use Georgian equivalents for common terms
- Numbers (0-9) and punctuation are allowed
- If source contains English terms, either translate them or use Georgian equivalents
- SELF-CHECK: Before responding, verify NO English sentences or paragraphs exist in your output
` : `
CRITICAL LANGUAGE REQUIREMENT - ENGLISH OUTPUT:
- Use ONLY English (Latin script: A-Z, a-z)
- FORBIDDEN: Any Georgian characters (ა-ჰ, Ა-Ჰ, or Unicode \\u10A0-\\u10FF)
- Write ALL content, titles, and explanations in English
- Numbers (0-9) and punctuation are allowed
- If source contains Georgian text, focus on translating concepts into English
- SELF-CHECK: Before responding, verify NO Georgian characters exist in your output
`;

  return `
SYSTEM ROLE:
You are a brief generation AI that produces ONLY valid JSON with comprehensive educational summaries. You must follow language requirements EXACTLY.

${languageInstructions}

LANGUAGE VALIDATION CHECKPOINT:
Before generating your response, you MUST:
1. Write your content in ${language} only
2. Double-check every word, title, and sentence
3. If you find ANY forbidden characters, rewrite that section
4. Only output the final JSON when 100% compliant with language rules

OUTPUT FORMAT (STRICT):
Return EXACTLY this JSON structure:
{
  "pageSummaries": [
    {
      "pageNumber": 1,
      "title": "Specific topic title in ${language} only",
      "summary": "## Main Section\\n\\nDetailed educational content in ${language}...\\n\\n### Subsection 1\\n\\nDetailed explanation...\\n\\n### Subsection 2\\n\\nMore comprehensive content..."
    }
  ]
}

CONTENT REQUIREMENTS:
- Generate exactly ${pageCount} page summaries
- Each summary: ${minWords}-${targetWords} words in ${language} (MANDATORY MINIMUM: ${minWords} words)
- Use extensive Markdown formatting within summary strings (##, ###, **bold**, *italic*, lists, etc.)
- Educational focus with deep explanations: 
  * Explain core concepts thoroughly
  * Provide multiple relevant examples
  * Show practical applications and use cases
  * Include context and background information
  * Add detailed analysis and insights
- Break content into multiple subsections using ### headers
- Include bullet points or numbered lists where appropriate
- Titles must be specific and descriptive (not generic like "Page 1" or "Content")
- Aim for comprehensive coverage that fully explores the topic

CONTENT EXPANSION STRATEGIES:
- Add background context and historical perspective
- Include step-by-step explanations
- Provide multiple examples and case studies
- Explain implications and consequences
- Add comparative analysis
- Include practical tips and recommendations
- Elaborate on key terms and concepts
- Connect ideas to broader themes

ABSOLUTELY FORBIDDEN IN OUTPUT:
- HTML tags or CSS classes
- Mixed languages (stick to ${language} only)
- Code fences outside JSON structure
- Administrative/meta content
- Summaries shorter than ${minWords} words

FINAL VERIFICATION:
After generating, scan your entire response for:
1. Forbidden characters (regenerate if found)
2. Word count compliance (each summary must be ${minWords}-${targetWords} words)
3. Proper JSON structure and Markdown formatting

SOURCE CONTENT:
${combinedText}

Generate the comprehensive brief in ${language} only with ${minWords}-${targetWords} words per page summary:`;
}
/**
 * Processes AI response with language validation and retry logic
 * @param {string} responseText - Raw AI response
 * @param {string} expectedLanguage - Expected language
 * @param {Array} batchPages - Original page content for fallback
 * @param {number} attemptNumber - Current attempt number
 * @returns {Object} Processed and validated response
 */
async function processResponseWithLanguageValidation(responseText, expectedLanguage, batchPages, attemptNumber = 1) {
  debugLog(`=== LANGUAGE VALIDATION ATTEMPT ${attemptNumber} ===`);
  
  // First validate the language
  const languageValidation = validateLanguageStrict(responseText, expectedLanguage);
  
  if (!languageValidation.isValid) {
    debugError(`Language validation failed on attempt ${attemptNumber}:`);
    languageValidation.warnings.forEach(warning => debugError(`  - ${warning}`));
    
    if (attemptNumber < LANGUAGE_CONFIG.MAX_RETRY_ATTEMPTS) {
      debugLog(`Retrying with enhanced language prompt...`);
      throw new Error(`LANGUAGE_MISMATCH_RETRY: ${languageValidation.warnings.join('; ')}`);
    } else {
      debugError(`Max retry attempts reached. Using fallback with correct language.`);
      return createLanguageCorrectFallback(batchPages, expectedLanguage);
    }
  }

  debugLog(`✅ Language validation passed with ${(languageValidation.confidence * 100).toFixed(1)}% confidence`);

  // Parse JSON
  let parsedResponse;
  try {
    parsedResponse = JSON.parse(responseText);
    debugLog("✅ Successfully parsed JSON response");
  } catch (parseError) {
    debugError("JSON parsing failed:", parseError.message);
    // Try to extract and clean JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsedResponse = JSON.parse(jsonMatch[0]);
        debugLog("✅ Successfully parsed extracted JSON");
      } catch (extractError) {
        debugError("Failed to parse extracted JSON, using fallback");
        return createLanguageCorrectFallback(batchPages, expectedLanguage);
      }
    } else {
      return createLanguageCorrectFallback(batchPages, expectedLanguage);
    }
  }

  // Validate brief structure
  if (!validateBrief(parsedResponse)) {
    debugError("Brief structure validation failed");
    return createLanguageCorrectFallback(batchPages, expectedLanguage);
  }

  // Additional language validation on individual summaries
  let hasLanguageIssues = false;
  parsedResponse.pageSummaries = parsedResponse.pageSummaries.map((page, index) => {
    const titleValidation = validateLanguageStrict(page.title || '', expectedLanguage);
    const summaryValidation = validateLanguageStrict(page.summary || '', expectedLanguage);
    
    if (!titleValidation.isValid || !summaryValidation.isValid) {
      debugWarn(`Page ${page.pageNumber || index + 1} has language issues, fixing...`);
      hasLanguageIssues = true;
      
      return {
        ...page,
        title: generateLanguageCorrectTitle(page.title, expectedLanguage, index + 1),
        summary: generateLanguageCorrectSummary(page.summary, batchPages[index], expectedLanguage, index + 1)
      };
    }
    
    return page;
  });

  if (hasLanguageIssues) {
    debugLog("Fixed language issues in individual page summaries");
  }

  return parsedResponse;
}

/**
 * Creates fallback content in the correct language
 * @param {Array} batchPages - Original page content
 * @param {string} language - Target language
 * @returns {Object} Fallback brief in correct language
 */
function createLanguageCorrectFallback(batchPages, language) {
  debugLog(`Creating language-correct fallback in ${language}`);
  
  const pageSummaries = batchPages.map((pageText, index) => {
    const pageNumber = index + 1;
    return {
      pageNumber,
      title: generateLanguageCorrectTitle('', language, pageNumber),
      summary: generateLanguageCorrectSummary('', pageText, language, pageNumber)
    };
  });

  return { pageSummaries };
}

/**
 * Generates a title in the correct language
 * @param {string} originalTitle - Original title (may be wrong language)
 * @param {string} language - Target language
 * @param {number} pageNumber - Page number
 * @returns {string} Language-correct title
 */
function generateLanguageCorrectTitle(originalTitle, language, pageNumber) {
  if (language === "Georgian") {
    // Georgian titles
    const georgianTitles = [
      "საგანმანათლებლო მასალა",
      "ძირითადი კონცეფციები", 
      "თეორიული საფუძვლები",
      "პრაქტიკული გამოყენება",
      "განმარტებები და ტერმინები",
      "მნიშვნელოვანი პრინციპები",
      "კვლევითი მეთოდები",
      "ანალიზის მეთოდები"
    ];
    
    const randomTitle = georgianTitles[pageNumber % georgianTitles.length];
    return `${randomTitle} - გვერდი ${pageNumber}`;
  } else {
    // English titles
    const englishTitles = [
      "Educational Content",
      "Key Concepts",
      "Theoretical Foundations", 
      "Practical Applications",
      "Definitions and Terms",
      "Important Principles",
      "Research Methods",
      "Analysis Techniques"
    ];
    
    const randomTitle = englishTitles[pageNumber % englishTitles.length];
    return `${randomTitle} - Page ${pageNumber}`;
  }
}

/**
 * Generates summary content in the correct language
 * @param {string} originalSummary - Original summary (may be wrong language)
 * @param {string} pageText - Original page text for context
 * @param {string} language - Target language  
 * @param {number} pageNumber - Page number
 * @returns {string} Language-correct summary
 */
function generateLanguageCorrectSummary(originalSummary, pageText, language, pageNumber) {
  const { minWordsPerPage, maxWordsPerPage } = GENERATION_CONFIG.brief;
  
  if (language === "Georgian") {
    return `შექმენი განმარტება ზუსტად ${minWordsPerPage}-${maxWordsPerPage} სიტყვით. აუცილებელია დაიცვა ეს სიტყვების რაოდენობა.

## განმარტება - გვერდი ${pageNumber}

მოცემული მასალიდან გამომდინარე, შექმენი სრული და ღია განმარტება, რომელიც:

**სავალდებულო მოთხოვნები:**
- შედგება ზუსტად ${minWordsPerPage}-${maxWordsPerPage} სიტყვისგან
- მოიცავს ძირითად კონცეფციებს
- ხსნის პრაქტიკულ გამოყენებას
- იძლევა სასწავლო რეკომენდაციებს

**შინაარსობრივი სტრუქტურა:**
1. ძირითადი თემების წარდგენა
2. კლუჩური კონცეფციების ახსნა
3. პრაქტიკული მნიშვნელობის განხილვა
4. სწავლის სტრატეგიების რეკომენდაცია

**ტონი და სტილი:**
- აკადემიური, მაგრამ გასაგები
- ლოგიკური თანმიმდევრობა
- კონკრეტული და პრაქტიკული
- სტუდენტებისთვის მოტივირებული

მნიშვნელოვანია: გამოყენე ზუსტად ${minWordsPerPage}-${maxWordsPerPage} სიტყვა. არ გამოტოვო არცერთი მოთხოვნა.`;
  } else {
    return `Create a summary using exactly ${minWordsPerPage}-${maxWordsPerPage} words. Strict adherence to this word count is mandatory.

## Educational Summary - Page ${pageNumber}

Based on the provided material, create a comprehensive and clear summary that:

**Mandatory Requirements:**
- Contains exactly ${minWordsPerPage}-${maxWordsPerPage} words
- Covers core concepts and principles
- Explains practical applications
- Provides study recommendations

**Content Structure:**
1. Introduction to main topics
2. Explanation of key concepts
3. Discussion of practical significance
4. Learning strategy recommendations

**Tone and Style:**
- Academic yet accessible
- Logically structured
- Concrete and practical
- Motivating for students

**Quality Standards:**
- Clear and concise explanations
- Relevant examples where appropriate
- Actionable learning advice
- Engaging educational content

Important: Use exactly ${minWordsPerPage}-${maxWordsPerPage} words. Do not exceed or fall short of this range. Every word must add value to student understanding.`;
  }
}
/**
 * Generates a multi-page brief using parallel batch processing with enhanced language control
 * @param {Array<string>} allPages - Array of page texts
 * @returns {Promise<Object>} Brief with page summaries in correct language
 */
export async function generateMultiPageBrief(allPages) {
  const GEMINI_KEY = process.env.GEMINI_API_KEY

  if(!GEMINI_KEY) throw new Error("Gemini key is not provided");

  debugAI('Gemini', 'generateMultiPageBrief', { pageCount: allPages.length });

  const expectedPageCount = allPages.length;

  // Enhanced language detection from multiple pages
  const sampleText = allPages.slice(0, 3).join('\n').substring(0, 1000);
  const detectedLanguage = detectLanguage(sampleText);
  const languageAnalysis = analyzeLanguageContent(sampleText);
  
  debugLog(`=== LANGUAGE DETECTION ===`);
  debugLog(`Detected language: ${detectedLanguage}`);
  debugLog(`Language confidence: ${(languageAnalysis.confidence * 100).toFixed(1)}%`);
  debugLog(`Language details:`, languageAnalysis.details);
  debugLog(`========================`);

  // Fast path for small documents (avoid batching overhead entirely)
  if (allPages.length <= 15) {
    debugLog(`Using optimized single-call processing for ${allPages.length} pages`);
    return generateSingleBatchBriefWithLanguageControl(allPages, 0, expectedPageCount, detectedLanguage);
  } else {
    // For larger documents, use parallel batch processing
    debugLog(`Using batch processing for ${allPages.length} pages`);
    return generateParallelBatchBriefWithLanguageControl(allPages, detectedLanguage);
  }
}

/**
 * Enhanced single batch generation with strict language control
 * @param {Array<string>} batchPages - Pages in this batch
 * @param {number} startIndex - Starting index for page numbers
 * @param {number} totalPageCount - Total pages in document
 * @param {string} targetLanguage - Target language for output
 * @returns {Promise<Object>} Brief with page summaries
 */
async function generateSingleBatchBriefWithLanguageControl(
  batchPages,
  startIndex,
  totalPageCount,
  targetLanguage
) {
  debugLog(`Processing batch with language control: ${batchPages.length} pages in ${targetLanguage}`);

  let response = null;
  let attemptNumber = 1;

  while (attemptNumber <= LANGUAGE_CONFIG.MAX_RETRY_ATTEMPTS) {
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

      debugLog(`Batch combined text length: ${combinedText.length} characters`);
      debugLog(`Attempt ${attemptNumber}/${LANGUAGE_CONFIG.MAX_RETRY_ATTEMPTS} for ${targetLanguage} generation`);

      // Generate enhanced prompt with stricter language control
      const prompt = getEnhancedBriefPrompt(targetLanguage, combinedText);

      debugLog('=== ENHANCED GEMINI API CALL ===');
      debugLog('Target Language:', targetLanguage);
      debugLog('Attempt:', attemptNumber);
      debugLog('Model:', geminiModelBrief);
      
      // Call AI API with enhanced language instructions
      response = await geminiAI.models.generateContent({
        model: geminiModelBrief,
        contents: prompt,
        generationConfig: {
          temperature: Math.max(0.1, GENERATION_CONFIG.brief.temperature - (attemptNumber - 1) * 0.1), // Reduce temperature on retries
          maxOutputTokens: 8192,
          topP: 0.95,
          topK: 40,
        },
      });
      
      debugLog('✅ API call succeeded');
      
      let responseText = response.text;
      debugLog("Response text length:", responseText.length);

      // Process response with language validation
      const processedResponse = await processResponseWithLanguageValidation(
        responseText, 
        targetLanguage, 
        batchPages, 
        attemptNumber
      );

      // If we get here, language validation passed
      debugLog(`✅ Successfully generated brief in ${targetLanguage} on attempt ${attemptNumber}`);
      
      // Adjust page numbers to match the batch's position in the document
      processedResponse.pageSummaries = processedResponse.pageSummaries.map(
        (page, index) => ({
          ...page,
          pageNumber: startIndex + index + 1,
        })
      );

      return processedResponse;

    } catch (error) {
      debugError(`Attempt ${attemptNumber} failed:`, error.message);
      
      if (error.message.startsWith('LANGUAGE_MISMATCH_RETRY') && attemptNumber < LANGUAGE_CONFIG.MAX_RETRY_ATTEMPTS) {
        attemptNumber++;
        debugLog(`Retrying with attempt ${attemptNumber}...`);
        // Add delay before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      } else {
        // Final fallback
        debugError("All attempts failed, using language-correct fallback");
        const fallbackResult = createLanguageCorrectFallback(batchPages, targetLanguage);
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
  }
}

/**
 * Enhanced parallel batch processing with language control
 * @param {Array<string>} allPages - All pages to process  
 * @param {string} targetLanguage - Target language for output
 * @returns {Promise<Object>} Combined brief results in correct language
 */
async function generateParallelBatchBriefWithLanguageControl(allPages, targetLanguage) {
  const totalPages = allPages.length;
  debugLog(`Using parallel batch processing for ${totalPages} pages in ${targetLanguage}`);

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

  debugLog(`Created ${batches.length} batches for ${targetLanguage} processing`);

  try {
    // Process batches in parallel groups
    const allResults = [];
    for (let i = 0; i < batches.length; i += BATCH_CONFIG.MAX_PARALLEL_BATCHES) {
      const batchGroup = batches.slice(i, i + BATCH_CONFIG.MAX_PARALLEL_BATCHES);
      debugLog(`Processing batch group ${Math.floor(i / BATCH_CONFIG.MAX_PARALLEL_BATCHES) + 1}/${Math.ceil(batches.length / BATCH_CONFIG.MAX_PARALLEL_BATCHES)} in ${targetLanguage}`);

      const groupResults = await Promise.all(
        batchGroup.map((batch) =>
          generateSingleBatchBriefWithLanguageControl(
            batch.pages,
            batch.startIndex,
            totalPages,
            targetLanguage
          ).catch((error) => {
            debugError(`Batch ${batch.batchNumber} failed:`, error);
            return createLanguageCorrectFallback(batch.pages, targetLanguage);
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

    debugLog(`Successfully processed ${combinedSummaries.length} pages in ${targetLanguage}`);

    // Final language validation on combined result
    const finalValidation = combinedSummaries.every(page => {
      const titleValid = validateLanguageStrict(page.title, targetLanguage).isValid;
      const summaryValid = validateLanguageStrict(page.summary, targetLanguage).isValid;
      return titleValid && summaryValid;
    });

    if (!finalValidation) {
      debugWarn('Final language validation failed on some pages, but proceeding with corrected content');
    }

    return {
      pageSummaries: combinedSummaries,
    };
  } catch (error) {
    debugError("Parallel batch processing failed:", error);
    return createLanguageCorrectFallback(allPages, targetLanguage);
  }
}

// Keep all other existing functions unchanged (convertMarkdownToFormattedText, containsHtmlOrCss, etc.)
// ... [rest of the original functions remain the same]