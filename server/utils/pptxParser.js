import officeParser from "officeparser";
import fs from "fs";

/**
 * Extract text from a PPTX file using officeparser
 * @param {Buffer} buffer - The PPTX file buffer
 * @returns {Promise<string>} - Extracted text from the PPTX file
 */
export function parsePPTX(buffer) {
  return new Promise(async (resolve, reject) => {
    try {
      // Use the officeparser library to extract text
      const extractedText = await officeParser.parseOfficeAsync(buffer);

      // Format the text with slide separators for better readability
      // officeparser already extracts the slides, we're just making it consistent with our previous format
      const formattedText = extractedText
        .split("\n")
        .map((line, index) => {
          // If this is the start of a new slide (we'll assume major paragraph breaks are new slides)
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
      console.error("Error parsing PPTX:", error);
      reject(error);
    }
  });
}

/**
 * Extract text from PPTX and organize by slides
 * @param {Buffer} buffer - The PPTX file buffer
 * @returns {Promise<Array<string>>} - Array of extracted text from each slide
 */
export function parseSlidesByPPTX(buffer) {
  return new Promise(async (resolve, reject) => {
    try {
      // Use the officeparser library to extract text
      const extractedText = await officeParser.parseOfficeAsync(buffer);

      // Split the text into slides (assuming major paragraph breaks indicate new slides)
      const lines = extractedText.split("\n");
      let slides = [];
      let currentSlide = "";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // If we've hit an empty line and the next line has content, consider it a new slide
        if (
          !line &&
          i < lines.length - 1 &&
          lines[i + 1].trim() &&
          currentSlide
        ) {
          slides.push(currentSlide.trim());
          currentSlide = "";
        } else if (line) {
          currentSlide += line + " ";
        }
      }

      // Add the last slide if it has content
      if (currentSlide.trim()) {
        slides.push(currentSlide.trim());
      }

      // Filter slides to ensure they have meaningful content
      slides = slides.filter(
        (slide) => slide.length > 10 && slide.match(/[a-zA-Z]/)
      );

      // Make sure we have valid content
      if (!slides.length) {
        return reject(new Error("No valid content found in PPTX"));
      }

      resolve(slides);
    } catch (error) {
      console.error("Error parsing PPTX slides:", error);
      reject(error);
    }
  });
}
