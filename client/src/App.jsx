import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/login/Login";
import Header from "./components/Header/Header";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
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

// Configure PostHog options
const posthogOptions = {
  api_host:
    import.meta.env.VITE_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
  capture_pageview: true,
  debug: import.meta.env.DEV,
  loaded: (posthog) => {
    if (import.meta.env.DEV) {
      console.log("PostHog initialized", posthog);
    }
  },
};

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
  return (
    <ThemeProvider>
      <PostHogProvider
        apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
        options={posthogOptions}
      >
        <AuthProvider>
          <BrowserRouter>
            {/* Full-page background wrapper */}
            <div className="min-h-screen w-full theme-bg-primary">
              <Header />
              <div className="container mx-auto px-4 py-8">
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
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
        </AuthProvider>
      </PostHogProvider>
    </ThemeProvider>
  );
}

export default App;
