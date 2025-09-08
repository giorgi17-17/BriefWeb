// routes/api.js
import express from "express";
import {
  processDocument,
  processBrief,
  testContentExtraction,
  processDetailedContent,
  processQuiz,
} from "../controllers/documentController.js";
import userPlanRoutes from "./userPlanRoutes.js";
import { evaluateOpenEndedAnswer } from "../services/ai/aiService.js";
import { phCapture, durationMsFrom } from "../utils/postHog.js";
import { startReqTimer, baseProps } from "../utils/reqMeta.js";


const router = express.Router();

// Mount payment routes

// Mount user plan routes
router.use("/user-plans", userPlanRoutes);

router.post("/process-pdf", async (req, res) => {
  const { userId, lectureId, fileId } = req.body;
  startReqTimer(req, res);

  console.log("process-pdf endpoint called with:", {
    userId,
    lectureId,
    fileId,
  });

  if (!userId || !lectureId || !fileId) {
    phCapture(userId, "llm_process_pdf:error", {
      ...baseProps(req),
      reason: "missing_params",
    });
    return res.status(400).json({
      error: "Missing required parameters: userId, lectureId, or fileId",
    });
  }
  
  const props = { ...baseProps(req), lectureId, fileId };
  phCapture(userId, "llm_process_pdf:request", props);

  try {
    console.log("Calling processDocument...");
    const flashcards = await processDocument(userId, lectureId, fileId);

    const dur = durationMsFrom(req.t0);
    if (!flashcards || !Array.isArray(flashcards) || flashcards.length === 0) {
      phCapture(userId, "llm_process_pdf:empty", {
        ...props,
        duration_ms: dur,
      });
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

    console.log("processDocument returned:", {
      isArray: Array.isArray(flashcards),
      length: Array.isArray(flashcards) ? flashcards.length : "not an array",
    });

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

    phCapture(userId, "llm_process_pdf:success", {
      ...props,
      duration_ms: dur,
      count: flashcards.length,
    });

    console.log(`Sending response with ${flashcards.length} flashcards`);
    res.status(200).json({ flashcards });
  } catch (error) {
    console.error("Error processing document:", error);
    // Send a fallback response with a generic flashcard
    console.log("Sending error response with fallback flashcard");
    phCapture(userId, "llm_process_pdf:error", {
      ...props,
      duration_ms: durationMsFrom(req.t0),
      error_class: error?.name || "Error",
      error_message: String(error?.message || "").slice(0, 300),
    });
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
  startReqTimer(req, res);

  if (!userId || !lectureId || !fileId) {
    phCapture(userId, "llm_process_brief:error", {
      ...baseProps(req),
      reason: "missing_params",
    });
    return res.status(400).json({
      error: "Missing required parameters: userId, lectureId, or fileId",
    });
  }

  const props = { ...baseProps(req), lectureId, fileId };
  phCapture(userId, "llm_process_brief:request", props);

  try {
    const brief = await processBrief(userId, lectureId, fileId);
    const dur = durationMsFrom(req.t0);

    if (!brief || typeof brief !== "object" || !brief.summary) {
      phCapture(userId, "llm_process_brief:empty", { ...props, duration_ms: dur });
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

    phCapture(userId, "llm_process_brief:success", {
      ...props,
      duration_ms: dur,
      has_key_concepts: Array.isArray(brief.key_concepts) && brief.key_concepts.length > 0,
    });

    res.status(200).json({ brief });
  } catch (error) {
    console.error("Error processing brief:", error);
    phCapture(userId, "llm_process_brief:error", {
      ...props,
      duration_ms: durationMsFrom(req.t0),
      error_class: error?.name || "Error",
      error_message: String(error?.message || "").slice(0, 300),
    });
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
  startReqTimer(req, res);

  if (!userId || !lectureId || !fileId) {
    phCapture(userId, "llm_test_content:error", {
      ...baseProps(req),
      reason: "missing_params",
    });
    return res.status(400).json({
      error: "Missing required parameters: userId, lectureId, or fileId",
    });
  }

  const props = { ...baseProps(req), lectureId, fileId };
  phCapture(userId, "llm_test_content:request", props);

  try {
    const pages = await testContentExtraction(userId, lectureId, fileId);
    const dur = durationMsFrom(req.t0);

    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      phCapture(userId, "llm_test_content:empty", { ...props, duration_ms: dur });
      return res.status(422).json({
        error: "No content could be extracted from the document",
        pages: [
          "No readable content found in the document. Please check the file format and try again.",
        ],
      });
    }

    phCapture(userId, "llm_test_content:success", {
      ...props,
      duration_ms: dur,
      pages: pages.length,
    });

    res.status(200).json({ pages });
  } catch (error) {
    console.error("Error in test endpoint:", error);
     phCapture(userId, "llm_test_content:error", {
      ...props,
      duration_ms: durationMsFrom(req.t0),
      error_class: error?.name || "Error",
      error_message: String(error?.message || "").slice(0, 300),
    });
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
  startReqTimer(req, res);

  if (!userId || !lectureId || !fileId) {
    phCapture(userId, "llm_detailed_brief:error", {
      ...baseProps(req),
      reason: "missing_params",
    });
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const props = { ...baseProps(req), lectureId, fileId };
  phCapture(userId, "llm_detailed_brief:request", props);

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
      phCapture(userId, "llm_detailed_brief:empty", { ...props, duration_ms: dur });
    

      const fallbackBrief = {
        totalPages: 1,
        pageSummaries: [
          `1. Document Processing Issue
This document could not be properly processed by the AI system, which may be due to formatting, content complexity, or technical limitations.

- The document may contain images, charts, or complex formatting that requires manual review
- Try uploading the document in a different format (PDF vs DOCX vs PPTX)
- Ensure the document contains readable text content rather than just images
- Contact support if the issue persists with multiple document formats

2. Recommended Actions
Please try the following steps to resolve this issue:

- Check that the document is not password-protected or corrupted
- Verify the document contains substantial text content for analysis
- Consider breaking large documents into smaller sections
- Review the document for any unusual formatting that might interfere with processing`,
        ],
        overview: {
          documentTitle: fileId,
          mainThemes: [
            "Document Processing",
            "Technical Issues",
            "User Guidance",
          ],
          fileName: fileId,
        },
        key_concepts: [
          "Document compatibility",
          "AI processing limitations",
          "Alternative formats",
        ],
        important_details: [
          "Multiple format support",
          "Manual review options",
          "Support availability",
        ],
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

    phCapture(userId, "llm_detailed_brief:success", {
      ...props,
      duration_ms: dur,
      pages: brief.totalPages,
    });

    res.json({ success: true, brief });
  } catch (error) {
    console.error("Error generating detailed brief:", error);
    phCapture(userId, "llm_detailed_brief:error", {
      ...props,
      duration_ms: durationMsFrom(req.t0),
      error_class: error?.name || "Error",
      error_message: String(error?.message || "").slice(0, 300),
    });

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
    startReqTimer(req, res);

    if (!userId || !lectureId || !fileId) {
      phCapture(userId, "llm_quiz:error", {
        ...baseProps(req),
        reason: "missing_params",
      });
      return res.status(400).json({
        error: "Missing required parameters: userId, lectureId, or fileId",
      });
    }

    // Validate required parameters
    if (!userId || !lectureId || !fileId) {
      return res.status(400).json({
        error: "Missing required parameters: userId, lectureId, or fileId",
      });
    }

    const props = { ...baseProps(req), lectureId, fileId };
    phCapture(userId, "llm_quiz:request", { ...props, has_options: !!quizOptions });


    // Process the quiz with the options
    const result = await processQuiz(
      userId,
      lectureId,
      fileId,
      quizOptions || {}
    );
    const dur = durationMsFrom(req.t0);

    // Check if result is valid
    if (
      !result ||
      !result.questions ||
      !Array.isArray(result.questions) ||
      result.questions.length === 0
    ) {
      phCapture(userId, "llm_quiz:empty", { ...props, duration_ms: dur });
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


     phCapture(userId, "llm_quiz:success", {
      ...props,
      duration_ms: dur,
      count: result.questions.length,
    });

    res.status(200).json({
      success: true,
      questions: result.questions,
    });
  } catch (error) {
    console.error("Error processing quiz:", error);
     phCapture(userId, "llm_quiz:error", {
      ...props,
      duration_ms: durationMsFrom(req.t0),
      error_class: error?.name || "Error",
      error_message: String(error?.message || "").slice(0, 300),
    });

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

// New endpoint for evaluating open-ended answers
router.post("/evaluate-answer", async (req, res) => {
  const { questionText, modelAnswer, userAnswer } = req.body;
  startReqTimer(req, res);

  if (!questionText || !modelAnswer || userAnswer === undefined) {
    phCapture("anonymous", "llm_eval:error", {
      ...baseProps(req),
      reason: "missing_params",
    });
    return res.status(400).json({
      error: "Missing required parameters: questionText, modelAnswer, or userAnswer",
    });
  }

  const props = { ...baseProps(req) };
  phCapture("anonymous", "llm_eval:request", props);

  try {
    const evaluation = await evaluateOpenEndedAnswer(
      questionText,
      modelAnswer,
      userAnswer
    );

    phCapture("anonymous", "llm_eval:success", {
      ...props,
      duration_ms: durationMsFrom(req.t0),
      // optional: include rubric score if your evaluator returns one
      score: typeof evaluation?.score === "number" ? evaluation.score : undefined,
    });

    res.status(200).json({ evaluation });
  } catch (error) {
    phCapture("anonymous", "llm_eval:error", {
      ...props,
      duration_ms: durationMsFrom(req.t0),
      error_class: error?.name || "Error",
      error_message: String(error?.message || "").slice(0, 300),
    });
    console.error("Error evaluating answer:", error);
    res.status(500).json({
      error: "Failed to evaluate the answer",
      details: error.message,
    });
  }
});

export default router;
