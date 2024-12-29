import { useState, useEffect } from "react";
import { SubjectCard } from "../../components/subjects/subject-card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../utils/supabaseClient";

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch subjects from subjects table
  const fetchSubjects = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      setError(null);
      const { data, error: supabaseError } = await supabase
        .from("subjects")
        .select(`id, title, created_at`)
        .eq("user_id", user.id);

      if (supabaseError) throw supabaseError;

      setSubjects(data);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      setError("Failed to load subjects");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [user, navigate]);

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) {
      setError("Please enter a subject name");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Insert new subject into subjects table
      const { data, error: supabaseError } = await supabase
        .from("subjects")
        .insert({
          user_id: user.id,
          title: newSubjectName.trim(),
        })
        .select();
        console.log(data)
      if (supabaseError) throw supabaseError;

      // Refetch subjects after adding a new one
      fetchSubjects();

      // Reset form and close modal
      setNewSubjectName("");
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error adding subject:", error);
      setError(error.message || "Failed to add subject");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubjectClick = (subjectId, subjectName) => {
    const urlName = encodeURIComponent(
      subjectName.toLowerCase().replace(/ /g, "-")
    );
    navigate(`/subjects/${urlName}`, { state: { subjectId } });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">Loading...</p>
      </div>
    );
  }

  
  return (
    <div className="min-h-screen px-4 py-8">
      {/* Hero Section */}
      <section className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">
          Don&apos;t Struggle, Make It Brief
        </h1>
        <p className="text-xl text-gray-600">
          Create Flashcards and Briefs using AI
        </p>
      </section>

      {/* Error Display */}
      {error && (
        <div className="max-w-4xl mx-auto mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Subjects Section */}
      <section className="max-w-4xl mx-auto">
        {subjects.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">
              No subjects yet. Create your first subject!
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Create Subject
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                onClick={() => handleSubjectClick(subject.id, subject.title)}
                className="cursor-pointer"
              >
                <SubjectCard
                  subject={{
                    id: subject.id,
                    name: subject.title,
                    lectureCount: subject.lecture_count || 0,
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add Subject Button (only show if subjects exist) */}
      {subjects.length > 0 && (
        <div className="text-center mt-8">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Add New Subject
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-w-[90%]">
            <h2 className="text-xl font-bold mb-4">Add New Subject</h2>

            <input
              type="text"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="Enter subject name..."
              className="w-full px-4 py-2 border rounded-md mb-4"
              disabled={isSubmitting}
            />

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setError(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleAddSubject}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Adding..." : "Add Subject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
