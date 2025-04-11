import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Create a function to get a fresh axios instance
const getAxiosInstance = () => {
  return axios.create({
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
    },
  });
};

// Create initial instance
let axiosInstance = getAxiosInstance();

// Handle visibility change to reset axios when page becomes visible again
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      console.log("Page is visible, recreating plan API client");
      axiosInstance = getAxiosInstance();
    }
  });
}

/**
 * Get the user's plan details from the server
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} - The user's plan details
 */
export const getUserPlan = async (userId) => {
  try {
    const response = await axiosInstance.get(
      `${API_BASE_URL}/api/user-plans/plan`,
      {
        params: {
          user_id: userId,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching user plan:", error);

    // Check if we need to recreate the API client due to a network issue
    if (
      error.code === "ECONNABORTED" ||
      error.message === "Network Error" ||
      error.response?.status === 0
    ) {
      console.log("Network error detected, recreating plan API client");
      axiosInstance = getAxiosInstance();
    }

    throw error;
  }
};

/**
 * Check if the user can create a new subject
 * @param {string} userId - The user's ID
 * @returns {Promise<boolean>} - Whether the user can create a new subject
 */
export const canCreateSubject = async (userId) => {
  try {
    const response = await axiosInstance.get(
      `${API_BASE_URL}/api/user-plans/can-create-subject`,
      {
        params: {
          user_id: userId,
        },
      }
    );
    return response.data.can_create;
  } catch (error) {
    console.error("Error checking if user can create subject:", error);

    // Check if we need to recreate the API client due to a network issue
    if (
      error.code === "ECONNABORTED" ||
      error.message === "Network Error" ||
      error.response?.status === 0
    ) {
      console.log("Network error detected, recreating plan API client");
      axiosInstance = getAxiosInstance();
    }

    // If we get a 403 error, the user has reached their limit
    if (error.response && error.response.status === 403) {
      return false;
    }
    throw error;
  }
};

/**
 * Check if the user has a premium plan
 * @param {string} userId - The user's ID
 * @returns {Promise<boolean>} - Whether the user has a premium plan
 */
export const isPremiumUser = async (userId) => {
  try {
    const response = await axiosInstance.get(
      `${API_BASE_URL}/api/user-plans/is-premium`,
      {
        params: {
          user_id: userId,
        },
      }
    );
    return response.data.is_premium;
  } catch (error) {
    console.error("Error checking if user is premium:", error);

    // Check if we need to recreate the API client due to a network issue
    if (
      error.code === "ECONNABORTED" ||
      error.message === "Network Error" ||
      error.response?.status === 0
    ) {
      console.log("Network error detected, recreating plan API client");
      axiosInstance = getAxiosInstance();
    }

    return false;
  }
};
