import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../utils/supabaseClient";
import PropTypes from "prop-types";
import { AuthContext } from "./AuthContextValue";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const isMounted = useRef(true);
  const lastActiveTime = useRef(Date.now());
  const sessionCheckTimeout = useRef(null);

  // Helper function to update auth state
  const updateAuthState = useCallback((newSession) => {
    if (!isMounted.current) return;

    if (newSession) {
      setSession(newSession);
      setUser(newSession.user);
      lastActiveTime.current = Date.now();
    } else {
      setSession(null);
      setUser(null);
    }
  }, []);

  // Unified error handling function
  const handleAuthError = useCallback((operation, error) => {
    console.error(`Error during ${operation}:`, error);
    return { error };
  }, []);

  // Refresh session handler with retry
  const refreshSession = useCallback(
    async (retryCount = 0) => {
      if (!isMounted.current) return null;

      try {
        setLoading(true);
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.warn(
            `Session refresh error (attempt ${retryCount + 1}/3):`,
            error
          );

          // Retry up to 3 times with exponential backoff
          if (retryCount < 2) {
            await new Promise((r) =>
              setTimeout(r, 1000 * Math.pow(2, retryCount))
            );
            return refreshSession(retryCount + 1);
          }
          throw error;
        }

        updateAuthState(data?.session);
        return data?.session;
      } catch (error) {
        handleAuthError("session refresh", error);
        return null;
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    },
    [updateAuthState, handleAuthError]
  );

  // Session check to handle timeouts
  const checkSessionTimeout = useCallback(() => {
    // If it's been more than 5 minutes since last activity, refresh the session
    const inactiveTime = Date.now() - lastActiveTime.current;
    if (inactiveTime > 5 * 60 * 1000) {
      console.log("Session inactive for too long, refreshing");
      refreshSession();
    }

    // Schedule next check
    if (isMounted.current) {
      sessionCheckTimeout.current = setTimeout(checkSessionTimeout, 60 * 1000);
    }
  }, [refreshSession]);

  // Add user to database helper function
  const addUserToDatabase = useCallback(
    async (userData) => {
      if (!userData?.id || !userData?.email) {
        console.error("Invalid user data for database insert:", userData);
        return { error: new Error("Invalid user data") };
      }

      try {
        // Check if user already exists
        const { data: existingUser, error: fetchError } = await supabase
          .from("users")
          .select("user_id")
          .eq("user_id", userData.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        // Insert user if not exists
        if (!existingUser) {
          const { error: insertError } = await supabase.from("users").insert([
            {
              user_id: userData.id,
              email: userData.email,
              created_at: new Date().toISOString(),
            },
          ]);

          if (insertError) throw insertError;

          console.log("User added to database:", userData.email);
        }

        // Check if user plan exists
        const { data: existingPlan, error: planFetchError } = await supabase
          .from("user_plans")
          .select("*")
          .eq("user_id", userData.id)
          .maybeSingle();

        if (planFetchError && planFetchError.code !== "PGRST116")
          throw planFetchError;

        // Create user plan if not exists
        if (!existingPlan) {
          const { error: planInsertError } = await supabase
            .from("user_plans")
            .insert([
              {
                user_id: userData.id,
                plan_type: "free",
                subject_limit: 3,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ]);

          if (planInsertError) throw planInsertError;

          console.log("User plan created:", userData.email);
        }

        return { success: true };
      } catch (error) {
        return handleAuthError("adding user to database", error);
      }
    },
    [handleAuthError]
  );

  // Handle visibility change to refresh auth
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("Tab became visible, refreshing auth state");
        lastActiveTime.current = Date.now();
        refreshSession();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [refreshSession]);

  // Start session timeout checker
  useEffect(() => {
    checkSessionTimeout();

    return () => {
      if (sessionCheckTimeout.current) {
        clearTimeout(sessionCheckTimeout.current);
      }
    };
  }, [checkSessionTimeout]);

  // Initialize auth and listen for changes
  useEffect(() => {
    isMounted.current = true;

    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.warn("Error getting initial session:", error);
          // Don't throw - just continue with no session
        }

        if (!isMounted.current) return;

        if (data?.session) {
          updateAuthState(data.session);

          // Add Google user to database if needed
          if (data.session.user.app_metadata?.provider === "google") {
            addUserToDatabase(data.session.user);
          }
        }
      } catch (error) {
        handleAuthError("initialization", error);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    // Start auth initialization
    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted.current) return;

      console.log(
        "Auth state changed:",
        event,
        "User:",
        currentSession?.user?.email
      );

      updateAuthState(currentSession);

      // Handle new sign-ins
      if (
        currentSession &&
        (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")
      ) {
        const { user } = currentSession;

        // Add Google users to database
        if (user.app_metadata?.provider === "google") {
          addUserToDatabase(user);
        }
      }
    });

    // Cleanup
    return () => {
      isMounted.current = false;
      if (sessionCheckTimeout.current) {
        clearTimeout(sessionCheckTimeout.current);
      }
      subscription.unsubscribe();
    };
  }, [
    updateAuthState,
    addUserToDatabase,
    handleAuthError,
    checkSessionTimeout,
  ]);

  // Authentication methods
  const signUp = useCallback(
    async (email, password) => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          // Handle specific error cases
          if (error.message.includes("not authorized")) {
            throw new Error(
              "This email domain is not authorized. Please use a different email address or contact support."
            );
          }
          throw error;
        }

        // Add user to database
        if (data?.user) {
          await addUserToDatabase(data.user);
        }

        return { data };
      } catch (error) {
        return handleAuthError("signup", error);
      }
    },
    [addUserToDatabase, handleAuthError]
  );

  const signInWithEmail = useCallback(
    async (email, password) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        return { data };
      } catch (error) {
        return handleAuthError("email signin", error);
      }
    },
    [handleAuthError]
  );

  const signInWithGoogle = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return handleAuthError("Google signin", error);
    }
  }, [handleAuthError]);

  const logout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: "global" });

      if (error) {
        // Not a real error if session is already missing
        if (error.message.includes("Auth session missing")) {
          console.log("No active session found, user already logged out");
          updateAuthState(null);
          return { success: true };
        }
        throw error;
      }

      updateAuthState(null);
      return { success: true };
    } catch (error) {
      return handleAuthError("logout", error);
    }
  }, [updateAuthState, handleAuthError]);

  // Create context value
  const value = {
    user,
    session,
    loading,
    signUp,
    signInWithEmail,
    signInWithGoogle,
    logout,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
