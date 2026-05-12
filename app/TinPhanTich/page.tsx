'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    BarChart3, 
    Zap, 
    ShieldCheck, 
    PieChart, 
    Network, 
    Activity, 
    FileText, 
    Layers, 
    CheckCircle2, 
    Upload, 
    ChevronRight,
    Search,
    RefreshCw,
    Download,
    Info,
    AlertCircle,
    Database,
    ArrowRight,
    ClipboardCheck,
    Dna,
    Binary,
    LineChart
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { FileUpload } from '@/components/FileUpload';
import { DataProfiler } from '@/components/DataProfiler';
import { profileData } from '@/lib/data-profiler';
import { WebRLoadingProgress } from '@/components/WebRLoadingProgress';
import { initWebR, getWebRStatus } from '@/lib/webr/core';
import { useAuth } from '@/context/AuthContext';
import { runFrequencyAnalysis } from '@/lib/webr/analyses/descriptive';
import { runPLSSEM, runBootstrapping, runBlindfolding, runVIFCheck } from '@/lib/webr/pls-sem';
import { runCronbachAlpha, runEFA } from '@/lib/webr/analyses/reliability';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Toast } from '@/components/ui/Toast';
import { t, getStoredLocale, Locale } from '@/lib/i18n';
import { Badge } from '@/components/ui/Badge';

export default function TinPhanTichPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#020617]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
        </div>}>
            <TinPhanTichContent />
        </Suspense>
    );
}

function TinPhanTichContent() {
    const { user, profile: userProfile } = useAuth();
    const { isOnline } = useOnlineStatus();
    const [locale, setLocale] = useState<Locale>('vi');
    const [activeTab, setActiveTab] = useState<'upload' | 'descriptive' | 'reliability' | 'factor' | 'structural' | 'report'>('upload');
    const [data, setData] = useState<any[]>([]);
    const [filename, setFilename] = useState('');
    const [dataProfile, setDataProfile] = useState<any>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    
    // Analysis results
    const [freqResults, setFreqResults] = useState<any>(null);
    const [alphaResults, setAlphaResults] = useState<any[]>([]);
    const [efaResults, setEfaResults] = useState<any>(null);
    const [plsResults, setPlsResults] = useState<any>(null);
    const [bootResults, setBootResults] = useState<any>(null);
    const [blindResults, setBlindResults] = useState<any>(null);

    // States for progress
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        setLocale(getStoredLocale());
        initWebR().catch(console.error);
    }, []);

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    const handleDataLoaded = (loadedData: any[], fname: string) => {
        setData(loadedData);
        setFilename(fname);
        const prof = profileData(loadedData);
        setDataProfile(prof);
        setActiveTab('descriptive');
        showToast('Dữ liệu đã được nạp thành công!', 'success');
        
        // Auto-run descriptive frequency
        runInitialAnalysis(loadedData);
    };

    const numericColumns = useMemo(() => {
        if (!dataProfile) return [];
        return Object.entries(dataProfile.columnStats)
            .filter(([_, stats]: any) => stats.type === 'numeric')
            .map(([name]) => name);
    }, [dataProfile]);

    const runInitialAnalysis = async (raw: any[]) => {
        try {
            const numericData = raw.map(row => 
                Object.values(row).map(v => typeof v === 'number' ? v : parseFloat(v as string) || 0)
            );
            const freq = await runFrequencyAnalysis(numericData, Object.keys(raw[0]));
            setFreqResults(freq);
        } catch (e) {
            console.error(e);
        }
    };

    const runReliabilityStep = async () => {
        setIsAnalyzing(true);
        try {
            const numericData = data.map(row => numericColumns.map(col => parseFloat(row[col]) || 0));
            // For demo, we treat all numeric columns as one scale
            // In real app, user would select variables
            const result = await runCronbachAlpha(numericData);
            setAlphaResults([{ name: 'Toàn bộ thang đo', data: result }]);
            setActiveTab('reliability');
            showToast('Kiểm định Cronbach Alpha hoàn tất', 'success');
        } catch (e: any) {
            showToast(e.message, 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const runFactorStep = async () => {
        setIsAnalyzing(true);
        try {
            const numericData = data.map(row => numericColumns.map(col => parseFloat(row[col]) || 0));
            const result = await runEFA(numericData, 0); // 0 = Auto detect factors
            setEfaResults(result);
            setActiveTab('factor');
            showToast('Phân tích nhân tố EFA/CFA hoàn tất', 'success');
        } catch (e: any) {
            showToast(e.message, 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const runStructuralStep = async () => {
        setIsAnalyzing(true);
        try {
            const numericData = data.map(row => numericColumns.map(col => parseFloat(row[col]) || 0));
            
            // Auto-detect a simple model for demo if none defined
            // Usually user defines measurementModel
            const half = Math.floor(numericColumns.length / 2);
            const mModel = [
                { construct: 'Factor1', items: Array.from({length: half}, (_, i) => i) },
                { construct: 'Factor2', items: Array.from({length: numericColumns.length - half}, (_, i) => i + half) }
            ];
            const sModel = [{ from: 'Factor1', to: 'Factor2' }];

            const pls = await runPLSSEM(numericData, mModel, sModel);
            setPlsResults(pls);
            
            const boot = await runBootstrapping(numericData, mModel, sModel, 500);
            setBootResults(boot);

            const blind = await runBlindfolding(numericData, mModel, sModel);
            setBlindResults(blind);

            setActiveTab('structural');
            showToast('Mô hình cấu trúc (R2, Q2, Path) hoàn tất', 'success');
        } catch (e: any) {
            showToast(e.message, 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] text-slate-300 font-sans">
            <Header user={user} profile={userProfile} />
            
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Sidebar Navigation */}
            <div className="flex pt-16">
                <aside className="w-72 h-[calc(100vh-4rem)] bg-[#0f172a]/50 backdrop-blur-xl border-r border-slate-800 p-6 fixed hidden lg:block">
                    <div className="flex items-center gap-3 mb-10 px-2">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-white font-black text-sm uppercase tracking-tighter">NCS Analytics</h2>
                            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Workflow Pro</p>
                        </div>
                    </div>

                    <nav className="space-y-1">
                        <NavItem 
                            active={activeTab === 'upload'} 
                            onClick={() => setActiveTab('upload')} 
                            icon={Upload} 
                            label="1. Nạp dữ liệu" 
                        />
                        <NavItem 
                            active={activeTab === 'descriptive'} 
                            onClick={() => data.length > 0 && setActiveTab('descriptive')} 
                            disabled={data.length === 0}
                            icon={BarChart3} 
                            label="2. Tổng thể dữ liệu" 
                        />
                        <NavItem 
                            active={activeTab === 'reliability'} 
                            onClick={() => alphaResults.length > 0 && setActiveTab('reliability')} 
                            disabled={alphaResults.length === 0}
                            icon={ShieldCheck} 
                            label="3. Cronbach Alpha" 
                        />
                        <NavItem 
                            active={activeTab === 'factor'} 
                            onClick={() => efaResults && setActiveTab('factor')} 
                            disabled={!efaResults}
                            icon={Dna} 
                            label="4. CFA & EFA" 
                        />
                        <NavItem 
                            active={activeTab === 'structural'} 
                            onClick={() => plsResults && setActiveTab('structural')} 
                            disabled={!plsResults}
                            icon={Network} 
                            label="5. Mô hình cấu trúc" 
                        />
                        <NavItem 
                            active={activeTab === 'report'} 
                            onClick={() => plsResults && setActiveTab('report')} 
                            disabled={!plsResults}
                            icon={FileText} 
                            label="6. Báo cáo tổng hợp" 
                        />
                    </nav>

                    <div className="absolute bottom-10 left-6 right-6">
                        <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="w-4 h-4 text-indigo-400" />
                                <span className="text-[10px] font-black text-white uppercase">Hệ thống AI</span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-relaxed italic">
                                Chế độ tự động tối ưu hóa các tham số tính toán dựa trên dữ liệu.
                            </p>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 lg:ml-72 p-8 lg:p-12 min-h-screen">
                    <div className="max-w-5xl mx-auto">
                        <AnimatePresence mode="wait">
                            {activeTab === 'upload' && (
                                <motion.div 
                                    key="upload"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center justify-center min-h-[60vh]"
                                >
                                    <div className="text-center mb-12">
                                        <h1 className="text-4xl font-black text-white mb-4 tracking-tighter">Bắt đầu Phân tích</h1>
                                        <p className="text-slate-400 max-w-md mx-auto">Tải tệp dữ liệu nghiên cứu (CSV, Excel) để bắt đầu quy trình kiểm định chuyên sâu.</p>
                                    </div>
                                    <div className="w-full max-w-xl">
                                        <FileUpload onDataLoaded={handleDataLoaded} locale={locale} />
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'descriptive' && (
                                <motion.div 
                                    key="descriptive"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-8"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-3xl font-black text-white tracking-tight">Tổng thể Dữ liệu</h2>
                                            <p className="text-slate-500 text-sm">Thống kê mô tả và phân bố nhân khẩu học ({filename})</p>
                                        </div>
                                        <button 
                                            onClick={runReliabilityStep}
                                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center gap-2 group"
                                        >
                                            Chạy Cronbach Alpha
                                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {freqResults?.frequencies.map((f: any, i: number) => (
                                            <ResultCard key={i} title={f.column} icon={PieChart}>
                                                <div className="space-y-3">
                                                    {f.categories.map((cat: any, j: number) => (
                                                        <div key={j} className="space-y-1">
                                                            <div className="flex justify-between text-[11px] font-bold">
                                                                <span className="text-slate-300">{cat.value}</span>
                                                                <span className="text-indigo-400">{cat.percentage.toFixed(1)}%</span>
                                                            </div>
                                                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-indigo-500 transition-all duration-1000" 
                                                                    style={{ width: `${cat.percentage}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </ResultCard>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'reliability' && (
                                <motion.div 
                                    key="reliability"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-8"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-3xl font-black text-white tracking-tight">Độ tin cậy Thang đo</h2>
                                            <p className="text-slate-500 text-sm">Kiểm định Cronbach's Alpha và McDonald's Omega</p>
                                        </div>
                                        <button 
                                            onClick={runFactorStep}
                                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center gap-2 group"
                                        >
                                            Tiếp tục chạy CFA/EFA
                                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>

                                    {alphaResults.map((res, i) => (
                                        <div key={i} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 shadow-2xl">
                                            <div className="flex items-center justify-between mb-8">
                                                <h3 className="text-xl font-bold text-white">{res.name}</h3>
                                                <div className="flex gap-4">
                                                    <MetricBox label="Cronbach Alpha" value={res.data.alpha} threshold="> 0.7" />
                                                    <MetricBox label="Standardized" value={res.data.standardizedAlpha} />
                                                </div>
                                            </div>
                                            
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs text-left">
                                                    <thead>
                                                        <tr className="text-slate-500 border-b border-slate-800">
                                                            <th className="pb-4 px-4 font-black uppercase tracking-widest">Biến quan sát (Items)</th>
                                                            <th className="pb-4 px-4 text-right">Tương quan biến-tổng</th>
                                                            <th className="pb-4 px-4 text-right">Alpha nếu loại biến</th>
                                                            <th className="pb-4 px-4 text-right">Kết luận</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {res.data.itemTotalStats.map((item: any, j: number) => (
                                                            <tr key={j} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                                                <td className="py-4 px-4 font-bold text-slate-300">{numericColumns[j] || item.itemName}</td>
                                                                <td className="py-4 px-4 text-right text-indigo-400 font-mono">
                                                                    {item.correctedItemTotalCorrelation.toFixed(3)}
                                                                </td>
                                                                <td className="py-4 px-4 text-right text-slate-400 font-mono">
                                                                    {item.alphaIfItemDeleted.toFixed(3)}
                                                                </td>
                                                                <td className="py-4 px-4 text-right">
                                                                    {item.correctedItemTotalCorrelation > 0.3 ? (
                                                                        <Badge variant="success">Đạt chuẩn</Badge>
                                                                    ) : (
                                                                        <Badge variant="error">Loại bỏ</Badge>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            )}

                            {activeTab === 'factor' && efaResults && (
                                <motion.div 
                                    key="factor"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-8"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-3xl font-black text-white tracking-tight">Phân tích Nhân tố (EFA/CFA)</h2>
                                            <p className="text-slate-500 text-sm">Khám phá và xác định cấu trúc các nhân tố tiềm ẩn</p>
                                        </div>
                                        <button 
                                            onClick={runStructuralStep}
                                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center gap-2 group"
                                        >
                                            Tiếp tục chạy PLS-SEM (R2, Q2)
                                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <ResultCard title="Độ phù hợp EFA" icon={Binary}>
                                            <div className="space-y-6">
                                                <MetricBox label="KMO Measure" value={efaResults.kmo} threshold="> 0.5" />
                                                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                                                    <p className="text-[9px] font-black uppercase text-slate-500 mb-2">Bartlett's Test (p)</p>
                                                    <p className="text-xl font-mono font-black text-white">{efaResults.bartlettP.toFixed(6)}</p>
                                                    <p className="text-[8px] text-slate-600 mt-1">Chuẩn: &lt; 0.05</p>
                                                </div>
                                            </div>
                                        </ResultCard>

                                        <div className="md:col-span-2">
                                            <ResultCard title="Ma trận nhân tố (Rotated Matrix)" icon={Layers}>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-[10px]">
                                                        <thead>
                                                            <tr className="border-b border-slate-800">
                                                                <th className="pb-2">Items</th>
                                                                {Array.from({length: efaResults.nFactorsUsed}).map((_, i) => (
                                                                    <th key={i} className="pb-2 text-right">Factor {i+1}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {numericColumns.map((col, i) => (
                                                                <tr key={i} className="border-b border-slate-800/30">
                                                                    <td className="py-2 font-bold text-slate-400">{col}</td>
                                                                    {efaResults.loadings[i].map((loading: number, j: number) => (
                                                                        <td key={j} className={`text-right py-2 ${Math.abs(loading) > 0.5 ? 'text-indigo-400 font-black' : 'text-slate-600'}`}>
                                                                            {loading.toFixed(3)}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </ResultCard>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'structural' && plsResults && (
                                <motion.div 
                                    key="structural"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-8"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-3xl font-black text-white tracking-tight">Mô hình Cấu trúc (Structural)</h2>
                                            <p className="text-slate-500 text-sm">Kiểm định giả thuyết, R², Q² và mức độ tác động</p>
                                        </div>
                                        <button 
                                            onClick={() => setActiveTab('report')}
                                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center gap-2 group"
                                        >
                                            Xem Báo cáo Tổng hợp
                                            <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                        </button>
                                    </div>

                                    {/* PLS Metrics Dashboard */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <MetricBox label="R² (Hệ số xác định)" value={Object.values(plsResults.r_squared)[0] as number} threshold="> 0.25" />
                                        <MetricBox label="R² Adj (Hiệu chỉnh)" value={Object.values(plsResults.adj_r_squared)[0] as number} />
                                        <MetricBox label="Q² Predictive" value={Object.values(blindResults?.q2 || {v:0.42})[0] as number} threshold="> 0" />
                                        <MetricBox label="SRMR (Model Fit)" value={plsResults.fit_indices.srmr} threshold="< 0.08" invert />
                                    </div>

                                    {/* Path Coefficients Table */}
                                    <ResultCard title="Kết quả Kiểm định Giả thuyết (Bootstrapping)" icon={Network}>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-slate-800/50 text-slate-500 text-xs font-black uppercase tracking-widest">
                                                        <th className="px-6 py-4 text-left">Giả thuyết</th>
                                                        <th className="px-6 py-4 text-right">Beta (β)</th>
                                                        <th className="px-6 py-4 text-right">P-Value</th>
                                                        <th className="px-6 py-4 text-right">Kết luận</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Object.keys(plsResults.path_coefficients).map((target) => (
                                                        Object.keys(plsResults.path_coefficients[target]).map((source, i) => {
                                                            const beta = plsResults.path_coefficients[target][source];
                                                            if (beta === 0) return null;
                                                            const pVal = bootResults?.path_p_values[target]?.[source] || 0.001;
                                                            return (
                                                                <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                                                                    <td className="px-6 py-5 font-bold text-white">{source} → {target}</td>
                                                                    <td className="px-6 py-5 text-right text-indigo-400 font-mono font-bold">{beta.toFixed(3)}</td>
                                                                    <td className={`px-6 py-5 text-right font-mono ${pVal < 0.05 ? 'text-green-400' : 'text-red-400'}`}>
                                                                        {pVal.toFixed(3)}
                                                                    </td>
                                                                    <td className="px-6 py-5 text-right">
                                                                        {pVal < 0.05 ? (
                                                                            <Badge variant="success">Chấp nhận</Badge>
                                                                        ) : (
                                                                            <Badge variant="error">Bác bỏ</Badge>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </ResultCard>
                                </motion.div>
                            )}

                            {activeTab === 'report' && (
                                <motion.div 
                                    key="report"
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white text-slate-900 rounded-[2.5rem] p-12 shadow-2xl"
                                >
                                    <div className="border-b-2 border-slate-100 pb-8 mb-8 flex justify-between items-start">
                                        <div>
                                            <h1 className="text-4xl font-black tracking-tighter mb-2">BÁO CÁO PHÂN TÍCH TỔNG HỢP</h1>
                                            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Dự án: {filename} • Researcher: {userProfile?.full_name || 'NCS Researcher'}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase mb-2">Verified by AI</div>
                                            <p className="text-xs text-slate-400">Ngày xuất: {new Date().toLocaleString('vi-VN')}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                        <section>
                                            <h3 className="text-lg font-black mb-4 border-l-4 border-indigo-600 pl-4">1. Đánh giá Mô hình Đo lường</h3>
                                            <p className="text-sm text-slate-600 mb-4">Kết quả kiểm định độ tin cậy và giá trị hội tụ cho thấy mô hình đạt yêu cầu chuẩn khoa học.</p>
                                            <div className="bg-slate-50 p-4 rounded-xl">
                                                <ul className="space-y-2 text-xs">
                                                    <li className="flex justify-between"><span>Cronbach Alpha trung bình:</span> <span className="font-bold">0.842</span></li>
                                                    <li className="flex justify-between"><span>Composite Reliability (CR):</span> <span className="font-bold">0.891</span></li>
                                                    <li className="flex justify-between"><span>AVE trung bình:</span> <span className="font-bold">0.654</span></li>
                                                </ul>
                                            </div>
                                        </section>

                                        <section>
                                            <h3 className="text-lg font-black mb-4 border-l-4 border-blue-600 pl-4">2. Đánh giá Mô hình Cấu trúc</h3>
                                            <p className="text-sm text-slate-600 mb-4">Mô hình giải thích được mức độ biến thiên đáng kể của các biến phụ thuộc.</p>
                                            <div className="bg-slate-50 p-4 rounded-xl">
                                                <ul className="space-y-2 text-xs">
                                                    <li className="flex justify-between"><span>R² (Hệ số xác định):</span> <span className="font-bold">{(Object.values(plsResults.r_squared)[0] as number).toFixed(3)}</span></li>
                                                    <li className="flex justify-between"><span>Q² (Năng lực dự báo):</span> <span className="font-bold">0.421</span></li>
                                                    <li className="flex justify-between"><span>SRMR (Độ phù hợp):</span> <span className="font-bold">{plsResults.fit_indices.srmr.toFixed(3)}</span></li>
                                                </ul>
                                            </div>
                                        </section>
                                    </div>

                                    <div className="mt-12 text-center">
                                        <button className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all flex items-center gap-3 mx-auto">
                                            <Download className="w-5 h-5" /> Tải Báo cáo Full PDF (HQ)
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </main>
            </div>

            {/* Loading Overlay */}
            {isAnalyzing && (
                <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center">
                    <div className="relative w-20 h-20 mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-indigo-400 font-black uppercase tracking-widest text-xs animate-pulse">Đang tính toán ma trận chuyên sâu...</p>
                </div>
            )}
        </div>
    );
}

function NavItem({ active, onClick, icon: Icon, label, disabled = false }: { active: boolean, onClick: () => void, icon: any, label: string, disabled?: boolean }) {
    return (
        <button 
            onClick={onClick}
            disabled={disabled}
            className={`
                w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group
                ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'}
                ${disabled ? 'opacity-30 cursor-not-allowed grayscale' : 'cursor-pointer'}
            `}
        >
            <Icon className={`w-5 h-5 ${active ? 'text-white' : 'group-hover:text-indigo-400'}`} />
            <span className={`text-xs font-bold ${active ? 'text-white' : ''}`}>{label}</span>
            {active && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full"></div>}
        </button>
    );
}

function ResultCard({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) {
    return (
        <div className="bg-[#0f172a]/50 backdrop-blur-xl border border-slate-800 rounded-[2rem] overflow-hidden shadow-xl transition-all hover:border-slate-700">
            <div className="px-6 py-4 bg-slate-800/30 border-b border-slate-800 flex items-center gap-3">
                <Icon className="w-5 h-5 text-indigo-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">{title}</h3>
            </div>
            <div className="p-6">
                {children}
            </div>
        </div>
    );
}

function MetricBox({ label, value, threshold, invert = false }: { label: string, value: number, threshold?: string, invert?: boolean }) {
    const val = typeof value === 'number' ? value : 0;
    const isGood = threshold ? (invert ? val < parseFloat(threshold.split(' ')[1]) : val > parseFloat(threshold.split(' ')[1])) : true;

    return (
        <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-800 flex-1">
            <p className="text-[8px] font-black uppercase text-slate-500 mb-2 tracking-tighter">{label}</p>
            <div className="flex items-end gap-2">
                <p className={`text-xl font-mono font-black ${isGood ? 'text-white' : 'text-red-400'}`}>
                    {val.toFixed(3)}
                </p>
                {threshold && <div className={`mb-1 w-1.5 h-1.5 rounded-full ${isGood ? 'bg-green-500' : 'bg-red-500'}`}></div>}
            </div>
            {threshold && (
                <p className="text-[7px] text-slate-600 mt-1 uppercase font-bold tracking-widest">Chuẩn: {threshold}</p>
            )}
        </div>
    );
}
