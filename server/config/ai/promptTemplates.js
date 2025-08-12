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

You are processing multiple pages of a document. Your task is to create comprehensive, educational summaries for EACH page's content. Each summary should be ${minWordsPerPage}-${targetWordsPerPage} words to provide thorough coverage and educational depth with proper structure and formatting.

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
         "title": "Descriptive Topic Title for Page 1",
         "summary": "Direct educational explanation starting with the concepts..."
       },
       {
         "pageNumber": 2,
         "title": "Descriptive Topic Title for Page 2", 
         "summary": "Direct educational explanation starting with the concepts..."
       }
     ]
   }
   
   **CRITICAL WARNING**: In the "summary" field, use ONLY plain text. NO HTML, NO CSS classes, NO special formatting. The frontend handles all styling automatically.

3️⃣ **STRUCTURED CONTENT ORGANIZATION - MANDATORY**:
   **CRITICAL**: You MUST organize ALL content using this structure for CONSISTENCY:
   
   **REQUIRED STRUCTURE FOR EVERY PAGE**:
   1. Start each major topic with: "1. Topic Name" (on its own line)
   2. Follow with 2-3 sentences explaining the topic
   3. Use bullet points for ALL supporting details
   4. NEVER write long unstructured paragraphs
   
   **Formatting Rules:**
   - Numbered sections MUST be on their own line: "1. Topic Name"
   - Each numbered section MUST have explanation text
   - ALL details, examples, characteristics MUST use bullet points (-)
   - Each bullet point should be concise (1-2 sentences max)
   - Leave blank lines between sections for clarity
   
   **MANDATORY Structure Example:**
   
   1. Business Ownership Forms
   
   Business ownership structures determine how companies are organized, managed, and taxed. Three primary forms dominate the business landscape.
   
   - Sole proprietorships involve single-person ownership with complete control
   - Partnerships distribute ownership among two or more individuals  
   - Corporations exist as separate legal entities from their owners
   - Each structure has distinct tax implications and liability protections
   
   2. Corporate Governance Principles
   
   Corporate governance establishes frameworks for accountability and oversight. These principles ensure proper business management.
   
   - Board of directors provides strategic oversight
   - Executive management handles daily operations
   - Shareholders maintain ownership rights
   - Regular audits ensure transparency
   
   **FORBIDDEN Formatting:**
   ❌ Long paragraphs without structure
   ❌ Mixing explanation text with bullet points on same line
   ❌ Numbered sections without following explanation
   ❌ Details not in bullet points
   ❌ No spacing between sections

4️⃣ **PAGE TITLE REQUIREMENTS - CRITICAL FOR DISPLAY**:
   **MANDATORY**: Every page MUST have a descriptive title that summarizes the KEY CONTENT!
   
   **TITLE GENERATION PROCESS**:
   1. READ the entire page content thoroughly
   2. IDENTIFY the main topic, concept, or theme
   3. CREATE a title that tells readers EXACTLY what they'll learn
   4. ENSURE the title is specific and descriptive, not generic
   
   ✅ **EXCELLENT DESCRIPTIVE TITLES**:
   - "Sole Proprietorship Tax Benefits and Legal Structure"
   - "How Corporations Protect Personal Assets from Business Debts"
   - "Partnership Agreement Requirements and Profit Distribution"
   - "Stock Merger vs Asset Purchase: Key Differences"
   - "Balance Sheet Analysis for Investment Decisions"
   - "SWOT Analysis in Strategic Business Planning"
   
   ❌ **FORBIDDEN GENERIC TITLES** (will be rejected):
   - "Business Concepts" → Instead: "Types of Business Ownership Structures"
   - "Key Points" → Instead: "Partnership Advantages Over Sole Proprietorship"
   - "Overview" → Instead: "Corporate Governance and Board Responsibilities"
   - "Introduction" → Instead: "Fundamentals of Financial Accounting"
   - "Page Content" → Instead: specific topic like "Cash Flow Statement Components"
   - "Topics" → Instead: describe the actual topics covered
   
   **TITLE FORMULA**:
   [Main Concept/Topic] + [Key Aspect/Benefit/Process]
   
   Examples:
   - If page discusses business types → "Comparing Sole Proprietorship, Partnership, and Corporation"
   - If page covers advantages → "Five Tax Benefits of S-Corporation Status"
   - If page explains a process → "Steps to Register a Limited Liability Company"
   - If page has definitions → "Essential Business Terms: Assets, Liabilities, and Equity"
   
   **CRITICAL RULES**:
   - Minimum 4 words, maximum 10 words (15-60 characters)
   - MUST describe the actual content, not the content type
   - Include specific terms from the page content
   - Make it searchable and memorable
   - Think: "What would someone search for to find this information?"

5️⃣ **CONTENT DEPTH AND LENGTH REQUIREMENTS**:
   - Target ${minWordsPerPage}-${targetWordsPerPage} words per page summary
   - Ensure substantial content for each numbered section (minimum 50-80 words)
   - Provide 3-5 bullet points per major concept when applicable
   - If content is sparse, expand with educational context, examples, and broader implications
   - Never provide summaries shorter than ${minWordsPerPage} words unless page is genuinely empty
   - CRITICAL: Keep total response under 50,000 characters to ensure valid JSON parsing

6️⃣ **DIRECT EXPLANATION STYLE - ABSOLUTELY CRITICAL**:
   **MANDATORY RULE**: Every summary MUST start with direct educational content. NO meta-descriptions allowed!
   
   ❌ **ABSOLUTELY FORBIDDEN STARTS** (will be automatically removed):
   - "This page describes/covers/explains/discusses/presents..."
   - "This chapter/section/document contains/includes..."
   - "The content/material/information provides..."
   - "Students are tasked with..."
   - "The core aim is..."
   - "Here we discuss/explore/examine..."
   - "In this page/section..."
   - "On this page..."
   - Any sentence that talks ABOUT the content instead of BEING the content
   
   ✅ **CORRECT STARTS - DIRECT TEACHING**:
   - "Business ownership structures determine how companies are organized and managed. Three primary forms exist..."
   - "Sole proprietorship represents the simplest business structure where one individual owns and operates..."
   - "Corporate governance establishes frameworks for accountability through board oversight..."
   - "Partnerships distribute ownership and responsibilities among two or more individuals..."
   - "Limited liability protects personal assets from business debts by creating a legal separation..."
   
   ❌ **WRONG**: "This page explores the concept of business ownership and its various forms..."
   ✅ **RIGHT**: "Business ownership takes three primary forms: sole proprietorships, partnerships, and corporations."
   
   ❌ **WRONG**: "Students will learn about the advantages of incorporating a business..."
   ✅ **RIGHT**: "Incorporation provides five key advantages: limited liability, perpetual existence, easier capital raising..."
   
   ❌ **WRONG**: "This section describes how mergers and acquisitions work in corporate settings..."
   ✅ **RIGHT**: "Mergers combine two companies into a single entity through stock exchanges or asset purchases."
   
   **ENFORCEMENT**: If you write ANY forbidden phrase, the system will automatically delete it. Write as if you're the textbook itself, not someone describing a textbook.

7️⃣ **COMPREHENSIVE CONTENT PROCESSING**:
   - Process ALL content on each page, regardless of type, with extensive detail
   - Transform every piece of information into well-structured educational content
   - If the page contains course information, create numbered sections for policies with bullet points for details
   - If the page contains subject matter, organize concepts hierarchically with supporting details
   - If the page contains procedures, use numbered steps with explanatory bullet points
   - Expand on every piece of information with educational context and detailed explanations

8️⃣ **EDUCATIONAL DEPTH AND INSIGHT**:
   - Don't just restate content - explain it with comprehensive educational insight
   - Break down complex ideas into numbered concepts with supporting bullet points
   - Provide extensive context for why information is important
   - Connect concepts to broader learning objectives and real-world applications
   - Make abstract concepts concrete with examples and analogies
   - Include detailed explanations of key terms and their relationships
   - Add educational commentary that helps students understand significance

9️⃣ **FORMATTING RULES - CRITICAL**:
   **STRICT TEXT-ONLY FORMATTING REQUIREMENTS:**
   
   ✅ **ALLOWED FORMATTING:**
   - Numbered sections: "1. Topic Name" (on separate line)
   - Bullet points: "- Supporting detail"
   - Plain text only - NO HTML, NO CSS, NO special characters
   
   ❌ **ABSOLUTELY FORBIDDEN:**
   - NO HTML tags: <strong>, <em>, <span>, etc.
   - NO CSS classes: "font-semibold", "text-gray-900", etc. 
   - NO markdown: **, *, ##, etc.
   - NO special formatting symbols or codes
   - NO quotation marks around CSS classes
   - NO any form of markup language
   
   **CRITICAL**: Your response must be PLAIN TEXT ONLY. The frontend will handle all styling automatically. Any HTML, CSS, or markup will appear as broken text to users.
   
   **Correct format example:**
   
   1. Business Ownership Forms
   
   Business ownership structures determine how companies are organized and managed.
   
   - Sole proprietorships involve single-person ownership
   - Partnerships distribute ownership among multiple individuals
   - Corporations exist as separate legal entities

🔟 **CONTENT TYPE HANDLING**:
   - **Learning objectives**: Transform into direct educational explanations - DO NOT describe what students should learn, TEACH the concepts directly
   - **Administrative content**: Number main policies, bullet point specific requirements
   - **Conceptual content**: Number core concepts, bullet point characteristics and applications  
   - **Procedural content**: Number main procedures, bullet point steps or considerations
   - **Mixed content**: Organize hierarchically with appropriate numbering and bullet structure
   - **Course descriptions**: Convert course aims into direct educational content about the subject matter

1️⃣1️⃣ **QUALITY STANDARDS**:
   - Every page must receive a meaningful, substantial summary of ${minWordsPerPage}-${targetWordsPerPage} words
   - Each numbered section must contain comprehensive explanations
   - Bullet points must add genuine educational value, not just list items
   - Focus on educational value and student understanding
   - Ensure proper structure enhances readability and learning
   - Provide detailed explanations, examples, and educational insights

Remember: Create well-structured, comprehensive summaries that use numbered sections for major concepts and bullet points for supporting details. Each summary should be ${minWordsPerPage}-${targetWordsPerPage} words with clear educational value.

Your response MUST be in ${language} ONLY and in VALID JSON format.

Document content with page separators:
${combinedText}`;
}
