import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from '../../utils/supabaseClient';

const LecturesPage = () => {
  const { name } = useParams()
  const navigate = useNavigate()
  const [subject, setSubject] = useState(null)
  const [lectures, setLectures] = useState([])
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  // Fetch subject and lectures data
  useEffect(() => {
    const fetchSubjectData = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        const { data, error: supabaseError } = await supabase
          .from('users')
          .select('subjects')
          .eq('user_id', user.id)
          .single();

        if (supabaseError) throw supabaseError;

        const displayName = decodeURIComponent(name)
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        const currentSubject = data?.subjects?.find(s => 
          s.title.toLowerCase() === displayName.toLowerCase()
        );

        if (currentSubject) {
          setSubject(currentSubject);
          setLectures(currentSubject.lectures || []);
        }
      } catch (error) {
        console.error("Error fetching subject data:", error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubjectData();
  }, [user, name, navigate]);

  const addLecture = async () => {
    try {
      // Get current subjects data
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('subjects')
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Create new lecture
      const newLecture = {
        id: crypto.randomUUID(),
        title: `Lecture ${(subject.lectures?.length || 0) + 1}`,
        date: new Date().toISOString(),
        flashcards: [],
        briefs: []
      };

      // Find and update the current subject
      const updatedSubjects = data.subjects.map(s => {
        if (s.id === subject.id) {
          return {
            ...s,
            lectures: [...(s.lectures || []), newLecture],
            lecture_count: (s.lectures?.length || 0) + 1
          };
        }
        return s;
      });

      // Update the database
      const { error: updateError } = await supabase
        .from('users')
        .update({ subjects: updatedSubjects })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Update local state
      setSubject(updatedSubjects.find(s => s.id === subject.id));
      setLectures(prev => [...prev, newLecture]);

    } catch (error) {
      console.error("Error adding lecture:", error);
      setError(error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">Subject not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative pb-24">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/')}
              className="text-blue-500 hover:text-blue-600 mb-4"
            >
              ← Back to Subjects
            </button>
            <h1 className="text-3xl font-bold">{subject.title}</h1>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Lectures ({lectures.length})</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {lectures.map(lecture => (
              <Link 
                key={lecture.id}
                to={`/subjects/${name}/lectures/${lecture.id}`}
                className="block hover:bg-gray-100 transition-colors"
              >
                <div className="p-4 bg-gray-50 rounded-lg h-full">
                  <div className="flex flex-col h-full">
                    <h3 className="font-medium mb-2">{lecture.title}</h3>
                    <p className="text-sm text-gray-500 mb-2">
                      {new Date(lecture.date).toLocaleDateString()}
                    </p>
                    <div className="text-sm text-gray-500 mt-auto">
                      <div>Flashcards: {lecture.flashcards?.length || 0}</div>
                      <div>Briefs: {lecture.briefs?.length || 0}</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          
          {lectures.length === 0 && (
            <p className="text-gray-500 text-center py-4">
              No lectures yet. Click the Add Lecture button to get started.
            </p>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-black p-4">
        <div className="max-w-7xl mx-auto px-4">
          <button
            onClick={addLecture}
            className="w-full bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg transition-colors border border-white"
          >
            Add Lecture
          </button>
        </div>
      </div>
    </div>
  );
};

export default LecturesPage;