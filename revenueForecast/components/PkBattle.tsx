
import React, { useEffect, useState } from 'react';
import { calculatePk, formatCurrency, calculateFate } from '../utils';
import { ValuationResult, PkResult, UserInput } from '../types';
import { Button } from './Button';
import { PK_SHARE_COPY, PK_ACTIONS } from '../constants';
import { RedPacketModal } from './RedPacketModal';
import { ContractCard } from './ContractCard';
import { api } from '../services/api';

interface PkBattleProps {
  userResult: ValuationResult;
  pkId: string | null; // 接收后端SessionID
  onReset: () => void;
  onClose: () => void;
}

// 新增 waiting 状态
type PkStage = 'waiting' | 'battle' | 'result';

export const PkBattle: React.FC<PkBattleProps> = ({ userResult, pkId, onReset, onClose }) => {
  const [stage, setStage] = useState<PkStage>('waiting');
  const [pkResult, setPkResult] = useState<PkResult | null>(null);
  const [opponentResult, setOpponentResult] = useState<ValuationResult | null>(null);
  const [showContract, setShowContract] = useState(false);
  const [actionType, setActionType] = useState<'send' | 'beg' | null>(null);
  const [waitProgress, setWaitProgress] = useState(0);

  // 初始化：进入等待状态并轮询后端状态
  useEffect(() => {
      if (stage === 'waiting') {
          let intervalId: any;

          // 模拟进度条动画（视觉效果）
          const progressInterval = setInterval(() => {
              setWaitProgress(prev => prev >= 95 ? 95 : prev + 1);
          }, 50);

          // 核心业务：如果是真实ID，轮询后端直到好友加入
          if (pkId) {
             const checkStatus = async () => {
                 try {
                     // 在这里我们模拟一个“触发好友加入”的动作
                     // 真实场景下，应该是前端只查询，直到status变成 JOINED
                     // 但为了单机演示，我们调用 simulateOpponentJoin 让后端生成数据
                     const opResult = await api.simulateOpponentJoin(pkId);
                     
                     // 停止轮询，完成进度条
                     clearInterval(progressInterval);
                     setWaitProgress(100);
                     
                     handleOpponentJoined(opResult);
                 } catch (e) {
                     console.error("Waiting for opponent...", e);
                 }
             };
             
             // 延迟1.5秒后触发（给用户一点等待感）
             setTimeout(checkStatus, 1500);
          } else {
             // Fallback: 此时如果没有ID（旧逻辑兼容），直接生成假数据
             setTimeout(() => {
                 clearInterval(progressInterval);
                 setWaitProgress(100);
                 
                 const mockInput: UserInput = {
                    name: "模拟好友",
                    birthdate: '1990-01-01', 
                    gender: Math.random() > 0.5 ? 'male' : 'female'
                 };
                 const opRes = calculateFate(mockInput);
                 handleOpponentJoined(opRes);
             }, 2000);
          }

          return () => {
              clearInterval(progressInterval);
              clearInterval(intervalId);
          };
      }
  }, [stage, pkId]);

  const handleOpponentJoined = (opRes: ValuationResult) => {
    // Calculate Winner Logic
    const result = calculatePk(userResult.valuation, opRes.valuation);
    setOpponentResult(opRes);
    setPkResult(result);

    // Transition to Battle
    setStage('battle');
    
    // Battle Animation Duration -> Result
    setTimeout(() => {
        setStage('result');
    }, 2500);
  };

  const handleActionClick = () => {
      if (!pkResult) return;
      if (pkResult.winner === 'user') {
          setActionType('send');
      } else {
          setActionType('beg');
      }
  };

  // 1. 等待对手入场 (新增界面)
  if (stage === 'waiting') {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-[#2C1608] p-6 relative animate-pop-in overflow-hidden">
         {/* Close Button */}
         <button 
            onClick={onClose} 
            className="absolute top-6 right-6 z-50 w-8 h-8 flex items-center justify-center bg-white/10 rounded-full text-white/70 hover:bg-white/20 transition-colors"
         >
            ✕
         </button>

         {/* 背景雷达扫描特效 */}
         <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
             <div className="w-[500px] h-[500px] border border-[#F2C97D]/20 rounded-full animate-[spin_4s_linear_infinite] relative">
                 <div className="w-full h-1/2 bg-gradient-to-b from-[#F2C97D]/50 to-transparent absolute top-0 left-0 blur-xl opacity-50 transform origin-bottom rotate-45"></div>
             </div>
         </div>
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#2C1608_80%)]"></div>
         
         <div className="relative z-10 w-full max-w-sm text-center">
             {/* 头像区域 */}
             <div className="flex justify-center items-center gap-8 mb-12">
                 <div className="flex flex-col items-center gap-2">
                     <div className="w-20 h-20 rounded-full bg-[#8E0000] border-2 border-[#F2C97D] flex items-center justify-center shadow-[0_0_20px_#D92332]">
                         <span className="text-2xl">VIP</span>
                     </div>
                     <span className="text-[#F2C97D] text-xs font-bold">我</span>
                 </div>
                 
                 <div className="flex flex-col items-center gap-2 pt-8">
                    <span className="text-white/50 text-xs animate-pulse">Waiting...</span>
                    <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-[#F2C97D] to-transparent"></div>
                 </div>

                 <div className="flex flex-col items-center gap-2 relative">
                     <div className="w-20 h-20 rounded-full bg-black/40 border-2 border-white/10 flex items-center justify-center relative overflow-hidden">
                         {/* 问号或加载 */}
                         {waitProgress < 100 ? (
                             <span className="text-white/20 text-4xl font-black animate-pulse">?</span>
                         ) : (
                             <span className="text-2xl animate-pop-in">OK</span>
                         )}
                         
                         {/* 进度圆环 */}
                         {waitProgress < 100 && (
                            <svg className="absolute inset-0 w-full h-full rotate-[-90deg]">
                                <circle cx="40" cy="40" r="38" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.1" />
                                <circle cx="40" cy="40" r="38" fill="none" stroke="#F2C97D" strokeWidth="2" strokeDasharray={`${waitProgress * 2.4} 251`} strokeLinecap="round" />
                            </svg>
                         )}
                     </div>
                     <span className="text-white/30 text-xs font-bold">
                         {waitProgress < 100 ? '等待进入...' : '好友已上线'}
                     </span>
                 </div>
             </div>

             <div className="space-y-4">
                 <h2 className="text-2xl font-black text-white tracking-widest animate-pulse">
                     {waitProgress < 100 ? '等待好友接受挑战' : '匹配成功！'}
                 </h2>
                 <p className="text-[#F2C97D]/70 text-sm font-serif">
                     {waitProgress < 100 ? '邀请函已通过微信发出...' : '大战一触即发'}
                 </p>
                 {pkId && <p className="text-white/20 text-[8px] font-mono">SESSION: {pkId}</p>}
             </div>

             {/* 模拟进度条 */}
             <div className="mt-12 px-8">
                 <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                     <div className="h-full bg-[#F2C97D] transition-all duration-100 ease-linear" style={{width: `${waitProgress}%`}}></div>
                 </div>
                 <div className="mt-2 flex justify-between text-[10px] text-white/30 font-mono">
                     <span>CONNECTING SERVER...</span>
                     <span>{waitProgress}%</span>
                 </div>
             </div>

         </div>
      </div>
    );
  }

  // 2. 战斗动画
  if (stage === 'battle') {
      return (
          <div className="flex flex-col h-full items-center justify-center bg-[#2C1608] text-[#F2C97D] relative overflow-hidden">
              {/* 背景特效 */}
              <div className="absolute inset-0 bg-black/40 z-0"></div>
              <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[#8E0000]/30 to-transparent animate-pulse z-0"></div>
              
              <div className="relative z-10 flex flex-col items-center">
                  <div className="text-9xl font-black animate-bounce drop-shadow-[0_0_25px_#D92332] text-white italic">VS</div>
                  <div className="text-sm mt-12 tracking-[0.5em] text-[#F2C97D] animate-pulse font-bold uppercase">Fighting...</div>
                  
                  {/* 加载圈 */}
                  <div className="mt-10 relative">
                      <div className="w-20 h-20 border-4 border-[#F2C97D]/30 border-t-[#F2C97D] rounded-full animate-spin"></div>
                      <div className="absolute top-0 left-0 w-20 h-20 border-4 border-red-500/30 border-b-red-500 rounded-full animate-spin" style={{animationDuration: '1.5s', animationDirection: 'reverse'}}></div>
                  </div>
              </div>
          </div>
      );
  }

  // 3. 结果展示 (双端视角 Climax)
  if (stage === 'result' && pkResult && opponentResult) {
      const iWon = pkResult.winner === 'user';
      const isTie = pkResult.winner === 'tie';

      return (
          <div className="flex flex-col h-full bg-black relative overflow-hidden">
              
              {/* Close Button (Overlay) */}
              <button 
                onClick={onClose} 
                className="absolute top-6 right-6 z-50 w-8 h-8 flex items-center justify-center bg-black/20 rounded-full text-white/70 hover:bg-black/40 transition-colors backdrop-blur-sm border border-white/10"
              >
                ✕
              </button>

              {/* Overlay Modal (Contract or RedPacket) */}
              {showContract && (
                  <div className="fixed inset-0 z-50">
                      <ContractCard 
                        contract={pkResult.contract}
                        userValuation={userResult.valuation}
                        opponentValuation={opponentResult.valuation}
                        onClose={() => setShowContract(false)}
                      />
                  </div>
              )}
              
              {actionType && (
                  <RedPacketModal 
                    mode={actionType}
                    onClose={() => setActionType(null)}
                  />
              )}

              {/* Split Screen Container */}
              <div className="flex-1 flex flex-col relative z-10">
                  
                  {/* Top: Me */}
                  <div className={`flex-1 relative flex items-center justify-center overflow-hidden transition-all duration-1000 ${iWon ? 'bg-gradient-to-b from-[#8E0000] to-[#5A0000]' : 'bg-[#1a1a1a] grayscale'}`}>
                      {/* Effects */}
                      {iWon && (
                        <>
                           <div className="absolute inset-0 bg-pattern-cloud opacity-20 animate-float"></div>
                           <div className="absolute top-0 w-full h-full bg-gradient-to-b from-[#F2C97D]/20 to-transparent"></div>
                        </>
                      )}
                      {!iWon && (
                          <div className="absolute inset-0 opacity-20 pointer-events-none texture-dust"></div>
                      )}

                      <div className="relative z-10 text-center p-4">
                          <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 tracking-widest ${iWon ? 'bg-[#F2C97D] text-[#8E0000]' : 'bg-gray-700 text-gray-300'}`}>
                              我 (Myself)
                          </div>
                          <h3 className={`text-4xl font-black mb-1 ${iWon ? 'text-[#F2C97D] drop-shadow-md' : 'text-gray-400'}`}>
                              {pkResult.selfTitle}
                          </h3>
                          <div className={`text-2xl font-serif font-bold ${iWon ? 'text-white' : 'text-gray-500'}`}>
                              ¥ {formatCurrency(userResult.valuation)}
                          </div>
                          {!iWon && <div className="text-4xl absolute top-10 right-10 animate-float opacity-50"></div>}
                      </div>
                  </div>

                  {/* VS Divider */}
                  <div className="h-12 bg-black flex items-center justify-center relative z-20">
                       <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-[#F2C97D] to-transparent"></div>
                       <div className="bg-black border border-[#F2C97D] rounded-full w-10 h-10 flex items-center justify-center text-[#F2C97D] font-black text-xs italic z-10">
                           VS
                       </div>
                  </div>

                  {/* Bottom: Opponent */}
                  <div className={`flex-1 relative flex items-center justify-center overflow-hidden ${!iWon ? 'bg-gradient-to-t from-[#8E0000] to-[#5A0000]' : 'bg-[#1a1a1a] grayscale'}`}>
                       {/* Effects */}
                       {!iWon && (
                        <>
                           <div className="absolute inset-0 bg-pattern-cloud opacity-20 animate-float"></div>
                           <div className="absolute bottom-0 w-full h-full bg-gradient-to-t from-[#F2C97D]/20 to-transparent"></div>
                        </>
                      )}
                      
                      <div className="relative z-10 text-center p-4">
                          <div className={`text-2xl font-serif font-bold mb-1 ${!iWon ? 'text-white' : 'text-gray-500'}`}>
                              ¥ {formatCurrency(opponentResult.valuation)}
                          </div>
                          <h3 className={`text-4xl font-black mb-2 ${!iWon ? 'text-[#F2C97D] drop-shadow-md' : 'text-gray-400'}`}>
                              {pkResult.opponentTitle}
                          </h3>
                          <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-widest ${!iWon ? 'bg-[#F2C97D] text-[#8E0000]' : 'bg-gray-700 text-gray-300'}`}>
                              对手 (Opponent)
                          </div>
                          {iWon && <div className="text-4xl absolute bottom-10 left-10 animate-float opacity-50"></div>}
                      </div>
                  </div>

                  {/* Verdict & Actions */}
                  <div className="bg-[#2C1608] pb-safe pt-4 px-4 rounded-t-2xl -mt-4 relative z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-[#F2C97D]/20">
                      <div className="text-center mb-6">
                          <p className="text-[#F2C97D] text-sm font-bold opacity-90 leading-relaxed px-6">
                              {pkResult.verdict}
                          </p>
                      </div>

                      <div className="flex gap-3 mb-4">
                          <Button 
                            variant="secondary" 
                            className="flex-1 !py-3 !text-sm !bg-white/5" 
                            onClick={() => setShowContract(true)}
                          >
                              查看天庭判决书
                          </Button>
                          <Button 
                            variant={iWon ? 'primary' : 'glitch'} 
                            className="flex-[1.5] !py-3 !text-sm whitespace-nowrap"
                            onClick={handleActionClick}
                          >
                              {iWon ? PK_ACTIONS.WIN_BUTTON : PK_ACTIONS.LOSER_BUTTON}
                          </Button>
                      </div>
                      <div className="text-center pb-2">
                           <button onClick={onReset} className="text-white/30 text-xs underline">
                               重新测试
                           </button>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  return null;
};
