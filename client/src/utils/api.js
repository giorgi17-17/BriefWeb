import axios from "axios";
import { BACKEND_URL } from "../helpers/helpers";

// Use environment variable for API URL instead of hardcoded localhost
const API_URL = BACKEND_URL || "http://localhost:5000";

console.log("API Configuration:", {
  API_URL,
  environment: import.meta.env.MODE,
});

// Create custom axios instance with longer timeout
const apiClient = axios.create({
  timeout: 60000, // 60 second timeout
  headers: {
    "Content-Type": "application/json",
  },
});

const handleProcessPdf = async (userId, lectureId, fileId) => {
  try {
    // Validate input parameters.
    if (!userId || !lectureId || !fileId) {
      throw new Error("Missing required parameters");
    }

    console.log(`Sending PDF processing request for lecture ${lectureId}`);

    // Use the API client with fixed endpoint
    const response = await apiClient.post(`${API_URL}/api/process-pdf`, {
      userId,
      lectureId,
      fileId,
    });

    console.log("Received API response:", response.status);
    console.log("Response data structure:", Object.keys(response.data || {}));

    // Check if response data exists.
    if (!response.data) {
      throw new Error("No data found in the response");
    }

    // Extract flashcards, handling different possible response structures.
    let flashcards;

    // Case 1: Direct flashcards array in response.
    if (Array.isArray(response.data.flashcards)) {
      console.log("Found flashcards array in response.data.flashcards");
      flashcards = response.data.flashcards;
    }
    // Case 2: Flashcards as a string that needs parsing.
    else if (typeof response.data.flashcards === "string") {
      console.log("Found flashcards as string in response.data.flashcards");
      try {
        const parsedData = JSON.parse(response.data.flashcards);

        // Check if parsed data is an array or has a flashcards property.
        if (Array.isArray(parsedData)) {
          flashcards = parsedData;
        } else if (Array.isArray(parsedData.flashcards)) {
          flashcards = parsedData.flashcards;
        } else {
          throw new Error("Invalid flashcards structure");
        }
      } catch (parseError) {
        console.error("Error parsing flashcards JSON:", parseError);
        throw new Error("Invalid JSON format for flashcards");
      }
    }
    // Case 3: Flashcards directly in response data.
    else if (Array.isArray(response.data)) {
      console.log("Found flashcards directly in response.data");
      flashcards = response.data;
    } else {
      console.error("Unexpected response structure:", response.data);
      throw new Error("Unable to extract flashcards from response");
    }

    // Validate flashcard structure.
    const isValidFlashcard = (card) =>
      card &&
      typeof card === "object" &&
      typeof card.question === "string" &&
      typeof card.answer === "string";

    // Filter out any invalid flashcards.
    const validFlashcards = flashcards.filter(isValidFlashcard);
    console.log(
      `Found ${validFlashcards.length} valid flashcards out of ${flashcards.length}`
    );

    if (validFlashcards.length === 0) {
      throw new Error("No valid flashcards found");
    }

    // Return the valid flashcards.
    console.log("Returning flashcards to UI");
    return validFlashcards;
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw error;
  }
};

// Improved client-side handler with enhanced validation and error handling.

const handleProcessBrief = async (userId, lectureId, fileId) => {
  try {
    // Validate input parameters
    if (!userId || typeof userId !== "string") {
      throw new Error("Invalid user ID");
    }
    if (!lectureId || typeof lectureId !== "string") {
      throw new Error("Invalid lecture ID");
    }
    if (!fileId || typeof fileId !== "string") {
      throw new Error("Invalid file ID");
    }

    console.log(`Sending brief processing request for lecture ${lectureId}`);

    // Use the API client with fixed endpoint
    const response = await apiClient.post(`${API_URL}/api/detailed-brief`, {
      userId,
      lectureId,
      fileId,
    });

    // Validate response structure
    if (!response.data || response.status !== 200) {
      throw new Error("Invalid server response");
    }

    // Extract and validate brief data
    const briefData = response.data.brief;
    if (!briefData) {
      throw new Error("No brief data received");
    }

    // Structure the response in a consistent format
    return {
      totalPages: Number(briefData.totalPages) || 1,
      pageSummaries: Array.isArray(briefData.pageSummaries)
        ? briefData.pageSummaries
        : [briefData.summary || "No summary available"],
      overview: {
        documentTitle: briefData.overview?.documentTitle || "Untitled Document",
        mainThemes: Array.isArray(briefData.overview?.mainThemes)
          ? briefData.overview.mainThemes
          : [],
        fileInfo: {
          fileName: briefData.overview?.fileName || fileId,
          pageCount: Number(briefData.totalPages) || 1,
        },
      },
      key_concepts: Array.isArray(briefData.key_concepts)
        ? briefData.key_concepts
        : [],
      important_details: Array.isArray(briefData.important_details)
        ? briefData.important_details
        : [],
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: userId,
        lectureId: lectureId,
      },
    };
  } catch (error) {
    // Enhanced error handling
    const errorMessage = error.response?.data?.message || error.message;
    console.error("Brief Processing Error:", {
      message: errorMessage,
      status: error.response?.status,
      userId,
      lectureId,
      fileId,
    });

    // Throw a standardized error object
    throw new Error(`Failed to process brief: ${errorMessage}`);
  }
};

async function handleProcessQuiz(userId, lectureId, fileId, quizOptions = {}) {
  try {
    if (!userId || !lectureId || !fileId) {
      throw new Error(
        "Missing required parameters: userId, lectureId, or fileId"
      );
    }

    // Ensure we're using strings for parameters
    const userIdStr = String(userId);
    const lectureIdStr = String(lectureId);
    const fileIdStr = String(fileId);

    console.log(`Sending quiz processing request for lecture ${lectureIdStr}`);

    // Use the API client with fixed endpoint
    const response = await apiClient.post(`${API_URL}/api/process-quiz`, {
      userId: userIdStr,
      lectureId: lectureIdStr,
      fileId: fileIdStr,
      quizOptions,
    });

    // Check if response data exists
    if (!response.data) {
      throw new Error("No data found in the response");
    }

    return response.data;
  } catch (error) {
    console.error("Error in handleProcessQuiz:", error);
    // Enhanced error handling to match the pattern of other endpoints
    const errorMessage = error.response?.data?.message || error.message;
    throw new Error(`Failed to process quiz: ${errorMessage}`);
  }
}

async function evaluateAnswer(questionText, modelAnswer, userAnswer) {
  try {
    if (!questionText || !modelAnswer || userAnswer === undefined) {
      throw new Error(
        "Missing required parameters: questionText, modelAnswer, or userAnswer"
      );
    }

    console.log("Sending answer evaluation request");

    // Use the API client with fixed endpoint
    const response = await apiClient.post(`${API_URL}/api/evaluate-answer`, {
      questionText,
      modelAnswer,
      userAnswer,
    });

    // Check if response data exists
    if (!response.data || !response.data.evaluation) {
      throw new Error("No evaluation found in the response");
    }

    return response.data.evaluation;
  } catch (error) {
    console.error("Error in evaluateAnswer:", error);
    // Enhanced error handling
    const errorMessage = error.response?.data?.message || error.message;
    throw new Error(`Failed to evaluate answer: ${errorMessage}`);
  }
}

export {
  handleProcessBrief,
  handleProcessPdf,
  handleProcessQuiz,
  evaluateAnswer,
};
