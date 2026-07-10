import React from 'react';
import { SegmentInsight } from '../types';
import { Play, RotateCcw, Sparkles } from 'lucide-react';
import { i18n } from '../services/i18n';

interface InsightDockProps {
  insight: SegmentInsight | null;
  onAnalyze: () => void;
  onShowInsight?: () => void;
  loading: boolean;
}

export const InsightDock: React.FC<InsightDockProps> = ({ insight, onAnalyze, onShowInsight, loading }) => {
  const handleShowInsight = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onShowInsight?.();
  };

  const handleAnalyzeClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onAnalyze();
  };

  return (
    <div 
      id="tour-dock"
      className="relative w-full z-40 px-4 pb-4 pt-6 bg-gradient-to-t from-[#000000] via-[#000000]/80 to-transparent pointer-events-none"
    >
      <div className="max-w-md mx-auto pointer-events-auto">
        <div className="relative z-10 bg-slate-900/70 backdrop-blur-2xl border border-white/10 rounded-[24px] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex items-center justify-between transition-all duration-300 ring-1 ring-white/5">
          <div className="flex flex-col pl-2 flex-1 min-w-0 pr-4">
             {!insight ? (
               <>
                <h4 className="text-white text-sm font-bold flex items-center gap-2">
                  <Sparkles size={12} className="text-teal-400 flex-shrink-0" />
                  <span className="truncate">{i18n.t('dock.ready')}</span>
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium tracking-wide truncate">{i18n.t('dock.desc')}</p>
               </>
             ) : (
               <>
                <h4 className="text-white text-sm font-bold tracking-tight truncate">
                  {insight.stage?.role_label || i18n.t('dock.ready')}
                </h4>
                <div className="flex gap-2 mt-1.5 overflow-hidden">
                  {insight.summary_tags?.slice(0, 2).map((tag, i) => (
                    <span key={i} className="text-[9px] px-2 py-0.5 rounded-md bg-white/10 text-slate-300 border border-white/5 backdrop-blur-sm whitespace-nowrap truncate max-w-[80px]">
                      {tag.label}
                    </span>
                  ))}
                </div>
               </>
             )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {insight && onShowInsight && !loading && (
              <button
                type="button"
                onClick={handleShowInsight}
                className="flex items-center gap-1.5 px-4 sm:px-6 py-3 sm:py-3.5 rounded-[16px] sm:rounded-[18px] font-bold text-xs active:scale-95 select-none transition-all duration-200 ease-out shadow-lg bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] border border-transparent"
              >
                <Sparkles size={14} fill="currentColor" />
                <span>查看报告</span>
              </button>
            )}
            <button 
              type="button"
              onClick={handleAnalyzeClick}
              disabled={loading}
              className={`
                flex items-center justify-center active:scale-95 select-none transition-all duration-200 ease-out shadow-lg
                disabled:opacity-70 disabled:cursor-not-allowed
                ${!insight 
                  ? 'gap-2 px-6 py-3.5 rounded-[18px] font-bold text-xs bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] border border-transparent' 
                  : 'w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-3 sm:rounded-[16px] rounded-full bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 shadow-inner'
                }
              `}
            >
              {loading ? (
                <>
                   <span className="animate-spin text-sm">⟳</span>
                   {!insight && <span>{i18n.t('dock.calculating')}</span>}
                </>
              ) : !insight ? (
                <>
                  <Play size={14} fill="currentColor" />
                  <span>{i18n.t('dock.btn_analyze')}</span>
                </>
              ) : (
                <>
                  <RotateCcw size={14} />
                  <span className="hidden sm:inline ml-1.5 text-xs font-bold">{i18n.t('dock.btn_reanalyze')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
