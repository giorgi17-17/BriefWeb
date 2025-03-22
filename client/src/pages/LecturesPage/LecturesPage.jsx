import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../utils/authHooks";
import { supabase } from "../../utils/supabaseClient";
import { ChevronLeft, Plus } from "lucide-react";

const LecturesPage = () => {
  const location = useLocation();
  const subjectId = location.state?.subjectId;
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingLecture, setIsAddingLecture] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchLecturesData = async () => {
      if (!user) {
        navigate("/login");
        return;
      }

      if (!subjectId) {
        setError(
          "Subject not found. Please go back to the home page and try again."
        );
        setIsLoading(false);
        return;
      }

      try {
        // First, fetch the subject
        const { data: subjectData, error: subjectError } = await supabase
          .from("subjects")
          .select("*")
          .eq("id", subjectId)
          .single();
        setIsLoading(true);
        if (subjectError) {
          setError(subjectError.message);
          setIsLoading(false);
          return;
        }

        if (!subjectData) {
          setError("Subject not found.");
          setIsLoading(false);
          return;
        }

        setSubject(subjectData);

        // Then, fetch all lectures for this subject in ascending order by date
        const { data: lecturesData, error: lecturesError } = await supabase
          .from("lectures")
          .select(
            `
            *,
            files:files(count),
            flashcard_sets:flashcard_sets(count)
          `
          )
          .eq("subject_id", subjectId)
          .order("date", { ascending: true });

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
    if (!subject || !subjectId || isAddingLecture) return;

    try {
      setIsAddingLecture(true);
      // Use the current lectures length + 1 for the lecture title.
      const newLecture = {
        subject_id: subjectId,
        title: `Lecture ${lectures.length + 1}`,
        date: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("lectures")
        .insert(newLecture)
        .select(
          `
          *,
          files:files(count),
          flashcard_sets:flashcard_sets(count)
        `
        )
        .single();

      if (error) throw error;

      // Append the new lecture at the end of the list.
      setLectures((prev) => [...prev, data]);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsAddingLecture(false);
    }
  };

  const renderLectureCard = (lecture) => (
    <Link
      key={lecture.id}
      to={`/subjects/${subjectId}/lectures/${lecture.id}`}
      className="group relative theme-card rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100 opacity-0 dark:from-gray-700 dark:to-gray-600 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative p-6">
        <div className="flex flex-col h-full">
          <h3 className="font-semibold text-lg theme-text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {lecture.title}
          </h3>
          <p className="text-sm theme-text-tertiary mb-4">
            {new Date(lecture.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>
    </Link>
  );

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <div className="mb-4">
        <Plus className="w-12 h-12 mx-auto theme-text-tertiary" />
      </div>
      <p className="theme-text-tertiary text-lg">
        No lectures yet. Click the Add Lecture button to get started.
      </p>
    </div>
  );

  const renderLoadingState = () => (
    <div className="py-12 text-center">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-8 w-8 bg-blue-200 dark:bg-blue-700 rounded-full mb-4" />
        <div className="h-4 w-32 theme-bg-tertiary rounded" />
      </div>
    </div>
  );

  const renderError = () => (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
      <p className="text-red-600 dark:text-red-400">Error: {error}</p>
    </div>
  );

  const renderContent = () => {
    if (error) return renderError();

    return (
      <div className="space-y-8">
        {/* Header Section */}
        <div className="theme-bg-primary  ">
          <div className="max-w-7xl mx-auto py-6 px-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center theme-text-secondary hover:theme-text-primary font-medium mb-4 group"
            >
              <ChevronLeft className="w-5 h-5 mr-1 transform group-hover:-translate-x-1 transition-transform" />
              Back to Subjects
            </button>
            <h1 className="text-3xl font-bold theme-text-primary">
              {subject?.title || "Loading..."}
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="theme-card rounded-xl shadow-sm theme-border overflow-hidden">
            <div className="p-6 theme-border border-b">
              <h2 className="text-xl font-semibold theme-text-primary">
                Lectures {!isLoading && `(${lectures.length})`}
              </h2>
            </div>

            <div className="p-6">
              {isLoading ? (
                renderLoadingState()
              ) : lectures.length === 0 ? (
                renderEmptyState()
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {lectures.map(renderLectureCard)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-24 theme-bg-primary">
      {renderContent()}

      {/* Fixed Add Button */}
      <div className="fixed bottom-0 left-0 right-0 theme-bg-primary theme-border border-t p-4 backdrop-blur-lg bg-opacity-90">
        <div className="max-w-7xl mx-auto px-4">
          <button
            onClick={addLecture}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center font-medium disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-700 dark:hover:bg-blue-800"
            disabled={isLoading || isAddingLecture}
          >
            <Plus className="w-5 h-5 mr-2" />
            {isAddingLecture ? "Adding..." : "Add New Lecture"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LecturesPage;
