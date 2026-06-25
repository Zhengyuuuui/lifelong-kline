
import { KlinePoint, EraMeta, UserBaziMeta, EraUserSynergy, StageMeta, EpochRing, YearRing, QuarterRing, UserInputProfile } from '../types';
import { i18n } from './i18n';
import { formatLocalDateKey } from '../lifeBook/utils/astrologyEngine';

// --- SEEDED RNG HELPER ---
const seededRandom = (seed: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h >>>= 0;
  return () => {
    h = Math.imul(h, 0x48271);
    return ((h >>> 0) / 4294967296);
  };
};

const getSeedFromProfile = (p?: UserInputProfile | null): string => {
  if (!p) return formatLocalDateKey(); // Default to daily seed if guest
  return `${p.name}-${p.birthDate}-${p.birthTime}-${p.gender}-${p.birthPlace}`;
};

// Accessor functions to get localized data
export const getMockEraMeta = (): EraMeta => ({
  period_label: i18n.t('meta.period_label'),
  year_pillar: new Date().getFullYear().toString(), // Fixed dynamic year
  era_brief: i18n.t('sim.era_brief')
});

// Backward compatibility proxies - although apps should use getters for dynamic locale
export const MOCK_ERA_META: EraMeta = {
  period_label: "九运 · 离火运",
  year_pillar: new Date().getFullYear().toString(),
  era_brief: "这一运以“火”为主：速度快、曝光多、情绪浓，注意力容易被拉扯。"
};

export const MOCK_USER_BAZI: UserBaziMeta = {
  age: 32,
  epoch_label: "Epoch 2 · 蓄势期",
  hexagram_main: "乾为天",
  wuxing_tendency: "木火两旺",
  useful_elements: ["金", "水"],
  avoid_elements: ["火"],
  luck_cycle: "辛丑 · 3/10"
};

export const MOCK_SYNERGY: EraUserSynergy = {
  match_type: '顺势加成',
  match_label: "大运合局",
  match_brief: "时代大势放大了你的优势（表达与曝光）。高可见度，高消耗。"
};

export const MOCK_CURRENT_STAGE: StageMeta = {
  code: '见龙在田',
  label: "见龙在田",
  brief: "才华初现，根基未稳。寻导师，忌急躁。"
};

/**
 * GENERATOR 1: WEEKLY DATA (Micro View)
 * detailed, volatile, stock-like candles
 */
export const generateWeeklyData = (weeks: number = 52, userProfile?: UserInputProfile | null): KlinePoint[] => {
  const data: KlinePoint[] = [];
  let currentPrice = 50;
  const now = new Date();
  
  // Use seeded RNG if profile exists, otherwise Math.random
  const rng = userProfile ? seededRandom(getSeedFromProfile(userProfile) + "-weekly") : Math.random;

  for (let i = weeks; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const dateStr = formatLocalDateKey(date);
    
    // Random walk with momentum
    const change = (rng() - 0.48) * 4; 
    const open = currentPrice;
    const close = open + change;
    // Candlestick wicks
    const high = Math.max(open, close) + rng() * 2.5;
    const low = Math.min(open, close) - rng() * 2.5;

    data.push({
      date: dateStr,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2))
    });

    currentPrice = close;
  }
  return data;
};

/**
 * GENERATOR 2: MACRO DATA (Destiny Wave View)
 * Beautiful 11-point smooth destiny waveform matching user visual design exactly 1:1.
 */
export const generateMacroData = (userProfile?: UserInputProfile | null): KlinePoint[] => {
  const baseCurve = [45, 38, 55, 30, 20, 12, 10, 45, 68, 92, 75];

  const getEra = (i: number) => {
    if (i < 4) return "八运 · 艮土 (尾)";
    if (i < 7) return "九运 · 紫火 (升)";
    return "九运 · 离火 (盛)";
  };

  const getStageUrl = (i: number) => {
    switch (i) {
      case 2: return "觉醒";
      case 6: return "潜龙勿用";
      case 7: return "见龙在田";
      case 8: return "或跃在渊";
      case 9: return "飞龙在天";
      case 10: return "亢龙有悔";
      default: return "修炼期";
    }
  };

  const data: KlinePoint[] = [];
  baseCurve.forEach((val, i) => {
    let quote = undefined;
    let label = undefined;

    if (i === 2) quote = "觉醒";
    if (i === 6) label = '当前';
    if (i === 9) label = '未来';

    data.push({
      date: `P${i}`,
      open: val,
      close: val, 
      high: val,
      low: val,
      quote,
      label,
      era: getEra(i),
      stage_detail: getStageUrl(i)
    });
  });

  return data;
};

/**
 * GENERATOR 3: THREE RINGS DATA
 * Updated mappings: Epoch(10y), YearRing(3y Strategy), QuarterRing(1y Rhythm)
 */
export const generateRingsData = (userProfile?: UserInputProfile | null) => {
  const rng = userProfile ? seededRandom(getSeedFromProfile(userProfile) + "-rings") : Math.random;

  const epochStages = [
    { stage: '蓄势', desc: '这一运你处于“蓄势期”。不要急于求成，向下扎根，向内求索。', cond: '现金流 >= 6个月' },
    { stage: '突破', desc: '这一运你处于“突破期”。大胆尝试，抓住风口，快速迭代。', cond: '用户增长 > 20%' },
    { stage: '固守', desc: '这一运你处于“固守期”。稳扎稳打，守住基本盘，规避风险。', cond: '利润率 >= 15%' },
    { stage: '转型', desc: '这一运你处于“转型期”。寻找第二曲线，敢于自我革命。', cond: '新业务占比 > 30%' }
  ];

  const yearGates = [
    { gate: '攻坚门', theme: '深挖一口井，不挖十个坑' },
    { gate: '机遇门', theme: '广结善缘，借力打力' },
    { gate: '修整门', theme: '休养生息，复盘沉淀' },
    { gate: '扩张门', theme: '跑马圈地，快速复制' }
  ];

  const quarterPhases = [
    { phase: '转', tendency: '转折点后，节奏加快，注意能量储备。' },
    { phase: '承', tendency: '承接上季，稳步推进，注重执行。' },
    { phase: '起', tendency: '万象更新，规划先行，蓄势待发。' },
    { phase: '合', tendency: '收官之战，整合资源，完美收尾。' }
  ];

  const epochIdx = Math.floor(rng() * epochStages.length);
  const yearIdx = Math.floor(rng() * yearGates.length);
  const quarterIdx = Math.floor(rng() * quarterPhases.length);

  return {
    epoch: {
      current_stage: epochStages[epochIdx].stage,
      probability: 0.7 + rng() * 0.2, // 0.7 - 0.9
      red_line_condition: epochStages[epochIdx].cond,
      description: epochStages[epochIdx].desc
    } as EpochRing,
    
    year: {
      current_gate: yearGates[yearIdx].gate,
      win_score: Math.floor(60 + rng() * 35), // 60 - 95
      annual_theme: yearGates[yearIdx].theme,
    } as YearRing,
    
    quarter: {
      current_phase: quarterPhases[quarterIdx].phase,
      turning_point: `${Math.floor(rng() * 12) + 1}月${Math.floor(rng() * 28) + 1}日`,
      rhythm_tendency: quarterPhases[quarterIdx].tendency
    } as QuarterRing
  };
};

// Backward compatibility for existing imports if any (though we should update them)
export const MOCK_RINGS_DATA = generateRingsData(null);
