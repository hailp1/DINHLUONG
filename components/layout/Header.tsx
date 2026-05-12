'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import UserMenu from '@/components/UserMenu'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { NcsBalanceBadge } from '@/components/NcsBalanceBadge'
import { usePathname, useSearchParams } from 'next/navigation'
import { getStoredLocale, setStoredLocale, t, type Locale } from '@/lib/i18n'
import { useAuth } from '@/context/AuthContext'
import { ChevronDown, BarChart3, Layout, BookOpen, GraduationCap, Microscope, FileText, Network, Brain, Menu, X, ClipboardCheck } from 'lucide-react'

interface HeaderProps {
    user?: any
    profile?: any
    centerContent?: React.ReactNode
    rightActions?: React.ReactNode
    hideNav?: boolean
}

function HeaderContent({ centerContent, rightActions, hideNav = false, user: propUser, profile: propProfile }: HeaderProps) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const mode = searchParams.get('mode')
    const { user: authUser, profile: authProfile, loading } = useAuth()

    // Use auth context if loaded, otherwise fallback to props to reduce flicker
    const user = authUser || propUser;
    const profile = authProfile || propProfile;
    const [locale, setLocale] = useState<Locale>('vi')
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const isVi = locale === 'vi'

    useEffect(() => {
        setLocale(getStoredLocale())
        const handleStorageChange = () => setLocale(getStoredLocale())
        window.addEventListener('storage', handleStorageChange)
        window.addEventListener('localeChange', handleStorageChange)
        return () => {
            window.removeEventListener('storage', handleStorageChange)
            window.removeEventListener('localeChange', handleStorageChange)
        }
    }, [])

    return (
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200 sticky top-0 z-50">
            <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-2 md:gap-4">
                {/* Left: Logo & Nav */}
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                        <img src="/logo.svg" alt="ncsStat" className="h-9 w-auto" />
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200 uppercase tracking-wide">Beta</span>
                    </Link>

                    {/* Desktop Nav */}
                    {!hideNav && (
                        <nav className="hidden md:flex items-center gap-1">
                            <NavDropdown
                                label={t(locale, 'nav.analyze')}
                                active={pathname?.startsWith('/analyze')}
                                icon={BarChart3}
                            >
                                <NavDropdownItem
                                    href="/analyze"
                                    active={pathname === '/analyze'}
                                    label={t(locale, 'nav.analyze1')}
                                    icon={Microscope}
                                />
                            </NavDropdown>

                            <NavDropdown
                                label={t(locale, 'nav.research_model')}
                                active={pathname?.startsWith('/scales') || pathname === '/knowledge/what-is-a-research-model'}
                                icon={Layout}
                            >
                                <NavDropdownItem
                                    href="/scales"
                                    active={pathname === '/scales'}
                                    label={t(locale, 'nav.academic_scales')}
                                    icon={Layout}
                                />
                                <NavDropdownItem
                                    href="/knowledge/what-is-a-research-model"
                                    active={pathname === '/knowledge/what-is-a-research-model'}
                                    label={t(locale, 'nav.research_models')}
                                    icon={Network}
                                />
                            </NavDropdown>

                            <NavLink href="/cite-check" active={pathname === '/cite-check'}>
                                {t(locale, 'nav.cite_check')}
                            </NavLink>

                            <NavDropdown
                                label={t(locale, 'nav.knowledge_guides')}
                                active={pathname?.startsWith('/docs') || pathname?.startsWith('/knowledge')}
                                icon={BookOpen}
                            >
                                <NavDropdownItem
                                    href="/knowledge"
                                    active={pathname?.startsWith('/knowledge')}
                                    label={t(locale, 'nav.knowledge_hub')}
                                    icon={Brain}
                                />
                                <NavDropdownItem
                                    href="/docs/theory"
                                    active={pathname === '/docs/theory'}
                                    label={t(locale, 'nav.theory')}
                                    icon={GraduationCap}
                                />
                                <NavDropdownItem
                                    href="/docs/case-study"
                                    active={pathname === '/docs/case-study'}
                                    label={t(locale, 'nav.casestudy')}
                                    icon={Microscope}
                                />
                                <NavDropdownItem
                                    href="/docs/user-guide"
                                    active={pathname === '/docs/user-guide'}
                                    label={t(locale, 'nav.userguide')}
                                    icon={FileText}
                                />
                            </NavDropdown>
                        </nav>
                    )}
                </div>

                {/* Center: Custom Content (e.g. Toolbar) or Spacer */}
                {centerContent ? (
                    <div className="flex-1 flex justify-center min-w-0 max-w-2xl px-4 hidden lg:flex">
                        {centerContent}
                    </div>
                ) : (
                    <div className="flex-1" /> // Spacer
                )}

                {/* Right: Actions & User */}
                <div className="flex items-center gap-2 md:gap-3 shrink-0">
                    <div className="hidden sm:flex items-center gap-2 md:gap-3">
                        {rightActions}
                        {rightActions && <div className="h-6 w-px bg-slate-200 mx-1" />}
                    </div>

                    {/* Global Language Switcher */}
                    <div className="hidden sm:flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200" role="group" aria-label="Chọn ngôn ngữ">
                        <button
                            onClick={() => {
                                setLocale('vi');
                                setStoredLocale('vi');
                                window.location.reload();
                            }}
                            className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${locale === 'vi' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                            aria-label="Tiếng Việt"
                            aria-pressed={locale === 'vi'}
                        >
                            VI
                        </button>
                        <button
                            onClick={() => {
                                setLocale('en');
                                setStoredLocale('en');
                                window.location.reload();
                            }}
                            className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${locale === 'en' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                            aria-label="English"
                            aria-pressed={locale === 'en'}
                        >
                            EN
                        </button>
                    </div>

                    <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

                    {/* Auth links removed for free access mode */}


                    {/* Mobile Menu Toggle */}
                    <button 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 text-slate-600 hover:text-slate-900 md:hidden bg-slate-50 rounded-lg"
                        aria-label={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
                        aria-expanded={isMobileMenuOpen}
                        aria-controls="mobile-nav"
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Drawer */}
            {isMobileMenuOpen && (
                <div id="mobile-nav" className="md:hidden border-t border-slate-100 bg-white p-4 space-y-2 animate-in slide-in-from-top duration-300" role="navigation" aria-label="Menu di động">
                    <div className="flex flex-col gap-1 pb-4 border-b border-slate-50">
                        <Link 
                            href="/analyze" 
                            className="flex items-center gap-3 p-3 rounded-xl text-slate-700 font-bold hover:bg-slate-50 active:bg-indigo-50 active:text-indigo-600"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <BarChart3 className="w-5 h-5 text-indigo-500" />
                            {t(locale, 'nav.analyze1')}
                        </Link>
                        <Link 
                            href="/scales" 
                            className="flex items-center gap-3 p-3 rounded-xl text-slate-700 font-bold hover:bg-slate-50 active:bg-indigo-50 active:text-indigo-600"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <Layout className="w-5 h-5 text-indigo-500" />
                            {t(locale, 'nav.academic_scales')}
                        </Link>
                        <Link 
                            href="/knowledge/what-is-a-research-model" 
                            className="flex items-center gap-3 p-3 rounded-xl text-slate-700 font-bold hover:bg-slate-50 active:bg-indigo-50 active:text-indigo-600"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <Network className="w-5 h-5 text-indigo-500" />
                            {t(locale, 'nav.research_models')}
                        </Link>
                        <Link 
                            href="/cite-check" 
                            className="flex items-center gap-3 p-3 rounded-xl text-slate-700 font-bold hover:bg-slate-50 active:bg-indigo-50 active:text-indigo-600"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <ClipboardCheck className="w-5 h-5 text-indigo-500" />
                            {t(locale, 'nav.cite_check')}
                        </Link>
                        <Link 
                            href="/knowledge" 
                            className="flex items-center gap-3 p-3 rounded-xl text-slate-700 font-bold hover:bg-slate-50 active:bg-indigo-50 active:text-indigo-600"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <Brain className="w-5 h-5 text-indigo-500" />
                            {t(locale, 'nav.knowledge_hub')}
                        </Link>
                    </div>
                    
                    {/* Mobile login removed */}
                    
                    <div className="flex items-center justify-between pt-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ngôn ngữ / Language</span>
                        <LanguageSwitcher />
                    </div>
                </div>
            )}
        </header>
    )
}

export default function Header(props: HeaderProps) {
    return (
        <Suspense fallback={<header className="bg-white/80 h-16 w-full animate-pulse border-b border-slate-100"></header>}>
            <HeaderContent {...props} />
        </Suspense>
    )
}

function NavLink({ href, active, children }: { href: string, active?: boolean, children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${active
                ? 'text-indigo-600 bg-indigo-50/80'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
        >
            {children}
            {active && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-600 rounded-full" />
            )}
        </Link>
    )
}

function NavDropdown({ label, active, icon: Icon, children }: { label: string, active?: boolean, icon: any, children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setIsOpen(true)
    }

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => setIsOpen(false), 150)
    }

    return (
        <div 
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${active
                    ? 'text-indigo-600 bg-indigo-50/80'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
            >
                {label}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'opacity-40'}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {children}
                </div>
            )}
        </div>
    )
}

function NavDropdownItem({ href, active, label, icon: Icon }: { href: string, active?: boolean, label: string, icon: any }) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${active
                ? 'text-indigo-600 bg-indigo-50 font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
        >
            {label}
        </Link>
    )
}
