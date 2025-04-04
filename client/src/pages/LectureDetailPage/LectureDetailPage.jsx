import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/authHooks";
import { supabase } from "../../utils/supabaseClient";
import { handleProcessPdf } from "../../utils/api";
import FlashcardComponent from "./FlashcardComponent";
import FilesLayout from "../../components/FilesLayout";
import Brief from "../../components/subjects/Brief";
import { FileSelector } from "../../components/FileSelector";
import { ChevronLeft } from "lucide-react";
import Quiz from "../../components/subjects/Quiz";
import SEO from "../../components/SEO/SEO";

const LectureDetailPage = () => {
  const { lectureId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Flashcards");
  const [flashcards, setFlashcards] = useState([]);
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [processedData, setProcessedData] = useState(null);
  const [subjectId, setSubjectId] = useState(null);
  const [lectureTitle, setLectureTitle] = useState("");
  const [subjectTitle, setSubjectTitle] = useState("");
  const [activeFlashcardSetIndex, setActiveFlashcardSetIndex] = useState(0);

  // Add refs to track pending operations
  const isMounted = useRef(true);
  const pendingRequests = useRef({});

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
        // These state updates will be handled by the caller with isMounted check

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
      delete pendingRequests.current[requestId];
    }
  };

  useEffect(() => {
    isMounted.current = true;

    if (user?.id && lectureId) {
      const loadData = async () => {
        try {
          const data = await fetchLectureData();
          // Only update state if component is still mounted
          if (isMounted.current && data) {
            setFiles(data.files || []);
            setLectureTitle(data.title || "");
            // We set the subject ID in fetchLectureData to ensure it's always consistent
          }
        } catch (error) {
          if (isMounted.current) {
            console.error("Error in useEffect data loading:", error);
            // Don't overwrite error from fetchLectureData
            if (!error.handled) {
              setError(error.message);
            }
          }
        }
      };

      loadData();
    }

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted.current = false;

      // Cancel all pending requests
      Object.values(pendingRequests.current).forEach((controller) => {
        if (controller && controller.abort) {
          controller.abort();
        }
      });

      // Clear state
      setFlashcards([]);
      setFiles([]);
      setProcessedData(null);
      setError(null);
      setIsGenerating(false);
      setIsUploading(false);
    };
  }, [user?.id, lectureId]);

  // Enhanced navigation handling
  const navigateWithCleanup = (path, state = {}) => {
    if (!isMounted.current) return;

    // First set that we're unmounting to prevent further state updates
    isMounted.current = false;

    // Cancel all pending operations
    Object.values(pendingRequests.current).forEach((controller) => {
      if (controller && controller.abort) {
        controller.abort();
      }
    });

    // Clear all state immediately
    setFlashcards([]);
    setFiles([]);
    setProcessedData(null);
    setError(null);
    setIsGenerating(false);
    setIsUploading(false);

    // Navigate immediately without setTimeout
    navigate(path, { state });
  };

  const handleBackClick = () => {
    // Get the current URL path segments
    const pathParts = window.location.pathname.split("/");

    // The URL structure should be /subjects/{subject-identifier}/lectures/{lecture-id}
    // So we want to extract the subject-identifier from the path
    if (pathParts.length >= 3) {
      const subjectIdentifier = pathParts[2];
      console.log(
        "Navigating back to subject page with identifier:",
        subjectIdentifier
      );
      navigateWithCleanup(`/subjects/${subjectIdentifier}`);
    } else if (subjectId) {
      // Fallback to using the subject ID from state if URL parsing fails
      console.log(
        "Navigating back to subject using state subjectId:",
        subjectId
      );
      navigateWithCleanup(`/subjects/${subjectId}`);
    } else {
      // If all else fails, go to subjects list
      console.log("No subject identifier available, going to subjects list");
      navigateWithCleanup("/subjects");
    }
  };

  const handleFileSelect = (file) => {
    if (!isMounted.current) return;
    setSelectedFile(file);
    setError(null);
    setProcessedData(null);
  };

  const handleGenerateFlashcards = async () => {
    if (!isMounted.current || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    // Create an abort controller for this request
    const controller = new AbortController();
    const requestId = `generate-${Date.now()}`;
    pendingRequests.current[requestId] = controller;

    try {
      if (!selectedFile) {
        throw new Error("No file selected");
      }

      // First check if we already have a pending set for this file
      const pendingSetForFile = getAllFlashcards().find(
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
      const existingSetForFile = flashcards.find(
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
      }
    } catch (err) {
      console.error("Error generating flashcards:", err);
      if (isMounted.current) {
        setError(`Failed to generate flashcards: ${err.message}`);
      }
    } finally {
      delete pendingRequests.current[requestId];
      if (isMounted.current) {
        setIsGenerating(false);
      }
    }
  };

  // Get all flashcard sets (existing plus newly processed)
  const getAllFlashcards = () => {
    const allSets = [...flashcards];

    console.log("getAllFlashcards - existing flashcards:", flashcards.length);

    if (processedData && !processedData.isUploaded) {
      console.log("getAllFlashcards - adding processedData:", {
        id: processedData.id,
        name: processedData.name,
        cardsCount: processedData.cards?.length || 0,
      });
      allSets.push(processedData);
    } else {
      console.log("getAllFlashcards - no processedData to add");
    }

    console.log("getAllFlashcards - returning total sets:", allSets.length);
    return allSets;
  };

  const handleFlashcardsModified = (updatedFlashcards) => {
    if (!isMounted.current) return;

    if (Array.isArray(updatedFlashcards) && updatedFlashcards.length > 0) {
      setFlashcards(
        updatedFlashcards.map((set) => ({
          ...set,
          isUploaded: true,
        }))
      );
    } else {
      setFlashcards([]);
    }
  };

  const handleFileUpload = async (event) => {
    if (!isMounted.current) return;

    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    // Create an abort controller for this request
    const controller = new AbortController();
    const requestId = `upload-${Date.now()}`;
    pendingRequests.current[requestId] = controller;

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${lectureId}/${Math.random()}.${fileExt}`;

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
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      if (isMounted.current) {
        setError(error.message);
      }
    } finally {
      delete pendingRequests.current[requestId];
      if (isMounted.current) {
        setIsUploading(false);
      }
    }
  };

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

  return (
    <div className="min-h-screen py-4 theme-bg-primary">
      <SEO
        title={`${lectureTitle}${subjectTitle ? ` - ${subjectTitle}` : ""}`}
        description={`Study materials, flashcards, and resources for ${lectureTitle}${
          subjectTitle ? ` in ${subjectTitle}` : ""
        }.`}
        keywords={[
          lectureTitle,
          subjectTitle,
          "lecture",
          "study materials",
          "flashcards",
          "educational resources",
        ]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "LearningResource",
          name: lectureTitle,
          description: `Educational materials for ${lectureTitle}${
            subjectTitle ? ` in ${subjectTitle}` : ""
          }`,
          educationalLevel: "College",
          learningResourceType: "Lecture",
          isPartOf: {
            "@type": "Course",
            name: subjectTitle,
          },
          provider: {
            "@type": "Organization",
            name: "Brief",
            sameAs: "https://yourwebsite.com",
          },
        }}
      />

      <div className="max-w-5xl mx-auto px-0 sm:px-4">
        {/* Header */}
        <header className="flex items-center justify-between mb-4">
          <button
            onClick={handleBackClick}
            className="flex items-center theme-text-secondary hover:text-blue-500 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            <span className="font-medium">Back to Lectures</span>
          </button>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Main Content Card */}
        <div className="rounded-lg theme-border shadow-xl overflow-hidden bg-white dark:bg-[#1a1a22]">
          {/* Tabs & File Selector */}
          <div className="flex flex-col lg:flex-row items-center justify-between  theme-border-primary px-4 py-3 ">
            <nav className="flex gap-2 flex-wrap bg-[#ebebeb] dark:bg-[#2a2a35] p-2 rounded-lg">
              {["Flashcards", "Briefs", "Quiz"].map((tab) => (
                <button
                  key={tab}
                  className={`px-3 py-1.5 text-[15px] font-medium rounded transition-colors ${
                    activeTab === tab
                      ? "bg-blue-600 text-white shadow-sm"
                      : "theme-text-secondary hover:bg-[#e0e7ff] dark:hover:bg-[#3a3a8a]"
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </nav>
            <div className="mt-2 lg:mt-0 flex items-center gap-3">
              <button
                className={`px-3 py-2 text-[15px] font-medium rounded transition-colors border ${
                  activeTab === "files"
                    ? "bg-blue-600 text-white shadow-sm border-blue-500"
                    : "theme-text-secondary hover:bg-[#e0e7ff] dark:hover:bg-[#3a3a8a] theme-border-primary"
                }`}
                onClick={() => setActiveTab("files")}
              >
                Files
              </button>
              <FileSelector
                files={files}
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
              />
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === "files" ? (
              <FilesLayout
                files={files}
                isUploading={isUploading}
                handleFileUpload={handleFileUpload}
                handleDeleteFile={handleDeleteFile}
              />
            ) : activeTab === "Flashcards" ? (
              <div className="space-y-4">
                {files.length > 0 ? (
                  <>
                    <div className="flex justify-start items-center gap-4">
                      <button
                        onClick={handleGenerateFlashcards}
                        className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                          isGenerating
                            ? "bg-blue-600/50 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700"
                        } text-white transition-colors`}
                        disabled={isGenerating}
                      >
                        {isGenerating
                          ? "Generating Flashcards..."
                          : "Generate Flashcards"}
                      </button>
                    </div>

                    <FlashcardComponent
                      flashcards={getAllFlashcards()}
                      lectureId={lectureId}
                      fileName={selectedFile?.name}
                      activeSetIndex={activeFlashcardSetIndex}
                      setActiveSetIndex={setActiveFlashcardSetIndex}
                      onFlashcardsUploaded={(updatedSet) => {
                        if (!isMounted.current) return;

                        console.log(
                          "Flashcards uploaded successfully:",
                          updatedSet.id
                        );

                        // Clear the processed data
                        setProcessedData(null);

                        // Update flashcards array without setting lastCreatedSetId
                        setFlashcards((prevSets) => {
                          if (
                            prevSets.some((set) => set.id === updatedSet.id)
                          ) {
                            return prevSets;
                          }
                          return [...prevSets, updatedSet];
                        });

                        // Refresh data from database
                        fetchLectureData();
                      }}
                      onFlashcardsModified={handleFlashcardsModified}
                    />
                  </>
                ) : (
                  <div className="text-center theme-text-secondary py-8">
                    Upload files first to generate flashcards.
                  </div>
                )}
              </div>
            ) : activeTab === "Briefs" ? (
              <Brief
                selectedFile={selectedFile}
                user={user}
                lectureId={lectureId}
              />
            ) : activeTab === "Quiz" ? (
              <Quiz
                selectedFile={selectedFile}
                user={user}
                lectureId={lectureId}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LectureDetailPage;
