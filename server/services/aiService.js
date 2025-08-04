import { geminiAI, geminiModel } from "../config/gemini.js";
import uniqid from "uniqid";

// Token usage monitoring and optimization
function estimateTokenUsage(text, promptTemplate = "") {
  // Rough estimation: 1 token ≈ 4 characters for English, 2 characters for Georgian
  const containsGeorgian = /[\u10A0-\u10FF]/.test(text);
  const charToTokenRatio = containsGeorgian ? 2 : 4;

  const textTokens = Math.ceil(text.length / charToTokenRatio);
  const promptTokens = Math.ceil(promptTemplate.length / charToTokenRatio);

  // Estimate response tokens (typically 1/3 of input for summaries)
  const estimatedResponseTokens = Math.ceil(textTokens * 0.3);

  const totalTokens = textTokens + promptTokens + estimatedResponseTokens;

  console.log(`Token estimation:`, {
    textLength: text.length,
    textTokens,
    promptTokens,
    estimatedResponseTokens,
    totalTokens,
    language: containsGeorgian ? "Georgian" : "English",
  });

  return {
    textTokens,
    promptTokens,
    estimatedResponseTokens,
    totalTokens,
    costEstimate: (totalTokens / 1000) * 0.0005, // Rough cost estimate in USD
  };
}

// Configuration for optimization strategy
const OPTIMIZATION_CONFIG = {
  // Always use multi-page optimization (even for single pages)
  MIN_PAGES_FOR_OPTIMIZATION: 1,
  // Maximum total content size for single call (in characters)
  MAX_CONTENT_SIZE_FOR_SINGLE_CALL: 50000,
  // Maximum number of pages for single call
  MAX_PAGES_FOR_SINGLE_CALL: 20,
  // Enable token monitoring
  ENABLE_TOKEN_MONITORING: true,
};

function shouldUseMultiPageOptimization(pages) {
  const validPages = pages.filter((page) => page.trim().length > 0);
  const totalContentSize = validPages.reduce(
    (sum, page) => sum + page.length,
    0
  );

  return (
    validPages.length >= OPTIMIZATION_CONFIG.MIN_PAGES_FOR_OPTIMIZATION &&
    totalContentSize <= OPTIMIZATION_CONFIG.MAX_CONTENT_SIZE_FOR_SINGLE_CALL &&
    validPages.length <= OPTIMIZATION_CONFIG.MAX_PAGES_FOR_SINGLE_CALL
  );
}

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
    "question": "Brief, specific question (max 15 words)",
    "answer": "Concise answer (2-3 sentences, max 50 words)"
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

3️⃣ **Question Quality**:
   - Keep questions CONCISE - max 15 words
   - Create FOCUSED questions that target specific concepts, definitions, or examples
   - Avoid broad, open-ended questions like "Explain the importance of X"
   - Instead use precise questions like "What is X?" or "How does X affect Y?"
   - Questions should be direct and specific
   - Use simple language and clear wording

4️⃣ **Answer Quality**:
   - Keep answers BRIEF and TARGETED - 2-3 sentences maximum, around 50 words
   - Provide clear, direct answers that focus on the essential information
   - Include just enough context for understanding
   - Omit supplementary details that aren't crucial
   - Focus on accuracy and clarity over comprehensiveness
   - Include only the most important examples if needed

5️⃣ **Content and Structure Requirements**:
   - Generate 25-35 high-quality, focused flashcards
   - Each flashcard must have "question" and "answer" fields
   - Ensure proper JSON formatting with no trailing commas
   - Return ONLY valid JSON - no explanatory text, markdown, or other formatting
   - Cover a variety of key concepts from the text

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

        // Check for potentially long questions or answers
        if (card.question.split(" ").length > 15) {
          console.warn(
            `Flashcard ${index + 1} has a long question (${
              card.question.split(" ").length
            } words)`
          );
        }

        if (card.answer.split(" ").length > 50) {
          console.warn(
            `Flashcard ${index + 1} has a long answer (${
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

3. CRITICAL - JSON FORMATTING:
   - Your response MUST be properly formatted JSON with no errors
   - Check that all quotes, braces, brackets, and commas are correctly placed
   - Ensure special characters in ${
     includeOpenEnded || includeCaseStudies
       ? "questions, answers, and scenarios"
       : "questions and answers"
   } are properly escaped
   - Avoid using quotation marks within text unless properly escaped with backslash (\\")
   - DO NOT include any control characters, tabs, or non-printable characters
   - Use only plain text in your responses - no formatting, links, or special characters
   - Double-check the JSON structure before finalizing your response

4. Multiple Choice Format (EXACTLY 10 questions required):
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

5. Open Ended Format (if requested):
{
  "type": "open_ended",
  "question": "Question text",
  "sampleAnswer": "Detailed sample answer"
}

6. Case Study Format (if requested):
{
  "type": "case_study_moderate/advanced",
  "scenario": "Detailed scenario text",
  "question": "Specific questions about the scenario",
  "sampleAnswer": "Detailed analysis referencing the scenario"
}

7. Case Study Guidelines:
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

8. Language:
- IMPORTANT: Generate content in the EXACT SAME LANGUAGE as the input text:
  a. If the input is in English, create the quiz in English
  b. If the input is in Georgian, create the quiz in proper Georgian
  c. Never translate from one language to another
  d. Use appropriate academic/technical terminology consistent with the source material
  e. Follow proper grammar, punctuation, and formatting rules for the respective language
  f. Maintain the same language throughout all questions, options, and answers

9. Required Output Structure:
{
  "success": true,
  "questions": [
    // EXACTLY 10 multiple choice questions if requested
    // EXACTLY 3 open ended questions if requested
    // EXACTLY 2 case studies if requested
  ]
}

IMPORTANT: Output ONLY valid JSON with no code fences, no additional text before or after the JSON, and must be properly formatted.

Text to analyze: ${extractedText}`,
      generationConfig: {
        temperature: 0.4, // Lower temperature for more predictable output
      },
    });

    let quizContent = response.text;
    console.log("Raw quiz content length:", quizContent.length);
    console.log("Quiz content preview:", quizContent.substring(0, 200) + "...");

    try {
      // Comprehensive pre-sanitization to remove all problematic characters before parsing
      // First, clean up the response - strip code fences, markdowns
      quizContent = quizContent
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();

      // Ensure content starts with { and ends with }
      if (!quizContent.startsWith("{") || !quizContent.endsWith("}")) {
        console.error(
          "Invalid JSON format - doesn't start with { or end with }"
        );

        // Try to find JSON object within the text
        const jsonMatch = quizContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          quizContent = jsonMatch[0];
          console.log("Extracted JSON object from response");
        } else {
          throw new Error("Invalid JSON format - couldn't extract JSON object");
        }
      }

      // Thorough sanitization - remove ALL control characters and fix common issues
      quizContent = quizContent
        // Remove ALL control characters (including non-printable characters)
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
        // Fix common newline issues
        .replace(/\r\n/g, "\n")
        // Replace all types of quotes with straight quotes
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        // Remove any BOM or other invisible markers
        .replace(/^\uFEFF/, "")
        // Fix backslash escaping
        .replace(/\\\\/g, "\\");

      // More aggressive escaping of quotes inside field values
      quizContent = quizContent.replace(
        /"([^"]*)":/g,
        (match, p1) => `"${p1.replace(/"/g, '\\"')}":` // Escape quotes in property names
      );
      quizContent = quizContent.replace(
        /: ?"([^"]*)"/g,
        (match, p1) => `: "${p1.replace(/"/g, '\\"')}"` // Escape quotes in values
      );

      // Try parsing the JSON
      let parsedQuiz;
      try {
        parsedQuiz = JSON.parse(quizContent);
      } catch (initialParseError) {
        console.error("Initial JSON parse error:", initialParseError);
        console.error("Error position:", initialParseError.message);

        // Extract error position
        const errorMatch = initialParseError.message.match(/position (\d+)/);
        if (errorMatch && errorMatch[1]) {
          const errorPos = parseInt(errorMatch[1]);
          console.error(
            "Error context:",
            quizContent.substring(Math.max(0, errorPos - 50), errorPos + 50)
          );

          // More aggressive cleanup at error position
          const beforeError = quizContent.substring(0, errorPos);
          const afterError = quizContent.substring(errorPos);

          // Handle specific error types
          if (initialParseError.message.includes("control character")) {
            // For control character errors, completely sanitize the entire JSON
            quizContent = quizContent.replace(/[^\x20-\x7E]/g, "");

            // Try one more time with a complete character-by-character rebuild
            let cleanJSON = "";
            for (let i = 0; i < quizContent.length; i++) {
              const char = quizContent.charAt(i);
              // Only include printable ASCII characters
              if (/[\x20-\x7E]/.test(char)) {
                cleanJSON += char;
              }
            }
            quizContent = cleanJSON;
          } else if (initialParseError.message.includes("Expected")) {
            // Structure issues - try to correct JSON structure
            if (initialParseError.message.includes("Expected ','")) {
              quizContent = beforeError + "," + afterError;
            } else if (initialParseError.message.includes("Expected '}'")) {
              quizContent = beforeError + "}" + afterError;
            } else if (
              initialParseError.message.includes("Expected property name")
            ) {
              quizContent = beforeError + '"fixed_property": null' + afterError;
            }
          } else if (afterError.startsWith('"') && beforeError.endsWith('"')) {
            // Likely an unescaped quote - replace it
            quizContent = beforeError + '\\"' + afterError.substring(1);
          } else if (initialParseError.message.includes("Unexpected")) {
            // Last resort - just remove the problematic character
            quizContent = beforeError + afterError.substring(1);
          }

          console.log("Attempted fix applied, trying to parse again");

          // Final attempt at parsing with more thorough sanitization
          try {
            // One more general sanitization
            quizContent = quizContent
              // Convert to simple ASCII-safe representation
              .replace(/[^\x20-\x7E]/g, "")
              // Make sure all property names are properly quoted
              .replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');

            parsedQuiz = JSON.parse(quizContent);
            console.log("Successfully parsed JSON after fixing");
          } catch (finalParseError) {
            console.error("Final parse attempt failed:", finalParseError);

            // Create a fallback quiz with a generic question
            return createFallbackQuiz(quizOptions);
          }
        } else {
          console.error("Couldn't determine error position, using fallback");
          return createFallbackQuiz(quizOptions);
        }
      }

      // Validate the structure
      if (!parsedQuiz.success || !Array.isArray(parsedQuiz.questions)) {
        console.error(
          "Invalid quiz format - missing success flag or questions array"
        );
        return createFallbackQuiz(quizOptions);
      }

      // Check if we have at least one question
      if (parsedQuiz.questions.length === 0) {
        console.error("No questions found in generated quiz");
        return createFallbackQuiz(quizOptions);
      }

      // Count questions by type
      const counts = {
        multiple_choice: 0,
        open_ended: 0,
        case_study_moderate: 0,
        case_study_advanced: 0,
      };

      // First pass: validate and count questions
      parsedQuiz.questions.forEach((question, index) => {
        // Add IDs to questions if missing
        if (!question.id) {
          question.id = uniqid();
        }

        // Validate question structure based on type
        if (question.type === "multiple_choice") {
          // Fix any missing options array
          if (!Array.isArray(question.options)) {
            question.options = [
              { id: "a", text: "Option A", correct: true },
              { id: "b", text: "Option B", correct: false },
              { id: "c", text: "Option C", correct: false },
              { id: "d", text: "Option D", correct: false },
            ];
            console.warn(
              `Fixed missing options array for question ${index + 1}`
            );
          }

          // Fix options length
          if (question.options.length !== 4) {
            // Fill missing options or trim excess
            while (question.options.length < 4) {
              question.options.push({
                id: ["a", "b", "c", "d"][question.options.length],
                text: `Option ${["A", "B", "C", "D"][question.options.length]}`,
                correct: false,
              });
            }
            if (question.options.length > 4) {
              question.options = question.options.slice(0, 4);
            }
            console.warn(`Fixed options length for question ${index + 1}`);
          }

          // Ensure exactly one correct answer
          const correctOptions = question.options.filter(
            (opt) => opt.correct === true
          );
          if (correctOptions.length !== 1) {
            // Reset all to false, then make first one true
            question.options.forEach((opt) => (opt.correct = false));
            question.options[0].correct = true;
            console.warn(
              `Fixed correct answer count for question ${index + 1}`
            );
          }

          // Fix option IDs
          question.options.forEach((option, optIndex) => {
            option.id = ["a", "b", "c", "d"][optIndex];
          });

          counts.multiple_choice++;
        } else if (question.type === "open_ended") {
          // Ensure sample answer exists
          if (!question.sampleAnswer) {
            question.sampleAnswer = "Sample answer was not provided by the AI.";
            console.warn(
              `Added missing sample answer for open-ended question ${index + 1}`
            );
          }
          counts.open_ended++;
        } else if (
          question.type === "case_study_moderate" ||
          question.type === "case_study"
        ) {
          // Fix missing fields
          if (!question.scenario) question.scenario = "Scenario not provided.";
          if (!question.sampleAnswer)
            question.sampleAnswer = "Sample answer was not provided.";

          if (question.type === "case_study") {
            question.type = "case_study_moderate"; // Fix type if generic
          }
          counts.case_study_moderate++;
        } else if (question.type === "case_study_advanced") {
          // Fix missing fields
          if (!question.scenario)
            question.scenario = "Advanced scenario not provided.";
          if (!question.sampleAnswer)
            question.sampleAnswer = "Sample answer was not provided.";
          counts.case_study_advanced++;
        } else {
          // Unknown type - convert to multiple choice
          console.warn(
            `Fixed unknown question type "${question.type}" for question ${
              index + 1
            }`
          );
          question.type = "multiple_choice";
          question.options = [
            { id: "a", text: "Option A", correct: true },
            { id: "b", text: "Option B", correct: false },
            { id: "c", text: "Option C", correct: false },
            { id: "d", text: "Option D", correct: false },
          ];
          counts.multiple_choice++;
        }
      });

      // Log question counts
      console.log("Question counts:", counts);

      // Sort questions by type
      parsedQuiz.questions.sort((a, b) => {
        const order = {
          multiple_choice: 1,
          open_ended: 2,
          case_study_moderate: 3,
          case_study_advanced: 4,
        };
        return (order[a.type] || 99) - (order[b.type] || 99);
      });

      if (response.promptFeedback) {
        console.log("Prompt Feedback:", response.promptFeedback);
      }

      return parsedQuiz;
    } catch (parseError) {
      console.error(
        "Raw response length:",
        quizContent ? quizContent.length : 0
      );
      console.error("Parse error:", parseError);

      // Fall back to a simple quiz structure
      return createFallbackQuiz(quizOptions);
    }
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw error;
  }
}

// Helper function to create a fallback quiz when parsing fails
function createFallbackQuiz(quizOptions = {}) {
  console.log("Creating fallback quiz");

  const quiz = {
    success: true,
    questions: [],
  };

  // Add multiple choice questions if requested
  if (quizOptions.includeMultipleChoice !== false) {
    quiz.questions.push({
      id: uniqid(),
      type: "multiple_choice",
      question: "We couldn't generate a custom quiz. Here's a sample question.",
      options: [
        { id: "a", text: "Option A", correct: true },
        { id: "b", text: "Option B", correct: false },
        { id: "c", text: "Option C", correct: false },
        { id: "d", text: "Option D", correct: false },
      ],
    });
  }

  // Add open-ended question if requested
  if (quizOptions.includeOpenEnded) {
    quiz.questions.push({
      id: uniqid(),
      type: "open_ended",
      question: "Sample open-ended question",
      sampleAnswer: "This is a sample answer for the open-ended question.",
    });
  }

  // Add case study if requested
  if (quizOptions.includeCaseStudies) {
    quiz.questions.push({
      id: uniqid(),
      type: "case_study_moderate",
      scenario: "This is a sample scenario for a case study.",
      question: "Sample case study question",
      sampleAnswer: "This is a sample answer for the case study question.",
    });
  }

  return quiz;
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

export async function generateMultiPageBrief(allPages) {
  console.log("Generating multi-page brief with optimized token usage...");
  console.log(`Processing ${allPages.length} pages in a single AI call`);

  try {
    // Combine all pages into a single text with clear separators
    const combinedText = allPages
      .map((pageText, index) => {
        const cleanedPage = pageText.trim();
        if (!cleanedPage) return null;
        return `=== PAGE ${index + 1} ===\n${cleanedPage}\n`;
      })
      .filter(Boolean)
      .join("\n");

    console.log(`Combined text length: ${combinedText.length} characters`);

    // Detect language from the first non-empty page
    const firstPage = allPages.find((page) => page.trim().length > 0) || "";
    const containsGeorgian = /[\u10A0-\u10FF]/.test(firstPage);
    const textLanguage = containsGeorgian ? "Georgian" : "English";

    // Monitor token usage before making the API call
    const promptTemplate = `CRITICAL INSTRUCTION: You MUST respond EXCLUSIVELY in ${textLanguage}...`; // Simplified for estimation
    const tokenEstimate = estimateTokenUsage(combinedText, promptTemplate);

    console.log(
      `🚀 OPTIMIZATION: Processing ${allPages.length} pages in single call instead of ${allPages.length} separate calls`
    );
    console.log(
      `💰 Estimated cost: $${tokenEstimate.costEstimate.toFixed(4)} (vs ~$${(
        tokenEstimate.costEstimate * allPages.length
      ).toFixed(4)} with individual calls)`
    );
    console.log(
      `📊 Token savings: ~${Math.round(
        (allPages.length - 1) * 100
      )}% reduction in API calls`
    );

    console.log(`Detected language is ${textLanguage}`);

    const response = await geminiAI.models.generateContent({
      model: geminiModel,
      contents: `CRITICAL INSTRUCTION: You MUST respond EXCLUSIVELY in ${textLanguage}. Do not use any other language regardless of what you think is appropriate.

You are processing multiple pages of a document. Your task is to create comprehensive, educational summaries for EACH page's content. Each summary should be approximately 500 words to provide thorough coverage and educational depth. This will be part of a larger document brief where each page is processed comprehensively.

CORE REQUIREMENTS:

1️⃣ **LANGUAGE REQUIREMENT - HIGHEST PRIORITY**:
   - You MUST respond ONLY in ${textLanguage}
   - If the input text is in Georgian, you MUST write ONLY in Georgian
   - If the input text is in English, you MUST write ONLY in English
   - DO NOT translate between languages under any circumstances
   - Maintain consistent terminology with the source material
   - This is the MOST IMPORTANT requirement and overrides all others

2️⃣ **RESPONSE FORMAT - CRITICAL**:
   You MUST respond in this EXACT JSON format:
   {
     "pageSummaries": [
       {
         "pageNumber": 1,
         "summary": "Comprehensive educational summary of page 1 content..."
       },
       {
         "pageNumber": 2,
         "summary": "Comprehensive educational summary of page 2 content..."
       }
     ]
   }

3️⃣ **DIRECT EXPLANATION STYLE**:
   - Start DIRECTLY with the explanation of concepts
   - DO NOT begin with meta-phrases like "This page discusses...", "The content covers...", "This section focuses on..."
   - Write in an educational, informative style as if teaching the material directly
   - Use active voice and present tense
   - Explain the subject matter directly without referring to "the text" or "the document"

4️⃣ **COMPREHENSIVE CONTENT PROCESSING**:
   - Process ALL content on each page, regardless of type, with extensive detail
   - If the page contains course information (syllabus, grading, logistics), provide comprehensive explanations of policies, procedures, and their educational rationale
   - If the page contains instructor information, provide detailed professional background, expertise areas, and how their experience benefits students
   - If the page contains study materials or requirements, explain in detail what they are, their purpose, how to use them effectively, and their educational value
   - If the page contains subject matter content, provide thorough explanations of concepts, their significance, applications, and relationships to other topics
   - If the page contains questions, provide detailed context, explain what topics they address, and offer insights into the learning objectives they serve
   - NEVER tell the user to "move to the next page" or skip content
   - Expand on every piece of information with educational context and detailed explanations

5️⃣ **EDUCATIONAL DEPTH**:
   - Don't just restate content - explain it with comprehensive educational insight
   - Break down complex ideas into understandable terms with detailed explanations
   - Provide extensive context for why information is important and how it fits into the broader subject
   - Connect concepts to broader learning objectives and real-world applications
   - Make abstract concepts concrete and relatable with examples and analogies
   - Include detailed explanations of key terms, concepts, and their relationships
   - Provide step-by-step explanations for complex processes or ideas
   - Add educational commentary that helps students understand the significance and implications

6️⃣ **STRUCTURE AND FORMAT**:
   - Use clear paragraphs with logical flow
   - DO NOT use asterisks (*) for emphasis or headings
   - DO NOT use markdown formatting
   - Use proper sentence structure and paragraphs
   - For important terms, use appropriate capitalization
   - Keep explanations comprehensive yet concise

7️⃣ **HANDLING DIFFERENT CONTENT TYPES**:
   - **Administrative content**: Summarize policies, procedures, and requirements clearly
   - **Instructor information**: Provide relevant professional background and contact details
   - **Course structure**: Explain how the course is organized and what students can expect
   - **Subject matter**: Provide deep, educational explanations of concepts
   - **Assessment information**: Explain evaluation methods and their educational purpose
   - **Study materials**: Describe resources and how they support learning

8️⃣ **QUALITY STANDARDS**:
   - Every page must receive a meaningful, substantial summary
   - Target approximately 500 words per page summary for comprehensive coverage
   - Minimum 300 words for pages with substantial content
   - If a page has minimal content, expand on what little is there with educational context and explanations
   - Focus on educational value and student understanding
   - Ensure the summary helps students learn and understand the material
   - Provide detailed explanations, examples, and educational insights
   - Include relevant context and connections to broader concepts

Remember: You are creating summaries for ALL pages in a single response. Make each page's summary comprehensive, educational, and valuable for student learning. The user will navigate through all pages to get the complete document understanding.

Your response MUST be in ${textLanguage} ONLY and in VALID JSON format.

Document content with page separators:
${combinedText}`,
      generationConfig: {
        temperature: 0.4,
      },
    });

    console.log("Received AI response for multi-page brief");

    let responseText = response.text;
    console.log("Raw response length:", responseText.length);

    // Try to parse the JSON response
    let parsedResponse;
    try {
      // Clean up the response to extract JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError);
      console.log("Raw response:", responseText);

      // Fallback: create summaries manually from the response
      const fallbackSummaries = allPages
        .map((pageText, index) => {
          const cleanedPage = pageText.trim();
          if (!cleanedPage) return null;
          return {
            pageNumber: index + 1,
            summary: `Page ${index + 1}: ${cleanedPage.substring(0, 200)}${
              cleanedPage.length > 200 ? "..." : ""
            }`,
          };
        })
        .filter(Boolean);

      return {
        pageSummaries: fallbackSummaries,
        error: "Failed to parse AI response, using fallback summaries",
      };
    }

    // Validate the parsed response
    if (
      !parsedResponse.pageSummaries ||
      !Array.isArray(parsedResponse.pageSummaries)
    ) {
      throw new Error("Invalid response format: missing pageSummaries array");
    }

    // Ensure we have summaries for all pages
    const expectedPageCount = allPages.filter(
      (page) => page.trim().length > 0
    ).length;
    const actualPageCount = parsedResponse.pageSummaries.length;

    if (actualPageCount < expectedPageCount) {
      console.warn(
        `Expected ${expectedPageCount} page summaries, got ${actualPageCount}`
      );

      // Add fallback summaries for missing pages
      for (let i = actualPageCount; i < expectedPageCount; i++) {
        const pageText = allPages[i].trim();
        if (pageText) {
          parsedResponse.pageSummaries.push({
            pageNumber: i + 1,
            summary: `Page ${i + 1}: ${pageText.substring(0, 200)}${
              pageText.length > 200 ? "..." : ""
            }`,
          });
        }
      }
    }

    console.log(
      `Successfully generated ${parsedResponse.pageSummaries.length} page summaries`
    );
    return parsedResponse;
  } catch (error) {
    console.error("Error generating multi-page brief:", error);

    // Create fallback summaries
    const fallbackSummaries = allPages
      .map((pageText, index) => {
        const cleanedPage = pageText.trim();
        if (!cleanedPage) return null;
        return {
          pageNumber: index + 1,
          summary: `Page ${index + 1}: ${cleanedPage.substring(0, 200)}${
            cleanedPage.length > 200 ? "..." : ""
          }`,
        };
      })
      .filter(Boolean);

    return {
      pageSummaries: fallbackSummaries,
      error: `Failed to generate brief: ${error.message}`,
    };
  }
}
