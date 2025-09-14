/**
 * Enhanced BriefFormatter with better cleanup and markdown handling
 * - Fixes mixed markdown/HTML formatting issues
 * - Removes CSS class leakage 
 * - Handles Georgian text properly
 * - Cleans up malformed HTML attributes
 */

const OUTPUT_MODE = "tailwind"; // "semantic" | "tailwind"
const PREFER_BULLETS_FOR_DEFINITIONS = true;

/** Allow only safe tags; keep class attr in tailwind mode */
const ALLOWED_TAGS = new Set([
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "li", "strong", "em", "code", "dl", "dt", "dd", "div", "span"
]);

function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Pre-process text to fix common formatting issues
 */
function preprocessText(text) {
  if (!text || typeof text !== "string") return "";
  
  let cleaned = text;
  
  // Fix mixed markdown headers: **## Text** -> ## Text
  cleaned = cleaned.replace(/\*\*(#{1,6})\s*([^*]+?)\*\*/g, '$1 $2');
  
  // Fix mixed markdown headers: ##**Text** -> ## Text
  cleaned = cleaned.replace(/(#{1,6})\*\*([^*]+?)\*\*/g, '$1 $2');
  
  // Remove orphaned CSS classes that appear as text
  // Pattern: "class-names"> at start of line or after whitespace
  cleaned = cleaned.replace(/(?:^|\s)"[\w\s-]*(?:font-|text-|bg-|border-|dark:|hover:)[\w\s-]*">\s*/gm, ' ');
  
  // Remove standalone CSS class strings that leaked
  cleaned = cleaned.replace(/"(?:font-|text-|bg-|border-|dark:|hover:)[\w\s-]*">/g, '');
  
  // Clean up malformed HTML attributes in text
  cleaned = cleaned.replace(/(?<!=)"[\w\s-]+"(?=\s*[>:])/g, '');
  
  // Fix broken bold formatting: **text: -> **text:**
  cleaned = cleaned.replace(/\*\*([^*:]+?):\s*(?!\*)/g, '**$1:**');
  
  // Remove extra whitespace but preserve intentional spacing
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.replace(/\n[ \t]+/g, '\n');
  cleaned = cleaned.replace(/[ \t]+\n/g, '\n');
  
  return cleaned.trim();
}

function normalizeWhitespace(text) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Enhanced line type identification */
function identifyLineType(line) {
  // Clean the line first
  const cleanLine = line.replace(/^["'\s]*|["'\s]*$/g, '').trim();
  if (!cleanLine) return { type: "paragraph" };
  
  // Markdown headers (# ## ### etc.)
  if (/^#{1,6}\s+/.test(cleanLine)) return { type: "markdown-header" };
  
  // Ordered lists
  if (/^\s*\d+[.)]\s+/.test(cleanLine)) return { type: "ordered-list" };
  
  // Bullets
  if (/^\s*[•\-\*\u2013\u2014]\s+/.test(cleanLine)) return { type: "unordered-list" };
  
  // Roman / Lettered
  if (/^\s*[ivxlcdm]+\.\s+/i.test(cleanLine)) return { type: "roman-list" };
  if (/^\s*[a-z]\.\s+/i.test(cleanLine)) return { type: "lettered-list" };
  
  // Numbered main heading like "1. Title" (but not lists)
  if (/^\s*\d+\.\s+[\p{L}]{3,}/u.test(cleanLine) && cleanLine.length > 15) {
    return { type: "main-heading" };
  }

  // Definition patterns (supports bold-first like **Term:** text)
  if (
    /^\s*\p{L}[\p{L}\p{N}\s,().\-–—]+[:：]\s+/u.test(cleanLine) ||
    /^\s*\*\*[^*]+?\*\*[:：]\s+/.test(cleanLine) ||
    /^\s*__[^_]+?__[:：]\s+/.test(cleanLine)
  ) {
    return { type: "definition" };
  }

  // Short heading-ish lines
  if ((cleanLine.length <= 80 && /[:：]$/.test(cleanLine)) ||
      (cleanLine.length <= 80 && !/[.!?]$/.test(cleanLine) && cleanLine.length > 3)) {
    return { type: "sub-heading" };
  }

  return { type: "paragraph" };
}

function parseContentBlocks(text) {
  const blocks = [];
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  let current = null;
  const push = () => { if (current?.content?.length) blocks.push(current); current = null; };

  for (const line of lines) {
    const t = identifyLineType(line);

    // Group list items by type
    if (["ordered-list","unordered-list","roman-list","lettered-list"].includes(t.type)) {
      if (!current || current.type !== t.type) { push(); current = { type: t.type, content: [] }; }
      current.content.push(line);
      continue;
    }

    // Group consecutive definitions together
    if (t.type === "definition") {
      if (!current || current.type !== "definition") { push(); current = { type: "definition", content: [] }; }
      current.content.push(line);
      continue;
    }

    // Handle markdown headers
    if (t.type === "markdown-header") {
      push();
      current = { type: "markdown-header", content: [line] };
      continue;
    }

    // New non-list/definition block resets unless paragraph continues
    if (!current || current.type !== t.type || t.type !== "paragraph") {
      push(); current = { type: t.type, content: [] };
    }
    current.content.push(line);
  }
  push();
  return blocks;
}

/** Enhanced inline formatting with better cleanup */
function formatInlineText(text) {
  if (!text) return "";
  
  // Clean the text first - REMOVE ">" SYMBOLS BEFORE HTML ESCAPING
  let cleaned = text.replace(/^["'\s]*|["'\s]*$/g, '').trim();
  
  // Remove any remaining CSS class artifacts
  cleaned = cleaned.replace(/"[\w\s-]*(?:font-|text-|bg-|border-|dark:)[\w\s-]*">/g, '');
  
  // CRITICAL: Remove ">" symbols BEFORE HTML escaping to prevent &gt; encoding
  cleaned = cleaned.replace(/>\s*/g, '');
  cleaned = cleaned.replace(/\s*>/g, '');
  
  let out = escapeHtml(cleaned);

  const strongOpen = `<strong class="font-semibold text-gray-900 dark:text-gray-100">`;
  const emOpen = `<em class="italic text-gray-800 dark:text-gray-200">`;
  const codeOpen = `<code class="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-sm font-mono">`;

  // **bold** / __bold__
  out = out
    .replace(/(?<!\*)\*\*([\s\S]+?)\*\*(?!\*)/g, `${strongOpen}$1</strong>`)
    .replace(/__([^_]+?)__/g, `${strongOpen}$1</strong>`);
  
  // *italic* / _italic_
  out = out
    .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, `${emOpen}$1</em>`)
    .replace(/(?<!_)_([^_]+?)_(?!_)/g, `${emOpen}$1</em>`);
  
  // `code`
  out = out.replace(/`([^`]+?)`/g, `${codeOpen}$1</code>`);
  
  // "quoted" highlight (optional)
  out = out.replace(/"([^"]+)"/g, `<span class="font-medium text-blue-700 dark:text-blue-300">"$1"</span>`);
  
  // (1) parentheticals accented
  out = out.replace(/\((\d+)\)/g, `<span class="font-medium text-blue-600 dark:text-blue-400">($1)</span>`);

  return out.replace(/\s{2,}/g, " ").trim();
}

function stripPrefix(line, re) { return line.replace(re, "").trim(); }

/** Enhanced heading formatters */
function formatMarkdownHeader(text) {
  const match = text.match(/^(#{1,6})\s+(.+)$/);
  if (!match) return formatMainHeading(text);
  
  const level = match[1].length;
  const content = formatInlineText(match[2]);
  
  if (level === 1) {
    return `<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-6 pb-3 border-b-2 border-gray-300 dark:border-gray-600">${content}</h1>`;
  } else if (level === 2) {
    return `<h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">${content}</h2>`;
  } else if (level === 3) {
    return `<h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-3">${content}</h3>`;
  } else {
    return `<h4 class="text-base font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2">${content}</h4>`;
  }
}

function formatMainHeading(text) {
  const t = formatInlineText(text.replace(/^\s*\d+\.\s+/, ""));
  return `<h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">${t}</h2>`;
}

function formatSubHeading(text) {
  const t = formatInlineText(text.replace(/[:：]\s*$/, ""));
  return `<h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-3">${t}</h3>`;
}

/** List formatters */
function formatOrderedList(items) {
  const lis = items.map(l => `<li class="mb-2 leading-relaxed">${formatInlineText(stripPrefix(l, /^\s*\d+[.)]\s+/))}</li>`).join("\n");
  return `<ol class="list-decimal list-outside ml-6 my-4 space-y-1 text-gray-700 dark:text-gray-300">\n${lis}\n</ol>`;
}

function formatUnorderedList(items) {
  const lis = items.map(l => `<li class="mb-2 leading-relaxed">${formatInlineText(stripPrefix(l, /^\s*[•\-\*\u2013\u2014]\s+/))}</li>`).join("\n");
  return `<ul class="list-disc list-outside ml-6 my-4 space-y-1 text-gray-700 dark:text-gray-300">\n${lis}\n</ul>`;
}

function formatLetteredList(items) {
  const lis = items.map(l => `<li class="mb-2 leading-relaxed">${formatInlineText(stripPrefix(l, /^\s*[a-z]\.\s+/i))}</li>`).join("\n");
  return `<ol class="list-outside ml-6 my-4 space-y-1 text-gray-700 dark:text-gray-300" style="list-style-type: lower-alpha;">\n${lis}\n</ol>`;
}

function formatRomanList(items) {
  const lis = items.map(l => `<li class="mb-2 leading-relaxed">${formatInlineText(stripPrefix(l, /^\s*[ivxlcdm]+\.\s+/i))}</li>`).join("\n");
  return `<ol class="list-outside ml-6 my-4 space-y-1 text-gray-700 dark:text-gray-300" style="list-style-type: lower-roman;">\n${lis}\n</ol>`;
}

/** Enhanced definition parsing and formatting */
function parseDefinitionPairs(lines) {
  return lines.map(l => {
    // Clean the line first
    const cleanLine = l.replace(/^["'\s]*|["'\s]*$/g, '').trim();
    
    // Bold-first: **Term:** Explanation
    let m = cleanLine.match(/^\s*\*\*([^*]+?)\*\*[:：]\s*(.+)$/);
    if (m) return { term: m[1].trim(), def: m[2].trim() };

    // Underscore bold: __Term__: Explanation
    m = cleanLine.match(/^\s*__([^_]+?)__[:：]\s*(.+)$/);
    if (m) return { term: m[1].trim(), def: m[2].trim() };

    // Plain: Term: Explanation
    m = cleanLine.match(/^\s*([^:：]+)[:：]\s*(.+)$/);
    if (m) return { term: m[1].trim(), def: m[2].trim() };

    return null;
  }).filter(Boolean);
}

function formatDefinitions(lines) {
  const pairs = parseDefinitionPairs(lines);

  if (!pairs.length) {
    return lines.map(l => formatParagraph(l)).join("\n");
  }

  if (PREFER_BULLETS_FOR_DEFINITIONS && pairs.length >= 2) {
    const lis = pairs.map(({ term, def }) => {
      const termHtml = `<strong class="font-semibold text-gray-900 dark:text-gray-100">${formatInlineText(term)}</strong>`;
      return `<li class="mb-2 leading-relaxed">${termHtml}: ${formatInlineText(def)}</li>`;
    }).join("\n");
    return `<ul class="list-disc list-outside ml-6 my-4 space-y-1 text-gray-700 dark:text-gray-300">\n${lis}\n</ul>`;
  }

  const dtdd = pairs.map(({ term, def }) =>
    `<dt class="font-semibold text-gray-900 dark:text-gray-100 mb-1">${formatInlineText(term)}</dt>\n<dd class="text-gray-700 dark:text-gray-300 ml-4 leading-relaxed">${formatInlineText(def)}</dd>`
  ).join("\n");

  return `<dl class="mb-4 space-y-2">\n${dtdd}\n</dl>`;
}

/** Paragraph formatters */
function formatParagraph(text) {
  const cleaned = text.replace(/^["'\s]*|["'\s]*$/g, '').trim();
  if (!cleaned) return "";
  return `<p class="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">${formatInlineText(cleaned)}</p>`;
}

function formatParagraphBlock(lines) {
  const cleanedLines = lines.map(l => l.replace(/^["'\s]*|["'\s]*$/g, '').trim()).filter(Boolean);
  
  if (cleanedLines.every(l => /^\s*(\*\*[^*]+?\*\*|__[^_]+__|[^:：]+)[:：]\s+.+$/.test(l))) {
    return formatDefinitions(cleanedLines);
  }
  
  const joined = cleanedLines.join(" ");
  const sentences = joined.split(/(?<=[.!?…])\s+/u).filter(Boolean);
  const paras = [];
  let cur = [];
  
  sentences.forEach((s, i) => {
    cur.push(s);
    if (cur.length >= 4 || i === sentences.length - 1) {
      paras.push(cur.join(" "));
      cur = [];
    }
  });
  
  return paras.map(p => formatParagraph(p.trim())).filter(Boolean).join("\n");
}

/** Enhanced HTML sanitization */
function sanitizeHtml(html) {
  // Remove script, style, and other dangerous tags
  html = html.replace(/<\/?(?:script|style|iframe|object|embed|svg|math)[^>]*>/gi, "");
  
  // Remove orphaned CSS class strings that appear as text content
  html = html.replace(/>"[\w\s-]*(?:font-|text-|bg-|border-|dark:)[\w\s-]*"</g, "><");
  html = html.replace(/>"[\w\s-]*(?:font-|text-|bg-|border-|dark:)[\w\s-]*"/g, ">");

  // Clean up tags and attributes
  html = html.replace(/<([a-z0-9]+)(\s[^>]*)?>/gi, (m, tag, attrs) => {
    tag = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (!attrs) return `<${tag}>`;

    if (OUTPUT_MODE === "tailwind") {
      const classMatch = attrs.match(/\sclass=(?:"([^"]*)"|'([^']*)')/i);
      const klass = classMatch ? (classMatch[1] ?? classMatch[2]) : "";
      return klass ? `<${tag} class="${klass}">` : `<${tag}>`;
    }
    return `<${tag}>`;
  });

  // Clean up closing tags
  html = html.replace(/<\/([a-z0-9]+)>/gi, (m, tag) =>
    ALLOWED_TAGS.has(tag.toLowerCase()) ? `</${tag.toLowerCase()}>` : ""
  );

  return healOrphanedAttributes(html);
}

/** Enhanced orphaned attribute healing */
function healOrphanedAttributes(html) {
  // Remove orphaned attribute values and CSS class strings
  html = html
    // Remove standalone quoted strings that look like CSS classes
    .replace(/(?<![=\w])"[\w\s-]*(?:font-|text-|bg-|border-|dark:|hover:)[\w\s-]*"(?!\w)/g, "")
    // Remove orphaned attribute values right before a tag close
    .replace(/(?<![a-zA-Z0-9_:-]+=)"[^"]*"\s*>/g, ">")
    // Remove orphaned attribute values followed by text
    .replace(/(?<![a-zA-Z0-9_:-]+=)"[^"]*"\s+(?=[^\s<])/g, "")
    // Clean up extra spaces
    .replace(/\s{2,}/g, " ")
    .replace(/>\s+</g, "><");
    
  return html;
}

/** Main formatting function */
export function formatSummaryText(raw) {
  if (!raw || typeof raw !== "string") return "";
  
  // Pre-process to fix common issues
  const preprocessed = preprocessText(raw);
  const cleaned = normalizeWhitespace(preprocessed);
  const blocks = parseContentBlocks(cleaned);

  const html = blocks.map(b => {
    switch (b.type) {
      case "markdown-header":  return formatMarkdownHeader(b.content.join(" "));
      case "main-heading":     return formatMainHeading(b.content.join(" "));
      case "sub-heading":      return formatSubHeading(b.content.join(" "));
      case "ordered-list":     return formatOrderedList(b.content);
      case "unordered-list":   return formatUnorderedList(b.content);
      case "lettered-list":    return formatLetteredList(b.content);
      case "roman-list":       return formatRomanList(b.content);
      case "definition":       return formatDefinitions(b.content);
      case "paragraph":
      default:                 return formatParagraphBlock(b.content);
    }
  }).filter(Boolean).join("\n\n");

  return sanitizeHtml(html)
    .replace(/>\s+\n</g, ">\n<")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Enhanced consistency checking */
export function ensureFormattingConsistency(htmlOrText) {
  if (!htmlOrText || typeof htmlOrText !== "string") return "";
  
  if (!htmlOrText.includes("<")) {
    return formatSummaryText(htmlOrText);
  }
  
  return sanitizeHtml(
    htmlOrText
      .replace(/>\s*\n\s*</g, ">\n<")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

export function shouldReformat(text) {
  if (!text) return false;
  return [
    /\*\*\*/, 
    /\d+\)[^\s]/, 
    /[•·▪▫]/, 
    /\s{3,}/, 
    /__[^_]+__/,
    /"[\w\s-]*(?:font-|text-|bg-|border-|dark:)[\w\s-]*">/,  // CSS class leakage
    /\*\*#{1,6}/,  // Mixed markdown headers
    /\*\*\s*>/,    // Quote markers after bold formatting
    /^\s*>/m,      // Lines starting with quote markers
  ].some(p => p.test(text));
}