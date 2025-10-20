import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CircleUserRound, Menu, X, Crown } from "lucide-react";
import { useAuth } from "../../utils/authHooks";
import ThemeToggle from "../ui/ThemeToggle";
import LanguageSwitcher from "../ui/LanguageSwitcher";
import PlanStatusBadge from "../PlanStatusBadge";
import { usePostHog } from "posthog-js/react";
import { useTranslation } from "react-i18next";
import { useUserPlan } from "../../contexts/UserPlanContext";
import { DISCOUNT_CONFIG } from "../../config/pricingConfig";

function Header() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const posthog = usePostHog();
  const { t } = useTranslation();
  const { isFree } = useUserPlan();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when changing routes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isAuthRoute =
    location.pathname === "/login" || location.pathname === "/register";

  // Function to upgrade to premium
  const tryPro = (e) => {
    e.preventDefault();

    // Track the Try Pro button click event
    try {
      posthog?.capture("try_pro_clicked", {
        location: "header",
        current_path: location.pathname,
        user_id: user?.uid || "anonymous",
      });
      // Optional: console.debug("Tracking event: try_pro_clicked from header");
    } catch (error) {
      // Optional: console.error("PostHog event error:", error);
      console.log(error);
    }

    // Navigate to payments page
    navigate("/payments");
  };

  const handleProfileClick = (
    e
  ) => {
    e.preventDefault();

    // Track the profile icon click event
    try {
      posthog?.capture("profile_clicked", {
        location: "header",
        current_path: location.pathname,
        user_id: user?.uid || "anonymous",
      });
      // Optional: console.debug("Tracking event: profile_clicked from header");
    } catch (error) {
      // Optional: console.error("PostHog event error:", error);
      console.log(error);
    }

    // Navigate to profile page
    navigate("/profile");
  };

  const toggleMobileMenu = () => setMobileMenuOpen((v) => !v);

  return (
    <header className="theme-bg-primary sticky top-0 z-50 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="flex h-16 items-center justify-between">
          {/* Logo + left cluster */}
          <div className="flex items-center">
            <div className="flex items-center">
              {user ? (
                <Link to="/dashboard" className="flex items-center">
                  <span className="text-xl font-bold theme-text-primary">
                    {t("app.name")}
                  </span>
                </Link>
              ) : (
                <Link to="/" className="flex items-center">
                  <span className="text-xl font-bold theme-text-primary">
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
              <div className="md:ml-12 md:flex md:items-center md:space-x-8 hidden">
                <a
                  href="#how-it-works"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors theme-text-secondary hover:theme-text-primary"
                >
                  {t("nav.howItWorks")}
                </a>
                <a
                  href="#why-us"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors theme-text-secondary hover:theme-text-primary"
                >
                  {t("nav.whyUs")}
                </a>
                <a
                  href="#pricing"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors theme-text-secondary hover:theme-text-primary"
                >
                  {t("nav.pricing")}
                </a>
              </div>
            )}
          </div>

          {/* Desktop Auth Buttons & Controls */}
          <div className="hidden items-center md:flex">
            {user ? (
              <div className="flex items-center space-x-4">
                {/* Upgrade to premium button for free users */}
                {isFree && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={tryPro}
                      className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:from-blue-700 hover:to-blue-600 "
                    >
                      <span>Try Premium</span>
                      <Crown size={14} />
                    </button>
                    {/* Discount badge */}
                    {DISCOUNT_CONFIG.enabled && (
                      <div className="absolute -bottom-4 -right-1 bg-gradient-to-r from-yellow-400 to-yellow-300 text-black text-xs font-bold px-1.5 py-0.5 rounded-full shadow-lg border-2 border-yellow-200 transform ">
                        <span className="relative z-10">{DISCOUNT_CONFIG.percentage}% OFF</span>
                        {/* <div className="absolute inset-0 bg-yellow-300 rounded-full animate-ping opacity-20"></div> */}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleProfileClick}
                  className="flex items-center theme-text-secondary"
                  aria-label={t("nav.profile")}
                >
                  <CircleUserRound size={24} />
                </button>

                <ThemeToggle />
                <LanguageSwitcher />
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                {!isAuthRoute && (
                  <Link
                    to="/login"
                    className="text-sm font-medium transition-colors theme-text-secondary hover:theme-text-primary"
                  >
                    {t("nav.login")}
                  </Link>
                )}

                <button
                  type="button"
                  onClick={tryPro}
                  className="ml-4 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
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
                <div className="relative">
                  <button
                    type="button"
                    onClick={tryPro}
                    className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 px-2 py-1 text-xs font-medium text-white"
                  >
                    <Crown size={12} />
                    <span>Try Premium</span>
                  </button>
                  {/* Discount badge */}
                  {DISCOUNT_CONFIG.enabled && (
                    <div className="absolute -bottom-4 -right-1 bg-gradient-to-r from-yellow-400 to-yellow-300 text-black text-xs font-bold px-1 py-0.5 rounded-full text-[10px] shadow-md border border-yellow-200 ">
                      {DISCOUNT_CONFIG.percentage}%
                    </div>
                  )}
                </div>
              )}

              {/* Try Pro button in mobile header for non-logged-in users */}
              {!user && !isAuthRoute && (
                <button
                  type="button"
                  onClick={tryPro}
                  className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                >
                  {t("nav.tryPro")}
                </button>
              )}

              <button
                type="button"
                onClick={toggleMobileMenu}
                className="inline-flex items-center justify-center rounded-md p-2 theme-text-secondary hover:bg-gray-100 hover:theme-text-primary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 dark:hover:bg-gray-800"
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu-panel"
              >
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
          <div
            id="mobile-menu-panel"
            className="theme-bg-primary fixed left-0 right-0 top-16 bottom-0 z-50 w-full overflow-y-auto border-t border-gray-200 shadow-lg dark:border-gray-700 md:hidden"
            role="dialog"
            aria-modal="true"
          >
            <div className="mx-auto flex max-w-7xl flex-col space-y-3 px-4 pt-4 sm:px-6 lg:px-8">
              {/* Theme and Language toggles */}
              <div className="flex items-center justify-end gap-4 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                <ThemeToggle />
                <LanguageSwitcher />
              </div>

              {/* Navigation links */}
              {location.pathname === "/" && (
                <div className="pt-2">
                  <a
                    href="#how-it-works"
                    className="flex items-center justify-start rounded-md px-4 py-3 text-base font-medium transition-colors theme-text-secondary hover:theme-text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("nav.howItWorks")}
                  </a>
                  <a
                    href="#why-us"
                    className="flex items-center justify-start rounded-md px-4 py-3 text-base font-medium transition-colors theme-text-secondary hover:theme-text-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("nav.whyUs")}
                  </a>
                  <a
                    href="#pricing"
                    className="flex items-center justify-start rounded-md px-4 py-3 text-base font-medium transition-colors theme-text-secondary hover:theme-text-primary"
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
                    type="button"
                    onClick={handleProfileClick}
                    className="flex w-full items-center justify-start rounded-md px-4 py-3 text-base font-medium transition-colors theme-text-secondary hover:theme-text-primary"
                  >
                    {t("nav.profile")}
                    <CircleUserRound className="ml-2" size={20} />
                  </button>
                ) : (
                  !isAuthRoute && (
                    <>
                      <Link
                        to="/login"
                        className="flex items-center justify-end rounded-md px-4 py-3 text-base font-medium transition-colors theme-text-secondary hover:theme-text-primary"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {t("nav.login")}
                      </Link>
                      <Link
                        to="/register"
                        className="flex items-center justify-end rounded-md px-4 py-3 text-base font-medium transition-colors theme-text-secondary hover:theme-text-primary"
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
