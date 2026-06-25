import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { formatCurrency } from '../utils';
import { REVIVAL_POSTER_TITLE, REVIVAL_POSTER_COPY } from '../constants';

interface RevivalSystemProps {
  onClose: () => void;
}

export const RevivalSystem: React.FC<RevivalSystemProps> = ({ onClose }) => {
  // 模拟状态：0=求助页(User), 1=好友视角(Friend), 2=助力后(Success)
  // 在真实应用中，这里会根据URL参数判断身份
  const [viewState, setViewState] = useState<0 | 1 | 2>(0); 
  const [currentValue, setCurrentValue] = useState(250);
  const [targetValue] = useState(1000000);
  const [progress, setProgress] = useState(0);
  
  // 分享卡片展示状态
  const [showShareCard, setShowShareCard] = useState(false);
  
  // 模拟分享/保存状态
  const [shareStep, setShareStep] = useState<'idle' | 'loading' | 'success'>('idle');
  const [shareMessage, setShareMessage] = useState('');

  // 动画相关
  const [isShaking, setIsShaking] = useState(false);

  // 数字滚动动画
  useEffect(() => {
    if (viewState === 2) {
        // 只有在助力成功后才滚动
        let startTimestamp: number | null = null;
        const duration = 1500; // 1.5s
        const startVal = 250;
        const endVal = 1000250; // 模拟 +100万

        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progressTime = timestamp - startTimestamp;
            const percentage = Math.min(progressTime / duration, 1);
            
            // Ease Out Expo function for exciting pop
            const ease = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);
            
            const current = Math.floor(startVal + (endVal - startVal) * ease);
            setCurrentValue(current);
            setProgress(100 * ease); // 满分是100%

            if (progressTime < duration) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }
  }, [viewState]);

  const handleInjectLuck = () => {
      // 1. 震动
      if (navigator.vibrate) navigator.vibrate(200);
      
      // 2. 屏幕震动视觉
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);

      // 3. 切换状态
      setViewState(2);
  };

  const handleShareClick = () => {
      setShowShareCard(true);
  };

  const handleAction = (type: 'save' | 'friend') => {
      setShareStep('loading');
      setTimeout(() => {
          setShareStep('success');
          if (type === 'save') setShareMessage('已保存海报到相册');
          if (type === 'friend') setShareMessage('已发送，等待救援');
          
          setTimeout(() => {
              setShareStep('idle');
              // 演示逻辑：分享成功后切换到好友视角
              if (type === 'friend') {
                  setShowShareCard(false);
                  if(confirm("（开发环境演示）是否直接切换到好友视角？")) {
                      setViewState(1);
                  }
              }
          }, 2000);
      }, 1500);
  };

  // 渲染：分享卡片覆盖层 (模拟生成图片)
  if (showShareCard) {
      return (
          <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col justify-end animate-pop-in">
              <div className="absolute inset-0" onClick={() => setShowShareCard(false)}></div>
              
              {/* 海报预览 */}
              <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 pointer-events-none">
                  <div className="bg-[#D92332] w-full max-w-sm rounded-xl overflow-hidden shadow-2xl relative border-4 border-[#F2C97D]">
                      {/* 卡片纹理 */}
                      <div className="absolute inset-0 bg-pattern-cloud opacity-10 pointer-events-none"></div>
                      
                      {/* 卡片头部 */}
                      <div className="bg-[#8E0000] p-4 text-center border-b border-[#F2C97D]/20">
                          <div className="text-[#F2C97D] font-calligraphy text-2xl tracking-widest">
                            {REVIVAL_POSTER_TITLE.split('：')[0]}
                          </div>
                          <div className="text-white/50 text-[10px] mt-1 uppercase tracking-[0.2em]">Urgent Notification</div>
                      </div>

                      {/* 卡片内容 */}
                      <div className="p-8 text-center space-y-6 relative z-10">
                          <div className="w-20 h-20 mx-auto bg-white/10 rounded-full flex items-center justify-center border-2 border-[#F2C97D]">
                              <span className="text-4xl"></span>
                          </div>
                          
                          <div className="space-y-2">
                              <h3 className="text-white font-bold text-xl">
                                  您的好友 <span className="text-[#F2C97D]">@我</span>
                              </h3>
                              <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                                  {REVIVAL_POSTER_COPY}
                              </div>
                          </div>

                          <div className="bg-black/20 rounded-lg p-4 border border-dashed border-white/20">
                              <div className="text-[#F2C97D] font-bold text-lg mb-1">帮我点一下</div>
                              <div className="text-white/60 text-xs">据说帮忙的人，明年发财速度 x10倍</div>
                          </div>

                          {/* 模拟小程序码/二维码 */}
                          <div className="flex justify-center items-center gap-3 opacity-80">
                               <div className="w-12 h-12 bg-white rounded p-1">
                                   <div className="w-full h-full bg-black/80"></div>
                               </div>
                               <div className="text-left">
                                   <div className="text-[10px] text-white/50">长按识别</div>
                                   <div className="text-[10px] text-white font-bold">注入欧气</div>
                               </div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* 微信 ActionSheet 模拟 */}
              <div className="bg-[#F2F2F2] rounded-t-xl z-20 overflow-hidden pb-safe relative">
                  <div className="flex flex-col">
                      <Button variant="action" onClick={() => handleAction('friend')}>发送给朋友</Button>
                      <Button variant="action" onClick={() => handleAction('save')}>保存海报</Button>
                      <div className="h-2 bg-[#F2F2F2]"></div>
                      <Button variant="action" onClick={() => setShowShareCard(false)}>取消</Button>
                  </div>
                  
                  {/* 全局 Loading / Toast */}
                  {shareStep !== 'idle' && (
                      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
                          <div className="bg-black/80 text-white px-6 py-4 rounded-lg flex flex-col items-center shadow-lg">
                              {shareStep === 'loading' ? (
                                  <>
                                    <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mb-2"></div>
                                    <div className="text-sm">生成海报中...</div>
                                  </>
                              ) : (
                                  <div className="text-sm font-bold">{shareMessage}</div>
                              )}
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // 渲染：用户求助页 (User View)
  if (viewState === 0) {
      return (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col p-6 animate-pop-in overflow-y-auto">
              {/* 背景错误代码风格 */}
              <div className="absolute inset-0 opacity-10 pointer-events-none font-mono text-red-500 text-[10px] break-all overflow-hidden leading-tight p-2">
                   {Array(2000).fill(0).map(() => Math.random() > 0.5 ? 'ERROR ' : '0 ').join('')}
              </div>

              <button onClick={onClose} className="absolute top-4 right-4 text-white/50 text-2xl z-50">×</button>
              
              <div className="flex-1 flex flex-col justify-center items-center relative z-10 w-full max-w-sm mx-auto pb-24">
                  <div className="text-center mb-8">
                      <div className="inline-block bg-red-600 text-black px-3 py-1 text-xs font-black mb-4 animate-pulse transform -rotate-2">
                          FATAL ERROR: POVERTY DETECTED
                      </div>
                      <h2 className="text-3xl font-black text-white mb-2 tracking-tighter">财运数据异常</h2>
                      <p className="text-red-400 text-sm mt-2 font-mono">
                          &lt;系统拦截&gt; 您的身价过低，已被限制出境
                      </p>
                  </div>

                  {/* 众筹改命视觉 */}
                  <div className="w-full bg-[#111] border border-red-900/50 rounded-xl p-6 mb-8 relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-1 bg-red-600 animate-[loading_2s_ease-in-out_infinite]"></div>
                       <div className="flex justify-between items-center mb-4">
                           <span className="text-gray-500 text-xs">STATUS</span>
                           <span className="text-red-500 text-xs font-bold animate-pulse">CRITICAL</span>
                       </div>
                       <div className="text-center py-4">
                            <div className="text-6xl mb-2 grayscale opacity-50"></div>
                            <div className="text-white font-bold text-lg">开启众筹通道</div>
                            <div className="w-full bg-gray-800 h-2 rounded-full mt-3 overflow-hidden">
                                <div className="bg-red-600 h-full w-[2%]"></div>
                            </div>
                            <div className="text-right text-[10px] text-gray-500 mt-1">1/1000000</div>
                       </div>
                  </div>

                  <div className="w-full space-y-3">
                      <Button fullWidth onClick={handleShareClick} className="animate-bounce !bg-[#F2C97D] !text-[#8E0000] border-none shadow-[0_0_20px_#F2C97D] font-black">
                          发起众筹改命
                      </Button>
                      <p className="text-center text-[10px] text-gray-600">
                          已有 1,302 人通过【系统后门】修改了命运
                      </p>
                  </div>
              </div>
          </div>
      );
  }

  // 渲染：好友视角 & 结果页 (Friend View / Result)
  return (
    <div className={`fixed inset-0 z-50 bg-[#2C1608] flex flex-col items-center justify-center p-6 ${isShaking ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
         {viewState === 2 && (
             <button onClick={onClose} className="absolute top-4 right-4 text-white/50 text-2xl z-50">×</button>
         )}

         {/* 顶部Title */}
         <div className="absolute top-12 text-center w-full">
             <div className="text-[#F2C97D] font-calligraphy text-2xl drop-shadow-lg">
                 {viewState === 1 ? "快给孩子一口仙气" : "欧气注入成功！"}
             </div>
         </div>

         {/* 核心注能区 */}
         <div className="relative w-full max-w-xs aspect-square flex items-center justify-center my-8">
             {/* 摇钱树 */}
             <div className={`text-9xl transition-all duration-1000 ${viewState === 2 ? 'filter-none scale-110 drop-shadow-[0_0_30px_rgba(242,201,125,0.8)]' : 'grayscale opacity-60 scale-90'}`}>
                 发财树
             </div>
             
             {/* 金光粒子特效 (简化版) */}
             {viewState === 2 && (
                 <>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#F2C97D]/20 to-transparent rounded-full animate-pulse"></div>
                    <div className="absolute top-0 text-2xl animate-[float_1s_ease-out_infinite]" style={{left: '20%'}}></div>
                    <div className="absolute top-10 text-xl animate-[float_1.2s_ease-out_infinite]" style={{right: '20%'}}></div>
                    <div className="absolute bottom-10 text-3xl animate-[float_0.8s_ease-out_infinite]" style={{left: '50%'}}></div>
                 </>
             )}
         </div>

         {/* 进度条与数字 */}
         <div className="w-full max-w-xs mb-10">
             <div className="flex justify-between text-xs text-[#F2C97D] mb-1 font-mono">
                 <span>Current Value</span>
                 <span>Target: ¥1,000,000</span>
             </div>
             <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-[#F2C97D]/30 relative">
                 <div 
                    className="h-full bg-gradient-to-r from-[#D92332] to-[#F2C97D] transition-all duration-1500 ease-out"
                    style={{width: `${progress}%`}}
                 ></div>
             </div>
             <div className="text-center mt-4">
                 <div className="text-5xl font-black text-white font-mono tracking-tighter">
                     ¥{formatCurrency(currentValue)}
                 </div>
                 {viewState === 2 && (
                    <div className="text-xs text-green-400 mt-1 font-bold animate-pulse">
                        ▲ 身价暴涨 +1,000,000
                    </div>
                 )}
             </div>
         </div>

         {/* 操作按钮 */}
         <div className="w-full max-w-xs pb-10">
             {viewState === 1 ? (
                 <Button fullWidth onClick={handleInjectLuck} className="text-xl py-4 shadow-[0_0_20px_#D92332]">
                     注入欧气 (猛戳)
                 </Button>
             ) : (
                 <div className="space-y-4 animate-pop-in">
                    <div className="bg-white/10 p-4 rounded text-center">
                        <div className="text-[#F2C97D] font-bold text-lg mb-1">您帮他涨了 100万！</div>
                        <p className="text-white/70 text-xs">手气这么旺，不给自己测测吗？</p>
                    </div>
                    <Button fullWidth onClick={() => window.location.reload()} variant="wechat">
                        立即查看我的千亿身价
                    </Button>
                 </div>
             )}
         </div>
    </div>
  );
};
