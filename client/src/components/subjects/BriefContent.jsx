import PropTypes from "prop-types";
import {
  formatSummaryText,
  ensureFormattingConsistency,
} from "../../utils/briefFormatters";
import { debugWarn } from "../../utils/debugLogger";

const BriefContent = ({ brief, currentPage }) => {
  if (!brief) return null;

  // Get the current page title from standardized metadata structure
  let currentPageTitle = brief.metadata?.page_titles?.[currentPage - 1];

  // If no title in standardized location, generate fallback
  if (!currentPageTitle) {
    currentPageTitle = generateFallbackTitle(
      brief.summaries[currentPage - 1],
      currentPage
    );
  }

  // Validate the title
  if (
    !currentPageTitle ||
    typeof currentPageTitle !== "string" ||
    currentPageTitle.length < 3
  ) {
    debugWarn(`Invalid title detected: "${currentPageTitle}"`);
    currentPageTitle = generateFallbackTitle(
      brief.summaries[currentPage - 1],
      currentPage
    );
  }

  // Fallback title generation function
  function generateFallbackTitle(content, pageNum) {
    if (!content) return `Page ${pageNum}`;

    // Clean the content first
    const cleanContent = content.trim();
    if (!cleanContent) return `Page ${pageNum} Content`;

    // Strategy 1: Look for numbered main sections
    const sectionMatch = cleanContent.match(/^\d+\.\s+([A-Z][^.\n]{10,60})/m);
    if (sectionMatch && sectionMatch[1]) {
      const sectionTitle = sectionMatch[1].trim();
      if (sectionTitle.length >= 15) {
        return sectionTitle;
      }
    }

    // Strategy 2: Extract key concepts from content
    const keyTerms = extractKeyTermsFromContent(cleanContent);
    if (keyTerms.length >= 2) {
      return createDescriptiveTitleFromTerms(keyTerms, cleanContent);
    }

    // Strategy 3: Look for definition patterns
    const definitionMatch = cleanContent.match(
      /([A-Z][a-zA-Z\s]{5,40})(?:\s+(?:is|are|means|refers to|can be defined as))\s+/i
    );
    if (definitionMatch && definitionMatch[1]) {
      const term = definitionMatch[1].trim();
      return `${term} Definition and Concepts`;
    }

    // Strategy 4: Look for comparison patterns
    const comparisonMatch = cleanContent.match(
      /(?:comparing|difference between|versus|vs\.?)\s+([A-Za-z\s,&]{10,50})/i
    );
    if (comparisonMatch && comparisonMatch[1]) {
      return `Comparing ${comparisonMatch[1].trim()}`;
    }

    // Strategy 5: Look for advantage/benefit patterns
    const benefitMatch = cleanContent.match(
      /(?:advantages?|benefits?)\s+of\s+([A-Za-z\s]{5,30})/i
    );
    if (benefitMatch && benefitMatch[1]) {
      return `${benefitMatch[1].trim()} Benefits and Advantages`;
    }

    // Strategy 6: Analyze content for main topic
    const mainTopic = analyzeMainTopicFromContent(cleanContent);
    if (mainTopic) {
      return mainTopic;
    }

    // Final fallback
    return `Page ${pageNum} Content Analysis`;
  }

  // Helper function to extract key terms from content
  function extractKeyTermsFromContent(text) {
    const keyTerms = [];

    // Look for capitalized terms (proper nouns, important concepts)
    const capitalizedTerms =
      text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];

    // Count occurrences
    const termCounts = {};
    capitalizedTerms.forEach((term) => {
      if (
        term.length > 3 &&
        !["The", "This", "That", "These", "Those", "Page"].includes(term)
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

  // Helper function to create descriptive title from key terms
  function createDescriptiveTitleFromTerms(keyTerms, text) {
    const lowerText = text.toLowerCase();

    if (lowerText.includes("advantage") || lowerText.includes("benefit")) {
      return `${keyTerms[0]} Advantages and Benefits`;
    }

    if (
      lowerText.includes("type") ||
      lowerText.includes("form") ||
      lowerText.includes("structure")
    ) {
      return `Types of ${keyTerms[0]} Structures`;
    }

    if (lowerText.includes("process") || lowerText.includes("procedure")) {
      return `${keyTerms[0]} Process and Procedures`;
    }

    if (keyTerms.length >= 2) {
      return `${keyTerms[0]} and ${keyTerms[1]} Overview`;
    }

    return `${keyTerms[0]} Fundamentals`;
  }

  // Helper function to analyze main topic
  function analyzeMainTopicFromContent(text) {
    // Look for repeated important terms
    const words = text.split(/\s+/);
    const importantWords = {};

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
    ];

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
      return `${capitalizedWords[0]} and ${capitalizedWords[1]} Overview`;
    }

    return null;
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Page Title Section */}
      <div className="relative">
        {/* Background accent */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg -z-10" />

        <div className="px-6 py-5">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 leading-tight">
            {currentPageTitle || `Page ${currentPage} Content`}
          </h1>
          <div className="flex items-center gap-4 text-sm">
            {/* <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300 font-medium">
              Page {currentPage} of {brief.total_pages}
            </span> */}
            {brief.metadata?.extractionMethod && (
              <span className="text-gray-500 dark:text-gray-400">
                {brief.metadata.extractionMethod === "pdf" ? "📄" : "📊"}{" "}
                {brief.metadata.extractionMethod.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Page Content */}
      <div className="bg-white dark:bg-gray-800/50 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div
          className="brief-content text-base leading-[1.7] prose prose-lg dark:prose-invert max-w-none 
            prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-gray-100
            prose-h2:text-xl prose-h2:font-bold prose-h2:text-gray-900 dark:prose-h2:text-gray-100 prose-h2:mt-6 prose-h2:mb-3 prose-h2:border-b prose-h2:border-gray-200 dark:prose-h2:border-gray-700 prose-h2:pb-2 prose-h2:first:mt-0
            prose-h3:text-lg prose-h3:font-semibold prose-h3:text-gray-800 dark:prose-h3:text-gray-200 prose-h3:mt-4 prose-h3:mb-2 prose-h3:first:mt-0
            prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4 prose-p:text-base
            prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-li:leading-relaxed prose-li:mb-2 prose-li:text-base
            prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-semibold
            prose-em:text-gray-700 dark:prose-em:text-gray-300 prose-em:italic
            prose-ul:my-4 prose-ul:space-y-2 prose-ul:list-disc prose-ul:pl-6
            prose-ol:my-4 prose-ol:space-y-1 prose-ol:list-decimal prose-ol:pl-6
            prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:my-4
            prose-code:bg-gray-100 dark:prose-code:bg-gray-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
            prose-pre:bg-gray-100 dark:prose-pre:bg-gray-900 prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
            sm:text-sm sm:leading-relaxed
            [&>div]:mb-6 [&>div:last-child]:mb-0"
          dangerouslySetInnerHTML={{
            __html: ensureFormattingConsistency(
              formatSummaryText(brief.summaries[currentPage - 1])
            ),
          }}
        />
      </div>

      {/* Optional: Add a subtle footer with metadata */}
      {brief.metadata?.generatedAt && (
        <div className="text-center text-xs text-gray-400 dark:text-gray-600 mt-8">
          Generated on{" "}
          {new Date(brief.metadata.generatedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

BriefContent.propTypes = {
  brief: PropTypes.object,
  currentPage: PropTypes.number.isRequired,
};

export default BriefContent;
