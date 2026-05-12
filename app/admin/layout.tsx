'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getSupabase } from '@/utils/supabase/client'
import Link from 'next/link'
import {
    Shield, MessageSquare, ArrowLeft, Users, Settings, Activity,
    ShieldCheck, Code, LayoutDashboard, BookOpen, Scale, Coins,
    FlaskConical, Menu, X, ChevronRight
} from 'lucide-react'
import { Loader2 } from 'lucide-react'

const NAV_SECTIONS = [
    {
        title: 'Hệ thống',
        items: [
            { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
        ]
    }
]

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const supabase = getSupabase()

    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const { data: { user }, error } = await supabase.auth.getUser()

                if (error || !user) {
                    router.push('/login?next=' + pathname)
                    return
                }

                // Check if user is admin
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                const userProfile = profile as any
                if (userProfile?.role !== 'admin') {
                    router.push('/')
                    return
                }

                setIsAdmin(true)
            } catch (err) {
                console.error('[Admin] Error checking admin:', err)
                router.push('/login')
            } finally {
                setLoading(false)
            }
        }

        checkAdmin()
    }, [router, pathname, supabase])

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!isAdmin) {
        return null // Will redirect
    }

    const isActive = (href: string, exact?: boolean) => {
        if (exact) return pathname === href
        return pathname?.startsWith(href) || false
    }

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Mobile Hamburger */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 text-white rounded-lg shadow-lg"
            >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                w-72 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white
                flex flex-col fixed md:sticky top-0 h-screen z-40
                transition-transform duration-300
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                {/* Brand Header */}
                <div className="p-5 border-b border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="font-bold text-lg tracking-tight">NCS Admin</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Production Live</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
                    {NAV_SECTIONS.map((section) => (
                        <div key={section.title}>
                            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                {section.title}
                            </div>
                            <div className="space-y-0.5">
                                {section.items.map((item) => {
                                    const active = isActive(item.href, (item as any).exact)
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setSidebarOpen(false)}
                                            className={`
                                                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
                                                ${active
                                                    ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/10 text-white border border-blue-500/20 shadow-sm'
                                                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                                                }
                                            `}
                                        >
                                            <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                                            <span className="flex-1">{item.label}</span>
                                            {active && <ChevronRight className="w-3.5 h-3.5 text-blue-400" />}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700/50">
                    <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white px-3 py-2.5 rounded-xl hover:bg-slate-800/50 transition-all text-sm font-medium">
                        <ArrowLeft className="w-4 h-4" />
                        Về trang chủ
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-h-screen overflow-y-auto">
                <div className="p-6 md:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}
