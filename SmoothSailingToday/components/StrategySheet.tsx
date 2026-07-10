import React from 'react';
import { createPortal } from 'react-dom';
import { StrategyKit } from '../types';
import { X, Lightbulb, ShieldAlert, Target } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: StrategyKit | null;
  isLoading: boolean;
}

const StrategySheet: React.FC<Props> = ({ isOpen, onClose, data, isLoading }) => {
  const { t } = useLanguage();
  const sheet = (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[130] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className={`fixed inset-x-0 bottom-0 z-[140] w-full max-h-[85vh] min-h-0 overflow-hidden bg-[#12141E]/95 backdrop-blur-[40px] rounded-t-[32px] border-t border-white/10 flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.8)] transition-transform duration-500 ease-sheet ${
          isOpen ? 'translate-y-0' : 'translate-y-[100%] pointer-events-none'
      }`}>
        
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/20 rounded-full" />

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-6 py-6 pb-2">
           <h3 className="text-[18px] font-bold text-white tracking-wide">
             {isLoading ? t('strategy.loading') : data?.title || '行动锦囊'}
           </h3>
           <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 active:scale-95 select-none transition-all duration-200 ease-out">
              <X size={18} className="text-white/60" />
           </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 pt-4 pb-12 smooth-scroll" style={{ touchAction: 'pan-y' }}>
            {isLoading ? (
                <div className="flex flex-col items-center py-10 gap-4">
                    <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    <p className="text-[12px] text-white/40 animate-pulse">AI 正在根据天时推算最佳战术...</p>
                </div>
            ) : data ? (
                <div className="space-y-6 animate-slide-up-fade">
                    
                    {/* Main Tactic */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 relative overflow-hidden">
                        <div className="flex items-start gap-3 relative z-10">
                            <Target className="text-indigo-300 mt-1 shrink-0" size={20} />
                            <div>
                                <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-1">{t('strategy.core')}</div>
                                <div className="text-[16px] font-bold text-white leading-snug">{data.mainTactic}</div>
                            </div>
                        </div>
                    </div>

                    {/* Action Bullets */}
                    <div className="space-y-3">
                         <div className="flex items-center gap-2 text-[13px] font-medium text-white/50">
                            <Lightbulb size={14} /> {t('strategy.steps')}
                         </div>
                         {data.bullets.map((b, i) => (
                             <div key={i} className="flex gap-3 p-4 bg-white/5 rounded-xl border border-white/5">
                                 <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-[10px] font-bold text-white/60 shrink-0">{i+1}</span>
                                 <p className="text-[13px] text-white/90 leading-relaxed">{b}</p>
                             </div>
                         ))}
                    </div>

                    {/* Warning */}
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-3 items-start">
                        <ShieldAlert className="text-rose-400 shrink-0 mt-0.5" size={16} />
                        <div>
                            <div className="text-[11px] font-bold text-rose-300 mb-0.5">{t('strategy.warning')}</div>
                            <div className="text-[12px] text-rose-100/80 leading-relaxed">{data.warning}</div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>

      </div>
    </>
  );

  return typeof document === 'undefined' ? sheet : createPortal(sheet, document.body);
};

export default StrategySheet;
