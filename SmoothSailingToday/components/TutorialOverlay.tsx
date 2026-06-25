import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Step {
  targetId: string;
  titleKey: string;
  contentKey: string;
  position: 'top' | 'bottom' | 'center';
}

interface Props {
  onComplete: () => void;
}

const STEPS: Step[] = [
  {
    targetId: 'tutorial-radar',
    titleKey: 'tutorial.step1.title',
    contentKey: 'tutorial.step1.content',
    position: 'bottom'
  },
  {
    targetId: 'tutorial-summary',
    titleKey: 'tutorial.step2.title',
    contentKey: 'tutorial.step2.content',
    position: 'bottom'
  },
  {
    targetId: 'tutorial-needs',
    titleKey: 'tutorial.step3.title',
    contentKey: 'tutorial.step3.content',
    position: 'top'
  },
  {
    targetId: 'tutorial-dashboard',
    titleKey: 'tutorial.step4.title',
    contentKey: 'tutorial.step4.content',
    position: 'top'
  },
  {
    targetId: 'tutorial-windows',
    titleKey: 'tutorial.step5.title',
    contentKey: 'tutorial.step5.content',
    position: 'top'
  }
];

const TutorialOverlay: React.FC<Props> = ({ onComplete }) => {
  const { t } = useLanguage();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const currentStep = STEPS[currentStepIndex];

  useEffect(() => {
    // Prevent scrolling on body while tutorial is active
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const updatePosition = () => {
      const element = document.getElementById(currentStep.targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
           const newRect = element.getBoundingClientRect();
           setRect(newRect);
        }, 300); // Wait for scroll
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [currentStepIndex, currentStep.targetId]);

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  if (!rect) return null;

  // Calculate Tooltip Position
  const isTop = currentStep.position === 'top';
  const tooltipStyle: React.CSSProperties = {
     position: 'absolute',
     left: '50%',
     transform: 'translateX(-50%)',
     [isTop ? 'bottom' : 'top']: isTop ? `calc(100% - ${rect.top}px + 20px)` : `${rect.bottom + 20}px`,
     width: '90%',
     maxWidth: '360px',
     zIndex: 100
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden cursor-pointer" onClick={handleNext}>
      {/* 1. Dark Backdrop with Cutout via ClipPath is tricky, using mixed borders is easier or SVG mask */}
      {/* Using a huge box-shadow on the highlight box is the simplest implementation of a spotlight */}
      <div 
         className="absolute transition-all duration-500 ease-in-out border border-white/20 rounded-[20px] pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.85)]"
         style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.85), 0 0 30px rgba(0,0,0,0.5) inset'
         }}
      >
         {/* Animated Corner Borders for Focus Effect */}
         <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg -mt-0.5 -ml-0.5 animate-pulse" />
         <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg -mt-0.5 -mr-0.5 animate-pulse" />
         <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg -mb-0.5 -ml-0.5 animate-pulse" />
         <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-lg -mb-0.5 -mr-0.5 animate-pulse" />
      </div>

      {/* 2. Content Card */}
      <div style={tooltipStyle} className="transition-all duration-500 ease-out" onClick={(e) => e.stopPropagation()}>
        <div className="glass-panel-premium rounded-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-white/10 relative overflow-hidden animate-scale-in">
           {/* Decorative bg */}
           <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/20 blur-[50px] rounded-full" />
           
           <div className="relative z-10">
              <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                     <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                        {currentStepIndex + 1}
                     </span>
                     <h3 className="text-lg font-bold text-white tracking-wide">{t(currentStep.titleKey)}</h3>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onComplete(); }} className="text-white/40 hover:text-white active:scale-95 select-none transition-all duration-200 ease-out">
                      <X size={18} />
                  </button>
              </div>
              
              <p className="text-[13px] text-white/70 leading-relaxed mb-6">
                  {t(currentStep.contentKey)}
              </p>

              <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                      {STEPS.map((_, i) => (
                          <div 
                            key={i} 
                            className={`h-1 rounded-full transition-all duration-300 ${i === currentStepIndex ? 'w-6 bg-emerald-400' : 'w-1.5 bg-white/20'}`} 
                          />
                      ))}
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 select-none transition-all duration-200 ease-out"
                  >
                     {currentStepIndex === STEPS.length - 1 ? t('tutorial.start') : t('tutorial.next')}
                     {currentStepIndex === STEPS.length - 1 ? <Check size={14} /> : <ChevronRight size={14} />}
                  </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;