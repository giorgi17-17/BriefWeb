import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from '../../utils/supabaseClient';

const LectureDetailPage = () => {
  const { name, lectureId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('flashcards');
  const [flashcards, setFlashcards] = useState([]);
  const [briefs, setBriefs] = useState([]);
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // Fetch lecture data
  useEffect(() => {
    const fetchLectureData = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('subjects')
          .eq('user_id', user.id)
          .single();

        if (fetchError) throw fetchError;

        const displayName = decodeURIComponent(name)
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        const subject = data?.subjects?.find(s => 
          s.title.toLowerCase() === displayName.toLowerCase()
        );

        const lecture = subject?.lectures?.find(l => l.id === lectureId);

        if (lecture) {
          setFlashcards(lecture.flashcards || []);
          setBriefs(lecture.briefs || []);
          setFiles(lecture.files || []);
        }
      } catch (error) {
        console.error("Error fetching lecture data:", error);
        setError(error.message);
      }
    };

    fetchLectureData();
  }, [user, name, lectureId]);

  const handleFileUpload = async (event) => {
    try {
      setIsUploading(true);
      setError(null);
      const file = event.target.files[0];

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Only PDF, DOCX, and PPTX files are allowed');
      }

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${lectureId}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('lecture-files')
        .upload(filePath, file);

        console.log(data)

      if (uploadError) throw uploadError;

      // Get public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('lecture-files')
        .getPublicUrl(filePath);

      // Create file object
      const newFile = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        url: publicUrl,
        path: filePath,
        uploaded_at: new Date().toISOString()
      };

      // Update lecture in the database
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('subjects')
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const updatedSubjects = userData.subjects.map(subject => {
        if (subject.title.toLowerCase() === decodeURIComponent(name).toLowerCase()) {
          return {
            ...subject,
            lectures: subject.lectures.map(lecture => {
              if (lecture.id === lectureId) {
                return {
                  ...lecture,
                  files: [...(lecture.files || []), newFile]
                };
              }
              return lecture;
            })
          };
        }
        return subject;
      });

      const { error: updateError } = await supabase
        .from('users')
        .update({ subjects: updatedSubjects })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Update local state
      setFiles(prevFiles => [...prevFiles, newFile]);

    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    try {
      setError(null);
      
      // Find file to delete
      const fileToDelete = files.find(f => f.id === fileId);
      
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('lecture-files')
        .remove([fileToDelete.path]);

      if (deleteError) throw deleteError;

      // Update database
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('subjects')
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const updatedSubjects = userData.subjects.map(subject => {
        if (subject.title.toLowerCase() === decodeURIComponent(name).toLowerCase()) {
          return {
            ...subject,
            lectures: subject.lectures.map(lecture => {
              if (lecture.id === lectureId) {
                return {
                  ...lecture,
                  files: lecture.files.filter(f => f.id !== fileId)
                };
              }
              return lecture;
            })
          };
        }
        return subject;
      });

      const { error: updateError } = await supabase
        .from('users')
        .update({ subjects: updatedSubjects })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Update local state
      setFiles(prevFiles => prevFiles.filter(f => f.id !== fileId));

    } catch (error) {
      console.error('Error deleting file:', error);
      setError(error.message);
    }
  };

  const addFlashcard = () => {
    const newFlashcard = {
      id: Date.now(),
      question: '',
      answer: '',
    };
    setFlashcards([...flashcards, newFlashcard]);
  };

  const addBrief = () => {
    const newBrief = {
      id: Date.now(),
      title: `Brief ${briefs.length + 1}`,
      content: '',
    };
    setBriefs([...briefs, newBrief]);
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'application/pdf':
        return '📄'; // PDF icon
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return '📝'; // DOCX icon
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        return '📊'; // PPTX icon
      default:
        return '📁'; // Default file icon
    }
  };

  const handleFilePreview = (file) => {
    // For PDFs, we can display them directly in a new tab
    if (file.type === 'application/pdf') {
      window.open(file.url, '_blank');
      return;
    }

    // For DOCX and PPTX, we'll use Google Docs Viewer
    const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(file.url)}&embedded=true`;
    window.open(googleDocsUrl, '_blank');
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
                activeTab === 'flashcards'
                  ? 'border-b-2 border-blue-500 text-blue-500'
                  : 'text-gray-500'
              }`}
              onClick={() => setActiveTab('flashcards')}
            >
              Flashcards
            </button>
            <button
              className={`px-6 py-3 ${
                activeTab === 'briefs'
                  ? 'border-b-2 border-blue-500 text-blue-500'
                  : 'text-gray-500'
              }`}
              onClick={() => setActiveTab('briefs')}
            >
              Briefs
            </button>
            <button
              className={`px-6 py-3 ${
                activeTab === 'files'
                  ? 'border-b-2 border-blue-500 text-blue-500'
                  : 'text-gray-500'
              }`}
              onClick={() => setActiveTab('files')}
            >
              Files
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'files' ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <label className="relative cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
                  <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.pptx"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
                <p className="text-sm text-gray-500">
                  Supported formats: PDF, DOCX, PPTX
                </p>
              </div>

              {files.length > 0 ? (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <span className="text-2xl" role="img" aria-label="file type">
                          {getFileIcon(file.type)}
                        </span>
                        <div className="flex-1">
                          <h3 className="font-medium">{file.name}</h3>
                          <p className="text-sm text-gray-500">
                            {new Date(file.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleFilePreview(file)}
                          className="text-blue-500 hover:text-blue-600 px-3 py-1 rounded-md hover:bg-blue-50"
                        >
                          Preview
                        </button>
                        <a
                          href={file.url}
                          download={file.name}
                          className="text-green-500 hover:text-green-600 px-3 py-1 rounded-md hover:bg-green-50"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Download
                        </a>
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          className="text-red-500 hover:text-red-600 px-3 py-1 rounded-md hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">
                  No files uploaded yet
                </p>
              )}
            </div>
          ) : activeTab === 'flashcards' ? (
            <div className="space-y-4">
              <button
                onClick={addFlashcard}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add Flashcard
              </button>
              {flashcards.map((flashcard) => (
                <div
                  key={flashcard.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <textarea
                    placeholder="Question"
                    className="w-full p-2 border rounded"
                    rows="2"
                  />
                  <textarea
                    placeholder="Answer"
                    className="w-full p-2 border rounded"
                    rows="3"
                  />
                </div>
              ))}
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
                <div
                  key={brief.id}
                  className="border rounded-lg p-4 space-y-2"
                >
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