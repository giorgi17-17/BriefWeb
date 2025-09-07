/**
 * Enhanced formatter for AI-generated brief content
 * Handles various text patterns and structures that AI commonly generates
 */

/**
 * Format summary text to improve readability with proper HTML structure
 * @param {string} text - The raw AI-generated text to format
 * @returns {string} - Formatted HTML
 */
export function formatSummaryText(text) {
  if (!text || typeof text !== 'string') return "";

  // Clean the text first
  let cleanedText = cleanAIGeneratedText(text);
  
  // Normalize line breaks and whitespace
  cleanedText = normalizeWhitespace(cleanedText);
  
  // Parse the content into structured blocks
  const contentBlocks = parseContentBlocks(cleanedText);
  
  // Format each block appropriately
  const formattedBlocks = contentBlocks.map(block => formatContentBlock(block));
  
  // Join with proper spacing
  return formattedBlocks.filter(block => block.trim()).join('\n\n');
}

/**
 * Clean AI-generated text of common formatting issues
 */
function cleanAIGeneratedText(text) {
  return text
    // Remove any existing HTML tags that might be malformed
    .replace(/<[^>]*>/g, '')
    
    // Fix common AI formatting artifacts
    .replace(/\*\*\*([^*]+)\*\*\*/g, '**$1**') // Triple asterisks to double
    .replace(/\*\*([^*]*)\*\*([^*\s])/g, '**$1** $2') // Add space after bold
    .replace(/([^\s])\*\*([^*]+)\*\*/g, '$1 **$2**') // Add space before bold
    
    // Clean up numbered lists that might be malformed
    .replace(/(\d+)\.([^\s])/g, '$1. $2') // Add space after number
    .replace(/(\d+)\)\s*/g, '$1. ') // Convert ) to .
    
    // Clean up bullet points
    .replace(/[•·▪▫]/g, '•') // Normalize bullet characters
    .replace(/^[\s]*[-*]\s*/gm, '• ') // Convert dashes to bullets
    
    // Fix spacing issues
    .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // Ensure space after sentences
    .replace(/\s{3,}/g, '  ') // Reduce multiple spaces to double
    .trim();
}

/**
 * Normalize whitespace and line breaks
 */
function normalizeWhitespace(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n\s*\n\s*\n+/g, '\n\n') // Max 2 consecutive line breaks
    .trim();
}

/**
 * Parse content into structured blocks
 */
function parseContentBlocks(text) {
  const blocks = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  let currentBlock = {
    type: 'paragraph',
    content: [],
    level: 0
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const blockType = identifyLineType(line);
    
    // If we encounter a new block type, save the current one and start fresh
    if (blockType.type !== currentBlock.type && currentBlock.content.length > 0) {
      blocks.push(currentBlock);
      currentBlock = {
        type: blockType.type,
        content: [line],
        level: blockType.level || 0
      };
    } else {
      currentBlock.content.push(line);
      if (blockType.level !== undefined) {
        currentBlock.level = blockType.level;
      }
    }
  }
  
  // Don't forget the last block
  if (currentBlock.content.length > 0) {
    blocks.push(currentBlock);
  }
  
  return blocks;
}

/**
 * Identify what type of content a line contains
 */
function identifyLineType(line) {
  // Main headings (numbered sections like "1. Introduction")
  if (/^\d+\.\s+[A-Z]/.test(line)) {
    return { type: 'main-heading', level: 1 };
  }
  
  // Sub headings (short capitalized phrases without periods)
  if (line.length < 80 && 
      /^[A-Z][A-Za-z\s]+$/.test(line) && 
      !line.endsWith('.') &&
      !/\b(the|and|or|of|in|on|at|to|for|with|by)\b/i.test(line.toLowerCase())) {
    return { type: 'sub-heading', level: 2 };
  }
  
  // Numbered lists
  if (/^\d+\.\s+/.test(line)) {
    return { type: 'ordered-list' };
  }
  
  // Bullet points
  if (/^[•\-*]\s+/.test(line)) {
    return { type: 'unordered-list' };
  }
  
  // Lettered lists (a., b., c.)
  if (/^[a-z]\.\s+/i.test(line)) {
    return { type: 'lettered-list' };
  }
  
  // Roman numerals
  if (/^[ivx]+\.\s+/i.test(line)) {
    return { type: 'roman-list' };
  }
  
  // Definition-like patterns
  if (/^[A-Z][a-zA-Z\s]+:\s+/.test(line)) {
    return { type: 'definition' };
  }
  
  // Regular paragraph
  return { type: 'paragraph' };
}

/**
 * Format a content block based on its type
 */
function formatContentBlock(block) {
  switch (block.type) {
    case 'main-heading':
      return formatMainHeading(block.content.join(' '));
      
    case 'sub-heading':
      return formatSubHeading(block.content.join(' '));
      
    case 'ordered-list':
      return formatOrderedList(block.content);
      
    case 'unordered-list':
      return formatUnorderedList(block.content);
      
    case 'lettered-list':
      return formatLetteredList(block.content);
      
    case 'roman-list':
      return formatRomanList(block.content);
      
    case 'definition':
      return formatDefinitions(block.content);
      
    case 'paragraph':
    default:
      return formatParagraphs(block.content);
  }
}

/**
 * Format main headings
 */
function formatMainHeading(text) {
  const cleanText = formatInlineText(text);
  return `<h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700 first:mt-0">${cleanText}</h2>`;
}

/**
 * Format sub headings
 */
function formatSubHeading(text) {
  const cleanText = formatInlineText(text);
  return `<h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-3 first:mt-0">${cleanText}</h3>`;
}

/**
 * Format ordered lists
 */
function formatOrderedList(items) {
  const listItems = items.map(item => {
    // Remove the number prefix and format the content
    const content = item.replace(/^\d+\.\s*/, '');
    return `<li class="mb-2 leading-relaxed">${formatInlineText(content)}</li>`;
  }).join('\n');
  
  return `<ol class="list-decimal list-outside ml-6 my-4 space-y-1 text-gray-700 dark:text-gray-300">\n${listItems}\n</ol>`;
}

/**
 * Format unordered lists
 */
function formatUnorderedList(items) {
  const listItems = items.map(item => {
    // Remove the bullet prefix and format the content
    const content = item.replace(/^[•\-*]\s*/, '');
    return `<li class="mb-2 leading-relaxed">${formatInlineText(content)}</li>`;
  }).join('\n');
  
  return `<ul class="list-disc list-outside ml-6 my-4 space-y-1 text-gray-700 dark:text-gray-300">\n${listItems}\n</ul>`;
}

/**
 * Format lettered lists
 */
function formatLetteredList(items) {
  const listItems = items.map(item => {
    const content = item.replace(/^[a-z]\.\s*/i, '');
    return `<li class="mb-2 leading-relaxed">${formatInlineText(content)}</li>`;
  }).join('\n');
  
  return `<ol class="list-outside ml-6 my-4 space-y-1 text-gray-700 dark:text-gray-300" style="list-style-type: lower-alpha;">\n${listItems}\n</ol>`;
}

/**
 * Format roman numeral lists
 */
function formatRomanList(items) {
  const listItems = items.map(item => {
    const content = item.replace(/^[ivx]+\.\s*/i, '');
    return `<li class="mb-2 leading-relaxed">${formatInlineText(content)}</li>`;
  }).join('\n');
  
  return `<ol class="list-outside ml-6 my-4 space-y-1 text-gray-700 dark:text-gray-300" style="list-style-type: lower-roman;">\n${listItems}\n</ol>`;
}

/**
 * Format definition-style content
 */
function formatDefinitions(items) {
  return items.map(item => {
    const [term, ...definition] = item.split(':');
    if (definition.length > 0) {
      return `<div class="mb-4">
        <dt class="font-semibold text-gray-900 dark:text-gray-100 mb-1">${formatInlineText(term.trim())}:</dt>
        <dd class="text-gray-700 dark:text-gray-300 ml-4 leading-relaxed">${formatInlineText(definition.join(':').trim())}</dd>
      </div>`;
    } else {
      return `<p class="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">${formatInlineText(item)}</p>`;
    }
  }).join('\n');
}

/**
 * Format regular paragraphs
 */
function formatParagraphs(lines) {
  // Join lines that belong to the same paragraph
  const paragraphText = lines.join(' ');
  
  // Split into sentences for better formatting
  const sentences = paragraphText.split(/(?<=[.!?])\s+/).filter(s => s.trim());
  
  // Group sentences into paragraphs (every 3-5 sentences or logical breaks)
  const paragraphs = [];
  let currentParagraph = [];
  
  sentences.forEach((sentence, index) => {
    currentParagraph.push(sentence);
    
    // Create paragraph breaks at logical points or every 4-5 sentences
    if (currentParagraph.length >= 4 || 
        sentence.includes('However,') || 
        sentence.includes('Furthermore,') ||
        sentence.includes('In addition,') ||
        sentence.includes('On the other hand,') ||
        index === sentences.length - 1) {
      paragraphs.push(currentParagraph.join(' '));
      currentParagraph = [];
    }
  });
  
  // Don't forget the last paragraph
  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(' '));
  }
  
  return paragraphs
    .filter(p => p.trim())
    .map(paragraph => `<p class="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">${formatInlineText(paragraph.trim())}</p>`)
    .join('\n');
}

/**
 * Apply inline text formatting (bold, italic, etc.)
 */
function formatInlineText(text) {
  if (!text) return '';
  
  return text
    // Bold text (double asterisks or underscores)
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-gray-100">$1</strong>')
    .replace(/__([^_]+)__/g, '<strong class="font-semibold text-gray-900 dark:text-gray-100">$1</strong>')
    
    // Italic text (single asterisks or underscores)
    .replace(/\*([^*]+)\*/g, '<em class="italic text-gray-800 dark:text-gray-200">$1</em>')
    .replace(/_([^_]+)_/g, '<em class="italic text-gray-800 dark:text-gray-200">$1</em>')
    
    // Quoted text
    .replace(/"([^"]+)"/g, '<span class="font-medium text-blue-700 dark:text-blue-300">"$1"</span>')
    
    // Technical terms or code-like text (text in backticks)
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-sm font-mono">$1</code>')
    
    // Numbers at the start of lines (for emphasis)
    .replace(/^(\d+):\s*/gm, '<span class="font-semibold text-gray-900 dark:text-gray-100">$1:</span> ')
    
    // Parenthetical numbers like (1), (2), etc.
    .replace(/\((\d+)\)/g, '<span class="font-medium text-blue-600 dark:text-blue-400">($1)</span>')
    
    // Clean up any double spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Enhanced formatter that ensures all content is properly structured
 * This is the main export that replaces ensureFormattingConsistency
 */
export function ensureFormattingConsistency(html) {
  if (!html || !html.includes('<')) {
    // If no HTML formatting exists, treat as plain text and format
    return formatSummaryText(html);
  }

  // Clean up spacing between elements
  return html
    .replace(/>\s*\n\s*</g, '>\n<') // Clean up whitespace between tags
    .replace(/(<\/(?:h[1-6]|p|ul|ol|div)>)\s*(<(?:h[1-6]|p|ul|ol|div))/g, '$1\n\n$2') // Add spacing between major elements
    .replace(/^\s+|\s+$/gm, '') // Trim lines
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive line breaks
    .trim();
}

/**
 * Utility function to detect if content needs reformatting
 */
export function shouldReformat(text) {
  if (!text) return false;
  
  // Check for common AI formatting patterns that need cleanup
  const needsFormatting = [
    /\*\*\*/, // Triple asterisks
    /\d+\)[^\s]/, // Numbers without proper spacing
    /[•·▪▫]/, // Various bullet characters
    /[A-Z][a-z]+[A-Z]/, // CamelCase that should be separated
    /\s{3,}/, // Multiple consecutive spaces
  ];
  
  return needsFormatting.some(pattern => pattern.test(text));
}