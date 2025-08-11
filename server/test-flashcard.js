import { openai } from "./config/openai.js";
import uniqid from "uniqid";
import { generateFlashcards } from "./services/ai/aiService.js";

// Mock the OpenAI API to return a problematic JSON response
openai.chat.completions.create = async () => {
  // Simulate different problematic responses
  const badResponses = [
    // Missing comma between properties
    `[
      {
        "question": "What is a core principle of KLM"s customer service strategy?"
        "answer": "KLM aims to provide a memorable experience by balancing human connection with digital efficiency."
      },
      {
        "question": "How does the company approach digital transformation?"
        "answer": "Through incremental changes guided by customer feedback, rather than rapid overhauls."
      }
    ]`,

    // Unescaped quotes in the middle of strings
    `[
      {
        "question": "What is John's "best practice" approach to management?",
        "answer": "John recommends a balance between "hands-on guidance" and employee autonomy."
      }
    ]`,

    // Missing comma between objects
    `[
      {
        "question": "What are the main types of cloud services?",
        "answer": "The main types are IaaS, PaaS, and SaaS."
      }
      {
        "question": "What is serverless computing?",
        "answer": "A cloud computing model where the provider manages infrastructure allocation."
      }
    ]`,

    // Completely broken format but with extractable content
    `The flashcards based on the document are:
    
    Question: What is the purpose of a database index?
    Answer: To improve the speed of data retrieval operations in a database.
    
    Question: What is normalization in database design?
    Answer: A process of organizing data to reduce redundancy and improve data integrity.`,
  ];

  // Return a random problematic response
  const randomResponse =
    badResponses[Math.floor(Math.random() * badResponses.length)];
  console.log("Generated mock response:", randomResponse);

  // Simulate the OpenAI response format
  return {
    choices: [
      {
        message: {
          content: randomResponse,
        },
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 200,
      total_tokens: 300,
    },
  };
};

// Test the function with a sample text
async function testFlashcardGeneration() {
  console.log(
    "Testing flashcard generation with problematic JSON responses..."
  );

  try {
    const sampleText =
      "This is a sample text about cloud computing and database design principles.";
    const flashcards = await generateFlashcards(sampleText);

    console.log("\n=== Generated Flashcards ===");
    flashcards.forEach((card, index) => {
      console.log(`\nFlashcard ${index + 1}:`);
      console.log(`Q: ${card.question}`);
      console.log(`A: ${card.answer}`);
    });

    console.log("\n=== Test Summary ===");
    console.log(
      `Successfully generated ${flashcards.length} flashcards despite problematic JSON`
    );

    return flashcards;
  } catch (error) {
    console.error("Test failed:", error);
    return null;
  }
}

// Run the test
testFlashcardGeneration()
  .then(() => {
    console.log("Test completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
