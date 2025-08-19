/**
 * Brief data structure utilities to ensure consistency across the application
 */

import { debugLog, debugWarn } from "./debugLogger.js";

/**
 * Standardizes the brief data structure to ensure consistent title and metadata handling
 * @param {Object} briefData - Raw brief data from AI service
 * @returns {Object} - Standardized brief structure
 */
export function standardizeBriefStructure(briefData) {
  if (!briefData || !briefData.pageSummaries) {
    debugWarn("Invalid brief data provided to standardizeBriefStructure");
    return null;
  }

  const standardized = {
    totalPages: briefData.pageSummaries.length,
    summaries: [],
    metadata: {
      page_titles: [],
      extractionMethod: briefData.extractionMethod || 'unknown',
      generatedAt: new Date().toISOString(),
      key_concepts: briefData.key_concepts || [],
      important_details: briefData.important_details || [],
      documentTitle: briefData.overview?.documentTitle || 'Document Analysis',
      mainThemes: briefData.overview?.mainThemes || []
    }
  };

  // Process each page summary and extract titles consistently
  briefData.pageSummaries.forEach((page, index) => {
    // Ensure page has required properties
    const pageNumber = page.pageNumber || index + 1;
    
    // Extract and validate title
    let title = extractValidTitle(page.title, page.summary, pageNumber);
    
    // Store the summary content (plain text, no HTML)
    const summary = cleanSummaryContent(page.summary || '');
    
    standardized.summaries.push(summary);
    standardized.metadata.page_titles.push(title);
    
    debugLog(`Page ${pageNumber}: Title="${title}", Summary length=${summary.length}`);
  });

  return standardized;
}

/**
 * Extracts and validates a title from various sources
 * @param {string} primaryTitle - Primary title from page data
 * @param {string} summaryContent - Summary content as fallback
 * @param {number} pageNumber - Page number for fallback
 * @returns {string} - Valid title
 */
function extractValidTitle(primaryTitle, summaryContent, pageNumber) {
  // Check if primary title is valid
  if (isValidTitle(primaryTitle)) {
    return cleanTitleText(primaryTitle);
  }

  // Generate title from summary content
  const generatedTitle = generateTitleFromContent(summaryContent, pageNumber);
  return generatedTitle;
}

/**
 * Validates if a title meets quality standards
 * @param {string} title - Title to validate
 * @returns {boolean} - Whether title is valid
 */
function isValidTitle(title) {
  if (!title || typeof title !== 'string') {
    return false;
  }

  const cleanTitle = title.trim();
  
  // Must be at least 10 characters long
  if (cleanTitle.length < 10) {
    return false;
  }

  // Must not be generic patterns
  const genericPatterns = [
    /^page\s*\d*\s*(content|topics?|overview)?$/i,
    /^(overview|introduction|summary|content|topics?)$/i,
    /^(key\s+)?(points?|concepts?|information)$/i,
    /^page\s+\d+$/i
  ];

  return !genericPatterns.some(pattern => pattern.test(cleanTitle));
}

/**
 * Cleans title text of any unwanted formatting
 * @param {string} title - Raw title
 * @returns {string} - Cleaned title
 */
function cleanTitleText(title) {
  return title
    .trim()
    .replace(/[.,;:!]+$/, '') // Remove trailing punctuation except ?
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 100); // Limit length
}

/**
 * Generates a descriptive title from content
 * @param {string} content - Content to analyze
 * @param {number} pageNumber - Page number for fallback
 * @returns {string} - Generated title
 */
function generateTitleFromContent(content, pageNumber) {
  if (!content || typeof content !== 'string') {
    return `Page ${pageNumber} Analysis`;
  }

  const cleanContent = content.trim();
  
  // Strategy 1: Look for numbered sections
  const sectionMatch = cleanContent.match(/^\d+\.\s+([A-Z][^.\n]{10,60})/m);
  if (sectionMatch && sectionMatch[1]) {
    return sectionMatch[1].trim();
  }

  // Strategy 2: Look for definition patterns
  const definitionMatch = cleanContent.match(
    /([A-Z][a-zA-Z\s]{5,40})(?:\s+(?:is|are|means|refers to|can be defined as))\s+/i
  );
  if (definitionMatch && definitionMatch[1]) {
    return `${definitionMatch[1].trim()} - Definition and Concepts`;
  }

  // Strategy 3: Extract key terms and create descriptive title
  const keyTerms = extractKeyTermsFromText(cleanContent);
  if (keyTerms.length >= 2) {
    return `${keyTerms[0]} and ${keyTerms[1]} Overview`;
  } else if (keyTerms.length === 1) {
    return `${keyTerms[0]} Analysis`;
  }

  // Strategy 4: Use first substantial sentence
  const sentences = cleanContent.match(/[^.!?]+[.!?]+/g) || [];
  for (const sentence of sentences.slice(0, 2)) {
    const cleanSentence = sentence.trim();
    if (cleanSentence.length > 20 && cleanSentence.length < 80) {
      // Extract meaningful part
      const title = cleanSentence
        .replace(/^(This|The|An?|In|On|At|From|To|For|With|About)\s+/i, '')
        .replace(/[.!?]+$/, '')
        .trim();
      
      if (title.length > 10) {
        return title.substring(0, 60);
      }
    }
  }

  // Final fallback
  return `Page ${pageNumber} Content Analysis`;
}

/**
 * Extracts key terms from text for title generation
 * @param {string} text - Text to analyze
 * @returns {Array<string>} - Key terms
 */
function extractKeyTermsFromText(text) {
  const words = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
  const termCounts = {};

  words.forEach(term => {
    if (term.length > 3 && !['The', 'This', 'That', 'These', 'Those', 'Page'].includes(term)) {
      termCounts[term] = (termCounts[term] || 0) + 1;
    }
  });

  return Object.entries(termCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([term]) => term);
}

/**
 * Cleans summary content of HTML and formatting issues
 * @param {string} content - Raw summary content
 * @returns {string} - Cleaned content
 */
function cleanSummaryContent(content) {
  if (!content || typeof content !== 'string') {
    return '';
  }

  return content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&[a-zA-Z0-9#]+;/g, ' ') // Remove HTML entities
    .replace(/class\s*=\s*"[^"]*"/g, '') // Remove class attributes
    .replace(/style\s*=\s*"[^"]*"/g, '') // Remove style attributes
    .replace(/"[^"]*font-[^"]*"/g, '') // Remove font-related strings
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Validates the entire brief structure
 * @param {Object} brief - Brief object to validate
 * @returns {boolean} - Whether brief is valid
 */
export function validateBriefStructure(brief) {
  if (!brief) return false;

  const requiredFields = ['totalPages', 'summaries', 'metadata'];
  if (!requiredFields.every(field => field in brief)) {
    debugWarn('Brief missing required fields:', requiredFields.filter(f => !(f in brief)));
    return false;
  }

  if (!brief.metadata.page_titles || !Array.isArray(brief.metadata.page_titles)) {
    debugWarn('Brief missing page_titles array in metadata');
    return false;
  }

  if (brief.summaries.length !== brief.metadata.page_titles.length) {
    debugWarn(`Mismatch: ${brief.summaries.length} summaries vs ${brief.metadata.page_titles.length} titles`);
    return false;
  }

  if (brief.totalPages !== brief.summaries.length) {
    debugWarn(`Mismatch: totalPages=${brief.totalPages} vs summaries.length=${brief.summaries.length}`);
    return false;
  }

  return true;
}

/**
 * Creates a fallback brief structure when AI processing fails
 * @param {Array<string>} pageTexts - Original page texts
 * @param {string} errorMessage - Error that occurred
 * @returns {Object} - Fallback brief structure
 */
export function createFallbackBriefStructure(pageTexts, errorMessage) {
  const fallbackBrief = {
    totalPages: pageTexts.length,
    summaries: [],
    metadata: {
      page_titles: [],
      extractionMethod: 'fallback',
      generatedAt: new Date().toISOString(),
      key_concepts: [],
      important_details: [],
      documentTitle: 'Document Processing Failed',
      mainThemes: [],
      processingError: errorMessage
    }
  };

  pageTexts.forEach((pageText, index) => {
    const pageNumber = index + 1;
    
    // Create basic summary from original text
    const summary = pageText.length > 500 
      ? pageText.substring(0, 500) + '...\n\n[Content truncated due to processing limitations]'
      : pageText;

    // Generate basic title
    const title = `Page ${pageNumber} Content (Processing Failed)`;

    fallbackBrief.summaries.push(cleanSummaryContent(summary));
    fallbackBrief.metadata.page_titles.push(title);
  });

  return fallbackBrief;
}