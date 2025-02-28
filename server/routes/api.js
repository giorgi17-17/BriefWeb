// routes/api.js
import express from "express";
import { processDocument, processBrief, testPDFPageExtraction, processPDF } from "../controllers/pdfController.js";

const router = express.Router();

router.post("/process-pdf", async (req, res) => {
  const { userId, lectureId, fileId } = req.body;
  
  if (!userId || !lectureId || !fileId) {
    return res.status(400).json({
      error: "Missing required parameters: userId, lectureId, or fileId",
    });
  }

  try {
    const flashcards = await processDocument(userId, lectureId, fileId);
    res.status(200).json({ flashcards });
  } catch (error) {
    console.error("Error processing PDF:", error);
    res.status(500).json({
      error: "Failed to process the document",
      details: error.message,
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
    res.status(200).json({ brief });
  } catch (error) {
    console.error("Error processing brief:", error);
    res.status(500).json({
      error: "Failed to process the document",
      details: error.message,
    });
  }
});

router.post("/test-pdf-pages", async (req, res) => {
  const { userId, lectureId, fileId } = req.body;

  if (!userId || !lectureId || !fileId) {
    return res.status(400).json({
      error: "Missing required parameters: userId, lectureId, or fileId",
    });
  }

  try {
    const pages = await testPDFPageExtraction(userId, lectureId, fileId);
    res.status(200).json({ pages });
  } catch (error) {
    console.error("Error in test endpoint:", error);
    res.status(500).json({
      error: "Failed to process the document",
      details: error.message,
    });
  }
});

export default router;









router.post('/detailed-brief', async (req, res) => {
  const { userId, lectureId, fileId } = req.body;

  if (!userId || !lectureId || !fileId) {
    return res.status(400).json({
      error: 'Missing required parameters'
    });
  }

  try {
    const result = await processPDF(userId, lectureId, fileId);
    // Transform the response to match frontend expectations
    const brief = {
      totalPages: result.total_pages,
      pageSummaries: result.summaries,
      overview: {
        documentTitle: result.metadata?.documentTitle || fileId,
        mainThemes: result.metadata?.mainThemes || [],
        fileName: fileId
      },
      key_concepts: result.metadata?.key_concepts || [],
      important_details: result.metadata?.important_details || []
    };
    res.json({ success: true, brief });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
