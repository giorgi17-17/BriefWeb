import { supabaseClient } from "../config/supabaseClient.js";
import { parseDOCX } from "../utils/docxParser.js";
import { parsePDF, parsePagesByPDF } from "../utils/pdfParser.js";
import { parsePPTX, parseSlidesByPPTX } from "../utils/pptxParser.js";

/**
 * Extract text from a file stored in Supabase
 * @param {string} userId - User ID
 * @param {string} lectureId - Lecture ID
 * @param {string} fileId - File ID/name
 * @returns {Promise<string>} - Extracted text from the file
 */
export async function extractTextFromFile(userId, lectureId, fileId) {
  try {
    const { data: files, error: listError } = await supabaseClient.storage
      .from("lecture-files")
      .list(`${userId}/${lectureId}`);

    if (listError) {
      console.error("Error listing files:", listError);
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

    const fileBuffer = Buffer.from(await fileContent.arrayBuffer());
    const fileExt = fileId.split(".").pop().toLowerCase();

    if (fileExt === "pdf") {
      return await parsePDF(fileBuffer);
    } else if (fileExt === "pptx") {
      return await parsePPTX(fileBuffer);
    } else if (fileExt === "docx") {
      return await parseDOCX(fileBuffer);
      // If you ever need "paged" sections for DOCX:
      // const parts = await parseBlocksByDOCX(fileBuffer);
      // return parts.join("\n\n");
    } else {
      throw new Error(`Unsupported file type: ${fileExt}`);
    }
  } catch (error) {
    console.error("Error in file extraction:", error);
    throw error;
  }
}

/**
 * Extract content by pages/slides from a file
 * @param {string} userId - User ID
 * @param {string} lectureId - Lecture ID
 * @param {string} fileId - File ID/name
 * @returns {Promise<Array<string>>} - Array of extracted content by pages/slides
 */
export async function extractContentByPagesOrSlides(userId, lectureId, fileId) {
  try {
    const { data: files, error: listError } = await supabaseClient.storage
      .from("lecture-files")
      .list(`${userId}/${lectureId}`);

    if (listError) {
      console.error("Error listing files:", listError);
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

    const fileBuffer = Buffer.from(await fileContent.arrayBuffer());
    const fileExt = fileId.split(".").pop().toLowerCase();

    // Process based on file extension
    if (fileExt === "pdf") {
      return await parsePagesByPDF(fileBuffer);
    } else if (fileExt === "pptx") {
      return await parseSlidesByPPTX(fileBuffer);
    } else {
      throw new Error(`Unsupported file type: ${fileExt}`);
    }
  } catch (error) {
    console.error("Error in file page/slide extraction:", error);
    throw error;
  }
}
