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
      // Log the entire PDF data for debugging
      // console.log("Raw PDF Data:", JSON.stringify(pdfData, null, 2));

      // Use formImage.Pages if available; otherwise, fallback to pdfData.Pages
      const pagesData = (pdfData?.formImage?.Pages || pdfData?.Pages) || [];
      const pages = pagesData.map((page, index) => {
        let lastY = -1;
        let pageText = '';
        let paragraphs = [];
        let currentParagraph = '';
        
        // Sort texts by Y position to maintain reading order
        const sortedTexts = (page.Texts || []).sort((a, b) => {
          return (a.y || 0) - (b.y || 0);
        });

        sortedTexts.forEach((textItem) => {
          try {
            const text = decodeURIComponent(textItem.R[0].T);
            
            // Start a new paragraph if Y position changes significantly
            if (lastY !== -1 && Math.abs(textItem.y - lastY) > 1) {
              if (currentParagraph.trim().length > 0) {
                paragraphs.push(currentParagraph.trim());
                currentParagraph = '';
              }
            }
            
            currentParagraph += text + ' ';
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
          .filter(p => p.length > 0)  // Remove empty paragraphs
          .join('\n\n');

        // Clean up the text
        pageText = pageText
          .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
          .replace(/\n\s+/g, '\n')  // Clean up spaces after line breaks
          .replace(/[•\-–—]/g, '')  // Remove bullet points and dashes
          .trim();

        console.log(`Page ${index + 1} content:`, {
          length: pageText.length,
          preview: pageText.substring(0, 100),
          paragraphs: paragraphs.length
        });

        // Only return pages with meaningful content
        if (pageText.length < 100 || !pageText.match(/[a-zA-Z]/)) {
          console.log(`Skipping Page ${index + 1} due to insufficient content`);
          return null;
        }

        return pageText;
      });

      // Filter out null pages and check if we have any valid content
      const validPages = pages.filter(Boolean);
      if (!validPages.length) {
        return reject(new Error("No valid content found in PDF"));
      }

      resolve(validPages);
    });

    pdfParser.parseBuffer(buffer);
  });
}
