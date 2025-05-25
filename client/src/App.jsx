import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { useState, useEffect, useRef } from "react";
import LoginPage from "./pages/login/Login";
import RegisterPage from "./pages/register/Register";
import Header from "./components/Header/Header";
import { AuthProvider } from "./contexts/AuthContext";
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
import AuthCallback from "./pages/auth/callback";
import { UserPlanProvider, useUserPlan } from "./contexts/UserPlanContext";
import { PostHogProvider } from "posthog-js/react";

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

// Add a helper function to check if the app is returning from another app
function useAppVisibility() {
  const [wasHidden, setWasHidden] = useState(false);
  const [isReturningFromOtherApp, setIsReturningFromOtherApp] = useState(false);
  const lastVisible = useRef(Date.now());
  const hiddenDuration = useRef(0);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setWasHidden(true);
        lastVisible.current = Date.now();
      } else if (wasHidden && document.visibilityState === "visible") {
        hiddenDuration.current = Date.now() - lastVisible.current;

        // Only consider it a return from another app if hidden for more than 2 seconds
        if (hiddenDuration.current > 2000) {
          console.log(
            `Tab was hidden for ${
              hiddenDuration.current / 1000
            }s, treating as app return`
          );
          setIsReturningFromOtherApp(true);
          // Reset after a short delay
          setTimeout(() => setIsReturningFromOtherApp(false), 3000);
        }
        setWasHidden(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [wasHidden]);

  return isReturningFromOtherApp;
}

function ProtectedRoute({ children }) {
  const { user, loading, refreshSession } = useAuth();
  const isReturningFromOtherApp = useAppVisibility();
  const [authChecked, setAuthChecked] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { refreshPlan } = useUserPlan();
  const refreshTimerRef = useRef(null);

  // Force a session check when returning from another app
  useEffect(() => {
    if (isReturningFromOtherApp) {
      console.log(
        "Returning from another app, refreshing session and user plan"
      );

      const doRefresh = async () => {
        try {
          const session = await refreshSession();
          if (session) {
            console.log("Session successfully refreshed after app return");
            // Also refresh the user plan
            refreshPlan();
          } else {
            console.log("No session found after returning from app");
          }
          setAuthChecked(true);
        } catch (error) {
          console.error("Error refreshing session after app return:", error);
          setAuthChecked(true);
        }
      };

      doRefresh();
    }
  }, [isReturningFromOtherApp, refreshSession, refreshPlan]);

  // If loading for too long, try to refresh the session
  useEffect(() => {
    if (loading && retryCount < 3 && !authChecked) {
      refreshTimerRef.current = setTimeout(() => {
        console.log(`Auth loading timeout reached, retry #${retryCount + 1}`);
        setRetryCount((prev) => prev + 1);

        const doRetryRefresh = async () => {
          try {
            const session = await refreshSession();
            if (!session && retryCount >= 2) {
              console.log(
                "No session found after retries, redirecting to login"
              );
              setAuthChecked(true);
            }
          } catch (error) {
            console.error("Error in retry session check:", error);
            if (retryCount >= 2) {
              setAuthChecked(true);
            }
          }
        };

        doRetryRefresh();
      }, 3000); // Wait 3 seconds before retry
    }

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [loading, retryCount, authChecked, refreshSession]);

  // Clear the URL hash when dashboard loads to clean up OAuth fragments
  useEffect(() => {
    // If there's a hash in the URL (from OAuth callback), clean it up
    if (window.location.hash) {
      // Remove the hash without causing a page reload
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, null, " ");
      }
    }
  }, []);

  if (loading && !authChecked && retryCount < 3) {
    return (
      <div className="min-h-screen flex items-center justify-center theme-bg-primary">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
          <p className="theme-text-primary">Authenticating...</p>
          {retryCount > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Retry {retryCount}/3...
            </p>
          )}
          {retryCount >= 2 && (
            <button
              onClick={() => {
                setRetryCount(0);
                refreshSession();
              }}
              className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors"
            >
              Refresh Now
            </button>
          )}
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
        <AuthProvider>
        <PostHogProvider
          apiKey={import.meta.env.VITE_POSTHOG_KEY}
          options={posthogOptions}
        >
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
          </PostHogProvider>
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
