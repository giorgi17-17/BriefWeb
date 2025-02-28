// controllers/pdfController.js
import { extractTextFromPDF } from "../services/pdfService.js";
import { generateFlashcards, generateBrief,  } from "../services/aiService.js";
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

    const { data: fileContent, error: fileDownloadError } = await supabaseClient.storage
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
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from("lecture-files")
      .download(filePath);
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
      pages = await parsePagesByPDF(buffer);
    } catch (err) {
      console.warn("parsePagesByPDF failed, falling back to parsePDF. Error:", err);
      const allText = await parsePDF(buffer);
      if (allText && allText.trim()) {
        pages = [allText];
      } else {
        throw new Error("No content found in PDF");
      }
    }

    // Ensure we have non-empty pages.
    if (!pages || pages.length === 0 || pages.every((page) => !page.trim())) {
      throw new Error("No content found in PDF");
    }

    // Generate a summary for each page and extract just the summary text
    const summaries = await Promise.all(
      pages.map(async (pageText, index) => {
        if (!pageText.trim() || pageText.length < 10) {
          console.log(`Skipping page ${index + 1} due to insufficient content`);
          return null;
        }
        const brief = await generateBrief(pageText);
        return brief.summary; // Just store the summary text
      })
    );
    const filteredSummaries = summaries.filter(Boolean);
    console.log('Generated summaries:', filteredSummaries);

    if (filteredSummaries.length === 0) {
      throw new Error("No valid summaries generated from the PDF");
    }

    // Log the brief object before saving
    console.log('Brief object to save:', {
      total_pages: filteredSummaries.length,
      summaries: filteredSummaries
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
        important_details: []
      }
    };

    // // Try to create the briefs table if it doesn't exist
    // try {
    //   const createTableSQL = `
    //     CREATE TABLE IF NOT EXISTS briefs (
    //       id SERIAL PRIMARY KEY,
    //       lecture_id VARCHAR NOT NULL,
    //       user_id VARCHAR NOT NULL,
    //       total_pages INTEGER NOT NULL,
    //       created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    //       current_page INTEGER DEFAULT 1,
    //       summaries JSONB NOT NULL,
    //       metadata JSONB,
    //       CONSTRAINT unique_lecture_brief UNIQUE (lecture_id)
    //     );
        
    //     CREATE INDEX IF NOT EXISTS idx_briefs_lecture_id ON briefs(lecture_id);
    //     CREATE INDEX IF NOT EXISTS idx_briefs_user_id ON briefs(user_id);
    //   `;
      
    //   await supabaseClient.rpc('exec_sql', { query: createTableSQL });
    // } catch (error) {
    //   console.log('Table might already exist:', error.message);
    // }

    // Check if a brief for this lecture already exists
    const { data: existingBrief, error: existingError } = await supabaseClient
      .from("briefs")
      .select("*")
      .eq("lecture_id", lectureId)
      .single();

    if (existingError && existingError.code !== "PGRST116") {
      throw new Error(`Error checking for existing brief: ${existingError.message}`);
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
    console.log('ressssssssssss' + result)
    return result;
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw error;
  }
}
