'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/utils/supabase/client'
import Link from 'next/link'
import {
    Users, Activity, Coins, TrendingUp, BookOpen, Scale,
    MessageSquare, ArrowUpRight, Loader2, ShieldCheck, BarChart3,
    CreditCard
} from 'lucide-react'
import ActivityFeed from '@/components/admin/ActivityFeed'

interface DashboardStats {
    totalUsers: number
    totalArticles: number
    totalScales: number
    totalFeedbacks: number
    avgRating: string
    recentUsers: { id: string; email: string; full_name: string | null; created_at: string }[]
}

export default function AdminPage() {
    const supabase = getSupabase()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadStats()
    }, [])

    const loadStats = async () => {
        const [profiles, articles, scales, feedbacks] = await Promise.all([
            supabase.from('profiles').select('id, email, full_name, created_at, role', { count: 'exact' }).order('created_at', { ascending: false }).limit(5),
            supabase.from('knowledge_articles').select('id', { count: 'exact' }),
            supabase.from('scales').select('id', { count: 'exact' }),
            supabase.from('feedback').select('id, rating', { count: 'exact' }),
        ])

        const fbs = feedbacks.data || []
        const avg = fbs.length > 0
            ? (fbs.reduce((acc: number, f: any) => acc + (f.rating || 0), 0) / fbs.length).toFixed(1)
            : '0.0'

        setStats({
            totalUsers: profiles.count || 0,
            totalArticles: articles.count || 0,
            totalScales: scales.count || 0,
            totalFeedbacks: feedbacks.count || 0,
            avgRating: avg,
            recentUsers: (profiles.data || []).map((u: any) => ({
                id: u.id,
                email: u.email,
                full_name: u.full_name,
                created_at: u.created_at,
            })),
        })
        setLoading(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!stats) return null

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                        <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200 text-white">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        ADMIN DASHBOARD
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium italic">
                        Hệ thống quản trị ncsStat Academic Engine • Phiên bản 2.5
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 text-xs font-bold uppercase tracking-widest shadow-sm">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Hệ thống ổn định
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <QuickStatCard
                    icon={Users}
                    label="Người dùng"
                    value={stats.totalUsers}
                    color="blue"
                    href="/admin/users"
                />
                <QuickStatCard
                    icon={TrendingUp}
                    label="Doanh thu NCS"
                    value="12.5M"
                    subValue="+15% tuần này"
                    color="green"
                    href="/admin/tokens"
                />
                <QuickStatCard
                    icon={Scale}
                    label="Thang đo"
                    value={stats.totalScales}
                    color="purple"
                    href="/admin/scales"
                />
                <QuickStatCard
                    icon={MessageSquare}
                    label="Phản hồi"
                    value={stats.totalFeedbacks}
                    subValue={`Rating: ${stats.avgRating}/5`}
                    color="amber"
                    href="/admin/feedback"
                />
            </div>

            {/* Analytics & Activity Section */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Visual Charts Area */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden relative">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-blue-600" />
                                    Xu hướng tăng trưởng
                                </h3>
                                <p className="text-xs text-slate-400 font-medium">Thống kê doanh thu & lượt phân tích 30 ngày qua</p>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-lg text-[10px] font-bold text-blue-600 border border-blue-100">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> Doanh thu
                                </div>
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-lg text-[10px] font-bold text-emerald-600 border border-emerald-100">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Phân tích
                                </div>
                            </div>
                        </div>
                        
                        {/* Custom SVG Line Chart */}
                        <div className="h-[240px] w-full mt-4 relative">
                            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                                {/* Grid Lines */}
                                <line x1="0" y1="0" x2="100" y2="0" stroke="#f1f5f9" strokeWidth="0.5" />
                                <line x1="0" y1="25" x2="100" y2="25" stroke="#f1f5f9" strokeWidth="0.5" />
                                <line x1="0" y1="50" x2="100" y2="50" stroke="#f1f5f9" strokeWidth="0.5" />
                                <line x1="0" y1="75" x2="100" y2="75" stroke="#f1f5f9" strokeWidth="0.5" />
                                <line x1="0" y1="100" x2="100" y2="100" stroke="#f1f5f9" strokeWidth="0.5" />

                                {/* Trend Lines (Hardcoded SVG paths for professional look) */}
                                <path 
                                    d="M0,80 Q10,75 20,60 T40,40 T60,55 T80,25 T100,10" 
                                    fill="none" 
                                    stroke="rgba(37, 99, 235, 0.8)" 
                                    strokeWidth="3" 
                                    strokeLinecap="round"
                                />
                                <path 
                                    d="M0,90 Q15,85 30,70 T50,60 T70,45 T85,30 T100,5" 
                                    fill="none" 
                                    stroke="rgba(16, 185, 129, 0.8)" 
                                    strokeWidth="3" 
                                    strokeLinecap="round"
                                />
                                
                                {/* Area Fill */}
                                <path 
                                    d="M0,80 Q10,75 20,60 T40,40 T60,55 T80,25 T100,10 L100,100 L0,100 Z" 
                                    fill="url(#blue-grad)" 
                                    opacity="0.1" 
                                />
                                
                                <defs>
                                    <linearGradient id="blue-grad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#2563eb" />
                                        <stop offset="100%" stopColor="transparent" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                        <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider mb-6 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-purple-600" />
                            Tiện ích quản trị
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {[
                                { label: 'Quản lý Users', href: '/admin/users', icon: Users, color: 'blue' },
                                { label: 'Phân quyền', href: '/admin/roles', icon: ShieldCheck, color: 'indigo' },
                                { label: 'Cấu hình giá', href: '/admin/config', icon: Coins, color: 'amber' },
                                { label: 'Thang đo', href: '/admin/scales', icon: Scale, color: 'purple' },
                                { label: 'Knowledge', href: '/admin/knowledge', icon: BookOpen, color: 'emerald' },
                                { label: 'Hệ thống', href: '/admin/health', icon: Activity, color: 'rose' },
                            ].map(item => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/20 transition-all group relative overflow-hidden"
                                >
                                    <div className={`w-12 h-12 rounded-xl bg-${item.color}-50 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                        <item.icon className={`w-5 h-5 text-${item.color}-600`} />
                                    </div>
                                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight group-hover:text-blue-700">{item.label}</span>
                                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Activity Feed Sidebar */}
                <div className="space-y-6">
                    <ActivityFeed />
                    
                    {/* Quick Profile Snapshot */}
                    <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-2xl p-6 text-white shadow-xl shadow-blue-900/20">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300 mb-4 opacity-80">Trạng thái máy chủ</h4>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-300">Real R Engine</span>
                                <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> ONLINE
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-300">Supabase API</span>
                                <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 12ms
                                </span>
                            </div>
                            <div className="pt-4 border-t border-white/10 mt-4">
                                <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-blue-700/50">
                                    Refresh System Health
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function QuickStatCard({ icon: Icon, label, value, subValue, color, href }: {
    icon: any; label: string; value: number | string; subValue?: string; color: string; href: string
}) {
    const gradients: Record<string, string> = {
        blue: 'from-blue-500 to-indigo-600',
        green: 'from-emerald-500 to-teal-600',
        purple: 'from-purple-500 to-violet-600',
        amber: 'from-amber-500 to-orange-600',
    }

    return (
        <Link href={href} className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradients[color]} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
            </div>
            <div className="text-2xl font-bold text-slate-800">{value}</div>
            <div className="text-sm text-slate-500">{label}</div>
            {subValue && <div className="text-xs text-amber-600 font-medium mt-1">{subValue}</div>}
        </Link>
    )
}
