/**
 * AI Prompt Templates
 */

import { CONTENT_EXCLUSIONS, GENERATION_CONFIG } from "./aiConfig.js";

/**
 * Gets the flashcard generation prompt
 * @param {string} language - Target language
 * @param {string} extractedText - Text to generate flashcards from
 * @returns {string} Complete prompt
 */
export function getFlashcardPrompt(language, extractedText) {
  const { minCards, maxCards, maxQuestionWords, maxAnswerWords } =
    GENERATION_CONFIG.flashcards;

  return `CRITICAL INSTRUCTION: You MUST generate all content EXCLUSIVELY in ${language}.

Generate high-quality flashcards from the provided text in this exact JSON format:

[
  {
    "question": "Brief, specific question (max ${maxQuestionWords} words)",
    "answer": "Concise answer (2-3 sentences, max ${maxAnswerWords} words)"
  }
]

Requirements:

1️⃣ **LANGUAGE REQUIREMENT - HIGHEST PRIORITY**:
   - You MUST write both questions and answers ONLY in ${language}
   - This is the MOST IMPORTANT requirement and overrides all others
   - Do not translate between languages under any circumstances
   - If input is in Georgian, output must be entirely in Georgian
   - If input is in English, output must be entirely in English

2️⃣ **CONTENT EXCLUSIONS - VERY IMPORTANT**:
   ${CONTENT_EXCLUSIONS.excludePatterns
     .map((pattern) => `- DO NOT include questions about ${pattern}`)
     .join("\n   ")}
   - Focus ONLY on actual subject matter content and knowledge

3️⃣ **Question Quality**:
   - Keep questions CONCISE - max ${maxQuestionWords} words
   - Create FOCUSED questions that target specific concepts, definitions, or examples
   - Avoid broad, open-ended questions like "Explain the importance of X"
   - Instead use precise questions like "What is X?" or "How does X affect Y?"
   - Questions should be direct and specific
   - Use simple language and clear wording

4️⃣ **Answer Quality**:
   - Keep answers BRIEF and TARGETED - 2-3 sentences maximum, around ${maxAnswerWords} words
   - Provide clear, direct answers that focus on the essential information
   - Include just enough context for understanding
   - Omit supplementary details that aren't crucial
   - Focus on accuracy and clarity over comprehensiveness
   - Include only the most important examples if needed

5️⃣ **Content and Structure Requirements**:
   - Generate ${minCards}-${maxCards} high-quality, focused flashcards
   - Each flashcard must have "question" and "answer" fields
   - Ensure proper JSON formatting with no trailing commas
   - Return ONLY valid JSON - no explanatory text, markdown, or other formatting
   - Cover a variety of key concepts from the text

Remember: Your response MUST be in ${language} ONLY and in VALID JSON format.

Text to analyze: ${extractedText}`;
}

/**
 * Gets the quiz generation prompt
 * @param {string} extractedText - Text to generate quiz from
 * @param {Object} quizOptions - Quiz generation options
 * @returns {string} Complete prompt
 */
export function getQuizPrompt(extractedText, quizOptions = {}) {
  const includeMultipleChoice = quizOptions.includeMultipleChoice !== false;
  const includeOpenEnded = quizOptions.includeOpenEnded !== false;
  const includeCaseStudies = quizOptions.includeCaseStudies !== false;

  let questionTypes = "";
  if (includeMultipleChoice) {
    questionTypes += `- FIRST: Generate EXACTLY ${GENERATION_CONFIG.quiz.multipleChoiceCount} multiple choice questions. Each question MUST have:
  * Exactly ${GENERATION_CONFIG.quiz.optionsPerQuestion} options labeled a, b, c, d
  * Exactly ONE correct answer marked with "correct": true
  * All other options marked with "correct": false
  * Clear, specific question text\n`;
  }
  if (includeOpenEnded) {
    questionTypes += `- SECOND: Generate exactly ${GENERATION_CONFIG.quiz.openEndedCount} open-ended questions\n`;
  }
  if (includeCaseStudies) {
    questionTypes += `- THIRD: Generate exactly ${GENERATION_CONFIG.quiz.caseStudyCount} case study questions (1 moderate, 1 advanced)\n`;
  }

  return `Generate a quiz with EXACTLY the specified number of questions. Follow these requirements strictly:

1. CONTENT EXCLUSIONS - HIGHEST PRIORITY:
   ${CONTENT_EXCLUSIONS.excludePatterns
     .map((pattern) => `- DO NOT include questions about ${pattern}`)
     .join("\n   ")}
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

4. Multiple Choice Format (EXACTLY ${
    GENERATION_CONFIG.quiz.multipleChoiceCount
  } questions required):
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
    // EXACTLY ${
      GENERATION_CONFIG.quiz.multipleChoiceCount
    } multiple choice questions if requested
    // EXACTLY ${
      GENERATION_CONFIG.quiz.openEndedCount
    } open ended questions if requested
    // EXACTLY ${
      GENERATION_CONFIG.quiz.caseStudyCount
    } case studies if requested
  ]
}

IMPORTANT: Output ONLY valid JSON with no code fences, no additional text before or after the JSON, and must be properly formatted.

Text to analyze: ${extractedText}`;
}

/**
 * Gets the evaluation prompt
 * @param {string} language - Target language
 * @param {string} questionText - Question text
 * @param {string} modelAnswer - Model answer
 * @param {string} userAnswer - User's answer
 * @returns {string} Complete prompt
 */
export function getEvaluationPrompt(
  language,
  questionText,
  modelAnswer,
  userAnswer
) {
  return `You are an expert academic evaluator. I am giving you a complete task with all necessary information. Your task is to evaluate a student's answer to a question.

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
  "score": [number between ${GENERATION_CONFIG.evaluation.minScore}-${GENERATION_CONFIG.evaluation.maxScore}],
  "feedback": "[specific feedback in ${language}]",
  "isCorrect": [boolean]
}

Example output format:
{"score": 75, "feedback": "Your answer is good but lacks detail about X", "isCorrect": true}

DO NOT include any text before or after the JSON object. OUTPUT ONLY THE JSON OBJECT.`;
}

/**
 * Gets the brief generation prompt
 * @param {string} language - Target language
 * @param {string} combinedText - Combined page text
 * @returns {string} Complete prompt
 */
export function getBriefPrompt(language, combinedText) {
  const { targetWordsPerPage, minWordsPerPage } = GENERATION_CONFIG.brief;

  return `CRITICAL INSTRUCTION: You MUST respond EXCLUSIVELY in ${language}. Do not use any other language regardless of what you think is appropriate.

You are processing multiple pages of a document. Your task is to create comprehensive, educational summaries for EACH page's content. Each summary should be approximately ${targetWordsPerPage} words to provide thorough coverage and educational depth. This will be part of a larger document brief where each page is processed comprehensively.

CORE REQUIREMENTS:

1️⃣ **LANGUAGE REQUIREMENT - HIGHEST PRIORITY**:
   - You MUST respond ONLY in ${language}
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
   - Target approximately ${targetWordsPerPage} words per page summary for comprehensive coverage
   - Minimum ${minWordsPerPage} words for pages with substantial content
   - If a page has minimal content, expand on what little is there with educational context and explanations
   - Focus on educational value and student understanding
   - Ensure the summary helps students learn and understand the material
   - Provide detailed explanations, examples, and educational insights
   - Include relevant context and connections to broader concepts

Remember: You are creating summaries for ALL pages in a single response. Make each page's summary comprehensive, educational, and valuable for student learning. The user will navigate through all pages to get the complete document understanding.

Your response MUST be in ${language} ONLY and in VALID JSON format.

Document content with page separators:
${combinedText}`;
}
