import React from 'react';
import { ScanFace } from 'lucide-react';

interface LandingProps {
  onStart: () => void;
}

const Landing: React.FC<LandingProps> = ({ onStart }) => {
  return (
    <div className="h-full w-full bg-[#450a0a] relative flex flex-col items-center justify-between p-8 overflow-hidden">
      
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,191,36,0.1),transparent_70%)] pointer-events-none"></div>
      <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
      
      {/* Decorative Cloud/Patterns (CSS Shapes) */}
      <div className="absolute top-[-5%] left-[-10%] w-40 h-40 bg-red-600 rounded-full blur-3xl opacity-30"></div>
      <div className="absolute bottom-[-5%] right-[-10%] w-40 h-40 bg-amber-600 rounded-full blur-3xl opacity-30"></div>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center text-center z-10 mt-12">
        <div className="relative mb-8">
            <div className="absolute inset-0 bg-amber-500 blur-3xl opacity-20 rounded-full"></div>
            <ScanFace size={80} className="text-amber-400 relative animate-pulse" />
            <div className="absolute top-0 right-0 -mr-2 -mt-2">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
            </div>
        </div>

        <h1 className="text-4xl font-serif-gold font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 mb-2 drop-shadow-md">
            颜值资产
            <br />
            <span className="text-amber-500">面相估值所</span>
        </h1>
        
        <p className="text-red-200/80 text-sm max-w-[240px] leading-relaxed mt-4 font-light">
          新春特供 · 别整容了
          <br />
          先看看这张脸值多少压岁钱？
          <br />
          <span className="text-amber-400/80 font-mono-tech text-xs mt-2 block">LUNAR NEW YEAR EDITION v8.8</span>
        </p>
      </div>

      {/* CTA Section */}
      <div className="w-full max-w-xs z-10 mb-8 space-y-4">
        <div className="bg-red-900/40 border border-red-800/60 rounded p-3 text-center backdrop-blur-sm">
            <p className="text-[10px] text-red-300 font-mono-tech">RECENT FORTUNES</p>
            <div className="h-6 overflow-hidden relative mt-1">
                <div className="animate-[tickerScroll_10s_linear_infinite] absolute w-full text-xs text-amber-300 font-mono-tech">
                    <p>USER_892... ¥5,200,000</p>
                    <p>USER_112... ¥2.50</p>
                    <p>USER_334... ¥88,000,000</p>
                    <p>USER_551... ¥12,400</p>
                    <p>USER_990... ¥500.00</p>
                </div>
            </div>
        </div>

        <button 
          onClick={onStart}
          className="w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-red-950 font-bold text-lg py-4 px-8 rounded-lg shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95 select-none transition-all duration-200 ease-out transform flex items-center justify-center gap-2 border border-amber-300/30"
        >
          <span>开运估值</span>
          <span className="font-mono-tech text-xs opacity-70">-&gt; START</span>
        </button>
        
        <p className="text-[10px] text-red-300/60 text-center">
            *本服务仅供娱乐，新年快乐，恭喜发财
        </p>
      </div>
    </div>
  );
};

export default Landing;
