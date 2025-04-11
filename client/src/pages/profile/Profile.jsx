import { useState, useEffect } from "react";
import { useAuth } from "../../utils/authHooks";
import { useUserPreferences } from "../../contexts/UserPreferencesContext";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useLanguage } from "../../utils/languageHooks";
import { supabase } from "../../utils/supabaseClient";
import { useTranslation } from "react-i18next";
import ThemeToggle from "../../components/ui/ThemeToggle";
import LanguageSwitcher from "../../components/ui/LanguageSwitcher";
import { background, text } from "../../utils/themeUtils";
import UserStats from "./components/UserStats";
import AccessibilitySettings from "./components/AccessibilitySettings";
import NotificationPreferences from "./components/NotificationPreferences";

const Profile = () => {
  const { user, logout } = useAuth();
  const {
    preferences,
    updateProfile,
    isLoading: prefsLoading,
  } = useUserPreferences();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { currentLanguage, languages } = useLanguage();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [userPlan, setUserPlan] = useState(null);
  const [userProfile, setUserProfile] = useState({
    displayName: user.displayName || user.email.split("@")[0],
    photoURL: user.photoURL || "",
    email: user.email,
    phoneNumber: user.phoneNumber || "",
    bio: "",
  });

  // Load user preferences into state
  useEffect(() => {
    if (preferences && !prefsLoading) {
      setUserProfile({
        displayName:
          preferences.display_name ||
          user.displayName ||
          user.email.split("@")[0],
        photoURL: preferences.avatar_url || user.photoURL || "",
        email: user.email,
        phoneNumber: preferences.phone_number || user.phoneNumber || "",
        bio: preferences.bio || "",
      });
    }
  }, [preferences, prefsLoading, user]);

  // Fetch user plan
  useEffect(() => {
    const fetchUserPlan = async () => {
      try {
        // Fetch user plan
        const { data: planData, error: planError } = await supabase
          .from("user_plans")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (planError && planError.code !== "PGRST116") {
          console.error("Error fetching user plan:", planError);
        } else {
          setUserPlan(planData || { plan_type: "free", subject_limit: 3 });
        }
      } catch (err) {
        console.error("Error fetching user plan:", err);
      }
    };

    if (user?.id) {
      fetchUserPlan();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      setError("Failed to sign out");
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Update profile in user preferences
      await updateProfile({
        display_name: userProfile.displayName,
        phone_number: userProfile.phoneNumber,
        bio: userProfile.bio,
        avatar_url: userProfile.photoURL,
      });

      setSuccess("Profile updated successfully");
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccess("Password reset email sent");
    } catch (err) {
      console.error("Error sending reset email:", err);
      setError("Failed to send password reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const renderTabs = () => {
    return (
      <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          className={`px-4 py-3 whitespace-nowrap font-medium text-sm ${
            activeTab === "general"
              ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("general")}
        >
          {t("profile.tabs.general")}
        </button>
        <button
          className={`px-4 py-3 whitespace-nowrap font-medium text-sm ${
            activeTab === "security"
              ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("security")}
        >
          {t("profile.tabs.security")}
        </button>
        <button
          className={`px-4 py-3 whitespace-nowrap font-medium text-sm ${
            activeTab === "subscription"
              ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("subscription")}
        >
          {t("profile.tabs.subscription")}
        </button>
        <button
          className={`px-4 py-3 whitespace-nowrap font-medium text-sm ${
            activeTab === "appearance"
              ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("appearance")}
        >
          {t("profile.tabs.appearance")}
        </button>
        <button
          className={`px-4 py-3 whitespace-nowrap font-medium text-sm ${
            activeTab === "notifications"
              ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("notifications")}
        >
          {t("profile.tabs.notifications")}
        </button>
      </div>
    );
  };

  const renderGeneralTab = () => {
    return (
      <div className="space-y-6">
        <form onSubmit={handleProfileUpdate} className="mb-6">
          <div className="space-y-6">
            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden mb-4">
                {userProfile.photoURL ? (
                  <img
                    src={userProfile.photoURL}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl text-gray-400 dark:text-gray-300">
                    {userProfile.displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                disabled={loading}
              >
                {t("profile.general.changePhoto")}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("profile.general.displayName")}
                </label>
                <input
                  type="text"
                  name="displayName"
                  value={userProfile.displayName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("profile.general.email")}
                </label>
                <input
                  type="email"
                  name="email"
                  value={userProfile.email}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("profile.general.phoneNumber")}
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={userProfile.phoneNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  disabled={loading}
                  placeholder={t("profile.general.phoneNumberPlaceholder")}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("profile.general.bio")}
                </label>
                <textarea
                  name="bio"
                  value={userProfile.bio}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  disabled={loading}
                  rows={3}
                  placeholder={t("profile.general.bioPlaceholder")}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm mt-2 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="text-green-500 text-sm mt-2 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                {success}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading
                  ? t("profile.general.saving")
                  : t("profile.general.saveChanges")}
              </button>
            </div>
          </div>
        </form>

        {user && user.id && <UserStats userId={user.id} />}
      </div>
    );
  };

  const renderSecurityTab = () => {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t("profile.security.password")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t("profile.security.passwordMessage")}
          </p>
          <button
            type="button"
            onClick={handlePasswordReset}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading
              ? t("profile.security.sending")
              : t("profile.security.resetPassword")}
          </button>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t("profile.security.twoFactor")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t("profile.security.twoFactorMessage")}
          </p>
          <button
            type="button"
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={true}
          >
            {t("profile.security.comingSoon")}
          </button>
        </div>

        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <h3 className="text-lg font-medium text-red-700 dark:text-red-400 mb-2">
            {t("profile.security.dangerZone")}
          </h3>
          <p className="text-sm text-red-500 dark:text-red-400 mb-4">
            {t("profile.security.deleteWarning")}
          </p>
          <button
            type="button"
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            {t("profile.security.deleteAccount")}
          </button>
        </div>
      </div>
    );
  };

  const renderSubscriptionTab = () => {
    const isPremium = userPlan?.plan_type === "premium";

    return (
      <div className="space-y-6">
        <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t("profile.subscription.currentPlan")}
            </h3>
            <span
              className={`px-3 py-1 text-xs font-medium rounded-full ${
                isPremium
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {isPremium
                ? t("profile.subscription.premium")
                : t("profile.subscription.free")}
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t("profile.subscription.subjectLimit")}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {isPremium
                  ? t("profile.subscription.unlimited")
                  : userPlan?.subject_limit || 3}
              </span>
            </div>

            {isPremium && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t("profile.subscription.renewalDate")}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  May 23, 2023
                </span>
              </div>
            )}
          </div>

          <div className="mt-6">
            {isPremium ? (
              <button
                type="button"
                className="px-4 py-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                {t("profile.subscription.manageSubscription")}
              </button>
            ) : (
              <button
                type="button"
                className="px-4 py-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={() => navigate("/payments")}
              >
                {t("profile.subscription.upgradeToPremium")}
              </button>
            )}
          </div>
        </div>

        <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {t("profile.subscription.paymentHistory")}
          </h3>

          {isPremium ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t("profile.subscription.premiumPlanMonthly")}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Apr 23, 2023
                  </p>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  $5.00
                </span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t("profile.subscription.premiumPlanMonthly")}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Mar 23, 2023
                  </p>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  $5.00
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("profile.subscription.noPaymentHistory")}
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderAppearanceTab = () => {
    return (
      <div className="space-y-6">
        <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {t("profile.appearance.theme")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {t("profile.appearance.themeMessage")}
          </p>

          <div className="flex items-center">
            <span className="text-sm mr-4 text-gray-700 dark:text-gray-300">
              {theme === "dark"
                ? t("profile.appearance.darkMode")
                : t("profile.appearance.lightMode")}
            </span>
            <ThemeToggle />
          </div>
        </div>

        <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {t("profile.appearance.language")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {t("profile.appearance.languageMessage")}
          </p>

          <div className="flex items-center">
            <span className="text-sm mr-4 text-gray-700 dark:text-gray-300">
              {languages.find((lang) => lang.code === currentLanguage)
                ?.nativeName || "English"}
            </span>
            <LanguageSwitcher />
          </div>
        </div>

        <AccessibilitySettings
          onSuccess={(message) => setSuccess(message)}
          onError={(message) => setError(message)}
        />
      </div>
    );
  };

  const renderNotificationsTab = () => {
    return (
      <NotificationPreferences
        onSuccess={(message) => setSuccess(message)}
        onError={(message) => setError(message)}
      />
    );
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "security":
        return renderSecurityTab();
      case "subscription":
        return renderSubscriptionTab();
      case "appearance":
        return renderAppearanceTab();
      case "notifications":
        return renderNotificationsTab();
      default:
        return renderGeneralTab();
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${background("primary")}`}>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-64 space-y-6">
            <div className={`p-6 rounded-lg ${background("secondary")} shadow`}>
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden mb-4">
                  {userProfile.photoURL ? (
                    <img
                      src={userProfile.photoURL}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl text-gray-400 dark:text-gray-300">
                      {userProfile.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <h2 className={`text-lg font-semibold ${text("primary")}`}>
                  {userProfile.displayName}
                </h2>
                <p className={`text-sm ${text("secondary")}`}>
                  {userProfile.email}
                </p>

                <button
                  onClick={handleLogout}
                  className="mt-4 px-4 py-2 w-full bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  {t("profile.logout")}
                </button>
              </div>
            </div>

            <div
              className={`hidden md:block p-6 rounded-lg ${background(
                "secondary"
              )} shadow`}
            >
              <h3 className={`text-md font-semibold ${text("primary")} mb-4`}>
                {t("profile.navigation")}
              </h3>
              <nav className="space-y-1">
                <button
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === "general"
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                      : `${text("secondary")} hover:${text(
                          "primary"
                        )} hover:bg-gray-100 dark:hover:bg-gray-800`
                  }`}
                  onClick={() => setActiveTab("general")}
                >
                  {t("profile.tabs.general")}
                </button>
                <button
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === "security"
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                      : `${text("secondary")} hover:${text(
                          "primary"
                        )} hover:bg-gray-100 dark:hover:bg-gray-800`
                  }`}
                  onClick={() => setActiveTab("security")}
                >
                  {t("profile.tabs.security")}
                </button>
                <button
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === "subscription"
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                      : `${text("secondary")} hover:${text(
                          "primary"
                        )} hover:bg-gray-100 dark:hover:bg-gray-800`
                  }`}
                  onClick={() => setActiveTab("subscription")}
                >
                  {t("profile.tabs.subscription")}
                </button>
                <button
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === "appearance"
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                      : `${text("secondary")} hover:${text(
                          "primary"
                        )} hover:bg-gray-100 dark:hover:bg-gray-800`
                  }`}
                  onClick={() => setActiveTab("appearance")}
                >
                  {t("profile.tabs.appearance")}
                </button>
                <button
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                    activeTab === "notifications"
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                      : `${text("secondary")} hover:${text(
                          "primary"
                        )} hover:bg-gray-100 dark:hover:bg-gray-800`
                  }`}
                  onClick={() => setActiveTab("notifications")}
                >
                  {t("profile.tabs.notifications")}
                </button>
              </nav>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1">
            <div className={`p-6 rounded-lg ${background("secondary")} shadow`}>
              <h1 className={`text-2xl font-bold ${text("primary")} mb-6`}>
                {t("profile.title")}
              </h1>

              {/* Mobile tabs */}
              <div className="md:hidden mb-6">{renderTabs()}</div>

              {/* Tab content */}
              {renderActiveTab()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
