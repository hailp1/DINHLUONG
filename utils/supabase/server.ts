import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

export async function createClient() {
    const cookieStore = await cookies()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Supabase environment variables are missing in server context. Using placeholder for build stability.');
        return createServerClient<Database>(
            supabaseUrl || 'https://placeholder.supabase.co',
            supabaseAnonKey || 'placeholder',
            {
                cookies: {
                    getAll() { return [] },
                    setAll() { }
                }
            }
        ) as any;
    }

    return createServerClient<Database>(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, {
                                ...options,
                                path: '/', // Ensure cookies are accessible everywhere
                            })
                        )
                    } catch (error) {
                        // Safe to ignore in Server Components
                    }
                },
            },
        }
    ) as any
}
