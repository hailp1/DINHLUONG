'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { usePathname } from 'next/navigation'
import { getStoredLocale, setStoredLocale, t, type Locale } from '@/lib/i18n'
import { BarChart3, Microscope, Menu, X, Home } from 'lucide-react'

interface HeaderProps {
    hideNav?: boolean
}

function HeaderContent({ hideNav = false }: HeaderProps) {
    const pathname = usePathname()
    const [locale, setLocale] = useState<Locale>('vi')
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    useEffect(() => {
        setLocale(getStoredLocale())
    }, [])

    return (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
            <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <img src="/logo.svg" alt="ncsStat" className="h-8 w-auto" />
                    <span className="text-slate-900 font-bold tracking-tighter text-lg">ncsStat</span>
                </Link>

                {/* Simplified Nav */}
                {!hideNav && (
                    <nav className="hidden md:flex items-center gap-8">
                        <Link 
                            href="/" 
                            className={`text-sm font-bold flex items-center gap-2 ${pathname === '/' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            <Home className="w-4 h-4" /> Trang chủ
                        </Link>
                        <Link 
                            href="/TinPhanTich" 
                            className={`text-sm font-bold flex items-center gap-2 ${pathname === '/TinPhanTich' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            <BarChart3 className="w-4 h-4" /> Hệ thống Phân tích
                        </Link>
                    </nav>
                )}

                {/* Right Side */}
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center bg-slate-50 rounded-lg p-1 border border-slate-200">
                        <button
                            onClick={() => { setStoredLocale('vi'); window.location.reload(); }}
                            className={`px-3 py-1 text-[10px] font-black rounded-md ${locale === 'vi' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                        >
                            VI
                        </button>
                        <button
                            onClick={() => { setStoredLocale('en'); window.location.reload(); }}
                            className={`px-3 py-1 text-[10px] font-black rounded-md ${locale === 'en' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                        >
                            EN
                        </button>
                    </div>

                    <button 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 md:hidden text-slate-600"
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Nav */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-t border-slate-100 bg-white p-6 space-y-4 shadow-xl">
                    <Link href="/" className="block text-sm font-bold text-slate-700" onClick={() => setIsMobileMenuOpen(false)}>Trang chủ</Link>
                    <Link href="/TinPhanTich" className="block text-sm font-bold text-slate-700" onClick={() => setIsMobileMenuOpen(false)}>Hệ thống Phân tích</Link>
                </div>
            )}
        </header>
    )
}

export default function Header(props: any) {
    return (
        <Suspense fallback={<div className="h-16 bg-white border-b"></div>}>
            <HeaderContent {...props} />
        </Suspense>
    )
}
