

export type SegmentType = 'good' | 'neutral' | 'warn' | 'bad' | 'slow';

export type DayModeKey = 'attack' | 'steady' | 'prepare' | 'rest';

export type Language = 'zh' | 'zh-TW' | 'en' | 'ja' | 'ko' | 'de' | 'fr' | 'es';

export interface UserProfile {
  name: string;
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:MM
  birthPlace: string; // City
  gender: 'male' | 'female' | 'other';
  // New field for Morning Risk module
  occupation?: 'Student' | 'Corporate_slave' | 'Sales_Entrepreneur' | 'Civil_Servant';
  energySignature?: string; 
  luckyElement?: string;    
  advice?: string;          
  onboardedAt?: number;
}

export interface TimelineSegment {
  hour: number;
  type: SegmentType;
  score: number; // 0-100
  description: string;
}

export interface DailyFortuneOverview {
  score: number;
  level: 'ROCKET' | 'STABLE' | 'NEUTRAL' | 'AVOID';
  summary: string;
  reasoning: string; // The "Scientific" Bazi/Astrology explanation
  lucky_color: string;
  lucky_direction: string;
  energy_components: {
    heaven: number; // 天时
    earth: number; // 地利
    human: number; // 人和
    self: number; // 自强
  };
  recommended_actions: {
      label: string;
      type: 'primary' | 'secondary';
  }[];
  // Personalized Strategy Guide
  strategy_guide: {
      recommended_tone: 'steady' | 'direct' | 'smooth';
      main_quote: string; // Personalized advice text
  };
  // New: Window Tags (Replaces Mock Data)
  window_tags: string[];
  // New: Initial Relationships (Replaces Mock Data)
  daily_relationships: RelationshipCandidate[];
  // New: Destress Guide (Things to Skip)
  destress_guide?: {
      items: string[];
  };
}

export interface MainWindow {
  start: string;
  end: string;
  score: number;
  tags: string[];
  description: string;
  advice: string; // The "Kit" content
  type: 'attack' | 'steady' | 'prepare';
}

// Module 1: Suitable Actions
export interface ActionChip {
  id: string;
  label: string;
  type: 'primary' | 'secondary';
}

// Module 2: Strategy Tone
export type StrategyTone = 'steady' | 'direct' | 'smooth' | 'neutral';

// Module 4: Dashboard Metrics
export interface DashboardMetrics {
  windDirection: { value: number; label: string; status: 'good' | 'neutral' | 'bad' };
  control: { value: number; label: string };
  fit: { value: number; label: string };
  summary: string;
}

// Module 7: Future Weather
export interface FutureNode {
    day: number; // Relative day index (1 = tomorrow)
    dateLabel: string; // "周一", "09-24"
    score: number;
    type: SegmentType;
    weatherIcon: 'sunny' | 'cloudy' | 'rain' | 'storm'; // Psychological weather
}

export interface FutureWeather {
  range: '7d' | '30d';
  summary: string; // Encouraging AI summary
  nodes: FutureNode[];
}

// Module 8: Relationship Radar
export interface RelationshipCandidate {
  id: string;
  name: string;
  avatarUrl?: string; // Optional, initials used if missing
  roleLabel: string; // e.g., "Customer A"
  relationTag: string; // e.g., "Decision Maker"
  recommendedTimeLabel: string; // "20:00–21:00"
  actionHint: string; // "Suitable for a short voice message"
  reason: string; // "High response rate at this time · I Ching favors cooperation"
  priorityLevel: 'primary' | 'secondary';
  openingLine?: string; // Pre-calculated or fetched opening line
}

// Module 9: Resistance Map
export interface FlowNode {
  id: string;
  label: string;
  type?: 'self' | 'internal' | 'external' | 'decisionMaker';
  frictionLevel: 'low' | 'medium' | 'high';
  frictionReason?: string;
}

export interface FlowPath {
  id: string;
  nodes: FlowNode[];
  summary?: string;
}

export interface AlternativeRoute {
  id: string;
  label: string; // "Plan A"
  path: FlowPath;
  highlights: string[]; // ['Reduce nodes', 'Talk first']
  explanationLines: string[]; 
}

// New Types for Strategy & Action Plan
export interface StrategyKit {
  title: string; // e.g., "Stealth Attack Mode"
  mainTactic: string; // "Lock the decision maker first"
  bullets: string[]; // 3 actionable tips
  warning: string; // "Don't mention price yet"
}

export interface ActionStep {
  id: string;
  time: string; // "10 min"
  task: string;
  completed: boolean;
}

export interface ActionPlan {
  title: string;
  totalTime: string;
  steps: ActionStep[];
}

// --- NEW MODULE TYPES ---

export interface MorningRiskReport {
  visual_score: number; // 0-100
  visual_theme: 'red_alert' | 'yellow_warning' | 'green_pass';
  sound_effect?: string;
  content_block: {
    warning_text: string;
    action_shield: string;
    commercial_link?: {
      text: string;
      url: string;
    }
  }
}

export interface TimeSniper {
  push_time: string;
  content_block: {
    title: string;
    time_window: string;
    reasoning: string;
    ar_instruction: string;
    action_guide: string;
    social_proof: string;
  }
}

export interface DayData {
  isMock?: boolean; // Flag to indicate if this is mock data that should be localized
  winScore: number;
  mode: DayModeKey;
  modeLabel: string; // e.g. "稳进局"
  summary: string;   // e.g. "风向偏顺，适合铺垫"
  quote: string;     // Soul summary e.g. "适合铺垫，少锋芒。"
  factors: {
    t: number; // 天时
    d: number; // 地利
    r: number; // 人和
    s: number; // 自功
  };
  
  // AI Daily Analysis
  dailyOverview?: DailyFortuneOverview;

  // New Morning Modules (Optional as they load separately)
  morningRisk?: MorningRiskReport;
  timeSniper?: TimeSniper;

  segments: TimelineSegment[];
  mainWindow: MainWindow;
  
  // New Modules Data
  suitableActions: ActionChip[];
  dashboard: DashboardMetrics;
  destress: {
    active: boolean;
    bullets: string[];
  };
  future: FutureWeather;
  
  // Added for new modules
  relationships: RelationshipCandidate[];
}

// Chat Types
export interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  type?: 'text' | 'action_confirm' | 'summary' | 'question';
  quickReplies?: string[];
  timestamp: number;
}