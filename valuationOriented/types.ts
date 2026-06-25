
export interface FaceFeatures {
  noseRatio: number; // width / faceWidth
  foreheadRatio: number; // height / faceHeight
  symmetryScore: number; // 0-1
  earRatio?: number;
}

export interface AnalysisTag {
  name: string;
  grade: 'S' | 'A' | 'B' | 'C';
  description: string;
}

export interface RadarStats {
  wealth: number;    // 财运
  charm: number;     // 颜值
  wisdom: number;    // 智慧
  luck: number;      // 气运
  prestige: number;  // 贵人
}

// New Types for the "Receipt"
export interface Ingredient {
  name: string;
  percentage: number;
}

export interface ValuationAnchor {
  text: string; // e.g. "≈ 3 Ferraris"
  comment: string; // e.g. "Security costs are high"
}

export interface CreatorNote {
  title: string;
  content: string;
}

export interface MarketAdvice {
  action: 'BUY' | 'SELL' | 'HOLD' | 'ANGEL';
  title: string;
  reason: string;
}

// Expansion Pack Types (Enhanced)
export interface ExpansionAttribute {
  label: string;
  value: number; // 0-100
  color: string;
}

export interface ExpansionPack {
  defaultCareer: string;
  soulArtifact: string;
  bestHabitat: string;
  patchNote: string;
  isRareCombination: boolean; 
  // Visual/Content Expansion
  attributes: ExpansionAttribute[]; // e.g. Mental Stability, Laziness
  luckyColor: string;
  luckyDirection: string;
  energySource: string; // e.g. "Iced Americano"
  socialBattery: number; // 0-100%
}

//  Upgrade / Artificial God Mode Types (Enhanced)
export interface Sponsor {
  name: string;
  amount: string; // e.g. "3000万"
  title: string; // e.g. "首席撒币官"
  avatarColor: string;
}

export interface PrivilegeItem {
  id: string;
  icon: string; // Lucide icon name or key
  name: string;
  description: string;
}

export interface UpgradeData {
  newScore: number;
  newFormattedValue: string;
  title: string; // e.g. "钞能力完全体"
  sponsors: Sponsor[];
  composition: {
    originalText: string; // e.g. "90% 穷酸 + 10% 倔强"
    tech: number;
    hardcore: number;
    money: number;
  };
  hackLog: string[];
  // Content Expansion
  stockSymbol: string; // e.g. "FACE_DAO"
  marketCap: string; // e.g. "9999T"
  privileges: PrivilegeItem[];
  divineQuote: string;
}

export interface ValuationResult {
  score: number; // The money value
  formattedValue: string;
  features: FaceFeatures;
  tags: AnalysisTag[];
  comment: string; // Keeping original comment as requested
  isUpgraded?: boolean; 
  
  // Visual Data
  radar: RadarStats;
  soulAnimal: string;
  luckyItem: string;
  unluckyItem: string;

  // New Section Data
  anchor: ValuationAnchor;
  ingredients: Ingredient[];
  creatorNote: CreatorNote;
  marketAdvice: MarketAdvice;
  
  // Added Expansion Data
  expansion: ExpansionPack;

  //  Added Upgrade Data (Optional)
  upgradeData?: UpgradeData;
}

export type AppScreen = 'LANDING' | 'SCANNING' | 'PROCESSING' | 'RESULT';

export enum CameraMode {
  USER = 'user',
  ENVIRONMENT = 'environment'
}
