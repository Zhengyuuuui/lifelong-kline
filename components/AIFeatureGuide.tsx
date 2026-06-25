import React from 'react';
import { Orbit } from 'lucide-react';

interface AIFeatureGuideProps {
  text: React.ReactNode;
}

export const AIFeatureGuide: React.FC<AIFeatureGuideProps> = ({ text }) => {
  return (
    <div className="w-full relative group mb-5">
      {/* Subtle ambient glow behind the card - tighter spread for a more refined look */}
      <div className="absolute -inset-[1px] bg-gradient-to-r from-teal-500/10 via-indigo-500/10 to-purple-500/10 rounded-xl blur-lg opacity-40 group-hover:opacity-80 transition-opacity duration-700" />
      
      {/* Reduced padding (p-4) and border-radius (rounded-xl) for a more compact, exquisite feel */}
      <div className="relative bg-[#0A0C10]/50 backdrop-blur-xl border border-white/5 rounded-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col gap-2.5">
        
        {/* Left Accent Line - thinner and more delicate */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-teal-400/80 via-indigo-500/80 to-purple-500/80 shadow-[0_0_8px_rgba(45,212,191,0.4)]" />
        
        {/* Inner Noise Texture */}
        <div className="absolute inset-0 opacity-[0.015] bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')] pointer-events-none" />

        {/* Header / Meta */}
        <div className="flex items-center gap-2.5 relative z-10">
          {/* Abstract AI Node - scaled down for elegance */}
          <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
            <div className="absolute inset-0 bg-teal-400/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
            <div className="w-1.5 h-1.5 bg-teal-300 rounded-full shadow-[0_0_10px_rgba(45,212,191,1)]" />
            <Orbit size={18} className="absolute text-teal-500/40 animate-[spin_10s_linear_infinite]" />
          </div>
          
          <span className="text-[10px] sm:text-[11px] font-bold bg-gradient-to-r from-teal-200 to-indigo-300 bg-clip-text text-transparent tracking-[0.2em] uppercase">
            AI 深度洞察
          </span>
          
          {/* Decorative horizontal line - more subtle */}
          <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent ml-2" />
        </div>

        {/* Content - optimized typography (smaller text, softer color, perfect alignment) */}
        <div className="relative z-10 pl-[30px]">
          <div className="text-[13px] sm:text-[14px] text-slate-300/90 leading-[1.7] font-light tracking-wide">
            {text}
          </div>
        </div>
      </div>
    </div>
  );
};

