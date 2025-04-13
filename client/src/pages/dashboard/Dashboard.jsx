import { useState, useEffect } from "react";
import { SubjectCard } from "../../components/subjects/subject-card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/authHooks";
import { supabase } from "../../utils/supabaseClient";
import SEO from "../../components/SEO/SEO";
import { useUserPlan } from "../../contexts/UserPlanContext";

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [editingSubject, setEditingSubject] = useState(null);
  const [deletingSubject, setDeletingSubject] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canAdd, setCanAdd] = useState(false);
  const [subjectCount, setSubjectCount] = useState(0);

  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFree, isPremium, canCreateSubject, subjectLimit } = useUserPlan();

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

      setSubjects(data || []);
      setSubjectCount(data?.length || 0);

      // Check if user can add more subjects
      const canAddMore = await canCreateSubject();
      setCanAdd(canAddMore);
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
      // Verify user can create more subjects
      const canAddMore = await canCreateSubject();

      if (!canAddMore && isFree) {
        setError(
          "You have reached your subject limit. Please upgrade to create more subjects."
        );
        return;
      }

      setIsSubmitting(true);
      setError(null);

      // Insert new subject into subjects table
      const { error: supabaseError } = await supabase.from("subjects").insert({
        user_id: user.id,
        title: newSubjectName.trim(),
      });

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

  const handleEditSubject = async () => {
    if (!editingSubject || !editingSubject.title.trim()) {
      setError("Subject name cannot be empty");
      return;
    }

    if (!editingSubject.id) {
      setError("Invalid subject to edit");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      console.log(editingSubject.title);

      const { data, error: supabaseError } = await supabase
        .from("subjects")
        .update({ title: editingSubject.title.trim() })
        .eq("id", editingSubject.id)
        .eq("user_id", user.id);

      if (supabaseError) throw supabaseError;
      if (!data || data.length === 0) {
        console.log("data " + data);
        console.log(supabaseError);
        // throw new Error("No subject updated. Check your permissions.");
      }

      await fetchSubjects();
      setEditingSubject(null);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Error editing subject:", error);
      setError(error.message || "Failed to update subject");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubject = async () => {
    if (!deletingSubject) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Check if user is premium before allowing deletion
      if (!isPremium) {
        setError("Please upgrade to delete subjects");
        setIsDeleteModalOpen(false);
        setDeletingSubject(null);
        setIsSubmitting(false);
        return;
      }

      // Extensive logging
      console.log("Current User:", user);
      console.log("Deleting Subject:", deletingSubject);

      // Validate user and subject
      if (!user) {
        throw new Error("No authenticated user found");
      }

      // Perform delete with detailed logging
      const { data, error: supabaseError } = await supabase
        .from("subjects")
        .delete()
        .eq("id", deletingSubject.id)
        .eq("user_id", user.id);

      // Log the result of the delete operation
      console.log("Delete Operation Result:", {
        data,
        supabaseError,
        subjectId: deletingSubject.id,
        userId: user.id,
      });

      // Throw error if operation failed
      if (supabaseError) throw supabaseError;

      // Check if any rows were actually deleted

      // Refetch subjects after deleting
      await fetchSubjects();

      // Reset and close modal
      setDeletingSubject(null);
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error("Detailed Error deleting subject:", {
        message: error.message,
        fullError: error,
      });
      setError(error.message || "Failed to delete subject");
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

  // Add a function to upgrade the user to premium
  const upgradeToPremium = async () => {
    try {
      if (!user) return;

      // Direct Supabase insert/update
      const { error } = await supabase.from("user_plans").upsert({
        user_id: user.id,
        plan_type: "premium",
        subject_limit: 999,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      alert("Successfully upgraded to premium! Refreshing page...");
      window.location.reload();
    } catch (err) {
      console.error("Error upgrading to premium:", err);
      setError("Failed to upgrade to premium. See console for details.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center theme-bg-primary">
        <p className="text-xl theme-text-secondary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg-primary">
      <SEO
        title="Dashboard"
        description="Access your subjects, create flashcards and briefs using AI. Organize your educational materials all in one place."
        keywords={[
          "dashboard",
          "subjects",
          "educational materials",
          "flashcards",
          "student resources",
        ]}
        noIndex={true} // Keep dashboard private from search engines
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Student Dashboard",
          description: "Access your educational materials and study resources",
          publisher: {
            "@type": "Organization",
            name: "Brief",
            logo: {
              "@type": "ImageObject",
              url: "https://yourwebsite.com/icons/icon-512x512.png",
            },
          },
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold theme-text-primary">Dashboard</h1>
          <p className="mt-2 theme-text-secondary">
            Manage your subjects and learning materials
          </p>
        </header>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-md mb-6">
            <p>{error}</p>
          </div>
        )}

        {/* Subjects Section */}
        <section className="max-w-xl mx-auto">
          {/* Subject limit indicator for free users */}
          {isFree && (
            <div className="mb-4 text-center text-sm text-gray-500 dark:text-gray-400">
              You have created {subjectCount} of {subjectLimit} available
              subjects
              {!canAdd && (
                <span className="text-red-500 font-medium">
                  {" "}
                  (Limit reached)
                </span>
              )}
            </div>
          )}

          {subjects.length === 0 ? (
            <div className="text-center py-8">
              <p className="theme-text-tertiary mb-4">
                No subjects yet. Create your first subject!
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                disabled={!canAdd && isFree}
                className={`px-6 py-3 rounded-lg transition-colors ${
                  !canAdd && isFree
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                    : "theme-button-primary bg-blue-700 text-white"
                }`}
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
                    isPremium={isPremium}
                    onEdit={(e) => {
                      e.stopPropagation();
                      setEditingSubject({
                        id: subject.id,
                        title: subject.title,
                      });
                      setIsEditModalOpen(true);
                    }}
                    onDelete={(e) => {
                      e.stopPropagation();
                      if (!isPremium) {
                        setError("Please upgrade to delete subjects");
                        return;
                      }
                      setDeletingSubject({
                        id: subject.id,
                        title: subject.title,
                      });
                      setIsDeleteModalOpen(true);
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
              disabled={!canAdd && isFree}
              className={`px-6 py-3 rounded-lg transition-colors ${
                !canAdd && isFree
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                  : "theme-button-primary bg-blue-700 text-white"
              }`}
            >
              Add New Subject
            </button>

            {/* Subject count indicator below button */}
            {isFree && (
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {canAdd ? (
                  `${subjectCount}/${subjectLimit} subjects used`
                ) : (
                  <span className="text-red-500">Subject limit reached</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Add Subject Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 theme-modal-backdrop">
            <div className="theme-card p-6 rounded-lg w-96 max-w-[90%]">
              <h2 className="text-xl font-bold mb-4 theme-text-primary">
                Add New Subject
              </h2>

              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="Enter subject name..."
                className="w-full px-4 py-2 border theme-input rounded-md mb-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                disabled={isSubmitting}
              />

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setError(null);
                  }}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSubject}
                  className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-md disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Adding..." : "Add Subject"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Subject Modal */}
        {isEditModalOpen && editingSubject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 theme-modal-backdrop">
            <div className="theme-card p-6 rounded-lg w-96 max-w-[90%]">
              <h2 className="text-xl font-bold mb-4 theme-text-primary">
                Edit Subject
              </h2>

              <input
                type="text"
                value={editingSubject.title}
                onChange={(e) =>
                  setEditingSubject({
                    ...editingSubject,
                    title: e.target.value,
                  })
                }
                placeholder="Enter subject name..."
                className="w-full px-4 py-2 border rounded-md mb-4 theme-input bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                disabled={isSubmitting}
              />

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingSubject(null);
                    setError(null);
                  }}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSubject}
                  className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-md disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && deletingSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="theme-card rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold mb-4 theme-text-primary">
                Delete Subject
              </h2>

              {!isPremium ? (
                <div className="mb-4 text-gray-700 dark:text-gray-300">
                  <p>
                    Subject deletion is available after upgrading to premium.
                  </p>
                </div>
              ) : (
                <p className="mb-4 theme-text-secondary">
                  Are you sure you want to delete {deletingSubject.title}? This
                  action cannot be undone.
                </p>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingSubject(null);
                  }}
                  className="px-4 py-2 theme-button-secondary rounded"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>

                {isPremium && (
                  <button
                    onClick={handleDeleteSubject}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Deleting..." : "Delete"}
                  </button>
                )}

                {!isPremium && (
                  <button
                    onClick={upgradeToPremium}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                  >
                    Upgrade
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
