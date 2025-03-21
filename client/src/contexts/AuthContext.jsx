import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import PropTypes from "prop-types";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);

        // If this is a new sign in with OAuth, check if we need to add the user to our database
        if (event === "SIGNED_IN") {
          const { user } = session;

          // Check if this is a Google auth user
          if (user.app_metadata.provider === "google") {
            await addUserToDatabase(user);
          }
        }
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Function to add a new user to the users table
  const addUserToDatabase = async (user) => {
    try {
      // First check if user already exists in our users table
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // Only add the user if they don't already exist in our users table
      if (!existingUser) {
        const { error: insertError } = await supabase.from("users").insert([
          {
            user_id: user.id,
            email: user.email,
            created_at: new Date().toISOString(),
          },
        ]);

        if (insertError) throw insertError;
        console.log("New user added to users table:", user.email);
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

      // Add user to the users table
      if (data.user) {
        const { error: dbError } = await supabase.from("users").insert([
          {
            user_id: data.user.id,
            email: data.user.email,
            created_at: new Date().toISOString(),
          },
        ]);

        if (dbError) throw dbError;
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
