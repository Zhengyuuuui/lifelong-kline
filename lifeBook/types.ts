
import React from 'react';

export enum ElementType {
  Wood = 'Wood',
  Fire = 'Fire',
  Earth = 'Earth',
  Metal = 'Metal',
  Water = 'Water',
}

export interface ElementData {
  type: ElementType;
  name: string;
  trait: string; // e.g., Growth, Drive
  description: string;
  percentage: number; // 0-100
  color: string;
  position: [number, number, number];
}

export interface DailyEnergy {
  date: string;
  elements: Record<ElementType, number>;
}

export type Gender = 'male' | 'female' | 'neutral';

export interface UserData {
  name: string; // Required now
  birthDate: Date;
  birthTime: string; // HH:mm
  gender: Gender;
  location: string;
}

// --- Astrology Types ---

export interface TenGod {
  name: string;
  element: ElementType;
  weight: number; // +/- score
}

export interface WesternAstrology {
    sun: string;
    moon: string;
    ascendant: string;
}

export interface BaziStrength {
    level: string; // 身强, 身弱 etc.
    score: number;
}

export interface AstrologyData {
  // 1. Basic Info
  bazi: {
    year: string;
    month: string;
    day: string;
    hour: string;
    dayMaster: string; // 日主 (e.g. 甲木)
  };
  baziStrength: string; // 身强/身弱
  gongSha: string[]; // 神煞 e.g. ["天乙贵人"]

  // 2. Ziwei
  ziwei: {
    mainStar: string;
    bodyStar: string;
    palace: string;
    movementStar: string; // 迁移宫主星
  };
  
  // 3. Western Astrology
  western: WesternAstrology;

  // 4. Elements & Ten Gods
  scores: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
  tenGods: TenGod[]; // The active Ten Gods detected
  
  // 5. Calculated Behavior
  behavior: {
    rationality: number;
    execution: number;
    recovery: number;
    social: number;
    pressure: number;
    summary: string; // "High Insight - Low Execution" etc.
  };
  
  // 6. Hexagrams
  hexagram: {
    current: string;
    change: string;
  };
  
  // 7. Current Energy
  currentEnergy: {
    daYun: string;
    year: string;
    month: string;
  };
  
  // 8. Identity
  userId: string;
  generation: number;
  
  // 9. Timeline & Specifics
  wealthYears: number[]; // Years
  lowYears: number[];   // Years
  dungeonDates: string[]; // Strings YYYY.MM
  
  // 10. Other Params
  restartDays: number;
  nameScore: number;
  luckyDirection: string;

  // 11. Validation State (New)
  isValid?: boolean;
  validationMessage?: string;
}

// --- Life Book Types ---

export interface VisualItem {
  type: 'stat' | 'quote' | 'card' | 'list' | 'tag' | 'separator' | 'bazi_chart' | 'hexagram_card' | 'matrix' | 'checklist' | 'dial';
  label?: string;
  value?: string | number;
  subtext?: string;
  accent?: boolean; // Highlight color
  icon?: string;
}

export interface ExtendedChapter {
    title: string;
    subtitle: string;
    content?: string;
    visual_items: {
        type: 'stat' | 'quote' | 'card' | 'list' | 'tag' | 'separator';
        label?: string;
        value?: string | number;
        subtext?: string;
        accent?: boolean;
    }[];
}

export interface LifeBookPageData {
  pageNumber: number;
  title: string;
  subtitle?: string;
  content: string; // Fallback / Raw text
  visualItems?: VisualItem[]; // New Rich Content
  footer?: string;
  aiPrompt?: string; 
}

export interface LifeBookData {
  ownerName: string;
  generatedDate: string;
  pages: LifeBookPageData[];
  isFallback?: boolean;
}

// --- Cheat Sheet Types (Module 3 - Old Dock) ---

export type CheatCardType = 'prop' | 'consumable' | 'environment'; // 道具 | 消耗 | 环境

export interface CheatCard {
  id: string;
  type: CheatCardType;
  title: string; // Name of the card (e.g. "黑色卫衣")
  description: string; // The "Poisonous Tongue" AI copy
  duration: string; // Display string (e.g. "6小时")
  effects: Partial<Record<ElementType, number>>; // The actual number changes
  triggerCondition?: string; // Only for environment cards
  linkText?: string; // "Hidden Link" text
}

export interface CheatSheetData {
  generatedDate: string;
  cards: CheatCard[]; // Should be exactly 3 cards
}

// --- Instant Inventory Types (Module 3 - New Scroll Section) ---

export type ItemRarity = 'SSR' | 'SR' | 'R' | 'UC' | 'C';
export type EquipmentSlot = 'outfit' | 'food';

export interface InventoryItem {
    id: string;
    slot: EquipmentSlot;
    name: string; // Main item Name
    subName: string; // Accessory or Side Dish name
    rarity: ItemRarity;
    mainColor?: string; // For UI display styling
    effects: Partial<Record<ElementType, number>>;
    specialEffect?: {
        name: string;
        description: string;
        sideEffect?: string; // e.g. "蓝量清空"
    };
    aiComment: string; // Poisonous tongue roast
    brandHint?: string; // e.g. "Recommended Brand/Shop Type"
    tags: string[]; // e.g. ["Green", "Sour"]
    styleTags?: string[]; // New: Occasion/Style tags (e.g. "Commute", "Dating")
    sticker: string; // Compact text stamp
    
    // I18N Reconstruction Keys
    sourceKeys?: {
        mainTag: string;
        mainTemplate: string;
        subTemplate: string;
        styleTag?: string;
    };
}

export interface DailyRecommendation {
    targetElement: ElementType;
    reason: string; // e.g. "Wood is low"
    strategyName: string; // e.g. "Water generates Wood"
    suggestedOutfit: InventoryItem;
    suggestedFood: InventoryItem;
    // I18N Reconstruction Key
    strategyKey?: ElementType; 
}
