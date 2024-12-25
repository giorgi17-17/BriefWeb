import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../utils/supabaseClient";
import { handleProcessPdf } from "../../utils/api";
import FlashcardComponent from "./FlashcardComponent";
import { handleFileUpload as uploadFile, handleDeleteFile as deleteFile } from "../../utils/fileHandlers";
import FilesLayout from "../../components/FilesLayout";

const LectureDetailPage = () => {
  const { name, lectureId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("flashcards");
  const [flashcards, setFlashcards] = useState([]);
  const [briefs, setBriefs] = useState([]);
  const [files, setFiles] = useState([]);
  const [subjectId, setSubjectId] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [processedData, setProcessedData] = useState(null);

  // Fetch initial data
  useEffect(() => {
    const fetchLectureData = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("users")
          .select("subjects")
          .eq("user_id", user.id)
          .single();

        if (fetchError) throw fetchError;

        const displayName = decodeURIComponent(name)
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        const subject = data?.subjects?.find(
          (s) => s.title.toLowerCase() === displayName.toLowerCase()
        );

        const lecture = subject?.lectures?.find((l) => l.id === lectureId);

        if (lecture) {
          setFlashcards(lecture.flashcards || []);
          setSubjectId(subject.id);
          setBriefs(lecture.briefs || []);
          setFiles(lecture.files || []);
        }
      } catch (error) {
        console.error("Error fetching lecture data:", error);
        setError(error.message);
      }
    };

    if (user?.id && lectureId) {
      fetchLectureData();
    }
  }, [user?.id, name, lectureId]);

  const handleFileSelect = async (file) => {
    setSelectedFile(file);
    setError(null);
    setProcessedData(null); // Clear any previous processed data
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
          cards: data
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Get all flashcard sets
  const getAllFlashcards = () => {
    const allSets = [...flashcards];
    if (processedData) {
      allSets.push(processedData);
    }
    return allSets;
  };

  const handleFileUpload = async (event) => {
    setIsUploading(true);
    setError(null);
    await uploadFile({
      file: event.target.files[0],
      user,
      lectureId,
      onSuccess: (newFile) => {
        setFiles((prevFiles) => [...prevFiles, newFile]);
        setIsUploading(false);
      },
      onError: (errorMessage) => {
        setError(errorMessage);
        setIsUploading(false);
      }
    });
  };

  const handleDeleteFile = async (fileId) => {
    setError(null);
    
    await deleteFile({
      fileId,
      files,
      user,
      lectureId,
      onSuccess: (deletedFileId) => {
        setFiles((prevFiles) => prevFiles.filter((f) => f.id !== deletedFileId));
      },
      onError: setError
    });
  };

  const addBrief = () => {
    const newBrief = {
      id: Date.now(),
      title: `Brief ${briefs.length + 1}`,
      content: "",
    };
    setBriefs([...briefs, newBrief]);
  };

  const handleFlashcardsModified = (updatedFlashcards) => {
    setFlashcards(updatedFlashcards);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate(`/subjects/${name}`)}
            className="text-blue-500 hover:text-blue-600 mb-4"
          >
            ← Back to Lectures
          </button>
          <h1 className="text-3xl font-bold">Lecture Details</h1>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b">
          <nav className="flex">
            <button
              className={`px-6 py-3 ${
                activeTab === "flashcards"
                  ? "border-b-2 border-blue-500 text-blue-500"
                  : "text-gray-500"
              }`}
              onClick={() => setActiveTab("flashcards")}
            >
              Flashcards
            </button>
            <button
              className={`px-6 py-3 ${
                activeTab === "briefs"
                  ? "border-b-2 border-blue-500 text-blue-500"
                  : "text-gray-500"
              }`}
              onClick={() => setActiveTab("briefs")}
            >
              Briefs
            </button>
            <button
              className={`px-6 py-3 ${
                activeTab === "files"
                  ? "border-b-2 border-blue-500 text-blue-500"
                  : "text-gray-500"
              }`}
              onClick={() => setActiveTab("files")}
            >
              Files
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "files" ? (
            <FilesLayout 
              files={files}
              isUploading={isUploading}
              handleFileUpload={handleFileUpload}
              handleDeleteFile={handleDeleteFile}
            />
          ) : activeTab === "flashcards" ? (
            <div className="space-y-4">
              {files.length > 0 ? (
                <div className="space-y-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select a file to generate flashcards from:
                    </label>
                    <select
                      className="w-full p-2 border rounded"
                      onChange={(e) => {
                        const file = files.find((f) => f.id === e.target.value);
                        if (file) handleFileSelect(file);
                      }}
                      value={selectedFile?.id || ""}
                    >
                      <option value="">Select a file</option>
                      {files.map((file) => (
                        <option key={file.id} value={file.id}>
                          {file.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedFile && (
                    <div className="space-y-4">
                      <button
                        onClick={handleGenerateFlashcards}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                        disabled={isGenerating}
                      >
                        {isGenerating
                          ? "Generating Flashcards..."
                          : "Generate Flashcards"}
                      </button>
                    </div>
                  )}

                  <div>
                    <FlashcardComponent
                      flashcards={getAllFlashcards()}
                      subjectId={subjectId}
                      lectureId={lectureId}
                      fileName={selectedFile?.name} 
                      onFlashcardsUploaded={(updatedSet) => {
                        console.log("Uploaded cards:", updatedSet);
                        setProcessedData(null);
                        // Update local flashcards state
                        setFlashcards(prev => [...prev, updatedSet]);
                      }}
                      onFlashcardsModified={handleFlashcardsModified}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  Upload files first to generate flashcards
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={addBrief}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add Brief
              </button>

              {briefs.map((brief) => (
                <div key={brief.id} className="border rounded-lg p-4 space-y-2">
                  <input
                    type="text"
                    placeholder="Brief Title"
                    className="w-full p-2 border rounded"
                    value={brief.title}
                  />
                  <textarea
                    placeholder="Brief Content"
                    className="w-full p-2 border rounded"
                    rows="4"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LectureDetailPage;
