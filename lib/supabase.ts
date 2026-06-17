import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Server-side Supabase client using the service-role key.
 * Bypasses RLS — only ever import this from server code (API routes).
 */
export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars"
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // Next.js App Router caches GET fetches by default, which would serve
      // stale query results. Force every Supabase request to bypass that cache.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
