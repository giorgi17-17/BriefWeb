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
import { PostHog } from 'posthog-node';

const router = express.Router();

// Initialize PostHog
const posthog = new PostHog(
  process.env.POSTHOG_API_KEY, // Your PostHog API key
  { 
    host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
    flushAt: 20, // Flush events after 20 events
    flushInterval: 10000, // Flush events every 10 seconds
  }
);

// Helper function to track LLM usage
const trackLLMUsage = (userId, event, data = {}) => {
  posthog.capture({
    distinctId: userId,
    event: event,
    properties: {
      ...data,
      timestamp: new Date().toISOString(),
      service: 'document-processing',
    }
  });
};

// Helper function to estimate token usage (rough estimation)
const estimateTokens = (text) => {
  if (!text) return 0;
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
};

// Mount user plan routes
router.use("/user-plans", userPlanRoutes);

router.post("/process-pdf", async (req, res) => {
  const { userId, lectureId, fileId } = req.body;
  const startTime = Date.now();

  console.log("process-pdf endpoint called with:", {
    userId,
    lectureId,
    fileId,
  });

  // Track API call start
  trackLLMUsage(userId, 'pdf_processing_started', {
    lectureId,
    fileId,
    endpoint: '/process-pdf'
  });

  if (!userId || !lectureId || !fileId) {
    console.log("Missing required parameters");
    trackLLMUsage(userId, 'pdf_processing_error', {
      error: 'missing_parameters',
      lectureId,
      fileId
    });
    return res.status(400).json({
      error: "Missing required parameters: userId, lectureId, or fileId",
    });
  }

  try {
    console.log("Calling processDocument...");
    const flashcards = await processDocument(userId, lectureId, fileId);
    const processingTime = Date.now() - startTime;
    
    console.log("processDocument returned:", {
      isArray: Array.isArray(flashcards),
      length: Array.isArray(flashcards) ? flashcards.length : "not an array",
    });

    // Estimate tokens used
    const totalTokens = flashcards.reduce((total, card) => {
      return total + estimateTokens(card.question) + estimateTokens(card.answer);
    }, 0);

    // Return meaningful error response if flashcards weren't generated properly
    if (!flashcards || !Array.isArray(flashcards) || flashcards.length === 0) {
      console.warn("No valid flashcards generated for document");
      
      trackLLMUsage(userId, 'pdf_processing_failed', {
        lectureId,
        fileId,
        error: 'no_flashcards_generated',
        processingTime
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

    // Track successful processing
    trackLLMUsage(userId, 'pdf_processing_completed', {
      lectureId,
      fileId,
      flashcardCount: flashcards.length,
      estimatedTokens: totalTokens,
      processingTime,
      success: true
    });

    // Track tokens usage separately for better analytics
    trackLLMUsage(userId, 'token_usage', {
      operation: 'pdf_to_flashcards',
      tokens: totalTokens,
      lectureId,
      fileId
    });

    console.log(`Sending response with ${flashcards.length} flashcards`);
    res.status(200).json({ flashcards });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("Error processing document:", error);
    
    // Track error
    trackLLMUsage(userId, 'pdf_processing_error', {
      lectureId,
      fileId,
      error: error.message,
      processingTime,
      errorType: error.constructor.name
    });

    // Send a fallback response with a generic flashcard
    console.log("Sending error response with fallback flashcard");
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
  const startTime = Date.now();

  // Track API call start
  trackLLMUsage(userId, 'brief_processing_started', {
    lectureId,
    fileId,
    endpoint: '/process-brief'
  });

  if (!userId || !lectureId || !fileId) {
    trackLLMUsage(userId, 'brief_processing_error', {
      error: 'missing_parameters',
      lectureId,
      fileId
    });
    return res.status(400).json({
      error: "Missing required parameters: userId, lectureId, or fileId",
    });
  }

  try {
    const brief = await processBrief(userId, lectureId, fileId);
    const processingTime = Date.now() - startTime;

    // Estimate tokens used
    const estimatedTokens = estimateTokens(brief?.summary || '') + 
                           (brief?.key_concepts || []).reduce((total, concept) => total + estimateTokens(concept), 0) +
                           (brief?.important_details || []).reduce((total, detail) => total + estimateTokens(detail), 0);

    // Return meaningful error response if brief is invalid
    if (!brief || typeof brief !== "object" || !brief.summary) {
      console.warn("No valid brief generated for document");
      
      trackLLMUsage(userId, 'brief_processing_failed', {
        lectureId,
        fileId,
        error: 'no_brief_generated',
        processingTime
      });

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

    // Track successful processing
    trackLLMUsage(userId, 'brief_processing_completed', {
      lectureId,
      fileId,
      estimatedTokens,
      processingTime,
      keyConceptsCount: brief.key_concepts?.length || 0,
      importantDetailsCount: brief.important_details?.length || 0,
      success: true
    });

    // Track tokens usage
    trackLLMUsage(userId, 'token_usage', {
      operation: 'document_to_brief',
      tokens: estimatedTokens,
      lectureId,
      fileId
    });

    res.status(200).json({ brief });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("Error processing brief:", error);
    
    trackLLMUsage(userId, 'brief_processing_error', {
      lectureId,
      fileId,
      error: error.message,
      processingTime,
      errorType: error.constructor.name
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
  const startTime = Date.now();

  trackLLMUsage(userId, 'content_extraction_started', {
    lectureId,
    fileId,
    endpoint: '/test-document-content'
  });

  if (!userId || !lectureId || !fileId) {
    trackLLMUsage(userId, 'content_extraction_error', {
      error: 'missing_parameters',
      lectureId,
      fileId
    });
    return res.status(400).json({
      error: "Missing required parameters: userId, lectureId, or fileId",
    });
  }

  try {
    const pages = await testContentExtraction(userId, lectureId, fileId);
    const processingTime = Date.now() - startTime;

    // Check if pages were extracted successfully
    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      trackLLMUsage(userId, 'content_extraction_failed', {
        lectureId,
        fileId,
        error: 'no_content_extracted',
        processingTime
      });

      return res.status(422).json({
        error: "No content could be extracted from the document",
        pages: [
          "No readable content found in the document. Please check the file format and try again.",
        ],
      });
    }

    // Estimate total content size
    const totalContentLength = pages.reduce((total, page) => total + (page?.length || 0), 0);
    
    trackLLMUsage(userId, 'content_extraction_completed', {
      lectureId,
      fileId,
      pageCount: pages.length,
      totalContentLength,
      processingTime,
      success: true
    });

    res.status(200).json({ pages });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("Error in test endpoint:", error);
    
    trackLLMUsage(userId, 'content_extraction_error', {
      lectureId,
      fileId,
      error: error.message,
      processingTime,
      errorType: error.constructor.name
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
  const startTime = Date.now();

  trackLLMUsage(userId, 'detailed_brief_started', {
    lectureId,
    fileId,
    endpoint: '/detailed-brief'
  });

  if (!userId || !lectureId || !fileId) {
    trackLLMUsage(userId, 'detailed_brief_error', {
      error: 'missing_parameters',
      lectureId,
      fileId
    });
    return res.status(400).json({
      error: "Missing required parameters",
    });
  }

  try {
    const result = await processDetailedContent(userId, lectureId, fileId);
    const processingTime = Date.now() - startTime;

    // Check if result is valid
    if (
      !result ||
      !result.summaries ||
      !Array.isArray(result.summaries) ||
      result.summaries.length === 0
    ) {
      console.warn("Invalid detailed brief result:", result);
      
      trackLLMUsage(userId, 'detailed_brief_failed', {
        lectureId,
        fileId,
        error: 'invalid_result',
        processingTime
      });

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

    // Estimate tokens used
    const estimatedTokens = result.summaries.reduce((total, summary) => total + estimateTokens(summary), 0) +
                           (result.metadata?.key_concepts || []).reduce((total, concept) => total + estimateTokens(concept), 0) +
                           (result.metadata?.important_details || []).reduce((total, detail) => total + estimateTokens(detail), 0);

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

    // Track successful processing
    trackLLMUsage(userId, 'detailed_brief_completed', {
      lectureId,
      fileId,
      totalPages: result.total_pages,
      estimatedTokens,
      processingTime,
      keyConceptsCount: brief.key_concepts?.length || 0,
      importantDetailsCount: brief.important_details?.length || 0,
      mainThemesCount: brief.overview.mainThemes?.length || 0,
      success: true
    });

    // Track tokens usage
    trackLLMUsage(userId, 'token_usage', {
      operation: 'detailed_brief',
      tokens: estimatedTokens,
      lectureId,
      fileId
    });

    res.json({ success: true, brief });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("Error generating detailed brief:", error);

    trackLLMUsage(userId, 'detailed_brief_error', {
      lectureId,
      fileId,
      error: error.message,
      processingTime,
      errorType: error.constructor.name
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
  const startTime = Date.now();
  
  try {
    const { userId, lectureId, fileId, quizOptions } = req.body;

    trackLLMUsage(userId, 'quiz_processing_started', {
      lectureId,
      fileId,
      quizOptions,
      endpoint: '/process-quiz'
    });

    // Validate required parameters
    if (!userId || !lectureId || !fileId) {
      trackLLMUsage(userId, 'quiz_processing_error', {
        error: 'missing_parameters',
        lectureId,
        fileId
      });
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
    const processingTime = Date.now() - startTime;

    // Check if result is valid
    if (
      !result ||
      !result.questions ||
      !Array.isArray(result.questions) ||
      result.questions.length === 0
    ) {
      console.warn("No valid quiz generated for document");
      
      trackLLMUsage(userId, 'quiz_processing_failed', {
        lectureId,
        fileId,
        quizOptions,
        error: 'no_questions_generated',
        processingTime
      });

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

    // Estimate tokens used
    const estimatedTokens = result.questions.reduce((total, question) => {
      let questionTokens = estimateTokens(question.text);
      if (question.options) {
        questionTokens += question.options.reduce((optTotal, opt) => optTotal + estimateTokens(opt.text), 0);
      }
      if (question.answer) {
        questionTokens += estimateTokens(question.answer);
      }
      return total + questionTokens;
    }, 0);

    // Track successful processing
    trackLLMUsage(userId, 'quiz_processing_completed', {
      lectureId,
      fileId,
      questionCount: result.questions.length,
      quizOptions,
      estimatedTokens,
      processingTime,
      questionTypes: result.questions.map(q => q.type),
      success: true
    });

    // Track tokens usage
    trackLLMUsage(userId, 'token_usage', {
      operation: 'document_to_quiz',
      tokens: estimatedTokens,
      lectureId,
      fileId
    });

    res.status(200).json({
      success: true,
      questions: result.questions,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("Error processing quiz:", error);
    
    trackLLMUsage(userId, 'quiz_processing_error', {
      lectureId: req.body.lectureId,
      fileId: req.body.fileId,
      error: error.message,
      processingTime,
      errorType: error.constructor.name
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
  const { questionText, modelAnswer, userAnswer, userId } = req.body;
  const startTime = Date.now();

  trackLLMUsage(userId, 'answer_evaluation_started', {
    questionLength: questionText?.length || 0,
    modelAnswerLength: modelAnswer?.length || 0,
    userAnswerLength: userAnswer?.length || 0,
    endpoint: '/evaluate-answer'
  });

  if (!questionText || !modelAnswer || userAnswer === undefined) {
    trackLLMUsage(userId, 'answer_evaluation_error', {
      error: 'missing_parameters'
    });
    return res.status(400).json({
      error:
        "Missing required parameters: questionText, modelAnswer, or userAnswer",
    });
  }

  try {
    const evaluation = await evaluateOpenEndedAnswer(
      questionText,
      modelAnswer,
      userAnswer
    );
    const processingTime = Date.now() - startTime;

    // Estimate tokens used
    const estimatedTokens = estimateTokens(questionText) + 
                           estimateTokens(modelAnswer) + 
                           estimateTokens(userAnswer) +
                           estimateTokens(evaluation?.feedback || '') +
                           50; // Rough estimate for evaluation prompt overhead

    // Track successful evaluation
    trackLLMUsage(userId, 'answer_evaluation_completed', {
      score: evaluation?.score,
      estimatedTokens,
      processingTime,
      hasUserAnswer: !!userAnswer,
      userAnswerLength: userAnswer?.length || 0,
      success: true
    });

    // Track tokens usage
    trackLLMUsage(userId, 'token_usage', {
      operation: 'answer_evaluation',
      tokens: estimatedTokens
    });

    res.status(200).json({ evaluation });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("Error evaluating answer:", error);
    
    trackLLMUsage(userId, 'answer_evaluation_error', {
      error: error.message,
      processingTime,
      errorType: error.constructor.name
    });

    res.status(500).json({
      error: "Failed to evaluate the answer",
      details: error.message,
    });
  }
});

// Graceful shutdown - ensure all events are flushed
process.on('SIGTERM', async () => {
  await posthog.flush();
  await posthog.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await posthog.flush();
  await posthog.shutdown();
  process.exit(0);
});

export default router;