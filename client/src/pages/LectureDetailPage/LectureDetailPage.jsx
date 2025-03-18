import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../utils/supabaseClient";
import { handleProcessPdf } from "../../utils/api";
import FlashcardComponent from "./FlashcardComponent";
import FilesLayout from "../../components/FilesLayout";
import Brief from "../../components/subjects/Brief";
import { FileSelector } from "../../components/FileSelector";
import { ChevronLeft } from "lucide-react";
import Quiz from "../../components/subjects/Quiz";

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

  // Fetch initial lecture data
  useEffect(() => {
    const fetchLectureData = async () => {
      try {
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

        if (lectureData) {
          setFiles(lectureData.files || []);
          setSubjectId(lectureData.subject_id);
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
          setFlashcards(allFlashcards);
        }
      } catch (error) {
        console.error("Error fetching lecture data:", error);
        setError(error.message);
      }
    };

    if (user?.id && lectureId) {
      fetchLectureData();
    }
  }, [user?.id, lectureId]);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setError(null);
    setProcessedData(null);
  };

  const handleGenerateFlashcards = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      const filePath = selectedFile?.path.split("/").pop();
      if (!filePath) throw new Error("No file selected");

      const data = await handleProcessPdf(user.id, lectureId, filePath);
      if (data && data.length > 0) {
        setProcessedData({
          id: crypto.randomUUID(),
          name: selectedFile.name,
          createdAt: new Date().toISOString(),
          cards: data,
          isUploaded: false,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Get all flashcard sets (existing plus newly processed)
  const getAllFlashcards = () => {
    const allSets = [...flashcards];
    if (processedData && !processedData.isUploaded) {
      allSets.push(processedData);
    }
    return allSets;
  };

  const handleFlashcardsModified = (updatedFlashcards) => {
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
    const file = event.target.files[0];
    if (!file) return;
    setIsUploading(true);
    setError(null);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${lectureId}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("lecture-files")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("files").getPublicUrl(filePath);

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
      setFiles((prev) => [...prev, fileRecord]);
    } catch (error) {
      console.error("Error uploading file:", error);
      setError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    setError(null);
    try {
      const fileToDelete = files.find((f) => f.id === fileId);
      if (!fileToDelete) throw new Error("File not found");

      const { error: storageError } = await supabase.storage
        .from("files")
        .remove([fileToDelete.path]);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("files")
        .delete()
        .eq("id", fileId);
      if (dbError) throw dbError;

      setFiles((prevFiles) => prevFiles.filter((f) => f.id !== fileId));
    } catch (error) {
      console.error("Error deleting file:", error);
      setError(error.message);
    }
  };

  const handleBackClick = () => {
    navigate("/lectures", { state: { subjectId } });
  };

  return (
    <div className="min-h-screen py-4 theme-bg-primary">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-4">
          <button
            onClick={handleBackClick}
            className="flex items-center theme-text-secondary hover:theme-text-primary transition-colors"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            <span className="font-medium">Back to Subjects</span>
          </button>
        </header>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-3 py-2 rounded mb-4">
            {error}
          </div>
        )}

        {/* Main Content Card */}
        <div className="theme-card rounded">
          {/* Tabs & File Selector */}
          <div className="flex flex-col lg:flex-row items-center justify-between theme-border border-b px-4 py-3">
            <nav className="flex gap-2 flex-wrap theme-bg-tertiary p-1 rounded-lg">
              {["Flashcards", "Briefs", "Quiz", "files"].map((tab) => (
                <button
                  key={tab}
                  className={`px-3 py-1 text-[15px] font-medium rounded transition-colors ${
                    activeTab === tab
                      ? "theme-bg-primary theme-text-primary shadow-sm"
                      : "theme-text-secondary hover:theme-bg-secondary"
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
            <div className="mt-2 lg:mt-0">
              <FileSelector
                files={files}
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
              />
            </div>
          </div>

          {/* Tab Content */}
          <div className="px-4 py-3">
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
                        className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white px-4 py-2 rounded transition-colors"
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
                      onFlashcardsUploaded={(updatedSet) => {
                        console.log("Uploaded cards:", updatedSet);
                        setProcessedData(null);
                        setFlashcards((prev) => [...prev, updatedSet]);
                      }}
                      onFlashcardsModified={handleFlashcardsModified}
                    />
                  </>
                ) : (
                  <div className="text-center theme-text-tertiary py-4">
                    Upload files first to generate flashcards.
                  </div>
                )}
              </div>
            ) : activeTab === "Briefs" ? (
              <div className="">
                <Brief
                  selectedFile={selectedFile}
                  user={user}
                  lectureId={lectureId}
                />
              </div>
            ) : activeTab === "Quiz" ? (
              <div className=" text-center">
                <Quiz
                  selectedFile={selectedFile}
                  user={user}
                  lectureId={lectureId}
                />
              </div>
            ) : (
              <div></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LectureDetailPage;
