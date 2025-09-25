import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { useState, useEffect } from "react";
import { PostHogProvider } from "posthog-js/react";

// Components
// ---
import LoginPage from "./pages/login/Login";
import RegisterPage from "./pages/register/Register";
import Header from "./components/Header/Header";
import LecturesPage from "./pages/LecturesPage/LecturesPage";
import LectureDetailPage from "./pages/LectureDetailPage/LectureDetailPage";
import Dashboard from "./pages/dashboard/Dashboard";
import { Home } from "./pages/home/Home";
import Profile from "./pages/profile/Profile";
import { Error } from "./pages/error/Error";
import DesignSystem from "./components/design/DesignSystem";
import AuthCallback from "./pages/auth/callback";
import PaymentsPage from "./pages/payments/payments";
import PaymentSuccess from "./pages/payments/success";
import PaymentError from "./pages/payments/error";

// Contexts
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { UserPlanProvider } from "./contexts/UserPlanContext";

// Hooks
import { useAuth } from "./utils/authHooks";

// Utils
import PropTypes from "prop-types";

// PostHog Configuration - Fixed to prevent hard refresh
const posthogOptions = {
  api_host: import.meta.env.VITE_POSTHOG_HOST || "https://eu.i.posthog.com",
  capture_pageview: true, // Changed: Disable automatic pageview capture
  capture_pageleave: true, // Changed: Disable page leave capture
  debug: import.meta.env.DEV,
  autocapture: true, // Changed: Disable autocapture to prevent tab switch triggers
  // LLM analytics specific options
  capture_performance: true, // Changed: Disable performance capture
  session_recording: {
    maskAllInputs: true,
    maskAllText: false,
  },
  // Add these options to prevent refresh on visibility change
  capture_heatmaps: true,
  // Only enable if explicitly set
  // disable_session_recording: !import.meta.env.VITE_ENABLE_SESSION_RECORDING,
  loaded: (posthog) => {
    if (import.meta.env.DEV) {
      console.log("PostHog initialized for LLM analytics", posthog);
    }

    // Disable automatic page tracking that might cause refreshes
    
  },
};

// Simple loading component
function LoadingScreen({ message = "Loading...", showRetry = false, onRetry = null }) {
  return (
    <div className="min-h-screen flex items-center justify-center theme-bg-primary">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="theme-text-primary text-lg">{message}</p>
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

LoadingScreen.propTypes = {
  message: PropTypes.string,
  showRetry: PropTypes.bool,
  onRetry: PropTypes.func,
};

// Clean protected route component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const [authTimeout, setAuthTimeout] = useState(false);

  // Set timeout for auth loading
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setAuthTimeout(true);
      }, 10000); // 10 second timeout

      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Show loading state
  if (loading && !authTimeout) {
    return <LoadingScreen message="Authenticating..." />;
  }

  // Show timeout error
  if (loading && authTimeout) {
    return (
      <LoadingScreen
        message="Authentication is taking longer than expected"
        showRetry
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

// Clean URL hash on mount (for OAuth cleanup)
function useCleanUrl() {
  useEffect(() => {
    if (window.location.hash && window.history?.replaceState) {
      window.history.replaceState(null, null, window.location.pathname);
    }
  }, []);
}

// Add visibility change handler to prevent refresh on tab switching
function usePreventRefreshOnTabSwitch() {
  useEffect(() => {
    let isVisible = true;

    const handleVisibilityChange = (event) => {
      // Prevent default behavior that might trigger refresh
      if (event) {
        event.preventDefault();
      }

      const wasVisible = isVisible;
      isVisible = !document.hidden;

      // Don't allow any refresh triggers when switching tabs
      if (wasVisible !== isVisible) {
        // Optionally log for debugging
        if (import.meta.env.DEV) {
          console.log('Tab visibility changed:', isVisible ? 'visible' : 'hidden');
        }
      }
    };

    const handleBeforeUnload = (event) => {
      // Only show confirmation for actual navigation, not tab switches
      if (document.hidden) {
        event.preventDefault();
        return;
      }
    };

    const handleFocus = () => {
      // Prevent any refresh logic on window focus
      if (import.meta.env.DEV) {
        console.log('Window focused - preventing refresh');
      }
    };

    const handleBlur = () => {
      // Prevent any refresh logic on window blur
      if (import.meta.env.DEV) {
        console.log('Window blurred - preventing refresh');
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: false });
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);
}

// Main router component
function AppRoutes() {
  const location = useLocation();
  useCleanUrl();
  usePreventRefreshOnTabSwitch(); // Add this hook

  const isAuthRoute = ['/login', '/register', '/auth/callback'].some(route =>
    location.pathname.startsWith(route)
  );

  const isPaymentRoute = ['/payment/success', '/payment/error'].some(route =>
    location.pathname.startsWith(route)
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className={getMainClassName(isAuthRoute, isPaymentRoute)}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/design-system" element={<DesignSystem />} />

          {/* Payment Routes */}
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/error" element={<PaymentError />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          <Route path="/lectures" element={
            <ProtectedRoute>
              <LecturesPage />
            </ProtectedRoute>
          } />

          <Route path="/subjects/:name" element={
            <ProtectedRoute>
              <LecturesPage />
            </ProtectedRoute>
          } />

          <Route path="/subjects/:name/lectures/:lectureId" element={
            <ProtectedRoute>
              <LectureDetailPage />
            </ProtectedRoute>
          } />

          <Route path="/payments" element={
            <ProtectedRoute>
              <PaymentsPage />
            </ProtectedRoute>
          } />

          {/* 404 Route */}
          <Route path="*" element={<Error />} />
        </Routes>
      </main>
    </div>
  );
}

// Helper function for main className
function getMainClassName(isAuthRoute, isPaymentRoute) {
  if (isAuthRoute) {
    return "flex-1 w-full min-h-[calc(100svh-4rem)] grid place-items-center p-0 m-0 overflow-hidden";
  }
  if (isPaymentRoute) {
    return "flex-1 w-full min-h-[calc(100svh-4rem)] grid place-items-center";
  }
  return "container mx-auto px-4 py-8 flex-1";
}

// Main App component
function App() {
  const posthogKey = import.meta.env.VITE_POSTHOG_KEY;

  // Don't render if PostHog key is missing in production
  if (!posthogKey && !import.meta.env.DEV) {
    console.error("PostHog API key is required for production");
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
          <p className="text-red-500">Analytics configuration is missing. Please contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <PostHogProvider
            apiKey={posthogKey}
            options={posthogOptions}
          >
            <UserPlanProvider>
              <BrowserRouter>
                <div className="min-h-screen w-full theme-bg-primary">
                  <AppRoutes />
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