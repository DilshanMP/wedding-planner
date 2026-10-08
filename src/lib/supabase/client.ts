"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cloud mode turns on when both public Supabase variables are set. Only the
 * publishable (anon) key is used in the browser; RLS protects the data.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const cloudEnabled = Boolean(url && key);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!cloudEnabled) throw new Error("Supabase is not configured.");
  client ??= createBrowserClient(url!, key!);
  return client;
}
