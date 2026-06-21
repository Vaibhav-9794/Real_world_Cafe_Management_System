import { createBrowserClient, createServerClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (process.env.NODE_ENV === 'production') {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Database configuration failed: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
}

const finalUrl = supabaseUrl || 'https://dummy.supabase.co';
const finalAnonKey = supabaseAnonKey || '';

// 1. Client-side browser instance (Safe for client-side components)
export const createSupabaseBrowserClient = () => {
  return createBrowserClient(finalUrl, finalAnonKey);
};

// 2. Server-side cookie client (for Router API and Server Components)
export const createSupabaseServerClient = (cookieStore: any) => {
  return createServerClient(finalUrl, finalAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Allowed to fail if called from Server Components
        }
      },
    },
  });
};
