import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../utils/supabaseClient";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Get the URL hash
    const hash = window.location.hash;
    console.log("Auth callback received with hash:", hash);

    // Process the callback
    const handleAuthCallback = async () => {
      try {
        // Process the OAuth response - this will automatically store the session in localStorage
        // based on our Supabase client configuration
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
          navigate("/login");
          return;
        }

        if (data?.session) {
          console.log(
            "Auth successful, session found:",
            data.session.user.email
          );

          // Ensure we have a refresh token for later use
          if (data.session.refresh_token) {
            console.log("Refresh token obtained and stored automatically");
          } else {
            console.warn("No refresh token found in session");
          }

          // Check if this is a Google auth user and add to database if needed
          const user = data.session.user;
          console.log("User provider:", user.app_metadata?.provider);

          if (user.app_metadata?.provider === "google") {
            console.log(
              "Google user authenticated, ensuring user exists in database"
            );
            try {
              // First check if user already exists in our users table
              const { data: existingUser, error: fetchError } = await supabase
                .from("users")
                .select("user_id")
                .eq("user_id", user.id)
                .maybeSingle();

              if (fetchError) {
                console.error("Error checking for existing user:", fetchError);
              } else if (!existingUser) {
                // User doesn't exist, add them
                console.log("Adding Google user to database:", user.email);
                const { error: insertError } = await supabase
                  .from("users")
                  .insert([
                    {
                      user_id: user.id,
                      email: user.email,
                      created_at: new Date().toISOString(),
                    },
                  ]);

                if (insertError) {
                  console.error("Error adding user to database:", insertError);
                } else {
                  console.log("Successfully added Google user to database");
                }
              } else {
                console.log("Google user already exists in database");
              }

              // Now check if user exists in user_plans table
              const { data: existingPlan, error: planFetchError } =
                await supabase
                  .from("user_plans")
                  .select("*")
                  .eq("user_id", user.id)
                  .maybeSingle();

              if (planFetchError) {
                console.error(
                  "Error checking for existing plan:",
                  planFetchError
                );
              } else if (!existingPlan) {
                // Add user to user_plans table with free plan
                console.log(
                  "Adding Google user to user_plans table with free plan"
                );
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
                    "Successfully added Google user to user_plans table"
                  );
                }
              } else {
                console.log("Google user already exists in user_plans table");
              }
            } catch (err) {
              console.error("Error handling Google auth user:", err);
            }
          }

          console.log("Redirecting to dashboard");
          // Clean up the URL hash before redirecting
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, null, window.location.pathname);
          }
          navigate("/dashboard");
        } else {
          console.log("No session found, redirecting to login");
          navigate("/login");
        }
      } catch (error) {
        console.error("Failed to process authentication callback:", error);
        navigate("/login");
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center theme-bg-primary">
      <div className="text-center">
        <h2 className="text-xl theme-text-primary mb-4">Completing login...</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
      </div>
    </div>
  );
};

export default AuthCallback;
