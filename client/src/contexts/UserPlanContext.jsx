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
const MAX_FREE_LECTURES_PER_SUBJECT = 3;

// Default plan values
const DEFAULT_PLAN = {
  planType: "free",
  subjectLimit: 3,
};
export function UserPlanProvider({ children }) {
  const [userPlan, setUserPlan] = useState({
    isLoading: true,
    ...DEFAULT_PLAN, // must at least contain { planType: 'free', subjectLimit: 3 }
    error: null,
    // added:
    nextBillingAt: null,
    daysLeftToRenew: null,
  });

  const { user } = useAuth();
  const isMounted = useRef(true);
  const fetchAttempts = useRef(0);

  // === Billing helpers ===
  const DEFAULT_BILLING_DAYS = 30;

  const toDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const addDays = (date, days) => {
    if (!date) return null;
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + days);
    return d;
  };

  const diffDaysCeil = (future, now = new Date()) => {
    if (!future) return null;
    const ms = future.getTime() - now.getTime();
    if (ms <= 0) return 0;
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  };

  /**
   * Derive next billing date and days left.
   * Pref order:
   * 1) next_billing_at
   * 2) expires_at
   * 3) For premium+active: (activated_at || updated_at || created_at) + billing_period_days (or 30)
   */
  const deriveBillingFromPlan = (planRow) => {
    if (!planRow) return { nextBillingAt: null, daysLeftToRenew: null, periodDays: null };

    const type = planRow.plan_type || "free";
    const active = planRow.active ?? false;

    // If free (or not active premium), nothing to bill
    if (type !== "premium" || !active) {
      return { nextBillingAt: null, daysLeftToRenew: null, periodDays: null };
    }

    // DB-provided fields if you have them
    const nextBillingAtDb = toDate(planRow.next_billing_at);
    const expiresAtDb = toDate(planRow.expires_at);

    let nextBillingAt = nextBillingAtDb || expiresAtDb || null;

    // If DB doesn't provide, compute from anchors
    if (!nextBillingAt) {
      const periodDays =
        Number(planRow.billing_period_days) > 0
          ? Number(planRow.billing_period_days)
          : DEFAULT_BILLING_DAYS;

      const anchor =
        toDate(planRow.activated_at) ||
        toDate(planRow.updated_at) ||
        toDate(planRow.created_at);

      nextBillingAt = addDays(anchor, periodDays);
      return {
        nextBillingAt: nextBillingAt ? nextBillingAt.toISOString() : null,
        daysLeftToRenew: diffDaysCeil(nextBillingAt),
        periodDays,
      };
    }

    return {
      nextBillingAt: nextBillingAt.toISOString(),
      daysLeftToRenew: diffDaysCeil(nextBillingAt),
      periodDays:
        Number(planRow.billing_period_days) > 0
          ? Number(planRow.billing_period_days)
          : DEFAULT_BILLING_DAYS,
    };
  };

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
            nextBillingAt: null,
            daysLeftToRenew: null,
          });
        }
        return;
      }

      try {
        console.log(`Fetching user plan (attempt ${retryCount + 1})`);
        fetchAttempts.current++;

        // Prefer your utility (make sure it returns the full row if possible)
        const plan = await ensureUserPlan(user.id);

        if (plan && isMounted.current) {
          console.log("User plan found/created:", plan);
          const billing = deriveBillingFromPlan(plan);
          setUserPlan({
            isLoading: false,
            planType: plan.plan_type,
            subjectLimit: plan.subject_limit,
            error: null,
            nextBillingAt: billing.nextBillingAt,
            daysLeftToRenew: billing.daysLeftToRenew,
          });
          return;
        }

        // Fallback direct query with needed columns
        console.log("Fallback to direct query after ensureUserPlan failure");
        const { data, error: supabaseError } = await supabase
          .from("user_plans")
          .select(
            "plan_type, subject_limit, active, created_at, updated_at, activated_at, expires_at, next_billing_at, billing_period_days"
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (!supabaseError && data && isMounted.current) {
          const billing = deriveBillingFromPlan(data);
          setUserPlan({
            isLoading: false,
            planType: data.plan_type,
            subjectLimit: data.subject_limit,
            error: null,
            nextBillingAt: billing.nextBillingAt,
            daysLeftToRenew: billing.daysLeftToRenew,
          });
          return;
        }

        // If still no plan found, try to create one
        if ((!data || supabaseError) && isMounted.current) {
          console.log("No plan found, creating one");
          const nowIso = new Date().toISOString();
          const { data: newPlan, error: insertError } = await supabase
            .from("user_plans")
            .insert([
              {
                user_id: user.id,
                plan_type: "free",
                subject_limit: 3,
                created_at: nowIso,
                updated_at: nowIso,
                active: true,
              },
            ])
            .select(
              "plan_type, subject_limit, active, created_at, updated_at, activated_at, expires_at, next_billing_at, billing_period_days"
            )
            .maybeSingle();

          if (!insertError && newPlan && isMounted.current) {
            const billing = deriveBillingFromPlan(newPlan);
            setUserPlan({
              isLoading: false,
              planType: newPlan.plan_type,
              subjectLimit: newPlan.subject_limit,
              error: null,
              nextBillingAt: billing.nextBillingAt,
              daysLeftToRenew: billing.daysLeftToRenew,
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
            nextBillingAt: null,
            daysLeftToRenew: null,
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
            nextBillingAt: null,
            daysLeftToRenew: null,
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

  // Check if user is premium (kept same signature as your code)
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

      console.log("============================================= entire plan data", data);

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
    ...userPlan, // includes nextBillingAt, daysLeftToRenew
    canCreateSubject,
    canCreateLecture,
    isPremiumUser,                  // async fn (unchanged API)
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
