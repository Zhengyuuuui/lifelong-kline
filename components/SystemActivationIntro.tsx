
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Fingerprint, FolderX, Wind, Zap, Brain, ChevronRight, Activity, X, Shield, ScanFace, CheckCircle2 } from 'lucide-react';

interface SystemActivationIntroProps {
  onComplete: () => void;
}

export const SystemActivationIntro: React.FC<SystemActivationIntroProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [textVisible, setTextVisible] = useState(false);

  useEffect(() => {
    setTextVisible(false);
    const timer = setTimeout(() => setTextVisible(true), 300);
    return () => clearTimeout(timer);
  }, [step]);

  const handleNext = () => {
    if (step < 3) setStep(s => s + 1);
    else onComplete();
  };

  // --- SCREEN 1: THE AWAKENING (Clean Minimalist) ---
  const Screen1 = () => (
    <div className="flex flex-col items-center justify-center h-full w-full px-8 relative overflow-hidden bg-black text-center font-sans cursor-pointer" onClick={handleNext}>
      {/* Subtle Gradient Spot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-900/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className={`relative z-10 transition-all duration-1000 flex flex-col items-center ${textVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="mb-12 space-y-4">
           <h2 className="text-xl font-medium text-slate-400 tracking-widest uppercase mb-2">
             承认吧：
           </h2>
           <h1 className="text-3xl md:text-4xl font-black text-white leading-tight tracking-tight drop-shadow-lg">
             努力，是底层<br/>
             <span className="text-red-500 inline-block mt-2 border-b-4 border-red-600 pb-1">最大的谎言</span>。
           </h1>
        </div>

        <div className="space-y-6 mb-16 max-w-xs mx-auto">
           <p className="text-sm text-slate-300 font-light opacity-0 animate-[fadeIn_1s_ease-out_0.5s_forwards] border-l border-white/20 pl-4 text-left">
             为什么你比别人拼命，<br/>却比别人穷？
           </p>
           <p className="text-sm text-slate-300 font-light opacity-0 animate-[fadeIn_1s_ease-out_1.5s_forwards] border-l border-white/20 pl-4 text-left">
             为什么你如履薄冰，<br/>却总是倒霉？
           </p>
        </div>

        {/* High-Tech Warning Box */}
        <div className="w-full max-w-[280px] backdrop-blur-md bg-white/5 border border-red-500/30 rounded-xl p-5 shadow-[0_0_30px_rgba(220,38,38,0.15)] animate-[pulse_4s_infinite]">
           <div className="flex items-center gap-3 mb-2 text-red-500">
              <AlertTriangle size={18} />
              <span className="text-[10px] font-bold tracking-[0.2em]">系统警告</span>
           </div>
           <p className="text-[11px] text-slate-200 font-mono text-left leading-relaxed">
              检测到异常：你的“出厂设置”存在严重漏洞。
           </p>
        </div>
      </div>

      <button 
        onClick={(e) => { e.stopPropagation(); handleNext(); }}
        className="absolute bottom-8 group flex flex-col items-center gap-2 cursor-pointer z-30 p-4"
      >
         <span className="text-[12px] font-mono text-slate-300 uppercase tracking-[0.3em] group-hover:text-red-400 transition-colors bg-white/10 px-6 py-3 rounded-full border border-white/20 shadow-lg backdrop-blur-sm">
            点击开始检测
         </span>
      </button>
    </div>
  );

  // --- SCREEN 2: THE DIAGNOSIS (Surgical Precision) ---
  const Screen2 = () => (
    <div className="flex flex-col items-center justify-center h-full w-full px-6 relative overflow-hidden bg-black text-center font-sans cursor-pointer" onClick={handleNext}>
       {/* Scanning Laser */}
       <div className="absolute top-0 left-0 w-full h-[2px] bg-red-500 shadow-[0_0_20px_rgba(239,68,68,1)] z-20 animate-[scan_2.5s_linear_infinite]" />
       <style>{`@keyframes scan { 0% { top: 0; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }`}</style>

       <div className={`relative z-10 w-full max-w-sm transition-all duration-700 ${textVisible ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'}`}>
          <h3 className="text-xl font-bold text-white mb-10 leading-relaxed tracking-wide">
             你过得累，<br/>
             是因为你一直在<span className="text-red-500 bg-red-500/10 px-2 py-0.5 rounded mx-1">“违规操作”</span>你自己。
          </h3>

          {/* Graphic: Body Map */}
          <div className="relative w-full h-48 mb-10 flex items-center justify-center">
             {/* Central Figure */}
             <div className="w-32 h-48 border border-white/20 rounded-[32px] relative flex flex-col items-center justify-center bg-white/[0.02]">
                <ScanFace size={64} className="text-slate-700" strokeWidth={0.5} />
                
                {/* Data Points */}
                <div className="absolute top-8 -right-12 flex items-center gap-2">
                   <div className="w-10 h-[1px] bg-red-500/50" />
                   <span className="text-[9px] text-red-500 font-mono bg-black border border-red-500/30 px-1.5 py-0.5 rounded">NO DATA</span>
                </div>
                <div className="absolute bottom-12 -left-12 flex items-center gap-2 flex-row-reverse">
                   <div className="w-10 h-[1px] bg-red-500/50" />
                   <span className="text-[9px] text-red-500 font-mono bg-black border border-red-500/30 px-1.5 py-0.5 rounded">ERROR</span>
                </div>
             </div>
          </div>

          {/* Diagnosis List */}
          <div className="space-y-3 mb-8 text-left pl-8 border-l border-white/10">
             <p className="text-xs text-slate-400">你是鱼，却在拼命学爬树？</p>
             <p className="text-xs text-slate-400">你是鸟，却在深海里学游泳？</p>
             <p className="text-xs text-white font-bold pt-1">99% 的人只会盲目努力，结果越算越薄。</p>
          </div>

          {/* The File Card */}
          <div className="bg-[#0A0A0A] border border-red-500/20 rounded-xl p-4 flex items-center gap-4 shadow-lg mx-auto w-full">
             <div className="w-10 h-10 rounded-lg bg-red-900/20 flex items-center justify-center text-red-500">
                <FolderX size={20} />
             </div>
             <div className="text-left flex-1">
                <div className="flex justify-between items-center mb-1">
                   <span className="text-[9px] text-slate-500 font-mono uppercase">MISSING_FILE</span>
                   <span className="text-[9px] text-red-500 font-bold bg-red-500/10 px-1.5 rounded">[ 严重缺失 ]</span>
                </div>
                <div className="text-xs text-white font-bold">《你的生命 · 独家出厂说明书》</div>
             </div>
          </div>
          
          <p className="mt-6 text-[10px] text-slate-500 font-mono opacity-60">
             你的努力，若没有这份说明书，就是在慢性自杀。
          </p>
       </div>

       <button 
         onClick={(e) => { e.stopPropagation(); handleNext(); }} 
         className="absolute bottom-20 w-16 h-16 rounded-full border border-white/20 bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-95 select-none duration-200 ease-out group z-30 shadow-lg backdrop-blur-sm"
       >
          <ChevronRight size={28} className="group-hover:translate-x-1 transition-transform" />
       </button>
    </div>
  );

  // --- SCREEN 3: THE OVERRIDE (Emerald Matrix) ---
  const Screen3 = () => (
    <div className="flex flex-col items-center justify-center h-full w-full px-6 relative overflow-hidden bg-black text-center font-sans cursor-pointer" onClick={handleNext}>
       {/* Background Mesh */}
       <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#064e3b_0%,_transparent_40%)] opacity-40" />
       
       <div className={`relative z-10 transition-all duration-700 w-full max-w-sm ${textVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="mb-10">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-4">
                <Zap size={10} fill="currentColor" /> 权限覆盖
             </div>
             <h2 className="text-2xl font-bold text-white leading-tight">
                真正的赢家，<br/>从不等待运势，而是<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 font-black text-3xl">篡改运势</span>。
             </h2>
          </div>

          <div className="space-y-3 mb-10">
             {/* Feature 1 */}
             <div className="bg-[#0F1210] border border-white/5 rounded-2xl p-4 flex items-center gap-4 animate-[slideIn_0.5s_ease-out_forwards] opacity-0 hover:border-emerald-500/30 transition-colors" style={{ animationDelay: '0.1s' }}>
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                   <Activity size={18} />
                </div>
                <div className="text-left">
                   <h4 className="text-sm font-bold text-white">五行强制补全</h4>
                   <p className="text-[10px] text-slate-400 leading-snug mt-0.5">缺金？缺水？生成“磁场补丁”，强制吸金。</p>
                </div>
             </div>
             
             {/* Feature 2 */}
             <div className="bg-[#0F1210] border border-white/5 rounded-2xl p-4 flex items-center gap-4 animate-[slideIn_0.5s_ease-out_forwards] opacity-0 hover:border-emerald-500/30 transition-colors" style={{ animationDelay: '0.3s' }}>
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                   <Wind size={18} />
                </div>
                <div className="text-left">
                   <h4 className="text-sm font-bold text-white">每日顺风窗口</h4>
                   <p className="text-[10px] text-slate-400 leading-snug mt-0.5">每天 2 小时宇宙能量敞开，在风口起飞。</p>
                </div>
             </div>

             {/* Feature 3 */}
             <div className="bg-[#0F1210] border border-white/5 rounded-2xl p-4 flex items-center gap-4 animate-[slideIn_0.5s_ease-out_forwards] opacity-0 hover:border-emerald-500/30 transition-colors" style={{ animationDelay: '0.5s' }}>
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                   <Brain size={18} />
                </div>
                <div className="text-left">
                   <h4 className="text-sm font-bold text-white">AI 绝密军师</h4>
                   <p className="text-[10px] text-slate-400 leading-snug mt-0.5">融合古法与算法，不该泄露的“作弊代码”。</p>
                </div>
             </div>
          </div>

          <div className="text-center border-t border-white/5 pt-4">
             <p className="text-[10px] text-slate-500 mb-1">这不是迷信。</p>
             <p className="text-xs font-bold text-white tracking-wider">这是能量学的“降维打击”。</p>
          </div>
       </div>

       <button 
         onClick={(e) => { e.stopPropagation(); handleNext(); }} 
         className="absolute bottom-20 w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/30 transition-all hover:scale-105 active:scale-95 select-none duration-200 ease-out z-30 shadow-lg backdrop-blur-sm"
       >
          <ChevronRight size={28} className="group-hover:translate-x-1 transition-transform" />
       </button>
       <style>{`@keyframes slideIn { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );

  // --- SCREEN 4: ACTIVATION (Golden God Mode) ---
  const Screen4 = () => (
    <div className="flex flex-col items-center justify-center h-full w-full px-6 relative overflow-hidden bg-black text-center font-sans">
       {/* Ambient Light */}
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-600/10 blur-[100px] rounded-full pointer-events-none" />

       <div className={`relative z-10 transition-all duration-1000 ${textVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="mb-16">
             <div className="inline-block border border-amber-500/30 rounded px-2 py-0.5 text-[9px] text-amber-500 font-mono tracking-widest uppercase mb-6 animate-pulse">
                系统就绪
             </div>
             <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-amber-600 uppercase tracking-tighter mb-4 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                开启<br/>上帝视角
             </h1>
             <div className="h-px w-20 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto mt-6" />
             <p className="text-xs text-amber-200/60 font-mono mt-4 tracking-[0.2em]">上帝视角已开启</p>
          </div>

          {/* Interaction Button */}
          <div className="relative group cursor-pointer mb-12" onClick={onComplete}>
             <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-50" />
             
             {/* Main Ring */}
             <div className="relative w-28 h-28 rounded-full border border-amber-500/30 flex items-center justify-center bg-black/80 backdrop-blur-xl group-hover:border-amber-500 transition-all duration-200 ease-out shadow-[0_0_30px_rgba(245,158,11,0.1)] group-hover:shadow-[0_0_50px_rgba(245,158,11,0.3)] group-hover:scale-105 active:scale-95 select-none">
                <Fingerprint size={56} className="text-amber-500" strokeWidth={1} />
                
                {/* Rotating Ring */}
                <div className="absolute inset-0 border border-t-amber-500/80 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" style={{ animationDuration: '3s' }} />
             </div>
             
             <div className="mt-6 space-y-1">
                <div className="text-[10px] text-amber-500 font-bold uppercase tracking-[0.2em] opacity-80 group-hover:opacity-100 transition-opacity">Click to Activate</div>
             </div>
          </div>

          <div className="space-y-2 opacity-60">
             <p className="text-[10px] text-slate-400">99% 的人在黑暗中裸奔</p>
             <p className="text-xs text-white font-bold">只有 1% 的人拿着攻略通关</p>
          </div>
          
          <button 
            onClick={onComplete}
            className="mt-12 px-10 py-4 bg-white text-black font-black rounded-full text-sm uppercase tracking-[0.15em] hover:scale-105 active:scale-95 select-none transition-all duration-200 ease-out shadow-[0_0_40px_rgba(255,255,255,0.4)] flex items-center gap-3 mx-auto z-30 relative"
          >
             <Activity size={18} />
             激活逆天改命权限
          </button>
       </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[300] bg-black text-white font-sans overflow-hidden">
       {step === 0 && <Screen1 />}
       {step === 1 && <Screen2 />}
       {step === 2 && <Screen3 />}
       {step === 3 && <Screen4 />}
       
       {/* Progress Bar (Minimal) */}
       <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
          <div 
            className="h-full bg-white transition-all duration-500 ease-out" 
            style={{ width: `${((step + 1) / 4) * 100}%` }}
          />
       </div>
    </div>
  );
};
