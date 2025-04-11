import { useState } from "react";
import PropTypes from "prop-types";
import { useUserPreferences } from "../../../contexts/UserPreferencesContext";
import { useTranslation } from "react-i18next";

const NotificationPreferences = ({ onSuccess, onError }) => {
  const { t } = useTranslation();
  const { preferences, updateNotifications } = useUserPreferences();
  const [loading, setLoading] = useState(false);

  // Default values if preferences are not yet loaded
  const notificationSettings = preferences?.notification_settings || {
    email: true,
    push: true,
    study_reminders: false,
  };

  const handleToggle = async (setting) => {
    setLoading(true);

    try {
      await updateNotifications({
        [setting]: !notificationSettings[setting],
      });

      if (onSuccess) {
        onSuccess(`${setting.replace("_", " ")} notifications updated`);
      }
    } catch (error) {
      console.error(`Error updating ${setting} notifications:`, error);
      if (onError) {
        onError(`Failed to update ${setting.replace("_", " ")} notifications`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t("profile.notifications.preferences")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {t("profile.notifications.preferencesMessage")}
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                {t("profile.notifications.email")}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("profile.notifications.emailDescription")}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={notificationSettings.email}
                onChange={() => handleToggle("email")}
                disabled={loading}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                {t("profile.notifications.push")}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("profile.notifications.pushDescription")}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={notificationSettings.push}
                onChange={() => handleToggle("push")}
                disabled={loading}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                {t("profile.notifications.studyReminders")}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("profile.notifications.studyRemindersDescription")}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={notificationSettings.study_reminders}
                onChange={() => handleToggle("study_reminders")}
                disabled={loading}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Communication Preferences
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Manage what types of communications you receive from us.
        </p>

        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="product-updates"
                type="checkbox"
                className="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-blue-600 dark:ring-offset-gray-800"
                checked={true}
                disabled={true}
              />
            </div>
            <div className="ml-3 text-sm">
              <label
                htmlFor="product-updates"
                className="font-medium text-gray-900 dark:text-white"
              >
                Product updates
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Important product updates and security notifications (cannot be
                disabled)
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="marketing"
                type="checkbox"
                className="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-blue-600 dark:ring-offset-gray-800"
                checked={false}
              />
            </div>
            <div className="ml-3 text-sm">
              <label
                htmlFor="marketing"
                className="font-medium text-gray-900 dark:text-white"
              >
                Marketing emails
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Promotional offers and new feature announcements
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="newsletter"
                type="checkbox"
                className="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-blue-600 dark:ring-offset-gray-800"
                checked={false}
              />
            </div>
            <div className="ml-3 text-sm">
              <label
                htmlFor="newsletter"
                className="font-medium text-gray-900 dark:text-white"
              >
                Monthly newsletter
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Get study tips, learning strategies, and educational content
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

NotificationPreferences.propTypes = {
  onSuccess: PropTypes.func,
  onError: PropTypes.func,
};

export default NotificationPreferences;
