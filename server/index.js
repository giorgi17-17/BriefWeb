import { createClient } from "@supabase/supabase-js";
import PDFParser from "pdf2json";
import dotenv from "dotenv";
import fs from "fs";
import OpenAI from "openai";
import express from "express";
import uniqid from "uniqid";
dotenv.config();
const app = express();
const port = 5000;

// Middleware to parse JSON
app.use(express.json());
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
  const localFilePath = "uploads/debug-downloaded.pdf";

  try {
    const { data: files, error: listError } = await supabaseClient.storage
      .from("lecture-files")
      .list(`${userId}/${lectureId}`, {
        limit: 100,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      });

    if (listError) {
      console.error("Error listing files:", listError);
      return;
    }

    console.log("Files in the directory:", files);

    const fileExists = files.some((file) => file.name === fileId);
    if (!fileExists) {
      console.error(`File ${fileId} not found in the directory`);
      return;
    }

    const { data: urlData, error: urlError } = supabaseClient.storage
      .from("lecture-files")
      .getPublicUrl(`${userId}/${lectureId}/${fileId}`);

    if (urlError) {
      console.error("Error getting public URL:", urlError);
      return;
    }

    console.log("Public URL:", urlData.publicUrl);

    const { data: fileContent, error: fileDownloadError } =
      await supabaseClient.storage
        .from("lecture-files")
        .download(`${userId}/${lectureId}/${fileId}`);

    if (fileDownloadError) {
      console.error("File download error:", fileDownloadError);
      return;
    }

    const pdfBuffer = Buffer.from(await fileContent.arrayBuffer());
    fs.writeFileSync(localFilePath, pdfBuffer);
    console.log("File downloaded and saved locally for debugging");

    const extractedText = await parsePDF(pdfBuffer);

    deleteLocalFile(localFilePath);

    return extractedText;
  } catch (error) {
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
      let extractedText = "";

      if (pdfData.Pages) {
        pdfData.Pages.forEach((page) => {
          if (page.Texts) {
            page.Texts.forEach((text) => {
              try {
                const decodedText = decodeURIComponent(text.R[0].T);
                extractedText += decodedText + " ";
              } catch (decodeError) {
                console.warn("Decoding error:", decodeError);
              }
            });
          }
        });
      }

      resolve(extractedText.trim());
    });

    pdfParser.parseBuffer(buffer);
  });
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});



async function generateFlashcards(extractedText) {
  try {
    console.log('generating')
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert educational content creator specializing in concise, informative flashcards.",
        },
        {
          role: "user",
          content: `Generate a comprehensive 30 flashcard topics from the following text formatted as an array of JSON objects.
          which containes question and answer for each card

          Text to analyze: ${extractedText}

          Each flashcard should be provided in valid JSON format. The JSON structure for each flashcard must be:

          

         Flashcard structure:
         [ 
          {
            
            "question": "Potential question on the back of the card",
            "answer": "detailed and explained asnwer of the question",
          },
        ]
          ...and other flashcards


        YOU NEED TO create an array of  flashcards. Ensure the JSON is valid and parsable. 
        dont write any symbols or text before and after array brackets
          
          try to make cards content usefull in real life, answers should be explained in simple terms 


          Text to analyze:
          ${extractedText}
          `,
        }, 
      ],

      // temperature: 1.7,
      // frequency_penalty: 2
    });

    const flashcardContent = response.choices[0].message.content;

    const parsedFlashcards = JSON.parse(flashcardContent)
    const flashcardsWithId = parsedFlashcards.map((card) => ({
      id: uniqid(), // Generate unique ID for each card
      ...card, // Include the original question and answer
    }));
    console.log(flashcardsWithId)

    // console.log("Generated Flashcards:\n", flashcardContent);

    // console.log("Generated Flashcards:\n", flashcardContent);

    if (response.usage) {
      console.log("Token Usage:");
      
      console.log("Prompt Tokens:", response.usage.prompt_tokens);
      console.log("Completion Tokens:", response.usage.completion_tokens);
      console.log("Total Tokens:", response.usage.total_tokens);
    }

    return flashcardsWithId;
  } catch (error) {
    console.error("Error generating flashcards:", error);
    throw error;
  }
}

export async function main(userId, lectureId, fileId) {
  const extractedText = await testPDFExtraction(userId, lectureId, fileId);
  if (extractedText) {
    return await generateFlashcards(extractedText);
  } else {
    console.error("Failed to extract text from PDF.");
  }
}

// Express Server

// Define endpoint

app.get("/api/test", (req, res) => {
  console.log("first");
  res.send("Test endpoint working!");
});

app.post("/api/process-pdf", async (req, res) => {
  const { userId, lectureId, fileId } = req.body;
  console.log("hittt");
  console.log(userId, lectureId, fileId);

  if (!userId || !lectureId || !fileId) {
    return res.status(400).json({
      error: "Missing required parameters: userId, lectureId, or fileId.",
    });
  }

  try {
    const flashcards = await main(userId, lectureId, fileId);
    if (flashcards) {
      res.status(200).json({ flashcards });
    } else {
      res
        .status(500)
        .json({ error: "Failed to process the file or generate flashcards." });
    }
  } catch (error) {
    console.error("Error in /process-pdf route:", error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
