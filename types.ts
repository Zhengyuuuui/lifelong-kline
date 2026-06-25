

export interface EraMeta {
  period_label: string;
  year_pillar: string;
  era_brief: string;
}

export interface UserBaziMeta {
  age: number;
  epoch_label: string;
  hexagram_main: string;
  wuxing_tendency: string;
  useful_elements: string[];
  avoid_elements: string[];
  luck_cycle: string;
}

export interface EraUserSynergy {
  match_type: '顺势加成' | '填坑补课' | '错配磨练' | '中性背景';
  match_label: string;
  match_brief: string;
}

export interface StageMeta {
  code: '潜龙勿用' | '见龙在田' | '或跃在渊' | '飞龙在天' | '亢龙有悔' | '改命更迭';
  label: string;
  brief: string;
}

export interface KlinePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  confidence?: number; // 0-1
  label?: string;
  quote?: string;
  era?: string; // e.g. "九运·离火"
  stage_detail?: string; // e.g. "见龙在田"
}

export interface TimeRange {
  start_date: string;
  end_date: string;
}

export interface SummaryTag {
  tag_type: 'stage' | 'mood' | 'pattern' | 'cluster';
  label: string;
  description: string;
  linked_section: 'stage' | 'mood' | 'pattern' | 'cluster';
}

export interface DetailedAnalysis {
  core_keywords?: string[];
  status_summary: string;
  strategy_matrix?: {
    offensive: string;
    defensive: string;
    pivot: string;
  };
  energy_distribution?: {
    career: number;
    wealth: number;
    relationships: number;
    health: number;
  };
  actionable_advice: string[];
  coping_strategy: string;
  historical_loop_warning: string;
  archetype_reference: string;
  stage_guidance?: {
    core_focus: string;
    potential_pitfall: string;
  };
  pattern_break_tip?: string;
  success_cases?: Array<{
    name: string;
    story: string;
  }>;
}

export interface SegmentInsight {
  segment_id: string;
  time_range: TimeRange;
  stage: {
    label: string;
    brief: string;
    role_label: string;
  };
  k_line_data: {
    current_score: number;
    trend_direction: 'UP' | 'DOWN' | 'FLAT';
    volatility: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  detailed_analysis?: DetailedAnalysis;
  trend: {
    objective_trend: 'up' | 'flat' | 'down';
    description: string;
    subjective_vs_objective: {
      relation: 'aligned' | 'mood_darker' | 'mood_brighter';
      description: string;
    };
    safety_comment: string;
  };
  mood: {
    final_label: string;
  };
  key_event_summary: string;
  pattern: {
    pattern_detected: boolean;
    pattern_label?: string;
    pattern_description?: string;
  };
  cluster: {
    sample_size: number;
    main_outcomes: Array<{
      label: string;
      percentage: number;
    }>;
    typical_story: string;
  };
  summary_tags: SummaryTag[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export interface TradingOrder {
  id: string;
  type: 'buy' | 'sell' | 'watch';
  category: string;
  action: string;
  date: string;
  timestamp: number;
}

// --- Three Rings Interfaces ---

export interface EpochRing {
  current_stage: '种子' | '蓄势' | '突破' | '扩张' | '回收' | '重启';
  probability: number; // 0-1 (e.g., 0.85 confidence of being in this stage)
  red_line_condition: string; // e.g. "Cash >= 6 months"
  description: string;
}

export interface YearRing {
  current_gate: '起势门' | '攻坚门' | '收束门';
  win_score: number; // 0-100
  annual_theme: string; // e.g. "Focus on depth, not width"
}

export interface QuarterRing {
  current_phase: '起' | '承' | '转';
  turning_point: string; // Date string e.g. "Nov 15"
  rhythm_tendency: string; // e.g. "After turn: Acceleration"
}

// --- User Input Interface for Login ---
export interface ProvidenceResponse {
  energy_system: {
    core_status: { name: string; value: number; type: string; description: string; advice: string; };
    secondary_status: { name: string; value: number; type: string; description: string; advice: string; };
  };
  main_mission: {
    warning_level: string;
    keyword: string;
    instruction: string;
  };
  tactical_radar: {
    fashion: { lucky_color_hex: string; advice: string; };
  };
  sanctuary_radar: {
    direction: string;
    location_type: string;
    action_guide: string;
    psych_anchor: string;
  };
  nobleman_magnet: {
    lucky_target: { sign: string; visual_cue: string; interaction: string; };
    social_warning: { sign: string; forbidden_topic: string; consequence: string; };
  };
  fate_log_markdown?: string;
}

export interface KarmaResetResponse {
  metaphysical_reframe: string;
  verdict: string;
}

export interface UserInputProfile {
  name: string;
  gender: 'male' | 'female';
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:mm
  birthPlace: string;
}

// --- NEW MODULE: BAZI REPORT INTERFACES ---

export interface BaziChartPoint {
  age: number;
  year: number;
  daYun: string; // 大运干支
  ganZhi: string; // 流年干支
  open: number;
  close: number;
  high: number;
  low: number;
  score: number;
  reason: string; // 20-30 chars
}

export interface BaziReport {
  bazi: string[]; // [Year, Month, Day, Hour]
  summary: string;
  summaryScore: number;
  personality: string;
  personalityScore: number;
  industry: string;
  industryScore: number;
  fengShui: string;
  fengShuiScore: number;
  wealth: string;
  wealthScore: number;
  marriage: string;
  marriageScore: number;
  health: string;
  healthScore: number;
  family: string;
  familyScore: number;
  chartPoints: BaziChartPoint[];
  // New deep analysis fields
  deep_analysis?: {
    soul_mission: string;
    karmic_lesson: string;
    golden_key: string;
    lucky_elements: string[];
    noble_directions: string[];
  };
}