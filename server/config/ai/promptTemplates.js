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
   - Keep answers BRIEF and TARGETED - 2-3 sentences maximum, around 
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
  const includeOpenEnded = quizOptions.includeOpenEnded === true;
  const includeCaseStudies = quizOptions.includeCaseStudies === true;

  let questionTypes = "";
  if (includeMultipleChoice) {
    questionTypes += `   a. Multiple Choice Questions (EXACTLY ${GENERATION_CONFIG.quiz.multipleChoiceCount} required)\n`;
  }
  if (includeOpenEnded) {
    questionTypes += `   b. Open Ended Questions (EXACTLY ${GENERATION_CONFIG.quiz.openEndedCount} required)\n`;
  }
  if (includeCaseStudies) {
    const moderateCount = Math.floor(GENERATION_CONFIG.quiz.caseStudyCount / 2);
    const advancedCount = GENERATION_CONFIG.quiz.caseStudyCount - moderateCount;
    questionTypes += `   c. Case Study Questions (EXACTLY ${GENERATION_CONFIG.quiz.caseStudyCount} required: ${moderateCount} moderate difficulty, ${advancedCount} advanced difficulty)\n`;
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
      GENERATION_CONFIG.quiz.multipleChoiceCount +
      (includeOpenEnded ? GENERATION_CONFIG.quiz.openEndedCount : 0) +
      (includeCaseStudies ? GENERATION_CONFIG.quiz.caseStudyCount : 0)
    } questions in the order specified
  ]
}

Text to analyze:
${extractedText}`;
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
  return `CRITICAL: You MUST respond in ${language} ONLY. Never use any other language.

Evaluate the student's answer in JSON format:

{
  "score": 0-100,
  "feedback": "Constructive feedback in ${language}",
  "suggestions": ["Suggestion 1", "Suggestion 2"]
}

Question: ${questionText}
Model Answer: ${modelAnswer}
Student Answer: ${userAnswer}

Evaluation criteria:
1. Accuracy and correctness (40%)
2. Completeness of answer (30%)
3. Understanding demonstration (20%)
4. Clarity of expression (10%)

Provide:
- Score: 0-100 based on criteria
- Feedback: 2-3 sentences highlighting strengths and areas for improvement
- Suggestions: 2-3 specific ways to improve the answer

Remember: ALL text MUST be in ${language} ONLY. This is mandatory.`;
}

/**
 * Gets the brief generation prompt - OPTIMIZED VERSION
 * @param {string} language - Target language
 * @param {string} combinedText - Combined page text
 * @returns {string} Complete prompt
 */
export function getBriefPrompt(language, combinedText) {
  const { targetWordsPerPage, minWordsPerPage } = GENERATION_CONFIG.brief;
  const pageCount = (combinedText.match(/=== PAGE \d+ ===/g) || []).length;

  return `You are an educational content creator. Write in ${language} only.

Create ${pageCount} concise but comprehensive EDUCATIONAL EXPLANATIONS (NOT summaries or topic lists).

JSON format:
{
  "pageSummaries": [
    {
      "pageNumber": 1,
      "title": "Specific descriptive title",
      "summary": "Educational explanation here..."
    }
  ]
}

CRITICAL REQUIREMENTS:
🎯 Each explanation: ${minWordsPerPage}-${targetWordsPerPage} words (concise but educational)
🎯 EXPLAIN concepts clearly - don't just list topics
🎯 Answer: WHAT is it? HOW does it work? WHY is it important?
🎯 Use numbered sections (1., 2., 3.) with clear explanations
🎯 PLAIN TEXT ONLY - absolutely NO HTML, CSS, or formatting codes
🎯 NO class names like "font-semibold", "text-gray-900", "dark:text-gray-100"
🎯 NO HTML tags like <div>, <span>, <p>, <strong>, <em>
🎯 NO style attributes or CSS properties

BAD EXAMPLE (do NOT do this):
"1. Core Concepts
Several important themes are explored below:
- better plans to reach more people"

ALSO BAD - NO HTML/CSS:
"<div class=\\"font-semibold text-gray-900 dark:text-gray-100\\">Corporate Identity</div>"

GOOD EXAMPLE (do this):
"1. Customer Engagement Strategy Fundamentals
Customer engagement strategy refers to the systematic approach businesses use to build meaningful relationships with customers throughout their journey. This involves creating emotional connections and driving long-term loyalty through multiple touchpoints and interactions.

2. Implementation Framework
Companies conduct thorough market research to identify customer needs, pain points, and behavioral patterns. This research forms the basis for creating personalized experiences that resonate with customers on both rational and emotional levels."

CONTENT RULES:
- Write clear EXPLANATIONS, not topic lists
- Each section needs 2-3 focused sentences
- Be educational but concise (${minWordsPerPage}-${targetWordsPerPage} words total)
- PLAIN TEXT ONLY - no formatting, HTML, CSS, or style codes
- Include practical insights and real value for students

${combinedText}

Generate exactly ${pageCount} educational explanations of ${minWordsPerPage}-${targetWordsPerPage} words each in PLAIN TEXT.`;
}
