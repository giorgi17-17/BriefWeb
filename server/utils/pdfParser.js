import PDFParser from "pdf2json";

export function parsePDF(buffer) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData) => {
      console.error("PDF Parsing Error:", errData);
      reject(errData.parserError);
    });

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      let extractedText = "";

      if (pdfData.Pages) {
        pdfData.Pages.forEach((page) => {
          if (page.Texts) {
            page.Texts.forEach((text) => {
              try {
                const decodedText = decodeURIComponent(text.R[0].T);
                extractedText += decodedText + " ";
              } catch (decodeError) {
                console.warn("Decoding error:", decodeError);
              }
            });
          }
        });
      }

      resolve(extractedText.trim());
    });

    pdfParser.parseBuffer(buffer);
  });
}

export function parsePagesByPDF(buffer) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData) => {
      console.error("pdfParser error:", errData.parserError);
      reject(errData.parserError);
    });

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      // Log basic PDF information
      console.log(
        `PDF parsing complete. Found ${pdfData?.Pages?.length || 0} pages.`
      );

      // Use formImage.Pages if available; otherwise, fallback to pdfData.Pages
      const pagesData = pdfData?.formImage?.Pages || pdfData?.Pages || [];

      if (pagesData.length === 0) {
        console.warn("Warning: No pages found in PDF data");
        return reject(new Error("No pages found in PDF"));
      }

      const pages = pagesData.map((page, index) => {
        let lastY = -1;
        let pageText = "";
        let paragraphs = [];
        let currentParagraph = "";

        // Get all texts from the page
        const texts = page.Texts || [];
        if (texts.length === 0) {
          console.warn(`Warning: No text elements found on page ${index + 1}`);
          // Return empty string instead of null for pages with no text elements
          // This allows the page to be processed and potentially contain images or other content
          return "";
        }

        // Sort texts by Y position to maintain reading order
        const sortedTexts = texts.sort((a, b) => {
          return (a.y || 0) - (b.y || 0);
        });

        sortedTexts.forEach((textItem) => {
          try {
            if (!textItem.R || !textItem.R[0] || !textItem.R[0].T) {
              console.warn(`Warning: Invalid text item on page ${index + 1}`);
              return; // Skip this text item
            }

            const text = decodeURIComponent(textItem.R[0].T);

            // Start a new paragraph if Y position changes significantly
            if (lastY !== -1 && Math.abs(textItem.y - lastY) > 1) {
              if (currentParagraph.trim().length > 0) {
                paragraphs.push(currentParagraph.trim());
                currentParagraph = "";
              }
            }

            currentParagraph += text + " ";
            lastY = textItem.y;
          } catch (err) {
            console.warn(`Decoding error on Page ${index + 1}:`, err);
          }
        });

        // Add the last paragraph
        if (currentParagraph.trim().length > 0) {
          paragraphs.push(currentParagraph.trim());
        }

        // Join paragraphs with proper spacing
        pageText = paragraphs
          .filter((p) => p.length > 0) // Remove empty paragraphs
          .join("\n\n");

        // Clean up the text
        pageText = pageText
          .replace(/\s+/g, " ") // Replace multiple spaces with single space
          .replace(/\n\s+/g, "\n") // Clean up spaces after line breaks
          .replace(/[•\-–—]/g, "") // Remove bullet points and dashes
          .trim();

        console.log(`Page ${index + 1} content:`, {
          length: pageText.length,
          preview:
            pageText.substring(0, 100) + (pageText.length > 100 ? "..." : ""),
          paragraphs: paragraphs.length,
        });

        // IMPROVED: Much more lenient page filtering
        // Accept pages with any meaningful content instead of being overly restrictive
        if (pageText.length === 0) {
          console.log(`Page ${index + 1} is completely empty`);
          return `Page ${
            index + 1
          } appears to contain non-text content (images, diagrams, or formatting elements).`;
        }

        // Check for any meaningful characters (letters, numbers, or common symbols)
        // Support multiple languages including Georgian, Arabic, Chinese, etc.
        const hasMeaningfulContent =
          /[\w\u00C0-\u017F\u0400-\u04FF\u10A0-\u10FF\u0590-\u05FF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/.test(
            pageText
          );

        if (!hasMeaningfulContent && pageText.length < 20) {
          console.log(
            `Page ${index + 1} has minimal content, but including it anyway`
          );
          return `Page ${index + 1} contains limited text content: ${pageText}`;
        }

        return pageText;
      });

      // IMPROVED: Don't filter out any pages - include all pages even if they seem empty
      // This ensures we process every page of the document
      const allPages = pages.map((page, index) => {
        if (page === null || page === undefined) {
          return `Page ${
            index + 1
          } could not be processed due to formatting issues.`;
        }
        return page;
      });

      console.log(
        `PDF parsed successfully: ${
          allPages.length
        } pages processed (including ${
          allPages.length - pages.filter(Boolean).length
        } pages with minimal content)`
      );

      // Always return all pages - never reject due to content issues
      if (allPages.length === 0) {
        return reject(new Error("PDF contains no pages"));
      }

      resolve(allPages);
    });

    pdfParser.parseBuffer(buffer);
  });
}
