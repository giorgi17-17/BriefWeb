import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABSE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY; // Add this to your .env file
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
