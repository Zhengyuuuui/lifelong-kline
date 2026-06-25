import React, { useState } from 'react';
import { TimelineSegment } from '../types';
import { X, ArrowUpRight, BarChart2, CheckCircle2, Sparkles, Cat, Rocket } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  segment: TimelineSegment | null;
  onClose: () => void;
}

const InfoSheet: React.FC<Props> = ({ segment, onClose }) => {
  const { t } = useLanguage();
  const [isSuccess, setIsSuccess] = useState(false);

  if (!segment) return null;

  // Visual variants based on segment type
  const isGood = segment.type === 'good';
  const isBad = segment.type === 'bad';
  const isWarn = segment.type === 'warn';
  const isSlow = segment.type === 'slow';

  // Define color styles
  let accentColor = 'text-slate-400';
  let barColor = 'bg-slate-400';
  let buttonColor = 'bg-slate-500';
  let shadowColor = 'shadow-[0_4px_20px_rgba(148,163,184,0.3)]';

  // High-End Titles & Cat Names
  let title = t('info.neutral.title');
  let catName = t('radar.cat.neutral');
  let catIcon = <Cat size={14} strokeWidth={1.8} aria-hidden="true" />;
  let description = t('info.neutral.desc');

  if (isGood) {
      accentColor = 'text-emerald-400';
      barColor = 'bg-emerald-400';
      buttonColor = 'bg-emerald-500 hover:bg-emerald-400';
      shadowColor = 'shadow-[0_4px_20px_rgba(52,211,153,0.3)]';
      title = t('info.good.title');
      catName = t('radar.cat.good');
      catIcon = <Rocket size={14} strokeWidth={1.8} aria-hidden="true" />;
      description = t('info.good.desc');
  } else if (isBad || isWarn) { // Combine Bad & Warn under "Avoid" concept
      accentColor = isBad ? 'text-red-400' : 'text-orange-400';
      barColor = isBad ? 'bg-red-400' : 'bg-orange-400';
      buttonColor = isBad ? 'bg-red-500 hover:bg-red-400' : 'bg-orange-500 hover:bg-orange-400';
      shadowColor = isBad ? 'shadow-[0_4px_20px_rgba(239,68,68,0.3)]' : 'shadow-[0_4px_20px_rgba(251,146,60,0.3)]';
      title = t('info.warn.title');
      catName = t('radar.cat.warn');
      catIcon = <Cat size={14} strokeWidth={1.8} aria-hidden="true" />;
      description = t('info.warn.desc');
  } else if (isSlow) {
      accentColor = 'text-indigo-400';
      barColor = 'bg-indigo-400';
      buttonColor = 'bg-indigo-500 hover:bg-indigo-400';
      shadowColor = 'shadow-[0_4px_20px_rgba(129,140,248,0.3)]';
      title = t('info.slow.title');
      catName = t('radar.cat.slow');
      catIcon = <Cat size={14} strokeWidth={1.8} aria-hidden="true" />;
      description = t('info.slow.desc');
  }

  const handleAction = () => {
      setIsSuccess(true);
      setTimeout(() => {
          setIsSuccess(false);
          onClose();
      }, 1500); // Wait for animation
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto transition-opacity duration-300" 
        onClick={onClose} 
      />
      
      {/* Sheet */}
      <div className="relative w-full max-w-md bg-[#161822]/95 backdrop-blur-[50px] rounded-t-[32px] border-t border-white/10 p-6 pointer-events-auto animate-[slide-up-spring_0.5s_ease-out] shadow-[0_-10px_60px_rgba(0,0,0,0.7)] transition-transform duration-500">
        
        {/* Success Overlay Effect */}
        {isSuccess && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#161822] rounded-t-[32px] animate-fade-in">
                <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-3xl animate-pulse rounded-full" />
                    <Sparkles size={60} className="text-emerald-400 relative z-10 animate-[spin_3s_linear_infinite]" />
                    <CheckCircle2 size={60} className="text-emerald-400 absolute inset-0 z-10 animate-pop-success" />
                </div>
                <h4 className="text-xl font-bold text-white mt-6 tracking-wide animate-slide-up-fade">{t('sheet.success')}</h4>
                <p className="text-[12px] text-white/50 mt-2">{t('sheet.successSub')}</p>
            </div>
        )}

        {/* Drag Handle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/20 rounded-full" />

        {/* Header */}
        <div className="flex justify-between items-start mb-6 mt-2">
          <div>
            <div className="flex items-center gap-2 mb-2">
               <span className={`text-[12px] font-bold font-mono tracking-wider ${accentColor} border border-current px-1.5 py-0.5 rounded`}>
                 {String(segment.hour).padStart(2,'0')}:00 - {String(segment.hour + 1).padStart(2,'0')}:00
               </span>
               <span className={`inline-flex items-center gap-1.5 text-[13px] font-bold text-white tracking-wide ${isGood ? 'animate-pulse' : ''}`}>
                 <span className={accentColor}>{catIcon}</span>
                 {catName}
               </span>
            </div>
            <h3 className="text-3xl font-bold text-white tracking-tight">{title}</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 active:scale-95 select-none transition-all duration-200 ease-out">
            <X size={18} className="text-white/60" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-5">
          
          {/* Analysis Card */}
          <div className="bg-white/5 rounded-2xl p-5 border border-white/5 flex justify-between items-center relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5">
                 <BarChart2 size={80} />
             </div>
             <div className="flex flex-col gap-1 relative z-10">
                <div className="flex items-center gap-2 text-white/50 text-xs font-medium uppercase tracking-wider">
                  <BarChart2 size={12} />
                  {t('sheet.energyIndex')}
                </div>
                <div className="h-1.5 w-32 bg-white/10 rounded-full mt-2 overflow-hidden">
                    <div className={`h-full rounded-full ${barColor} shadow-[0_0_10px_currentColor]`} style={{width: `${segment.score}%`}} />
                </div>
             </div>
             <span className="text-4xl font-bold text-white font-mono relative z-10">{segment.score}</span>
          </div>

          <p className="text-[14px] text-white/80 leading-relaxed px-1 font-medium">
            {description}
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-white/5">
             <button onClick={onClose} className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 active:scale-95 select-none transition-all duration-200 ease-out rounded-full text-[13px] font-medium text-white/60">
                {t('sheet.wait')}
             </button>
             <button 
                onClick={handleAction}
                className={`flex-1 py-3.5 ${buttonColor} active:scale-95 select-none transition-all duration-200 ease-out rounded-full text-[13px] font-bold text-white flex items-center justify-center gap-2 ${shadowColor}`}
             >
                {t('sheet.go')} <ArrowUpRight size={15} strokeWidth={2.5} />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoSheet;
