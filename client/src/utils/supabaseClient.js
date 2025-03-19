import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Define production URL
const PRODUCTION_URL = "https://briefly.ge";

// Custom options for Supabase client
const options = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Force 'briefly.ge' as the site URL for all OAuth redirect URLs on mobile
    flowType: "pkce",
    // This overrides the default redirect handling
    redirectTo: (path) => {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isProduction = window.location.origin.includes(PRODUCTION_URL);

      console.log("Supabase redirect handler:", {
        isMobile,
        isProduction,
        path,
        origin: window.location.origin,
      });

      if (isMobile && !isProduction) {
        // For mobile devices in development, force production URL
        return `${PRODUCTION_URL}${path}`;
      }

      // Otherwise use the current origin
      return `${window.location.origin}${path}`;
    },
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, options);
