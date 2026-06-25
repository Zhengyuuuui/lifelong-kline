import React, { useState, useMemo } from 'react';
import { ProvidenceResponse, UserInputProfile, KarmaResetResponse } from '../types';
import { generateKarmaReset } from '../services/geminiService';
import { RefreshCw, Navigation, Shirt, AlertOctagon, Battery, BatteryCharging, MapPin, ShieldCheck, Users, Zap, AlertTriangle, Send, LogOut, Terminal, Cpu, Activity, Skull, Lock, ArrowUpRight, AlertCircle, Quote, Eye, Sparkles, Dices, Lightbulb } from 'lucide-react';

interface ResultViewProps {
  data: ProvidenceResponse;
  userInput: UserInputProfile;
  onReset: () => void;
}

const LEGACY_LOG_MARKERS = {
  root: '\u{1F441}\uFE0F',
  glitch: '\u{1F52E}',
  cheat: '\u{1F3B2}',
};

// 能量条组件
const EnergyBar: React.FC<{ 
  label: string; 
  value: number; 
  type: 'buff' | 'debuff'; 
  desc: string;
  advice: string;
}> = ({ label, value, type, desc, advice }) => {
  const isBuff = type === 'buff';
  const colorClass = isBuff ? 'bg-[#34d399]' : 'bg-[#fb7185]';
  const textColorClass = isBuff ? 'text-[#34d399]' : 'text-[#fb7185]';

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden group hover:bg-white/10 transition-colors">
      <div className="flex justify-between items-end mb-3">
        <div className="flex items-center gap-2">
           {isBuff ? <BatteryCharging size={18} className={textColorClass} /> : <Battery size={18} className={textColorClass} />}
           <h3 className="text-base font-bold text-white/90">{label}</h3>
        </div>
        <span className={`text-2xl font-mono font-bold ${textColorClass}`}>{isBuff ? '+' : '-'}{value}%</span>
      </div>
      <div className="w-full h-1.5 bg-white/10 rounded-full mb-4 overflow-hidden">
        <div 
            className={`h-full rounded-full ${colorClass} transition-all duration-1000 ease-out`} 
            style={{ width: `${value}%`, opacity: 0.8 }}
        ></div>
      </div>
      <div className="space-y-1.5">
         <p className="text-xs text-white/60 leading-relaxed font-light">{desc}</p>
         <div className={`text-xs font-medium ${textColorClass} mt-2 flex items-start gap-1`}>
            <Lightbulb size={13} className="shrink-0 opacity-60 mt-0.5" />
            {advice}
         </div>
      </div>
    </div>
  );
};

// 厄运重构组件
const KarmaResetSection: React.FC<{ userInput: UserInputProfile }> = ({ userInput }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [badEvent, setBadEvent] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [resetResult, setResetResult] = useState<KarmaResetResponse | null>(null);

    const handleReset = async () => {
        if (!badEvent.trim()) return;
        setIsLoading(true);
        try {
            const data = await generateKarmaReset(badEvent, userInput);
            setResetResult(data);
        } catch (e) {
            alert("系统繁忙，请稍后再试");
        } finally {
            setIsLoading(false);
        }
    };

    if (resetResult) {
        return (
            <div className="mt-8 animate-float-up">
                <div className="bg-gradient-to-br from-indigo-900/80 to-purple-900/80 border border-white/20 rounded-[32px] p-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-20"><Zap size={120} /></div>
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-2 text-emerald-400">
                            <ShieldCheck size={20} />
                            <span className="text-sm font-bold tracking-widest uppercase">Karma Reset Complete</span>
                        </div>
                        <h3 className="text-2xl font-serif-sc font-bold text-white">警报解除：能量守恒已生效</h3>
                        <div className="bg-black/20 rounded-xl p-4 text-sm text-white/80 leading-relaxed border border-white/10">
                            <span className="text-indigo-300 font-bold block mb-2">玄学解析：</span>
                            {resetResult.metaphysical_reframe}
                        </div>
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                            <p className="text-emerald-200 text-sm font-medium flex items-center gap-2">
                                <Sparkles size={15} />
                                <span>系统判决：{resetResult.verdict}</span>
                            </p>
                        </div>
                        <button 
                            onClick={() => { setResetResult(null); setBadEvent(""); setIsOpen(false); }}
                            className="w-full py-3 mt-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs text-white/60 transition-colors"
                        >
                            关闭终端
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="w-full mt-6 group relative overflow-hidden rounded-2xl bg-red-900/20 border border-red-500/30 p-4 hover:bg-red-900/30 transition-all active:scale-[0.98]"
            >
                <div className="flex items-center justify-center gap-2 text-red-400 group-hover:text-red-300">
                    <AlertTriangle size={18} />
                    <span className="font-medium">遭遇厄运？点击启动急救程序</span>
                </div>
            </button>
        );
    }

    return (
        <div className="mt-6 bg-[#1a1515] border border-white/10 rounded-2xl p-5 animate-float-up ring-1 ring-red-500/20">
            <h3 className="text-red-400 text-sm font-bold mb-3 flex items-center gap-2">
                <AlertTriangle size={16} />
                输入异常事件 (Bad Event)
            </h3>
            <textarea
                value={badEvent}
                onChange={(e) => setBadEvent(e.target.value)}
                placeholder="例如：刚丢了钱、被老板骂了、手机屏碎了..."
                className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-white/20 outline-none focus:border-red-500/50 min-h-[80px]"
            />
            <button
                onClick={handleReset}
                disabled={isLoading || !badEvent.trim()}
                className="w-full mt-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/20"
            >
                {isLoading ? (
                    <span className="animate-pulse">重构现实中...</span>
                ) : (
                    <>
                        <Zap size={16} fill="currentColor" />
                        <span>启动认知重构</span>
                    </>
                )}
            </button>
        </div>
    );
};

// Helper: Parse Markdown Block to structured data
const parseLogBlock = (lines: string[]) => {
    const data: any = { type: 'unknown', title: '', items: [] };
    
    const marker = lines[0] || '';
    // Keep backwards compatibility with older AI responses while new prompts use ASCII markers.
    if (marker.includes('[ROOT]') || marker.includes(LEGACY_LOG_MARKERS.root)) data.type = 'logic';
    if (marker.includes('[GLITCH]') || marker.includes(LEGACY_LOG_MARKERS.glitch)) data.type = 'glitch';
    if (marker.includes('[CHEAT]') || marker.includes(LEGACY_LOG_MARKERS.cheat)) data.type = 'cheat';

    // Extract content
    lines.forEach(line => {
        if (line.includes('【')) {
             data.title = line.replace(/【|】/g, '').trim();
        } else if (line.includes('：')) {
             const [key, val] = line.split('：');
             data.items.push({ key: key.trim(), val: val.trim() });
        }
    });
    return data;
};

// 高级日志卡片组件 - Revised Design (Glassmorphism, No Black Background)
const LogCard: React.FC<{ block: any }> = ({ block }) => {
    // 1. Root Cause / Logic
    if (block.type === 'logic') {
        return (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4 relative overflow-hidden group">
                {/* Subtle Indigo Gradient */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none"></div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2 text-indigo-300">
                        <Eye size={16} />
                        <span className="text-[10px] font-bold tracking-widest uppercase opacity-80">Root Cause Analysis</span>
                    </div>
                    
                    <h4 className="text-lg font-bold text-white mb-3">
                        {block.title || '底层逻辑'}
                    </h4>

                    {block.items.map((item: any, idx: number) => (
                         <div key={idx}>
                            <p className="text-xs text-white/50 mb-1">{item.key}</p>
                            <p className="text-sm text-white/90 leading-relaxed font-light">{item.val}</p>
                         </div>
                    ))}
                </div>
            </div>
        );
    }

    // 2. Reality Glitch
    if (block.type === 'glitch') {
        return (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4 relative overflow-hidden group">
                {/* Subtle Purple/Pink Gradient */}
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[40px] pointer-events-none"></div>

                <div className="relative z-10">
                     <div className="flex items-center gap-2 mb-2 text-purple-300">
                        <Sparkles size={16} />
                        <span className="text-[10px] font-bold tracking-widest uppercase opacity-80">Reality Glitch</span>
                    </div>

                    <h4 className="text-lg font-bold text-white mb-3">
                        {block.title || '预知梦'}
                    </h4>

                     {block.items.map((item: any, idx: number) => (
                         <div key={idx}>
                            <p className="text-xs text-white/50 mb-1">{item.key}</p>
                            <p className="text-sm text-white/90 leading-relaxed font-light italic">"{item.val}"</p>
                         </div>
                    ))}
                </div>
            </div>
        );
    }

    // 3. Cheat Code
    if (block.type === 'cheat') {
        return (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4 relative overflow-hidden group">
                {/* Subtle Emerald/Gold Gradient */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/50 to-transparent"></div>
                
                <div className="relative z-10">
                     <div className="flex items-center gap-2 mb-2 text-emerald-300">
                        <Dices size={16} />
                        <span className="text-[10px] font-bold tracking-widest uppercase opacity-80">Cheat Code</span>
                    </div>

                    <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                        {block.title || '作弊码'}
                    </h4>

                    {block.items.map((item: any, idx: number) => (
                         <div key={idx} className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/10">
                            <p className="text-xs text-emerald-200/60 mb-1 font-mono uppercase">{item.key} //</p>
                            <p className="text-sm text-emerald-100 font-medium leading-relaxed">{item.val}</p>
                         </div>
                    ))}
                </div>
            </div>
        );
    }
    
    return null;
};


// 核心日志终端组件 (Refactored Visuals: No black bg, fully integrated)
const TerminalLogModule: React.FC<{ markdown: string }> = ({ markdown }) => {
    // Parser: Group lines into blocks based on headers
    const blocks = useMemo(() => {
        const lines = markdown.split('\n').filter(line => 
            !line.toLowerCase().includes('个体扫描结果') && 
            !line.toLowerCase().includes('user profile') && 
            !line.includes('PROVIDENCE OS') &&
            line.trim() !== ''
        );
        
        const parsedBlocks: any[] = [];
        let currentBuffer: string[] = [];

        lines.forEach(line => {
            if (
                line.includes('[ROOT]') ||
                line.includes('[GLITCH]') ||
                line.includes('[CHEAT]') ||
                line.includes(LEGACY_LOG_MARKERS.root) ||
                line.includes(LEGACY_LOG_MARKERS.glitch) ||
                line.includes(LEGACY_LOG_MARKERS.cheat)
            ) {
                if (currentBuffer.length > 0) {
                    parsedBlocks.push(parseLogBlock(currentBuffer));
                }
                currentBuffer = [line];
            } else {
                currentBuffer.push(line);
            }
        });
        if (currentBuffer.length > 0) {
            parsedBlocks.push(parseLogBlock(currentBuffer));
        }
        return parsedBlocks;
    }, [markdown]);

    return (
        <div className="mt-4 animate-float-up space-y-2">
            <h4 className="text-xs font-medium text-white/40 uppercase tracking-widest pl-2 mb-3">Providence OS Core Logs</h4>
            
            {/* Direct Stack of Glass Cards - No Outer Container */}
            <div className="space-y-4">
                {blocks.map((block, idx) => (
                    <LogCard key={idx} block={block} />
                ))}
            </div>
        </div>
    );
};

// Helper component for icon
const TrendingUpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);

const ResultView: React.FC<ResultViewProps> = ({ data, userInput, onReset }) => {
  const { energy_system, main_mission, tactical_radar, sanctuary_radar, nobleman_magnet, fate_log_markdown } = data;
  const isCritical = main_mission.warning_level === 'CRITICAL';

  return (
    <div className="flex flex-col gap-5 animate-float-up pb-10">
      
      {/* 顶部日期标识 - 增加每日打卡的仪式感 */}
      <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             <span className="text-[10px] uppercase tracking-widest text-white/40">Live Feed • Daily Updated 06:00</span>
          </div>
          <div className="text-[10px] text-white/30 border border-white/10 px-2 py-1 rounded-full">
            {new Date().toLocaleDateString('zh-CN')}
          </div>
      </div>
      
      {/* Module 2: The One Mission (主线任务 - 视觉重心) */}
      <section className="relative w-full aspect-[4/5] max-h-[420px] rounded-[36px] overflow-hidden flex flex-col items-center justify-center p-8 text-center shadow-2xl group border border-white/10">
         
         {/* Advanced Background - Gradients & Noise */}
         <div className={`absolute inset-0 transition-all duration-1000 ${
             isCritical 
                ? 'bg-[radial-gradient(circle_at_50%_0%,#450a0a_0%,#000000_100%)]' 
                : 'bg-[radial-gradient(circle_at_50%_0%,#1e1b4b_0%,#000000_100%)]'
         }`}></div>
         
         {/* Secondary Gradient Splash */}
         <div className={`absolute top-0 inset-x-0 h-[200px] opacity-40 blur-[60px] ${
             isCritical ? 'bg-red-600' : 'bg-indigo-600'
         }`}></div>

         {/* Noise Overlay */}
         <div className="absolute inset-0 texture-noise opacity-[0.15] mix-blend-overlay"></div>
         
         {/* Divine Rays Effect */}
         <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_-20%,transparent_45%,rgba(255,255,255,0.05)_50%,transparent_55%)] opacity-50"></div>

         <div className="relative z-10 flex flex-col items-center h-full justify-between py-4 w-full">
            <div className={`px-4 py-1.5 rounded-full border backdrop-blur-md shadow-lg flex items-center gap-2 ${
                isCritical 
                ? 'bg-red-950/30 border-red-500/30 text-red-200' 
                : 'bg-indigo-950/30 border-indigo-400/30 text-indigo-200'
            }`}>
                <AlertCircle size={12} className={isCritical ? 'animate-pulse' : ''} />
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase">
                    Today's Absolute Mission
                </span>
            </div>

            <div className="space-y-6 flex flex-col items-center w-full">
                <h2 className={`text-6xl font-serif-sc font-black drop-shadow-[0_0_25px_rgba(255,255,255,0.3)] leading-tight tracking-tighter ${
                    isCritical 
                    ? 'text-transparent bg-clip-text bg-gradient-to-b from-red-100 via-red-300 to-red-500' 
                    : 'text-transparent bg-clip-text bg-gradient-to-b from-white via-indigo-200 to-indigo-400'
                }`}>
                    {main_mission.keyword}
                </h2>
                
                {/* Decorative Line */}
                <div className="flex items-center gap-2 opacity-50">
                    <div className={`h-[1px] w-12 ${isCritical ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
                    <div className={`w-1.5 h-1.5 rotate-45 ${isCritical ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
                    <div className={`h-[1px] w-12 ${isCritical ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
                </div>
            </div>

            <div className={`backdrop-blur-xl border rounded-2xl p-6 w-full relative overflow-hidden ${
                isCritical
                ? 'bg-red-950/20 border-red-500/20'
                : 'bg-white/5 border-white/10'
            }`}>
                <div className="absolute top-0 left-4 text-4xl opacity-10 font-serif">“</div>
                <p className="text-sm text-white/90 leading-relaxed font-serif-sc font-medium text-center relative z-10">
                    {main_mission.instruction}
                </p>
                <div className="absolute bottom-0 right-4 text-4xl opacity-10 font-serif rotate-180">“</div>
            </div>
         </div>
      </section>

      {/* Module 1: Bio-Energy Scans (能量扫描) */}
      <section className="space-y-3">
         <h4 className="text-xs font-medium text-white/40 uppercase tracking-widest pl-2">Bio-Energy Scans</h4>
         <div className="grid grid-cols-1 gap-3">
            <EnergyBar 
                label={energy_system.core_status.name} 
                value={energy_system.core_status.value} 
                type={energy_system.core_status.type as any}
                desc={energy_system.core_status.description}
                advice={energy_system.core_status.advice}
            />
            <EnergyBar 
                label={energy_system.secondary_status.name} 
                value={energy_system.secondary_status.value} 
                type={energy_system.secondary_status.type as any}
                desc={energy_system.secondary_status.description}
                advice={energy_system.secondary_status.advice}
            />
         </div>
      </section>

      {/* Module 3: Tactical Radar (战术雷达) */}
      <section className="space-y-3">
         <h4 className="text-xs font-medium text-white/40 uppercase tracking-widest pl-2">Tactical Radar</h4>
         
         <div className="bg-white/5 border border-white/10 rounded-[28px] overflow-hidden backdrop-blur-md divide-y divide-white/5">
            {/* Fashion */}
            <div className="p-5 flex gap-4 items-start">
               <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                  <Shirt size={18} className="text-white/80" />
               </div>
               <div>
                  <div className="flex items-center gap-2 mb-1">
                     <span className="text-sm font-bold text-white">幸运穿搭</span>
                     <span 
                        className="w-3 h-3 rounded-full border border-white/20 shadow-[0_0_8px_currentColor]" 
                        style={{ backgroundColor: tactical_radar.fashion.lucky_color_hex, color: tactical_radar.fashion.lucky_color_hex }}
                     ></span>
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed">
                     {tactical_radar.fashion.advice}
                  </p>
               </div>
            </div>

             {/* Sanctuary Radar */}
             <div className="p-5 flex gap-4 items-start bg-indigo-500/5">
               <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                  <MapPin size={18} className="text-indigo-300" />
               </div>
               <div className="w-full">
                  <div className="flex items-center justify-between mb-1">
                     <span className="text-sm font-bold text-indigo-100">高维避难所</span>
                     <span className="text-[10px] bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-200">
                        {sanctuary_radar.direction}
                     </span>
                  </div>
                  <p className="text-xs text-white/80 font-medium mb-1">{sanctuary_radar.location_type}</p>
                  <p className="text-xs text-white/50 leading-relaxed mb-2">
                     行动：{sanctuary_radar.action_guide}
                  </p>
                  <div className="bg-black/20 p-2 rounded-lg border border-indigo-500/10">
                      <p className="text-[10px] text-indigo-200 italic">“{sanctuary_radar.psych_anchor}”</p>
                  </div>
               </div>
            </div>

            {/* Nobleman Magnet (Social) */}
            <div className="p-5">
               <div className="flex gap-4 items-start mb-4">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
                        <Users size={18} className="text-amber-300" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-amber-100">贵人磁铁</span>
                            <span className="text-[10px] border border-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded">
                                捕捉: {nobleman_magnet.lucky_target.sign}
                            </span>
                        </div>
                        <p className="text-xs text-white/60 leading-relaxed">
                            特征：{nobleman_magnet.lucky_target.visual_cue}
                        </p>
                        <p className="text-xs text-amber-200/80 mt-1">
                            指令：{nobleman_magnet.lucky_target.interaction}
                        </p>
                    </div>
               </div>
               
               <div className="border-t border-white/5 pt-4 flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20">
                        <AlertOctagon size={18} className="text-red-300" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-red-100">社交预警</span>
                            <span className="text-[10px] border border-red-500/30 text-red-300 px-1.5 py-0.5 rounded">
                                远离: {nobleman_magnet.social_warning.sign}
                            </span>
                        </div>
                        <p className="text-xs text-white/60 leading-relaxed">
                             {nobleman_magnet.social_warning.forbidden_topic}
                        </p>
                        <p className="text-xs text-red-300/60 mt-1">
                             后果：{nobleman_magnet.social_warning.consequence}
                        </p>
                    </div>
               </div>
            </div>

         </div>
      </section>
      
      {/* New Module: Providence OS Core Log */}
      {fate_log_markdown && (
        <TerminalLogModule markdown={fate_log_markdown} />
      )}

      {/* 底部按钮区 - 厄运急救 & 重置 */}
      <div className="space-y-4 pt-4 border-t border-white/5">
          <KarmaResetSection userInput={userInput} />
          
          <button 
            onClick={onReset}
            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/30 text-[10px] hover:bg-white/10 hover:text-rose-300 transition-all flex items-center justify-center gap-2 tracking-wider uppercase"
          >
            <LogOut size={12} />
            <span>Destroy Profile & Reset Identity</span>
          </button>
      </div>

    </div>
  );
};

export default ResultView;
