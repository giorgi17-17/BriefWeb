import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../utils/authHooks";
import { supabase } from "../../utils/supabaseClient";
import { ChevronLeft, Plus, AlertCircle } from "lucide-react";
import SEO from "../../components/SEO/SEO";
import { useTranslation } from "react-i18next";
import { getLocalizedSeoField } from "../../utils/seoTranslations";
import { getCanonicalUrl } from "../../utils/languageSeo";
import { useUserPlan } from "../../contexts/UserPlanContext";

// Helper to check if a string is a valid UUID
const isUuid = (str) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const LecturesPage = () => {
  const location = useLocation();
  const { name: subjectIdFromUrl } = useParams();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  // Get subject ID from URL param or location state, ensuring it's a UUID
  const subjectIdFromUrlOrState = subjectIdFromUrl || location.state?.subjectId;
  const exactTitleFromState = location.state?.exactTitle;
  const [subjectId, setSubjectId] = useState(null);

  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingLecture, setIsAddingLecture] = useState(false);
  const { user } = useAuth();
  const { isPremium, canCreateLecture, MAX_FREE_LECTURES_PER_SUBJECT } =
    useUserPlan();
  const [canAdd, setCanAdd] = useState(true);

  // Extract the subject ID resolution logic to a reusable function
  const resolveSubjectId = async (idOrSlug) => {
    if (!idOrSlug) {
      setError(
        "Subject not found. Please go back to the home page and try again."
      );
      setIsLoading(false);
      return;
    }

    // If it's already a UUID, use it directly
    if (isUuid(idOrSlug)) {
      console.log("Subject ID is a valid UUID:", idOrSlug);
      setSubjectId(idOrSlug);
      return;
    }

    // If we have the exact title from state, try to find by exact match first
    if (exactTitleFromState) {
      console.log("Using exact title from state:", exactTitleFromState);
      try {
        const { data: exactData, error: exactError } = await supabase
          .from("subjects")
          .select("id")
          .eq("title", exactTitleFromState)
          .eq("user_id", user.id)
          .limit(1);

        if (!exactError && exactData && exactData.length > 0) {
          console.log("Found subject by exact state title:", exactData[0].id);
          setSubjectId(exactData[0].id);
          return;
        }
      } catch (err) {
        console.error("Error finding subject by exact state title:", err);
        // Continue to regular search if this fails
      }
    }

    // If not a UUID, try to find the subject by exact slug match first
    console.log("Subject ID is not a UUID, searching by slug/title:", idOrSlug);
    try {
      // First attempt: Find subject by exact match of URL slug format
      const slugFormatted = idOrSlug.replace(/-/g, " ");

      // Try exact match first (case insensitive)
      const { data: exactMatch, error: exactError } = await supabase
        .from("subjects")
        .select("id, title")
        .ilike("title", slugFormatted)
        .eq("user_id", user.id)
        .limit(10);

      if (!exactError && exactMatch && exactMatch.length > 0) {
        // Find the exact match by comparing normalized strings
        const normalizedSlug = slugFormatted.toLowerCase();
        const exactItem = exactMatch.find(
          (s) => s.title.toLowerCase() === normalizedSlug
        );

        if (exactItem) {
          console.log("Found subject by exact title match:", exactItem.id);
          setSubjectId(exactItem.id);
          return;
        }
      }

      // If no exact match, look for subjects that start with the provided string
      const { data: startsWith, error: startsError } = await supabase
        .from("subjects")
        .select("id, title")
        .ilike("title", `${slugFormatted}%`)
        .eq("user_id", user.id)
        .limit(10);

      if (!startsError && startsWith && startsWith.length > 0) {
        // If we have multiple matches that start with the string, use the shortest one
        // as it's likely the most precise match
        const sorted = [...startsWith].sort(
          (a, b) => a.title.length - b.title.length
        );
        console.log("Found subject by starts-with match:", sorted[0].id);
        setSubjectId(sorted[0].id);
        return;
      }

      // Last resort: partial match (this is what was causing the bug)
      const { data: partialMatch, error: partialError } = await supabase
        .from("subjects")
        .select("id, title")
        .ilike("title", `%${slugFormatted}%`)
        .eq("user_id", user.id)
        .limit(10);

      if (partialError) {
        console.error("Error finding subject by title:", partialError);
        setError(
          "Subject not found. Please go back to the home page and try again."
        );
        setIsLoading(false);
        return;
      }

      if (!partialMatch || partialMatch.length === 0) {
        console.error("No subject found for name:", idOrSlug);
        setError(
          "Subject not found. Please go back to the home page and try again."
        );
        setIsLoading(false);
        return;
      }

      console.log("Found subject by partial match:", partialMatch[0].id);
      setSubjectId(partialMatch[0].id);
    } catch (err) {
      console.error("Unexpected error resolving subject ID:", err);
      setError(
        "Subject not found. Please go back to the home page and try again."
      );
      setIsLoading(false);
    }
  };

  // First check if the URL parameter is a valid UUID or find the subject by name/slug
  useEffect(() => {
    resolveSubjectId(subjectIdFromUrlOrState);
  }, [subjectIdFromUrlOrState]);

  // Now fetch lectures once we have a valid subject ID
  useEffect(() => {
    const fetchLecturesData = async () => {
      if (!user) {
        navigate("/login");
        return;
      }

      if (!subjectId) {
        // We'll handle this error in the first useEffect
        return;
      }

      try {
        console.log("Fetching subject with ID:", subjectId);

        // First, fetch the subject
        const { data: subjectData, error: subjectError } = await supabase
          .from("subjects")
          .select("*")
          .eq("id", subjectId)
          .single();

        if (subjectError) {
          console.error("Error fetching subject:", subjectError);
          setError(subjectError.message);
          setIsLoading(false);
          return;
        }

        if (!subjectData) {
          console.error("No subject data found for ID:", subjectId);
          setError("Subject not found.");
          setIsLoading(false);
          return;
        }

        console.log("Subject data found:", subjectData.title);
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
          console.error("Error fetching lectures:", lecturesError);
          setError(lecturesError.message);
          setIsLoading(false);
          return;
        }

        console.log(`Found ${lecturesData?.length || 0} lectures for subject`);
        setLectures(lecturesData || []);
      } catch (error) {
        console.error("Unexpected error:", error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (subjectId) {
      fetchLecturesData();
    }
  }, [user, navigate, subjectId]);

  // Check if user can add more lectures when lectures change
  useEffect(() => {
    if (!subjectId) return;

    async function checkCanAdd() {
      const result = await canCreateLecture(subjectId);
      setCanAdd(result);
    }

    if (!isPremium) {
      checkCanAdd();
    }
  }, [lectures, subjectId, isPremium, canCreateLecture]);

  const addLecture = async () => {
    if (!subject || !subjectId || isAddingLecture) return;

    try {
      setIsAddingLecture(true);

      // Check if the user can create another lecture
      if (!isPremium && lectures.length >= MAX_FREE_LECTURES_PER_SUBJECT) {
        setError(
          "Free plan users can create up to 5 lectures per subject. Upgrade to premium for unlimited lectures."
        );
        return;
      }

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

    // Get localized SEO content
    let title, description, keywords;

    if (subject) {
      // If we have a subject, use its name in the title
      title = getLocalizedSeoField("generic", "subject", currentLang, [
        subject.title,
      ]);
      description = getLocalizedSeoField(
        "lectures",
        "description",
        currentLang
      );
      keywords = [
        ...getLocalizedSeoField("lectures", "keywords", currentLang),
        subject.title,
      ];
    } else {
      // Generic lectures page
      title = getLocalizedSeoField("lectures", "title", currentLang);
      description = getLocalizedSeoField(
        "lectures",
        "description",
        currentLang
      );
      keywords = getLocalizedSeoField("lectures", "keywords", currentLang);
    }

    // Get canonical URL
    const canonicalUrl = getCanonicalUrl(location.pathname, currentLang);

    // Structured data with language-specific content
    const structuredData = subject
      ? {
          "@context": "https://schema.org",
          "@type": "Course",
          name: subject.title,
          description: `${subject.title} - ${description}`,
          provider: {
            "@type": "Organization",
            name: "Brief",
            sameAs: canonicalUrl.split("/").slice(0, 3).join("/"),
          },
          hasCourseInstance: {
            "@type": "CourseInstance",
            courseMode: "online",
            courseWorkload: "Multiple lectures",
            instructor: {
              "@type": "Person",
              name: "Brief Instructors",
            },
          },
        }
      : null;

    return (
      <div className="space-y-8">
        {/* SEO component with dynamic data */}
        <SEO
          title={title}
          description={description}
          keywords={keywords}
          structuredData={structuredData}
          canonicalUrl={canonicalUrl}
        />

        {/* Header Section */}
        <div className="theme-bg-primary">
          <div className="max-w-7xl mx-auto py-6 px-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center theme-text-secondary hover:theme-text-primary font-medium mb-4 group"
            >
              <ChevronLeft className="w-5 h-5 mr-1 transform group-hover:-translate-x-1 transition-transform" />
              Back to Subjects
            </button>
            <h1 className="text-3xl font-bold theme-text-primary truncate">
              {subject?.title || t("common.loading")}
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="theme-card rounded-xl shadow-sm theme-border overflow-hidden">
            <div className="p-4 md:p-6 theme-border border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-semibold theme-text-primary">
                Lectures {!isLoading && `(${lectures.length})`}
              </h2>

              {/* Add lecture button - integrated into the header card */}
              {!isLoading && (
                <div className="flex items-center w-full sm:w-auto">
                  {!canAdd ? (
                    <div className="bg-amber-50 text-amber-800 p-3 rounded-lg flex items-center mr-2 text-xs sm:text-sm w-full">
                      <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                      <span>Lecture limit reached. Upgrade to premium.</span>
                    </div>
                  ) : (
                    <button
                      onClick={addLecture}
                      className="theme-button-primary flex items-center justify-center px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105 w-full sm:w-auto"
                      disabled={isAddingLecture || !canAdd}
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      <span>
                        {isAddingLecture ? "Adding..." : "Add Lecture"}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="p-6">
              {isLoading ? (
                renderLoadingState()
              ) : lectures.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mb-4">
                    <Plus className="w-12 h-12 mx-auto theme-text-tertiary" />
                  </div>
                  <p className="theme-text-tertiary text-lg mb-6">
                    No lectures yet. Add your first lecture to get started.
                  </p>

                  {/* Empty state - prominent add button */}
                  {canAdd ? (
                    <button
                      onClick={addLecture}
                      className="theme-button-primary flex items-center px-6 py-3 rounded-lg mx-auto transition-all duration-300 hover:scale-105"
                      disabled={isAddingLecture}
                    >
                      <Plus className="w-6 h-6 mr-2" />
                      <span className="text-lg font-medium">
                        Create First Lecture
                      </span>
                    </button>
                  ) : (
                    <div className="bg-amber-50 text-amber-800 p-4 rounded-lg max-w-md mx-auto">
                      <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                      <p>
                        Lecture limit reached. Upgrade to premium for unlimited
                        lectures.
                      </p>
                    </div>
                  )}
                </div>
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
    <div className="min-h-screen pb-24 theme-bg-primary">{renderContent()}</div>
  );
};

export default LecturesPage;
