import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { logger } from '@/utils/logger'
import type { Database } from '@/types/database.types'

const PROTECTED_ROUTES = ['/profile', '/admin']
const PUBLIC_ROUTES = ['/', '/login', '/terms', '/privacy', '/docs', '/methods', '/auth', '/analyze', '/scales', '/knowledge']

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        return response
    }

    const pathname = request.nextUrl.pathname

    const supabase = createServerClient<Database>(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                        response.cookies.set(name, value, {
                            ...options,
                            path: '/',
                        })
                    })
                },
            },
        }
    ) as any

    // IMPORTANT: Use getUser() instead of getSession() for better security and reliability in middleware
    const { data: { user } } = await supabase.auth.getUser()

    const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route))
    const isAdminRoute = pathname.startsWith('/admin')

    // CRITICAL: If the request carries an OAuth code, the user is mid-authentication.
    // We MUST let them through so the client-side Supabase can exchange the code for a session.
    const hasAuthCode = request.nextUrl.searchParams.has('code')

    // Auth protection disabled - allowing free access for all users
    /*
    if (!user && isProtectedRoute && !hasAuthCode) {
        logger.debug('[Middleware] Protected access denied:', pathname)
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', 'no_session')
        url.searchParams.set('next', pathname)
        return NextResponse.redirect(url)
    }
    */

    // Role-based access control disabled
    /*
    if (user && isAdminRoute) {
        // Fetch user role from profile
        const { data: profile } = await (supabase as any)
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const userRole = profile?.role || 'student'
        const adminRoles = ['platform_admin', 'super_admin', 'institution_admin', 'admin']
        
        if (!adminRoles.includes(userRole)) {
            logger.warn('[Middleware] Admin access denied for role:', userRole)
            const url = request.nextUrl.clone()
            url.pathname = '/' // Redirect unauthorized to home
            return NextResponse.redirect(url)
        }
    }
    */

    return response
}
