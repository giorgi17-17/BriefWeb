/**
 * Format summary text to improve readability with proper HTML structure
 * @param {string} text - The raw text to format
 * @returns {string} - Formatted HTML
 */
export function formatSummaryText(text) {
  if (!text) return "";

  // First, clean up any broken HTML formatting from AI responses
  let cleanedText = cleanBrokenHtmlFormatting(text);

  // Clean up the text
  let processedText = cleanedText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  // Split text into paragraphs (by double line breaks or natural paragraph breaks)
  const paragraphs = processedText.split(/\n\s*\n+/).filter((p) => p.trim());

  let formattedContent = [];

  paragraphs.forEach((paragraph) => {
    const trimmedPara = paragraph.trim();

    // Check for numbered sections (e.g., "1. Business Ownership Forms")
    const sectionMatch = trimmedPara.match(/^(\d+)\.\s+([A-Z][^.\n]+)$/m);
    if (sectionMatch) {
      formattedContent.push(
        `<h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mt-6 mb-3 border-b border-gray-200 dark:border-gray-700 pb-2 first:mt-0">
          ${sectionMatch[1]}. ${sectionMatch[2]}
        </h2>`
      );
      // Process the rest of the paragraph after the section header
      const remainingText = trimmedPara.replace(sectionMatch[0], "").trim();
      if (remainingText) {
        formattedContent.push(...processContentBlock(remainingText));
      }
      return;
    }

    // Process the paragraph content
    formattedContent.push(...processContentBlock(trimmedPara));
  });

  // Join all formatted content
  return formattedContent.join("\n");
}

/**
 * Process a block of content and format it appropriately
 * @param {string} content - Content block to process
 * @returns {Array<string>} - Array of formatted HTML elements
 */
function processContentBlock(content) {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);
  const formattedElements = [];
  let currentBulletList = [];
  let currentParagraph = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for bullet points
    if (line.match(/^[-•]\s+/)) {
      // If we have a current paragraph, close it
      if (currentParagraph.length > 0) {
        formattedElements.push(formatParagraph(currentParagraph.join(" ")));
        currentParagraph = [];
      }

      // Add to bullet list
      const bulletContent = line.replace(/^[-•]\s+/, "").trim();
      currentBulletList.push(
        `<li class="text-gray-700 dark:text-gray-300 leading-relaxed mb-2 text-base">${formatInlineText(
          bulletContent
        )}</li>`
      );
    } else {
      // If we have a bullet list, close it
      if (currentBulletList.length > 0) {
        formattedElements.push(
          `<ul class="list-disc pl-6 my-4 space-y-2">${currentBulletList.join(
            ""
          )}</ul>`
        );
        currentBulletList = [];
      }

      // Check if this line is a sub-header (shorter capitalized phrases)
      if (
        line.length < 60 &&
        /^[A-Z]/.test(line) &&
        /[A-Z][a-z]+/.test(line) &&
        !line.endsWith(".")
      ) {
        // Close current paragraph if exists
        if (currentParagraph.length > 0) {
          formattedElements.push(formatParagraph(currentParagraph.join(" ")));
          currentParagraph = [];
        }

        formattedElements.push(
          `<h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2 first:mt-0">${line}</h3>`
        );
      } else {
        // Add to current paragraph
        currentParagraph.push(line);
      }
    }
  }

  // Close any open elements
  if (currentBulletList.length > 0) {
    formattedElements.push(
      `<ul class="list-disc pl-6 my-4 space-y-2">${currentBulletList.join(
        ""
      )}</ul>`
    );
  }
  if (currentParagraph.length > 0) {
    formattedElements.push(formatParagraph(currentParagraph.join(" ")));
  }

  return formattedElements;
}

/**
 * Format a paragraph with proper styling
 * @param {string} text - Paragraph text
 * @returns {string} - Formatted paragraph HTML
 */
function formatParagraph(text) {
  // Check for numbered sub-items within paragraphs
  const processedText = text.replace(
    /(\d+)\)\s+([^,\n]+)/g,
    '<span class="font-medium">$1)</span> $2'
  );

  // Apply inline formatting
  const formattedText = formatInlineText(processedText);

  return `<p class="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed text-base">${formattedText}</p>`;
}

/**
 * Apply inline text formatting
 * @param {string} text - Text to format
 * @returns {string} - Formatted text
 */
function formatInlineText(text) {
  return (
    text
      // Bold text (double asterisks)
      .replace(
        /\*\*([^*]+)\*\*/g,
        '<strong class="font-semibold text-gray-900 dark:text-gray-100">$1</strong>'
      )
      // Italic text (single asterisks)
      .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
      // Highlight key terms in quotes
      .replace(
        /"([^"]+)"/g,
        '<span class="font-medium text-gray-900 dark:text-gray-100">"$1"</span>'
      )
      // Format numbers with colons (e.g., "1: " becomes emphasized)
      .replace(/^(\d+):\s*/g, '<span class="font-semibold">$1:</span> ')
  );
}

/**
 * Cleans broken HTML formatting that appears in AI responses
 * @param {string} text - Text that may contain broken HTML
 * @returns {string} - Cleaned text
 */
function cleanBrokenHtmlFormatting(text) {
  return (
    text
      // Remove literal CSS class strings that appear as text
      .replace(/"font-semibold text-gray-900 dark:text-gray-100">/g, "")
      .replace(/"font-medium text-gray-900 dark:text-gray-100">/g, "")
      .replace(/"text-gray-700 dark:text-gray-300">/g, "")
      .replace(/"list-disc pl-6 my-4 space-y-2">/g, "")
      .replace(/"font-medium">/g, "")
      .replace(/"font-semibold">/g, "")
      .replace(/"italic">/g, "")
      .replace(/"font-bold">/g, "")

      // Remove any other CSS class patterns
      .replace(/\s*"[^"]*font-[^"]*">\s*/g, " ")
      .replace(/\s*"[^"]*text-[^"]*">\s*/g, " ")
      .replace(/\s*"[^"]*list-[^"]*">\s*/g, " ")
      .replace(/\s*"[^"]*pl-[^"]*">\s*/g, " ")

      // Clean up orphaned HTML fragments
      .replace(/\s*">\s*/g, " ")
      .replace(/\s*<\/?\w+[^>]*>\s*/g, " ")

      // Fix double spaces and clean up
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}

/**
 * Enhanced formatter that ensures all content is properly structured
 * This is called after the main formatting to ensure consistency
 */
export function ensureFormattingConsistency(html) {
  // If the content has no formatting at all, add basic paragraph structure
  if (!html.includes("<")) {
    const paragraphs = html.split(/\n\s*\n+/).filter((p) => p.trim());
    return paragraphs
      .map(
        (p) =>
          `<p class="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed text-base">${p.trim()}</p>`
      )
      .join("\n");
  }

  // Ensure spacing between different elements and apply responsive classes
  return (
    html
      .replace(/<\/p>\s*<h/g, "</p>\n\n<h")
      .replace(/<\/ul>\s*<p/g, "</ul>\n\n<p")
      .replace(/<\/p>\s*<ul/g, "</p>\n\n<ul")
      .replace(/<\/h\d>\s*<p/g, "</h$1>\n\n<p")
      // Ensure consistent spacing for all elements
      .replace(/<h2/g, "<h2")
      .replace(/<h3/g, "<h3")
      .replace(/<ul/g, "<ul")
      .replace(/<ol/g, "<ol")
      .replace(/<p/g, "<p")
  );
}
