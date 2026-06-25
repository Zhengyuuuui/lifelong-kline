import React, { useState, useEffect } from 'react';
import { ActionPlan } from '../types';
import { X, CheckCircle2, Circle, Clock, ArrowRight, PartyPopper } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: ActionPlan | null;
  isLoading: boolean;
}

const ActionPlanSheet: React.FC<Props> = ({ isOpen, onClose, data, isLoading }) => {
  const { t } = useLanguage();
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  useEffect(() => {
      if(!isOpen) setCheckedSteps({});
  }, [isOpen]);

  const toggleStep = (id: string) => {
      setCheckedSteps(prev => ({...prev, [id]: !prev[id]}));
  };

  const progress = data ? (Object.values(checkedSteps).filter(Boolean).length / data.steps.length) * 100 : 0;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className={`fixed inset-x-0 bottom-0 z-[70] w-full h-[80vh] bg-[#10121A]/95 backdrop-blur-[40px] rounded-t-[32px] border-t border-white/10 flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.8)] transition-transform duration-500 ease-sheet ${
          isOpen ? 'translate-y-0' : 'translate-y-[100%] pointer-events-none'
      }`}>
        
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/20 rounded-full" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-6 pb-4 border-b border-white/5">
           <div className="flex flex-col gap-1">
               <h3 className="text-[18px] font-bold text-white tracking-wide flex items-center gap-2">
                 {isLoading ? t('plan.loading') : data?.title || '行动清单'}
                 {!isLoading && data && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20">{data.totalTime}</span>}
               </h3>
               <p className="text-[11px] text-white/40">{t('plan.mode')}</p>
           </div>
           <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 active:scale-95 select-none transition-all duration-200 ease-out">
              <X size={18} className="text-white/60" />
           </button>
        </div>

        {/* Progress Bar (if loaded) */}
        {!isLoading && data && (
            <div className="h-1 w-full bg-white/5">
                <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
                <div className="flex flex-col items-center py-20 gap-4">
                    <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    <p className="text-[12px] text-white/40 animate-pulse">{t('plan.analyzing')}</p>
                </div>
            ) : data ? (
                <div className="space-y-4 animate-slide-up-fade">
                    {data.steps.map((step, idx) => {
                        const isChecked = checkedSteps[step.id];
                        return (
                            <div 
                                key={step.id} 
                                onClick={() => toggleStep(step.id)}
                                className={`group p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                                    isChecked 
                                    ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60' 
                                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                                }`}
                            >
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    isChecked ? 'border-emerald-500 bg-emerald-500 text-black' : 'border-white/20 text-transparent group-hover:border-white/40'
                                }`}>
                                    <CheckCircle2 size={14} fill="currentColor" className={isChecked ? 'text-white' : ''} />
                                </div>
                                
                                <div className="flex-1">
                                    <div className={`text-[14px] font-medium transition-all ${isChecked ? 'text-white/40 line-through' : 'text-white'}`}>
                                        {step.task}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-white/30 font-mono">
                                        <Clock size={10} /> {step.time}
                                    </div>
                                </div>

                                {!isChecked && (
                                    <div className="text-white/10 group-hover:text-white/30 transition-colors">
                                        <ArrowRight size={16} />
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    {progress === 100 && (
                        <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-center animate-scale-in">
                            <PartyPopper size={24} className="mx-auto mb-2 text-emerald-300" aria-hidden="true" />
                            <h4 className="text-[16px] font-bold text-white mb-1">{t('plan.great')}</h4>
                            <p className="text-[12px] text-white/60">{t('plan.doneMsg')}</p>
                            <button onClick={onClose} className="mt-4 px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-[12px] font-bold rounded-full active:scale-95 select-none transition-all duration-200 ease-out">
                                {t('plan.finish')}
                            </button>
                        </div>
                    )}
                </div>
            ) : null}
        </div>

      </div>
    </>
  );
};

export default ActionPlanSheet;
