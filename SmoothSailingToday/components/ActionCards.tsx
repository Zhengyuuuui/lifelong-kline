import React from 'react';
import { DayData } from '../types';
import { ArrowUpRight, Sparkles, Wind, ChevronDown, ShieldCheck, TrendingUp, Clock, Info } from 'lucide-react';

export const SummaryBar = ({ topMessage }: { topMessage: string }) => (
  <div className="w-full flex justify-center mb-6 px-4">
    <div className="flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-lg">
      <div className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
      </div>
      <span className="text-[12px] font-medium text-indigo-100 tracking-wide">
        {topMessage}
      </span>
    </div>
  </div>
);

export const TodayStatusStrip = ({ data }: { data: DayData }) => (
  <div className="glass-card-frost rounded-[24px] p-5 flex items-center justify-between mb-4 relative overflow-hidden group">
    {/* Decorative background gradients */}
    <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
    
    <div className="relative z-10 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
            <h2 className="text-[17px] font-semibold text-white tracking-tight leading-snug">
                {data.summary}
            </h2>
        </div>
        <div className="flex items-center gap-3 mt-1">
           <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/10">
               <Sparkles size={10} className="text-emerald-400" />
               <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">推荐策略</span>
           </div>
           <span className="text-[11px] text-white/50">{data.modeLabel} · 顺势而为</span>
        </div>
    </div>
  </div>
);

export const MainWindowCard = ({ window }: { window: DayData['mainWindow'] }) => (
  <div className="glass-card-frost rounded-[28px] p-1 mb-6">
    <div className="p-5 pb-4">
        {/* Header Row */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
               <Clock size={14} className="text-emerald-400" />
               <span className="text-[18px] font-mono-num font-bold text-white tracking-tight">
                 {window.start} <span className="text-white/30 text-sm mx-1">→</span> {window.end}
               </span>
            </div>
            <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981]"></span>
               <span className="text-[12px] text-emerald-100 font-medium tracking-wide">
                 {window.description}
               </span>
            </div>
          </div>
          
          {/* Score Badge */}
          <div className="flex flex-col items-end">
              <div className="text-[24px] font-bold text-emerald-400 font-mono-num leading-none">{window.score}</div>
              <div className="text-[9px] text-emerald-500/60 font-bold uppercase tracking-wider mt-0.5">能量分</div>
          </div>
        </div>

        {/* Tags Row */}
        <div className="flex flex-wrap gap-2 mb-4">
          {window.tags.map((tag, i) => (
            <span key={i} className="text-[11px] text-white/70 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 font-medium">
              {tag}
            </span>
          ))}
        </div>
    </div>

    {/* Action Bar (Connected visually but slightly distinct) */}
    <div className="bg-white/5 rounded-[24px] p-2 flex gap-2 border-t border-white/5">
        <button className="flex-1 py-3 rounded-[20px] bg-white/5 hover:bg-white/10 active:scale-95 select-none transition-all duration-200 ease-out text-[13px] text-white/90 font-medium flex items-center justify-center gap-2">
            <Info size={14} className="opacity-50" /> 
            详情
        </button>
        <button className="flex-1 py-3 rounded-[20px] bg-emerald-500 hover:bg-emerald-400 active:scale-95 select-none transition-all duration-200 ease-out text-[13px] text-white font-bold shadow-[0_4px_12px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2">
            加入日程 <ArrowUpRight size={14} strokeWidth={3} />
        </button>
    </div>
  </div>
);

export const DestressCard = () => {
    const [expanded, setExpanded] = React.useState(false);

    return (
        <div 
            className={`glass-card-frost rounded-[24px] overflow-hidden cursor-pointer transition-all duration-300 border border-indigo-200/5 ${expanded ? 'bg-indigo-500/10' : ''}`}
            onClick={() => setExpanded(!expanded)}
        >
            <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl transition-colors ${expanded ? 'bg-indigo-500 text-white' : 'bg-white/5 text-indigo-300'}`}>
                        <Wind size={20} />
                    </div>
                    <div>
                        <div className="text-white text-[14px] font-semibold tracking-wide">今天可以不必...</div>
                        <div className="text-white/40 text-[11px] mt-0.5">减压避坑指南</div>
                    </div>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white/5 transition-transform duration-300 ${expanded ? 'rotate-180 bg-white/10' : ''}`}>
                    <ChevronDown size={16} className="text-white/60" />
                </div>
            </div>
            
            {expanded && (
                <div className="px-5 pb-5 pt-0 animate-[slide-up-spring_0.3s_ease-out]">
                    <div className="h-px w-full bg-white/5 mb-4" />
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <ShieldCheck size={16} className="mt-0.5 text-indigo-400 shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-[12px] text-white/90 font-medium">避免高强度谈判 (14:00-16:00)</span>
                                <span className="text-[11px] text-white/40 leading-relaxed mt-0.5">此时段对方防备心重，容易陷入僵局，建议改为内部研讨。</span>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <ShieldCheck size={16} className="mt-0.5 text-indigo-400 shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-[12px] text-white/90 font-medium">暂缓非核心邮件</span>
                                <span className="text-[11px] text-white/40 leading-relaxed mt-0.5">明天上午风向更好，回复效率提升 20%。</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}