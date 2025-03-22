import { Link, useLocation, useNavigate } from "react-router-dom";
import { CircleUserRound } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import ThemeToggle from "../ui/ThemeToggle";
import { usePostHog } from "posthog-js/react";

function Header() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const posthog = usePostHog();

  const tryPro = (e) => {
    e.preventDefault();

    // Track the Try Pro button click event
    try {
      posthog.capture("try_pro_clicked", {
        location: "header",
        current_path: location.pathname,
        user_id: user?.uid || "anonymous",
      });
      console.log("Tracking event: try_pro_clicked from header");
    } catch (error) {
      console.error("PostHog event error:", error);
    }

    // Navigate to payments page
    navigate("/payments");
  };

  const handleProfileClick = (e) => {
    e.preventDefault();

    // Track the profile icon click event
    try {
      posthog.capture("profile_clicked", {
        location: "header",
        current_path: location.pathname,
        user_id: user?.uid || "anonymous",
      });
      console.log("Tracking event: profile_clicked from header");
    } catch (error) {
      console.error("PostHog event error:", error);
    }

    // Navigate to profile page
    navigate("/profile");
  };

  return (
    <header className="theme-bg-primary ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              {user ? (
                <Link to="/dashboard" className="flex items-center">
                  <span className="font-bold text-xl theme-text-primary">
                    Briefly
                  </span>
                </Link>
              ) : (
                <Link to="/" className="flex items-center">
                  <span className="font-bold text-xl theme-text-primary">
                    Brief
                  </span>
                </Link>
              )}
            </div>

            {/* Navigation Links - only show on homepage when not logged in */}
            {location.pathname === "/" && (
              <div className="hidden md:ml-12 md:flex md:items-center md:space-x-8">
                <a
                  href="#how-it-works"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium theme-text-secondary hover:theme-text-primary transition-colors"
                >
                  How it Works
                </a>
                <a
                  href="#why-us"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium theme-text-secondary hover:theme-text-primary transition-colors"
                >
                  Why Brief
                </a>
                <a
                  href="#pricing"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium theme-text-secondary hover:theme-text-primary transition-colors"
                >
                  Pricing
                </a>
              </div>
            )}
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                {/* Theme Toggle */}

                {/* Theme Color Picker */}

                {/* try pro */}
                <div>
                  <button
                    onClick={tryPro}
                    className="bg-blue-700 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Try Pro
                  </button>
                </div>
                <button
                  onClick={handleProfileClick}
                  className="flex items-center theme-text-secondary"
                >
                  <CircleUserRound />
                </button>
                <ThemeToggle />
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                {/* Theme Toggle */}

                {/* Theme Color Picker */}

                {location.pathname !== "/login" &&
                  location.pathname !== "/register" && (
                    <>
                      <Link
                        to="/login"
                        className="text-sm font-medium theme-text-secondary hover:theme-text-primary transition-colors"
                      >
                        Login
                      </Link>
                      <Link
                        to="/register"
                        className="text-sm font-medium theme-text-secondary hover:theme-text-primary transition-colors"
                      >
                        Register
                      </Link>
                    </>
                  )}
                <button
                  onClick={tryPro}
                  className="ml-4 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-700 rounded-md transition-colors"
                >
                  Try Pro
                </button>
                <ThemeToggle />
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

export default Header;
