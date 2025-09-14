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

/**
 * Process a document to generate flashcards
 * @param {string} userId - User ID
 * @param {string} lectureId - Lecture ID
 * @param {string} fileId - File ID/name
 * @returns {Promise<object>} - Generated flashcards
 */
export async function processDocument(userId, lectureId, fileId) {
  try {
    // Validate input parameters
    if (!userId || !lectureId || !fileId) {
      throw new Error(
        "Missing required parameters: userId, lectureId, or fileId"
      );
    }

    console.log("Processing document:", { userId, lectureId, fileId });

    const extractedText = await extractTextFromFile(userId, lectureId, fileId);
    if (!extractedText) {
      throw new Error("Failed to extract text from document.");
    }

    console.log("Successfully extracted text, length:", extractedText.length);
    console.log("Calling generateFlashcards...");

    const flashcards = await generateFlashcards(extractedText);

    console.log(
      "Received flashcards from AI service:",
      Array.isArray(flashcards)
        ? `${flashcards.length} cards`
        : typeof flashcards
    );

    if (flashcards && Array.isArray(flashcards) && flashcards.length > 0) {
      console.log("First flashcard sample:", {
        question: flashcards[0].question?.substring(0, 50),
        answer: flashcards[0].answer?.substring(0, 50),
      });
    }

    return flashcards;
  } catch (error) {
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
  try {
    // Validate input parameters
    if (!userId || !lectureId || !fileId) {
      throw new Error(
        "Missing required parameters: userId, lectureId, or fileId"
      );
    }

    console.log("Processing document:", { userId, lectureId, fileId });

    const extractedText = await extractTextFromFile(userId, lectureId, fileId);
    if (!extractedText) {
      throw new Error("Failed to extract text from document.");
    }

    console.log("Successfully extracted text, generating brief...");

    // Use generateMultiPageBrief for single page processing
    const result = await generateMultiPageBrief(extractedText);

    // Return the first (and only) summary in the expected format
    if (
      result &&
      result.pageSummaries &&
      result.pageSummaries.length > 0 &&
      result.pageSummaries[0].summary
    ) {
      return {
        summary: result.pageSummaries[0].summary,
        key_concepts: [],
        important_details: [],
      };
    } else {
      throw new Error("Failed to generate brief summary");
    }
  } catch (error) {
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
  try {
    // Validate input parameters
    if (!userId || !lectureId || !fileId) {
      throw new Error(
        "Missing required parameters: userId, lectureId, or fileId"
      );
    }

    return await extractContentByPagesOrSlides(userId, lectureId, fileId);
  } catch (error) {
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
  try {
    // Validate input parameters
    if (!userId || !lectureId || !fileId) {
      throw new Error(
        "Missing required parameters: userId, lectureId, or fileId"
      );
    }

    // Build the file path as stored in Supabase.
    const filePath = `${userId}/${lectureId}/${fileId}`;

    // Download file from Supabase Storage.
    const { data: fileData, error: downloadError } =
      await supabaseClient.storage.from("lecture-files").download(filePath);
    if (downloadError) {
      throw new Error(`Error downloading file: ${downloadError.message}`);
    }
    if (!fileData) {
      throw new Error("No file data received from Supabase");
    }

    // Convert file to buffer (needed for processing)
    const buffer = Buffer.from(await fileData.arrayBuffer());

    // IMPROVED: More robust page extraction with better error handling
    let pages = [];
    let extractionMethod = "unknown";

    try {
      // Extract content by pages/slides
      pages = await extractContentByPagesOrSlides(userId, lectureId, fileId);
      extractionMethod = "page-by-page";
      console.log(
        `Successfully extracted ${pages.length} pages/slides from document using page-by-page method`
      );
    } catch (err) {
      console.warn(
        "extractContentByPagesOrSlides failed, attempting alternative extraction methods. Error:",
        err
      );

      // Try alternative extraction methods before falling back to single page
      try {
        const allText = await extractTextFromFile(userId, lectureId, fileId);
        if (allText && allText.trim()) {
          // IMPROVED: Try to intelligently split large documents into logical sections
          const textLength = allText.length;
          console.log(`Extracted text length: ${textLength} characters`);

          if (textLength > 5000) {
            // For large documents, try to split by common section markers
            const sectionMarkers = [
              /\n\s*(?:Chapter|Section|Part|Unit)\s+\d+/gi,
              /\n\s*\d+\.\s+[A-Z][^.]*\n/g,
              /\n\s*[A-Z][A-Z\s]{10,}\n/g, // All caps headings
              /\n\s*\*{3,}.*\*{3,}\n/g, // Asterisk separators
              /\n\s*={3,}\n/g, // Equal sign separators
              /\n\s*-{3,}\n/g, // Dash separators
            ];

            let sections = [allText];
            for (const marker of sectionMarkers) {
              const splits = allText.split(marker);
              if (splits.length > 1 && splits.length <= 20) {
                // Reasonable number of sections
                sections = splits.filter(
                  (section) => section && section.trim().length > 100
                );
                if (sections.length > 0) {
                  console.log(
                    `Split document into ${sections.length} sections using pattern matching`
                  );
                  break;
                }
              }
            }

            if (sections.length > 1) {
              pages = sections;
              extractionMethod = "intelligent-splitting";
            } else {
              // If no good splits found, divide by approximate page size
              const avgPageSize = Math.max(1000, Math.floor(textLength / 10)); // Aim for ~10 pages max
              pages = [];
              for (let i = 0; i < textLength; i += avgPageSize) {
                const pageText = allText.substring(i, i + avgPageSize);
                if (pageText && pageText.trim().length > 50) {
                  pages.push(pageText.trim());
                }
              }

              // Safety check: if no pages were created, use the original text
              if (pages.length === 0) {
                pages = [allText];
              }
              extractionMethod = "size-based-splitting";
              console.log(
                `Split document into ${pages.length} pages using size-based splitting`
              );
            }
          } else {
            // For smaller documents, treat as single page but still process it
            pages = [allText];
            extractionMethod = "single-page-fallback";
            console.log(
              "Using entire document content as a single page (small document)"
            );
          }
        } else {
          throw new Error("No content found in document");
        }
      } catch (textExtractionError) {
        console.error("All extraction methods failed:", textExtractionError);
        throw new Error("Could not extract any content from document");
      }
    }

    // IMPROVED: More lenient page validation
    if (!pages || pages.length === 0) {
      throw new Error("No content found in document");
    }

    // Filter out completely empty pages but be more lenient
    const validPages = pages.filter((page) => {
      if (!page || typeof page !== "string") return false;
      const trimmedPage = page.trim();
      return trimmedPage.length > 0; // Accept any non-empty content
    });

    if (validPages.length === 0) {
      throw new Error("No valid content found in document after filtering");
    }

    console.log(
      `Processing ${validPages.length} pages using ${extractionMethod} method`
    );

    // OPTIMIZED: Always use multi-page optimization for all documents
    console.log(
      `🚀 GENERATING SUMMARIES: Processing ${validPages.length} pages/slides using optimized single AI call...`
    );

    let filteredSummaries = []; // Declare filteredSummaries in the outer scope

    let multiPageResult;
    try {
      multiPageResult = await generateMultiPageBrief(validPages);
      console.log("Multi-page brief generation completed successfully");
    } catch (error) {
      console.error(
        "Multi-page brief generation failed, falling back to individual processing:",
        error
      );

      // Fallback to individual processing if the optimized method fails
      const summaries = await Promise.all(
        validPages.map(async (pageText, index) => {
          const trimmedText = pageText.trim();
          if (trimmedText.length === 0) {
            return null;
          }

          try {
            // Use generateMultiPageBrief for single page processing
            const result = await generateMultiPageBrief([trimmedText]);
            if (
              result &&
              result.pageSummaries &&
              result.pageSummaries.length > 0 &&
              result.pageSummaries[0].summary
            ) {
              return result.pageSummaries[0].summary;
            } else {
              throw new Error(
                "Invalid result structure from generateMultiPageBrief"
              );
            }
          } catch (briefError) {
            console.warn(
              `Failed to generate brief for page ${index + 1}:`,
              briefError
            );
            return `Page ${
              index + 1
            }: Content could not be processed by AI. Raw content: ${trimmedText.substring(
              0,
              200
            )}${trimmedText.length > 200 ? "..." : ""}`;
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
    }

    // Extract summaries from the multi-page result
    if (!multiPageResult || !multiPageResult.pageSummaries) {
      throw new Error("Invalid multi-page result structure");
    }

    // Extract summaries and titles for new format
    const summariesWithTitles = multiPageResult.pageSummaries.map((item) => ({
      summary: item.summary || "",
      title:
        item.title ||
        `Page ${
          item.pageNumber || multiPageResult.pageSummaries.indexOf(item) + 1
        }`,
    }));

    // For backward compatibility, keep the summaries array
    const summaries = summariesWithTitles.map((item) => item.summary);
    filteredSummaries = summaries.filter(Boolean);

    console.log(
      `Generated ${filteredSummaries.length} valid summaries from ${validPages.length} pages/slides`
    );

    // IMPROVED: Ensure we always have at least one summary
    if (filteredSummaries.length === 0) {
      console.warn("No summaries were generated, creating fallback summary");
      filteredSummaries.push(
        "This document could not be processed properly. Please try uploading a different format or contact support."
      );
    }

    // Log the brief object before saving
    console.log("Brief object to save:", {
      total_pages: filteredSummaries.length,
      summaries: filteredSummaries,
      extraction_method: extractionMethod,
    });

    // Build the brief object matching the frontend's expected format
    const brief = {
      lecture_id: lectureId,
      user_id: userId,
      total_pages: filteredSummaries.length,
      summaries: filteredSummaries, // Array of summary strings (backward compatibility)
      metadata: {
        generatedAt: new Date().toISOString(),
        documentTitle: fileId,
        extractionMethod: extractionMethod,
        originalPageCount: pages.length,
        processedPageCount: validPages.length,
        mainThemes: [],
        key_concepts: [],
        important_details: [],
        page_titles: summariesWithTitles.map((item) => item.title), // Store titles in metadata for now
        summaries_with_titles: summariesWithTitles, // Store enhanced format in metadata
      },
    };

    // Check if a brief for this lecture already exists
    const { data: existingBrief, error: existingError } = await supabaseClient
      .from("briefs")
      .select("*")
      .eq("lecture_id", lectureId)
      .single();

    if (existingError && existingError.code !== "PGRST116") {
      throw new Error(
        `Error checking for existing brief: ${existingError.message}`
      );
    }

    let result;
    if (existingBrief) {
      // Update the existing record.
      const { data: updatedBrief, error: updateError } = await supabaseClient
        .from("briefs")
        .update(brief)
        .eq("lecture_id", lectureId)
        .select()
        .single();
      if (updateError) {
        throw new Error(`Error updating brief: ${updateError.message}`);
      }
      result = updatedBrief;
    } else {
      // Insert a new record.
      const { data: insertedBrief, error: insertError } = await supabaseClient
        .from("briefs")
        .insert(brief)
        .select()
        .single();
      if (insertError) {
        throw new Error(`Error inserting brief: ${insertError.message}`);
      }
      result = insertedBrief;
    }
    console.log(
      `Successfully saved brief with ${filteredSummaries.length} page summaries using ${extractionMethod} method`
    );
    return result;
  } catch (error) {
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
