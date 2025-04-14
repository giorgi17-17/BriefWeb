import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Create the Supabase client with persistence enabled
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: "briefweb_auth_token",
    storage: localStorage,
    autoRefreshToken: true,
  },
});

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
