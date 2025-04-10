import { useEffect, useRef, useCallback } from "react";

export function useRefTest() {
  const isMounted = useRef(true);
  const pendingRequests = useRef({});

  // Create a cleanup function outside of the effect
  const cleanupRequests = useCallback(() => {
    // Create a shallow copy of the current state to avoid stale refs
    const requestsToAbort = { ...pendingRequests.current };

    // Cancel all pending operations using the copy
    Object.values(requestsToAbort).forEach((controller) => {
      if (controller && controller.abort) {
        controller.abort();
      }
    });
  }, []);

  useEffect(() => {
    // Set mounted flag
    isMounted.current = true;

    // Create a test abort controller
    const controller = new AbortController();
    pendingRequests.current["test"] = controller;

    // Cleanup function
    return () => {
      // Set unmounted flag first
      isMounted.current = false;

      // Call the cleanup function
      cleanupRequests();
    };
  }, [cleanupRequests]); // Include cleanupRequests in dependencies

  return { isMounted, pendingRequests };
}
