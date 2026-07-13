import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Die Supabase-Zugangsdaten fehlen in der Datei .env.local.",
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
);