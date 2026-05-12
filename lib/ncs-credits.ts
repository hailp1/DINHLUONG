/**
 * NCS Credits Management Library
 * Handles credit balance checks, deductions, and configuration
 */

import { getSupabase } from '@/utils/supabase/client';

// Cache for analysis costs (avoid excessive DB calls)
let costCache: { data: Record<string, number>; expiresAt: number } | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Analysis types and their display names
 */
export const ANALYSIS_TYPES = {
    descriptive: 'Thá»‘ng kÃª mÃ´ táº£',
    cronbach: "Cronbach's Alpha",
    correlation: 'TÆ°Æ¡ng quan',
    ttest: 'T-Test',
    'ttest-indep': 'Independent T-Test',
    'ttest-paired': 'Paired T-Test',
    anova: 'ANOVA',
    efa: 'EFA',
    cfa: 'CFA',
    sem: 'SEM',
    regression: 'Há»“i quy',
    chisquare: 'Chi-Square',
    'mann-whitney': 'Mann-Whitney U',
    'kruskal-wallis': 'Kruskal-Wallis',
    'wilcoxon': 'Wilcoxon Signed Rank',
    ai_explain: 'AI Giáº£i thÃ­ch',
    export_pdf: 'Xuáº¥t PDF'
} as const;

export type AnalysisType = keyof typeof ANALYSIS_TYPES;

/**
 * Get analysis costs from database (with caching)
 */
export async function getAnalysisCosts(): Promise<Record<string, number>> {
    // Check cache first
    if (costCache && Date.now() < costCache.expiresAt) {
        return costCache.data;
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'analysis_costs')
        .maybeSingle() as any;

    if (error || !data) {
        console.warn('Failed to fetch analysis costs, using defaults');
        return getDefaultCosts();
    }

    const costs = typeof data.value === 'string'
        ? JSON.parse(data.value)
        : data.value;

    // Update cache
    costCache = {
        data: costs,
        expiresAt: Date.now() + CACHE_TTL
    };

    return costs;
}

/**
 * Get cost for a specific analysis type
 */
export async function getAnalysisCost(analysisType: string): Promise<number> {
    const costs = await getAnalysisCosts();
    return costs[analysisType] ?? 0;
}

/**
 * Get default NCS balance for new users
 */
export async function getDefaultBalance(): Promise<number> {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'default_ncs_balance')
        .maybeSingle() as any;

    if (error || !data) {
        console.warn('Failed to fetch default balance, using 100000');
        return 100000;
    }

    return typeof data.value === 'number'
        ? data.value
        : parseInt(data.value as string) || 100000;
}

/**
 * Check if user has enough creexport async function checkBalance(userId: string, cost: number): Promise<{
    hasEnough: boolean;
    currentBalance: number;
    required: number;
    isExempt?: boolean;
}> {
    // Credit check disabled - everyone has enough
    return {
        hasEnough: true,
        currentBalance: 999999,
        required: cost,
        isExempt: true
    };
}

/**
 * Deduct credits from user balance
 * Returns true if successful, false if insufficient funds or error
 */
export async function deductCredits(
    userId: string,
    amount: number,
    reason: string,
    analysisType?: string
): Promise<{ success: boolean; newBalance: number; error?: string; isExempt?: boolean }> {
    // Credit deduction disabled - always successful
    return { success: true, newBalance: 999999, isExempt: true };
}

/**
 * Get user's current NCS balance
 */
export async function getUserBalance(userId: string): Promise<number> {
    return 999999;
}

/**
 * Update analysis costs (admin only)
 */
export async function updateAnalysisCosts(costs: Record<string, number>): Promise<boolean> {
    return true;
}

/**
 * Update default balance (admin only)
 */
export async function updateDefaultBalance(balance: number): Promise<boolean> {
    return true;
}

/**
 * Default costs (fallback if DB fails)
 */
function getDefaultCosts(): Record<string, number> {
    return {
        descriptive: 0,
        cronbach: 0,
        omega: 0,
        correlation: 0,
        ttest: 0,
        'ttest-indep': 0,
        'ttest-paired': 0,
        anova: 0,
        efa: 0,
        cfa: 0,
        sem: 0,
        regression: 0,
        chisquare: 0,
        'mann-whitney': 0,
        'kruskal-wallis': 0,
        'wilcoxon': 0,
        ai_explain: 0,
        export_pdf: 0
    };
}

/**
 * Clear cost cache (call when admin updates costs)
 */
export function clearCostCache(): void {
    costCache = null;
}

/**
 * Get referral reward amount from database
 */
export async function getReferralReward(): Promise<number> {
    return 0;
}

/**
 * Update referral reward amount (admin only)
 */
export async function updateReferralReward(amount: number): Promise<boolean> {
    return true;
}

/**
 * Atomic credit deduction via Supabase RPC.
 */
export async function deductCreditsAtomic(
    userId: string,
    amount: number,
    reason: string
): Promise<{ success: boolean; newBalance: number; isExempt?: boolean; error?: string }> {
    // Atomic credit deduction disabled - always successful
    return { success: true, newBalance: 999999, isExempt: true };
}
