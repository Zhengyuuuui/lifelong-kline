
import React, { useState, useRef, useEffect } from 'react';
import { ValuationResult } from '../types';
import { Share2, RefreshCw, Zap, Calculator, BarChart3, Fingerprint, Sparkles, Crown, Save, Briefcase, Gem, MapPin, Terminal, X, CornerUpRight, AlertTriangle, Battery, Compass, Palette, Coffee, Eye, Infinity as InfinityIcon, Heart, Download, CheckCircle, Timer } from 'lucide-react';
import html2canvas from 'html2canvas';
import { formatLocalDateKey } from '../../lifeBook/utils/astrologyEngine';

interface ResultCardProps {
  result: ValuationResult;
  imageSrc: string;
  onRetake: () => void;
  onUpgrade: () => void;
}

const UPGRADE_SHARE_TEMPLATES = [
    {
        id: 'A',
        title: '版本 A (凡尔赛)',
        heading: '《关于我靠朋友众筹买下汤臣一品这件事》',
        body: '系统说我命不好？直接改代码！现在的我，强得可怕。'
    },
    {
        id: 'B',
        title: '版本 B (感谢信)',
        heading: '《我的脸是 @张三 @李四 给的》',
        body: '经过众筹整容，我也算是“后天富豪”了。感谢榜上大哥刷的火箭！'
    },
    {
        id: 'C',
        title: '版本 C (嘲讽系统)',
        heading: '《氪金改命，最为致命》',
        body: '只要朋友够多，没有我改不了的命。这就是人民币玩家的快乐吗？'
    }
];

const ResultCard: React.FC<ResultCardProps> = ({ result, imageSrc, onRetake, onUpgrade }) => {
  // Printing Animation State
  const [isPrinting, setIsPrinting] = useState(true);
  const [printStep, setPrintStep] = useState(0); // 0: Init, 1: Printing, 2: Done

  const [showCalc, setShowCalc] = useState(false);
  const [calcResult, setCalcResult] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Share Verification State
  const [showShareGuide, setShowShareGuide] = useState(false);
  const [hasActuallyLeft, setHasActuallyLeft] = useState(false);
  const [isWaitingForReturn, setIsWaitingForReturn] = useState(false);
  const [shareCountdown, setShareCountdown] = useState(10); // 10s Auto Unlock

  // Upgrade Logic
  const [showUpgradeInjection, setShowUpgradeInjection] = useState(false);
  const [injectionProgress, setInjectionProgress] = useState(0);
  const [showUpgradeShareStation, setShowUpgradeShareStation] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('A');

  const receiptRef = useRef<HTMLDivElement>(null);
  const upgradeSectionRef = useRef<HTMLDivElement>(null);
  const upgradeCardRef = useRef<HTMLDivElement>(null);
  const crowdFundRef = useRef<HTMLDivElement>(null);

  // Easter Egg: Banana Yellow Theme
  const isBananaMode = result.expansion.isRareCombination;
  const themeColor = isBananaMode ? 'bg-yellow-400' : 'bg-white';
  const textColor = isBananaMode ? 'text-black' : 'text-black';
  const accentColor = isBananaMode ? 'border-black' : 'border-black';

  // Format Bank Balance
  const formatBankBalance = (num: number) => {
    if (result.formattedValue.includes('亿')) {
        return { integerPart: result.formattedValue, decimalPart: "" };
    }
    const parts = num.toFixed(2).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const decimalPart = parts[1];
    return { integerPart, decimalPart };
  };

  const { integerPart, decimalPart } = formatBankBalance(result.score);

  // --- PRINTER EFFECT LOGIC ---
  useEffect(() => {
    // Sequence:
    // 0ms: Init (Hidden inside machine)
    // 100ms: Start Printing (Slide Up)
    // 2500ms: Finish (Stop vibration, show controls)
    const t1 = setTimeout(() => setPrintStep(1), 100);
    const t2 = setTimeout(() => {
        setPrintStep(2);
        setIsPrinting(false);
    }, 2500);

    return () => {
        clearTimeout(t1);
        clearTimeout(t2);
    };
  }, []);

  // Visibility Listener
  useEffect(() => {
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && isWaitingForReturn) {
            setHasActuallyLeft(true);
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isWaitingForReturn]);

  // Auto Unlock Timer
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (showShareGuide && shareCountdown > 0) {
        timer = setTimeout(() => setShareCountdown(prev => prev - 1), 1000);
    } else if (showShareGuide && shareCountdown === 0) {
        handleManualShareConfirm(true);
    }
    return () => clearTimeout(timer);
  }, [showShareGuide, shareCountdown]);

  // Upgrade Injection
  useEffect(() => {
      if (result.isUpgraded && result.upgradeData) {
          setShowUpgradeInjection(true);
          let p = 0;
          const timer = setInterval(() => {
              p += 5;
              setInjectionProgress(p);
              if (p >= 100) {
                  clearInterval(timer);
                  setTimeout(() => {
                    setShowUpgradeInjection(false);
                    upgradeSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }, 800);
              }
          }, 50);
      }
  }, [result.isUpgraded]);

  const handleCalculator = () => {
    const funnyEquivalents = [
        `≈ ${Math.floor(result.score / 200)} 次KTV免单`,
        `≈ ${Math.floor(result.score / 50)} 斤麻辣小龙虾`,
        `≈ ${Math.floor(result.score / 200000)} 个爱马仕铂金包`,
        `≈ ${Math.floor(result.score / 6)} 瓶快乐肥宅水`,
        "≈ 0.0001% 个马斯克",
        "≈ 无价之宝 (系统算不过来了)"
    ];
    setCalcResult(funnyEquivalents[Math.floor(Math.random() * funnyEquivalents.length)]);
    setShowCalc(true);
  };

  const handleSaveImage = async () => {
    if (!receiptRef.current) return;
    setIsSaving(true);
    try {
        const canvas = await html2canvas(receiptRef.current, {
            useCORS: true,
            scale: 2,
            backgroundColor: '#0a0a0a',
        });
        
        const link = document.createElement('a');
        link.download = `FaceValue_${new Date().getTime()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (err) {
        console.error("Save failed", err);
        alert("保存失败，请截图保存");
    }
    setIsSaving(false);
  };

  const handleSaveUpgradeCard = async () => {
    if (!upgradeCardRef.current) return;
    try {
        const canvas = await html2canvas(upgradeCardRef.current, {
            useCORS: true,
            scale: 2,
            backgroundColor: '#000000',
        });
        const link = document.createElement('a');
        link.download = `GodMode_${new Date().getTime()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (err) {
        console.error("Save failed", err);
    }
  };

  const handleShareTrigger = async () => {
      setShowShareGuide(true);
      setHasActuallyLeft(false); 
      setIsWaitingForReturn(false);
      setShareCountdown(10);
  };

  const handleGoToShare = () => {
      setIsWaitingForReturn(true);
      if (navigator.share) {
          navigator.share({
              title: '颜值众筹计划',
              text: `我的颜值估值${result.formattedValue}，急需众筹换头！`,
              url: window.location.href
          }).catch(() => {});
      }
  };

  const handleManualShareConfirm = (force = false) => {
      if (!hasActuallyLeft && !force) {
          alert("系统检测到您未完成分享操作。\n请点击右上角 '...' 发送给朋友，或切换应用分享，系统将自动检测返回状态。");
          return;
      }
      setShowShareGuide(false);
      if (!result.isUpgraded) {
          onUpgrade();
      }
  };

  const getIcon = (name: string) => {
      switch(name) {
          case 'Zap': return <Zap size={20} className="text-[#39FF14]" />;
          case 'Eye': return <Eye size={20} className="text-[#39FF14]" />;
          case 'Infinity': return <InfinityIcon size={20} className="text-[#39FF14]" />;
          case 'Heart': return <Heart size={20} className="text-[#39FF14]" />;
          default: return <Zap size={20} />;
      }
  };

  return (
    <div className={`h-full w-full bg-[#0a0a0a] flex flex-col relative ${isBananaMode ? 'font-comic' : ''} overflow-hidden`}>
      
      {/* --- SCROLLABLE RECEIPT AREA --- */}
      {/* 
          1. pb-[320px]:  Critical padding to ensure the receipt can scroll completely out of the printer visual.
          2. transition-transform: Controls the "extrusion" animation.
      */}
      <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth relative z-10">
          <div 
             className={`w-full min-h-screen transition-all duration-2500 ease-receipt pb-[320px] pt-8 ${
                 printStep === 0 
                    ? 'translate-y-[100vh]' // Start deep inside printer
                    : 'translate-y-0'      // Extrude to normal position
             }`}
          >
            {/* The Receipt Itself - UNTOUCHED CONTENT */}
            <div ref={receiptRef} className={`relative w-full ${themeColor} ${textColor} font-mono-tech p-1 pb-10 shadow-[0_0_50px_rgba(255,255,255,0.1)]`}>
                
                {/* Receipt Jagged Top */}
                <div className={`absolute top-0 left-0 w-full h-2 bg-[radial-gradient(circle,transparent_4px,${isBananaMode ? '#facc15' : '#fff'}_4px)] bg-[length:16px_16px] -mt-2 rotate-180`}></div>
                
                {/* 1. HEADER LOG */}
                <div className={`pt-6 pb-4 px-4 text-center border-b-2 border-dashed ${accentColor}`}>
                    <div className="flex justify-between items-end mb-2">
                        <Fingerprint size={32} />
                        <div className="text-right">
                            <p className="text-[10px]">NO. {Math.random().toString().substr(2,8)}</p>
                            <p className="text-[10px]">{formatLocalDateKey()}</p>
                        </div>
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter uppercase mb-1">颜值资产结算单</h1>
                    <p className="text-[10px] tracking-[0.2em] uppercase">South Heaven Gate · Exchange</p>
                </div>

                {/* 2. IMAGE & MAIN VALUE */}
                <div className={`p-4 flex flex-col items-center gap-4 border-b-2 border-dashed ${accentColor}`}>
                    {/* Image Frame */}
                    <div className="w-48 h-56 bg-black p-1 rotate-1 shadow-xl">
                        <img src={imageSrc} className="w-full h-full object-cover grayscale-0" alt="Face" />
                    </div>
                    
                    {/* The Price Tag */}
                    <div className="text-center w-full mt-2">
                        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">你的颜值变现</p>
                        
                        <div className="flex items-baseline justify-center font-sans tracking-tight">
                            <span className="text-2xl font-bold mr-1">¥</span>
                            <span className="text-5xl font-black">{integerPart}</span>
                            {decimalPart && <span className="text-2xl font-bold opacity-60">.{decimalPart}</span>}
                        </div>

                        {/* Anchor */}
                        <div className="bg-black text-white p-3 rotate-[-1deg] mt-4 shadow-lg max-w-[95%] mx-auto">
                            <p className="text-sm font-bold border-b border-white/20 pb-1 mb-1">{result.anchor.text}</p>
                            <p className="text-[10px] opacity-80 leading-tight">"{result.anchor.comment}"</p>
                        </div>
                    </div>
                </div>

                {/* 3. INGREDIENTS LIST */}
                <div className={`p-4 border-b-2 border-dashed ${accentColor}`}>
                    <div className="flex items-center gap-2 mb-3">
                        <BarChart3 size={16} />
                        <h3 className="font-bold text-sm uppercase">颜值成分分析</h3>
                    </div>
                    <div className="space-y-2 font-mono text-xs">
                        {result.ingredients.map((ing, i) => (
                            <div key={i} className="flex justify-between items-end">
                                <span className="uppercase">{ing.name}</span>
                                <div className="flex-1 mx-2 border-b border-dotted border-gray-400 mb-1"></div>
                                <span className="font-bold">{ing.percentage}%</span>
                            </div>
                        ))}
                        <div className={`flex justify-between items-end mt-2 pt-2 border-t ${accentColor}`}>
                            <span className="uppercase font-bold">TOTAL CHAOS</span>
                            <span className="font-bold">100%</span>
                        </div>
                    </div>
                </div>

                {/* 4. CREATOR NOTE */}
                <div className={`p-4 border-b-2 border-dashed ${accentColor} ${isBananaMode ? 'bg-yellow-200' : 'bg-gray-50'}`}>
                    <h3 className="font-bold text-sm uppercase mb-2 flex items-center gap-2">
                        <Sparkles size={14} className="text-purple-600" />
                        女娲造人记录
                    </h3>
                    <div className="relative pl-4 border-l-2 border-purple-600">
                        <p className="text-xs font-bold text-purple-900 mb-1">[{result.creatorNote.title}]</p>
                        <p className="text-xs italic text-gray-700 leading-relaxed font-serif-display">
                            {result.creatorNote.content}
                        </p>
                    </div>
                </div>

                {/* 5. ORIGINAL DATA */}
                <div className={`p-4 grid grid-cols-2 gap-4 border-b-2 border-dashed ${accentColor}`}>
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase mb-1">RADAR</p>
                        <div className="space-y-1">
                            {Object.entries(result.radar).slice(0,3).map(([key, val]) => (
                                <div key={key} className="flex items-center gap-1">
                                    <span className="text-[9px] w-10 uppercase">{key}</span>
                                    <div className="flex-1 h-1 bg-gray-200">
                                        <div className="h-full bg-black" style={{width: `${val}%`}}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase mb-1">TAGS</p>
                        <div className="flex flex-wrap gap-1">
                            {result.tags.slice(0,2).map((t,i) => (
                                <span key={i} className="text-[9px] bg-black text-white px-1 py-0.5">
                                    {t.name}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 6. EXPANSION PACK (ENHANCED) */}
                <div className={`p-4 border-b-2 border-dashed ${accentColor} space-y-4`}>
                    <div className="flex items-center gap-2 mb-1">
                        <Gem size={16} className={isBananaMode ? 'animate-bounce' : ''} />
                        <h3 className="font-bold text-sm uppercase">全息附录 (EXPANSION)</h3>
                        {isBananaMode && <span className="text-[10px] bg-black text-yellow-400 px-1 font-bold">RARE!</span>}
                    </div>

                    {/* Top Row: Career & Artifact */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className={`p-2 border ${accentColor} ${isBananaMode ? 'bg-yellow-100' : 'bg-gray-50'}`}>
                            <div className="flex items-center gap-1 text-gray-500 mb-1">
                                <Briefcase size={10} />
                                <span className="text-[9px] font-mono uppercase tracking-wider">CAREER</span>
                            </div>
                            <p className="text-xs font-bold leading-tight h-8 flex items-center">{result.expansion.defaultCareer}</p>
                        </div>
                        <div className={`p-2 border ${accentColor} ${isBananaMode ? 'bg-yellow-100' : 'bg-gray-50'}`}>
                            <div className="flex items-center gap-1 text-gray-500 mb-1">
                                <Gem size={10} />
                                <span className="text-[9px] font-mono uppercase tracking-wider">ARTIFACT</span>
                            </div>
                            <p className="text-xs font-bold leading-tight h-8 flex items-center">{result.expansion.soulArtifact}</p>
                        </div>
                    </div>

                    {/* Middle: Attribute Graph (Visual Bars) */}
                    <div className="py-2">
                        <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest mb-2">SURVIVAL_ATTRIBUTES.sys</p>
                        <div className="space-y-2">
                            {result.expansion.attributes.map((attr, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-[10px]">
                                    <span className="w-14 font-bold text-right shrink-0">{attr.label}</span>
                                    <div className="flex-1 h-2 bg-gray-200 rounded-sm overflow-hidden border border-gray-300">
                                        <div 
                                            className={`h-full ${attr.color}`} 
                                            style={{width: `${attr.value}%`}}
                                        ></div>
                                    </div>
                                    <span className="w-6 font-mono text-[9px]">{attr.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom: Luck Compass Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="relative border border-gray-300 bg-gray-50 p-2 overflow-hidden">
                            <div className="flex items-start gap-2 relative z-10">
                            <MapPin size={14} className="text-blue-500 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                    <p className="text-[9px] text-blue-400 uppercase font-mono tracking-widest mb-0.5">HABITAT</p>
                                    <p className="text-[10px] font-bold text-blue-900 leading-tight">{result.expansion.bestHabitat}</p>
                            </div>
                            </div>
                        </div>
                        
                        <div className="relative border border-gray-300 bg-gray-50 p-2 overflow-hidden">
                            <div className="flex items-start gap-2 relative z-10">
                            <Palette size={14} className="text-pink-500 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                    <p className="text-[9px] text-pink-400 uppercase font-mono tracking-widest mb-0.5">LUCKY_COLOR</p>
                                    <p className="text-[10px] font-bold text-pink-900 leading-tight">{result.expansion.luckyColor}</p>
                            </div>
                            </div>
                        </div>

                        <div className="relative border border-gray-300 bg-gray-50 p-2 overflow-hidden">
                            <div className="flex items-start gap-2 relative z-10">
                            <Compass size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                    <p className="text-[9px] text-indigo-400 uppercase font-mono tracking-widest mb-0.5">DIRECTION</p>
                                    <p className="text-[10px] font-bold text-indigo-900 leading-tight">{result.expansion.luckyDirection}</p>
                            </div>
                            </div>
                        </div>

                        <div className="relative border border-gray-300 bg-gray-50 p-2 overflow-hidden">
                            <div className="flex items-start gap-2 relative z-10">
                            <Coffee size={14} className="text-amber-700 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                    <p className="text-[9px] text-amber-700/60 uppercase font-mono tracking-widest mb-0.5">ENERGY</p>
                                    <p className="text-[10px] font-bold text-amber-900 leading-tight">{result.expansion.energySource}</p>
                            </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Social Battery */}
                    <div className="flex items-center gap-2 bg-black text-white p-2 text-[10px] font-mono">
                        <Battery size={12} className={result.expansion.socialBattery < 20 ? 'text-red-500' : 'text-green-400'} />
                        <span className="opacity-70">SOCIAL_BATTERY:</span>
                        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full ${result.expansion.socialBattery < 20 ? 'bg-red-500' : 'bg-green-400'}`} style={{width: `${result.expansion.socialBattery}%`}}></div>
                        </div>
                        <span>{result.expansion.socialBattery}%</span>
                    </div>

                    {/* System Log */}
                    <div className="bg-gray-100 text-gray-600 p-2 font-mono text-[9px] leading-relaxed border-l-2 border-gray-400">
                        <div className="flex items-center gap-1 mb-1">
                            <Terminal size={10} />
                            <span className="font-bold">PATCH_NOTE_v8.8</span>
                        </div>
                        <p>{"> " + result.expansion.patchNote}</p>
                    </div>
                </div>

                {/* 7. MARKET ADVICE (ANGEL INVESTOR) */}
                <div className="p-4 pb-8">
                    <div className={`p-4 border-4 border-double ${result.marketAdvice.action === 'SELL' ? 'border-red-600 bg-red-50' : 'border-green-600 bg-green-50'} text-center`}>
                        <p className="text-xs uppercase font-bold text-gray-500">MARKET RATING</p>
                        <h2 className={`text-3xl font-black my-1 ${result.marketAdvice.action === 'SELL' ? 'text-red-600' : 'text-green-600'}`}>
                            {result.marketAdvice.title}
                        </h2>
                        <p className="text-xs font-bold opacity-80">{result.marketAdvice.reason}</p>
                        
                        <button 
                            onClick={handleShareTrigger}
                            className="mt-4 w-full bg-black text-white py-2 text-xs font-bold uppercase hover:bg-gray-800 flex items-center justify-center gap-2 active:scale-95 select-none transition-all duration-200 ease-out"
                        >
                            <Share2 size={14} />
                            {result.marketAdvice.action === 'ANGEL' ? '寻找天使投资 (转发)' : '转发群聊：众筹换头'}
                        </button>
                    </div>
                </div>

                {/* Receipt Jagged Bottom */}
                <div className={`absolute bottom-0 left-0 w-full h-2 bg-[radial-gradient(circle,transparent_4px,${isBananaMode ? '#facc15' : '#fff'}_4px)] bg-[length:16px_16px] -mb-2`}></div>
            </div>

            {/* --- SPACER BEFORE NEW CONTENT --- */}
            {result.isUpgraded && result.upgradeData && (
                <div ref={upgradeSectionRef} className="relative z-10 w-full animate-in slide-in-from-bottom duration-1000 fade-in">
                    
                    {/* Shatter/Glitch Transition */}
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-red-500">
                        <div className="w-px h-12 bg-gradient-to-b from-transparent to-red-600"></div>
                        <AlertTriangle className="animate-pulse" />
                        <div className="font-mono text-xs text-center leading-tight glitch-text" data-text="SYSTEM_BREACH">
                            WARNING: UNUSUAL ASSET INJECTION<br/>
                            REWRITING DESTINY_CORE.DLL...
                        </div>
                        <div className="w-px h-12 bg-gradient-to-b from-red-600 to-transparent"></div>
                    </div>

                    {/* --- ARTIFICIAL GOD PANEL --- */}
                    <div className="bg-black border-y-4 border-[#39FF14] p-6 pb-12 relative overflow-hidden">
                        {/* Background Matrix/Gold Effect */}
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,#ffd700_0%,transparent_70%)] pointer-events-none"></div>
                        <div className="absolute top-0 left-0 w-full h-full bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#39ff14_3px)] opacity-5 pointer-events-none"></div>

                        {/* Stock Ticker Marquee */}
                        <div className="absolute top-0 left-0 w-full bg-[#39FF14] text-black text-[10px] font-mono font-bold overflow-hidden py-0.5">
                            <div className="animate-[translate-x_-100%_10s_linear_infinite] whitespace-nowrap">
                                {result.upgradeData.stockSymbol} ▲ {result.upgradeData.marketCap} (UP 9999%) /// BREAKING: GOD MODE ACTIVATED /// BUY BUY BUY /// 
                                {result.upgradeData.stockSymbol} ▲ {result.upgradeData.marketCap} (UP 9999%) /// BREAKING: GOD MODE ACTIVATED /// BUY BUY BUY ///
                            </div>
                        </div>

                        {/* Title */}
                        <div className="text-center mb-8 relative z-10 mt-6">
                            <h2 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-[#ffd700] via-[#fff] to-[#d4af37] drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
                                人造神·氪金飞升版
                            </h2>
                            <p className="text-[#39FF14] font-mono text-[10px] tracking-widest mt-1">THE_ARTIFICIAL_GOD // TIER_SSS</p>
                        </div>

                        {/* Rich Filter Image */}
                        <div className="relative w-64 h-64 mx-auto mb-8">
                            <div className="absolute inset-0 bg-gradient-to-tr from-[#ffd700] to-[#39FF14] rounded-full blur-xl opacity-30 animate-pulse"></div>
                            <div className="relative w-full h-full border-4 border-[#ffd700] p-1 shadow-[0_0_30px_rgba(255,215,0,0.3)] bg-black rotate-3">
                                    {/* CSS Rich Filter */}
                                    <img 
                                        src={imageSrc} 
                                        alt="Rich Face" 
                                        className="w-full h-full object-cover filter contrast-125 sepia hover:sepia-0 transition-all duration-500 saturate-150 brightness-110" 
                                    />
                                    {/* Watermark */}
                                    <div className="absolute bottom-2 right-2 border-2 border-[#ffd700] text-[#ffd700] px-2 py-0.5 text-xs font-black rotate-[-10deg] bg-black/50 backdrop-blur-sm">
                                        RMB PLAYER
                                    </div>
                                    {/* Halo Effect */}
                                    <div className="absolute -top-10 -left-10 w-full h-full border-t border-l border-[#39FF14] opacity-50 rounded-full animate-spin-slow pointer-events-none"></div>
                            </div>
                        </div>

                        {/* Inflationary Valuation */}
                        <div className="text-center mb-8 font-mono relative z-10">
                            <p className="text-gray-500 text-xs line-through mb-1">原身价: {formatBankBalance(result.score * 0.00000000001 + 2.5).integerPart}</p>
                            <div className="flex flex-col items-center">
                                <h3 className="text-5xl font-black text-[#39FF14] drop-shadow-[0_0_5px_#39FF14] glitch-text" data-text={result.upgradeData.newFormattedValue}>
                                    {result.upgradeData.newFormattedValue}
                                </h3>
                                <span className="text-[#ffd700] text-xs font-bold mt-1 bg-black px-2 border border-[#ffd700]">
                                    ↑ 400,000,000% (氪金后)
                                </span>
                            </div>
                            <p className="text-white mt-4 font-bold text-lg">
                                当前称号: <span className="text-[#ffd700]">{result.upgradeData.title}</span>
                            </p>
                            <p className="text-[#39FF14] text-xs italic mt-1 opacity-80">"{result.upgradeData.divineQuote}"</p>
                        </div>

                        {/* Black Gold Card */}
                        <div className="mb-8 relative z-10 mx-auto max-w-[300px] h-[180px] bg-gradient-to-br from-gray-900 to-black rounded-xl border border-[#ffd700]/30 shadow-2xl p-4 flex flex-col justify-between overflow-hidden">
                                <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#ffd700]/10 rounded-full blur-2xl"></div>
                                <div className="flex justify-between items-start">
                                    <span className="text-[#ffd700] font-black italic">FACE VALUE UNLIMITED</span>
                                    <Crown size={20} className="text-[#ffd700]" />
                                </div>
                                <div className="font-mono text-[#ffd700]/80 tracking-[0.2em] text-sm mt-4">
                                    **** **** **** 8888
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[8px] text-gray-500 uppercase">MEMBER NAME</p>
                                        <p className="text-white font-bold text-sm tracking-widest uppercase">VIP USER</p>
                                    </div>
                                    <p className="text-[8px] text-gray-500">VALID THRU: FOREVER</p>
                                </div>
                        </div>

                        {/* Privilege Grid */}
                        <div className="mb-8 relative z-10">
                            <div className="flex items-center gap-2 mb-4 border-b border-[#39FF14]/30 pb-2">
                                <Zap size={16} className="text-[#39FF14]" />
                                <h4 className="text-[#39FF14] font-bold text-sm">神权矩阵 (PRIVILEGES)</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {result.upgradeData.privileges.map((privilege) => (
                                    <div key={privilege.id} className="bg-gray-900/80 border border-[#39FF14]/20 p-3 rounded hover:border-[#39FF14] transition-colors group">
                                        <div className="mb-2">{getIcon(privilege.icon)}</div>
                                        <h5 className="text-white text-xs font-bold mb-1 group-hover:text-[#39FF14]">{privilege.name}</h5>
                                        <p className="text-[9px] text-gray-400 leading-tight">{privilege.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sponsors List (Original) */}
                        <div className="bg-[#111] border border-gray-800 p-4 rounded-xl mb-8 relative z-10">
                            <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
                                <Crown size={16} className="text-[#ffd700]" />
                                <h4 className="text-[#ffd700] font-bold text-sm">我的天使投资人 (SPONSORS)</h4>
                            </div>
                            <div className="space-y-3">
                                {result.upgradeData.sponsors.map((sponsor, idx) => (
                                    <div key={idx} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full ${sponsor.avatarColor} border border-white flex items-center justify-center text-[10px] font-bold text-white`}>
                                                {sponsor.name[0]}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-white text-xs font-bold">{sponsor.name}</span>
                                                <span className="text-[10px] text-gray-500">{sponsor.title}</span>
                                            </div>
                                        </div>
                                        <span className="text-[#39FF14] font-mono font-bold text-xs">+{sponsor.amount}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Re-Composition (Updated) */}
                        <div className="mb-8 relative z-10">
                            <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                                <Zap size={14} /> 灵魂成分重组 (Re-Composition)
                            </h4>
                            <div className="bg-gray-900 p-3 rounded border border-gray-800 mb-3">
                                <p className="text-xs text-gray-500 mb-1">改命前 (BEFORE)</p>
                                <p className="text-gray-300 font-mono text-sm border-l-2 border-red-500 pl-2">
                                    {result.upgradeData.composition.originalText}
                                </p>
                            </div>
                            
                            <p className="text-xs text-[#39FF14] mb-2">改命后 (AFTER)</p>
                            <div className="space-y-2 text-[10px] font-mono">
                                <div className="flex items-center gap-2">
                                    <span className="w-12 text-right">TECH</span>
                                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{width: `${result.upgradeData.composition.tech}%`}}></div>
                                    </div>
                                    <span className="w-8">{result.upgradeData.composition.tech}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-12 text-right">HARDCORE</span>
                                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-500" style={{width: `${result.upgradeData.composition.hardcore}%`}}></div>
                                    </div>
                                    <span className="w-8">{result.upgradeData.composition.hardcore}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-12 text-right text-[#ffd700]">MONEY</span>
                                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#ffd700] animate-pulse" style={{width: `${result.upgradeData.composition.money}%`}}></div>
                                    </div>
                                    <span className="w-8 text-[#ffd700]">{result.upgradeData.composition.money}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Hack Log */}
                        <div className="bg-black/50 p-2 font-mono text-[9px] text-green-500/70 leading-tight">
                            {result.upgradeData.hackLog.map((log, i) => (
                                <div key={i}>{log}</div>
                            ))}
                        </div>

                        {/* Final Expiry Warning */}
                        <div className="mt-8 text-center bg-red-900/20 p-2 border border-red-900/50">
                            <p className="text-[10px] text-red-500">
                                注意：众筹得来的“人造运势”极其不稳定<br/>将在 24小时后 失效，建议立即截图炫耀。
                            </p>
                        </div>
                    </div>
                </div>
            )}
          </div>
      </div>

      {/* --- CYBER THERMAL PRINTER (FIXED BOTTOM) --- */}
      <div 
         className={`absolute bottom-0 left-0 w-full z-40 pointer-events-none transition-transform duration-500 ${printStep < 1 ? 'translate-y-full' : 'translate-y-0'}`}
      >
          {/* Printer Exit Slot (The Tear Bar) */}
          <div className="relative w-full h-8 z-20">
               {/* Jagged Edge using Mask or Gradient */}
               <div className="absolute bottom-0 w-full h-3 bg-gradient-to-b from-[#111] to-[#222] shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                    {/* The glowing slot where paper comes out */}
                    <div className="absolute top-0 left-2 right-2 h-1 bg-black shadow-[inset_0_1px_4px_rgba(0,0,0,1)] rounded-full"></div>
                    {/* Green active lights */}
                    <div className="absolute top-1.5 right-6 w-1 h-1 bg-[#39FF14] rounded-full shadow-[0_0_5px_#39FF14] animate-pulse"></div>
                    <div className="absolute top-1.5 right-8 w-1 h-1 bg-red-500 rounded-full opacity-30"></div>
               </div>
               {/* Jagged Pattern Visual */}
               <div className="absolute -bottom-1 w-full h-1 bg-[linear-gradient(45deg,transparent_33%,#1a1a1a_33%,#1a1a1a_66%,transparent_66%)] bg-[length:8px_8px]"></div>
          </div>

          {/* Printer Body (Control Panel Area) */}
          <div className="w-full bg-[#1a1a1a] pt-6 pb-8 px-4 border-t border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,1)] relative overflow-hidden pointer-events-auto">
               
               {/* Surface Texture */}
               <div className="absolute inset-0 texture-carbon opacity-10 pointer-events-none"></div>
               
               {/* Branding */}
               <div className="absolute top-2 left-4 flex items-center gap-1 opacity-50">
                   <div className="w-2 h-2 bg-gray-500 rounded-sm"></div>
                   <span className="text-[8px] font-mono-tech tracking-widest text-gray-400">FATE_OS TERMINAL // 2025</span>
               </div>

               {/* --- FUNCTIONAL BUTTONS (Integrated into Machine) --- */}
               <div className={`flex flex-col gap-3 transition-opacity duration-1000 ${printStep < 2 ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
                    
                    {/* Top Row Controls */}
                    <div className="flex items-center justify-between gap-3">
                         {/* Calculator (Small Function Key) */}
                         <button 
                             onClick={handleCalculator} 
                             className="h-10 px-3 bg-[#0a0a0a] rounded border border-gray-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] flex items-center justify-center active:translate-y-0.5 transition-all"
                         >
                            {showCalc ? (
                                <span className="text-[9px] text-[#39FF14] font-mono whitespace-nowrap overflow-hidden max-w-[80px]">{calcResult}</span>
                            ) : (
                                <Calculator size={14} className="text-gray-400" />
                            )}
                         </button>

                         {/* Upgrade (Big Button) */}
                         {!result.isUpgraded ? (
                             <button 
                                 onClick={handleShareTrigger}
                                 className="flex-1 h-12 bg-gradient-to-b from-indigo-600 to-indigo-800 rounded border-t border-indigo-500 shadow-[0_4px_0_#312e81,0_8px_10px_rgba(0,0,0,0.5)] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2 group"
                             >
                                 <Zap size={16} className="text-white group-hover:scale-110 transition-transform" />
                                 <span className="text-xs font-bold text-white tracking-wider">逆天改命 (UPGRADE)</span>
                             </button>
                         ) : (
                             <button 
                                 onClick={() => setShowUpgradeShareStation(true)}
                                 className="flex-1 h-12 bg-gradient-to-b from-amber-500 to-amber-700 rounded border-t border-amber-400 shadow-[0_4px_0_#b45309,0_8px_10px_rgba(0,0,0,0.5)] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2"
                             >
                                 <Crown size={16} className="text-black" />
                                 <span className="text-xs font-bold text-black tracking-wider">凡尔赛海报</span>
                             </button>
                         )}

                         {/* Save (Function Key) */}
                         <button 
                             onClick={handleSaveImage} 
                             className="h-10 px-3 bg-[#2a2a2a] rounded border-t border-gray-600 shadow-[0_2px_0_#111] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center text-white"
                         >
                            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                         </button>
                    </div>

                    {/* Bottom Link */}
                    <button onClick={onRetake} className="text-[9px] text-gray-500 text-center hover:text-gray-300 transition-colors uppercase tracking-widest">
                        [ RESTART_SYSTEM_SCAN ]
                    </button>
               </div>
          </div>
      </div>

      {/* --- SHARE & MODALS --- */}
      {showShareGuide && (
          <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center animate-in fade-in duration-300 overflow-y-auto pt-4 pb-8">
              <div className="absolute top-2 right-6 flex flex-col items-end animate-bounce z-50 pointer-events-none">
                  <CornerUpRight size={48} className="text-[#39FF14] stroke-[3px]" />
                  <p className="text-[#39FF14] font-black text-sm mt-1 text-right">点击转发</p>
              </div>

              <div className="flex-1 flex flex-col items-center justify-start w-full px-6 mt-10">
                   <div className="mb-6 relative group">
                        <div ref={crowdFundRef} className="bg-[#f0f0f0] text-black p-4 rounded-sm border-2 border-dashed border-red-500 w-64 rotate-[-2deg] shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-transform hover:rotate-0">
                             <div className="border-b-2 border-black pb-2 mb-2 flex justify-between items-end">
                                <h2 className="font-black text-xl">急需众筹</h2>
                                <span className="text-[10px] font-mono bg-red-600 text-white px-1">URGENT</span>
                             </div>
                             <div className="flex gap-2 mb-3">
                                 <div className="w-20 h-24 bg-gray-200 shrink-0 border border-gray-400 p-0.5">
                                     <img src={imageSrc} className="w-full h-full object-cover grayscale contrast-125" />
                                 </div>
                                 <div className="flex-1 text-xs font-serif leading-tight flex flex-col justify-between">
                                     <div>
                                         <p className="mb-1 font-bold">申请人: 颜值难民</p>
                                         <p>系统估值: <span className="font-black text-red-600 underline">{result.formattedValue}</span></p>
                                     </div>
                                     <p className="bg-yellow-300 p-1 text-[10px] font-bold mt-1">
                                         "求求好心人V我50，助我逆天改命！"
                                     </p>
                                 </div>
                             </div>
                             <div className="bg-black text-white text-center py-2 text-xs font-bold mb-2 font-mono">
                                 已筹集: ¥0.00 / 目标: ¥10亿
                             </div>
                             <div className="flex justify-between items-center border-t border-gray-300 pt-2">
                                <div className="text-[10px] text-gray-500 font-mono">SCAN_TO_DONATE</div>
                                <div className="w-8 h-8 bg-black">
                                    <div className="w-full h-full border-2 border-white bg-black flex items-center justify-center">
                                        <div className="w-4 h-4 bg-white"></div>
                                    </div>
                                </div>
                             </div>
                        </div>
                        <p className="text-gray-500 text-[10px] text-center mt-4">
                            ↑ 长按上图可保存发送给朋友
                        </p>
                   </div>

                   <div className="w-full space-y-3 mt-4">
                        <button 
                            onClick={handleGoToShare}
                            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 active:scale-95 select-none transition-all duration-200 ease-out border ${isWaitingForReturn ? 'bg-gray-800 text-gray-500 border-gray-700' : 'bg-[#39FF14] text-black border-[#39FF14] hover:scale-105'}`}
                        >
                            {isWaitingForReturn ? <RefreshCw size={20} className="animate-spin" /> : <Share2 size={20} />}
                            <span>{isWaitingForReturn ? '等待转发返回...' : '转发卡片到群聊'}</span>
                        </button>

                        <button 
                            onClick={() => handleManualShareConfirm(false)}
                            disabled={!hasActuallyLeft && shareCountdown > 0}
                            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all
                                ${hasActuallyLeft || shareCountdown === 0 
                                    ? 'bg-white text-black opacity-100 shadow-[0_0_20px_rgba(255,255,255,0.3)]' 
                                    : 'bg-transparent text-gray-600 opacity-50 cursor-not-allowed'}
                            `}
                        >
                            {(hasActuallyLeft || shareCountdown === 0) ? (
                                <>
                                    <CheckCircle size={16} className="text-green-600" />
                                    <span>验证成功，正在改命...</span>
                                </>
                            ) : (
                                <>
                                    <Timer size={16} />
                                    <span>等待分享操作...</span>
                                </>
                            )}
                        </button>
                   </div>
              </div>
          </div>
      )}

      {showUpgradeInjection && (
          <div className="fixed inset-0 z-[90] bg-red-950/90 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm">
               <AlertTriangle size={64} className="text-red-500 mb-6 animate-pulse" />
               <h2 className="text-3xl font-black text-white mb-2 tracking-tighter">WARNING</h2>
               <div className="text-red-400 font-mono text-sm space-y-2 mb-8">
                   <p>检测到外部资本注入！</p>
                   <p>正在强制重写命运代码...</p>
               </div>
               <div className="w-full max-w-[200px] h-2 bg-red-900 rounded-full overflow-hidden border border-red-700">
                   <div 
                      className="h-full bg-red-500 transition-all duration-75" 
                      style={{width: `${injectionProgress}%`}}
                   ></div>
               </div>
               <p className="text-red-500 font-mono text-xs mt-2">重塑进度：{injectionProgress}%</p>
          </div>
      )}

      {showUpgradeShareStation && result.upgradeData && (
          <div className="fixed inset-0 z-[80] bg-black/95 backdrop-blur-md flex flex-col items-center pt-10 pb-4 overflow-y-auto">
              <div className="w-full max-w-sm px-6">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-[#39FF14] font-bold text-lg flex items-center gap-2">
                          <Crown size={20} /> 飞升完成
                      </h3>
                      <button onClick={() => setShowUpgradeShareStation(false)} className="text-gray-500">
                          <X size={24} />
                      </button>
                  </div>
                  <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
                      {UPGRADE_SHARE_TEMPLATES.map(t => (
                          <button
                            key={t.id}
                            onClick={() => setSelectedTemplateId(t.id)}
                            className={`flex-shrink-0 px-4 py-2 rounded border text-xs font-bold transition-colors ${selectedTemplateId === t.id ? 'bg-[#39FF14] text-black border-[#39FF14]' : 'bg-gray-900 text-gray-400 border-gray-700'}`}
                          >
                              {t.title}
                          </button>
                      ))}
                  </div>
                  <div className="relative mb-6">
                      <div ref={upgradeCardRef} className="bg-black border border-[#39FF14] p-4 relative overflow-hidden text-center">
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#39FF14] to-transparent"></div>
                          <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#ffd700]/10 rounded-full blur-xl"></div>
                          <div className="mb-4 relative z-10">
                              <h2 className="text-white font-black text-lg mb-1 leading-tight">
                                  {UPGRADE_SHARE_TEMPLATES.find(t => t.id === selectedTemplateId)?.heading}
                              </h2>
                              <p className="text-gray-400 text-[10px] px-2">
                                  {UPGRADE_SHARE_TEMPLATES.find(t => t.id === selectedTemplateId)?.body}
                              </p>
                          </div>
                          <div className="flex items-center justify-center gap-4 mb-4">
                              <div className="w-16 h-16 border-2 border-[#ffd700] p-0.5 rotate-[-3deg]">
                                  <img src={imageSrc} className="w-full h-full object-cover" />
                              </div>
                              <div className="text-left">
                                  <p className="text-[10px] text-[#39FF14]">CURRENT VALUE</p>
                                  <p className="text-xl font-black text-white">{result.upgradeData.newFormattedValue}</p>
                              </div>
                          </div>
                          <div className="flex items-center justify-between bg-gray-900 p-2 rounded border border-gray-800">
                              <div className="text-left">
                                  <p className="text-[9px] text-gray-400">SCAN TO VERIFY</p>
                                  <p className="text-[10px] text-[#39FF14] font-mono">CODE: GOD_MODE_888</p>
                              </div>
                              <div className="w-8 h-8 bg-white p-0.5">
                                   <div className="w-full h-full bg-black"></div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <button 
                     onClick={handleSaveUpgradeCard}
                     className="w-full bg-[#ffd700] text-black font-bold py-3 rounded mb-4 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,215,0,0.3)]"
                  >
                      <Download size={18} /> 保存朋友圈海报
                  </button>
                  <p className="text-center text-gray-600 text-[10px]">保存图片后分享，让朋友们膜拜你的新身价</p>
              </div>
          </div>
      )}

      {/* Banana Music Overlay if needed (Visual only for now) */}
      {isBananaMode && (
          <div className="fixed top-0 left-0 w-full h-1 bg-yellow-400 z-50 animate-pulse"></div>
      )}

    </div>
  );
};

export default ResultCard;
