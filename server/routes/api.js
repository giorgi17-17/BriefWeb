// routes/api.js
import express from "express";
import {
  processDocument,
  processBrief,
  testContentExtraction,
  processDetailedContent,
  processQuiz,
} from "../controllers/documentController.js";
import paymentRoutes from "./paymentRoutes.js";

const router = express.Router();

// Mount payment routes
router.use("/payments", paymentRoutes);

router.post("/process-pdf", async (req, res) => {
  const { userId, lectureId, fileId } = req.body;

  if (!userId || !lectureId || !fileId) {
    return res.status(400).json({
      error: "Missing required parameters: userId, lectureId, or fileId",
    });
  }

  try {
    const flashcards = await processDocument(userId, lectureId, fileId);

    // Return meaningful error response if flashcards weren't generated properly
    if (!flashcards || !Array.isArray(flashcards) || flashcards.length === 0) {
      console.warn("No valid flashcards generated for document");
      return res.status(422).json({
        error: "Could not generate flashcards from the document content",
        flashcards: [
          {
            id: "error-fallback",
            question: "Error processing document",
            answer:
              "The system couldn't generate valid flashcards from this document. Please try with a different file or contact support.",
          },
        ],
      });
    }

    res.status(200).json({ flashcards });
  } catch (error) {
    console.error("Error processing document:", error);
    // Send a fallback response with a generic flashcard
    res.status(500).json({
      error: "Failed to process the document",
      details: error.message,
      flashcards: [
        {
          id: "error-fallback",
          question: "Error processing document",
          answer:
            "An error occurred while processing your document. Please try again or upload a different file.",
        },
      ],
    });
  }
});

router.post("/process-brief", async (req, res) => {
  const { userId, lectureId, fileId } = req.body;

  if (!userId || !lectureId || !fileId) {
    return res.status(400).json({
      error: "Missing required parameters: userId, lectureId, or fileId",
    });
  }

  try {
    const brief = await processBrief(userId, lectureId, fileId);

    // Return meaningful error response if brief is invalid
    if (!brief || typeof brief !== "object" || !brief.summary) {
      console.warn("No valid brief generated for document");
      return res.status(422).json({
        error: "Could not generate brief from the document content",
        brief: {
          summary:
            "The system couldn't generate a meaningful summary for this document. Please try with a different file.",
          key_concepts: [],
          important_details: [],
        },
      });
    }

    res.status(200).json({ brief });
  } catch (error) {
    console.error("Error processing brief:", error);
    res.status(500).json({
      error: "Failed to process the document",
      details: error.message,
      brief: {
        summary:
          "An error occurred while processing your document. Please try again or upload a different file.",
        key_concepts: [],
        important_details: [],
      },
    });
  }
});

router.post("/test-document-content", async (req, res) => {
  const { userId, lectureId, fileId } = req.body;

  if (!userId || !lectureId || !fileId) {
    return res.status(400).json({
      error: "Missing required parameters: userId, lectureId, or fileId",
    });
  }

  try {
    const pages = await testContentExtraction(userId, lectureId, fileId);

    // Check if pages were extracted successfully
    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return res.status(422).json({
        error: "No content could be extracted from the document",
        pages: [
          "No readable content found in the document. Please check the file format and try again.",
        ],
      });
    }

    res.status(200).json({ pages });
  } catch (error) {
    console.error("Error in test endpoint:", error);
    res.status(500).json({
      error: "Failed to process the document",
      details: error.message,
      pages: [
        "An error occurred while processing your document. Please try again or upload a different file.",
      ],
    });
  }
});

router.post("/detailed-brief", async (req, res) => {
  const { userId, lectureId, fileId } = req.body;

  if (!userId || !lectureId || !fileId) {
    return res.status(400).json({
      error: "Missing required parameters",
    });
  }

  try {
    const result = await processDetailedContent(userId, lectureId, fileId);

    // Check if result is valid
    if (
      !result ||
      !result.summaries ||
      !Array.isArray(result.summaries) ||
      result.summaries.length === 0
    ) {
      console.warn("Invalid detailed brief result:", result);
      const fallbackBrief = {
        totalPages: 1,
        pageSummaries: [
          "The system couldn't generate a meaningful summary for this document.",
        ],
        overview: {
          documentTitle: fileId,
          mainThemes: [],
          fileName: fileId,
        },
        key_concepts: [],
        important_details: [],
      };

      return res.json({
        success: false,
        error: "Could not generate a detailed brief for this document",
        brief: fallbackBrief,
      });
    }

    // Transform the response to match frontend expectations
    const brief = {
      totalPages: result.total_pages,
      pageSummaries: result.summaries,
      overview: {
        documentTitle: result.metadata?.documentTitle || fileId,
        mainThemes: result.metadata?.mainThemes || [],
        fileName: fileId,
      },
      key_concepts: result.metadata?.key_concepts || [],
      important_details: result.metadata?.important_details || [],
    };
    res.json({ success: true, brief });
  } catch (error) {
    console.error("Error generating detailed brief:", error);

    const fallbackBrief = {
      totalPages: 1,
      pageSummaries: ["An error occurred while processing your document."],
      overview: {
        documentTitle: fileId,
        mainThemes: [],
        fileName: fileId,
      },
      key_concepts: [],
      important_details: [],
    };

    res.status(500).json({
      success: false,
      error: error.message,
      brief: fallbackBrief,
    });
  }
});

router.post("/process-quiz", async (req, res) => {
  try {
    const { userId, lectureId, fileId, quizOptions } = req.body;

    // Validate required parameters
    if (!userId || !lectureId || !fileId) {
      return res.status(400).json({
        error: "Missing required parameters: userId, lectureId, or fileId",
      });
    }

    // Process the quiz with the options
    const result = await processQuiz(
      userId,
      lectureId,
      fileId,
      quizOptions || {}
    );

    // Check if result is valid
    if (
      !result ||
      !result.questions ||
      !Array.isArray(result.questions) ||
      result.questions.length === 0
    ) {
      console.warn("No valid quiz generated for document");
      return res.status(200).json({
        success: true,
        questions: [
          {
            id: "error-fallback",
            type: "multiple_choice",
            text: "Error generating quiz content",
            options: [
              {
                text: "The document couldn't be processed properly",
                isCorrect: true,
              },
              { text: "Try a different document", isCorrect: false },
              {
                text: "Contact support if the issue persists",
                isCorrect: false,
              },
              {
                text: "The document may be in an unsupported format",
                isCorrect: false,
              },
            ],
          },
        ],
      });
    }

    res.status(200).json({
      success: true,
      questions: result.questions,
    });
  } catch (error) {
    console.error("Error processing quiz:", error);
    // Send a fallback response with a generic question
    res.status(200).json({
      success: true,
      questions: [
        {
          id: "error-fallback",
          type: "multiple_choice",
          text: "Error processing document",
          options: [
            { text: "The system encountered an error", isCorrect: true },
            { text: "Please try again later", isCorrect: false },
            { text: "Try with a different document", isCorrect: false },
            { text: "Contact support if the issue persists", isCorrect: false },
          ],
        },
      ],
    });
  }
});

export default router;
