import React, { useState, useEffect, useMemo, Suspense, lazy, useRef } from 'react';
import './smooth-styles.css';
import '../lifeBook/lifebook-style.css'; // Lifebook styles for elements
import TopTimeRadar from './components/TopTimeRadar';
import {
    SuitableActionsCard,
    StrategyToneCard,
    NeedsInputCard,
    DashboardsCard,
    WindowList,
    DestressCard,
    FutureWeatherCard,
    SummaryBar,
    RelationshipRadarCard,
    ResistanceMapEntryCard
} from './components/DecisionModules';
import { MorningRiskCard, TimeSniperCard } from './components/MorningModules';
import InfoSheet from './components/InfoSheet';
import ResistanceMapSheet from './components/ResistanceMapSheet';
import StrategySheet from './components/StrategySheet';
import ActionPlanSheet from './components/ActionPlanSheet';
import StatusDetailSheet from './components/StatusDetailSheet';
import TutorialOverlay from './components/TutorialOverlay';
import LanguageSwitcher from './components/LanguageSwitcher';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

// Import LifeBook components and utilities
import ElementsScene from '../lifeBook/components/ElementsScene';
import Dashboard from '../lifeBook/components/Dashboard';
import InstantInventory from '../lifeBook/components/InstantInventory';
import CheatSheetSection from '../lifeBook/components/CheatSheet';
import LifeBook from '../lifeBook/components/LifeBook';
import { I18nProvider } from '../lifeBook/utils/i18nContext';

import { ElementType, ElementData, AstrologyData, UserData as LifeBookUserData, CheatCard, LifeBookData } from '../lifeBook/types';
import { getDailyEnergyLevels } from '../lifeBook/utils/energyCalculator';
import { calculateAstrologyData, formatLocalDateKey, parseLocalDate } from '../lifeBook/utils/astrologyEngine';
import { generateCheatCards, getFallbackCheats } from '../lifeBook/utils/gemini';
import { generateLifeBook } from '../lifeBook/utils/lifeBookGenerator';

import { MOCK_DATA, INITIAL_MESSAGES } from './constants';
import { TimelineSegment, ActionChip, StrategyTone, Message, RelationshipCandidate, AlternativeRoute, DashboardMetrics, StrategyKit, ActionPlan, UserProfile, DayData, FutureWeather } from './types';
import { analyzeGoalWithAI, getStrategyKitAI, generateActionPlanAI, refreshRelationshipCandidatesAI, generateDailyFortune, analyzeUserProfile, calculateAge, generateFutureWeatherAI, generateMorningRiskAndSniper } from './services/ai';
import { generateProvidence, generateKarmaReset } from '../services/geminiService';
import { 
    Loader2, ArrowLeft, Zap, Activity, Shirt, MapPin, Users, AlertOctagon, AlertTriangle, 
    CheckCircle2, Eye, Sparkles, Dices, Heart, HelpCircle, Compass, Clock, AlertCircle, Lock, Lightbulb
} from 'lucide-react';

import { ModuleHelperTag } from '../components/ModuleHelperTag';

// ==========================================
// --- Providence (天命) Merged Components ---
// ==========================================

const KEY_USER_DATA = 'life_book_user_data';
const KEY_LIFE_BOOK = 'life_book_data';
const KEY_CHEATS = 'life_book_cheats';
const KEY_CHEAT_DATE = 'life_book_cheat_date';
const KEY_SAVED_ENERGY = 'life_book_energy';

const INITIAL_DESCRIPTIONS_ZH: Record<ElementType, string> = {
  [ElementType.Wood]: "扎根与延展。生命生长的有机原力。",
  [ElementType.Fire]: "体积燃烧。激情与变革的上升驱动力。",
  [ElementType.Earth]: "固态物质。稳定与滋养的引力中心。",
  [ElementType.Metal]: "精细结构。磁性与精度的流体逻辑。",
  [ElementType.Water]: "悬浮流动。零重力下的适应性本质。",
};

const TRAITS_ZH: Record<ElementType, string> = {
  [ElementType.Wood]: "生长", [ElementType.Fire]: "动力", [ElementType.Earth]: "稳固", [ElementType.Metal]: "逻辑", [ElementType.Water]: "适应"
};

const ELEMENT_NAMES_ZH: Record<ElementType, string> = {
  [ElementType.Wood]: "木", [ElementType.Fire]: "火", [ElementType.Earth]: "土", [ElementType.Metal]: "金", [ElementType.Water]: "水"
};

const COLORS: Record<ElementType, string> = {
  [ElementType.Wood]: "text-emerald-400",
  [ElementType.Fire]: "text-orange-500",
  [ElementType.Earth]: "text-stone-400",
  [ElementType.Metal]: "text-amber-400", // Gold for Metal
  [ElementType.Water]: "text-cyan-400",
};

const ELEMENT_ORDER = [
  ElementType.Metal,
  ElementType.Wood,
  ElementType.Water,
  ElementType.Fire,
  ElementType.Earth
];

const LOGIC_MARKER = /\[LOGIC\]|\u{1F441}\uFE0F?/u;
const GLITCH_MARKER = /\[GLITCH\]|\u{1F52E}/u;
const CHEAT_MARKER = /\[CHEAT\]|\u{1F3B2}/u;

const parseLogBlock = (lines: string[]) => {
    const data: any = { type: 'unknown', title: '', items: [] };
    if (LOGIC_MARKER.test(lines[0] || '')) data.type = 'logic';
    if (GLITCH_MARKER.test(lines[0] || '')) data.type = 'glitch';
    if (CHEAT_MARKER.test(lines[0] || '')) data.type = 'cheat';

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

const AetherTuningDeck: React.FC<{
    baseElements: Record<ElementType, number>;
    handleUpdateEnergy: (delta: Partial<Record<ElementType, number>>, resetTarget?: boolean) => void;
    astrologyData: any;
    generatedCheats: CheatCard[];
    activeCheats: CheatCard[];
    handleEquipCheat: (card: CheatCard) => void;
    handleUnequipCheat: (cardId: string) => void;
    handleRefreshCheats: () => void;
}> = ({
    baseElements,
    handleUpdateEnergy,
    astrologyData,
    generatedCheats,
    activeCheats,
    handleEquipCheat,
    handleUnequipCheat,
    handleRefreshCheats
}) => {
    const [subTab, setSubTab] = useState<'inventory' | 'cheats'>('inventory');
    return (
        <div className="w-full rounded-[30px] border border-white/5 bg-[#070708] shadow-2xl relative">
            {/* Visual Glass Header with dynamic tabs */}
            <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none rounded-t-[30px] overflow-hidden" />
            <div className="px-4.5 py-4 border-b border-white/5 flex flex-col gap-3 relative z-10 bg-black/35 backdrop-blur-md rounded-t-[30px]">
                <div className="flex flex-col gap-1 text-left pl-4 sm:pl-6">
                    <div className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_6px_#6366f1]" />
                        <span className="text-[7.5px] sm:text-[8.5px] font-mono tracking-[0.18em] font-bold text-indigo-400 uppercase leading-none">
                            AETHER COMPASS
                        </span>
                    </div>
                    <h2 className="text-xs sm:text-sm font-semibold text-white/90 tracking-wide mt-1">
                        天命补正控制盘
                    </h2>
                    <span className="text-[9px] sm:text-[9.5px] text-white/40 tracking-widest leading-relaxed mt-0.5 inline-block w-full break-normal whitespace-normal w-11/12">
                        弱势磁场主动干预控制系统
                    </span>
                </div>

                {/* Highly Responsive Dual Grid Segmented Tabs to Prevent Overflow */}
                <div className="grid grid-cols-2 bg-white/[0.01]/80 backdrop-blur-md border border-white/5 p-1 rounded-2xl w-full gap-1">
                    <button
                        onClick={() => setSubTab('inventory')}
                        className={`truncate px-2 py-2.5 rounded-xl text-[10px] sm:text-xs font-semibold tracking-wide transition-all duration-300 flex items-center justify-center gap-1.5 ${
                            subTab === 'inventory'
                                ? 'bg-indigo-500/15 text-indigo-200 border border-indigo-500/10 shadow-sm font-bold'
                                : 'text-white/40 border border-transparent hover:text-white/80'
                        }`}
                    >
                        <Shirt size={11} className={subTab === 'inventory' ? 'text-indigo-400' : 'text-white/30'} />
                        <span className="truncate">生克补益 · 穿配食疗</span>
                    </button>
                    <button
                        onClick={() => setSubTab('cheats')}
                        className={`truncate px-2 py-2.5 rounded-xl text-[10px] sm:text-xs font-semibold tracking-wide transition-all duration-300 flex items-center justify-center gap-1.5 ${
                            subTab === 'cheats'
                                ? 'bg-indigo-500/15 text-indigo-200 border border-indigo-500/10 shadow-sm font-bold'
                                : 'text-white/40 border border-transparent hover:text-white/80'
                        }`}
                    >
                        <Dices size={11} className={subTab === 'cheats' ? 'text-indigo-400' : 'text-white/30'} />
                        <span className="truncate">天命重构 · 因果外挂</span>
                    </button>
                </div>
            </div>

            <div className="p-2 sm:p-5 relative z-10 bg-[#050505]/40 backdrop-blur-md rounded-b-[30px]">
                {subTab === 'inventory' ? (
                    <div className="animate-fade-in">
                        <InstantInventory 
                            energyLevels={baseElements}
                            onUpdateEnergy={handleUpdateEnergy}
                            isInvalidUser={astrologyData?.isValid === false}
                        />
                    </div>
                ) : (
                    <div className="animate-fade-in text-left">
                        <CheatSheetSection 
                            cards={generatedCheats}
                            onEquip={handleEquipCheat}
                            onUnequip={handleUnequipCheat}
                            equippedCardIds={activeCheats.map(c => c.id)}
                            onRefresh={handleRefreshCheats}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

const AbsoluteMissionCard: React.FC<{ main_mission: any }> = ({ main_mission }) => {
    const isCritical = main_mission?.warning_level === 'CRITICAL';
    return (
        <div className={`w-full p-6 relative overflow-hidden transition-all duration-500 rounded-3xl border ${
            isCritical 
                ? 'border-rose-500/30 bg-gradient-to-br from-rose-950/20 via-[#0a0606] to-[#050505] shadow-[0_20px_50px_-10px_rgba(239,68,68,0.15)] animate-pulse' 
                : 'border-white/10 bg-gradient-to-br from-indigo-950/20 via-[#09090b] to-[#040404] shadow-[0_20px_50px_-10px_rgba(99,102,241,0.08)]'
        }`}>
            {/* Ambient Background Glow */}
            <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-[60px] pointer-events-none opacity-40 ${
                isCritical ? 'bg-rose-500' : 'bg-indigo-500'
            }`} />
            
            <div className="relative z-10 flex flex-col gap-4 text-left">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isCritical ? 'bg-rose-500 animate-ping' : 'bg-indigo-400 animate-pulse'}`} />
                        <span className={`text-[10px] font-mono tracking-[0.25em] uppercase ${
                            isCritical ? 'text-rose-400' : 'text-indigo-400'
                        }`}>
                            TODAY'S ABSOLUTE DIRECTIVE / 今日绝对主线
                        </span>
                    </div>
                    <span className={`text-[9px] font-mono px-3 py-1.5 rounded-full border tracking-wider font-bold ${
                        isCritical 
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/20' 
                            : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                    }`}>
                        {isCritical ? 'CRITICAL / 紧急避险' : 'STABLE / 顺势积淀'}
                    </span>
                </div>
                
                <div className="flex flex-col gap-1 my-1">
                    <span className="text-[10px] text-white/30 font-mono tracking-widest uppercase">CORE KEYWORD</span>
                    <h3 className={`text-2xl md:text-3xl font-serif font-bold tracking-wide ${isCritical ? 'text-rose-100' : 'text-white'}`}>
                        {main_mission?.keyword}
                    </h3>
                </div>

                <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl relative overflow-hidden backdrop-blur-sm">
                    <div className="absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-indigo-500/50 via-indigo-500/10 to-transparent" />
                    <p className="text-xs md:text-sm text-white/80 leading-relaxed font-light font-sans tracking-wide">
                        {main_mission?.instruction}
                    </p>
                </div>
            </div>
        </div>
    );
};

const EnergyScanCard: React.FC<{ energy_system: any }> = ({ energy_system }) => {
    if (!energy_system) return null;
    return (
        <div className="w-full p-6 md:p-8 rounded-[32px] border border-white/10 bg-[#070707] shadow-3xl overflow-hidden relative text-left">
            <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/5 rounded-full blur-[60px] pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex flex-col gap-6">
                <div className="flex items-center gap-2">
                    <Activity size={14} className="text-teal-400 animate-pulse" />
                    <span className="text-[10px] font-mono tracking-[0.25em] text-white/40 uppercase">
                        BIO-ENERGY SCANS / 阳场与生物能量透析
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Core Status */}
                    {energy_system.core_status && (
                        <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col gap-3 relative overflow-hidden">
                            <div className="flex justify-between items-end">
                                <span className="text-sm font-bold text-white/95 font-serif">{energy_system.core_status.name}</span>
                                <span className="text-[14px] font-mono font-bold text-teal-400">+{energy_system.core_status.value}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                                <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-1000 relative" style={{ width: `${energy_system.core_status.value}%` }}>
                                    <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                                </div>
                            </div>
                            <p className="text-xs text-white/60 leading-relaxed font-light">{energy_system.core_status.description}</p>
                            <div className="mt-1 pt-3 border-t border-white/5 flex items-start gap-2 text-teal-300">
                                <Lightbulb size={13} className="shrink-0 text-teal-300" aria-hidden="true" />
                                <p className="text-xs text-teal-300/90 font-medium leading-relaxed">{energy_system.core_status.advice}</p>
                            </div>
                        </div>
                    )}
                    
                    {/* Secondary Status */}
                    {energy_system.secondary_status && (
                        <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col gap-3 relative overflow-hidden">
                            <div className="flex justify-between items-end">
                                <span className="text-sm font-bold text-white/95 font-serif">{energy_system.secondary_status.name}</span>
                                <span className={`text-[14px] font-mono font-bold ${energy_system.secondary_status.type === 'buff' ? 'text-teal-400' : 'text-rose-400'}`}>
                                    {energy_system.secondary_status.type === 'buff' ? '+' : '-'}{energy_system.secondary_status.value}%
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                                <div className={`h-full bg-gradient-to-r ${energy_system.secondary_status.type === 'buff' ? 'from-teal-500 to-emerald-400' : 'from-rose-500 to-orange-400'} rounded-full transition-all duration-1000 relative`} style={{ width: `${energy_system.secondary_status.value}%` }}>
                                    <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                                </div>
                            </div>
                            <p className="text-xs text-white/60 leading-relaxed font-light">{energy_system.secondary_status.description}</p>
                            <div className={`mt-1 pt-3 border-t border-white/5 flex items-start gap-2 ${energy_system.secondary_status.type === 'buff' ? 'text-teal-300' : 'text-rose-300'}`}>
                                <Lightbulb size={13} className="shrink-0" aria-hidden="true" />
                                <p className="text-xs font-medium leading-relaxed">{energy_system.secondary_status.advice}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const TacticalRadarCard: React.FC<{ tactical_radar: any, sanctuary_radar: any, nobleman_magnet: any }> = ({ tactical_radar, sanctuary_radar, nobleman_magnet }) => {
    return (
        <div className="w-full rounded-[32px] border border-white/10 bg-[#070707] shadow-3xl overflow-hidden relative text-left">
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
            
            {/* Title / Header */}
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between relative z-10 bg-black/20">
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 text-[9px] font-mono tracking-[0.25em] text-[#C5A059] uppercase">
                        <Compass size={12} className="text-[#C5A059] animate-[spin_12s_linear_infinite]" />
                        <span>TACTICAL NAVIGATION / 天机避守策略雷达</span>
                    </div>
                    <span className="text-xs font-semibold text-white/80 mt-0.5 font-serif">今日避害、御风与时空方位锚点</span>
                </div>
            </div>

            <div className="divide-y divide-white/5 relative z-10">
                {/* Fashion */}
                {tactical_radar?.fashion && (
                    <div className="p-6 flex gap-4 items-start hover:bg-white/[0.01] transition-colors">
                        <div className="w-10 h-10 rounded-full bg-white/[0.03] flex items-center justify-center shrink-0 border border-white/10 shadow-lg">
                            <Shirt size={16} className="text-white/80" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-white font-serif">天时穿搭</span>
                                <div className="flex items-center gap-1.5 ml-1">
                                    <span 
                                        className="w-3.5 h-3.5 rounded-full border border-white/30 shadow-[0_0_10px_currentColor] inline-block" 
                                        style={{ backgroundColor: tactical_radar.fashion.lucky_color_hex, color: tactical_radar.fashion.lucky_color_hex }}
                                    ></span>
                                    <span className="text-[10px] text-white/50 font-mono tracking-wider">LUCKY PALETTE</span>
                                </div>
                            </div>
                            <p className="text-xs text-white/70 leading-relaxed font-light">{tactical_radar.fashion.advice}</p>
                        </div>
                    </div>
                )}

                {/* Sanctuary */}
                {sanctuary_radar && (
                    <div className="p-6 flex gap-4 items-start bg-indigo-500/[0.02] hover:bg-indigo-500/[0.04] transition-all border-l-2 border-l-indigo-500/30">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 shadow-md">
                            <MapPin size={16} className="text-indigo-400" />
                        </div>
                        <div className="w-full">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm font-bold text-white font-serif">今日时空避难所</span>
                                <span className="text-[9px] font-bold bg-indigo-500/15 border border-indigo-500/20 px-2.5 py-1 rounded text-indigo-300 font-mono tracking-widest">
                                    方向: {sanctuary_radar.direction}
                                </span>
                            </div>
                            <p className="text-xs text-indigo-300 font-medium mb-1.5">{sanctuary_radar.location_type}</p>
                            <p className="text-xs text-white/60 leading-relaxed font-light mb-3">
                                 行动指南：{sanctuary_radar.action_guide}
                            </p>
                            <div className="bg-black/40 p-3.5 rounded-2xl border border-indigo-500/10 w-full">
                                <p className="text-xs text-indigo-200/90 italic font-serif leading-relaxed">“{sanctuary_radar.psych_anchor}”</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Nobleman / Magnet */}
                {nobleman_magnet?.lucky_target && (
                    <div className="p-6 flex gap-4 items-start hover:bg-white/[0.01] transition-colors border-l-2 border-l-amber-500/20">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-md">
                            <Users size={16} className="text-amber-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-white font-serif">贵人磁卡门票</span>
                                <span className="text-[9px] font-bold border border-amber-500/30 text-amber-300 bg-amber-500/5 px-2 py-0.5 rounded font-mono tracking-widest">
                                    对星: {nobleman_magnet.lucky_target.sign}
                                </span>
                            </div>
                            <p className="text-xs text-white/70 leading-relaxed font-light">
                                特征线索：{nobleman_magnet.lucky_target.visual_cue}
                            </p>
                            <p className="text-xs text-amber-300/95 mt-1.5 font-medium flex items-center gap-1">
                                <span className="text-xs">✨</span>
                                <span>引力指令：{nobleman_magnet.lucky_target.interaction}</span>
                            </p>
                        </div>
                    </div>
                )}

                {/* Warning / Taboo */}
                {nobleman_magnet?.social_warning && (
                    <div className="p-6 flex gap-4 items-start hover:bg-white/[0.01] transition-colors border-l-2 border-l-rose-500/20">
                        <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0 border border-rose-500/20 shadow-md">
                            <AlertOctagon size={16} className="text-rose-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-rose-200 font-serif">社交高压线</span>
                                <span className="text-[9px] font-bold border border-rose-500/30 text-rose-300 bg-rose-500/5 px-2 py-0.5 rounded font-mono tracking-widest">
                                    回避: {nobleman_magnet.social_warning.sign}
                                </span>
                            </div>
                            <p className="text-xs text-white/70 leading-relaxed font-light">
                                禁语禁区：{nobleman_magnet.social_warning.forbidden_topic}
                            </p>
                            <p className="text-xs text-rose-300/90 mt-1.5 font-medium flex items-center gap-1">
                                <span className="text-xs">⚠️</span>
                                <span>因果负反馈：{nobleman_magnet.social_warning.consequence}</span>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const LogCard: React.FC<{ block: any }> = ({ block }) => {
    if (block.type === 'logic') {
        return (
            <div className="glass-card-sm p-5 border border-white/5 mb-3 relative overflow-hidden bg-slate-900/30 hover:bg-slate-900/40 transition-colors">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-[30px] pointer-events-none" />
                <div className="flex items-center gap-1.5 mb-2 text-indigo-400">
                    <Eye size={14} />
                    <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">Root Cause Analysis / 底层逻辑</span>
                </div>
                <h4 className="text-[14px] font-bold text-white mb-2">{block.title || '层层推演'}</h4>
                {block.items.map((item: any, idx: number) => (
                    <div key={idx} className="space-y-0.5 mb-2 last:mb-0">
                        <p className="text-[10px] text-white/40">{item.key}</p>
                        <p className="text-xs text-white/80 leading-relaxed font-light">{item.val}</p>
                    </div>
                ))}
            </div>
        );
    }
    if (block.type === 'glitch') {
        return (
            <div className="glass-card-sm p-5 border border-white/5 mb-3 relative overflow-hidden bg-slate-900/30 hover:bg-slate-900/40 transition-colors">
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/5 rounded-full blur-[30px] pointer-events-none" />
                <div className="flex items-center gap-1.5 mb-2 text-purple-400">
                    <Sparkles size={14} />
                    <span className="text-[9px] font-bold tracking-widest uppercase opacity-70">Reality Glitch / 现实跃迁</span>
                </div>
                <h4 className="text-[14px] font-bold text-white mb-2">{block.title || '预知时空'}</h4>
                {block.items.map((item: any, idx: number) => (
                    <div key={idx} className="space-y-0.5 mb-2 last:mb-0">
                        <p className="text-[10px] text-white/40">{item.key}</p>
                        <p className="text-xs text-white/80 leading-relaxed font-light italic">"{item.val}"</p>
                    </div>
                ))}
            </div>
        );
    }
    if (block.type === 'cheat') {
        return (
            <div className="glass-card-sm p-4 border border-white/5 mb-3 relative overflow-hidden bg-slate-900/30">
                <div className="flex items-center gap-1.5 mb-2 text-emerald-400">
                    <Dices size={14} />
                    <span className="text-[9px] font-bold tracking-widest uppercase opacity-70">Cheat Code / 作弊码</span>
                </div>
                <h4 className="text-[14px] font-bold text-white mb-2">{block.title || '改命指令'}</h4>
                {block.items.map((item: any, idx: number) => (
                    <div key={idx} className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2.5">
                        <p className="text-[9px] text-emerald-400/60 font-mono mb-1 uppercase">{item.key} //</p>
                        <p className="text-xs text-emerald-100 font-medium leading-relaxed">{item.val}</p>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const TerminalLogModule: React.FC<{ markdown: string }> = ({ markdown }) => {
    const blocks = useMemo(() => {
        const lines = (markdown || '').split('\n').filter(line => 
            !line.toLowerCase().includes('个体扫描结果') && 
            !line.toLowerCase().includes('user profile') && 
            !line.includes('PROVIDENCE OS') &&
            line.trim() !== ''
        );
        
        const parsedBlocks: any[] = [];
        let currentBuffer: string[] = [];

        lines.forEach(line => {
            if (LOGIC_MARKER.test(line) || GLITCH_MARKER.test(line) || CHEAT_MARKER.test(line)) {
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
        <div className="w-full space-y-3">
            <div className="text-[11px] font-semibold text-white/40 uppercase tracking-widest pl-2">Providence Core Logs / 核心算法日志</div>
            <div className="space-y-3">
                {blocks.map((block, idx) => (
                    <LogCard key={idx} block={block} />
                ))}
            </div>
        </div>
    );
};

const KarmaResetCard: React.FC<{ userProfile: UserProfile }> = ({ userProfile }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [badEvent, setBadEvent] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [resetResult, setResetResult] = useState<any | null>(null);

    const handleReset = async () => {
        if (!badEvent.trim()) return;
        setIsLoading(true);
        try {
            const data = await generateKarmaReset(badEvent, userProfile as any);
            setResetResult(data);
        } catch (e) {
            alert("重构服务当前负载较高，请稍后再试。");
        } finally {
            setIsLoading(false);
        }
    };

    if (resetResult) {
        return (
            <div className="w-full glass-card-sm p-5 mb-4 border border-indigo-500/30 bg-indigo-950/20 relative overflow-hidden animate-fade-in rounded-3xl">
                <Zap className="absolute top-0 right-0 w-24 h-24 opacity-5 text-indigo-400" />
                <div className="relative z-10 space-y-3">
                    <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 size={16} />
                        <span className="text-[10px] font-bold tracking-widest uppercase">Karma Config Reset / 生态平衡恢复</span>
                    </div>
                    <h3 className="text-lg font-serif-sc font-bold text-white">异常事件重编解码完成</h3>
                    <div className="bg-black/30 rounded-xl p-3 border border-white/5 text-xs text-white/80 leading-relaxed">
                        <span className="text-indigo-300 font-bold block mb-1">能量转换：</span>
                        {resetResult.metaphysical_reframe}
                    </div>
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <p className="text-emerald-200 text-xs font-medium">✨ 判释宣告：{resetResult.verdict}</p>
                    </div>
                    <button 
                        onClick={() => { setResetResult(null); setBadEvent(""); setIsOpen(false); }}
                        className="w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-white/50 transition-colors border border-white/5"
                    >
                        退出系统终端
                    </button>
                </div>
            </div>
        );
    }

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="w-full mb-4 group relative overflow-hidden rounded-2xl bg-rose-500/10 border border-rose-500/25 p-4 hover:bg-rose-500/20 transition-all duration-200 active:scale-[0.98]"
            >
                <div className="flex items-center justify-center gap-2 text-rose-300 group-hover:text-rose-200 text-xs font-semibold">
                    <AlertTriangle size={15} className="animate-pulse" />
                    <span>今日遭遇厄运或坎坷？启动高维急救认知重构</span>
                </div>
            </button>
        );
    }

    return (
        <div className="w-full glass-card-sm p-5 mb-4 border border-rose-500/20 bg-rose-950/5 animate-fade-in rounded-3xl">
            <h3 className="text-rose-400 text-xs font-bold mb-3 flex items-center gap-1.5">
                <AlertCircle size={14} className="text-rose-400" />
                <span>输入突发不可抗异常事件 (Bad Event)</span>
            </h3>
            <textarea
                value={badEvent}
                onChange={(e) => setBadEvent(e.target.value)}
                placeholder="例如：刚不小心丢了钱、被客户推脱了合同、今天手机屏幕不慎摔裂了..."
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 outline-none focus:border-rose-500/40 min-h-[70px] resize-none"
            />
            <div className="flex gap-2 mt-3">
                <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 text-xs rounded-xl border border-white/5 transition-all"
                >
                    取消
                </button>
                <button
                    onClick={handleReset}
                    disabled={isLoading || !badEvent.trim()}
                    className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-rose-900/20"
                >
                    {isLoading ? (
                        <span className="animate-pulse">认知解耦中...</span>
                    ) : (
                        <>
                            <Zap size={14} fill="currentColor" />
                            <span>重构高维世界场</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

const PremiumMosaicWrapper: React.FC<{ isPremium: boolean; onRequirePremium?: () => void; children: React.ReactNode; label?: string }> = ({ isPremium, onRequirePremium, children, label = "高维运势解读" }) => {
    if (isPremium) return <>{children}</>;
    
    return (
        <div className="relative w-full rounded-2xl overflow-hidden group mb-2" onClick={onRequirePremium}>
            {/* The blurred content */}
            <div className="filter blur-[8px] opacity-60 contrast-125 border border-white/5 saturate-150 pointer-events-none select-none transition-all duration-500 scale-[1.02]">
                {children}
            </div>
            {/* Overlay */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/10 transition-colors group-hover:bg-black/20 cursor-pointer">
                <div className="bg-[#050810]/90 border border-indigo-500/40 text-white px-5 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-[0_8px_32px_rgba(99,102,241,0.25)] backdrop-blur-md transform transition-all duration-300 group-hover:scale-105 active:scale-95">
                    <Lock size={16} className="text-indigo-400" />
                    <span className="text-sm font-bold tracking-wide">解锁 {label}</span>
                </div>
            </div>
        </div>
    );
};

interface AppProps {
    onBack?: () => void;
    userProfile?: UserProfile;
    isPremium?: boolean;
    onRequirePremium?: () => void;
    allowPersistence?: boolean;
}

const BOOTSTRAP_DELAY_MS = 180;
const FORTUNE_TIMEOUT_MS = 6500;
const SECONDARY_AI_TIMEOUT_MS = 5200;

const getSmoothProfileKey = (profile: UserProfile | null | undefined, lang: string) => [
    formatLocalDateKey(),
    lang,
    profile?.name || '',
    profile?.birthDate || '',
    profile?.birthTime || '',
    profile?.birthPlace || '',
    profile?.gender || ''
].join('|');

const getLifeBookLang = (lang: string) => (lang === 'zh' ? 'zh' : 'en');

const runWithTimeout = async <T,>(task: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
    let timeoutId: number | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    });

    try {
        return await Promise.race([task, timeout]);
    } finally {
        if (timeoutId !== undefined) {
            window.clearTimeout(timeoutId);
        }
    }
};

const AppContent: React.FC<AppProps> = ({ onBack, userProfile: initialUserProfile, isPremium = false, onRequirePremium, allowPersistence = false }) => {
    const { language, t } = useLanguage();
    // Onboarding State
    const [userProfile, setUserProfile] = useState<UserProfile | null>(initialUserProfile || null);
    const [isOnboardingDone, setOnboardingDone] = useState(!!initialUserProfile);
    const [isCalibrating, setIsCalibrating] = useState(false);
    const [isEnrichingProfile, setIsEnrichingProfile] = useState(false);

    // Tutorial State
    const [showTutorial, setShowTutorial] = useState(false);

    // Main App Data State (Initial = Mock, then Update with AI)
    const [dayData, setDayData] = useState<DayData>(MOCK_DATA);

    // Main App UI State
    const [selectedSegment, setSelectedSegment] = useState<TimelineSegment | null>(null);
    const [currentTone, setCurrentTone] = useState<StrategyTone>('steady');
    const [messages, setMessages] = useState<Message[]>([]); // Initialized empty, filled via effect to support localization

    // State for New Modules
    const [relationshipCandidates, setRelationshipCandidates] = useState<RelationshipCandidate[]>(MOCK_DATA.relationships);
    const [isRefreshingCandidates, setIsRefreshingCandidates] = useState(false);
    const [isResistanceMapOpen, setResistanceMapOpen] = useState(false);
    const [isStatusSheetOpen, setStatusSheetOpen] = useState(false);

    // State for Goal & Dashboard Logic
    const [selectedNeed, setSelectedNeed] = useState<string>('');
    const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics>(MOCK_DATA.dashboard);
    const [isAnalyzingGoal, setIsAnalyzingGoal] = useState(false);

    // State for Window Actions (Kit & Plan)
    const [isStrategySheetOpen, setStrategySheetOpen] = useState(false);
    const [strategyData, setStrategyData] = useState<StrategyKit | null>(null);
    const [isStrategyLoading, setIsStrategyLoading] = useState(false);

    const [isActionPlanOpen, setActionPlanOpen] = useState(false);
    const [actionPlanData, setActionPlanData] = useState<ActionPlan | null>(null);
    const [isActionPlanLoading, setIsActionPlanLoading] = useState(false);

    // State for Future Weather
    const [futureWeather, setFutureWeather] = useState<FutureWeather>(MOCK_DATA.future);
    const [isFutureLoading, setIsFutureLoading] = useState(false);

    // Merged Providence OS States
    const [sailingTab, setSailingTab] = useState<'time_window' | 'providence'>('time_window');
    const [providenceData, setProvidenceData] = useState<any | null>(null);
    const [isProvidenceLoading, setIsProvidenceLoading] = useState(false);
    const [isProvidenceSceneReady, setProvidenceSceneReady] = useState(false);

    useEffect(() => {
        setSailingTab('time_window');
        const frameId = window.requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: 'auto' });
        });

        return () => window.cancelAnimationFrame(frameId);
    }, []);

    useEffect(() => {
        if (sailingTab !== 'providence' || !providenceData) {
            setProvidenceSceneReady(false);
            return;
        }

        let warmupTimer: number | null = null;
        const frameId = window.requestAnimationFrame(() => {
            warmupTimer = window.setTimeout(() => setProvidenceSceneReady(true), 180);
        });

        return () => {
            window.cancelAnimationFrame(frameId);
            if (warmupTimer !== null) {
                window.clearTimeout(warmupTimer);
            }
        };
    }, [sailingTab, providenceData]);

    // --- Dynamic Bazi/Elements/Cheats/Book States ---
    const [baseElements, setBaseElements] = useState<Record<ElementType, number>>(() => {
        const profileData = initialUserProfile ? {
            name: initialUserProfile.name,
            birthDate: parseLocalDate(initialUserProfile.birthDate),
            birthTime: initialUserProfile.birthTime || "12:00",
            location: initialUserProfile.birthPlace || "未知",
            gender: ((initialUserProfile.gender as any) === 'secret' ? 'neutral' : initialUserProfile.gender) as 'male' | 'female' | 'neutral',
        } : undefined;
        return getDailyEnergyLevels(profileData);
    });

    const [elements, setElements] = useState<ElementData[]>([]);
    const [generatedCheats, setGeneratedCheats] = useState<CheatCard[]>([]);
    const [activeCheats, setActiveCheats] = useState<CheatCard[]>([]);
    const [cheatModifiers, setCheatModifiers] = useState<Partial<Record<ElementType, number>>>({});
    const [astrologyData, setAstrologyData] = useState<AstrologyData | undefined>(undefined);
    const [lifeBookData, setLifeBookData] = useState<LifeBookData | null>(null);
    const [showLifeBook, setShowLifeBook] = useState(false);
    const [activeIndex, setActiveIndex] = useState(2);
    const [showDetail, setShowDetail] = useState(false);

    // High Performance Drag Refs
    const dragOffset = useRef(0);
    const startX = useRef<number | null>(null);
    const startY = useRef<number | null>(null);
    const isDragging = useRef(false);
    const dragIntent = useRef<'horizontal' | 'vertical' | null>(null);

    const handleDragStart = (clientX: number, clientY: number) => {
        startX.current = clientX;
        startY.current = clientY;
        isDragging.current = true;
        dragIntent.current = null;
        dragOffset.current = 0;
    };

    const handleDragMove = (clientX: number, clientY: number) => {
        if (!isDragging.current || startX.current === null || startY.current === null) return false;
        const deltaX = clientX - startX.current;
        const deltaY = clientY - startY.current;
        if (!dragIntent.current && (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8)) {
            dragIntent.current = Math.abs(deltaX) > Math.abs(deltaY) * 1.15 ? 'horizontal' : 'vertical';
        }

        if (dragIntent.current !== 'horizontal') return false;

        // high sensitivity screen factor
        const screenFactor = window.innerWidth * 0.35;
        const offset = deltaX / screenFactor;
        dragOffset.current = offset;
        return true;
    };

    const handleDragEnd = () => {
        if (!isDragging.current) return false;
        const wasHorizontal = dragIntent.current === 'horizontal';
        isDragging.current = false;
        startX.current = null;
        startY.current = null;
        dragIntent.current = null;
        if (!wasHorizontal) {
            dragOffset.current = 0;
            return false;
        }

        const threshold = 0.05; // sensitive threshold
        if (dragOffset.current < -threshold) {
            handleNext();
        } else if (dragOffset.current > threshold) {
            handlePrev();
        }
        dragOffset.current = 0;
        return true;
    };

    const languageRef = useRef(language);
    const calibrationKeyRef = useRef('');
    const calibrationRunRef = useRef(0);
    const bootstrapTimerRef = useRef<number | null>(null);
    const deferredBookTimerRef = useRef<number | null>(null);
    const futureWeatherRunRef = useRef(0);
    const providenceRunRef = useRef(0);
    useEffect(() => {
        languageRef.current = language;
    }, [language]);

    // Identity Logic
    const userAge = userProfile ? calculateAge(userProfile.birthDate) : 25;
    const isStudent = userAge < 22;

    // Custom Tag Lists for Module 4
    const NEEDS_TAGS_STUDENT = [t('tag.exam'), t('tag.due'), t('tag.club'), t('tag.focus'), t('tag.study'), t('tag.relax'), t('tag.flow')];
    const NEEDS_TAGS_PRO = [t('tag.money'), t('tag.contract'), t('tag.collection'), t('tag.visit'), t('tag.focus'), t('tag.sprint'), t('tag.study'), t('tag.relax'), t('tag.flow')];

    // Helper to get localized mock data
    const getLocalizedDayData = (currentData: DayData): DayData => {
        // Reconstruct mock data with translations if it's still marked as mock
        if (!currentData.isMock) return currentData;

        return {
            ...currentData,
            modeLabel: t('mock.mode'),
            summary: t('mock.summary'),
            quote: t('mock.quote'),
            mainWindow: {
                ...currentData.mainWindow,
                tags: [t('window.mock.tags.deep'), t('window.mock.tags.terms'), t('window.mock.tags.result')],
                description: t('window.mock.desc'),
                advice: t('window.mock.advice')
            },
            suitableActions: [
                { id: '1', label: t('action.negotiation'), type: 'primary' },
                { id: '2', label: t('action.terms'), type: 'primary' },
                { id: '3', label: t('action.decisionMaker'), type: 'primary' },
                { id: '4', label: t('action.followup'), type: 'secondary' },
                { id: '5', label: t('action.review'), type: 'secondary' },
            ],
            relationships: [
                {
                    id: 'r1',
                    name: t('rel.mock.client'),
                    roleLabel: t('rel.mock.role.a'),
                    relationTag: t('rel.mock.tag.decision'),
                    recommendedTimeLabel: '20:00–21:00',
                    actionHint: t('rel.mock.hint.voice'),
                    reason: t('rel.mock.reason.high'),
                    priorityLevel: 'primary',
                    openingLine: t('rel.mock.opening.client')
                },
                {
                    id: 'r2',
                    name: t('rel.mock.partner'),
                    roleLabel: t('rel.mock.role.resource'),
                    relationTag: t('rel.mock.tag.resource'),
                    recommendedTimeLabel: '14:30–15:00',
                    actionHint: t('rel.mock.hint.text'),
                    reason: t('rel.mock.reason.afternoon'),
                    priorityLevel: 'secondary',
                    openingLine: t('rel.mock.opening.partner')
                },
                {
                    id: 'r3',
                    name: t('rel.mock.friend'),
                    roleLabel: t('rel.mock.role.classmate'),
                    relationTag: t('rel.mock.tag.emotion'),
                    recommendedTimeLabel: '21:30+',
                    actionHint: t('rel.mock.hint.chat'),
                    reason: t('rel.mock.reason.night'),
                    priorityLevel: 'secondary',
                    openingLine: t('rel.mock.opening.friend')
                }
            ]
        };
    };

    // Localization Effect
    useEffect(() => {
        // 1. Localize Mock Day Data
        if (dayData.isMock) {
            const localized = getLocalizedDayData(dayData);
            setDayData(localized);
            setRelationshipCandidates(localized.relationships);
        }

        // 2. Localize Dashboard Mock if still mock
        if (dayData.isMock) { // assuming dashboard is tied to dayData mock state
            setDashboardMetrics(prev => ({
                ...prev,
                summary: t('mock.dashboard.summary')
            }));
        }

        // 3. Localize Chat (Only initial)
        if (messages.length === 0 || (messages.length === 1 && messages[0].id === 'init-1')) {
            setMessages([{
                id: 'init-1',
                role: 'ai',
                text: t('chat.init'),
                timestamp: Date.now(),
                quickReplies: [t('chat.reply.call'), t('chat.reply.bad')]
            }]);
        }

    }, [language, t]); // Re-run when language changes

    // Check Local Storage on Mount. Keep first paint light; expensive AI calibration is deferred.
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
        let nextProfile: UserProfile | null = initialUserProfile || null;

        if (!nextProfile && allowPersistence) {
            const stored = localStorage.getItem('user_profile_v1');
            if (stored) {
                try {
                    nextProfile = JSON.parse(stored);
                } catch (e) {
                    console.error(e);
                }
            }
        }

        if (!nextProfile) return;

        setUserProfile(nextProfile);
        setOnboardingDone(true);

        const nextKey = getSmoothProfileKey(nextProfile, language);
        if (calibrationKeyRef.current === nextKey) return;
        calibrationKeyRef.current = nextKey;

        if (bootstrapTimerRef.current !== null) {
            window.clearTimeout(bootstrapTimerRef.current);
        }

        bootstrapTimerRef.current = window.setTimeout(() => {
            void calibrateFortune(nextProfile as UserProfile, nextKey);
        }, BOOTSTRAP_DELAY_MS);

        return () => {
            if (bootstrapTimerRef.current !== null) {
                window.clearTimeout(bootstrapTimerRef.current);
                bootstrapTimerRef.current = null;
            }
        };
    }, [initialUserProfile, language, allowPersistence]);

    useEffect(() => {
        return () => {
            calibrationRunRef.current += 1;
            futureWeatherRunRef.current += 1;
            providenceRunRef.current += 1;
            if (bootstrapTimerRef.current !== null) {
                window.clearTimeout(bootstrapTimerRef.current);
            }
            if (deferredBookTimerRef.current !== null) {
                window.clearTimeout(deferredBookTimerRef.current);
            }
        };
    }, []);

    // Check Tutorial Status disabled as requested

    // --- Dynamic Bazi/Elements/Cheats/Book Functions & Effects ---
    const handleUpdateEnergy = (delta: Partial<Record<ElementType, number>>, resetTarget?: boolean) => {
        setBaseElements(prev => {
            const next = { ...prev };
            Object.keys(delta || {}).forEach((key) => {
                const k = key as ElementType;
                if (delta[k]) {
                    next[k] = Math.min(100, Math.max(5, next[k] + delta[k]!));
                }
            });

            if (resetTarget) {
                // Find active element (the one over 85)
                Object.keys(next || {}).forEach((key) => {
                    const k = key as ElementType;
                    if (next[k] > 85) {
                        next[k] = 65;
                    }
                });
            }

            if (allowPersistence) {
                localStorage.setItem(KEY_SAVED_ENERGY, JSON.stringify({
                    date: formatLocalDateKey(),
                    levels: next
                }));
            }

            return next;
        });
    };

    const handleEquipCheat = (card: CheatCard) => {
        let newActiveCheats = [...activeCheats];
        if (card.type === 'environment') {
            newActiveCheats = newActiveCheats.filter(c => c.type !== 'environment');
        } else {
            newActiveCheats = newActiveCheats.filter(c => c.type === 'environment');
        }
        newActiveCheats.push(card);
        setActiveCheats(newActiveCheats);
        recalculateModifiers(newActiveCheats);
    };

    const handleUnequipCheat = (cardId: string) => {
        const newActiveCheats = activeCheats.filter(c => c.id !== cardId);
        setActiveCheats(newActiveCheats);
        recalculateModifiers(newActiveCheats);
    };

    const recalculateModifiers = (cheats: CheatCard[]) => {
        const mods: Partial<Record<ElementType, number>> = {};
        cheats.forEach(card => {
            Object.entries(card.effects || {}).forEach(([key, val]) => {
                const k = key as ElementType;
                mods[k] = (mods[k] || 0) + val;
            });
        });
        setCheatModifiers(mods);
    };

    const regenerateCheats = (currentLevels: Record<ElementType, number>, targetLang: string) => {
        const tempElements = ELEMENT_ORDER.map((type) => ({
            type,
            name: ELEMENT_NAMES_ZH[type] || '',
            trait: TRAITS_ZH[type] || '',
            description: INITIAL_DESCRIPTIONS_ZH[type] || '',
            percentage: currentLevels[type] || 50,
            color: COLORS[type],
            position: [0, 0, 0] as [number, number, number],
        }));

        runWithTimeout(generateCheatCards(tempElements, targetLang), SECONDARY_AI_TIMEOUT_MS, 'cheat cards').then(cheats => {
            if (getLifeBookLang(languageRef.current) !== targetLang) return;
            if (cheats && cheats.length > 0) {
                setGeneratedCheats(cheats);
                if (allowPersistence) {
                    localStorage.setItem(KEY_CHEATS, JSON.stringify(cheats));
                    localStorage.setItem(KEY_CHEAT_DATE, formatLocalDateKey());
                }
            }
        }).catch(e => console.log("Cheat Gen Error", e));
    };

    const handleRefreshCheats = () => {
        const tempLang = language === 'zh' ? 'zh' : 'en';
        regenerateCheats(baseElements, tempLang);
    };

    const handleNext = () => {
        setActiveIndex((curr) => (curr + 1) % ELEMENT_ORDER.length);
    };

    const handlePrev = () => {
        setActiveIndex((curr) => (curr - 1 + ELEMENT_ORDER.length) % ELEMENT_ORDER.length);
    };

    const handleSelect = (index: number) => {
        if (index === activeIndex) {
            setShowDetail(true);
        } else {
            setActiveIndex(index);
        }
    };

    // Initialize Elements from base elements and cheat modifiers
    useEffect(() => {
        const names = ELEMENT_NAMES_ZH;
        const traits = TRAITS_ZH;
        const descs = INITIAL_DESCRIPTIONS_ZH;

        const newElements = ELEMENT_ORDER.map((type) => {
            const modifier = cheatModifiers[type] || 0;
            const baseVal = baseElements[type] || 50;
            const finalVal = Math.min(100, Math.max(5, baseVal + modifier));

            return {
                type,
                name: names[type] || '',
                trait: traits[type] || '',
                description: descs[type] || '',
                percentage: finalVal,
                color: COLORS[type] || 'text-white',
                position: [0, 0, 0] as [number, number, number],
            };
        });
        setElements(newElements);
    }, [baseElements, cheatModifiers, language]);

    // Restore or initialize elements and life book. Heavy AI generation is deferred so the
    // Smooth Sailing page stays immediately interactive on iOS WebView.
    useEffect(() => {
        let cancelled = false;
        let cheatsTimer: number | null = null;

        const profileData = userProfile ? {
            name: userProfile.name,
            birthDate: parseLocalDate(userProfile.birthDate),
            birthTime: userProfile.birthTime || "12:00",
            location: userProfile.birthPlace || "未知",
            gender: ((userProfile.gender as any) === 'secret' ? 'neutral' : userProfile.gender) as 'male' | 'female' | 'neutral',
        } : {
            name: "旅行者",
            birthDate: parseLocalDate("2000-01-01"),
            birthTime: "12:00",
            location: "宇宙",
            gender: "neutral" as const
        };

        const todayStr = formatLocalDateKey();
        let levels = getDailyEnergyLevels(profileData);
        const savedEnergyJson = allowPersistence ? localStorage.getItem(KEY_SAVED_ENERGY) : null;

        if (savedEnergyJson) {
            try {
                const savedEnergy = JSON.parse(savedEnergyJson);
                if (savedEnergy.date === todayStr && savedEnergy.levels) {
                    levels = savedEnergy.levels;
                }
            } catch (e) { console.warn("Restore energy failed"); }
        }

        const astro = calculateAstrologyData(profileData);
        setBaseElements(levels);
        setAstrologyData(astro);

        // Restore Book
        const storedBook = allowPersistence ? localStorage.getItem(KEY_LIFE_BOOK) : null;
        const activeLang = getLifeBookLang(language);
        let parsedBookSuccess = false;
        if (storedBook && storedBook !== 'undefined' && storedBook !== 'null') {
            try {
                setLifeBookData(JSON.parse(storedBook));
                parsedBookSuccess = true;
            } catch (e) {
                console.warn("Failed to parse storedBook:", e);
            }
        }
        
        if (!parsedBookSuccess) {
            generateLifeBook(profileData, activeLang, true).then(staticBook => {
                if (!cancelled && getLifeBookLang(languageRef.current) === activeLang) setLifeBookData(staticBook);
            }).catch(e => console.log("Static Book Gen Error", e));

            if (deferredBookTimerRef.current !== null) {
                window.clearTimeout(deferredBookTimerRef.current);
            }

            deferredBookTimerRef.current = window.setTimeout(() => {
                void runWithTimeout(generateLifeBook(profileData, activeLang, false), FORTUNE_TIMEOUT_MS, 'life book').then(book => {
                    if (cancelled || getLifeBookLang(languageRef.current) !== activeLang) return;
                    setLifeBookData(book);
                    if (allowPersistence) {
                        localStorage.setItem(KEY_LIFE_BOOK, JSON.stringify(book));
                    }
                }).catch(e => console.log("Book Gen Error", e));
            }, 520);
        }

        // Restore Cheats
        const storedCheats = allowPersistence ? localStorage.getItem(KEY_CHEATS) : null;
        const storedDate = allowPersistence ? localStorage.getItem(KEY_CHEAT_DATE) : null;
        let parsedCheatsSuccess = false;
        if (storedCheats && storedCheats !== 'undefined' && storedCheats !== 'null' && storedDate === todayStr) {
            try {
                setGeneratedCheats(JSON.parse(storedCheats));
                parsedCheatsSuccess = true;
            } catch (e) {
                console.warn("Failed to parse storedCheats:", e);
            }
        }
        
        if (!parsedCheatsSuccess) {
            setGeneratedCheats(getFallbackCheats(activeLang));
            cheatsTimer = window.setTimeout(() => {
                if (!cancelled) regenerateCheats(levels, activeLang);
            }, 620);
        }

        return () => {
            cancelled = true;
            if (cheatsTimer !== null) {
                window.clearTimeout(cheatsTimer);
            }
            if (deferredBookTimerRef.current !== null) {
                window.clearTimeout(deferredBookTimerRef.current);
                deferredBookTimerRef.current = null;
            }
        };
    }, [userProfile, language, allowPersistence]);

    const handleTutorialComplete = () => {
        setShowTutorial(false);
        localStorage.setItem('has_seen_tutorial_v1', 'true');
    };

    const enrichUserProfile = async (basicProfile: UserProfile) => {
        setIsEnrichingProfile(true);
        try {
            // Fetch cosmic details in background
            const analysis = await analyzeUserProfile(basicProfile, language);
            const fullProfile = { ...basicProfile, ...analysis };

            setUserProfile(fullProfile);
            if (allowPersistence) {
                localStorage.setItem('user_profile_v1', JSON.stringify(fullProfile));
            }

            // Add welcome message only after we have the signature
            addAiMessage(`欢迎你，${fullProfile.name}。核心能量推演为【${fullProfile.energySignature || '推演中...'}】。${fullProfile.advice || ''}`);
        } catch (e) {
            console.error("Profile enrichment failed", e);
        } finally {
            setIsEnrichingProfile(false);
        }
    };

    const calibrateFortune = async (profile: UserProfile, requestKey = getSmoothProfileKey(profile, language)) => {
        // Don't calibrate for guest/traveler if not needed, or do it anyway
        if (profile.name === 'Traveler') return;

        const runId = ++calibrationRunRef.current;
        const isCurrentRun = () => calibrationRunRef.current === runId && calibrationKeyRef.current === requestKey;

        // Fetch providence in background or from cache
        window.setTimeout(() => {
            if (isCurrentRun()) void fetchProvidenceData(profile);
        }, 80);

        // Check cache first
        const todayStr = formatLocalDateKey();
        const cacheKey = `smooth_sailing_data_${profile.name}_${todayStr}`;
        const cached = allowPersistence ? localStorage.getItem(cacheKey) : null;
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                setDayData(parsed.dayData);
                setRelationshipCandidates(parsed.relationshipCandidates);
                setCurrentTone(parsed.currentTone);
                
                // Still fetch weather in background
                window.setTimeout(() => {
                    if (isCurrentRun()) void handleFutureWeatherChange('7d', profile);
                }, 120);
                return;
            } catch (e) {
                console.error("Failed to parse cached smooth sailing data", e);
            }
        }

        setIsCalibrating(true);

        // PARALLEL EXECUTION: Fire Weather Fetch immediately
        window.setTimeout(() => {
            if (isCurrentRun()) void handleFutureWeatherChange('7d', profile);
        }, 120);

        // 1. Fetch Daily Fortune
        try {
            const aiResult = await runWithTimeout(generateDailyFortune(profile, language), FORTUNE_TIMEOUT_MS, 'daily fortune');
            if (!isCurrentRun()) return;

            // 2. Fetch Morning Modules (Risk & Sniper)
            // Uses data from the first AI result (score, lucky element etc) for context
            const morningData = await runWithTimeout(
                generateMorningRiskAndSniper(
                    profile,
                    aiResult.overview.score,
                    aiResult.overview.window_tags[0] || "14:00-16:00", // Fallback if no window
                    aiResult.overview.lucky_direction,
                    aiResult.overview.lucky_color || "Water", // Fallback
                    language
                ),
                SECONDARY_AI_TIMEOUT_MS,
                'morning modules'
            );
            if (!isCurrentRun()) return;

            if (aiResult && aiResult.segments.length === 24) {
                const newDayData = {
                    ...dayData, // Need to be careful with prev state here, but we'll use base dayData
                    isMock: false, // Mark as real AI data
                    segments: aiResult.segments,
                    summary: aiResult.overview?.summary || dayData.summary,
                    winScore: aiResult.overview?.score || dayData.winScore,
                    dailyOverview: aiResult.overview,
                    modeLabel: aiResult.overview?.level === 'ROCKET' ? t('status.level.rocket.title') : aiResult.overview?.level === 'STABLE' ? t('status.level.stable.title') : aiResult.overview?.level === 'AVOID' ? t('status.level.avoid.title') : t('status.level.neutral.title'),

                    // New Modules Data
                    morningRisk: morningData.morningRisk,
                    timeSniper: morningData.timeSniper,

                    suitableActions: aiResult.overview?.recommended_actions?.map((a: any, i: number) => ({
                        id: `ai-action-${i}`,
                        label: a.label,
                        type: a.type
                    })) || dayData.suitableActions,

                    destress: aiResult.overview?.destress_guide?.items ? {
                        active: true,
                        bullets: aiResult.overview.destress_guide.items
                    } : dayData.destress,

                    mainWindow: {
                        ...dayData.mainWindow,
                        start: String(aiResult.segments.find((s: any) => s.type === 'good')?.hour || 10).padStart(2, '0') + ":00",
                        end: String((aiResult.segments.find((s: any) => s.type === 'good')?.hour || 10) + 2).padStart(2, '0') + ":00",
                        score: Math.max(...aiResult.segments.map((s: any) => s.score)),
                        description: t('window.ai'),
                        tags: aiResult.overview?.window_tags || dayData.mainWindow.tags,
                        advice: aiResult.overview?.strategy_guide?.main_quote || dayData.mainWindow.advice
                    }
                };

                setDayData(newDayData);

                let newCandidates = relationshipCandidates;
                if (aiResult.overview?.daily_relationships && aiResult.overview.daily_relationships.length > 0) {
                    newCandidates = aiResult.overview.daily_relationships;
                    setRelationshipCandidates(newCandidates);
                }

                let newTone = currentTone;
                if (aiResult.overview?.strategy_guide) {
                    newTone = aiResult.overview.strategy_guide.recommended_tone;
                    setCurrentTone(newTone);
                }
                
                // Cache the result
                if (allowPersistence) {
                    localStorage.setItem(cacheKey, JSON.stringify({
                        dayData: newDayData,
                        relationshipCandidates: newCandidates,
                        currentTone: newTone
                    }));
                }

                // Force refresh providence to make sure it's fully calibrated
                window.setTimeout(() => {
                    if (isCurrentRun()) void fetchProvidenceData(profile, true);
                }, 180);
            }
        } catch (e) {
            console.error("Calibration failed", e);
        } finally {
            if (isCurrentRun()) {
                setIsCalibrating(false);
            }
        }
    };

    const fetchProvidenceData = async (profile: UserProfile, forceRefresh = false) => {
        if (!profile || profile.name === 'Traveler') return;
        const runId = ++providenceRunRef.current;
        const isCurrentRun = () => providenceRunRef.current === runId;
        setIsProvidenceLoading(true);
        const today = new Date().toDateString();
        const CACHE_KEY = 'providence_data_cache';

        if (!forceRefresh) {
            const cachedString = allowPersistence ? localStorage.getItem(CACHE_KEY) : null;
            if (cachedString) {
                try {
                    const cached = JSON.parse(cachedString);
                    if (cached.date === today && cached.userName === profile.name) {
                        setProvidenceData(cached.data);
                        if (isCurrentRun()) setIsProvidenceLoading(false);
                        return;
                    }
                } catch (e) {
                    console.error("Failed to parse cached Providence data", e);
                }
            }
        }

        try {
            const result = await runWithTimeout(generateProvidence(profile as any), FORTUNE_TIMEOUT_MS, 'providence');
            if (!isCurrentRun()) return;
            setProvidenceData(result);
            if (allowPersistence) {
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    date: today,
                    userName: profile.name,
                    data: result
                }));
            }
        } catch (error) {
            console.error("Failed to fetch Providence data:", error);
        } finally {
            if (isCurrentRun()) setIsProvidenceLoading(false);
        }
    };

    useEffect(() => {
        if (sailingTab === 'providence' && !providenceData && !isProvidenceLoading && userProfile && userProfile.name && userProfile.name !== 'Traveler') {
            fetchProvidenceData(userProfile);
        }
    }, [sailingTab, providenceData, isProvidenceLoading, userProfile]);

    const handleFutureWeatherChange = async (range: '7d' | '30d', profileOverride?: UserProfile) => {
        const profile = profileOverride || userProfile;
        if (!profile) return;

        const runId = ++futureWeatherRunRef.current;
        const isCurrentRun = () => futureWeatherRunRef.current === runId;
        setIsFutureLoading(true);
        // Immediately set range to UI for feedback while loading
        setFutureWeather(prev => ({ ...prev, range }));

        try {
            const weather = await runWithTimeout(generateFutureWeatherAI(profile, range), SECONDARY_AI_TIMEOUT_MS, 'future weather');
            if (!isCurrentRun()) return;
            setFutureWeather(weather);
        } catch (e) {
            console.error(e);
        } finally {
            if (isCurrentRun()) setIsFutureLoading(false);
        }
    };

    const handleOnboardingComplete = (profile: UserProfile) => {
        setUserProfile(profile);
        if (allowPersistence) {
            localStorage.setItem('user_profile_v1', JSON.stringify(profile));
        }
        setOnboardingDone(true);

        enrichUserProfile(profile);
        const nextKey = getSmoothProfileKey(profile, language);
        calibrationKeyRef.current = nextKey;
        void calibrateFortune(profile, nextKey);
    };

    const handleSkipOnboarding = () => {
        const guestProfile: UserProfile = {
            name: 'Traveler',
            birthDate: '',
            birthTime: '',
            birthPlace: '',
            gender: 'other',
            onboardedAt: Date.now()
        };
        setUserProfile(guestProfile);
        if (allowPersistence) {
            localStorage.setItem('user_profile_v1', JSON.stringify(guestProfile));
        }
        setOnboardingDone(true);
    };

    // Interaction Handlers
    const addAiMessage = (text: string, quickReplies?: string[]) => {
        const msg: Message = {
            id: Date.now().toString(),
            role: 'ai',
            text,
            quickReplies,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, msg]);
    };

    const addUserMessage = (text: string) => {
        const msg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, msg]);

        setTimeout(() => {
            if (text.includes('搞钱') || text.includes('沟通')) {
                addAiMessage(t('ai.reply.window').replace('{action}', '沟通 / 锁试单'), ['还有其他要注意的吗？', '开始执行']);
            } else if (text.includes('状态很差')) {
                addAiMessage('抱歉听到这个。那我们今天调整为【休整模式】，主要避坑，不做大决策。', ['看下避坑指南', '好的']);
            } else {
                addAiMessage('好的，我已经根据这个调整了你的雷达参数。还有什么想问的？');
            }
        }, 800);
    };

    const handleActionSelect = (action: ActionChip) => {
        addAiMessage(t('ai.reply.window').replace('{action}', action.label));
    };

    const handleToneChange = (tone: StrategyTone) => {
        setCurrentTone(tone);
        const labels: Record<string, string> = { steady: t('tone.steady'), direct: t('tone.direct'), smooth: t('tone.smooth') };
        addAiMessage(t('ai.reply.tone').replace('{tone}', labels[tone] || tone));
    };

    // --- CONNECTED LOGIC: Needs Input -> Dashboard ---
    const handleNeedsSelect = async (tag: string) => {
        if (!tag.trim()) return;

        setSelectedNeed(tag);
        setIsAnalyzingGoal(true);
        try {
            const metrics = await analyzeGoalWithAI(
                tag,
                userProfile,
                dayData.dailyOverview ? {
                    summary: dayData.dailyOverview.summary,
                    level: dayData.dailyOverview.level
                } : undefined,
                language
            );
            setDashboardMetrics(metrics);
            addAiMessage(t('ai.reply.goal').replace('{goal}', tag).replace('{summary}', metrics.summary));
        } catch (e) {
            console.error(e);
            addAiMessage(t('ai.reply.fail').replace('{tag}', tag));
        } finally {
            setIsAnalyzingGoal(false);
        }
    };

    // --- CONNECTED LOGIC: Window Actions ---
    const handleWindowAction = async (type: 'set' | 'tips') => {
        const currentGoal = selectedNeed || '通用目标';
        const windowTime = `${dayData.mainWindow.start}-${dayData.mainWindow.end}`;

        const dayContext = dayData.dailyOverview ? {
            summary: dayData.dailyOverview.summary,
            level: dayData.dailyOverview.level
        } : undefined;

        if (type === 'tips') {
            setStrategySheetOpen(true);
            setIsStrategyLoading(true);
            try {
                const kit = await getStrategyKitAI(currentGoal, windowTime, userProfile, dayContext, language);
                setStrategyData(kit);
            } catch (e) { console.error(e); } finally { setIsStrategyLoading(false); }
        }

        if (type === 'set') {
            setActionPlanOpen(true);
            setIsActionPlanLoading(true);
            try {
                const plan = await generateActionPlanAI(currentGoal, userProfile, dayContext, language);
                setActionPlanData(plan);
            } catch (e) { console.error(e); } finally { setIsActionPlanLoading(false); }
        }
    };

    // --- Relationship Handlers ---
    const handleGenerateOpening = (id: string, text: string) => {
        const person = relationshipCandidates.find(p => p.id === id);
        if (person) {
            addAiMessage(`给【${person.name}】的开场白建议：\n\n"${text}"`, ['复制文案', '换一种语气']);
        }
    };

    const handleDeferContact = (id: string) => {
        const person = relationshipCandidates.find(p => p.id === id);
        setRelationshipCandidates(prev => prev.filter(p => p.id !== id));
        if (person) {
            addAiMessage(`好，${person.name}今天先暂停，我会优先帮你排其他关系。`);
        }
    };

    const handleRefreshCandidates = async () => {
        setIsRefreshingCandidates(true);
        try {
            const dayContext = dayData.dailyOverview ? {
                summary: dayData.dailyOverview.summary,
                level: dayData.dailyOverview.level
            } : undefined;

            const newCandidates = await refreshRelationshipCandidatesAI(userProfile, dayContext, language);
            setRelationshipCandidates(newCandidates);
            addAiMessage('已根据今天的运势风向，为你更新了 3 位最值得联系的人。');
        } catch (e) {
            console.error("Refresh failed", e);
        } finally {
            setIsRefreshingCandidates(false);
        }
    };

    // --- Resistance Map Handlers ---
    const handleSelectAlternative = (route: AlternativeRoute) => {
        setResistanceMapOpen(false);
        addAiMessage(`已切换到【${route.label}】。这招妙在“${route.highlights[0]}”，我已经把后续的任务流更新了。`, ['查看更新后的任务']);
    };

    return (
        // Root: Relative + Min Height to allow native scrolling
        <div className="relative min-h-screen bg-[#0f172a] selection:bg-emerald-500/30 animate-fade-in smooth-scroll">
            
            {/* --- Calibration Background Indicator (Non-blocking) --- */}
            {(isCalibrating || isEnrichingProfile) && (
                <div className="fixed top-4 right-4 z-[90] flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/5 animate-fade-in pointer-events-none">
                    <Loader2 size={12} className="text-emerald-400 animate-spin" />
                    <span className="text-[10px] text-emerald-400/80 font-medium">
                        {isEnrichingProfile ? "AI 正在分析命盘..." : "AI 正在校准今日数据..."}
                    </span>
                </div>
            )}

            {/* --- TUTORIAL OVERLAY (Removed as requested) --- */}

            {/* --- BACK BUTTON (Integration) --- */}
            {onBack && (
                <button
                    onClick={onBack}
                    className="fixed top-5 left-4 z-[90] w-9 h-9 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white/70 hover:text-white hover:bg-white/10 active:scale-95 select-none transition-all duration-200 ease-out"
                    style={{ marginTop: 'env(safe-area-inset-top)' }}
                >
                    <ArrowLeft size={18} />
                </button>
            )}

            <LanguageSwitcher className={onBack ? "fixed top-16 left-4" : undefined} />

            {/* --- Layer 0: Background (Fixed) --- */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                {/* Brighter Orbs for Depth */}
                <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[100px] opacity-70" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] opacity-60" />
                <div className="absolute inset-0 opacity-30 texture-noise" />
            </div>

            {/* --- Layer 1: Content (Natural Flow) --- */}
            <div className="relative z-10 w-full min-h-[80vh] pb-32">
                
                {/* Content Wrapper */}
                <div className="w-full max-w-[420px] mx-auto px-4 pt-6 md:pt-10 pb-4 flex flex-col gap-4 items-center">

                    {/* Segmented Control: 0s-understanding design */}
                    <div className="w-full grid grid-cols-2 p-1 bg-black/40 backdrop-blur-3xl border border-white/5 rounded-2xl shadow-inner">
                        <button
                            onClick={() => {
                                setSailingTab('time_window');
                                window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
                            }}
                            className={`py-2.5 px-3 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 select-none ${
                                sailingTab === 'time_window'
                                    ? 'bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/5 border border-emerald-500/10 text-emerald-300 shadow-[0_4px_12px_rgba(16,185,129,0.08)]'
                                    : 'text-white/40 hover:text-white/60 border border-transparent'
                            }`}
                        >
                            <Clock size={13} className={sailingTab === 'time_window' ? 'text-emerald-400' : ''} />
                            <span>今日顺风时辰窗</span>
                        </button>
                        <button
                            onClick={() => {
                                setSailingTab('providence');
                                window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
                            }}
                            className={`py-2.5 px-3 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 select-none relative ${
                                sailingTab === 'providence'
                                    ? 'bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-indigo-500/5 border border-indigo-500/10 text-indigo-300 shadow-[0_4px_12px_rgba(99,102,241,0.08)]'
                                    : 'text-white/40 hover:text-white/60 border border-transparent'
                            }`}
                        >
                            <Zap size={13} className={sailingTab === 'providence' ? 'text-indigo-400 animate-pulse' : ''} />
                            <span>高维天命能量</span>
                            {!providenceData && (
                                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                            )}
                        </button>
                    </div>

                    <div className="relative w-full">
                        <div className="w-full flex flex-col gap-4 items-center">
                            {/* 今日顺风时辰窗 VIEW */}
                            <div className={`${sailingTab === 'time_window' ? 'flex' : 'hidden'} w-full flex-col gap-6 items-center animate-fade-in`}>
                                {/* Radar Component */}
                                <TopTimeRadar
                                    data={dayData}
                                    onHourSelect={(seg) => {
                                        setSelectedSegment(seg);
                                        addAiMessage(`这段时间（${seg.hour}:00），天时评分 ${seg.score}，判定为“${seg.description}”。`);
                                    }}
                                    selectedHour={selectedSegment?.hour}
                                />

                                {/* Decision Panel Modules */}
                                <div className="w-full flex flex-col gap-4 animate-slide-up-fade text-left" style={{ animationDelay: '0.1s' }}>

                                    {/* Global Summary Bar (Clickable) - Moved before modules as requested */}
                                    <SummaryBar
                                        topMessage={dayData.summary}
                                        onClick={() => setStatusSheetOpen(true)}
                                    />

                                    {/* === NEW MODULES: Morning Risk & Time Sniper === */}
                                    {dayData.morningRisk && <MorningRiskCard data={dayData.morningRisk} />}
                                    {dayData.timeSniper && (
                                        <PremiumMosaicWrapper isPremium={isPremium} onRequirePremium={onRequirePremium} label="时辰狙击">
                                            <TimeSniperCard data={dayData.timeSniper} />
                                        </PremiumMosaicWrapper>
                                    )}

                                    {/* Module 1: Actions */}
                                    <SuitableActionsCard actions={dayData.suitableActions} onSelect={handleActionSelect} />

                                    {/* Module 2: Strategy Tone (AI Personalized) */}
                                    <PremiumMosaicWrapper isPremium={isPremium} onRequirePremium={onRequirePremium} label="专属破局锦囊">
                                        <StrategyToneCard
                                            currentTone={currentTone}
                                            onToneChange={handleToneChange}
                                            aiStrategyQuote={currentTone === dayData.dailyOverview?.strategy_guide?.recommended_tone ? dayData.dailyOverview?.strategy_guide?.main_quote : undefined}
                                        />
                                    </PremiumMosaicWrapper>

                                    {/* Module 3: Needs Input (LINKED TO DASHBOARD) */}
                                    <NeedsInputCard
                                        onTagSelect={handleNeedsSelect}
                                        selectedTag={selectedNeed}
                                        isLoading={isAnalyzingGoal}
                                        customTags={isStudent ? NEEDS_TAGS_STUDENT : NEEDS_TAGS_PRO}
                                    />

                                    {/* Module 4: Dashboards (UPDATED BY NEEDS) */}
                                    <DashboardsCard
                                        metrics={dashboardMetrics}
                                        isLoading={isAnalyzingGoal}
                                    />

                                    {/* Module 5: Windows (TRIGGERS SHEETS) */}
                                    <WindowList
                                        window={dayData.mainWindow}
                                        onAction={handleWindowAction}
                                        isProcessing={isStrategyLoading || isActionPlanLoading}
                                    />

                                    {/* Module 9: Resistance Map Entry */}
                                    <ResistanceMapEntryCard onOpen={() => setResistanceMapOpen(true)} />

                                    {/* Module 8: Relationship Radar */}
                                    <PremiumMosaicWrapper isPremium={isPremium} onRequirePremium={onRequirePremium} label="人脉风阻雷达">
                                        <RelationshipRadarCard
                                            candidates={relationshipCandidates}
                                            onGenerateOpening={handleGenerateOpening}
                                            onDefer={handleDeferContact}
                                            onRefresh={handleRefreshCandidates}
                                            isRefreshing={isRefreshingCandidates}
                                            context={{
                                                wind: dashboardMetrics.windDirection.label,
                                                control: dashboardMetrics.control.label
                                            }}
                                        />
                                    </PremiumMosaicWrapper>

                                    {/* Module 6: Destress */}
                                    <DestressCard data={dayData.destress} />

                                    {/* Module 7: Future (Updated) */}
                                    <PremiumMosaicWrapper isPremium={isPremium} onRequirePremium={onRequirePremium} label="中线运势推演">
                                        <FutureWeatherCard
                                            future={futureWeather}
                                            onRangeChange={(r) => handleFutureWeatherChange(r)}
                                            isLoading={isFutureLoading}
                                        />
                                    </PremiumMosaicWrapper>

                                </div>
                            </div>

                            {/* 高维天命能量 VIEW */}
                            <div className={`${sailingTab === 'providence' ? 'flex' : 'hidden'} w-full flex-col gap-4 animate-fade-in pt-2 text-left`}>
                                {isProvidenceLoading && !providenceData ? (
                                    <div className="w-full py-20 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
                                        <div className="relative w-16 h-16">
                                            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-white/80">天命核心引擎解耦中...</p>
                                            <p className="text-xs text-white/40 mt-1 font-mono uppercase tracking-widest">Scanning High-Dim Matrices</p>
                                        </div>
                                    </div>
                                ) : providenceData ? (
                                        <div className="w-full flex flex-col xl:grid xl:grid-cols-12 gap-8 items-start">
                                            
                                            {/* LEFT PRIMARY CELL: Celestial Orbiter & Energy Tuning Console (7 cols) */}
                                            <div className="xl:col-span-7 flex flex-col gap-6 w-full">
                                                
                                                {/* 1. THE CELESTIAL ENGINE (天玄造化星仪) */}
                                                {elements && elements.length > 0 && (
                                                    <div className="relative w-full h-[540px] rounded-[32px] overflow-hidden border border-white/10 bg-[#040404] shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_0_80px_rgba(0,0,0,0.95)] flex flex-col group/orbiter">
                                                        
                                                        <div 
                                                            className="absolute inset-0 z-0 pointer-events-auto"
                                                            style={{ touchAction: 'pan-y' }}
                                                            onPointerDown={(e) => { handleDragStart(e.clientX, e.clientY); }}
                                                            onPointerMove={(e) => {
                                                                if (handleDragMove(e.clientX, e.clientY)) {
                                                                    e.preventDefault();
                                                                }
                                                            }}
                                                            onPointerUp={(e) => {
                                                                if (handleDragEnd()) {
                                                                    e.preventDefault();
                                                                }
                                                            }}
                                                            onPointerCancel={() => { handleDragEnd(); }}
                                                            onPointerLeave={() => { handleDragEnd(); }}
                                                        >
                                                            <Suspense fallback={
                                                                <div className="absolute inset-0 flex items-center justify-center text-white/40 text-xs font-mono uppercase tracking-[0.2em] animate-pulse bg-slate-950/20">
                                                                    Loading 3D Orbit Matrix...
                                                                </div>
                                                            }>
                                                                {isProvidenceSceneReady ? (
                                                                    <ElementsScene
                                                                        elements={elements}
                                                                        activeIndex={activeIndex}
                                                                        dragOffset={dragOffset}
                                                                        onSelect={handleSelect}
                                                                    />
                                                                ) : (
                                                                    <div className="absolute inset-0 flex items-center justify-center text-white/40 text-xs font-mono uppercase tracking-[0.2em] animate-pulse bg-slate-950/20">
                                                                        Loading 3D Orbit Matrix...
                                                                    </div>
                                                                )}
                                                            </Suspense>
                                                        </div>

                                                        <div className="absolute inset-0 z-10 pointer-events-none">
                                                            <Dashboard
                                                                activeElement={elements[activeIndex]}
                                                                onNext={handleNext}
                                                                onPrev={handlePrev}
                                                                showDetail={showDetail}
                                                                onOpenDetail={() => setShowDetail(true)}
                                                                onCloseDetail={() => setShowDetail(false)}
                                                                onOpenCheatSheet={() => {}}
                                                                activeCheats={activeCheats}
                                                                onUnequipCheat={handleUnequipCheat}
                                                                astrologyData={astrologyData}
                                                                onUpdateEnergy={handleUpdateEnergy}
                                                                userName={userProfile?.name}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 2. THE ATTUNEMENT CONTROLLER (生克穿戴补益 & 系统外挂卡盒) */}
                                                {elements && elements.length > 0 && (
                                                    <div className="w-full relative z-20">
                                                        <AetherTuningDeck 
                                                            baseElements={baseElements}
                                                            handleUpdateEnergy={handleUpdateEnergy}
                                                            astrologyData={astrologyData}
                                                            generatedCheats={generatedCheats}
                                                            activeCheats={activeCheats}
                                                            handleEquipCheat={handleEquipCheat}
                                                            handleUnequipCheat={handleUnequipCheat}
                                                            handleRefreshCheats={handleRefreshCheats}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* RIGHT SIDE CELL: Directives Vector, Anomaly Recovery & Navigation Radar (5 cols) */}
                                            <div className="xl:col-span-5 flex flex-col gap-6 w-full h-full">
                                                
                                                {/* 1. TODAY'S CELESTIAL DIRECTIVE (今日天命绝对主线) */}
                                                <AbsoluteMissionCard main_mission={providenceData.main_mission} />

                                                {/* 2. SANCTUARY & NOBLEMAN MAGNETIC ALIGNER (避守策略与人际引力雷达) */}
                                                <PremiumMosaicWrapper isPremium={isPremium} onRequirePremium={onRequirePremium} label="人场高定罗盘">
                                                    <TacticalRadarCard 
                                                        tactical_radar={providenceData.tactical_radar}
                                                        sanctuary_radar={providenceData.sanctuary_radar}
                                                        nobleman_magnet={providenceData.nobleman_magnet}
                                                    />
                                                </PremiumMosaicWrapper>

                                                {/* 3. COGNITIVE ANOMALY REBOOT (因果修正与急救重构) */}
                                                {userProfile && (
                                                    <PremiumMosaicWrapper isPremium={isPremium} onRequirePremium={onRequirePremium} label="因果急救重构">
                                                        <KarmaResetCard userProfile={userProfile} />
                                                    </PremiumMosaicWrapper>
                                                )}
                                            </div>

                                            {/* FULL SPAN BOTTOM LAYER: Holographic Diagnostics & Operating System Console (12 cols) */}
                                            <div className="xl:col-span-12 w-full mt-4 flex flex-col gap-6">
                                                
                                                {/* BIO-ENERGY WAVEFORM MATRIX (天医生物阳场磁力诊断) */}
                                                <EnergyScanCard energy_system={providenceData.energy_system} />

                                                {/* COSMIC KERNEL COMPILER OUTPUT (玄天底层核心算子编译日志) */}
                                                <TerminalLogModule markdown={providenceData.logs || providenceData.fate_log_markdown} />
                                            </div>
                                        </div>
                                ) : (
                                    <div className="w-full py-16 text-center text-white/40 text-xs">
                                        暂无天命能量数据，请先激活个人中心信息
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>



            {/* --- Layer 2: Floating UI Elements (Fixed on top) --- */}

            {/* Sheets - Z-Index 60/70/80 */}
            <StatusDetailSheet
                isOpen={isStatusSheetOpen}
                onClose={() => setStatusSheetOpen(false)}
                overview={dayData.dailyOverview}
                userProfile={userProfile}
            />

            <ResistanceMapSheet
                isOpen={isResistanceMapOpen}
                onClose={() => setResistanceMapOpen(false)}
                onSelectAlternative={handleSelectAlternative}
                userProfile={userProfile}
                dailyOverview={dayData.dailyOverview}
            />

            <StrategySheet
                isOpen={isStrategySheetOpen}
                onClose={() => setStrategySheetOpen(false)}
                data={strategyData}
                isLoading={isStrategyLoading}
            />

            <ActionPlanSheet
                isOpen={isActionPlanOpen}
                onClose={() => setActionPlanOpen(false)}
                data={actionPlanData}
                isLoading={isActionPlanLoading}
            />

            <InfoSheet
                segment={selectedSegment}
                onClose={() => setSelectedSegment(null)}
            />



        </div>
    );
};

const App: React.FC<AppProps> = ({ onBack, userProfile, isPremium, onRequirePremium, allowPersistence }) => (
    <LanguageProvider>
        <I18nProvider>
            <AppContent
                onBack={onBack}
                userProfile={userProfile}
                isPremium={isPremium}
                onRequirePremium={onRequirePremium}
                allowPersistence={allowPersistence}
            />
        </I18nProvider>
    </LanguageProvider>
);

export default App;
