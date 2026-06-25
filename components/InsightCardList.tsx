
import React, { useState, useEffect, useRef } from 'react';
import { SegmentInsight, EraMeta, UserBaziMeta, ChatMessage } from '../types';
import { generateInsightChatStream } from '../services/geminiService';
import { storage } from '../services/storageService';
import { TrendingUp, CloudRain, RotateCcw, Users, Sparkles, ChevronDown, Send, User, Bot, CornerDownLeft, Activity, Zap, Compass, Check, Target, Info, Lightbulb, BookOpen, MessageSquare, Lock, Scroll, Key, ShieldAlert, ScanFace, Wallet, ArrowRight, Wind, Clock } from 'lucide-react';
import { i18n } from '../services/i18n';



interface InsightCardListProps {
  insight: SegmentInsight | null;
  loading: boolean;
  era: EraMeta;
  user: UserBaziMeta;
  isPremium: boolean;
  onShowPaywall: () => void;
  onShowRevenueForecast?: () => void;
  onShowValuation?: () => void; // New Prop
  onShowLifeBook?: () => void; // New Prop
  onShowDestiny?: () => void; // New Prop
  onShowSmoothSailing?: () => void; // New Prop
}

interface ManualProps {
  isLocked: boolean;
  onClick: () => void;
}

// --- MODULE NEW 1: FACE VALUATION (Spring Special - Redesigned) ---
const FaceValuationModule: React.FC<ManualProps> = ({ isLocked, onClick }) => (
  <div onClick={onClick} className="mx-5 mb-5 relative group cursor-pointer animate-fade-in-up delay-100">
    {/* High-end glowing border effect */}
    <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500 via-fuchsia-500 to-pink-500 rounded-2xl opacity-60 blur-sm group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>

    <div className="relative w-full bg-[#120505] rounded-2xl p-5 flex items-center justify-between overflow-hidden border border-white/5">
      {/* Internal Texture */}
      <div className="absolute inset-0 texture-cubes opacity-10"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 blur-[50px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(225,29,72,0.6)] animate-pulse">
            颜值即正义
          </span>
        </div>
        <h4 className="text-lg font-black text-white italic tracking-wide mb-1 flex items-center gap-2">
          面相估值所
          <ScanFace size={16} className="text-rose-400" />
        </h4>
        <p className="text-[11px] text-rose-200/80 font-medium leading-relaxed">
          别整容了，先看看这张脸值多少压岁钱？<br />
          <span className="text-rose-400 text-[10px] opacity-90 font-bold mt-1 inline-block border-b border-rose-500/30">点击生成你的「颜值资产报告」</span>
        </p>
      </div>

      <div className="relative z-10 pl-4 border-l border-white/10">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-white/20 animate-pulse-fast"></div>
          <Sparkles size={24} className="text-white fill-white relative z-10" />
        </div>
      </div>

      {/* Scanning Effect */}
      <div className="absolute top-0 left-0 w-[2px] h-full bg-white/50 shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-[scan_2s_linear_infinite] opacity-0 group-hover:opacity-100"></div>
    </div>
    <style>{`
        @keyframes scan {
          0% { left: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
      `}</style>
  </div>
);

// --- MODULE NEW 2: INCOME FORECAST (Horse Year - Redesigned) ---
const IncomeForecastModule: React.FC<ManualProps> = ({ isLocked, onClick }) => (
  <div onClick={onClick} className="mx-5 mb-8 relative group cursor-pointer animate-fade-in-up delay-150">
    <div className="relative w-full h-[160px] bg-gradient-to-br from-[#022c22] to-[#064e3b] rounded-2xl p-[1px] shadow-2xl overflow-hidden group-hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all duration-500 transform group-hover:-translate-y-1">
      <div className="bg-[#051111] rounded-[15px] p-5 relative overflow-hidden h-full flex items-center">

        {/* Animated Background */}
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(16,185,129,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%] animate-[shimmer_3s_linear_infinite]"></div>

        <div className="flex-1 relative z-10">
          <div className="flex items-center gap-2 text-emerald-400 mb-1.5">
            <Wallet size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">2026 丙午马年 · 财运前瞻</span>
          </div>
          <h4 className="text-xl font-bold text-white mb-3 leading-tight">
            你有一笔 <span className="text-emerald-400 border-b-2 border-dashed border-emerald-500/50 pb-0.5 mx-1">预估收入</span> 待确认
          </h4>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-900/40 rounded-full text-[10px] text-emerald-300 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>点击揭晓我的身价</span>
          </div>
        </div>

        <div className="relative z-10 ml-4">
          <div className="w-14 h-14 rounded-full border border-emerald-500/30 flex items-center justify-center bg-emerald-900/20 group-hover:bg-emerald-500/20 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <ArrowRight size={24} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
    <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
  </div>
);

// --- MODULE NEW 3: 24H TAILWIND WINDOW (New Addition) ---
const TailwindWindowModule: React.FC<ManualProps> = ({ isLocked, onClick }) => (
  <div onClick={onClick} className="mx-5 mb-10 relative group cursor-pointer animate-fade-in-up delay-400">
    {/* Container - Cyber/Aero Theme */}
    <div className="relative w-full h-[160px] bg-[#0B1120] rounded-2xl border border-cyan-500/30 overflow-hidden flex items-center justify-between p-6 shadow-[0_10px_40px_rgba(6,182,212,0.1)] transform transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_15px_50px_rgba(6,182,212,0.2)] hover:border-cyan-400/50">

      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:20px_20px] [transform:perspective(500px)_rotateX(60deg)] origin-bottom opacity-50 pointer-events-none"></div>

      {/* Moving Particles (Wind) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="absolute h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent w-24 opacity-40 animate-[wind_3s_linear_infinite]"
            style={{ top: `${20 + i * 15}%`, left: `-${20 + i * 10}%`, animationDelay: `${i * 0.5}s`, animationDuration: `${2 + Math.random()}s` }} />
        ))}
      </div>

      {/* Left Content */}
      <div className="relative z-10 flex flex-col justify-center">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.2)]">
            <Wind size={18} className="text-cyan-400" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white tracking-wide leading-none mb-1">24小时顺风窗</h4>
            <span className="text-[9px] text-cyan-500 font-mono uppercase tracking-widest font-bold">TIME SENSITIVE</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed pl-1">
          全天运势最佳时刻捕捉。<br />
          <span className="text-cyan-200/80 font-medium">在对的时间做对的事，事半功倍。</span>
        </p>
      </div>

      {/* Right Side - Clock/Status */}
      <div className="relative z-10 flex flex-col items-end gap-3">
        <div className="relative">
          <Clock size={36} className="text-cyan-500/30" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1 h-3 bg-cyan-400/50 rounded-full origin-bottom animate-spin" style={{ animationDuration: '4s' }}></div>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full border text-[9px] font-bold uppercase tracking-wider backdrop-blur-md ${isLocked ? 'bg-slate-900/80 border-slate-700 text-slate-500' : 'bg-cyan-900/40 border-cyan-500/40 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]'}`}>
          {isLocked ? 'LOCKED' : 'ACTIVE'}
        </div>
      </div>
    </div>
    <style>{`
        @keyframes wind {
           0% { transform: translateX(0); opacity: 0; }
           20% { opacity: 0.6; }
           80% { opacity: 0.6; }
           100% { transform: translateX(400px); opacity: 0; }
        }
      `}</style>
  </div>
);

// --- MODULE 1: LIFE USER MANUAL (ANCIENT BOOK) ---
const LifeUserManual: React.FC<ManualProps> = ({ isLocked, onClick }) => (
  <div onClick={onClick} className="mt-4 mx-5 mb-4 relative group cursor-pointer animate-fade-in-up delay-200 perspective-1000">
    {/* Container with 3D rotation effect on hover */}
    <div className="relative w-full h-[160px] bg-[#1a0f0a] rounded-r-xl rounded-l-sm border-y border-r border-[#5C3A21] shadow-[0_20px_50px_rgba(0,0,0,0.8)] transform transition-transform duration-700 group-hover:rotate-y-[-5deg] group-hover:translate-x-2 flex overflow-hidden">

      {/* Leather Texture Background */}
      <div className="absolute inset-0 texture-leather opacity-60 mix-blend-overlay" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#3d2516] via-[#2A1810] to-[#0f0502]" />

      {/* Book Spine (Left) - Thick 3D look */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#1a0f0a] via-[#4a2c1a] to-[#2A1810] border-r border-[#000]/30 z-20 flex flex-col items-center justify-between py-4 shadow-2xl">
        <div className="w-full h-[2px] bg-[#D97706]/40 shadow-[0_1px_0_rgba(255,255,255,0.1)]" />
        <div className="flex flex-col gap-3 opacity-60">
          <div className="w-8 h-[2px] bg-[#5C3A21]" />
          <div className="w-8 h-[2px] bg-[#5C3A21]" />
          <div className="w-8 h-[2px] bg-[#5C3A21]" />
        </div>
        <div className="w-full h-[2px] bg-[#D97706]/40 shadow-[0_1px_0_rgba(255,255,255,0.1)]" />
      </div>

      {/* Cover Content */}
      <div className="flex-1 ml-12 p-6 relative z-10 flex flex-col justify-center items-center text-center">

        {/* Ornate Corner Decorations */}
        <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-[#D97706]/30 rounded-tr-lg" />
        <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-[#D97706]/30 rounded-br-lg" />

        {/* Title Section */}
        <div className="relative mb-2">
          <div className="absolute -inset-4 bg-black/40 blur-xl rounded-full" />
          <h4 className="relative text-2xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#FDE68A] via-[#F59E0B] to-[#92400E] tracking-[0.2em] text-shadow-sm leading-tight">
            人生使用说明书
          </h4>
        </div>

        <div className="flex items-center gap-3 mt-2">
          <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-[#D97706]" />
          <p className="text-[10px] text-[#A8A29E] font-serif italic tracking-widest opacity-80">
            命运之书
          </p>
          <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-[#D97706]" />
        </div>

        {/* Lock Icon / Status */}
        <div className={`mt-4 px-4 py-1.5 rounded-full flex items-center gap-2 backdrop-blur-sm transition-all ${isLocked ? 'bg-[#000]/60 border border-[#D97706]/30' : 'bg-amber-900/40 border border-amber-500/50'}`}>
          {isLocked ? <Lock size={10} className="text-[#D97706]" /> : <BookOpen size={10} className="text-amber-200" />}
          <span className={`text-[9px] uppercase tracking-wider font-bold ${isLocked ? 'text-[#D97706]' : 'text-amber-100'}`}>
            {isLocked ? '绝密档案 · 仅供本人阅览' : '已解锁 · 点击阅读'}
          </span>
        </div>
      </div>

      {/* Particle Effects (Dust) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] left-[40%] w-1 h-1 bg-[#FDE68A] rounded-full animate-ping opacity-20" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[30%] right-[20%] w-1 h-1 bg-[#FDE68A] rounded-full animate-ping opacity-10" style={{ animationDuration: '5s', animationDelay: '1s' }} />
      </div>

      {/* Light Sweep Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
    </div>

    {/* Bottom Shadow/Glow */}
    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[90%] h-6 bg-amber-900/40 blur-xl rounded-full opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
  </div>
);

// --- MODULE 2: FATE ALTERATION MANUAL (MYSTIC SCROLL) ---
const FateAlterationManual: React.FC<ManualProps> = ({ isLocked, onClick }) => (
  <div onClick={onClick} className="mx-5 mb-8 relative group cursor-pointer animate-fade-in-up delay-300">
    {/* Container */}
    <div className="relative w-full h-[160px] bg-[#0c0a1a] rounded-xl border border-purple-500/30 shadow-[0_0_60px_rgba(88,28,135,0.15)] overflow-hidden flex flex-col items-center justify-center transform transition-all duration-500 hover:scale-[1.01] hover:shadow-[0_0_80px_rgba(147,51,234,0.2)]">

      {/* Background Texture - Hex / Rune */}
      <div className="absolute inset-0 texture-dark-matter opacity-40 mix-blend-color-dodge" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#1e1b4b] via-[#0f0720] to-black opacity-90" />

      {/* Animated Glow Orbs */}
      <div className="absolute top-[-50%] left-[-20%] w-[80%] h-[200%] bg-purple-600/10 blur-[80px] rounded-full animate-pulse-slow pointer-events-none" />
      <div className="absolute bottom-[-50%] right-[-20%] w-[80%] h-[200%] bg-indigo-600/10 blur-[80px] rounded-full animate-pulse-slow pointer-events-none" style={{ animationDelay: '2s' }} />

      {/* Decorative Border Frame */}
      <div className="absolute inset-2 border border-white/5 rounded-lg pointer-events-none">
        <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-purple-500/50 rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-purple-500/50 rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-purple-500/50 rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-purple-500/50 rounded-br-lg" />
      </div>

      {/* Center Content */}
      <div className="relative z-10 text-center flex flex-col items-center">

        {/* Icon / Emblem */}
        <div className="mb-3 relative">
          <div className="absolute inset-0 bg-purple-500 blur-xl opacity-30 animate-pulse" />
          <Scroll size={32} className="text-purple-300 relative z-10 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
          <Sparkles size={14} className="text-white absolute -top-2 -right-3 animate-ping" style={{ animationDuration: '3s' }} />
        </div>

        {/* Title */}
        <h4 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-fuchsia-200 to-indigo-200 tracking-[0.3em] mb-2 text-shadow-lg filter drop-shadow-sm">
          改命秘籍
        </h4>

        {/* Subtitle / Divider */}
        <div className="flex items-center gap-3 mb-4 opacity-80">
          <div className="w-6 h-[1px] bg-gradient-to-r from-transparent to-purple-500" />
          <p className="text-[10px] text-indigo-300 font-bold tracking-widest uppercase">
            改命 · 胜天半子
          </p>
          <div className="w-6 h-[1px] bg-gradient-to-l from-transparent to-purple-500" />
        </div>

        {/* Status Button */}
        <div className={`px-5 py-1.5 rounded-full flex items-center gap-2 border transition-all duration-300 ${isLocked ? 'bg-black/60 border-purple-500/30 text-purple-400' : 'bg-purple-900/30 border-purple-400/50 text-purple-100 shadow-[0_0_20px_rgba(168,85,247,0.3)]'}`}>
          {isLocked ? <ShieldAlert size={12} /> : <Key size={12} />}
          <span className="text-[9px] font-bold tracking-widest">
            {isLocked ? '禁忌之术 · 需权限开启' : '秘籍已开启 · 立即修习'}
          </span>
        </div>
      </div>

      {/* Scanning Line Effect */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-0 group-hover:opacity-100 group-hover:top-[100%] transition-all duration-1000 ease-linear" />
    </div>
  </div>
);

export const InsightCardList: React.FC<InsightCardListProps> = ({ insight, loading, era, user, isPremium, onShowPaywall, onShowRevenueForecast, onShowValuation, onShowLifeBook, onShowDestiny, onShowSmoothSailing }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New state for Chat Collapsing
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [chatHistory, setChatHistory] = useState<Record<string, ChatMessage[]>>({});
  const [chatInputs, setChatInputs] = useState<Record<string, string>>({});
  const [chatLoading, setChatLoading] = useState<Record<string, boolean>>({});

  const chatScrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Initialize from storage on mount
  useEffect(() => {
    const savedChats = storage.getChats();
    if (savedChats) {
      setChatHistory(savedChats);
    }
  }, []);

  // Helper to update and save chat
  const updateChatHistory = (tabId: string, messages: ChatMessage[]) => {
    const newHistory = { ...chatHistory, [tabId]: messages };
    setChatHistory(newHistory);
    storage.saveChats(newHistory);
  };

  // Reset chat open state when changing tabs or new insight loads
  useEffect(() => {
    setIsChatOpen(false);
  }, [expandedId, insight]);

  useEffect(() => {
    if (expandedId && isChatOpen) {
      const scrollContainer = chatScrollRefs.current[expandedId];
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [chatHistory, expandedId, chatLoading, isChatOpen]);

  const toggleExpand = (id: string) => {
    // LOCK LOGIC: Modules 'mood', 'pattern', 'cluster' (Q2-Q4) require premium
    if (['mood', 'pattern', 'cluster'].includes(id) && !isPremium) {
      onShowPaywall();
      return;
    }
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleSendChat = async (tabId: string, manualText?: string) => {
    const input = manualText || chatInputs[tabId];
    if (!input || !insight) return;

    // Auto-open chat if sending a message via quick prompt
    if (!isChatOpen) setIsChatOpen(true);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    const updatedHistory = [...(chatHistory[tabId] || []), userMsg];
    updateChatHistory(tabId, updatedHistory);

    setChatInputs(prev => ({ ...prev, [tabId]: '' }));

    const aiMsgId = (Date.now() + 1).toString();
    const initialAiMsg: ChatMessage = {
      id: aiMsgId,
      role: 'ai',
      text: '',
      timestamp: Date.now()
    };

    const historyWithAi = [...updatedHistory, initialAiMsg];
    updateChatHistory(tabId, historyWithAi);

    setChatLoading(prev => ({ ...prev, [tabId]: false }));

    try {
      const tabLabel = tabs.find(t => t.id === tabId)?.label || 'General';
      const stream = generateInsightChatStream(tabLabel, input, insight, user);

      let accumulatedText = "";

      for await (const chunk of stream) {
        accumulatedText += chunk;
        const currentHistory = historyWithAi.map(msg =>
          msg.id === aiMsgId ? { ...msg, text: accumulatedText } : msg
        );
        updateChatHistory(tabId, currentHistory);
      }

    } catch (e) {
      console.error("Streaming error", e);
    }
  };

  // Helper to clean and format AI text
  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Remove ** symbols
      const cleanLine = line.replace(/\*\*/g, '').trim();
      if (!cleanLine) return <div key={i} className="h-2" />; // Spacing for empty lines
      return (
        <div key={i} className="mb-1.5 last:mb-0">
          {cleanLine}
        </div>
      );
    });
  };

  const tabs = [
    {
      id: 'stage',
      label: i18n.t('card.stage'),
      fullLabel: `${i18n.t('card.stage')} · Positioning`,
      icon: TrendingUp,
      index: '01',
      quickPrompts: [i18n.t('qp.1'), i18n.t('qp.2'), i18n.t('qp.3')]
    },
    {
      id: 'mood',
      label: i18n.t('card.mood'),
      fullLabel: `${i18n.t('card.mood')} · Mood`,
      icon: CloudRain,
      index: '02',
      quickPrompts: [i18n.t('qp.4'), i18n.t('qp.5')]
    },
    {
      id: 'pattern',
      label: i18n.t('card.pattern'),
      fullLabel: `${i18n.t('card.pattern')} · Patterns`,
      icon: RotateCcw,
      index: '03',
      quickPrompts: [i18n.t('qp.6'), i18n.t('qp.7')]
    },
    {
      id: 'cluster',
      label: i18n.t('card.cluster'),
      fullLabel: `${i18n.t('card.cluster')} · Cluster`,
      icon: Users,
      index: '04',
      quickPrompts: [i18n.t('qp.8'), i18n.t('qp.9')]
    },
  ] as const;

  const handleManualClick = () => {
    if (!isPremium) {
      onShowPaywall();
    } else {
      // Future functionality for premium users
      // For now, it stays on page as per instruction to just be an "entry point"
    }
  };

  return (
    <div className="pb-12">
      <div className="mx-5 space-y-4">
      </div>

      {/* New Module 1: Face Valuation */}
      <FaceValuationModule
        isLocked={!isPremium}
        onClick={() => {
          if (onShowValuation) {
            onShowValuation();
          } else {
            handleManualClick();
          }
        }}
      />

      {/* New Module 2: Income Forecast */}
      <IncomeForecastModule
        isLocked={!isPremium}
        onClick={() => {
          if (onShowRevenueForecast) {
            onShowRevenueForecast();
          } else {
            handleManualClick();
          }
        }}
      />
    </div>
  );
};
