import { useState } from "react";
import { handleProcessPdf } from "../utils/api";
import { usePostHog } from "posthog-js/react";

export function useFlashcardGeneration(
  user,
  lectureId,
  isMounted,
  setError,
  setProcessedData
) {
  const [isGenerating, setIsGenerating] = useState(false);
  const posthog = usePostHog();

  const generateFlashcards = async (selectedFile, existingFlashcards = []) => {
    if (!isMounted.current || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      if (!selectedFile) {
        throw new Error("No file selected");
      }

      // First check if we already have a pending set for this file
      const pendingSetForFile = existingFlashcards.find(
        (set) => !set.isUploaded && set.name === selectedFile.name
      );

      if (pendingSetForFile) {
        console.log(
          `Already have pending flashcards for "${selectedFile.name}"`
        );
        setError(
          `Already processing flashcards for "${selectedFile.name}". Please wait for it to complete.`
        );
        return;
      }

      // Check if we already have uploaded flashcards for this file
      const existingSetForFile = existingFlashcards.find(
        (set) => set.name === selectedFile.name
      );

      if (existingSetForFile) {
        console.log(`Flashcards already exist for "${selectedFile.name}"`);
        setError(
          `Flashcards already exist for "${selectedFile.name}". Please delete the existing set first if you want to regenerate.`
        );
        return;
      }

      const filePath = selectedFile.path.split("/").pop();
      console.log(
        `Generating flashcards for ${selectedFile.name} (${filePath})`
      );

      console.log("Calling handleProcessPdf with:", {
        userId: user.id,
        lectureId,
        filePath,
      });

      const data = await handleProcessPdf(user.id, lectureId, filePath);

      if (!isMounted.current) return;

      console.log("Received data from handleProcessPdf:", {
        receivedData: !!data,
        dataType: typeof data,
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : "N/A",
      });

      if (!data || data.length === 0) {
        setError("No flashcards could be generated from this file.");
        return;
      }

      console.log(
        `Generated ${data.length} flashcards for file: ${selectedFile.name}`
      );

      // Create a stable ID that won't change across renders
      const fileSlug = selectedFile.name
        .replace(/\.[^/.]+$/, "") // Remove extension
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .replace(/[^a-z0-9-]/gi, "") // Remove special chars
        .toLowerCase();

      const uniqueId = `temp-${fileSlug}-${Date.now()}`;

      const processedDataObj = {
        id: uniqueId,
        name: selectedFile.name,
        createdAt: new Date().toISOString(),
        cards: data,
        isUploaded: false,
      };

      console.log("Setting processedData with:", {
        id: processedDataObj.id,
        name: processedDataObj.name,
        cardsCount: processedDataObj.cards.length,
        isUploaded: processedDataObj.isUploaded,
      });

      if (isMounted.current) {
        setProcessedData(processedDataObj);

        // Track flashcard generation with minimal properties
        try {
          posthog.capture("flashcard_generation", {
            lecture_id: lectureId,
            count: data.length,
          });
        } catch (error) {
          console.error("PostHog event error:", error);
        }
      }
    } catch (err) {
      console.error("Error generating flashcards:", err);
      if (isMounted.current) {
        setError(`Failed to generate flashcards: ${err.message}`);
      }
    } finally {
      if (isMounted.current) {
        setIsGenerating(false);
      }
    }
  };

  return {
    isGenerating,
    generateFlashcards,
  };
}
