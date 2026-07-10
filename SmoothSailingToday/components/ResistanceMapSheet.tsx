import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight, AlertTriangle, CheckCircle2, GitBranch, Play, RefreshCw, AlertCircle, Layout, Type, Loader2, FileText, ChevronDown } from 'lucide-react';
import { FlowPath, FlowNode, AlternativeRoute, UserProfile, DailyFortuneOverview } from '../types';
import { analyzeResistanceWithAI } from '../services/ai';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectAlternative: (route: AlternativeRoute) => void;
  userProfile: UserProfile | null;
  dailyOverview: DailyFortuneOverview | undefined;
}

type Status = 'initial' | 'analyzing' | 'result' | 'error';
type InputMode = 'text' | 'visual';

// Helper Component for Node (Visual Only)
const FrictionNodeVisual: React.FC<{ node: FlowNode; isLast: boolean }> = ({ node, isLast }) => {
    const isHigh = node.frictionLevel === 'high';
    const isMed = node.frictionLevel === 'medium';
    
    let borderColor = 'border-white/10';
    let bg = 'bg-white/5';
    let textColor = 'text-white/60';
    let icon = null;

    if (isHigh) {
        borderColor = 'border-red-500/50';
        bg = 'bg-red-500/10';
        textColor = 'text-white';
        icon = <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-[#12141E] animate-pulse" />;
    } else if (isMed) {
        borderColor = 'border-amber-500/50';
        bg = 'bg-amber-500/10';
        textColor = 'text-white/90';
        icon = <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border border-[#12141E]" />;
    }

    return (
        <div className="flex items-center shrink-0">
            <div className="relative flex flex-col items-center">
                <div className={`px-4 py-2.5 rounded-2xl border ${borderColor} ${bg} text-[12px] font-medium whitespace-nowrap relative transition-all duration-300 ${textColor} ${isHigh ? 'shadow-[0_0_15px_rgba(239,68,68,0.15)]' : ''}`}>
                    {node.label}
                    {icon}
                </div>
            </div>
            {!isLast && (
                <div className="w-8 h-px bg-white/10 mx-1 relative shrink-0 flex items-center justify-center">
                    <ArrowRight size={10} className="text-white/20" />
                </div>
            )}
        </div>
    );
};

const ResistanceMapSheet: React.FC<Props> = ({ isOpen, onClose, onSelectAlternative, userProfile, dailyOverview }) => {
  const { t } = useLanguage();
  const [status, setStatus] = useState<Status>('initial');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [inputText, setInputText] = useState('');
  const [currentPath, setCurrentPath] = useState<FlowPath | null>(null);
  const [alternatives, setAlternatives] = useState<AlternativeRoute[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Refs for auto-scrolling
  const resultRef = useRef<HTMLDivElement>(null);

  // Reset state when opened
  useEffect(() => {
    if (!isOpen) {
        const t = setTimeout(() => {
            if(status === 'analyzing' || status === 'error') setStatus('initial');
            setErrorMsg('');
        }, 500);
        return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Scroll to results when they appear
  useEffect(() => {
      if (status === 'result' && resultRef.current) {
          resultRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [status]);

  const handleAnalyze = async () => {
    if (inputMode === 'text' && !inputText.trim()) return;
    setStatus('analyzing');
    setErrorMsg('');
    
    try {
        const dayContext = dailyOverview ? {
            summary: dailyOverview.summary,
            level: dailyOverview.level
        } : undefined;

        const result = await analyzeResistanceWithAI(inputText, userProfile, dayContext);
        setCurrentPath(result.currentPath);
        setAlternatives(result.alternatives);
        setStatus('result');
    } catch (e) {
        setStatus('error');
        setErrorMsg('天时连接中断，请重试');
    }
  };

  const sheet = (
    <>
        {/* Backdrop */}
        <div 
            className={`fixed inset-0 bg-black/70 backdrop-blur-md z-[130] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        />

        {/* Sheet Container with Optimized Animation */}
        <div 
            style={{ willChange: 'transform' }}
            className={`fixed inset-x-0 bottom-0 z-[140] w-full h-[90vh] min-h-0 overflow-hidden bg-[#0F111A] rounded-t-[36px] flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.9)] transition-transform duration-500 ease-sheet-spring border-t border-white/10 ${
                isOpen ? 'translate-y-0' : 'translate-y-[100%] pointer-events-none'
            }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0 bg-[#0F111A]/90 backdrop-blur-xl z-10 rounded-t-[36px]">
                <div className="flex flex-col gap-0.5">
                    <h3 className="text-[18px] font-bold text-white tracking-wide flex items-center gap-2">
                       <Layout size={18} className="text-emerald-400" /> {t('resistance.modalTitle')}
                    </h3>
                    <p className="text-[11px] text-white/40">{t('resistance.modalSub')}</p>
                </div>
                <button 
                    onClick={onClose}
                    className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 select-none transition-all duration-200 ease-out"
                >
                    <X size={18} className="text-white/60" />
                </button>
            </div>

            {/* Body - Optimized Scroll */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-6 relative smooth-scroll" style={{ touchAction: 'pan-y' }}>
                
                {/* --- INPUT VIEW --- */}
                {(status === 'initial' || status === 'error') && (
                    <div className="flex flex-col min-h-full animate-fade-in pb-36">
                        
                        {/* Prompt Card */}
                        <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-2xl p-5 mb-6">
                            <h4 className="text-[14px] font-bold text-white mb-2">{t('resistance.promptTitle')}</h4>
                            <p className="text-[12px] text-white/60 leading-relaxed">
                                {t('resistance.promptDesc')} <span className="text-indigo-300 font-bold">{t('resistance.promptDesc2')} ({dailyOverview?.level === 'ROCKET' ? '大顺' : dailyOverview?.level === 'AVOID' ? '逆风' : '平稳'})</span> {t('resistance.promptDesc3')} <span className="text-indigo-300 font-bold">{t('resistance.promptDesc4')}</span>{t('resistance.promptDesc5')}
                            </p>
                        </div>

                        {/* Input Area */}
                        <div className="space-y-4">
                            <label className="text-[12px] font-bold text-white/40 uppercase tracking-wider pl-1">{t('resistance.inputLabel')}</label>
                            
                            <div className="relative">
                                <textarea 
                                    className="w-full h-48 bg-white/5 border border-white/10 rounded-2xl p-4 text-[15px] text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/40 focus:bg-white/10 transition-all resize-none leading-relaxed"
                                    placeholder={t('resistance.placeholder')}
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    autoFocus
                                />
                                {/* Character Count */}
                                <div className="absolute bottom-4 right-4 text-[10px] text-white/20">
                                    {inputText.length} chars
                                </div>
                            </div>

                            {status === 'error' && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-300 text-[12px] animate-shake">
                                    <AlertCircle size={14} /> {errorMsg}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- LOADING VIEW --- */}
                {status === 'analyzing' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0F111A] z-20 animate-fade-in">
                        <div className="relative mb-6">
                            <div className="w-20 h-20 border-4 border-white/5 rounded-full" />
                            <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            <Layout className="absolute inset-0 m-auto text-emerald-500 opacity-50 animate-pulse" size={24} />
                        </div>
                        <h4 className="text-[16px] font-bold text-white mb-1">{t('resistance.analyzing')}</h4>
                        <p className="text-[12px] text-white/40">{t('resistance.analyzingSub')}</p>
                    </div>
                )}

                {/* --- RESULT VIEW --- */}
                {status === 'result' && currentPath && (
                    <div ref={resultRef} className="flex flex-col gap-8 pb-32 animate-slide-up-fade">
                        
                        {/* 1. Path Diagnosis */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-[12px] font-bold text-white/40 uppercase tracking-wider">
                                <AlertTriangle size={12} /> {t('resistance.diagnosis')}
                            </div>
                            
                            {/* Visual Flow with smooth scroll */}
                            <div className="glass-card-sm p-6 border border-white/5 bg-[#141620] overflow-x-auto scrollbar-hide rounded-2xl smooth-scroll">
                                <div className="flex items-center min-w-max gap-1">
                                    {currentPath.nodes.map((node, idx) => (
                                        <FrictionNodeVisual key={node.id} node={node} isLast={idx === currentPath.nodes.length - 1} />
                                    ))}
                                </div>
                            </div>

                            {/* Friction Logs (Explicit List) */}
                            <div className="space-y-2 mt-2">
                                {currentPath.nodes.filter(n => n.frictionLevel === 'high' || n.frictionLevel === 'medium').length > 0 ? (
                                    currentPath.nodes
                                        .filter(n => n.frictionLevel === 'high' || n.frictionLevel === 'medium')
                                        .map((node, i) => (
                                            <div key={i} className={`p-4 rounded-xl border flex gap-3 ${
                                                node.frictionLevel === 'high' 
                                                ? 'bg-red-500/10 border-red-500/20' 
                                                : 'bg-amber-500/10 border-amber-500/20'
                                            }`}>
                                                <AlertCircle size={16} className={`shrink-0 mt-0.5 ${node.frictionLevel === 'high' ? 'text-red-400' : 'text-amber-400'}`} />
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-[13px] font-bold text-white">
                                                        卡点：{node.label}
                                                    </div>
                                                    <div className={`text-[12px] leading-relaxed ${node.frictionLevel === 'high' ? 'text-red-200/70' : 'text-amber-200/70'}`}>
                                                        {node.frictionReason || "此处受今日运势影响，摩擦较大。"}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                ) : (
                                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                                        <CheckCircle2 size={16} className="text-emerald-400" />
                                        <span className="text-[12px] text-emerald-100/80">
                                            {t('resistance.smooth')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2. Alternatives */}
                        <div className="space-y-4">
                             <div className="flex items-center gap-2 text-[12px] font-bold text-white/40 uppercase tracking-wider">
                                <GitBranch size={12} /> {t('resistance.recommend')}
                            </div>
                            
                            {alternatives.map((alt, idx) => (
                                <div key={alt.id} className="glass-card-frost rounded-[28px] p-6 border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
                                    {/* Deco */}
                                    <div className="absolute top-0 right-0 p-5 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <span className="text-[80px] font-bold leading-none">{idx + 1}</span>
                                    </div>

                                    <div className="relative z-10">
                                        {/* Header */}
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {alt.highlights.map(h => (
                                                <span key={h} className="text-[10px] px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-300 font-medium border border-emerald-500/10">
                                                    {h}
                                                </span>
                                            ))}
                                        </div>
                                        
                                        <h4 className="text-[17px] font-bold text-white mb-2">{alt.label}</h4>

                                        {/* Path Summary */}
                                        <div className="flex items-center gap-2 text-[12px] text-white/60 font-mono mb-4 bg-black/20 px-3 py-2 rounded-lg w-fit">
                                            <GitBranch size={12} />
                                            {alt.path.summary}
                                        </div>

                                        {/* Explanation */}
                                        <div className="space-y-2 mb-6">
                                            {alt.explanationLines.map((line, i) => (
                                                <p key={i} className="text-[12px] text-white/60 leading-relaxed flex items-start gap-2.5">
                                                    <span className="w-1 h-1 rounded-full bg-emerald-500 mt-2 shrink-0 shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
                                                    {line}
                                                </p>
                                            ))}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => onSelectAlternative(alt)}
                                                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 rounded-xl text-[13px] font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-95 select-none transition-all duration-200 ease-out flex items-center justify-center gap-2"
                                            >
                                                {t('resistance.adopt')} <ArrowRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Restart */}
                        <div className="flex justify-center">
                            <button 
                                onClick={() => { setStatus('initial'); setInputText(''); }}
                                className="flex items-center gap-2 text-[12px] text-white/30 hover:text-white/60 transition-colors py-4"
                            >
                                <RefreshCw size={12} /> {t('resistance.restart')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* --- BOTTOM ACTION BAR (Sticky for Input) --- */}
            {(status === 'initial' || status === 'error') && (
                <div className="p-6 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-[#0F111A]/95 backdrop-blur-xl border-t border-white/5 absolute bottom-0 inset-x-0 z-20">
                    <button 
                        onClick={handleAnalyze}
                        disabled={!inputText.trim()}
                        className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-[0_8px_30px_rgba(16,185,129,0.2)] active:scale-95 select-none transition-all duration-200 ease-out"
                    >
                        {status === 'error' ? '重试' : t('resistance.confirm')} <Play size={16} fill="currentColor" />
                    </button>
                </div>
            )}
        </div>
    </>
  );

  return typeof document === 'undefined' ? sheet : createPortal(sheet, document.body);
};

export default ResistanceMapSheet;
