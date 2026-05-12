import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

export type TypedSupabaseClient = ReturnType<typeof createBrowserClient<Database>>

let supabaseInstance: TypedSupabaseClient | null = null;

export const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance as any;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables are missing. Using placeholder for build stability.');
    // Return a dummy instance or handle as needed for build time
    // For build stability, we can initialize with placeholders if URL is missing
    return createBrowserClient<Database>(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder'
    ) as any;
  }

  supabaseInstance = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  );
  return supabaseInstance as any;
};

export const createClient = getSupabase;
