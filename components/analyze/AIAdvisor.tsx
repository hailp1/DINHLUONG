'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Key, Send, Loader2, BrainCircuit, Lightbulb, AlertCircle } from 'lucide-react';

interface AIAdvisorProps {
    dataProfile: any;
    onStartAnalysis: () => void;
}

export function AIAdvisor({ dataProfile, onStartAnalysis }: AIAdvisorProps) {
    const [apiKey, setApiKey] = useState('');
    const [isAsking, setIsAsking] = useState(false);
    const [advice, setAdvice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const savedKey = localStorage.getItem('GEMINI_API_KEY');
        if (savedKey) setApiKey(savedKey);
    }, []);

    const saveApiKey = (key: string) => {
        setApiKey(key);
        localStorage.setItem('GEMINI_API_KEY', key);
    };

    const askAI = async () => {
        if (!apiKey) {
            setError('Vui lòng nhập Gemini API Key của bạn.');
            return;
        }

        setIsAsking(true);
        setError(null);

        const prompt = `
        Bạn là một chuyên gia thống kê học thuật cao cấp. 
        Hãy phân tích cấu trúc dữ liệu sau và tư vấn luồng chạy thống kê tối ưu (theo chuẩn luận văn NCS).
        
        Dữ liệu có các cột:
        ${JSON.stringify(dataProfile.columnStats, null, 2)}
        
        Yêu cầu:
        1. Nhận diện các biến nhân khẩu học và các biến đo lường Likert.
        2. Đề xuất quy trình chạy: Cronbach's Alpha -> EFA -> CFA -> SEM.
        3. Cảnh báo nếu có điểm bất thường (ví dụ: biến không phải dạng số, số lượng quan sát quá ít).
        4. Trả lời bằng tiếng Việt, ngắn gọn, chuyên nghiệp, định dạng Markdown.
        `;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            const result = await response.json();
            if (result.error) throw new Error(result.error.message);
            
            const text = result.candidates[0].content.parts[0].text;
            setAdvice(text);
        } catch (e: any) {
            setError(e.message || 'Không thể kết nối với Gemini. Vui lòng kiểm tra API Key.');
        } finally {
            setIsAsking(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header section */}
            <div className="bg-indigo-600 rounded-2xl p-8 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <BrainCircuit className="w-32 h-32" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Sparkles className="w-6 h-6 text-yellow-300 fill-yellow-300" />
                        </div>
                        <h2 className="text-2xl font-black tracking-tight">AI TƯ VẤN NGHIÊN CỨU</h2>
                    </div>
                    <p className="text-indigo-100 text-sm max-w-xl leading-relaxed">
                        Dựa trên cấu trúc dữ liệu bạn vừa tải lên, Gemini sẽ phân tích và đề xuất mô hình tính toán phù hợp nhất để đảm bảo độ tin cậy khoa học.
                    </p>
                </div>
            </div>

            {/* API Key Setup */}
            {!advice && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-slate-800">
                        <Key className="w-4 h-4 text-indigo-600" />
                        <h3 className="font-bold text-sm uppercase tracking-wider">Thiết lập Gemini API</h3>
                    </div>
                    <div className="flex gap-3">
                        <input 
                            type="password" 
                            value={apiKey}
                            onChange={(e) => saveApiKey(e.target.value)}
                            placeholder="Nhập Gemini API Key của bạn..."
                            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                        <button 
                            onClick={askAI}
                            disabled={isAsking}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-6 py-3 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-indigo-100"
                        >
                            {isAsking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Hỏi AI ngay
                        </button>
                    </div>
                    {error && (
                        <div className="mt-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> {error}
                        </div>
                    )}
                    <p className="mt-4 text-[10px] text-slate-400">
                        * API Key được lưu trực tiếp trên trình duyệt của bạn, không gửi về server của chúng tôi.
                    </p>
                </div>
            )}

            {/* AI Advice Output */}
            {advice && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm prose prose-slate prose-sm max-w-none prose-headings:font-black prose-indigo">
                            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100 not-prose">
                                <Lightbulb className="w-5 h-5 text-yellow-500" />
                                <h3 className="font-black text-slate-900 uppercase tracking-tight">Chiến lược phân tích đề xuất</h3>
                            </div>
                            <div className="whitespace-pre-wrap leading-relaxed text-slate-700">
                                {advice}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6">
                            <h4 className="font-bold text-emerald-800 text-sm mb-3">Xác nhận thực hiện</h4>
                            <p className="text-xs text-emerald-700 mb-6 leading-relaxed">
                                Bạn có muốn bắt đầu chạy luồng phân tích tự động theo đề xuất trên không?
                            </p>
                            <button 
                                onClick={onStartAnalysis}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <BrainCircuit className="w-4 h-4" />
                                Bắt đầu phân tích
                            </button>
                        </div>

                        <div className="bg-slate-100 rounded-2xl p-6 border border-slate-200">
                            <h4 className="font-bold text-slate-800 text-sm mb-3">Lưu ý chuyên môn</h4>
                            <p className="text-[11px] text-slate-500 leading-relaxed italic">
                                AI chỉ đóng vai trò tư vấn dựa trên cấu trúc kỹ thuật. Bạn nên tham khảo ý kiến của Giảng viên hướng dẫn trước khi chốt mô hình cuối cùng.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
