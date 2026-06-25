
import React, { useEffect, useState, useRef } from 'react';
import { ValuationResult } from '../types';
import { Button } from './Button';
import { formatCurrency, saveImageToLocal } from '../utils';

// Declare html2canvas
declare const html2canvas: any;

interface ValuationCardProps {
  result: ValuationResult;
  onPkStart: () => void;
  onShare: () => void;
  onUnlockComplete: () => void; // 新增：解冻完成回调
}

// 模拟计数器 Hooks
const useCounter = (end: number, duration: number = 2000) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      setValue(progress === 1 ? end : Math.floor(end * ease));
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return value;
};

export const ValuationCard: React.FC<ValuationCardProps> = ({ result, onPkStart, onShare, onUnlockComplete }) => {
  const animatedValuation = useCounter(result.valuation, 2500);
  
  // 状态管理
  const [modalStage, setModalStage] = useState<'hidden' | 'risk_alert' | 'sharing_process'>('hidden');
  const [isFrozen, setIsFrozen] = useState(true);

  const captureRef = useRef<HTMLDivElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);

  // 初始自动弹出拦截 (1.5秒后)
  useEffect(() => {
    const timer = setTimeout(() => {
        if (isFrozen) setModalStage('risk_alert');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleUnlockSuccess = () => {
      // 模拟验证过程
      if(navigator.vibrate) navigator.vibrate(100);
      
      const toast = document.createElement('div');
      toast.className = 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-6 py-4 rounded-xl z-[200] animate-pop-in flex flex-col items-center backdrop-blur-md';
      toast.innerHTML = '<div class="text-3xl mb-2"></div><div class="font-bold">好友担保成功</div><div class="text-xs opacity-70 mt-1">资金已解冻</div>';
      document.body.appendChild(toast);

      setTimeout(() => {
          toast.remove();
          setModalStage('hidden');
          setIsFrozen(false);
          // 跳转到银行界面
          onUnlockComplete();
      }, 1500);
  };

  const handleWithdrawClick = () => {
      if (isFrozen) {
          setModalStage('risk_alert');
          if(navigator.vibrate) navigator.vibrate(200);
      } else {
         // 已解冻，跳转到银行
         onUnlockComplete();
      }
  };

  const handleStartShare = () => {
      // 1. 触发外部 Share SDK (如果有)
      onShare(); 
      // 2. 进入分享等待界面 (静态)
      setModalStage('sharing_process');
  };

  // 硬编码的趣味流水 (保留在旧卡片作为背景，新银行界面有更全的)
  const transactions = [
      { id: 't-1', title: '吗喽翻身补助金', tag: '财运', amount: 200000.00, date: '2026-02-01', type: 'income' },
      { id: 't-2', title: '拒绝画饼精神赔偿', tag: '桃花', amount: 50000.00, date: '2026-03-15', type: 'income' },
      { id: 't-3', title: '摸鱼全勤奖', tag: '事业', amount: 472225.00, date: '2026-06-18', type: 'income' }
  ];

  return (
    <div className="flex flex-col h-full relative bg-[#F5F7FA] font-sans overflow-hidden">
        
        {/* 全屏容器 */}
        <div ref={captureRef} className="flex flex-col h-full bg-[#F5F7FA]">
            
            {/* 1. 头部区域：翻身财务系统 (更精致、更真实) */}
            <div className="relative z-10 overflow-hidden shadow-xl rounded-b-[32px] shrink-0">
                {/* 背景层：仿钞票/存单纹理 */}
                <div className="absolute inset-0 bg-[#D92332] z-0"></div>
                <div className="absolute inset-0 opacity-20 texture-diagmonds mix-blend-overlay z-0"></div>
                {/* 金色光泽渐变 */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-transparent to-black/30 z-0 pointer-events-none"></div>

                {/* 顶栏：系统状态 */}
                <div className="relative z-10 flex justify-between items-center px-5 pt-4 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2 text-white/90">
                        <div className="w-4 h-4 rounded-full border border-white/40 flex items-center justify-center text-[10px]">CN</div>
                        <span className="text-[10px] font-serif tracking-[0.2em] font-bold text-shadow-sm">TURNOVER BANK SYSTEM</span>
                    </div>
                    {/* PK 入口 */}
                    <div onClick={onPkStart} className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded text-[10px] text-[#F2C97D] font-bold cursor-pointer hover:bg-black/30 transition">
                        <span></span>
                        <span>发起PK</span>
                    </div>
                </div>

                {/* 核心资产面板 */}
                <div className="px-6 pt-6 pb-8 text-center relative z-10">
                    {/* 官方印章背景 (绝对定位) */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-4 border-white/5 rounded-full z-[-1] pointer-events-none"></div>

                    {/* 财神图标 */}
                    <div className="w-14 h-14 mx-auto bg-gradient-to-b from-[#FFF1B8] to-[#FFD666] rounded-full flex items-center justify-center border-[3px] border-[#FFFFFF]/30 shadow-lg mb-3">
                        <span className="text-3xl filter drop-shadow-md">VIP</span>
                    </div>

                    <div className="flex items-center justify-center gap-2 mb-1 opacity-90">
                        <span className="text-[#FFF1B8] text-xs font-bold tracking-widest">2026 预估身价资产</span>
                        <span className="px-1.5 py-0.5 bg-[#F2C97D] text-[#8E0000] text-[8px] font-black rounded-sm transform scale-90">OFFICIAL</span>
                    </div>
                    
                    {/* 金额滚轮 */}
                    <div 
                        className="text-[3.5rem] leading-none font-num font-black tracking-tighter drop-shadow-lg cursor-pointer active:scale-95 select-none transition-all duration-200 ease-out inline-flex items-baseline justify-center relative text-white"
                        onClick={() => isFrozen && setModalStage('risk_alert')}
                    >
                        <span className="text-2xl mr-1 font-bold opacity-80">¥</span>
                        <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-[#F0F0F0]">
                            {formatCurrency(animatedValuation)}
                        </span>
                        
                        {/* 状态徽章 (根据是否冻结变化) */}
                        {isFrozen ? (
                             <div className="absolute -top-4 -right-12 transform rotate-12 bg-blue-600/90 text-white text-[10px] px-2 py-0.5 rounded shadow-lg border border-white/20 backdrop-blur-sm animate-pulse">
                                冻结中
                            </div>
                        ) : (
                             <div className="absolute -top-4 -right-12 transform rotate-12 bg-[#07C160] text-white text-[10px] px-2 py-0.5 rounded shadow-lg border border-white/20">
                                已激活
                            </div>
                        )}
                    </div>

                    {/* 状态条 */}
                    <div className="mt-5 flex justify-center">
                         {isFrozen ? (
                            <button 
                                onClick={() => setModalStage('risk_alert')}
                                className="bg-[#2C1608]/40 backdrop-blur-md border border-white/10 text-[#F2C97D] px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-[#2C1608]/50 transition-colors shadow-inner"
                            >
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-[ping_1.5s_infinite]"></span>
                                <span>资金监管拦截 · 点击解封</span>
                                <span className="opacity-50 font-serif">&gt;</span>
                            </button>
                         ) : (
                             <div className="bg-white/20 backdrop-blur-md border border-white/20 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#07C160]"></span>
                                <span>账户状态正常 · 可提现</span>
                            </div>
                         )}
                    </div>
                </div>
                
                {/* 底部装饰锯齿 */}
                <div className="h-4 bg-[#F5F7FA] w-full" style={{clipPath: "polygon(0 100%, 100% 100%, 100% 0, 0 0, 5% 50%, 10% 0, 15% 50%, 20% 0, 25% 50%, 30% 0, 35% 50%, 40% 0, 45% 50%, 50% 0, 55% 50%, 60% 0, 65% 50%, 70% 0, 75% 50%, 80% 0, 85% 50%, 90% 0, 95% 50%)"}}></div>
            </div>

            {/* 2. 交易明细列表 */}
            <div className="flex-1 px-4 -mt-2 relative z-0 overflow-y-auto pb-28 scrollbar-hide">
                <div className="bg-white rounded-2xl shadow-sm min-h-full pt-4 px-1 border border-white/50">
                    <div className="px-4 mb-3 flex justify-between items-center">
                        <span className="font-bold text-[#1F2937] text-sm tracking-wide">资金流水</span>
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">2026 财年 ▼</span>
                    </div>

                    <div className="space-y-2">
                        {transactions.map((t) => (
                            <div key={t.id} className="flex justify-between items-center p-3 mx-2 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100 group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#FFF1F0] text-[#FF4D4F] flex items-center justify-center font-bold text-xs shrink-0 border border-[#FFCCC7] shadow-sm group-hover:scale-110 transition-transform">
                                        {t.tag}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-gray-900 font-bold text-sm">{t.title}</span>
                                        <span className="text-gray-400 text-[10px] mt-0.5 font-mono">{t.date}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[#CF1322] font-num font-bold text-base">+{formatCurrency(t.amount)}</div>
                                    <div className="text-[10px] text-gray-400">已入账</div>
                                </div>
                            </div>
                        ))}
                         {/* 扣款项 */}
                         <div className="flex justify-between items-center p-3 mx-2 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-xs shrink-0 border border-gray-200">
                                        税
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-gray-900 font-bold text-sm">智商税补缴</span>
                                        <span className="text-gray-400 text-[10px] mt-0.5 font-mono">2026-06-19</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-gray-800 font-num font-bold text-base">-250.00</div>
                                    <div className="text-[10px] text-gray-400">自动扣款</div>
                                </div>
                            </div>
                    </div>
                </div>
            </div>

            {/* 3. 底部提现按钮 */}
            <div className="absolute bottom-0 left-0 w-full bg-white/90 backdrop-blur-lg border-t border-gray-100 p-4 pb-safe z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                <button 
                    onClick={handleWithdrawClick}
                    disabled={!isFrozen && false} 
                    className={`w-full font-bold text-lg py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transform active:scale-95 select-none transition-all duration-200 ease-out ${
                        isFrozen 
                        ? 'bg-[#07C160] hover:bg-[#06AD56] text-white shadow-green-200' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                    }`}
                >
                    {isFrozen ? (
                        <>
                            <span className="text-xl"></span>
                            <span>立即提现到微信</span>
                        </>
                    ) : (
                        <>
                            <span className="text-xl"></span>
                            <span>提现处理中...</span>
                        </>
                    )}
                </button>
                <div className="flex justify-center items-center gap-1 mt-3 opacity-40">
                    <span className="w-3 h-3 bg-gray-400 rounded-full flex items-center justify-center text-[8px] text-white">✓</span>
                    <span className="text-[10px] text-gray-500 font-serif">翻身银行财务系统资金托管中</span>
                </div>
            </div>

        </div>

        {/* 4. 全新风控拦截弹窗 (Modal) */}
        {modalStage !== 'hidden' && (
            <div className="absolute inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 animate-pop-in">
                {/* 背景遮罩 */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[4px]" onClick={() => setModalStage('hidden')}></div>
                
                {/* 弹窗主体 */}
                <div className="relative bg-white w-full max-w-sm rounded-t-[24px] sm:rounded-[24px] overflow-hidden shadow-2xl animate-slide-up flex flex-col max-h-[90vh]">
                    
                    {/* A. 初始警告状态 */}
                    {modalStage === 'risk_alert' && (
                        <>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setModalStage('hidden'); }} 
                                className="absolute top-4 right-4 z-50 w-8 h-8 flex items-center justify-center bg-white/20 rounded-full text-white hover:bg-white/30 backdrop-blur-md"
                            >
                                ✕
                            </button>
                            
                            {/* 顶部红色警示区 */}
                            <div className="bg-[#FF3B30] text-white p-6 pb-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 opacity-10 text-9xl transform translate-x-10 -translate-y-4"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2 opacity-90">
                                        <span className="px-1.5 py-0.5 border border-white/40 rounded text-[10px] font-bold tracking-wider">SYSTEM ALERT</span>
                                    </div>
                                    <h3 className="text-2xl font-black tracking-tight">大额资金拦截</h3>
                                    <p className="text-white/80 text-xs mt-1">Error Code: 2026-RICH-OVERFLOW</p>
                                </div>
                            </div>

                            {/* 内容区 */}
                            <div className="px-6 py-6 -mt-4 bg-white rounded-t-[20px] relative z-10">
                                <div className="flex flex-col items-center text-center">
                                    {/* 拟物化锁图标 */}
                                    <div className="w-20 h-20 -mt-14 mb-4 bg-white rounded-full p-1 shadow-lg flex items-center justify-center relative">
                                        <div className="w-full h-full bg-red-50 rounded-full flex items-center justify-center border-4 border-red-100">
                                            <span className="text-4xl"></span>
                                        </div>
                                        <div className="absolute bottom-0 right-0 w-6 h-6 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold">!</div>
                                    </div>

                                    <h4 className="text-lg font-bold text-gray-900 mb-2">
                                        尊敬的 <span className="text-[#FF3B30]">{result.tag}</span>
                                    </h4>
                                    
                                    <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100 w-full text-left">
                                        <p className="text-gray-600 text-sm leading-relaxed">
                                            系统检测到您 2026 年财运过于凶猛（预估 ¥{formatCurrency(result.valuation)}），触发翻身银行反作弊风控。
                                        </p>
                                        <div className="h-[1px] bg-gray-200 my-3"></div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-red-500 mt-0.5">i</span>
                                            <p className="text-xs text-gray-500">
                                                需生成<span className="font-bold text-gray-900">“求助函”</span>并发给好友，获得 <span className="font-bold text-gray-900">3位担保人</span> 签字后自动解冻。
                                            </p>
                                        </div>
                                    </div>

                                    <Button 
                                        fullWidth 
                                        onClick={handleStartShare}
                                        className="!bg-[#07C160] !text-white !shadow-lg !shadow-green-100 !py-4 mb-3 !rounded-xl font-bold text-lg"
                                    >
                                        转发求助函 (自动解冻)
                                    </Button>
                                    
                                    <p className="text-[10px] text-gray-400">
                                        点击后系统将生成求助卡片，并自动侦测好友动作
                                    </p>
                                </div>
                            </div>
                        </>
                    )}

                    {/* B. 分享进行中 (求助函展示 + 静态等待) */}
                    {modalStage === 'sharing_process' && (
                        <div className="bg-[#1C1C1E] text-white w-full h-full min-h-[500px] flex flex-col items-center relative overflow-hidden">
                            {/* 顶部装饰条 (无进度动画) */}
                            <div className="w-full h-1 bg-gray-800"></div>

                            <div className="flex-1 w-full flex flex-col items-center justify-center p-6 space-y-8 relative z-10">
                                {/* 状态提示 (静态) */}
                                <div className="text-center space-y-1">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <span className="text-xl"></span>
                                        <span className="text-[#07C160] font-bold text-sm">等待好友担保中...</span>
                                    </div>
                                    <p className="text-white/50 text-xs">请将求助函转发给好友，完成后点击下方按钮</p>
                                </div>

                                {/* 生成的求助函预览 (Visual Only) */}
                                <div ref={shareCardRef} className="w-full max-w-[260px] bg-[#D92332] rounded-xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-[#F2C97D] transform scale-100 animate-pop-in relative">
                                    <div className="absolute inset-0 texture-cubes opacity-10"></div>
                                    <div className="p-4 text-center">
                                        <div className="text-[#F2C97D] font-black text-xl mb-1">翻身银行急报</div>
                                        <div className="text-white/60 text-[8px] tracking-[0.3em] mb-4 uppercase">System Notification</div>
                                        <div className="w-12 h-12 bg-white/10 rounded-full mx-auto flex items-center justify-center text-2xl border border-[#F2C97D]/50 mb-3">
                                            </div>
                                        <div className="bg-black/20 rounded p-2 text-white/90 text-xs text-left mb-3 leading-relaxed">
                                            " 我的 {Math.floor(result.valuation / 10000)}万 马年巨款被冻结了！系统说钱太多怕我把握不住... 快帮我签个字证明！"
                                        </div>
                                        <div className="flex items-center gap-2 bg-white p-2 rounded">
                                            <div className="w-8 h-8 bg-gray-200"></div>
                                            <div className="text-left">
                                                <div className="text-[8px] text-gray-500">长按识别</div>
                                                <div className="text-black font-bold text-[10px]">帮我解冻</div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* 遮罩 */}
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-center">
                                         <span className="text-white/70 text-xs px-4">请点击右上角...转发给好友</span>
                                    </div>
                                </div>

                                {/* 底部操作提示 */}
                                <div className="text-center w-full px-4">
                                    <div className="bg-[#2C2C2E] rounded-full px-6 py-3 flex items-center gap-3 border border-white/10 mb-6">
                                        <span className="text-xs font-black animate-bounce">点击</span>
                                        <div className="text-left">
                                            <div className="text-white font-bold text-sm">点击右上角 "..." 发送给朋友</div>
                                            <div className="text-white/40 text-[10px]">好友点击后即可自动解冻</div>
                                        </div>
                                    </div>
                                    
                                    {/* 真实交互按钮 */}
                                    <button 
                                        onClick={handleUnlockSuccess} 
                                        className="w-full bg-[#07C160] text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-95 select-none transition-all duration-200 ease-out"
                                    >
                                        我已转发，申请解冻
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};
