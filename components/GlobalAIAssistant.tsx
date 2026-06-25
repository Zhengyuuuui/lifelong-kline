import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Sparkles } from 'lucide-react';

interface GlobalAIAssistantProps {
  moduleName: string;
}

export const GlobalAIAssistant: React.FC<GlobalAIAssistantProps> = ({ moduleName }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<{role: 'ai'|'user', text: string}[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const responseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (responseTimerRef.current) {
      clearTimeout(responseTimerRef.current);
      responseTimerRef.current = null;
    }
    // Reset messages when module changes
    let introText = '';
    switch (moduleName) {
      case 'dashboard':
        introText = '我是你的AI命理助理。这里是【人生K线】，帮你纵观一生的运势起伏。你可以问我：“我最近的运势怎么样？”';
        break;
      case 'smooth_sailing':
        introText = '我是你的AI时间助理。这里是【顺风窗】。你可以问我：“今天几点适合做重要决定？”';
        break;
      case 'bazi_report':
        introText = '我是你的AI命理分析师。这里是【专属命理报告】，深度解析你的性格和潜能。你可以问我：“我的核心优势是什么？”';
        break;
      case 'life_book':
        introText = '我是你的AI五行助理。这里是【天生我材】，用五行能量帮你调节状态。你可以问我：“我今天感觉很累，该怎么补充能量？”';
        break;
      case 'user_center':
        introText = '我是你的AI账户助理。这里是【个人中心】，管理你的档案和权益。有任何设置上的问题都可以问我。';
        break;
      default:
        introText = '我是你的AI助理。有什么我可以帮你的吗？';
    }
    setMessages([{ role: 'ai', text: introText }]);
    setIsExpanded(false);
  }, [moduleName]);

  useEffect(() => () => {
    if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isExpanded]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: input }]);
    setInput('');
    
    // Mock AI response
    responseTimerRef.current = setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', text: '我正在分析你的数据，请稍候... (这是一个演示回复，实际接入AI后会给出针对性建议)' }]);
    }, 1000);
  };

  return (
    <>
      {/* Collapsed Dock */}
      <div 
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] z-[100] transition-all duration-500 ${
          isExpanded ? 'translate-y-[150%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
      >
        <div 
          onClick={() => setIsExpanded(true)}
          className="bg-black/60 backdrop-blur-xl rounded-2xl p-3 flex items-start gap-3 cursor-pointer shadow-2xl border border-white/10 hover:border-white/30 transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
            <Bot size={16} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] text-indigo-300 font-bold mb-1 flex items-center gap-1">
              <Sparkles size={10} /> AI 辅助指引
            </div>
            <div className="text-xs text-white/90 leading-relaxed line-clamp-2">
              {messages[0]?.text}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Chat */}
      <div className={`fixed inset-0 z-[150] flex flex-col items-center justify-end pointer-events-none`}>
        <div 
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setIsExpanded(false)}
        />
        
        <div 
          className={`w-full max-w-[440px] h-[60vh] bg-[#12141E]/95 backdrop-blur-[40px] rounded-t-[32px] border-t border-white/10 flex flex-col shadow-2xl transition-transform duration-500 pointer-events-auto ${
            isExpanded ? 'translate-y-0' : 'translate-y-[100%]'
          }`}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div className="text-sm font-bold text-white">AI 辅助说明</div>
            </div>
            <button onClick={() => setIsExpanded(false)} className="p-2 bg-white/5 rounded-full text-white/50 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4" ref={scrollRef}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-sm' 
                    : 'bg-white/10 text-white/90 rounded-bl-sm border border-white/5'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 pb-8">
            <div className="relative">
              <input 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="问我关于这个模块的问题..."
                className="w-full bg-black/50 text-white text-sm px-5 py-3 rounded-full border border-white/10 focus:outline-none focus:border-white/30 transition-all"
              />
              <button 
                onClick={handleSend}
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all ${
                  input.trim() ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/30'
                }`}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
