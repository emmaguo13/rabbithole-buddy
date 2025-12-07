import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { ENV } from "./env"

export const supabase: SupabaseClient = createClient(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  },
)
