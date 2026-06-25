

import React, { useState, useEffect } from 'react';
import { Shirt, Sparkles } from 'lucide-react';
import { ElementType, InventoryItem, DailyRecommendation } from '../types';
import { getDailyRecommendation, generateItem, getRandomTagForElement, translateItem, translateRecommendation } from '../utils/inventoryEngine';
import { useI18n } from '../utils/i18nContext';
import { formatLocalDateKey } from '../utils/astrologyEngine';

interface InstantInventoryProps {
    energyLevels: Record<ElementType, number>;
    onUpdateEnergy: (delta: Partial<Record<ElementType, number>>) => void;
    isInvalidUser?: boolean; // New prop for error handling
}

// --- STORAGE KEYS ---
const KEY_INV_OUTFIT = 'wuxing_inventory_outfit';
const KEY_INV_FOOD = 'wuxing_inventory_food';
const KEY_INV_DATE = 'wuxing_inventory_date';

// --- HELPER: ROBUST COLOR THEME RESOLVER ---
// Determines the dominant element/theme of an item based on its tags and effects
const getItemTheme = (item: InventoryItem) => {
    // 1. Try to deduce from tags string content (Chinese)
    const tag = (item.tags?.[0] || '').toLowerCase();
    
    // Check specific keywords map
    if (['绿', '青', '酸', '木', '葱', '蔬'].some(k => tag.includes(k))) return ElementType.Wood;
    if (['红', '紫', '辣', '火', '粉', '橙'].some(k => tag.includes(k))) return ElementType.Fire;
    if (['黄', '褐', '甜', '土', '驼', '米'].some(k => tag.includes(k))) return ElementType.Earth;
    if (['白', '金', '银', '脆', '灰', '铁'].some(k => tag.includes(k))) return ElementType.Metal;
    if (['黑', '蓝', '咸', '水', '墨', '深'].some(k => tag.includes(k))) return ElementType.Water;

    // 2. Fallback: Deduce from the highest positive effect value
    let maxVal = -Infinity;
    let dominant: ElementType = ElementType.Metal;
    
    // GUARD: Ensure effects exist
    if (item.effects) {
        Object.entries(item.effects).forEach(([key, val]) => {
            if ((val as number) > maxVal) {
                maxVal = val as number;
                dominant = key as ElementType;
            }
        });
    }
    
    return dominant;
};

// --- UI COMPONENTS ---

const RarityTag: React.FC<{ rarity: string }> = ({ rarity }) => {
    const style = rarity === 'SSR' ? 'text-yellow-400 border-yellow-500/50 bg-yellow-400/10 shadow-[0_0_10px_rgba(250,204,21,0.2)]' : 
                  rarity === 'SR' ? 'text-purple-300 border-purple-400/50 bg-purple-400/10' : 
                  'text-emerald-400 border-emerald-400/50 bg-emerald-400/10';
    return (
        <span className={`px-2 py-0.5 border rounded-full text-[9px] font-black tracking-widest ${style}`}>
            {rarity}
        </span>
    );
};

const StatRow: React.FC<{ effects: Partial<Record<ElementType, number>> }> = ({ effects }) => {
    const cn: any = { Wood: '木', Fire: '火', Earth: '土', Metal: '金', Water: '水' };
    const colors: any = { Wood: 'text-emerald-400', Fire: 'text-orange-400', Earth: 'text-stone-300', Metal: 'text-yellow-300', Water: 'text-cyan-400' };
    
    return (
        <div className="flex gap-2 items-center">
            {Object.entries(effects || {}).map(([k, v]) => {
                 const isPositive = Number(v) > 0;
                 return (
                    <div key={k} className="flex flex-col items-center">
                        <div className={`flex items-center justify-center w-8 h-8 rounded border border-white/10 bg-black/40 backdrop-blur-sm ${isPositive ? colors[k] : 'text-rose-500'}`}>
                             <div className="flex flex-col items-center leading-none">
                                <span className="text-[8px] font-bold opacity-60">{cn[k]}</span>
                                <span className="text-xs font-black">{isPositive ? '+' : ''}{v}</span>
                             </div>
                        </div>
                    </div>
                 )
            })}
        </div>
    )
}

const StyleTagRow: React.FC<{ tags?: string[], onSelect: (tag: string) => void }> = ({ tags, onSelect }) => {
    if (!tags || tags.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-1.5 mt-2">
            {tags.map((tag) => (
                <button
                    key={tag}
                    onClick={() => onSelect(tag)}
                    className="px-2 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[8px] font-bold text-white/60 hover:text-white transition-all uppercase tracking-wider"
                >
                    {tag}
                </button>
            ))}
        </div>
    )
}

const CompactCard: React.FC<{ 
    item: InventoryItem; 
    onRegenerate: () => void;
    onStyleSelect: (tag: string) => void;
    equipped: boolean;
}> = ({ item, onRegenerate, onStyleSelect, equipped }) => {
    const { t } = useI18n();
    
    if (!item) return null;
    const themeElement = getItemTheme(item);

    // Theme Configuration
    const THEMES: Record<ElementType, { gradient: string, stroke: string, accent: string, textAccent: string, dotBg: string }> = {
        [ElementType.Wood]: { 
            gradient: 'from-[#064e3b] via-[#059669] to-[#34d399]', // Emerald
            stroke: '#34d399', 
            accent: 'text-emerald-300',
            textAccent: 'text-emerald-400',
            dotBg: 'bg-emerald-500'
        },
        [ElementType.Fire]: { 
            gradient: 'from-[#7f1d1d] via-[#dc2626] to-[#fb923c]', // Red to Orange
            stroke: '#fb923c', 
            accent: 'text-orange-300',
            textAccent: 'text-orange-400',
            dotBg: 'bg-orange-500'
        },
        [ElementType.Earth]: { 
            gradient: 'from-[#451a03] via-[#d97706] to-[#fcd34d]', // Brown to Amber
            stroke: '#fcd34d', 
            accent: 'text-amber-300',
            textAccent: 'text-amber-400',
            dotBg: 'bg-amber-500'
        },
        [ElementType.Metal]: { 
            gradient: 'from-[#27272a] via-[#52525b] to-[#d4d4d8]', // Zinc
            stroke: '#e4e4e7', 
            accent: 'text-slate-300',
            textAccent: 'text-slate-400',
            dotBg: 'bg-slate-400'
        },
        [ElementType.Water]: { 
            gradient: 'from-[#1e293b] via-[#0284c7] to-[#38bdf8]', // Sky
            stroke: '#38bdf8', 
            accent: 'text-sky-300',
            textAccent: 'text-sky-400',
            dotBg: 'bg-sky-500'
        }
    };

    const theme = THEMES[themeElement] || THEMES[ElementType.Metal];

    const getElementSymbol = (el: ElementType) => {
        const symbols: Record<ElementType, string> = {
            [ElementType.Wood]: '木 · WOOD',
            [ElementType.Fire]: '火 · FIRE',
            [ElementType.Earth]: '土 · EARTH',
            [ElementType.Metal]: '金 · METAL',
            [ElementType.Water]: '水 · WATER'
        };
        return symbols[el] || '元素';
    };

    return (
        <div className="relative w-full max-w-[340px] mx-auto group perspective-1000">
            
            {/* Ambient Glow matching Theme */}
            <div className={`absolute -inset-4 bg-gradient-to-r ${theme.gradient} opacity-20 blur-2xl rounded-[24px] pointer-events-none group-hover:opacity-30 transition-opacity duration-500`} />

            {/* Main Card with elegant glass backdrop */}
            <div className="relative bg-black/85 backdrop-blur-2xl border border-white/10 rounded-[24px] overflow-hidden shadow-2xl transition-all duration-300 group-hover:border-white/20">
                
                {/* Top Colored Segment Line */}
                <div className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${theme.gradient}`} />

                <div className="p-5 flex flex-col gap-4 relative z-10">
                    
                    {/* Header: Redesigned cleanly with no absolute overlaps */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-bold tracking-widest bg-white/5 border border-white/10 ${theme.textAccent}`}>
                                    <span className={`w-1 h-1 rounded-full ${theme.dotBg} animate-pulse`} />
                                    {getElementSymbol(themeElement)}
                                </span>
                                <span className="text-[9px] font-mono text-white/40 tracking-[0.1em] uppercase">
                                    {item.slot === 'outfit' ? '穿搭 · 推荐' : '美食 · 推荐'}
                                </span>
                            </div>
                            
                            <h3 
                                className="text-xl md:text-2xl font-bold text-white mt-1.5 leading-tight tracking-wide drop-shadow-md"
                            >
                                {item.name}
                            </h3>
                            
                            {item.slot === 'outfit' && (
                                <StyleTagRow tags={item.styleTags} onSelect={onStyleSelect} />
                            )}
                        </div>

                        {/* Geometric Glass/Wireframe Emoji Container with zero truncation */}
                        <div className="relative flex-shrink-0 w-12 h-12 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-center text-2xl shadow-inner group/sticker overflow-hidden">
                             <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-15`} />
                             <span className="relative z-10 transition-transform duration-300 group-hover/sticker:scale-110 filter drop-shadow-md pb-0.5">
                                 {item.sticker}
                             </span>
                        </div>
                    </div>

                    {/* Delivery recommendation if it is food */}
                    {item.slot === 'food' && (
                        <div className="w-full">
                            <div className="relative overflow-hidden bg-white/[0.01] border border-white/5 rounded-xl p-2.5 flex items-center justify-between group/delivery cursor-pointer hover:border-white/15 hover:bg-white/[0.03] transition-all duration-300 shadow-inner">
                                 <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                                     <div className="flex items-center gap-1.5">
                                         <div className="flex -space-x-1">
                                             <div className="w-3.5 h-3.5 rounded-full bg-[#FFC300] flex items-center justify-center text-[5px] text-black font-black border border-black z-10">美</div>
                                             <div className="w-3.5 h-3.5 rounded-full bg-[#0097FF] flex items-center justify-center text-[5px] text-white font-black border border-black z-0">饿</div>
                                         </div>
                                         <span className="text-[8px] font-mono font-bold text-white/35 tracking-wider uppercase">{t('inv_delivery_rec')}</span>
                                     </div>
                                     <div className="text-[10px] font-bold text-white mt-0.5 truncate pl-0.5">
                                         {`下单 ${item.name.split('·')[1]?.trim() || item.name} 犒劳自己`}
                                     </div>
                                 </div>
                                 <div className="w-6 h-6 rounded-md bg-white/5 border border-white/5 flex items-center justify-center group-hover/delivery:bg-white group-hover/delivery:text-black transition-all duration-300 text-white/30">
                                     <span className="text-[9px] transform group-hover/delivery:translate-x-0.5 transition-transform">➔</span>
                                 </div>
                            </div>
                        </div>
                    )}

                    {/* Visual Block */}
                    <div className="flex gap-2 h-20">
                        {/* Primary Box */}
                        <div className={`flex-[1.4] rounded-xl bg-gradient-to-br ${theme.gradient} bg-opacity-20 border border-white/10 p-3 flex flex-col justify-end relative overflow-hidden group-hover:brightness-110 transition-all`}>
                             <div className="absolute inset-0 bg-black/25" /> 
                             <div className="absolute inset-0 texture-carbon opacity-15 mix-blend-overlay" />
                             
                             <div className="relative z-10">
                                <span className="text-[7.5px] font-mono font-bold text-white/50 uppercase tracking-widest block mb-0.5">{t('inv_main_tone')}</span>
                                <span className="text-base font-black text-white leading-none">{item.tags?.[0]}</span>
                             </div>
                        </div>
                        
                        {/* Secondary Box */}
                        <div className="flex-1 rounded-xl bg-[#09090b]/80 border border-white/5 p-3 flex flex-col justify-end relative overflow-hidden">
                             <span className="text-[7.5px] font-mono font-bold text-white/35 uppercase tracking-widest mb-auto">{t('inv_match')}</span>
                             <span className="text-xs font-bold text-white/80 leading-tight line-clamp-2">{item.subName}</span>
                        </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="flex items-center justify-between py-1.5 border-t border-b border-white/5">
                         <StatRow effects={item.effects} />
                         <RarityTag rarity={item.rarity} />
                    </div>

                    {/* Footer Row: Comment + Refresh Button */}
                    <div className="flex gap-2 items-stretch">
                        {/* Comment */}
                        <div className="bg-[#0c0c0e] rounded-lg p-2.5 border border-white/5 relative flex-1">
                            <div className="absolute -top-1 w-2 h-2 bg-[#0c0c0e] border-l border-t border-white/5 rotate-45 left-4" />
                            <p className="text-[10px] text-white/70 leading-relaxed font-normal">
                                {item.aiComment}
                            </p>
                        </div>
                        
                        {/* Coordinated Refresh Button */}
                        <button 
                            onClick={onRegenerate}
                            disabled={equipped}
                            className="flex-none w-9 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg flex items-center justify-center active:scale-95 select-none transition-all duration-200 ease-out disabled:opacity-20 disabled:cursor-not-allowed group/btn relative overflow-hidden"
                            aria-label="Regenerate Item"
                        >
                            <span className="text-sm text-white/50 group-hover/btn:text-white transition-transform group-hover/btn:rotate-180 duration-500">↻</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN MODULE ---

const InstantInventory: React.FC<InstantInventoryProps> = ({ energyLevels, onUpdateEnergy, isInvalidUser }) => {
    const { t, language } = useI18n();
    const [recommendation, setRecommendation] = useState<DailyRecommendation | null>(null);
    const [outfit, setOutfit] = useState<InventoryItem | null>(null);
    const [food, setFood] = useState<InventoryItem | null>(null);
    
    const [activeTab, setActiveTab] = useState<'outfit' | 'food'>('outfit');
    const [equipped, setEquipped] = useState(false);
    
    // Initial Load Logic
    useEffect(() => {
        if (!energyLevels) return;

        // 1. Calculate Base Strategy (Initial)
        const rec = getDailyRecommendation(energyLevels, isInvalidUser, language);
        
        // 2. Check LocalStorage
        const storedDate = localStorage.getItem(KEY_INV_DATE);
        const todayStr = formatLocalDateKey();
        const storedOutfit = localStorage.getItem(KEY_INV_OUTFIT);
        const storedFood = localStorage.getItem(KEY_INV_FOOD);

        if (storedDate === todayStr && storedOutfit && storedFood) {
            try {
                // Load raw items
                const loadedOutfit = JSON.parse(storedOutfit);
                const loadedFood = JSON.parse(storedFood);
                
                // Immediately translate loaded items to current language
                setOutfit(translateItem(loadedOutfit, language));
                setFood(translateItem(loadedFood, language));
                
                // Keep recommendation logic consistent with loaded data if possible,
                // or just re-calc strategy text (strategy key doesn't change)
                setRecommendation(translateRecommendation(rec, language));
            } catch (e) {
                setOutfit(rec.suggestedOutfit);
                setFood(rec.suggestedFood);
                setRecommendation(rec);
            }
        } else {
            // New Data
            setOutfit(rec.suggestedOutfit);
            setFood(rec.suggestedFood);
            setRecommendation(rec);
            
            localStorage.setItem(KEY_INV_OUTFIT, JSON.stringify(rec.suggestedOutfit));
            localStorage.setItem(KEY_INV_FOOD, JSON.stringify(rec.suggestedFood));
            localStorage.setItem(KEY_INV_DATE, todayStr);
        }

    }, [energyLevels, isInvalidUser]); // Only on Mount or Energy Change

    // Instant Translation Effect when Language Changes
    useEffect(() => {
        if (outfit && food && recommendation) {
            const trOutfit = translateItem(outfit, language);
            const trFood = translateItem(food, language);
            const trRec = translateRecommendation(recommendation, language);
            
            setOutfit(trOutfit);
            setFood(trFood);
            setRecommendation(trRec);

            // Update local storage so reload persists correct language
            localStorage.setItem(KEY_INV_OUTFIT, JSON.stringify(trOutfit));
            localStorage.setItem(KEY_INV_FOOD, JSON.stringify(trFood));
        }
    }, [language]);

    const handleRegenerate = (slot: 'outfit' | 'food', forcedStyleTag?: string) => {
        if (!recommendation) return;
        
        // Error state lock
        if (isInvalidUser) return;

        const target = recommendation.targetElement;
        const newTag = getRandomTagForElement(target, slot);
        
        // Generate new item in current language
        // Re-calculate mother (simple local map or export)
        const motherMap: Record<ElementType, ElementType> = {
            [ElementType.Wood]: ElementType.Water,
            [ElementType.Fire]: ElementType.Wood,
            [ElementType.Earth]: ElementType.Fire,
            [ElementType.Metal]: ElementType.Earth,
            [ElementType.Water]: ElementType.Metal
        };
        const mother = motherMap[target];

        const newItem = generateItem(slot, newTag, target, mother, forcedStyleTag, language);
        
        if (slot === 'outfit') {
            setOutfit(newItem);
            localStorage.setItem(KEY_INV_OUTFIT, JSON.stringify(newItem));
        } else {
            setFood(newItem);
            localStorage.setItem(KEY_INV_FOOD, JSON.stringify(newItem));
        }
        
        setEquipped(false);
    };

    const handleEquipAll = () => {
        if (!outfit || !food || isInvalidUser) return;
        const totalDelta: Partial<Record<ElementType, number>> = {};
        [outfit, food].forEach(item => {
             // Guard: effects might be undefined
             if (item && item.effects) {
                 Object.entries(item.effects).forEach(([key, val]) => {
                    const k = key as ElementType;
                    totalDelta[k] = (totalDelta[k] || 0) + (val as number);
                });
             }
        });
        onUpdateEnergy(totalDelta);
        setEquipped(true);
    };

    if (!recommendation || !outfit || !food) return null;

    const currentItem = activeTab === 'outfit' ? outfit : food;

    return (
        <div className="w-full relative z-20 pt-1 pb-4 px-2 font-sans pointer-events-none select-none">
             <div className="max-w-md mx-auto flex flex-col items-center pointer-events-auto">
                 
                 {/* Unified Minimal Dashboard for Calibration */}
                 <div className="w-full flex flex-col gap-2.5 mb-5 items-center">
                     {/* Clean Strategy Indicator */}
                     <div className="flex items-center justify-between w-full max-w-[340px] px-2 mb-1">
                         <div className="flex flex-col text-left">
                             <span className="text-[7.5px] font-mono tracking-[0.2em] text-white/35 uppercase">
                                 STRATEGY DIRECTION
                             </span>
                             <span className="text-[11px] font-medium text-white/80 mt-0.5">
                                 {t('inv_strategy')}补益导引
                             </span>
                         </div>
                         <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 tracking-wider ${isInvalidUser ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                             <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shadow-[0_0_6px_currentColor]" />
                             {recommendation.strategyName}
                         </div>
                     </div>

                     {/* Premium Sharp Outlined Segmented Controls */}
                     <div className="w-full max-w-[340px] grid grid-cols-2 p-1 bg-[#09090b]/80 border border-white/5 rounded-xl">
                         <button 
                            onClick={() => setActiveTab('outfit')}
                            className={`py-2 rounded-lg text-[10px] font-semibold tracking-widest transition-all uppercase flex items-center justify-center gap-1.5 ${
                                activeTab === 'outfit' 
                                    ? 'bg-indigo-500/15 text-indigo-200 border border-indigo-500/10 shadow-sm font-bold' 
                                    : 'text-white/40 hover:text-white/70 border border-transparent'
                            }`}
                         >
                             <Shirt size={11} className={activeTab === 'outfit' ? "text-indigo-400" : "text-white/30"} />
                             <span>{t('inv_outfit')}</span>
                         </button>
                         <button 
                            onClick={() => setActiveTab('food')}
                            className={`py-2 rounded-lg text-[10px] font-semibold tracking-widest transition-all uppercase flex items-center justify-center gap-1.5 ${
                                activeTab === 'food' 
                                    ? 'bg-indigo-500/15 text-indigo-200 border border-indigo-500/10 shadow-sm font-bold' 
                                    : 'text-white/40 hover:text-white/70 border border-transparent'
                            }`}
                         >
                             <Sparkles size={11} className={activeTab === 'food' ? "text-indigo-400" : "text-white/30"} />
                             <span>{t('inv_food')}</span>
                         </button>
                     </div>
                 </div>

                 {/* Card */}
                 <div className="w-full mb-8 animate-in fade-in zoom-in-95 duration-500" key={activeTab + currentItem.id}>
                     <CompactCard 
                        item={currentItem} 
                        onRegenerate={() => handleRegenerate(activeTab)}
                        onStyleSelect={(tag) => handleRegenerate(activeTab, tag)}
                        equipped={equipped}
                    />
                 </div>

                 {/* Action */}
                 <div className={`w-full max-w-[340px] transition-all duration-500 ${equipped || isInvalidUser ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                     <button 
                        onClick={handleEquipAll}
                        className="w-full py-4 bg-white text-black border border-white/20 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 select-none transition-all duration-200 ease-out shadow-lg"
                     >
                         <span className="text-xs font-black uppercase tracking-[0.25em]">
                             {equipped ? t('inv_equipped') : isInvalidUser ? t('inv_cant_equip') : t('inv_equip_one_click')}
                         </span>
                     </button>
                 </div>

             </div>
        </div>
    );
};

export default InstantInventory;
