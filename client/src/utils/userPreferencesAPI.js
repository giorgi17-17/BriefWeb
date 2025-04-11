import { supabase } from "./supabaseClient";

/**
 * Get user preferences from the database
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} User preferences
 */
export async function getUserPreferences(userId) {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching user preferences:", error);
      throw error;
    }

    // If no preferences found, return default values
    if (!data) {
      return {
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
      };
    }

    return data;
  } catch (error) {
    console.error("Error in getUserPreferences:", error);
    throw error;
  }
}

/**
 * Update user preferences in the database
 * @param {string} userId - The user's ID
 * @param {Object} preferences - The preferences to update
 * @returns {Promise<Object>} Updated preferences
 */
export async function updateUserPreferences(userId, preferences) {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    // First check if user preferences exist
    const { data: existingPrefs, error: fetchError } = await supabase
      .from("user_preferences")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error checking for existing preferences:", fetchError);
      throw fetchError;
    }

    let result;

    // If preferences exist, update them
    if (existingPrefs?.id) {
      const { data, error } = await supabase
        .from("user_preferences")
        .update(preferences)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        console.error("Error updating user preferences:", error);
        throw error;
      }

      result = data;
    } else {
      // If preferences don't exist, create them
      const { data, error } = await supabase
        .from("user_preferences")
        .insert([{ user_id: userId, ...preferences }])
        .select()
        .single();

      if (error) {
        console.error("Error creating user preferences:", error);
        throw error;
      }

      result = data;
    }

    return result;
  } catch (error) {
    console.error("Error in updateUserPreferences:", error);
    throw error;
  }
}

/**
 * Update notification settings
 * @param {string} userId - The user's ID
 * @param {Object} notificationSettings - The notification settings to update
 * @returns {Promise<Object>} Updated preferences
 */
export async function updateNotificationSettings(userId, notificationSettings) {
  try {
    // Get current preferences
    const currentPrefs = await getUserPreferences(userId);

    // Update notification settings
    const updatedPrefs = {
      ...currentPrefs,
      notification_settings: {
        ...currentPrefs.notification_settings,
        ...notificationSettings,
      },
    };

    // Save updated preferences
    return updateUserPreferences(userId, updatedPrefs);
  } catch (error) {
    console.error("Error updating notification settings:", error);
    throw error;
  }
}

/**
 * Update UI settings
 * @param {string} userId - The user's ID
 * @param {Object} uiSettings - The UI settings to update
 * @returns {Promise<Object>} Updated preferences
 */
export async function updateUISettings(userId, uiSettings) {
  try {
    // Get current preferences
    const currentPrefs = await getUserPreferences(userId);

    // Update UI settings
    const updatedPrefs = {
      ...currentPrefs,
      ui_settings: {
        ...currentPrefs.ui_settings,
        ...uiSettings,
      },
    };

    // Save updated preferences
    return updateUserPreferences(userId, updatedPrefs);
  } catch (error) {
    console.error("Error updating UI settings:", error);
    throw error;
  }
}

/**
 * Update profile information
 * @param {string} userId - The user's ID
 * @param {Object} profileData - The profile data to update
 * @returns {Promise<Object>} Updated preferences
 */
export async function updateUserProfile(userId, profileData) {
  try {
    // Only allow specific fields to be updated
    const allowedFields = ["display_name", "bio", "avatar_url", "phone_number"];
    const filteredData = Object.keys(profileData)
      .filter((key) => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = profileData[key];
        return obj;
      }, {});

    return updateUserPreferences(userId, filteredData);
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

export default {
  getUserPreferences,
  updateUserPreferences,
  updateNotificationSettings,
  updateUISettings,
  updateUserProfile,
};
