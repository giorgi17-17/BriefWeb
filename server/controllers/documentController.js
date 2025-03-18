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

    console.log("Successfully extracted text, generating flashcards...");
    return await generateFlashcards(extractedText);
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

    // Download the file from storage
    const { data, error } = await supabaseClient.storage
      .from("lecture-files")
      .download(filePath);

    if (error) {
      console.error("Error downloading file:", error);
      throw new Error(`Failed to download file: ${error.message}`);
    }

    // Extract text from document
    const documentText = await extractTextFromFile(userId, lectureId, fileId);
    if (!documentText || documentText.length === 0) {
      throw new Error("Could not extract text from document");
    }

    // Generate the quiz from extracted text
    const quiz = await generateQuiz(documentText, quizOptions);

    // Create a descriptive quiz name based on the options selected
    let quizTypes = [];
    if (quizOptions.includeMultipleChoice) quizTypes.push("Multiple Choice");
    if (quizOptions.includeOpenEnded) quizTypes.push("Short Answer");
    if (quizOptions.includeCaseStudies) quizTypes.push("Case Study");

    const quizName =
      quizTypes.length > 0
        ? `${quizTypes.join("/")} Quiz`
        : "Comprehensive Quiz";

    // Check if quiz set already exists for this lecture
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
      // Delete existing questions for this quiz set
      const { error: deleteError } = await supabaseClient
        .from("quiz_questions")
        .delete()
        .eq("quiz_set_id", quizSetId);
      if (deleteError) {
        throw new Error(
          `Error deleting existing questions: ${deleteError.message}`
        );
      }

      // Update the quiz set metadata
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
      // Create a new quiz set
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

    // Process questions from the quiz object
    // The quiz object from aiService has three arrays: multipleChoice, openEnded, caseStudies
    let allQuestions = [];

    // Process multiple choice questions
    if (quiz.multipleChoice && quiz.multipleChoice.length > 0) {
      for (const mcQuestion of quiz.multipleChoice) {
        // Insert the question
        const { data: questionData, error: questionError } =
          await supabaseClient
            .from("quiz_questions")
            .insert({
              quiz_set_id: quizSetId,
              question_text: mcQuestion.question,
              question_type: "multiple_choice",
              explanation: mcQuestion.explanation || "",
            })
            .select()
            .single();

        if (questionError) {
          throw new Error(
            `Error inserting multiple choice question: ${questionError.message}`
          );
        }

        // Insert options for this question
        for (const option of mcQuestion.options) {
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

        // Add to our list of processed questions
        allQuestions.push({
          id: questionData.id,
          type: "multiple_choice",
          question: mcQuestion.question,
          options: mcQuestion.options.map((opt) => ({
            text: opt.text,
            correct: opt.correct,
          })),
          explanation: mcQuestion.explanation || "",
        });
      }
    }

    // Process open-ended questions
    if (quiz.openEnded && quiz.openEnded.length > 0) {
      for (const oeQuestion of quiz.openEnded) {
        // Insert the question
        const { data: questionData, error: questionError } =
          await supabaseClient
            .from("quiz_questions")
            .insert({
              quiz_set_id: quizSetId,
              question_text: oeQuestion.question,
              question_type: "open_ended",
            })
            .select()
            .single();

        if (questionError) {
          throw new Error(
            `Error inserting open-ended question: ${questionError.message}`
          );
        }

        // Insert sample answer as an option
        const { error: optionError } = await supabaseClient
          .from("quiz_options")
          .insert({
            question_id: questionData.id,
            option_text: oeQuestion.sampleAnswer,
            is_correct: true,
          });

        if (optionError) {
          throw new Error(
            `Error inserting sample answer: ${optionError.message}`
          );
        }

        // Add to our list of processed questions
        allQuestions.push({
          id: questionData.id,
          type: "open_ended",
          question: oeQuestion.question,
          sampleAnswer: oeQuestion.sampleAnswer,
        });
      }
    }

    // Process case study questions
    if (quiz.caseStudies && quiz.caseStudies.length > 0) {
      for (const csQuestion of quiz.caseStudies) {
        // Combine scenario and question
        const combinedText = `${csQuestion.scenario}\n\n${csQuestion.question}`;

        // Insert the question
        const { data: questionData, error: questionError } =
          await supabaseClient
            .from("quiz_questions")
            .insert({
              quiz_set_id: quizSetId,
              question_text: combinedText,
              question_type: `case_study_${csQuestion.difficulty}`,
            })
            .select()
            .single();

        if (questionError) {
          throw new Error(
            `Error inserting case study question: ${questionError.message}`
          );
        }

        // Insert sample answer as an option
        const { error: optionError } = await supabaseClient
          .from("quiz_options")
          .insert({
            question_id: questionData.id,
            option_text: csQuestion.sampleAnswer,
            is_correct: true,
          });

        if (optionError) {
          throw new Error(
            `Error inserting sample answer: ${optionError.message}`
          );
        }

        // Add to our list of processed questions
        allQuestions.push({
          id: questionData.id,
          type: `case_study_${csQuestion.difficulty}`,
          scenario: csQuestion.scenario,
          question: csQuestion.question,
          sampleAnswer: csQuestion.sampleAnswer,
        });
      }
    }

    return {
      quiz_set_id: quizSetId,
      name: quizName,
      questions: allQuestions,
    };
  } catch (error) {
    console.error("Error processing quiz:", error);
    throw error;
  }
}
