import { generateFlashcards } from "./services/ai/aiService.js";

// Sample text for testing
const sampleText = `
Document Processing API

This API provides functionality to process PDF and PPTX files, extract text from them, and generate AI-powered summaries, flashcards, and quizzes.

Features:
- Multi-format support: Process both PDF and PPTX files
- Text extraction: Extract text from documents by pages/slides
- AI Processing: Generate summaries, flashcards, and quizzes from document content
- Storage Integration: Works with Supabase storage for file management
- Robust Error Handling: Resilient processing with fallbacks for AI response issues

The document processing flow works as follows:
1. Client uploads a file to Supabase storage
2. Client calls the API with user ID, lecture ID, and file ID
3. Server downloads the file from Supabase storage
4. Server detects file type (PDF or PPTX) based on extension
5. Server extracts text from the file using the appropriate parser
6. Server processes the extracted text using AI services
7. Server saves results to the database and returns them to the client
`;

async function runTest() {
  console.log("Testing flashcard generation with real API calls...");
  console.log("Sample text length:", sampleText.length, "characters");

  try {
    console.log("Generating flashcards...");
    const startTime = Date.now();

    const flashcards = await generateFlashcards(sampleText);

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(
      `\n✅ Successfully generated ${
        flashcards.length
      } flashcards in ${duration.toFixed(2)} seconds\n`
    );

    console.log("=== Generated Flashcards ===");
    flashcards.forEach((card, index) => {
      console.log(`\nFlashcard ${index + 1}:`);
      console.log(`Q: ${card.question}`);
      console.log(`A: ${card.answer}`);
    });

    return flashcards;
  } catch (error) {
    console.error("❌ Error generating flashcards:", error);
    return null;
  }
}

// Run the test
runTest()
  .then(() => {
    console.log("\nTest completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nTest failed with error:", error);
    process.exit(1);
  });
