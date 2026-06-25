import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe, Check } from 'lucide-react';
import { Language } from '../types';

const LABELS: Record<Language, string> = {
  zh: '简体中文',
  'zh-TW': '繁體中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español'
};

interface LanguageSwitcherProps {
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className }) => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`${className || 'absolute top-4 left-4'} z-50`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/5 transition-all text-white/70 hover:text-white"
      >
        <Globe size={18} />
      </button>

      {isOpen && (
        <div className="absolute top-12 left-0 w-40 bg-[#12141E]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-2 animate-scale-in origin-top-left overflow-hidden">
          {(Object.keys(LABELS) as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => {
                setLanguage(lang);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-[13px] text-white/80 hover:bg-white/10 transition-colors flex items-center justify-between group"
            >
              {LABELS[lang]}
              {language === lang && <Check size={14} className="text-emerald-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
