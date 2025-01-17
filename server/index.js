// import { createClient } from "@supabase/supabase-js";
import PDFParser from "pdf2json";
import dotenv from "dotenv";
import OpenAI from "openai";
import express from "express";
import uniqid from "uniqid";
import cors from "cors";
import { supabaseClient } from "./config/supabase.js";
dotenv.config();

const app = express();
app.use(cors());
const port = 5000;

// Middleware to parse JSON
app.use(express.json());

// Initialize Supabase client
// const supabaseUrl = process.env.SUPABASE_URL;
// const supabaseKey = process.env.SUPABASE_ANON_KEY;
// const supabaseClient = createClient(supabaseUrl, supabaseKey);

async function extractTextFromPDF(userId, lectureId, fileId) {
  try {
    // Check if file exists in Supabase
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

    // Download file directly as buffer
    const { data: fileContent, error: fileDownloadError } =
      await supabaseClient.storage
        .from("lecture-files")
        .download(`${userId}/${lectureId}/${fileId}`);

    if (fileDownloadError) {
      throw fileDownloadError;
    }

    // Convert to buffer and parse
    const pdfBuffer = Buffer.from(await fileContent.arrayBuffer());
    return await parsePDF(pdfBuffer);
    
  } catch (error) {
    console.error("Error in PDF extraction:", error);
    throw error;
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
    console.log('Generating flashcards...');
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert educational content creator specializing in concise, informative flashcards. Return ONLY raw JSON array without any markdown formatting, code blocks, or additional text.",
        },
        {
          role: "user",
          content: `Generate 30 flashcards from the following text. Return ONLY a JSON array without any markdown formatting or explanation.

          Required format:
          [
            {
              "question": "Question text",
              "answer": "Answer text"
            }
          ]

          Text to analyze: ${extractedText}`,
        }
      ],
    });

    let briefContent = response.choices[0].message.content;
    
    // Clean up the response if it contains markdown or extra text
    try {
      // Remove markdown code fences if present
      briefContent = briefContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Trim whitespace
      briefContent = briefContent.trim();
      
      // Ensure content starts with [ and ends with ]
      if (!briefContent.startsWith('[') || !briefContent.endsWith(']')) {
        throw new Error('Invalid JSON format');
      }

      const parsedFlashcards = JSON.parse(briefContent);
      
      // Validate the structure
      if (!Array.isArray(parsedFlashcards)) {
        throw new Error('Response is not an array');
      }

      const flashcardsWithId = parsedFlashcards.map((card) => {
        if (!card.question || !card.answer) {
          throw new Error('Invalid flashcard format');
        }
        return {
          id: uniqid(),
          question: card.question,
          answer: card.answer
        };
      });

      if (response.usage) {
        console.log("Token Usage:", {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        });
      }

      return flashcardsWithId;

    } catch (parseError) {
      console.error('Raw response:', briefContent);
      console.error('Parse error:', parseError);
      throw new Error(`Failed to parse GPT response: ${parseError.message}`);
    }
  } catch (error) {
    console.error("Error generating flashcards:", error);
    throw error;
  }
}
async function generateBrief(extractedText) {
  try {
    console.log('Generating brief...');
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert educational content creator specializing in concise, informative briefs. Return ONLY raw JSON without any markdown formatting, code blocks, or additional text.",
        },
        {
          role: "user",
          content: `Generate a comprehensive brief from the following text. Return ONLY a JSON object without any markdown formatting or explanation.

          Required format:
          {
            "key_concepts": ["List 5-7 key concepts from the text"],
            "summary": "Write a clear, concise 2-3 paragraph summary of the main points",
            "important_details": ["List 5-7 important supporting details or examples"]
          }

          Text to analyze: ${extractedText}`,
        }
      ],
    });

    let briefContent = response.choices[0].message.content;
    
    try {
      // Remove markdown code fences if present
      briefContent = briefContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Trim whitespace
      briefContent = briefContent.trim();
      
      const parsedBrief = JSON.parse(briefContent);
      
      // Validate the structure
      if (!parsedBrief.key_concepts || !Array.isArray(parsedBrief.key_concepts) ||
          !parsedBrief.summary || typeof parsedBrief.summary !== 'string' ||
          !parsedBrief.important_details || !Array.isArray(parsedBrief.important_details)) {
        throw new Error('Invalid brief format');
      }

      if (response.usage) {
        console.log("Token Usage:", {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        });
      }

      return parsedBrief;

    } catch (parseError) {
      console.error('Raw response:', briefContent);
      console.error('Parse error:', parseError);
      throw new Error(`Failed to parse GPT response: ${parseError.message}`);
    }
  } catch (error) {
    console.error("Error generating brief:", error);
    throw error;
  }
}

app.post("/api/process-pdf", async (req, res) => {
  const { userId, lectureId, fileId } = req.body;
  console.log("Processing request for:", { userId, lectureId, fileId });

  if (!userId || !lectureId || !fileId) {
    return res.status(400).json({
      error: "Missing required parameters: userId, lectureId, or fileId",
    });
  }

  try {
    const flashcards = await processDocument(userId, lectureId, fileId);
    res.status(200).json({ flashcards });
  } catch (error) {
    console.error("Error processing PDF:", error);
    res.status(500).json({ 
      error: "Failed to process the document",
      details: error.message 
    });
  }
});

export async function processDocument(userId, lectureId, fileId) {
  try {
    console.log("Processing document:", { userId, lectureId, fileId });
    
    let extractedText;
    try {
      extractedText = await extractTextFromPDF(userId, lectureId, fileId);
    } catch (extractError) {
      console.error("Text extraction error:", extractError);
      throw extractError;
    }

    if (!extractedText) {
      console.error("No text extracted from PDF");
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
    
    let extractedText;
    try {
      extractedText = await extractTextFromPDF(userId, lectureId, fileId);
    } catch (extractError) {
      console.error("Text extraction error:", extractError);
      throw extractError;
    }

    if (!extractedText) {
      console.error("No text extracted from PDF");
      throw new Error("Failed to extract text from PDF.");
    }

    console.log("Successfully extracted text, generating brief...");
    return await generateBrief(extractedText);
  } catch (error) {
    console.error("Error processing document:", error);
    throw error;
  }
}



app.post("/api/process-brief", async (req, res) => {
  const { userId, lectureId, fileId } = req.body;
  console.log("Processing brief request for:", { userId, lectureId, fileId });

  if (!userId || !lectureId || !fileId) {
    return res.status(400).json({
      error: "Missing required parameters: userId, lectureId, or fileId",
    });
  }

  try {

    const brief = await processBrief(userId, lectureId, fileId);
    console.log(brief)
    res.status(200).json({ brief });

    // try {
    //   extractedText = await extractTextFromPDF(userId, lectureId, fileId);
    // } catch (extractError) {
    //   console.error("Text extraction error:", extractError);
    //   throw extractError;
    // }

    // if (!extractedText) {
    //   console.error("No text extracted from PDF");
    //   throw new Error("Failed to extract text from PDF.");
    // }

    // let brief;
    // try {
    //   brief = await generateBrief(extractedText);
    //   console.log("Generated brief:", brief);
    //   res.status(200).json(brief);
    // } catch (briefGenerationError) {
    //   console.error("Brief generation error:", briefGenerationError);
    //   throw briefGenerationError;
    // }
  } catch (error) {
    console.error("Error processing brief:", error);
    res.status(500).json({ 
      error: "Failed to process the document",
      details: error.message 
    });
  }
});

// Start the server
// Test function to extract text by pages
async function testPDFPageExtraction(userId, lectureId, fileId) {
  try {
    // Check if file exists in Supabase (reusing existing logic)
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

    // Download file from Supabase
    const { data: fileContent, error: fileDownloadError } =
      await supabaseClient.storage
        .from("lecture-files")
        .download(`${userId}/${lectureId}/${fileId}`);

    if (fileDownloadError) {
      throw fileDownloadError;
    }

    // Convert to buffer and parse with page separation
    const pdfBuffer = Buffer.from(await fileContent.arrayBuffer());
    return await parsePagesByPDF(pdfBuffer);
  } catch (error) {
    console.error("Error in PDF page extraction test:", error);
    throw error;
  }
}

function parsePagesByPDF(buffer) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    
    pdfParser.on("pdfParser_dataError", (errData) => {
      console.error("PDF Parsing Error:", errData);
      reject(errData.parserError);
    });

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      const pages = [];

      if (pdfData.Pages) {
        pdfData.Pages.forEach((page, pageIndex) => {
          let pageText = "";
          if (page.Texts) {
            page.Texts.forEach((text) => {
              try {
                const decodedText = decodeURIComponent(text.R[0].T);
                pageText += decodedText + " ";
              } catch (decodeError) {
                console.warn(`Decoding error on page ${pageIndex + 1}:`, decodeError);
              }
            });
          }
          pages.push(pageText.trim());
        });
      }

      console.log("Extracted pages:", pages); // Log the results
      console.log("Total pages:", pages.length);
      resolve(pages);
    });

    pdfParser.parseBuffer(buffer);
  });
}

// Test endpoint
app.post("/api/test-pdf-pages", async (req, res) => {
  const { userId, lectureId, fileId } = req.body;
  console.log("Testing PDF page extraction for:", { userId, lectureId, fileId });

  if (!userId || !lectureId || !fileId) {
    return res.status(400).json({
      error: "Missing required parameters: userId, lectureId, or fileId",
    });
  }

  try {
    const pages = await testPDFPageExtraction(userId, lectureId, fileId);
    res.status(200).json({ pages });
  } catch (error) {
    console.error("Error in test endpoint:", error);
    res.status(500).json({ 
      error: "Failed to process the document",
      details: error.message 
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
