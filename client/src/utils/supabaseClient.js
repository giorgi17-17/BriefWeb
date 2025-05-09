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

// Function to create user plan if missing
export const ensureUserPlan = async (userId) => {
  if (!userId) return null;

  try {
    // First check if plan exists
    const { data, error } = await supabase
      .from("user_plans")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(); // Use maybeSingle instead of single to avoid errors

    if (!error && data) {
      console.log("User plan found:", data);
      return data;
    }

    // If no plan found or error occurred, create a default plan
    console.log("No user plan found, creating default plan");

    // Try up to 3 times to insert the plan
    let attempts = 0;
    let createError = null;

    while (attempts < 3) {
      try {
        const { data: newPlan, error: insertError } = await supabase
          .from("user_plans")
          .insert([
            {
              user_id: userId,
              plan_type: "free",
              subject_limit: 3,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (!insertError && newPlan) {
          console.log("Created new user plan:", newPlan);
          return newPlan;
        }

        createError = insertError;
        attempts++;

        // If conflict error (meaning plan likely created in parallel), try getting it again
        if (insertError && insertError.code === "23505") {
          console.log("Plan creation conflict, trying to fetch existing plan");
          const { data: existingPlan } = await supabase
            .from("user_plans")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

          if (existingPlan) {
            console.log(
              "Retrieved existing plan after conflict:",
              existingPlan
            );
            return existingPlan;
          }
        }

        // Wait before retry
        if (attempts < 3) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempts));
        }
      } catch (attemptError) {
        createError = attemptError;
        attempts++;

        if (attempts < 3) {
          await new Promise((resolve) => setTimeout(resolve, 500 * attempts));
        }
      }
    }

    console.error("Failed to create user plan after 3 attempts:", createError);

    // Return a default plan object instead of null to prevent error cascades
    return {
      user_id: userId,
      plan_type: "free",
      subject_limit: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error in ensureUserPlan:", error);

    // Return a default plan object instead of null to prevent error cascades
    return {
      user_id: userId,
      plan_type: "free",
      subject_limit: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
};

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
