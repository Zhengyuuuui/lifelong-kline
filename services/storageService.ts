
import { UserInputProfile, UserBaziMeta, TradingOrder, ChatMessage, BaziReport } from '../types';

const KEYS = {
  PROFILE: 'life_kline_profile',
  GUEST_PROFILE: 'life_kline_guest_profile',
  BAZI: 'life_kline_bazi',
  ORDERS: 'life_kline_orders',
  CHATS: 'life_kline_chats',
  SETTINGS: 'life_kline_settings',
  PREMIUM: 'life_kline_is_premium',
  SHARE_COUNT: 'life_kline_share_count',
  BAZI_REPORT: 'life_kline_report_data',
  ACCOUNT_BINDINGS: 'life_kline_bindings'
};

const ACCOUNT_CACHE_KEYS = [
  ...Object.values(KEYS),
  'user_profile_v1',
  'life_book_data',
  'life_book_data_v2',
  'life_book_user_data',
  'life_book_cheats',
  'life_book_cheat_date',
  'life_book_energy',
] as const;

const ACCOUNT_CACHE_PREFIXES = ['smooth_sailing_data_', 'life_book_data_', 'life_book_data_v2_'] as const;

export interface UserSettings {
  notifications: boolean;
  language: string;
}

export interface AccountBindings {
  phone: string | null;
  wechat: boolean;
}

export const storage = {
  saveGuestProfile: (data: UserInputProfile) => {
    try {
      sessionStorage.setItem(KEYS.GUEST_PROFILE, JSON.stringify(data));
    } catch (e) {
      console.warn("Storage saveGuestProfile failed", e);
    }
  },
  getGuestProfile: (): UserInputProfile | null => {
    try {
      const s = sessionStorage.getItem(KEYS.GUEST_PROFILE);
      if (!s || s === 'undefined' || s === 'null') return null;
      return JSON.parse(s);
    } catch (e) {
      console.warn("Storage getGuestProfile failed", e);
      return null;
    }
  },
  clearGuestProfile: () => {
    try {
      sessionStorage.removeItem(KEYS.GUEST_PROFILE);
    } catch (e) {
      console.warn("Storage clearGuestProfile failed", e);
    }
  },

  // User Profile
  saveProfile: (data: UserInputProfile) => {
    try {
      localStorage.setItem(KEYS.PROFILE, JSON.stringify(data));
    } catch (e) {
      console.warn("Storage saveProfile failed", e);
    }
  },
  getProfile: (): UserInputProfile | null => {
    try {
      const s = localStorage.getItem(KEYS.PROFILE);
      if (!s || s === 'undefined' || s === 'null') return null;
      return JSON.parse(s);
    } catch (e) {
      console.warn("Storage getProfile failed", e);
      return null;
    }
  },

  // Bazi Meta
  saveBazi: (data: UserBaziMeta) => {
    try {
      localStorage.setItem(KEYS.BAZI, JSON.stringify(data));
    } catch (e) {
      console.warn("Storage saveBazi failed", e);
    }
  },
  getBazi: (): UserBaziMeta | null => {
    try {
      const s = localStorage.getItem(KEYS.BAZI);
      if (!s || s === 'undefined' || s === 'null') return null;
      return JSON.parse(s);
    } catch (e) {
      console.warn("Storage getBazi failed", e);
      return null;
    }
  },
  
  // Trading Orders
  saveOrders: (orders: TradingOrder[]) => {
    try {
      localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
    } catch (e) {
      console.warn("Storage saveOrders failed", e);
    }
  },
  getOrders: (): TradingOrder[] => {
    try {
      const s = localStorage.getItem(KEYS.ORDERS);
      if (!s || s === 'undefined' || s === 'null') return [];
      return JSON.parse(s);
    } catch (e) {
      console.warn("Storage getOrders failed", e);
      return [];
    }
  },

  // Chat History
  saveChats: (chats: Record<string, ChatMessage[]>) => {
    try {
      localStorage.setItem(KEYS.CHATS, JSON.stringify(chats));
    } catch (e) {
      console.warn("Storage saveChats failed", e);
    }
  },
  getChats: (): Record<string, ChatMessage[]> => {
    try {
      const s = localStorage.getItem(KEYS.CHATS);
      if (!s || s === 'undefined' || s === 'null') return {};
      return JSON.parse(s);
    } catch (e) {
      console.warn("Storage getChats failed", e);
      return {};
    }
  },

  // Premium Status
  savePremium: (isPremium: boolean) => {
    try {
      localStorage.setItem(KEYS.PREMIUM, JSON.stringify(isPremium));
    } catch (e) {
      console.warn("Storage savePremium failed", e);
    }
  },
  getPremium: (): boolean => {
    try {
      const s = localStorage.getItem(KEYS.PREMIUM);
      if (!s || s === 'undefined' || s === 'null') return false;
      return JSON.parse(s);
    } catch (e) {
      console.warn("Storage getPremium failed", e);
      return false;
    }
  },

  // Share Count
  saveShareCount: (count: number) => {
    try {
      localStorage.setItem(KEYS.SHARE_COUNT, JSON.stringify(count));
    } catch (e) {
      console.warn("Storage saveShareCount failed", e);
    }
  },
  getShareCount: (): number => {
    try {
      const s = localStorage.getItem(KEYS.SHARE_COUNT);
      if (!s || s === 'undefined' || s === 'null') return 0;
      return JSON.parse(s);
    } catch (e) {
      console.warn("Storage getShareCount failed", e);
      return 0;
    }
  },
  
  // Bazi Report Cache
  saveBaziReport: (report: BaziReport) => {
    try {
      localStorage.setItem(KEYS.BAZI_REPORT, JSON.stringify(report));
    } catch (e) {
      console.warn("Storage saveBaziReport failed", e);
    }
  },
  getBaziReport: (): BaziReport | null => {
    try {
      const s = localStorage.getItem(KEYS.BAZI_REPORT);
      if (!s || s === 'undefined' || s === 'null') return null;
      return JSON.parse(s);
    } catch (e) {
      console.warn("Storage getBaziReport failed", e);
      return null;
    }
  },

  // Account Bindings
  saveBindings: (bindings: AccountBindings) => {
    try {
      localStorage.setItem(KEYS.ACCOUNT_BINDINGS, JSON.stringify(bindings));
    } catch (e) {
      console.warn("Storage saveBindings failed", e);
    }
  },
  getBindings: (): AccountBindings => {
    try {
      const s = localStorage.getItem(KEYS.ACCOUNT_BINDINGS);
      if (!s || s === 'undefined' || s === 'null') {
        return { phone: null, wechat: false };
      }
      return JSON.parse(s);
    } catch (e) {
      console.warn("Storage getBindings failed", e);
      return { phone: null, wechat: false };
    }
  },

  // User Settings
  saveSettings: (settings: UserSettings) => {
    try {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn("Storage saveSettings failed", e);
    }
  },
  getSettings: (): UserSettings => {
    try {
      const s = localStorage.getItem(KEYS.SETTINGS);
      if (!s || s === 'undefined' || s === 'null') {
        return { notifications: true, language: '中文 / EN' };
      }
      return JSON.parse(s);
    } catch (e) {
      console.warn("Storage getSettings failed", e);
      return { notifications: true, language: '中文 / EN' };
    }
  },

  clearAccountData: () => {
    try {
      ACCOUNT_CACHE_KEYS.forEach((key) => localStorage.removeItem(key));
      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (key && ACCOUNT_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn("Storage clearAccountData failed", e);
    }
  },

  // Reset Everything
  clearAll: () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.warn("Storage clearAll failed", e);
    }
  },
};
