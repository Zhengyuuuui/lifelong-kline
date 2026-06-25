import React, { useState } from 'react';

interface FingerprintScannerProps {
  onComplete: () => void;
}

export const FingerprintScanner: React.FC<FingerprintScannerProps> = ({ onComplete }) => {
  const [isOpening, setIsOpening] = useState(false);

  const handleOpen = () => {
    setIsOpening(true);
    setTimeout(() => {
        onComplete();
    }, 800); 
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-[#8E0000] items-center">
      
      {/* 上半部分圆弧封皮 (Top Flap) - 颜色稍亮 */}
      <div className="absolute top-0 left-[-50%] w-[200%] h-[55%] bg-[#D92332] rounded-b-[50%] shadow-[0_4px_20px_rgba(0,0,0,0.2)] z-0 transition-all duration-700 ease-in-out origin-top"
           style={isOpening ? { transform: 'translateY(-100%)', opacity: 0 } : {}}
      ></div>

      {/* 核心内容容器 */}
      <div className="relative z-10 w-full h-full flex flex-col items-center">
        
        {/* 占位符，将内容推到圆弧交界处 */}
        <div className="h-[55%] w-full flex items-end justify-center pb-0 pointer-events-none">
             {/* 这个空div用来占据上半部分高度 */}
        </div>

        {/* “開”按钮 (居中悬浮在交界线上) */}
        <div className="-mt-14 mb-10 relative z-20">
            {/* 外部光晕动画 */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#F2C97D]/20 rounded-full blur-2xl animate-pulse ${isOpening ? 'opacity-0' : 'opacity-100'}`}></div>
            
            <button 
                onClick={handleOpen}
                className={`relative w-28 h-28 rounded-full bg-[#E5B865] p-1 shadow-[0_10px_25px_rgba(0,0,0,0.4)] group transition-all duration-700 ${isOpening ? 'rotate-[720deg] scale-0 opacity-0' : 'hover:scale-105 active:scale-95 select-none ease-out'}`}
            >
                {/* 按钮内圈 - 模拟金币立体感 */}
                <div className="w-full h-full rounded-full bg-gradient-to-br from-[#F2C97D] to-[#BF9040] flex items-center justify-center border-2 border-[#FFF5CC]/50 shadow-inner">
                    <div className="w-[90%] h-[90%] rounded-full border border-[#8E0000]/20 flex items-center justify-center">
                         <span className="font-serif font-black text-5xl text-[#5A2E0C] drop-shadow-sm pt-1 select-none">開</span>
                    </div>
                </div>
            </button>
        </div>

        {/* 副按钮：揭晓身价 */}
        <div className={`transition-all duration-500 delay-100 ${isOpening ? 'translate-y-10 opacity-0' : 'translate-y-0 opacity-100'}`}>
            <button 
                onClick={handleOpen}
                className="group relative px-8 py-2.5 rounded-full bg-gradient-to-r from-[#D69640] to-[#E5B865] shadow-[0_4px_15px_rgba(214,150,64,0.3)] flex items-center gap-2 active:scale-95 select-none transition-all duration-200 ease-out"
            >
                <span className="text-[#8E0000] text-lg"></span>
                <span className="text-[#8E0000] font-bold text-sm tracking-wider">揭晓我的马年身价</span>
            </button>
        </div>

        {/* 底部文字区域 */}
        <div className={`mt-auto mb-16 flex flex-col items-center space-y-5 transition-all duration-500 delay-200 ${isOpening ? 'translate-y-10 opacity-0' : 'translate-y-0 opacity-100'}`}>
            
            {/* System Notice 胶囊 */}
            <div className="border border-white/30 rounded-full px-5 py-1 backdrop-blur-sm bg-black/10">
                <span className="text-white/90 text-[10px] font-serif tracking-[0.2em] font-bold uppercase">SYSTEM NOTICE</span>
            </div>

            {/* 主标题 */}
            <div className="text-center space-y-2">
                <div className="text-white font-serif text-2xl font-bold tracking-widest drop-shadow-lg flex items-center justify-center gap-2">
                    你有一笔 <span className="text-[#F2C97D] text-3xl font-black italic">2026</span> 预估收入
                </div>
                <div className="text-white font-serif text-4xl font-black tracking-[0.4em] pt-1 pl-2 drop-shadow-md">
                    待确认
                </div>
            </div>

            {/* 底部Slogan */}
            <p className="text-white/50 text-xs tracking-wider font-light pt-2">
                别做牛马了，测测明年能否“马上暴富”？
            </p>
        </div>

      </div>
    </div>
  );
};