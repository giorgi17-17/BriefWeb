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

      // IMPROVED: More inclusive slide filtering
      // Process all slides, even those with minimal content
      const processedSlides = slides.map((slide, index) => {
        const slideNumber = index + 1;

        // If slide is completely empty, provide a placeholder
        if (!slide || slide.trim().length === 0) {
          console.log(`Slide ${slideNumber} is empty, providing placeholder`);
          return `Slide ${slideNumber} appears to contain visual content (images, diagrams, or formatting elements) without extractable text.`;
        }

        // Check for meaningful content with multi-language support
        const hasMeaningfulContent =
          /[\w\u00C0-\u017F\u0400-\u04FF\u10A0-\u10FF\u0590-\u05FF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/.test(
            slide
          );

        if (!hasMeaningfulContent && slide.length < 10) {
          console.log(
            `Slide ${slideNumber} has minimal content, but including it anyway`
          );
          return `Slide ${slideNumber} contains limited text content: ${slide}`;
        }

        console.log(
          `Slide ${slideNumber} processed successfully with ${slide.length} characters`
        );
        return slide;
      });

      // If we have no slides at all, create at least one slide
      if (processedSlides.length === 0) {
        console.log("No slides found, creating placeholder slide");
        processedSlides.push(
          "This presentation appears to contain only visual content without extractable text."
        );
      }

      console.log(
        `PPTX parsed successfully: ${processedSlides.length} slides processed`
      );
      resolve(processedSlides);
    } catch (error) {
      console.error("Error parsing PPTX slides:", error);
      reject(error);
    }
  });
}
