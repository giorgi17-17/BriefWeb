import { supabaseClient } from "../config/supabaseClient.js";
import { parsePDF } from "../utils/pdfParser.js";

export async function extractTextFromPDF(userId, lectureId, fileId) {
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

    const { data: fileContent, error: fileDownloadError } = await supabaseClient.storage
      .from("lecture-files")
      .download(`${userId}/${lectureId}/${fileId}`);

    if (fileDownloadError) {
      throw fileDownloadError;
    }

    const pdfBuffer = Buffer.from(await fileContent.arrayBuffer());
    return await parsePDF(pdfBuffer);
  } catch (error) {
    console.error("Error in PDF extraction:", error);
    throw error;
  }
}