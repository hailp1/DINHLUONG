'use client';

// Prevent prerendering - this page requires client-side Supabase
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileUpload } from '@/components/FileUpload';
import { DataProfiler } from '@/components/DataProfiler';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { SmartGroupSelector, VariableSelector, AISettings } from '@/components/VariableSelector';
import { profileData, DataProfile } from '@/lib/data-profiler';
import { runCorrelation, runDescriptiveStats, initWebR, getWebRStatus, setProgressCallback } from '@/lib/webr-wrapper';
import {
    runTTestIndependent,
    runTTestPaired,
    runOneWayANOVA,
    runMannWhitneyU,
    runKruskalWallis,
    runWilcoxonSignedRank,
    runChiSquare,
} from '@/lib/webr-wrapper';
import { BarChart3, FileText, Shield, Trash2, Eye, EyeOff, Wifi, WifiOff, RotateCcw, XCircle } from 'lucide-react';
import { Toast } from '@/components/ui/Toast';
import { WebRStatus } from '@/components/WebRStatus';
import { WebRLoadingProgress } from '@/components/WebRLoadingProgress';
import { AnalysisSelector } from '@/components/AnalysisSelector';
import { useAnalysisSession } from '@/hooks/useAnalysisSession';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { AnalysisStep } from '@/types/analysis';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { Badge } from '@/components/ui/Badge';
import { RegressionView } from '@/components/analyze/views/RegressionView';
import { MediationView } from '@/components/analyze/views/MediationView';
import { MultivariateView } from '@/components/analyze/views/MultivariateView';
import { ReliabilityView } from '@/components/analyze/views/ReliabilityView';
import { BasicStatsView } from '@/components/analyze/views/BasicStatsView';
import type { PreviousAnalysisData } from '@/types/analysis';
import { DemographicSurvey } from '@/components/feedback/DemographicSurvey';
import { ApplicabilitySurvey } from '@/components/feedback/ApplicabilitySurvey';
import { FeedbackService } from '@/lib/feedback-service';
import { getSupabase } from '@/utils/supabase/client';
import Header from '@/components/layout/Header'
import AnalysisToolbar from '@/components/analyze/AnalysisToolbar';
import SaveProjectModal from '@/components/analyze/SaveProjectModal';
import Footer from '@/components/layout/Footer';
import { getAnalysisCost, checkBalance, deductCreditsAtomic, getUserBalance } from '@/lib/ncs-credits';
import { logAnalysisUsage, logExport } from '@/lib/activity-logger';
import { InsufficientCreditsModal } from '@/components/InsufficientCreditsModal';
import { NcsBalanceBadge } from '@/components/NcsBalanceBadge';
import { MobileWebRFallback, useSharedArrayBufferSupport } from '@/components/MobileWebRFallback';
import { getORCIDUser } from '@/utils/cookie-helper';
import { useAuth } from '@/context/AuthContext';
import { useAnalysisPersistence } from '@/hooks/useAnalysisPersistence';
import { useAutoSave } from '@/hooks/useAutoSave';
import { Locale, t, getStoredLocale } from '@/lib/i18n';

export default function AnalyzePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-900 border-t-transparent shadow-sm"></div>
        </div>}>
            <AnalyzeContent />
        </Suspense>
    );
}

function AnalyzeContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const mode = searchParams.get('mode')
    const { user, profile: userProfile, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [isClient, setIsClient] = useState(false);
    const supabase = getSupabase();

    useEffect(() => {
        setIsClient(true);
    }, []);
    const [locale, setLocale] = useState<Locale>('vi');
    const isVi = locale === 'vi';

    // Aggressive Cache Buster - Forces reload if version mismatch
    useEffect(() => {
        const CURRENT_DEPLOY_VERSION = "20260425_1557"; // Updated on each major fix
        const savedVersion = localStorage.getItem('ncs_deploy_version');
        
        if (savedVersion && savedVersion !== CURRENT_DEPLOY_VERSION) {
            console.log('[CacheBuster] New version detected, clearing site data and reloading...');
            localStorage.setItem('ncs_deploy_version', CURRENT_DEPLOY_VERSION);
            
            // Clear only essential caches to force re-fetch from server
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    for (let registration of registrations) registration.unregister();
                });
            }
            
            // Hard reload
            window.location.reload();
        } else {
            localStorage.setItem('ncs_deploy_version', CURRENT_DEPLOY_VERSION);
        }
    }, []);

    // Sync locale with storage
    useEffect(() => {
        setLocale(getStoredLocale());
    }, []);

    // Synchronize balance with profile tokens
    useEffect(() => {
        if (userProfile?.tokens !== undefined) {
            setNcsBalance(userProfile.tokens);
        }
    }, [userProfile?.tokens]);

    // Auth guard disabled - allowing free access
    useEffect(() => {
        setLoading(false);
    }, []);

    // Session State Management
    const {
        isPrivateMode, setIsPrivateMode,
        clearSession,
        step, setStep,
        data, setData,
        filename, setFilename,
        profile, setProfile,
        analysisType, setAnalysisType,
        results, setResults,
        multipleResults, setMultipleResults,
        scaleName, setScaleName
    } = useAnalysisSession();


    // Local ephemeral state
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Feedback State
    const [showDemographics, setShowDemographics] = useState(false);
    const [showApplicability, setShowApplicability] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

    // Workflow Mode State
    const [previousAnalysis, setPreviousAnalysis] = useState<PreviousAnalysisData | null>(null);

    // Online/Offline detection
    const { isOnline, wasOffline } = useOnlineStatus();

    // Progress tracking
    const [analysisProgress, setAnalysisProgress] = useState(0);

    // NCS Credit System State
    const [ncsBalance, setNcsBalance] = useState<number>(0);
    const [showInsufficientCredits, setShowInsufficientCredits] = useState(false);
    const [requiredCredits, setRequiredCredits] = useState(0);
    const [currentAnalysisCost, setCurrentAnalysisCost] = useState(0);

    // Auto-Save / Persistence Hook
    const { saveWorkspace, loadWorkspace, hasSavedData, clearWorkspace } = useAnalysisPersistence();
    const [showRestoreBanner, setShowRestoreBanner] = useState(false);
    const [authTimeout, setAuthTimeout] = useState(false);

    // Safety Timeout for Auth hangs
    useEffect(() => {
        if (loading) {
            const timer = setTimeout(() => {
                setAuthTimeout(true);
            }, 8000); // 8 seconds is plenty for exchange
            return () => clearTimeout(timer);
        } else {
            setAuthTimeout(false);
        }
    }, [loading]);

    // Check availability of saved data on mount
    // Safety check: if step requires data/profile but they are missing, redirect
    useEffect(() => {
        if (loading) return; // Wait until auth loading completes

        // If data is lost, always go back to upload
        if (data.length === 0 && step !== 'upload') {
            setStep('upload');
            return;
        }

        // If at profile step but no profile exists, try to recreate it or go back
        if (step === 'profile' && !profile && data.length > 0) {
            const prof = profileData(data);
            if (prof) {
                setProfile(prof);
            } else {
                setStep('upload');
            }
        }
    }, [step, data.length, profile, loading, setStep, setProfile]);

    useEffect(() => {
        if (hasSavedData && data.length === 0) {
            setShowRestoreBanner(true);
        } else {
            setShowRestoreBanner(false);
        }
    }, [hasSavedData, data.length]);

    // Auto-Save Effect — true debounce: fires 60s after the LAST change, not reset on every keystroke
    useAutoSave(
        () => {
            if (data.length === 0) return;
            saveWorkspace({
                data,
                columns: getNumericColumns(),
                fileName: filename,
                currentStep: step,
                results,
                analysisType,
            });
            if (process.env.NODE_ENV !== 'production') {
                console.log('✅ Auto-saved workspace at', new Date().toLocaleTimeString());
            }
        },
        [data, step, results, analysisType, filename],
        { delay: 60000, enabled: data.length > 0 && !isPrivateMode }
    );

    // Save before page unload (critical data protection)
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (data.length > 0) {
                saveWorkspace({
                    data,
                    columns: getNumericColumns(),
                    fileName: filename,
                    currentStep: step,
                    results,
                    analysisType,
                });
                console.log('✅ Saved workspace before page unload');
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [data, step, results, analysisType, filename, saveWorkspace]);

    // Handle Restoration
    const handleRestore = async () => {
        const saved = await loadWorkspace();
        if (saved) {
            setData(saved.data);
            setFilename(saved.fileName);
            // Re-profile data to ensure consistency
            const prof = profileData(saved.data);
            setProfile(prof);

            setStep(saved.currentStep);
            setResults(saved.results);
            setAnalysisType(saved.analysisType);
            showToast(t(locale, 'analyze.common.restored_success'), 'success');
            setShowRestoreBanner(false);
        }
    };

    const discardSaved = async () => {
        await clearWorkspace();
        setShowRestoreBanner(false);
        showToast(t(locale, 'analyze.common.data_cleared'), 'info');
    };

    // NOTE: previousAnalysis is React state only — sessionStorage removed to eliminate stale data from two sources of truth.

    // Handle online/offline events
    useEffect(() => {
        const handleOnline = () => {
            showToast(t(locale, 'analyze.common.internet_restored'), 'success');
        };

        const handleOffline = () => {
            showToast(t(locale, 'analyze.common.internet_lost'), 'error');
        };

        window.addEventListener('app:online', handleOnline);
        window.addEventListener('app:offline', handleOffline);

        return () => {
            window.removeEventListener('app:online', handleOnline);
            window.removeEventListener('app:offline', handleOffline);
        };
    }, []);

    // Auto-initialize WebR on page load (eager loading)
    useEffect(() => {
        const status = getWebRStatus();
        if (!status.isReady && !status.isLoading) {
            console.log('[WebR] Starting auto-initialization...');

            setProgressCallback((msg) => {
                const translatedMsg = msg.includes('Cleaning') ? t(locale, 'analyze.common.processing') : msg;
                setToast({ message: translatedMsg, type: 'info' });
            });

            initWebR()
                .then(() => {
                    console.log('[WebR] Auto-initialization successful');
                    setToast({ message: t(locale, 'analyze.common.engine_ready'), type: 'success' });
                })
                .catch(err => {
                    console.error('[WebR] Auto-initialization failed:', err);
                    setToast({ message: t(locale, 'analyze.common.engine_error'), type: 'error' });
                });
        }
    }, [locale]);

    // Check for Demographics Survey (Part 1)
    useEffect(() => {
        // Delay slightly to let page load
        const timer = setTimeout(() => {
            if (!FeedbackService.hasCompletedDemographics()) {
                setShowDemographics(true);
            }
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    // Additional check when entering analyze step
    useEffect(() => {
        if (step === 'analyze') {
            const status = getWebRStatus();
            if (!status.isReady && !status.isLoading) {
                setToast({ message: t(locale, 'analyze.common.engine_initializing'), type: 'info' });
                initWebR().then(() => {
                    setToast({ message: t(locale, 'analyze.common.engine_ready'), type: 'success' });
                }).catch(err => {
                    setToast({ message: `Lỗi khởi tạo: ${err.message || err}`, type: 'error' });
                });
            }
        }
    }, [step]);

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type });
        // Auto-dismiss after 5 seconds
        setTimeout(() => setToast(null), 5000);
    };

    const handleAnalysisError = (err: any) => {
        const msg = err.message || String(err);
        console.error("Analysis Error:", err);

        if (msg.includes('subscript out of bounds')) {
            showToast('Lỗi: Không tìm thấy dữ liệu biến (Kiểm tra tên cột).', 'error');
        } else if (msg.includes('singular matrix') || msg.includes('computational singular')) {
            showToast('Lỗi: Ma trận đặc dị (Có đa cộng tuyến hoàn hảo hoặc biến hằng số).', 'error');
        } else if (msg.includes('missing value') || msg.includes('NA/NaN')) {
            showToast('Lỗi: Dữ liệu chứa giá trị trống (NA). Đang thử dùng FIML, nhưng nếu vẫn lỗi hãy làm sạch dữ liệu.', 'error');
        } else if (msg.includes('model is not identified')) {
            showToast('Lỗi SEM/CFA: Mô hình không xác định (Not Identified). Kiểm tra lại số lượng biến quan sát (cần >= 3 biến/nhân tố) hoặc bậc tự do.', 'error');
        } else if (msg.includes('could not find function')) {
            showToast('Lỗi: Gói phân tích chưa tải xong. Vui lòng thử lại sau 5 giây.', 'error');
        } else if (msg.includes('covariance matrix is not positive definite')) {
            showToast('Lỗi: Ma trận hiệp phương sai không xác định dương (Not Positive Definite). Kiểm tra đa cộng tuyến hoặc kích thước mẫu quá nhỏ.', 'error');
        } else {
            // Translate common R errors if possible
            showToast(`Lỗi: ${msg.replace('Error in', '').substring(0, 100)}...`, 'error');
        }
    };

    // Workflow Mode Handlers (with batched updates)
    const handleProceedToEFA = (goodItems: string[]) => {
        // Batch state updates to reduce re-renders
        Promise.resolve().then(() => {
            setPreviousAnalysis({
                type: 'cronbach',
                variables: goodItems,
                goodItems,
                results: results?.data
            });
            setStep('efa-select');
            showToast(`Chuyển sang EFA với ${goodItems.length} items tốt`, 'success');
        });
    };

    const handleProceedToCFA = (factors: { name: string; indicators: string[] }[]) => {
        Promise.resolve().then(() => {
            setPreviousAnalysis({
                type: 'efa',
                variables: factors.flatMap(f => f.indicators),
                factors,
                results: results?.data
            });
            setStep('cfa-select');
            showToast(`Chuyển sang CFA với ${factors.length} factors`, 'success');
        });
    };

    const handleProceedToSEM = (factors: { name: string; indicators: string[] }[]) => {
        Promise.resolve().then(() => {
            setPreviousAnalysis({
                type: 'cfa',
                variables: factors.flatMap(f => f.indicators),
                factors,
                results: results?.data
            });
            setStep('sem-select');
            showToast(`Chuyển sang SEM với measurement model đã xác nhận`, 'success');
        });
    };

    const handleDataLoaded = (loadedData: any[], fname: string) => {
        // Validation: check file size
        if (loadedData.length > 50000) {
            showToast(t(locale, 'analyze.common.file_too_large'), 'error');
            return;
        }

        // Large data sampling (10k-50k rows)
        let processedData = loadedData;
        if (loadedData.length > 10000) {
            showToast(locale === 'vi' ? `Dữ liệu lớn (${loadedData.length} dòng). Đang lấy mẫu ngẫu nhiên 10,000 dòng...` : `Large dataset (${loadedData.length} rows). Randomly sampling 10,000 rows...`, 'info');
            // Random sampling
            const shuffled = [...loadedData].sort(() => 0.5 - Math.random());
            processedData = shuffled.slice(0, 10000);
            showToast(locale === 'vi' ? 'Đã lấy mẫu 10,000 dòng. Kết quả đại diện cho toàn bộ dữ liệu.' : 'Sampled 10,000 rows. Results represent the entire dataset.', 'success');
        }

        setData(processedData);
        setFilename(fname);

        // Profile the data
        const prof = profileData(processedData);
        setProfile(prof);
        setStep('profile');
    };

    const handleProceedToAnalysis = () => {
        setStep('analyze');
    };

    // Get numeric columns from profile
    const getNumericColumns = () => {
        if (!profile) return [];
        return Object.entries(profile.columnStats)
            .filter(([_, stats]) => stats.type === 'numeric')
            .map(([name, _]) => name);
    };

    // Get all column names from profile
    const getAllColumns = () => {
        if (!profile) return [];
        return Object.keys(profile.columnStats);
    };



    const runAnalysis = async (type: string) => {
        // CRITICAL: Block analysis if WebR is still initializing or installing packages
        // Running analysis during package installation causes FileReaderSync crash
        const webRStatus = getWebRStatus();
        if (!webRStatus.isReady) {
            if (webRStatus.isLoading) {
                showToast('R Engine đang khởi động, vui lòng đợi vài giây rồi thử lại.', 'info');
            } else {
                showToast('R Engine chưa sẵn sàng. Vui lòng đợi và thử lại.', 'info');
            }
            return;
        }

        setIsAnalyzing(true);
        setAnalysisType(type);
        let progressInterval: NodeJS.Timeout | undefined;
        // Declared outside try so catch block can access them for refund logic
        let analysisCost = 0;
        let creditDeducted = false;

        try {
            const numericColumns = getNumericColumns();

            if (numericColumns.length < 2) {
                showToast('Cần ít nhất 2 biến số để phân tích', 'error');
                setIsAnalyzing(false);
                return;
            }

            // --- NCS Credit: Check balance first, then deduct BEFORE running analysis ---
            // This prevents the race condition where analysis succeeds but deduction fails.
            // If analysis fails after deduction, we attempt a refund via a compensating credit.
            // --- NCS Credit: System Disabled for Free Access ---
            /*
            if (user) {
                analysisCost = await getAnalysisCost(type);
                const { hasEnough } = await checkBalance(user.id, analysisCost);
                if (!hasEnough) {
                    setRequiredCredits(analysisCost);
                    setCurrentAnalysisCost(analysisCost);
                    setShowInsufficientCredits(true);
                    setIsAnalyzing(false);
                    return;
                }
                // Deduct BEFORE running — atomic via RPC (falls back to non-atomic if RPC unavailable)
                if (analysisCost > 0) {
                    const description = type === 'correlation' ? 'Correlation Matrix' : 'Descriptive Statistics';
                    const { success, isExempt, newBalance, error: deductError } = await deductCreditsAtomic(user.id, analysisCost, description);
                    if (!success) {
                        showToast(deductError || 'Không đủ NCS để thực hiện phân tích', 'error');
                        setIsAnalyzing(false);
                        return;
                    }
                    creditDeducted = true;
                    if (!isExempt) setNcsBalance(newBalance);
                }
            }
            */

            setAnalysisProgress(0);

            // Progress simulation
            progressInterval = setInterval(() => {
                setAnalysisProgress(prev => Math.min(prev + 10, 90));
            }, 300);

            const numericData = data.map(row =>
                numericColumns.map(col => Number(row[col]) || 0)
            );

            let analysisResults: any;
            setAnalysisProgress(30);

            // Analysis types that run directly (no variable-selection UI needed)
            // Other types (ttest, anova, efa, etc.) are handled by their dedicated View components
            switch (type) {
                case 'correlation':
                    analysisResults = await runCorrelation(numericData);
                    break;

                case 'descriptive':
                    analysisResults = await runDescriptiveStats(numericData);
                    break;

                // --- Types that need variable selection — redirect to their step ---
                // These should normally be triggered via AnalysisSelector's action:'select',
                // but handle gracefully here in case of direct calls.
                case 'ttest':
                case 'ttest-indep':
                    clearInterval(progressInterval);
                    setIsAnalyzing(false);
                    setStep('ttest-select' as any);
                    return;
                case 'ttest-paired':
                    clearInterval(progressInterval);
                    setIsAnalyzing(false);
                    setStep('ttest-paired-select' as any);
                    return;
                case 'anova':
                    clearInterval(progressInterval);
                    setIsAnalyzing(false);
                    setStep('anova-select' as any);
                    return;
                case 'efa':
                    clearInterval(progressInterval);
                    setIsAnalyzing(false);
                    setStep('efa-select' as any);
                    return;
                case 'cfa':
                    clearInterval(progressInterval);
                    setIsAnalyzing(false);
                    setStep('cfa-select' as any);
                    return;
                case 'sem':
                    clearInterval(progressInterval);
                    setIsAnalyzing(false);
                    setStep('sem-select' as any);
                    return;
                case 'cronbach':
                    clearInterval(progressInterval);
                    setIsAnalyzing(false);
                    setStep('cronbach-select' as any);
                    return;
                case 'regression':
                    clearInterval(progressInterval);
                    setIsAnalyzing(false);
                    setStep('regression-select' as any);
                    return;
                case 'logistic':
                    clearInterval(progressInterval);
                    setIsAnalyzing(false);
                    setStep('logistic-select' as any);
                    return;
                case 'mediation':
                    clearInterval(progressInterval);
                    setIsAnalyzing(false);
                    setStep('mediation-select' as any);
                    return;
                case 'moderation':
                    clearInterval(progressInterval);
                    setIsAnalyzing(false);
                    setStep('moderation-select' as any);
                    return;
                case 'chisquare':
                case 'chisq':
                    clearInterval(progressInterval);
                    setIsAnalyzing(false);
                    setStep('chisq-select' as any);
                    return;
                case 'mann-whitney':
                    clearInterval(progressInterval);
                    setIsAnalyzing(false);
                    setStep('mannwhitney-select' as any);
                    return;
                case 'kruskal-wallis':
                    clearInterval(progressInterval);
                    setIsAnalyzing(false);
                    setStep('kruskalwallis-select' as any);
                    return;
                case 'wilcoxon':
                    clearInterval(progressInterval);
                    setIsAnalyzing(false);
                    setStep('wilcoxon-select' as any);
                    return;
                case 'cluster':
                    clearInterval(progressInterval);
                    setIsAnalyzing(false);
                    setStep('cluster-select' as any);
                    return;

                default:
                    // Unknown type — log and show user-friendly message instead of crashing
                    console.warn(`[runAnalysis] Unknown analysis type: "${type}". Redirecting to selector.`);
                    clearInterval(progressInterval);
                    setIsAnalyzing(false);
                    showToast(`Phương pháp "${type}" chưa được hỗ trợ trực tiếp. Vui lòng chọn lại.`, 'info');
                    setStep('analyze');
                    return;
            }

            clearInterval(progressInterval);
            setAnalysisProgress(100);

            // Credits already deducted before analysis — just log usage
            if (user && analysisCost > 0) {
                await logAnalysisUsage(user.id, type, analysisCost);
            }

            setResults({
                type,
                data: analysisResults,
                columns: numericColumns
            });
            setStep('results');
            showToast(t(locale, 'analyze.common.analysis_complete'), 'success');
        } catch (error) {
            if (progressInterval) clearInterval(progressInterval);
            // Refund credits if analysis failed after deduction
            if (user && analysisCost > 0 && creditDeducted) {
                try {
                    const supabase = (await import('@/utils/supabase/client')).getSupabase();
                    const { data: profile } = await supabase.from('profiles').select('tokens').eq('id', user.id).single();
                    if (profile) {
                        const refundedBalance = (profile.tokens || 0) + analysisCost;
                        await supabase.from('profiles').update({ tokens: refundedBalance, updated_at: new Date().toISOString() }).eq('id', user.id);
                        await supabase.from('token_transactions').insert({
                            user_id: user.id, amount: analysisCost, type: 'refund_analysis',
                            description: `Hoàn tiền: ${type} thất bại`, balance_after: refundedBalance
                        });
                        setNcsBalance(refundedBalance);
                        console.log(`[Credits] Refunded ${analysisCost} NCS after failed analysis`);
                    }
                } catch (refundErr) {
                    console.error('[Credits] Refund failed:', refundErr);
                }
            }
            handleAnalysisError(error);
        } finally {
            setIsAnalyzing(false);
            setAnalysisProgress(0);
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Ctrl+S: Export PDF
            if (e.ctrlKey && e.key === 's' && step === 'results' && results) {
                e.preventDefault();
                handleExportPDF();
                showToast('Đang xuất PDF... (Ctrl+S)', 'info');
            }

            // Ctrl+E: Export Excel (future feature)
            if (e.ctrlKey && e.key === 'e' && step === 'results' && results) {
                e.preventDefault();
                showToast('Excel export sẽ có trong phiên bản tiếp theo (Ctrl+E)', 'info');
            }

            // Ctrl+N: New analysis
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                setStep('upload');
                setData([]);
                setProfile(null);
                setResults(null);
                showToast('Bắt đầu phân tích mới (Ctrl+N)', 'success');
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [step, results]);

    // Handle PDF Export (Actual Logic)
    const runExportPDF = async () => {
        try {
            const { exportToPDF } = await import('@/lib/pdf-exporter');

            showToast('Đang tạo PDF, vui lòng đợi...', 'info');

            // Capture charts if any
            const chartImages: string[] = [];
            const container = document.getElementById('analysis-results-container');
            if (container) {
                const canvases = container.querySelectorAll('canvas');
                canvases.forEach(canvas => {
                    try {
                        chartImages.push(canvas.toDataURL('image/png'));
                    } catch (e) {
                        console.warn('Canvas capture failed:', e);
                    }
                });
            }

            // Handle batch Cronbach/Omega export - SINGLE FILE with all scales
            if ((analysisType === 'cronbach-batch' || analysisType === 'omega-batch') && multipleResults.length > 0) {
                const isOmegaBatch = analysisType === 'omega-batch';
                // Combine all results into single PDF
                const combinedTitle = isOmegaBatch
                    ? `McDonald's Omega - Phân tích ${multipleResults.length} thang đo`
                    : `Cronbach's Alpha - Phân tích ${multipleResults.length} thang đo`;
                const combinedResults = {
                    batchResults: multipleResults.map(r => ({
                        scaleName: r.scaleName,
                        alpha: r.data.alpha || r.data.rawAlpha,
                        rawAlpha: r.data.rawAlpha,
                        omega: r.data.omega,
                        standardizedAlpha: r.data.standardizedAlpha,
                        nItems: r.data.nItems,
                        itemTotalStats: r.data.itemTotalStats,
                        columns: r.columns
                    }))
                };

                const name = userProfile?.full_name || user?.email?.split('@')[0] || 'Researcher';
                await exportToPDF({
                    title: combinedTitle,
                    analysisType: analysisType,
                    results: combinedResults,
                    columns: [],
                    userName: name,
                    chartImages: []
                });
                if (user) {
                    await logExport(user.id, `PDF: ${analysisType}`);
                }
                showToast(`Đã xuất 1 file PDF tổng hợp ${multipleResults.length} thang đo!`, 'success');
            } else {
                // Single result export
                const name = userProfile?.full_name || user?.email?.split('@')[0] || 'Researcher';
                await exportToPDF({
                    title: `Phân tích ${analysisType}`,
                    analysisType,
                    results: results?.data || results,
                    columns: results?.columns || [],
                    userName: name,
                    chartImages
                });
                if (user) {
                    await logExport(user.id, `PDF: ${analysisType}`);
                }
                showToast('Đã xuất PDF thành công!', 'success');
            }
        } catch (error) {
            console.error(error);
            showToast('Lỗi xuất PDF: Vui lòng thử lại', 'error');
        }
    };

    // Trigger Export Flow (Check for Part 3)
    const handleExportPDF = () => {
        // Always show survey if not done? Or just export?
        // User requested: Part 3 appears when User clicks Export.
        // We'll show it if not done yet.
        /*
        // UNCOMMENT TO FORCE SURVEY EVERY TIME:
        setShowApplicability(true);
        */

        // Logic: Check if survey done. If not, show survey. If yes, just export.
        // But user might want to give feedback on THIS specific manuscript (Q8).
        // So we should probably show it, but maybe allow skipping?
        // For now, consistent with prompt "Part 3 appears..." -> We show it.
        setShowApplicability(true);
    };

    // Map steps for StepIndicator
    const getStepId = (): string => {
        if (step === 'upload') return 'upload';
        if (step === 'profile') return 'profile';
        if (step === 'results') return 'results';
        return 'analyze'; // All selection/analysis steps
    };

    const steps = [
        { id: 'upload', label: t(locale, 'analyze.steps.upload') },
        { id: 'profile', label: t(locale, 'analyze.steps.profile') },
        { id: 'analyze', label: t(locale, 'analyze.steps.analyze') },
        { id: 'results', label: t(locale, 'analyze.steps.results') }
    ];

    if (loading) {
        const webRStatus = getWebRStatus();
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                 <div className="flex flex-col items-center gap-6 max-w-sm text-center px-6">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-900 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-blue-900 animate-pulse" />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <p className="text-blue-950 font-black uppercase text-[10px] tracking-[0.3em] animate-pulse">
                            {t(locale, 'analyze.common.authenticating')}
                        </p>
                        {webRStatus.isReady && (
                            <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 animate-in fade-in zoom-in duration-500">
                                <span className="text-lg">✓</span> {t(locale, 'analyze.common.engine_ready')}
                            </div>
                        )}
                    </div>

                    {authTimeout && (
                        <div className="pt-6 animate-in slide-in-from-bottom-4 duration-700">
                            <p className="text-xs text-slate-500 font-medium mb-4">
                                {isVi ? 'Quá trình xác thực mất nhiều thời gian hơn dự kiến...' : 'Authentication is taking longer than expected...'}
                            </p>
                            <div className="flex flex-col gap-2 w-full">
                                <button 
                                    onClick={() => window.location.reload()}
                                    className="px-6 py-3 bg-white border border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                                >
                                    {isVi ? 'Tải lại trang' : 'Refresh Page'}
                                </button>
                                <button 
                                    onClick={() => router.push('/login')}
                                    className="px-6 py-3 bg-blue-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-950 transition-all shadow-lg"
                                >
                                    {isVi ? 'Quay lại Đăng nhập' : 'Back to Login'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (!isClient) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                 <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
            {/* Toast Notification */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Mobile WebR Fallback Warning */}
            <MobileWebRFallback />

            {/* Offline Warning Banner */}
            {!isOnline && (
                <div className="fixed top-0 left-0 right-0 bg-red-600 text-white py-2 px-4 text-center z-50 flex items-center justify-center gap-2">
                    <WifiOff className="w-5 h-5" />
                    <span className="font-semibold">{locale === 'vi' ? 'Không có kết nối Internet. Một số tính năng có thể không hoạt động.' : 'No Internet connection. Some features may not work.'}</span>
                </div>
            )}

            {/* Analysis Progress Bar */}
            {isAnalyzing && analysisProgress > 0 && (
                <div className="fixed top-0 left-0 right-0 z-40">
                     <div className="h-1 bg-blue-100">
                        <div
                            className="h-full bg-blue-900 transition-all duration-300 shadow-[0_0_10px_rgba(30,58,138,0.5)]"
                            style={{ width: `${analysisProgress}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-3" />

            {showRestoreBanner && (
                 <div className="bg-amber-50 border-b border-amber-200 py-3 relative z-30">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <RotateCcw className="w-5 h-5 text-amber-600" />
                            <p className="text-sm text-amber-800">
                                <span className="font-bold">{t(locale, 'analyze.common.restored_session')}</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleRestore}
                                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                            >
                                {t(locale, 'analyze.common.restore_now')}
                            </button>
                            <button
                                onClick={discardSaved}
                                className="px-3 py-1.5 text-amber-700 hover:bg-amber-100 text-sm font-medium rounded-lg transition-colors"
                            >
                                {t(locale, 'analyze.common.discard_session')}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Header */}
            <div>
                <Header
                    user={user}
                    profile={userProfile}
                    hideNav={false}
                />
            </div>

            {/* Dedicated Analysis Control Bar - Sits below Header */}
            <div className={`sticky top-16 z-30 bg-blue-900 border-b border-blue-800 py-2 md:py-3 shadow-xl transition-all`}>
                <div className="container mx-auto px-4 md:px-6 flex items-center justify-between gap-2 md:gap-4">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="flex items-center gap-2 pr-2 md:pr-4 border-r border-blue-800">
                            <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                            <span className="font-black text-[9px] md:text-[10px] text-white uppercase tracking-widest hidden sm:inline">
                                Academic Engine
                            </span>
                        </div>
                        {filename && (
                            <div className="hidden sm:flex items-center gap-2 px-2 md:px-3 py-1 bg-blue-950 rounded-lg text-blue-300 text-[10px] font-bold uppercase tracking-tighter max-w-[80px] md:max-w-[150px] truncate border border-blue-800">
                                <FileText className="w-3 h-3" /> {filename}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <AnalysisToolbar
                            isPrivateMode={isPrivateMode}
                            setIsPrivateMode={setIsPrivateMode}
                            clearSession={() => {
                                clearSession();
                                showToast(isVi ? 'Đã dọn dẹp phiên làm việc' : 'Session cleared', 'info');
                            }}
                            filename={filename}
                            onSave={() => setIsSaveModalOpen(true)}
                            locale={locale}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-blue-50/50 border-b border-blue-100 py-1">
                <div className="container mx-auto px-6 flex items-center justify-center gap-2 text-[11px] text-blue-600/80">
                    <Shield className="w-3 h-3" />
                    <span className="font-semibold">{t(locale, 'analyze.common.security_label')}:</span>
                    <span>{t(locale, 'analyze.common.security')}</span>
                </div>
            </div>

            {/* Progress Steps - Scrollable on Mobile */}
            <div className="container mx-auto px-2 md:px-6 py-4 md:py-8 overflow-x-auto no-scrollbar">
                <div className="flex items-center justify-center gap-2 md:gap-4 mb-2 md:mb-8 min-w-max px-4">
                    {['upload', 'profile', 'analyze', 'results'].map((s, idx) => {
                        const stepOrder = ['upload', 'profile', 'analyze', 'results'];

                        // Map sub-steps to their main steps for UI consistency
                        const getMainStep = (current: string) => {
                            if (stepOrder.includes(current)) return current;
                            if (current.endsWith('-select')) return 'analyze';
                            return current;
                        };

                        const effectiveStep = getMainStep(step);
                        const currentIdx = stepOrder.indexOf(effectiveStep);
                        const isCompleted = currentIdx > idx;
                        const isCurrent = effectiveStep === s;
                        const isClickable = isCompleted || isCurrent;

                        return (
                            <div key={s} className="flex items-center">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isClickable) {
                                            if (s === 'analyze' && step.endsWith('-select')) {
                                                setStep('analyze'); // Go back to selector
                                            } else {
                                                setStep(s as AnalysisStep);
                                            }
                                        }
                                    }}
                                    disabled={!isClickable}
                                    className={`
                                        w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black text-[10px] md:text-xs transition-all shadow-sm
                                        ${isCurrent ? 'bg-blue-900 text-white ring-4 ring-blue-100 scale-110' :
                                            isCompleted ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-110' :
                                                'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'}
                                        ${isClickable ? 'cursor-pointer hover:shadow-xl' : ''}
                                    `}
                                    title={isClickable ? `${t(locale, 'analyze.common.back')}: ${steps.find(st => st.id === s)?.label || s}` : undefined}
                                >
                                    {idx + 1}
                                </button>
                                {idx < 3 && (
                                    <div className={`w-8 md:w-16 h-1 rounded-full transition-colors ${currentIdx > idx ?
                                        'bg-blue-600' : 'bg-slate-200'
                                        }`} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="py-8">

                    {step === 'upload' && (
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                                    {t(locale, 'analyze.upload.title')}
                                </h2>
                                <p className="text-gray-600">
                                    {t(locale, 'analyze.upload.desc')}
                                </p>
                            </div>
                            <FileUpload onDataLoaded={handleDataLoaded} locale={locale} />
                        </div>
                    )}

                    {step === 'profile' && profile && (
                        <div className="space-y-6">
                            <div className="text-center mb-10">
                                <h2 className="text-4xl font-black text-blue-900 mb-3 uppercase tracking-tight">
                                    {t(locale, 'analyze.profile.title')}
                                </h2>
                                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest opacity-80">
                                    {t(locale, 'analyze.profile.desc')}
                                </p>
                            </div>
                            <DataProfiler profile={profile} onProceed={handleProceedToAnalysis} locale={locale} />
                        </div>
                    )}

                    {step === 'analyze' && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div className="text-center mb-10">
                                <h2 className="text-4xl font-black text-blue-900 mb-3 uppercase tracking-tight">
                                    {t(locale, 'analyze.selector.title')}
                                </h2>
                                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest opacity-80">
                                    {t(locale, 'analyze.selector.desc')}
                                </p>
                            </div>

                            {/* WebR Loading Progress — shown while R engine is initializing */}
                            <WebRLoadingProgress compact={false} hideWhenReady={true} />

                            <AnalysisSelector
                                onSelect={(s) => setStep(s as AnalysisStep)}
                                onRunAnalysis={runAnalysis}
                                isAnalyzing={isAnalyzing}
                                mode={mode}
                                locale={locale}
                            />

                            {isAnalyzing && (
                                <div className="text-center py-8">
                                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                                    <p className="mt-4 text-gray-600">{t(locale, 'analyze.common.analyzing')}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Basic Analysis Forms (Descriptive, T-Test, ANOVA, Chi-Square, Non-Parametric) */}
                    {['descriptive-select', 'ttest-select', 'ttest-paired-select', 'anova-select', 'chisq-select', 'fisher-select', 'mannwhitney-select', 'kruskalwallis-select', 'wilcoxon-select'].includes(step) && (
                        <BasicStatsView
                            step={step}
                            data={data}
                            columns={getNumericColumns()}
                            allColumns={getAllColumns()}
                            profile={profile}
                            user={user}
                            setResults={setResults}
                            setStep={setStep}
                            setNcsBalance={setNcsBalance}
                            showToast={showToast}
                            setAnalysisType={setAnalysisType}
                            setRequiredCredits={setRequiredCredits}
                            setCurrentAnalysisCost={setCurrentAnalysisCost}
                            setShowInsufficientCredits={setShowInsufficientCredits}
                            locale={locale}
                        />
                    )}

                    {/* Multivariate Analysis (Cluster & Two-Way ANOVA) */}
                    {['cluster-select', 'twoway-anova-select'].includes(step) && (
                        <MultivariateView
                            step={step}
                            data={data}
                            columns={getNumericColumns()} // For Cluster (numeric)
                            allColumns={getAllColumns()} // For Two-Way ANOVA (factors)
                            profile={profile}
                            user={user}
                            setResults={setResults}
                            setStep={setStep}
                            setNcsBalance={setNcsBalance}
                            showToast={showToast}
                            setAnalysisType={setAnalysisType}
                            setRequiredCredits={setRequiredCredits}
                            setCurrentAnalysisCost={setCurrentAnalysisCost}
                            setShowInsufficientCredits={setShowInsufficientCredits}
                            locale={locale}
                        />
                    )}

                    {/* Mediation & Moderation Analysis */}
                    {['mediation-select', 'moderation-select'].includes(step) && (
                        <MediationView
                            step={step}
                            data={data}
                            columns={getNumericColumns()}
                            user={user}
                            setResults={setResults}
                            setStep={setStep}
                            setNcsBalance={setNcsBalance}
                            showToast={showToast}
                            setAnalysisType={setAnalysisType}
                            setRequiredCredits={setRequiredCredits}
                            setCurrentAnalysisCost={setCurrentAnalysisCost}
                            setShowInsufficientCredits={setShowInsufficientCredits}
                            locale={locale}
                        />
                    )}

                    {/* Reliability & Factor Analysis */}
                    {['cronbach-select', 'cronbach-batch-select', 'omega-select', 'efa-select', 'cfa-select', 'sem-select', 'pls-sem-select'].includes(step) && (
                        <ReliabilityView
                            step={step}
                            data={data}
                            columns={getNumericColumns()}
                            user={user}
                            setResults={setResults}
                            setStep={setStep}
                            setNcsBalance={setNcsBalance}
                            showToast={showToast}
                            setScaleName={setScaleName}
                            setMultipleResults={setMultipleResults}
                            setAnalysisType={setAnalysisType}
                            setRequiredCredits={setRequiredCredits}
                            setCurrentAnalysisCost={setCurrentAnalysisCost}
                            setShowInsufficientCredits={setShowInsufficientCredits}
                            locale={locale}
                        />
                    )}

                    {/* Regression Analysis */}
                    {['regression-select', 'logistic-select'].includes(step) && (
                        <RegressionView
                            step={step}
                            data={data}
                            columns={getNumericColumns()}
                            user={user}
                            setResults={setResults}
                            setStep={setStep}
                            setNcsBalance={setNcsBalance}
                            showToast={showToast}
                            setAnalysisType={setAnalysisType}
                            setRequiredCredits={setRequiredCredits}
                            setCurrentAnalysisCost={setCurrentAnalysisCost}
                            setShowInsufficientCredits={setShowInsufficientCredits}
                            locale={locale}
                        />
                    )}







                    {step === 'results' && (results || multipleResults.length > 0) && (

                        <div className="max-w-6xl mx-auto space-y-8" id="results-container">
                            <div className="text-center mb-10">
                                <h1 className="text-4xl font-black text-blue-900 mb-3 uppercase tracking-tight">
                                    {t(locale, 'analyze.results.title')}
                                </h1>
                                <p className="text-sm font-bold text-blue-600 uppercase tracking-widest bg-blue-50/50 inline-block px-4 py-1.5 rounded-full border border-blue-100">
                                    {analysisType === 'cronbach' && `Cronbach's Alpha${results?.scaleName ? ` - ${results.scaleName}` : ''}`}
                                    {analysisType === 'omega' && `McDonald's Omega${results?.scaleName ? ` - ${results.scaleName}` : ''}`}
                                    {analysisType === 'cronbach-batch' && `Cronbach's Alpha - ${multipleResults.length} ${locale === 'vi' ? 'thang đo' : 'scales'}`}
                                    {analysisType === 'omega-batch' && `McDonald's Omega - ${multipleResults.length} ${locale === 'vi' ? 'thang đo' : 'scales'}`}
                                    {analysisType === 'correlation' && (locale === 'vi' ? "Ma trận tương quan" : "Correlation Matrix")}
                                    {analysisType === 'descriptive' && (locale === 'vi' ? "Thống kê mô tả" : "Descriptive Statistics")}
                                    {analysisType === 'ttest' && "Independent Samples T-test"}
                                    {analysisType === 'ttest-paired' && "Paired Samples T-test"}
                                    {analysisType === 'anova' && "One-Way ANOVA"}
                                    {analysisType === 'efa' && "Exploratory Factor Analysis"}
                                    {analysisType === 'regression' && "Multiple Linear Regression"}
                                    {analysisType === 'logistic' && "Logistic Regression"}
                                    {analysisType === 'twoway-anova' && "Two-Way ANOVA"}
                                    {analysisType === 'mediation' && "Mediation Analysis"}
                                    {analysisType === 'moderation' && "Moderation Analysis"}
                                    {analysisType === 'cluster' && "Cluster Analysis (K-Means)"}
                                    {analysisType === 'mann-whitney' && "Mann-Whitney U Test"}
                                    {analysisType === 'kruskal-wallis' && "Kruskal-Wallis Test"}
                                    {analysisType === 'wilcoxon' && "Wilcoxon Signed Rank Test"}
                                </p>
                            </div>

                            {/* Single Result Display */}
                            {results && analysisType !== 'cronbach-batch' && analysisType !== 'omega-batch' && (
                                <ResultsDisplay
                                    analysisType={analysisType}
                                    results={results.data}
                                    columns={results.columns}
                                    onProceedToEFA={handleProceedToEFA}
                                    onProceedToCFA={handleProceedToCFA}
                                    onProceedToSEM={handleProceedToSEM}
                                    userProfile={userProfile}
                                    scaleName={results.scaleName}
                                />
                            )}

                            {/* Batch Results Display */}
                            {(analysisType === 'cronbach-batch' || analysisType === 'omega-batch') && multipleResults.length > 0 && (
                                <div className="space-y-8">
                                    {/* Summary Table */}
                                    <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
                                        <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">{locale === 'vi' ? 'Tổng hợp độ tin cậy các thang đo' : 'Aggregated Scale Reliability'}</h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm text-slate-800">
                                                <thead className="bg-slate-50 text-slate-700">
                                                    <tr className="border-b-2 border-slate-300">
                                                        <th className="py-3 px-4 font-semibold rounded-tl-lg">{locale === 'vi' ? 'Thang đo' : 'Scale'}</th>
                                                        <th className="py-3 px-4 font-semibold text-center">{locale === 'vi' ? 'Số biến' : 'Items'}</th>
                                                        <th className="py-3 px-4 font-semibold text-center">{multipleResults[0]?.type === 'omega' ? "McDonald's Omega" : "Cronbach's Alpha"}</th>
                                                        <th className="py-3 px-4 font-semibold text-center rounded-tr-lg">{locale === 'vi' ? 'Đánh giá' : 'Evaluation'}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {multipleResults.map((r, idx) => {
                                                        const score = r.type === 'omega' ? (r.data?.omega || 0) : (r.data?.alpha || r.data?.rawAlpha || 0);
                                                        let evaluation = '';
                                                        let evalColor = '';
                                                        if (score >= 0.9) { evaluation = locale === 'vi' ? 'Xuất sắc' : 'Excellent'; evalColor = 'text-green-800 bg-green-100 ring-1 ring-green-200'; }
                                                        else if (score >= 0.8) { evaluation = locale === 'vi' ? 'Tốt' : 'Good'; evalColor = 'text-green-700 bg-emerald-50 ring-1 ring-emerald-200'; }
                                                        else if (score >= 0.7) { evaluation = locale === 'vi' ? 'Chấp nhận' : 'Acceptable'; evalColor = 'text-blue-700 bg-blue-50 ring-1 ring-blue-200'; }
                                                        else if (score >= 0.6) { evaluation = locale === 'vi' ? 'Khá' : 'Fair'; evalColor = 'text-amber-700 bg-amber-50 ring-1 ring-amber-200'; }
                                                        else { evaluation = locale === 'vi' ? 'Kém' : 'Poor'; evalColor = 'text-red-700 bg-red-50 ring-1 ring-red-200'; }

                                                        return (
                                                            <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                                                <td className="py-3 px-4 font-bold text-slate-700">{r.scaleName}</td>
                                                                <td className="py-3 px-4 text-center font-medium text-slate-600">{r.columns.length}</td>
                                                                <td className="py-3 px-4 text-center font-bold text-slate-900">{score.toFixed(3)}</td>
                                                                <td className="py-3 px-4 text-center">
                                                                    <span className={`px-2.5 py-1 rounded-md text-sm font-semibold shadow-sm ${evalColor}`}>
                                                                        {evaluation}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Detailed Results for Each Group */}
                                    {multipleResults.map((r, idx) => (
                                        <div key={idx} className="border-t pt-6">
                                            <h4 className="text-lg font-bold text-gray-800 mb-4">
                                                {locale === 'vi' ? 'Chi tiết' : 'Details'}: {r.scaleName} ({r.columns.join(', ')})
                                            </h4>
                                            <ResultsDisplay
                                                analysisType={r.type || "cronbach"}
                                                results={r.data}
                                                columns={r.columns}
                                                userProfile={userProfile}
                                                scaleName={r.scaleName}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Action Buttons - Desktop Layout */}
                            <div className="hidden md:flex gap-4 justify-center py-6">
                                <button
                                    onClick={() => {
                                        setResults(null);
                                        setStep('analyze');
                                    }}
                                    className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all shadow-sm active:scale-95"
                                >
                                    {t(locale, 'analyze.results.back')}
                                </button>
                                <button
                                    onClick={handleExportPDF}
                                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-200 active:scale-95"
                                >
                                    <FileText className="w-5 h-5" />
                                    {t(locale, 'analyze.results.exportPdf')}
                                </button>
                                <div className="relative group">
                                    <button
                                        disabled
                                        className="px-6 py-3 bg-slate-200 text-slate-400 font-bold rounded-xl flex items-center gap-2 cursor-not-allowed opacity-70"
                                    >
                                        <FileText className="w-5 h-5" />
                                        {t(locale, 'analyze.results.exportWord')}
                                    </button>
                                    <span className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                        Soon
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        setStep('upload');
                                        setData([]);
                                        setProfile(null);
                                        setResults(null);
                                        setMultipleResults([]);
                                    }}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-200 active:scale-95"
                                >
                                    {t(locale, 'analyze.results.newAnalysis')}
                                </button>
                            </div>

                            {/* Mobile Action Bar - Sticky Bottom */}
                            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 flex gap-3 z-50 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
                                <button
                                    onClick={() => {
                                        setResults(null);
                                        setStep('analyze');
                                    }}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl active:bg-slate-200"
                                >
                                    {t(locale, 'analyze.results.back')}
                                </button>
                                <button
                                    onClick={handleExportPDF}
                                    className="flex-[2] py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 active:bg-emerald-700"
                                >
                                    <FileText className="w-5 h-5" />
                                    PDF
                                </button>
                                <button
                                    onClick={() => {
                                        setStep('upload');
                                        setData([]);
                                        setProfile(null);
                                        setResults(null);
                                        setMultipleResults([]);
                                    }}
                                    className="p-3 bg-blue-100 text-blue-600 font-bold rounded-xl active:bg-blue-200"
                                    title={t(locale, 'analyze.results.newAnalysis')}
                                >
                                    <RotateCcw className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <Footer locale={locale} />

            {/* Feedback Part 1: Demographics Survey */}
            <DemographicSurvey
                isOpen={showDemographics}
                onComplete={() => {
                    setShowDemographics(false);
                    showToast(locale === 'vi' ? 'Cảm ơn bạn đã cung cấp thông tin!' : 'Thank you for your feedback!', 'success');
                }}
            />

            {/* Feedback Part 3: Applicability Survey */}
            <ApplicabilitySurvey
                isOpen={showApplicability}
                onComplete={() => {
                    setShowApplicability(false);
                    runExportPDF(); // Proceed to export
                }}
                onCancel={() => {
                    setShowApplicability(false);
                    // Just close, do not export? Or allow export without feedback?
                    // Typically "Cancel" means cancel the action.
                    // If they want to export without feedback, they should probably have a "Skip" option inside (not implemented yet),
                    // or we assume completing Q8 is mandatory for the "Value" (Export).
                }}
            />

            {/* Save Project Modal */}
            <SaveProjectModal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                data={data}
                results={results}
                analysisType={analysisType}
                step={step}
                locale={locale}
            />

            {/* Insufficient Credits Modal */}
            <InsufficientCreditsModal
                isOpen={showInsufficientCredits}
                onClose={() => setShowInsufficientCredits(false)}
                required={requiredCredits}
                available={ncsBalance}
            />
        </div >
    );
}
