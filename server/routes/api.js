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
import { posthog } from "../config/gemini.js";


const router = express.Router();

// Helper function to track LLM analytics with PostHog's LLM tracking
const trackLLMAnalytics = (userId, operation, data = {}) => {
  const {
    model = 'gemini-pro',
    prompt_tokens = 0,
    completion_tokens = 0,
    total_tokens = 0,
    cost = 0,
    response_time_ms = 0,
    success = true,
    error_message = null,
    prompt = null,
    response = null,
    temperature = null,
    max_tokens = null,
    ...additionalProperties
  } = data;

  // Track LLM usage with PostHog's built-in LLM analytics
  posthog.capture({
    distinctId: userId,
    event: '$ai_generation',
    properties: {
      // Standard PostHog LLM properties
      $ai_model: model,
      $ai_prompt_tokens: prompt_tokens,
      $ai_completion_tokens: completion_tokens,
      $ai_total_tokens: total_tokens,
      $ai_cost: cost,
      $ai_response_time_ms: response_time_ms,
      $ai_success: success,
      $ai_error: error_message,
      $ai_prompt: prompt, // Be careful with PII
      $ai_response: response, // Be careful with PII
      $ai_temperature: temperature,
      $ai_max_tokens: max_tokens,
      
      // Custom properties
      operation,
      timestamp: new Date().toISOString(),
      service: 'document-processing',
      ...additionalProperties
    }
  });
};

// Helper function to estimate Gemini token usage (rough estimation)
const estimateGeminiTokens = (text) => {
  if (!text) return 0;
  // Gemini token estimation: roughly 1 token per 4 characters for English
  return Math.ceil(text.length / 4);
};

// Helper function to calculate Gemini API cost (approximate)
const calculateGeminiCost = (inputTokens, outputTokens) => {
  // Gemini Pro pricing (as of 2024) - update with current rates
  const INPUT_COST_PER_1K_TOKENS = 0.000125; // $0.000125 per 1K input tokens
  const OUTPUT_COST_PER_1K_TOKENS = 0.000375; // $0.000375 per 1K output tokens
  
  const inputCost = (inputTokens / 1000) * INPUT_COST_PER_1K_TOKENS;
  const outputCost = (outputTokens / 1000) * OUTPUT_COST_PER_1K_TOKENS;
  
  return inputCost + outputCost;
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

  if (!userId || !lectureId || !fileId) {
    console.log("Missing required parameters");
    return res.status(400).json({
      error: "Missing required parameters: userId, lectureId, or fileId",
    });
  }

  try {
    console.log("Calling processDocument...");
    const flashcards = await processDocument(userId, lectureId, fileId);
    const responseTime = Date.now() - startTime;
    
    console.log("processDocument returned:", {
      isArray: Array.isArray(flashcards),
      length: Array.isArray(flashcards) ? flashcards.length : "not an array",
    });

    // Return meaningful error response if flashcards weren't generated properly
    if (!flashcards || !Array.isArray(flashcards) || flashcards.length === 0) {
      console.warn("No valid flashcards generated for document");
      
      // Track failed LLM operation
      trackLLMAnalytics(userId, 'pdf_to_flashcards', {
        success: false,
        error_message: 'No flashcards generated',
        response_time_ms: responseTime,
        lectureId,
        fileId,
        operation_type: 'document_processing'
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

    // Estimate token usage and cost
    const inputText = `Generate flashcards from document: ${fileId}`; // Simplified for estimation
    const outputText = flashcards.map(card => `${card.question} ${card.answer}`).join(' ');
    
    const promptTokens = estimateGeminiTokens(inputText);
    const completionTokens = estimateGeminiTokens(outputText);
    const totalTokens = promptTokens + completionTokens;
    const cost = calculateGeminiCost(promptTokens, completionTokens);

    // Track successful LLM operation
    trackLLMAnalytics(userId, 'pdf_to_flashcards', {
      model: 'gemini-pro',
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      cost: cost,
      response_time_ms: responseTime,
      success: true,
      lectureId,
      fileId,
      flashcard_count: flashcards.length,
      operation_type: 'document_processing'
    });

    console.log(`Sending response with ${flashcards.length} flashcards`);
    res.status(200).json({ flashcards });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error("Error processing document:", error);
    
    // Track error in LLM operation
    trackLLMAnalytics(userId, 'pdf_to_flashcards', {
      success: false,
      error_message: error.message,
      response_time_ms: responseTime,
      lectureId,
      fileId,
      operation_type: 'document_processing'
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

  if (!userId || !lectureId || !fileId) {
    return res.status(400).json({
      error: "Missing required parameters: userId, lectureId, or fileId",
    });
  }

  try {
    const brief = await processBrief(userId, lectureId, fileId);
    const responseTime = Date.now() - startTime;

    // Return meaningful error response if brief is invalid
    if (!brief || typeof brief !== "object" || !brief.summary) {
      console.warn("No valid brief generated for document");
      
      trackLLMAnalytics(userId, 'document_to_brief', {
        success: false,
        error_message: 'No brief generated',
        response_time_ms: responseTime,
        lectureId,
        fileId,
        operation_type: 'brief_generation'
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

    // Estimate token usage and cost
    const inputText = `Generate brief summary for document: ${fileId}`;
    const outputText = `${brief.summary} ${(brief.key_concepts || []).join(' ')} ${(brief.important_details || []).join(' ')}`;
    
    const promptTokens = estimateGeminiTokens(inputText);
    const completionTokens = estimateGeminiTokens(outputText);
    const totalTokens = promptTokens + completionTokens;
    const cost = calculateGeminiCost(promptTokens, completionTokens);

    // Track successful LLM operation
    trackLLMAnalytics(userId, 'document_to_brief', {
      model: 'gemini-pro',
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      cost: cost,
      response_time_ms: responseTime,
      success: true,
      lectureId,
      fileId,
      key_concepts_count: brief.key_concepts?.length || 0,
      important_details_count: brief.important_details?.length || 0,
      operation_type: 'brief_generation'
    });

    res.status(200).json({ brief });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error("Error processing brief:", error);
    
    trackLLMAnalytics(userId, 'document_to_brief', {
      success: false,
      error_message: error.message,
      response_time_ms: responseTime,
      lectureId,
      fileId,
      operation_type: 'brief_generation'
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

  if (!userId || !lectureId || !fileId) {
    return res.status(400).json({
      error: "Missing required parameters: userId, lectureId, or fileId",
    });
  }

  try {
    const pages = await testContentExtraction(userId, lectureId, fileId);
    const responseTime = Date.now() - startTime;

    // Check if pages were extracted successfully
    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      trackLLMAnalytics(userId, 'content_extraction', {
        success: false,
        error_message: 'No content extracted',
        response_time_ms: responseTime,
        lectureId,
        fileId,
        operation_type: 'content_extraction'
      });

      return res.status(422).json({
        error: "No content could be extracted from the document",
        pages: [
          "No readable content found in the document. Please check the file format and try again.",
        ],
      });
    }

    // This operation might not use LLM directly, but track for completeness
    const totalContentLength = pages.reduce((total, page) => total + (page?.length || 0), 0);
    
    trackLLMAnalytics(userId, 'content_extraction', {
      success: true,
      response_time_ms: responseTime,
      lectureId,
      fileId,
      page_count: pages.length,
      total_content_length: totalContentLength,
      operation_type: 'content_extraction'
    });

    res.status(200).json({ pages });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error("Error in test endpoint:", error);
    
    trackLLMAnalytics(userId, 'content_extraction', {
      success: false,
      error_message: error.message,
      response_time_ms: responseTime,
      lectureId,
      fileId,
      operation_type: 'content_extraction'
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

  if (!userId || !lectureId || !fileId) {
    return res.status(400).json({
      error: "Missing required parameters",
    });
  }

  try {
    const result = await processDetailedContent(userId, lectureId, fileId);
    const responseTime = Date.now() - startTime;

    // Check if result is valid
    if (
      !result ||
      !result.summaries ||
      !Array.isArray(result.summaries) ||
      result.summaries.length === 0
    ) {
      console.warn("Invalid detailed brief result:", result);
      
      trackLLMAnalytics(userId, 'detailed_brief', {
        success: false,
        error_message: 'Invalid detailed brief result',
        response_time_ms: responseTime,
        lectureId,
        fileId,
        operation_type: 'detailed_brief'
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

    // Estimate token usage and cost
    const inputText = `Generate detailed brief for document: ${fileId}`;
    const outputText = result.summaries.join(' ') + 
                      (result.metadata?.key_concepts || []).join(' ') + 
                      (result.metadata?.important_details || []).join(' ');
    
    const promptTokens = estimateGeminiTokens(inputText);
    const completionTokens = estimateGeminiTokens(outputText);
    const totalTokens = promptTokens + completionTokens;
    const cost = calculateGeminiCost(promptTokens, completionTokens);

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

    // Track successful LLM operation
    trackLLMAnalytics(userId, 'detailed_brief', {
      model: 'gemini-pro',
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      cost: cost,
      response_time_ms: responseTime,
      success: true,
      lectureId,
      fileId,
      total_pages: result.total_pages,
      key_concepts_count: brief.key_concepts?.length || 0,
      important_details_count: brief.important_details?.length || 0,
      operation_type: 'detailed_brief'
    });

    res.json({ success: true, brief });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error("Error generating detailed brief:", error);

    trackLLMAnalytics(userId, 'detailed_brief', {
      success: false,
      error_message: error.message,
      response_time_ms: responseTime,
      lectureId,
      fileId,
      operation_type: 'detailed_brief'
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
    const responseTime = Date.now() - startTime;

    // Check if result is valid
    if (
      !result ||
      !result.questions ||
      !Array.isArray(result.questions) ||
      result.questions.length === 0
    ) {
      console.warn("No valid quiz generated for document");
      
      trackLLMAnalytics(userId, 'document_to_quiz', {
        success: false,
        error_message: 'No quiz questions generated',
        response_time_ms: responseTime,
        lectureId,
        fileId,
        quiz_options: quizOptions,
        operation_type: 'quiz_generation'
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

    // Estimate token usage and cost
    const inputText = `Generate quiz questions for document: ${fileId} with options: ${JSON.stringify(quizOptions)}`;
    const outputText = result.questions.map(q => {
      let text = q.text;
      if (q.options) {
        text += ' ' + q.options.map(opt => opt.text).join(' ');
      }
      if (q.answer) {
        text += ' ' + q.answer;
      }
      return text;
    }).join(' ');
    
    const promptTokens = estimateGeminiTokens(inputText);
    const completionTokens = estimateGeminiTokens(outputText);
    const totalTokens = promptTokens + completionTokens;
    const cost = calculateGeminiCost(promptTokens, completionTokens);

    // Track successful LLM operation
    trackLLMAnalytics(userId, 'document_to_quiz', {
      model: 'gemini-pro',
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      cost: cost,
      response_time_ms: responseTime,
      success: true,
      lectureId,
      fileId,
      question_count: result.questions.length,
      quiz_options: quizOptions,
      question_types: result.questions.map(q => q.type),
      operation_type: 'quiz_generation'
    });

    res.status(200).json({
      success: true,
      questions: result.questions,
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error("Error processing quiz:", error);
    
    trackLLMAnalytics(userId, 'document_to_quiz', {
      success: false,
      error_message: error.message,
      response_time_ms: responseTime,
      lectureId: req.body.lectureId,
      fileId: req.body.fileId,
      quiz_options: req.body.quizOptions,
      operation_type: 'quiz_generation'
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

  if (!questionText || !modelAnswer || userAnswer === undefined) {
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
    const responseTime = Date.now() - startTime;

    // Estimate token usage and cost
    const inputText = `Question: ${questionText} Model Answer: ${modelAnswer} User Answer: ${userAnswer}`;
    const outputText = evaluation?.feedback || '';
    
    const promptTokens = estimateGeminiTokens(inputText);
    const completionTokens = estimateGeminiTokens(outputText);
    const totalTokens = promptTokens + completionTokens;
    const cost = calculateGeminiCost(promptTokens, completionTokens);

    // Track successful LLM operation
    trackLLMAnalytics(userId, 'answer_evaluation', {
      model: 'gemini-pro',
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      cost: cost,
      response_time_ms: responseTime,
      success: true,
      evaluation_score: evaluation?.score,
      has_user_answer: !!userAnswer,
      user_answer_length: userAnswer?.length || 0,
      operation_type: 'answer_evaluation'
    });

    res.status(200).json({ evaluation });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error("Error evaluating answer:", error);
    
    trackLLMAnalytics(userId, 'answer_evaluation', {
      success: false,
      error_message: error.message,
      response_time_ms: responseTime,
      operation_type: 'answer_evaluation'
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