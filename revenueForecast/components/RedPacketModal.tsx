import React, { useState, useRef } from 'react';
import { Button } from './Button';
import { saveImageToLocal } from '../utils';

// Declare html2canvas
declare const html2canvas: any;

interface RedPacketModalProps {
  mode: 'send' | 'beg';
  onClose: () => void;
}

export const RedPacketModal: React.FC<RedPacketModalProps> = ({ mode, onClose }) => {
  const [step, setStep] = useState<'input' | 'paying' | 'success'>('input');
  
  // Image Generation Logic
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSave = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
        const canvas = await html2canvas(cardRef.current, { useCORS: true, scale: 2, backgroundColor: null });
        const base64 = canvas.toDataURL('image/png');
        saveImageToLocal(base64, '赛博乞讨函.png');
        if(navigator.vibrate) navigator.vibrate(50);
    } catch(e) {
        console.error(e);
        alert('保存失败，请手动截图');
    } finally {
        setIsGenerating(false);
    }
  };

  if (mode === 'beg') {
      return (
          <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-6 animate-pop-in">
              <div className="absolute inset-0" onClick={onClose}></div>
              
              <div className="relative z-10 w-full max-w-sm">
                  {/* Capture Area */}
                  <div ref={cardRef} className="bg-[#D92332] rounded-2xl overflow-hidden shadow-2xl relative">
                      {/* Background Pattern */}
                      <div className="absolute inset-0 bg-pattern-cloud opacity-10"></div>
                      
                      <div className="p-8 text-center relative z-10">
                          <div className="w-20 h-20 bg-[#F2C97D] rounded-full mx-auto flex items-center justify-center text-4xl border-4 border-[#FFF5CC] shadow-lg mb-6">
                              
                          </div>
                          
                          <h3 className="text-2xl font-black text-[#FFF5CC] mb-4 font-calligraphy tracking-widest">
                              赛博乞讨 · 急急急
                          </h3>
                          
                          <div className="bg-black/20 rounded-xl p-4 mb-6 backdrop-blur-sm border border-white/10">
                              <p className="text-white font-bold text-lg leading-relaxed">
                                  " 义父！<br/>
                                  系统检测我五行缺钱<br/>
                                  求赏 <span className="text-[#F2C97D] text-2xl">¥1.68</span> 救命！"
                              </p>
                          </div>

                          <div className="w-full bg-white p-4 rounded-xl flex items-center gap-4">
                              <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-[10px] text-gray-400">
                                  二维码
                              </div>
                              <div className="text-left flex-1">
                                  <div className="text-black font-bold text-sm">长按识别打赏</div>
                                  <div className="text-gray-500 text-xs">好人一生平安，明年暴富</div>
                              </div>
                          </div>
                          
                          <div className="mt-4 text-[10px] text-white/50 opacity-80">
                              此乞讨函由 [天命估值局] 系统自动生成
                          </div>
                      </div>
                  </div>

                  <div className="mt-6 space-y-3">
                      <Button fullWidth onClick={handleSave} className="!bg-[#F2C97D] !text-[#8E0000] font-black" disabled={isGenerating}>
                          {isGenerating ? '生成中...' : '点击保存去群里乞讨'}
                      </Button>
                      <button onClick={onClose} className="w-full text-white/50 text-sm pb-2">
                          算了，面子要紧
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // Payment Sim (Send Mode)
  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex flex-col justify-end animate-unroll">
        <div className="absolute inset-0" onClick={onClose}></div>

        {step === 'input' && (
            <div className="relative z-10 bg-[#F2F2F2] rounded-t-xl overflow-hidden">
                <div className="flex justify-center items-center py-4 bg-[#EDEDED] relative">
                    <span className="text-black font-bold">发红包</span>
                    <button onClick={onClose} className="absolute left-4 text-gray-500">取消</button>
                </div>
                
                <div className="p-8 text-center">
                    <div className="text-xs text-gray-500 mb-2">打赏金额 (安慰金)</div>
                    <div className="text-5xl font-black text-black mb-6">
                        <span className="text-3xl mr-1">¥</span>0.66
                    </div>
                    <div className="bg-white p-3 rounded text-sm text-gray-600 mb-8 border border-gray-200">
                        拿着去买糖吃，明年跟着哥混。
                    </div>
                    
                    <Button fullWidth onClick={() => setStep('success')} variant="wechat" className="text-lg py-4">
                        塞钱进红包
                    </Button>
                </div>
            </div>
        )}

        {step === 'success' && (
            <div className="relative z-10 bg-white rounded-t-xl p-8 flex flex-col items-center justify-center text-center pb-safe">
                <div className="w-20 h-20 bg-[#FA9D3B] rounded-full flex items-center justify-center text-white text-4xl mb-4 shadow-lg">✓</div>
                <h2 className="text-xl font-bold mb-2">发送成功</h2>
                <p className="text-gray-500 text-sm mb-8">义父大气！已成功施舍 ¥0.66</p>
                <Button variant="secondary" className="!bg-gray-100 !text-black w-40" onClick={onClose}>完成</Button>
            </div>
        )}
    </div>
  );
};