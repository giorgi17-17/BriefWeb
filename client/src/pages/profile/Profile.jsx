import { useState } from "react";
import { useAuth } from "../../utils/authHooks";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "../../utils/languageConfig";
import { supabase } from "../../utils/supabaseClient";
import SEO from "../../components/SEO/SEO";
import {
  FiUser,
  FiMail,
  FiLock,
  FiTrash2,
  FiMoon,
  FiSun,
} from "react-icons/fi";
import { useUserPlan } from "../../contexts/UserPlanContext";

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState("profile");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [confirmDeleteDialog, setConfirmDeleteDialog] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");

  const { daysLeftToRenew, nextBillingAt, isPremium } = useUserPlan();

  // Form states
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordFormErrors, setPasswordFormErrors] = useState({});

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      setError(t("profile.errors.logoutFailed"));
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError(null);
    setSuccess(null);
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm({
      ...passwordForm,
      [name]: value,
    });
  };

  const validatePasswordForm = () => {
    const errors = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = t("profile.errors.currentPasswordRequired");
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = t("profile.errors.newPasswordRequired");
    } else if (passwordForm.newPassword.length < 6) {
      errors.newPassword = t("profile.errors.passwordTooShort");
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = t("profile.errors.passwordsDoNotMatch");
    }

    setPasswordFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!validatePasswordForm()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // First verify the current password by trying to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForm.currentPassword,
      });

      if (signInError) {
        setError(t("profile.errors.incorrectCurrentPassword"));
        setIsSubmitting(false);
        return;
      }

      // Change password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      // Reset form
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setSuccess(t("profile.success.passwordChanged"));
    } catch (error) {
      console.error("Error changing password:", error);
      setError(error.message || t("profile.errors.passwordChangeFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLanguageChange = (languageCode) => {
    i18n.changeLanguage(languageCode);
    localStorage.setItem("language", languageCode);
  };

  const handleDeleteAccount = async () => {
    // Check if email confirmation matches
    if (deleteConfirmEmail !== user.email) {
      setError(t("profile.errors.emailMismatch"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Delete user's data from Supabase tables first
      // This is a simplified version - in a real app you would need to delete from all related tables

      // Delete from user_plans (if exists)
      const { error: planDeleteError } = await supabase
        .from("user_plans")
        .delete()
        .eq("user_id", user.id);

      if (planDeleteError) {
        console.error("Error deleting user plan:", planDeleteError);
      }

      // Delete from subjects (if exists)
      const { error: subjectsDeleteError } = await supabase
        .from("subjects")
        .delete()
        .eq("user_id", user.id);

      if (subjectsDeleteError) {
        console.error("Error deleting user subjects:", subjectsDeleteError);
      }

      // Delete from users table
      const { error: userDeleteError } = await supabase
        .from("users")
        .delete()
        .eq("user_id", user.id);

      if (userDeleteError) {
        console.error("Error deleting user record:", userDeleteError);
      }

      // Finally delete the user's auth record
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
        user.id
      );

      if (authDeleteError) {
        // If we can't delete through admin API (which requires special permissions),
        // use the regular sign out method and inform the user to contact support
        await logout();
        navigate("/login", {
          state: {
            message: t("profile.accountDeletedPartially"),
          },
        });
        return;
      }

      // If all successful, sign out and redirect
      await logout();
      navigate("/login", {
        state: {
          message: t("profile.accountDeleted"),
        },
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      setError(error.message || t("profile.errors.deleteFailed"));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen theme-bg-primary">
      <SEO
        title={t("profile.title")}
        description={t("profile.description")}
        keywords={[t("profile.keywords")]}
      />

      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="theme-card rounded-lg shadow-lg overflow-hidden">
          {/* Profile Header */}
          <div className="p-6 border-b theme-border">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center overflow-hidden">
                  {user?.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {user.email.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-semibold theme-text-primary">
                    {user.user_metadata?.full_name || user.email.split("@")[0]}
                  </h1>
                  <p className="theme-text-secondary">{user.email}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                {t("profile.logout")}
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b theme-border">
            <nav className="flex overflow-x-auto">
              <button
                onClick={() => handleTabChange("profile")}
                className={`px-4 py-3 font-medium text-sm flex items-center gap-2 ${activeTab === "profile"
                  ? "theme-text-primary border-b-2 border-blue-500"
                  : "theme-text-secondary hover:theme-text-primary"
                  }`}
              >
                <FiUser className="h-4 w-4" />
                {t("profile.tabs.profile")}
              </button>
              <button
                onClick={() => handleTabChange("security")}
                className={`px-4 py-3 font-medium text-sm flex items-center gap-2 ${activeTab === "security"
                  ? "theme-text-primary border-b-2 border-blue-500"
                  : "theme-text-secondary hover:theme-text-primary"
                  }`}
              >
                <FiLock className="h-4 w-4" />
                {t("profile.tabs.security")}
              </button>
              <button
                onClick={() => handleTabChange("preferences")}
                className={`px-4 py-3 font-medium text-sm flex items-center gap-2 ${activeTab === "preferences"
                  ? "theme-text-primary border-b-2 border-blue-500"
                  : "theme-text-secondary hover:theme-text-primary"
                  }`}
              >
                <FiMoon className="h-4 w-4" />
                {t("profile.tabs.preferences")}
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Alert Messages */}
            {error && (
              <div className="mb-6 p-4 rounded bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-6 p-4 rounded bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-400">
                {success}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold theme-text-primary mb-4">
                    {t("profile.profileInfo")}
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium theme-text-secondary mb-1">
                        {t("profile.fields.name")}
                      </label>
                      <div className="theme-input p-3 rounded flex items-center">
                        <span className="text-sm theme-text-primary">
                          {user.user_metadata?.full_name ||
                            user.email.split("@")[0]}
                        </span>
                      </div>
                    </div>


                    <div>
                      <label className="block text-sm font-medium theme-text-secondary mb-1">
                        {t("profile.fields.email")}
                      </label>
                      <div className="theme-input p-3 rounded flex items-center">
                        <FiMail className="mr-2 theme-text-secondary" />
                        <span className="text-sm theme-text-primary">
                          {user.email}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium theme-text-secondary mb-1">
                        {t("profile.fields.subscription") || "Subscription"}
                      </label>

                      <div className="theme-input p-3 rounded flex items-center justify-between gap-3">
                        {/* Left side: plan label */}
                        <div className="flex items-center">
                          {/* <FiCreditCard className="mr-2 theme-text-secondary" /> */}
                          <span className="text-sm theme-text-primary">
                            {isPremium ? (t("profile.plan.premium") || "Premium") : (t("profile.plan.free") || "Free")}
                          </span>
                        </div>

                        {/* Right side: renewal info (only for premium) */}
                        {isPremium && (
                          <div className="flex items-center text-sm theme-text-secondary">
                            {/* <FiCalendar className="mr-2" /> */}
                            <span>
                              {daysLeftToRenew == null
                                ? (t("profile.plan.billingUnknown") || "Billing info unavailable")
                                : daysLeftToRenew === 0
                                  ? (t("profile.plan.renewsToday") || "Renews today")
                                  : (t("profile.plan.renewsInDays", { count: daysLeftToRenew }) || `Renews in ${daysLeftToRenew} day${daysLeftToRenew === 1 ? "" : "s"}`)}
                              {nextBillingAt && (
                                <span className="ml-2 opacity-80">
                                  ({new Date(nextBillingAt).toLocaleDateString()})
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 
                    <div>
                      <label className="block text-sm font-medium theme-text-secondary mb-1">
                        {t("profile.fields.memberSince")}
                      </label>
                      <div className="theme-input p-3 rounded flex items-center">
                        <span className="text-sm theme-text-primary">
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div> */}
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-8">
                {/* Change Password */}
                <div>
                  <h2 className="text-xl font-semibold theme-text-primary mb-4">
                    {t("profile.changePassword")}
                  </h2>

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label
                        htmlFor="currentPassword"
                        className="block text-sm font-medium theme-text-secondary mb-1"
                      >
                        {t("profile.fields.currentPassword")}
                      </label>
                      <input
                        type="password"
                        id="currentPassword"
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        className={`theme-input w-full p-2 rounded ${passwordFormErrors.currentPassword
                          ? "border-red-400"
                          : ""
                          }`}
                      />
                      {passwordFormErrors.currentPassword && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {passwordFormErrors.currentPassword}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="newPassword"
                        className="block text-sm font-medium theme-text-secondary mb-1"
                      >
                        {t("profile.fields.newPassword")}
                      </label>
                      <input
                        type="password"
                        id="newPassword"
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        className={`theme-input w-full p-2 rounded ${passwordFormErrors.newPassword ? "border-red-400" : ""
                          }`}
                      />
                      {passwordFormErrors.newPassword && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {passwordFormErrors.newPassword}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="confirmPassword"
                        className="block text-sm font-medium theme-text-secondary mb-1"
                      >
                        {t("profile.fields.confirmPassword")}
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        className={`theme-input w-full p-2 rounded ${passwordFormErrors.confirmPassword
                          ? "border-red-400"
                          : ""
                          }`}
                      />
                      {passwordFormErrors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {passwordFormErrors.confirmPassword}
                        </p>
                      )}
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50"
                      >
                        {isSubmitting
                          ? t("common.loading")
                          : t("profile.savePassword")}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Delete Account */}
                <div>
                  <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
                    {t("profile.deleteAccount")}
                  </h2>

                  <p className="theme-text-secondary mb-4">
                    {t("profile.deleteWarning")}
                  </p>

                  {!confirmDeleteDialog ? (
                    <button
                      onClick={() => setConfirmDeleteDialog(true)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium flex items-center gap-2"
                    >
                      <FiTrash2 className="h-4 w-4" />
                      {t("profile.deleteAccountButton")}
                    </button>
                  ) : (
                    <div className="border theme-border p-4 rounded space-y-4">
                      <p className="text-sm theme-text-primary font-medium">
                        {t("profile.confirmDeletePrompt")}
                      </p>

                      <div>
                        <label
                          htmlFor="deleteConfirmEmail"
                          className="block text-sm font-medium theme-text-secondary mb-1"
                        >
                          {t("profile.typeEmailToConfirm")}
                        </label>
                        <input
                          type="email"
                          id="deleteConfirmEmail"
                          value={deleteConfirmEmail}
                          onChange={(e) =>
                            setDeleteConfirmEmail(e.target.value)
                          }
                          placeholder={user.email}
                          className="theme-input w-full p-2 rounded"
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setConfirmDeleteDialog(false);
                            setDeleteConfirmEmail("");
                          }}
                          className="px-4 py-2 border theme-border rounded font-medium theme-text-primary"
                        >
                          {t("common.cancel")}
                        </button>
                        <button
                          onClick={handleDeleteAccount}
                          disabled={
                            isSubmitting || deleteConfirmEmail !== user.email
                          }
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium disabled:opacity-50 flex items-center gap-2"
                        >
                          <FiTrash2 className="h-4 w-4" />
                          {isSubmitting
                            ? t("common.loading")
                            : t("common.delete")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === "preferences" && (
              <div className="space-y-8">
                {/* Theme Settings */}
                <div>
                  <h2 className="text-xl font-semibold theme-text-primary mb-4">
                    {t("profile.appearance")}
                  </h2>

                  <button
                    onClick={toggleTheme}
                    className="inline-flex items-center justify-between p-4 theme-card rounded border theme-border hover:border-blue-500 transition-colors cursor-pointer"
                    aria-label={`Switch to ${theme === "light" ? "dark" : "light"
                      } mode`}
                  >
                    <div className="flex items-center gap-3 mr-4">
                      <div>
                        <p className="font-medium theme-text-primary">
                          {theme === "light" ? "Light Mode" : "Dark Mode"}
                        </p>
                      </div>
                    </div>
                    <div className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      {theme === "light" ? (
                        <FiMoon className="h-5 w-5 text-blue-500" />
                      ) : (
                        <FiSun className="h-5 w-5 text-amber-500" />
                      )}
                    </div>
                  </button>
                </div>

                {/* Language Settings */}
                <div>
                  <h2 className="text-xl font-semibold theme-text-primary mb-4">
                    {t("profile.language")}
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {LANGUAGES.map((language) => (
                      <button
                        key={language.code}
                        onClick={() => handleLanguageChange(language.code)}
                        className={`flex items-center gap-3 p-4 rounded border ${i18n.language === language.code
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "theme-border hover:border-blue-500"
                          }`}
                      >
                        <span className="text-2xl">{language.flag}</span>
                        <div className="text-left">
                          <p className="font-medium theme-text-primary">
                            {language.name}
                          </p>
                          <p className="text-sm theme-text-secondary">
                            {language.nativeName}
                          </p>
                        </div>
                        {i18n.language === language.code && (
                          <div className="ml-auto w-3 h-3 rounded-full bg-blue-500"></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
