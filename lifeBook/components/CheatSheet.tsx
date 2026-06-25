

import React, { useState } from 'react';
import { CheatCard, CheatCardType, ElementType } from '../types';
import { useI18n } from '../utils/i18nContext';
import { Orbit, Package, Pill, RotateCw } from 'lucide-react';

interface CheatSheetProps {
    cards: CheatCard[];
    onEquip: (card: CheatCard) => void;
    onUnequip: (cardId: string) => void;
    equippedCardIds: string[];
    onRefresh: () => void; // New Prop
}

const CartridgeCard: React.FC<{
    card: CheatCard;
    isEquipped: boolean;
    onEquip: () => void;
    label: string; // Passed from parent for i18n
    icon: React.ReactNode;
    theme: any;
    equipText: string;
    equippedText: string;
}> = ({ card, isEquipped, onEquip, label, icon, theme, equipText, equippedText }) => {
    const { t } = useI18n();

    // Determine status styles
    const containerBorder = isEquipped
        ? "border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.15)]"
        : `${theme.border} group-hover:border-white/30 ${theme.glow}`;

    const elementMap: Record<string, string> = {
        Wood: '木', Fire: '火', Earth: '土', Metal: '金', Water: '水'
    };

    const effects = Object.entries(card.effects || {});

    return (
        <div className={`
            relative w-full max-w-[360px] mx-auto 
            bg-[#050505] backdrop-blur-xl rounded-2xl overflow-hidden 
            border transition-all duration-500 group
            ${containerBorder}
            flex flex-col
        `}>
            {/* --- ATMOSPHERIC LAYERS --- */}
            {/* Gradient Wash */}
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.bgGradient} opacity-60 pointer-events-none`} />

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

            {/* Active Highlight Line (Top) */}
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent ${isEquipped ? 'via-emerald-500' : theme.topLine} to-transparent opacity-80`} />

            {/* --- CONTENT CONTAINER --- */}
            <div className="relative z-10 p-6 flex flex-col h-full min-h-[220px]">

                {/* 1. HEADER: Type & Effects */}
                <div className="flex justify-between items-start mb-6">
                    {/* Left: Type Badge */}
                    <div className="flex flex-col gap-1">
                        <div className={`
                            inline-flex items-center gap-2 px-3 py-1 rounded-full 
                            bg-white/5 border border-white/10 backdrop-blur-md
                        `}>
                            <span className="filter drop-shadow-sm leading-none">{icon}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${theme.accentText}`}>
                                {label}
                            </span>
                        </div>
                    </div>

                    {/* Right: Effects Grid */}
                    <div className="flex flex-col items-end gap-1">
                        {effects.map(([key, val]) => (
                            <div key={key} className="flex items-center gap-2 bg-black/60 px-2 py-0.5 rounded border border-white/5">
                                <span className="text-[8px] font-bold text-white/50 uppercase">
                                    {elementMap[key] || key}
                                </span>
                                <span className={`text-[10px] font-mono font-bold ${Number(val) > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                    {Number(val) > 0 ? '+' : ''}{val as number}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. BODY: Main Content */}
                <div className="flex-1 mb-6">
                    <h3 className="text-xl md:text-2xl font-serif font-bold text-white mb-3 tracking-wide drop-shadow-sm leading-tight">
                        {card.title}
                    </h3>

                    <div className="relative pl-3 border-l-2 border-white/10 my-3">
                        <p className="text-xs text-white/70 font-medium leading-relaxed text-justify">
                            {card.description}
                        </p>
                    </div>
                </div>

                {/* 3. FOOTER: Meta & Action */}
                <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between gap-3">

                    {/* Duration / Condition */}
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">DURATION</span>
                        <span className="text-[10px] font-bold text-white/80 truncate">{card.duration}</span>
                    </div>

                    {/* Equip Button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onEquip(); }}
                        disabled={isEquipped}
                        className={`
                            relative overflow-hidden px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300
                            ${isEquipped
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 cursor-default shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                : 'bg-white text-black hover:bg-gray-200 border border-white shadow-lg active:scale-95 select-none transition-all duration-200 ease-out'
                            }
                        `}
                    >
                        {isEquipped ? equippedText : equipText}
                    </button>
                </div>
            </div>
        </div>
    )
}

const CheatSheetSection: React.FC<CheatSheetProps> = ({ cards, onEquip, equippedCardIds, onRefresh }) => {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState<CheatCardType>('prop');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Visual Configuration based on Card Type
    const TYPE_THEMES: Record<CheatCardType, {
        accentText: string,
        border: string,
        bgGradient: string,
        icon: React.ReactNode,
        labelKey: string, // Use key for i18n
        glow: string,
        topLine: string
    }> = {
        prop: {
            accentText: "text-amber-400",
            border: "border-amber-500/30",
            bgGradient: "from-amber-900/30 via-[#0a0a0a] to-black",
            icon: <Package size={13} />,
            labelKey: "cheat_prop",
            glow: "shadow-[0_0_20px_-5px_rgba(245,158,11,0.2)]",
            topLine: "via-amber-500"
        },
        consumable: {
            accentText: "text-rose-400",
            border: "border-rose-500/30",
            bgGradient: "from-rose-900/30 via-[#0a0a0a] to-black",
            icon: <Pill size={13} />,
            labelKey: "cheat_consumable",
            glow: "shadow-[0_0_20px_-5px_rgba(251,113,133,0.2)]",
            topLine: "via-rose-500"
        },
        environment: {
            accentText: "text-purple-400",
            border: "border-purple-500/30",
            bgGradient: "from-purple-900/30 via-[#0a0a0a] to-black",
            icon: <Orbit size={13} />,
            labelKey: "cheat_env",
            glow: "shadow-[0_0_20px_-5px_rgba(192,132,252,0.2)]",
            topLine: "via-purple-500"
        }
    };

    if (!cards || cards.length === 0) return null;

    // FIX: Strictly find card matching the tab to prevent showing wrong card type
    const activeCard = cards.find(c => c.type === activeTab);

    const handleRefreshClick = () => {
        setIsRefreshing(true);
        onRefresh();
        setTimeout(() => setIsRefreshing(false), 800);
    }

    return (
        <div className="w-full relative z-20 pb-16 px-4 font-sans pt-6">
            <div className="max-w-xl mx-auto">

                {/* Section Header with Refresh Button */}
                <div className="flex flex-col items-center justify-center gap-4 mb-8 opacity-90 relative">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-px bg-gradient-to-r from-transparent to-white/30" />
                        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/50">
                            {t('cheat_sys_mods')}
                        </span>
                        <div className="w-8 h-px bg-gradient-to-l from-transparent to-white/30" />
                    </div>
                    <h2 className="text-lg md:text-xl font-serif text-white/90 tracking-widest text-center">
                        {t('cheat_title')}
                    </h2>

                    <button
                        onClick={handleRefreshClick}
                        className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 active:scale-95 select-none transition-all duration-200 ease-out"
                    >
                        <RotateCw size={12} className={`text-white/60 group-hover:text-white transition-transform duration-700 ${isRefreshing ? 'rotate-[360deg]' : ''}`} />
                        <span className="text-[9px] text-white/40 group-hover:text-white/80 tracking-widest font-bold">
                            {t('cheat_refresh')}
                        </span>
                    </button>
                </div>

                {/* Tab Switcher */}
                <div className="flex justify-center mb-10">
                    <div className="bg-[#111] border border-white/10 rounded-full p-1 flex gap-1 shadow-2xl overflow-hidden">
                        {(['prop', 'consumable', 'environment'] as CheatCardType[]).map((type) => {
                            const theme = TYPE_THEMES[type];
                            const isActive = activeTab === type;
                            return (
                                <button
                                    key={type}
                                    onClick={() => setActiveTab(type)}
                                    className={`
                                        group relative px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2
                                        ${isActive
                                            ? 'bg-white/10 text-white shadow-inner'
                                            : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                                        }
                                    `}
                                >
                                    <span className={`${theme.accentText} ${isActive ? 'opacity-100' : 'opacity-60 grayscale'}`}>
                                        {theme.icon}
                                    </span>
                                    <span className="hidden md:block">{t(theme.labelKey)}</span>

                                    {/* Active Dot */}
                                    {isActive && (
                                        <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${theme.accentText.replace('text-', 'bg-')} shadow-[0_0_5px_currentColor]`} />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Active Card Display */}
                <div className="min-h-[250px] relative">
                    {activeCard ? (
                        <div className="animate-in fade-in zoom-in-95 duration-500 key={activeCard.id}">
                            <CartridgeCard
                                card={activeCard}
                                isEquipped={equippedCardIds.includes(activeCard.id)}
                                onEquip={() => onEquip(activeCard)}
                                label={t(TYPE_THEMES[activeCard.type].labelKey)}
                                icon={TYPE_THEMES[activeCard.type].icon}
                                theme={TYPE_THEMES[activeCard.type]}
                                equipText={t('cheat_equip')}
                                equippedText={t('cheat_equipped')}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 border border-white/5 rounded-2xl bg-white/5">
                            <span className="text-2xl opacity-30 mb-2">∅</span>
                            <span className="text-[10px] text-white/30 uppercase tracking-widest">{t('cheat_empty_slot')}</span>
                        </div>
                    )}
                </div>

                {/* Footer Note */}
                <div className="text-center mt-8">
                    <p className="text-[8px] text-white/20 font-mono uppercase tracking-[0.2em]">
                        {t('cheat_caution')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CheatSheetSection;
