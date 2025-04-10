/**
 * Format summary text to improve readability with proper HTML structure
 * @param {string} text - The raw text to format
 * @returns {string} - Formatted HTML
 */
export function formatSummaryText(text) {
  if (!text) return "";

  // First, deal with specific patterns in the example text
  // Replace patterns like "1. Real-Time Experience:" with proper headings
  let formattedText = text.replace(
    /(\d+)\.\s+([A-Z][a-z]+(?:[-\s][A-Z][a-z]+)*)\s*(?:\n\s*)?:/g,
    "\n$1. **$2**:\n"
  );

  // Fix broken words across line breaks (like "Experienc\ne")
  formattedText = formattedText.replace(/(\w+)\s*\n\s*([a-z]+)/g, "$1$2");

  // Clean up other line breaks and whitespace
  formattedText = formattedText.replace(/([^.!?:])\n+/g, "$1 ");

  // Specifically handle the dash list pattern in the example
  formattedText = formattedText.replace(/([.:]) -/g, "$1\n-");

  // Normalize other whitespace
  formattedText = formattedText.replace(/\s{2,}/g, " ").trim();

  // Add proper breaks for list items
  formattedText = formattedText.replace(/\.\s+(\d+)\./g, ".\n$1.");

  // Split by lines while preserving paragraphs
  const lines = formattedText.split(/\n/).filter((line) => line.trim());

  // Process each line to identify list items
  let inList = false;
  let listItems = [];
  let result = [];

  lines.forEach((line) => {
    // Check if this is a numbered list item
    const numberedMatch = line.match(/^\s*(\d+)\.\s+(.*)/);

    if (numberedMatch) {
      const [, number, content] = numberedMatch;

      // Check if it's a header-style item (looks like a title)
      if (content.includes(":") && content.length < 50) {
        // This is a section header
        if (inList) {
          // Close previous list if we were in one
          result.push(
            `<ol class="list-decimal pl-5 space-y-0.5 mb-2">${listItems.join(
              ""
            )}</ol>`
          );
          listItems = [];
          inList = false;
        }

        result.push(
          `<h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mt-3 mb-1">${number}. ${content.trim()}</h3>`
        );
      } else {
        // This is a regular list item
        if (!inList) {
          inList = true;
        }

        // Process content for any bold text
        const processedContent = content.replace(
          /\*\*([^*]+)\*\*/g,
          '<span class="font-semibold">$1</span>'
        );

        listItems.push(`<li class="my-0.5">${processedContent.trim()}</li>`);
      }
    } else if (
      line.match(/^\s*-\s+(.*)/) ||
      (line.match(/^\s+(.*)/) && inList)
    ) {
      // This is a sub-item or continuation
      const content = line.replace(/^\s*-\s+/, "").trim();

      if (content) {
        const processedContent = content.replace(
          /\*\*([^*]+)\*\*/g,
          '<span class="font-semibold">$1</span>'
        );

        // If it starts with a dash, it's a bullet item
        if (line.match(/^\s*-\s+/)) {
          listItems.push(
            `<li class="ml-4 list-disc my-0.5">${processedContent}</li>`
          );
        } else {
          // Otherwise it's a continuation of the previous item
          if (listItems.length > 0) {
            // Add to the previous item
            listItems[listItems.length - 1] = listItems[
              listItems.length - 1
            ].replace("</li>", ` ${processedContent}</li>`);
          } else {
            // No previous item, treat as new item
            listItems.push(`<li class="my-0.5">${processedContent}</li>`);
          }
        }
      }
    } else {
      // This is a regular paragraph
      if (inList) {
        // Close the list
        result.push(
          `<ol class="list-decimal pl-5 space-y-0.5 mb-2">${listItems.join(
            ""
          )}</ol>`
        );
        listItems = [];
        inList = false;
      }

      // Process this paragraph
      const processedPara = line.replace(
        /\*\*([^*]+)\*\*/g,
        '<span class="font-semibold">$1</span>'
      );

      result.push(`<p class="mb-2">${processedPara.trim()}</p>`);
    }
  });

  // Close any open list at the end
  if (inList && listItems.length > 0) {
    result.push(
      `<ol class="list-decimal pl-5 space-y-0.5 mb-2">${listItems.join(
        ""
      )}</ol>`
    );
  }

  // Final clean-up: ensure no empty paragraphs
  let html = result.join("").replace(/<p>\s*<\/p>/g, "");

  // If we don't have any content yet, wrap the original text
  if (!html) {
    html = `<p>${formattedText}</p>`;
  }

  return html;
}
