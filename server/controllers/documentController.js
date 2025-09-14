import {
  generateMultiPageBrief,
  generateFlashcards,
  generateQuiz,
} from "../services/ai/aiService.js";

import {
  extractTextFromFile,
  extractContentByPagesOrSlides,
} from "../services/fileService.js";
import { supabaseClient } from "../config/supabaseClient.js";

import { debugLog, debugWarn, debugError, debugAI } from "../utils/debugLogger.js";

/**
 * Process a document to generate flashcards
 * @param {string} userId - User ID
 * @param {string} lectureId - Lecture ID
 * @param {string} fileId - File ID/name
 * @returns {Promise<object>} - Generated flashcards
 */
export async function processDocument(userId, lectureId, fileId) {
  const debugStep = (step, message, data = null) => {
    debugLog(`[FLASHCARDS-${step}] ${message}`, data ? { ...data } : undefined);
  };

  try {
    debugStep(1, "=== STARTING FLASHCARD GENERATION ===");
    
    debugStep(1.1, "Parameter validation", { 
      userId: userId || 'missing',
      lectureId: lectureId || 'missing',
      fileId: fileId || 'missing',
      allParamsPresent: !!(userId && lectureId && fileId)
    });

    // Validate input parameters
    if (!userId || !lectureId || !fileId) {
      debugStep(1.2, "❌ VALIDATION FAILED: Missing required parameters");
      throw new Error("Missing required parameters: userId, lectureId, or fileId");
    }

    debugStep(2, "=== TEXT EXTRACTION PHASE ===");
    debugStep(2.1, "Initiating text extraction", { userId, lectureId, fileId });

    const extractedText = await extractTextFromFile(userId, lectureId, fileId);
    
    debugStep(2.2, "Text extraction completed", {
      success: !!extractedText,
      textLength: extractedText?.length || 0,
      textPreview: extractedText?.substring(0, 200) + '...' || 'N/A',
      isEmpty: !extractedText || extractedText.trim().length === 0
    });

    if (!extractedText) {
      debugStep(2.3, "❌ TEXT EXTRACTION FAILED");
      throw new Error("Failed to extract text from document.");
    }

    debugStep(3, "=== FLASHCARD GENERATION PHASE ===");
    debugStep(3.1, "Calling AI service for flashcard generation", {
      inputTextLength: extractedText.length,
      estimatedProcessingTime: extractedText.length > 10000 ? "2-5 minutes" : "30-90 seconds"
    });

    const flashcards = await generateFlashcards(extractedText);

    debugStep(3.2, "AI service response received", {
      responseType: typeof flashcards,
      isArray: Array.isArray(flashcards),
      length: Array.isArray(flashcards) ? flashcards.length : 'N/A',
      hasContent: !!flashcards
    });

    if (flashcards && Array.isArray(flashcards) && flashcards.length > 0) {
      debugStep(3.3, "Flashcard validation successful", {
        totalCards: flashcards.length,
        firstCardPreview: {
          hasQuestion: !!flashcards[0].question,
          hasAnswer: !!flashcards[0].answer,
          questionPreview: flashcards[0].question?.substring(0, 50) + '...' || 'N/A',
          answerPreview: flashcards[0].answer?.substring(0, 50) + '...' || 'N/A'
        },
        allCardsValid: flashcards.every(card => card.question && card.answer)
      });
    } else {
      debugStep(3.4, "⚠️ WARNING: Invalid or empty flashcard response", {
        flashcards: flashcards,
        willProceedAnyway: true
      });
    }

    debugStep(4, "✅ FLASHCARD GENERATION SUCCESSFUL", {
      finalCardCount: Array.isArray(flashcards) ? flashcards.length : 0
    });

    return flashcards;
  } catch (error) {
    debugStep("ERROR", "❌ FLASHCARD GENERATION FAILED", {
      errorType: error.constructor.name,
      errorMessage: error.message,
      errorStack: error.stack?.split('\n').slice(0, 3).join('\n'),
      timestamp: new Date().toISOString(),
      parameters: { userId, lectureId, fileId }
    });
    
    console.error("Error processing document:", error);
    throw error;
  }
}

/**
 * Process a document to generate a brief summary
 * @param {string} userId - User ID
 * @param {string} lectureId - Lecture ID
 * @param {string} fileId - File ID/name
 * @returns {Promise<object>} - Generated brief
 */
export async function processBrief(userId, lectureId, fileId) {
  const debugStep = (step, message, data = null) => {
    debugLog(`[BRIEF-${step}] ${message}`, data ? { ...data } : undefined);
  };

  try {
    debugStep(1, "=== STARTING BRIEF GENERATION ===");
    
    debugStep(1.1, "Parameter validation", { 
      userId: userId || 'missing',
      lectureId: lectureId || 'missing',
      fileId: fileId || 'missing',
      allParamsPresent: !!(userId && lectureId && fileId)
    });

    // Validate input parameters
    if (!userId || !lectureId || !fileId) {
      debugStep(1.2, "❌ VALIDATION FAILED: Missing required parameters");
      throw new Error("Missing required parameters: userId, lectureId, or fileId");
    }

    debugStep(2, "=== TEXT EXTRACTION PHASE ===");
    debugStep(2.1, "Initiating text extraction", { userId, lectureId, fileId });

    const extractedText = await extractTextFromFile(userId, lectureId, fileId);
    
    debugStep(2.2, "Text extraction completed", {
      success: !!extractedText,
      textLength: extractedText?.length || 0,
      textPreview: extractedText?.substring(0, 200) + '...' || 'N/A'
    });

    if (!extractedText) {
      debugStep(2.3, "❌ TEXT EXTRACTION FAILED");
      throw new Error("Failed to extract text from document.");
    }

    debugStep(3, "=== BRIEF GENERATION PHASE ===");
    debugStep(3.1, "Converting text to array format for multi-page processor");
    
    // Use generateMultiPageBrief for single page processing
    const result = await generateMultiPageBrief([extractedText]);

    debugStep(3.2, "Multi-page brief generation completed", {
      resultType: typeof result,
      hasPageSummaries: !!result?.pageSummaries,
      pageSummariesLength: result?.pageSummaries?.length || 0,
      hasFirstSummary: !!(result?.pageSummaries?.[0]?.summary)
    });

    debugStep(3.3, "Formatting result for legacy API compatibility");

    // Return the first (and only) summary in the expected format
    if (result && result.pageSummaries && result.pageSummaries.length > 0 && result.pageSummaries[0].summary) {
      const formattedResult = {
        summary: result.pageSummaries[0].summary,
        key_concepts: [],
        important_details: [],
      };
      
      debugStep(4, "✅ BRIEF GENERATION SUCCESSFUL", {
        summaryLength: formattedResult.summary.length,
        summaryPreview: formattedResult.summary.substring(0, 150) + '...'
      });

      return formattedResult;
    } else {
      debugStep(3.4, "❌ INVALID RESULT STRUCTURE", {
        hasResult: !!result,
        hasPageSummaries: !!result?.pageSummaries,
        pageSummariesType: typeof result?.pageSummaries,
        pageSummariesLength: result?.pageSummaries?.length
      });
      throw new Error("Failed to generate brief summary");
    }
  } catch (error) {
    debugStep("ERROR", "❌ BRIEF GENERATION FAILED", {
      errorType: error.constructor.name,
      errorMessage: error.message,
      errorStack: error.stack?.split('\n').slice(0, 3).join('\n'),
      timestamp: new Date().toISOString(),
      parameters: { userId, lectureId, fileId }
    });
    
    console.error("Error processing brief:", error);
    throw error;
  }
}

/**
 * Test extracting content by pages/slides from a document
 * @param {string} userId - User ID
 * @param {string} lectureId - Lecture ID
 * @param {string} fileId - File ID/name
 * @returns {Promise<Array<string>>} - Array of extracted content
 */
export async function testContentExtraction(userId, lectureId, fileId) {
  const debugStep = (step, message, data = null) => {
    debugLog(`[TEST-EXTRACT-${step}] ${message}`, data ? { ...data } : undefined);
  };

  try {
    debugStep(1, "=== STARTING TEST CONTENT EXTRACTION ===");
    
    debugStep(1.1, "Parameter validation", { 
      userId: userId || 'missing',
      lectureId: lectureId || 'missing',
      fileId: fileId || 'missing'
    });

    // Validate input parameters
    if (!userId || !lectureId || !fileId) {
      debugStep(1.2, "❌ VALIDATION FAILED: Missing required parameters");
      throw new Error("Missing required parameters: userId, lectureId, or fileId");
    }

    debugStep(2, "=== EXTRACTION PHASE ===");
    debugStep(2.1, "Calling extractContentByPagesOrSlides");

    const result = await extractContentByPagesOrSlides(userId, lectureId, fileId);

    debugStep(2.2, "Extraction completed", {
      resultType: typeof result,
      isArray: Array.isArray(result),
      length: Array.isArray(result) ? result.length : 'N/A',
      firstPagePreview: Array.isArray(result) && result[0] ? 
        result[0].substring(0, 100) + '...' : 'N/A'
    });

    debugStep(3, "✅ TEST EXTRACTION SUCCESSFUL", {
      totalPages: Array.isArray(result) ? result.length : 0
    });

    return result;
  } catch (error) {
    debugStep("ERROR", "❌ TEST EXTRACTION FAILED", {
      errorType: error.constructor.name,
      errorMessage: error.message,
      errorStack: error.stack?.split('\n').slice(0, 3).join('\n'),
      timestamp: new Date().toISOString(),
      parameters: { userId, lectureId, fileId }
    });
    
    console.error("Error in test content extraction:", error);
    throw error;
  }
}

/**
 * Process a document to generate detailed content
 * @param {string} userId - User ID
 * @param {string} lectureId - Lecture ID
 * @param {string} fileId - File ID/name
 * @returns {Promise<object>} - Generated detailed content
 */
export async function processDetailedContent(userId, lectureId, fileId) {
  const debugStep = (step, message, data = null) => {
    debugLog(`[DETAILED-${step}] ${message}`, data ? { ...data } : undefined);
  };

  try {
    debugStep(1, "=== STARTING DETAILED CONTENT PROCESSING ===");
    
    debugStep(1.1, "Parameter validation", { 
      userId: userId || 'missing',
      lectureId: lectureId || 'missing',
      fileId: fileId || 'missing'
    });

    // Validate input parameters
    if (!userId || !lectureId || !fileId) {
      debugStep(1.2, "❌ VALIDATION FAILED: Missing required parameters");
      throw new Error("Missing required parameters: userId, lectureId, or fileId");
    }

    debugStep(2, "=== FILE DOWNLOAD PHASE ===");
    const filePath = `${userId}/${lectureId}/${fileId}`;
    debugStep(2.1, "Downloading file from Supabase Storage", { filePath });

    // Download file from Supabase Storage.
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from("lecture-files").download(filePath);
      
    debugStep(2.2, "File download completed", {
      success: !!fileData,
      hasError: !!downloadError,
      errorMessage: downloadError?.message,
      fileSize: fileData ? 'present' : 'missing'
    });

    if (downloadError) {
      debugStep(2.3, "❌ FILE DOWNLOAD FAILED", { error: downloadError.message });
      throw new Error(`Error downloading file: ${downloadError.message}`);
    }
    if (!fileData) {
      debugStep(2.4, "❌ NO FILE DATA RECEIVED");
      throw new Error("No file data received from Supabase");
    }

    debugStep(2.5, "Converting file to buffer");
    const buffer = Buffer.from(await fileData.arrayBuffer());
    debugStep(2.6, "Buffer conversion completed", { bufferSize: buffer.length });

    debugStep(3, "=== CONTENT EXTRACTION PHASE ===");
    let pages = [];
    let extractionMethod = "unknown";

    debugStep(3.1, "Attempting page-by-page extraction");
    try {
      pages = await extractContentByPagesOrSlides(userId, lectureId, fileId);
      extractionMethod = "page-by-page";
      debugStep(3.2, "Page-by-page extraction successful", {
        pagesExtracted: pages.length,
        method: extractionMethod,
        firstPagePreview: pages[0]?.substring(0, 100) + '...' || 'N/A'
      });
    } catch (err) {
      debugStep(3.3, "⚠️ Page-by-page extraction failed, trying alternatives", {
        error: err.message,
        willTryFallback: true
      });

      debugStep(3.4, "Attempting alternative extraction methods");
      try {
        const allText = await extractTextFromFile(userId, lectureId, fileId);
        debugStep(3.5, "Text extraction completed", {
          textLength: allText?.length || 0,
          hasContent: !!(allText && allText.trim())
        });

        if (allText && allText.trim()) {
          const textLength = allText.length;
          debugStep(3.6, "Analyzing document for intelligent splitting", { textLength });

          if (textLength > 5000) {
            debugStep(3.7, "Large document detected, attempting intelligent splitting");
            const sectionMarkers = [
              /\n\s*(?:Chapter|Section|Part|Unit)\s+\d+/gi,
              /\n\s*\d+\.\s+[A-Z][^.]*\n/g,
              /\n\s*[A-Z][A-Z\s]{10,}\n/g,
              /\n\s*\*{3,}.*\*{3,}\n/g,
              /\n\s*={3,}\n/g,
              /\n\s*-{3,}\n/g,
            ];

            let sections = [allText];
            let markerUsed = null;

            for (const [index, marker] of sectionMarkers.entries()) {
              const splits = allText.split(marker);
              if (splits.length > 1 && splits.length <= 20) {
                sections = splits.filter(section => section && section.trim().length > 100);
                if (sections.length > 0) {
                  markerUsed = `marker_${index}`;
                  debugStep(3.8, "Intelligent splitting successful", {
                    markerIndex: index,
                    sectionsFound: sections.length,
                    avgSectionLength: Math.round(sections.reduce((sum, s) => sum + s.length, 0) / sections.length)
                  });
                  break;
                }
              }
            }

            if (sections.length > 1) {
              pages = sections;
              extractionMethod = "intelligent-splitting";
            } else {
              debugStep(3.9, "Intelligent splitting failed, using size-based splitting");
              const avgPageSize = Math.max(1000, Math.floor(textLength / 10));
              pages = [];
              for (let i = 0; i < textLength; i += avgPageSize) {
                const pageText = allText.substring(i, i + avgPageSize);
                if (pageText && pageText.trim().length > 50) {
                  pages.push(pageText.trim());
                }
              }

              if (pages.length === 0) {
                pages = [allText];
              }
              extractionMethod = "size-based-splitting";
              debugStep(3.10, "Size-based splitting completed", {
                pagesCreated: pages.length,
                avgPageSize: avgPageSize
              });
            }
          } else {
            debugStep(3.11, "Small document detected, using as single page");
            pages = [allText];
            extractionMethod = "single-page-fallback";
          }
        } else {
          debugStep(3.12, "❌ NO CONTENT FOUND IN DOCUMENT");
          throw new Error("No content found in document");
        }
      } catch (textExtractionError) {
        debugStep(3.13, "❌ ALL EXTRACTION METHODS FAILED", {
          finalError: textExtractionError.message
        });
        throw new Error("Could not extract any content from document");
      }
    }

    debugStep(4, "=== CONTENT VALIDATION PHASE ===");
    debugStep(4.1, "Validating extracted pages", {
      totalPages: pages?.length || 0,
      extractionMethod: extractionMethod
    });

    if (!pages || pages.length === 0) {
      debugStep(4.2, "❌ NO PAGES FOUND");
      throw new Error("No content found in document");
    }

    const validPages = pages.filter((page) => {
      if (!page || typeof page !== "string") return false;
      return page.trim().length > 0;
    });

    debugStep(4.3, "Page validation completed", {
      originalPageCount: pages.length,
      validPageCount: validPages.length,
      filteredOut: pages.length - validPages.length
    });

    if (validPages.length === 0) {
      debugStep(4.4, "❌ NO VALID PAGES AFTER FILTERING");
      throw new Error("No valid content found in document after filtering");
    }

    debugStep(5, "=== AI PROCESSING PHASE ===");
    debugStep(5.1, "Initiating multi-page brief generation", {
      validPages: validPages.length,
      extractionMethod: extractionMethod,
      estimatedProcessingTime: validPages.length > 15 ? "2-5 minutes" : "30-90 seconds"
    });

    let filteredSummaries = [];
    let multiPageResult;

    try {
      multiPageResult = await generateMultiPageBrief(validPages);
      debugStep(5.2, "Multi-page brief generation successful", {
        hasResult: !!multiPageResult,
        hasPageSummaries: !!multiPageResult?.pageSummaries,
        summaryCount: multiPageResult?.pageSummaries?.length || 0
      });
    } catch (error) {
      debugStep(5.3, "⚠️ Multi-page generation failed, initiating fallback", {
        error: error.message,
        willUseFallback: true
      });

      debugStep(5.4, "Processing pages individually as fallback");
      const summaries = await Promise.all(
        validPages.map(async (pageText, index) => {
          const trimmedText = pageText.trim();
          if (trimmedText.length === 0) {
            return null;
          }

          try {
            const result = await generateMultiPageBrief([trimmedText]);
            if (result?.pageSummaries?.[0]?.summary) {
              return result.pageSummaries[0].summary;
            } else {
              throw new Error("Invalid result structure from generateMultiPageBrief");
            }
          } catch (briefError) {
            debugStep(5.5, `⚠️ Failed to process page ${index + 1}`, {
              pageIndex: index,
              error: briefError.message
            });
            return `Page ${index + 1}: Content could not be processed by AI. Raw content: ${trimmedText.substring(0, 200)}${trimmedText.length > 200 ? "..." : ""}`;
          }
        })
      );

      const fallbackSummaries = summaries.filter(Boolean);
      multiPageResult = {
        pageSummaries: fallbackSummaries.map((summary, index) => ({
          pageNumber: index + 1,
          summary: summary,
        })),
        error: "Used fallback processing due to multi-page generation failure",
      };
      
      debugStep(5.6, "Fallback processing completed", {
        fallbackSummariesCount: fallbackSummaries.length
      });
    }

    debugStep(6, "=== RESULT PROCESSING PHASE ===");
    debugStep(6.1, "Validating AI processing result", {
      hasMultiPageResult: !!multiPageResult,
      hasPageSummaries: !!multiPageResult?.pageSummaries
    });

    if (!multiPageResult || !multiPageResult.pageSummaries) {
      debugStep(6.2, "❌ INVALID MULTI-PAGE RESULT STRUCTURE");
      throw new Error("Invalid multi-page result structure");
    }

    debugStep(6.3, "Formatting summaries with titles");
    const summariesWithTitles = multiPageResult.pageSummaries.map((item, index) => ({
      summary: item.summary || "",
      title: item.title || `Page ${item.pageNumber || index + 1}`,
    }));

    const summaries = summariesWithTitles.map((item) => item.summary);
    filteredSummaries = summaries.filter(Boolean);

    debugStep(6.4, "Summary processing completed", {
      summariesWithTitles: summariesWithTitles.length,
      filteredSummaries: filteredSummaries.length,
      avgSummaryLength: filteredSummaries.length > 0 ? 
        Math.round(filteredSummaries.reduce((sum, s) => sum + s.length, 0) / filteredSummaries.length) : 0
    });

    if (filteredSummaries.length === 0) {
      debugStep(6.5, "⚠️ NO SUMMARIES GENERATED, creating fallback");
      filteredSummaries.push("This document could not be processed properly. Please try uploading a different format or contact support.");
    }

    debugStep(7, "=== DATABASE OPERATIONS PHASE ===");
    const brief = {
      lecture_id: lectureId,
      user_id: userId,
      total_pages: filteredSummaries.length,
      summaries: filteredSummaries,
      metadata: {
        generatedAt: new Date().toISOString(),
        documentTitle: fileId,
        extractionMethod: extractionMethod,
        originalPageCount: pages.length,
        processedPageCount: validPages.length,
        mainThemes: [],
        key_concepts: [],
        important_details: [],
        page_titles: summariesWithTitles.map((item) => item.title),
        summaries_with_titles: summariesWithTitles,
      },
    };

    debugStep(7.1, "Brief object constructed", {
      totalPages: brief.total_pages,
      summariesCount: brief.summaries.length,
      metadataKeys: Object.keys(brief.metadata),
      extractionMethod: brief.metadata.extractionMethod
    });

    debugStep(7.2, "Checking for existing brief in database");
    const { data: existingBrief, error: existingError } = await supabaseClient
      .from("briefs")
      .select("*")
      .eq("lecture_id", lectureId)
      .single();

    debugStep(7.3, "Database check completed", {
      existingBriefFound: !!existingBrief,
      hasError: !!existingError,
      errorCode: existingError?.code,
      willUpdate: !!existingBrief,
      willInsert: !existingBrief && (!existingError || existingError.code === "PGRST116")
    });

    if (existingError && existingError.code !== "PGRST116") {
      debugStep(7.4, "❌ DATABASE CHECK ERROR", { error: existingError.message });
      throw new Error(`Error checking for existing brief: ${existingError.message}`);
    }

    let result;
    if (existingBrief) {
      debugStep(7.5, "Updating existing brief record");
      const { data: updatedBrief, error: updateError } = await supabaseClient
        .from("briefs")
        .update(brief)
        .eq("lecture_id", lectureId)
        .select()
        .single();
        
      if (updateError) {
        debugStep(7.6, "❌ BRIEF UPDATE FAILED", { error: updateError.message });
        throw new Error(`Error updating brief: ${updateError.message}`);
      }
      result = updatedBrief;
      debugStep(7.7, "Brief update successful");
    } else {
      debugStep(7.5, "Inserting new brief record");
      const { data: insertedBrief, error: insertError } = await supabaseClient
        .from("briefs")
        .insert(brief)
        .select()
        .single();
        
      if (insertError) {
        debugStep(7.6, "❌ BRIEF INSERT FAILED", { error: insertError.message });
        throw new Error(`Error inserting brief: ${insertError.message}`);
      }
      result = insertedBrief;
      debugStep(7.7, "Brief insert successful");
    }

    debugStep(8, "✅ DETAILED CONTENT PROCESSING SUCCESSFUL", {
      finalSummaryCount: filteredSummaries.length,
      extractionMethod: extractionMethod,
      databaseOperation: existingBrief ? 'update' : 'insert',
      processingTimeEnd: new Date().toISOString()
    });

    return result;
  } catch (error) {
    debugStep("ERROR", "❌ DETAILED CONTENT PROCESSING FAILED", {
      errorType: error.constructor.name,
      errorMessage: error.message,
      errorStack: error.stack?.split('\n').slice(0, 5).join('\n'),
      timestamp: new Date().toISOString(),
      parameters: { userId, lectureId, fileId }
    });
    
    console.error("Error processing document:", error);
    throw error;
  }
}

/**
 * Process a document to generate a quiz
 * @param {string} userId - User ID
 * @param {string} lectureId - Lecture ID
 * @param {string} fileId - File ID/name
 * @param {object} quizOptions - Quiz generation options
 * @returns {Promise<object>} - Generated quiz
 */
export async function processQuiz(userId, lectureId, fileId, quizOptions = {}) {
  try {
    // Validate input parameters
    if (!userId || !lectureId || !fileId) {
      throw new Error(
        "Missing required parameters: userId, lectureId, or fileId"
      );
    }

    // Build the file path
    const filePath = `${userId}/${lectureId}/${fileId}`;
    console.log(`Processing quiz for file: ${filePath}`);

    // Extract text from document
    const documentText = await extractTextFromFile(userId, lectureId, fileId);
    if (!documentText || documentText.length === 0) {
      throw new Error("Could not extract text from document");
    }

    // Generate the quiz from extracted text
    const result = await generateQuiz(documentText, quizOptions);

    // Validate the result
    if (
      !result ||
      !result.success ||
      !Array.isArray(result.questions) ||
      result.questions.length === 0
    ) {
      console.warn("Invalid quiz result:", result);
      throw new Error("Could not generate a quiz from the document content");
    }

    // Create quiz set name based on question types
    const quizTypes = [];
    const hasMultipleChoice = result.questions.some(
      (q) => q.type === "multiple_choice"
    );
    const hasOpenEnded = result.questions.some((q) => q.type === "open_ended");
    const hasCaseStudy = result.questions.some((q) => q.type === "case_study");

    if (hasMultipleChoice) quizTypes.push("Multiple Choice");
    if (hasOpenEnded) quizTypes.push("Open Ended");
    if (hasCaseStudy) quizTypes.push("Case Study");

    const quizName =
      quizTypes.length > 0
        ? `${quizTypes.join("/")} Quiz`
        : "Comprehensive Quiz";

    // Check if quiz set already exists
    const { data: existingQuizSet, error: quizSetError } = await supabaseClient
      .from("quiz_sets")
      .select("id")
      .eq("lecture_id", lectureId)
      .single();

    let quizSetId;
    if (quizSetError && quizSetError.code !== "PGRST116") {
      throw new Error(
        `Error checking for existing quiz set: ${quizSetError.message}`
      );
    }

    if (existingQuizSet) {
      quizSetId = existingQuizSet.id;
      // Delete existing questions
      const { error: deleteError } = await supabaseClient
        .from("quiz_questions")
        .delete()
        .eq("quiz_set_id", quizSetId);

      if (deleteError) {
        throw new Error(
          `Error deleting existing questions: ${deleteError.message}`
        );
      }

      // Update quiz set
      const { error: updateError } = await supabaseClient
        .from("quiz_sets")
        .update({
          name: quizName,
          last_updated: new Date().toISOString(),
        })
        .eq("id", quizSetId);

      if (updateError) {
        throw new Error(`Error updating quiz set: ${updateError.message}`);
      }
    } else {
      // Create new quiz set
      const { data: newQuizSet, error: insertError } = await supabaseClient
        .from("quiz_sets")
        .insert({
          lecture_id: lectureId,
          name: quizName,
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Error creating quiz set: ${insertError.message}`);
      }
      quizSetId = newQuizSet.id;
    }

    // Insert questions
    for (const question of result.questions) {
      // Validate question structure
      if (!question || !question.type || !question.question) {
        console.warn("Skipping invalid question:", question);
        continue;
      }

      // Insert the question
      const { data: questionData, error: questionError } = await supabaseClient
        .from("quiz_questions")
        .insert({
          quiz_set_id: quizSetId,
          question_text:
            question.type === "case_study"
              ? `${question.scenario || ""}\n\n${question.question}`
              : question.question,
          question_type: question.type,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (questionError) {
        throw new Error(`Error inserting question: ${questionError.message}`);
      }

      // Insert options/answers
      if (question.type === "multiple_choice") {
        if (!question.options || !Array.isArray(question.options)) {
          console.warn(
            "Skipping multiple choice question with invalid options:",
            question
          );
          continue;
        }

        for (const option of question.options) {
          if (!option || !option.text || typeof option.correct !== "boolean") {
            console.warn("Skipping invalid option:", option);
            continue;
          }

          const { error: optionError } = await supabaseClient
            .from("quiz_options")
            .insert({
              question_id: questionData.id,
              option_text: option.text,
              is_correct: option.correct,
            });

          if (optionError) {
            throw new Error(`Error inserting option: ${optionError.message}`);
          }
        }
      } else {
        // For open-ended and case study questions, store the sample answer as a correct option
        if (!question.sampleAnswer) {
          console.warn("Skipping question without sample answer:", question);
          continue;
        }

        const { error: answerError } = await supabaseClient
          .from("quiz_options")
          .insert({
            question_id: questionData.id,
            option_text: question.sampleAnswer,
            is_correct: true,
          });

        if (answerError) {
          throw new Error(
            `Error inserting sample answer: ${answerError.message}`
          );
        }
      }
    }

    return {
      success: true,
      quiz_set_id: quizSetId,
      message: "Quiz generated and stored successfully",
    };
  } catch (error) {
    console.error("Error in quiz generation:", error);
    throw error;
  }
}
