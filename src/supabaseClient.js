import { createClient } from "@supabase/supabase-js";

// ============================================================================
// SUPABASE CLIENT CONFIGURATION
// Insert your Supabase Project URL and Public Key below, or set
// VITE_SUPABASE_URL and VITE_SUPABASE_PUBLIC_KEY in your .env file.
// Never expose the Supabase service-role key in frontend code.
// ============================================================================
const SUPABASE_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_SUPABASE_URL) ||
  "https://vfrkiugqeoveqedizfgk.supabase.co";

const SUPABASE_PUBLIC_KEY =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_SUPABASE_PUBLIC_KEY) ||
  "sb_publishable__X-H5WHphsWKFiBg5xEStg_or0IW_79";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLIC_KEY
);
