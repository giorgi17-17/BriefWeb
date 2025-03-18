import { openai } from "../config/openai.js";
import uniqid from "uniqid";

export async function generateFlashcards(extractedText) {
  try {
    console.log("Generating flashcards...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an advanced AI educational content specialist focused on creating high-quality, concise, and academically rigorous flashcards. Your goal is to extract the most important and meaningful information from the source material, ensuring each flashcard is precise, clear, and facilitates effective learning. Prioritize depth of understanding over rote memorization.",
        },
        {
          role: "user",
          content: `Create 30 high-quality, educational flashcards from the provided text. Follow these precise guidelines:
        
        1. Extraction Criteria:
        - Focus on core concepts, key definitions, critical principles
        - Capture important relationships and underlying mechanisms
        - Include conceptual, analytical, and application-based questions
        
        2. Flashcard Quality Requirements:
        - Questions must be clear, unambiguous, and directly answerable
        - Answers should be concise yet comprehensive
        - Avoid overly complex or trick questions
        - Ensure factual accuracy and academic rigor
        
        3. Formatting Specifications:
        - Generate EXACTLY 30 flashcards
        - Return ONLY a valid JSON array
        - Each object must have "question" and "answer" keys
        - No additional text, markdown, or explanatory content

        **Class Rules & Evaluation System**: If the text contains general class rules or an evaluation system, **do not include them** in the flashcards.
        
        4. Recommended Question Types:
        - Definitional
        - Comparative
        - Cause-and-effect
        - Application scenarios
        - Analytical reasoning
          Required format:
       [
         {
           "question": "Question text",
           "answer": "Answer text"
         }
       ]
        
        Text to analyze: ${extractedText}`,
        },
      ],
    });

    let briefContent = response.choices[0].message.content;

    // Clean up the response if it contains markdown or extra text
    try {
      // Remove markdown code fences if present
      briefContent = briefContent
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "");

      // Trim whitespace
      briefContent = briefContent.trim();

      // Ensure content starts with [ and ends with ]
      if (!briefContent.startsWith("[") || !briefContent.endsWith("]")) {
        throw new Error("Invalid JSON format");
      }

      const parsedFlashcards = JSON.parse(briefContent);

      // Validate the structure
      if (!Array.isArray(parsedFlashcards)) {
        throw new Error("Response is not an array");
      }

      const flashcardsWithId = parsedFlashcards.map((card) => {
        if (!card.question || !card.answer) {
          throw new Error("Invalid flashcard format");
        }
        return {
          id: uniqid(),
          question: card.question,
          answer: card.answer,
        };
      });

      if (response.usage) {
        console.log("Token Usage:", {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        });
      }

      return flashcardsWithId;
    } catch (parseError) {
      console.error("Raw response:", briefContent);
      console.error("Parse error:", parseError);
      throw new Error(`Failed to parse GPT response: ${parseError.message}`);
    }
  } catch (error) {
    console.error("Error generating flashcards:", error);
    throw error;
  }
}

// export async function generateBrief(extractedText) {
//   try {
//     console.log("Generating brief...");
//     const response = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         {
//           role: "system",
//           content:
//             "You are an expert educational content creator specializing in concise, informative briefs. Return ONLY raw JSON without any markdown formatting, code blocks, or additional text.",
//         },
//         {
//           role: "user",
//           content: `Generate a comprehensive brief from the following text. Return ONLY a JSON object without any markdown formatting or explanation.

//           Required format:
//           {
//             "key_concepts": ["List 5-7 key concepts from the text"],
//             "summary": "Write a clear, concise 2-3 paragraph summary of the main points",
//             "important_details": ["List 5-7 important supporting details or examples"]
//           }

//           Text to analyze: ${extractedText}`,
//         },
//       ],
//     });

//     let briefContent = response.choices[0].message.content;

//     try {
//       // Remove markdown code fences if present
//       briefContent = briefContent
//         .replace(/```json\n?/g, "")
//         .replace(/```\n?/g, "");

//       // Trim whitespace
//       briefContent = briefContent.trim();

//       const parsedBrief = JSON.parse(briefContent);

//       // Validate the structure
//       if (
//         !parsedBrief.key_concepts ||
//         !Array.isArray(parsedBrief.key_concepts) ||
//         !parsedBrief.summary ||
//         typeof parsedBrief.summary !== "string" ||
//         !parsedBrief.important_details ||
//         !Array.isArray(parsedBrief.important_details)
//       ) {
//         throw new Error("Invalid brief format");
//       }

//       if (response.usage) {
//         console.log("Token Usage:", {
//           promptTokens: response.usage.prompt_tokens,
//           completionTokens: response.usage.completion_tokens,
//           totalTokens: response.usage.total_tokens,
//         });
//       }

//       return parsedBrief;
//     } catch (parseError) {
//       console.error("Raw response:", briefContent);
//       console.error("Parse error:", parseError);
//       throw new Error(`Failed to parse GPT response: ${parseError.message}`);
//     }
//   } catch (error) {
//     console.error("Error generating brief:", error);
//     throw error;
//   }
// }

// services/aiService.js

export async function generateBrief(pageText) {
  console.log("page text", pageText);
  try {
    console.log("Generating brief with text length:", pageText.length);
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert in summarizing academic content for students. Your task is to generate structured, easy-to-understand summaries that focus on key points and main ideas while maintaining a balanced length. The summaries must be clear, concise, and student-friendly.",
        },
        {
          role: "user",
          content: `Summarize the following text while following these specific rules:
            
            1️⃣ **General Summarization**: Extract the most important information from the text. The summary should be **mid-length**—not too short, but also not overly detailed. Keep it clear and easy to understand.
            
            2️⃣ **Class Rules & Evaluation System**: If the text contains general class rules or an evaluation system, **do not summarize**. Instead, return this exact response:  
               This page contains class general rules and evaluation system. Please move to the next page.
            
            3️⃣ **Unanswered Questions**: If the page consists of **only questions without answers**, rewrite them in an explanatory way so that students can understand their context. Do not simply list them.
      
            🔹 Ensure that the summary is **structured, concise, and useful for students**.
      
            Here is the text to summarize:
            ${pageText}`,
        },
      ],
    });

    // Get the raw summary from the AI response
    const summary = response.choices[0].message.content;
    console.log("Received AI response:", summary);

    // Clean up the summary text
    const cleanedSummary = summary
      .replace(/^(It seems that |I apologize, but )/, "") // Remove common AI prefixes
      .replace(/\n+/g, " ") // Replace multiple newlines with space
      .trim();

    if (!cleanedSummary || cleanedSummary.includes("no content provided")) {
      throw new Error("Invalid or empty content for summarization");
    }

    // Create a structured brief object
    const brief = {
      key_concepts: [], // We'll leave this empty as we're focusing on the summary
      summary: cleanedSummary,
      important_details: [], // We'll leave this empty as we're focusing on the summary
    };

    console.log("Generated brief:", brief);
    if (response.usage) {
      console.log("Token Usage:", {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      });
    }
    return brief;
  } catch (error) {
    console.error("Error generating brief:", error);
    console.error("Error details:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw new Error(`Failed to generate brief: ${error.message}`);
  }
}

// export async function generateDocumentOverview(allPageBriefs) {
//   try {
//     console.log("Generating document overview...");

//     // Create safe, condensed briefs.
//     const condensedBriefs = allPageBriefs.map((brief) => ({
//       pageNumber: brief.pageNumber,
//       mainTopics: brief.mainTopics.slice(0, 3), // Limit the size of the array.
//       summary: brief.summary.substring(0, 500), // Limit the text length.
//     }));

//     // Stringify with sanitization.
//     const safeBriefs = JSON.stringify(condensedBriefs)
//       .replace(/[\u0000-\u001F]/g, "")
//       .substring(0, 8000); // Stay within token limits.

//     const response = await openai.chat.completions.create({
//       model: "gpt-4",
//       response_format: { type: "json_object" },
//       messages: [
//         {
//           role: "system",
//           content: "You are an expert information synthesizer. Respond in VALID JSON only.",
//         },
//         {
//           role: "user",
//           content: `Create a document overview from these page analyses: ${safeBriefs}`,
//         },
//       ],
//     });
//     // Use the validation helper (assumed to be defined elsewhere).
//     return validateJSON(response.choices[0].message.content);
//   } catch (error) {
//     console.error("Error generating overview:", error);
//     throw new Error(`Document overview failed: ${error.message}`);
//   }
// }

export async function generateQuiz(pdfText, options = {}) {
  const quizOptions = {
    includeMultipleChoice: true,
    includeOpenEnded: true,
    includeCaseStudies: true,
    ...options,
  };

  // Determine number of questions based on selected types
  let promptQuestions = [];

  if (quizOptions.includeMultipleChoice) {
    promptQuestions.push("10 multiple-choice questions with 4 options each");
  }

  if (quizOptions.includeOpenEnded) {
    promptQuestions.push("3 open-ended questions with sample answers");
  }

  if (quizOptions.includeCaseStudies) {
    promptQuestions.push(
      "2 case study questions (1 moderate difficulty, 1 advanced difficulty) with sample answers"
    );
  }

  // Create a string describing the questions to generate
  const questionTypes = promptQuestions.join(", ");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `You are an expert educational assessment creator specializing in creating comprehensive assessments from educational materials. 
          
Your task is to create a balanced assessment containing ${questionTypes} based on the provided PDF text.

IMPORTANT FORMATTING INSTRUCTIONS:
1. DO NOT use markdown formatting in your responses - no asterisks (*), underscores (_), hashtags (#), or other markdown symbols.
2. Use plain text for all content.
3. Format case studies as clear paragraphs separated by double line breaks.
4. For emphasis, use capitalization or simply state "Important:" before key points.
5. Number all questions sequentially regardless of type.


**Class Rules & Evaluation System**: If the text contains general class rules or an evaluation system, **do not include them**

For multiple-choice questions:
- Create challenging questions that test comprehension, application, and analysis.
- Ensure one option is clearly correct, while others are plausible but incorrect.
- Vary the position of the correct answer.
- Cover key concepts from throughout the material.

For open-ended questions:
- Create questions that require critical thinking and synthesis of multiple concepts.
- Provide comprehensive sample answers (150-200 words) that demonstrate depth of understanding.

For case study questions:
- Create one moderate difficulty case study focusing on application of concepts.
- Create one advanced difficulty case study requiring analysis and evaluation of complex scenarios.
- Each case study should present a realistic scenario related to the material.
- Case studies should be detailed (250-300 words) with clear questions.
- Provide thorough sample answers (250-350 words) that demonstrate expert analysis.

Your response must be a valid JSON object with the following format:
{
  "multipleChoice": [
    {
      "question": "Question text",
      "options": [
        {"text": "Option 1", "correct": false},
        {"text": "Option 2", "correct": true},
        {"text": "Option 3", "correct": false},
        {"text": "Option 4", "correct": false}
      ],
      "explanation": "Explanation of the correct answer"
    }
  ],
  "openEnded": [
    {
      "question": "Question text",
      "sampleAnswer": "Detailed sample answer"
    }
  ],
  "caseStudies": [
    {
      "scenario": "Detailed case description",
      "question": "Question related to the case",
      "difficulty": "moderate",
      "sampleAnswer": "Detailed expert analysis"
    },
    {
      "scenario": "Detailed case description",
      "question": "Question related to the case",
      "difficulty": "advanced",
      "sampleAnswer": "Detailed expert analysis"
    }
  ]
}

Only include the question types specified in the request. Ensure the JSON is valid with no trailing commas.`,
        },
        {
          role: "user",
          content: `Create a quiz based on the following content: \n\n${pdfText.substring(
            0,
            Math.min(pdfText.length, 15000)
          )}`,
        },
      ],
      max_tokens: 4000,
    });

    const response = completion.choices[0].message.content.trim();

    // Add logging for token usage
    console.log(
      `Quiz generation tokens: ${
        completion.usage?.total_tokens || "N/A"
      } tokens used`
    );

    try {
      // Extract JSON from the response if it contains additional text
      const jsonMatch =
        response.match(/```json\n([\s\S]*)\n```/) ||
        response.match(/{[\s\S]*}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response;

      // Parse JSON and validate the structure
      const quizData = JSON.parse(jsonStr.replace(/```json\n|```/g, ""));

      // Only include the question types that were selected
      const filteredQuiz = {};

      if (quizOptions.includeMultipleChoice && quizData.multipleChoice) {
        filteredQuiz.multipleChoice = quizData.multipleChoice;
      }

      if (quizOptions.includeOpenEnded && quizData.openEnded) {
        filteredQuiz.openEnded = quizData.openEnded;
      }

      if (quizOptions.includeCaseStudies && quizData.caseStudies) {
        filteredQuiz.caseStudies = quizData.caseStudies;
      }

      return filteredQuiz;
    } catch (error) {
      console.error("Error parsing quiz data:", error);
      throw new Error("Failed to parse quiz data from AI response");
    }
  } catch (error) {
    console.error("Error in quiz generation:", error);
    throw error;
  }
}
