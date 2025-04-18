import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import LoginPage from "./pages/login/Login";
import RegisterPage from "./pages/register/Register";
import Header from "./components/Header/Header";
import { AuthProvider } from "./contexts/AuthContext";
// Force refresh with timestamp
import { useAuth } from "./utils/authHooks";
import PropTypes from "prop-types";
import LecturesPage from "./pages/LecturesPage/LecturesPage";
import LectureDetailPage from "./pages/LectureDetailPage/LectureDetailPage";
import Dashboard from "./pages/dashboard/Dashboard";
import { Home } from "./pages/home/Home";
import Profile from "./pages/profile/Profile";
import { Error } from "./pages/error/Error";
import PaymentsPage from "./pages/payments/PaymentsPage";
import PaymentSuccessPage from "./pages/payments/PaymentSuccessPage";
import PaymentFailurePage from "./pages/payments/PaymentFailurePage";
import DesignSystem from "./components/design/DesignSystem";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useEffect } from "react";
import { PostHogProvider } from "posthog-js/react";
import AuthCallback from "./pages/auth/callback";
import { supabase } from "./utils/supabaseClient";
import { UserPlanProvider } from "./contexts/UserPlanContext";
import { checkAndRefreshSession } from "./utils/sessionRefresh";

// Configure PostHog options
const posthogOptions = {
  api_host: import.meta.env.VITE_POSTHOG_HOST || "https://eu.i.posthog.com",
  capture_pageview: true,
  debug: import.meta.env.DEV,
  loaded: (posthog) => {
    if (import.meta.env.DEV) {
      console.log("PostHog initialized", posthog);
    }
  },
};

// Add before the ProtectedRoute function
// Check for existing session when the app loads
const checkInitialSession = async () => {
  try {
    console.log("Checking initial session on app load");
    // This will refresh the token if it's about to expire
    const session = await checkAndRefreshSession();
    if (session) {
      console.log(
        "Found existing session on app load for:",
        session.user.email
      );
    }
  } catch (error) {
    console.error("Error checking initial session:", error);
  }
};

// On first app load, check for existing session
checkInitialSession();

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // Process the OAuth hash when landing on dashboard
  useEffect(() => {
    if (window.location.hash && window.location.hash.includes("access_token")) {
      // Process the OAuth redirect
      const processOAuthRedirect = async () => {
        console.log("Processing OAuth redirect on dashboard");

        try {
          // Get session from the hash - Supabase will automatically process the hash
          const { data, error } = await supabase.auth.getSession();

          if (error) {
            console.error("Error processing OAuth redirect:", error);
          } else {
            console.log(
              "OAuth session established:",
              data.session ? "Yes" : "No"
            );

            // Check if we need to add the user to our database
            if (data.session?.user) {
              const user = data.session.user;
              console.log("User from OAuth redirect:", user.email);

              if (user.app_metadata?.provider === "google") {
                console.log(
                  "Google user from redirect, ensuring user exists in database"
                );
                try {
                  // Check if user already exists
                  const { data: existingUser, error: fetchError } =
                    await supabase
                      .from("users")
                      .select("user_id")
                      .eq("user_id", user.id)
                      .maybeSingle();

                  if (fetchError) {
                    console.error(
                      "Error checking for existing user:",
                      fetchError
                    );
                  } else if (!existingUser) {
                    // Add user to database
                    console.log("Adding Google user to database from redirect");
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
                      console.error(
                        "Error adding user from redirect:",
                        insertError
                      );
                    } else {
                      console.log(
                        "Successfully added Google user from redirect"
                      );
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
                      "Adding Google user to user_plans table from redirect"
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
                      console.error(
                        "Error adding user plan from redirect:",
                        planInsertError
                      );
                    } else {
                      console.log(
                        "Successfully added Google user to user_plans table from redirect"
                      );
                    }
                  } else {
                    console.log(
                      "Google user already exists in user_plans table"
                    );
                  }
                } catch (err) {
                  console.error("Error handling user from redirect:", err);
                }
              }
            }
          }

          // Clean up the URL by removing the hash without page reload
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, null, window.location.pathname);
          }
        } catch (err) {
          console.error("Error handling OAuth redirect:", err);
        }
      };

      processOAuthRedirect();
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center theme-bg-primary">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
          <p className="theme-text-primary">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

function App() {
  // No redirection logic in the App component
  return (
    <HelmetProvider>
      <ThemeProvider>
        <PostHogProvider
          apiKey={import.meta.env.VITE_POSTHOG_KEY}
          options={posthogOptions}
        >
          <AuthProvider>
            <UserPlanProvider>
              <BrowserRouter>
                {/* Full-page background wrapper */}
                <div className="min-h-screen w-full theme-bg-primary">
                  <Header />
                  <div className="container mx-auto px-4 py-8">
                    <Routes>
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/register" element={<RegisterPage />} />
                      <Route path="/auth/callback" element={<AuthCallback />} />
                      <Route path="/payments" element={<PaymentsPage />} />
                      <Route
                        path="/payment-success"
                        element={<PaymentSuccessPage />}
                      />
                      <Route
                        path="/payment-failure"
                        element={<PaymentFailurePage />}
                      />
                      <Route path="/" element={<Home />} />
                      <Route path="/design-system" element={<DesignSystem />} />
                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedRoute>
                            <Dashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <ProtectedRoute>
                            <Profile />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/lectures"
                        element={
                          <ProtectedRoute>
                            <LecturesPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/subjects/:name"
                        element={
                          <ProtectedRoute>
                            <LecturesPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/subjects/:name/lectures/:lectureId"
                        element={
                          <ProtectedRoute>
                            <LectureDetailPage />
                          </ProtectedRoute>
                        }
                      />

                      <Route path="*" element={<Error />} />
                    </Routes>
                  </div>
                </div>
              </BrowserRouter>
            </UserPlanProvider>
          </AuthProvider>
        </PostHogProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
