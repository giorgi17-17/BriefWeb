import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../../utils/authHooks";
import { CirclePlus, Search } from "lucide-react";
import SubjectCard from "./SubjectCard";
import NewSubjectModal from "./NewSubjectModal";
import PlanAlert from "../../components/PlanAlert";
import { useUserPlan } from "../../contexts/UserPlanContext";

const SubjectsPage = () => {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [canAdd, setCanAdd] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canCreateSubject, isFree, subjectLimit } = useUserPlan();

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        if (!user) {
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        const { data: subjectsData, error } = await supabase
          .from("subjects")
          .select("*, lectures(count)")
          .eq("user_id", user.id)
          .order("name", { ascending: true });

        if (error) throw error;

        const formattedSubjects = subjectsData.map((subject) => ({
          ...subject,
          lectureCount: subject.lectures[0].count,
        }));

        setSubjects(formattedSubjects);

        // Check if user can add more subjects based on their plan
        const canAddMore = await canCreateSubject();
        setCanAdd(canAddMore);
      } catch (error) {
        console.error("Error fetching subjects:", error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubjects();
  }, [user, canCreateSubject]);

  const handleSubjectClick = (subjectId) => {
    navigate(`/lectures?subjectId=${subjectId}`);
  };

  const handleAddSubject = async (subjectData) => {
    try {
      // Verify again that the user can create more subjects
      const canAddMore = await canCreateSubject();

      if (!canAddMore && isFree) {
        setError(
          `You have reached the limit of ${subjectLimit} subjects on the free plan. Please upgrade to create more.`
        );
        return false;
      }

      const { data, error } = await supabase
        .from("subjects")
        .insert([{ ...subjectData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      setSubjects((prev) => [...prev, { ...data, lectureCount: 0 }]);

      // Update the canAdd state after adding a new subject
      setCanAdd(await canCreateSubject());

      return true;
    } catch (error) {
      console.error("Error adding subject:", error);
      setError(error.message);
      return false;
    }
  };

  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen theme-bg-primary p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-8 theme-text-primary">
            My Subjects
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="theme-card rounded-lg h-40 animate-pulse"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-bg-primary p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <h1 className="text-2xl font-bold theme-text-primary">My Subjects</h1>
          <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-md w-full sm:w-60 theme-input"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 theme-text-tertiary" />
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={!canAdd && isFree}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md ${
                !canAdd && isFree
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                  : "theme-button-primary"
              }`}
            >
              <CirclePlus className="h-5 w-5" />
              <span>Add Subject</span>
            </button>
          </div>
        </div>

        {/* Plan alert banner for free users */}
        {isFree && <PlanAlert />}

        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {filteredSubjects.length === 0 ? (
          <div className="theme-card rounded-lg p-8 text-center">
            <h3 className="text-xl font-semibold mb-2 theme-text-primary">
              No subjects found
            </h3>
            <p className="theme-text-secondary mb-6">
              {subjects.length === 0
                ? "Get started by adding your first subject"
                : "No subjects match your search"}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={!canAdd && isFree}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md mx-auto ${
                !canAdd && isFree
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                  : "theme-button-primary"
              }`}
            >
              <CirclePlus className="h-5 w-5" />
              <span>Add Subject</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                onClick={() => handleSubjectClick(subject.id)}
              />
            ))}
          </div>
        )}
      </div>

      <NewSubjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddSubject={handleAddSubject}
      />
    </div>
  );
};

export default SubjectsPage;
