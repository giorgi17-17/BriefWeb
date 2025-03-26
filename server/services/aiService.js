import { openai } from "../config/openai.js";
import uniqid from "uniqid";

export async function generateFlashcards(extractedText) {
  try {
    console.log("Generating flashcards...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You are an expert educational content creator. Your task is to generate quality flashcards in VALID JSON format only. Focus on creating as many good flashcards as possible from the content provided. Never include explanatory text or markdown formatting. IMPORTANT: You must generate content in the EXACT SAME LANGUAGE as the input text. If the input is in English, generate flashcards in English. If the input is in Georgian, maintain the Georgian language with perfect grammar, correct spelling, and proper sentence structure according to Georgian language rules. Pay special attention to Georgian verb conjugation, case endings, and technical terminology.",
        },
        {
          role: "user",
          content: `Generate high-quality flashcards from the provided text. Return ONLY a JSON array in this exact format:

[
  {
    "question": "Clear, specific question",
    "answer": "Concise, accurate answer"
  }
]

Requirements:
1. Generate as many quality flashcards as possible, aim for 25-30 cards
2. Each flashcard must have "question" and "answer" fields
3. Questions must be clear and specific
4. Answers must be concise but complete
5. Return ONLY the JSON array - no other text
6. Do not include class rules or evaluation criteria
7. Focus on core concepts and key information
8. Ensure proper JSON formatting with no trailing commas
9. IMPORTANT: Generate flashcards in the EXACT SAME LANGUAGE as the input text:
   a. If the input is in English, create flashcards in English
   b. If the input is in Georgian, create flashcards in proper Georgian with correct spelling and grammar
   c. Never translate from one language to another
   d. Maintain consistent language and terminology with the source material

Text to analyze: ${extractedText}`,
        },
      ],
    });

    let flashcardsContent = response.choices[0].message.content;

    try {
      // Clean up the response
      flashcardsContent = flashcardsContent
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .replace(/\n+/g, " ")
        .trim();

      // Ensure content starts with [ and ends with ]
      if (
        !flashcardsContent.startsWith("[") ||
        !flashcardsContent.endsWith("]")
      ) {
        throw new Error("Response must be a JSON array");
      }

      const parsedFlashcards = JSON.parse(flashcardsContent);

      // Validate array and length
      if (!Array.isArray(parsedFlashcards)) {
        throw new Error("Response must be an array");
      }

      // Accept any number of flashcards
      if (parsedFlashcards.length === 0) {
        throw new Error("No flashcards were generated");
      }

      console.log(`Generated ${parsedFlashcards.length} flashcards`);

      // Validate and transform each flashcard
      const flashcardsWithId = parsedFlashcards.map((card, index) => {
        if (!card.question || typeof card.question !== "string") {
          throw new Error(`Invalid question in flashcard ${index + 1}`);
        }
        if (!card.answer || typeof card.answer !== "string") {
          throw new Error(`Invalid answer in flashcard ${index + 1}`);
        }

        return {
          id: uniqid(),
          question: card.question.trim(),
          answer: card.answer.trim(),
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
      console.error("Raw response:", flashcardsContent);
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
            "You are an expert in summarizing academic content for students. Your task is to generate structured, easy-to-understand summaries that focus on key points and main ideas while maintaining a balanced length. The summaries must be clear, concise, and student-friendly. IMPORTANT: You must generate content in the EXACT SAME LANGUAGE as the input text. If the input is in English, generate the summary in English. If the input is in Georgian, maintain the Georgian language with perfect grammar, correct spelling, and proper sentence structure according to Georgian language rules. Pay special attention to Georgian verb conjugation, case endings, and technical terminology.",
        },
        {
          role: "user",
          content: `Summarize the following text while following these specific rules:
            
            1️⃣ **General Summarization**: Extract the most important information from the text. The summary should be **mid-length**—not too short, but also not overly detailed. Keep it clear and easy to understand.
            
            2️⃣ **Class Rules & Evaluation System**: If the text contains general class rules or an evaluation system, **do not summarize**. Instead, return this exact response:  
               This page contains class general rules and evaluation system. Please move to the next page.
            
            3️⃣ **Unanswered Questions**: If the page consists of **only questions without answers**, rewrite them in an explanatory way so that students can understand their context. Do not simply list them.
      
            4️⃣ **Language**: IMPORTANT: Generate content in the EXACT SAME LANGUAGE as the input text:
               a. If the input is in English, create the summary in English
               b. If the input is in Georgian, maintain the Georgian language with correct grammar and spelling
               c. Never translate from one language to another
               d. Maintain consistent language and terminology with the source material
            
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

export async function generateQuiz(extractedText, quizOptions = {}) {
  try {
    console.log("Generating quiz with options:", quizOptions);

    // Default to all question types if none specified
    const includeMultipleChoice = quizOptions.includeMultipleChoice !== false;
    const includeOpenEnded = quizOptions.includeOpenEnded !== false;
    const includeCaseStudies = quizOptions.includeCaseStudies !== false;

    // Build the question types string
    let questionTypes = "";
    if (includeMultipleChoice) {
      questionTypes += `- FIRST: Generate EXACTLY 10 multiple choice questions. Each question MUST have:
  * Exactly 4 options labeled a, b, c, d
  * Exactly ONE correct answer marked with "correct": true
  * All other options marked with "correct": false
  * Clear, specific question text\n`;
    }
    if (includeOpenEnded) {
      questionTypes += "- SECOND: Generate exactly 3 open-ended questions\n";
    }
    if (includeCaseStudies) {
      questionTypes += `- THIRD: Generate exactly 2 case study questions (1 moderate, 1 advanced)\n`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content:
            "You are an expert educational quiz generator. Your primary task is to generate EXACTLY the number of questions requested for each type, no more and no less. For multiple choice questions, you MUST provide exactly 4 options with exactly one correct answer. IMPORTANT: You must generate content in the EXACT SAME LANGUAGE as the input text. If the input is in English, generate the quiz in English. If the input is in Georgian, maintain the Georgian language with perfect grammar, correct spelling, and proper sentence structure according to Georgian language rules. Pay special attention to Georgian verb conjugation, case endings, and technical terminology.",
        },
        {
          role: "user",
          content: `Generate a quiz with EXACTLY the specified number of questions. Follow these requirements strictly:

1. Question Types and Order:
${questionTypes}

2. Multiple Choice Format (EXACTLY 10 questions required):
{
  "type": "multiple_choice",
  "question": "Clear question text",
  "options": [
    {"id": "a", "text": "First option", "correct": true},
    {"id": "b", "text": "Second option", "correct": false},
    {"id": "c", "text": "Third option", "correct": false},
    {"id": "d", "text": "Fourth option", "correct": false}
  ]
}

3. Open Ended Format (if requested):
{
  "type": "open_ended",
  "question": "Question text",
  "sampleAnswer": "Detailed sample answer"
}

4. Case Study Format (if requested):
{
  "type": "case_study_moderate/advanced",
  "scenario": "Detailed scenario text",
  "question": "Specific questions about the scenario",
  "sampleAnswer": "Detailed analysis referencing the scenario"
}

5. Case Study Guidelines:
- Make scenarios detailed and specific
- Include actual data and metrics
- Provide clear context and background
- Present concrete challenges
- Ensure questions reference specific elements
- Avoid vague or generic questions
- Make sample answers reference actual details
- Focus on practical application
- Include multiple perspectives
- Address real-world challenges

6. Language:
- IMPORTANT: Generate content in the EXACT SAME LANGUAGE as the input text:
  a. If the input is in English, create the quiz in English
  b. If the input is in Georgian, create the quiz in proper Georgian
  c. Never translate from one language to another
  d. Use appropriate academic/technical terminology consistent with the source material
  e. Follow proper grammar, punctuation, and formatting rules for the respective language
  f. Maintain the same language throughout all questions, options, and answers

7. Required Output Structure:
{
  "success": true,
  "questions": [
    // EXACTLY 10 multiple choice questions if requested
    // EXACTLY 3 open ended questions if requested
    // EXACTLY 2 case studies if requested
  ]
}

IMPORTANT: You MUST generate EXACTLY the number of questions specified for each type. No more, no less.

Text to analyze: ${extractedText}`,
        },
      ],
    });

    let quizContent = response.choices[0].message.content;

    try {
      // Clean up the response
      quizContent = quizContent
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      // Ensure content starts with { and ends with }
      if (!quizContent.startsWith("{") || !quizContent.endsWith("}")) {
        throw new Error("Invalid JSON format");
      }

      const parsedQuiz = JSON.parse(quizContent);

      // Validate the structure
      if (!parsedQuiz.success || !Array.isArray(parsedQuiz.questions)) {
        throw new Error("Invalid quiz format");
      }

      // Count questions by type
      const counts = {
        multiple_choice: 0,
        open_ended: 0,
        case_study_moderate: 0,
        case_study_advanced: 0,
      };

      // First pass: validate and count questions
      parsedQuiz.questions.forEach((question) => {
        if (!question.id) {
          question.id = uniqid();
        }

        if (question.type === "multiple_choice") {
          if (
            !Array.isArray(question.options) ||
            question.options.length !== 4
          ) {
            throw new Error(
              `Question "${question.question}" must have exactly 4 options`
            );
          }

          const correctOptions = question.options.filter(
            (opt) => opt.correct === true
          );
          if (correctOptions.length !== 1) {
            throw new Error(
              `Question "${question.question}" must have exactly 1 correct answer`
            );
          }

          question.options.forEach((option, index) => {
            if (
              !option.id ||
              !option.text ||
              typeof option.correct !== "boolean"
            ) {
              throw new Error(
                `Invalid option format in question "${question.question}"`
              );
            }
            option.id = ["a", "b", "c", "d"][index];
          });

          counts.multiple_choice++;
        } else if (question.type === "open_ended") {
          if (!question.sampleAnswer) {
            throw new Error(
              `Open ended question "${question.question}" must have a sample answer`
            );
          }
          counts.open_ended++;
        } else if (question.type === "case_study_moderate") {
          counts.case_study_moderate++;
        } else if (question.type === "case_study_advanced") {
          counts.case_study_advanced++;
        }
      });

      // Validate counts
      if (
        includeMultipleChoice &&
        (counts.multiple_choice < 8 || counts.multiple_choice > 12)
      ) {
        throw new Error(
          `Must have 8-12 multiple choice questions, got ${counts.multiple_choice}`
        );
      }
      if (includeOpenEnded && counts.open_ended !== 3) {
        throw new Error(
          `Must have exactly 3 open-ended questions, got ${counts.open_ended}`
        );
      }
      if (
        includeCaseStudies &&
        (counts.case_study_moderate !== 1 || counts.case_study_advanced !== 1)
      ) {
        throw new Error(
          `Must have exactly 1 moderate and 1 advanced case study`
        );
      }

      // Sort questions by type
      parsedQuiz.questions.sort((a, b) => {
        const order = {
          multiple_choice: 1,
          open_ended: 2,
          case_study_moderate: 3,
          case_study_advanced: 4,
        };
        return order[a.type] - order[b.type];
      });

      if (response.usage) {
        console.log("Token Usage:", {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        });
      }

      return parsedQuiz;
    } catch (parseError) {
      console.error("Raw response:", quizContent);
      console.error("Parse error:", parseError);
      throw new Error(
        `Failed to parse quiz data from AI response: ${parseError.message}`
      );
    }
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw error;
  }
}
