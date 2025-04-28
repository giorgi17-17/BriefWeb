// controllers/pdfController.js
import { extractTextFromPDF } from "../services/pdfService.js";
import {
  generateFlashcards,
  generateBrief,
  generateQuiz,
} from "../services/aiService.js";
import { supabaseClient } from "../config/supabaseClient.js";
import { parsePagesByPDF } from "../utils/pdfParser.js";

export async function processDocument(userId, lectureId, fileId) {
  try {
    console.log("Processing document:", { userId, lectureId, fileId });

    const extractedText = await extractTextFromPDF(userId, lectureId, fileId);
    if (!extractedText) {
      throw new Error("Failed to extract text from PDF.");
    }

    console.log("Successfully extracted text, generating flashcards...");
    return await generateFlashcards(extractedText);
  } catch (error) {
    console.error("Error processing document:", error);
    throw error;
  }
}

export async function processBrief(userId, lectureId, fileId) {
  try {
    console.log("Processing document:", { userId, lectureId, fileId });

    const extractedText = await extractTextFromPDF(userId, lectureId, fileId);
    if (!extractedText) {
      throw new Error("Failed to extract text from PDF.");
    }

    console.log("Successfully extracted text, generating brief...");
    return await generateBrief(extractedText);
  } catch (error) {
    console.error("Error processing document:", error);
    throw error;
  }
}

export async function testPDFPageExtraction(userId, lectureId, fileId) {
  try {
    const { data: files, error: listError } = await supabaseClient.storage
      .from("lecture-files")
      .list(`${userId}/${lectureId}`);

    if (listError) {
      throw listError;
    }

    const fileExists = files.some((file) => file.name === fileId);
    if (!fileExists) {
      throw new Error(`File ${fileId} not found in the directory`);
    }

    const { data: fileContent, error: fileDownloadError } =
      await supabaseClient.storage
        .from("lecture-files")
        .download(`${userId}/${lectureId}/${fileId}`);

    if (fileDownloadError) {
      throw fileDownloadError;
    }

    const pdfBuffer = Buffer.from(await fileContent.arrayBuffer());
    return await parsePagesByPDF(pdfBuffer);
  } catch (error) {
    console.error("Error in PDF page extraction test:", error);
    throw error;
  }
}

export async function processPDF(userId, lectureId, fileId) {
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

    // First, try parsing the PDF into pages.
    let pages;
    try {
      // This function extracts text from each page of the PDF
      pages = await parsePagesByPDF(buffer);
      console.log(`Successfully extracted ${pages.length} pages from PDF`);
    } catch (err) {
      console.warn(
        "parsePagesByPDF failed, falling back to parsePDF. Error:",
        err
      );
      const allText = await parsePDF(buffer);
      if (allText && allText.trim()) {
        // If we can't parse by pages, put all text in a single page
        pages = [allText];
        console.log("Fallback: Using entire PDF content as a single page");
      } else {
        throw new Error("No content found in PDF");
      }
    }

    // Ensure we have non-empty pages.
    if (!pages || pages.length === 0 || pages.every((page) => !page.trim())) {
      throw new Error("No content found in PDF");
    }

    // Generate a summary for each page and extract just the summary text
    console.log(`Generating summaries for ${pages.length} pages...`);
    const summaries = await Promise.all(
      pages.map(async (pageText, index) => {
        if (!pageText.trim() || pageText.length < 10) {
          console.log(`Skipping page ${index + 1} due to insufficient content`);
          return null;
        }
        console.log(
          `Processing page ${index + 1} with ${pageText.length} characters`
        );
        const brief = await generateBrief(pageText);
        return brief.summary; // Just store the summary text
      })
    );
    const filteredSummaries = summaries.filter(Boolean);
    console.log(
      `Generated ${filteredSummaries.length} valid summaries from ${pages.length} pages`
    );

    if (filteredSummaries.length === 0) {
      throw new Error("No valid summaries generated from the PDF");
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
    console.log("Successfully saved brief with multiple page summaries");
    return result;
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw error;
  }
}

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

    // Extract text from PDF
    const pdfData = await data.arrayBuffer();
    const pdfText = await extractTextFromPDF(userId, lectureId, fileId);

    if (!pdfText || pdfText.length === 0) {
      throw new Error("Could not extract text from PDF");
    }

    // Generate the quiz from extracted text
    const quiz = await generateQuiz(pdfText, quizOptions);

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
      // Real error, not just "no rows returned"
      console.error("Error checking for existing quiz:", quizSetError);
      throw new Error(`Database error: ${quizSetError.message}`);
    } else if (existingQuizSet) {
      // Quiz exists, update it
      quizSetId = existingQuizSet.id;

      // Delete existing questions for this quiz
      const { error: deleteError } = await supabaseClient
        .from("quiz_questions")
        .delete()
        .eq("quiz_set_id", quizSetId);

      if (deleteError) {
        console.error("Error deleting existing questions:", deleteError);
        throw new Error(`Failed to update quiz: ${deleteError.message}`);
      }

      // Update the quiz set name
      const { error: updateError } = await supabaseClient
        .from("quiz_sets")
        .update({ name: quizName })
        .eq("id", quizSetId);

      if (updateError) {
        console.error("Error updating quiz set:", updateError);
        throw new Error(`Failed to update quiz: ${updateError.message}`);
      }
    } else {
      // Create new quiz set
      const { data: newQuizSet, error: createError } = await supabaseClient
        .from("quiz_sets")
        .insert({
          name: quizName,
          lecture_id: lectureId,
          created_at: new Date(),
          last_updated: new Date(),
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating quiz set:", createError);
        throw new Error(`Failed to create quiz: ${createError.message}`);
      }

      quizSetId = newQuizSet.id;
    }

    // Insert questions and options
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
          console.error(
            "Error inserting multiple choice question:",
            questionError
          );
          throw new Error(
            `Failed to insert question: ${questionError.message}`
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
            console.error("Error inserting option:", optionError);
            throw new Error(`Failed to insert option: ${optionError.message}`);
          }
        }
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
          console.error("Error inserting open-ended question:", questionError);
          throw new Error(
            `Failed to insert question: ${questionError.message}`
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
          console.error("Error inserting sample answer:", optionError);
          throw new Error(
            `Failed to insert sample answer: ${optionError.message}`
          );
        }
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
          console.error("Error inserting case study question:", questionError);
          throw new Error(
            `Failed to insert question: ${questionError.message}`
          );
        }

        // Insert sample answer
        const { error: optionError } = await supabaseClient
          .from("quiz_options")
          .insert({
            question_id: questionData.id,
            option_text: csQuestion.sampleAnswer,
            is_correct: true,
          });

        if (optionError) {
          console.error(
            "Error inserting case study sample answer:",
            optionError
          );
          throw new Error(
            `Failed to insert sample answer: ${optionError.message}`
          );
        }
      }
    }

    return { success: true, quizSetId };
  } catch (error) {
    console.error("Error processing quiz:", error);
    throw error;
  }
}
