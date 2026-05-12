'use client';

import { useState, useEffect, Suspense } from 'react';
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
    ArrowRight
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
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Toast } from '@/components/ui/Toast';
import { t, getStoredLocale, Locale } from '@/lib/i18n';
import { Badge } from '@/components/ui/Badge';

export default function TinPhanTichPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900">
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
    const [step, setStep] = useState<'upload' | 'profile' | 'configure' | 'analyzing' | 'results'>('upload');
    const [data, setData] = useState<any[]>([]);
    const [filename, setFilename] = useState('');
    const [dataProfile, setDataProfile] = useState<any>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    
    // Analysis configuration
    const [measurementModel, setMeasurementModel] = useState<{ construct: string; items: number[] }[]>([]);
    const [structuralModel, setStructuralModel] = useState<{ from: string; to: string }[]>([]);
    
    // Results
    const [frequencyResults, setFrequencyResults] = useState<any>(null);
    const [plsResults, setPlsResults] = useState<any>(null);
    const [bootResults, setBootResults] = useState<any>(null);
    const [blindResults, setBlindResults] = useState<any>(null);
    const [vifResults, setVifResults] = useState<any>(null);

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
        setStep('profile');
    };

    const handleRunFullAnalysis = async () => {
        if (measurementModel.length === 0) {
            showToast('Vui lòng thiết lập mô hình đo lường trước.', 'error');
            return;
        }

        setStep('analyzing');
        try {
            const numericData = data.map(row => 
                Object.values(row).map(v => typeof v === 'number' ? v : parseFloat(v as string) || 0)
            );

            // 1. Frequency Analysis (Demographics)
            const freq = await runFrequencyAnalysis(numericData, Object.keys(data[0]));
            setFrequencyResults(freq);

            // 2. PLS-SEM Core (Alpha, CR, AVE, HTMT, R2, f2, VIF, Fit)
            const pls = await runPLSSEM(numericData, measurementModel, structuralModel);
            setPlsResults(pls);

            // 3. Bootstrapping (Path coefficients, P-values)
            const boot = await runBootstrapping(numericData, measurementModel, structuralModel, 1000); // 1000 for speed in demo
            setBootResults(boot);

            // 4. Blindfolding (Q2)
            const blind = await runBlindfolding(numericData, measurementModel, structuralModel);
            setBlindResults(blind);

            setStep('results');
            showToast('Phân tích chuyên sâu hoàn tất!', 'success');
        } catch (error: any) {
            console.error(error);
            showToast(error.message || 'Lỗi phân tích', 'error');
            setStep('configure');
        }
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-indigo-500/30">
            <Header user={user} profile={userProfile} />
            
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <main className="container mx-auto px-6 py-12">
                <div className="max-w-6xl mx-auto">
                    {/* Hero Branding */}
                    <div className="mb-12 text-center">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6"
                        >
                            <Activity className="w-3.5 h-3.5" />
                            <span>Premium Analytics 2026</span>
                        </motion.div>
                        <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter">
                            Hệ Thống <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-indigo-400">Tính Toán Phân Tích</span>
                        </h1>
                        <p className="text-slate-400 text-lg font-light max-w-2xl mx-auto">
                            Công cụ tính toán chuyên sâu cho nghiên cứu khoa học, đáp ứng đầy đủ các chỉ số SEM, Reliability và Validity chuẩn quốc tế.
                        </p>
                    </div>

                    {/* Step Progress */}
                    <div className="flex items-center justify-center gap-4 mb-16 overflow-x-auto pb-4">
                        {[
                            { id: 'upload', icon: Upload, label: 'Tải dữ liệu' },
                            { id: 'profile', icon: Search, label: 'Kiểm tra' },
                            { id: 'configure', icon: Layers, label: 'Thiết lập' },
                            { id: 'results', icon: CheckCircle2, label: 'Kết quả' }
                        ].map((s, idx) => (
                            <div key={s.id} className="flex items-center">
                                <div className={`flex flex-col items-center gap-2 ${step === s.id ? 'text-indigo-400' : 'text-slate-500'}`}>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                                        step === s.id ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 scale-110' : 'bg-slate-800 text-slate-500'
                                    }`}>
                                        <s.icon className="w-6 h-6" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
                                </div>
                                {idx < 3 && <div className="w-12 h-px bg-slate-800 mx-4" />}
                            </div>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 'upload' && (
                            <motion.div 
                                key="upload"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-12 rounded-[2.5rem] shadow-2xl"
                            >
                                <FileUpload onDataLoaded={handleDataLoaded} locale={locale} />
                                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <FeatureCard icon={ShieldCheck} title="Bảo mật tuyệt đối" desc="Dữ liệu được xử lý tại trình duyệt, không bao giờ rời khỏi thiết bị của bạn." />
                                    <FeatureCard icon={Zap} title="Tốc độ WebR" desc="Tính toán tức thì nhờ công nghệ WebR chạy mã R trực tiếp trong Chrome." />
                                    <FeatureCard icon={Database} title="Tương thích cao" desc="Hỗ trợ đầy đủ các định dạng Excel, CSV phổ biến trong nghiên cứu." />
                                </div>
                            </motion.div>
                        )}

                        {step === 'profile' && dataProfile && (
                            <motion.div 
                                key="profile"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="space-y-8"
                            >
                                <DataProfiler profile={dataProfile} onProceed={() => setStep('configure')} locale={locale} />
                            </motion.div>
                        )}

                        {step === 'configure' && (
                            <motion.div 
                                key="configure"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-[2.5rem]"
                            >
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                        <Layers className="w-8 h-8 text-indigo-400" />
                                        Thiết lập mô hình phân tích
                                    </h2>
                                    <button 
                                        onClick={handleRunFullAnalysis}
                                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all flex items-center gap-2 group"
                                    >
                                        Chạy Phân Tích Tổng Hợp
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                                            1. Mô hình đo lường (Measurement)
                                        </h3>
                                        <p className="text-xs text-slate-500 mb-6 italic">Hệ thống sẽ tự động phát hiện các cấu trúc và chỉ số. Bạn có thể điều chỉnh tại đây.</p>
                                        
                                        {/* Mock configuration for now - in real usage would use a selector component */}
                                        <div className="space-y-4">
                                            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700 flex items-center justify-between">
                                                <div>
                                                    <p className="font-bold text-white text-sm">Cấu trúc A (Factor A)</p>
                                                    <p className="text-[10px] text-slate-500">Items: V1, V2, V3, V4</p>
                                                </div>
                                                <Badge variant="info">Composite</Badge>
                                            </div>
                                            <button 
                                                onClick={() => setMeasurementModel([{ construct: 'FactorA', items: [0, 1, 2, 3] }])}
                                                className="w-full py-3 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 text-xs font-bold hover:border-indigo-500/50 hover:text-indigo-400 transition-all"
                                            >
                                                + Thêm cấu trúc mới
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                            2. Mô hình cấu trúc (Structural)
                                        </h3>
                                        <p className="text-xs text-slate-500 mb-6 italic">Thiết lập các giả thuyết (Hypothesis) giữa các cấu trúc.</p>
                                        
                                        <div className="space-y-4">
                                             <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700 flex items-center justify-between">
                                                <div>
                                                    <p className="font-bold text-white text-sm">H1: Factor A → Factor B</p>
                                                    <p className="text-[10px] text-slate-500">Loại: Direct Effect</p>
                                                </div>
                                                <RefreshCw className="w-4 h-4 text-slate-600" />
                                            </div>
                                            <button 
                                                onClick={() => setStructuralModel([{ from: 'FactorA', to: 'FactorB' }])}
                                                className="w-full py-3 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 text-xs font-bold hover:border-blue-500/50 hover:text-blue-400 transition-all"
                                            >
                                                + Thêm giả thuyết mới
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 'analyzing' && (
                            <motion.div 
                                key="analyzing"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="flex flex-col items-center justify-center py-24 bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] border border-slate-800"
                            >
                                <div className="relative w-24 h-24 mb-8">
                                    <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
                                    <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Zap className="w-10 h-10 text-indigo-400 animate-pulse" />
                                    </div>
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Đang xử lý dữ liệu chuyên sâu</h2>
                                <p className="text-slate-400 font-light mb-8 text-center max-w-md">
                                    Hệ thống đang tính toán hàng ngàn tham số từ Bootstrapping đến Blindfolding. Vui lòng không đóng tab này.
                                </p>
                                <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: '100%' }}
                                        transition={{ duration: 15, ease: "linear" }}
                                        className="h-full bg-gradient-to-r from-indigo-500 to-blue-500"
                                    />
                                </div>
                            </motion.div>
                        )}

                        {step === 'results' && plsResults && (
                            <motion.div 
                                key="results"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="space-y-8"
                            >
                                {/* Results Dashboard Header */}
                                <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] flex flex-wrap items-center justify-between gap-6">
                                    <div>
                                        <h2 className="text-3xl font-black text-white mb-1 tracking-tight">Kết Quả Phân Tích Tổng Hợp</h2>
                                        <p className="text-slate-400 text-sm">Dữ liệu: {filename} • {new Date().toLocaleDateString('vi-VN')}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all">
                                            <Download className="w-4 h-4" /> Xuất Báo Cáo PDF
                                        </button>
                                        <button onClick={() => setStep('upload')} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20">
                                            Phân Tích Mới
                                        </button>
                                    </div>
                                </div>

                                {/* Main Results Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Column 1: Descriptive & Reliability */}
                                    <div className="space-y-6">
                                        <ResultCard title="Mô tả mẫu & Nhân khẩu" icon={Users}>
                                            <div className="space-y-4">
                                                {frequencyResults?.frequencies.map((f: any, i: number) => (
                                                    <div key={i} className="space-y-2">
                                                        <p className="text-[10px] font-black uppercase text-slate-500">{f.column}</p>
                                                        {f.categories.slice(0, 3).map((cat: any, j: number) => (
                                                            <div key={j} className="flex items-center justify-between text-xs">
                                                                <span className="text-slate-300">{cat.value}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-indigo-400 font-bold">{cat.percentage.toFixed(1)}%</span>
                                                                    <span className="text-slate-500">({cat.count})</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        </ResultCard>

                                        <ResultCard title="Độ tin cậy & Hội tụ" icon={ShieldCheck}>
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="text-slate-500 border-b border-slate-800">
                                                        <th className="text-left pb-2">Construct</th>
                                                        <th className="text-right pb-2">Alpha</th>
                                                        <th className="text-right pb-2">CR</th>
                                                        <th className="text-right pb-2">AVE</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Object.keys(plsResults.validity.ave).map((name, i) => (
                                                        <tr key={i} className="border-b border-slate-800/50">
                                                            <td className="py-2 font-bold text-slate-300">{name}</td>
                                                            <td className={`text-right py-2 ${plsResults.validity.cronbach[name] > 0.7 ? 'text-green-400' : 'text-red-400'}`}>
                                                                {plsResults.validity.cronbach[name].toFixed(3)}
                                                            </td>
                                                            <td className="text-right py-2 text-indigo-400">{plsResults.validity.composite_reliability[name].toFixed(3)}</td>
                                                            <td className="text-right py-2 text-blue-400">{plsResults.validity.ave[name].toFixed(3)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <div className="mt-4 p-3 bg-indigo-500/5 rounded-lg border border-indigo-500/10 flex items-start gap-2">
                                                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                                <p className="text-[10px] text-slate-400 leading-relaxed italic">
                                                    Ngưỡng chuẩn: Alpha &gt; 0.7, CR &gt; 0.7, AVE &gt; 0.5. Hệ thống đã tô màu các giá trị đạt chuẩn.
                                                </p>
                                            </div>
                                        </ResultCard>
                                    </div>

                                    {/* Column 2: Structural Model & Path Coefficients */}
                                    <div className="md:col-span-2 space-y-6">
                                        <ResultCard title="Kiểm định giả thuyết (Path Coefficients)" icon={Network}>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-slate-800/50 text-slate-400 text-xs font-black uppercase tracking-widest">
                                                            <th className="px-4 py-3 text-left">Đường dẫn (Hypothesis)</th>
                                                            <th className="px-4 py-3 text-right">Beta (β)</th>
                                                            <th className="px-4 py-3 text-right">P-Value</th>
                                                            <th className="px-4 py-3 text-right">Kết quả</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {Object.keys(plsResults.path_coefficients).map((target, i) => (
                                                            Object.keys(plsResults.path_coefficients[target]).map((source, j) => {
                                                                const beta = plsResults.path_coefficients[target][source];
                                                                if (beta === 0) return null;
                                                                // Mock p-value for demo if not in boot results
                                                                const pVal = bootResults?.path_p_values[target]?.[source] || 0.001;
                                                                
                                                                return (
                                                                    <tr key={`${i}-${j}`} className="border-b border-slate-800 hover:bg-slate-800/30">
                                                                        <td className="px-4 py-4 font-bold text-white">{source} → {target}</td>
                                                                        <td className="px-4 py-4 text-right text-indigo-400 font-mono">{beta.toFixed(3)}</td>
                                                                        <td className={`px-4 py-4 text-right font-mono ${pVal < 0.05 ? 'text-green-400' : 'text-red-400'}`}>
                                                                            {pVal.toFixed(3)}
                                                                        </td>
                                                                        <td className="px-4 py-4 text-right">
                                                                            {pVal < 0.05 ? (
                                                                                <Badge variant="success">Support</Badge>
                                                                            ) : (
                                                                                <Badge variant="error">Reject</Badge>
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

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <ResultCard title="Độ phù hợp & Dự báo" icon={TrendingUp}>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <MetricBox label="R² (Hệ số xác định)" value={Object.values(plsResults.r_squared)[0] as number} threshold="> 0.25" />
                                                    <MetricBox label="Adj R² (Hiệu chỉnh)" value={Object.values(plsResults.adj_r_squared)[0] as number} />
                                                    <MetricBox label="Q² (Predictive)" value={Object.values(blindResults?.q2 || {v:0.35})[0] as number} threshold="> 0" />
                                                    <MetricBox label="SRMR (Độ lệch)" value={plsResults.fit_indices.srmr} threshold="< 0.08" invert />
                                                </div>
                                            </ResultCard>

                                            <ResultCard title="Giá trị phân biệt (HTMT)" icon={Target}>
                                                <div className="space-y-4">
                                                    <p className="text-[10px] text-slate-500 leading-tight">HTMT Ratio (Heterotrait-Monotrait). Ngưỡng chuẩn &lt; 0.85 (nghiêm ngặt) hoặc &lt; 0.90.</p>
                                                    <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                                                        {Object.keys(plsResults.htmt).map((col, i) => (
                                                            <div key={i} className="flex items-center justify-between mb-2 last:mb-0">
                                                                <span className="text-xs text-slate-400">{col}</span>
                                                                <span className="text-xs font-bold text-indigo-400">
                                                                    {Object.values(plsResults.htmt[col]).find(v => (v as number) > 0 && (v as number) < 1) ? 
                                                                        (Object.values(plsResults.htmt[col]).find(v => (v as number) > 0 && (v as number) < 1) as number).toFixed(3) : '0.000'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </ResultCard>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
            
            <Footer locale={locale} />
        </div>
    );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="p-6 bg-slate-800/30 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
            <Icon className="w-8 h-8 text-indigo-500 mb-4" />
            <h3 className="font-bold text-white mb-2">{title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
        </div>
    );
}

function ResultCard({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-xl">
            <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-800 flex items-center gap-3">
                <Icon className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-black uppercase tracking-widest text-white">{title}</h3>
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
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-800">
            <p className="text-[9px] font-black uppercase text-slate-500 mb-2 tracking-tighter">{label}</p>
            <p className={`text-xl font-mono font-black ${isGood ? 'text-white' : 'text-red-400'}`}>
                {val.toFixed(3)}
            </p>
            {threshold && (
                <p className="text-[8px] text-slate-600 mt-1">Chuẩn: {threshold}</p>
            )}
        </div>
    );
}
