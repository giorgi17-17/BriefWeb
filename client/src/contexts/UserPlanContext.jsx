import { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { supabase } from "../utils/supabaseClient";
import { useAuth } from "../utils/authHooks";
import {
  getUserPlan,
  isPremiumUser as checkIsPremiumUser,
} from "../utils/planAPI";

// Create context
const UserPlanContext = createContext(null);

// Maximum lectures per subject for free users
const MAX_FREE_LECTURES_PER_SUBJECT = 5;

// Create provider component
export function UserPlanProvider({ children }) {
  const [userPlan, setUserPlan] = useState({
    isLoading: true,
    planType: "free", // default to free
    subjectLimit: 3, // default subject limit
    error: null,
  });

  const { user } = useAuth();

  // Fetch user plan data
  useEffect(() => {
    async function fetchUserPlan() {
      if (!user) {
        setUserPlan({
          isLoading: false,
          planType: "free",
          subjectLimit: 3,
          error: null,
        });
        return;
      }

      // First try directly from Supabase
      try {
        const { data, error: supabaseError } = await supabase
          .from("user_plans")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (!supabaseError && data) {
          console.log("Found plan in Supabase:", data);
          setUserPlan({
            isLoading: false,
            planType: data.plan_type,
            subjectLimit: data.subject_limit,
            error: null,
          });
          return;
        }
      } catch (directError) {
        console.error("Error fetching directly from Supabase:", directError);
      }

      // If Supabase direct access fails, try API
      try {
        const response = await getUserPlan(user.id);

        if (response.success && response.plan) {
          setUserPlan({
            isLoading: false,
            planType: response.plan.plan_type,
            subjectLimit: response.plan.subject_limit,
            error: null,
          });
          return;
        }
      } catch (error) {
        console.error("Error fetching from API:", error);
      }

      // Default to free plan if all methods fail
      setUserPlan({
        isLoading: false,
        planType: "free",
        subjectLimit: 3,
        error: null,
      });
    }

    fetchUserPlan();
  }, [user]);

  // Check if user can create more subjects
  const canCreateSubject = async () => {
    if (!user) return false;

    if (userPlan.planType === "premium") return true;

    // Wait for userPlan to finish loading before proceeding
    if (userPlan.isLoading) {
      // Wait small delay and check again if still loading
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (userPlan.isLoading) {
        console.log(
          "UserPlan still loading, defaulting to allowing subject creation"
        );
        return true; // Default to allowing creation while loading
      }
    }

    // Try direct Supabase check first
    try {
      // Count existing subjects
      const { count, error: countError } = await supabase
        .from("subjects")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (!countError) {
        return count < userPlan.subjectLimit;
      }
    } catch (directError) {
      console.error("Error checking subjects directly:", directError);
    }

    // If direct check fails, default to allowing creation
    return true;
  };

  // Check if user is premium
  const isPremiumUser = async () => {
    if (!user) return false;

    if (userPlan.planType === "premium") return true;

    if (userPlan.isLoading) return false;

    // Try direct Supabase check first
    try {
      const { data, error: planError } = await supabase
        .from("user_plans")
        .select("plan_type")
        .eq("user_id", user.id)
        .single();

      if (!planError && data) {
        return data.plan_type === "premium";
      }
    } catch (directError) {
      console.error("Error checking premium status directly:", directError);
    }

    // If direct check fails, try API
    try {
      return await checkIsPremiumUser(user.id);
    } catch (error) {
      console.error("Error checking if user is premium via API:", error);
      return false;
    }
  };

  // Check if user can create more lectures in a subject
  const canCreateLecture = async (subjectId) => {
    if (!user) return false;

    if (userPlan.planType === "premium") return true;

    if (userPlan.isLoading) return false;

    // Try direct Supabase check
    try {
      // Count existing lectures in this subject
      const { count, error: countError } = await supabase
        .from("lectures")
        .select("*", { count: "exact", head: true })
        .eq("subject_id", subjectId);

      if (!countError) {
        return count < MAX_FREE_LECTURES_PER_SUBJECT;
      }
    } catch (directError) {
      console.error("Error checking lectures directly:", directError);
    }

    // Default to false if check fails
    return false;
  };

  return (
    <UserPlanContext.Provider
      value={{
        ...userPlan,
        canCreateSubject,
        canCreateLecture,
        isPremiumUser,
        isPremium: userPlan.planType === "premium",
        isFree: userPlan.planType === "free",
        MAX_FREE_LECTURES_PER_SUBJECT,
      }}
    >
      {children}
    </UserPlanContext.Provider>
  );
}

// Create custom hook for using the context
export function useUserPlan() {
  const context = useContext(UserPlanContext);
  if (!context) {
    throw new Error("useUserPlan must be used within a UserPlanProvider");
  }
  return context;
}

// PropTypes validation
UserPlanProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
