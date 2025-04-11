import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { supabase } from "../../../utils/supabaseClient";
import { useTranslation } from "react-i18next";

const UserStats = ({ userId }) => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalLectures: 0,
    totalSubjects: 0,
    lastActivity: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!userId) return;

      try {
        // Check if subjects table exists by doing a simple query
        const { error: subjectsCheckError } = await supabase
          .from("subjects")
          .select("count", { count: "exact", head: true });

        // If we get a specific error about relation not existing
        if (
          subjectsCheckError &&
          (subjectsCheckError.message.includes("relation") ||
            subjectsCheckError.message.includes("does not exist"))
        ) {
          // Database tables not set up yet, show placeholder stats
          setStats({
            totalSubjects: 0,
            totalLectures: 0,
            lastActivity: null,
            isLoading: false,
            error: null, // Don't show error for missing tables
          });
          return;
        }

        // Continue with normal flow if tables exist
        // Fetch subjects count
        const { data: subjects, error: subjectsError } = await supabase
          .from("subjects")
          .select("id")
          .eq("user_id", userId);

        if (subjectsError) throw subjectsError;

        // Get subject IDs
        const subjectIds = subjects ? subjects.map((s) => s.id) : [];

        // Fetch lectures count - use a safer approach
        let lecturesCount = 0;
        if (subjectIds.length > 0) {
          const { count, error: lecturesError } = await supabase
            .from("lectures")
            .select("id", { count: "exact", head: true })
            .in("subject_id", subjectIds);

          if (!lecturesError) {
            lecturesCount = count || 0;
          }
        }

        // Fetch last activity safely - check if table exists first
        let lastActivity = null;
        try {
          const { data: activities } = await supabase
            .from("user_activity")
            .select("created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1);

          if (activities && activities.length > 0) {
            lastActivity = activities[0].created_at;
          }
        } catch (activityError) {
          console.log("Activity table might not exist yet:", activityError);
          // If no activity table, try getting last update from subjects
          if (subjects && subjects.length > 0 && subjects[0].updated_at) {
            lastActivity = subjects[0].updated_at;
          }
        }

        setStats({
          totalSubjects: subjects?.length || 0,
          totalLectures: lecturesCount,
          lastActivity,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error fetching user stats:", error);
        setStats((prev) => ({
          ...prev,
          isLoading: false,
          error: "Failed to load stats. Please try again later.",
        }));
      }
    };

    fetchUserStats();
  }, [userId]);

  if (stats.isLoading) {
    return (
      <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg animate-pulse">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
          {t("userStats.title")}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (stats.error) {
    return (
      <div className="p-4 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <h3 className="text-lg font-medium text-red-700 dark:text-red-400 mb-2">
          {t("userStats.errorTitle")}
        </h3>
        <p className="text-sm text-red-500 dark:text-red-400">{stats.error}</p>
      </div>
    );
  }

  // Format date to a more readable format
  const formatDate = (dateString) => {
    if (!dateString) return t("userStats.noActivity");

    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {t("userStats.title")}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
            {t("userStats.subjects")}
          </p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {stats.totalSubjects}
          </p>
        </div>

        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            {t("userStats.lectures")}
          </p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">
            {stats.totalLectures}
          </p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            {t("userStats.lastActivity")}
          </p>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
            {formatDate(stats.lastActivity)}
          </p>
        </div>
      </div>
    </div>
  );
};

UserStats.propTypes = {
  userId: PropTypes.string.isRequired,
};

export default UserStats;
