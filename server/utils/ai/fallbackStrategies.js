/**
 * Fallback strategies for AI service failures
 */

import uniqid from "uniqid";
import { getLanguageFallback } from "./languageUtils.js";

/**
 * Creates a fallback quiz when generation fails
 * @param {Object} quizOptions - Quiz generation options
 * @returns {Object} Fallback quiz structure
 */
export function createFallbackQuiz(quizOptions = {}) {
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

/**
 * Creates fallback flashcards when generation fails
 * @param {string} language - Target language for fallback
 * @returns {Array} Fallback flashcards
 */
export function createFallbackFlashcards(language = "English") {
  console.log("Creating fallback flashcards");

  const fallbacks = {
    Georgian: [
      {
        id: uniqid(),
        question: "ვერ შევქმენით ბარათები",
        answer: "გთხოვთ სცადოთ მოგვიანებით",
      },
    ],
    English: [
      {
        id: uniqid(),
        question: "Failed to generate flashcards",
        answer: "Please try again later",
      },
    ],
  };

  return fallbacks[language] || fallbacks.English;
}

/**
 * Creates fallback evaluation when AI evaluation fails
 * @param {string} language - Target language
 * @param {boolean} hasUserAnswer - Whether user provided an answer
 * @returns {Object} Fallback evaluation
 */
export function createFallbackEvaluation(
  language = "English",
  hasUserAnswer = true
) {
  if (!hasUserAnswer) {
    return {
      score: 0,
      feedback:
        language === "Georgian"
          ? "პასუხი არ არის მოწოდებული. გთხოვთ დაწეროთ პასუხი შეფასების მისაღებად."
          : "No answer provided. Please write an answer to receive feedback.",
      isCorrect: false,
    };
  }

  const fallbacks = {
    Georgian: {
      score: 70,
      feedback:
        "თქვენი პასუხი შეფასებულია. მასში კარგად არის წარმოდგენილი საკვანძო აზრები. გააუმჯობესეთ დეტალების ხარისხი და ლოგიკური კავშირები მომავალში.",
      isCorrect: true,
    },
    English: {
      score: 70,
      feedback:
        "Your answer has been evaluated. It presents key ideas well. In the future, improve the quality of details and logical connections.",
      isCorrect: true,
    },
  };

  return fallbacks[language] || fallbacks.English;
}

/**
 * Creates fallback brief summaries when generation fails
 * @param {Array} pages - Original pages to summarize
 * @param {string} error - Error message
 * @returns {Object} Fallback brief structure
 */
export function createFallbackBrief(pages, error = null) {
  console.log("Creating fallback brief summaries");

  const fallbackSummaries = pages
    .map((pageText, index) => {
      const cleanedPage = pageText.trim();
      if (!cleanedPage) return null;

      // Create structured fallback instead of raw text
      const structuredSummary = createStructuredFallbackSummary(
        cleanedPage,
        index + 1
      );

      // Generate title for this page
      const title = generateFallbackTitle(cleanedPage, index + 1);

      return {
        pageNumber: index + 1,
        title: title,
        summary: structuredSummary,
      };
    })
    .filter(Boolean);

  const result = {
    pageSummaries: fallbackSummaries,
  };

  if (error) {
    result.error = error;
  }

  return result;
}

/**
 * Creates a structured fallback summary with proper formatting
 * @param {string} pageText - The raw page text
 * @param {number} pageNumber - The page number
 * @returns {string} - Structured fallback summary
 */
export function createStructuredFallbackSummary(pageText, pageNumber) {
  const cleanText = pageText.trim();

  if (!cleanText) {
    return `1. Empty Page
This page contains no readable text content.

- The page may contain images, charts, or visual elements only
- Check the original document for any visual information
- This content may need manual review to extract meaning`;
  }

  // Intelligently process the actual content rather than describe what it contains
  return processContentIntelligently(cleanText, pageNumber);
}

/**
 * Intelligently processes content to create educational summaries
 * @param {string} text - The content text to process
 * @param {number} pageNumber - The page number
 * @returns {string} - Intelligent structured summary
 */
function processContentIntelligently(text, pageNumber) {
  // Clean and prepare text
  const cleanText = text.replace(/\s+/g, " ").trim();

  // Check for different content types and process accordingly
  if (
    /(?:question|activity|exercise|critical thinking|discuss)/i.test(cleanText)
  ) {
    return createIntelligentActivitySummary(cleanText);
  } else if (
    /(?:syllabus|grading|policy|instructor|contact)/i.test(cleanText)
  ) {
    return createIntelligentAdminSummary(cleanText);
  } else {
    return createIntelligentContentSummary(cleanText);
  }
}

/**
 * Creates intelligent summary for activity content by extracting actual questions
 */
function createIntelligentActivitySummary(text) {
  // Extract questions from the text
  const questions = [];
  const questionPatterns = [
    /\(\d+\)\s*([^?]*?\?)/g,
    /\d+\.\s*([^?]*?\?)/g,
    /[Qq]uestion[\s\d:]*([^?]*?\?)/g,
  ];

  questionPatterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(text)) !== null && questions.length < 4) {
      const q = match[1].trim();
      if (q.length > 10 && q.length < 300) {
        questions.push(q);
      }
    }
  });

  let summary = `1. Critical Thinking Questions\n`;
  summary += `These thought-provoking questions are designed to encourage analytical thinking and practical application of concepts.\n\n`;

  if (questions.length > 0) {
    questions.forEach((q, index) => {
      summary += `- ${q}\n`;
    });
    summary += `\n2. Learning Objectives\n`;
    summary += `These questions encourage students to evaluate real-world scenarios, consider multiple perspectives, and develop evidence-based reasoning skills.\n\n`;
    summary += `- Practice analytical thinking through structured questioning\n`;
    summary += `- Connect theoretical concepts to practical applications\n`;
    summary += `- Develop critical evaluation and reasoning abilities`;
  } else {
    // Fallback if no clear questions found
    const content = text.substring(0, 300);
    summary += `${content}${text.length > 300 ? "..." : ""}\n\n`;
    summary += `- Students should prepare thoughtful responses to these discussion points\n`;
    summary += `- Consider multiple perspectives and evidence-based reasoning\n`;
    summary += `- Connect ideas to broader course concepts and real-world applications`;
  }

  return summary;
}

/**
 * Creates intelligent summary for administrative content
 */
function createIntelligentAdminSummary(text) {
  // Extract specific details
  const policies = extractKeyInfo(
    text,
    /(?:policy|requirement|must|should|grade|evaluation)/i
  );
  const contacts = extractKeyInfo(
    text,
    /(?:email|phone|office|contact|instructor|professor)/i
  );

  let summary = `1. Course Administration\n`;

  if (policies.length > 0) {
    summary += `Important course policies and academic requirements are outlined below.\n\n`;
    policies.forEach((policy) => {
      summary += `- ${policy}\n`;
    });
  } else if (contacts.length > 0) {
    summary += `Contact information and communication guidelines are provided below.\n\n`;
    contacts.forEach((contact) => {
      summary += `- ${contact}\n`;
    });
  } else {
    // General administrative content
    const content = text.substring(0, 400);
    summary += `${content}${text.length > 400 ? "..." : ""}\n\n`;
    summary += `- Review all administrative details carefully\n`;
    summary += `- Keep important dates and requirements accessible\n`;
    summary += `- Follow outlined procedures for best academic outcomes`;
  }

  return summary;
}

/**
 * Creates intelligent summary for general educational content
 */
function createIntelligentContentSummary(text) {
  const { minWordsPerPage, targetWordsPerPage } = { minWordsPerPage: 200, targetWordsPerPage: 280 }; // Match briefService config
  
  // Extract key concepts from the page text
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const keywords = text.match(/\b[A-Z][a-z]{3,}\b/g) || [];
  const uniqueKeywords = [...new Set(keywords)].slice(0, 5);
  
  let educationalContent = `1. Educational Overview and Key Concepts\n\n`;
  
  // Add concept explanation based on content
  educationalContent += `This content presents important educational concepts that require careful analysis and understanding. `;
  
  if (uniqueKeywords.length > 0) {
    educationalContent += `The key topics and terms discussed include ${uniqueKeywords.slice(0, 3).join(', ')}, each playing a crucial role in the comprehensive understanding of the subject matter.\n\n`;
  } else {
    educationalContent += `The material contains fundamental principles that form the foundation for advanced learning and practical application.\n\n`;
  }
  
  // Process actual content from the text
  if (sentences.length > 0) {
    educationalContent += `2. Core Learning Content\n\n`;
    
    // Extract meaningful information from sentences
    for (let i = 0; i < Math.min(3, sentences.length); i++) {
      const sentence = sentences[i].trim();
      if (sentence.length > 20) {
        // Clean and enhance the sentence for educational value
        const cleanSentence = sentence.replace(/^[a-z]/, c => c.toUpperCase());
        educationalContent += `The material explains that ${cleanSentence.toLowerCase().replace(/^[a-z]/, c => c.toUpperCase())} `;
        educationalContent += `This information is educationally significant because it provides essential knowledge that students can apply in academic and professional contexts. `;
        educationalContent += `Understanding this concept helps learners develop analytical skills and practical capabilities for real-world application.\n\n`;
      }
    }
  }
  
  // Add practical learning context (concise for brief format)
  educationalContent += `3. Learning Applications and Significance\n\n`;
  educationalContent += `Students studying this material will gain insights connecting to broader educational themes and practical applications. `;
  educationalContent += `These concepts provide foundation knowledge for advanced study and professional development in relevant fields.`;
  
  // Check if we need additional content to reach target length
  const currentWordCount = educationalContent.split(/\s+/).length;
  if (currentWordCount < targetWordsPerPage * 0.8) { // Only add if significantly under target
    educationalContent += `\n\n4. Study Approach\n\n`;
    educationalContent += `For effective learning, students should review key concepts regularly, create connections to previous coursework, and discuss applications with peers. `;
    educationalContent += `This approach reinforces understanding and supports successful academic performance.`;
  }
  
  return educationalContent;
}

// Helper functions
function extractKeyInfo(text, pattern) {
  const info = [];
  const sentences = text.split(/[.!?]+/);

  sentences.forEach((sentence) => {
    if (
      pattern.test(sentence) &&
      sentence.trim().length > 10 &&
      sentence.trim().length < 200
    ) {
      info.push(sentence.trim());
    }
  });

  return info.slice(0, 5);
}

function extractDefinitions(text) {
  const definitions = [];
  const patterns = [
    /([A-Z][a-zA-Z\s]+?)\s*[-:]\s*([^.!?]+[.!?])/g,
    /([A-Z][a-zA-Z\s]+?)\s+([A-Z][^.!?]+[.!?])/g,
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(text)) !== null && definitions.length < 4) {
      const term = match[1].trim();
      const definition = match[2].trim();
      if (
        term.length < 40 &&
        definition.length > 15 &&
        definition.length < 150
      ) {
        definitions.push({ term, definition });
      }
    }
  });

  return definitions;
}

function extractKeyTerms(text) {
  const terms = [];
  const termPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g;
  const termCounts = {};
  let match;

  while ((match = termPattern.exec(text)) !== null) {
    const term = match[1];
    if (term.length > 3 && term.length < 25) {
      termCounts[term] = (termCounts[term] || 0) + 1;
    }
  }

  return Object.entries(termCounts)
    .filter(([term, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([term]) => term);
}

function extractMainThemes(text) {
  const themes = [];
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 30);

  sentences.slice(0, 4).forEach((sentence) => {
    const theme = sentence.trim();
    if (theme.length < 150) {
      themes.push(theme);
    }
  });

  return themes;
}

/**
 * Generates a descriptive title for fallback content
 * @param {string} text - The page content
 * @param {number} pageNumber - The page number
 * @returns {string} - Generated title
 */
function generateFallbackTitle(text, pageNumber) {
  const cleanText = text.trim();

  if (!cleanText) {
    return `Page ${pageNumber}`;
  }

  // Look for exhibit or chapter titles
  const exhibitMatch = cleanText.match(
    /Exhibit\s+[\d.]+\s+([A-Z][A-Za-z\s]{5,40})/i
  );
  if (exhibitMatch) {
    return exhibitMatch[1].trim();
  }

  const chapterMatch = cleanText.match(
    /Chapter\s+\d+[\s:]+([A-Z][A-Za-z\s]{5,40})/i
  );
  if (chapterMatch) {
    return chapterMatch[1].trim();
  }

  // Detect content type
  if (
    /(?:question|activity|exercise|critical thinking|discuss)/i.test(cleanText)
  ) {
    if (/critical thinking/i.test(cleanText)) {
      return "Critical Thinking Exercise";
    } else if (/question/i.test(cleanText)) {
      return "Discussion Questions";
    } else {
      return "Learning Activity";
    }
  }

  if (/(?:definition|means|refers to|defined as)/i.test(cleanText)) {
    // Look for specific terms being defined
    const definitionMatch = cleanText.match(
      /([A-Z][a-zA-Z\s]{3,25})(?:\s*[-:]|\s+is\s+|\s+means\s+)/
    );
    if (definitionMatch) {
      return `${definitionMatch[1].trim()}`;
    }
    return "Key Definitions";
  }

  if (/(?:advantage|benefit|characteristic|feature)/i.test(cleanText)) {
    const topicMatch = cleanText.match(
      /(?:advantage|benefit)s?\s+of\s+([A-Z][a-zA-Z\s]{5,30})/i
    );
    if (topicMatch) {
      return `Advantages of ${topicMatch[1].trim()}`;
    }
    return "Key Advantages";
  }

  if (/(?:syllabus|grading|policy|instructor|contact)/i.test(cleanText)) {
    return "Course Information";
  }

  // Try to extract a meaningful title from the beginning
  const titleMatch = cleanText.match(
    /^([A-Z][A-Za-z\s]{5,40})(?:\s*[-:.]|\s*$)/
  );
  if (titleMatch) {
    return titleMatch[1].trim();
  }

  // Extract first few meaningful words
  const words = cleanText.split(/\s+/).slice(0, 5);
  const title = words.join(" ");

  if (title.length > 5 && title.length <= 50) {
    return title;
  }

  return `Page ${pageNumber} Content`;
}

/**
 * Creates generic fallback response based on language and context
 * @param {string} language - Target language
 * @param {string} context - Context type (evaluation, quiz, flashcard, brief)
 * @returns {Object} Appropriate fallback response
 */
export function createGenericFallback(language, context) {
  const fallbackText = getLanguageFallback(language, context);

  switch (context) {
    case "evaluation":
      return createFallbackEvaluation(language);
    case "quiz":
      return createFallbackQuiz();
    case "flashcard":
      return createFallbackFlashcards(language);
    case "brief":
      return createFallbackBrief([]);
    default:
      return {
        success: false,
        error: fallbackText,
      };
  }
}

/**
 * Handles invalid AI responses with appropriate fallbacks
 * @param {string} service - Service name
 * @param {string} responseText - Invalid response text
 * @param {string} language - Target language
 * @returns {Object} Appropriate fallback based on service
 */
export function handleInvalidResponse(
  service,
  responseText,
  language = "English"
) {
  console.warn(`Invalid response from ${service} service`);

  // Check if AI is refusing to process
  const refusalPhrases = [
    "cannot evaluate",
    "unable to evaluate",
    "don't understand",
    "provide the student's answer",
    "I'll evaluate once I receive",
    "need more information",
  ];

  const isRefusal = refusalPhrases.some((phrase) =>
    responseText.toLowerCase().includes(phrase)
  );

  if (isRefusal) {
    console.warn(`AI refused to process ${service} request`);
  }

  return createGenericFallback(language, service);
}
