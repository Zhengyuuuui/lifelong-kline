import React, { useState, useMemo } from 'react';
import { EpochRing, YearRing, QuarterRing } from '../types';
import { Target, Zap, Clock, History, Sparkles, ArrowRight, RotateCcw, Wind, AlertOctagon, TrendingUp, Layers, Map } from 'lucide-react';
import { i18n } from '../services/i18n';

interface ThreeRingsCompassProps {
  epoch: EpochRing;
  year: YearRing;
  quarter: QuarterRing;
  mode?: 'today' | '10y' | '3y' | '1y'; // Controlled Mode
  onModeChange?: (mode: 'today' | '10y' | '3y' | '1y') => void; // State callback
  onShowSmoothSailing?: () => void;
}

type DragonTheme = 'mystic' | 'cyber';

export const ThreeRingsCompass: React.FC<ThreeRingsCompassProps> = ({ epoch, year, quarter, mode: externalMode, onModeChange, onShowSmoothSailing }) => {
  const [internalMode, setInternalMode] = useState<'today' | '10y' | '3y' | '1y'>('10y');
  const [selectedSegmentIdx, setSelectedSegmentIdx] = useState<number>(2);
  const [dragonTheme, setDragonTheme] = useState<DragonTheme>('mystic');
  const [activeStageIdx, setActiveStageIdx] = useState<number>(2); 

  // Use controlled mode if present, otherwise internal
  const mode = externalMode || internalMode;
  const setMode = (m: 'today' | '10y' | '3y' | '1y') => {
      if (onModeChange) onModeChange(m);
      else setInternalMode(m);
  };

  const timelineSegments = useMemo(() => [
    { range: '2020-2021', label: i18n.t('rings.seg_hidden'), sub: i18n.t('rings.sub_seed'), desc: i18n.t('rings.desc_seed'), status: 'past' },
    { range: '2022-2023', label: i18n.t('rings.seg_seen'), sub: i18n.t('rings.sub_acc'), desc: i18n.t('rings.desc_acc'), status: 'past' },
    { range: '2024-2025', label: i18n.t('rings.seg_leap'), sub: i18n.t('rings.sub_break'), desc: i18n.t('rings.desc_break'), status: 'current' }, 
    { range: '2026-2027', label: i18n.t('rings.seg_fly'), sub: i18n.t('rings.sub_exp'), desc: i18n.t('rings.desc_exp'), status: 'future' },
    { range: '2028-2029', label: i18n.t('rings.seg_excess'), sub: i18n.t('rings.sub_ret'), desc: i18n.t('rings.desc_ret'), status: 'future' },
  ], [i18n.getCurrentLanguage()]);

  const activeData = timelineSegments[selectedSegmentIdx];

  const fullCycle = [
    { l: i18n.t('rings.full_hidden'), s: i18n.t('rings.cycle_seed') },
    { l: i18n.t('rings.full_seen'), s: i18n.t('rings.cycle_acc') },
    { l: i18n.t('rings.full_leap'), s: i18n.t('rings.cycle_break') },
    { l: i18n.t('rings.full_fly'), s: i18n.t('rings.cycle_exp') },
    { l: i18n.t('rings.full_excess'), s: i18n.t('rings.cycle_ret') },
    { l: i18n.t('rings.full_reset'), s: i18n.t('rings.cycle_reset') } 
  ];

  return (
    <div className="w-full relative px-4 py-4 mb-0">
      <style>{`
        @keyframes floatY {
           0%, 100% { transform: translateY(0); }
           50% { transform: translateY(-8px); }
        }
        @keyframes floatY-slow {
           0%, 100% { transform: translateY(0); }
           50% { transform: translateY(-4px); }
        }
        @keyframes whisker-sway {
          0%, 100% { d: path("M30,18 C40,25 50,45 30,55"); }
          50% { d: path("M30,18 C45,30 55,40 35,50"); }
        }
        @keyframes whisker-sway-2 {
          0%, 100% { d: path("M32,15 C45,8 60,0 70,10"); }
          50% { d: path("M32,15 C50,5 65,-5 75,5"); }
        }
        @keyframes mane-flow {
          0% { transform: rotate(0deg) skewX(0deg) translate(0,0); }
          25% { transform: rotate(3deg) skewX(-4deg) translate(-2px, 1px); }
          50% { transform: rotate(-2deg) skewX(3deg) translate(1px, -2px); }
          75% { transform: rotate(1deg) skewX(-2deg) translate(0, 1px); }
          100% { transform: rotate(0deg) skewX(0deg) translate(0,0); }
        }
        @keyframes grasp {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(8deg); }
        }
        .text-shadow-glow-gold {
          text-shadow: 0 0 10px rgba(245, 158, 11, 0.8), 0 0 20px rgba(245, 158, 11, 0.4);
        }
        .text-shadow-glow-cyan {
          text-shadow: 0 0 10px rgba(6, 182, 212, 0.8), 0 0 20px rgba(6, 182, 212, 0.4);
        }
        .dragon-path-transition {
          transition: d 1.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .gpu-accelerated {
          transform: translateZ(0);
          will-change: transform;
        }
      `}</style>
      
      {/* Title & Header */}
      <div className="text-center mb-10 pt-4">
        {/* Dynamic Title based on Mode */}
        <div className="flex flex-col items-center justify-center mb-8 animate-fade-in transition-all duration-300">
           {mode === '10y' && (
              <>
                 <h3 className="text-2xl font-semibold text-white/90 tracking-widest mb-2 flex items-center justify-center gap-3">
                    核心大运
                 </h3>
                 <p className="text-xs font-medium text-white/40 tracking-[0.2em] uppercase">未来10年的主轴与风口</p>
              </>
           )}
           {mode === '3y' && (
              <>
                 <h3 className="text-2xl font-semibold text-white/90 tracking-widest mb-2 flex items-center justify-center gap-3">
                    三年战略
                 </h3>
                 <p className="text-xs font-medium text-white/40 tracking-[0.2em] uppercase">这3年该猛冲还是防守？</p>
              </>
           )}
           {mode === '1y' && (
              <>
                 <h3 className="text-2xl font-semibold text-white/90 tracking-widest mb-2 flex items-center justify-center gap-3">
                    本年节律
                 </h3>
                 <p className="text-xs font-medium text-white/40 tracking-[0.2em] uppercase">今年必抓的红利与避坑指南</p>
              </>
           )}
           {mode === 'today' && (
              <>
                 <h3 className="text-2xl font-semibold text-white/90 tracking-widest mb-2 flex items-center justify-center gap-3">
                    今日能量
                 </h3>
                 <p className="text-xs font-medium text-white/40 tracking-[0.2em] uppercase">实时顺风窗口与能量校准</p>
              </>
           )}
        </div>
        
        {/* Minimal High-End Tabs */}
        <div className="inline-flex items-center justify-center gap-2 sm:gap-6 relative z-20">
          <button 
            onClick={() => setMode('10y')}
            className={`px-4 py-2 text-xs sm:text-sm font-medium tracking-wider transition-all duration-300 relative border-b-2 ${
              mode === '10y' 
              ? 'text-white border-amber-500/80' 
              : 'text-white/40 hover:text-white/70 border-transparent'
            }`}
          >
            {i18n.t('rings.btn_10y')}
          </button>
          <button 
            onClick={() => setMode('3y')}
            className={`px-4 py-2 text-xs sm:text-sm font-medium tracking-wider transition-all duration-300 relative border-b-2 ${
              mode === '3y' 
              ? 'text-white border-teal-500/80' 
              : 'text-white/40 hover:text-white/70 border-transparent'
            }`}
          >
            {i18n.t('rings.btn_3y')}
          </button>
          <button 
            onClick={() => setMode('1y')}
            className={`px-4 py-2 text-xs sm:text-sm font-medium tracking-wider transition-all duration-300 relative border-b-2 ${
              mode === '1y' 
              ? 'text-white border-purple-500/80' 
              : 'text-white/40 hover:text-white/70 border-transparent'
            }`}
          >
            {i18n.t('rings.btn_1y')}
          </button>
        </div>
      </div>

      {/* Main Visualization Container */}
      <div className="relative min-h-[280px] flex flex-col justify-center items-center gap-6">
        
        <div className={`absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] rounded-full blur-[80px] transition-colors duration-700 pointer-events-none opacity-60 ${
          mode === '10y' ? 'bg-amber-600/10' :
          mode === '3y' ? 'bg-teal-600/10' :
          mode === '1y' ? 'bg-purple-600/10' :
          'bg-cyan-600/10'
        }`} />

        {/* TODAY MODE PLACEHOLDER (Triggered by external button) */}
        {mode === 'today' && (
           <div className="relative w-full h-[200px] flex items-center justify-center animate-fade-in opacity-50">
               <div className="flex flex-col items-center gap-3">
                   <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 animate-pulse">
                      <Wind size={32} className="text-cyan-400 opacity-80" />
                   </div>
                   <p className="text-[10px] text-cyan-500/80 uppercase tracking-widest font-bold">Connecting to Live Signal...</p>
               </div>
           </div>
        )}

        {/* 10Y EPOCH */}
        {mode === '10y' && (
          <div className="relative animate-fade-in flex flex-col items-center w-full max-w-[340px]">
             
            {/* The Unified Card */}
            <div className="w-full relative z-20">
                <div className="bg-white/[0.02] backdrop-blur-2xl border border-white/[0.05] rounded-[32px] p-6 sm:p-8 flex flex-col items-center shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                    
                    <div className="flex items-center gap-4 text-white/30 text-xs font-semibold tracking-[0.2em] mb-8">
                        <div className="w-1 h-1 bg-white/30 rotate-45 transform origin-center"></div>
                        你当前所处阶段
                        <div className="w-1 h-1 bg-white/30 rotate-45 transform origin-center"></div>
                    </div>
                    
                    {/* The Ring */}
                    <div className="relative w-[200px] h-[200px] flex items-center justify-center mb-6">
                        <svg width="200" height="200" viewBox="0 0 200 200" className="absolute inset-0">
                            <defs>
                                <linearGradient id="goldGradient" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#FFF2B2" />
                                    <stop offset="100%" stopColor="#DF9200" />
                                </linearGradient>
                            </defs>
                            <circle cx="100" cy="100" r="92" fill="none" stroke="#222" strokeWidth="6" />
                            {/* Simulate the progress ring */}
                            <circle 
                                cx="100" cy="100" r="92" 
                                fill="none" 
                                stroke="url(#goldGradient)" 
                                strokeWidth="8" 
                                strokeDasharray={2 * Math.PI * 92} 
                                strokeDashoffset={(2 * Math.PI * 92) * 0.4} 
                                strokeLinecap="round" 
                                transform="rotate(-90 100 100)" 
                                className="drop-shadow-[0_0_10px_rgba(223,146,0,0.5)] transition-all duration-1000 ease-out"
                            />
                        </svg>
                        {/* Glowing dot at the end of the stroke (approximation) */}
                        <div className="absolute right-[8px] bottom-[22px] w-4 h-4 bg-[#FFED94] rounded-full shadow-[0_0_15px_#FFED94] animate-pulse"></div>
                        
                        <div className="flex flex-col items-center mt-2">
                            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#FFF5CE] to-[#FFC53D] tracking-widest mb-1 drop-shadow-md">
                                {activeData.label?.substring(0,2) || '或跃'}
                            </div>
                            <div className="text-lg font-bold text-[#FFD659] tracking-widest mb-1 shadow-sm">
                                {activeData.sub || '突破期'}
                            </div>
                            <div className="text-sm font-medium text-[#7D8A9F]">
                                {activeData.range || '2024-2025'}
                            </div>
                        </div>
                    </div>

                    <p className="text-sm text-[#A0ABC0] mb-6 tracking-wide text-center">
                        {activeData.status === 'current' ? '这是你主动突破、争取跃升的窗口期' : activeData.desc}
                    </p>

                    <button 
                        onClick={() => {
                            if (onShowSmoothSailing) onShowSmoothSailing();
                            else setMode('today');
                        }}
                        className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#FFCA3A] to-[#DF9200] text-black font-bold text-lg tracking-widest shadow-[0_5px_20px_rgba(223,146,0,0.4)] mb-4 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        查看我的行动建议 &gt;
                    </button>

                    <button className="px-4 py-1.5 rounded-full border border-white/20 text-[#A0ABC0] text-xs flex items-center gap-1.5 hover:bg-white/5 transition-all">
                        <span className="w-3.5 h-3.5 rounded-full border border-[#A0ABC0] text-[10px] flex items-center justify-center pb-px">?</span>
                        为什么是这个阶段
                    </button>
                </div>
            </div>

            {/* Dragon Container with timeline overlaid */}
            <div className="w-full mt-6 relative isolate">
              
              {/* Full Visibility Dragon Layer (Keeping it unchanged behind) */}
              <div 
                className="absolute left-[-50%] right-[-50%] top-[-100%] bottom-[-100%] overflow-visible pointer-events-none z-0"
              >
                 <DetailedDragon theme={dragonTheme} stageIndex={activeStageIdx} />
              </div>

              {/* Theme Switch Control */}
              <div className="absolute -top-7 right-2 z-30">
                <button 
                  onClick={() => setDragonTheme(prev => prev === 'mystic' ? 'cyber' : 'mystic')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all duration-300 backdrop-blur-md border ${
                    dragonTheme === 'mystic' 
                      ? 'bg-amber-500/20 text-amber-200 border-amber-500/30 hover:bg-amber-500/30' 
                      : 'bg-cyan-500/20 text-cyan-200 border-cyan-500/30 hover:bg-cyan-500/30'
                  }`}
                >
                  <RotateCcw size={10} className={dragonTheme === 'cyber' ? 'animate-spin-slow' : ''} />
                  <span>{dragonTheme === 'mystic' ? '玄黄' : 'CYBER'}</span>
                </button>
              </div>

              {/* Scrollable Stage Cards */}
              <div className="overflow-x-auto no-scrollbar relative z-10 px-2 py-4">
                <div className={`flex items-center gap-6 min-w-max mx-auto px-6 py-4 rounded-2xl border transition-all duration-700 backdrop-blur-[4px] ${
                    dragonTheme === 'mystic' 
                      ? 'bg-black/40 border-amber-500/20 shadow-[0_0_40px_rgba(245,158,11,0.1)]' 
                      : 'bg-black/60 border-cyan-500/20 shadow-[0_0_40px_rgba(6,182,212,0.15)]'
                }`}>
                    {fullCycle.map((stage, i) => {
                        const isCurrent = activeStageIdx === i;
                        return (
                            <div 
                              key={i} 
                              onClick={() => setActiveStageIdx(i)}
                              className="flex items-center gap-3 relative cursor-pointer group"
                            >
                                <div className={`flex flex-col items-center justify-center transition-all duration-500 transform ${isCurrent ? 'opacity-100 scale-110' : 'opacity-60 grayscale-[0.8] hover:grayscale-0 hover:scale-105'}`}>
                                    <span className={`text-[11px] font-bold whitespace-nowrap mb-1 transition-colors duration-300 ${
                                      isCurrent 
                                        ? (dragonTheme === 'mystic' ? 'text-amber-300 text-shadow-glow-gold' : 'text-cyan-300 text-shadow-glow-cyan') 
                                        : 'text-slate-300'
                                    }`}>
                                      {stage.l}
                                    </span>
                                    <span className={`text-[9px] whitespace-nowrap px-2.5 py-0.5 rounded-full transition-all duration-300 font-medium ${
                                      isCurrent 
                                        ? (dragonTheme === 'mystic' ? 'bg-amber-500/20 text-amber-100 border border-amber-500/30' : 'bg-cyan-500/20 text-cyan-100 border border-cyan-500/30')
                                        : 'text-slate-500 bg-white/5 border border-white/5 group-hover:border-white/20'
                                    }`}>
                                      {stage.s}
                                    </span>
                                </div>
                                {i < fullCycle.length - 1 && (
                                    <ArrowRight size={10} className={`opacity-20 ${dragonTheme === 'mystic' ? 'text-amber-700' : 'text-cyan-700'}`} />
                                )}
                            </div>
                        )
                    })}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 3Y STRATEGY */}
        {mode === '3y' && (
          <div className="relative w-full max-w-[280px] h-[200px] flex items-end justify-between px-4 animate-fade-in">
            <div className="flex flex-col items-center gap-2 group opacity-50">
               <div className="w-12 h-24 rounded-t-lg border border-teal-500/30 bg-gradient-to-t from-teal-500/10 to-transparent relative overflow-hidden backdrop-blur-sm">
                 <div className="absolute bottom-0 w-full h-1 bg-teal-500/30" />
               </div>
               <span className="text-[10px] text-slate-500 tracking-wider">{i18n.t('rings.cycle_acc')}</span>
            </div>
            <div className="flex flex-col items-center gap-2 relative">
               <div className="absolute -top-6 text-teal-400 animate-bounce"><Zap size={16} fill="currentColor" /></div>
               <div className="w-16 h-36 rounded-t-lg border-x border-t border-teal-400/50 bg-gradient-to-t from-teal-500/20 to-teal-500/5 shadow-[0_0_30px_rgba(45,212,191,0.2)] relative overflow-hidden backdrop-blur-sm">
                  <div className="absolute inset-0 bg-teal-400/10 animate-pulse" />
               </div>
               <span className="text-[11px] text-teal-300 font-bold tracking-wider">{i18n.t('rings.cycle_break')}</span>
            </div>
            <div className="flex flex-col items-center gap-2 group opacity-50">
               <div className="w-12 h-24 rounded-t-lg border border-teal-500/30 bg-gradient-to-t from-teal-500/10 to-transparent relative overflow-hidden backdrop-blur-sm">
                  <div className="absolute bottom-0 w-full h-1 bg-teal-500/30" />
               </div>
               <span className="text-[10px] text-slate-500 tracking-wider">{i18n.t('rings.cycle_ret')}</span>
            </div>
          </div>
        )}

        {/* 1Y RHYTHM */}
        {mode === '1y' && (
           <div className="relative w-full max-w-[280px] h-[160px] animate-fade-in">
             <svg width="100%" height="100%" viewBox="0 0 280 160" preserveAspectRatio="none">
               <defs>
                  <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="0%" stopColor="#A855F7" stopOpacity="0.5"/>
                     <stop offset="100%" stopColor="#A855F7" stopOpacity="0"/>
                  </linearGradient>
               </defs>
               <path d="M0,80 Q70,20 140,80 T280,80" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" />
               <path d="M0,80 Q70,20 140,80 T280,80 V160 H0 Z" fill="url(#waveGrad)" opacity="0.3" />
               <circle cx="210" cy="50" r="6" fill="#A855F7" stroke="white" strokeWidth="2">
                  <animate attributeName="r" values="6;8;6" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="1;0.8;1" dur="2s" repeatCount="indefinite" />
               </circle>
               <line x1="210" y1="50" x2="210" y2="160" stroke="#A855F7" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
               <text x="210" y="155" textAnchor="middle" fill="#E9D5FF" fontSize="10" fontWeight="bold">Nov</text>
             </svg>
           </div>
        )}
      </div>

      {/* Details HUD */}
      {mode !== '10y' && (
      <div className="mt-2 mx-2">
         <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[20px] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden transition-all duration-300">
            {mode === 'today' && (
               <div className="animate-fade-in flex flex-col items-center justify-center min-h-[140px] text-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center animate-spin-slow">
                     <Wind size={20} className="text-cyan-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-widest">今日顺风窗口</h4>
                  <div className="text-xs text-slate-400">
                    <span className="text-cyan-400 font-bold">14:00 - 16:00 (未时)</span><br/>
                    适合：重要决策 / 发送提案
                  </div>
               </div>
            )}
            
            {/* mode 10y removed from Details HUD as it is integrated above */}
            
            {/* 3Y ENRICHED CONTENT (ADDED: Hidden Opportunity & Radar) */}
            {mode === '3y' && (
              <div className="animate-fade-in">
                 <div className="flex items-center gap-2 text-teal-400 mb-3">
                    <Zap size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">{i18n.t('rings.btn_3y')} · {year.current_gate}</span>
                 </div>
                 <div className="flex justify-between items-end mb-3 border-b border-white/5 pb-3">
                    <div className="text-[10px] text-slate-400">Score</div>
                    <div className="text-xl font-mono text-teal-100">{year.win_score}</div>
                 </div>
                 <p className="text-sm text-white font-serif italic mb-4">"{year.annual_theme}"</p>
                 
                 {/* Derived Strategy Insights */}
                 <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                        <div className="text-[9px] text-teal-400/80 uppercase tracking-wider mb-1 font-bold flex items-center gap-1">
                            <Target size={10} /> 核心壁垒
                        </div>
                        <div className="text-[10px] text-slate-300 leading-snug">
                           {year.current_gate === '起势门' ? '建立 MVP 闭环' : 
                            year.current_gate === '攻坚门' ? '单点技术击穿' : 
                            '资产结构优化'}
                        </div>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                        <div className="text-[9px] text-rose-400/80 uppercase tracking-wider mb-1 font-bold flex items-center gap-1">
                            <AlertOctagon size={10} /> 潜在爆雷
                        </div>
                        <div className="text-[10px] text-slate-300 leading-snug">
                            {year.current_gate === '起势门' ? '战线拉得太长' : 
                             year.current_gate === '攻坚门' ? '现金流断裂' : 
                             '无效社交内耗'}
                        </div>
                    </div>
                 </div>

                 {/* NEW ADDITION: DEEP STRATEGY RADAR */}
                 <div className="mt-4 bg-[#0A0A0A] rounded-xl p-3 border border-teal-500/20">
                     <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-bold text-teal-500 uppercase tracking-widest flex items-center gap-1">
                            <Map size={10} /> 深度战略推演
                        </span>
                        <span className="text-[8px] bg-teal-900/50 text-teal-300 px-1.5 py-0.5 rounded border border-teal-500/20">AI GENERATED</span>
                     </div>
                     <div className="flex gap-2">
                         <div className="flex-1">
                            <div className="text-[9px] text-slate-500 mb-0.5">暗线机遇 (Hidden Opp)</div>
                            <div className="text-[10px] text-white font-medium">
                                {year.current_gate === '起势门' ? '利基市场的小众需求爆发' : 
                                 year.current_gate === '攻坚门' ? '竞争对手收缩留下的真空带' : 
                                 '老客户复购率提升'}
                            </div>
                         </div>
                         <div className="w-px bg-white/10 mx-1"></div>
                         <div className="flex-1">
                            <div className="text-[9px] text-slate-500 mb-0.5">竞争强度 (Radar)</div>
                            <div className="flex items-center gap-1">
                                <div className={`h-1.5 w-8 rounded-full ${year.current_gate === '攻坚门' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                                <span className="text-[10px] text-white font-medium">{year.current_gate === '攻坚门' ? 'HIGH' : 'MED'}</span>
                            </div>
                         </div>
                     </div>
                 </div>
              </div>
            )}
            
            {/* 1Y ENRICHED CONTENT (ADDED: Energy Flow & Micro-Habits) */}
            {mode === '1y' && (
              <div className="animate-fade-in">
                 <div className="flex items-center gap-2 text-purple-400 mb-3">
                    <Clock size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">{i18n.t('rings.btn_1y')} · {quarter.current_phase}</span>
                 </div>
                 <div className="text-xs text-slate-300 italic border-l-2 border-purple-500/40 pl-3">
                    {quarter.rhythm_tendency}
                 </div>
                 
                 {/* Derived Rhythm Insights */}
                 <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
                    <div className="flex items-start gap-2">
                        <div className="w-1 h-1 bg-purple-500 rounded-full mt-1.5" />
                        <p className="text-[10px] text-slate-300">
                           <span className="text-purple-300 font-bold">能量导向：</span>
                           {quarter.current_phase === '起' ? '向外探索，链接新资源。' :
                            quarter.current_phase === '承' ? '向内深耕，转化高价值成果。' :
                            '盘整复盘，清理情绪库存。'}
                        </p>
                    </div>
                    
                    {/* NEW ADDITION: ENERGY WARNING */}
                    <div className="bg-purple-900/10 rounded-lg p-2.5 mt-2 flex items-start gap-2 border border-purple-500/10">
                         <AlertOctagon size={12} className="text-purple-400 mt-0.5 flex-shrink-0" />
                         <div>
                             <p className="text-[9px] text-purple-300 font-bold uppercase mb-0.5">Energy Leak Warning</p>
                             <p className="text-[10px] text-slate-400 leading-snug">
                                {quarter.current_phase === '起' ? '警惕无效社交带来的精力分散。' : 
                                 quarter.current_phase === '承' ? '注意久坐导致的脊椎压力。' : 
                                 '当心情绪内耗，及时止损。'}
                             </p>
                         </div>
                    </div>

                    {/* NEW ADDITION: MICRO HABIT */}
                    <div className="flex items-center gap-2 mt-2 bg-white/5 p-2 rounded-lg">
                        <TrendingUp size={12} className="text-emerald-400" />
                        <span className="text-[10px] text-slate-300">
                           <span className="font-bold text-white">本月微习惯：</span>
                           {quarter.current_phase === '起' ? '每天认识一个新朋友。' : 
                            quarter.current_phase === '承' ? '每天深度工作 2 小时。' : 
                            '每天冥想 10 分钟。'}
                        </span>
                    </div>
                 </div>
              </div>
            )}
         </div>
      </div>
      )}
    </div>
  );
};

// --- REALISTIC & DETAILED DRAGON VISUALIZATION ---
const DetailedDragon: React.FC<{ theme: DragonTheme; stageIndex: number }> = ({ theme, stageIndex }) => {
  const isMystic = theme === 'mystic';

  // --- Geometry Calculation ---
  // Returns path string, head coordinates (hx, hy) and head angle (ha)
  const dragonGeometry = useMemo(() => {
    let data: { path: string, hx: number, hy: number, ha: number, claws: {x:number, y:number}[] };

    if (isMystic) {
      switch (stageIndex) {
        case 0: // 潜龙 (Deep, flat, foundational)
          data = { 
            path: "M-100,215 C50,230 200,210 350,215 S650,225 800,215 S950,210 1000,205", 
            hx: 1000, hy: 205, ha: -3,
            claws: [{x:350, y:215}, {x:650, y:220}]
          }; 
          break;
        case 1: // 见龙 (Gentle rise)
          data = { 
            path: "M-100,200 C150,210 250,190 400,175 S700,190 850,170 S950,150 1000,140", 
            hx: 1000, hy: 140, ha: -20,
            claws: [{x:400, y:175}, {x:750, y:180}]
          }; 
          break;
        case 2: // 或跃 (Dynamic S-Curve)
          data = { 
            path: "M-100,180 C150,220 300,130 500,160 S800,130 900,110 S950,100 1000,95", 
            hx: 1000, hy: 95, ha: -12,
            claws: [{x:480, y:160}, {x:780, y:120}]
          }; 
          break;
        case 3: // 飞龙 (Majestic Arch)
          data = { 
            path: "M-100,180 C200,200 300,160 500,70 S800,-10 900,40 S980,50 1000,50", 
            hx: 1000, hy: 50, ha: 8,
            claws: [{x:460, y:90}, {x:760, y:20}]
          }; 
          break;
        case 4: // 亢龙 (High tension, twisting)
          data = { 
            path: "M-100,150 C100,50 300,210 500,90 S750,-40 850,60 S950,110 1000,100", 
            hx: 1000, hy: 100, ha: -8,
            claws: [{x:420, y:150}, {x:780, y:50}]
          }; 
          break;
        case 5: // 改命 (Reset, flowing)
          data = { 
            path: "M-100,180 C250,140 450,230 650,170 S850,130 1000,170", 
            hx: 1000, hy: 170, ha: 18,
            claws: [{x:480, y:200}, {x:820, y:150}]
          }; 
          break;
        default:
          data = { path: "M0,150 L1000,150", hx: 1000, hy: 150, ha: 0, claws: [] };
      }
    } else {
      // CYBER: Sharper, angular paths
      switch (stageIndex) {
        case 0:
          data = { path: "M0,190 L250,195 L500,190 L750,195 L1000,190", hx: 1000, hy: 190, ha: 0, claws: [{x:350,y:192}, {x:750,y:192}] }; break;
        case 1:
          data = { path: "M0,180 L250,180 L500,160 L750,160 L1000,140", hx: 1000, hy: 140, ha: -15, claws: [{x:500,y:160}] }; break;
        case 2:
          data = { path: "M0,160 L250,130 L500,170 L750,110 L1000,90", hx: 1000, hy: 90, ha: -10, claws: [{x:350,y:150}, {x:800,y:100}] }; break;
        case 3:
          data = { path: "M0,140 L250,80 L500,140 L800,20 L1000,50", hx: 1000, hy: 50, ha: 10, claws: [{x:450,y:120}, {x:850,y:40}] }; break;
        case 4:
          data = { path: "M0,150 L200,30 L400,170 L700,30 L900,120 L1000,100", hx: 1000, hy: 100, ha: -15, claws: [{x:300,y:100}, {x:800,y:90}] }; break;
        case 5:
          data = { path: "M0,160 L350,130 L650,190 L1000,160", hx: 1000, hy: 160, ha: -10, claws: [{x:500,y:160}] }; break;
        default:
          data = { path: "M0,150 L1000,150", hx: 1000, hy: 150, ha: 0, claws: [] };
      }
    }
    return data;
  }, [stageIndex, isMystic]);

  return (
    <div className="w-full h-full overflow-visible gpu-accelerated" style={{ animation: isMystic ? 'floatY 6s ease-in-out infinite' : 'floatY-slow 4s ease-in-out infinite' }}>
      <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 200" preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* --- MYSTIC DEFINITIONS (HIGH FIDELITY) --- */}
          
          {/* 1. Scale Plate Gradient: 3D Convex Perception with Iridescence */}
          <linearGradient id="scalePlateGrad" x1="0.5" y1="0" x2="0.5" y2="1">
             <stop offset="0%" stopColor="#FEF3C7" stopOpacity="1"/> {/* Specular White Gold */}
             <stop offset="25%" stopColor="#F59E0B" stopOpacity="1"/> {/* Mid Gold */}
             <stop offset="60%" stopColor="#92400E" stopOpacity="1"/> {/* Deep Bronze */}
             <stop offset="90%" stopColor="#3B0764" stopOpacity="0.8"/> {/* Purple/Black Shadow (Iridescence) */}
          </linearGradient>

          {/* 2. Realistic Imperial Armor Pattern - ENHANCED TEXTURE */}
          <pattern id="goldArmorScales" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
             {/* Base Dark Background for gaps */}
             <rect width="24" height="24" fill="#2A1002" opacity="0.6"/>
             
             {/* Main Scale Plate (Shield Shape) */}
             <path d="M12,1 L23,12 L12,23 L1,12 Z" fill="url(#scalePlateGrad)" stroke="#78350F" strokeWidth="0.5" />
             
             {/* Scale Rim Highlight (Bevel) */}
             <path d="M12,1 L23,12" fill="none" stroke="#FDE68A" strokeWidth="0.8" opacity="0.7"/>
             
             {/* Central Ridge Highlight (The Keel) */}
             <path d="M12,3 L12,21" stroke="#FEF3C7" strokeWidth="0.8" opacity="0.8" strokeLinecap="round" />
             
             {/* Surface Texture Dots (Wear/Grit) - Varied */}
             <circle cx="6" cy="12" r="0.4" fill="#000" opacity="0.4"/>
             <circle cx="18" cy="12" r="0.4" fill="#000" opacity="0.4"/>
             <circle cx="12" cy="6" r="0.6" fill="#FFF" opacity="0.3"/>
             <circle cx="12" cy="18" r="0.3" fill="#FFF" opacity="0.1"/>
          </pattern>
          
          {/* 3. Skin Roughness Filter (Turbulence for Organic Feel) */}
          <filter id="scaleTexture">
             <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="4" result="noise"/>
             <feColorMatrix type="matrix" values="0 0 0 0 0.3   0 0 0 0 0.2   0 0 0 0 0.1   0 0 0 0 0.25 0" in="noise" result="coloredNoise"/>
             <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" result="compositeNoise"/>
             <feBlend mode="multiply" in="compositeNoise" in2="SourceGraphic" result="texturedSource"/>
          </filter>

          {/* 4. Belly Ribs Pattern */}
          <pattern id="bellyScales" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(90)">
             <rect x="0" y="0" width="16" height="16" fill="#FDE68A" opacity="0.05"/>
             <line x1="0" y1="2" x2="16" y2="2" stroke="#FCD34D" strokeWidth="1.5" opacity="0.4"/>
             <line x1="0" y1="14" x2="16" y2="14" stroke="#D97706" strokeWidth="1" opacity="0.2"/>
          </pattern>

          {/* 5. Body Gradient - Rich Iridescence */}
          <linearGradient id="mysticBodyGradient" x1="0" y1="0" x2="1" y2="0">
             <stop offset="0%" stopColor="#2A1002"/> {/* Nearly Black */}
             <stop offset="20%" stopColor="#78350F"/> {/* Deep Bronze */}
             <stop offset="45%" stopColor="#D97706"/> {/* Amber */}
             <stop offset="50%" stopColor="#FEF3C7"> {/* Bright Gold Specular */}
                <animate attributeName="stop-color" values="#FEF3C7;#FFFFFF;#FEF3C7" dur="4s" repeatCount="indefinite" />
                <animate attributeName="offset" values="0.45;0.55;0.45" dur="4s" repeatCount="indefinite" />
             </stop>
             <stop offset="55%" stopColor="#D97706"/>
             <stop offset="80%" stopColor="#78350F"/>
             <stop offset="100%" stopColor="#2A1002"/>
          </linearGradient>

          {/* 6. 3D Lighting Filter - Wet Metal Look */}
          <filter id="bodyLight3D" filterUnits="objectBoundingBox" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur"/>
            <feSpecularLighting in="blur" surfaceScale="12" specularConstant="2.2" specularExponent="45" lightingColor="#FFFBEB" result="specOut">
              <fePointLight x="500" y="-800" z="400"/>
            </feSpecularLighting>
            <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut2"/>
            <feComposite in="SourceGraphic" in2="specOut2" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litBody"/>
          </filter>

          <filter id="heatHaze">
             <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="warp" />
             <feDisplacementMap xChannelSelector="R" yChannelSelector="G" scale="15" in="SourceGraphic" in2="warp" />
          </filter>

          {/* --- CYBER DEFINITIONS --- */}
          <pattern id="cyberGrid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
             <path d="M30,0 L15,25 L0,0" fill="none" stroke="#06B6D4" strokeWidth="0.5" opacity="0.3"/>
             <rect x="10" y="10" width="10" height="10" fill="#22D3EE" opacity="0.1"/>
          </pattern>
          
          <filter id="neonGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <linearGradient id="cyberMain" x1="0" y1="0" x2="1" y2="0">
             <stop offset="0%" stopColor="#0F172A" stopOpacity="0.9"/>
             <stop offset="50%" stopColor="#06B6D4" stopOpacity="1"/>
             <stop offset="100%" stopColor="#0F172A" stopOpacity="0.9"/>
          </linearGradient>
        </defs>

        {/* --- RENDER LAYERS --- */}

        {/* LAYER -1: Drop Shadow for Height */}
        {isMystic && (
           <path 
             d={dragonGeometry.path} 
             fill="none" 
             stroke="#000" 
             strokeWidth="45"
             strokeLinecap="round"
             opacity="0.4"
             filter="blur(20px)"
             className="dragon-path-transition"
             style={{ transform: 'translateY(50px)' }}
           />
        )}

        {/* LAYER 0: Dragon Aura/Qi */}
        <path 
          d={dragonGeometry.path} 
          fill="none" 
          stroke={isMystic ? "#B45309" : "#22D3EE"} 
          strokeWidth={isMystic ? 140 : 80}
          strokeLinecap="round"
          opacity={isMystic ? 0.15 : 0.1}
          filter={isMystic ? "url(#heatHaze)" : "blur(30px)"}
          className="dragon-path-transition"
        />

        {/* LAYER 1: Belly Scutes (Underbelly) - Offset down */}
        <path 
          d={dragonGeometry.path} 
          fill="none" 
          stroke={isMystic ? "url(#bellyScales)" : "#164E63"} 
          strokeWidth={isMystic ? 38 : 20}
          strokeLinecap="round"
          className="dragon-path-transition"
          style={{ transform: 'translateY(12px)' }} 
        />

        {/* LAYER 2: Main Body Mass - Imperial Gold with Filter */}
        <path 
          d={dragonGeometry.path} 
          fill="none" 
          stroke={isMystic ? "url(#mysticBodyGradient)" : "url(#cyberMain)"}
          strokeWidth={isMystic ? 55 : 30}
          strokeLinecap="round"
          filter={isMystic ? "url(#bodyLight3D)" : "url(#neonGlow)"}
          className="dragon-path-transition"
        />
        
        {/* LAYER 2.5: Organic Skin Texture (Subtle Noise) */}
        {isMystic && (
          <path 
            d={dragonGeometry.path} 
            fill="none" 
            stroke="#000"
            strokeWidth={55}
            strokeLinecap="round"
            filter="url(#scaleTexture)"
            opacity="0.2"
            className="dragon-path-transition"
            style={{ mixBlendMode: 'overlay' }}
          />
        )}

        {/* LAYER 3: Exquisite Scale Texture Overlay */}
        <path 
          d={dragonGeometry.path} 
          fill="none" 
          stroke={isMystic ? "url(#goldArmorScales)" : "url(#cyberGrid)"}
          strokeWidth={isMystic ? 52 : 30}
          strokeLinecap="round"
          className="dragon-path-transition"
          style={{ mixBlendMode: 'overlay', opacity: 1 }}
        />

        {/* LAYER 4: Spine Ridge Glow */}
        {isMystic && (
          <path 
            d={dragonGeometry.path} 
            fill="none" 
            stroke="#FEF3C7" 
            strokeWidth="2"
            strokeLinecap="round"
            className="dragon-path-transition"
            style={{ transform: 'translateY(-18px)', opacity: 0.6, filter: 'blur(2px)' }}
          />
        )}

        {/* LAYER 5: Dorsal Spines - Sawtooth Effect */}
        {/* Shadow Layer for Spines */}
        {isMystic ? (
            <>
               <path 
                 d={dragonGeometry.path} 
                 stroke="#78350F" 
                 strokeWidth="22" 
                 fill="none" 
                 strokeDasharray="1 30" 
                 strokeLinecap="butt"
                 className="dragon-path-transition"
                 style={{ transform: 'translateY(-26px)' }}
               />
               <path 
                 d={dragonGeometry.path} 
                 stroke="#F59E0B" 
                 strokeWidth="22" 
                 fill="none" 
                 strokeDasharray="4 27" 
                 strokeDashoffset="-2"
                 strokeLinecap="butt"
                 className="dragon-path-transition"
                 style={{ transform: 'translateY(-27px)' }}
               />
            </>
        ) : (
            <path 
              d={dragonGeometry.path} 
              fill="none" 
              stroke="#22D3EE" 
              strokeWidth="4"
              strokeDasharray="4 12" 
              strokeLinecap="round"
              className="dragon-path-transition"
              style={{ transform: 'translateY(-26px)' }}
            />
        )}

        {/* LAYER 6: Claws */}
        {dragonGeometry.claws.map((pos, i) => (
           <g key={i} transform={`translate(${pos.x}, ${pos.y})`} className="dragon-path-transition">
              <DragonClaw isMystic={isMystic} />
           </g>
        ))}

        {/* LAYER 7: Floating Particles (Dragon Dust) */}
        {isMystic && [1,2,3,4].map(i => (
           <circle key={`dust-${i}`} r={1 + Math.random()} fill="#FCD34D" opacity="0.6" filter="drop-shadow(0 0 2px gold)">
              <animateMotion dur={`${4+i}s`} repeatCount="indefinite" path={dragonGeometry.path} rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
              <animate attributeName="opacity" values="0;0.8;0" dur={`${4+i}s`} repeatCount="indefinite" />
           </circle>
        ))}

        {/* LAYER 8: The HEAD */}
        <g 
          className="dragon-path-transition"
          style={{ 
            transform: `translate(${dragonGeometry.hx}px, ${dragonGeometry.hy}px) rotate(${dragonGeometry.ha}deg)`,
            transformOrigin: `${dragonGeometry.hx}px ${dragonGeometry.hy}px`
          }}
        >
          {isMystic ? <MysticHead stageIndex={stageIndex} /> : <CyberHead />}
        </g>
      </svg>
    </div>
  );
};

// --- SUB-COMPONENTS FOR HIGH FIDELITY ARTWORK ---

const DragonClaw: React.FC<{ isMystic: boolean }> = ({ isMystic }) => {
  if (isMystic) {
    return (
      // Scaled up to match thicker body
      <g transform="scale(1.5) rotate(10)">
         <defs>
            {/* Pattern for Claw Skin */}
            <pattern id="clawTexture" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
               <path d="M0,0 H4" stroke="#451A03" strokeWidth="0.5" opacity="0.3"/>
            </pattern>
            <linearGradient id="clawGrad" x1="0" y1="0" x2="1" y2="1">
               <stop offset="0%" stopColor="#451A03"/>
               <stop offset="40%" stopColor="#92400E"/>
               <stop offset="100%" stopColor="#FEF3C7"/>
            </linearGradient>
         </defs>
        {/* Animated Rear Claw Fingers - Grasping Motion */}
        <g style={{ animation: 'grasp 5s ease-in-out infinite' }}>
            {/* Dewclaw (Thumb) */}
            <path d="M-8,5 Q-15,10 -12,18" stroke="url(#clawGrad)" strokeWidth="3" fill="none" strokeLinecap="round" />
            
            {/* Main Talons with Texture */}
            <path d="M-5,0 Q-12,15 -18,22" stroke="url(#clawGrad)" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M-5,0 Q-12,15 -18,22" stroke="url(#clawTexture)" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.5"/>
            
            <path d="M0,0 Q-3,18 -6,28" stroke="url(#clawGrad)" strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M0,0 Q-3,18 -6,28" stroke="url(#clawTexture)" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.5"/>

            <path d="M5,0 Q10,15 15,22" stroke="url(#clawGrad)" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M5,0 Q10,15 15,22" stroke="url(#clawTexture)" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.5"/>
            
            {/* Talon Tips (Sharp & Light) */}
            <path d="M-18,22 L-20,24" stroke="#FEF3C7" strokeWidth="2" />
            <path d="M-6,28 L-7,31" stroke="#FEF3C7" strokeWidth="2" />
            <path d="M15,22 L17,24" stroke="#FEF3C7" strokeWidth="2" />
        </g>
        {/* Knuckles/Palm */}
        <circle cx="0" cy="0" r="8" fill="#92400E" stroke="#78350F" strokeWidth="2" />
        <circle cx="0" cy="0" r="4" fill="#F59E0B" opacity="0.5" filter="blur(1px)" />
      </g>
    );
  } else {
    return (
      <g transform="scale(1.0)">
        <path d="M0,0 L-8,12" stroke="#06B6D4" strokeWidth="3" />
        <path d="M0,0 L8,12" stroke="#06B6D4" strokeWidth="3" />
        <path d="M0,0 L0,15" stroke="#22D3EE" strokeWidth="4" />
        <rect x="-4" y="-4" width="8" height="8" fill="#164E63" stroke="#22D3EE" />
      </g>
    );
  }
};

const MysticHead: React.FC<{ stageIndex: number }> = ({ stageIndex }) => {
  // Determine Mane Wind Speed & Direction based on Life Stage Energy
  const { speed, windX, windY, turbulence } = useMemo(() => {
    switch (stageIndex) {
      case 3: // Flying: High Energy, Wind pushing back hard
        return { speed: 0.8, windX: -20, windY: 5, turbulence: 'high' };
      case 2: // Leaping: Dynamic, upward momentum
        return { speed: 1.2, windX: -10, windY: 10, turbulence: 'med' };
      case 4: // Regret/Excess: Turbulent, chaotic
        return { speed: 1.0, windX: -5, windY: -5, turbulence: 'high' };
      case 1: // Field: Gentle breeze
        return { speed: 2.0, windX: -2, windY: 0, turbulence: 'low' };
      case 0: // Hidden: Still, floating upwards
        return { speed: 3.0, windX: 0, windY: -2, turbulence: 'low' };
      default: 
        return { speed: 2.0, windX: -5, windY: 0, turbulence: 'med' };
    }
  }, [stageIndex]);

  return (
    <g transform="scale(2.2) translate(-32, -20)">
    
    {/* 1. Neck/Mane Connection - Multi-layered for Volume */}
    <g transform="translate(-10, 5)">
       {/* Deep Layer */}
       <path d="M0,0 Q-15,-5 -30,5 Q-35,15 -20,20" stroke="#451A03" strokeWidth="8" fill="none" opacity="0.8" />
       {/* Mid Layer */}
       <path d="M-5,5 Q-20,0 -35,10" stroke="#92400E" strokeWidth="6" fill="none" strokeLinecap="round" />
    </g>

    {/* 2. Flowing Mane Layers (Dynamic Hair with Stage Physics) */}
    {/* The Group transform simulates the average wind direction for the stage */}
    <g style={{ transition: 'transform 1.5s ease-out', transform: `translate(${windX*0.3}px, ${windY*0.3}px) rotate(${windX * -0.5}deg)` }}>
       {/* Strand 1 (Base - Heavy) */}
       <path 
         d="M-15,10 C-35,0 -55,15 -80,5" 
         stroke="#78350F" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.9" 
         style={{ animation: `mane-flow ${speed * 1.5}s ease-in-out infinite alternate`, transformOrigin: '-15px 10px' }}
       />
       {/* Strand 2 (Highlight - Mid) */}
       <path 
         d="M-12,12 C-35,20 -55,20 -85,30" 
         stroke="#D97706" strokeWidth="3" fill="none" strokeLinecap="round" 
         style={{ animation: `mane-flow ${speed}s ease-in-out infinite alternate`, animationDelay: `-${speed * 0.3}s`, transformOrigin: '-12px 12px' }}
       />
       {/* Strand 3 (Light - Whippy) */}
       <path 
         d="M-10,8 C-30,-5 -50,-5 -75,-15" 
         stroke="#F59E0B" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.8" 
         style={{ animation: `mane-flow ${speed * 0.8}s ease-in-out infinite alternate`, animationDelay: `-${speed * 0.5}s`, transformOrigin: '-10px 8px' }}
       />
       {/* Strand 4 (Detail - Turbulent/Frizz) */}
       <path 
         d="M-15,15 C-25,25 -45,25 -70,40" 
         stroke="#92400E" strokeWidth="1" fill="none" strokeLinecap="round" 
         style={{ animation: `mane-flow ${speed * 0.6}s ease-in-out infinite alternate-reverse`, animationDelay: `-${speed * 0.1}s`, transformOrigin: '-15px 15px' }}
       />
    </g>
    
    {/* 3. Antlers (Textured) */}
    <g transform="translate(0, -2)">
        <path d="M8,-2 C8,-18 -2,-28 -25,-40" stroke="#451A03" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M8,-2 C8,-18 -2,-28 -25,-40" stroke="#B45309" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeDasharray="1 3"/>
        <path d="M-2,-18 Q8,-28 18,-32" stroke="#451A03" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M-12,-25 Q-22,-35 -38,-30" stroke="#451A03" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>

    {/* 4. Jaw & Mouth Interior */}
    <g transform="rotate(5 0 20)">
        {/* Mouth Interior */}
        <path d="M-5,22 Q10,24 28,26 L32,16 Q10,16 -5,12 Z" fill="#450A0A" /> 
        
        {/* Forked Tongue */}
        <path d="M0,22 Q12,20 22,22 L26,21 M22,22 L26,23" stroke="#EF4444" strokeWidth="1.8" fill="none" strokeLinecap="round" />

        {/* Teeth/Fangs - Razor Sharp */}
        <path d="M28,16 L28,20 L31,16 Z" fill="#FEF3C7" />
        <path d="M18,16 L18,19 L20,16 Z" fill="#FEF3C7" />
        <path d="M8,16 L8,19 L10,16 Z" fill="#FEF3C7" />
    </g>

    {/* Upper Snout (Dragon Style) */}
    <path d="M-5,12 Q10,6 32,14 Q40,16 45,21 Q38,24 28,22 H0" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
    <path d="M-5,12 Q10,6 32,14 Q40,16 43,20" fill="none" stroke="#FEF3C7" strokeWidth="0.8" opacity="0.7" /> {/* Specular Ridge */}

    {/* Lower Jaw (Bearded) */}
    <path d="M-5,22 Q10,26 28,26 Q22,32 10,32 Q-5,30 -12,24" fill="#D97706" stroke="#92400E" strokeWidth="1.5" />
    
    {/* Chin Beard - Long Flowing */}
    <g style={{ animation: `whisker-sway ${speed * 1.5}s ease-in-out infinite alternate` }}>
        <path d="M18,30 Q18,40 22,45" stroke="#F59E0B" strokeWidth="1.5" fill="none" />
        <path d="M12,31 Q10,42 12,48" stroke="#F59E0B" strokeWidth="1.5" fill="none" />
        <path d="M5,30 Q2,40 -2,45" stroke="#F59E0B" strokeWidth="1.5" fill="none" />
    </g>

    {/* Nostril (Flaring) */}
    <ellipse cx="38" cy="17" rx="1.5" ry="1" fill="#451A03">
       <animate attributeName="ry" values="1;2;1" dur="1.2s" repeatCount="indefinite" />
    </ellipse>

    {/* Brow Ridge (Armored) */}
    <path d="M-8,10 Q10,-6 32,12" fill="#D97706" stroke="#78350F" strokeWidth="2" />
    <path d="M-8,10 Q10,-6 32,12" fill="none" stroke="#FDE68A" strokeWidth="0.5" transform="translate(0,1)" opacity="0.6"/>
    
    {/* 5. Eye (Reptilian with Blinking) */}
    <g transform="translate(16, 9)">
       <path d="M-5,0 Q0,-4 5,0 Q0,4 -5,0 Z" fill="#FCD34D" filter="drop-shadow(0 0 3px #F59E0B)" />
       <rect x="-0.8" y="-3.5" width="1.6" height="7" fill="#000" rx="0.8"> {/* Slit Pupil */}
          <animate attributeName="width" values="1.6;2.5;1.6" dur="3s" repeatCount="indefinite" />
       </rect>
       <circle cx="2" cy="-1.5" r="1" fill="#FFF" opacity="0.95" /> {/* Glint */}
       
       {/* Eyelid Blink */}
       <path d="M-6,-5 Q0,-8 6,-5 L6,0 Q0,-4 -6,0 Z" fill="#92400E">
          <animate attributeName="d" values="M-6,-5 Q0,-8 6,-5 L6,0 Q0,-4 -6,0 Z; M-6,-5 Q0,-8 6,-5 L6,5 Q0,1 -6,5 Z; M-6,-5 Q0,-8 6,-5 L6,0 Q0,-4 -6,0 Z" keyTimes="0; 0.05; 0.1" dur="3.5s" repeatCount="indefinite" />
       </path>
    </g>
    
    {/* 6. Whiskers (Barbels) - Long & Graceful */}
    <path d="M35,20 C45,28 55,48 35,60" stroke="#FEF3C7" strokeWidth="1.2" fill="none" opacity="0.9" style={{ animation: `whisker-sway ${speed * 2}s ease-in-out infinite` }} />
    <path d="M37,18 C50,10 65,0 75,12" stroke="#FEF3C7" strokeWidth="1" fill="none" opacity="0.8" style={{ animation: `whisker-sway-2 ${speed * 2.5}s ease-in-out infinite` }} />

    {/* Floating Dragon Pearl - Spinning Vortex */}
    <g transform="translate(70, 10)">
        <circle cx="0" cy="0" r="6" fill="url(#orbitActive)" filter="drop-shadow(0 0 10px #F59E0B)">
           <animate attributeName="cy" values="0;-5;0" dur="2.5s" repeatCount="indefinite" />
        </circle>
        {/* Vortex Rings */}
        <ellipse cx="0" cy="0" rx="8" ry="2" stroke="#FDE68A" strokeWidth="0.5" fill="none" opacity="0.6">
            <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="2s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="0" cy="0" rx="8" ry="2" stroke="#FDE68A" strokeWidth="0.5" fill="none" opacity="0.4">
            <animateTransform attributeName="transform" type="rotate" from="90 0 0" to="450 0 0" dur="2s" repeatCount="indefinite" />
        </ellipse>
    </g>
  </g>
)};

const CyberHead = () => (
  <g transform="scale(1.1) translate(-25, -15)">
    {/* Mechanical Plating */}
    <path d="M-20,10 L10,5 L35,10 L30,25 L5,30 L-15,25 Z" fill="#0F172A" stroke="#06B6D4" strokeWidth="1.5" />
    
    {/* Glowing Visor */}
    <path d="M10,10 L28,13 L10,16 Z" fill="#22D3EE" filter="drop-shadow(0 0 4px #22D3EE)" className="animate-pulse-fast" />
    
    {/* Antenna Array */}
    <path d="M0,5 L-10,-10 L-5,-15" stroke="#06B6D4" strokeWidth="2" fill="none" />
    <circle cx="-5" cy="-15" r="2" fill="#22D3EE" className="animate-pulse" />
    <path d="M-5,5 L-20,-5" stroke="#06B6D4" strokeWidth="1" fill="none" />
    
    {/* Exhaust Vents */}
    <g transform="translate(-20, 20)">
      <rect width="10" height="4" fill="#164E63" />
      <line x1="0" y1="2" x2="-15" y2="2" stroke="#22D3EE" strokeWidth="1" strokeDasharray="2 2" opacity="0.8">
         <animate attributeName="stroke-dashoffset" from="10" to="0" dur="0.2s" repeatCount="indefinite" />
      </line>
    </g>

    {/* HUD Elements */}
    <circle cx="45" cy="12" r="8" fill="none" stroke="#22D3EE" strokeWidth="0.5" strokeDasharray="4 2">
       <animateTransform attributeName="transform" type="rotate" from="0 45 12" to="360 45 12" dur="4s" repeatCount="indefinite" />
    </circle>
    <circle cx="45" cy="12" r="2" fill="#22D3EE" />
  </g>
);