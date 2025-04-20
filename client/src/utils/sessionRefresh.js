// import { supabase } from "./supabaseClient";

// /**
//  * Checks if the current session is valid and refreshes the token if needed
//  * @returns {Promise<Object|null>} The current session or null if no session exists
//  */
// export const checkAndRefreshSession = async () => {
//   try {
//     // First check if we have a current session
//     const {
//       data: { session },
//     } = await supabase.auth.getSession();

//     if (!session) {
//       console.log("No session found");
//       return null;
//     }

//     // Check if token is expired or about to expire (within 5 minutes)
//     const expiresAt = session.expires_at * 1000; // convert to milliseconds
//     const isExpiringSoon = expiresAt - Date.now() < 5 * 60 * 1000; // 5 minutes

//     if (isExpiringSoon && session.refresh_token) {
//       console.log("Session expiring soon, refreshing token");
//       const { data, error } = await supabase.auth.refreshSession();

//       if (error) {
//         console.error("Error refreshing session:", error);
//         return null;
//       }

//       return data.session;
//     }

//     return session;
//   } catch (error) {
//     console.error("Error checking session:", error);
//     return null;
//   }
// };
