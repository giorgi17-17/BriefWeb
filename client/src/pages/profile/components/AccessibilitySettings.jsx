import { useState } from "react";
import PropTypes from "prop-types";
import { useUserPreferences } from "../../../contexts/UserPreferencesContext";
import { useTranslation } from "react-i18next";

const AccessibilitySettings = ({ onSuccess, onError }) => {
  const { t } = useTranslation();
  const { preferences, updateUI } = useUserPreferences();
  const [loading, setLoading] = useState(false);

  // Default values if preferences are not yet loaded
  const uiSettings = preferences?.ui_settings || {
    reduced_motion: false,
    high_contrast: false,
  };

  const handleToggle = async (setting, value) => {
    setLoading(true);

    try {
      await updateUI({
        [setting]: value,
      });

      // Apply accessibility changes to document
      if (setting === "reduced_motion") {
        document.documentElement.classList.toggle("reduce-motion", value);
      }

      if (setting === "high_contrast") {
        document.documentElement.classList.toggle("high-contrast", value);
      }

      if (onSuccess) {
        onSuccess(`${setting.replace("_", " ")} preference updated`);
      }
    } catch (error) {
      console.error(`Error updating ${setting} setting:`, error);
      if (onError) {
        onError(`Failed to update ${setting.replace("_", " ")} preference`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {t("profile.accessibility.title")}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {t("profile.accessibility.message")}
      </p>

      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            {t("profile.accessibility.motionSensitivity")}
          </h4>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t("profile.accessibility.reducedMotion")}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("profile.accessibility.reducedMotionDescription")}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={uiSettings.reduced_motion}
                onChange={(e) =>
                  handleToggle("reduced_motion", e.target.checked)
                }
                disabled={loading}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            {t("profile.accessibility.visualPreferences")}
          </h4>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {t("profile.accessibility.highContrast")}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("profile.accessibility.highContrastDescription")}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={uiSettings.high_contrast}
                onChange={(e) =>
                  handleToggle("high_contrast", e.target.checked)
                }
                disabled={loading}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            {t("profile.accessibility.textSettings")}
          </h4>

          <div className="flex flex-col space-y-3">
            <label className="text-sm text-gray-700 dark:text-gray-300">
              {t("profile.accessibility.textSize")}
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                {t("profile.accessibility.small")}
              </button>
              <button className="px-3 py-2 text-sm bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 rounded-md text-blue-700 dark:text-blue-300">
                {t("profile.accessibility.default")}
              </button>
              <button className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                {t("profile.accessibility.large")}
              </button>
              <button className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                {t("profile.accessibility.xLarge")}
              </button>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            {t("profile.accessibility.focusIndicators")}
          </h4>

          <div className="flex items-center">
            <input
              id="focus-visible"
              type="checkbox"
              checked={true}
              disabled={true}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label
              htmlFor="focus-visible"
              className="ml-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              {t("profile.accessibility.alwaysShowFocus")}
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            {t("profile.accessibility.accessibilityCommitment")}{" "}
            <a
              href="#"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t("profile.accessibility.contactUs")}
            </a>
            .
          </p>

          <button
            type="button"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading
              ? t("common.loading")
              : t("profile.accessibility.savePreferences")}
          </button>
        </div>
      </div>
    </div>
  );
};

AccessibilitySettings.propTypes = {
  onSuccess: PropTypes.func,
  onError: PropTypes.func,
};

export default AccessibilitySettings;
