'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowRight,
    BookOpen,
    BarChart3,
    ShieldCheck,
    Search,
    Zap,
    CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getStoredLocale, t, type Locale } from '@/lib/i18n';
import Footer from '@/components/layout/Footer';

export default function HomeContent() {
    const [locale, setLocale] = useState<Locale>('vi');

    useEffect(() => {
        setLocale(getStoredLocale());
    }, []);

    return (
        <div className="bg-white">
            {/* Minimal Hero */}
            <div className="container mx-auto px-6 py-24 max-w-4xl">
                <div className="text-center">
                    <div className="inline-block px-3 py-1 bg-slate-100 rounded text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">
                        Scientific Research Suite 2026
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
                        Nền tảng Phân tích Thống kê <br />
                        <span className="text-indigo-600">Dành cho Nghiên cứu sinh</span>
                    </h1>
                    <p className="text-lg text-slate-500 mb-10 font-light leading-relaxed">
                        Hệ thống xử lý dữ liệu chuyên sâu với engine R tích hợp. Tự động kiểm định các mô hình cấu trúc PLS-SEM, EFA, CFA và độ tin cậy thang đo.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/r"
                            className="w-full sm:w-auto px-10 py-4 bg-slate-900 text-white rounded font-bold uppercase tracking-widest text-xs hover:bg-black transition-all flex items-center justify-center gap-2"
                        >
                            Bắt đầu phân tích ngay <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            href="/r"
                            className="w-full sm:w-auto px-10 py-4 bg-white border border-slate-200 text-slate-600 rounded font-bold uppercase tracking-widest text-xs hover:bg-slate-50 transition-all"
                        >
                            Xem Quy trình Nghiên cứu
                        </Link>
                    </div>
                </div>

                {/* Core Features - Simplified */}
                <div className="mt-32 grid md:grid-cols-3 gap-12">
                    <FeatureItem 
                        icon={BarChart3} 
                        title="PLS-SEM Engine" 
                        desc="Tính toán ma trận hệ số đường dẫn, R-Squared, Q-Squared và các chỉ số Fit chuẩn khoa học." 
                    />
                    <FeatureItem 
                        icon={ShieldCheck} 
                        title="Độ tin cậy & Giá trị" 
                        desc="Kiểm định Cronbach Alpha, AVE, CR và giá trị phân biệt HTMT tự động." 
                    />
                    <FeatureItem 
                        icon={Zap} 
                        title="Real R Backend" 
                        desc="Xử lý dữ liệu cực mạnh bằng engine R nguyên bản trên máy chủ, đảm bảo độ chính xác học thuật tuyệt đối." 
                    />
                </div>

                {/* Simple Stats List */}
                <div className="mt-32 border-t border-slate-100 pt-16">
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 text-center mb-10">Danh mục Phép tính Hỗ trợ</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                        <StatTag label="Cronbach's Alpha" />
                        <StatTag label="EFA / CFA" />
                        <StatTag label="PLS-SEM" />
                        <StatTag label="Bootstrapping" />
                        <StatTag label="Blindfolding (Q²)" />
                        <StatTag label="HTMT Matrix" />
                        <StatTag label="Mediation/Moderation" />
                        <StatTag label="Fornell-Larcker" />
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}

function FeatureItem({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="text-center md:text-left">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded flex items-center justify-center mb-6 mx-auto md:mx-0">
                <Icon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-3">{title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-light">{desc}</p>
        </div>
    );
}

function StatTag({ label }: { label: string }) {
    return (
        <div className="px-4 py-2 border border-slate-100 rounded text-[10px] font-bold text-slate-400 bg-slate-50">
            {label}
        </div>
    );
}
