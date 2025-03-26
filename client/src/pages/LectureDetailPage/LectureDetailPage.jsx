import { useState, useEffect } from "react";
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
          setLectureTitle(lectureData.title || "");

          // Fetch subject title
          if (lectureData.subject_id) {
            const { data: subjectData } = await supabase
              .from("subjects")
              .select("title")
              .eq("id", lectureData.subject_id)
              .single();

            if (subjectData) {
              setSubjectTitle(subjectData.title || "");
            }
          }

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
    <div className="min-h-screen py-4 bg-[#121212]">
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

      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <header className="flex items-center justify-between mb-4">
          <button
            onClick={handleBackClick}
            className="flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            <span className="font-medium">Back to Subjects</span>
          </button>
        </header>

        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Main Content Card */}
        <div className="bg-gray-800/40 rounded-lg border border-gray-700 shadow-xl overflow-hidden">
          {/* Tabs & File Selector */}
          <div className="flex flex-col lg:flex-row items-center justify-between border-b border-gray-700 px-4 py-3">
            <nav className="flex gap-2 flex-wrap bg-gray-700/50 p-1 rounded-lg">
              {["Flashcards", "Briefs", "Quiz"].map((tab) => (
                <button
                  key={tab}
                  className={`px-3 py-1.5 text-[15px] font-medium rounded transition-colors ${
                    activeTab === tab
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-300 hover:bg-gray-600/80"
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
                    : "text-gray-300 hover:bg-gray-600/80 border-gray-700"
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
                      onFlashcardsUploaded={(updatedSet) => {
                        console.log("Uploaded cards:", updatedSet);
                        setProcessedData(null);
                        setFlashcards((prev) => [...prev, updatedSet]);
                      }}
                      onFlashcardsModified={handleFlashcardsModified}
                    />
                  </>
                ) : (
                  <div className="text-center text-gray-400 py-8">
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
