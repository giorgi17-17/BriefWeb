import { Link, useLocation, useNavigate } from "react-router-dom";
import { CircleUserRound, Crown, Home, Sparkles, BookOpen } from "lucide-react"; // removed Menu, X
import { useAuth } from "../../utils/authHooks";
import ThemeToggle from "../ui/ThemeToggle";
import LanguageSwitcher from "../ui/LanguageSwitcher";
import { usePostHog } from "posthog-js/react";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import PlanStatusBadge from "../PlanStatusBadge";
import { useUserPlan } from "../../contexts/UserPlanContext";
import MobileTabBar from "./MobileTabBar";

// add this import if you moved the component out

function Header() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const posthog = usePostHog();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isFree } = useUserPlan();

  // const MenuItems = {
  //   "default": [
  //     { label: "Home", to: "/", icon: Home },
  //     { label: "Profile", to: "/profile", icon: CircleUserRound },
  //   ],
  //   "/lectures": [
  //     { label: "flashcards", label: labels.flashcards, icon: BookOpen },
  //     { label: "briefs", label: labels.briefs, icon: FileText },
  //     { label: "quiz", label: labels.quiz, icon: HelpCircle },
  //     { label: "files", label: labels.files, icon: FolderOpen },
  //   ]
  // };

  const menuItems = [
    { label: "Home", to: "/", icon: Home, mode: "navigate" },
    { label: "Profile", to: "/profile", icon: CircleUserRound, mode: "navigate" },
  ]

  // Close mobile menu when changing routes

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  // Function to upgrade to premium 
  const tryPro = (e) => {
    e.preventDefault();
    // Track the Try Pro button click event 

    try {
      posthog.capture("try_pro_clicked", { location: "header", current_path: location.pathname, user_id: user?.uid || "anonymous", });
      console.log("Tracking event: try_pro_clicked from header");
    } catch (error) {
      console.error("PostHog event error:", error);
    }
    navigate("/payments");
  }

  // Navigate to payments page }; 

  const handleProfileClick = (e) => {
    e.preventDefault();
    // Track the profile icon click event 
    try {
      posthog.capture("profile_clicked", { location: "header", current_path: location.pathname, user_id: user?.uid || "anonymous", });
      console.log("Tracking event: profile_clicked from header");
    }
    catch (error) {
      console.error("PostHog event error:", error);
    }

    navigate("/profile");
  }

  // Navigate to profile page navigate("/profile"); }; 
  const toggleMobileMenu = () => { setMobileMenuOpen(!mobileMenuOpen); };

  return (
    <header className="theme-bg-primary sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between h-16">
          {/* Left: logo + plan badge (unchanged) */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              {user ? (
                <Link to="/dashboard" className="flex items-center">
                  <span className="font-bold text-xl theme-text-primary"> {t("app.name")} </span>
                </Link>)
                : (
                  <Link to="/" className="flex items-center">
                    <span className="font-bold text-xl theme-text-primary"> {t("app.name")} </span>
                  </Link>)}
            </div>
            {/* Plan status badge for logged-in users */}
            {user && (<div className="ml-3"> <PlanStatusBadge /> </div>)}
            {/* Desktop Navigation Links - only show on homepage when not logged in */}
            {location.pathname === "/" && (
              <div className="hidden md:ml-12 md:flex md:items-center md:space-x-8">
                <a href="#how-it-works" className="inline-flex items-center px-1 pt-1 text-sm font-medium theme-text-secondary hover:theme-text-primary transition-colors" > {t("nav.howItWorks")} </a>
                <a href="#why-us" className="inline-flex items-center px-1 pt-1 text-sm font-medium theme-text-secondary hover:theme-text-primary transition-colors" > {t("nav.whyUs")} </a>
                <a href="#pricing" className="inline-flex items-center px-1 pt-1 text-sm font-medium theme-text-secondary hover:theme-text-primary transition-colors" > {t("nav.pricing")} </a> </div>
            )}
          </div>

          {/* Desktop controls (unchanged) */}
          <div className="hidden md:flex items-center">
            {user ? (<div className="flex items-center space-x-4">{isFree && user && (<button onClick={tryPro} className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium py-1.5 px-3 rounded-full transition-colors" > <Crown size={14} /> <span>Try Premium</span> </button>)} <button onClick={handleProfileClick} className="flex items-center theme-text-secondary" > <CircleUserRound size={24} /> </button> <ThemeToggle /> <LanguageSwitcher /> </div>) : (<div className="flex items-center space-x-4"> {location.pathname !== "/login" && location.pathname !== "/register" && (<> <Link to="/login" className="text-sm font-medium theme-text-secondary hover:theme-text-primary transition-colors" > {t("nav.login")} </Link> </>)} <button onClick={tryPro} className="ml-4 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-700 rounded-md transition-colors" > {t("nav.tryPro")} </button> <ThemeToggle /> <LanguageSwitcher /> </div>)}
          </div>

          <div className="md:hidden flex items-center space-x-3">
            {user && isFree && (
              <button
                onClick={tryPro}
                className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-medium py-1 px-2 rounded-full"
              >
                <Crown size={12} />
                <span>Try Premium</span>
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* ✅ New bottom tab bar for mobile */}
      {/* <MobileTabBar items={MenuItems} onPlus={() => navigate('/dashboard')} /> */}

      <MobileTabBar
        onPlus={() => navigate('/dashboard')}
        activeLocation={'/'}
        items={menuItems}
      />
    </header>
  );
}

export default Header;