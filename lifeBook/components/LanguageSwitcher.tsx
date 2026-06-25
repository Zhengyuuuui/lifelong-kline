
import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../utils/i18nContext';
import { LANGUAGE_LABELS, LanguageCode } from '../types/i18n';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative pointer-events-auto z-[100]" ref={containerRef}>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111]/80 border border-white/10 hover:border-emerald-500/50 hover:bg-[#1a1a1a] transition-all duration-300 backdrop-blur-md group"
      >
        <span className="text-[10px] text-emerald-400 font-mono tracking-wider uppercase">
            {language.toUpperCase()}
        </span>
        <div className={`w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-white/30 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-32 bg-[#050505]/95 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-64 overflow-y-auto scrollbar-hide py-1">
             {(Object.keys(LANGUAGE_LABELS) as LanguageCode[]).map((code) => (
               <button
                 key={code}
                 onClick={() => {
                   setLanguage(code);
                   setIsOpen(false);
                 }}
                 className={`w-full text-left px-4 py-2 text-[10px] font-mono tracking-wider transition-colors hover:bg-white/5
                   ${language === code ? 'text-emerald-400 font-bold bg-white/5' : 'text-white/60'}
                 `}
               >
                 {LANGUAGE_LABELS[code]}
               </button>
             ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
