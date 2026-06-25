
import React from 'react';
import { SegmentInsight, EraMeta, UserBaziMeta } from '../types';
import { X, TrendingUp, CloudRain, RotateCcw, Users, Box, Calendar, ChevronRight, Shield, Zap, Target, Activity, Heart, Briefcase, Coins, AlertTriangle } from 'lucide-react';

interface SegmentInsightSheetProps {
  isOpen: boolean;
  onClose: () => void;
  insight: SegmentInsight | null;
  era: EraMeta;
  user: UserBaziMeta;
}

export const SegmentInsightSheet: React.FC<SegmentInsightSheetProps> = ({ isOpen, onClose, insight, era, user }) => {
  if (!insight) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className={`fixed bottom-0 left-0 w-full h-[85vh] bg-[#020408] rounded-t-[32px] z-50 transform transition-transform duration-300 ease-out flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.8)] border-t border-white/10 font-sans ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
        
        {/* Header - More Premium */}
        <div className="flex-shrink-0 p-8 pb-4 relative">
          <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />
          <button onClick={onClose} className="absolute right-6 top-6 text-slate-500 hover:text-white transition-colors p-2 bg-white/5 rounded-full hover:bg-white/10">
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-3 mb-3">
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400">
                <Calendar size={12} />
                <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
                  {insight.time_range?.start_date} <span className="text-teal-600/50 mx-1">/</span> {insight.time_range?.end_date}
                </span>
             </div>
          </div>
          
          <h2 className="text-3xl font-bold text-white leading-tight tracking-tight">
            <span className="text-slate-500 text-lg block mb-1 font-medium tracking-normal opacity-80">Deep Analysis</span>
            这一段 · 你到底在经历什么？
          </h2>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-16 space-y-6 no-scrollbar">
          
          {/* Main Status Summary - Featured Block (Optimized for Conciseness) */}
          <div className="bg-gradient-to-br from-[#0F172A] to-[#020408] border border-white/5 rounded-[24px] p-6 shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingUp size={120} />
             </div>
             
             <div className="relative z-10">
                 <div className="flex items-center gap-2 text-teal-400 mb-4">
                    <TrendingUp size={16} />
                    <span className="text-xs font-bold uppercase tracking-[0.2em]">01. 核心定位</span>
                 </div>
                 
                 <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
                    "{insight.stage?.label || '未知阶段'}"
                 </h3>
                 <p className="text-sm font-medium text-teal-200 mb-6 opacity-90">
                    角色：{insight.stage?.role_label || '观察者'}
                 </p>

                 {/* Keywords - Concise Display */}
                 <div className="flex flex-wrap gap-2 mb-4">
                    {insight.detailed_analysis?.core_keywords?.map((keyword: string, i: number) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-200 font-medium">
                        #{keyword}
                      </span>
                    )) || (
                       <>
                         <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-200 font-medium">#蓄势</span>
                         <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-200 font-medium">#试错</span>
                       </>
                    )}
                 </div>
                 
                 <div className="w-full h-px bg-white/5 my-4" />
                 
                 <p className="text-sm text-slate-300 leading-relaxed font-normal text-justify">
                    {insight.detailed_analysis?.status_summary || insight.stage?.brief || '暂无详细分析'}
                 </p>
             </div>
          </div>

          {/* NEW: Strategy Dashboard (Strategy Matrix & Energy Radar) */}
          <div className="bg-[#0A0C14] border border-white/5 rounded-[24px] p-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                 <Target size={100} />
             </div>
             
             <div className="flex items-center gap-2 text-amber-400 mb-6">
                <Zap size={16} />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">02. 战略仪表盘 · Strategy</span>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Strategy Matrix */}
                <div className="space-y-4">
                   <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 backdrop-blur-sm">
                      <div className="flex items-center gap-2 mb-1">
                         <TrendingUp size={14} className="text-emerald-400" />
                         <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">进攻 (Offense)</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-normal">
                         {insight.detailed_analysis?.strategy_matrix?.offensive || "主动出击，寻找小范围试点机会。"}
                      </p>
                   </div>
                   
                   <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 backdrop-blur-sm">
                      <div className="flex items-center gap-2 mb-1">
                         <Shield size={14} className="text-rose-400" />
                         <span className="text-[10px] text-rose-300 font-bold uppercase tracking-wider">防守 (Defense)</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-normal">
                         {insight.detailed_analysis?.strategy_matrix?.defensive || "守住现金流底线，拒绝无效社交。"}
                      </p>
                   </div>
                   
                   <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-3 backdrop-blur-sm">
                      <div className="flex items-center gap-2 mb-1">
                         <RotateCcw size={14} className="text-indigo-400" />
                         <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">转折 (Pivot)</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-normal">
                         {insight.detailed_analysis?.strategy_matrix?.pivot || "将旧技能重新组合，适应新环境。"}
                      </p>
                   </div>
                </div>

                {/* Right: Energy Radar (Visual Bars) */}
                <div className="flex flex-col justify-center">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4">能量分布预测</p>
                    <div className="space-y-4">
                       {[
                         { label: '事业 / Career', icon: Briefcase, val: insight.detailed_analysis?.energy_distribution?.career || 60, color: 'bg-cyan-500' },
                         { label: '财富 / Wealth', icon: Coins, val: insight.detailed_analysis?.energy_distribution?.wealth || 40, color: 'bg-amber-500' },
                         { label: '关系 / Social', icon: Users, val: insight.detailed_analysis?.energy_distribution?.relationships || 70, color: 'bg-rose-500' },
                         { label: '健康 / Health', icon: Heart, val: insight.detailed_analysis?.energy_distribution?.health || 50, color: 'bg-emerald-500' }
                       ].map((item, i) => (
                          <div key={i}>
                             <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-medium">
                                <div className="flex items-center gap-1.5">
                                   <item.icon size={10} />
                                   <span>{item.label}</span>
                                </div>
                                <span className="font-mono">{item.val}%</span>
                             </div>
                             <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className={`h-full ${item.color} opacity-80 rounded-full transition-all duration-1000`} style={{ width: `${item.val}%` }} />
                             </div>
                          </div>
                       ))}
                    </div>
                </div>
             </div>
          </div>

          {/* Grid Layout for Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mood & Reality */}
              <div className="bg-[#0A0C14] border border-white/5 rounded-[24px] p-6">
                <div className="flex items-center gap-2 text-indigo-400 mb-4">
                  <CloudRain size={16} />
                  <span className="text-xs font-bold uppercase tracking-[0.2em]">03. 现实与心境</span>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">主观感受 (Mood)</p>
                    <p className="text-sm text-white font-medium">{insight.mood?.final_label || 'Neutral'}</p>
                  </div>
                  
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-bold">关键事件锚点</p>
                    <p className="text-xs text-slate-300 leading-relaxed pl-3 border-l-2 border-indigo-500/30 italic font-normal">
                      "{insight.key_event_summary}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Pattern Recognition */}
              <div className="bg-[#0A0C14] border border-white/5 rounded-[24px] p-6">
                <div className="flex items-center gap-2 text-orange-400 mb-4">
                  <RotateCcw size={16} />
                  <span className="text-xs font-bold uppercase tracking-[0.2em]">04. 模式识别</span>
                </div>
                
                {insight.pattern?.pattern_detected ? (
                  <div className="space-y-3">
                     <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 rounded-lg border border-orange-500/20 text-orange-300 text-xs font-bold">
                        <AlertTriangle size={12} />
                        <span>循环触发：{insight.pattern?.pattern_label}</span>
                     </div>
                     <p className="text-xs text-slate-300 leading-relaxed font-normal">
                        {insight.pattern?.pattern_description}
                     </p>
                  </div>
                ) : (
                  <div className="h-full flex flex-col justify-center">
                    <p className="text-xs text-slate-400 text-center leading-relaxed font-normal">
                      本次未检测到明显的负向循环。<br/>你正在经历一段全新的成长体验。
                    </p>
                  </div>
                )}
              </div>
          </div>

          {/* Big Data Cluster */}
          <div className="bg-[#0A0C14] border border-white/5 rounded-[24px] p-6">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2 text-rose-400">
                  <Users size={16} />
                  <span className="text-xs font-bold uppercase tracking-[0.2em]">05. 群体画像参照</span>
               </div>
               <div className="text-[10px] text-slate-500 font-mono">
                  N={insight.cluster?.sample_size || 0}
               </div>
            </div>

            <div className="flex gap-4 items-center mb-4 overflow-x-auto no-scrollbar pb-2">
              {insight.cluster?.main_outcomes?.map((outcome, i) => (
                <div key={i} className="flex-shrink-0 bg-white/5 rounded-2xl p-4 border border-white/5 min-w-[100px] text-center">
                  <div className="text-xl font-bold text-white mb-1">{outcome.percentage}%</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{outcome.label}</div>
                </div>
              ))}
            </div>
            
            <div className="relative">
               <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-rose-500/50 to-transparent" />
               <p className="pl-4 text-xs text-slate-300 italic leading-relaxed opacity-80 font-normal">
                  "{insight.cluster?.typical_story || '暂无典型故事'}"
               </p>
            </div>
          </div>

          {/* Footer Experiment Result */}
          <div className="mt-8 pt-8 border-t border-white/5 flex flex-col items-center">
             <div className="flex items-center gap-2 text-slate-600 mb-4">
                <Box size={14} />
                <span className="text-[10px] tracking-[0.2em] uppercase font-bold">本段推演结论</span>
             </div>
             
             <div className="grid grid-cols-2 gap-8 text-center max-w-sm w-full">
                <div>
                   <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-medium">客观走势</div>
                   <div className={`text-sm font-bold ${insight.trend?.objective_trend === 'up' ? 'text-teal-400' : 'text-slate-200'}`}>
                      {insight.trend?.objective_trend === 'up' ? '稳步上行' : insight.trend?.objective_trend === 'down' ? '震荡调整' : '盘整蓄势'}
                   </div>
                </div>
                <div>
                   <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-medium">底线评估</div>
                   <div className="text-sm font-bold text-slate-200">
                      {insight.trend?.safety_comment?.slice(0, 8) || '评估中'}...
                   </div>
                </div>
             </div>
             
             <p className="text-[10px] text-slate-600 text-center mt-6 max-w-xs leading-relaxed font-normal">
               AI仅提供结构化视角，<br/>最终解释权归属于你当下的直觉。
             </p>
          </div>

        </div>
      </div>
    </>
  );
};
