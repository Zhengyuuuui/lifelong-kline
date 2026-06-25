
export type LanguageCode = 'zh' | 'en' | 'jp' | 'kr' | 'de' | 'fr' | 'es';

export interface I18nContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
  isLoaded: boolean;
}

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  'zh': '简体中文',
  // 'zh-TW': '繁體中文',
  'en': 'English',
  'jp': '日本語',
  'kr': '한국어',
  'de': 'Deutsch',
  'fr': 'Français',
  'es': 'Español'
};
