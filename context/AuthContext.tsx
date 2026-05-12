'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { getSupabase } from '@/utils/supabase/client';
import { getORCIDUser, clearORCIDUser } from '@/utils/cookie-helper';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

export interface Profile {
    id: string;
    full_name: string | null;
    email: string | null;
    orcid_id: string | null;
    tokens: number;
    avatar_url: string | null;
    role: string;
    [key: string]: any;
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    isAdmin: boolean;
    isOrcidUser: boolean;
    refreshProfile: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    isAdmin: false,
    isOrcidUser: false,
    refreshProfile: async () => { },
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    // Auth system disabled - providing guest session
    const [user, setUser] = useState<User | null>({ id: 'guest-user', email: 'guest@ncsstat.org' } as any);
    const [profile, setProfile] = useState<Profile | null>({
        id: 'guest-user',
        full_name: 'Khách (Guest)',
        email: 'guest@ncsstat.org',
        role: 'user',
        tokens: 999999, // Unlimited tokens for free access
        avatar_url: null
    } as any);
    const [loading, setLoading] = useState(false);

    const refreshProfile = useCallback(async () => {
        // No-op in guest mode
    }, []);

    const signOut = useCallback(async () => {
        // In guest mode, sign out just clears nothing or redirects to home
        window.location.href = '/';
    }, []);

    const value = useMemo(() => ({
        user,
        profile,
        loading,
        isAdmin: true, // Allow admin features in free mode if needed
        isOrcidUser: false,
        refreshProfile,
        signOut,
    }), [user, profile, loading, signOut, refreshProfile]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

