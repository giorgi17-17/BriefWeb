import { createClient } from "@supabase/supabase-js";
import PDFParser from "pdf2json";
import dotenv from "dotenv";
import fs from "fs";
import OpenAI from "openai";
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Function to delete local file
function deleteLocalFile(filePath) {
  try {
    fs.unlinkSync(filePath);
    console.log(`File ${filePath} has been deleted successfully.`);
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
  }
}

async function testPDFExtraction(userId, lectureId, fileId) {
  const localFilePath = 'uploads/debug-downloaded.pdf';

  try {
    // First, list files to verify path
    const { data: files, error: listError } = await supabaseClient.storage
      .from("lecture-files")
      .list(`${userId}/${lectureId}`, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (listError) {
      console.error("Error listing files:", listError);
      return;
    }

    console.log("Files in the directory:", files);

    // Check if the specific file exists in the list
    const fileExists = files.some(file => file.name === fileId);
    if (!fileExists) {
      console.error(`File ${fileId} not found in the directory`);
      return;
    }

    // Try to get public URL
    const { data: urlData, error: urlError } = supabaseClient.storage
      .from("lecture-files")
      .getPublicUrl(`${userId}/${lectureId}/${fileId}`);

    if (urlError) {
      console.error("Error getting public URL:", urlError);
      return;
    }

    console.log("Public URL:", urlData.publicUrl);

    // Download file
    const { data: fileContent, error: fileDownloadError } =
      await supabaseClient.storage
        .from("lecture-files")
        .download(`${userId}/${lectureId}/${fileId}`);

    if (fileDownloadError) {
      console.error("File download error:", fileDownloadError);
      return;
    }

    // Convert to buffer and save locally for debugging
    const pdfBuffer = Buffer.from(await fileContent.arrayBuffer());
    fs.writeFileSync(localFilePath, pdfBuffer);
    console.log("File downloaded and saved locally for debugging");

    // Parse PDF
    const extractedText = await parsePDF(pdfBuffer);
    console.log(extractedText)

    // Delete the local file after extraction
    deleteLocalFile(localFilePath);

    // Log extracted text
    // console.log("Extracted Text:\n", extractedText);
    return extractedText;
  } catch (error) {
    // Ensure file is deleted even if an error occurs
    deleteLocalFile(localFilePath);
    console.error("Comprehensive error in PDF extraction:", error);
  }
}

function parsePDF(buffer) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData) => {
      console.error("PDF Parsing Error:", errData);
      reject(errData.parserError);
    });

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      let extractedText = '';

      if (pdfData.Pages) {
        pdfData.Pages.forEach((page) => {
          if (page.Texts) {
            page.Texts.forEach((text) => {
              try {
                // Safely decode and extract text
                const decodedText = decodeURIComponent(text.R[0].T);
                extractedText += decodedText + ' ';
              } catch (decodeError) {
                console.warn("Decoding error:", decodeError);
              }
            });
          }
        });
      }

      resolve(extractedText.trim());
    });

    // Parse the buffer
    pdfParser.parseBuffer(buffer);
  });
}


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateFlashcards(extractedText) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert educational content creator specializing in concise, informative flashcards."
        },
        {
          role: "user",
          content: `Create 20 flashcard topics from the following text. Each flashcard should have:
          - A clear, concise title
          - 3-4 key learning points
          - Potential question on the back of the card

          Text to analyze:
          ${extractedText}`
        }
      ],
      temperature: 0.7
    });

    // Extract and log the flashcard content
    const flashcardContent = response.choices[0].message.content;
    console.log("Generated Flashcards:\n", flashcardContent);

    // Log token usage
    if (response.usage) {
      console.log("Token Usage:");
      console.log("Prompt Tokens:", response.usage.prompt_tokens);
      console.log("Completion Tokens:", response.usage.completion_tokens);
      console.log("Total Tokens:", response.usage.total_tokens);
    }

    return flashcardContent;
  } catch (error) {
    console.error("Error generating flashcards:", error);
    throw error;
  }
}



async function main() {
  const extractedText = await testPDFExtraction(userId, lectureId, fileId);
  if (extractedText) {
    await generateFlashcards(extractedText);
  } else {
    console.error("Failed to extract text from PDF.");
  }
}

// Call the main function








// Test function - replace with your actual user, lecture, and file IDs
const userId = "c99a8851-f584-4f76-b90f-b7057faf9002";
const lectureId = "e1eb357a-5642-46a9-b2b4-aba1723ec47d";
const fileId = "17a8baeb-fc3a-4191-bc5e-6764b86b050c.pdf";

// Uncomment and run to test
main();
