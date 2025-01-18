import { useState, useEffect } from 'react';
import {  useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from '../../utils/supabaseClient';

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
        console.log('Fetching subject with ID:', subjectId);

        // First, fetch the subject
        const { data: subjectData, error: subjectError } = await supabase
          .from('subjects')
          .select('*')
          .eq('id', subjectId)
          .single();

        console.log('Subject data:', subjectData);

        if (subjectError) {
          console.error('Subject error:', subjectError);
          setError(subjectError.message);
          setIsLoading(false);
          return;
        }

        if (!subjectData) {
          setError('Subject not found');
          setIsLoading(false);
          return;
        }

        setSubject(subjectData);

        // Then fetch all lectures for this subject
        console.log('Fetching lectures for subject:', subjectId);
        
        const { data: lecturesData, error: lecturesError } = await supabase
          .from('lectures')
          .select(`
            *,
            files:files(count),
            flashcard_sets:flashcard_sets(count)
          `)
          .eq('subject_id', subjectId)
          .order('date', { ascending: false });

        console.log('Lectures data:', lecturesData);

        if (lecturesError) {
          console.error('Lectures error:', lecturesError);
          setError(lecturesError.message);
          setIsLoading(false);
          return;
        }

        setLectures(lecturesData || []);
      } catch (error) {
        console.error('Error in fetchLecturesData:', error);
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
      const newLecture = {
        subject_id: subjectId,
        title: `Lecture ${(lectures.length || 0) + 1}`,
        date: new Date().toISOString(),
      };

      console.log('Adding new lecture:', newLecture);

      const { data, error } = await supabase
        .from('lectures')
        .insert(newLecture)
        .select(`
          *,
          files:files(count),
          flashcard_sets:flashcard_sets(count)
        `)
        .single();

      if (error) {
        console.error('Error adding lecture:', error);
        throw error;
      }

      console.log('Added lecture:', data);
      setLectures(prev => [data, ...prev]);
    } catch (error) {
      console.error('Error in addLecture:', error);
      setError(error.message);
    }
  };

  const renderContent = () => {
    if (error) {
      return <p className="text-xl text-red-600 text-center">Error: {error}</p>;
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-blue-500 hover:text-blue-600 mb-4"
            >
              ← Back to Subjects
            </button>
            <h1 className="text-3xl font-bold">{subject?.title || 'Loading...'}</h1>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">
            Lectures {!isLoading && `(${lectures.length})`}
          </h2>

          {isLoading ? (
            <p className="text-gray-500 text-center py-4">Loading lectures...</p>
          ) : lectures.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No lectures yet. Click the Add Lecture button to get started.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {lectures.map((lecture) => (
                <Link
                  key={lecture.id}
                  to={`/subjects/${subjectId}/lectures/${lecture.id}`}
                  className="block hover:bg-gray-100 transition-colors"
                >
                  <div className="p-4 bg-gray-50 rounded-lg h-full">
                    <div className="flex flex-col h-full">
                      <h3 className="font-medium mb-2">{lecture.title}</h3>
                      <p className="text-sm text-gray-500 mb-2">
                        {new Date(lecture.date).toLocaleDateString()}
                      </p>
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="mr-4">Files: {lecture.files?.count || 0}</span>
                        <span>Flashcard Sets: {lecture.flashcard_sets?.count || 0}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen relative pb-24">
      {renderContent()}
      
      <div className="fixed bottom-0 left-0 right-0 bg-black p-4">
        <div className="max-w-7xl mx-auto px-4">
          <button
            onClick={addLecture}
            className="w-full bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg transition-colors border border-white"
            disabled={isLoading || !subject}
          >
            Add Lecture
          </button>
        </div>
      </div>
    </div>
  );
};

export default LecturesPage;
