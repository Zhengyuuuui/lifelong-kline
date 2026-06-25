import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../types';
import { Mic, Send, X, Bot, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
    messages: Message[];
    onSendMessage: (text: string) => void;
    onQuickReply: (text: string) => void;
}

const AIChatDock: React.FC<Props> = ({ messages, onSendMessage, onQuickReply }) => {
    const { t } = useLanguage();
    const [isExpanded, setExpanded] = useState(false);
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isExpanded]);

    const handleSend = () => {
        if (!input.trim()) return;
        onSendMessage(input);
        setInput('');
    };

    return (
        <>
            {/* --- Collapsed Dock --- */}
            <div 
                id="tutorial-chat"
                className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] z-40 transition-all duration-500 ease-dock ${
                    isExpanded ? 'translate-y-[150%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
                }`}
                onClick={() => setExpanded(true)}
            >
                <div className="glass-card-frost rounded-full p-1.5 pl-2 pr-2 flex items-center gap-3 cursor-pointer shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/20 hover:border-white/40 hover:bg-white/10 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-inner border border-white/20">
                        <Bot size={16} className="text-white" />
                    </div>
                    <div className="flex-1 text-[13px] text-white/50 truncate">
                        {t('chat.dock')}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60">
                        <Mic size={16} />
                    </div>
                </div>
            </div>

            {/* --- Expanded Sheet --- */}
            <div className={`fixed inset-0 z-50 flex flex-col items-center justify-end pointer-events-none`}>
                
                {/* Backdrop */}
                <div 
                    className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => setExpanded(false)}
                />

                {/* Sheet Container */}
                <div 
                    className={`w-full max-w-[440px] h-[75vh] bg-[#12141E]/95 backdrop-blur-[40px] rounded-t-[36px] border-t border-white/10 flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.8)] transition-transform duration-500 ease-sheet pointer-events-auto ${
                        isExpanded ? 'translate-y-0' : 'translate-y-[100%]'
                    }`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                        <div className="flex items-center gap-3">
                             <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-white/20">
                                <Bot size={18} className="text-white" />
                             </div>
                             <div>
                                 <div className="text-[14px] font-bold text-white tracking-wide">{t('chat.title')}</div>
                                 <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                                     <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> {t('chat.online')}
                                 </div>
                             </div>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                            className="p-2 bg-white/5 rounded-full hover:bg-white/10 active:scale-95 select-none transition-all duration-200 ease-out text-white/50"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-6" ref={scrollRef}>
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div 
                                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed relative ${
                                        msg.role === 'user' 
                                        ? 'bg-indigo-600 text-white rounded-br-sm shadow-lg shadow-indigo-600/20' 
                                        : 'bg-white/10 text-white/90 rounded-bl-sm border border-white/5'
                                    }`}
                                >
                                    {msg.text}
                                    {/* Action Confirmation Badge */}
                                    {msg.type === 'action_confirm' && (
                                        <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2 text-[11px] text-emerald-300 font-bold">
                                            <Sparkles size={12} /> 已同步到雷达
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        
                        {/* Latest Quick Replies */}
                        {messages[messages.length - 1]?.role === 'ai' && messages[messages.length - 1].quickReplies && (
                            <div className="flex flex-wrap gap-2 animate-slide-up-fade">
                                {messages[messages.length - 1].quickReplies?.map(qr => (
                                    <button 
                                        key={qr} 
                                        onClick={() => onQuickReply(qr)}
                                        className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[12px] text-indigo-200 hover:bg-indigo-500/20 hover:border-indigo-400/30 active:scale-95 select-none transition-all duration-200 ease-out"
                                    >
                                        {qr}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 pt-2 pb-8">
                        <div className="relative">
                            <input 
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                placeholder={t('chat.placeholder')}
                                className="w-full bg-[#1E202B] text-white text-[14px] px-5 py-4 rounded-full border border-white/10 focus:outline-none focus:border-white/20 transition-all placeholder-white/30"
                            />
                            <button 
                                onClick={handleSend}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all ${
                                    input.trim() ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/30'
                                }`}
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
};

export default AIChatDock;
