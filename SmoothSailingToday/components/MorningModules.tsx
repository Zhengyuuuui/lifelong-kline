import React from 'react';
import { MorningRiskReport, TimeSniper } from '../types';
import { AlertTriangle, Shield, AlertCircle, Eye, Target, MapPin, ExternalLink, Zap } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

// Module 1: Morning Risk Report
export const MorningRiskCard = ({ data }: { data: MorningRiskReport | undefined }) => {
    const { t } = useLanguage();
    if (!data) return null;

    const { visual_theme, content_block } = data;
    const isRed = visual_theme === 'red_alert';
    const isGreen = visual_theme === 'green_pass';
    const isYellow = visual_theme === 'yellow_warning';

    let borderColor = 'border-amber-500/30';
    let bgColor = 'bg-amber-900/10';
    let iconColor = 'text-amber-400';
    let title = '黄色关注';
    
    if (isRed) {
        borderColor = 'border-red-500/40';
        bgColor = 'bg-red-900/10';
        iconColor = 'text-red-500 animate-pulse';
        title = '红色预警';
    } else if (isGreen) {
        borderColor = 'border-emerald-500/30';
        bgColor = 'bg-emerald-900/10';
        iconColor = 'text-emerald-400';
        title = '绿色通行';
    }

    return (
        <div className={`w-full glass-card-sm p-0 mb-4 border ${borderColor} ${bgColor} relative overflow-hidden animate-slide-up-fade`}>
            {/* Header Strip */}
            <div className={`px-4 py-2 flex items-center justify-between border-b ${borderColor} bg-black/20`}>
                <div className="flex items-center gap-2">
                    {isRed ? <AlertCircle size={14} className={iconColor} /> : <Eye size={14} className={iconColor} />}
                    <span className={`text-[12px] font-bold ${isRed ? 'text-red-300' : isGreen ? 'text-emerald-300' : 'text-amber-300'}`}>
                        {title}
                    </span>
                </div>
                <div className="text-[10px] text-white/40 font-mono">风险报告</div>
            </div>

            <div className="p-4 space-y-4">
                {/* Warning Text */}
                <div>
                    <p className={`text-[13px] font-medium leading-relaxed ${isRed ? 'text-white' : 'text-white/80'}`}>
                        "{content_block.warning_text}"
                    </p>
                </div>

                {/* Shield */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                    <Shield size={16} className="text-indigo-400 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                        <p className="text-[12px] text-indigo-200 leading-snug">
                            {content_block.action_shield}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Module 2: Time Sniper
export const TimeSniperCard = ({ data }: { data: TimeSniper | undefined }) => {
    const { t } = useLanguage();
    if (!data) return null;

    const { content_block } = data;

    return (
        <div className="w-full glass-card-frost p-0 mb-6 border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.1)] relative overflow-hidden group animate-slide-up-fade" style={{ animationDelay: '0.1s' }}>
            
            {/* Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_0%,rgba(6,182,212,0.1)_50%,transparent_100%)] bg-[length:100%_4px] opacity-20" />
            
            {/* Header */}
            <div className="px-5 py-3 border-b border-cyan-500/10 flex items-center justify-between bg-cyan-900/5">
                <div className="flex items-center gap-2">
                    <Target size={14} className="text-cyan-400" />
                    <span className="text-[12px] font-bold text-cyan-100 tracking-wide uppercase">
                        {content_block.title}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                    <span className="text-[10px] text-cyan-300 font-mono">{content_block.time_window}</span>
                </div>
            </div>

            <div className="p-5 relative z-10">
                {/* Reasoning */}
                <div className="text-[12px] text-white/60 mb-4 leading-relaxed pl-2 border-l-2 border-cyan-500/30">
                    {content_block.reasoning}
                </div>

                {/* AR & Action Grid */}
                <div className="grid grid-cols-1 gap-3 mb-4">
                    {/* AR Instruction */}
                    <div className="bg-black/30 rounded-xl p-3 border border-white/5 flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0 border border-cyan-500/20">
                             <MapPin size={16} className="text-cyan-400" />
                         </div>
                         <div>
                             <div className="text-[10px] text-cyan-500/70 font-bold uppercase tracking-wider mb-0.5">AR 罗盘指引</div>
                             <div className="text-[12px] text-white/90">{content_block.ar_instruction}</div>
                         </div>
                    </div>

                    {/* Action Guide */}
                    <div className="bg-gradient-to-r from-cyan-900/20 to-transparent rounded-xl p-3 border border-cyan-500/10 flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                             <Zap size={16} className="text-white/80" />
                         </div>
                         <div>
                             <div className="text-[10px] text-white/30 font-bold uppercase tracking-wider mb-0.5">微动作指令</div>
                             <div className="text-[12px] text-white font-medium">{content_block.action_guide}</div>
                         </div>
                    </div>
                </div>

                {/* Social Proof */}
                <div className="text-right">
                    <span className="text-[10px] text-white/20 italic font-mono">
                        {content_block.social_proof}
                    </span>
                </div>
            </div>
        </div>
    );
};