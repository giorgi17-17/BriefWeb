import {
  generateBrief,
  generateFlashcards,
  generateQuiz,
} from "../services/aiService.js";
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
    console.log("Processing document:", { userId, lectureId, fileId });

    const extractedText = await extractTextFromFile(userId, lectureId, fileId);
    if (!extractedText) {
      throw new Error("Failed to extract text from document.");
    }

    console.log("Successfully extracted text, generating brief...");
    return await generateBrief(extractedText);
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

    // Convert file to buffer.
    const buffer = Buffer.from(await fileData.arrayBuffer());
    const fileExt = fileId.split(".").pop().toLowerCase();

    // First, try parsing the document into pages/slides.
    let pages;
    try {
      pages = await extractContentByPagesOrSlides(userId, lectureId, fileId);
    } catch (err) {
      console.warn(
        "extractContentByPagesOrSlides failed, falling back to extractTextFromFile. Error:",
        err
      );
      const allText = await extractTextFromFile(userId, lectureId, fileId);
      if (allText && allText.trim()) {
        pages = [allText];
      } else {
        throw new Error("No content found in document");
      }
    }

    // Ensure we have non-empty pages.
    if (!pages || pages.length === 0 || pages.every((page) => !page.trim())) {
      throw new Error("No content found in document");
    }

    // Generate a summary for each page and extract just the summary text
    const summaries = await Promise.all(
      pages.map(async (pageText, index) => {
        if (!pageText.trim() || pageText.length < 10) {
          console.log(
            `Skipping page/slide ${index + 1} due to insufficient content`
          );
          return null;
        }
        const brief = await generateBrief(pageText);
        return brief.summary; // Just store the summary text
      })
    );
    const filteredSummaries = summaries.filter(Boolean);
    console.log("Generated summaries:", filteredSummaries);

    if (filteredSummaries.length === 0) {
      throw new Error("No valid summaries generated from the document");
    }

    // Log the brief object before saving
    console.log("Brief object to save:", {
      total_pages: filteredSummaries.length,
      summaries: filteredSummaries,
    });

    // Build the brief object matching the frontend's expected format
    const brief = {
      lecture_id: lectureId,
      user_id: userId,
      total_pages: filteredSummaries.length,
      summaries: filteredSummaries, // Array of summary strings
      metadata: {
        generatedAt: new Date().toISOString(),
        documentTitle: fileId,
        mainThemes: [],
        key_concepts: [],
        important_details: [],
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
    console.log("Brief result:", result);
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
      // Insert the question
      const { data: questionData, error: questionError } = await supabaseClient
        .from("quiz_questions")
        .insert({
          quiz_set_id: quizSetId,
          question_text:
            question.type === "case_study"
              ? `${question.scenario}\n\n${question.question}`
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
        for (const option of question.options) {
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
