// utils/docxParser.js
import mammoth from "mammoth";

/**
 * Extracts plain text from a .docx buffer.
 * @param {Buffer|Uint8Array|ArrayBuffer} fileBuffer
 * @returns {Promise<string>}
 */
export async function parseDOCX(fileBuffer) {
  const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
  return (value || "").replace(/\r\n/g, "\n").trim();
}

/**
 * Optional: split DOCX into sections (best-effort).
 * DOCX has no true "pages"—we try to detect page breaks/headings and fall back to paragraphs.
 * @param {Buffer|Uint8Array|ArrayBuffer} fileBuffer
 * @returns {Promise<string[]>}
 */
export async function parseBlocksByDOCX(fileBuffer) {
  const { value: html } = await mammoth.convertToHtml(
    { buffer: fileBuffer },
    {
      // If Mammoth can detect page breaks, map them to an <hr class="page-break"> and split below.
      styleMap: ["br[type=page] => hr.page-break"],
      includeDefaultStyleMap: true,
      convertImage: mammoth.images.none,
    }
  );

  // Turn the simple HTML into text with explicit break markers
  const text = (html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<hr[^>]*class="page-break"[^>]*>/gi, "\n\n---PAGEBREAK---\n\n")
    .replace(/<[^>]+>/g, "");

  if (text.includes("---PAGEBREAK---")) {
    return text
      .split(/\s*---PAGEBREAK---\s*/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Fallback: split by blank lines as coarse “sections”
  return text.split(/\n{2,}/g).map((s) => s.trim()).filter(Boolean);
}
