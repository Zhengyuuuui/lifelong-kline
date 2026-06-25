import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '../types';
import { translations } from '../locales';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Mock API Call
const mockFetchUserLanguage = async (userId: string): Promise<{ userId: string, defaultLanguage: Language }> => {
  return new Promise(resolve => {
    setTimeout(() => {
      // Simulate random user preference or default to 'zh' if not set
      // For this demo, we'll default to 'zh' but structure allows expansion
      resolve({ userId, defaultLanguage: 'zh' });
    }, 500);
  });
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('zh');

  // Load from local storage or mock API on mount
  useEffect(() => {
    let isActive = true;
    const savedLang = localStorage.getItem('app_language') as Language;
    if (savedLang && translations[savedLang]) {
      setLanguageState(savedLang);
    } else {
      // Simulate fetching user preference if logged in (mock userId)
      mockFetchUserLanguage('current-user-id').then(data => {
         // Only apply if user hasn't manually overridden (which is saved in localStorage)
         // Since we checked localStorage above, if we are here, it means no local override.
         // However, prompt requirement: "User manual switch overrides interface default".
         // Logic: LocalStorage > API > Default 'zh'.
         if (isActive && data.defaultLanguage && translations[data.defaultLanguage]) {
             setLanguageState(data.defaultLanguage);
         }
      });
    }
    return () => {
      isActive = false;
    };
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
