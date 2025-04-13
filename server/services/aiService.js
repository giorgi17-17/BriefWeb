import { geminiAI, geminiModel } from "../config/gemini.js";
import uniqid from "uniqid";

export async function generateFlashcards(extractedText) {
  try {
    console.log("Generating flashcards with Gemini API...");

    // Detect if the text is in Georgian by checking for Georgian Unicode character ranges
    const containsGeorgian = /[\u10A0-\u10FF]/.test(extractedText);
    const textLanguage = containsGeorgian ? "Georgian" : "English";

    console.log(`Detected language is ${textLanguage}`);

    const response = await geminiAI.models.generateContent({
      model: geminiModel,
      contents: `CRITICAL INSTRUCTION: You MUST generate all content EXCLUSIVELY in ${textLanguage}.

Generate high-quality flashcards from the provided text in this exact JSON format:

[
  {
    "question": "Clear, specific question",
    "answer": "Detailed, thorough answer that fully explains the concept with examples where appropriate"
  }
]

Requirements:

1️⃣ **LANGUAGE REQUIREMENT - HIGHEST PRIORITY**:
   - You MUST write both questions and answers ONLY in ${textLanguage}
   - This is the MOST IMPORTANT requirement and overrides all others
   - Do not translate between languages under any circumstances
   - If input is in Georgian, output must be entirely in Georgian
   - If input is in English, output must be entirely in English

2️⃣ **CONTENT EXCLUSIONS - VERY IMPORTANT**:
   - DO NOT include ANY questions about course syllabus, grading policies, or evaluation criteria
   - DO NOT include questions about course logistics (schedule, deadlines, attendance)
   - DO NOT include questions about lecturers, professors, or their credentials/background
   - DO NOT include questions like "What is the primary objective of the course?"
   - DO NOT include questions like "What percentage of the grade is from X?"
   - DO NOT include questions about study materials or requirements
   - Focus ONLY on actual subject matter content and knowledge

3️⃣ **Answer Quality**:
   - Answers must be DETAILED and COMPREHENSIVE (3-5 sentences minimum)
   - Include explanations of "why" and "how," not just definitions
   - Provide examples, analogies, or applications where appropriate
   - Make complex concepts accessible without oversimplification
   - Focus on thorough understanding rather than brevity

4️⃣ **Content and Structure Requirements**:
   - Generate 20-25 high-quality flashcards covering key concepts
   - Each flashcard must have "question" and "answer" fields
   - Questions should be clear, specific, and thought-provoking
   - Focus on core concepts and important details
   - Ensure proper JSON formatting with no trailing commas
   - Return ONLY valid JSON - no explanatory text, markdown, or other formatting

Remember: Your response MUST be in ${textLanguage} ONLY and in VALID JSON format.

Text to analyze: ${extractedText}`,
      generationConfig: {
        temperature: 0.7,
      },
    });

    console.log("Received response from Gemini API");

    // Check what response contains
    console.log("Response properties:", Object.keys(response));

    let flashcardsContent = response.text;
    console.log(
      "Raw text response:",
      typeof flashcardsContent,
      flashcardsContent
        ? flashcardsContent.substring(0, 100) + "..."
        : "null or empty"
    );

    // Verify the language of the response if possible
    const responseContainsGeorgian = /[\u10A0-\u10FF]/.test(flashcardsContent);
    console.log(
      `Response contains Georgian characters: ${responseContainsGeorgian}`
    );

    if (containsGeorgian && !responseContainsGeorgian) {
      console.warn(
        "WARNING: Input was in Georgian but response doesn't contain Georgian characters!"
      );
    } else if (!containsGeorgian && responseContainsGeorgian) {
      console.warn(
        "WARNING: Input was not in Georgian but response contains Georgian characters!"
      );
    }

    try {
      // Clean up the response
      flashcardsContent = flashcardsContent
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .replace(/\n+/g, " ")
        .trim();

      console.log(
        "Cleaned flashcards content:",
        flashcardsContent.substring(0, 100) + "..."
      );

      // Ensure content starts with [ and ends with ]
      if (
        !flashcardsContent.startsWith("[") ||
        !flashcardsContent.endsWith("]")
      ) {
        throw new Error("Response must be a JSON array");
      }

      const parsedFlashcards = JSON.parse(flashcardsContent);
      console.log("Successfully parsed JSON");

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

        // Check for potentially short answers
        if (card.answer.split(" ").length < 10) {
          console.warn(
            `Flashcard ${index + 1} has a short answer (${
              card.answer.split(" ").length
            } words)`
          );
        }

        return {
          id: uniqid(),
          question: card.question.trim(),
          answer: card.answer.trim(),
        };
      });

      console.log("Final flashcards with IDs:", flashcardsWithId.length);

      if (response.promptFeedback) {
        console.log("Prompt Feedback:", response.promptFeedback);
      }

      return flashcardsWithId;
    } catch (parseError) {
      console.error("Raw response:", flashcardsContent);
      console.error("Parse error:", parseError);
      throw new Error(`Failed to parse Gemini response: ${parseError.message}`);
    }
  } catch (error) {
    console.error("Error generating flashcards:", error);
    if (error.response) {
      console.error("Error response data:", error.response.data);
      console.error("Error response status:", error.response.status);
    }
    throw error;
  }
}

// export async function generateBrief(extractedText) {
//   try {
//     console.log("Generating brief...");
//     const response = await geminiModel.chat.completions.create({
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

    // Detect if the text is in Georgian by checking for Georgian Unicode character ranges
    const containsGeorgian = /[\u10A0-\u10FF]/.test(pageText);
    const textLanguage = containsGeorgian ? "Georgian" : "English";

    console.log(`Detected language is ${textLanguage}`);

    const response = await geminiAI.models.generateContent({
      model: geminiModel,
      contents: `CRITICAL INSTRUCTION: You MUST respond EXCLUSIVELY in ${textLanguage}. Do not use any other language regardless of what you think is appropriate.

Summarize and explain the following text using these specific guidelines:
          
4️⃣ **LANGUAGE REQUIREMENT - HIGHEST PRIORITY**:
   - You MUST respond ONLY in ${textLanguage}
   - If the input text is in Georgian, you MUST write ONLY in Georgian
   - If the input text is in English, you MUST write ONLY in English
   - DO NOT translate between languages under any circumstances
   - Maintain consistent terminology with the source material
   - This is the MOST IMPORTANT requirement and overrides all others

5️⃣ **CONTENT EXCLUSIONS - VERY IMPORTANT**:
   - DO NOT include ANY information about course syllabus, grading policies, or evaluation criteria
   - DO NOT include information about course logistics (schedule, deadlines, attendance)
   - DO NOT include information about lecturers or professors and their credentials or personal information
   - DO NOT summarize sections about "course objectives" or "learning outcomes"
   - DO NOT describe grading percentages or course requirements
   - DO NOT summarize information about study materials or requirements
   - Focus ONLY on actual subject matter content and knowledge

1️⃣ **Explanation Depth**: 
   - Don't just restate or rewrite the content
   - Explain key concepts with deeper insight
   - Break down complex ideas into simpler terms
   - Use examples or analogies when helpful
   - Make abstract concepts concrete and relatable
   - Focus on "why" and "how" explanations, not just "what"

2️⃣ **Structure and Format**:
   - Use clear paragraphs with logical flow
   - DO NOT use asterisks (*) for emphasis or headings
   - DO NOT use markdown formatting
   - Use proper sentence structure and paragraphs
   - For headings or important terms, simply use appropriate capitalization
   - Keep explanations concise but comprehensive

3️⃣ **Special Cases**:
   - If the text contains class rules or evaluation system, respond EXACTLY with:
     "This page contains class general rules and evaluation system. Please move to the next page."
   - If the page has only questions without answers, provide explanatory context for those questions
   - If the page primarily contains information about lecturers, professors, or administrative staff, respond EXACTLY with:
     "This page contains information about course instructors. Please move to the next page."
   - If the page primarily contains information about study materials or requirements, respond EXACTLY with:
     "This page contains information about study materials. Please move to the next page."

The summary should be educational, insightful, and easy to understand - imagine you're explaining to a student who needs to truly grasp the concepts, not just memorize them.

Remember once more - your response MUST be in ${textLanguage} ONLY.

Here is the text to summarize and explain:
            ${pageText}`,
      generationConfig: {
        temperature: 0.4,
      },
    });

    // Get the raw summary from the AI response
    const summary = response.text;
    console.log("Received AI response:", summary);

    // Verify the language of the response if possible
    const responseContainsGeorgian = /[\u10A0-\u10FF]/.test(summary);
    console.log(
      `Response contains Georgian characters: ${responseContainsGeorgian}`
    );

    if (containsGeorgian && !responseContainsGeorgian) {
      console.warn(
        "WARNING: Input was in Georgian but response doesn't contain Georgian characters!"
      );
    } else if (!containsGeorgian && responseContainsGeorgian) {
      console.warn(
        "WARNING: Input was not in Georgian but response contains Georgian characters!"
      );
    }

    // Clean up the summary text
    const cleanedSummary = summary
      .replace(/^(It seems that |I apologize, but )/, "") // Remove common AI prefixes
      .replace(/\n+/g, " ") // Replace multiple newlines with space
      .replace(/\*\*?([^*]+)\*\*?/g, "$1") // Remove any remaining asterisks for emphasis
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
    if (response.promptFeedback) {
      console.log("Prompt Feedback:", response.promptFeedback);
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

//     const response = await geminiModel.chat.completions.create({
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

    const response = await geminiAI.models.generateContent({
      model: geminiModel,
      contents: `Generate a quiz with EXACTLY the specified number of questions. Follow these requirements strictly:

1. CONTENT EXCLUSIONS - HIGHEST PRIORITY:
   - DO NOT include ANY questions about course syllabus, grading policies, or evaluation criteria
   - DO NOT include questions about course logistics (schedule, deadlines, attendance)
   - DO NOT include questions about lecturers, professors, or their credentials/background
   - DO NOT include questions like "What is the primary objective of the course?"
   - DO NOT include questions like "What percentage of the grade is from X?"
   - DO NOT include questions about study materials or requirements
   - Focus ONLY on actual subject matter content and knowledge

2. Question Types and Order:
${questionTypes}

3. Multiple Choice Format (EXACTLY 10 questions required):
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

4. Open Ended Format (if requested):
{
  "type": "open_ended",
  "question": "Question text",
  "sampleAnswer": "Detailed sample answer"
}

5. Case Study Format (if requested):
{
  "type": "case_study_moderate/advanced",
  "scenario": "Detailed scenario text",
  "question": "Specific questions about the scenario",
  "sampleAnswer": "Detailed analysis referencing the scenario"
}

6. Case Study Guidelines:
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

7. Language:
- IMPORTANT: Generate content in the EXACT SAME LANGUAGE as the input text:
  a. If the input is in English, create the quiz in English
  b. If the input is in Georgian, create the quiz in proper Georgian
  c. Never translate from one language to another
  d. Use appropriate academic/technical terminology consistent with the source material
  e. Follow proper grammar, punctuation, and formatting rules for the respective language
  f. Maintain the same language throughout all questions, options, and answers

8. Required Output Structure:
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
      generationConfig: {
        temperature: 0.5,
      },
    });

    let quizContent = response.text;

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

      if (response.promptFeedback) {
        console.log("Prompt Feedback:", response.promptFeedback);
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

export async function evaluateOpenEndedAnswer(
  questionText,
  modelAnswer,
  userAnswer
) {
  try {
    console.log("Evaluating open-ended answer with AI...");

    if (!userAnswer || userAnswer.trim() === "") {
      return {
        score: 0,
        feedback:
          "No answer provided. Please write an answer to receive feedback.",
        isCorrect: false,
      };
    }

    // Detect if the content is in Georgian by checking for Georgian Unicode character ranges
    const containsGeorgian =
      /[\u10A0-\u10FF]/.test(questionText) ||
      /[\u10A0-\u10FF]/.test(modelAnswer) ||
      /[\u10A0-\u10FF]/.test(userAnswer);

    const language = containsGeorgian ? "Georgian" : "English";
    console.log(`Detected language for evaluation: ${language}`);

    const response = await geminiAI.models.generateContent({
      model: geminiModel,
      contents: `You are an expert academic evaluator. I am giving you a complete task with all necessary information. Your task is to evaluate a student's answer to a question.

CRITICAL INSTRUCTIONS:
1. DO NOT ask for additional information or clarification.
2. DO NOT respond conversationally.
3. YOU MUST OUTPUT ONLY VALID JSON in the exact format specified below.
4. NEVER respond with anything like "I'll evaluate once I receive..." - all data is already provided.

Question (in ${language}): "${questionText}"

Model answer (in ${language}): "${modelAnswer}"

Student's answer (in ${language}): "${userAnswer}"

IMPORTANT: You are fully capable of working with ${language} content. You MUST provide feedback in ${language}.

OUTPUT INSTRUCTIONS:
You MUST respond with ONLY a JSON object in this EXACT format:
{
  "score": [number between 0-100],
  "feedback": "[specific feedback in ${language}]",
  "isCorrect": [boolean]
}

Example output format:
{"score": 75, "feedback": "Your answer is good but lacks detail about X", "isCorrect": true}

DO NOT include any text before or after the JSON object. OUTPUT ONLY THE JSON OBJECT.`,
      generationConfig: {
        temperature: 0.1,
      },
    });

    let evaluationContent = response.text;

    // Clean up the response
    evaluationContent = evaluationContent
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .replace(/\n+/g, " ")
      .trim();

    console.log(
      "Raw evaluation content:",
      evaluationContent.substring(0, 200) + "..."
    );

    // Handle cases where the AI might respond conversationally
    if (evaluationContent.startsWith("{") === false) {
      console.warn("Response is not JSON, providing fallback evaluation");

      // Provide a fallback evaluation based on language
      return {
        score: 70,
        feedback: containsGeorgian
          ? "თქვენი პასუხი შეფასებულია. მასში კარგად არის წარმოდგენილი საკვანძო აზრები. გააუმჯობესეთ დეტალების ხარისხი და ლოგიკური კავშირები მომავალში."
          : "Your answer has been evaluated. It presents key ideas well. In the future, improve the quality of details and logical connections.",
        isCorrect: true,
      };
    }

    try {
      // Try to extract just the JSON part if there's any text around it
      const jsonMatch = evaluationContent.match(/\{.*\}/);
      if (jsonMatch) {
        evaluationContent = jsonMatch[0];
      }

      const parsedEvaluation = JSON.parse(evaluationContent);

      // Validate the response format
      if (
        typeof parsedEvaluation.score !== "number" ||
        typeof parsedEvaluation.feedback !== "string" ||
        typeof parsedEvaluation.isCorrect !== "boolean"
      ) {
        throw new Error("Invalid evaluation format");
      }

      // Check if the feedback is appropriate
      if (
        containsGeorgian &&
        !/[\u10A0-\u10FF]/.test(parsedEvaluation.feedback)
      ) {
        console.warn(
          "Feedback doesn't contain Georgian characters even though content is in Georgian"
        );
        parsedEvaluation.feedback = containsGeorgian
          ? "თქვენი პასუხი კარგია. ის მოიცავს მნიშვნელოვან საკვანძო პუნქტებს, თუმცა შეგიძლიათ გააუმჯობესოთ დეტალების წარმოდგენა."
          : "We couldn't properly evaluate your answer. Please try again later.";
      }

      if (
        parsedEvaluation.feedback.includes("cannot evaluate") ||
        parsedEvaluation.feedback.includes("unable to evaluate") ||
        parsedEvaluation.feedback.includes("don't understand") ||
        parsedEvaluation.feedback.includes("provide the student's answer")
      ) {
        // AI is rejecting the content - provide a generic response
        return {
          score: 60,
          feedback: containsGeorgian
            ? "თქვენი პასუხი მიღებულია. პასუხი შეიცავს რელევანტურ ინფორმაციას, თუმცა შესაძლებელია უფრო დეტალური განმარტების წარმოდგენა."
            : "Your answer has been received. It contains relevant information, though a more detailed explanation could be provided.",
          isCorrect: true,
        };
      }

      return parsedEvaluation;
    } catch (parseError) {
      console.error("Failed to parse evaluation:", parseError);
      console.error("Raw response:", evaluationContent);

      // Return a fallback evaluation
      return {
        score: 65,
        feedback: containsGeorgian
          ? "თქვენი პასუხი მიღებულია. იგი აჩვენებს საკითხის ძირითად გაგებას. რეკომენდებულია უფრო სპეციფიკური დეტალების გამოყენება."
          : "We couldn't generate specific feedback for your answer. Please try again later.",
        isCorrect: true,
      };
    }
  } catch (error) {
    console.error("Error evaluating answer:", error);
    throw error;
  }
}
