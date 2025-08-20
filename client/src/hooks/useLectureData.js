import { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabaseClient";
import { usePostHog } from "posthog-js/react";

export function useLectureData(lectureId, userId) {
  const [files, setFiles] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [error, setError] = useState(null);
  const [lectureTitle, setLectureTitle] = useState("");
  const [subjectTitle, setSubjectTitle] = useState("");
  const [subjectId, setSubjectId] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Add refs to track pending operations
  const isMounted = useRef(true);
  const pendingRequests = useRef({});

  const posthog = usePostHog();

  // Fetch initial lecture data
  const fetchLectureData = async () => {
    if (!isMounted.current) return;

    // Create an abort controller for this request
    const controller = new AbortController();
    const requestId = Date.now().toString();
    pendingRequests.current[requestId] = controller;

    try {
      console.log("Fetching lecture data including flashcard sets...");

      const { data: lectureData, error: lectureError } = await supabase
        .from("lectures")
        .select(
          `
            *,
            files(*),
            flashcard_sets(
              *,
              flashcards(*)
            )
          `
        )
        .eq("id", lectureId)
        .single();

      if (lectureError) throw lectureError;

      if (lectureData && isMounted.current) {
        // Fetch subject title
        if (lectureData.subject_id) {
          const { data: subjectData, error: subjectError } = await supabase
            .from("subjects")
            .select("title, id")
            .eq("id", lectureData.subject_id)
            .single();

          if (subjectError) {
            console.error("Error fetching subject data:", subjectError);
            // Don't throw - continue with empty subject data
          }

          if (subjectData && isMounted.current) {
            setSubjectTitle(subjectData.title || "");
            setSubjectId(subjectData.id);
          } else if (isMounted.current) {
            // Set default values if subject not found
            setSubjectTitle("");
            // Keep the existing subject ID from the lecture
            setSubjectId(lectureData.subject_id);
          }
        }

        // Get flashcard sets with their cards
        const allFlashcards = lectureData.flashcard_sets.map((set) => ({
          id: set.id,
          name: set.name,
          createdAt: set.created_at,
          cards: set.flashcards.map((card) => ({
            id: card.id,
            question: card.question,
            answer: card.answer,
          })),
          isUploaded: true,
        }));

        console.log(`Found ${allFlashcards.length} flashcard sets`);
        if (isMounted.current) {
          setFlashcards(allFlashcards);
          setFiles(lectureData.files || []);
          setLectureTitle(lectureData.title || "");
        }

        // Return the data in case we need it elsewhere
        return lectureData;
      }
    } catch (error) {
      console.error("Error fetching lecture data:", error);
      if (isMounted.current) {
        if (error.message.includes("not found")) {
          setError(
            "Lecture not found. Please go back to the home page and try again."
          );
        } else {
          setError(
            "Failed to load lecture data. Please try refreshing the page."
          );
        }
      }
      throw error; // Let the caller handle the error with isMounted check
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
      delete pendingRequests.current[requestId];
    }
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    if (!isMounted.current) return;

    const file = event.target.files[0];
    if (!file) return;

    setError(null);

    // Create an abort controller for this request
    const controller = new AbortController();
    const requestId = `upload-${Date.now()}`;
    pendingRequests.current[requestId] = controller;

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}/${lectureId}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("lecture-files")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      if (!isMounted.current) return;

      const {
        data: { publicUrl },
      } = supabase.storage.from("lecture-files").getPublicUrl(filePath);

      const { data: fileRecord, error: dbError } = await supabase
        .from("files")
        .insert({
          lecture_id: lectureId,
          url: publicUrl,
          name: file.name,
          path: filePath,
          size: file.size,
          type: file.type,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      if (isMounted.current) {
        setFiles((prev) => [...prev, fileRecord]);

        // Reset file input for mobile compatibility
        event.target.value = "";

        // Track successful file upload
        try {
          posthog.capture("file_upload", {
            lecture_id: lectureId,
            file_type: fileExt,
          });
        } catch (error) {
          console.error("PostHog event error:", error);
        }
      }

      return { isUploading: false };
    } catch (error) {
      console.error("Error uploading file:", error);
      if (isMounted.current) {
        setError(error.message);
      }
      return { isUploading: false, error: error.message };
    } finally {
      delete pendingRequests.current[requestId];
    }
  };

  // Handle file deletion
  const handleDeleteFile = async (fileId) => {
    if (!isMounted.current) return;

    setError(null);

    // Create an abort controller for this request
    const controller = new AbortController();
    const requestId = `delete-${Date.now()}`;
    pendingRequests.current[requestId] = controller;

    try {
      console.log("Deleting file with ID:", fileId);
      const fileToDelete = files.find((f) => f.id === fileId);
      if (!fileToDelete) {
        console.error("File not found for deletion:", fileId);
        throw new Error("File not found");
      }

      console.log("Found file to delete:", fileToDelete);

      if (fileToDelete.path) {
        // First attempt to remove the file from storage
        console.log("Removing file from storage:", fileToDelete.path);
        const { data: removeData, error: storageError } = await supabase.storage
          .from("lecture-files")
          .remove([fileToDelete.path]);

        if (storageError) {
          console.error("Error removing file from storage:", storageError);
          // We continue even if storage removal fails
        } else {
          console.log("Storage removal result:", removeData);
        }
      }

      if (!isMounted.current) return;

      // Then delete the database record
      console.log("Deleting file record from database");
      const { error: dbError } = await supabase
        .from("files")
        .delete()
        .eq("id", fileId);

      if (dbError) {
        console.error("Database deletion error:", dbError);
        throw dbError;
      }

      console.log("File successfully deleted");
      if (isMounted.current) {
        setFiles((prevFiles) => prevFiles.filter((f) => f.id !== fileId));
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      if (isMounted.current) {
        setError(error.message);
      }
    } finally {
      delete pendingRequests.current[requestId];
    }
  };

  // Set up effect for data fetching
  useEffect(() => {
    // Track mounted state
    isMounted.current = true;

    // Create a local reference to pendingRequests that will be captured in closure
    const requests = pendingRequests;

    if (userId && lectureId) {
      fetchLectureData();
    }

    // Cleanup function to prevent state updates after unmount
    return () => {
      // Mark as unmounted first
      isMounted.current = false;

      // Create a shallow copy of all current requests
      const requestsToAbort = { ...requests.current };

      // Abort all pending requests using the copy
      Object.values(requestsToAbort).forEach((controller) => {
        if (controller && controller.abort) {
          controller.abort();
        }
      });
    };
  }, [userId, lectureId]);

  return {
    files,
    flashcards,
    error,
    lectureTitle,
    subjectTitle,
    subjectId,
    processedData,
    setProcessedData,
    setFlashcards,
    setError,
    isLoading,
    fetchLectureData,
    handleFileUpload,
    handleDeleteFile,
    isMounted,
    pendingRequests,
  };
}
