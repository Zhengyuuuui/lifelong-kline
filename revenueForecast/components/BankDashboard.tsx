
import React, { useEffect, useState, useRef } from 'react';
import { ValuationResult, TransactionRecord } from '../types';
import { formatCurrency, saveImageToLocal } from '../utils';
import { api } from '../services/api';

// Declare html2canvas
declare const html2canvas: any;

// 内联噪点纹理
const NOISE_PATTERN = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAIfP378zwjjgzjh8uXL/xgZwAAkjk2OAAAAAElFTkSuQmCC";
const PAPER_PATTERN = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhYWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==";

interface BankDashboardProps {
  userResult: ValuationResult;
  onBack: () => void;
  onPkStart: (pkId: string) => void;
}

export const BankDashboard: React.FC<BankDashboardProps> = ({ userResult, onBack, onPkStart }) => {
  const [showBalance, setShowBalance] = useState(true);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false); // 新增邀请弹窗状态
  const [hasShared, setHasShared] = useState(false); // 记录是否已分享
  const [isPrinting, setIsPrinting] = useState(false);
  const [isCapturingDashboard, setIsCapturingDashboard] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  
  // 后端数据状态
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [currentPkId, setCurrentPkId] = useState<string | null>(null);
  
  const printRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // 初始化：获取后端流水数据
  useEffect(() => {
    const loadData = async () => {
        try {
            const list = await api.getTransactions();
            setTransactions(list);
        } catch(e) {
            console.error("Failed to load transactions");
        }
    };
    loadData();

    if (navigator.vibrate) {
        const pattern = [50, 30, 50, 30, 50, 30, 50, 30, 200]; 
        navigator.vibrate(pattern);
    }
    
    const toast = document.createElement('div');
    toast.className = 'fixed top-16 left-1/2 -translate-x-1/2 bg-[#D92332] text-white px-5 py-2.5 rounded-full text-sm z-[100] animate-pop-in shadow-[0_8px_20px_rgba(217,35,50,0.4)] flex items-center gap-2 border border-[#F2C97D]/30';
    toast.innerHTML = '<span class="animate-bounce"></span> <span class="font-bold">2026 财运已到账</span>';
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
        setTimeout(() => setShowGuide(false), 5000);
    }, 3000);

  }, []);

  const handleShareOrSave = async (base64: string, fileName: string) => {
      try {
          const res = await fetch(base64);
          const blob = await res.blob();
          const file = new File([blob], fileName, { type: 'image/png' });

          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                  title: '翻身银行资产证明',
                  text: '我的2026翻身银行资产证明，见者有份！',
                  files: [file]
              });
              return true; 
          }
      } catch (e) {
          console.log("Native share fallback triggered");
      }
      
      saveImageToLocal(base64, fileName);
      return false;
  };

  const handlePrintCertificate = async () => {
      if(!printRef.current) return;
      setIsPrinting(true);
      try {
        const canvas = await html2canvas(printRef.current, { useCORS: true, scale: 2 });
        const base64 = canvas.toDataURL('image/png');
        
        const isShared = await handleShareOrSave(base64, '翻身银行_资产证明书.png');
        
        if (!isShared) {
            const toast = document.createElement('div');
            toast.className = 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-6 py-4 rounded-xl z-[250] animate-pop-in flex flex-col items-center backdrop-blur-md text-center';
            toast.innerHTML = '<div class="text-3xl mb-2"></div><div class="font-bold">图片已生成</div><div class="text-xs opacity-70 mt-1">请长按图片转发给朋友</div>';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2500);
        }

      } catch (e) {
        alert("保存失败，请截图");
      } finally {
        setIsPrinting(false);
      }
  };

  const handleSaveDashboard = async () => {
    if (!dashboardRef.current) return;
    setIsCapturingDashboard(true);
    if(navigator.vibrate) navigator.vibrate(100);

    setTimeout(async () => {
        try {
            const canvas = await html2canvas(dashboardRef.current, { 
                useCORS: true, 
                scale: 2,
                backgroundColor: '#F2F4F7', 
                height: dashboardRef.current.scrollHeight, 
                windowHeight: dashboardRef.current.scrollHeight,
                ignoreElements: (element: any) => element.classList.contains('no-capture')
            });
            const base64 = canvas.toDataURL('image/png');
            await handleShareOrSave(base64, '翻身银行_我的账户.png');
            
            const toast = document.createElement('div');
            toast.className = 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-6 py-4 rounded-xl z-[120] animate-pop-in flex flex-col items-center backdrop-blur-md';
            toast.innerHTML = '<div class="text-3xl mb-2"></div><div class="font-bold">账户快照已生成</div><div class="text-xs opacity-70 mt-1">快去朋友圈晒单</div>';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2500);

        } catch (e) {
            console.error(e);
            alert("保存失败，请手动截图");
        } finally {
            setIsCapturingDashboard(false);
        }
    }, 200);
  };

  // 点击邀请按钮：请求后端创建一个 PK Session
  const handleInviteClick = async () => {
      setHasShared(false); // 重置分享状态
      try {
          // 1. 调用后端创建PK房
          const pkId = await api.createPkSession(userResult.valuation);
          setCurrentPkId(pkId);
          setShowInviteModal(true);
      } catch (e) {
          alert('网络繁忙，请重试');
      }
  };

  // 弹窗内的实际分享动作
  const triggerShareLink = async () => {
      if (!currentPkId) return;

      const url = `${window.location.origin}?pk=${currentPkId}`; // 模拟带参链接
      const text = `翻身银行2026资产公测！我的身价是 ¥${formatCurrency(userResult.valuation)}，不服来PK！\n${url}`;
      
      const onSuccess = async () => {
          // 2. 只有分享成功后，才通知后端更新状态为 SHARED，允许进入
          await api.updatePkStatus(currentPkId, 'SHARED');
          setHasShared(true); // 激活UI进入按钮
          
          const toast = document.createElement('div');
          toast.className = 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-6 py-4 rounded-xl z-[300] animate-pop-in flex flex-col items-center backdrop-blur-md text-center';
          toast.innerHTML = '<div class="text-3xl mb-2"></div><div class="font-bold">战书已送达</div><div class="text-xs opacity-70 mt-1">好友点击链接即可应战</div>';
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 2000);
      };

      if (navigator.share) {
          try {
            await navigator.share({ title: '翻身银行PK', text: text, url: url });
            onSuccess();
          } catch(e) { console.log('Share canceled'); }
      } else {
          try {
            await navigator.clipboard.writeText(text);
            const toast = document.createElement('div');
            toast.className = 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-6 py-4 rounded-xl z-[300] animate-pop-in flex flex-col items-center backdrop-blur-md text-center';
            toast.innerHTML = '<div class="text-3xl mb-2"></div><div class="font-bold">链接已复制</div><div class="text-xs opacity-70 mt-1">请手动发送给好友</div>';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
            
            onSuccess();
          } catch(e) {
            alert('复制失败，请手动复制链接分享');
          }
      }
  };
  
  const handleEnterPk = () => {
      if (currentPkId && hasShared) {
          onPkStart(currentPkId);
      }
  };

  const { fixedAsset, stock, creditScore } = userResult.bankAssets;

  return (
    <div className="flex flex-col h-full relative font-sans overflow-hidden bg-[#F2F4F7]">
        
        {/* 顶部背景装饰 - 沉浸式 */}
        <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-[#1a1a1a] via-[#2a2a2a] to-[#F2F4F7] z-0 pointer-events-none"></div>
        <div 
            className="absolute top-0 left-0 w-full h-[300px] opacity-10 z-0 mix-blend-overlay pointer-events-none"
            style={{ backgroundImage: `url(${NOISE_PATTERN})` }}
        ></div>

        {/* 1. Status Bar / Navigation */}
        <div className="relative z-10 px-4 pt-4 pb-4 flex justify-between items-center text-white shrink-0">
            <button onClick={onBack} className="flex items-center gap-1 opacity-90 active:opacity-50 transition-all p-2 -ml-2 hover:bg-white/10 rounded-lg no-capture">
                <span className="text-xl font-bold font-serif">‹</span>
                <span className="text-sm font-medium">返回</span>
            </button>
            <div className="flex items-center gap-2 font-bold">
                <div className="w-6 h-6 bg-gradient-to-br from-[#F2C97D] to-[#BF9040] rounded-full flex items-center justify-center text-[#8E0000] text-[12px] border border-white/20 shadow-lg">
                    </div>
                <span className="text-base tracking-wide font-serif text-[#F2C97D]">翻身银行</span>
            </div>
            
            {/* 顶部快捷保存按钮 */}
            <div className="relative">
                <button 
                    onClick={handleSaveDashboard} 
                    disabled={isCapturingDashboard}
                    className="opacity-90 active:scale-95 select-none transition-all duration-200 ease-out p-2 -mr-2 flex items-center justify-center bg-white/10 rounded-full w-9 h-9 border border-white/20 no-capture"
                >
                    {isCapturingDashboard ? (
                        <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                    ) : (
                        <span className="text-lg"></span>
                    )}
                </button>
                {/* 引导气泡 */}
                {showGuide && (
                    <div className="absolute top-full right-0 mt-2 w-32 bg-[#F2C97D] text-[#8E0000] text-[10px] font-bold p-2 rounded-lg shadow-lg animate-bounce z-50 text-center border border-white/20 no-capture">
                        <div className="absolute -top-1 right-3 w-2 h-2 bg-[#F2C97D] transform rotate-45"></div>
                        点击保存晒单<br/>吸欧气
                    </div>
                )}
            </div>
        </div>

        {/* 可滚动区域 - 优化丝滑度 & 布局 */}
        <div 
            ref={dashboardRef}
            className="flex-1 overflow-y-auto z-10 min-h-0 scrollbar-hide" 
            style={{ 
                WebkitOverflowScrolling: 'touch', 
                overscrollBehaviorY: 'contain', 
                touchAction: 'pan-y',
                transform: 'translateZ(0)' // 硬件加速防卡顿
            }}
        >
            <div className="pb-32"> {/* 内部Padding Wrapper，确保内容被撑开 */}
                
                {/* 2. Asset Card */}
                <div className="mx-4 mt-2 bg-gradient-to-br from-[#FFF5C3] via-[#FDB931] to-[#996515] rounded-[24px] p-6 shadow-[0_20px_40px_rgba(217,163,50,0.4)] relative overflow-hidden text-[#5A2E0C] border border-[#FFF5CC]/50 group transform-gpu">
                    {/* 金光纹理 */}
                    <div 
                        className="absolute inset-0 opacity-20 z-0 mix-blend-overlay"
                        style={{ backgroundImage: `url(${NOISE_PATTERN})` }}
                    ></div>
                    {/* 动态光效 */}
                    <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-white opacity-40 blur-[80px] rounded-full pointer-events-none group-hover:opacity-60 transition-opacity"></div>
                    <div className="absolute bottom-0 left-0 w-[150px] h-[150px] bg-[#F2C97D] opacity-40 blur-[60px] rounded-full pointer-events-none"></div>
                    
                    {/* 芯片与Logo */}
                    <div className="flex justify-between items-start mb-8 relative z-10">
                        <div className="w-10 h-8 bg-gradient-to-tr from-[#E6E6E6] to-[#FFFFFF] rounded-md relative overflow-hidden shadow-md border border-[#D4D4D4]">
                            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[#999999]/50"></div>
                            <div className="absolute top-0 left-1/3 h-full w-[1px] bg-[#999999]/50"></div>
                            <div className="absolute top-0 right-1/3 h-full w-[1px] bg-[#999999]/50"></div>
                        </div>
                        <div className="text-right">
                             <div className="text-[10px] opacity-70 tracking-[0.2em] font-serif font-bold">翻身银行·至尊储蓄</div>
                             <div className="font-black italic text-lg tracking-tighter text-[#8E0000] drop-shadow-sm">
                                至尊鎏金 VIP
                             </div>
                        </div>
                    </div>

                    <div className="mb-8 relative z-10">
                        <div className="flex items-center gap-2 mb-1 opacity-80 cursor-pointer text-[#4A3B22]" onClick={() => setShowBalance(!showBalance)}>
                            <span className="text-[10px] font-bold tracking-widest">2026 预估身价资产 (CNY)</span>
                            <span className="text-[10px]">{showBalance ? '显示' : ''}</span>
                        </div>
                        <div className="text-4xl font-num font-black tracking-tight flex items-baseline gap-2 text-[#2C1608] drop-shadow-sm">
                            {showBalance ? (
                                <>
                                    <span className="text-2xl font-bold mr-1">¥</span>
                                    {formatCurrency(userResult.valuation)}
                                </>
                            ) : (
                                <span className="tracking-widest">**** **** ****</span>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between items-end relative z-10 text-[#4A3B22]">
                        <div className="flex gap-4">
                             <div>
                                 <div className="text-[8px] opacity-60 font-bold mb-0.5">持卡人</div>
                                 <div className="text-xs font-bold font-serif tracking-wide">{userResult.tag.split(' ')[0]}</div>
                             </div>
                             <div>
                                 <div className="text-[8px] opacity-60 font-bold mb-0.5">有效期</div>
                                 <div className="text-xs font-num font-bold">12/26</div>
                             </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/30 border border-white/40 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#07C160] animate-pulse"></div>
                            <span className="text-[10px] font-bold text-[#2C1608]">账户正常</span>
                        </div>
                    </div>
                </div>

                {/* 3. Function Grid */}
                <div className="mx-4 mt-6 bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 grid grid-cols-4 gap-4 text-center">
                    <div className="flex flex-col items-center gap-2 active:scale-95 select-none transition-all duration-200 ease-out cursor-pointer group" onClick={handleSaveDashboard}>
                        <div className="w-11 h-11 rounded-[14px] bg-[#F5F7FA] text-[#1A1A1A] flex items-center justify-center text-xl shadow-[inset_0_1px_4px_rgba(0,0,0,0.05)] border border-gray-100 group-hover:bg-[#E5E7EB] transition-colors relative overflow-hidden">
                            <span className="relative z-10"></span>
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                        <span className="text-[11px] text-[#333] font-bold">保存账户</span>
                    </div>

                    <div className="flex flex-col items-center gap-2 active:scale-95 select-none transition-all duration-200 ease-out cursor-pointer group" onClick={() => setShowPrintModal(true)}>
                        <div className="w-11 h-11 rounded-[14px] bg-[#FFF1F0] text-[#D92332] flex items-center justify-center text-xl shadow-[inset_0_1px_4px_rgba(217,35,50,0.1)] border border-[#FFCCC7] group-hover:bg-[#FFD8D6] transition-colors">
                            </div>
                        <span className="text-[11px] text-[#333] font-bold">资产证明</span>
                    </div>

                    <div className="flex flex-col items-center gap-2 active:scale-95 select-none transition-all duration-200 ease-out cursor-pointer group" onClick={() => alert('桃花额度已预支，请勿贪杯')}>
                        <div className="w-11 h-11 rounded-[14px] bg-[#FFF0F6] text-[#EB2F96] flex items-center justify-center text-xl shadow-[inset_0_1px_4px_rgba(235,47,150,0.1)] border border-[#FFADD2] group-hover:bg-[#FFD6E7] transition-colors">
                            </div>
                        <span className="text-[11px] text-[#333] font-bold">预支桃花</span>
                    </div>
                    
                    <div className="flex flex-col items-center gap-2 active:scale-95 select-none transition-all duration-200 ease-out cursor-pointer group" onClick={() => alert('转运成功！霉运已退散')}>
                        <div className="w-11 h-11 rounded-[14px] bg-[#FFFBE6] text-[#FAAD14] flex items-center justify-center text-xl shadow-[inset_0_1px_4px_rgba(250,173,20,0.1)] border border-[#FFE58F] group-hover:bg-[#FFF1B8] transition-colors">
                            转
                        </div>
                        <span className="text-[11px] text-[#333] font-bold">一键转运</span>
                    </div>
                </div>

                {/* 4. Transaction List - 来自后端 */}
                <div className="mx-4 mt-6">
                    <div className="flex items-center justify-between mb-3 pl-1">
                        <h3 className="text-[#1A1A1A] font-black text-sm tracking-wide">2026 预收账单</h3>
                        <span className="text-[10px] text-gray-400 bg-white px-2 py-1 rounded-full border border-gray-100 shadow-sm">
                            实时同步中 <span className="animate-pulse text-green-500">●</span>
                        </span>
                    </div>
                    
                    <div className="bg-white rounded-[20px] shadow-sm overflow-hidden border border-gray-100">
                        {transactions.map((t) => (
                            <div key={t.id} className="flex justify-between items-center p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/80 transition-colors relative group">
                                {/* 悬停高亮条 */}
                                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#D92332] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                
                                <div className="flex items-center gap-3.5">
                                    <div className="w-9 h-9 rounded-full bg-[#F9FAFB] text-[#D92332] flex items-center justify-center text-xs font-black shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                                        {t.category.substring(0, 1)}
                                    </div>
                                    <div>
                                        <div className="text-[#1A1A1A] font-bold text-sm mb-0.5">{t.title}</div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-gray-400 text-[10px] bg-gray-100 px-1 rounded">{t.category}</span>
                                            <span className="text-gray-300 text-[10px]">•</span>
                                            <span className="text-gray-400 text-[10px] font-mono">
                                                {new Date(t.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="text-gray-400 text-[10px] mt-0.5 max-w-[150px] truncate">{t.remark}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`font-num font-bold text-sm tracking-tight ${t.type === 'income' ? 'text-[#D92332]' : 'text-gray-800'}`}>
                                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                    </div>
                                    <div className="text-gray-400 text-[10px] mt-0.5">
                                        {t.status === 'success' ? '已入账' : '冻结中'}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {/* 装饰底纹 */}
                        <div 
                            className="h-1.5 opacity-10"
                            style={{ backgroundImage: `url(${PAPER_PATTERN})` }}
                        ></div>
                    </div>
                </div>

                {/* 5. Vertical Stacked Asset Modules */}
                <div className="flex flex-col gap-4 px-4 mt-6">
                    {/* Module A */}
                    <div className="w-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-full bg-[#FFF0F6] flex items-center justify-center text-lg shadow-sm border border-[#FFADD2] text-[#EB2F96]"></div>
                                <div>
                                    <div className="text-xs font-bold text-gray-900">赛博固定资产</div>
                                    <div className="text-[10px] text-gray-400">不动产估值中心</div>
                                </div>
                                <button className="ml-auto text-[10px] bg-gray-100 px-2 py-1 rounded-full text-gray-500 font-bold active:bg-gray-200 no-capture" onClick={handleSaveDashboard}>晒一下</button>
                            </div>
                            <div className="space-y-1 mb-3">
                                <div className="text-lg font-black text-gray-800">{fixedAsset.name}</div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-gray-500">持有量: {fixedAsset.amount}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${fixedAsset.trend === 'down' ? 'bg-green-100 text-green-700' : (fixedAsset.trend === 'explode' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600')}`}>
                                        {fixedAsset.trend === 'up' ? '↗ 积压' : (fixedAsset.trend === 'down' ? '↘ 下跌' : (fixedAsset.trend === 'explode' ? '爆满' : '→ 稳定'))}
                                    </span>
                                </div>
                            </div>
                            <div className="text-sm font-bold text-[#D92332]">估值: {fixedAsset.valuation}</div>
                        </div>
                        <div className="mt-3 text-[10px] bg-gray-50 p-2 rounded text-gray-500 border border-gray-100 italic">
                            “{fixedAsset.comment}”
                        </div>
                    </div>

                    {/* Module B */}
                    <div className="w-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-full bg-[#E6FFFB] flex items-center justify-center text-lg shadow-sm border border-[#87E8DE] text-[#006D75]"></div>
                                <div>
                                    <div className="text-xs font-bold text-gray-900">人生概念股</div>
                                    <div className="text-[10px] text-gray-400">重仓持股</div>
                                </div>
                                <button className="ml-auto text-[10px] bg-gray-100 px-2 py-1 rounded-full text-gray-500 font-bold active:bg-gray-200 no-capture" onClick={handleSaveDashboard}>晒一下</button>
                            </div>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="text-lg font-black text-gray-800">{stock.name}</div>
                                    <div className="text-[10px] font-mono text-gray-400 font-bold">{stock.code}</div>
                                </div>
                                <div className={`text-xl font-black font-num ${stock.isUp ? 'text-[#D92332]' : 'text-[#07C160]'}`}>
                                    {stock.pnl}
                                </div>
                            </div>
                            <div className="flex gap-2 mb-1">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${stock.isUp ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                    {stock.status}
                                </span>
                            </div>
                        </div>
                        <div className="mt-3 text-[10px] bg-gray-50 p-2 rounded text-gray-500 border border-gray-100 italic">
                            “{stock.comment}”
                        </div>
                    </div>

                    {/* Module C */}
                    <div className="w-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-full bg-[#F9F0FF] flex items-center justify-center text-lg shadow-sm border border-[#D3ADF7] text-[#531DAB]"></div>
                                <div>
                                    <div className="text-xs font-bold text-gray-900">人品信用分</div>
                                    <div className="text-[10px] text-gray-400">普信评估系统</div>
                                </div>
                                <button className="ml-auto text-[10px] bg-gray-100 px-2 py-1 rounded-full text-gray-500 font-bold active:bg-gray-200 no-capture" onClick={handleSaveDashboard}>晒一下</button>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="relative w-20 h-20 flex items-center justify-center">
                                    <svg className="w-full h-full rotate-[135deg]" viewBox="0 0 36 36">
                                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#eee" strokeWidth="3" strokeDasharray="75, 100" />
                                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={creditScore.score > 700 ? '#07C160' : (creditScore.score > 500 ? '#FAAD14' : '#FF4D4F')} strokeWidth="3" strokeDasharray={`${(creditScore.score/1000)*75}, 100`} />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                                        <span className="text-xl font-black font-num text-gray-800">{creditScore.score}</span>
                                        <span className="text-[8px] text-gray-400">极好</span>
                                    </div>
                                </div>
                                <div className="text-right flex-1 pl-4">
                                    <div className="text-xs text-gray-400 font-bold mb-1">当前等级</div>
                                    <div className="text-lg font-black text-[#D92332]">{creditScore.level}</div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-1 text-[10px] bg-gray-50 p-2 rounded text-gray-500 border border-gray-100 italic">
                            原因: {creditScore.reason}
                        </div>
                    </div>
                </div>

                {/* 7. New Share/Link Section (最底部新增) */}
                <div className="mx-4 mt-6 mb-8 no-capture">
                     <button 
                        onClick={handleInviteClick}
                        className="w-full bg-[#D92332] text-white py-4 rounded-xl font-bold shadow-lg shadow-red-200 active:scale-95 select-none transition-all duration-200 ease-out flex items-center justify-center gap-2 overflow-hidden relative group"
                     >
                        {/* 流光特效 */}
                        <div className="absolute top-0 -left-1/2 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:animate-[shine_1.5s_infinite]"></div>
                        <span className="text-xl"></span>
                        <span>复制专属链接，邀请好友PK</span>
                     </button>
                     <div className="text-center mt-3 flex items-center justify-center gap-1 opacity-50">
                         <span className="text-[10px]">翻身银行 2026 官方认证</span>
                         <span className="text-[10px]">v1.0.8</span>
                     </div>
                </div>

                {/* Footer Disclaimer */}
                <div className="mx-6 p-4 bg-gradient-to-r from-[#FFFBF0] to-[#FFF0F0] rounded-xl border border-[#F2C97D]/20 shadow-sm relative overflow-hidden">
                     <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-[#D92332] opacity-5 rounded-full blur-xl"></div>
                     <div className="flex items-start gap-3 mb-1 relative z-10">
                         <span className="text-lg mt-0.5"></span>
                         <div>
                             <div className="text-[#8E0000] font-bold text-xs mb-1">资金安全保障中</div>
                             <div className="space-y-1 text-[10px] text-yellow-800/70 leading-relaxed font-medium">
                                 <p>账户状态：鸿运当头 | 诸邪不侵 | 财源广进</p>
                                 <p>风险提示：本页面为 2026 马年天命预估。只要保持转发，财神爷承诺：梦想虽然是画的，但万一实现了呢？</p>
                             </div>
                         </div>
                     </div>
                </div>

            </div>
        </div>
        
        {/* 新增 PK 邀请弹窗 */}
        {showInviteModal && (
            <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-6 animate-pop-in">
                <div className="relative w-full max-w-sm bg-[#8E0000] rounded-2xl overflow-hidden shadow-2xl border-4 border-[#F2C97D]">
                     {/* 战书背景 */}
                     <div className="absolute inset-0 bg-pattern-cloud opacity-10 pointer-events-none"></div>
                     
                     {/* 关闭按钮 */}
                     <button onClick={() => setShowInviteModal(false)} className="absolute top-3 right-3 text-white/50 text-xl z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/20">×</button>

                     <div className="p-8 text-center relative z-10">
                         <div className="text-[#F2C97D] font-black text-3xl mb-1 tracking-widest font-calligraphy">下战书</div>
                         <div className="text-white/40 text-[10px] tracking-[0.4em] uppercase mb-6">Battle Invitation</div>

                         <div className="w-24 h-24 bg-[#2C1608] rounded-full mx-auto flex items-center justify-center border-4 border-[#F2C97D] shadow-[0_0_20px_#F2C97D] mb-6">
                             <span className="text-5xl"></span>
                         </div>

                         <div className="space-y-4">
                             {/* Step 1 */}
                             <div className={`p-4 rounded-xl border transition-all duration-300 ${!hasShared ? 'bg-white text-[#8E0000] border-white scale-105 shadow-lg' : 'bg-black/20 text-white/50 border-white/10'}`}>
                                 <button onClick={triggerShareLink} className="w-full flex items-center justify-between group">
                                     <div className="text-left">
                                         <div className="text-xs opacity-70 mb-1">Step 1</div>
                                         <div className="font-bold text-lg">发送战书给好友</div>
                                     </div>
                                     <span className="text-2xl group-active:scale-95 select-none transition-all duration-200 ease-out">↗</span>
                                 </button>
                             </div>

                             {/* Step 2 */}
                             <div className={`p-4 rounded-xl border transition-all duration-300 ${hasShared ? 'bg-[#F2C97D] text-[#8E0000] border-[#F2C97D] scale-105 shadow-[0_0_20px_#F2C97D] animate-pulse' : 'bg-black/20 text-white/30 border-white/10'}`}>
                                 <button 
                                    onClick={handleEnterPk} 
                                    disabled={!hasShared}
                                    className="w-full flex items-center justify-between disabled:cursor-not-allowed"
                                 >
                                     <div className="text-left">
                                         <div className="text-xs opacity-70 mb-1">Step 2</div>
                                         <div className="font-bold text-lg">{hasShared ? '好友已应战，进入PK' : '等待发送...'}</div>
                                     </div>
                                     <span className="text-2xl"></span>
                                 </button>
                             </div>
                         </div>
                         
                         <div className="mt-6 text-[10px] text-white/40">
                             必须先完成邀请，才能开启战场
                         </div>
                     </div>
                </div>
            </div>
        )}

        {/* 7. Print Modal (Personal Asset Certificate) */}
        {showPrintModal && (
            <div className="fixed inset-0 z-[150] bg-black/95 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4">
                    
                    {/* 关闭按钮 */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowPrintModal(false); }} 
                        className="fixed top-6 right-6 z-[200] w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-md border border-white/30"
                    >
                        <span className="text-white text-xl font-bold">✕</span>
                    </button>
                    
                    <div className="bg-white w-full max-w-sm rounded-xl overflow-hidden shadow-2xl relative transform transition-all my-8">
                        {/* The Canvas Area */}
                        <div ref={printRef} className="p-8 bg-[#FFFCF5] text-black relative min-h-[520px] flex flex-col">
                            {/* 纹理背景 */}
                            <div 
                                className="absolute inset-0 opacity-10 z-0 pointer-events-none"
                                style={{ backgroundImage: `url(${PAPER_PATTERN})` }}
                            ></div>

                            {/* 顶部红头文件装饰 */}
                            <div className="absolute top-0 left-0 w-full h-2 bg-[#D92332]"></div>

                            {/* Header */}
                            <div className="text-center border-b-2 border-[#D92332] pb-5 mb-6 relative z-10 pt-2">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <span className="text-xl"></span>
                                    <div className="text-[#D92332] text-2xl font-serif font-black tracking-widest">翻身银行</div>
                                </div>
                                <div className="text-[9px] tracking-[0.4em] text-gray-400 uppercase font-sans">Turnover Bank Official Receipt</div>
                                <div className="mt-4 inline-block px-4 py-1 bg-[#D92332] text-white text-xs font-bold tracking-widest rounded-sm shadow-sm">
                                    个人资产证明书
                                </div>
                            </div>

                            {/* Body */}
                            <div className="flex-1 space-y-6 text-sm leading-loose text-[#333] font-serif relative z-10 px-2">
                                <p className="text-justify">
                                    <span className="font-bold text-base">兹证明用户：</span>
                                    <span className="border-b-2 border-black px-4 font-black text-lg mx-2">{userResult.tag.split(' ')[0]}</span>
                                </p>
                                <p>
                                    截止 <span className="font-num font-bold">{dateStr}</span>，在翻身银行存放预估资产：
                                </p>
                                <div className="text-center py-5 bg-[#FFF0E6] border border-[#F2C97D] my-2 rounded-lg relative overflow-hidden">
                                    <div className="absolute -left-2 top-1/2 w-4 h-4 bg-[#FFFCF5] rounded-full border-r border-[#F2C97D] transform -translate-y-1/2"></div>
                                    <div className="absolute -right-2 top-1/2 w-4 h-4 bg-[#FFFCF5] rounded-full border-l border-[#F2C97D] transform -translate-y-1/2"></div>
                                    <span className="text-3xl font-bold font-num block mb-1 text-[#D92332] tracking-tight">¥ {formatCurrency(userResult.valuation)}</span>
                                    <span className="text-[10px] text-[#A66F53] font-sans transform scale-90 inline-block">（人民币大写：壹仟万...反正很多元整）</span>
                                </div>
                                <p className="text-xs text-gray-500 bg-white/50 p-2 rounded border border-gray-100 italic">
                                    <span className="font-bold text-[#D92332]">★ 权益说明：</span>
                                    凡收到此证明的好友，均可沾到 <span className="font-bold">5%</span> 财气。见者有份，过期不候。
                                </p>
                            </div>

                            {/* Footer / Stamp */}
                            <div className="mt-8 relative h-32 z-10">
                                <div className="absolute right-0 bottom-0 text-right pr-2">
                                    <p className="font-serif font-bold mb-8 text-lg">翻身银行总行</p>
                                    <p className="font-num text-xs text-gray-500">DATE: {dateStr.replace(/-/g, '.')}</p>
                                </div>
                                
                                {/* Red Stamp */}
                                <div className="absolute right-0 bottom-4 w-28 h-28 border-4 border-[#D92332] rounded-full flex items-center justify-center text-[#D92332] opacity-80 transform -rotate-12 mix-blend-multiply pointer-events-none">
                                    <div className="absolute w-[92%] h-[92%] border border-[#D92332] rounded-full"></div>
                                    <div className="text-center">
                                        <div className="text-[8px] tracking-widest mb-1">Turnover Bank</div>
                                        <div className="text-xl font-black my-0.5 font-serif">现金讫</div>
                                        <div className="text-[8px] tracking-widest mt-1">业务专用章</div>
                                    </div>
                                </div>

                                {/* 模拟二维码 */}
                                <div className="absolute left-2 bottom-2 flex items-center gap-2 opacity-80">
                                    <div className="w-14 h-14 border border-gray-300 p-1 bg-white rounded">
                                        <div className="w-full h-full bg-black/10 flex items-center justify-center text-[8px] text-gray-400">
                                            [二维码]
                                        </div>
                                    </div>
                                    <div className="text-[8px] text-gray-400 leading-tight">
                                        <div>扫码核验</div>
                                        <div>真伪查询</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="p-4 bg-gray-50 border-t border-gray-200">
                            <div className="bg-[#FFFbe6] border border-[#ffe58f] text-[#d48806] text-[10px] px-3 py-2 rounded mb-3 text-center flex items-center justify-center gap-1">
                                 <span></span> 保存图片后，请手动发送给好友
                            </div>
                            <button 
                                onClick={handlePrintCertificate} 
                                disabled={isPrinting}
                                className="w-full bg-[#D92332] text-white py-3.5 rounded-xl font-bold shadow-lg shadow-red-200 active:scale-95 select-none transition-all duration-200 ease-out flex items-center justify-center gap-2"
                            >
                                {isPrinting ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        <span>正在处理...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-lg"></span>
                                        <span>保存并转发给好友</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
