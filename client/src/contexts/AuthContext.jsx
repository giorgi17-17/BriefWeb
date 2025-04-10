import { useEffect, useState, useRef } from "react";
import { supabase } from "../utils/supabaseClient";
import PropTypes from "prop-types";
import { AuthContext } from "./AuthContextValue";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastActivityTimestamp = useRef(Date.now());
  const tokenRefreshIntervalId = useRef(null);
  const REFRESH_INTERVAL = 20 * 60 * 1000; // 20 minutes
  const visibilityChangeHandler = useRef(null);

  // Function to refresh the token
  const refreshToken = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error getting session:", error);
        return;
      }

      if (data?.session) {
        // Update last activity timestamp
        lastActivityTimestamp.current = Date.now();

        // Explicitly refresh token
        const { error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) {
          console.error("Error refreshing token:", refreshError);
        } else {
          console.log("Auth token refreshed successfully");
        }
      }
    } catch (err) {
      console.error("Exception during token refresh:", err);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        // Update last activity timestamp
        lastActivityTimestamp.current = Date.now();

        // Check if we need to add the user to our database on initial load
        if (session.user.app_metadata?.provider === "google") {
          console.log(
            "Found Google user on initial session load, ensuring user is in database"
          );
          addUserToDatabase(session.user).catch((err) =>
            console.error(
              "Error adding Google user to database on initial load:",
              err
            )
          );
        }
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, "User:", session?.user?.email);

      if (session?.user) {
        setUser(session.user);
        // Update last activity timestamp
        lastActivityTimestamp.current = Date.now();

        // If this is a new sign in, check if we need to add the user to our database
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          const { user } = session;
          console.log("User metadata:", user.app_metadata);

          // Check if this is a Google auth user
          if (user.app_metadata?.provider === "google") {
            console.log("Google user signed in, adding to database if needed");
            try {
              await addUserToDatabase(user);
            } catch (error) {
              console.error("Failed to add Google user to database:", error);
            }
          }
        }
      } else {
        setUser(null);
      }
    });

    // Set up periodic token refresh
    tokenRefreshIntervalId.current = setInterval(
      refreshToken,
      REFRESH_INTERVAL
    );

    // Handle visibility changes
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        // Calculate time since last activity
        const inactivityPeriod = Date.now() - lastActivityTimestamp.current;
        const minutes = Math.floor(inactivityPeriod / 60000);

        if (minutes > 5) {
          // If inactive for more than 5 minutes
          console.log(
            `Auth: Page visible after ${minutes} minutes inactivity, refreshing auth state`
          );

          try {
            // Force a token refresh
            await refreshToken();

            // Get the current session
            const { data, error } = await supabase.auth.getSession();

            if (error) {
              console.error("Error getting session after inactivity:", error);
              return;
            }

            if (data?.session && data.session.user) {
              // Update the user state if session is still valid
              setUser(data.session.user);
              console.log("Auth: Session restored after inactivity");
            } else if (user) {
              // Session expired, clear the user
              console.log(
                "Auth: Session expired during inactivity, logging out"
              );
              setUser(null);
            }
          } catch (err) {
            console.error("Auth: Error handling visibility change:", err);
          }
        } else {
          // Update the activity timestamp
          lastActivityTimestamp.current = Date.now();
        }
      } else {
        // Update timestamp when user navigates away
        lastActivityTimestamp.current = Date.now();
      }
    };

    // Store the handler reference for cleanup
    visibilityChangeHandler.current = handleVisibilityChange;

    // Add visibility change listener
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Clean up interval when page unloads
    window.addEventListener("beforeunload", () => {
      clearInterval(tokenRefreshIntervalId.current);
    });

    return () => {
      // Clean up subscriptions
      subscription.unsubscribe();

      // Clear the token refresh interval
      if (tokenRefreshIntervalId.current) {
        clearInterval(tokenRefreshIntervalId.current);
      }

      // Remove visibility change listener
      document.removeEventListener(
        "visibilitychange",
        visibilityChangeHandler.current
      );
    };
  }, [user, REFRESH_INTERVAL]);

  // Function to add a new user to the users table
  const addUserToDatabase = async (user) => {
    if (!user || !user.id || !user.email) {
      console.error("Invalid user data for database insert:", user);
      return;
    }

    console.log("Adding user to database:", user.email, user.id);

    try {
      // First check if user already exists in our users table
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) {
        console.error("Error checking for existing user:", fetchError);
        throw fetchError;
      }

      // Only add the user if they don't already exist in our users table
      if (!existingUser) {
        console.log("User doesn't exist in database, inserting now");
        const { data: insertData, error: insertError } = await supabase
          .from("users")
          .insert([
            {
              user_id: user.id,
              email: user.email,
              created_at: new Date().toISOString(),
            },
          ])
          .select();

        if (insertError) {
          console.error("Database insert error:", insertError);
          throw insertError;
        }

        console.log(
          "New user added to users table:",
          user.email,
          "Response:",
          insertData
        );
      } else {
        console.log("User already exists in database:", user.email);
      }

      // Now check if user exists in user_plans table and add if needed
      const { data: existingPlan, error: planFetchError } = await supabase
        .from("user_plans")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (planFetchError) {
        console.error("Error checking for existing plan:", planFetchError);
      } else if (!existingPlan) {
        // Add user to user_plans table with free plan
        console.log("Adding user to user_plans table with free plan");
        const { error: planInsertError } = await supabase
          .from("user_plans")
          .insert([
            {
              user_id: user.id,
              plan_type: "free",
              subject_limit: 3,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);

        if (planInsertError) {
          console.error("Error adding user plan:", planInsertError);
        } else {
          console.log(
            "Successfully added user to user_plans table:",
            user.email
          );
        }
      } else {
        console.log("User already exists in user_plans table:", user.email);
      }
    } catch (error) {
      console.error("Error adding user to database:", error);
      throw error;
    }
  };

  const signUp = async (email, password) => {
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

      // Add user to the users table and user_plans table
      if (data.user) {
        await addUserToDatabase(data.user);
      }

      // Update the activity timestamp
      lastActivityTimestamp.current = Date.now();

      return data;
    } catch (error) {
      console.error("Error signing up:", error);
      throw error;
    }
  };

  const signInWithEmail = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Update the activity timestamp
      lastActivityTimestamp.current = Date.now();

      return data;
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      // Update the activity timestamp
      lastActivityTimestamp.current = Date.now();
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        // If the error is about missing session, it's not really an error
        // The user is effectively already logged out
        if (error.message.includes("Auth session missing")) {
          console.log("No active session found, user is already logged out");
          // Clear the user state explicitly
          setUser(null);
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signInWithEmail,
    signInWithGoogle,
    logout,
    refreshToken,
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
