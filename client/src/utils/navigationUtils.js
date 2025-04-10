import { useCallback } from "react";

/**
 * A hook that returns a navigation function with cleanup for pending operations
 *
 * @param {Function} navigate - The navigate function from react-router-dom
 * @param {Object} isMounted - Ref to track if component is mounted
 * @param {Object} pendingRequests - Ref to track pending requests
 * @returns {Function} A function to navigate with cleanup
 */
export const useNavigateWithCleanup = (
  navigate,
  isMounted,
  pendingRequests
) => {
  return useCallback(
    (path, state = {}) => {
      if (!isMounted.current) return;

      // First set that we're unmounting to prevent further state updates
      isMounted.current = false;

      // Create a shallow copy of all current requests to avoid stale refs
      const requestsToAbort = { ...pendingRequests.current };

      // Cancel all pending operations using the copy
      Object.values(requestsToAbort).forEach((controller) => {
        if (controller && controller.abort) {
          controller.abort();
        }
      });

      // Navigate immediately
      navigate(path, { state });
    },
    [navigate, isMounted, pendingRequests]
  );
};

/**
 * Gets the current path segments from window.location
 *
 * @returns {Array} The path segments
 */
export const getPathSegments = () => {
  return window.location.pathname.split("/");
};

/**
 * Creates a handler function for back navigation to subject page
 *
 * @param {Function} navigateWithCleanup - Navigation function with cleanup
 * @param {string|null} subjectId - The subject ID to fallback to
 * @returns {Function} Handler function for back navigation
 */
export const createBackClickHandler = (
  navigateWithCleanup,
  subjectId = null
) => {
  return () => {
    // Get the current URL path segments
    const pathParts = getPathSegments();

    // The URL structure should be /subjects/{subject-identifier}/lectures/{lecture-id}
    // So we want to extract the subject-identifier from the path
    if (pathParts.length >= 3) {
      const subjectIdentifier = pathParts[2];
      console.log(
        "Navigating back to subject page with identifier:",
        subjectIdentifier
      );
      navigateWithCleanup(`/subjects/${subjectIdentifier}`);
    } else if (subjectId) {
      // Fallback to using the subject ID from state if URL parsing fails
      console.log(
        "Navigating back to subject using state subjectId:",
        subjectId
      );
      navigateWithCleanup(`/subjects/${subjectId}`);
    } else {
      // If all else fails, go to subjects list
      console.log("No subject identifier available, going to subjects list");
      navigateWithCleanup("/subjects");
    }
  };
};
