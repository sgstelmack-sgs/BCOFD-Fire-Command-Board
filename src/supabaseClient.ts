import { createClient } from "@supabase/supabase-js";

// Use your actual Supabase URL and Anon Key from your Supabase Dashboard
const supabaseUrl = "https://qahsrzsgbovfakjmeukm.supabase.co";
const supabaseAnonKey = "sb_publishable_MZ5Tfe-eSyInb-nIazUaYg_Yf-DD8XF";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
