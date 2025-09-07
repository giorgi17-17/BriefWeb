import PropTypes from "prop-types";
import {
  formatSummaryText,
  ensureFormattingConsistency,
} from "../../utils/briefFormatters";
import { debugWarn } from "../../utils/debugLogger";

const BriefContent = ({ brief, currentPage, textScale = 1 }) => {
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

  // Simplified and more effective title generation
  function generateFallbackTitle(content, pageNum) {
    if (!content) return `Page ${pageNum}`;

    const cleanContent = content.trim();
    if (!cleanContent) return `Page ${pageNum} Content`;

    // Strategy 1: Look for numbered main sections (most common AI pattern)
    const mainSectionMatch = cleanContent.match(/^(\d+)\.\s+([A-Z][^.\n]{8,60})/m);
    if (mainSectionMatch) {
      return mainSectionMatch[2].trim();
    }

    // Strategy 2: Look for bold headings at the start
    const boldHeadingMatch = cleanContent.match(/^\*\*([^*]{10,50})\*\*/m);
    if (boldHeadingMatch) {
      return boldHeadingMatch[1].trim();
    }

    // Strategy 3: Extract from first meaningful sentence
    const firstSentence = cleanContent.split(/[.!?]/)[0];
    if (firstSentence && firstSentence.length > 10 && firstSentence.length < 80) {
      // Remove common intro words
      const cleanSentence = firstSentence
        .replace(/^(This|The|In|On|When|Where|Why|How|What)\s+/i, '')
        .trim();

      if (cleanSentence.length > 5) {
        return cleanSentence;
      }
    }

    // Strategy 4: Look for capitalized terms (key concepts)
    const keyTerms = extractKeyTerms(cleanContent);
    if (keyTerms.length > 0) {
      if (keyTerms.length === 1) {
        return `${keyTerms[0]} Overview`;
      } else {
        return `${keyTerms[0]} and ${keyTerms[1]}`;
      }
    }

    // Final fallback
    return `Page ${pageNum} Content`;
  }

  // Simplified key term extraction
  function extractKeyTerms(text) {
    const terms = [];

    // Look for capitalized multi-word terms
    const matches = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g) || [];

    // Count frequency
    const termCounts = {};
    matches.forEach(term => {
      if (term.length > 5 && term.length < 40) {
        termCounts[term] = (termCounts[term] || 0) + 1;
      }
    });

    // Get most frequent terms
    return Object.entries(termCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([term]) => term);
  }

  // Process the content with improved formatting
  const processedContent = () => {
    const rawContent = brief.summaries[currentPage - 1];
    if (!rawContent) return '<p class="text-gray-500 italic">No content available</p>';

    try {
      const formatted = formatSummaryText(rawContent);
      return ensureFormattingConsistency(formatted);
    } catch (error) {
      debugWarn('Error formatting content:', error);
      // Fallback to basic paragraph formatting
      return `<p class="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">${rawContent.replace(/\n/g, '<br>')}</p>`;
    }
  };

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
            {brief.metadata?.extractionMethod && (
              <span className="text-gray-500 dark:text-gray-400">
                {brief.metadata.extractionMethod === "pdf" ? "📄" : "📊"}{" "}
                {brief.metadata.extractionMethod.toUpperCase()}
              </span>
            )}
            {brief.total_pages && (
              <span className="text-gray-400 dark:text-gray-500">
                Page {currentPage} of {brief.total_pages}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Page Content - Simplified Styling */}
      <div className="bg-white dark:bg-gray-800/50 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div
          className="brief-content text-base leading-relaxed max-w-none space-y-4"
          style={{
            fontSize: `${textScale}rem`,
            lineHeight: textScale > 1 ? '1.6' : '1.7'
          }}
          dangerouslySetInnerHTML={{
            __html: processedContent(),
          }}
        />
      </div>

      {/* Content Statistics */}
      {brief.summaries && brief.summaries[currentPage - 1] && (
        <div className="text-center text-xs text-gray-400 dark:text-gray-600 border-t border-gray-100 dark:border-gray-700 pt-4">
          <div className="flex justify-center gap-6">
            <span>
              {brief.summaries[currentPage - 1].split(' ').length} words
            </span>
            {brief.metadata?.generatedAt && (
              <span>
                Generated {new Date(brief.metadata.generatedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

BriefContent.propTypes = {
  brief: PropTypes.object,
  currentPage: PropTypes.number.isRequired,
  textScale: PropTypes.number,
};

export default BriefContent;