import { GoogleGenAI, Type, Schema } from "../../services/geminiProxyClient";
import { AstrologyData, UserData, ElementType, ElementData, CheatCard } from '../types';

const ai = new GoogleGenAI({});
const MODEL_NAME = 'gemini-3.5-flash';

export const formatLocalDate = (dateVal: any): string => {
  if (!dateVal) return "2020-01-01";
  const date = (dateVal instanceof Date) ? dateVal : new Date(dateVal);
  if (isNaN(date.getTime())) return "2020-01-01";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const validateUserProfile = async (userData: UserData): Promise<{ isValid: boolean; reason: string }> => {
  return { isValid: true, reason: "" };
};

export const fetchBookContent = async (userData: UserData, astro: AstrologyData, language: string = 'zh'): Promise<any> => {
  return {};
};

export const fetchElementAnalysis = async (
  element: ElementData,
  astro: AstrologyData | undefined,
  staticInfo: any,
  language: string = 'zh'
): Promise<{ roast: string; sos?: { hint?: string; instruction?: string; buttonText?: string } }> => {
  return {
    roast: "分析模块已腾空，等待植入新的生成逻辑。"
  };
};

export const decodePageContent = async (pageContent: string, pageTitle: string, language: string = 'zh'): Promise<string> => {
  return pageContent || "解读无内容";
};

export const generateCheatCards = async (elements: ElementData[], language: string = 'zh'): Promise<CheatCard[]> => {
  return getFallbackCheats(language);
};

export const getFallbackCheats = (language: string): CheatCard[] => [
  {
    id: 'virgin-cheat-1',
    type: 'prop',
    title: '全新开发占位道具',
    description: '此道具已由系统重置，等待写入您的新设定、逻辑和效果参数。',
    duration: '无限',
    effects: {},
    linkText: '待配置'
  }
];
