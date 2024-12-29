import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../utils/supabaseClient";
import { handleProcessPdf } from "../../utils/api";
import FlashcardComponent from "./FlashcardComponent";
import FilesLayout from "../../components/FilesLayout";

const LectureDetailPage = () => {
  const {  lectureId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab]  = useState("flashcards");
  const [flashcards, setFlashcards] = useState([]);
  const [briefs, setBriefs] = useState([]);
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [processedData, setProcessedData] = useState(null);
  const [subjectId, setSubjectId] = useState(null);

  // Fetch initial data
  useEffect(() => {
    const fetchLectureData = async () => {
      try {
        // Fetch lecture with related files, flashcard sets, and subject_id
        const { data: lectureData, error: lectureError } = await supabase
          .from("lectures")
          .select(`
            *,
            files(*),
            flashcard_sets(
              *,
              flashcards(*)
            )
          `)
          .eq("id", lectureId)
          .single();

        if (lectureError) throw lectureError;

        if (lectureData) {
          setFiles(lectureData.files || []);
          // Store subject_id for navigation
          setSubjectId(lectureData.subject_id);
          // Transform flashcard sets data
          const allFlashcards = lectureData.flashcard_sets.map(set => ({
            id: set.id,
            name: set.name,
            createdAt: set.created_at,
            cards: set.flashcards.map(card => ({
              id: card.id,
              question: card.question,
              answer: card.answer
            })),
            isUploaded: true
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
          cards: data,
          isUploaded: false
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
    if (processedData && !processedData.isUploaded) {
      allSets.push(processedData);
    }
    return allSets;
  };

  const handleFlashcardsModified = (updatedFlashcards) => {
    // Only update if we have valid flashcards
    if (Array.isArray(updatedFlashcards) && updatedFlashcards.length > 0) {
      setFlashcards(updatedFlashcards.map(set => ({
        ...set,
        isUploaded: true
      })));
    } else {
      // If no flashcards left, reset to empty array
      setFlashcards([]);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${lectureId}/${Math.random()}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('lecture-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('files')
        .getPublicUrl(filePath);

      // Insert file record
      const { data: fileRecord, error: dbError } = await supabase
        .from('files')
        .insert({
          lecture_id: lectureId,
          url: publicUrl,
          name: file.name,
          path: filePath,
          size: file.size,
          type: file.type
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setFiles(prev => [...prev, fileRecord]);
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    setError(null);
    
    try {
      const fileToDelete = files.find(f => f.id === fileId);
      if (!fileToDelete) throw new Error('File not found');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([fileToDelete.path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      setFiles(prevFiles => prevFiles.filter(f => f.id !== fileId));
    } catch (error) {
      console.error('Error deleting file:', error);
      setError(error.message);
    }
  };

  const addBrief = () => {
    const newBrief = {
      id: Date.now(),
      title: `Brief ${briefs.length + 1}`,
      content: "",
    };
    setBriefs([...briefs, newBrief]);
  };

  const handleBackClick = () => {
    // Navigate back to lectures page with subject_id
    navigate('/lectures', { state: { subjectId } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={handleBackClick}
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
