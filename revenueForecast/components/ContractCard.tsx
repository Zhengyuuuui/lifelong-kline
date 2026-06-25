import React, { useRef, useState } from 'react';
import { ContractDetails } from '../types';
import { Button } from './Button';
import { saveImageToLocal } from '../utils';

// 声明 html2canvas
declare const html2canvas: any;

interface ContractCardProps {
  contract: ContractDetails;
  userValuation: number;
  opponentValuation: number;
  onClose: () => void;
}

export const ContractCard: React.FC<ContractCardProps> = ({ contract, userValuation, opponentValuation, onClose }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleSave = async () => {
    if (!cardRef.current) return;
    
    setIsGenerating(true);
    // 触发震动
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    try {
        const canvas = await html2canvas(cardRef.current, {
            useCORS: true,
            scale: 3, 
            backgroundColor: null, 
        });
        
        const base64Image = canvas.toDataURL('image/png');
        saveImageToLocal(base64Image, `马年契约_${contract.type}.png`);
        
        // 显示区块链 Toast
        setShowToast(true);
        setTimeout(() => {
            setShowToast(false);
            // 如果是对赌协议(wager)，保存后自动关闭以继续流程
            if (contract.type === 'wager') {
                onClose();
            }
        }, 2000);
        
    } catch (error) {
        console.error("生成图片失败", error);
        alert("图片生成失败，请重试");
    } finally {
        setIsGenerating(false);
    }
  };

  const isWinner = contract.type === 'winner';
  const isTie = contract.type === 'tie';
  const isWager = contract.type === 'wager';
  
  // 2026 潮流亮色主题配置
  let theme;
  if (isWager) {
      // 战书/挑战书风格：红黑撞色，强调对抗
      theme = {
        containerBg: "bg-[#D92332]", // Red
        paperBg: "bg-[#111]", // Dark Paper
        border: "border-[#F2C97D]", // Gold Border
        text: "text-[#F2C97D]", // Gold Text
        accent: "bg-[#F2C97D] text-black",
        stamp: "border-[#F2C97D] text-[#F2C97D]"
      };
  } else if (isWinner) {
      // Winner: 亮黄/潮牌风
      theme = { 
        containerBg: "bg-[#FFD700]", 
        paperBg: "bg-white", 
        border: "border-black", 
        text: "text-black", 
        accent: "bg-black text-white",
        stamp: "border-black text-black" 
      };
  } else if (isTie) {
      // Tie: 灰色/报纸风
      theme = { 
        containerBg: "bg-gray-200", 
        paperBg: "bg-gray-100", 
        border: "border-gray-500", 
        text: "text-gray-800", 
        accent: "bg-gray-800 text-white",
        stamp: "border-gray-500 text-gray-500"
      };
  } else {
      // Loser: 白纸/催款单风
      theme = { 
        containerBg: "bg-white", 
        paperBg: "bg-white", 
        border: "border-[#D92332]", 
        text: "text-black", 
        accent: "bg-[#D92332] text-white",
        stamp: "border-[#D92332] text-[#D92332]" 
      };
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm p-4 animate-pop-in justify-center items-center overflow-y-auto">
        
        {/* Toast Notification */}
        {showToast && (
             <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[70] bg-white border-2 border-black text-black px-6 py-3 shadow-[4px_4px_0px_#000] flex items-center gap-2 animate-pop-in">
                 <span className="font-black text-xs">契约已生成</span>
             </div>
        )}

        {/* 关闭按钮 (对赌协议强制保存，不显示关闭，或者关闭视为取消PK?) */}
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-50 bg-white text-black text-xl w-10 h-10 border-2 border-black flex items-center justify-center rounded-full active:scale-95 select-none transition-all duration-200 ease-out"
        >
            ×
        </button>

        <div className="w-full relative max-w-sm my-auto">
            
            {/* 契约卡片主体 (用于截图) */}
            <div ref={cardRef} className={`relative p-4 rounded-xl overflow-hidden shadow-2xl ${theme.containerBg}`}>
                
                {/* 装饰性胶带效果 */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-white/30 rotate-1 backdrop-blur-sm z-20"></div>

                {/* 内部合同纸张 - 票据风格 */}
                <div className={`relative ${theme.paperBg} border-2 ${theme.border} min-h-[450px] flex flex-col`}>
                    
                    {/* 票据顶部装饰区 */}
                    <div className={`p-4 border-b-2 ${theme.border} border-dashed flex justify-between items-center`}>
                         <div className="flex flex-col">
                             <span className="text-[10px] font-black tracking-widest uppercase opacity-50">
                                {isWager ? 'BATTLE INVITATION' : 'VERDICT 2026'}
                             </span>
                             <span className={`text-xl font-black italic uppercase ${theme.text} leading-none`}>
                                 {isWager ? "PK CHALLENGE" : (isWinner ? "WINNER VOUCHER" : (isTie ? "TIE TICKET" : "DEBT NOTICE"))}
                             </span>
                         </div>
                         <div className={`w-10 h-10 ${theme.border} border-2 rounded-full flex items-center justify-center`}>
                             <span className="text-xl">⚖️</span>
                         </div>
                    </div>

                    {/* 圆孔装饰 (Ticket Holes) */}
                    <div className="absolute -left-2 top-24 w-4 h-4 bg-black rounded-full"></div>
                    <div className="absolute -right-2 top-24 w-4 h-4 bg-black rounded-full"></div>

                    {/* 核心内容区 */}
                    <div className="p-6 flex-1 flex flex-col items-center text-center relative">
                        
                        {/* 标题 */}
                        <h1 className={`text-3xl font-black ${theme.text} mb-4 tracking-tighter`}>
                            {contract.title}
                        </h1>

                        {/* ID 标签 */}
                        <div className={`mb-8 px-2 py-1 ${theme.accent} text-[10px] font-mono tracking-widest transform -rotate-1`}>
                            NO. {contract.blockchainId.substring(0, 10)}
                        </div>

                        {/* 核心条款文本 (大字报风格) */}
                        <div className="w-full mb-8 relative z-10">
                            {/* 引号装饰 */}
                            <span className="absolute -top-4 -left-2 text-6xl opacity-10 font-serif">“</span>
                            
                            <div className={`text-lg font-bold leading-relaxed whitespace-pre-wrap ${theme.text}`}>
                                {contract.content}
                            </div>
                            
                             <span className="absolute -bottom-8 -right-2 text-6xl opacity-10 font-serif rotate-180">“</span>
                        </div>

                        {/* 盖章区域 */}
                        <div className="mt-auto relative w-full h-32 flex items-center justify-center">
                            {/* 印章 */}
                            <div className={`w-32 h-32 border-[6px] rounded-full flex items-center justify-center transform -rotate-12 mix-blend-multiply opacity-90 ${isWager ? 'border-[#F2C97D] text-[#F2C97D]' : (isWinner ? 'border-black text-black' : 'border-red-600 text-red-600')}`}>
                                <div className="absolute w-[90%] h-[90%] border-2 rounded-full border-inherit"></div>
                                <div className="font-black text-center leading-none border-inherit text-inherit">
                                    <div className="text-[10px] tracking-widest mb-1">OFFICIAL</div>
                                    <div className="text-2xl font-serif">{contract.stampText.replace(/\n/g, '')}</div>
                                    <div className="text-[10px] tracking-widest mt-1">VERIFIED</div>
                                </div>
                            </div>

                            {/* 签名/指纹区 */}
                            <div className={`absolute bottom-2 right-0 opacity-50 ${isWager ? 'text-[#F2C97D]' : 'text-black'}`}>
                                <div className={`h-10 w-24 border-b-2 ${isWager ? 'border-[#F2C97D]' : 'border-black'} mb-1`}></div>
                                <span className="text-[8px] uppercase tracking-widest">Authorized Signature</span>
                            </div>
                        </div>

                    </div>

                    {/* 底部条码区 */}
                    <div className={`p-3 border-t-2 ${theme.border} border-dashed ${isWager ? 'bg-black/20' : 'bg-gray-50'} flex flex-col items-center justify-center gap-1`}>
                        {/* 模拟条形码 */}
                        <div className="h-8 w-full max-w-[200px] flex items-end justify-center gap-[2px] opacity-80">
                            {Array.from({length: 40}).map((_, i) => (
                                <div key={i} className={isWager ? "bg-[#F2C97D]" : "bg-black"} style={{width: Math.random() > 0.5 ? '2px' : '4px', height: Math.random() * 100 + '%'}}></div>
                            ))}
                        </div>
                        <span className={`text-[8px] font-mono opacity-50 tracking-[0.5em] ${isWager ? 'text-[#F2C97D]' : 'text-black'}`}>DO NOT LOSE THIS RECEIPT</span>
                    </div>

                    {/* 锯齿边缘 (底部) */}
                    <div className="absolute -bottom-2 left-0 w-full h-4 bg-transparent" 
                         style={{background: `radial-gradient(circle, transparent 50%, ${theme.containerBg} 50%)`, backgroundSize: '10px 10px'}}>
                    </div>
                </div>
            </div>

            {/* 外部操作按钮 */}
            <div className="mt-6 px-4 w-full space-y-3">
                <Button fullWidth onClick={handleSave} variant='primary' className="!bg-white !text-black shadow-[4px_4px_0px_#000] border-2 border-black font-black active:translate-y-1 active:shadow-none transition-all" disabled={isGenerating}>
                    {isGenerating ? '正在打印...' : (isWager ? '签署并转发 (下一步)' : (isWinner ? '保存凭证 (发给输家)' : '签字认罪 (发给赢家)'))}
                </Button>
                <div className="text-center">
                     <p className="text-white/60 text-[10px] mt-2">
                        {isWager ? '转发挑战书给好友，对方应战后自动判定胜负' : '保存图片后发送给好友，自动生效'}
                     </p>
                </div>
            </div>
        </div>
    </div>
  );
};
