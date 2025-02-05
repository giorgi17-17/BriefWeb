import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from '../../utils/supabaseClient';
import { ChevronLeft, Plus } from 'lucide-react';

const LecturesPage = () => {
  const location = useLocation();
  const subjectId = location.state?.subjectId;
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchLecturesData = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      if (!subjectId) {
        setError('Subject not found. Please go back to the home page and try again.');
        setIsLoading(false);
        return;
      }

      try {
        // First, fetch the subject
        const { data: subjectData, error: subjectError } = await supabase
          .from('subjects')
          .select('*')
          .eq('id', subjectId)
          .single();

        if (subjectError) {
          setError(subjectError.message);
          setIsLoading(false);
          return;
        }

        if (!subjectData) {
          setError('Subject not found.');
          setIsLoading(false);
          return;
        }

        setSubject(subjectData);

        // Then, fetch all lectures for this subject in ascending order by date
        const { data: lecturesData, error: lecturesError } = await supabase
          .from('lectures')
          .select(`
            *,
            files:files(count),
            flashcard_sets:flashcard_sets(count)
          `)
          .eq('subject_id', subjectId)
          .order('date', { ascending: true });

        if (lecturesError) {
          setError(lecturesError.message);
          setIsLoading(false);
          return;
        }

        setLectures(lecturesData || []);
      } catch (error) {
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLecturesData();
  }, [user, navigate, subjectId]);

  const addLecture = async () => {
    if (!subject || !subjectId) return;

    try {
      // Use the current lectures length + 1 for the lecture title.
      const newLecture = {
        subject_id: subjectId,
        title: `Lecture ${lectures.length + 1}`,
        date: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('lectures')
        .insert(newLecture)
        .select(`
          *,
          files:files(count),
          flashcard_sets:flashcard_sets(count)
        `)
        .single();

      if (error) throw error;

      // Append the new lecture at the end of the list.
      setLectures(prev => [...prev, data]);
    } catch (error) {
      setError(error.message);
    }
  };

  const renderLectureCard = (lecture) => (
    <Link
      key={lecture.id}
      to={`/subjects/${subjectId}/lectures/${lecture.id}`}
      className="group relative bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative p-6">
        <div className="flex flex-col h-full">
          <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
            {lecture.title}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {new Date(lecture.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
      </div>
    </Link>
  );

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <div className="mb-4">
        <Plus className="w-12 h-12 mx-auto text-gray-400" />
      </div>
      <p className="text-gray-500 text-lg">
        No lectures yet. Click the Add Lecture button to get started.
      </p>
    </div>
  );

  const renderLoadingState = () => (
    <div className="py-12 text-center">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-8 w-8 bg-blue-200 rounded-full mb-4" />
        <div className="h-4 w-32 bg-gray-200 rounded" />
      </div>
    </div>
  );

  const renderError = () => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <p className="text-red-600">Error: {error}</p>
    </div>
  );

  const renderContent = () => {
    if (error) return renderError();

    return (
      <div className="space-y-8">
        {/* Header Section */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto py-6 px-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center hover:text-grey-200 font-medium mb-4 group"
            >
              <ChevronLeft className="w-5 h-5 mr-1 transform group-hover:-translate-x-1 transition-transform" />
              Back to Subjects
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              {subject?.title || 'Loading...'}
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Lectures {!isLoading && `(${lectures.length})`}
              </h2>
            </div>

            <div className="p-6">
              {isLoading ? renderLoadingState() : 
               lectures.length === 0 ? renderEmptyState() : 
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {lectures.map(renderLectureCard)}
               </div>
              }
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-24">
      {renderContent()}
      
      {/* Fixed Add Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 backdrop-blur-lg bg-opacity-90">
        <div className="max-w-7xl mx-auto px-4">
          <button
            onClick={addLecture}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || !subject}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Lecture
          </button>
        </div>
      </div>
    </div>
  );
};

export default LecturesPage;
