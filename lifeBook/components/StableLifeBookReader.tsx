import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LifeBookData, LifeBookPageData, VisualItem } from '../types';

interface StableLifeBookReaderProps {
  data: LifeBookData;
  onClose: () => void;
  isPremium?: boolean;
  onRequirePremium?: () => void;
}

const splitParagraphs = (content: string) =>
  content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const visualValue = (item: VisualItem) => {
  if (item.value === undefined || item.value === null) return '';
  return String(item.value);
};

const SimpleVisualItem: React.FC<{ item: VisualItem }> = ({ item }) => {
  const value = visualValue(item);

  if (item.type === 'separator') {
    return (
      <div className="col-span-2 flex items-center justify-center py-2">
        <div className="h-px w-12 bg-gradient-to-r from-transparent via-[#8B4513]/35 to-transparent" />
      </div>
    );
  }

  if (item.type === 'quote') {
    return (
      <div className="col-span-2 rounded-md border border-[#8B4513]/15 bg-[#FBF8F1] px-4 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        <p className="font-serif text-[13px] leading-relaxed text-[#22150F]">{value}</p>
        {item.subtext && <p className="mt-1 text-[9px] tracking-[0.22em] text-[#8B4513]/65">{item.subtext}</p>}
      </div>
    );
  }

  if (item.type === 'stat' || item.type === 'dial') {
    const percentage = Math.min(100, Math.max(0, Number(item.value) || 0));
    return (
      <div className="rounded-md border border-[#8B4513]/15 bg-[#FCFAF5] p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] font-bold tracking-[0.2em] text-[#8B4513]/75">{item.label}</span>
          <span className="font-mono text-[12px] font-bold text-[#1A0F0A]">{value}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#8B4513]/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#6E3F20] to-[#D4AF37]"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {item.subtext && <p className="mt-1.5 text-[9.5px] leading-snug text-[#6E584F]">{item.subtext}</p>}
      </div>
    );
  }

  if (item.type === 'list' || item.type === 'tag') {
    return (
      <div className="rounded-md border border-[#8B4513]/15 bg-[#FCFAF5] px-3 py-2">
        {item.label && <div className="text-[8px] font-bold tracking-[0.2em] text-[#8B4513]/75">{item.label}</div>}
        <div className="mt-1 font-serif text-[12px] font-bold leading-relaxed text-[#1A0F0A]">{value}</div>
        {item.subtext && <div className="mt-1 text-[9px] leading-snug text-[#6E584F]">{item.subtext}</div>}
      </div>
    );
  }

  if (item.type === 'bazi_chart' || item.type === 'matrix' || item.type === 'hexagram_card' || item.type === 'checklist') {
    return (
      <div className="col-span-2 rounded-md border border-[#8B4513]/15 bg-[#FCFAF5] p-3">
        {item.label && <div className="mb-1 text-[8px] font-bold tracking-[0.22em] text-[#8B4513]/75">{item.label}</div>}
        <p className="font-serif text-[12px] leading-relaxed text-[#1A0F0A] whitespace-pre-wrap">{value || item.subtext}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[#8B4513]/15 bg-[#FCFAF5] p-3">
      {item.label && <div className="text-[8px] font-bold tracking-[0.2em] text-[#8B4513]/75">{item.label}</div>}
      <div className="mt-1 font-serif text-[12px] font-bold leading-relaxed text-[#1A0F0A]">{value}</div>
      {item.subtext && <div className="mt-1 text-[9px] leading-snug text-[#6E584F]">{item.subtext}</div>}
    </div>
  );
};

const PageBody: React.FC<{ page: LifeBookPageData; locked: boolean }> = ({ page, locked }) => {
  const paragraphs = useMemo(() => splitParagraphs(page.content || ''), [page.content]);

  return (
    <div className={`min-h-full transition-opacity duration-200 ${locked ? 'blur-[5px] opacity-70 select-none pointer-events-none' : ''}`}>
      <div className="flex items-center justify-center py-2 opacity-40">
        <div className="h-1.5 w-1.5 rotate-45 border border-[#8B4513]/60" />
        <div className="mx-3 h-px w-16 bg-gradient-to-r from-transparent via-[#8B4513] to-transparent" />
        <div className="h-1.5 w-1.5 rotate-45 border border-[#8B4513]/60" />
      </div>

      <div className="space-y-3">
        {paragraphs.map((paragraph, index) => {
          const bullet = paragraph.match(/^[-*•]\s*(.+)$/);
          if (bullet) {
            return (
              <div key={`${page.pageNumber}-bullet-${index}`} className="flex gap-2 border-l-2 border-[#8B4513]/25 pl-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rotate-45 bg-[#8B4513]/65" />
                <p className="font-serif text-[13px] leading-[1.85] text-[#24150D]">{bullet[1]}</p>
              </div>
            );
          }

          return (
            <p
              key={`${page.pageNumber}-paragraph-${index}`}
              className="font-serif text-[13px] leading-[1.9] tracking-wide text-[#24150D] text-justify indent-[1.5em]"
            >
              {paragraph}
            </p>
          );
        })}
      </div>

      {page.visualItems && page.visualItems.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 pb-8">
          {page.visualItems.map((item, index) => (
            <SimpleVisualItem key={`${page.pageNumber}-visual-${index}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

export const StableLifeBookReader: React.FC<StableLifeBookReaderProps> = ({
  data,
  onClose,
  isPremium = false,
  onRequirePremium,
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const totalPages = data.pages.length;
  const page = data.pages[Math.min(pageIndex, Math.max(0, totalPages - 1))];
  const locked = Boolean(!isPremium && page && (page.pageNumber >= 10 || pageIndex >= 11));

  const goPrev = () => setPageIndex((current) => Math.max(0, current - 1));
  const goNext = () => setPageIndex((current) => Math.min(totalPages - 1, current + 1));
  const requestPremium = (event?: React.MouseEvent | React.TouchEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    onRequirePremium?.();
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pageIndex]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, []);

  if (!page) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#030303] text-[#D4C4A8]">
        <button onClick={onClose} className="rounded-full border border-[#D4C4A8]/25 px-5 py-2 text-xs tracking-[0.2em]">
          返回
        </button>
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-[#030303] text-[#1A0F0A]"
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchEnd={(event) => {
        if (!touchStart.current) return;
        const touch = event.changedTouches[0];
        const dx = touch.clientX - touchStart.current.x;
        const dy = touch.clientY - touchStart.current.y;
        touchStart.current = null;
        if (Math.abs(dx) < 44 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        if (dx < 0) goNext();
        if (dx > 0) goPrev();
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(212,175,55,0.11),transparent_34%),linear-gradient(180deg,#070504_0%,#030303_100%)]" />

      <div className="absolute left-0 right-0 z-30 flex items-center justify-between px-4" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-[#D4C4A8]/20 bg-[#0d0a08]/86 px-3 py-1.5 text-[11px] tracking-[0.18em] text-[#D4C4A8]/85 active:scale-95"
        >
          返回
        </button>
        <div className="rounded-full border border-[#D4C4A8]/15 bg-[#0d0a08]/76 px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] text-[#D4C4A8]/65">
          {String(page.pageNumber).padStart(2, '0')} / {String(totalPages).padStart(2, '0')}
        </div>
      </div>

      <main className="relative z-10 flex h-full w-full items-center justify-center px-3 pb-[calc(env(safe-area-inset-bottom,0px)+64px)] pt-[calc(env(safe-area-inset-top,0px)+56px)]">
        <section className="relative h-full w-full max-w-[430px] overflow-hidden rounded-[4px] border border-[#D4C4A8]/20 bg-[#F8F3E8] shadow-[0_26px_80px_rgba(0,0,0,0.7),inset_0_0_0_1px_rgba(255,255,255,0.5)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(45,27,21,0.13),transparent_7%,transparent_93%,rgba(45,27,21,0.10)),linear-gradient(rgba(139,69,19,0.025)_1px,transparent_1px)] bg-[size:100%_100%,18px_18px]" />

          <header className="relative z-10 border-b border-[#8B4513]/20 px-5 pb-3 pt-4">
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="font-mono text-[8px] font-bold uppercase tracking-[0.28em] text-[#8B4513]/75">
                LIFE FILE · P.{String(page.pageNumber).padStart(2, '0')}
              </span>
              <span className="hidden rounded-sm border border-[#8B4513]/15 px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-[0.18em] text-[#8B4513]/50 xs:inline">
                confidential
              </span>
            </div>
            <h1 className="truncate font-serif text-[20px] font-black leading-tight tracking-wide text-[#1A0F0A]">
              {page.title}
            </h1>
            {page.subtitle && (
              <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.22em] text-[#8B4513]/60">
                {page.subtitle}
              </p>
            )}
          </header>

          <div
            ref={scrollRef}
            className="relative z-10 h-[calc(100%-82px)] overflow-y-auto px-5 pb-8 pt-2 [-webkit-overflow-scrolling:touch]"
          >
            <PageBody page={page} locked={locked} />
          </div>

          {locked && (
            <div className="absolute inset-x-5 bottom-6 z-20 rounded-2xl border border-[#D4AF37]/35 bg-[#130b08]/95 p-4 text-center shadow-[0_14px_45px_rgba(0,0,0,0.55)]">
              <h2 className="font-serif text-[14px] font-bold tracking-[0.12em] text-[#F0E6D2]">命运篇章 · 密电级天运封存</h2>
              <p className="mt-2 text-[11px] leading-relaxed text-[#F0E6D2]/72">后续核心篇章需要认证解锁后继续查阅。</p>
              <button
                type="button"
                onClick={requestPremium}
                onTouchEnd={requestPremium}
                className="mt-3 w-full rounded-xl bg-gradient-to-r from-[#F1C40F] via-[#D4AF37] to-[#FFE46B] py-3 text-[12px] font-black tracking-[0.18em] text-[#1A0F0A] active:scale-[0.98]"
              >
                认证解锁 · 开启天命之书
              </button>
            </div>
          )}
        </section>
      </main>

      <button
        type="button"
        aria-label="上一页"
        onClick={goPrev}
        disabled={pageIndex === 0}
        className="absolute inset-y-24 left-0 z-20 w-[28%] bg-transparent disabled:pointer-events-none"
      />
      <button
        type="button"
        aria-label="下一页"
        onClick={goNext}
        disabled={pageIndex >= totalPages - 1}
        className="absolute inset-y-24 right-0 z-20 w-[28%] bg-transparent disabled:pointer-events-none"
      />

      <nav className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-center gap-5 border-t border-[#D4C4A8]/10 bg-[#050403]/92 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] pt-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={pageIndex === 0}
          className="rounded-full border border-[#D4C4A8]/18 px-5 py-2 text-[11px] tracking-[0.2em] text-[#D4C4A8]/75 disabled:opacity-25 active:scale-95"
        >
          上一页
        </button>
        <div className="h-1.5 w-1.5 rotate-45 bg-[#D4AF37]/70" />
        <button
          type="button"
          onClick={goNext}
          disabled={pageIndex >= totalPages - 1}
          className="rounded-full border border-[#D4C4A8]/18 px-5 py-2 text-[11px] tracking-[0.2em] text-[#D4C4A8]/75 disabled:opacity-25 active:scale-95"
        >
          下一页
        </button>
      </nav>
    </div>
  );
};

export default StableLifeBookReader;
