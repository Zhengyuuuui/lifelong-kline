

import React, { useState, useEffect } from 'react';
import { ElementData, AstrologyData, ElementType, CheatCard } from '../types';
import { getFormattedDate } from '../utils/energyCalculator';
import { getRoast, getSOSAction } from '../utils/roastEngine';
import { fetchElementAnalysis } from '../utils/gemini';
import { useI18n } from '../utils/i18nContext';
import LanguageSwitcher from './LanguageSwitcher';
import { Lightbulb, Zap } from 'lucide-react';

interface DashboardProps {
  activeElement: ElementData | undefined;
  onNext: () => void;
  onPrev: () => void;
  showDetail: boolean;
  onOpenDetail: () => void;
  onCloseDetail: () => void;
  onOpenCheatSheet: () => void; 
  activeCheats: CheatCard[]; 
  onUnequipCheat: (id: string) => void;
  astrologyData?: AstrologyData;
  onUpdateEnergy?: (delta: Partial<Record<ElementType, number>>, resetTarget?: boolean) => void;
  userName?: string;
}

// --- HEADER MODULE (Redesigned: Premium Editorial Layout) ---
const Header: React.FC<{ userName?: string; astrologyData?: AstrologyData }> = ({ userName, astrologyData }) => {
  const { t } = useI18n();
  
  return (
    <header className="absolute top-0 left-0 right-0 z-[60] px-6 py-5 md:px-8 flex justify-between items-start pointer-events-none select-none bg-gradient-to-b from-[#040404]/85 via-[#040404]/30 to-transparent transition-all duration-500 h-28">
        
        {/* LEFT: Consolidated Title & Context HUD */}
        <div className="pointer-events-auto flex flex-col gap-1 animate-in slide-in-from-top-4 duration-1000">
             
             {/* 1. App Title Group */}
             <div className="flex flex-col gap-0.5">
                 <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_6px_#6366f1]"></div>
                     <span className="text-[7.5px] sm:text-[8.5px] font-mono text-indigo-400 tracking-[0.15em] uppercase font-bold leading-none">
                         CELESTIAL ROTATOR
                     </span>
                 </div>
                 
                 <h1 className="text-[10px] sm:text-[11px] font-sans font-medium text-white/85 tracking-wide mt-1 leading-none">
                     五行生克星仪
                 </h1>
             </div>
        </div>

        {/* RIGHT: Controls Container */}
        <div className="pointer-events-auto flex items-center gap-2 md:gap-3 animate-in slide-in-from-top-4 duration-1000">
            {astrologyData?.bazi?.dayMaster && (
                <div className="flex items-center gap-1 px-2.5 py-1 bg-[#0c0c0e]/70 rounded-md border border-white/5 backdrop-blur-md text-[8.5px] font-mono select-none">
                    <span className="text-indigo-400 font-bold">{astrologyData.bazi.dayMaster}</span>
                    <span className="text-white/30">日主</span>
                </div>
            )}
            
            {/* 1. Language Switcher */}
            <div className="z-30">
                <LanguageSwitcher />
            </div>
        </div>
    </header>
  );
};

// --- ACTIVE CHEATS HUD ---
const ActiveCheatsHUD: React.FC<{ 
    cheats: CheatCard[]; 
    onUnequip: (id: string) => void; 
}> = ({ cheats, onUnequip }) => {
    const { t } = useI18n();
    if (cheats.length === 0) return null;

    return (
        <div className="absolute top-[28%] left-5 z-30 pointer-events-auto flex flex-col gap-2 animate-in slide-in-from-left-4 duration-700 w-36 md:w-44 select-none">
             <div className="flex items-center gap-1.5 mb-1 pl-1 opacity-85">
                 <div className="bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_#6366f1] w-1.5 h-1.5" />
                 <span className="text-[9px] font-mono font-bold text-white/40 tracking-[0.12em] uppercase">
                     {t('dash_active_buffs')}
                 </span>
             </div>
             {cheats.map((cheat) => (
                 <div 
                    key={cheat.id}
                    onClick={() => onUnequip(cheat.id)}
                    className="relative group w-full bg-black/75 backdrop-blur-md border border-white/10 rounded-2xl cursor-pointer overflow-hidden transition-all duration-300 hover:border-indigo-500/50 hover:shadow-[0_8px_25px_-5px_rgba(99,102,241,0.25)]"
                 >
                     <div className="p-2.5 relative z-10">
                         <div className="text-[10px] font-serif font-bold text-white/90 truncate tracking-wide">{cheat.title}</div>
                         <div className="flex items-center gap-1 mt-1.5">
                            <div className="h-[3px] bg-white/5 flex-1 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 w-full animate-[shimmer_2s_infinite]"></div>
                            </div>
                         </div>
                     </div>
                     <div className="absolute inset-0 bg-rose-950/90 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 backdrop-blur-md rounded-2xl">
                         <span className="text-[9px] font-mono text-rose-200 font-bold tracking-[0.2em] uppercase">卸下</span>
                     </div>
                 </div>
             ))}
        </div>
    )
}

// --- ACTIVE ELEMENT HUD ---
const ActiveElementHUD: React.FC<{ 
    element: ElementData; 
    onClick: () => void;
    astro?: AstrologyData;
}> = ({ element, onClick, astro }) => {
    const { t, language } = useI18n();
    // Pass language to getRoast
    const { visualTag } = getRoast(element.type, element.percentage, astro, language);
    
    const colorMap: Record<ElementType, string> = {
        [ElementType.Wood]: "text-emerald-400 border-emerald-500/20 shadow-[0_0_25px_rgba(16,185,129,0.1)] bg-emerald-950/10",
        [ElementType.Fire]: "text-orange-400 border-orange-500/20 shadow-[0_0_25px_rgba(249,115,22,0.1)] bg-orange-950/10",
        [ElementType.Earth]: "text-stone-300 border-stone-500/20 shadow-[0_0_25px_rgba(168,162,158,0.1)] bg-stone-900/10",
        [ElementType.Metal]: "text-amber-300 border-amber-500/20 shadow-[0_0_25px_rgba(252,211,77,0.1)] bg-amber-950/10",
        [ElementType.Water]: "text-cyan-300 border-cyan-500/20 shadow-[0_0_25px_rgba(34,211,238,0.1)] bg-cyan-950/10",
    };
    
    const styleClass = colorMap[element.type];

    return (
        <div 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            // Moved down as requested to ensure clear layout
            className="absolute bottom-[6%] left-1/2 -translate-x-1/2 z-20 cursor-pointer pointer-events-auto group touch-manipulation"
        >
            <div className={`
                flex items-center gap-3 px-6 py-3 rounded-full bg-black/85 backdrop-blur-xl border active:scale-95 select-none transition-all duration-300 ease-out transform group-hover:scale-105 group-hover:border-white/30 shadow-[0_15px_35px_rgba(0,0,0,0.6)]
                ${styleClass}
            `}>
                <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shadow-[0_0_10px_currentColor]" />
                <span className="text-xs font-serif font-bold tracking-[0.1em] text-white/95 whitespace-nowrap">
                    {element.name}气场 · {visualTag}
                </span>
                <span className="text-[10px] text-white/40 font-mono pl-2 border-l border-white/10 tracking-wider font-bold">
                    {element.percentage}%
                </span>
            </div>
            
            <div className="absolute top-full left-0 right-0 mt-3 text-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                 <div className="inline-block px-3 py-1 rounded-full bg-black/70 border border-white/5 backdrop-blur-md shadow-md animate-bounce">
                    <span className="text-[8px] font-mono text-white/50 tracking-[0.25em] uppercase">TAP TO INTERVENE / 主动干预调谐</span>
                 </div>
            </div>
        </div>
    )
}

// --- EFFECT CARD (Fixed Interaction & Feedback) ---
const EffectCard: React.FC<{ 
  element: ElementData; 
  onClose: () => void; 
  astro?: AstrologyData;
  onUpdateEnergy?: (delta: Partial<Record<ElementType, number>>, resetTarget?: boolean) => void;
}> = ({ element, onClose, astro, onUpdateEnergy }) => {
    const { t, language } = useI18n();
    
    // Lock Body Scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const { state, visualTag, roast: staticRoast } = getRoast(element.type, element.percentage, astro, language);
    const staticSos = getSOSAction(element.type, element.percentage, language);
    
    const getDailyKey = () => {
        const d = new Date();
        return `wuxing_done_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}_${element.type}`;
    };
    
    const [actionTaken, setActionTaken] = useState(false);
    
    useEffect(() => {
        try {
            const val = localStorage.getItem(getDailyKey());
            if (val === 'true') setActionTaken(true);
        } catch (e) {}
    }, [element.type]);

    const [aiRoast, setAiRoast] = useState<string | null>(null);
    const [aiSos, setAiSos] = useState<any | null>(null);
    const [buttonState, setButtonState] = useState<'idle' | 'loading' | 'success'>('idle');
    const [showSuccessAnim, setShowSuccessAnim] = useState(false);
    
    useEffect(() => {
        // Reset AI roast on language change or element change
        setAiRoast(null);
        setAiSos(null);

        const fetchAI = async () => {
            const result = await fetchElementAnalysis(
                element, 
                astro, 
                { state, sosAction: staticSos },
                language
            );
            if (result) {
                if (result.roast) setAiRoast(result.roast);
                if (result.sos && result.sos.instruction) setAiSos(result.sos);
            }
        };
        fetchAI();
    }, [element.type, language]); 

    const displayRoast = aiRoast || staticRoast;
    
    const displaySos = (staticSos) ? {
        ...staticSos,
        hint: aiSos?.hint || staticSos.hint,
        instruction: aiSos?.instruction || staticSos.instruction,
        buttonText: aiSos?.buttonText || staticSos.buttonText
    } : null;

    const THEMES: Record<ElementType, any> = {
        [ElementType.Wood]: { bg: "bg-emerald-600", text: "text-emerald-400", border: "border-emerald-500/30" },
        [ElementType.Fire]: { bg: "bg-orange-600", text: "text-orange-400", border: "border-orange-500/30" },
        [ElementType.Earth]: { bg: "bg-stone-500", text: "text-stone-300", border: "border-stone-500/30" },
        [ElementType.Metal]: { bg: "bg-amber-500", text: "text-amber-300", border: "border-amber-500/30" },
        [ElementType.Water]: { bg: "bg-cyan-600", text: "text-cyan-300", border: "border-cyan-500/30" }
    };

    const theme = THEMES[element.type];

    // --- INTERACTION HANDLER ---
    const handleAction = () => {
        if (actionTaken || buttonState !== 'idle') return;
        
        setButtonState('loading');
        
        // Haptic check
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);

        setTimeout(() => {
            // 1. Execute Energy Update
            if (displaySos && onUpdateEnergy) {
                onUpdateEnergy(displaySos.effect, displaySos.resetTarget);
            }

            // 2. Save State
            setActionTaken(true);
            try { localStorage.setItem(getDailyKey(), 'true'); } catch(e) {}

            // 3. Trigger Success Visuals
            setButtonState('success');
            setShowSuccessAnim(true);
            
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([50, 50, 50]);

        }, 1200);
    };

    return (
        <div 
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-auto"
            onClick={(e) => { 
                e.stopPropagation(); 
                // Only close if not interacting with content
                onClose(); 
            }}
        >
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md animate-in fade-in duration-300" />
            
            <div 
                className="relative w-full max-w-sm bg-[#0f0f0f] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()} 
            >
                {/* Close Button - HIT AREA EXPANDED */}
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        onClose(); 
                    }}
                    className="absolute top-4 right-4 z-[60] w-10 h-10 rounded-full bg-black/40 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md border border-white/10 active:scale-90 hover:rotate-90 select-none transition-all duration-200 ease-out"
                >
                    <span className="text-xl leading-none font-light">✕</span>
                </button>

                {/* --- HEADER --- */}
                <div className="h-32 w-full relative overflow-hidden bg-[#050505] shrink-0">
                     <div className={`absolute inset-0 opacity-40 ${theme.bg}`}></div>
                     <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] to-transparent"></div>
                     
                     <div className="absolute bottom-5 left-6">
                         <h2 className="text-4xl font-black text-white tracking-wide italic drop-shadow-md">{element.name}</h2>
                         <div className="flex items-center gap-2 mt-1">
                             <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/10 ${theme.text} border border-white/5`}>
                                {visualTag}
                             </span>
                             <span className="text-[10px] text-white/50 font-mono tracking-wider">
                                {element.percentage}% {t('card_energy')}
                             </span>
                         </div>
                     </div>
                </div>

                {/* --- CONTENT --- */}
                <div className="p-6 overflow-y-auto scrollbar-hide flex-1 relative">
                    
                    {/* Roast */}
                    <div className={`mb-6 relative bg-white/[0.03] p-5 rounded-xl border ${theme.border}`}>
                        <div className="absolute top-0 left-0 w-1 h-full bg-white/10 rounded-l-xl"></div>
                        <p className="text-sm font-bold text-white/90 leading-relaxed italic tracking-wide">
                            "{displayRoast}"
                        </p>
                    </div>

                    {/* Stats Bar */}
                    <div className="mb-8">
                        <div className="flex justify-between text-[10px] text-white/40 mb-2 uppercase tracking-wider">
                            <span>{t('card_current_level')}</span>
                            <span>{element.percentage}/100</span>
                        </div>
                        <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <div 
                                className={`h-full ${theme.bg} transition-all duration-1000 ease-out relative`} 
                                style={{ width: `${element.percentage}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                            </div>
                        </div>
                    </div>

                    {/* SOS ACTION AREA */}
                    {displaySos && (
                        <div className="mt-auto pt-4 border-t border-white/5">
                            <div className="flex items-center gap-2 mb-4">
                                <Lightbulb size={18} className="animate-pulse text-white/80" />
                                <span className={`text-xs font-bold ${theme.text} uppercase tracking-wider`}>{displaySos.hint}</span>
                            </div>
                            
                            <div className="bg-[#151515] rounded-xl p-4 border border-white/5 mb-6 shadow-inner">
                                <p className="text-sm text-white font-medium leading-relaxed">
                                    {displaySos.instruction}
                                </p>
                            </div>

                            {/* Main Interaction Button */}
                            <button 
                                onClick={handleAction}
                                disabled={actionTaken || buttonState !== 'idle'}
                                className={`
                                    w-full py-4 rounded-xl relative overflow-hidden transition-all duration-300 shadow-lg group
                                    ${(actionTaken || buttonState === 'success')
                                        ? 'bg-white/5 border border-white/10 cursor-default' 
                                        : `${theme.bg} hover:brightness-110 active:scale-95 select-none transition-all duration-200 ease-out active:brightness-125`
                                    }
                                `}
                            >
                                {buttonState === 'loading' ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                                        <span className="text-xs font-bold text-white uppercase tracking-widest">{t('card_processing')}</span>
                                    </div>
                                ) : (actionTaken || buttonState === 'success') ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-emerald-400 font-bold text-lg">✓</span>
                                        <span className="text-xs font-bold text-white/50 uppercase tracking-widest">{t('card_completed')}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-xs font-black text-white uppercase tracking-[0.2em]">
                                            {displaySos.buttonText}
                                        </span>
                                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
                                    </div>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* SUCCESS OVERLAY (Absolute inside Card) */}
                {showSuccessAnim && (
                    <div className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-[#0a0a0a]/95 backdrop-blur-xl animate-in fade-in duration-300 p-8 text-center">
                         
                         <div className="relative mb-8 scale-150">
                             <div className={`absolute inset-0 ${theme.bg} blur-3xl opacity-30 animate-pulse`}></div>
                            
                             <div className="relative z-10 w-24 h-24 rounded-full bg-[#111] border border-white/10 flex items-center justify-center animate-in zoom-in duration-500">
                                 <Zap size={50} fill="currentColor" className="text-amber-300 animate-[bounce_1s_infinite]" />
                             </div>
                             
                             <div className="absolute inset-0 border-2 border-dashed border-white/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
                             <div className="absolute -inset-2 border border-white/5 rounded-full animate-[ping_2s_infinite]"></div>
                         </div>
                         
                         <h3 className="text-2xl font-black text-white uppercase tracking-[0.2em] mb-2 animate-in slide-in-from-bottom-2 duration-500">
                             {t('card_energy_injected')}
                         </h3>
                         <p className="text-[10px] text-white/40 font-mono tracking-[0.3em] uppercase mb-10 animate-in slide-in-from-bottom-3 duration-700">
                             {t('card_system_updated')} · {element.name.toUpperCase()} +5
                         </p>

                         <button 
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            className="px-10 py-3 border border-white/20 rounded-full text-xs font-bold text-white hover:bg-white hover:text-black uppercase tracking-widest active:scale-95 select-none transition-all duration-200 ease-out"
                         >
                             {t('card_close')}
                         </button>
                    </div>
                )}
            </div>
        </div>
    );
}

const Dashboard: React.FC<DashboardProps> = ({ 
    activeElement, 
    onNext, 
    onPrev, 
    showDetail, 
    onOpenDetail, 
    onCloseDetail, 
    onOpenCheatSheet,
    activeCheats,
    onUnequipCheat,
    astrologyData,
    onUpdateEnergy,
    userName
}) => {
  const { t } = useI18n();
  return (
    <>
      <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden font-sans">
        
        {/* Updated Header with Premium Layout */}
        <Header userName={userName} astrologyData={astrologyData} />

        <ActiveCheatsHUD cheats={activeCheats} onUnequip={onUnequipCheat} />

        {/* Navigation Zones (Sleek Visible Glass Chevrons) */}
        <button 
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="absolute left-4 top-[48%] -translate-y-1/2 z-40 pointer-events-auto flex items-center justify-center w-10 h-10 rounded-full border border-white/5 bg-black/45 hover:bg-white/10 hover:border-white/20 text-white/40 hover:text-white transition-all duration-300 backdrop-blur-md active:scale-95 select-none"
            aria-label="Previous element"
        >
            <span className="text-sm font-light">←</span>
        </button>
        <button 
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="absolute right-4 top-[48%] -translate-y-1/2 z-40 pointer-events-auto flex items-center justify-center w-10 h-10 rounded-full border border-white/5 bg-black/45 hover:bg-white/10 hover:border-white/20 text-white/40 hover:text-white transition-all duration-300 backdrop-blur-md active:scale-95 select-none"
            aria-label="Next element"
        >
            <span className="text-sm font-light">→</span>
        </button>

        {activeElement && !showDetail && (
            <ActiveElementHUD 
                element={activeElement} 
                onClick={onOpenDetail} 
                astro={astrologyData}
            />
        )}
      </div>

      {showDetail && activeElement && (
        <EffectCard 
            element={activeElement} 
            onClose={onCloseDetail} 
            astro={astrologyData}
            onUpdateEnergy={onUpdateEnergy}
        />
      )}
    </>
  );
};

export default Dashboard;
