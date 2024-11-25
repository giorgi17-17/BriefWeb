import axios from "axios";


export const handleProcessPdf = async (userId, lectureId, fileId) => {
  try {
    // Validate input parameters
    if (!userId || !lectureId || !fileId) {
      throw new Error("Missing required parameters");
    }

    // Make API call to process PDF
    const response = await axios.post("/api/process-pdf", {
      userId,
      lectureId,
      fileId
    });

    // Log the entire response for debugging
    // console.log("Full API Response:", response.data);

    // Check if response data exists
    if (!response.data) {
      throw new Error("No data found in the response");
    }

    // Extract flashcards, handling different possible response structures
    let flashcards;

    // Case 1: Direct flashcards array in response
    if (Array.isArray(response.data.flashcards)) {
      flashcards = response.data.flashcards;
    } 
    // Case 2: Flashcards as a string that needs parsing
    else if (typeof response.data.flashcards === 'string') {
      try {
        const parsedData = JSON.parse(response.data.flashcards);
        
        // Check if parsed data is an array or has a flashcards property
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
    // Case 3: Flashcards directly in response data
    else if (Array.isArray(response.data)) {
      flashcards = response.data;
    }
    else {
      throw new Error("Unable to extract flashcards from response");
    }

    // Validate flashcard structure
    const isValidFlashcard = (card) =>
      card && 
      typeof card === 'object' &&
      typeof card.question === 'string' && 
      typeof card.answer === 'string';

    // Filter out any invalid flashcards
    const validFlashcards = flashcards.filter(isValidFlashcard);

    if (validFlashcards.length === 0) {
      throw new Error("No valid flashcards found");
    }

    // Return the valid flashcards
    return validFlashcards;

  } catch (error) {
    console.error("Error processing PDF:", error);
    throw error;
  }
};

export default handleProcessPdf;