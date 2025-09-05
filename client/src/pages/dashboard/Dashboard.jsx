import { useState, useEffect, useRef, useCallback } from "react";
import { SubjectCard } from "../../components/subjects/subject-card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/authHooks";
import { supabase } from "../../utils/supabaseClient";
import SEO from "../../components/SEO/SEO";
import { useUserPlan } from "../../contexts/UserPlanContext";
import { useTranslation } from "react-i18next";
import { getLocalizedSeoField } from "../../utils/seoTranslations";
import { usePostHog } from "posthog-js/react";

export default function Dashboard() {
  // State management
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [subjectCount, setSubjectCount] = useState(0);
  const [canAdd, setCanAdd] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [editingSubject, setEditingSubject] = useState(null);
  const [deletingSubject, setDeletingSubject] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const newSubjectInputRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFree, isPremium, canCreateSubject, subjectLimit } = useUserPlan();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const posthog = usePostHog();

  // Fetch subjects - using useCallback to prevent unnecessary recreation
  const fetchSubjects = useCallback(async () => {
    if (!user) {
      console.log('e')
      navigate("/login");
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

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
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, navigate, canCreateSubject]);

  // Manual refresh function
  const refreshDashboard = useCallback(() => {
    console.log("Manual dashboard refresh requested");
    setLoadingTimeout(false);
    setIsLoading(true);
    fetchSubjects();
  }, [fetchSubjects]);

  // Initial load and refresh when user changes
  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // Set a timer to show refresh button if loading takes too long
  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => {
        console.log("Loading timeout reached");
        if (isLoading) {
          setLoadingTimeout(true);
        }
      }, 5000); // Show refresh option after 5 seconds
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Update canAdd whenever premium status changes
  useEffect(() => {
    async function updateCanAddStatus() {
      if (isPremium) {
        setCanAdd(true);
      } else if (subjects.length > 0) {
        const canAddMore = await canCreateSubject();
        setCanAdd(canAddMore);
      }
    }

    updateCanAddStatus();
  }, [isPremium, isFree, subjectLimit, subjects.length, canCreateSubject]);

  // Focus input when add modal opens
  useEffect(() => {
    if (isModalOpen && newSubjectInputRef.current) {
      newSubjectInputRef.current.focus();
    }
  }, [isModalOpen]);

  // Handle adding a new subject
  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) {
      setError("Please enter a subject name");
      return;
    }

    try {
      if (!canAdd && isFree) {
        setError(
          "You have reached your subject limit. Please upgrade to create more subjects."
        );
        return;
      }

      setIsSubmitting(true);
      setError(null);

      const { error: supabaseError } = await supabase.from("subjects").insert({
        user_id: user.id,
        title: newSubjectName.trim(),
      });

      if (supabaseError) throw supabaseError;

      // Track subject creation in PostHog
      try {
        posthog.capture("subject_created", {
          subject_name: newSubjectName.trim(),
          user_id: user.id,
          user_plan: isPremium ? "premium" : "free",
          subject_count: subjectCount + 1,
        });
      } catch (error) {
        console.error("PostHog event error:", error);
      }

      // Refetch subjects after adding a new one
      await fetchSubjects();

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

  // Handle editing an existing subject
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

      const { error: supabaseError } = await supabase
        .from("subjects")
        .update({ title: editingSubject.title.trim() })
        .eq("id", editingSubject.id)
        .eq("user_id", user.id);

      if (supabaseError) throw supabaseError;

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

  // Handle deleting a subject
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

      const { error: supabaseError } = await supabase
        .from("subjects")
        .delete()
        .eq("id", deletingSubject.id)
        .eq("user_id", user.id);

      if (supabaseError) throw supabaseError;

      // Refetch subjects after deleting
      await fetchSubjects();

      // Reset and close modal
      setDeletingSubject(null);
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error("Error deleting subject:", error);
      setError(error.message || "Failed to delete subject");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigate to subject details
  const handleSubjectClick = (subjectId, subjectName) => {
    const urlName = encodeURIComponent(
      subjectName.toLowerCase().replace(/ /g, "-")
    );
    navigate(`/subjects/${urlName}`, { state: { subjectId } });
  };

  // Upgrade user to premium
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

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center theme-bg-primary">
        <div className="flex flex-col items-center space-y-4">
          <p className="text-xl theme-text-secondary">
            {t("dashboard.loading")}
          </p>
          {loadingTimeout && (
            <div className="flex flex-col items-center space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Loading is taking longer than expected
              </p>
              <button
                onClick={refreshDashboard}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                Refresh Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg-primary">
      <SEO
        title={getLocalizedSeoField("dashboard", "title", currentLang)}
        description={getLocalizedSeoField(
          "dashboard",
          "description",
          currentLang
        )}
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
            name: "Briefly",
            logo: {
              "@type": "ImageObject",
              url: "https://briefly.ge/icons/icon-512x512.png",
            },
          },
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold theme-text-primary">
            {t("dashboard.title")}
          </h1>
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
              {t("dashboard.subjectCount")} {subjectCount} / {subjectLimit}
              {subjectCount >= subjectLimit && (
                <span className="text-red-500 font-medium">
                  {" "}
                  {t("dashboard.limitReached")}
                </span>
              )}
            </div>
          )}

          {subjects.length === 0 ? (
            <div className="text-center py-8">
              <h1 className="theme-text-tertiary mb-4">
                {t("dashboard.noSubjects")}
              </h1>
              <button
                onClick={() => setIsModalOpen(true)}
                disabled={!canAdd && isFree}
                className={`px-6 py-3 rounded-lg transition-colors ${!canAdd && isFree
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                  : "theme-button-primary bg-blue-700 text-white"
                  }`}
              >
                {t("dashboard.createSubject")}
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
                        setError(t("dashboard.upgradeMessage"));
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
              className={`px-6 py-3 rounded-lg transition-colors ${!canAdd && isFree
                ? "bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                : "theme-button-primary bg-blue-700 text-white"
                }`}
            >
              {t("dashboard.addNewSubject")}
            </button>

            {/* Subject count indicator below button */}
            {isFree && (
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {canAdd ? (
                  <>
                    {t("dashboard.subjectsUsed")} {subjectCount} /{" "}
                    {subjectLimit}
                  </>
                ) : (
                  <span className="text-red-500">
                    {t("dashboard.subjectLimitReached")}
                  </span>
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
                {t("dashboard.addSubjectModal.title")}
              </h2>

              <input
                ref={newSubjectInputRef}
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSubmitting) {
                    handleAddSubject();
                  }
                }}
                placeholder={t("dashboard.addSubjectModal.placeholder")}
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
                  {t("dashboard.addSubjectModal.cancel")}
                </button>
                <button
                  onClick={handleAddSubject}
                  className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-md disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? t("dashboard.addSubjectModal.adding")
                    : t("dashboard.addSubjectModal.add")}
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
                {t("dashboard.editSubjectModal.title")}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSubmitting) {
                    handleEditSubject();
                  }
                }}
                placeholder={t("dashboard.editSubjectModal.placeholder")}
                className="w-full px-4 py-2 border theme-input rounded-md mb-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                  {t("dashboard.editSubjectModal.cancel")}
                </button>
                <button
                  onClick={handleEditSubject}
                  className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-md disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? t("dashboard.editSubjectModal.saving")
                    : t("dashboard.editSubjectModal.save")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Subject Confirmation Modal */}
        {isDeleteModalOpen && deletingSubject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 theme-modal-backdrop">
            <div className="theme-card p-6 rounded-lg w-96 max-w-[90%]">
              <h2 className="text-xl font-bold mb-4 theme-text-primary">
                {t("dashboard.deleteSubjectModal.title")}
              </h2>

              <p className="mb-6 theme-text-secondary">
                {t("dashboard.deleteSubjectModal.confirmationMessage")}{" "}
                <strong>&ldquo;{deletingSubject.title}&rdquo;</strong>
              </p>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletingSubject(null);
                    setError(null);
                  }}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {t("dashboard.deleteSubjectModal.cancel")}
                </button>
                <button
                  onClick={handleDeleteSubject}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? t("dashboard.deleteSubjectModal.deleting")
                    : t("dashboard.deleteSubjectModal.delete")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade Prompt */}
        {error === t("dashboard.upgradeMessage") && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 theme-modal-backdrop">
            <div className="theme-card p-6 rounded-lg w-96 max-w-[90%]">
              <h2 className="text-xl font-bold mb-4 theme-text-primary">
                {t("dashboard.upgradeMessage")}
              </h2>
              <div className="flex justify-center">
                <button
                  onClick={() => setError(null)}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md mr-4"
                >
                  {t("common.cancel")}
                </button>
                {!isPremium && (
                  <button
                    onClick={upgradeToPremium}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                  >
                    {t("dashboard.upgrade")}
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
