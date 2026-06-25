

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AlignJustify, AlertTriangle, Lock, Shield, Sparkles, TrendingUp, Users } from 'lucide-react';
import { LifeBookData, LifeBookPageData, VisualItem } from '../types';
import { decodePageContent } from '../utils/gemini';
import { useI18n } from '../utils/i18nContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';

interface LifeBookProps {
  data: LifeBookData;
  isOpen: boolean;
  isExpanded?: boolean;
  initialPage?: number;
  onExpand?: () => void;
  onClose: () => void;
  onReset: () => void; // New Reset Handler
  isPremium?: boolean;
  onRequirePremium?: () => void;
  isGenerating?: boolean;
  genProgress?: number;
  generationComplete?: boolean;
  onEnterManual?: () => void;
}

interface PageProps {
  page: LifeBookPageData;
  index: number;
  currentPage: number;
  totalPages: number;
  onAiClick: (content: string, title: string) => void;
  ownerName: string;
  onClose: () => void;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  isFlipping?: boolean;
  lastPage?: number;
  isPremium?: boolean;
  onRequirePremium?: () => void;
  isGenerating?: boolean;
  genProgress?: number;
  generationComplete?: boolean;
  onEnterManual?: () => void;
  flatMode?: boolean;
}

const isIOSWebViewLike = () => {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent || '';
  const platform = navigator.platform || '';
  return /iPad|iPhone|iPod/i.test(userAgent) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

// --- TYPOGRAPHY PARSING & HIGHLIGHTS ENGINE ---

const renderParagraphWithHighlights = (rawText: string) => {
    const parts: React.ReactNode[] = [];
    let currentText = rawText;
    const regex = /【(.*?)】/g;
    let match;
    let lastIndex = 0;
    
    while ((match = regex.exec(currentText)) !== null) {
        const matchIndex = match.index;
        if (matchIndex > lastIndex) {
            parts.push(currentText.substring(lastIndex, matchIndex));
        }
        parts.push(
            <span key={matchIndex} className="font-bold text-[#A62B2B] select-all tracking-wide mx-0.5">
                {match[1]}
            </span>
        );
        lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < currentText.length) {
        parts.push(currentText.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : rawText;
};

const renderPageContent = (content: string) => {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return null;

    // A first paragraph qualifies for drop-cap only if it is standard narrative (no special starters or list formats)
    const firstLine = lines[0];
    const isFirstLineBullet = firstLine.startsWith('-') || firstLine.startsWith('*') || firstLine.startsWith('•');
    const firstChar = firstLine.charAt(0);
    const isFirstCharSpecial = ['【', '[', '"', '“', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '✓'].includes(firstChar);
    
    // We only trigger drop-cap if it begins with a real normal word and is sufficiently descriptive
    const useDropCap = !isFirstLineBullet && !isFirstCharSpecial && firstLine.length > 8;

    return (
        <div className="font-serif text-[11.5px] sm:text-[13px] text-[#2B1D16] antialiased tracking-wide w-full mx-auto relative font-medium leading-[1.7] text-justify space-y-2 pb-1 pr-[2px]">
            {lines.map((line, idx) => {
                const isBullet = line.startsWith('-') || line.startsWith('*') || line.startsWith('•');
                
                if (isBullet) {
                    const contentText = line.replace(/^[-*•]\s*/, '').trim();
                    const colonIdx = contentText.indexOf('：') !== -1 ? contentText.indexOf('：') : contentText.indexOf(':');
                    
                    if (colonIdx !== -1) {
                        const title = contentText.substring(0, colonIdx + 1);
                        const body = contentText.substring(colonIdx + 1).trim();
                        return (
                            <div 
                                key={idx} 
                                className="my-2 pl-4 border-l-2 border-[#8B4513]/35 py-0.5 transition-all hover:border-[#8B4513]"
                            >
                                <div className="flex items-start gap-1.5 animate-in fade-in-25 duration-500">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#8B4513]/70 mt-1.5 shrink-0" />
                                    <div className="flex-1 text-[11.5px] sm:text-[13px] text-[#2B1D16] leading-relaxed">
                                        <span className="text-[#8B4513] font-serif font-bold tracking-wider text-[12px] sm:text-[13px] mr-2">
                                            {title.replace('：', '').replace(':', '').trim()}
                                        </span>
                                        <span className="align-middle text-[#1A0F0A] font-medium opacity-95">
                                            {renderParagraphWithHighlights(body)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    } else {
                        return (
                            <div key={idx} className="my-1.5 pl-4 border-l border-[#8B4513]/20 py-0.5 text-[11.5px] sm:text-[13px] text-[#2B1D16] leading-[1.65] animate-in fade-in-25 duration-500">
                                <div className="flex items-start gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#8B4513]/55 mt-1.5 shrink-0" />
                                    <span className="flex-1 text-justify opacity-95 leading-[1.65]">{renderParagraphWithHighlights(contentText)}</span>
                                </div>
                            </div>
                        );
                    }
                }

                // Standard narrative lines (non-bullet)
                if (idx === 0 && useDropCap) {
                    const startChar = line.charAt(0);
                    const restText = line.slice(1);
                    return (
                        <p key={idx} className="mb-2 sm:mb-2.5 text-[#2B1D16] font-medium leading-[1.7] text-justify font-serif">
                            <span className="float-left text-[2.5rem] font-serif-display text-[#8B4513]/90 leading-none mt-1 font-black select-none mr-2 pr-1">
                                {startChar}
                            </span>
                            {renderParagraphWithHighlights(restText)}
                        </p>
                    );
                }

                return (
                    <p key={idx} className="mb-2 sm:mb-2.5 text-[#2B1D16] text-justify leading-[1.7] indent-[1.5em] tracking-wide transition-opacity duration-300">
                        {renderParagraphWithHighlights(line)}
                    </p>
                );
            })}
        </div>
    );
};

// --- VISUAL COMPONENTS (Compact Grid Layout) ---

const useMeasuredBox = () => {
    const ref = useRef<HTMLDivElement | null>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        let frame = 0;
        const update = () => {
            frame = window.requestAnimationFrame(() => {
                const rect = node.getBoundingClientRect();
                const width = Math.round(rect.width);
                const height = Math.round(rect.height);
                setSize((prev) => (
                    prev.width === width && prev.height === height ? prev : { width, height }
                ));
            });
        };

        update();
        const observer = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(update)
            : null;
        observer?.observe(node);

        return () => {
            if (frame) window.cancelAnimationFrame(frame);
            observer?.disconnect();
        };
    }, []);

    return [ref, size] as const;
};

const BookBaziChart: React.FC<{ chartData: any[] }> = React.memo(({ chartData }) => {
    const [ready, setReady] = useState(false);
    const [frameRef, frameSize] = useMeasuredBox();

    useEffect(() => {
        setReady(false);
        let secondFrame = 0;
        const firstFrame = requestAnimationFrame(() => {
            secondFrame = requestAnimationFrame(() => setReady(true));
        });
        return () => {
            cancelAnimationFrame(firstFrame);
            if (secondFrame) cancelAnimationFrame(secondFrame);
        };
    }, [chartData.length]);

    const canRender = ready && frameSize.width > 1 && frameSize.height > 1;

    return (
        <div ref={frameRef} className="w-full h-full" aria-hidden={!canRender}>
            {canRender && (
            <AreaChart width={frameSize.width} height={frameSize.height} data={chartData} margin={{ top: 10, right: 5, left: -35, bottom: 0 }}>
                <defs>
                    <linearGradient id="bookScoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B4513" stopOpacity={0.25}/>
                        <stop offset="100%" stopColor="#8B4513" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#8B4513" strokeOpacity={0.08} vertical={false} />
                <XAxis dataKey="age" tick={{fontSize: 7, fill: '#8B4513', opacity: 0.7, fontFamily: 'monospace'}} interval={9} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{fontSize: 7, fill: '#8B4513', opacity: 0.7, fontFamily: 'monospace'}} axisLine={false} tickLine={false} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#F9F7F1', borderColor: '#8B4513', borderRadius: '4px', fontSize: '9px', color: '#1A0F0A' }}
                    itemStyle={{ color: '#8B4513' }}
                    labelStyle={{ color: '#5D4037', marginBottom: '1px', fontFamily: 'monospace' }}
                    cursor={{ stroke: '#8B4513', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#8B4513" 
                    strokeWidth={1.5} 
                    fill="url(#bookScoreGrad)" 
                    animationDuration={1000}
                />
                <ReferenceLine x={30} stroke="#8B4513" strokeDasharray="2 2" strokeOpacity={0.4} label={{ value: 'NOW', position: 'top', fill: '#8B4513', fontSize: 7 }} />
            </AreaChart>
            )}
        </div>
    );
});

const VisualRenderer: React.FC<{ items: VisualItem[]; renderCharts?: boolean }> = React.memo(({ items, renderCharts = true }) => {
    return (
        <div className="grid grid-cols-2 gap-x-2 sm:gap-x-3 gap-y-2.5 sm:gap-y-3.5 relative p-1 sm:p-1.5 pb-14 w-full content-start auto-rows-max">
            
            {/* Subtle Watermark/Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(139,69,19,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(139,69,19,0.015)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

            {items.map((item, idx) => {
                // Determine span based on content type: full-width on mobile to prevent squishing, side-by-side on tablet/desktop
                const colSpan = (item.type === 'quote' || item.type === 'separator' || item.type === 'list' || item.type === 'hexagram_card' || item.type === 'matrix' || item.type === 'checklist' || (item.value && item.value.toString().length > 14)) 
                    ? 'col-span-2' 
                    : 'col-span-2 xs:col-span-1';

                switch(item.type) {
                    case 'card':
                        return (
                            <div key={idx} className={`${colSpan} relative group my-0.5 bg-gradient-to-b from-[#FDFCF9] to-[#FAF8F3] border border-[#8B4513]/15 rounded-md p-2.5 shadow-[0_2px_8px_rgba(45,27,21,0.03)] hover:border-[#8B4513]/40 transition-all duration-300`}>
                                {/* Tiny Gold Corner Ornaments */}
                                <div className="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-[#8B4513]/45" />
                                <div className="absolute top-1 right-1 w-1.5 h-1.5 border-t border-r border-[#8B4513]/45" />
                                <div className="absolute bottom-1 left-1 w-1.5 h-1.5 border-b border-l border-[#8B4513]/45" />
                                <div className="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-[#8B4513]/45" />
                                
                                <div className="p-1 flex flex-col h-full justify-center">
                                    <div className="flex justify-between items-center mb-0.5 border-b border-[#8B4513]/10 pb-1">
                                        <span className="text-[8px] font-mono uppercase tracking-[0.15em] text-[#8B4513]/80 font-bold bg-[#8B4513]/5 px-1.5 py-0.5 rounded-sm">
                                            {item.label}
                                        </span>
                                        {item.accent && (
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8B4513] opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#8B4513]"></span>
                                            </span>
                                        )}
                                    </div>
                                    <div className="font-serif text-[12px] sm:text-[13px] text-[#1A0F0A] font-bold leading-[1.4] tracking-wide mt-1.5">
                                        {item.value}
                                    </div>
                                    {item.subtext && (
                                        <div className="mt-1 text-[8.5px] font-serif italic text-[#6E584F] border-l border-[#8B4513]/25 pl-2 leading-tight">
                                            {item.subtext}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    case 'stat':
                        return (
                            <div key={idx} className={`${colSpan} flex items-center gap-3 py-1.5 border-b border-[#8B4513]/10 hover:bg-[#8B4513]/[0.02] px-1 transition-colors rounded-sm`}>
                                <div className="w-16 text-[8px] font-serif font-bold uppercase tracking-wider text-[#6E584F] text-left shrink-0">
                                    {item.label}
                                </div>
                                <div className="flex-1 relative">
                                    {/* Glassy Track */}
                                    <div className="h-1 w-full bg-[#8B4513]/10 rounded-full overflow-hidden" />
                                    {/* Golden Progress Indicator */}
                                    <div 
                                        style={{ width: `${Math.min(100, Math.max(0, Number(item.value) || 0))}%` }} 
                                        className={`h-1 absolute top-0 left-0 rounded-full shadow-[0_0_8px_rgba(139,69,19,0.3)] transition-all duration-1000 ${item.accent ? 'bg-gradient-to-r from-[#8B4513] to-[#D4AF37]' : 'bg-gradient-to-r from-[#5D4037] to-[#8B4513]/70'}`} 
                                        id={`stat-bar-${idx}`}
                                    />
                                </div>
                                <div className="w-8 text-[11px] font-serif-display font-bold text-[#1A0F0A] text-right font-mono-num shrink-0">
                                    {item.value}
                                </div>
                            </div>
                        );
                    case 'list': {
                         const rawVal = item.value?.toString() || '';
                         const isLongText = rawVal.length > 24;
                         return (
                            <div key={idx} className={`${colSpan} flex ${isLongText ? 'flex-col items-start gap-1' : 'flex-row items-center justify-between'} py-1.5 border-b border-dashed border-[#8B4513]/15 group px-1.5 hover:bg-[#8B4513]/[0.015] transition-colors duration-150 w-full overflow-hidden break-words`}>
                                <div className="flex items-center gap-1.5 shrink-0 max-w-full">
                                    <span className="w-1.5 h-1.5 bg-[#8B4513]/60 rotate-45 mr-1 flex-shrink-0" />
                                    <span className="text-[8.5px] sm:text-[9.5px] font-mono uppercase tracking-[0.2em] text-[#6E584F] font-semibold break-all">
                                        {item.label}
                                    </span>
                                </div>
                                <div className={`flex flex-col break-words ${isLongText ? 'items-start text-left w-full mt-1.5 pl-2.5' : 'items-end text-right max-w-[70%]'}`}>
                                    <span className={`text-[11.5px] sm:text-[12.5px] font-serif text-[#1A0F0A] leading-relaxed tracking-wide break-words w-full ${isLongText ? 'font-normal opacity-95' : 'font-bold'}`}>
                                        {rawVal}
                                    </span>
                                    {item.subtext && (
                                        <span className="text-[8px] sm:text-[8.5px] text-[#8B4513]/70 font-serif italic mt-0.5 break-words w-full">
                                            {item.subtext}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    }
                    case 'quote':
                        return (
                            <div key={idx} className={`${colSpan} my-1.5 relative text-center px-4 py-4 rounded-lg bg-gradient-to-tr from-[#FAF8F5] via-[#FCFAF6] to-[#FAF8F5] border border-[#8B4513]/10 shadow-[inset_0_1px_3px_rgba(139,69,19,0.02),0_1px_4px_rgba(0,0,0,0.02)] overflow-hidden break-words`}>
                                {/* Floating large elegant quotation marks */}
                                <span className="absolute -top-1.5 -left-1 text-[2.5rem] font-serif-display text-[#8B4513]/10 leading-none select-none">“</span>
                                <span className="absolute -bottom-6 -right-1 text-[2.5rem] font-serif-display text-[#8B4513]/10 leading-none select-none">”</span>
                                
                                <p className="relative z-10 font-serif-display text-[13px] sm:text-[14px] text-[#2C221F] leading-[1.65] font-semibold tracking-wide italic break-words">
                                    {item.value}
                                </p>
                                {item.subtext && (
                                    <div className="relative z-10 mt-2 flex items-center justify-center gap-1.5 break-words">
                                        <div className="h-[0.5px] w-3 bg-[#8B4513]/40" />
                                        <p className="text-[8px] uppercase tracking-[0.35em] font-bold text-[#8B4513]/70 break-all">{item.subtext}</p>
                                        <div className="h-[0.5px] w-3 bg-[#8B4513]/40" />
                                    </div>
                                )}
                            </div>
                        );
                    case 'tag':
                        return (
                            <div key={idx} className={`${colSpan} flex flex-wrap items-center gap-1.5 border border-[#8B4513]/20 px-2.5 py-1 bg-[#FDFCF9]/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] rounded-md hover:border-[#8B4513]/40 transition-colors w-full break-words overflow-hidden`}>
                                <span className="text-[8px] uppercase tracking-[0.2em] text-[#8B4513]/80 font-bold shrink-0">{item.label}</span>
                                <div className="hidden sm:block w-px h-2.5 bg-[#8B4513]/20 shrink-0" />
                                <span className="text-[11px] font-serif font-bold tracking-wider text-[#1A0F0A] break-words flex-1 min-w-[50px]">{item.value}</span>
                            </div>
                        );
                    case 'hexagram_card': {
                        const hexName = item.value?.toString() || '乾为天';
                        const isYang = (line: number) => {
                            const code = hexName.charCodeAt(line % hexName.length) || 68;
                            return code % 2 === 0;
                        };
                        return (
                            <div key={idx} className="col-span-2 relative my-1.5 bg-gradient-to-br from-[#FCFBF8] to-[#FAF8F2] border-2 border-[#8B4513]/15 rounded-md p-3 shadow-[0_2px_10px_rgba(45,27,21,0.04)] hover:border-[#8B4513]/35 transition-all duration-300">
                                <div className="absolute top-2 right-3 flex items-center justify-center w-8 h-8 rounded-full border border-[#8B4513]/20 bg-[#8B4513]/5 text-[#8B4513] font-serif font-black text-[11px]">
                                    卦
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex flex-col gap-1 justify-center items-center py-1 px-2 border border-[#8B4513]/10 bg-[#FAF7F1] rounded">
                                        {[1, 2, 3, 4, 5, 6].map((lineNum) => (
                                            <div key={lineNum} className="flex gap-0.5 items-center justify-center w-8 h-1">
                                                {isYang(lineNum) ? (
                                                    <div className="w-full h-[1.5px] bg-[#8B4513]" />
                                                ) : (
                                                    <>
                                                        <div className="w-[45%] h-[1.5px] bg-[#8B4513]" />
                                                        <div className="w-[10%] h-[1.5px] bg-transparent" />
                                                        <div className="w-[45%] h-[1.5px] bg-[#8B4513]" />
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex-1 flex flex-col justify-center">
                                        <div className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#8B4513]/70 font-bold mb-0.5">
                                            {item.label || '易经本命天机卦'}
                                        </div>
                                        <div className="font-serif text-[14px] text-[#1A0F0A] font-black leading-tight tracking-wider mb-1">
                                            {hexName}
                                        </div>
                                        {item.subtext && (
                                            <div className="text-[10px] font-serif italic text-[#6E584F] leading-relaxed pr-6">
                                                {item.subtext}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    }
                    case 'matrix': {
                        const rawMatrix = item.value?.toString() || '';
                        const cells = rawMatrix.split(',').map(part => {
                            const [k, v] = part.split(':');
                            return { k: k?.trim() || '', v: v?.trim() || '' };
                        });
                        return (
                            <div key={idx} className="col-span-2 relative my-1 bg-[#FCFBF8] border border-[#8B4513]/15 rounded-md overflow-hidden shadow-[0_2px_6px_rgba(45,27,21,0.03)] hover:border-[#8B4513]/30 transition-all">
                                <div className="text-[7.5px] uppercase tracking-[0.25em] font-bold bg-[#8B4513]/10 text-[#8B4513]/90 px-2.5 py-1 text-center font-mono border-b border-[#8B4513]/15">
                                    {item.label || '四维度命运分析矩阵 (DESTINY GRID)'}
                                </div>
                                <div className="grid grid-cols-2 divide-x divide-y divide-[#8B4513]/15">
                                    {cells.map((c, cidx) => (
                                        <div key={cidx} className="p-2 sm:p-2.5 flex flex-col justify-between bg-[#FCFBF8] hover:bg-[#FAF8F3] transition-colors">
                                            <span className="text-[8px] font-mono text-[#6E584F]/80 uppercase tracking-widest">{c.k}</span>
                                            <span className="font-serif text-[11px] sm:text-[12px] text-[#1A0F0A] font-bold mt-1 leading-snug tracking-wide">{c.v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    }
                    case 'checklist': {
                        const listItems = (item.value?.toString() || '').split(';');
                        return (
                            <div key={idx} className="col-span-2 relative my-1.5 p-3 bg-gradient-to-b from-[#FCFCFA] to-[#FBF9F4] border border-[#8B4513]/15 rounded-md shadow-sm">
                                <div className="border-b border-[#8B4513]/10 pb-1 mb-2">
                                    <span className="text-[8.5px] font-mono uppercase tracking-[0.2em] text-[#8B4513] font-black">
                                        {item.label || '战术修心条令 (DAILY ACTION COMPLIANCE)'}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {listItems.map((li, liIdx) => (
                                        <div key={liIdx} className="flex gap-2 items-start">
                                            <div className="w-3.5 h-3.5 rounded border border-[#8B4513]/30 bg-white flex items-center justify-center text-[#8B4513] font-serif text-[9px] shrink-0 mt-0.5 shadow-inner select-none font-bold">
                                                ✓
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[11px] sm:text-[11.5px] font-serif text-[#1A0F0A] font-medium leading-normal tracking-wide">
                                                    {li.trim()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {item.subtext && (
                                    <div className="mt-2 pt-1 border-t border-[#8B4513]/5 text-[7.5px] font-mono text-[#6E584F]/75 uppercase tracking-wider text-right">
                                        {item.subtext}
                                    </div>
                                )}
                            </div>
                        );
                    }
                    case 'dial': {
                        const dialVal = Number(item.value) || 75;
                        return (
                            <div key={idx} className="col-span-1 relative py-2.5 px-3 bg-gradient-to-br from-[#FCFBF8] to-[#FAF8F2] border border-[#8B4513]/15 rounded-md hover:border-[#8B4513]/30 transition-all flex flex-col justify-center items-center text-center">
                                <div className="relative w-12 h-12 flex items-center justify-center mb-1">
                                    <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                                        <circle cx="24" cy="24" r="21" stroke="rgba(139,69,19,0.08)" strokeWidth="1.5" fill="transparent" />
                                        <circle cx="24" cy="24" r="21" stroke="#8B4513" strokeWidth="2" strokeDasharray={2 * Math.PI * 21} strokeDashoffset={2 * Math.PI * 21 * (1 - dialVal / 100)} strokeLinecap="round" fill="transparent" />
                                    </svg>
                                    <span className="text-[10px] sm:text-[11px] font-mono font-bold text-[#1A0F0A]">{dialVal}%</span>
                                </div>
                                <div className="text-[7.5px] font-mono uppercase tracking-widest text-[#8B4513]/85 font-bold">
                                    {item.label || '独立指数'}
                                </div>
                                {item.subtext && (
                                    <div className="text-[7px] font-serif italic text-[#6E584F] mt-0.5 leading-tight truncate w-full">
                                        {item.subtext}
                                    </div>
                                )}
                            </div>
                        );
                    }
	                    case 'bazi_chart': {
                        if (!renderCharts) {
                            return (
                                <div
                                    key={idx}
                                    aria-hidden="true"
                                    className={`${colSpan} w-full h-[165px] bg-[#FAF8F5]/80 border border-[#8B4513]/10 rounded-lg p-2.5 relative overflow-hidden my-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]`}
                                />
                            );
                        }

	                        let chartData: any[] = [];
                        try {
                            chartData = item.value ? JSON.parse(item.value.toString()) : [];
                        } catch (e) {
                            console.error("Failed to parse chart data in LifeBook", e);
                        }

                        if (!chartData || chartData.length === 0) {
                            return (
                                <div key={idx} className={`${colSpan} text-center text-xs text-stone-400 py-8`}>
                                    无图表数据
                                </div>
                            );
                        }

                        return (
                            <div key={idx} className={`${colSpan} w-full h-[165px] bg-[#FAF8F5]/80 border border-[#8B4513]/15 rounded-lg p-2.5 relative overflow-hidden my-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] z-20 hover:border-[#8B4513]/30 transition-all`}>
                                <div className="absolute inset-0 bg-[#8B4513]/[0.01] pointer-events-none" />
                                <BookBaziChart chartData={chartData} />
                                <div className="absolute top-2 right-2 text-[6px] tracking-widest text-[#8B4513]/75 font-semibold bg-[#8B4513]/5 border border-[#8B4513]/15 px-1.5 py-0.5 rounded-sm">
                                    ENERGY FLOW
                                </div>
                            </div>
                        );
                    }
                    case 'separator':
                        return (
                            <div key={idx} className={`${colSpan} w-full flex items-center gap-2 my-1.5 opacity-20`}>
                                <div className="flex-1 h-px bg-[#2D1B15]" />
                                <div className="w-1 h-1 rotate-45 border border-[#2D1B15]" />
                                <div className="flex-1 h-px bg-[#2D1B15]" />
                            </div>
                        );
                    default:
                        return null;
                }
            })}
        </div>
    )
});

const Page: React.FC<PageProps> = React.memo(({ page, index, currentPage, totalPages, onAiClick, ownerName, onClose, onNextPage, onPrevPage, isFlipping, lastPage, isPremium, onRequirePremium, isGenerating, genProgress, generationComplete, onEnterManual, flatMode }) => {
  const { t } = useI18n();
  const [showProgressToast, setShowProgressToast] = useState(false);

  useEffect(() => {
    if (generationComplete) {
      setShowProgressToast(false);
    }
  }, [generationComplete]);

  useEffect(() => {
    let timer: any;
    if (showProgressToast) {
      timer = setTimeout(() => {
        setShowProgressToast(false);
      }, 3500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showProgressToast]);

  const isFlipped = index < currentPage;
  const isLastPage = index === totalPages - 1;
  
  let zIndex = 0;
  if (!isFlipped) {
      zIndex = totalPages - index;
  } else {
      zIndex = index;
  }
  
  if (isFlipping) {
    // Keep the rotating page strictly on top of its immediate neighbors
    if (index === Math.max(lastPage || 0, currentPage)) { // The page on top during forward flip
        zIndex = totalPages + 10;
    }
    if (index === Math.min(lastPage || 0, currentPage)) { // The page flying
        zIndex = totalPages + 20;
    }
  }

  const isCover = index === 0;

  // Robust fallback lookup for username
  const getActiveOwnerName = () => {
    if (ownerName && ownerName !== 'undefined' && ownerName !== 'Traveler' && ownerName !== 'Guest' && ownerName !== '旅行者') {
      return ownerName;
    }
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('life_kline_profile');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.name && parsed.name !== 'undefined' && parsed.name !== '旅行者') {
            return parsed.name;
          }
        } catch (e) {}
      }
      const lbUser = localStorage.getItem('lb_user_data');
      if (lbUser) {
        try {
          const parsed = JSON.parse(lbUser);
          if (parsed && parsed.name && parsed.name !== 'undefined' && parsed.name !== '旅行者') {
            return parsed.name;
          }
        } catch (e) {}
      }
    }
    return '';
  };
  const activeOwnerName = getActiveOwnerName();

  // --- TEXTURES & STYLES ---
  const coverBg = "bg-[#101010]"; // Slightly lighter than pure black
  // Cream paper with fine grain
  const paperBg = "bg-[#F9F7F1]";
  // Aggregate content for AI
  const fullContentForAi = `${page.title} ${page.subtitle} ${page.content || ''} ${page.visualItems?.map(v => `${v.label}: ${v.value}`).join(' ') || ''}`;

  const isCurrentActive = index === currentPage;
  const canRenderCharts = Math.abs(index - currentPage) <= 1;

  const pageTransform = flatMode
    ? 'none'
    : (isFlipped ? `rotateY(-180deg) translateZ(${index * 0.5}px)` : `rotateY(0deg) translateZ(${(totalPages - index) * 0.5}px)`);

  return (
    <div 
      className={`absolute top-0 right-0 w-full h-full origin-left transition-transform duration-280 ease-book-flip cursor-pointer will-change-transform ${flatMode ? '' : 'preserve-3d'} ${isCurrentActive ? 'pointer-events-auto' : 'pointer-events-none'}`}
      style={{ 
        transform: pageTransform,
        zIndex: zIndex
      }}
      // Support long press
      onContextMenu={(e) => {
          e.preventDefault();
          if (!isCover && isCurrentActive) onAiClick(fullContentForAi, page.title);
      }}
    >
      {/* --- BACK OF PAGE (Left Side when flipped) --- */}
      {!flatMode && (
        <div 
          className="absolute top-[6px] bottom-[6px] left-[6px] right-[1px] backface-hidden flex items-center justify-center bg-[#F0EEE6] rounded-l-[2px] border-r border-[#2D1B15]/5"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <div className="absolute inset-0 bg-black/5 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-black/10 to-transparent pointer-events-none" />
          <div className="absolute bottom-4 left-4 flex items-center gap-2 opacity-30 rotate-180">
              <span className="text-[8px] font-mono tracking-widest">P.{index.toString().padStart(2, '0')}</span>
          </div>
        </div>
      )}

      {/* --- FRONT OF PAGE (Right Side content) --- */}
      <div 
        className={`absolute ${isCover ? 'inset-0' : 'top-[5px] bottom-[5px] right-[5px] left-[2px]'} ${flatMode ? '' : 'backface-hidden'} flex flex-col ${isCover ? 'rounded-r-[2px] bg-[#1a1a1a]' : 'rounded-[3px] bg-[#F9F7F1] border border-[#8B4513]/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45),0_12px_28px_rgba(45,27,21,0.12)]'}`}
      >
        <div className={`w-full h-full relative flex flex-col overflow-hidden ${isCover ? 'rounded-r-[3px]' : 'rounded-[3px]'}`}>
        {/* === COVER DESIGN === */}
        {isCover ? (
            <div 
                className="h-full w-full flex flex-col items-center justify-between p-2 bg-[#1a1a1a] cursor-pointer group relative"
                onClick={(e) => {
                    e.stopPropagation();
                    if (isGenerating && !generationComplete) {
                        setShowProgressToast(true);
                        return; // do nothing
                    }
                    if (isGenerating && generationComplete && onEnterManual) {
                        onEnterManual();
                        onNextPage?.(); // Flip immediately after dismissing loader
                    } else {
                        onNextPage?.();
                    }
                }}
            >
                 {showProgressToast && (
                     <div 
                         className="absolute inset-[6%] flex flex-col items-center justify-between p-5 sm:p-7 bg-[#131313]/99 backdrop-blur-lg rounded-lg border-2 border-[#D4C4A8]/45 text-center shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8),0_0_30px_rgba(212,175,55,0.15)] z-[150] animate-in zoom-in duration-250"
                         onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                     >
                         <div className="flex-1 flex flex-col items-center justify-center p-1">
                             <div className="w-11 h-11 border-2 border-[#F3CD68]/50 rotate-45 flex items-center justify-center animate-spin duration-3000 mb-5 shadow-[0_0_15px_rgba(243,205,104,0.1)]">
                                 <AlignJustify size={14} className="text-[#F3CD68] rotate-[-45deg]" />
                             </div>
                             <h4 className="text-[#F3CD68] text-[14px] sm:text-[15px] font-extrabold tracking-[0.25em] uppercase font-serif drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">说明书深层推演中</h4>
                             <p className="text-[#F6F1EA] text-[11px] sm:text-[12px] font-medium mt-3.5 leading-relaxed max-w-[220px] text-center font-sans tracking-wide">
                                 系统正在为您深度演算天命宇宙说明书，包含 12 个专属扩展模块剧本，预计耗时 30 秒。系统生成完毕后会自动解除锁定，请稍作等待。
                             </p>
                             <div className="text-[11px] font-extrabold font-mono text-[#F3CD68] mt-4 bg-[#231E15]/95 border border-[#D4AF37]/35 px-4.5 py-1.5 rounded-full shadow-[0_3px_12px_rgba(212,175,55,0.15)]">
                                 当前深度: {genProgress || 0}%
                             </div>
                         </div>
                         <button 
                             onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShowProgressToast(false); }}
                             className="mt-4 px-6 py-2 bg-[#D4AF37]/25 hover:bg-[#D4AF37]/40 text-[#F6F1EA] text-[11px] font-bold tracking-[0.25em] rounded-md border border-[#D4AF37]/45 transition-all font-serif hover:shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                         >
                             我知道了
                         </button>
                     </div>
                 )}
                 {/* Outer Frame */}
                 <div className="w-full h-full border border-[#D4C4A8]/30 rounded-[1px] p-1.5 flex flex-col relative overflow-hidden transition-all duration-700 group-hover:border-[#D4C4A8]/50">
                    <div className="absolute inset-0 opacity-20 texture-stardust" />
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-transparent to-[#100a08]/80" />
                    
                    {/* Inner Content Container */}
                    <div className="flex-1 border border-[#D4C4A8]/10 flex flex-col items-center py-4 xs:py-6 sm:py-10 px-1.5 xs:px-2 sm:px-4 relative z-10 justify-between">
                        
                        {/* Mystic Symbol/Header */}
                        <div className="mb-2 xs:mb-4 sm:mb-8 opacity-85 flex flex-col items-center shrink-0">
                            <div className="w-9 h-9 xs:w-12 xs:h-12 sm:w-14 sm:h-14 border border-[#D4C4A8]/50 rotate-45 flex items-center justify-center transition-transform duration-1000 group-hover:rotate-90">
                                <div className="w-[26px] h-[26px] xs:w-8 xs:h-8 sm:w-10 sm:h-10 border border-[#D4C4A8]/30 rotate-[-45deg] flex items-center justify-center transition-transform duration-1000 group-hover:-rotate-90">
                                    <AlignJustify size={13} className="text-[#D4C4A8]" />
                                </div>
                            </div>
                            
                            {/* Loading State on Cover */}
                            {isGenerating ? (
                                <div className="mt-3 xs:mt-5 sm:mt-6 flex flex-col items-center justify-center gap-2 xs:gap-3 w-[130px] xs:w-[140px] sm:w-[180px]">
                                    <div className="w-full h-[1px] bg-[#D4C4A8]/10 overflow-hidden relative">
                                        <div 
                                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-transparent via-[#D4C4A8] to-transparent bg-[length:200%_100%] animate-pulse"
                                            style={{ width: `${genProgress || 0}%`, transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 tracking-[0.3em]">
                                        <span className={`text-[9px] sm:text-[10px] font-sans uppercase font-medium transition-colors duration-500 ${generationComplete ? 'text-[#D4AF37]' : 'text-[#D4C4A8]/60'}`}>
                                            {generationComplete ? "推演完毕" : "深度演算"}
                                        </span>
                                        {!generationComplete && (
                                            <span className="text-[9px] sm:text-[10px] font-mono text-[#D4C4A8]/40">
                                                {genProgress}%
                                            </span>
                                        )}
                                    </div>
                                    {generationComplete && (
                                        <div className="text-[8px] sm:text-[9px] text-[#D4C4A8]/40 tracking-widest animate-pulse mt-1">
                                            [ 点击启封 ]
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="mt-3 xs:mt-5 sm:mt-6 flex items-center gap-1.5 px-2.5 py-0.5 xs:py-1 rounded-sm border-b border-[#D4AF37]/30 transition-all hover:bg-[#D4AF37]/5 cursor-pointer group/btn" onClick={onNextPage}>
                                    <span className="w-1 h-1 rounded-full bg-[#D4AF37] opacity-80 group-hover/btn:animate-ping" />
                                    <span className="text-[8px] xs:text-[9px] sm:text-[10px] font-serif font-medium text-[#D4AF37] tracking-[0.3em] shrink-0">点击启封</span>
                                </div>
                            )}
                        </div>

                        {/* Title Section - VERTICAL - HIGH END UI DESIGN */}
                        <div className="flex-1 flex flex-row-reverse items-center justify-center gap-4 xs:gap-6 sm:gap-10 pt-2 pb-3 xs:pb-8 sm:pb-12 md:pb-16 overflow-hidden w-full select-none">
                            {/* Owner Column - elegant left / traditional red signature seal */}
                            {activeOwnerName && (
                                <div className="writing-vertical-rl text-[10px] xs:text-[12px] sm:text-[14px] font-serif font-light text-[#D4C4A8]/70 tracking-[0.4em] flex justify-center items-center pb-4 xs:pb-8 sm:pb-12 border-l border-[#D4C4A8]/10 pl-2 xs:pl-4 sm:pl-6 select-none relative">
                                    <div className="border border-red-900/50 bg-[#2a0e0e]/40 text-red-500/90 font-serif text-[10px] xs:text-[12px] sm:text-[13px] py-3 xs:py-5 px-1 xs:px-1.5 mb-2 xs:mb-4 leading-none rounded-[1px] shadow-[0_0_10px_rgba(255,0,0,0.1)]" style={{ writingMode: 'vertical-rl' }}>
                                        {activeOwnerName.slice(0, 3)}
                                    </div>
                                    <span className="opacity-80 font-serif font-medium">专属命理</span>
                                </div>
                            )}

                            {/* Main Title Column - Bold, premium, cinematic typography */}
                            <div className="flex relative items-center justify-center h-full max-h-[70vh] pb-3 xs:pb-6 md:pb-12">
                                <div className="absolute top-1/2 -left-3 xs:-left-5 sm:-left-8 w-[1px] h-[75%] -translate-y-1/2 bg-gradient-to-b from-transparent via-[#EAE0D1]/20 to-transparent transition-all duration-700 group-hover:h-[90%]"></div>
                                <div className="absolute top-1/2 -right-3 xs:-right-5 sm:-right-8 w-[1px] h-[75%] -translate-y-1/2 bg-gradient-to-b from-transparent via-[#EAE0D1]/20 to-transparent transition-all duration-700 group-hover:h-[90%]"></div>
                                
                                <h2 className="text-[16px] xs:text-[20px] sm:text-[32px] md:text-[38px] font-serif font-semibold text-transparent bg-clip-text bg-gradient-to-b from-[#FDFBF7] via-[#EAE0D1] to-[#B3A086] select-none tracking-[0.2em] xs:tracking-[0.25em] sm:tracking-[0.35em] py-1 xs:py-2 sm:py-4 h-max drop-shadow-2xl mb-2 xs:mb-4 sm:mb-8" style={{ writingMode: 'vertical-rl', filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.9))', WebkitTextStroke: '0.3px rgba(255,255,255,0.15)' }}>
                                    人生使用说明书
                                </h2>
                            </div>
                        </div>

                        {/* Footer / ID */}
                        <div className="mt-2 sm:mt-8 flex flex-col items-center gap-1 shrink-0 w-full">
                             <div className="w-12 xs:w-16 h-px bg-[#D4C4A8]/40" />
                        </div>
                    </div>
                 </div>
            </div>
        ) : (
            /* === INNER PAGE DESIGN (Compact Dossier) === */
            <div className="h-full flex flex-col relative overflow-hidden">
                {/* Background Watermark */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-[20px] border-[#2D1B15]/[0.02] rounded-full pointer-events-none z-0" />

                {/* Spine Shadow */}
                <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[#1A100A]/10 to-transparent pointer-events-none z-20 mix-blend-multiply" />
                
                {/* Only render complex children content if active or adjacent page, to guarantee 60fps buttery-smooth flipping */}
                {Math.abs(index - currentPage) <= 1 ? (
                  <>
                    {/* Header Section - Compact */}
                    <div className="pt-3 px-4 sm:px-5 pb-1 relative z-10 shrink-0">
                        <div className="flex justify-between items-end border-b border-[#8B4513]/25 pb-1.5 mb-1">
                            <div className="flex flex-col">
                                <span className="text-[7.5px] font-mono uppercase tracking-[0.3em] text-[#8B4513]/85 font-semibold">
                                    {t('book_file')} • P. 0{page.pageNumber}
                                </span>
                                <h2 className="text-[18px] sm:text-[21px] font-serif-display text-[#1A0F0A] tracking-tight leading-none mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[235px] xs:max-w-[275px] sm:max-w-[360px] font-bold">
                                    {page.title}
                                </h2>
                            </div>
                            <div className="hidden sm:block text-[7px] font-mono text-[#8B4513]/55 px-1.5 py-0.5 border border-[#8B4513]/15 tracking-widest uppercase">
                                {t('book_confidential')}
                            </div>
                        </div>
                    </div>

                    {/* Content Area - SCROLLABLE with bottom padding - Unlocked with direct gestures */}
                    <div className="flex-1 px-3 sm:px-4 py-1.5 relative z-10 overflow-y-auto custom-book-scrollbar ios-fluid-scroll pb-16 sm:pb-20 touch-action-pan-y overscroll-y-contain pointer-events-auto cursor-default font-serif" style={{ touchAction: 'pan-y' }}>
                        <div className={`w-full min-h-max flex flex-col justify-start transition-all duration-700 ${!isPremium && (page.pageNumber >= 10 || index >= 11) ? 'opacity-[0.85] filter blur-[6px] contrast-125 select-none pointer-events-none grayscale-[20%]' : ''}`}>
                            {page.content && (
                                <div className="px-0 sm:px-1 pt-1 pb-2 flex flex-col justify-start w-full min-h-max space-y-2">
                                    {/* Slim elegant divider */}
                                    <div className="w-full flex items-center justify-center opacity-30 my-1 pb-1">
                                       <div className="w-1.5 h-1.5 rotate-45 border border-[#8B4513]/45 bg-[#8B4513]/5"></div>
                                       <div className="h-[0.5px] w-14 bg-gradient-to-r from-transparent via-[#8B4513] to-transparent mx-3"></div>
                                       <div className="w-1.5 h-1.5 rotate-45 border border-[#8B4513]/45 bg-[#8B4513]/5"></div>
                                    </div>
                                    {renderPageContent(page.content)}
                                </div>
                            )}
	                            {page.visualItems && page.visualItems.length > 0 && (
	                                <VisualRenderer items={page.visualItems} renderCharts={canRenderCharts} />
	                            )}
                        </div>
                    </div>
                    
                    {/* Inline Page Lock Overlay - Positioned outside Content Area for perfect hover/click layering and layout authority */}
                    {isCurrentActive && !isPremium && (page.pageNumber >= 10 || index >= 11) && (
                        <div 
                            className="absolute inset-x-0 bottom-0 top-[60px] xs:top-[68px] sm:top-[78px] z-[120] flex flex-col items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-[4px] transition-all duration-300 pointer-events-auto"
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                        >
                            {/* Infomational Card (No onClick handlers inside to avoid touch prevent-default bug) */}
                            <div 
                                className="bg-gradient-to-b from-[#1c110b]/98 via-[#130b08]/98 to-[#0a0503]/99 border-[1.5px] border-[#D4AF37]/35 p-5 sm:p-6 rounded-2xl flex flex-col items-center shadow-[0_12px_45px_rgba(45,27,21,0.85)] max-w-[285px] sm:max-w-[310px] w-full text-center pointer-events-auto"
                            >
                                <div className="relative mb-3 flex items-center justify-center">
                                    <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-[#D4AF37]/25 opacity-75"></span>
                                    <div className="relative w-9 h-9 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 flex items-center justify-center text-[#D4AF37]">
                                        <Lock size={15} className="animate-pulse" />
                                    </div>
                                </div>
                                <h3 className="text-[#F0E6D2] font-serif font-bold text-sm sm:text-base mb-1 tracking-[0.14em] whitespace-nowrap">命运篇章 · 密电级天运封存</h3>
                                
                                <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent my-1.5" />
                                
                                <p className="text-[#F0E6D2]/75 text-[10.5px] sm:text-[11px] font-medium tracking-wide mb-3 px-1 leading-normal text-center">
                                    您已顺利查阅前 9 卷基础命理推演。<br/>
                                    更关键人生命运密码，正封存于后续 <span className="text-[#D4AF37] font-bold">30卷 终身核心图鉴</span> 里：
                                </p>
                                
                                {/* Bullet points of desires */}
                                <div className="w-full text-left bg-black/35 rounded-xl border border-[#8B4513]/20 px-3 py-2.5 space-y-2 mb-2">
                                    <div className="flex items-start gap-2 text-[10.5px] sm:text-[11px]">
                                        <TrendingUp size={14} className="text-[#D4AF37] mt-0.5 shrink-0" />
                                        <div className="text-[#F0E6D2]/85">
                                            <span className="text-[#D4AF37] font-bold">财富最强潮汐 · 第10页</span>
                                            <p className="text-[#F0E6D2]/60 text-[9.5px] leading-tight">精准定位哪年能爆发，测算金钱涌灌极限</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2 text-[10.5px] sm:text-[11px]">
                                        <Shield size={14} className="text-[#D4AF37] mt-0.5 shrink-0" />
                                        <div className="text-[#F0E6D2]/85">
                                            <span className="text-[#D4AF37] font-bold">避漏财避雷年份 · 第11页</span>
                                            <p className="text-[#F0E6D2]/60 text-[9.5px] leading-tight">洞悉低谷期地磁重装，筑造牢固防空壁垒</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2 text-[10.5px] sm:text-[11px]">
                                        <Users size={14} className="text-[#D4AF37] mt-0.5 shrink-0" />
                                        <div className="text-[#F0E6D2]/85">
                                            <span className="text-[#D4AF37] font-bold">未来10年极品贵人 · 第14页</span>
                                            <p className="text-[#F0E6D2]/60 text-[9.5px] leading-tight">天魁天钺宿命交集，是谁带你破局飞升</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2 text-[10.5px] sm:text-[11px]">
                                        <Sparkles size={14} className="text-[#D4AF37] mt-0.5 shrink-0" />
                                        <div className="text-[#F0E6D2]/85">
                                            <span className="text-[#D4AF37] font-bold">天命业力纠葛 · 第20页</span>
                                            <p className="text-[#F0E6D2]/60 text-[9.5px] leading-tight">追溯代际宿命风暴，彻底斩断内耗心魔</p>
                                        </div>
                                    </div>
                                </div>
                            </div>


                        </div>
                    )}

                        {/* Back to Home Button on Last Page - RITUALISTIC STYLE */}
                        {isLastPage && (
                            <div className="mt-4 flex justify-center pb-8 relative z-50 animate-in slide-in-from-bottom-5 duration-1000">
                                <button 
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
                                    className="group relative px-8 py-3 bg-[#1A0F0A] text-[#F0E6D2] overflow-hidden rounded-sm shadow-lg hover:shadow-2xl transition-all duration-500"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 bg-[#D4AF37] rotate-45" />
                                        <span className="text-[10px] uppercase tracking-[0.3em] font-serif-elegant font-bold">
                                            {t('book_return')}
                                        </span>
                                        <div className="w-1.5 h-1.5 bg-[#D4AF37] rotate-45" />
                                    </div>
                                </button>
                            </div>
                        )}

                    {/* Footer AI Action - Compact Overlay (Hidden on Last Page) - Deleted per user request */}

                    {/* Edge Click Zones (For page turning, kept on edges to allow vertical scrolling in center) */}
                    <button
                        type="button"
                        aria-label="下一页"
                        title="下一页"
                        className="absolute inset-y-0 right-0 w-[32%] sm:w-[34%] z-[20] cursor-e-resize bg-transparent focus:outline-none touch-manipulation" 
                        onClick={(e) => { e.stopPropagation(); onNextPage?.(); }} 
                    />
                    <button
                        type="button"
                        aria-label="上一页"
                        title="上一页"
                        className="absolute inset-y-0 left-0 w-[32%] sm:w-[34%] z-[20] cursor-w-resize bg-transparent focus:outline-none touch-manipulation" 
                        onClick={(e) => { e.stopPropagation(); onPrevPage?.(); }} 
                    />
                  </>
                ) : (
                  /* Elegant, super light background emblem placeholder when page is rendering in virtual background */
                  <div className="m-auto flex flex-col items-center justify-center opacity-[0.08]">
                    <div className="w-10 h-10 border border-[#2D1B15] rotate-45 flex items-center justify-center mb-3">
                      <span className="text-[#2D1B15] text-[10px] select-none -rotate-45 font-mono">0{page.pageNumber}</span>
                    </div>
                    <span className="text-[10px] font-mono tracking-widest text-[#2D1B15] select-none">CHAPTER 0{page.pageNumber}</span>
                  </div>
                )}
            </div>
        )}
        </div>
      </div>
    </div>
  );
});

const LifeBook: React.FC<LifeBookProps> = ({ data, isOpen, isExpanded, initialPage = 0, onExpand, onClose, onReset, isPremium, onRequirePremium, isGenerating, genProgress, generationComplete, onEnterManual }) => {
  const { t, language } = useI18n();
  const totalPages = data.pages.length;
  const normalizedInitialPage = Math.min(Math.max(0, initialPage), Math.max(0, totalPages - 1));
  const [currentPage, setCurrentPage] = useState(normalizedInitialPage); 
  const [isFlipping, setIsFlipping] = useState(false);
  const [lastPage, setLastPage] = useState<number | undefined>(undefined);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const flatPageMode = Boolean(isExpanded && isIOSWebViewLike());

  // Mobile swipe state is stored in refs so finger movement never forces React re-render.
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const touchEndYRef = useRef<number | null>(null);
  const flipTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setCurrentPage((current) => Math.min(Math.max(current, normalizedInitialPage), Math.max(0, totalPages - 1)));
  }, [normalizedInitialPage, totalPages]);

  const finishFlip = (delay = 285) => {
    if (flipTimerRef.current) {
      window.clearTimeout(flipTimerRef.current);
    }
    flipTimerRef.current = window.setTimeout(() => {
      setIsFlipping(false);
      flipTimerRef.current = null;
    }, delay);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.targetTouches[0];
    touchEndXRef.current = null;
    touchEndYRef.current = null;
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const touch = e.targetTouches[0];
    touchEndXRef.current = touch.clientX;
    touchEndYRef.current = touch.clientY;
  };

  const onTouchEnd = () => {
    if (
      touchStartXRef.current === null ||
      touchStartYRef.current === null ||
      touchEndXRef.current === null ||
      touchEndYRef.current === null
    ) return;
    const distanceX = touchStartXRef.current - touchEndXRef.current;
    const distanceY = touchStartYRef.current - touchEndYRef.current;
    const minSwipeDistance = 28;
    if (Math.abs(distanceY) > Math.abs(distanceX) * 0.8) return;
    if (distanceX > minSwipeDistance) {
      nextPage();
    } else if (distanceX < -minSwipeDistance) {
      prevPage();
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchEndXRef.current = null;
    touchEndYRef.current = null;
  };

  const nextPage = () => {
    if (isFlipping) return;
    // Block advancing if we are generating and haven't completed
    if (isGenerating && !generationComplete) {
        return;
    }
    
    // Auto-dismiss the loader state if completing generation via swipe/keyboard
    if (isGenerating && generationComplete && onEnterManual) {
        onEnterManual();
        // and let it flip on the next render or immediately? Allow flip.
    }
    
    // Fixed: Prevent flipping the LAST page (Epilogue) to avoid "Black Screen" back cover
    if (!isExpanded && onExpand) {
        onExpand();
        setTimeout(() => {
            if (currentPage < totalPages - 1) {
                setLastPage(currentPage);
                setIsFlipping(true);
                setCurrentPage(curr => curr + 1);
                finishFlip();
            }
        }, 20);
        return;
    }
    if (currentPage < totalPages - 1) {
        setLastPage(currentPage);
        setIsFlipping(true);
        setCurrentPage(curr => curr + 1);
        finishFlip();
    }
  };

  const prevPage = () => {
    if (isFlipping) return;
    if (currentPage > 0) {
        setLastPage(currentPage);
        setIsFlipping(true);
        setCurrentPage(curr => curr - 1);
        finishFlip();
    }
  };

  const handleClose = () => {
    setCurrentPage(normalizedInitialPage);
    setLastPage(undefined);
    setIsFlipping(false);
    if (onClose) onClose();
  };

  useEffect(() => {
      if (isExpanded === false && currentPage !== 0) {
          setLastPage(currentPage);
          setIsFlipping(true);
          setCurrentPage(0);
          finishFlip(320);
      }
  }, [isExpanded]);

  useEffect(() => {
    return () => {
      if (flipTimerRef.current) {
        window.clearTimeout(flipTimerRef.current);
      }
    };
  }, []);

  const handleAiClick = async (content: string, title: string) => {
      setIsAnalysing(true);
      setAiAnalysis(t('book_deep_computing'));
      try {
          // Force call since backend handles proxy key
          const result = await decodePageContent(content, title, language);
          setAiAnalysis(result);
      } catch (e) {
          setAiAnalysis("Connection Lost.");
      } finally {
          setIsAnalysing(false);
      }
  }

  const handleResetClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowConfirmReset(true);
  }

  const confirmReset = (e: React.MouseEvent) => {
      e.stopPropagation();
      onReset();
  }

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight') nextPage();
        if (e.key === 'ArrowLeft') prevPage();
        if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, currentPage]);

  const currentPageData = data.pages[currentPage];
  const isCurrentPageLocked = !isPremium && currentPageData && (currentPageData.pageNumber >= 10 || currentPage >= 11);
  const visiblePages = useMemo(() => {
    if (flatPageMode) {
      const current = data.pages[currentPage];
      return current ? [{ page: current, index: currentPage }] : [];
    }

    return data.pages
      .map((page, index) => ({ page, index }))
      .filter(({ index }) => {
        if (Math.abs(index - currentPage) <= 2) return true;
        if (isFlipping && lastPage !== undefined && Math.abs(index - lastPage) <= 2) return true;
        return false;
      });
  }, [currentPage, data.pages, flatPageMode, isFlipping, lastPage]);

  if (!isOpen) return null;

  return (
    <div 
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={`relative w-full h-full flex flex-col items-center justify-center ${isExpanded ? 'px-1.5 py-0 sm:px-3' : 'pt-4 pb-2'} overflow-visible`}
    >
      {/* Minimalist book flip buttons - Completely separate on margins to avoid overlap or blocking content view */}
      {currentPage > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); prevPage(); }}
          className="absolute left-2 xs:left-4 sm:left-6 md:left-8 top-1/2 -translate-y-1/2 z-[400] flex items-center justify-center w-8 h-8 rounded-full bg-[#FAF8F5]/30 hover:bg-[#FAF8F5]/85 active:scale-90 border border-[#8B4513]/15 text-[#8B4513]/75 hover:text-[#8B4513] transition-all shadow-[0_2px_10px_rgba(45,27,21,0.08)] pointer-events-auto cursor-pointer focus:outline-none"
          title="上一页"
          aria-label="Previous Page"
        >
          <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {currentPage < totalPages - 1 && !(isGenerating && !generationComplete) && (
        <button
          onClick={(e) => { e.stopPropagation(); nextPage(); }}
          className="absolute right-2 xs:right-4 sm:right-6 md:right-8 top-1/2 -translate-y-1/2 z-[400] flex items-center justify-center w-8 h-8 rounded-full bg-[#FAF8F5]/30 hover:bg-[#FAF8F5]/85 active:scale-90 border border-[#8B4513]/15 text-[#8B4513]/75 hover:text-[#8B4513] transition-all shadow-[0_2px_10px_rgba(45,27,21,0.08)] pointer-events-auto cursor-pointer focus:outline-none"
          title="下一页"
          aria-label="Next Page"
        >
          <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Book Container - Scaled for Viewport using mathematical fluid equations */}
      <div className={`relative select-none mx-auto ${
          flatPageMode
            ? 'book-expanded-container shrink-0'
            : `perspective-2000 animate-in zoom-in-[0.98] will-change-transform ${
                isExpanded 
                  ? 'book-expanded-container shrink-0'
                  : 'w-[280px] sm:w-[300px] md:w-[320px] aspect-[2/3] md:h-[480px]'
              }`
      }`}>
        
        {/* Fake Pages Stack (Depth Effect) */}
        <div className="absolute inset-0 translate-x-1 translate-y-1 bg-[#C8C4B7] rounded-[3px] shadow-sm z-[-1] border border-black/20" />
        <div className="absolute inset-0 translate-x-2 translate-y-2 bg-[#B8B4A7] rounded-[3px] shadow-sm z-[-2] border border-black/20" />

        {/* Back Cover */}
        <div className={`absolute inset-y-0 right-0 md:left-[2px] w-[99%] h-[100%] bg-[#1a1a1a] rounded-r-[3px] shadow-2xl ${flatPageMode ? '' : 'translate-z-[-12px]'}`} />
        
        <div className={`relative w-full h-full ${flatPageMode ? '' : 'preserve-3d'}`}>
            {visiblePages.map(({ page, index }) => (
                <Page 
                    key={index} 
                    page={page} 
                    index={index} 
                    currentPage={currentPage} 
                    totalPages={totalPages}
                    onAiClick={handleAiClick}
                    ownerName={data.ownerName}
                    onClose={handleClose}
                    onNextPage={nextPage}
                    onPrevPage={prevPage}
                    isFlipping={isFlipping}
                    lastPage={lastPage}
                    isPremium={isPremium}
                    onRequirePremium={onRequirePremium}
                    isGenerating={isGenerating}
                    genProgress={genProgress}
                    generationComplete={generationComplete}
                    onEnterManual={onEnterManual}
                    flatMode={flatPageMode}
                />
            ))}
        </div>
      </div>

      {/* Separate confirmation lock floating container - rendered COMPLETELY OUTSIDE the 3D book container to bypass touch target & transform bugs */}
      {isCurrentPageLocked && (
          <div className="w-full max-w-[310px] sm:max-w-[340px] mt-6 px-4 z-[450] relative animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-auto">
              <button
                  type="button"
                  onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("Foolproof 2D separate unlock button clicked outside card boundaries!");
                      onRequirePremium?.();
                  }}
                  onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("Foolproof 2D separate unlock button touched outside card boundaries!");
                      onRequirePremium?.();
                  }}
                  className="w-full bg-gradient-to-r from-[#FFDF00] via-[#D4AF37] to-[#F1C40F] hover:from-[#FFF066] hover:to-[#E5A900] active:scale-95 text-[#1A0F0A] font-extrabold py-3.5 sm:py-4 rounded-xl text-xs sm:text-sm tracking-[0.2em] shadow-[0_8px_32px_rgba(212,175,55,0.45)] border border-amber-300/35 transition-all uppercase cursor-pointer text-center flex items-center justify-center gap-1.5"
              >
                  认证解锁 · 开启天命之书 →
              </button>

          </div>
      )}


        {/* --- BOTTOM ACTIONS --- */}
        {currentPage > 0 && isExpanded && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[110] flex items-center bg-[#0d0a08]/92 border border-[#D4C4A8]/20 backdrop-blur-xl px-3.5 py-1.5 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.8)] pointer-events-auto transition-all duration-300 hover:border-[#D4AF37]/40">
                <button 
                    onClick={handleClose} 
                    className="group text-[#D4C4A8]/85 hover:text-[#FFF9F2] active:scale-95 transition-all text-[10px] font-sans font-medium tracking-[0.16em] select-none focus:outline-none cursor-pointer flex items-center gap-1.5"
                    title="返回首页"
                >
                    <svg className="w-3 h-3 opacity-80 group-hover:opacity-100 transition-opacity stroke-[#D4C4A8] group-hover:stroke-[#FFF9F2]" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    <span>返回首页</span>
                </button>
                <span className="w-[1px] h-2.5 bg-[#D4C4A8]/20 mx-3" />
                <button 
                    onClick={handleResetClick} 
                    className="group text-[#D4C4A8]/55 hover:text-rose-450 active:scale-95 transition-all text-[10px] font-sans font-medium tracking-[0.16em] select-none focus:outline-none cursor-pointer flex items-center gap-1.5"
                    title="重置身份"
                >
                    <svg className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity stroke-[#D4C4A8] group-hover:stroke-rose-400" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                        <path d="M16 3h5v5"/>
                    </svg>
                    <span>重置身份</span>
                </button>
            </div>
        )}

      {/* AI Analysis Overlay */}
      {isAnalysing && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-black border border-emerald-500/30 p-6 max-w-sm text-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                    <div className="text-emerald-400 font-mono text-xs animate-pulse mb-2">{t('book_ai_core')}</div>
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-white/80 text-sm font-serif">{t('book_deep_computing')}</p>
                </div>
          </div>
      )}

      {/* Reset Confirmation Overlay */}
      {showConfirmReset && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in">
                <div className="bg-[#111] border border-red-900/50 p-6 max-w-xs text-center rounded-xl shadow-[0_0_50px_rgba(220,38,38,0.2)]" onClick={e => e.stopPropagation()}>
                    <AlertTriangle size={34} className="text-red-500 mx-auto mb-4" />
                    <h3 className="text-white font-bold text-lg mb-2">{t('book_reset_id')}?</h3>
                    <p className="text-white/60 text-xs mb-6 leading-relaxed">
                        {t('book_reset_warn')}
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowConfirmReset(false)}
                            className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
                        >
                            {t('book_cancel')}
                        </button>
                        <button 
                            onClick={confirmReset}
                            className="flex-1 py-2 rounded-lg bg-red-900/50 hover:bg-red-800 text-white text-xs font-bold border border-red-500/30"
                        >
                            {t('book_confirm_reset')}
                        </button>
                    </div>
                </div>
          </div>
      )}

      {/* Analysis Result Modal */}
      {!isAnalysing && aiAnalysis && (
           <div 
             className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in"
             onClick={() => setAiAnalysis(null)}
           >
                <div 
                    className="bg-[#0A0A0A] border border-white/10 p-8 max-w-md w-full mx-4 shadow-2xl relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                        <span className="text-emerald-500 font-mono text-xs tracking-widest uppercase">
                            {t('book_decoded')}
                        </span>
                        <button onClick={() => setAiAnalysis(null)} className="text-white/30 hover:text-white">✕</button>
                    </div>
                    
                    <p className="text-white/90 text-sm md:text-base font-serif leading-relaxed text-justify">
                        {aiAnalysis}
                    </p>

                    <div className="mt-6 pt-4 border-t border-white/5 flex justify-end">
                        <span className="text-[9px] text-white/30 font-mono">{t('book_powered_by')}</span>
                    </div>
                </div>
           </div>
      )}
    </div>
  );
};

export default LifeBook;
