import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Function to create a fresh Supabase client with persisted session
const createSupabaseClient = () => {
  console.log("Creating a new Supabase client");

  // Create client with persistent sessions enabled
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: localStorage, // Explicitly use localStorage for persistence
    },
  });

  return client;
};

// Create the initial Supabase client
export let supabase = createSupabaseClient();

// Track last activity timestamp
let lastActiveTimestamp = Date.now();
const LONG_INACTIVITY_THRESHOLD = 60000; // 60 seconds

// Add visibility change event listener to reconnect when the page becomes visible again
if (typeof document !== "undefined") {
  let reconnectTimeout;

  // Set up interval to refresh token when app is active
  const tokenRefreshInterval = setInterval(() => {
    if (document.visibilityState === "visible") {
      // Only refresh if we have an active session
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session) {
          // Update the last active timestamp
          lastActiveTimestamp = Date.now();
        }
      });
    }
  }, 300000); // Check every 5 minutes

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      const currentTime = Date.now();
      const inactivityPeriod = currentTime - lastActiveTimestamp;

      console.log(
        `Page is visible after ${inactivityPeriod / 1000} seconds of inactivity`
      );

      // Clear any existing timeout
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }

      // For extended inactivity, perform a more thorough session recovery
      if (inactivityPeriod > LONG_INACTIVITY_THRESHOLD) {
        console.log(
          "Extended inactivity detected, performing full session recovery"
        );

        reconnectTimeout = setTimeout(async () => {
          try {
            // Recreate the client
            supabase = createSupabaseClient();

            // Get the current session
            const { data, error } = await supabase.auth.getSession();

            if (error) {
              console.error(
                "Error getting session after long inactivity:",
                error
              );
              return;
            }

            if (data?.session) {
              console.log("Active session found after inactivity");

              // Explicitly refresh the token if session exists but might be stale
              try {
                const { data: refreshData, error: refreshError } =
                  await supabase.auth.refreshSession();

                if (refreshError) {
                  console.error("Error refreshing session:", refreshError);
                  // If refresh fails, try to recover by setting the existing token explicitly
                  if (data.session.access_token) {
                    console.log("Setting existing access token explicitly");
                    supabase.auth.setSession({
                      access_token: data.session.access_token,
                      refresh_token: data.session.refresh_token,
                    });
                  }
                } else {
                  console.log(
                    "Session refreshed successfully",
                    !!refreshData.session
                  );
                }
              } catch (refreshErr) {
                console.error("Exception during token refresh:", refreshErr);
              }
            } else {
              console.log("No active session found after inactivity");
            }

            // Update last active timestamp
            lastActiveTimestamp = Date.now();

            // Dispatch a custom event that hooks can listen for
            const sessionRecoveryEvent = new CustomEvent(
              "supabase:sessionRecovered",
              {
                detail: {
                  success: !!data?.session,
                  timestamp: Date.now(),
                },
              }
            );
            document.dispatchEvent(sessionRecoveryEvent);
          } catch (err) {
            console.error("Error during session recovery:", err);
          }
        }, 200); // Short delay to ensure browser is ready
      } else {
        // For shorter inactivity, just verify the session
        reconnectTimeout = setTimeout(() => {
          // Update the active timestamp
          lastActiveTimestamp = Date.now();

          // Verify the session is still valid
          supabase.auth.getSession().then(({ data, error }) => {
            if (error) {
              console.error(
                "Error getting session after visibility change:",
                error
              );
            } else {
              console.log(
                "Session verified after visibility change:",
                data.session ? "Session active" : "No active session"
              );
            }
          });
        }, 200);
      }
    } else if (document.visibilityState === "hidden") {
      // Update timestamp when user navigates away
      lastActiveTimestamp = Date.now();

      // Clear any pending reconnect
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    }
  });

  // Clean up interval when page unloads
  window.addEventListener("beforeunload", () => {
    clearInterval(tokenRefreshInterval);
  });
}

// Add v1 compatibility method for Google sign-in
supabase.auth.signIn = async (params) => {
  console.log("Using v1 compatibility signIn with params:", params);

  if (params.provider) {
    // OAuth sign-in (Google, etc.)
    // We never add any custom redirects, using Supabase's default behavior
    // based on the current origin
    const result = await supabase.auth.signInWithOAuth({
      provider: params.provider,
    });

    console.log("OAuth result:", result);

    // Return in v1 format
    return {
      user: result.data?.user,
      session: result.data?.session,
      error: result.error,
    };
  } else if (params.email && params.password) {
    // Email/password sign-in
    const result = await supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    });

    return {
      user: result.data?.user,
      session: result.data?.session,
      error: result.error,
    };
  } else {
    return {
      user: null,
      session: null,
      error: new Error("Invalid parameters for signIn"),
    };
  }
};
