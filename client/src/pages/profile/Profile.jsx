import { useState } from "react";
import { useAuth } from "../../utils/authHooks";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { LanguageContext } from "../../contexts/LanguageContextValue";
import { useContext } from "react";
import { supabase } from "../../utils/supabaseClient";
import { Eye, EyeOff, Moon, Sun, Trash2, Check, Globe } from "lucide-react";

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const { changeLanguage, languages, currentLanguage } =
    useContext(LanguageContext);

  // Form states
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] =
    useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);

  // Password change states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isPasswordChanging, setIsPasswordChanging] = useState(false);

  // Account deletion states
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isAccountDeleting, setIsAccountDeleting] = useState(false);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    // Check if user is using a social login
    if (user.app_metadata?.provider === "google") {
      setPasswordError(
        t(
          "profile.errors.socialLoginPasswordChange",
          "Password cannot be changed for Google accounts. Please use Google's account settings."
        )
      );
      return;
    }

    // Validate passwords
    if (newPassword !== confirmPassword) {
      setPasswordError(t("profile.errors.passwordsDoNotMatch"));
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(t("profile.errors.passwordTooShort"));
      return;
    }

    setIsPasswordChanging(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordSuccess(t("profile.success.passwordChanged"));
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setIsPasswordFormOpen(false);
        setPasswordSuccess("");
      }, 3000);
    } catch (error) {
      console.error("Error changing password:", error);

      // Handle specific error types
      if (error.message.includes("stronger password")) {
        setPasswordError(
          t(
            "profile.errors.weakPassword",
            "Please use a stronger password with a mix of letters, numbers, and symbols."
          )
        );
      } else if (error.message.includes("recent passwords")) {
        setPasswordError(
          t(
            "profile.errors.recentPassword",
            "Please use a password that you haven't used recently."
          )
        );
      } else {
        setPasswordError(
          error.message || t("profile.errors.passwordChangeFailed")
        );
      }
    } finally {
      setIsPasswordChanging(false);
    }
  };

  // Handle account deletion
  const handleAccountDeletion = async () => {
    // Check confirmation text
    if (deleteConfirmation !== user.email) {
      setDeleteError(t("profile.errors.emailConfirmationFailed"));
      return;
    }

    setIsAccountDeleting(true);
    try {
      // Delete user's account using the user API
      const { error } = await supabase.auth.updateUser({
        data: { delete_requested: true },
      });

      if (error) throw error;

      // Call custom backend endpoint to handle user deletion if available
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/users/delete`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              (
                await supabase.auth.getSession()
              ).data.session?.access_token
            }`,
          },
        });
      } catch (backendError) {
        console.error("Backend deletion error:", backendError);
        // Continue with logout even if backend call fails
      }

      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Error deleting account:", error);
      setDeleteError(
        error.message || t("profile.errors.accountDeletionFailed")
      );
      setIsAccountDeleting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 theme-bg-primary">
      <div className="w-full max-w-3xl pb-10">
        <h1 className="text-3xl font-bold theme-text-primary mb-6">
          {t("profile.title", "Profile")}
        </h1>

        {/* User Information Card */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center overflow-hidden">
              {user?.photo_url ? (
                <img
                  src={user.photo_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl text-blue-500 dark:text-blue-300">
                  {user.email.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold theme-text-primary text-center sm:text-left">
                {user.user_metadata?.full_name || user.email.split("@")[0]}
              </h2>
              <p className="theme-text-secondary text-center sm:text-left">
                {user.email}
              </p>
              <div className="mt-4">
                <p className="theme-text-secondary text-sm">
                  {t("profile.memberSince", "Member since")}:{" "}
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
                {user.app_metadata?.provider && (
                  <p className="theme-text-secondary text-sm">
                    {t("profile.signInMethod", "Sign-in method")}:{" "}
                    {user.app_metadata.provider === "google"
                      ? "Google"
                      : "Email"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Preferences Card */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-8 mb-6">
          <h2 className="text-xl font-semibold theme-text-primary mb-4">
            {t("profile.preferences", "Preferences")}
          </h2>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Theme Toggle */}
            <div className="flex-1 p-4 border theme-border rounded-lg flex flex-col items-center">
              <h3 className="font-medium theme-text-primary text-center mb-3">
                {t("profile.theme", "Theme")}
              </h3>
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center p-3 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                aria-label={
                  theme === "dark"
                    ? t("profile.switchToLight", "Switch to light mode")
                    : t("profile.switchToDark", "Switch to dark mode")
                }
              >
                {theme === "dark" ? (
                  <Sun className="h-6 w-6 text-amber-500" />
                ) : (
                  <Moon className="h-6 w-6 text-blue-700" />
                )}
              </button>
              <p className="mt-2 text-sm theme-text-secondary text-center">
                {theme === "dark"
                  ? t("profile.darkMode", "Dark Mode")
                  : t("profile.lightMode", "Light Mode")}
              </p>
            </div>

            {/* Language Selection */}
            <div className="flex-1 p-4 border theme-border rounded-lg flex flex-col items-center">
              <h3 className="font-medium theme-text-primary text-center mb-3">
                {t("profile.language", "Language")}
              </h3>
              <div className="relative">
                <button
                  onClick={() =>
                    setIsLanguageDropdownOpen(!isLanguageDropdownOpen)
                  }
                  className="flex items-center justify-center gap-2 p-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Globe className="h-5 w-5 theme-text-primary" />
                  <span className="theme-text-primary">
                    {languages.find((lang) => lang.code === currentLanguage)
                      ?.nativeName || "English"}
                  </span>
                </button>

                {isLanguageDropdownOpen && (
                  <div className="absolute mt-2 z-10 w-full py-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border theme-border">
                    {languages.map((language) => (
                      <button
                        key={language.code}
                        onClick={() => {
                          changeLanguage(language.code);
                          setIsLanguageDropdownOpen(false);
                        }}
                        className={`w-full flex items-center px-4 py-2 text-sm ${
                          currentLanguage === language.code
                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300"
                            : "theme-text-primary hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        <span className="mr-2">{language.flag}</span>
                        {language.nativeName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm theme-text-secondary text-center">
                {t("profile.selectLanguage", "Select your preferred language")}
              </p>
            </div>
          </div>
        </div>

        {/* Account Management Card */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-8">
          <h2 className="text-xl font-semibold theme-text-primary mb-4">
            {t("profile.accountManagement", "Account Management")}
          </h2>

          {/* Password Change Section */}
          <div className="mb-6">
            <button
              onClick={() => setIsPasswordFormOpen(!isPasswordFormOpen)}
              className="w-full sm:w-auto px-4 py-2 flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              {isPasswordFormOpen
                ? t("profile.cancel", "Cancel")
                : t("profile.changePassword", "Change Password")}
            </button>

            {isPasswordFormOpen && (
              <form
                onSubmit={handlePasswordChange}
                className="mt-4 border theme-border rounded-lg p-4"
              >
                {passwordError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded">
                    {passwordError}
                  </div>
                )}

                {passwordSuccess && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 rounded flex items-center gap-2">
                    <Check className="h-5 w-5" />
                    {passwordSuccess}
                  </div>
                )}

                {/* New Password */}
                <div className="mb-4">
                  <label
                    htmlFor="new-password"
                    className="block text-sm font-medium theme-text-secondary mb-1"
                  >
                    {t("profile.newPassword", "New Password")}
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 theme-input theme-border rounded"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-5 w-5 theme-text-secondary" />
                      ) : (
                        <Eye className="h-5 w-5 theme-text-secondary" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="mb-4">
                  <label
                    htmlFor="confirm-password"
                    className="block text-sm font-medium theme-text-secondary mb-1"
                  >
                    {t("profile.confirmPassword", "Confirm New Password")}
                  </label>
                  <div className="relative">
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 theme-input theme-border rounded"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 theme-text-secondary" />
                      ) : (
                        <Eye className="h-5 w-5 theme-text-secondary" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                    disabled={isPasswordChanging}
                  >
                    {isPasswordChanging
                      ? t("profile.changing", "Changing...")
                      : t("profile.saveNewPassword", "Save New Password")}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Delete Account */}
            <button
              onClick={() => setIsDeleteAccountModalOpen(true)}
              className="px-4 py-2 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              <Trash2 className="h-5 w-5" />
              {t("profile.deleteAccount", "Delete Account")}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 theme-text-primary font-medium rounded focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
            >
              {t("profile.logout", "Logout")}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {isDeleteAccountModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-500 mb-2">
              {t(
                "profile.deleteAccountConfirmation",
                "Delete Account Confirmation"
              )}
            </h3>

            <p className="mb-4 theme-text-secondary">
              {t(
                "profile.deleteAccountWarning",
                "This action is permanent. All your data will be deleted and cannot be recovered."
              )}
            </p>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded">
                {deleteError}
              </div>
            )}

            <div className="mb-4">
              <label
                htmlFor="delete-confirmation"
                className="block text-sm font-medium theme-text-secondary mb-1"
              >
                {t("profile.typeEmailToConfirm", "Type your email to confirm")}
              </label>
              <input
                id="delete-confirmation"
                type="email"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder={user.email}
                className="w-full px-3 py-2 theme-input theme-border rounded"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteAccountModalOpen(false);
                  setDeleteConfirmation("");
                  setDeleteError("");
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 theme-text-primary font-medium rounded transition-colors"
              >
                {t("profile.cancel", "Cancel")}
              </button>
              <button
                onClick={handleAccountDeletion}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded disabled:opacity-50 flex items-center gap-2"
                disabled={
                  deleteConfirmation !== user.email || isAccountDeleting
                }
              >
                {isAccountDeleting
                  ? t("profile.deleting", "Deleting...")
                  : t("profile.confirmDelete", "Confirm Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
