import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import PropTypes from "prop-types";
import { supabase, ensureUserPlan } from "../utils/supabaseClient";
import { useAuth } from "../utils/authHooks";

// Create context
const UserPlanContext = createContext(null);

// Maximum lectures per subject for free users
const MAX_FREE_LECTURES_PER_SUBJECT = 5;

// Default plan values
const DEFAULT_PLAN = {
  planType: "free",
  subjectLimit: 3,
};

// Create provider component
export function UserPlanProvider({ children }) {
  const [userPlan, setUserPlan] = useState({
    isLoading: true,
    ...DEFAULT_PLAN,
    error: null,
  });

  const { user } = useAuth();
  const isMounted = useRef(true);
  const fetchAttempts = useRef(0);

  // Fetch user plan data with proper cleanup and retry
  const fetchUserPlanData = useCallback(
    async (retryCount = 0) => {
      if (!isMounted.current) return;
      if (!user) {
        if (isMounted.current) {
          setUserPlan({
            isLoading: false,
            ...DEFAULT_PLAN,
            error: null,
          });
        }
        return;
      }

      try {
        console.log(`Fetching user plan (attempt ${retryCount + 1})`);
        fetchAttempts.current++;

        // Use the ensureUserPlan utility to get or create plan
        const plan = await ensureUserPlan(user.id);

        if (plan && isMounted.current) {
          console.log("User plan found/created:", plan);
          setUserPlan({
            isLoading: false,
            planType: plan.plan_type,
            subjectLimit: plan.subject_limit,
            error: null,
          });
          return;
        }

        // If ensureUserPlan failed to return a plan, use a direct query with maybeSingle
        console.log("Fallback to direct query after ensureUserPlan failure");
        const { data, error: supabaseError } = await supabase
          .from("user_plans")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!supabaseError && data && isMounted.current) {
          setUserPlan({
            isLoading: false,
            planType: data.plan_type,
            subjectLimit: data.subject_limit,
            error: null,
          });
          return;
        }

        // If still no plan found, try to create one
        if ((!data || supabaseError) && isMounted.current) {
          console.log("No plan found, creating one");
          const { data: newPlan, error: insertError } = await supabase
            .from("user_plans")
            .insert([
              {
                user_id: user.id,
                plan_type: "free",
                subject_limit: 3,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ])
            .select()
            .maybeSingle();

          if (!insertError && newPlan && isMounted.current) {
            setUserPlan({
              isLoading: false,
              planType: newPlan.plan_type,
              subjectLimit: newPlan.subject_limit,
              error: null,
            });
            return;
          }
        }

        // Default to free plan if nothing worked
        if (isMounted.current) {
          console.log("Defaulting to free plan after all attempts");
          setUserPlan({
            isLoading: false,
            ...DEFAULT_PLAN,
            error: null,
          });
        }
      } catch (error) {
        console.error("Error fetching user plan:", error);

        if (retryCount < 2 && isMounted.current) {
          console.log(`Retrying fetch (${retryCount + 1}/3)...`);
          setTimeout(
            () => fetchUserPlanData(retryCount + 1),
            1000 * (retryCount + 1)
          );
          return;
        }

        if (isMounted.current) {
          setUserPlan({
            isLoading: false,
            ...DEFAULT_PLAN,
            error: error.message,
          });
        }
      }
    },
    [user]
  );

  // Effect for initial fetch and cleanup
  useEffect(() => {
    isMounted.current = true;
    fetchAttempts.current = 0;

    fetchUserPlanData();

    // Cleanup function to prevent memory leaks and state updates after unmount
    return () => {
      isMounted.current = false;
    };
  }, [user, fetchUserPlanData]);

  // Check if user can create more subjects
  const canCreateSubject = async () => {
    if (!user) return false;
    if (userPlan.planType === "premium") return true;

    // If still loading, allow by default
    if (userPlan.isLoading) return true;

    try {
      // Count existing subjects
      const { count, error: countError } = await supabase
        .from("subjects")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (!countError) {
        return count < userPlan.subjectLimit;
      }
    } catch (error) {
      console.error("Error checking subjects count:", error);
    }

    // If check fails, default to allowing creation
    return true;
  };

  // Check if user is premium
  const isPremiumUser = async () => {
    if (!user) return false;
    if (userPlan.planType === "premium") return true;
    if (userPlan.isLoading) return false;

    try {
      const { data, error: planError } = await supabase
        .from("user_plans")
        .select("plan_type")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!planError && data) {
        return data.plan_type === "premium";
      }
    } catch (error) {
      console.error("Error checking premium status:", error);
    }

    return false;
  };

  // Check if user can create more lectures in a subject
  const canCreateLecture = async (subjectId) => {
    if (!user) return false;
    if (userPlan.planType === "premium") return true;
    if (userPlan.isLoading) return false;

    try {
      // Count existing lectures in this subject
      const { count, error: countError } = await supabase
        .from("lectures")
        .select("*", { count: "exact", head: true })
        .eq("subject_id", subjectId);

      if (!countError) {
        return count < MAX_FREE_LECTURES_PER_SUBJECT;
      }
    } catch (error) {
      console.error("Error checking lectures count:", error);
    }

    // Default to false if check fails
    return false;
  };

  // Function to refresh the plan data
  const refreshPlan = useCallback(() => {
    if (isMounted.current) {
      setUserPlan((prev) => ({ ...prev, isLoading: true }));
      fetchUserPlanData();
    }
  }, [fetchUserPlanData]);

  const contextValue = {
    ...userPlan,
    canCreateSubject,
    canCreateLecture,
    isPremiumUser,
    isPremium: userPlan.planType === "premium",
    isFree: userPlan.planType === "free",
    MAX_FREE_LECTURES_PER_SUBJECT,
    refreshPlan,
  };

  return (
    <UserPlanContext.Provider value={contextValue}>
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
