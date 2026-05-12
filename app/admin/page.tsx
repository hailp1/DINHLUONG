'use client'

import { BarChart3, ShieldCheck, Activity, Users } from 'lucide-react'
import Header from '@/components/layout/Header'

export default function AdminPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            <Header />
            <main className="container mx-auto px-6 py-10 max-w-6xl">
                <div className="mb-10">
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-xl text-white">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        ADMIN DASHBOARD
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Hệ thống quản trị ncsStat Real R Engine</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <StatCard icon={Users} label="Trạng thái người dùng" value="Đang hoạt động" color="blue" />
                    <StatCard icon={Activity} label="Hệ thống R" value="Online" color="emerald" />
                    <StatCard icon={ShieldCheck} label="Bảo mật" value="Đã kích hoạt" color="purple" />
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                    <div className="max-w-md mx-auto">
                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <BarChart3 className="w-10 h-10 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Hệ thống đang được nâng cấp</h2>
                        <p className="text-slate-500 text-sm mb-8">
                            Chúng tôi đã dọn dẹp các module cũ để tập trung vào bộ máy phân tích TinPhanTich. Các tính năng quản trị sẽ được cập nhật trong phiên bản tiếp theo.
                        </p>
                        <a href="/TinPhanTich" className="inline-flex items-center justify-center px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all">
                            Quay lại trang phân tích
                        </a>
                    </div>
                </div>
            </main>
        </div>
    )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
    const bgColors: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        purple: 'bg-purple-50 text-purple-600',
    }

    return (
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <div className={`w-10 h-10 rounded-lg ${bgColors[color]} flex items-center justify-center mb-4`}>
                <Icon className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-lg font-black text-slate-900">{value}</p>
        </div>
    )
}
