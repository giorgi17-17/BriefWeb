import { supabaseClient } from "../config/supabaseClient.js";
import { parsePPTX, parseSlidesByPPTX } from "../utils/pptxParser.js";

/**
 * Extract text from a PPTX file stored in Supabase
 * @param {string} userId - User ID
 * @param {string} lectureId - Lecture ID
 * @param {string} fileId - File ID/name
 * @returns {Promise<string>} - Extracted text from the PPTX file
 */
export async function extractTextFromPPTX(userId, lectureId, fileId) {
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

    const pptxBuffer = Buffer.from(await fileContent.arrayBuffer());
    return await parsePPTX(pptxBuffer);
  } catch (error) {
    console.error("Error in PPTX extraction:", error);
    throw error;
  }
}

/**
 * Extract text from PPTX by slides
 * @param {string} userId - User ID
 * @param {string} lectureId - Lecture ID
 * @param {string} fileId - File ID/name
 * @returns {Promise<Array<string>>} - Array of extracted text from each slide
 */
export async function extractSlidesByPPTX(userId, lectureId, fileId) {
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

    const pptxBuffer = Buffer.from(await fileContent.arrayBuffer());
    return await parseSlidesByPPTX(pptxBuffer);
  } catch (error) {
    console.error("Error in PPTX slides extraction:", error);
    throw error;
  }
}
