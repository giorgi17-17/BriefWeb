import officeParser from "officeparser";
import fs from "fs";
import { extractPptxSlides } from "pptx-content-extractor";
import path from "path";
import os from "os";
import { debugLog, debugWarn, debugError } from "./debugLogger.js";

/**
 * Extract text from a PPTX file using officeparser
 * @param {Buffer} buffer - The PPTX file buffer
 * @returns {Promise<string>} - Extracted text from the PPTX file
 */
export function parsePPTX(buffer) {
  return new Promise(async (resolve, reject) => {
    try {
      const extractedText = await officeParser.parseOfficeAsync(buffer);
      const formattedText = extractedText
        .split("\n")
        .map((line, index) => {
          if (
            line.trim() &&
            index > 0 &&
            !extractedText.split("\n")[index - 1].trim()
          ) {
            return `\n\n--- New Slide ---\n${line}`;
          }
          return line;
        })
        .join("\n");

      resolve(formattedText.trim());
    } catch (error) {
      debugError("Error parsing PPTX:", error);
      reject(error);
    }
  });
}

/**
 * Extract text from PPTX and organize by slides - ULTRA SIMPLE APPROACH
 * @param {Buffer} buffer - The PPTX file buffer
 * @returns {Promise<Array<string>>} - Array of extracted text from each slide
 */
export function parseSlidesByPPTX(buffer) {
  return new Promise(async (resolve, reject) => {
    let tempFilePath = null;

    // Ensure cleanup happens regardless of how the function exits
    const cleanup = () => {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
          debugLog(`Cleaned up temp file: ${tempFilePath}`);
        } catch (cleanupError) {
          debugWarn(`Failed to cleanup temp file: ${cleanupError.message}`);
        }
      }
    };

    try {
      debugLog("Parsing PPTX with specialized library...");

      // STEP 1: Try specialized library
      const tempDir = os.tmpdir();
      tempFilePath = path.join(tempDir, `temp_pptx_${Date.now()}.pptx`);

      fs.writeFileSync(tempFilePath, buffer);
      const slidesData = await extractPptxSlides(tempFilePath);
      debugLog(`Found ${slidesData.length} slides in PPTX`);

      // Clean up temp file
      cleanup();

      // Process the slides - KEEP IT SIMPLE
      const slides = [];
      for (let i = 0; i < slidesData.length; i++) {
        const slideData = slidesData[i];
        let text = "";

        // Extract text in the simplest way possible
        if (typeof slideData === "string") {
          text = slideData;
        } else if (slideData && slideData.content) {
          text = slideData.content;
        } else if (slideData && slideData.text) {
          text = slideData.text;
        } else if (slideData) {
          // Get any string content
          const values = Object.values(slideData);
          text = values
            .filter((v) => typeof v === "string" && v.trim())
            .join(" ");
        }

        // Clean text and remove any HTML that might have been extracted
        text = text
          .replace(/\s+/g, " ")
          .replace(/<[^>]*>/g, "") // Remove HTML tags
          .replace(/&[a-zA-Z0-9#]+;/g, " ") // Remove HTML entities
          .replace(/class\s*=\s*"[^"]*"/g, "") // Remove class attributes
          .replace(/style\s*=\s*"[^"]*"/g, "") // Remove style attributes
          .trim();

        if (text.length < 5) {
          text = `Slide ${i + 1}: Visual content with minimal text.`;
        }

        slides.push(text);
      }

      debugLog(`Successfully processed ${slides.length} slides`);
      resolve(slides);
    } catch (error) {
      debugWarn(`Specialized library failed: ${error.message}`);

      // Clean up temp file
      cleanup();

      // STEP 2: Simple fallback
      try {
        debugLog("Using fallback text extraction...");
        const fullText = await officeParser.parseOfficeAsync(buffer);

        // Clean the full text first
        const cleanedFullText = fullText
          .replace(/<[^>]*>/g, "") // Remove HTML tags
          .replace(/&[a-zA-Z0-9#]+;/g, " ") // Remove HTML entities
          .replace(/class\s*=\s*"[^"]*"/g, "") // Remove class attributes
          .replace(/style\s*=\s*"[^"]*"/g, "") // Remove style attributes
          .replace(/\s+/g, " ")
          .trim();

        // ULTRA-SIMPLE: Just divide text into reasonable chunks
        const words = cleanedFullText.split(/\s+/);
        const wordsPerSlide = Math.max(50, Math.floor(words.length / 30)); // Target ~30 slides max

        const slides = [];
        for (let i = 0; i < words.length; i += wordsPerSlide) {
          const slideWords = words.slice(i, i + wordsPerSlide);
          const slideText = slideWords.join(" ").trim();
          if (slideText.length > 20) {
            slides.push(slideText);
          }
        }

        debugLog(`Fallback created ${slides.length} slides`);
        resolve(slides.length > 0 ? slides : [fullText]);
      } catch (finalError) {
        debugError("All parsing methods failed:", finalError);
        cleanup();
        reject(finalError);
      }
    }
  });
}
