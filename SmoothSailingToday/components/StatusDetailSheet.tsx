import React, { useState } from 'react';
import { DailyFortuneOverview, UserProfile } from '../types';
import { X, ArrowUpRight, ShieldCheck, Compass, Palette, Zap, Sparkles, Binary, Cat } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  overview: DailyFortuneOverview | undefined;
  userProfile: UserProfile | null;
}

// Status avatars are bundled locally so they work reliably in the iOS app.
const CAT_IMAGES = {
  rocket: "/status-avatars/grinning-cat.png",
  stable: "/status-avatars/cat.png",
  neutral: "/status-avatars/kissing-cat.png",
  avoid: "/status-avatars/weary-cat.png"
};

const StatusDetailSheet: React.FC<Props> = ({ isOpen, onClose, overview, userProfile }) => {
  const { t } = useLanguage();
  const [imgError, setImgError] = useState(false);
  
  // Reset error when opened or overview changes
  React.useEffect(() => {
      setImgError(false);
  }, [isOpen, overview]);

  if (!overview) return null;

  // Determine Visual Style based on Level
  let theme = {
      bg: 'from-[#0F111A] to-[#0F111A]',
      accent: 'text-white',
      border: 'border-white/10',
      shadow: 'shadow-none',
      cat: CAT_IMAGES.stable,
      title: t('status.level.neutral.title'),
      subtext: t('status.level.neutral.sub')
  };

  if (overview.level === 'ROCKET') {
      theme = {
          bg: 'from-emerald-900/30 to-[#0F111A]',
          accent: 'text-emerald-400',
          border: 'border-emerald-500/30',
          shadow: 'shadow-[0_0_50px_rgba(16,185,129,0.1)]',
          cat: CAT_IMAGES.rocket,
          title: t('status.level.rocket.title'),
          subtext: t('status.level.rocket.sub')
      };
  } else if (overview.level === 'STABLE') {
      theme = {
          bg: 'from-blue-900/30 to-[#0F111A]',
          accent: 'text-blue-400',
          border: 'border-blue-500/30',
          shadow: 'shadow-[0_0_50px_rgba(59,130,246,0.1)]',
          cat: CAT_IMAGES.stable,
          title: t('status.level.stable.title'),
          subtext: t('status.level.stable.sub')
      };
  } else if (overview.level === 'AVOID') {
      theme = {
          bg: 'from-rose-900/30 to-[#0F111A]',
          accent: 'text-rose-400',
          border: 'border-rose-500/30',
          shadow: 'shadow-[0_0_50px_rgba(244,63,94,0.1)]',
          cat: CAT_IMAGES.avoid,
          title: t('status.level.avoid.title'),
          subtext: t('status.level.avoid.sub')
      };
  } else {
      theme = {
          bg: 'from-indigo-900/30 to-[#0F111A]',
          accent: 'text-indigo-400',
          border: 'border-indigo-500/30',
          shadow: 'shadow-[0_0_50px_rgba(99,102,241,0.1)]',
          cat: CAT_IMAGES.neutral,
          title: t('status.level.neutral.title'),
          subtext: t('status.level.neutral.sub')
      };
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-md z-[80] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div 
        className={`fixed inset-x-0 bottom-0 z-[80] w-full h-[90vh] bg-gradient-to-b ${theme.bg} backdrop-blur-[40px] rounded-t-[40px] border-t border-white/10 flex flex-col transition-transform duration-500 ease-sheet ${
            isOpen ? 'translate-y-0' : 'translate-y-[100%] pointer-events-none'
        }`}
      >
        
        {/* Drag Handle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/20 rounded-full" />

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
            
            {/* 1. Hero Section */}
            <div className="relative pt-16 pb-8 px-6 flex flex-col items-center text-center">
                {/* Close Button */}
                <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-all z-20">
                    <X size={20} className="text-white/60" />
                </button>

                {/* Score & Avatar */}
                <div className="relative mb-6">
                     <div className={`w-40 h-40 rounded-full border-2 ${theme.border} flex items-center justify-center bg-white/5 relative z-10 ${theme.shadow}`}>
                        {imgError ? (
                            <div className="text-white/75 animate-bounce select-none">
                                <Cat size={76} strokeWidth={1.5} aria-hidden="true" />
                            </div>
                        ) : (
                            <img 
                                src={theme.cat} 
                                alt="Status Cat" 
                                onError={() => setImgError(true)}
                                className="w-28 h-28 object-contain drop-shadow-2xl animate-[float_4s_ease-in-out_infinite]" 
                            />
                        )}
                     </div>
                     {/* Score Badge */}
                     <div className={`absolute -bottom-2 -right-2 px-4 py-1.5 rounded-full bg-[#12141E] border ${theme.border} flex items-center gap-1.5 z-20`}>
                        <Binary size={12} className={theme.accent} />
                        <span className={`text-[16px] font-bold font-mono ${theme.accent}`}>{overview.score}</span>
                     </div>
                </div>

                {/* Title */}
                <h2 className="text-3xl font-bold text-white tracking-tight mb-2">{theme.title}</h2>
                <div className={`text-[11px] font-bold tracking-[0.2em] uppercase ${theme.accent} opacity-80 mb-6`}>
                    {theme.subtext}
                </div>

                {/* Summary Box */}
                <div className="relative w-full max-w-sm glass-card-sm p-4 rounded-2xl border border-white/10">
                    <Sparkles size={16} className={`absolute -top-2 -left-2 ${theme.accent}`} />
                    <p className="text-[14px] text-white/90 leading-relaxed font-medium">
                        "{overview.summary}"
                    </p>
                </div>
            </div>

            {/* 2. Scientific Analysis (Bazi Reasoning) */}
            <div className="px-6 pb-8">
                <div className="flex items-center gap-2 mb-4 text-[12px] font-bold text-white/40 uppercase tracking-wider">
                    <ShieldCheck size={14} /> {t('status.reason')}
                </div>
                <div className="glass-card-frost p-6 rounded-[24px] border border-white/5 relative overflow-hidden group">
                    <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity ${theme.accent}`}>
                        <Binary size={120} />
                    </div>
                    
                    <div className="relative z-10 space-y-4">
                        <div className="flex gap-4 items-start">
                             <div className="w-1 rounded-full bg-white/20 self-stretch shrink-0" />
                             <p className="text-[13px] text-white/80 leading-relaxed font-light">
                                 {overview.reasoning}
                             </p>
                        </div>
                        
                        {/* Energy Components (Mini Visualization) */}
                        <div className="grid grid-cols-4 gap-2 pt-2">
                             <EnergyBar label="天时" value={overview.energy_components.heaven} color="bg-indigo-400" />
                             <EnergyBar label="地利" value={overview.energy_components.earth} color="bg-emerald-400" />
                             <EnergyBar label="人和" value={overview.energy_components.human} color="bg-rose-400" />
                             <EnergyBar label="自强" value={overview.energy_components.self} color="bg-amber-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Lucky Elements */}
            <div className="px-6 pb-24">
                 <div className="flex items-center gap-2 mb-4 text-[12px] font-bold text-white/40 uppercase tracking-wider">
                    <Compass size={14} /> {t('status.guide')}
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div className="glass-card-sm p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60">
                             <Palette size={18} />
                         </div>
                         <div>
                             <div className="text-[10px] text-white/40 uppercase">{t('status.color')}</div>
                             <div className="text-[14px] font-bold text-white">{overview.lucky_color}</div>
                         </div>
                     </div>
                     <div className="glass-card-sm p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60">
                             <Compass size={18} />
                         </div>
                         <div>
                             <div className="text-[10px] text-white/40 uppercase">{t('status.direction')}</div>
                             <div className="text-[14px] font-bold text-white">{overview.lucky_direction}</div>
                         </div>
                     </div>
                </div>
            </div>

        </div>

        {/* Footer Action */}
        <div className="absolute bottom-0 inset-x-0 p-6 pt-0 bg-gradient-to-t from-[#0F111A] to-transparent pointer-events-none">
             <button 
                onClick={onClose}
                className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm backdrop-blur-md shadow-lg pointer-events-auto active:scale-95 select-none transition-all duration-200 ease-out border border-white/10"
             >
                {t('status.close')}
             </button>
        </div>

      </div>
    </>
  );
};

const EnergyBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div className="flex flex-col items-center gap-1.5">
        <div className="h-16 w-1.5 bg-white/5 rounded-full relative overflow-hidden">
            <div className={`absolute bottom-0 left-0 w-full rounded-full ${color} transition-all duration-1000`} style={{ height: `${value}%` }} />
        </div>
        <span className="text-[10px] text-white/40 font-medium">{label}</span>
    </div>
);

export default StatusDetailSheet;
