import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import PropTypes from "prop-types";
import { AuthContext } from "./AuthContextValue";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get initial session
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);

          // Check if we need to add the user to our database on initial load
          if (initialSession.user.app_metadata?.provider === "google") {
            console.log(
              "Found Google user on initial session load, ensuring user is in database"
            );
            await addUserToDatabase(initialSession.user).catch((err) =>
              console.error(
                "Error adding Google user to database on initial load:",
                err
              )
            );
          }
        }
      } catch (error) {
        console.error("Error retrieving session:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(
        "Auth state changed:",
        event,
        "User:",
        currentSession?.user?.email
      );

      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);

        // If this is a new sign in, check if we need to add the user to our database
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          const { user } = currentSession;
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
        setSession(null);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Sign out from Supabase auth (this will clear the session from localStorage)
      const { error } = await supabase.auth.signOut({ scope: "global" });

      if (error) {
        // If the error is about missing session, it's not really an error
        // The user is effectively already logged out
        if (error.message.includes("Auth session missing")) {
          console.log("No active session found, user is already logged out");
          // Clear the user state explicitly
          setUser(null);
          setSession(null);
          return;
        }
        throw error;
      }

      // Explicitly clear states
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signInWithEmail,
    signInWithGoogle,
    logout,
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
