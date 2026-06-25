

import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../utils/i18nContext';

interface TutorialOverlayProps {
    onComplete: () => void;
}

interface Step {
    target: { top?: string; left?: string; right?: string; bottom?: string; width: string; height: string };
    title: string;
    description: string;
    position: 'center' | 'top' | 'bottom' | 'left' | 'right';
    highlight?: boolean;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onComplete }) => {
    const { t } = useI18n();
    const [stepIndex, setStepIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        timerRef.current = setTimeout(() => setIsVisible(true), 500);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const steps: Step[] = [
        // Step 0: Welcome / Intro
        {
            target: { top: '50%', left: '50%', width: '0px', height: '0px' }, // Hidden spot
            title: t('tut_step_0_title'),
            description: t('tut_step_0_desc'),
            position: 'center',
            highlight: false
        },
        // Step 1: The 3D Scene (Center)
        {
            target: { top: '40%', left: '50%', width: '280px', height: '280px' },
            title: t('tut_step_1_title'),
            description: t('tut_step_1_desc'),
            position: 'bottom',
            highlight: true
        },
        // Step 2: Interaction
        {
            target: { top: '40%', left: '50%', width: '100%', height: '300px' },
            title: t('tut_step_2_title'),
            description: t('tut_step_2_desc'),
            position: 'bottom',
            highlight: true
        },
        // Step 3: HUD (Bottom Center)
        {
            target: { bottom: '30%', left: '50%', width: '220px', height: '60px' },
            title: t('tut_step_3_title'),
            description: t('tut_step_3_desc'),
            position: 'top',
            highlight: true
        },
        // Step 4: Life Book (Top Right)
        {
            target: { top: '4rem', right: '2rem', width: '80px', height: '100px' }, // Approx position of book
            title: t('tut_step_4_title'),
            description: t('tut_step_4_desc'),
            position: 'bottom',
            highlight: true
        },
        // Step 5: Inventory (Scroll Down)
        {
            target: { bottom: '5%', left: '50%', width: '100%', height: '100px' },
            title: t('tut_step_5_title'),
            description: t('tut_step_5_desc'),
            position: 'top',
            highlight: true
        }
    ];

    const currentStep = steps[stepIndex];
    const isLastStep = stepIndex === steps.length - 1;

    const handleNext = () => {
        if (isLastStep) {
            setIsVisible(false);
            timerRef.current = setTimeout(onComplete, 500);
        } else {
            setStepIndex(prev => prev + 1);
        }
    };

    return (
        <div className={`fixed inset-0 z-[999] transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            
            {/* --- SPOTLIGHT EFFECT --- */}
            {/* We use a div with a massive box-shadow to create the 'hole' effect */}
            <div 
                className="absolute transition-all duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] rounded-full pointer-events-none"
                style={{
                    top: currentStep.target.top,
                    left: currentStep.target.left,
                    right: currentStep.target.right,
                    bottom: currentStep.target.bottom,
                    width: currentStep.highlight ? currentStep.target.width : '0px',
                    height: currentStep.highlight ? currentStep.target.height : '0px',
                    transform: 'translate(-50%, -50%)', // Centering trick logic (offsets need care)
                    // If positioning by top/left, translate works. If right/bottom, we might need adjust.
                    // Simplified: We assume spotlight uses Top/Left mostly or we adjust translate.
                    // For Top/Right:
                    ...(currentStep.target.right ? { transform: 'translate(50%, -50%)' } : {}),
                    // For Bottom/Center:
                    ...(currentStep.target.bottom && !currentStep.target.top ? { transform: 'translate(-50%, 50%)' } : {}),
                    
                    boxShadow: currentStep.highlight 
                        ? '0 0 0 9999px rgba(0, 0, 0, 0.85), 0 0 40px rgba(255,255,255,0.2) inset' 
                        : '0 0 0 9999px rgba(0, 0, 0, 0.85)'
                }}
            />

            {/* --- CONTENT BOX --- */}
            <div 
                className="absolute w-full max-w-sm px-8 pointer-events-none transition-all duration-700"
                style={{
                    top: currentStep.position === 'center' ? '50%' : undefined,
                    bottom: currentStep.position === 'top' ? 'auto' : undefined,
                    left: '50%',
                    transform: currentStep.position === 'center' ? 'translate(-50%, -50%)' : 'translate(-50%, 0)',
                    // Dynamic positioning relative to screen thirds roughly
                    ...(currentStep.position === 'bottom' ? { top: 'auto', bottom: '15%' } : {}),
                    ...(currentStep.position === 'top' ? { bottom: '40%' } : {}),
                }}
            >
                <div className="bg-[#111]/90 border border-white/20 backdrop-blur-xl p-6 rounded-2xl shadow-2xl pointer-events-auto relative overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 key={stepIndex}">
                    
                    {/* Decorative Scanner Line */}
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-[shimmer_2s_infinite]" />

                    {/* Step Counter */}
                    <div className="flex justify-between items-center mb-4 opacity-50">
                        <span className="text-[9px] font-mono tracking-widest uppercase">系统指南</span>
                        <span className="text-[9px] font-mono tracking-widest">{stepIndex + 1} / {steps.length}</span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2 tracking-wide font-serif-display">
                        {currentStep.title}
                    </h3>
                    <p className="text-sm text-gray-300 leading-relaxed font-sans mb-8">
                        {currentStep.description}
                    </p>

                    <div className="flex items-center justify-between">
                        <button 
                            onClick={() => {
                                setIsVisible(false);
                                timerRef.current = setTimeout(onComplete, 500);
                            }}
                            className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                        >
                            {t('tut_skip')}
                        </button>
                        <button 
                            onClick={handleNext}
                            className="px-6 py-2 bg-white text-black text-xs font-bold uppercase tracking-widest rounded-full hover:scale-105 active:scale-95 select-none transition-all duration-200 ease-out shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                        >
                            {isLastStep ? t('tut_start') : t('tut_next')}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};
