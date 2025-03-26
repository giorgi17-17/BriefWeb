import { Link, useLocation, useNavigate } from "react-router-dom";
import { CircleUserRound, Menu, X, Crown } from "lucide-react";
import { useAuth } from "../../utils/authHooks";
import ThemeToggle from "../ui/ThemeToggle";
import LanguageSwitcher from "../ui/LanguageSwitcher";
import { usePostHog } from "posthog-js/react";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import PlanStatusBadge from "../PlanStatusBadge";
import { useUserPlan } from "../../contexts/UserPlanContext";
import { supabase } from "../../utils/supabaseClient";

function Header() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const posthog = usePostHog();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isFree } = useUserPlan();

  // Close mobile menu when changing routes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Function to upgrade to premium
  const upgradeToPremium = async (e) => {
    e.preventDefault();

    try {
      if (!user) return;

      // Direct Supabase insert/update
      const { error } = await supabase.from("user_plans").upsert({
        user_id: user.id,
        plan_type: "premium",
        subject_limit: 999,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Track the upgrade event
      try {
        posthog.capture("premium_upgrade_clicked", {
          location: "header",
          current_path: location.pathname,
          user_id: user?.id || "anonymous",
        });
      } catch (trackError) {
        console.error("PostHog event error:", trackError);
      }

      // Success - refresh the page to update plan state
      window.location.reload();
    } catch (err) {
      console.error("Error upgrading to premium:", err);
      alert("Could not upgrade to premium. Please try again.");
    }
  };

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

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="theme-bg-primary sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              {user ? (
                <Link to="/dashboard" className="flex items-center">
                  <span className="font-bold text-xl theme-text-primary">
                    {t("app.name")}
                  </span>
                </Link>
              ) : (
                <Link to="/" className="flex items-center">
                  <span className="font-bold text-xl theme-text-primary">
                    {t("app.name")}
                  </span>
                </Link>
              )}
            </div>

            {/* Plan status badge for logged-in users */}
            {user && (
              <div className="ml-3">
                <PlanStatusBadge />
              </div>
            )}

            {/* Desktop Navigation Links - only show on homepage when not logged in */}
            {location.pathname === "/" && (
              <div className="hidden md:ml-12 md:flex md:items-center md:space-x-8">
                <a
                  href="#how-it-works"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium theme-text-secondary hover:theme-text-primary transition-colors"
                >
                  {t("nav.howItWorks")}
                </a>
                <a
                  href="#why-us"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium theme-text-secondary hover:theme-text-primary transition-colors"
                >
                  {t("nav.whyUs")}
                </a>
                <a
                  href="#pricing"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium theme-text-secondary hover:theme-text-primary transition-colors"
                >
                  {t("nav.pricing")}
                </a>
              </div>
            )}
          </div>

          {/* Desktop Auth Buttons & Controls */}
          <div className="hidden md:flex items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                {/* Upgrade to premium button for free users */}
                {isFree && user && (
                  <button
                    onClick={upgradeToPremium}
                    className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium py-1.5 px-3 rounded-full transition-colors"
                  >
                    <Crown size={14} />
                    <span>Upgrade</span>
                  </button>
                )}

                <button
                  onClick={handleProfileClick}
                  className="flex items-center theme-text-secondary"
                >
                  <CircleUserRound size={24} />
                </button>
                <ThemeToggle />
                <LanguageSwitcher />
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                {location.pathname !== "/login" &&
                  location.pathname !== "/register" && (
                    <>
                      <Link
                        to="/login"
                        className="text-sm font-medium theme-text-secondary hover:theme-text-primary transition-colors"
                      >
                        {t("nav.login")}
                      </Link>
                      <Link
                        to="/register"
                        className="text-sm font-medium theme-text-secondary hover:theme-text-primary transition-colors"
                      >
                        {t("nav.register")}
                      </Link>
                    </>
                  )}
                <button
                  onClick={tryPro}
                  className="ml-4 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-700 rounded-md transition-colors"
                >
                  {t("nav.tryPro")}
                </button>
                <ThemeToggle />
                <LanguageSwitcher />
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <div className="flex items-center space-x-3">
              {/* Upgrade button in mobile header for logged-in free users */}
              {user && isFree && (
                <button
                  onClick={upgradeToPremium}
                  className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-medium py-1 px-2 rounded-full"
                >
                  <Crown size={12} />
                  <span>Upgrade</span>
                </button>
              )}

              {/* Try Pro button in mobile header for non-logged-in users */}
              {!user &&
                !location.pathname.includes("/login") &&
                !location.pathname.includes("/register") && (
                  <button
                    onClick={tryPro}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-600 rounded-md transition-colors"
                  >
                    {t("nav.tryPro")}
                  </button>
                )}
              <button
                onClick={toggleMobileMenu}
                className="inline-flex items-center justify-center p-2 rounded-md theme-text-secondary hover:theme-text-primary hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                {mobileMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile menu, show/hide based on menu state */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed w-full left-0 right-0 top-16 bottom-0 theme-bg-primary shadow-lg border-t border-gray-200 dark:border-gray-700 z-50 overflow-y-auto">
            <div className="flex flex-col space-y-3 pt-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Theme and Language toggles */}
              <div className="flex items-center justify-end gap-4 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <ThemeToggle />
                </div>
                <div className="flex items-center">
                  <LanguageSwitcher />
                </div>
              </div>

              {/* Navigation links */}
              {location.pathname === "/" && (
                <div className="pt-2">
                  <a
                    href="#how-it-works"
                    className="theme-text-secondary hover:theme-text-primary px-4 py-3 rounded-md flex items-center justify-end text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("nav.howItWorks")}
                  </a>
                  <a
                    href="#why-us"
                    className="theme-text-secondary hover:theme-text-primary px-4 py-3 rounded-md flex items-center justify-end text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("nav.whyUs")}
                  </a>
                  <a
                    href="#pricing"
                    className="theme-text-secondary hover:theme-text-primary px-4 py-3 rounded-md flex items-center justify-end text-base font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("nav.pricing")}
                  </a>
                </div>
              )}

              {/* Auth links section */}
              <div className="pt-2">
                {user ? (
                  <button
                    onClick={handleProfileClick}
                    className="theme-text-secondary hover:theme-text-primary px-4 py-3 rounded-md flex items-center justify-end text-base font-medium w-full"
                  >
                    {t("nav.profile")}
                    <CircleUserRound className="ml-2" size={20} />
                  </button>
                ) : (
                  location.pathname !== "/login" &&
                  location.pathname !== "/register" && (
                    <>
                      <Link
                        to="/login"
                        className="theme-text-secondary hover:theme-text-primary px-4 py-3 rounded-md flex items-center justify-end text-base font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {t("nav.login")}
                      </Link>
                      <Link
                        to="/register"
                        className="theme-text-secondary hover:theme-text-primary px-4 py-3 rounded-md flex items-center justify-end text-base font-medium"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {t("nav.register")}
                      </Link>
                    </>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
