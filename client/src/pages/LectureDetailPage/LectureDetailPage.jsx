import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/authHooks";
import FilesLayout from "../../components/FilesLayout";
import Brief from "../../components/subjects/Brief";
import QuizLayout from "../../components/subjects/QuizLayout";
import SEO from "../../components/SEO/SEO";

// Import our new components and hooks
import LectureHeader from "./LectureHeader";
import TabNavigation from "./TabNavigation";
import FlashcardsTab from "./FlashcardsTab";
import ErrorMessage from "./ErrorMessage";
import { useLectureData } from "../../hooks/useLectureData";
import { useFlashcardGeneration } from "../../hooks/useFlashcardGeneration";
import {
  useNavigateWithCleanup,
  createBackClickHandler,
} from "../../utils/navigationUtils";

const LectureDetailPage = () => {
  const { lectureId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Flashcards");
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeFlashcardSetIndex, setActiveFlashcardSetIndex] = useState(0);
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  // Use our custom hooks to manage data and state
  const {
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
    fetchLectureData,
    handleDeleteFile,
    handleFileUpload: uploadFile,
    isMounted,
    pendingRequests,
  } = useLectureData(lectureId, user?.id);

  // Use our flashcard generation hook
  const { isGenerating, generateFlashcards } = useFlashcardGeneration(
    user,
    lectureId,
    isMounted,
    setError,
    setProcessedData
  );

  // Use our navigation utility
  const navigateWithCleanup = useNavigateWithCleanup(
    navigate,
    isMounted,
    pendingRequests
  );
  const handleBackClick = createBackClickHandler(
    navigateWithCleanup,
    subjectId
  );

  // Handle file upload with state updates
  const handleFileUpload = async (event) => {
    if (!isMounted.current) return;

    setIsUploading(true);
    await uploadFile(event);
    setIsUploading(false);
  };

  // Handle file selection
  const handleFileSelect = (file) => {
    if (!isMounted.current) return;
    setSelectedFile(file);
    setError(null);
    setProcessedData(null);
  };

  // Handle flashcard generation through our hook
  const handleGenerateFlashcards = () => {
    generateFlashcards(selectedFile, getAllFlashcards());
  };

  // Get all flashcard sets (existing plus newly processed)
  const getAllFlashcards = () => {
    const allSets = [...flashcards];

    if (processedData && !processedData.isUploaded) {
      allSets.push(processedData);
    }

    return allSets;
  };

  // Handle flashcards modification
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
        <LectureHeader
          lectureTitle={lectureTitle}
          subjectTitle={subjectTitle}
          onBackClick={handleBackClick}
        />

        <ErrorMessage error={error} />

        {/* Main Content Card */}
        <div className="rounded-lg theme-border shadow-xl overflow-hidden bg-white dark:bg-[#1a1a22]">
          {/* Tabs & File Selector */}
          <TabNavigation
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            files={files}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
          />

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
              <FlashcardsTab
                files={files}
                selectedFile={selectedFile}
                isGenerating={isGenerating}
                handleGenerateFlashcards={handleGenerateFlashcards}
                flashcards={getAllFlashcards()}
                lectureId={lectureId}
                activeFlashcardSetIndex={activeFlashcardSetIndex}
                setActiveFlashcardSetIndex={setActiveFlashcardSetIndex}
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
                    if (prevSets.some((set) => set.id === updatedSet.id)) {
                      return prevSets;
                    }
                    return [...prevSets, updatedSet];
                  });

                  // Refresh data from database
                  fetchLectureData();
                }}
                onFlashcardsModified={handleFlashcardsModified}
                isMounted={isMounted}
              />
            ) : activeTab === "Briefs" ? (
              <Brief
                selectedFile={selectedFile}
                user={user}
                lectureId={lectureId}
              />
            ) : activeTab === "Quiz" ? (
              <QuizLayout
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
