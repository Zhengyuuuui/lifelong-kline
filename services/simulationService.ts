
import { UserInputProfile, UserBaziMeta, EpochRing, YearRing, QuarterRing } from '../types';
import { i18n } from './i18n';
import { parseLocalDate } from '../lifeBook/utils/astrologyEngine';

/**
 * SIMULATION OF BACKEND LEVEL 1: HARD CALCULATION
 * 
 * In the real backend (Python/Node), this would invoke libraries like:
 * - lunar-python (for Solar->Lunar conversion, BaZi pillars)
 * - astrology libs (for planetary positions)
 * 
 * Here we mock the deterministic calculation to provide immediate frontend feedback.
 */
export const simulateLevel1Analysis = (input: UserInputProfile): UserBaziMeta => {
  const birthDate = parseLocalDate(input.birthDate);
  const currentYear = new Date().getFullYear();
  const birthYear = birthDate.getFullYear();
  
  // 1. Calculate Real Age
  let age = currentYear - birthYear;
  // Adjust if birthday hasn't happened yet this year (simple approximation)
  const today = new Date();
  if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
    age--;
  }
  if (age < 0) age = 0;

  // 2. Mock Pillar Calculation (Year Pillar)
  // Heavenly Stems: 甲, 乙, 丙, 丁, 戊, 己, 庚, 辛, 壬, 癸
  const stems = ['庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己'];
  // Earthly Branches: 申, 酉, 戌, 亥, 子, 丑, 寅, 卯, 辰, 巳, 午, 未
  const branches = ['申', '酉', '戌', '亥', '子', '丑', '寅', '卯', '辰', '巳', '午', '未'];
  
  // 0 AD is roughly Geng-Shen (Metal Monkey), index logic varies, this is a simplified loop
  const offset = birthYear % 60; 
  const stem = stems[birthYear % 10];
  const branch = branches[birthYear % 12];
  
  // 3. Mock Hexagram & Elements based on simple hashes of input
  // (In real backend, this uses date-time precise mapping)
  const isMale = input.gender === 'male';
  
  // Determine element tendency based on season of birth
  const month = birthDate.getMonth() + 1;
  let wuxing = "木火两旺";
  let useful = ["金", "水"];
  let avoid = ["火"];
  
  if (month >= 3 && month <= 5) { wuxing = "木气当令"; useful = ["火", "金"]; avoid = ["水"]; }
  else if (month >= 6 && month <= 8) { wuxing = "火土燥热"; useful = ["水", "金"]; avoid = ["火"]; }
  else if (month >= 9 && month <= 11) { wuxing = "金水进气"; useful = ["木", "火"]; avoid = ["金"]; }
  else { wuxing = "水寒土冻"; useful = ["火", "燥土"]; avoid = ["水"]; }

  return {
    age: age,
    epoch_label: `Epoch ${Math.ceil(age / 10)} · ${age < 30 ? i18n.t('rings.cycle_acc') : age < 50 ? i18n.t('rings.cycle_break') : i18n.t('rings.cycle_ret')}`,
    hexagram_main: isMale ? "乾为天" : "坤为地", // Placeholder mock
    wuxing_tendency: wuxing,
    useful_elements: useful,
    avoid_elements: avoid,
    luck_cycle: `${stem}${branch}大运`
  };
};

export const calculateThreeRings = (user: UserBaziMeta): { epoch: EpochRing, year: YearRing, quarter: QuarterRing } => {
  // 1. Epoch (10 Years) - Derived from Age and Luck Cycle
  // Simple logic: Age % 10 determines progress in decade.
  const ageInDecade = user.age % 10;
  let epochStage: EpochRing['current_stage'] = '蓄势';
  let epochDesc = "";

  if (ageInDecade < 2) {
    epochStage = '种子';
    epochDesc = i18n.t('sim.epoch_seed');
  } else if (ageInDecade < 4) {
    epochStage = '蓄势';
    epochDesc = i18n.t('sim.epoch_acc');
  } else if (ageInDecade < 6) {
    epochStage = '突破';
    epochDesc = i18n.t('sim.epoch_break');
  } else if (ageInDecade < 8) {
    epochStage = '扩张';
    epochDesc = i18n.t('sim.epoch_exp');
  } else {
    epochStage = '回收';
    epochDesc = i18n.t('sim.epoch_ret');
  }

  const epoch: EpochRing = {
    current_stage: epochStage,
    probability: 0.8 + (Math.random() * 0.1),
    red_line_condition: ageInDecade > 7 ? 'Cash >= 6mo' : 'Skills Ready',
    description: epochDesc
  };

  // 2. Year (3 Year Cycle) - Derived from current Year Pillar (e.g. 2024 Dragon)
  // We can use a modulo of the current year relative to birth year or just calendar year.
  // Let's use simple cyclical logic based on age to simulate personal rhythm.
  const yearMod = user.age % 3; 
  let yearGate: YearRing['current_gate'] = '起势门';
  let yearTheme = "";
  
  if (yearMod === 0) {
    yearGate = '起势门';
    yearTheme = i18n.t('sim.year_theme_start');
  } else if (yearMod === 1) {
    yearGate = '攻坚门';
    yearTheme = i18n.t('sim.year_theme_hard');
  } else {
    yearGate = '收束门';
    yearTheme = i18n.t('sim.year_theme_end');
  }

  const year: YearRing = {
    current_gate: yearGate,
    win_score: 60 + Math.floor(Math.random() * 30),
    annual_theme: yearTheme
  };

  // 3. Quarter (1 Year Rhythm) - Based on Month
  const month = new Date().getMonth() + 1;
  let quarterPhase: QuarterRing['current_phase'] = '起';
  let quarterTendency = "";
  let turningPoint = "";

  if (month <= 4) {
    quarterPhase = '起';
    quarterTendency = i18n.t('sim.q_start_tendency');
    turningPoint = "Apr 15";
  } else if (month <= 8) {
    quarterPhase = '承';
    quarterTendency = i18n.t('sim.q_mid_tendency');
    turningPoint = "Aug 15";
  } else {
    quarterPhase = '转';
    quarterTendency = i18n.t('sim.q_end_tendency');
    turningPoint = "Nov 15";
  }

  const quarter: QuarterRing = {
    current_phase: quarterPhase,
    turning_point: turningPoint,
    rhythm_tendency: quarterTendency
  };

  return { epoch, year, quarter };
};
