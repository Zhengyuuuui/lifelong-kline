import React, { useState } from 'react';
import { ActionChip, StrategyTone, DashboardMetrics, MainWindow, FutureWeather, RelationshipCandidate } from '../types';
import { ArrowUpRight, ChevronRight, ChevronDown, CheckCircle2, CloudDrizzle, BarChart2, Zap, Wind, Calendar, Info, Clock, Sparkles, User, MessageCircle, MoreHorizontal, XCircle, Map, PlayCircle, Loader2, RefreshCw, Copy, Check, Sun, Cloud, CloudRain, CloudLightning } from 'lucide-react';
import { TONE_TEMPLATES } from '../constants';
import { generateOpeningLineAI } from '../services/ai';
import { useLanguage } from '../contexts/LanguageContext';

// --- Global: Summary Bar (Enhanced & Clickable) ---
export const SummaryBar = ({ topMessage, onClick }: { topMessage: string, onClick?: () => void }) => {
  const { t } = useLanguage();
  return (
    <div id="tutorial-summary" className="w-full flex justify-center mb-6 px-2">
      <div 
          onClick={onClick}
          className="relative group cursor-pointer w-full max-w-[360px]"
      >
          {/* Glow behind */}
          <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full opacity-40 group-hover:opacity-60 transition-opacity"></div>
          
          <div className="relative flex items-center justify-between gap-3 px-5 py-3 rounded-[24px] bg-[#0F111A]/80 border border-white/10 backdrop-blur-xl shadow-lg transition-all duration-200 ease-out active:scale-95 select-none">
              <div className="flex items-center gap-3">
                  <div className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500 shadow-[0_0_8px_#6366f1]"></span>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-[13px] font-medium text-white/90 tracking-wide leading-none mb-1">
                          {t('summary.label')}
                      </span>
                      <span className="text-[11px] text-white/50 leading-none truncate max-w-[200px]">
                          {topMessage}
                      </span>
                  </div>
              </div>
              <ChevronRight size={14} className="text-white/30" />
          </div>
      </div>
    </div>
  );
};

// --- Module 1: Suitable Actions (Dynamic & Personalized) ---
export const SuitableActionsCard = ({ actions, onSelect }: { actions: ActionChip[], onSelect: (action: ActionChip) => void }) => {
  const { t } = useLanguage();
  return (
    <div className="w-full glass-card-sm p-5 mb-4 border border-white/5 animate-slide-up-fade">
      <div className="text-[11px] font-semibold text-white/40 mb-3 uppercase tracking-wider flex items-center gap-2">
          <Sparkles size={10} className="text-emerald-400" /> {t('action.recommend')}
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map(action => (
          <button 
            key={action.id}
            onClick={() => onSelect(action)}
            className={`px-3.5 py-2 rounded-xl text-[12px] font-medium active:scale-95 select-none transition-all duration-200 ease-out border flex items-center gap-1.5 ${
              action.type === 'primary' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
              : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {action.type === 'primary' && <span className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_5px_currentColor]" />}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Module 2: Strategy Tone (Updated with Personalized Quote) ---
export const StrategyToneCard = ({ 
    currentTone, 
    onToneChange,
    aiStrategyQuote 
}: { 
    currentTone: StrategyTone, 
    onToneChange: (t: StrategyTone) => void,
    aiStrategyQuote?: string
}) => {
  const { t } = useLanguage();
  
  // Dynamic Quote or Template based on tone and potentially localized
  const getQuote = () => {
      if (aiStrategyQuote) return aiStrategyQuote;
      // Fallback templates based on tone
      if (currentTone === 'steady') return t('template.steady');
      if (currentTone === 'direct') return t('template.direct');
      if (currentTone === 'smooth') return t('template.smooth');
      return t('template.neutral');
  };

  return (
    <div className="w-full glass-card-sm p-5 mb-4 border border-white/5">
      <div className="flex justify-between items-start mb-4">
         <div className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">{t('strategy.title')}</div>
         <div className="bg-white/5 px-2 py-0.5 rounded text-[10px] text-white/30 font-mono tracking-wide">{t('strategy.tag')}</div>
      </div>
      
      {/* Dynamic Quote Display */}
      <div className="text-[15px] text-white/90 font-medium leading-relaxed mb-5 pl-3 border-l-2 border-emerald-400/50 italic animate-fade-in">
         “{getQuote()}”
      </div>

      <div className="flex gap-1.5 bg-black/20 p-1.5 rounded-xl">
        {(['steady', 'direct', 'smooth'] as StrategyTone[]).map(tone => {
           const labels: Record<string,string> = { 
               steady: t('tone.steady'), 
               direct: t('tone.direct'), 
               smooth: t('tone.smooth') 
           };
           const isActive = currentTone === tone;
           return (
             <button
               key={tone}
               onClick={() => onToneChange(tone)}
               className={`flex-1 py-2 text-[11px] rounded-[10px] transition-all ${
                 isActive 
                 ? 'bg-white/15 text-white font-bold shadow-sm ring-1 ring-white/10' 
                 : 'text-white/40 hover:text-white/60 hover:text-white/60 hover:bg-white/5'
               }`}
             >
               {labels[tone]}
             </button>
           )
        })}
      </div>
    </div>
  )
}

// --- Module 3: Needs Input (Interactive) ---
export const NeedsInputCard = ({ 
    onTagSelect, 
    selectedTag,
    isLoading,
    customTags
}: { 
    onTagSelect: (tag: string) => void, 
    selectedTag?: string,
    isLoading?: boolean,
    customTags?: string[]
}) => {
  const { t } = useLanguage();
  // Default fallback if no custom tags provided
  const tags = customTags || ['搞钱', '签约', '催款', '拜访', '专注完工', '冲刺大事', '学习修养', '躺平', '顺其自然'];
  const [inputValue, setInputValue] = useState('');

  const handleInputSubmit = () => {
      if (inputValue.trim()) {
          onTagSelect(inputValue.trim());
          setInputValue('');
      }
  };
  
  return (
    <div id="tutorial-needs" className="w-full glass-card-sm p-5 mb-4 flex flex-col gap-4 border border-white/5 relative overflow-hidden">
       {/* Background Pulse when loading */}
       {isLoading && <div className="absolute inset-0 bg-indigo-500/5 animate-pulse z-0" />}

       <div className="flex items-baseline justify-between relative z-10">
         <div className="text-[13px] font-bold text-white tracking-wide flex items-center gap-2">
            {t('needs.question')}
            {isLoading && <Loader2 size={12} className="animate-spin text-indigo-400" />}
         </div>
       </div>
       <div className="flex flex-wrap gap-2 relative z-10">
          {tags.map(tag => {
            const isSelected = selectedTag === tag;
            return (
                <button 
                    key={tag} 
                    onClick={() => onTagSelect(tag)} 
                    disabled={isLoading}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium active:scale-95 select-none transition-all duration-200 ease-out border ${
                        isSelected 
                        ? 'bg-indigo-500 text-white border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.4)]' 
                        : 'bg-indigo-500/5 border-indigo-400/10 text-indigo-200 hover:bg-indigo-500/15'
                    }`}
                >
                   {tag}
                </button>
            )
          })}
       </div>
       <div className="relative z-10">
         <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t('needs.placeholder')}
            className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-[12px] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors focus:bg-black/30"
            onKeyDown={(e) => {
                if(e.key === 'Enter') handleInputSubmit();
            }}
         />
         <button 
            onClick={handleInputSubmit}
            disabled={!inputValue.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/5 rounded-full hover:bg-white/10 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
         >
            <ArrowUpRight size={14} className="text-white/80" />
         </button>
       </div>
    </div>
  )
}

// --- Module 4: Dashboards (Dynamic) ---
export const DashboardsCard = ({ metrics, isLoading }: { metrics: DashboardMetrics, isLoading?: boolean }) => {
   const { t } = useLanguage();
   
   // Try to translate labels if they match keys, otherwise use as is
   const translateLabel = (label: string) => {
       if (label === '此事风向' || label === 'Wind Direction') return t('dashboard.wind');
       if (label === '把握感' || label === 'Control') return t('dashboard.control');
       if (label === '契合感' || label === 'Harmony') return t('dashboard.fit');
       if (label === '顺风') return t('radar.state.good');
       if (label === '稳') return t('radar.state.neutral');
       if (label === '合拍') return t('status.level.stable.sub');
       return label;
   };

   return (
   <div id="tutorial-dashboard" className="w-full glass-card-sm p-5 mb-4 border border-white/5 relative group transition-all duration-500">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#0f172a]/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center rounded-[24px]">
            <Loader2 size={24} className="text-indigo-400 animate-spin mb-2" />
            <span className="text-[10px] text-white/50 animate-pulse">正在重组天时数据...</span>
        </div>
      )}

      <div className="flex gap-4 mb-5">
          <DashboardItem label={translateLabel("此事风向")} value={metrics.windDirection.value} status={metrics.windDirection.status} icon={<Wind size={12}/>} labelVal={translateLabel(metrics.windDirection.label)} />
          <DashboardItem label={translateLabel("把握感")} value={metrics.control.value} status="neutral" icon={<CheckCircle2 size={12}/>} labelVal={translateLabel(metrics.control.label)} />
          <DashboardItem label={translateLabel("契合感")} value={metrics.fit.value} status="good" icon={<Zap size={12}/>} labelVal={translateLabel(metrics.fit.label)} />
      </div>
      <div className="pt-3 border-t border-white/5 text-[11px] text-white/60 leading-relaxed text-center font-medium animate-fade-in key={metrics.summary}">
         {metrics.summary}
      </div>
   </div>
)}

const DashboardItem = ({ label, value, status, icon, labelVal }: any) => {
    const color = status === 'good' ? 'bg-emerald-400' : status === 'bad' ? 'bg-rose-400' : 'bg-sky-400';
    return (
        <div className="flex-1 flex flex-col items-center gap-2">
            <div className="relative w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                    className={`absolute left-0 top-0 h-full ${color} shadow-[0_0_8px_currentColor] transition-all duration-1000 ease-out`} 
                    style={{ width: `${value}%` }} 
                />
            </div>
            <div className="text-center mt-1">
                <div className="text-[16px] font-bold text-white font-mono-num leading-tight">{value}</div>
                <div className="flex items-center gap-1 justify-center text-[10px] text-white/40 mt-1">
                   {icon} {label}
                </div>
            </div>
        </div>
    )
}

// ... rest of the file (WindowList, RelationshipRadarCard, etc.) remains largely same but updated as below

// --- Module 5: Window List (High Fidelity List) ---
export const WindowList = ({ 
    window, 
    onAction,
    isProcessing
}: { 
    window: MainWindow, 
    onAction: (type: 'set' | 'tips') => void,
    isProcessing?: boolean
}) => {
  const { t } = useLanguage();
  return (
  <div id="tutorial-windows" className="w-full mb-4">
    <div className="flex items-center justify-between mb-3 px-1">
         <div className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">{t('window.title')}</div>
         <div className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full">{t('window.ai')}</div>
    </div>
    
    {/* Main Best Window */}
    <div className="glass-card-frost rounded-[28px] p-1 mb-3 ring-1 ring-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
      <div className="p-5 pb-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                 <Clock size={15} className="text-emerald-400" />
                 <span className="text-[19px] font-mono-num font-bold text-white tracking-tight">
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
            
            <div className="flex flex-col items-end">
                <div className="text-[26px] font-bold text-emerald-400 font-mono-num leading-none drop-shadow-md">{window.score}</div>
                <div className="text-[9px] text-emerald-500/60 font-bold uppercase tracking-wider mt-0.5">{t('radar.scoreLabel')}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {window.tags.map((tag, i) => (
              <span key={i} className="text-[11px] text-white/70 px-2.5 py-1 rounded-md bg-white/5 border border-white/5 font-medium">
                {tag}
              </span>
            ))}
          </div>
      </div>

      <div className="bg-white/5 rounded-[24px] p-2 flex gap-2 border-t border-white/5">
          <button 
            onClick={() => onAction('tips')} 
            disabled={isProcessing}
            className="flex-1 py-3 rounded-[20px] bg-white/5 hover:bg-white/10 active:scale-95 select-none transition-all duration-200 ease-out text-[13px] text-white/90 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
              <Info size={14} className="opacity-50" /> 
              {t('window.tips')}
          </button>
          <button 
            onClick={() => onAction('set')} 
            disabled={isProcessing}
            className="flex-1 py-3 rounded-[20px] bg-emerald-500 hover:bg-emerald-400 active:scale-95 select-none transition-all duration-200 ease-out text-[13px] text-white font-bold shadow-[0_4px_12px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 disabled:opacity-50"
          >
              {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <><ArrowUpRight size={14} strokeWidth={3} /> {t('window.set')}</>}
          </button>
      </div>
    </div>

    {/* Secondary Window (Mocked for List Feel) */}
    <div className="glass-card-sm p-4 flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
        <div className="flex flex-col">
            <span className="text-[15px] font-bold text-white/80 font-mono-num">14:00 - 15:30</span>
            <span className="text-[11px] text-white/40">{t('window.backup')}</span>
        </div>
        <div className="flex items-center gap-3">
             <span className="text-[16px] font-bold text-white/40 font-mono-num">65</span>
             <ChevronRight size={16} className="text-white/20" />
        </div>
    </div>
  </div>
)}

// ... rest is updated similarly ...
export const RelationshipRadarCard = ({ 
  candidates, 
  onGenerateOpening, 
  onDefer,
  onRefresh,
  isRefreshing,
  context
}: { 
  candidates: RelationshipCandidate[], 
  onGenerateOpening: (id: string, text: string) => void,
  onDefer: (id: string) => void,
  onRefresh?: () => void,
  isRefreshing?: boolean,
  context?: { wind: string, control: string }
}) => {
  const { t } = useLanguage();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [openingLines, setOpeningLines] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleGenerate = async (person: RelationshipCandidate) => {
    setLoadingId(person.id);
    try {
        const text = await generateOpeningLineAI(person.name, person.roleLabel, person.reason, context);
        setOpeningLines(prev => ({...prev, [person.id]: text}));
        // Optional: still bubble up event if parent needs it
        onGenerateOpening(person.id, text);
    } catch (e) {
        console.error(e);
    } finally {
        setLoadingId(null);
    }
  };

  const handleCopy = (id: string, text: string) => {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="w-full mb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-1">
             <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">
                  {t('relationship.title')} {isRefreshing ? '...' : candidates.length}
                </span>
             </div>
             <button 
                onClick={onRefresh} 
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 rounded-full text-[10px] text-white/50 active:scale-95 select-none transition-all duration-200 ease-out disabled:opacity-50"
             >
                <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} /> {t('relationship.refresh')}
             </button>
        </div>

        {/* List Container with min-height to prevent jump */}
        <div className="flex flex-col gap-3 min-h-[200px] relative">
            
            {isRefreshing && (
               <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0f172a]/50 backdrop-blur-sm rounded-2xl transition-opacity duration-300">
                  <Loader2 size={24} className="text-indigo-400 animate-spin mb-2" />
                  <span className="text-[10px] text-white/50 animate-pulse">{t('relationship.refreshing')}</span>
               </div>
            )}

            {candidates.map((person) => {
                const hasLine = !!openingLines[person.id];
                const line = openingLines[person.id];
                return (
                <div key={person.id} className="glass-card-sm p-4 flex gap-4 items-start group animate-slide-up-fade">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center shrink-0 shadow-lg text-[14px] font-bold text-white border border-white/10">
                        {person.avatarUrl ? <img src={person.avatarUrl} alt={person.name} className="w-full h-full rounded-full" /> : person.name.substring(0,2)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        {/* Row 1: Name + Role + Relation Tag */}
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[15px] font-bold text-white">{person.name}</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/50 border border-white/5">{person.roleLabel}</span>
                                    {person.relationTag && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-200 border border-indigo-500/10">{person.relationTag}</span>
                                    )}
                                </div>
                            </div>
                            {person.priorityLevel === 'primary' && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse mt-1.5 shrink-0" />}
                        </div>
                        
                        {/* Row 2: Time + Hint (Enhanced Visuals with Layout Fix) */}
                        <div className="flex items-center gap-2 mb-2">
                             <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#1e293b] border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.1)] shrink-0">
                                <Clock size={10} className="text-indigo-400" /> 
                                <span className="text-[10px] font-bold text-indigo-100 whitespace-nowrap">{person.recommendedTimeLabel}</span>
                             </div>
                             <span className="text-[10px] text-white/40 flex items-center gap-1 truncate">
                                <span className="w-0.5 h-2.5 bg-white/10 rounded-full shrink-0"></span>
                                {person.actionHint}
                             </span>
                        </div>
                        
                        {/* Row 3: Reason */}
                        <div className="text-[10px] text-white/40 leading-tight mb-3">
                            {person.reason}
                        </div>

                        {/* Buttons or Result */}
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleGenerate(person)}
                                disabled={loadingId === person.id}
                                className={`px-4 py-2 rounded-full text-[11px] font-bold active:scale-95 select-none transition-all duration-200 ease-out flex items-center gap-1.5 disabled:opacity-50 ${
                                    hasLine 
                                    ? 'bg-white/5 text-white/40 hover:bg-white/10 border border-white/5' 
                                    : 'bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/20 text-indigo-200'
                                }`}
                            >
                                {loadingId === person.id ? (
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"/>
                                ) : (
                                    hasLine ? <RefreshCw size={12}/> : <MessageCircle size={12} />
                                )}
                                {hasLine ? t('relationship.rewrite') : t('relationship.write')}
                            </button>
                            {!hasLine && (
                                <button 
                                    onClick={() => onDefer(person.id)}
                                    className="px-3 py-2 text-[11px] text-white/30 hover:text-white/60 transition-colors"
                                >
                                    {t('relationship.defer')}
                                </button>
                            )}
                        </div>

                        {/* Generated Opening Line Result (Expandable) */}
                        {hasLine && (
                            <div className="mt-3 bg-white/5 rounded-xl p-3 border border-white/5 animate-slide-down relative group/text">
                                <div className="text-[13px] text-white/90 leading-relaxed font-normal">
                                    {line}
                                </div>
                                <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center">
                                    <span className="text-[10px] text-white/30">{t('relationship.aiNote')}</span>
                                    <button 
                                        onClick={() => handleCopy(person.id, line)}
                                        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[10px] text-white/60 transition-colors"
                                    >
                                        {copiedId === person.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                        {copiedId === person.id ? t('relationship.copied') : t('relationship.copy')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )})}
            
            {candidates.length === 0 && !isRefreshing && (
               <div className="p-8 text-center text-white/30 text-[12px]">没有更多推荐了</div>
            )}
        </div>
    </div>
  );
};

export const ResistanceMapEntryCard = ({ onOpen }: { onOpen: () => void }) => {
    const { t } = useLanguage();
    return (
    <div className="glass-card-sm p-4 flex items-center justify-between mb-4 border border-rose-500/10 bg-gradient-to-r from-rose-900/5 to-transparent">
        <div className="flex flex-col gap-1">
            <div className="text-[13px] font-bold text-white flex items-center gap-2">
                <Map size={14} className="text-rose-400" /> {t('resistance.title')}
            </div>
            <div className="text-[11px] text-white/40">
                {t('resistance.subtitle')}
            </div>
        </div>
        <button 
            onClick={onOpen}
            className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] font-medium text-white active:scale-95 select-none transition-all duration-200 ease-out flex items-center gap-1.5"
        >
            {t('resistance.btn')} <ChevronRight size={12} className="opacity-50" />
        </button>
    </div>
)};

export const DestressCard = ({ data }: { data: { active: boolean, bullets: string[] } }) => {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    return (
        <div 
            className={`w-full glass-card-sm transition-all duration-300 mb-4 cursor-pointer overflow-hidden border border-indigo-200/10 ${open ? 'bg-indigo-900/20 border-indigo-500/30' : ''}`}
            onClick={() => setOpen(!open)}
        >
            <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${open ? 'bg-indigo-500 text-white' : 'bg-white/5 text-indigo-300'}`}>
                        <Wind size={16} />
                    </div>
                    <span className="text-[13px] font-medium text-indigo-100">{t('destress.title')} {open ? '' : t('destress.subtitle')}</span>
                </div>
                <div className={`w-6 h-6 rounded-full bg-white/5 flex items-center justify-center transition-transform duration-300 ${open ? 'rotate-180 bg-white/10' : ''}`}>
                   <ChevronDown size={14} className="text-white/60" />
                </div>
            </div>
            {open && (
                <div className="px-5 pb-5 animate-slide-down">
                    <div className="h-px bg-white/5 w-full mb-4" />
                    <ul className="space-y-3">
                        {data.bullets.map((b, i) => (
                            <li key={i} className="flex gap-3 text-[12px] text-white/70 leading-relaxed">
                                <span className="w-1 h-1 rounded-full bg-indigo-400 mt-2 shrink-0" />
                                {b}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

// ... FutureWeatherCard uses t() correctly already, but needs Trend translation mapping updates if any logic is missing there
export const FutureWeatherCard = ({ 
    future, 
    onRangeChange, 
    isLoading 
}: { 
    future: FutureWeather, 
    onRangeChange: (range: '7d' | '30d') => void,
    isLoading?: boolean
}) => {
    const { t } = useLanguage();
    const getWeatherIcon = (type: string) => {
        const size = 26; 
        const stroke = 2;
        if (type === 'sunny') return <Sun size={size} strokeWidth={stroke} className="text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]" />;
        if (type === 'cloudy') return <Cloud size={size} strokeWidth={stroke} className="text-slate-300 drop-shadow-[0_0_10px_rgba(203,213,225,0.4)]" />;
        if (type === 'rain') return <CloudRain size={size} strokeWidth={stroke} className="text-blue-400 drop-shadow-[0_0_12px_rgba(96,165,250,0.5)]" />;
        return <CloudLightning size={size} strokeWidth={stroke} className="text-purple-400 drop-shadow-[0_0_12px_rgba(192,132,252,0.6)]" />;
    };
    
    // Expanded Trend Logic (10 Levels now) - Using Translation Keys
    const getTrendTag = () => {
        if (!future || !future.nodes || future.nodes.length === 0) {
             return { label: "...", color: "text-white/30", bg: "bg-white/5 border-white/5" };
        }
        
        const avgScore = future.nodes.reduce((a, b) => a + b.score, 0) / future.nodes.length;
        
        if (avgScore >= 95) return { label: t('trend.level.10'), color: "text-yellow-300", bg: "bg-yellow-500/10 border-yellow-500/20" };
        if (avgScore >= 85) return { label: t('trend.level.9'), color: "text-rose-300", bg: "bg-rose-500/10 border-rose-500/20" };
        if (avgScore >= 75) return { label: t('trend.level.8'), color: "text-amber-300", bg: "bg-amber-500/10 border-amber-500/20" };
        if (avgScore >= 65) return { label: t('trend.level.7'), color: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/20" };
        if (avgScore >= 55) return { label: t('trend.level.6'), color: "text-cyan-300", bg: "bg-cyan-500/10 border-cyan-500/20" }; 
        if (avgScore >= 45) return { label: t('trend.level.5'), color: "text-indigo-300", bg: "bg-indigo-500/10 border-indigo-500/20" };
        if (avgScore >= 35) return { label: t('trend.level.4'), color: "text-slate-300", bg: "bg-slate-500/10 border-slate-500/20" }; 
        if (avgScore >= 25) return { label: t('trend.level.3'), color: "text-blue-300", bg: "bg-blue-500/10 border-blue-500/20" };
        if (avgScore >= 15) return { label: t('trend.level.2'), color: "text-purple-300", bg: "bg-purple-500/10 border-purple-500/20" };
        return { label: t('trend.level.1'), color: "text-gray-400", bg: "bg-gray-500/10 border-gray-500/20" };
    };
    const trend = getTrendTag();

    // Summary Translation Logic (Simple Mapping based on Score)
    const getSummary = () => {
        if (!future || !future.nodes || future.nodes.length === 0) return "";
        const avgScore = future.nodes.reduce((a, b) => a + b.score, 0) / future.nodes.length;
        if (avgScore >= 85) return t('future.summary.great');
        if (avgScore >= 70) return t('future.summary.good');
        if (avgScore >= 55) return t('future.summary.mixed');
        if (avgScore >= 40) return t('future.summary.challenging');
        return t('future.summary.bad');
    };

    return (
        <div className="w-full glass-card-sm p-5 mb-24 border border-white/5 relative overflow-hidden">
             {/* Header */}
             <div className="flex justify-between items-start mb-8">
                <div className="flex flex-col gap-2">
                    <div className="text-[11px] font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar size={14} className="text-indigo-400" /> {t('future.title')}
                    </div>
                    {/* Status Pill */}
                    <div className={`px-3 py-1.5 rounded-full text-[12px] font-bold border w-fit flex items-center gap-2 ${trend.bg} ${trend.color} shadow-sm transition-all animate-fade-in`}>
                         {trend.label}
                    </div>
                </div>
                
                {/* 7d/30d Toggle */}
                <div className="flex gap-1 bg-black/20 p-0.5 rounded-lg shrink-0">
                    {['7d', '30d'].map((tString) => (
                        <button 
                            key={tString} 
                            onClick={() => onRangeChange(tString as '7d' | '30d')}
                            disabled={isLoading && future.range !== tString}
                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                                future.range === tString 
                                ? 'bg-white/10 text-white shadow-sm' 
                                : 'text-white/30 hover:text-white/50'
                            }`}
                        >
                            {tString === '7d' ? t('future.7d') : t('future.30d')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart Area */}
            {/* Loading Overlay */}
             {isLoading && (
                <div className="absolute inset-0 bg-[#0f172a]/70 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center">
                     <Loader2 size={24} className="text-indigo-400 animate-spin mb-2" />
                </div>
            )}

            <div className="relative overflow-x-auto scrollbar-hide">
                <div className={`flex items-end h-40 pb-4 px-1 ${future.range === '30d' ? 'gap-[4px] min-w-[650px]' : 'gap-3 justify-between min-w-full'}`}>
                    {future.nodes && future.nodes.map((node, i) => {
                        const height = Math.max(15, (node.score / 100) * 100);
                        const color = node.type === 'good' ? 'bg-emerald-400' : node.type === 'bad' ? 'bg-rose-400' : node.type === 'warn' ? 'bg-amber-400' : 'bg-slate-500';
                        const opacity = node.type === 'good' ? 'opacity-100' : 'opacity-60';
                        
                        const barWidth = future.range === '30d' ? 'w-[10px] rounded-[3px]' : 'w-6 rounded-full';
                        const itemMinWidth = future.range === '30d' ? 'min-w-[10px]' : 'min-w-[30px] flex-1';
                        
                        return (
                            <div key={i} className={`flex flex-col items-center gap-2 group relative ${itemMinWidth}`}>
                                {(future.range === '7d' || i % 5 === 0) && (
                                    <div className="mb-1 opacity-90 group-hover:scale-110 transition-transform duration-300 ease-out">
                                        {getWeatherIcon(node.weatherIcon)}
                                    </div>
                                )}
                                
                                <div className="relative w-full flex justify-center h-full items-end">
                                    <div 
                                        className={`${barWidth} ${color} ${opacity} group-hover:opacity-100 transition-all duration-300 shadow-[0_0_10px_rgba(0,0,0,0)] group-hover:shadow-[0_0_15px_currentColor]`} 
                                        style={{ height: `${height}%` }} 
                                    />
                                </div>

                                <span className={`text-[9px] text-white/30 font-mono mt-1 whitespace-nowrap ${future.range === '30d' && i % 5 !== 0 ? 'opacity-0' : 'opacity-100'}`}>
                                    {node.dateLabel}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
            
            {/* Summary Text (Translate on the fly) */}
            <div className="mt-4 pt-4 border-t border-white/5 text-[11px] text-white/50 text-center animate-fade-in">
                {getSummary()}
            </div>
        </div>
    )
}