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
        // The hash contains the access token and other auth info
        // Supabase will handle setting up the session automatically
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
          navigate("/login");
          return;
        }

        if (data?.session) {
          console.log("Auth successful, redirecting to dashboard");
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
