import axios from "axios";
import { BACKEND_URL } from "../helpers/helpers";

const handleProcessPdf = async (userId, lectureId, fileId) => {
  try {
    // Validate input parameters.
    if (!userId || !lectureId || !fileId) {
      throw new Error("Missing required parameters");
    }

    // Make API call to process PDF.
    const response = await axios.post(`${BACKEND_URL}/api/process-pdf`, {
      userId,
      lectureId,
      fileId,
    });

    // Check if response data exists.
    if (!response.data) {
      throw new Error("No data found in the response");
    }

    // Extract flashcards, handling different possible response structures.
    let flashcards;

    // Case 1: Direct flashcards array in response.
    if (Array.isArray(response.data.flashcards)) {
      flashcards = response.data.flashcards;
    }
    // Case 2: Flashcards as a string that needs parsing.
    else if (typeof response.data.flashcards === "string") {
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
      flashcards = response.data;
    } else {
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

    if (validFlashcards.length === 0) {
      throw new Error("No valid flashcards found");
    }

    // Return the valid flashcards.
    return validFlashcards;
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw error;
  }
};

// Improved client-side handler with enhanced validation and error handling.

const handleProcessBrief = async (userId, lectureId, fileId) => {
  try {
    // Enhanced input validation
    if (!userId || typeof userId !== "string") {
      throw new Error("Invalid user ID");
    }
    if (!lectureId || typeof lectureId !== "string") {
      throw new Error("Invalid lecture ID");
    }
    if (!fileId || typeof fileId !== "string") {
      throw new Error("Invalid file ID");
    }

    const response = await axios.post(`${BACKEND_URL}/api/detailed-brief`, {
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

    const response = await fetch(`${BACKEND_URL}/api/process-quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userIdStr,
        lectureId: lectureIdStr,
        fileId: fileIdStr,
        quizOptions,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Failed to process quiz:", {
        status: response.status,
        statusText: response.statusText,
        errorData,
        params: { userId, lectureId, fileId, quizOptions },
      });

      throw new Error(
        errorData.message ||
          `Failed to process quiz: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error in handleProcessQuiz:", error);
    throw error;
  }
}

export { handleProcessBrief, handleProcessPdf, handleProcessQuiz };
