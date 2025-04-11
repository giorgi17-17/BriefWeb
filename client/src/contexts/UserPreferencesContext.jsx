import { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useAuth } from "../utils/authHooks";
import {
  getUserPreferences,
  updateUserPreferences,
  updateUISettings,
  updateUserProfile,
  updateNotificationSettings,
} from "../utils/userPreferencesAPI";

// Create context
const UserPreferencesContext = createContext(null);

// Create provider component
export function UserPreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState({
    isLoading: true,
    display_name: null,
    bio: null,
    avatar_url: null,
    phone_number: null,
    notification_settings: {
      email: true,
      push: true,
      study_reminders: false,
    },
    ui_settings: {
      theme: "system",
      language: "en",
      reduced_motion: false,
      high_contrast: false,
    },
    error: null,
  });

  const { user } = useAuth();

  // Fetch user preferences
  useEffect(() => {
    async function fetchUserPreferences() {
      if (!user) {
        setPreferences((prev) => ({
          ...prev,
          isLoading: false,
        }));
        return;
      }

      try {
        const userPrefs = await getUserPreferences(user.id);
        setPreferences({
          ...userPrefs,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error("Error fetching user preferences:", error);
        setPreferences((prev) => ({
          ...prev,
          isLoading: false,
          error: "Failed to load preferences",
        }));
      }
    }

    fetchUserPreferences();
  }, [user]);

  // Update general user preferences
  const updatePreferences = async (updatedPrefs) => {
    if (!user) return;

    setPreferences((prev) => ({
      ...prev,
      isLoading: true,
    }));

    try {
      const result = await updateUserPreferences(user.id, updatedPrefs);
      setPreferences({
        ...result,
        isLoading: false,
        error: null,
      });
      return result;
    } catch (error) {
      console.error("Error updating preferences:", error);
      setPreferences((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to update preferences",
      }));
      throw error;
    }
  };

  // Update UI settings
  const updateUI = async (uiSettings) => {
    if (!user) return;

    setPreferences((prev) => ({
      ...prev,
      isLoading: true,
    }));

    try {
      const result = await updateUISettings(user.id, uiSettings);
      setPreferences({
        ...result,
        isLoading: false,
        error: null,
      });
      return result;
    } catch (error) {
      console.error("Error updating UI settings:", error);
      setPreferences((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to update UI settings",
      }));
      throw error;
    }
  };

  // Update profile data
  const updateProfile = async (profileData) => {
    if (!user) return;

    setPreferences((prev) => ({
      ...prev,
      isLoading: true,
    }));

    try {
      const result = await updateUserProfile(user.id, profileData);
      setPreferences({
        ...result,
        isLoading: false,
        error: null,
      });
      return result;
    } catch (error) {
      console.error("Error updating profile:", error);
      setPreferences((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to update profile",
      }));
      throw error;
    }
  };

  // Update notification settings
  const updateNotifications = async (notificationSettings) => {
    if (!user) return;

    setPreferences((prev) => ({
      ...prev,
      isLoading: true,
    }));

    try {
      const result = await updateNotificationSettings(
        user.id,
        notificationSettings
      );
      setPreferences({
        ...result,
        isLoading: false,
        error: null,
      });
      return result;
    } catch (error) {
      console.error("Error updating notification settings:", error);
      setPreferences((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to update notification settings",
      }));
      throw error;
    }
  };

  // Create context value
  const value = {
    preferences,
    updatePreferences,
    updateUI,
    updateProfile,
    updateNotifications,
    isLoading: preferences.isLoading,
    error: preferences.error,
  };

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

// Add prop validation
UserPreferencesProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// Custom hook to use the preferences context
export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error(
      "useUserPreferences must be used within a UserPreferencesProvider"
    );
  }
  return context;
};

export default UserPreferencesContext;
