import React from 'react';
import { EraMeta, UserBaziMeta, EraUserSynergy, StageMeta } from '../types';
import { Flame, Wind, Info, Settings, User, Lock, Activity, Sparkles } from 'lucide-react';
import { i18n } from '../services/i18n';

interface MetaHeaderProps {
  era: EraMeta;
  user: UserBaziMeta;
  synergy: EraUserSynergy;
  stage: StageMeta;
  onOpenSettings: () => void;
  isGuest?: boolean;
}

export const MetaHeader: React.FC<MetaHeaderProps> = ({ era, user, synergy, stage, onOpenSettings, isGuest = false }) => {
  const renderSecureContent = (content: React.ReactNode, blurIntensity = 'blur-md') => {
    if (!isGuest) return content;
    return (
      <div className="relative group cursor-pointer" onClick={onOpenSettings}>
         <div className={`select-none ${blurIntensity} opacity-40 transition-all duration-500 group-hover:blur-sm group-hover:opacity-80`}>
           {content}
         </div>
         <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/80 backdrop-blur-xl px-4 py-2 rounded-full flex items-center gap-2 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)] transform transition-transform group-hover:scale-105">
                <Lock size={14} className="text-amber-400" />
                <span className="text-[10px] font-bold text-amber-400 tracking-widest uppercase">解锁档案</span>
            </div>
         </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-1.5 p-1.5">
      {/* Top Row: Two Bento Boxes */}
      <div className="grid grid-cols-2 gap-1.5">
        
        {/* Left Box: User & Age */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/80 rounded-[12px] p-2 border border-white/10 relative overflow-hidden flex flex-col justify-between min-h-[60px] shadow-sm">
           <div className="absolute top-0 right-0 w-16 h-16 bg-teal-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
           <div className="flex justify-between items-start relative z-10">
              <span className="text-[10px] text-slate-300 font-medium tracking-widest">当前年龄</span>
           </div>
           <div className="relative z-10 mt-1">
              {renderSecureContent(
                <div className="flex items-baseline gap-1 leading-none">
                  <span className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">{user.age}</span>
                  <span className="text-xs text-teal-400 font-medium tracking-widest">{i18n.t('meta.age_unit')}</span>
                </div>
              )}
           </div>
        </div>

        {/* Right Box: Era & Environment */}
        <div className="bg-gradient-to-br from-orange-900/30 to-slate-900/80 rounded-[12px] p-2 border border-white/10 relative overflow-hidden flex flex-col justify-between min-h-[60px] shadow-sm">
           <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
           <div className="flex justify-between items-start relative z-10">
              <span className="text-[10px] text-slate-300 font-medium tracking-widest">时代大势</span>
              <div className="inline-flex items-center gap-1 px-1 py-0.5 rounded bg-orange-500/20 border border-orange-500/30">
                 <Flame size={8} className="text-orange-400" />
                 <span className="text-[8px] font-bold text-orange-300 tracking-widest">{i18n.t('meta.era_fire')}</span>
              </div>
           </div>
           <div className="relative z-10 flex flex-col mt-1">
              <span className="text-lg font-bold text-orange-50 tracking-wide leading-none">{era.year_pillar}</span>
              <span className="text-[10px] text-orange-400 font-bold mt-0.5">{i18n.t('meta.period_label')}</span>
           </div>
        </div>
      </div>

      {/* Bottom Row: Stage Card (The "或跃 · 突破" card) */}
      <div className="bg-gradient-to-r from-teal-900/20 via-slate-800/60 to-purple-900/20 rounded-[12px] p-2.5 border border-white/10 relative overflow-hidden shadow-sm">
         <div className="absolute inset-0 texture-stardust opacity-5 mix-blend-overlay pointer-events-none" />
         <div className="absolute right-0 bottom-0 w-20 h-20 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
         
         <div className="flex items-center justify-between mb-1 relative z-10">
            <div className="flex items-center gap-1.5">
               <Sparkles size={12} className="text-teal-400" />
               <span className="text-[10px] text-slate-300 font-medium tracking-widest">当前阶段与纪元</span>
            </div>
            {isGuest ? (
               <div className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                  <span className="text-[10px] text-amber-400 font-bold tracking-wider">访客模式</span>
               </div>
            ) : (
               <button 
                 onClick={onOpenSettings}
                 className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/20 text-white text-[10px] font-medium transition-colors"
               >
                 <Settings size={10} />
                 {i18n.t('meta.settings')}
               </button>
            )}
         </div>

         <div className="relative z-10">
            {renderSecureContent(
               <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                     <h3 className="text-2xl font-bold text-white tracking-wide drop-shadow-sm leading-none">
                        {stage.label}
                     </h3>
                     <div className="inline-flex items-center gap-1 bg-teal-500/20 px-2 py-0.5 rounded border border-teal-500/30">
                        <span className="text-xs text-teal-300 font-bold tracking-widest">
                           {user.epoch_label}
                        </span>
                     </div>
                  </div>
                  <div className="bg-black/20 p-2 rounded-md border border-white/10 backdrop-blur-sm">
                     <p className="text-[13px] text-slate-200 leading-relaxed font-medium">
                        {stage.brief}
                     </p>
                  </div>
               </div>,
               'blur-sm'
            )}
         </div>
      </div>
    </div>
  );
};
