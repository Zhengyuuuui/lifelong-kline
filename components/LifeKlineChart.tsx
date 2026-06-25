

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceArea,
  ReferenceDot,
  Label,
  ReferenceLine
} from 'recharts';
import { KlinePoint, TimeRange, TradingOrder } from '../types';
import { storage } from '../services/storageService';
import { Info, X, Crosshair, Eye, Plus, Minus, ArrowRight, CheckCircle2, Zap, Snowflake, Clock, Activity, TrendingUp, Share2, Shield, Heart, Copy, User, MessageCircle } from 'lucide-react';
import { i18n } from '../services/i18n';

// --- HELPER COMPONENTS ---

// TRADING MODAL (Updated: Added Post-Trade Share Flow)
const TradingModal: React.FC<{ 
  isOpen: boolean; 
  type: 'buy' | 'sell' | 'watch' | null; 
  onClose: () => void;
  onConfirm: (order: TradingOrder) => void;
}> = ({ isOpen, type, onClose, onConfirm }) => {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('');
  const [action, setAction] = useState('');
  const [customInput, setCustomInput] = useState('');
  
  // Share Card State
  const [recipient, setRecipient] = useState('');
  const [shareMsg, setShareMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setCategory('');
      setAction('');
      setCustomInput('');
      setRecipient('');
      setShareMsg('');
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen || !type) return null;

  // Configuration Data
  const BUY_CATS = [i18n.t('trade.cat_career'), i18n.t('trade.cat_wealth'), i18n.t('trade.cat_health'), i18n.t('trade.cat_rel'), i18n.t('trade.cat_learn'), i18n.t('trade.cat_self')];
  const SELL_CATS = [i18n.t('trade.cat_drain_rel'), i18n.t('trade.cat_bad_friends'), i18n.t('trade.cat_bad_proj'), i18n.t('trade.cat_overwork'), i18n.t('trade.cat_phone'), i18n.t('trade.cat_anxiety')];
  
  // Expanded Action Library for Richer Recommendations
  // Ideally these should also be in i18n, but for brevity we'll keep them static or use simple defaults if key missing
  // Since user asked for FULL COVERAGE, we should map them or provide generic English.
  // For now, mapping English keys to Chinese array is complex without extensive dict.
  // We will use the category name itself as a fallback for action generation context.
    // Simplified Action Generator
  const GET_ACTIONS = (cat: string, type: 'buy' | 'sell') => {
     // Return generic localized actions
     if (type === 'buy') return ['+10% 投入', '专注 1 小时', '建立连接', '深度工作', '学习新技能'];
     return ['及时止损', '冷处理', '屏蔽/拉黑', '学会拒绝', '减少消耗'];
  };

  // --- SHARE CARD DATA ---
  const RECIPIENTS = ['好友', '伴侣', '家人', '同事'];

  const SHARE_TEMPLATES = [
     `我决定对 ${category} 执行${type === 'buy' ? '加仓' : '减仓'}。请见证。`,
     `通过${type === 'buy' ? '投资' : '断舍离'} ${category} 来滋养自己。`,
     `通知：我正在将重心调整至 ${category}。`
  ];

  const handleConfirm = () => {
    onConfirm({ id: Date.now().toString(), type, category, action, date: 'Now', timestamp: Date.now() });
    // Don't close, go to trigger step
    if (type === 'watch') {
        onClose();
    } else {
        setStep(4);
    }
  };

  const copyCardText = () => {
    const text = `人生K线更新:\n我决定对 [${category}] 执行 ${type === 'buy' ? '加仓' : '减仓'}。\n执行动作: ${action}\n\n${shareMsg}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
        }, 1500);
    });
  };

  const renderContent = () => {
    // --- WATCH FLOW ---
    if (type === 'watch') {
      return (
        <div className="space-y-6">
           <div className="text-center">
              <h3 className="text-xl font-bold text-slate-200 mb-1 flex items-center justify-center gap-2">
                <Eye size={20} className="text-slate-400" />
                {i18n.t('trade.modal_watch_title')}
              </h3>
              <p className="text-xs text-slate-500">{i18n.t('trade.modal_watch_desc')}</p>
           </div>
           
           <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <label className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 block">关注点</label>
              <input 
                type="text" 
                placeholder="例如：情绪管理..." 
                className="w-full bg-transparent border-b border-slate-600 py-2 text-sm text-white focus:outline-none focus:border-white transition-colors placeholder:text-slate-600"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
              />
           </div>

           <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => { setAction('7 days'); setStep(2); }}
                className="py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-xs font-bold"
              >
                7天
              </button>
              <button 
                onClick={() => { setAction('30 days'); setStep(2); }}
                className="py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-xs font-bold"
              >
                30天
              </button>
           </div>
           
           {step === 2 && (
             <div className="animate-fade-in-up bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
                <p className="text-xs text-amber-200 mb-3 leading-relaxed">
                   确认观望周期。
                </p>
                <button 
                  onClick={handleConfirm}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs"
                >
                   确认观望
                </button>
             </div>
           )}
        </div>
      );
    }

    // --- BUY / SELL FLOW ---
    const isBuy = type === 'buy';
    
    // STEPS 4, 5, 6: POST-TRANSACTION SHARE FLOW
    if (step === 4) {
        return (
            <div className="space-y-6 text-center animate-fade-in-up">
               <div className="flex justify-center mb-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isBuy ? 'bg-teal-500/20 text-teal-400' : 'bg-rose-500/20 text-rose-400'}`}>
                     <CheckCircle2 size={24} />
                  </div>
               </div>
               <div>
                  <h3 className="text-xl font-bold text-white mb-2">{isBuy ? '订单已成交' : '订单已成交'}</h3>
                  <p className="text-sm text-slate-300 font-medium">
                     {isBuy ? '多头仓位已建立。' : '空头仓位已确认。'}
                  </p>
               </div>
               
               <button 
                 onClick={() => setStep(5)}
                 className={`w-full py-3.5 font-bold rounded-xl text-sm shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] ${
                    isBuy 
                    ? 'bg-teal-500 hover:bg-teal-400 text-black shadow-teal-500/20' 
                    : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                 }`}
               >
                  {isBuy ? <Shield size={16} /> : <Shield size={16} />}
                  {isBuy ? '分享能量支援卡' : '分享防御护盾卡'}
               </button>
               
               <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300 underline">
                  关闭
               </button>
            </div>
        );
    }

    if (step === 5) {
        return (
            <div className="space-y-5 animate-fade-in-up">
               {/* Header */}
               <div className="text-center pb-2 border-b border-white/5">
                  <h3 className="text-sm font-bold text-white flex items-center justify-center gap-2">
                     选择接收者
                  </h3>
               </div>

               {/* Step 1: Recipient */}
               <div className="space-y-2">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">第一步：选择接收者</p>
                  <div className="flex flex-wrap gap-2">
                     {RECIPIENTS.map(r => (
                        <button 
                           key={r}
                           onClick={() => setRecipient(r)}
                           className={`px-3 py-2 rounded-lg text-xs border transition-all ${
                              recipient === r 
                              ? (isBuy ? 'bg-teal-500/20 border-teal-500 text-teal-300' : 'bg-rose-500/20 border-rose-500 text-rose-300')
                              : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                           }`}
                        >
                           {r}
                        </button>
                     ))}
                  </div>
               </div>

               {/* Step 2: Message */}
               <div className="space-y-2">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">第二步：选择留言</p>
                  <div className="space-y-2">
                     {SHARE_TEMPLATES.map((msg, i) => (
                        <button
                           key={i}
                           onClick={() => { setShareMsg(msg); setStep(6); }}
                           className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-slate-300 transition-all flex justify-between items-center group"
                        >
                           <span className="line-clamp-2">{msg.replace('[Category]', category).replace('[Action]', action)}</span>
                           <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
                        </button>
                     ))}
                  </div>
               </div>
            </div>
        );
    }

    if (step === 6) {
        return (
            <div className="space-y-6 animate-fade-in-up">
               {/* Card Preview */}
               <div className={`relative overflow-hidden rounded-2xl p-6 border transition-all ${
                  isBuy 
                  ? 'bg-gradient-to-br from-teal-900 to-slate-900 border-teal-500/30' 
                  : 'bg-gradient-to-br from-rose-900 to-slate-900 border-rose-500/30'
               }`}>
                  {/* Card Badge */}
                  <div className="flex justify-between items-start mb-6">
                     <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${
                        isBuy ? 'bg-teal-500/20 text-teal-300' : 'bg-rose-500/20 text-rose-300'
                     }`}>
                        {isBuy ? <Shield size={12} /> : <Zap size={12} />}
                        {isBuy ? '能量支援卡' : '防御护盾卡'}
                     </div>
                     <div className="text-[10px] text-white/40 font-mono">人生K线</div>
                  </div>

                  {/* Card Content */}
                  <div className="space-y-4 mb-6">
                     <div>
                        <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">致： {recipient || '好友'}</p>
                        <h4 className="text-lg font-bold text-white leading-tight">
                           {isBuy ? '我正在自我投资' : '我正在及时止损'}
                        </h4>
                     </div>
                     
                     <div className="bg-black/20 rounded-xl p-3 border border-white/10">
                        <div className="flex items-center gap-2 mb-1">
                           <div className={`w-1.5 h-1.5 rounded-full ${isBuy ? 'bg-teal-400' : 'bg-rose-400'}`} />
                           <span className="text-[10px] text-white/70">{category}</span>
                        </div>
                        <p className="text-xs text-white font-medium">"{action}"</p>
                     </div>

                     <div className="relative pl-3 border-l-2 border-white/20">
                        <p className="text-xs text-white/80 italic leading-relaxed">
                           "{shareMsg}"
                        </p>
                     </div>
                  </div>

                  {/* Card Footer Button (Visual only) */}
                  <div className={`w-full py-2 rounded-lg text-center text-xs font-bold opacity-90 ${
                     isBuy ? 'bg-teal-500 text-black' : 'bg-rose-500 text-white'
                  }`}>
                     {isBuy ? '收到，撑你' : '收到，支持'}
                  </div>
               </div>

               {/* Action Buttons */}
               <div className="grid grid-cols-2 gap-3">
                  <button 
                     onClick={onClose}
                     className="py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-bold transition-colors"
                  >
                     完成
                  </button>
                  <button 
                     onClick={copyCardText}
                     className={`py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        copied 
                        ? 'bg-emerald-500 text-white' 
                        : (isBuy ? 'bg-white text-teal-900' : 'bg-white text-rose-900')
                     }`}
                  >
                     {copied ? <CheckCircle2 size={14} /> : <MessageCircle size={14} />}
                     {copied ? '已复制' : '发送'}
                  </button>
               </div>
            </div>
        );
    }

    // --- STANDARD BUY/SELL STEPS 1-3 ---
    return (
      <div className="space-y-6">
         {/* Header */}
         <div className="text-center">
            <h3 className={`text-xl font-bold mb-1 flex items-center justify-center gap-2 ${isBuy ? 'text-teal-400' : 'text-rose-400'}`}>
               {isBuy ? <Plus size={20} /> : <Minus size={20} />}
               {isBuy ? i18n.t('trade.modal_buy_title') : i18n.t('trade.modal_sell_title')}
            </h3>
            <p className="text-xs text-slate-500">
               {isBuy ? i18n.t('trade.modal_buy_desc') : i18n.t('trade.modal_sell_desc')}
            </p>
         </div>

         {/* Step 1: Category */}
         {step === 1 && (
            <div className="space-y-3 animate-fade-in-up">
               <div className="grid grid-cols-2 gap-3">
                  {(isBuy ? BUY_CATS : SELL_CATS).map(cat => (
                     <button
                        key={cat}
                        onClick={() => { setCategory(cat); setStep(2); }}
                        className={`py-3 px-2 rounded-xl border text-xs font-medium transition-all ${
                           category === cat 
                             ? (isBuy ? 'bg-teal-500/20 border-teal-500 text-teal-300' : 'bg-rose-500/20 border-rose-500 text-rose-300')
                             : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                     >
                        {cat}
                     </button>
                  ))}
               </div>
               <div className="pt-2 border-t border-white/5">
                 <input 
                   type="text" 
                   placeholder="+ 自定义"
                   className="w-full bg-transparent py-2 text-xs text-center text-slate-300 placeholder:text-slate-600 focus:outline-none"
                   onKeyDown={(e) => {
                      if(e.key === 'Enter') {
                        setCategory(e.currentTarget.value);
                        setStep(2);
                      }
                   }}
                 />
               </div>
            </div>
         )}

         {/* Step 2: Action - Updated with Scrolling */}
         {step === 2 && (
            <div className="space-y-4 animate-fade-in-up">
               <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                  <span className={`font-bold ${isBuy ? 'text-teal-500' : 'text-rose-500'}`}>{category}</span>
                  <ArrowRight size={12} />
                  <span>{isBuy ? '选择执行动作' : '选择执行动作'}</span>
               </div>
               
               <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                  {GET_ACTIONS(category, type).map(act => (
                     <button
                        key={act}
                        onClick={() => { setAction(act); setStep(3); }}
                        className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-slate-300 transition-all flex justify-between items-center group"
                     >
                        <span>{act}</span>
                        <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                     </button>
                  ))}
               </div>

               <div className="pt-2 border-t border-white/5">
                  <input 
                     type="text" 
                     placeholder="自定义动作..."
                     className="w-full p-3 rounded-lg bg-transparent border border-dashed border-slate-700 text-xs text-slate-300 placeholder:text-slate-600 focus:border-slate-500 focus:outline-none"
                     onKeyDown={(e) => {
                        if(e.key === 'Enter') {
                           setAction(e.currentTarget.value);
                           setStep(3);
                        }
                     }}
                  />
               </div>
               
               <button onClick={() => setStep(1)} className="text-[10px] text-slate-600 underline text-center w-full hover:text-slate-400">
                  返回
               </button>
            </div>
         )}

         {/* Step 3: Confirm */}
         {step === 3 && (
            <div className={`animate-fade-in-up rounded-xl p-5 text-center border ${isBuy ? 'bg-teal-500/10 border-teal-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
               <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                  确认：{isBuy ? '加仓' : '减仓'} {category}
                  <br/>
                  <span className={`font-bold block mt-2 text-sm ${isBuy ? 'text-teal-300' : 'text-rose-300'}`}>“{action}”</span>
               </p>
               
               <button 
                 onClick={handleConfirm}
                 className={`w-full py-3 font-bold rounded-lg text-xs shadow-lg transform active:scale-95 select-none transition-all duration-200 ease-out ${
                    isBuy 
                    ? 'bg-teal-500 hover:bg-teal-400 text-black shadow-teal-500/20' 
                    : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                 }`}
               >
                  确认下单
               </button>
            </div>
         )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
       {/* Backdrop */}
       <div 
         className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
         onClick={onClose}
       />
       
       {/* Panel - Centered and Elevated */}
       <div className="relative w-full max-w-sm mx-4 bg-[#111827] border border-slate-700 rounded-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)] transform transition-transform duration-300 animate-fade-in-up">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-full p-1">
             <X size={16} />
          </button>
          
          {renderContent()}
       </div>
    </div>
  );
};


// 1. Self Trading Widget (Updated)
const SelfTradingWidgetExchange: React.FC<{ 
  currentPrice: number, 
  prevPrice: number, 
  userName: string,
  onOpenTrading: (type: 'buy' | 'sell' | 'watch') => void
}> = ({ currentPrice, prevPrice, userName, onOpenTrading }) => {
    // These now serve as "simulated" dashboard numbers, updated by "fake" market moves or kept stable
    const [holdings, setHoldings] = useState(100);
    const [cash, setCash] = useState(50000);
    const [leverage, setLeverage] = useState(1);
    
    // Safety checks for NaN
    const safePrice = (isNaN(currentPrice) || currentPrice <= 0) ? 50 : currentPrice;
    const safePrev = (isNaN(prevPrice) || prevPrice <= 0) ? 50 : prevPrice;

    const marketValue = holdings * safePrice * leverage;
    const priceChange = safePrice - safePrev;
    const priceChangePercent = (priceChange / safePrev) * 100;
    const isUp = priceChange >= 0;

    const high24h = safePrice * 1.05;
    const low24h = safePrice * 0.98;
    const vol24h = 8450; 

    const toggleLeverage = () => {
        setLeverage(prev => prev === 1 ? 2 : prev === 2 ? 5 : 1);
    };

    return (
        <div id="tour-trade" className="flex flex-col md:flex-row items-center justify-between w-full font-mono text-xs text-slate-300 py-1.5 px-4 gap-4">
            {/* LEFT: Ticker Info */}
            <div className="flex items-center gap-6 w-full md:w-auto overflow-x-auto no-scrollbar">
                 <div className="flex flex-col flex-shrink-0">
                     <div className="flex items-center gap-1.5 text-base font-bold text-white">
                        <span>{i18n.t('chart.sim_ticker')}</span>
                     </div>
                     <div className="text-[10px] text-teal-400 underline decoration-teal-800 underline-offset-2 decoration-dotted font-bold tracking-wide">
                        {userName || "用户"}
                     </div>
                 </div>
                 
                 <div className={`flex flex-col flex-shrink-0 ${isUp ? 'text-teal-400' : 'text-rose-400'}`}>
                     <span className="text-base font-bold transition-all duration-300">{safePrice.toFixed(2)}</span>
                     <span className="text-[10px]">
                        {isUp ? '+' : ''}{priceChange.toFixed(2)} ({isUp ? '+' : ''}{!isNaN(priceChangePercent) ? priceChangePercent.toFixed(2) : '0.00'}%)
                     </span>
                 </div>

                 <div className="flex gap-4 border-l border-white/5 pl-4 flex-shrink-0">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500">{i18n.t('chart.high')}</span>
                        <span className="text-[10px] text-slate-200">{high24h.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500">{i18n.t('chart.low')}</span>
                        <span className="text-[10px] text-slate-200">{low24h.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500">{i18n.t('chart.vol')}</span>
                        <span className="text-[10px] text-slate-200">{vol24h.toLocaleString()}</span>
                    </div>
                 </div>
            </div>

            {/* RIGHT: Buttons */}
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 md:border-l border-white/5 pt-2 md:pt-0 md:pl-4">
                <div className="flex flex-col items-end gap-0.5 mr-2 hidden sm:flex">
                    <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-slate-500">{i18n.t('chart.sim_equity')}</span>
                        <span className="text-slate-200 font-bold">${marketValue.toLocaleString()}</span>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    <button 
                        onClick={toggleLeverage}
                        className={`px-2 py-0.5 text-[9px] border rounded flex items-center justify-center gap-1 ${leverage > 1 ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                    >
                        <span>{leverage}x</span>
                    </button>

                    <button onClick={() => onOpenTrading('buy')} className="bg-teal-500 hover:bg-teal-400 text-black text-[11px] font-bold px-4 py-2 rounded shadow-sm active:scale-95 select-none transition-all duration-200 ease-out">
                        {i18n.t('chart.btn_buy')}
                    </button>
                    <button onClick={() => onOpenTrading('sell')} className="bg-rose-500 hover:bg-rose-400 text-white text-[11px] font-bold px-4 py-2 rounded shadow-sm active:scale-95 select-none transition-all duration-200 ease-out">
                        {i18n.t('chart.btn_sell')}
                    </button>
                     <button onClick={() => onOpenTrading('watch')} className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-bold px-4 py-2 rounded shadow-sm active:scale-95 select-none transition-all duration-200 ease-out">
                        {i18n.t('chart.btn_watch')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// 2. HUD Box Internal
const fitSvgLabel = (value: string, maxLength = 11) => {
  if (!value) return "";
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
};

const HUDBoxInternal = ({ point }: any) => {
  const boxWidth = 146;
  const boxHeight = 78;
  const xOffset = -boxWidth / 2;
  const yOffset = -boxHeight / 2;
  const eraLabel = point?.era || "N/A";
  const stageLabel = point?.stage_detail || "N/A";
  const isFire = eraLabel.includes('Fire') || eraLabel.includes('火');
  const accentColor = isFire ? '#A855F7' : '#C0842B';

  return (
    <g className="animate-fade-in-up">
      <line x1="0" y1="0" x2="0" y2={35} stroke="url(#gradientLine)" strokeWidth="1.5" strokeLinecap="round" />
      <g transform={`translate(${xOffset}, ${yOffset})`} className="pointer-events-none">
        <rect width={boxWidth} height={boxHeight} rx="16" fill="#0F172A" fillOpacity="0.94" stroke="#2DD4BF" strokeOpacity="0.58" strokeWidth="1" filter="url(#hudShadow)" />
        <path d={`M 10 10 H ${boxWidth - 10}`} stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
        <circle cx={boxWidth - 13} cy="12" r="3" fill="#FB7185" fillOpacity="0.45" />
        <g transform={`translate(${boxWidth / 2}, 18)`}>
          <circle cx="-22" cy="-1" r="4" fill="none" stroke="#2DD4BF" strokeOpacity="0.8" strokeWidth="1" />
          <path d="M -25 -1 H -19 M -22 -4 V 2" stroke="#2DD4BF" strokeOpacity="0.85" strokeWidth="0.8" strokeLinecap="round" />
          <text x="3" y="0" textAnchor="middle" dominantBaseline="middle" fill="#2DD4BF" fontSize="9" fontWeight="800" letterSpacing="0.22em">锁定</text>
        </g>
        <line x1="14" y1="29" x2={boxWidth - 14} y2="29" stroke="rgba(255,255,255,0.08)" />
        <rect x="18" y="39" width="7" height="7" rx="1" transform="rotate(45 21.5 42.5)" fill={accentColor} />
        <text x="32" y="43" dominantBaseline="middle" fill="#E2E8F0" fontSize="10.5" fontWeight="800" letterSpacing="0.03em">{fitSvgLabel(eraLabel, 12)}</text>
        <circle cx="21.5" cy="59" r="3" fill="#2DD4BF" filter="url(#glow)" />
        <text x="32" y="60" dominantBaseline="middle" fill="#CCFBF1" fontSize="10.5" fontWeight="800" letterSpacing="0.03em">{fitSvgLabel(stageLabel, 12)}</text>
      </g>
    </g>
  );
};

// 3. HUD Box
const HUDBox = ({ x, y, point, isHovered, index, totalPoints }: any) => {
  const boxWidth = 124;
  const boxHeight = 66;
  let xOffset = -boxWidth / 2;
  if (index < 2) xOffset = 15;
  else if (index > totalPoints - 3) xOffset = -boxWidth - 15;
  const yOffset = -110; 
  const eraLabel = point?.era || "";
  const stageLabel = point?.stage_detail || "";
  const isFire = eraLabel.includes('Fire') || eraLabel.includes('火');
  const accentColor = isFire ? '#A855F7' : '#C0842B';

  return (
    <g className="pointer-events-none animate-fade-in-up">
      <line x1={x} y1={y} x2={x} y2={y + yOffset + boxHeight - 2} stroke="url(#gradientLine)" strokeWidth="1.5" strokeLinecap="round" />
      <g transform={`translate(${x + xOffset}, ${y + yOffset})`}>
        <rect width={boxWidth} height={boxHeight} rx="15" fill="#0F172A" fillOpacity="0.84" stroke="#2DD4BF" strokeOpacity="0.34" strokeWidth="1" filter="url(#hudShadow)" />
        <path d={`M 0 0 H ${boxWidth} V 22 H 0 Z`} fill="url(#hudShine)" opacity="0.7" />
        <text x={boxWidth / 2} y="14" textAnchor="middle" dominantBaseline="middle" fill="#94A3B8" fontSize="9" fontWeight="800" letterSpacing="0.22em">
          {isHovered ? '模拟推演' : '命运'}
        </text>
        <line x1="14" y1="25" x2={boxWidth - 14} y2="25" stroke="rgba(255,255,255,0.08)" />
        <rect x="16" y="35" width="7" height="7" rx="1" transform="rotate(45 19.5 38.5)" fill={accentColor} />
        <text x="30" y="39" dominantBaseline="middle" fill="#E2E8F0" fontSize="10" fontWeight="800">{fitSvgLabel(eraLabel, 9)}</text>
        <circle cx="19.5" cy="53" r="2.8" fill="#2DD4BF" filter="url(#glow)" />
        <text x="30" y="54" dominantBaseline="middle" fill="#CCFBF1" fontSize="10" fontWeight="800">{fitSvgLabel(stageLabel, 9)}</text>
      </g>
    </g>
  );
};

const SnailGlyph = React.memo(() => (
  <g className="snail-move" filter="url(#snailSoftShadow)">
    <g transform="translate(-24,-28) scale(0.92)">
      <ellipse cx="31" cy="44" rx="28" ry="3.4" fill="url(#snailMucus)" opacity="0.75" />
      <path
        d="M13 37 C18 31, 32 30, 42 33 C48 35, 52 39, 53 43 C39 45, 24 45, 10 43 C8 41, 9 39, 13 37 Z"
        fill="url(#snailBody)"
        stroke="#F3D59B"
        strokeWidth="1.2"
      />
      <path
        d="M13 40 C23 42.5, 40 42.5, 53 40.5 C51 43.5, 41 45.5, 24 45.2 C14.5 45, 9.5 43.6, 10 42.2 C10.3 41.3, 11.4 40.5, 13 40 Z"
        fill="#8E5F30"
        opacity="0.4"
      />
      <path
        d="M38 31 C43 24, 50 23, 55 29 C58 33, 57 38, 53 42 C50 38, 45 35, 38 34 Z"
        fill="url(#snailHead)"
        stroke="#F6DDA7"
        strokeWidth="1.2"
      />
      <path d="M49 25 C50 17, 43 17, 42 23" fill="none" stroke="#F8E7BC" strokeWidth="1.45" strokeLinecap="round" />
      <path d="M55 28 C60 20, 52 18, 50 24" fill="none" stroke="#F8E7BC" strokeWidth="1.45" strokeLinecap="round" />
      <circle cx="42" cy="22" r="2.1" fill="#F8E8C5" />
      <circle cx="51" cy="23" r="2.1" fill="#F8E8C5" />
      <circle cx="42.5" cy="22" r="0.9" fill="#1B110A" />
      <circle cx="51.5" cy="23" r="0.9" fill="#1B110A" />
      <circle cx="25" cy="29" r="15.5" fill="url(#snailShell)" stroke="#F4C675" strokeWidth="1.5" />
      <circle cx="20" cy="24" r="8.5" fill="none" stroke="#FFE7A7" strokeWidth="1" opacity="0.25" />
      <circle cx="28" cy="32" r="10" fill="none" stroke="#4B2B12" strokeWidth="1" opacity="0.18" />
      <path
        d="M25 29 m-8 0 a8 8 0 1 0 16 0 a6 6 0 1 0 -12 0 a4 4 0 1 0 8 0"
        fill="none"
        stroke="#5B3618"
        strokeWidth="2.3"
        strokeLinecap="round"
        opacity="0.72"
      />
      <path d="M10 42 C22 47, 39 47, 55 43" fill="none" stroke="#3EF3C5" strokeOpacity="0.55" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13 41.8 C25 44.5, 39 44.2, 52 42.4" fill="none" stroke="#FCE6B5" strokeOpacity="0.28" strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="33" cy="20" r="2.2" fill="url(#snailPearl)" opacity="0.78" />
      <circle cx="17" cy="25" r="1.2" fill="#FFF2C8" opacity="0.55" />
    </g>
  </g>
));

// 4. Snail Marker
const SnailMarker = React.memo(({ cx, cy, isInfoOpen, onToggleInfo, point, onClick }: any) => {
  return (
    <g 
      transform={`translate(${cx}, ${cy})`} 
      className="pointer-events-auto" 
      onClick={(e) => { 
        e.stopPropagation(); 
        e.preventDefault(); 
        if (onClick) onClick();
        else onToggleInfo(); 
      }} 
      style={{ cursor: 'pointer', zIndex: 50 }}
    >
       {/* Ambient Cyan Halo under Snail */}
       <circle cx="0" cy="5" r="35" fill="url(#snailGlow)" className="snail-pulse" />
       
       {/* White dot exactly at the snail sitting point on curve */}
       <circle cx="0" cy="0" r="3" fill="#FFFFFF" />

       <SnailGlyph />
       
       {/* Vertically aligned SVG tooltip anchored above the snail head. */}
       {!isInfoOpen && (
         <g className="pointer-events-none select-none">
            <path d="M20 -51 C22 -39 25 -27 24 -12" fill="none" stroke="rgba(45,212,191,0.45)" strokeDasharray="2 2" strokeWidth="1" strokeLinecap="round" />
            <g transform="translate(20, -60)">
               <rect x="-66" y="-48" width="132" height="48" rx="12" fill="#050D1D" fillOpacity="0.94" stroke="#2DD4BF" strokeOpacity="0.62" strokeWidth="1" filter="url(#tooltipShadow)" />
               <path d="M -7 0 L 0 8 L 7 0 Z" fill="#050D1D" stroke="#2DD4BF" strokeOpacity="0.62" strokeWidth="1" />
               <path d="M -55 -39 H 55" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
               <text x="0" y="-27" textAnchor="middle" dominantBaseline="middle" fill="#2DD4BF" fontSize="12" fontWeight="900" letterSpacing="0.18em">潜龙勿用</text>
               <text x="0" y="-12" textAnchor="middle" dominantBaseline="middle" fill="#CBD5E1" fontSize="8.5" fontWeight="700" letterSpacing="0.04em">时机未到，韬光养晦。</text>
               <line x1="0" y1="-56" x2="0" y2="-76" stroke="rgba(255,255,255,0.4)" strokeDasharray="2 2" strokeWidth="1" strokeLinecap="round" />
               <g transform="translate(0, -86)">
                  <rect x="-19" y="-9" width="38" height="18" rx="9" fill="#0F111A" stroke="rgba(255,255,255,0.16)" strokeWidth="1" filter="url(#tooltipShadow)" />
                  <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" fill="#E2E8F0" fontSize="8" fontWeight="800" letterSpacing="0.08em">阻力</text>
               </g>
            </g>
         </g>
       )}
       {isInfoOpen && point && (<g transform="translate(0, -75)"><HUDBoxInternal point={point} /></g>)}
    </g>
  );
});

// --- MAIN COMPONENT ---

interface LifeKlineChartProps {
  data: KlinePoint[];
  selectedRange: TimeRange | null;
  onSelectRange: (range: TimeRange, startPrice: number, endPrice: number) => void;
  viewMode: 'weekly' | 'macro';
  onToggleView: (mode: 'weekly' | 'macro') => void;
  userName?: string;
  onSnailClick?: () => void;
}

const getDailyTheme = (dateStr: string, isUp: boolean) => {
  const dayNum = parseInt(dateStr.split('-').join('').slice(-2) || '1');
  if (isUp) {
    const themes = [
      { label: '机遇', desc: '投资/财富' },
      { label: '连接', desc: '社交/人脉' },
      { label: '突破', desc: '事业/行动' },
      { label: '创造', desc: '灵感/心流' }
    ];
    return themes[dayNum % themes.length];
  } else {
    const themes = [
      { label: '健康', desc: '休息/恢复' },
      { label: '内省', desc: '内心/思考' },
      { label: '学习', desc: '技能/学习' },
      { label: '和谐', desc: '耐心/平和' }
    ];
    return themes[dayNum % themes.length];
  }
};

export const LifeKlineChart: React.FC<LifeKlineChartProps> = ({ 
  data, 
  selectedRange, 
  onSelectRange,
  viewMode,
  onToggleView,
  userName = "User",
  onSnailClick
}) => {
  const [startIndex, setStartIndex] = useState<number | null>(null);
  const [currentHoverIndex, setCurrentHoverIndex] = useState<number | null>(null);
  const [hoveredMacroIndex, setHoveredMacroIndex] = useState<number | null>(null);
  const [isSnailInfoOpen, setIsSnailInfoOpen] = useState(false);
  
  // LIVE SIMULATION STATE
  const [simulatedData, setSimulatedData] = useState<KlinePoint[]>([]);
  
  // TRADING MODAL STATE
  const [isTradingModalOpen, setIsTradingModalOpen] = useState(false);
  const [tradingType, setTradingType] = useState<'buy' | 'sell' | 'watch' | null>(null);
  const [activeOrders, setActiveOrders] = useState<TradingOrder[]>([]);

  // Initialize simulated data safely
  useEffect(() => {
    if (data && data.length > 0) {
      setSimulatedData(data);
    } else {
      setSimulatedData([]);
    }
  }, [data]);

  // Load orders from storage
  useEffect(() => {
    const savedOrders = storage.getOrders();
    if (savedOrders.length > 0) {
      setActiveOrders(savedOrders);
    }
  }, []);

  // LIVE MARKET TICKER EFFECT
  useEffect(() => {
    // Only simulate ticks in Weekly (Micro) view to look like a real trading chart
    if (viewMode !== 'weekly' || !simulatedData || simulatedData.length === 0) return;

    const interval = setInterval(() => {
      setSimulatedData(prevData => {
        if (!prevData || prevData.length === 0) return prevData;
        const newData = [...prevData];
        const lastIdx = newData.length - 1;
        if (!newData[lastIdx]) return prevData;

        const lastCandle = { ...newData[lastIdx] };
        // Random Walk Logic
        const volatility = 0.35; 
        const change = (Math.random() - 0.5) * volatility;
        let newClose = lastCandle.close + change;
        
        // Ensure close stays within sensible bounds
        if (newClose > lastCandle.high) lastCandle.high = newClose;
        if (newClose < lastCandle.low) lastCandle.low = newClose;
        lastCandle.close = newClose;
        
        newData[lastIdx] = lastCandle;
        return newData;
      });
    }, 2400); 

    return () => clearInterval(interval);
  }, [viewMode, simulatedData.length]); 

  // Memoize data processing
	  const chartData = useMemo(() => {
	    if (!simulatedData || simulatedData.length === 0) return [];
	    return simulatedData.map(point => ({
      ...point,
      baseline: 50, 
      body: [Math.min(point.open, point.close), Math.max(point.open, point.close)],
      color: point.close > point.open ? '#3EF3C5' : '#FB7185'
	    }));
	  }, [simulatedData]);

  const [chartReady, setChartReady] = useState(false);
  const chartHostRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });

  const measureChartHost = () => {
    const node = chartHostRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const fallbackWidth = typeof window !== 'undefined'
      ? Math.max(280, Math.min(window.innerWidth - 32, 720))
      : 360;
    const width = Math.round(rect.width || node.clientWidth || fallbackWidth);
    const height = Math.round(rect.height || node.clientHeight || (viewMode === 'macro' ? 380 : 300));
    setChartSize((prev) => (
      prev.width === width && prev.height === height ? prev : { width, height }
    ));
  };

  useEffect(() => {
    const node = chartHostRef.current;
    if (!node) return;

    let frame = 0;
    const update = () => {
      frame = window.requestAnimationFrame(() => {
        measureChartHost();
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

  useEffect(() => {
    let firstFrame = 0;
    let secondFrame = 0;
    const handleResize = () => measureChartHost();

    firstFrame = window.requestAnimationFrame(() => {
      measureChartHost();
      secondFrame = window.requestAnimationFrame(measureChartHost);
    });
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleResize);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleResize);
    };
  }, [viewMode, chartData.length]);

  useEffect(() => {
    setChartReady(false);
    let secondFrame = 0;
	    const firstFrame = requestAnimationFrame(() => {
	      secondFrame = requestAnimationFrame(() => setChartReady(true));
	    });
	    return () => {
	      cancelAnimationFrame(firstFrame);
	      if (secondFrame) cancelAnimationFrame(secondFrame);
	    };
	  }, [viewMode, chartData.length]);

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[55vh] min-h-[400px] relative bg-transparent flex items-center justify-center">
        <div className="text-slate-600 text-xs animate-pulse tracking-widest uppercase">Initializing Destiny Map...</div>
      </div>
    );
  }

  const allLows = chartData.length > 0 ? chartData.map(d => d.low) : [0];
  const allHighs = chartData.length > 0 ? chartData.map(d => d.high) : [100];
  const minPrice = Math.min(...allLows) * 0.9;
  const maxPrice = Math.max(...allHighs) * 1.1;

  const presentPointIndex = chartData.findIndex(d => d.label === '当前' || d.label === 'PRESENT');
  const presentPoint = presentPointIndex !== -1
    ? chartData[presentPointIndex]
    : (viewMode === 'macro' && chartData.length > 0 ? chartData[Math.min(6, chartData.length - 1)] : null);
  const renderWidth = chartSize.width > 1
    ? chartSize.width
    : (typeof window !== 'undefined' ? Math.max(280, Math.min(window.innerWidth - 32, 720)) : 360);
  const renderHeight = chartSize.height > 1
    ? chartSize.height
    : (viewMode === 'macro' ? 380 : 300);

  const handleMouseDown = (e: any) => {
    if (viewMode === 'macro') return; 
    if (e && e.activeTooltipIndex !== undefined) {
      setStartIndex(e.activeTooltipIndex);
      setCurrentHoverIndex(e.activeTooltipIndex);
    }
  };

  const handleMouseUp = (e: any) => {
    if (viewMode === 'macro') return;
    if (startIndex !== null && e && e.activeTooltipIndex !== undefined) {
      const endIndex = e.activeTooltipIndex;
      const start = Math.min(startIndex, endIndex);
      const end = Math.max(startIndex, endIndex);
      if (data[start] && data[end]) {
          const startItem = data[start];
          const endItem = data[end];
          onSelectRange(
            { start_date: startItem.date, end_date: endItem.date },
            startItem.open,
            endItem.close
          );
      }
    }
    setStartIndex(null);
    setCurrentHoverIndex(null);
  };

  const handleMouseMove = (e: any) => {
    if (viewMode === 'macro' && e && e.activeTooltipIndex !== undefined) {
      setHoveredMacroIndex(prev => prev === e.activeTooltipIndex ? prev : e.activeTooltipIndex);
    }
    if (viewMode === 'weekly' && startIndex !== null && e && e.activeTooltipIndex !== undefined) {
      setCurrentHoverIndex(prev => prev === e.activeTooltipIndex ? prev : e.activeTooltipIndex);
    }
  };

  const handleMouseLeave = () => {
    if (viewMode === 'macro') setHoveredMacroIndex(null);
    if (viewMode === 'weekly' && startIndex !== null) {
      setStartIndex(null);
      setCurrentHoverIndex(null);
    }
  };

  const selectionStartIdx = selectedRange ? data.findIndex(d => d.date === selectedRange.start_date) : -1;
  const selectionEndIdx = selectedRange ? data.findIndex(d => d.date === selectedRange.end_date) : -1;

  // New logic for order markers
  const renderActiveOrders = () => {
    if (viewMode !== 'weekly' || activeOrders.length === 0) return null;
    
    // We visualize orders on the last few candles (simulated range)
    // Buy orders -> Green tint area
    // Sell orders -> Small marker icon
    // Watch orders -> Dashed line/Area
    
    // Simple implementation: Just mark the "latest" zone for demo purposes
    const lastDataPoint = chartData[chartData.length - 1];
    const rangeStartPoint = chartData[Math.max(0, chartData.length - 7)]; // Last 7 days

    if (!lastDataPoint || !rangeStartPoint) return null;

    return activeOrders.map((order, idx) => {
       // Offset different orders slightly if needed, for now just overlay
       if (order.type === 'buy') {
         return (
            <g key={order.id}>
              <ReferenceArea 
                x1={rangeStartPoint.date} 
                x2={lastDataPoint.date} 
                fill="#14B8A6" 
                fillOpacity={0.08} 
              />
              <ReferenceDot x={lastDataPoint.date} y={lastDataPoint.high * 1.02} r={0}>
                 <Label content={() => (
                    <g transform={`translate(0, -20)`}>
                       <text x="0" y="0" textAnchor="end" fill="#2DD4BF" fontSize="10" fontWeight="bold">LONG: {order.category}</text>
                    </g>
                 )} />
              </ReferenceDot>
            </g>
         );
       }
       if (order.type === 'sell') {
         return (
            <g key={order.id}>
              <ReferenceDot x={lastDataPoint.date} y={lastDataPoint.low * 0.98} r={0}>
                 <Label content={() => (
                    <g transform={`translate(0, 10)`}>
                       <text x="0" y="0" textAnchor="end" fill="#FB7185" fontSize="10" fontWeight="bold">SHORT: {order.category}</text>
                    </g>
                 )} />
              </ReferenceDot>
            </g>
         );
       }
       if (order.type === 'watch') {
         return (
            <g key={order.id}>
               <ReferenceArea 
                x1={rangeStartPoint.date} 
                x2={lastDataPoint.date} 
                fill="#64748B" 
                fillOpacity={0.05} 
                stroke="#64748B"
                strokeDasharray="3 3"
              />
               <ReferenceDot x={lastDataPoint.date} y={lastDataPoint.close} r={0}>
                 <Label content={() => (
                    <g transform={`translate(0, -40)`}>
                       <text x="0" y="0" textAnchor="middle" fill="#94A3B8" fontSize="10">HOLD</text>
                    </g>
                 )} />
              </ReferenceDot>
            </g>
         );
       }
       return null;
    });
  };

  const RenderDestinyAnnotation = (props: any) => {
    const { x, y, index } = props;
    if (!data || !data[index]) return null;

    // Index 2 is Left valley -> "觉醒" annotation, pointing vertically downwards
    if (index === 2) {
      return (
        <g className="animate-fade-in pointer-events-none select-none z-10 font-sans">
          {/* Connector Dot on the curve */}
          <circle cx={x} cy={y} r={6} fill="rgba(255,255,255,0.15)" />
          <circle cx={x} cy={y} r={2.5} fill="#FFFFFF" />
          
          {/* Vertical dashed connector line downwards */}
          <line x1={x} y1={y + 5} x2={x} y2={y + 50} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" strokeWidth={1} />
          
          {/* Circular/Capsule "觉醒" badge */}
          <g transform={`translate(${x}, ${y + 64})`}>
             <rect x="-24" y="-12" width="48" height="24" rx="12" fill="#0C0F1A" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
             <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" fill="#E2E8F0" fontSize="10" fontWeight="bold" letterSpacing="0.05em">觉醒</text>
          </g>
        </g>
      );
    }

    // Index 9 is Right-side Highest Peak -> "FUTURE" text design
    if (index === 9) {
      return (
        <g className="animate-fade-in pointer-events-none select-none z-10 font-sans">
          <text 
            x={x + 10} 
            y={y - 25} 
            fill="#64748B" 
            textAnchor="middle" 
            dominantBaseline="middle" 
            fontSize="14" 
            fontWeight="bold" 
            letterSpacing="0.45em"
          >
            FUTURE
          </text>
        </g>
      );
    }

    return null;
  };

  const currentWeeklyPrice = chartData.length > 0 ? chartData[chartData.length - 1].close : 50;
  const prevWeeklyPrice = chartData.length > 1 ? chartData[chartData.length - 2].close : 50;

  return (
    <div 
      id="tour-chart"
      className={`w-full flex flex-col mt-0 select-none transition-all duration-700 ease-in-out border border-white/10 rounded-[28px] overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]
        ${viewMode === 'macro' 
          ? 'h-[78vh] min-h-[640px] md:min-h-[680px] bg-gradient-to-b from-purple-950/20 via-[#050914] to-[#010308]' 
          : 'h-[60vh] min-h-[460px] md:min-h-[500px] bg-gradient-to-b from-teal-950/10 via-[#050914] to-[#010308]'}`}
    >
      <style>{`
        @keyframes stablePulse { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.1); opacity: 0.8; } }
        .snail-pulse { animation: stablePulse 3.2s ease-in-out infinite; transform-origin: center; }
        
        @keyframes snailCrawl {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          25% { transform: translate3d(1.5px, -0.8px, 0) rotate(1.3deg); }
          50% { transform: translate3d(0, -1.8px, 0) rotate(0deg); }
          75% { transform: translate3d(-1.5px, -0.8px, 0) rotate(-1.3deg); }
        }
        .snail-move { animation: snailCrawl 5.5s ease-in-out infinite; transform-origin: center; will-change: transform; }
        #tour-chart .recharts-wrapper,
        #tour-chart .recharts-surface,
        #tour-chart .recharts-layer.recharts-reference-dot {
          overflow: visible;
        }

        @keyframes floatText { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .float-text { animation: floatText 2s ease-in-out infinite; }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
      
      {/* Trading Modal Overlay */}
      <TradingModal 
        isOpen={isTradingModalOpen}
        type={tradingType}
        onClose={() => setIsTradingModalOpen(false)}
        onConfirm={(order) => {
          const newOrders = [...activeOrders, order];
          setActiveOrders(newOrders);
          storage.saveOrders(newOrders);
          if (order.type === 'watch') {
             setIsTradingModalOpen(false);
          }
        }}
      />

      {/* EXQUISITE HEADER BAR: 100% matched with the upload design 1:1 */}
      <div className="flex-shrink-0 w-full px-5 py-4 relative border-b border-white/5 bg-[#000000]/20 z-30">
        
        {/* TITLE: Top Left */}
        <div className="mb-4 pl-1 flex items-baseline gap-2.5 select-none animate-fade-in">
           <h3 className="text-[15px] font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#E2E8F0] via-[#C7D2FE] to-[#818CF8] tracking-[0.25em]">
              你的人生走势图
           </h3>
        </div>

        <div className="flex items-center justify-between">
           {/* VIEW NAME BADGE: On the LEFT */}
           <div className="flex items-center gap-2 bg-[#1A182F]/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-purple-500/10 shadow-md select-none w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_#a855f7] animate-pulse" />
              <span className="text-[11.5px] font-bold text-slate-200 tracking-wider">
                 {viewMode === 'macro' ? '宿命视图' : '微观视图'}
              </span>
           </div>

           {/* VIEW SELECTOR SWITCHER: On the RIGHT */}
           <div className="flex bg-[#000000]/60 backdrop-blur-md rounded-full p-0.5 border border-white/10 shadow-inner">
          <button 
             onClick={(e) => { e.stopPropagation(); onToggleView('macro'); }} 
             className={`px-4 py-1 text-[11.5px] font-extrabold rounded-full transition-all duration-300 ${
                 viewMode === 'macro' 
                 ? 'bg-[#1D1B2F] text-white border border-white/5 shadow-md' 
                 : 'text-slate-400 hover:text-slate-200'
             }`}
          >
             大周期
          </button>
          <button 
             onClick={(e) => { e.stopPropagation(); onToggleView('weekly'); }} 
             className={`px-4 py-1 text-[11.5px] font-extrabold rounded-full transition-all duration-300 ${
                 viewMode === 'weekly' 
                 ? 'bg-[#1D1B2F] text-white border border-white/5 shadow-md' 
                 : 'text-slate-400 hover:text-slate-200'
             }`}
          >
             本周
          </button>
        </div>
        </div>
      </div>

      {/* Static placement of SelfTradingWidgetExchange in Weekly mode */}
      {viewMode === 'weekly' && (
         <div className="flex-shrink-0 w-full border-b border-white/5 bg-[#020408]/90 z-20">
            <SelfTradingWidgetExchange 
               currentPrice={currentWeeklyPrice} 
               prevPrice={prevWeeklyPrice} 
               userName={userName}
               onOpenTrading={(type) => {
                  setTradingType(type);
                  setIsTradingModalOpen(true);
               }}
            />
         </div>
      )}

      {/* CHART CONTAINER AREA: Flex-1 takes all vertical space beautifully */}
      <div ref={chartHostRef} className="flex-1 w-full min-h-[280px] relative z-10 py-3 overflow-visible">
         {viewMode === 'macro' && (
           <div className="absolute top-2 right-5 z-0 text-right pointer-events-none select-none transition-opacity duration-300" style={{ opacity: hoveredMacroIndex !== null ? 0.25 : 0.65 }}>
              <div className="text-[9.5px] text-[#818cf8]/50 font-mono tracking-wider">Era Energy × Personal Destiny Wave</div>
           </div>
         )}

	         {chartReady ? (
	           <ComposedChart
             width={renderWidth}
             height={renderHeight}
             data={chartData} 
             margin={{ top: viewMode === 'macro' ? 132 : 34, right: viewMode === 'macro' ? 72 : 24, left: viewMode === 'macro' ? 58 : -16, bottom: viewMode === 'macro' ? 58 : 24 }}
             onMouseDown={handleMouseDown}
             onMouseUp={handleMouseUp}
             onMouseMove={handleMouseMove}
             onMouseLeave={handleMouseLeave}
           >
             <defs>
               <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
               <filter id="tooltipShadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#020617" floodOpacity="0.68"/><feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#2DD4BF" floodOpacity="0.16"/></filter>
               <filter id="hudShadow" x="-35%" y="-35%" width="170%" height="170%"><feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#020617" floodOpacity="0.58"/><feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#2DD4BF" floodOpacity="0.14"/></filter>
               <filter id="snailSoftShadow" x="-55%" y="-55%" width="210%" height="210%"><feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.72"/><feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#3EF3C5" floodOpacity="0.16"/></filter>
               <filter id="curveGlow">
                 <feGaussianBlur stdDeviation="3.0" result="blur" />
                 <feComponentTransfer in="blur" result="glow">
                   <feFuncA type="linear" slope="0.75" />
                 </feComponentTransfer>
                 <feMerge>
                   <feMergeNode in="glow" />
                   <feMergeNode in="SourceGraphic" />
                 </feMerge>
               </filter>
               <linearGradient id="destinyFill" x1="0" y1="0" x2="0" y2="1">
                 <stop offset="0%" stopColor="#4c1d95" stopOpacity="0.4" />
                 <stop offset="50%" stopColor="#4c1d95" stopOpacity="0.05" />
                 <stop offset="100%" stopColor="#000000" stopOpacity="0" />
               </linearGradient>
               <linearGradient id="destinyStroke" x1="0" y1="0" x2="1" y2="0">
                 <stop offset="0%" stopColor="#64748B" stopOpacity="0.8" />
                 <stop offset="60%" stopColor="#94A3B8" stopOpacity="0.85" />
                 <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.6" />
               </linearGradient>
               <linearGradient id="gradientLine" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(62, 243, 197, 0)"/><stop offset="50%" stopColor="rgba(62, 243, 197, 0.5)"/><stop offset="100%" stopColor="rgba(62, 243, 197, 1)"/></linearGradient>
               <linearGradient id="hudShine" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.13"/><stop offset="100%" stopColor="#FFFFFF" stopOpacity="0"/></linearGradient>
               <radialGradient id="snailGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0%" stopColor="#3EF3C5" stopOpacity="0.5"/><stop offset="100%" stopColor="#3EF3C5" stopOpacity="0"/></radialGradient>
               <linearGradient id="snailBody" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#F8D79F"/><stop offset="46%" stopColor="#C7904F"/><stop offset="100%" stopColor="#6B4524"/></linearGradient>
               <radialGradient id="snailHead" cx="0.36" cy="0.24" r="0.86"><stop offset="0%" stopColor="#FFE7BA"/><stop offset="58%" stopColor="#D7A661"/><stop offset="100%" stopColor="#815026"/></radialGradient>
               <radialGradient id="snailShell" cx="0.42" cy="0.36" r="0.66">
                 <stop offset="0%" stopColor="#FFE7A7" />
                 <stop offset="45%" stopColor="#D5963B" />
                 <stop offset="100%" stopColor="#6E3B16" />
               </radialGradient>
               <radialGradient id="snailPearl" cx="0.35" cy="0.3" r="0.75"><stop offset="0%" stopColor="#FFFFFF"/><stop offset="55%" stopColor="#FFF0BF"/><stop offset="100%" stopColor="#D8A447" stopOpacity="0.7"/></radialGradient>
               <linearGradient id="snailMucus" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#3EF3C5" stopOpacity="0"/><stop offset="45%" stopColor="#3EF3C5" stopOpacity="0.42"/><stop offset="100%" stopColor="#C8FFF4" stopOpacity="0.08"/></linearGradient>
             </defs>
             <CartesianGrid stroke="rgba(255,255,255,0.02)" vertical={false} />
             <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} hide={viewMode === 'macro'} tickFormatter={(value) => value && value.length > 8 ? value.slice(5) : value} tickMargin={10} minTickGap={30} />
             <YAxis domain={[minPrice, maxPrice]} hide />
             {viewMode === 'weekly' && (
               <Tooltip content={({ active, payload }) => {
                   if (active && payload && payload.length) {
                     const d = payload[0].payload as KlinePoint;
                     const isUp = d.close > d.open;
                     const theme = getDailyTheme(d.date, isUp);
                     return (
                       <div className="bg-slate-900/80 border border-white/10 p-3 rounded-xl backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] min-w-[130px]">
                         <p className="text-slate-500 text-[9px] mb-2 font-mono tracking-wider">{d.date}</p>
                         <div className="flex items-center gap-2 mb-1.5">
                           <div className={`w-1.5 h-1.5 rounded-full ${isUp ? 'bg-teal-400' : 'bg-rose-400'} shadow-[0_0_8px_currentColor]`} />
                           <p className={`text-xs font-bold ${isUp ? 'text-teal-200' : 'text-rose-200'}`}>{isUp ? i18n.t('chart.tooltip.up') : i18n.t('chart.tooltip.down')}</p>
                         </div>
                         <div className="text-[10px] text-white font-medium pl-3.5 mb-1">{theme.label}</div>
                         <div className="text-[9px] text-slate-400 pl-3.5 italic opacity-80">{theme.desc}</div>
                       </div>
                     );
                   }
                   return null;
                 }} cursor={{ stroke: '#3EF3C5', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.3 }} />
             )}
             {viewMode === 'weekly' && selectionStartIdx !== -1 && selectionEndIdx !== -1 && data[selectionStartIdx] && data[selectionEndIdx] && (
               <ReferenceArea x1={data[selectionStartIdx].date} x2={data[selectionEndIdx].date} fill="#3EF3C5" fillOpacity={0.05} />
             )}
             {viewMode === 'weekly' && startIndex !== null && currentHoverIndex !== null && data[startIndex] && data[currentHoverIndex] && (
               <ReferenceArea x1={data[startIndex].date} x2={data[currentHoverIndex].date} fill="#3EF3C5" fillOpacity={0.15} stroke="#3EF3C5" strokeWidth={1} strokeDasharray="5 5" />
             )}
             
             {/* Active Order Markers */}
             {renderActiveOrders()}
   
             {viewMode === 'macro' && (
               <Area type="monotone" dataKey="close" stroke="url(#destinyStroke)" strokeWidth={2.5} fill="url(#destinyFill)" isAnimationActive={true} animationDuration={850} animationEasing="ease-out" label={<RenderDestinyAnnotation />} />
             )}
             {viewMode === 'macro' && presentPoint && (
               <ReferenceDot ifOverflow="visible" x={presentPoint.date} y={presentPoint.close} shape={(props: any) => (<SnailMarker cx={props.cx} cy={props.cy} point={presentPoint} isInfoOpen={isSnailInfoOpen} onClick={onSnailClick} onToggleInfo={() => { setIsSnailInfoOpen(!isSnailInfoOpen); }} />)} />
             )}
             {viewMode === 'weekly' && (
               <Bar dataKey="body" fill="#8884d8" minPointSize={1} isAnimationActive={true} animationDuration={420} animationEasing="ease-out">
                  {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} radius={2} />))}
               </Bar>
             )}
             {viewMode === 'weekly' && chartData[chartData.length - 1] && (
               <ReferenceDot x={chartData[chartData.length - 1].date} y={chartData[chartData.length - 1].close} r={3} fill="#3EF3C5" stroke="none">
                  <Label content={() => (<g><circle cx={0} cy={0} r="3" fill="#3EF3C5" filter="url(#glow)" className="snail-pulse" /></g>)} />
               </ReferenceDot>
             )}
           </ComposedChart>
	         ) : (
	           <div className="w-full h-full" aria-hidden="true" />
	         )}
      </div>

      {/* Section 2 & 3: Snail Trend Legend & Explanation Footer (Placed cleanly at the bottom container flow) */}
      {viewMode === 'macro' && (
        <div className="flex-shrink-0 w-full px-5 pb-5 pt-2 border-t border-white/5 bg-black/20 flex flex-col gap-3 z-30">
           
           {/* Section 2: Legend Indicators - High-end visualization widgets */}
           <div className="grid grid-cols-3 gap-1.5 sm:gap-3 text-center min-w-0">
              {/* Indicator 1: Rising Opportunity */}
              <div className="bg-[#05070B]/95 border border-emerald-500/15 rounded-xl p-1.5 sm:p-2 flex flex-col items-center group/leg relative overflow-hidden transition-all duration-300 hover:border-emerald-500/40 hover:bg-emerald-950/20 shadow-md min-w-0">
                 <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent animate-pulse" />
                 <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                    <span className="text-[10px] sm:text-[11.5px] font-serif font-bold text-emerald-300 tracking-wide">上升机会</span>
                 </div>
                 <span className="text-[8.5px] sm:text-[10.5px] text-slate-300 font-medium tracking-wide leading-tight break-words">能量上升的阶段</span>
              </div>

              {/* Indicator 2: Current Resistance */}
              <div className="bg-[#05070B]/95 border border-amber-500/15 rounded-xl p-1.5 sm:p-2 flex flex-col items-center group/leg relative overflow-hidden transition-all duration-300 hover:border-amber-500/40 hover:bg-amber-950/20 shadow-md min-w-0">
                 <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                 <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse" />
                    <span className="text-[10px] sm:text-[11.5px] font-serif font-bold text-amber-300 tracking-wide">当前阻力</span>
                 </div>
                 <span className="text-[8.5px] sm:text-[10.5px] text-slate-300 font-medium tracking-wide leading-tight break-words">需要谨慎的时刻</span>
              </div>

              {/* Indicator 3: Future Trend */}
              <div className="bg-[#05070B]/95 border border-indigo-500/15 rounded-xl p-1.5 sm:p-2 flex flex-col items-center group/leg relative overflow-hidden transition-all duration-300 hover:border-indigo-500/40 hover:bg-indigo-950/20 shadow-md min-w-0">
                 <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
                 <div className="flex items-center justify-center gap-1.5 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)] animate-ping" style={{ animationDuration: '3s' }} />
                    <span className="text-[10px] sm:text-[11.5px] font-serif font-bold text-indigo-300 tracking-wide">未来趋势</span>
                 </div>
                 <span className="text-[8.5px] sm:text-[10.5px] text-slate-300 font-medium tracking-wide leading-tight break-words">可能的发展方向</span>
              </div>
           </div>

           {/* Section 3: Explanation Guide with advanced visual backdrop */}
           <div className="relative rounded-xl bg-gradient-to-br from-[#090C15] to-[#040608] p-2 sm:p-2.5 border border-white/[0.06] overflow-hidden flex items-start gap-2 sm:gap-2.5 group hover:border-[#D4AF37]/20 transition-all duration-300 shadow-inner">
              <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-purple-500/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
              
              <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-900 border border-slate-700/60 flex items-center justify-center mt-0.5 text-xs text-purple-300/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.05)]">
                 <Crosshair size={13} />
              </div>

              <div className="flex-1 min-w-0 text-left">
                 <div className="text-[10px] sm:text-xs font-serif font-bold text-[#F5E6D3] tracking-wider mb-0.5 flex items-center gap-1.5">
                    <span>你现在看见的是什么?</span>
                    <span className="w-1 h-1 rounded-full bg-[#D4AF37] opacity-60" />
                 </div>
                 <div className="text-[8.5px] sm:text-[9.5px] text-[#A39F99] font-sans font-medium tracking-normal leading-relaxed select-text">
                    这是一张你当前人生周期的趋势图，帮你判断顺势、转折与该不该出手。
                 </div>
              </div>
           </div>

        </div>
      )}
    </div>
  );
};
