
import React from 'react';
import { Sparkles, MapPin, MousePointer2, Lightbulb, BookOpen, X, ArrowRight } from 'lucide-react';

interface OnboardingTutorialProps {
  onComplete: () => void;
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ onComplete }) => {
  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in touch-none">
       <div className="relative w-full max-w-lg bg-[#0A0A0C]/90 backdrop-blur-2xl border border-white/10 rounded-[32px] overflow-hidden shadow-2xl animate-scale-in">
          
          {/* Abstract background ambient light */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-blue-500/10 via-amber-500/5 to-transparent blur-[80px] rounded-full pointer-events-none" />

          {/* Close button */}
          <button 
             onClick={onComplete}
             className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors z-50 p-2"
          >
             <X size={24} strokeWidth={1.5} />
          </button>

          <div className="p-8 sm:p-10 relative z-10 flex flex-col h-full items-center text-center">
             
             {/* Header */}
             <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-amber-500/20 flex items-center justify-center mb-6 border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
                <Sparkles size={32} className="text-amber-400" strokeWidth={1.5} />
             </div>
             
             <h2 className="text-3xl font-semibold text-white tracking-tight mb-2">如何使用？</h2>
             <p className="text-base text-white/50 mb-10">一目了然看清自己的周期与机会，0基础立刻上手。</p>
             
             {/* 3 Core Steps */}
             <div className="space-y-6 w-full text-left mb-10">
                 
                 <div className="flex items-start gap-5">
                    <div className="w-12 h-12 shrink-0 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                       <MapPin size={24} className="text-blue-400" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-white mb-1">1. 看阶段</h3>
                        <p className="text-sm text-white/50 leading-relaxed">你的天时地利：确认现在的核心大运与今年所处的人生状态。</p>
                    </div>
                 </div>

                 <div className="flex items-start gap-5">
                    <div className="w-12 h-12 shrink-0 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                       <MousePointer2 size={24} className="text-emerald-400" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-white mb-1">2. 拖时间轴</h3>
                        <p className="text-sm text-white/50 leading-relaxed">你的起伏走势：左右滑动曲线，找到红色的高光能量池。</p>
                    </div>
                 </div>

                 <div className="flex items-start gap-5">
                    <div className="w-12 h-12 shrink-0 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                       <BookOpen size={24} className="text-amber-400" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-white mb-1">3. 人生说明书</h3>
                        <p className="text-sm text-white/50 leading-relaxed">你的出厂代码：下滑查看你的私人出厂配置与核心天赋说明书。</p>
                    </div>
                 </div>

             </div>

             {/* Action Button */}
             <button 
                onClick={onComplete}
                className="w-full py-4 rounded-2xl bg-white text-black font-semibold text-lg flex items-center justify-center gap-2 hover:bg-slate-200 transition-all active:scale-[0.98] shadow-[0_0_40px_rgba(255,255,255,0.1)] group"
             >
                我懂了，立即开始
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
             </button>

          </div>
       </div>
    </div>
  );
};
