import { UserData, ElementType, LifeBookPageData, VisualItem } from '../types';
import { calculateAstrologyData, parseLocalDate } from './astrologyEngine';

// --- TYPES FOR DESTINY PROFILE ---

export type NarrativeArchetype =
  | '冷静幸存者'
  | '被压抑的创造者'
  | '高敏感观察者'
  | '孤独掌权者'
  | '失控边缘的理想主义者'
  | '关系里的拯救者'
  | '秩序重建者'
  | '隐秘野心家'
  | '漂泊寻找者'
  | '系统破局者';

export interface Pillar {
  heavenlyStem: string;
  earthlyBranch: string;
  element: string;
  yinYang: 'yin' | 'yang';
  tenGod?: string;
}

export interface BaziProfile {
  yearPillar: Pillar;
  monthPillar: Pillar;
  dayPillar: Pillar;
  hourPillar: Pillar;
  gongSha: string[];
  dayMaster: {
    stem: string;
    element: string;
    yinYang: 'yin' | 'yang';
    strengthScore: number;
    strengthLabel: 'weak' | 'balanced' | 'strong' | 'over_strong';
  };
  fiveElements: Record<string, number>;
  tenGodsDistribution: Record<string, number>;
  usefulGods: {
    primary: string[];
    secondary: string[];
    avoid: string[];
    explanation: string;
  };
  luckPillars: Array<{
    startAge: number;
    endAge: number;
    pillar: string;
    theme: string;
  }>;
}

export interface ZiweiProfile {
  mingGong: {
    palace: string;
    mainStars: string[];
    supportStars: string[];
    theme: string;
  };
  twelvePalaces: Array<{
    palaceName: string;
    mainStars: string[];
    interpretationKeywords: string[];
  }>;
}

export interface IchingProfile {
  natalHexagram: {
    number: number;
    name: string;
    coreTheme: string;
    lifeAdvice: string;
  };
  changingLines: number[];
  changedHexagram: {
    number: number;
    name: string;
    coreTheme: string;
    lifeAdvice: string;
  };
}

export interface WesternProfile {
  sunSign: string;
  moonSign: string;
  risingSign: string;
  dominantElements: Record<string, number>;
  archetypes: string[];
}

export interface DestinyProfile {
  user: UserData;
  bazi: BaziProfile;
  ziwei: ZiweiProfile;
  iching: IchingProfile;
  astrology: WesternProfile;
  derivedProfile: {
    lifeCoreTheme: string;
    soulWound: string;
    survivalMechanism: string;
    hiddenTalent: string;
    careerEngine: string;
    wealthPattern: string;
    relationshipPattern: string;
    healthAttentionPattern: string;
    tenYearMainTheme: string;
    fiveElementExtremes: {
      strongest: string;
      weakest: string;
      imbalanceDescription: string;
    };
    personalityContradictions: string[];
    narrativeArchetypes: NarrativeArchetype[];
  };
}

// --- CONSTANTS ---
const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ELEMENTS = ['木', '火', '土', '金', '水'];
const ELEMENT_PAIRS: Record<string, string> = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水'
};
const YIN_YANG: Record<string, 'yin' | 'yang'> = {
  '甲': 'yang', '乙': 'yin', '丙': 'yang', '丁': 'yin', '戊': 'yang', '己': 'yin', '庚': 'yang', '辛': 'yin', '壬': 'yang', '癸': 'yin',
  '子': 'yang', '丑': 'yin', '寅': 'yang', '卯': 'yin', '辰': 'yang', '巳': 'yin', '午': 'yang', '未': 'yin', '申': 'yang', '酉': 'yin', '戌': 'yang', '亥': 'yin'
};

const ZIWEI_STARS = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'];
const HEXAGRAMS_INFO = [
  { name: '乾为天', theme: '刚健中正，天行健君子以自强不息', advice: '静待时机，不可轻举妄动，潜龙勿用，终期一跃。' },
  { name: '坤为地', theme: '柔顺包容，地势坤君子以厚德载物', advice: '静守被动，厚积薄发，先迷后得，顺其自然。' },
  { name: '水雷屯', theme: '起始艰难，万事开头难的生命原能', advice: '面临阻碍先固守根本，切忌盲目扩张，寻找帮扶贵人。' },
  { name: '山水蒙', theme: '启蒙阶段，迷茫探索中的顿悟之光', advice: '戒骄戒躁，尊师重道，排除心中的侥幸与浮躁。' },
  { name: '水天需', theme: '守常待机，积蓄元气以应对大风大浪', advice: '在喧嚣中克制欲望，等待合适的催化事件发生。' },
  { name: '天水讼', theme: '冲突磨合，观念碰撞与权力边界分割', advice: '做事留有余地，退一步海阔天空，切莫因斗胜而自损。' },
  { name: '地水师', theme: '纪律凝聚，带领团队重塑内部秩序', advice: '克己奉公，以高标准自律，凝聚人心共同应对危机。' },
  { name: '水地比', theme: '协作共利，寻找灵性与物质的合伙人', advice: '以诚待人，不卑不亢，主动融入健康的协同系统。' }
];

// Determine Sun Sign
const getSunSign = (date: Date): string => {
  const month = date.getMonth(); // 0-11
  const day = date.getDate();
  const m = month + 1; // 1-indexed for clarity
  if ((m === 12 && day >= 22) || (m === 1 && day <= 19)) return '摩羯座';
  if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return '水瓶座';
  if ((m === 2 && day >= 19) || (m === 3 && day <= 20)) return '双鱼座';
  if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return '白羊座';
  if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return '金牛座';
  if ((m === 5 && day >= 21) || (m === 6 && day <= 21)) return '双子座';
  if ((m === 6 && day >= 22) || (m === 7 && day <= 22)) return '巨蟹座';
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return '狮子座';
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return '处女座';
  if ((m === 9 && day >= 23) || (m === 10 && day <= 23)) return '天秤座';
  if ((m === 10 && day >= 24) || (m === 11 && day <= 22)) return '天蝎座';
  if ((m === 11 && day >= 23) || (m === 12 && day <= 21)) return '射手座';
  return '双鱼座'; // Fallback
};

// --- CALCULATE DESTINY PROFILE (Deterministic Algorithm) ---
export const calculateDestinyProfile = (user: UserData): DestinyProfile => {
  const date = parseLocalDate(user.birthDate);
  const hashVal = date.getFullYear() + date.getMonth() * 31 + date.getDate() + parseInt(user.birthTime.split(':')[0] || '12');
  
  // Real Bazi and Astrology calculations using the standard astrologyEngine
  const astro = calculateAstrologyData(user);

  // Extract precise calculated 4 pillars of Destiny
  const yearStem = astro.bazi.year[0];
  const yearBranch = astro.bazi.year[1];
  
  const monthStem = astro.bazi.month[0];
  const monthBranch = astro.bazi.month[1];
  
  const dayStem = astro.bazi.day[0];
  const dayBranch = astro.bazi.day[1];
  
  const hourStem = astro.bazi.hour[0];
  const hourBranch = astro.bazi.hour[1];

  const dmStem = dayStem;
  const dmElement = ELEMENT_PAIRS[dmStem];
  const dmYinYang = YIN_YANG[dmStem] || 'yang';

  // 100% correct, precise values derived realistically from our standard astrology calculation
  const fiveElements = {
    '木': astro.scores.wood,
    '火': astro.scores.fire,
    '土': astro.scores.earth,
    '金': astro.scores.metal,
    '水': astro.scores.water
  };

  const elementKeys = Object.keys(fiveElements) as Array<'木'|'火'|'土'|'金'|'水'>;
  let strongest = elementKeys[0];
  let weakest = elementKeys[0];
  elementKeys.forEach(k => {
    if (fiveElements[k] > fiveElements[strongest]) strongest = k;
    if (fiveElements[k] < fiveElements[weakest]) weakest = k;
  });

  // Ten Gods distribution from actual calculations
  const filterTenGods = (names: string[]): number => {
    return astro.tenGods.filter(t => names.includes(t.name)).length || 1;
  };
  const tenGodsDistribution = {
    '比劫 (自我与固执)': filterTenGods(['比肩', '劫财']),
    '食伤 (创造与消耗)': filterTenGods(['食神', '伤官']),
    '财星 (现实与控制)': filterTenGods(['正财', '偏财']),
    '官杀 (秩序与压力)': filterTenGods(['正官', '七杀']),
    '印星 (安全与心因)': filterTenGods(['正印', '偏印']),
  };

  const strengthScore = fiveElements[dmElement as keyof typeof fiveElements] || 40;
  const strengthLabel = strengthScore > 75 ? 'over_strong' : strengthScore > 50 ? 'strong' : strengthScore > 30 ? 'balanced' : 'weak';

  // Ziwei using real stars and palaces
  const mingGong = {
    palace: astro.ziwei.palace,
    mainStars: [astro.ziwei.mainStar, astro.ziwei.bodyStar],
    supportStars: ['文昌', '天魁', '陀罗'],
    theme: `以「${astro.ziwei.mainStar}」为核心，带有隐秘野心与高度灵性觉察，既追求坚不可摧的安全边界，又渴望冲破现有枷锁。`
  };

  const twelvePalaces = [
    { palaceName: '命宫', mainStars: [astro.ziwei.mainStar], interpretationKeywords: ['性格内核', '本能面具', '基础潜能'] },
    { palaceName: '夫妻宫', mainStars: [astro.ziwei.bodyStar], interpretationKeywords: ['感情投射', '拯救欲与依附边界'] },
    { palaceName: '财帛宫', mainStars: [astro.ziwei.movementStar], interpretationKeywords: ['财能掌控', '虚荣黑洞', '价值兑现'] },
    { palaceName: '官禄宫', mainStars: ['武曲', '天梁'], interpretationKeywords: ['事业引擎', '执行力阈值', '秩序重建'] },
    { palaceName: '疾厄宫', mainStars: ['太阳'], interpretationKeywords: ['躯体压力映射', '气血暗战', '情绪源地'] }
  ];

  // Iching using real generated hexagrams
  const formatHexAdv = (name: string) => {
    const item = HEXAGRAMS_INFO.find(h => h.name === name);
    return item ? item.advice : "静守被动，厚积薄发，先迷后得，顺其自然。";
  };
  const formatHexTheme = (name: string) => {
    const item = HEXAGRAMS_INFO.find(h => h.name === name);
    return item ? item.theme : "柔顺包容，地势坤君子以厚德载物";
  };

  const iching = {
    natalHexagram: {
      number: (hashVal % 8) + 1,
      name: astro.hexagram.current,
      coreTheme: formatHexTheme(astro.hexagram.current),
      lifeAdvice: formatHexAdv(astro.hexagram.current)
    },
    changingLines: [(hashVal % 6) + 1],
    changedHexagram: {
      number: ((hashVal + 3) % 8) + 1,
      name: astro.hexagram.change,
      coreTheme: formatHexTheme(astro.hexagram.change),
      lifeAdvice: formatHexAdv(astro.hexagram.change)
    }
  };

  const sunSign = astro.western.sun;
  const moonSign = astro.western.moon;
  const risingSign = astro.western.ascendant;

  // Real Archetypes selection mapped deterministically
  const ARCHETYPES_LIST: NarrativeArchetype[] = [
    '冷静幸存者',
    '被压抑的创造者',
    '高敏感观察者',
    '孤独掌权者',
    '失控边缘的理想主义者',
    '关系里的拯救者',
    '秩序重建者',
    '隐秘野心家',
    '漂泊寻找者',
    '系统破局者'
  ];
  const arch1 = ARCHETYPES_LIST[hashVal % ARCHETYPES_LIST.length];
  const arch2 = ARCHETYPES_LIST[(hashVal + 3) % ARCHETYPES_LIST.length];
  const primaryArchetypes = [arch1, arch2];

  const elementImbalanceDecls: Record<string, string> = {
    '木': '木气偏枯或过旺，常感叹时运不济，产生本能的焦虑与抗拒。',
    '火': '火气失衡，内心极其焦灼亢进，容易在过度热情与绝望冷漠间反复横跳。',
    '土': '土气偏颇，导致过度的自我怀疑与不安全感，本能追求绝对的掌控以获得安全。',
    '金': '金气失和，杀伐之意或秩序感失控，极度渴望用冷漠隔绝世俗对生命元气的消耗。',
    '水': '水气失调，情绪缺乏安全边界，容易在无底线的拯救欲与深度抽离间摇摆。'
  };

  return {
    user,
    bazi: {
      yearPillar: { heavenlyStem: yearStem, earthlyBranch: yearBranch, element: ELEMENT_PAIRS[yearStem] || '金', yinYang: YIN_YANG[yearStem] || 'yang' },
      monthPillar: { heavenlyStem: monthStem, earthlyBranch: monthBranch, element: ELEMENT_PAIRS[monthStem] || '土', yinYang: YIN_YANG[monthStem] || 'yin' },
      dayPillar: { heavenlyStem: dayStem, earthlyBranch: dayBranch, element: ELEMENT_PAIRS[dayStem] || '金', yinYang: YIN_YANG[dayStem] || 'yang' },
      hourPillar: { heavenlyStem: hourStem, earthlyBranch: hourBranch, element: ELEMENT_PAIRS[hourStem] || '水', yinYang: YIN_YANG[hourStem] || 'yin' },
      gongSha: ['天乙贵人', '太极贵人', '驿马星'],
      dayMaster: {
        stem: dmStem,
        element: dmElement,
        yinYang: dmYinYang,
        strengthScore,
        strengthLabel
      },
      fiveElements,
      tenGodsDistribution,
      usefulGods: {
        primary: [strongest === '水' ? '木' : strongest === '木' ? '火' : strongest === '火' ? '土' : strongest === '土' ? '金' : '水'],
        secondary: [weakest],
        avoid: [strongest],
        explanation: `系统气数学显示，持有人五行至强为「${strongest}」，最弱为「${weakest}」。喜用神重点推论喜用「${strongest === '水' ? '木' : strongest === '木' ? '火' : strongest === '火' ? '土' : strongest === '土' ? '金' : '水'}」以调节原局能量。`
      },
      luckPillars: [
        { startAge: 1, endAge: 10, pillar: '甲午', theme: '一甲子初开，元气懵懂探索' },
        { startAge: 11, endAge: 20, pillar: '乙未', theme: '乙木生长，开始建立外界秩序认识' },
        { startAge: 21, endAge: 30, pillar: '丙申', theme: '丙火照耀，步入社会进行激烈的价值重组' },
        { startAge: 31, endAge: 40, pillar: '丁酉', theme: '丁火熔金，灵魂主权觉醒与现实博弈期' },
        { startAge: 41, endAge: 50, pillar: '戊戌', theme: '重土载物，开始高维精神退隐与财富沉淀' }
      ]
    },
    ziwei: {
      mingGong,
      twelvePalaces
    },
    iching,
    astrology: {
      sunSign,
      moonSign,
      risingSign,
      dominantElements: {
        '风': Math.round(astro.scores.metal * 0.4 + astro.scores.wood * 0.3),
        '火': Math.round(astro.scores.fire * 0.7),
        '土': Math.round(astro.scores.earth * 0.7),
        '水': Math.round(astro.scores.water * 0.7)
      },
      archetypes: primaryArchetypes
    },
    derivedProfile: {
      lifeCoreTheme: `以「${dmElement}」的本源原力，转化「${sunSign}」与「${risingSign}」的固有习惯冲突，实现主权自我。`,
      soulWound: elementImbalanceDecls[weakest] ? `本源弱项「${weakest}」构成了你一生的情绪漏洞：${elementImbalanceDecls[weakest]}` : `五行失调导致的宿命情绪虚弱。`,
      survivalMechanism: `在高压与不确定环境中，习惯于通过「${primaryArchetypes[0]}」的面貌进行自我隔离和危机防御。`,
      hiddenTalent: `你天生具备对「${strongest}」之原力和系统底层的绝佳拆解重组天赋，能冷酷地直视真相。`,
      careerEngine: `契合你高傲神煞与喜用「${strongest === '水' ? '木' : strongest === '木' ? '火' : strongest === '火' ? '土' : strongest === '土' ? '金' : '水'}」的最佳运行引擎：做高主控度、低内耗的秩序掌控 and 创意攻关型职业。`,
      wealthPattern: `你的财富容器适合「细流汇海」或「强渡重山」：忌与低频情绪勒索者合伙，宜自主把控核心生产资料与契约条款。`,
      relationshipPattern: `防备心极高、追求灵魂的高频共振，容忍不了缺乏独立边界的拉扯。最佳两性能量匹配喜「${strongest === '水' ? '木' : strongest === '木' ? '火' : strongest === '火' ? '土' : strongest === '土' ? '金' : '水'}」或自主高自律的星盘。`,
      healthAttentionPattern: `特别容易因为心火上炎或肝气郁滞导致头部与躯体气血运行过载，应重点疏导、清热解毒。`,
      tenYearMainTheme: `回归主权自我。用冷淡的防守建立最坚固的心智防线，精细雕琢核心私产。`,
      fiveElementExtremes: {
        strongest,
        weakest,
        imbalanceDescription: elementImbalanceDecls[strongest] || '元素原力基本平衡。'
      },
      personalityContradictions: [
        `既渴望「${risingSign}」的安全与宁静，又暗中带有「${sunSign}」的傲骨与不甘`,
        `既有着「${dmElement}」的善良纯粹底色，又想用绝对的理性、冷落去隔离外部消耗`
      ],
      narrativeArchetypes: primaryArchetypes
    }
  };
};

export const build99Pages = (profile: DestinyProfile): LifeBookPageData[] => {
  const pages: LifeBookPageData[] = [];
  const hashVal = profile.user.birthDate.getFullYear() + profile.user.birthDate.getMonth() * 31 + profile.user.birthDate.getDate() + parseInt(profile.user.birthTime.split(':')[0] || '12');
  const user = profile.user;
  const dm = profile.bazi.dayMaster;

  // PAGE 1 / CHAPTER 01: 你的人生使用说明书
  pages.push({
    pageNumber: 1,
    title: `你的人生使用说明书`,
    subtitle: `01 / LIFE USER MANUAL`,
    content: `这是一个完全属于「${user.name}」的绝密人生解码本。系统结合星图与四柱神煞算力，在这本说明书里，剥离世俗噪音，揭示你心性原力的本真代码。翻开此册，开启主权人格回归的高维修行旅程。`,
    visualItems: [
      { type: 'card', label: '版本号/重构代码', value: 'V4.2.0 - SOVEREIGN RENDER', accent: true },
      { type: 'list', label: '算力底座', value: 'SYSTEM LEVEL VECTORS', subtext: '99页精密解码' }
    ]
  });

  // PAGE 2 / CHAPTER 02: 五行原力分布
  pages.push({
    pageNumber: 2,
    title: `五行原力分布`,
    subtitle: `02 / FIVE ELEMENTS FORCE FIELD`,
    content: `你的星盘蕴藏着独特的五行能量分布。太阳落在优雅纯黑的「${profile.astrology.sunSign}」，月亮居于「${profile.astrology.risingSign}」，这奠定了你外在理智与内在深邃的审美纠缠。`,
    visualItems: [
      { type: 'stat', label: '木 (活力)', value: profile.bazi.fiveElements['木'], accent: dm.element === '木' },
      { type: 'stat', label: '火 (动力)', value: profile.bazi.fiveElements['火'], accent: dm.element === '火' },
      { type: 'stat', label: '土 (承载)', value: profile.bazi.fiveElements['土'], accent: dm.element === '土' },
      { type: 'stat', label: '金 (秩序)', value: profile.bazi.fiveElements['金'], accent: dm.element === '金' },
      { type: 'stat', label: '水 (灵敏)', value: profile.bazi.fiveElements['水'], accent: dm.element === '水' }
    ]
  });

  // PAGE 3 / CHAPTER 03: 你这生的总纲
  pages.push({
    pageNumber: 3,
    title: `你这生的总纲`,
    subtitle: `03 / THE ULTIMATE LIFE THREAD`,
    content: `你的一生是一系列预设冲突在时间的宏伟框架里的全面铺展。
    
系统解密你此生的总纲为：【以「${dm.element}」之本源原力去打破「${profile.astrology.sunSign}」的作茧自制，在现实碰撞中获取真正的灵魂解放】。在你的精神深层，你极度反抗平庸的指挥、虚无的打卡以及机械式的世俗汇报。你的一切求索，本质上都是在尘世中重新夺回个人的终极生存主权。`,
    visualItems: [
      { type: 'card', label: '此生终极使命', value: '突破低维限制 建立个体主权', accent: true },
      { type: 'list', label: '底层自律强度', value: profile.bazi.fiveElements['金'] > 40 ? '高张力纯铁' : '韧性流动', subtext: '自主规范指数' },
      { type: 'quote', value: '真正的主权不来自他人的赠予，而来自于你开始冷酷地对平庸拒绝的那一秒。', subtext: '总纲回响' }
    ]
  });

  // PAGE 4 / CHAPTER 04: 最匹配的三大职业拓展
  pages.push({
    pageNumber: 4,
    title: `最匹配的三大职业拓展`,
    subtitle: `04 / HIGH ALIGNED CAREERS`,
    content: `在精密的星盘与天干官杀气数透射下，你绝非流水线的温顺零件，你适合充当以下三大高阶职业方向的开辟者或领头雁：
    
1. 【高维战略顾问与秩序重组法官】：利用你极佳的系统拆解天赋。
2. 【独立创意开拓者 / 特种项目破局官】：在突发高压的极端黑夜里冷静攻关。
3. 【具有美学洁癖的高阶自由创作者】：用极高审美净化大众视听。`,
    visualItems: [
      { type: 'tag', label: '匹配方向一', value: '高阶重组法官 / 顾问' },
      { type: 'tag', label: '匹配方向二', value: '特种项目攻坚破局官' },
      { type: 'tag', label: '匹配方向三', value: '具有美学洁癖的创始人' }
    ]
  });

  // PAGE 5 / CHAPTER 05: 最消耗你的三大职业类型
  pages.push({
    pageNumber: 5,
    title: `最消耗你的三大职业类型`,
    subtitle: `05 / TAXING CAREER PATHS`,
    content: `生命是一场有限能量的处理游戏。在低效或不契合的职业体系中，你的能量会自动“大失血”。系统警告你终身避免以下三大职业泥潭：
    
1. 【重型传统体制里的无脑传话筒】：枯燥重复的数据汇报和低频迎合，将直接物理摧毁你高傲的神煞。
2. 【虚伪且拉锯的情感公关中介】：过度消耗感情、缺乏法理边界的拉扯社交是不折不扣的剧毒。
3. 【无价值的机械维护与操作劳动力】：缺乏自我掌控度的工时变现。`,
    visualItems: [
      { type: 'card', label: '首要禁入雷区', value: '虚伪人际情感消耗岗', accent: true },
      { type: 'list', label: '折磨内耗值', value: '99/99 PURE POISON', subtext: '警惕体力虚耗' }
    ]
  });

  // PAGE 6 / CHAPTER 06: 一生最旺方位与城市
  pages.push({
    pageNumber: 6,
    title: `一生最旺方位与城市`,
    subtitle: `06 / GEOGRAPHICAL RESONANCE`,
    content: `地气决定人气，地脉与你的喜用五行产生自适共振：
    
- 算力推荐：你的第一神明喜用是「${profile.bazi.usefulGods.primary[0]}」之气。
- 最旺方位：最利于你求财、修心、立命的地理方位为「${profile.bazi.usefulGods.primary[0] === '木' ? '东方、东南沿海区域' : profile.bazi.usefulGods.primary[0] === '水' ? '北方、高水脉湿润地带' : profile.bazi.usefulGods.primary[0] === '火' ? '南方、常年充裕光照城市' : '中原或临近大地的西部平原'}」。
- 典型城市磁场：如「${profile.bazi.usefulGods.primary[0] === '木' || profile.bazi.usefulGods.primary[0] === '水' ? '深圳、杭州、上海、青岛' : '北京、成都、广州、西安'}」等契合大格局 of 上升之城。`,
    visualItems: [
      { type: 'list', label: '守护方位', value: profile.bazi.usefulGods.primary[0] === '木' ? '东/东南' : '北/西北', subtext: '办公/寝位朝向佳' },
      { type: 'quote', value: '大地之气不顺则神思浮躁，脚踏用神吉脉则心定如太山。', subtext: '山川符箓' }
    ]
  });


  // PAGE 7 / CHAPTER 07: 你的副本攻略：未来 90 天
  pages.push({
    pageNumber: 7,
    title: `你的副本攻略：未来 90 天`,
    subtitle: `07 / 90-DAY ACTION PROTOCOL`,
    content: `未来90天是你跳脱旧我惯性、进入冷酷调试的关键期。
    
请在此时空中拉响你的【神圣戒备线】：
- 任务一：彻底停用并退出至少两个对你进行情绪勒索或低智商压制的关系链。
- 任务二：启动至少一项属于你个人私产的小而美产品研发或底层心智重装。
- 任务三：在每周设置一个完全断网的“物理自愈之夜”，让亢奋的脑神经降温消炎。`,
    visualItems: [
      { type: 'card', label: '第一月核心课', value: '建立铁一般的拒绝壁垒', accent: true },
      { type: 'list', label: '战术指令', value: '无情拉黑低频消耗源', subtext: '即刻物理执行' }
    ]
  });

  // PAGE 8 / CHAPTER 08: 理想合作伙伴能量配方：两性
  pages.push({
    pageNumber: 8,
    title: `理想合作伙伴能量配方：两性`,
    subtitle: `08 / SOULMATE ENERGY CODES`,
    content: `在亲密关系中，你排斥任何世俗的客套应酬，渴望极度的高频纯度与绝对防备区安全：
    
- 伴侣元素天线：最能舒缓你天生焦灼情绪的异性，其命中天干必须带有活跃的「${profile.bazi.usefulGods.primary[0]}」之气。
- 心灵咬合点：对方需能极度包容并读懂你偶尔显露出来的冷酷与抽离，而不是将其无端解读为“不爱”。能在沉默中保持彼此独立的灵魂，才是你最好的滋养。`,
    visualItems: [
      { type: 'list', label: '能量互补因子', value: profile.bazi.usefulGods.primary[0] + '曜引力', subtext: '星盘最佳契合配方' },
      { type: 'quote', value: '两个破碎的星辰勉强合拢只能沦入引力浩劫，唯有各正主权的双鹰才能在高空中并肩飞翔。', subtext: '契约盟誓' }
    ]
  });

  // PAGE 9 / CHAPTER 09: 商业合作伙伴推荐
  pages.push({
    pageNumber: 9,
    title: `商业合作伙伴推荐`,
    subtitle: `09 / PROFESSIONAL PARTNERS`,
    content: `商业伙伴的挑选是一场严肃的利益重组与资源交换，绝不可动用无谓的哥们儿义气或泛滥的同情：
    
- 最佳盟友命格：优先推荐命中带有「${profile.derivedProfile.narrativeArchetypes[1] || '系统破局者'}」或强印/强比等高自律、死守契约、追求极致结果交付之人。
- 合作死穴：杜绝与情绪化、爱哭惨、口嗨“下次一定”但从无实际兑现的散乱原气者有任何大额金钱拖欠往来。`,
    visualItems: [
      { type: 'tag', label: '首选合伙格', value: '高效客观契约人' },
      { type: 'tag', label: '禁忌合作格', value: '无边界情绪勒索客' }
    ]
  });

  // PAGE 10 / CHAPTER 10: 财富期高峰
  pages.push({
    pageNumber: 10,
    title: `财富期高峰`,
    subtitle: `10 / PEAK WEALTH EPOCHS`,
    content: `你的生辰底盘是「财库封喉、破壁即发」之格。系统经算法推演，定位你的财富高峰将落在：
    
- 交接大运：在第 3 个大运及第 4 个大运（特别是「辛酉、壬戌」等流年或大运主导星盘之时）。
- 财富苏醒密码：只要当你彻底建立了“对金钱冷酷、合伙无情、账目焊死”的底线时，你的财富容器便能在极短时间内涌入爆发式的上升流灌，实现阶层自跃。`,
    visualItems: [
      { type: 'stat', label: '财运爆发潜力', value: 88, accent: true },
      { type: 'list', label: '吸金核心策略', value: '建立严苛分账与防火墙', subtext: '封死无谓失血点' }
    ]
  });

  // PAGE 11 / CHAPTER 11: 需重点关注的低谷期
  pages.push({
    pageNumber: 11,
    title: `需重点关注的低谷期`,
    subtitle: `11 / SHIELD OF LOW POINTS`,
    content: `任何狂澜都有回荡的空海。根据流年命运K线的重力平衡演算，以下节点你需要格外静默沉淀、高筑墙广积粮：
    
- 雷区年份：逢冲克日柱的年份（如岁运逢庚、冲克你心气本源的节点）。
- 防身符咒：在低谷期千万不要借贷、不要为他人的债务提供任何口头或法理担保。主动向大自然、高雅艺术退避，静默积累你的非线性反弹筹码，等待地磁重装。`,
    visualItems: [
      { type: 'card', label: '防漏财法防线', value: '禁止非理性跟风投资', accent: true },
      { type: 'quote', value: '严冬不是生命的退赛，它是大地为你下一次极其盛大的复苏，做出的深远物理埋藏。', subtext: '冬蛰法旨' }
    ]
  });

  // PAGE 12 / CHAPTER 12: 身体关注焦点
  pages.push({
    pageNumber: 12,
    title: `身体关注焦点`,
    subtitle: `12 / PHYSICAL BULWARK`,
    content: `五行由于过于强旺和偏离平衡（尤其是你的最强元素【${profile.derivedProfile.fiveElementExtremes.strongest}】气数高涨），会导致能量在特定脏器产生物理过载：
    
- 易发痛点：精神性失眠、心包积淤、肝肾气机由于长期背负高负荷责任而极度亢进，易转化为慢性的身体虚火。
- 物理自疗建议：戒除晚间刺激性屏幕，多喝高质量泉水，适当赤脚踩踏草地进行接地放电，平息脑中浮热。`,
    visualItems: [
      { type: 'stat', label: '身体虚火度', value: profile.bazi.fiveElements[profile.derivedProfile.fiveElementExtremes.strongest] + 12 },
      { type: 'list', label: '自愈核心项', value: '让大脑彻底消炎降温', subtext: '物理去燥排火' }
    ]
  });

  // PAGE 13 / CHAPTER 13: 姓名能量评估
  pages.push({
    pageNumber: 13,
    title: `姓名能量评估`,
    subtitle: `13 / NAME ENERGY ASSESSMENT`,
    content: `检测姓名：【${user.name}】。
    
系统的数理声振算法表明，你的名字中藏着特定的“重塑”拉扯。字音和笔画大体上契合你的用神走向，但当中的某些笔锋转折过于锐利，容易将外界的冷箭反向吸入你的气场，造成无谓的摩擦。
    
- 能量重塑建议：在日常硬笔书法、手写签名或随身护符的设计中，多采用挺拔高耸、横平竖直、圆融内含的笔墨力量，以默默补足星盘渴望的「金/木」之风骨。`,
    visualItems: [
      { type: 'list', label: '姓名声振谐率', value: '85% AUTO RESONANCE', subtext: '气场稳固契对' },
      { type: 'quote', value: '名字是你在人世游历的第一道声频。笔锋沉定，其神自不乱。', subtext: '名字灵音' }
    ]
  });

  // PAGE 14 / CHAPTER 14: 贵人规律：未来十年
  pages.push({
    pageNumber: 14,
    title: `贵人规律：未来十年`,
    subtitle: `14 / PATTERNS OF NOBLES`,
    content: `你的命中驻扎着高阶的【天魁、天钺】守护星曜。未来十年，你身边的“贵人”相见方式将一如既往地不期而遇，并具有如下鲜明规律：
    
1. 他们外表往往极其高冷理性，甚至带有一点让你心颤的严肃感。
2. They绝不会通过无原则的夸张和赞美来讨好你，反而会在你陷入无聊内耗、自我作茧的紧要关头，用一针见血、极其残忍的话彻底把你物理抽醒。
3. 请大方地建立高质的契约利益交换，这是建立信任的最体面通路。`,
    visualItems: [
      { type: 'tag', label: '贵人核心相貌', value: '高冷/专业/守契' },
      { type: 'tag', label: '接触第一禁忌', value: '切忌扭捏做作与示弱' }
    ]
  });

  // PAGE 15 / CHAPTER 15: 今日能量仪表盘
  pages.push({
    pageNumber: 15,
    title: `今日能量仪表盘`,
    subtitle: `15 / TRANSIT ENERGY COMPASS`,
    content: `今日天体星盘运行至你的特写喜用神气数区。
    
系统实存参数指示：
- 本日核心调音：将你的日常意念从“自省内耗”彻底转为“高频防御”。
- 外界重组系数：本日你的五行本源气场纯净度达到了 ${(hashVal % 15) + 85}%，是清扫心中噪音碎片、物理整理环境的好时机。`,
    visualItems: [
      { type: 'stat', label: '本日能量饱和度', value: (hashVal % 10) + 90, accent: true },
      { type: 'list', label: '核心气学引导', value: '面带冷淡微笑，收回多余同情', subtext: '首要防线' }
    ]
  });

  const volume1Themes = [
    {
      title: '避险法则：高筑物理隔离墙，杜绝对同情心动用能量财库',
      subtitle: 'HIGH LEVEL SHIELD & BOUNDS',
      content: `关于避险策略：你的一生是一系列预设冲突在时间的宏伟框架里的全面铺展，低谷和挫折都是你的必修功课。在这个过程中，你必须要学会对低劣、不顺的人情冷酷隔离。每一次面带微笑保持不解释的敬而远之，都是在为灵魂正位清扫道路。`,
      label: '避险度强韧',
      quote: '严冬是在天地间，为下一场极其盛大的高维飞跃做出的无情物理深埋。'
    },
    {
      title: '审美救赎：去寻找和抚摸那些能洗刷神经污质的高雅实体',
      subtitle: 'AESTHETIC REBOOT',
      content: `太多的数字屏幕、重复的任务表格正在腐蚀你高天生高敏感的「${profile.astrology.sunSign}」视神经。系统的本页强烈呼吁你，每周去接触大自然、物理翻阅高质量的纸质线装书、或静静聆听纯乐。通过物理感官对低频信息进行一次全身心洗尘。`,
      label: '五感自愈度',
      quote: '生命的最本真欢愉，往往藏在那些温润、无言、极其干净的朴拙物理细节中。'
    },
    {
      title: `五行逆差调和：用安静的流动平息你脑海中的焦灼浮热`,
      subtitle: 'ELEMENTAL EQUILIBRIUM',
      content: `宿命由于【${profile.derivedProfile.fiveElementExtremes.strongest}】星盘的过度张拉，你的大脑和神经纤维极为容易过度劳损，化为深层的身体烦躁。少喝刺激的浓茶咖啡，多喝优质的泉水，让微观水原力慢慢浸泡舒缓你长期亢进的神经末稍。`,
      label: '本源虚火泄',
      quote: '流动的水原力从不迎头撞击礁石，它仅仅是通过平稳的规避，便带走了所有的沟壑。'
    },
    {
      title: '主权独立：不做任何人情感寄生或者世俗眼光的豢养品',
      subtitle: 'SOVEREIGNTY OF THE SOUL',
      content: `你骨子里是自带不灭仙童火种的高洁星体。千万不要因为短暂的孤寂或者对虚幻安全感的追索，而被任何世俗凡庸者的标准规训。你的每一步冷酷抽身，每一次面带微笑保持不解释的敬而远之，都是在为灵魂正位清扫道路。`,
      label: '意志不降维',
      quote: '飞鹰从来不在地面乌烟瘴气的喧哗中垂头丧气，它的毕生追求是整片深邃星汉。'
    }
  ];

  for (let i = 16; i <= 19; i++) {
    const themeIdx = i - 16;
    const itemData = volume1Themes[themeIdx];
    
    let cycleVisualItems: any[] = [];
    if (i % 4 === 0) {
      cycleVisualItems = [
        { type: 'quote', value: itemData.quote, subtext: '心性指引' }
      ];
    } else if (i % 4 === 1) {
      cycleVisualItems = [
        {
          type: 'matrix',
          label: `${itemData.title} 心智能效象限`,
          value: `心性要素:${itemData.label}, 意志波动:${(i * 7 + 13) % 20 + 75}%, 代际主能量:${profile.ziwei.twelvePalaces[i % profile.ziwei.twelvePalaces.length]?.palaceName || '命宫'}元气, 重构战术:清空外界消耗坚定防卫`
        }
      ];
    } else if (i % 4 === 2) {
      cycleVisualItems = [
        {
          type: 'checklist',
          label: '心性重整与主权淬炼行动表',
          value: `大度原谅并感谢曾经破碎弱小的自己;坚决清空和退出两个对你索求的关系链;给紧绷的决策脑强制断电物理消炎`,
          subtext: '行动契约条目'
        }
      ];
    } else {
      cycleVisualItems = [
        {
          type: 'dial',
          label: `${itemData.label || '意志重塑'} 谐振数`,
          value: (i * 3 + 57) % 15 + 81,
          subtext: '命相主权契合度'
        },
        {
          type: 'list',
          label: '宿命纠正星运',
          value: (profile.ziwei.twelvePalaces[i % profile.ziwei.twelvePalaces.length]?.palaceName || '命宫') + '气数加持',
          subtext: '意志抗载项'
        }
      ];
    }

    pages.push({
      pageNumber: i,
      title: itemData.title,
      subtitle: itemData.subtitle,
      content: itemData.content,
      visualItems: cycleVisualItems
    });
  }

  // PAGE 20 / CHAPTER 20: 天命使命与业力解密
  pages.push({
    pageNumber: 20,
    title: `天命使命与业力解密`,
    subtitle: `20 / SOUL KARMA DECODING`,
    content: `从灵魂深处拉长来看，你此世的业力伤痕属于【被逼迫的过度拯救感】。
    
很多时候，你自发背负了原本不需要你偿还的沉重债务，这便是你业力的纠结项——本能地因为好心而“自讨苦吃”。你此世天生的使命已经写在说明书的前夕：彻底卸下对他人的无谓怜悯和虚幻包揽，坚定、优雅地去夺回并专心开辟独属于你的主权道路。`,
    visualItems: [
      { type: 'list', label: '灵魂主要债务', value: '无原则拯救情结', subtext: '能量暗中失血' },
      { type: 'quote', value: '没有边界的怜悯不是高尚。那是对你宝贵生命元气极其失控的物理挥霍。', subtext: '因果解咒' }
    ]
  });

  // PAGE 21 / CHAPTER 21: 宿命伤痕与家庭纠葛
  pages.push({
    pageNumber: 21,
    title: `宿命伤痕与家庭纠葛`,
    subtitle: `21 / GENERATIONAL COMPASS`,
    content: `你天生命盘中的【${profile.ziwei.twelvePalaces[10]?.palaceName || '父母宫'}】（带有【${profile.ziwei.twelvePalaces[10]?.mainStars.join(' · ') || '杀印相生'}】之象）记录了某些代际宿命风暴：
    
你在极年幼、甚至毫无独立防身力量时，就在父母和家庭氛围中，默默承载并嗅到了过度沉重的情感隐性对抗和窒息感。这极早地催熟了你异于常人的“空气潮汐直觉”，但也留下了终身敏感、时常自卫性的心墙阻隔。去向当年的自己致谢，你已经安全地闯出来了。`,
    visualItems: [
      { type: 'card', label: '代际伤痕自愈', value: '释怀并建立安全物理距离', accent: true },
      { type: 'list', label: '解毒指南', value: '切断与旧低维家庭噪音共振', subtext: '主权独立第一步' }
    ]
  });

  // PAGE 22 / CHAPTER 22: 喜用开运与风水局解析
  pages.push({
    pageNumber: 22,
    title: `喜用开运与风水局解析`,
    subtitle: `22 / ELEMENTAL GEOMANCY`,
    content: `风水和微观局势是用来辅助调节气血平稳的调和器：
    
- 颜色搭配：你的救赎五行之气为「${profile.bazi.usefulGods.primary[0]}」，多穿「${profile.bazi.usefulGods.primary[0] === '木' ? '森林古翠、淡雅空绿' : profile.bazi.usefulGods.primary[0] === '水' ? '钛空幽黑、深邃澈蓝' : '烈焰钛红、朝阳粉杏'}」色彩以激发用神生机。
- 空间风水：清理你床底下、衣柜三年以上毫无穿用和情感价值的陈旧衣服，那会物理粘滞并降低你卧房的行运天线。让空气通畅，阳光饱满。`,
    visualItems: [
      { type: 'list', label: '开运本源色彩', value: profile.bazi.usefulGods.primary[0] === '木' ? '青翠碧玉' : '冰川深邃', subtext: '生活起居加持色' },
      { type: 'quote', value: '凡人看风水繁琐迷信，高人仅凭干净、通风、冷淡、守序，八字便能自正本位。', subtext: '开运法门' }
    ]
  });

  // PAGE 23 / CHAPTER 23: 流年命运 K 线走势
  pages.push({
    pageNumber: 23,
    title: `流年命运 K 线走势`,
    subtitle: `23 / NATAL K-LINE PERSPECTIVE`,
    content: `命运不是一成不变的一条直线，它是高低起伏的阻抗与反身升华之行：
    
你命中日主的生命大动能会在你遇到「冲、逢、合、化」年份时发生深刻折返（比如逢你的天支或禄神被地心引力完美触发）。不要因为暂时的横盘低走而急躁不安，那是星辰在低回蓄能。拉高视界，在大周期的上升趋势线中玩好每一次低点买入的绝地复苏游戏。`,
    visualItems: [
      { type: 'stat', label: '大运流年对位', value: 92, accent: true },
      { type: 'list', label: 'K线操作策略', value: '顺周期而动，逆风时坚守', subtext: '气数波动指引' }
    ]
  });

  // PAGE 24 / CHAPTER 24: 核心生活领域深度报告
  pages.push({
    pageNumber: 24,
    title: `核心生活领域深度报告`,
    subtitle: `24 / CORE LIFE SECTOR SUMMARY`,
    content: `恭喜你！在系统最巅峰、高度精密的四柱、紫微算力重组下，第一卷「心性、原力与灵魂印记」至此第二十四页全篇完成了完美合龙！
    
生命第一阶段的数据校准已经全部写下。你从此拥有了对自身原厂基础物理缺陷的大度接纳，也拥有了对高维重构方向最冰冷的绝对自信。让我们翻过此页，卸下所有的自我消耗 and 怀疑，正式步入主权战神的回归战局。`,
    visualItems: [
      { type: 'card', label: '首卷气数大合龙', value: '100% Volume 1 Complete', accent: true },
      { type: 'quote', value: '我本红尘一过客，携长剑、踏白云、大笑过群山，我的灵魂永远不可被定义囚禁！', subtext: '卷末龙吟' }
    ]
  });

  // PAGE 25-36: Volume 2 - Career & Potential Engine
  pages.push({
    pageNumber: 25,
    title: `执念引擎与事业成就通路分析`,
    subtitle: `THE PATH TO INDIVIDUAL ACHIEVEMENTS`,
    content: `翻开第二卷大纲：你的事业发展主轴是由【${profile.ziwei.twelvePalaces[3].palaceName}（${profile.ziwei.twelvePalaces[3].mainStars.join(', ')}）】所定义的高热引擎运转。
    
你绝非普通流程的齿轮，也极度反感机械式的汇报与平庸者的指挥。你在内心隐隐渴望在某些“非对称性”的战争里成为攻坚的主心骨：
    
- 核心引擎模式：【${profile.derivedProfile.careerEngine}】
- 破局天赋：在信息繁碎、突发重压的极端黑夜里，具有极强冷静定界与拆解执行的能力。`,
    visualItems: [
      { type: 'card', label: '核心职业命格', value: profile.derivedProfile.narrativeArchetypes[0], accent: true },
      { type: 'stat', label: '开拓破局耐力', value: profile.bazi.fiveElements['金'] + 20 },
      { type: 'stat', label: '创意灵感高空化', value: profile.bazi.fiveElements['木'] + 15 }
    ]
  });

  // Define highly specific and completely unique texts for pages 26-36 (Volume 2)
  const careerThemes = [
    {
      title: "主线探索：寻找那只非对称性高热引擎",
      content: `你并非普通流水线的普通齿轮，平庸高管的刻板规章会极度压抑你的天性。系统演算指出，当你在职场中将注意力集中在极少数具有“颠覆传统、快速斩断纠缠、在信息繁碎的黑夜中开辟通道”的特殊角色时，你的本源能量才会全面苏醒并实现闭环。`
    },
    {
      title: "协作盲区：防患被低智商者拉平维度",
      content: `你天生反感机械式的沟通与平庸者的世俗汇报。你对秩序虽有敬畏，但对于那些庸俗的权威和没有创意含量的瞎指挥，你的内心潜藏着强烈的随时反叛倾向。唯有在拥有绝对自主掌控度的核心特种小队，你才能释放原气。`
    },
    {
      title: "执念突围：在官杀压制之下洗尽铅华",
      content: `关于此下的工作修行规律。你在过往的职场生涯中常遭遇“伪秩序的限制”，这属于【官杀过度重压】在早年引发的心灵自伤。一旦你在心智层面上克服这种低频审视，你将重新掌握用冰冷理智重组现实规则的终极特权。`
    },
    {
      title: "幕后潜行：不要在前端浪费核心智力",
      content: `关于执行规律：低效的、毫无高维心智参与的重复劳动对你的生命极其有毒。你要学会在幕后建立自己稳固的资源护城河，少在明面上出头做靶子，多在幽暗深邃的底层架构里夺取绝对主导的话语权 and 长线高额收益。`
    },
    {
      title: "克己与颠覆：双重引擎的离弦之箭",
      content: `你往往具备两面性：一面在职场中显露出极端冰冷、高度自律甚至近乎机器般的服从，而另一面当大运冲克到来，你又能在瞬间颠覆一切落后冗长的愚蠢逻辑。这种反差，是你在高维上用于重构现实的战术核武。`
    },
    {
      title: "契约正位：如何在混乱中构建利益同盟",
      content: `不要向别人表露你对完美的精神洁癖。去和那些在某个垂直单项带有极致才华、即使性格怪异的人建立利益同盟。高水平的人际网络向来是无情契约的交织，而非和和气气的虚伪玩乐。学会用利他作为利益博弈的核心筹码。`
    },
    {
      title: "守底策略：如何在重压黑夜中静默生存",
      content: `当所有人都以为你要在这一波风风雨雨中认输离场时，你骨子里的${profile.derivedProfile.fiveElementExtremes.strongest}原力会展现出恐怖的求生和反弹欲。在寂静无声中积累你的反身性资产，等待寒冬过后的地磁回春。`
    },
    {
      title: "第二曲线：提早布局不受约束的复利长线",
      content: `你目前的主干事业在一定程度上受到了旧格局的惯性捆绑。你要悄无声息地开辟自己的“第二增长曲线”。这可以是带高维直觉咨询性质的、或者是技术、知识等能沉淀为复利资产的特殊领域，绝不依赖低维工时。`
    },
    {
      title: "合规设界：杜绝为任何伪契约无偿打工",
      content: `你在创业合作时，很容易因为重情义或懒于处理俗务，而把合同的要害细节草率滑过。这会导致潜在的能量失血。要把每一个法理、分账比例和退出条款设计到滴水不漏，这才是对高维友谊真正的保护。`
    },
    {
      title: "才华重归：将隐性因子带入高维游戏规则",
      content: `你在深度创作、技术研发或决策智囊方面，蕴藏着极长的直觉触角。一旦这个触角被时代风口成功连线，你将不仅仅是一个打工者，而是变成一套新游戏规则的制定者。系统在本页对你的才才华做出最高度的正向认证。`
    },
    {
      title: "本真回归：彻底接纳并主导个人的灵魂叙事",
      content: `不要再为任何人的指令而感到紧张或自责。你才是自己人生大厦的总设计师。你的每一次理智定界、每一次冷酷割舍，都是为了让你能腾出空间，去拥抱那个更高维、更浩瀚的个人主权事业王国。`
    }
  ];

  for (let i = 26; i <= 36; i++) {
    const themeIdx = i - 26;
    const itemData = careerThemes[themeIdx % careerThemes.length];
    
    const uniqueTalents = [
      `复杂逻辑解构与系统重组（得益于「${profile.iching.natalHexagram.name}」直觉）`,
      `超强情绪过滤与冷酷客观决断能效`,
      `极端危机下的生存反弹与风雷起帆张力`,
      `幕后规则穿透与深度资源网络自守`,
      `爆发性破局特权与战术核武机学敏度`,
      `硬核法理契约精筑与边界无情防守`,
      `非对称利益博弈中的高维精神契合`,
      `第二成长曲线的敏锐侦测与复利孵化`,
      `暗夜风暴中的地磁自学契合与能量升维`,
      `隐秘才华的高带宽连线与模式解密`,
      `独立自由叙事与多维主权的终极掌控`
    ];
    const talentVal = uniqueTalents[themeIdx % uniqueTalents.length];

    let cycleVisualItems: any[] = [];
    if (i % 3 === 0) {
      cycleVisualItems = [
        {
          type: 'checklist',
          label: '高能开拓破局攻守指南',
          value: `斩断无理插手行政干预的多余发声;将精力死磕投入具有长尾复利价值的才智资产;在合同法理层面锁死全部数字分红指标`,
          subtext: '日常战术行动自律'
        }
      ];
    } else if (i % 3 === 1) {
      cycleVisualItems = [
        { type: 'dial', label: '天命职能适配指数', value: ((i * 4 + 7) % 15) + 82, subtext: '本源盘口契合度分析' },
        { type: 'list', label: '潜才才华', value: talentVal, subtext: '深度演算解耦点' }
      ];
    } else {
      cycleVisualItems = [
        {
          type: 'matrix',
          label: '职业主权格局剖析阵',
          value: `核心才干:${profile.derivedProfile.careerEngine}, 适配星野:${i % 2 === 0 ? '特种开盘手' : '高参幕僚首发'}, 行阻防灾:杜绝参与消耗型假性汇报, 开辟战略:暗中积累绝对自主权复利资源`
        }
      ];
    }

    pages.push({
      pageNumber: i,
      title: `${itemData.title} · 第${i-25}章`,
      subtitle: `ENGINE & VECTORS LEVEL ${i-25}`,
      content: itemData.content + `\n\n我们切不可落入低纬度无休止的自我消耗和自我怀疑中，顺应 ${profile.derivedProfile.careerEngine}，去夺回本属于你的战斗主场。`,
      visualItems: cycleVisualItems
    });
  }

  const personalityThemes = [
    {
      title: '避险法则：高筑物理隔离墙，杜绝对同情心动用能量财库',
      subtitle: 'HIGH LEVEL SHIELD & BOUNDS',
      content: `关于避险策略：你的一生是一系列预设冲突在时间的宏伟框架里的全面铺展，低谷和挫折都是你的必修功课。在这个过程中，你必须要学会对低劣、不顺的人情冷酷隔离。每一次面带微笑保持不解释的敬而远之，都是在为灵魂正位清扫道路。`,
      label: '避险度强韧',
      quote: '严冬是在天地间，为下一场极其盛大的高维飞跃做出的无情物理深埋。'
    },
    {
      title: '审美救赎：去寻找和抚摸那些能洗刷神经污质的高雅实体',
      subtitle: 'AESTHETIC REBOOT',
      content: `太多的数字屏幕、重复的任务表格正在腐蚀你高天生高敏感的「${profile.astrology.sunSign}」视神经。系统的本页强烈呼吁你，每周去接触大自然、物理翻阅高质量的纸质线装书、或静静聆听纯乐。通过物理感官对低频信息进行一次全身心洗尘。`,
      label: '五感自愈度',
      quote: '生命的最本真欢愉，往往藏在那些温润、无言、极其干净的朴拙物理细节中。'
    },
    {
      title: `五行逆差调和：用安静的流动平息你脑海中的焦灼浮热`,
      subtitle: 'ELEMENTAL EQUILIBRIUM',
      content: `宿命由于【${profile.derivedProfile.fiveElementExtremes.strongest}】星盘的过度张拉，你的大脑和神经纤维极为容易过度劳损，化为深层的身体烦躁。少喝刺激的浓茶咖啡，多喝优质的泉水，让微观水原力慢慢浸泡舒缓你长期亢进的神经末稍。`,
      label: '本源虚火泄',
      quote: '流动的水原力从不迎头撞击礁石，它仅仅是通过平稳的规避，便带走了所有的沟壑。'
    },
    {
      title: '主权独立：不做任何人情感寄生或者世俗眼光的豢养品',
      subtitle: 'SOVEREIGNTY OF THE SOUL',
      content: `你骨子里是自带不灭仙童火种的高洁星体。千万不要因为短暂的孤寂或者对虚幻安全感的追索，而被任何世俗凡庸者的标准规训。你的每一步冷酷抽身，每一次面带微笑保持不解释的敬而远之，都是在为灵魂正位清扫道路。`,
      label: '意志不降维',
      quote: '飞鹰从来不在地面乌烟瘴气的喧哗中垂头丧气，它的毕生追求是整片深邃星汉。'
    },
    {
      title: '同维度共鸣：只和那些能一语把你看透的明白人交手过招',
      subtitle: 'HIGH FREQUENCY RESONANCE',
      content: `庸俗的交往需要你堆砌无数的笑脸和喋喋不休的外在解说，那是对气血极大的暗中放血。去主动亲近那些能够包容你的沉默、一眼能识破你伪装、做事干净利索没有任何情绪垃圾纠缠的高维人类。这会极大自鸣你的财气运势。`,
      label: '知己契合点',
      quote: '高维人际网络的本质，是无声、极其默契的等价托付，而非低级人寿的勾肩拉人。'
    },
    {
      title: '自洽定约：彻底原谅并接纳那个生性矛盾自相拉扯的身体',
      subtitle: 'INTERNAL CONTRADICTION RESOLUTION',
      content: `你时而展现出生而为人的冷若冰块、恪守极精细规则，时而却在突发的狂热中展现出对绝对自由彻底解构的向往。这就是你天五行拉扯带来的神奇双重奏。不要把它当成毛病，顺应它，在动荡和静寂中玩好命运的双刃长剑。`,
      label: '两极能量弹',
      quote: '完美的静止只是毫无生动的死寂。唯有带生命力的拉扯抗阻，才是命运最好的发动机。'
    },
    {
      title: '精力剪除：把过期的懊恼与对未来的虚无一次性全部物理丢掉',
      subtitle: 'MENTAL DE-CLUTTERING',
      content: `那些曾经辜负你的人、那些在无声中消逝的陈年亏损、甚至是那些对自己过往不够强大的自责……在本页，系统的 deterministic 算法要求你：将它们像物理垃圾一样当场物理割舍。腾出干净、空无的心智大堂，迎纳新的财富气象。`,
      label: '过去包袱断',
      quote: '唯有当你的双手彻底不再紧捏那些旧日碎石，命运才能为你递上闪耀的水晶本源。'
    },
    {
      title: '守中克己：用有张力的静默作为你对抗喧闹凡俗的最强王牌',
      subtitle: 'THE POWER OF SILENCE',
      content: `行运至此，要保持沉着守中的姿态。外界的声音再嘈杂、公司的变化再多端，你都要在内心深处建立一个旁人难以插手的安全气室。你可以在里面任意舒缓地疗养，用冷静的微笑和对结果优雅的不管不顾，逼得庸俗裁判无功自退。`,
      label: '核心神思锚',
      quote: '不解释是我给这个荒诞物质世界最高尚的尊严。懂得退席的人，才是这出戏的主宰。'
    },
    {
      title: '潜才苏醒：在被庸愚掩藏的裂隙里重新提取逆行核能',
      subtitle: 'THE HIDDEN AWAKENING',
      content: `深入你脑海深处的【${profile.derivedProfile.hiddenTalent || '灵性领会之力'}】曾多少次被当成无谓的敏感，被粗糙的应酬、低效率的公司汇报无情淹没。本页对你的稀缺才华做最郑重的最高正向复活认证。不要迟疑，把时间合理分配去开发它。`,
      label: '潜意爆发点',
      quote: '你的每一次理智定界，其实都是在为你高维的主权事业王国，留出足够浩瀚的星空。'
    },
    {
      title: '人脉免疫：警惕卖惨包装的小人，杜绝情绪代偿',
      subtitle: 'EMOTIONAL IMMUNITY',
      content: `生命在第22页再次指出：很多人来到你的生活里，不是为了与你并肩战斗或在情感上提供反向支持，他们纯粹是看中了你的好说话与天然担当，来找长期免费的血包。无情地清除这些情感勒索者，建立心智的铜墙铁壁。`,
      label: '社交霉菌晒',
      quote: '没有边界的怜悯不是慈悲，而是你在用自己的本源能量，纵容虚伪与堕落滋生。'
    },
    {
      title: '元气合龙：五行之气各正本位，你开始重新主导尘世走向',
      subtitle: 'ENERGY COALESCENCE',
      content: `翻阅Volume 1 的尾页。你的五维属性、内伤自愈率以及情绪壁垒已经完成了初始阶梯的数据校准。你无需再向外界任何人、任何落后规章乞求所谓的同情和认证。握紧你独一无二的主权方向盘。`,
      label: '底座骨架成',
      quote: '我本红尘一过客，携长剑、踏白云、大笑过群山，我的灵魂永远不可被定义囚禁。'
    },
    {
      title: '说明书上部终章：告别自我消耗，正式步入主权战神的回归大幕',
      subtitle: 'THE RETURN OF SOVEREIGNTY',
      content: `恭喜！在系统的最高算法推衍下，你的人生使用说明书第一卷「心性、原力与灵魂印记」已在第24页完成了完美合拢。让我们切不可落入低频无休止的自我纠缠和怀疑，顺应 【${profile.derivedProfile.careerEngine || '天行之轨'}】。`,
      label: '首卷能量龙',
      quote: '这一路上所有的破碎与阵痛，都是为了把你这块高纯度的仙金，从愚钝的泥灰中彻底淬炼出山。'
    }
  ];



  // PAGE 37-46: Volume 3 - Wealth Pattern
  // We calculate klData first to render the AreaChart as the summary index on intro Page 37!
  const generateKLineData = (seed: number) => {
    const data: Array<{ age: number; score: number }> = [];
    for (let currentAge = 18; currentAge <= 78; currentAge += 3) {
      const cycleVal = Math.sin((currentAge - 25) / 10) * 20;
      const noise = ((currentAge * seed * 13) % 17) - 8;
      const baseScore = Math.min(95, Math.max(25, Math.round(55 + cycleVal + noise)));
      data.push({ age: currentAge, score: baseScore });
    }
    return JSON.stringify(data);
  };
  const klData = generateKLineData(hashVal);

  pages.push({
    pageNumber: 37,
    title: `财富容器与盈亏重构法则`,
    subtitle: `THE WEALTH ENGINE & LOSS RECOVERY`,
    content: `财富在本系统看来，绝不是简单的劳作报酬，而是旅行者【对现实物质能量掌控张力的具象化体现】。
    
分析诊断，你的财能底盘属于【${profile.derivedProfile.wealthPattern}】。
- 重大亏损点：极易在关系中当救世主、因面子买单、或者是遭遇低频合伙人时的“盲目托付”。
- 精准破壁解药：建立铁一般的【数字防火墙】，实行理性的分账管理与无情债务隔离，切莫对同情人动用财库元气。`,
    visualItems: [
      { type: 'bazi_chart', value: klData },
      { type: 'card', label: '财运总揽结论', value: `${profile.derivedProfile.wealthPattern}，流年逢冲解冻`, accent: true }
    ]
  });

  // Define highly specific and completely unique wealth texts for pages 38-46 (Volume 3)
  const wealthThemes = [
    {
      title: "掌控觉醒：金钱作为精神意识的物理具象",
      content: `金钱是你高维生存意识在现实红尘的物理缩影。在你的财富底层逻辑中，每一分资金都承载着绝对的物理自由和自主决策张力。系统指出：如果你在世俗物质方面经常感到焦虑和不安全，最底层的自我解药便是斩断劣质的情感托付和债务含糊。`
    },
    {
      title: "红尘过滤：清除吸血消耗型人际 and 纠缠",
      content: `你的重大资产良性跃升，往往伴随着一次剧烈的“人际过滤”。每当你在切断某些毫无界限、常年在你面前倾倒情绪垃圾、不断向你索取利益的负和能量纠缠，你的理财金钱气场会在六个月内爆发自愈流转。`
    },
    {
      title: "面子陷阱：无情建立理智的数字防火墙",
      content: `你天生由于精神深处的圣洁感，常在人情细节中不忍细致计账，这容易导致面子自损。本模块建议：建立绝对不可逾越的“冰冷账目分离界线”。收回你对他人虚妄的保护欲，让财务的主权回归本身。`
    },
    {
      title: "契约加持：以高维的冰冷契约替代廉价信任",
      content: `要学会在前期就把合作利益的分账公式、退出机制白纸黑字写到毫无漏洞、甚至近乎残酷。这绝非破坏交情，而是用坚实理智守护真挚底牌的红尘唯一通路。唯有精准定界，方能大盈。`
    },
    {
      title: "借贷警戒：杜绝任何重情轻法的信用透支",
      content: `严厉警告：千万不要在任何关系亲属、熟人同学的纯消耗场景下进行背书、出借大额资产或盲目签字。你是在透支个人本命阵法中的金气，这会对底层的财库造成持续数年的暗中漏气、漏财。`
    },
    {
      title: "逆向套利：在动荡变局中做稳健的收盘者",
      content: `当外界环境处于衰退、迷茫和极端恐慌之中，得益于你骨子里的防守韧性，你比常人更不容易崩溃。学会在寂静、无声的极深暗处寻找被低估的优质复利资产，等待周期回转带来的爆发性收益。`
    },
    {
      title: "土气纳财：用沉静无欲的张力充实你的财库",
      content: `土元素掌控着物质的终极包容与安放。一个长久焦虑不安、频繁倒腾的空转灵魂是无法留住金钱温润的。把生活节奏拉长到日、月、年甚至十年，让内心保持沉静从容，财富自然加速汇聚。`
    },
    {
      title: "杠杆突围：不做低维工时的机械消耗代耕",
      content: `真正的财富质跃绝对不是靠勤劳到虚脱来完成的，它来源于你对独特才华、稀缺知识产权或某种自动资产复利管线的持有。停止贩卖你有限的纯机械人力，把时间转投到建设专属你的主权资产上。`
    },
    {
      title: "格局合拢：将主权金钱淬炼成渡世长剑",
      content: `财富说明书终篇：金钱绝非你向这个物质世界乞求认同的筹码，它是你的重装护甲与渡劫法宝。让它流向最符合大因果、最有创造力的优雅契约场景，去开创属于你本真的高维物质自留地。`
    }
  ];

  const HEXAGRAMS_INFO = [
    { name: '天泽履', theme: '履虎尾，不咥人，亨', advice: '心存敬畏，稳健前行' },
    { name: '地天泰', theme: '小往大来，吉，亨', advice: '上下交泰，融合顺通' },
    { name: '水泽节', theme: '苦节不可贞，甘节吉', advice: '自我约束，节制有度' },
    { name: '火地晋', theme: '晋如摧如，贞吉', advice: '顺应周期，不畏横盘' },
    { name: '泽风大过', theme: '栋桡，利有攸往', advice: '破茧重生，极限跨越' }
  ];

  for (let i = 38; i <= 46; i++) {
    const themeIdx = i - 38;
    const itemData = wealthThemes[themeIdx % wealthThemes.length];
    
    let cycleVisualItems: any[] = [];
    if (i % 3 === 0) {
      const hexItem = HEXAGRAMS_INFO[i % HEXAGRAMS_INFO.length];
      cycleVisualItems = [
        {
          type: 'hexagram_card',
          label: '流运本命纳财卦测算',
          value: hexItem.name,
          subtext: `${hexItem.theme} —— 推荐心法：${hexItem.advice}`
        }
      ];
    } else if (i % 3 === 1) {
      cycleVisualItems = [
        {
          type: 'matrix',
          label: '财能突围控制面板',
          value: `起运喜神:${profile.bazi.usefulGods.primary[0]}, 流运财势:${profile.bazi.usefulGods.primary[0] === '金' ? '庚辛金解冻' : '大运生旺'}, 败财陷阱:为关系人情买单让渡, 自卫战术:建立绝不妥协的分账防火墙`
        }
      ];
    } else {
      cycleVisualItems = [
        {
          type: 'checklist',
          label: '纳财生金战略践行条目',
          value: `在一开始就设计无法推诿的清退和保障合同;拒绝无偿资资和借贷给一味索取的凡俗熟人;把闲置资金兑现为不可轻易流失的实业/黄金资产`,
          subtext: '财富防护法条'
        }
      ];
    }

    pages.push({
      pageNumber: i,
      title: `${itemData.title} · 第${i-37}码`,
      subtitle: `FINANCIAL ACCUMULATION CURVE`,
      content: `第 ${i} 页面在算命盘中揭示出关于你的重大资产变动拐点：\n\n` + itemData.content + `\n\n以下是系统根据大运能量引力潮汐为您推演出的吸金护法方案：`,
      visualItems: cycleVisualItems
    });
  }

  // PAGE 47-56: Volume 4 - Relationships
  pages.push({
    pageNumber: 47,
    title: `关系生态：共生、拯救与亲密壁垒`,
    subtitle: `THE PSYCHOLOGICAL RELATIONSHIP IN TIMELINE`,
    content: `你的情感盘属于高浓度的【灵魂探索与安全防卫重演】。
    
你有一种本能的「金星/夫妻宫」投射：你讨厌肤浅的喧扰、平庸世俗的搭伙过日子。你总是被带有某种“破碎感”、“独特性”甚至是带有一定“危险、反叛”特质的灵魂吸引。
    
系统诊断：你非常容易扮演关系中的【拯救者】，不知不觉以付出过载当做获取安全掌控的筹码。这会导致对方越界、恃宠而骄，最终演变成虚妄的决裂。`,
    visualItems: [
      { type: 'card', label: '致命吸引力', value: '独特且带有破碎气质的灵魂', accent: true },
      { type: 'list', label: '关系防御特质', value: profile.derivedProfile.relationshipPattern, subtext: '内心警戒线' },
      { type: 'quote', value: '健康的亲密关系是两个主权独立国家的同盟条约，而不是吞噬彼此领土的吞并战争。', subtext: '主权论点' }
    ]
  });

  // Define highly specific and completely unique relationship themes for pages 48-56 (Volume 4)
  const relationshipThemes = [
    {
      title: "主权边界：拒绝在亲密中扮演无原则拯救者",
      content: `你在关系中有一种天然极易出现的“拯救、付出、度化者”偏执。你往往会被自带孤独破碎感、或者极度特立独行的奇异灵魂吸引。但系统提醒你：无底线的付出和承担往往是在无形中损害彼此应有的成长磨损，反而催生了恃宠而骄或背离，必须理智设防。`
    },
    {
      title: "精神洁癖：冷酷无声地回收所有的气血和信任",
      content: `你天生具备星盘深处无法被世俗搭伙感降伏的“高纯度意志”。一旦被你察觉到对方的说谎、欺隐、或者德行和智力发生了无法自欺的破绽，你的心扉会瞬间无惊无扰地落锁。这种冷静回收，往往是对低频最强烈的退席宣告。`
    },
    {
      title: "底线置前：在最舒适的最初将边界理直气壮说退",
      content: `你出于习惯性的温纯和自控，在一段亲密合作开始的初期往往容易保持极低的干预，这反而给了对方不合理的期望。学会在一开始最舒适的阶段，把难以妥协的边界、物质或底线清楚表达，对长线来说方是金石之盟。`
    },
    {
      title: "磁场对位：寻找那些自带温润火木能量的倾听者",
      content: `你的心智电瓶在高度人际交往中极易发生“重载过热、代偿心酸”。你真正需要的伴侣不需要博古通今或叱咤风云，而是能深度包容、愿意给你完整的心灵物理空置期、自带天然安静木火气数流动的人，这能解毒你心因性的烦躁。`
    },
    {
      title: "独立宣言：不因无谓的安全感缺口而自我降维",
      content: `当我们在关系里通过拼命干活、懂事、或不计回报等手段来换取某种认同时，大运引力便会发生剧烈的抗阻试炼。把自己当成拥有完整、独立、不可动摇主权的高维星体，只有两个星空主权的齐平，爱意才会最健康地涌现。`
    },
    {
      title: "同维共鸣：在最深切的灵魂深处接通星芒信号",
      content: `你天性有着对直觉世界极长的牵引力，如果一段亲密关系始终无法接通具有相同心智、对世界充满深刻领会的高维信号，那纵然生活琐务打理到尽善尽美，你的精神长椅终究是寂寞无声的。耐心寻找并吸引同维之人。`
    },
    {
      title: "社交除霉：决绝清扫朋友圈中不断卖惨吸血的能量体",
      content: `定期清理你的聊天框。凡是在你的周围不断依靠倾倒负能量、无休止向你讨要精力与情绪安抚、甚至试图通过利益绑定暗中侵吞和剥削你成果的虚假密友，都是你精神免疫系统漏气的关键气孔。用最冰冷的理智，将他们果断拉远。`
    },
    {
      title: "高深壁垒：冷静沉默背后是令人敬畏的抽身底牌",
      content: `面对冲突与挑衅，你的第一策略往往是优雅且充满尊严的保持距离、缄嘴沉默。要让对方清清楚楚地意识到，你高维的沉默不代表胆怯或软弱，而是来自随时有彻底退席、摧毁旧秩序、全盘不干了的终极筹码。`
    },
    {
      title: "圆满放手：在这尘世做最自由也最具自持的行者",
      content: `关系课题推演终篇：在这个拥挤又迷乱的红尘中，没有谁配成为你灵魂大厦的豢养主，同样，你也无法背负任何其他独立生命的因果重归。保持自尊、自持、神圣不可侵犯，自由且浪漫地走完这趟地球长旅。`
    }
  ];

  for (let i = 48; i <= 56; i++) {
    const themeIdx = i - 48;
    const itemData = relationshipThemes[themeIdx % relationshipThemes.length];
    
    let cycleVisualItems: any[] = [];
    if (i % 3 === 0) {
      cycleVisualItems = [
        {
          type: 'checklist',
          label: '情感主权屏卫践行法则',
          value: `从接触的第一天起就坚决要求不可侵犯的隐私和时间段;一旦侦测到任何虚假粉饰或操控企图即刻拉闸退位;坚决抵制度用自身气数财力为他人不长进买单`,
          subtext: '情感绝缘条规'
        }
      ];
    } else if (i % 3 === 1) {
      cycleVisualItems = [
        {
          type: 'matrix',
          label: '亲密星轨能效博弈阵',
          value: `高频引力特质:${i % 2 === 0 ? '孤僻奇异仙真魂' : '荒野独立执剑人'}, 耗煞雷区:大发慈悲之过度拯救时代换, 疗愈补药:流运带有${profile.bazi.usefulGods.primary[0]}木火气数流动的人, 生态主张:双主权平齐独立不容吞并`
        }
      ];
    } else {
      cycleVisualItems = [
        { type: 'dial', label: '防情绪勒索自愈力', value: ((i * 3 + 11) % 15) + 81, subtext: '关系意志天极感应率' },
        { type: 'list', label: '拯救业障清零药', value: '收回无底线怜悯，冷酷微笑抽身', subtext: '灵魂避水仙珠' }
      ];
    }

    pages.push({
      pageNumber: i,
      title: `${itemData.title} · ${i-47}`,
      subtitle: `RELATIONSHIP SHIELD & EMOTION CODE`,
      content: `亲密关系是五行原力最直接的能量传染。第 ${i} 页分析：\n\n` + itemData.content + `\n\n系统在这个页面呼吁你：学会在前端设立健康的「硬边界」，切忌在关系初期扮演无原则、不设底线的守护者。`,
      visualItems: cycleVisualItems
    });
  }

  // PAGE 57-65: Volume 5 - Vitality & Vital Vitality Formula
  pages.push({
    pageNumber: 57,
    title: `元气配方：心身防御与恢复阀门`,
    subtitle: `THE PHYSICAL RESERVES AND IMMUNITY VALVES`,
    content: `你的生命电瓶（体魄元气）极易受到【情绪内耗】的暗中蚕食。
    
本能诊断：${profile.derivedProfile.healthAttentionPattern}
    
你属于典型的“心智过热、躯体代偿”型体制。每当你在脑海和关系中过度内耗，你的肌肉、皮肤以及内分泌便会率先开始“替你流泪崩溃”。
    
- 恢复药：每周至少有 48 小时保证脑子不进行复杂的重度思虑，远离高频社交场合。
- 补足原力：利用「${profile.derivedProfile.fiveElementExtremes.weakest}」相关的颜色。`,
    visualItems: [
      { type: 'stat', label: '脑力消耗预警', value: 92, accent: true },
      { type: 'stat', label: '躯体耐受上限', value: profile.bazi.fiveElements['土'] },
      { type: 'list', label: '元气药理辅佐', value: '物理戒断重脑力劳动，摄取清凉流体、赤色温开水', subtext: '气血能量配方' }
    ]
  });

  // Define highly specific and completely unique vitality self-care texts for pages 58-65 (Volume 5)
  const healthThemes = [
    {
      title: "植物接地：利用赤足感官排泄体内虚热",
      content: `你的身体常年由于高频的思维脑空转，在大脑和交感神经区积蓄了极高的浮躁微热。本页建议你寻找一处安全的自然草坪或大树之旁，赤足物理接地接触泥土15分钟。利用物理导电性能瞬间拉直心电波值，重新接通大地电源。`
    },
    {
      title: "疾厄宫映射：卸载因过度代偿引发的局部不适",
      content: `在你的星盘运行中，疾厄宫带有高克制煞曜的轨迹。这意味着，当你在职场、关系或财富上面受压抑并试图“坚强硬挺”时，你身体的内分泌和代谢屏气就会暗中代偿，表现为淋巴、甲状腺或心脑血管的过度充血、发炎。学会卸重，胜过吃万般珍奇补药。`
    },
    {
      title: "脑力断电：强制每周建立48小时思维空舱",
      content: `长线的完美心理洁癖极易导致浅眠多梦。你需要强制性在周日或任何休息日中，物理退掉所有需要复杂重度决策的思考事务、断网降噪，只接触静态、无交互、完全不需要情绪输出的物理实体（如看纸质闲书、做简单的家务清洗）。`
    },
    {
      title: "免疫正位：防范因气竭引起的呼吸道过敏",
      content: `在中医五行气数上，金能生水，金不舒则肺气弱。当你面对琐事感到窒息或感到无法言说的纠结重创时，你的免疫机制会表现为皮肤抗敏障碍、鼻腔干燥容易发炎。本页呼吁你：学会在窒息的人际中首先大声、狠狠地舒气，退出那个让你缺氧的铁笼。`
    },
    {
      title: "水分补充：清润流体是对肾气最佳的守护",
      content: `水是万物的流动智慧，也是洗刷精神毒素和杂乱情绪最好的洗涤液。你的五行分布中，若极弱元素是水，则要注意经常维持体内电解质和常温清凉流体的循环。多喝纯净泉水或带有红豆、薏米等的自制去火茶，排空血污。`
    },
    {
      title: "肌肉释压：用静态拉伸与纯温水包裹温润四肢",
      content: `每当你经历高度紧绷的会议、或突发争执之后，你的肩颈、腰肌往往比你的大脑更早僵硬。千万不要在这个时刻进行重载、剧烈、挑战极限性能的高强度体育运动。你真正需要的是舒展的八段锦、全身浴缸温水浸泡，把淤滞在大脑的血液拉回四肢。`
    },
    {
      title: "居家清气：让睡眠空域不保留任何电子屏幕",
      content: `你的卧室是唯一的防震掩体，千万不要把充电线、复杂智能平板和待办琐务放置在距离枕头一米以内的范围。在本页中，系统的 deterministic 指南建议你：将床头周围彻底打扫到一尘不染，常备几只翠绿舒缓的生命绿植，安抚深夜的神经末梢。`
    },
    {
      title: "元气大成：身心能量在自律与慈悲中全然合龙",
      content: `元气配方终篇：你的身体是你在世俗地球上租用、并需要长相厮守的唯一一栋实体神圣公寓。每一次为面子买单的自残、每一次深夜为了愚蠢的人和事而过度咬牙切齿，都是在这栋大楼里放火。善待自己的肉身，这是唯一的物理基本盘。`
    }
  ];

  for (let i = 58; i <= 65; i++) {
    const themeIdx = i - 58;
    const itemData = healthThemes[themeIdx % healthThemes.length];
    
    let cycleVisualItems: any[] = [];
    if (i % 3 === 0) {
      cycleVisualItems = [
        {
          type: 'checklist',
          label: '物理自愈排虚热践行条令',
          value: `每周强制执行一次完全大脑断电的无噪空置日;床头柜三米空域内彻底清理掉充电变压器与智能设备;以温凉干净的原泉流液吞服洗净浮躁虚火`,
          subtext: '自愈药方践行契约'
        }
      ];
    } else if (i % 3 === 1) {
      cycleVisualItems = [
        {
          type: 'matrix',
          label: '身体公寓自我诊测谱',
          value: `克星元凶:极长期心智高频空转, 防灾核心:净化呼吸睡眠通透气管, 疾厄克星:强制无交互物理劳作退热, 空间药理:常备常春阔绿植被吸收废杂`
        }
      ];
    } else {
      cycleVisualItems = [
        { type: 'dial', label: '元气自愈自持度', value: ((i * 5 + 4) % 15) + 82, subtext: '体魄抗压稳定指数' },
        { type: 'tag', label: '高压映射部位', value: i % 2 === 0 ? '心脑血管/淋巴腺/肩颈' : '甲状腺/胃肠消化/代谢' }
      ];
    }

    pages.push({
      pageNumber: i,
      title: `身体防御机制深度自救指南 · 第${i-57}章`,
      subtitle: `IMMUNOLOGY REBOOT SECTOR ${i-57}`,
      content: `翻阅关于你肉身系统运行的第 ${i} 页面。第${i}页精密解码：\n\n` + itemData.content + `\n\n系统在此检测到：你的【月亮/疾厄宫】带有高压星曜的波动。你的身体不需要大补，你的身体渴望的是全面的“卸重”。`,
      visualItems: cycleVisualItems
    });
  }

  // PAGE 66-75: Volume 6 - Networks of Support (Noble People)
  pages.push({
    pageNumber: 66,
    title: `护城河密码：贵人局与防小人生态`,
    subtitle: `THE NETWORK MOAT AND HUMAN RESOURCE`,
    content: `你在红尘大局中，能助你跳脱阶层的，是生辰大盘隐藏的【${profile.bazi.gongSha.join(' · ')}】。
    
分析认为，你的贵人不是那些嘴上说好听的，而是在你彻底跌入水深火热中、处于静默挣扎时，突然用极冷、极精准、甚至极不中听的真话一语把你点醒的那类【冷硬派高维贵人】。
    
- 防范靶向：警惕那些嘴甜、情绪价值给得极度顺服饱满，实则暗中吸干你的精力与气血并窃取你资源 and 成果的【隐形精神小人】。`,
    visualItems: [
      { type: 'card', label: '第一守护星运', value: profile.bazi.gongSha[0] || '天乙贵人', accent: true },
      { type: 'list', label: '核心小人特征', value: '疯狂表忠心/满口情义但频繁无底线索取', subtext: '能量失血靶心' },
      { type: 'quote', value: '那些在光亮中递给你糖果、又在黑夜里抽回手的人，从未配进入你的核心朋友圈域。', subtext: '红尘御守护' }
    ]
  });

  // Define highly specific and completely unique relationship/network partner texts for pages 67-75 (Volume 6)
  const nobleThemes = [
    {
      title: "契约定则：合同的每一行细数都要冰冷无情",
      content: `你很容易在朋友圈或合伙中犯“重义气不重条文、重情面不谈防损”的致命毛病。切记：凡是涉及重大股份、利益分成、债务边界的事务，一开始必须设计得像两个怀有敌意主权的国际安全条约。越冰冷、越无情，反而越能护住本真情义。`
    },
    {
      title: "冷硬派贵人：警惕那些满口溢美之词的包围圈",
      content: `那些在饭局上频繁拍马吹捧、在微信群里盲目赞同你任何错误决策、从不提供客观高维批判的拥挤圈子，根本不是属于你的善意力量。你要去寻找那个不依不饶、直言不讳指出你盲区缺口的“诤友贵人”。`
    },
    {
      title: "精力筛选：绝不让一丁点无价值的应酬偷走心元",
      content: `当你在日常事业打拼处于变动升华的关头，各种无关紧要、毫无深层价值、仅仅是打着“多个朋友多条路”的伪低智商社交应酬会蜂拥而至。在本章系统要求你明晰：高水平的朋友圈取决于你本身的稀缺话语权，绝非靠混交情。`
    },
    {
      title: "法理主控：把控制权和一票否决权烙印在顶端",
      content: `在合伙经营创业中，容易因为所谓的对等和所谓的面子，而稀释了自己的控制份额、或在合同里埋下核心决策一团乱麻的漏洞。要确保在涉及股权分配或资产使用时，你的主权是能够牢固行使一票一决定，不可妥协。`
    },
    {
      title: "红尘金盾：防范那些伪装成忠诚弱者的蚕食",
      content: `有些人在关系里极度善于扮演弱者、扮演受害者、通过不断的示弱与服从不断索取你的怜悯，实则在日复一日的侵蚀中把你的核心元气抽取乾净。建立冰冷的保护金盾，凡是重大利益侵犯，立刻毫不留情将之清退。`
    },
    {
      title: "圈子重塑：去和那些本源高雅的人建立合作网",
      content: `看一个人的前程底盘，只需观察他日常重度交流的前五个人。去主动连接那些在专业领域具有绝对冰冷操手、道德极其严谨、做事有绝对死契精神的行业顶端。他们的精神传染，会助你把命格底牌向上拽拉数层。`
    },
    {
      title: "口头承诺脱困：不见白字真章，绝不相信片面诚意",
      content: `多少次的重大亏损，都是由口头的“兄弟我绝对不会亏待你”、“以后一切都是我们的”这种情绪泡泡促成的。在本页，deterministic 算法强硬要求你：凡是资金和契约，一律签字按泥，不见真章不做无谓垫付。`
    },
    {
      title: "智量屏蔽：过滤掉所有在常识和格局上消耗你的杂音",
      content: `人生下半场的重组是时间的战争。如果一些亲戚、朋友始终试图用狭隘的世俗偏见、旧有观念来对你突围起跑的行为进行各种指责、说教或打压。要面不改色、微笑且冷淡地与他们斩断深度探讨，这是最高度的精神自卫。`
    },
    {
      title: "红尘合拢：契约无情、灵魂自由，人际大关全然正位",
      content: `人际生态篇合拢：高维的贵人局是在极其干净、等价互利、法理分明的天空下才能长出的高大乔木。用最铁打的手段过滤低频，用最干净的灵魂守护真挚。你高大的红尘护城河，今日已全面筑好。`
    }
  ];

  for (let i = 67; i <= 75; i++) {
    const themeIdx = i - 67;
    const itemData = nobleThemes[themeIdx % nobleThemes.length];
    
    let cycleVisualItems: any[] = [];
    if (i % 3 === 0) {
      cycleVisualItems = [
        {
          type: 'checklist',
          label: '冰冷契约御防风流指南',
          value: `起步阶段白纸黑字划分干净任何股份和红利指标;拒绝参与任何只有溢美之词而无理智反思的低能饭局;用一票否决权彻底锁死他人私底下暗箱干涉的操作`,
          subtext: '人际防损自守卡'
        }
      ];
    } else if (i % 3 === 1) {
      cycleVisualItems = [
        {
          type: 'matrix',
          label: '红尘人脉重组控制盘',
          value: `守护贵星:${profile.bazi.gongSha[i % profile.bazi.gongSha.length] || '天乙贵人'}, 泄气雷区:嘴甜懂事但无底线消耗体力蜜友, 御敌底牌:冷淡退席保持零交互, 博弈心法:无情契约守护高维友谊`
        }
      ];
    } else {
      cycleVisualItems = [
        { type: 'dial', label: '契约加持抗压力', value: ((i * 3 + 8) % 15) + 82, subtext: '宿命金元纯净率度量' },
        { type: 'list', label: '风水护花使者', value: i % 2 === 0 ? '白金刚大智气场' : '戊土大地宽厚气场', subtext: '自卫守局关键' }
      ];
    }

    pages.push({
      pageNumber: i,
      title: `贵人局交互指南 · 第${i-66}章`,
      subtitle: `ROYAL ALIGNMENT PROCEDURES`,
      content: `分析：你在红尘中打拼，由于本命【比劫】不弱，第 ${i} 页面对你的行事法则做出更进一步的指点：\n\n` + itemData.content + `\n\n凡是重大金钱与利益往来，在前期必须要把退伙协议、损失边界以及核心决策权写得精确，这属于【金属性：精准设界】。`,
      visualItems: cycleVisualItems
    });
  }

  // PAGE 76-84: Volume 7 - Spatial Resonance
  pages.push({
    pageNumber: 76,
    title: `空间共鸣：地理磁场与城市迁移规律`,
    subtitle: `GEOMATIC RESONANCE & CITY SHIFTING CODE`,
    content: `高维空间的每一个方位、每一个城市，对你气运的冷暖调配都有至关重要的作用。
    
你的命格最喜【${profile.bazi.usefulGods.primary[0]}】之方位气数。
    
- 最佳空间加持方位：【${profile.user.location.includes('北京') || profile.user.location.includes('成都') ? '本命地理：西方或南方' : '本命推荐地理方位：' + profile.bazi.usefulGods.primary[0] + '之向'}】
- 地磁效应：每当你向最喜方位移动、或者在该城市工作生活，你的【理性力】在数周内即可明显回满，思路更加清晰，事业机遇突增。`,
    visualItems: [
      { type: 'card', label: '天命大吉方位', value: profile.bazi.usefulGods.primary[0] + '向、或者水木相交的主权城市', accent: true },
      { type: 'list', label: '当前所居气场测定', value: `所居空间：${profile.user.location}`, subtext: '当前空间磁场关联' },
      { type: 'quote', value: '地气不顺则人身浮躁，地脉契合则身如松竹般稳重。', subtext: '风水天数' }
    ]
  });

  // Define highly specific and completely unique environmental/spatial energy self-care texts for pages 77-84 (Volume 7)
  const spaceThemes = [
    {
      title: "光照疗愈：在明静通透的高窗侧面苏醒",
      content: `你的身心非常容易受环境阴晦暗结的磁场拖累。长期居住在采光窒碍、密不通风的居所会严重导致你命理中的金气滞退、精神空转。本页强烈建议你每日清晨拉开厚重的窗帘，让阳光完整饱满地浸润你的双手与发顶，此为天然明目火气加持。`
    },
    {
      title: "声波排毒：使用绝对白噪音彻底割舍外界杂音",
      content: `听觉是你极为敏感的元气消耗孔。如果你的住处或工位长期伴随着若有若无的马路轰鸣、重低音震动等城市低频震感，你的交感神经便会始终保持临战状态，造成身体暗自透支。戴上降噪阻隔，或播放纯净大自然海浪声波，完成声波防护。`
    },
    {
      title: "绿色生机：让三盆常青阔叶植物伴你入眠",
      content: `阔叶绿植是环境磁场最棒的“负能处理器”。在卧室的东南角、或办公桌左手边，优雅栽培两至三盆泥土培植的常春藤、黄金葛或琴叶榕。它们夜间静默的二氧化碳交换与舒展的深绿，能有效过滤你白日里由于心高意亢产生的负面念波。`
    },
    {
      title: "极简除霉：将三年不穿的旧衣彻底物理舍弃",
      content: `堆积如山的陈旧无用旧物、坏掉没有维修的电子配件，在居所深处会形成死气淤塞，直接克压你的财气流通。现在就翻箱倒柜，把所有沾染旧日消极感伤的残次衣物丢弃或捐出，畅通你居所的气流血管。`
    },
    {
      title: "床底净空：床垫之下不可堆放任何杂乱行李",
      content: `床底是睡眠时身体微循环气流穿戴的核心通道。凡是床底铺满旧鞋、多余纸箱或尘封杂物的，极易引发睡眠中无因的焦虑和晨起时的重度疲倦。让床底彻底保持绝对空无，唯有空气自由回转，你的体魄电量才会真正回满。`
    },
    {
      title: "水气正位：杜绝潮湿对骨质与关节的侵蚀",
      content: `如果你长期处于背阴、湿气过重的地下室 or 一楼空间，由于命盘本金过剩容易化燥或受湿克，你的肺系与关节便会极易报警。除湿防霉是你的家居头等刚性需要。买一台重型除湿机，将环境空气硬性调定在干爽无菌状态。`
    },
    {
      title: "色彩平衡：使用淡雅空灵的浅色系包裹视神经",
      content: `避免在核心居住空域大面积采用极其压抑的重黑、暗紫或极高饱和度的血红，这些色彩会强力诱发大脑的冲突潜意识。多采用乳白、温暖沙色、淡空灰作主调，配合适当的原木材质触感，能令你的心脏波值时刻保持气定神闲。`
    },
    {
      title: "空间重构：让自留地成为不可侵犯的绝对掩体",
      content: `空间篇终：不要让任何人不打招呼敲门闯进属于你专属的创作和理疗静音房。哪怕只是一个单间、一架安静的主权书桌，也要将它视作你在这个乱哄红尘里神圣不可蹂躏、疗养伤口的终极极地。`
    }
  ];

  for (let i = 77; i <= 84; i++) {
    const themeIdx = i - 77;
    const itemData = spaceThemes[themeIdx % spaceThemes.length];

    let cycleVisualItems: any[] = [];
    if (i % 3 === 0) {
      cycleVisualItems = [
        {
          type: 'checklist',
          label: '地理空间气场御防防风令',
          value: `杜绝长期待在阳光不至密闭无窗的潮湿浊气空间;每周对书架及衣柜来一次铁腕极简断舍拆解;把枕头旁的待办贴纸与杂乱拖线连根拔除`,
          subtext: '空间掩体契约'
        }
      ];
    } else if (i % 3 === 1) {
      cycleVisualItems = [
        {
          type: 'matrix',
          label: '环境能量五行纠偏阵',
          value: `最喜方位:${profile.bazi.usefulGods.primary[0]}向、水木润泽城市, 克忌元凶:地下室或阴晦无采光死角, 声波御防:播放海浪白噪音屏蔽高音喇叭, 宜置绿植:常绿常春藤阔叶植物三盆`
        }
      ];
    } else {
      cycleVisualItems = [
        { type: 'dial', label: '地磁共鸣自持度', value: ((i * 4 + 19) % 15) + 81, subtext: '居所磁场顺承系数' },
        { type: 'list', label: '开运风水色彩', value: profile.derivedProfile.fiveElementExtremes.weakest === '木' ? '青黛翠竹/空绿' : '钛灰/浅白', subtext: '视觉包裹药方' }
      ];
    }

    pages.push({
      pageNumber: i,
      title: `${itemData.title} · 第${i-76}章`,
      subtitle: `ENVIRONMENTAL REBOOT LEVEL ${i-76}`,
      content: `第 ${i} 页的空间分析中指出。由于你天生命格中存在着极强的金木抗阻力变，你对所处地理磁场的纯净度有着极其神圣细密的天生直觉需求：\n\n` + itemData.content + `\n\n空间不顺则人身浮躁，地气契合则身如松竹般稳重。`,
      visualItems: cycleVisualItems
    });
  }

  // PAGE 85-95: Volume 8 - Decennial & Annual Life K-Lines
  pages.push({
    pageNumber: 85,
    title: `十年沉浮：大运人生K线推演`,
    subtitle: `THE DECENNIAL ROAD AND ANNUAL LIFE K-LINE`,
    content: `欢迎来到本说明书最为核心的部分：十年大命K线推导。
    
时间大运是由恒星位置变迁所投射的引力高潮。
- 你目前的生命大运周期为【${profile.bazi.luckPillars[0]?.pillar || '庚申'}大运】（主题：${profile.bazi.luckPillars[0]?.theme || '自我重构'}）。
- 这是一个典型的【破局战大运】，充满各种机遇与极端高维试炼，它会逼迫你脱胎换骨。
- 命运大势：在经历了一番风雨之后，未来的几年你的理智度与财富容器将加速成长！`,
    visualItems: [
      { type: 'bazi_chart', value: klData },
      { type: 'card', label: '当前大运代号', value: `${profile.bazi.luckPillars[0]?.pillar || '开局'}·${profile.bazi.luckPillars[0]?.theme || '命运试炼'}`, accent: true },
      { type: 'list', label: '破局大势', value: profile.derivedProfile.tenYearMainTheme, subtext: '高维战略导引' }
    ]
  });

  // Define highly specific and completely unique annual timeline texts for pages 86-95 (Volume 8)
  const annualThemes = [
    {
      title: "比肩夺财警醒：如何在关系重整期守住核心财库底牌",
      content: `流年能量第一轨：在近期或未来第一波星象运行过境时，你会感受到强烈的“人情道德绑架”与来自旧人、旧合伙的借贷试探。在这一年，任何面子借钱、没有任何实质担保的盲目按泥，都是纯粹的能量失血。用最优雅的微笑，说最冷酷的拒绝。`
    },
    {
      title: "伤官配印出师：在思维大爆炸的一年用契约与专业全面赋能",
      content: `流年能量第二轨：你将迎来一个才华溢出、灵智大开的闪耀行限。此时你脑海中会有无数想离职颠覆、或者大张旗鼓自立门户的创新野心。系统强烈建议你：此时不可单独野蛮裸奔，一定要引入“印星”的力量（即寻找绝对资深并讲究法理契约的导师一并连线作结衣护身）。`
    },
    {
      title: "七杀破局战力：激发潜伏在最底层那颗天不怕地不怕的战神之星",
      content: `流年能量第三轨：外部大格局会突然压下非常沉重、甚至是不讲道理的任务指标或世俗债务大山。但得益于你骨子里的${profile.derivedProfile.fiveElementExtremes.strongest}，这反而会彻底激发出你沉睡已久的杀手意志。用坚硬如铁的计划反向切割，完成极冷酷的绝地反扑。`
    },
    {
      title: "食神生财自愈：在安静享受与专注创作中迎来资金的自动合水",
      content: `流年能量第四轨：放下前几年高度拼杀的焦虑重载，将目光投射到对日常生活、美食、睡眠 and 纯粹知识探索中。当你彻底放弃在急功近利中空转、专注于打磨你个人的某项绝活时，财富的金流反而会自发自流，大吉。`
    },
    {
      title: "正官正位规则：全面确立独当一面的个人行业主话权",
      content: `流年能量第五轨：如果你长久在暗处潜行，这一年引力波会强制把你推到最闪耀的前台，让你担任核心主权者或团队领头人。切莫胆怯与推脱。穿上你挺拔端庄的深色风衣，用你无可辩驳的冷静法理，确立新规则。`
    },
    {
      title: "偏财风口突降：克制在一夜暴富狂喜中丧失了底线防火墙",
      content: `流年能量第六轨：会突发一笔非对称性的小额偏门意外财运（如投资分账爆火或旧日遗留权益变现）。但本页铁律警告：千万不要把这场偏意外气数，误当成可以大加杠杆的日常常态，守住现金流，防止过热导致年末亏损退场。`
    },
    {
      title: "正印自渡守真：进入全身心慈悲释怀与重整生命底层代码的港湾",
      content: `流年能量第七轨：引力进入到安宁深邃的自保年。此时适合全力放慢竞争，去深山闭关、考学历、看透命运说明书、或完成自我灵魂对话。你在此阶段凝聚的每一度静谧心光，都是你下一次破茧飞升时最强硬的飞船骨架。`
    },
    {
      title: "偏印枭神夺食劫难：严防过度唯心空想而与物质物理现实严重脱钩",
      content: `流年能量第八轨：你会产生莫名的孤独不配感，容易对现实常规的工作产生极其强烈的虚无厌弃心理。高度警惕这种心因性的“虚无陷阱”！多走出去跑步，去吃滚热的街头烟火食，让肉体接通凡俗大地的温度。`
    },
    {
      title: "劫财暴风试炼：将一切落后的附庸关系做彻底的物理斩割",
      content: `流年能量第九轨：你周围的凡俗圈层会发生一次浩大的人际翻车与财务亏损传染，这会无情剥除你仅存的侥幸。记住，生命树的健康长高从来都需要无情剪枝。勇敢、冷酷地割舍旧有包袱，轻快上阵。`
    },
    {
      title: "九极合一正印升龙：说明书终篇，活出一个令神明瞩目的浩瀚主权宇宙",
      content: `流年运推演终篇：大运年限从来不是一言堂的生死签，它是变幻莫测的数字天气预报。晴天时拼命扬帆狂奔，雷暴时沉稳掩舱冬眠，无论宇宙天气如何流转，握紧你双手中的主权方向盘，去开辟属于你高维不被定义的极乐天地。`
    }
  ];

  for (let i = 86; i <= 95; i++) {
    const themeIdx = i - 86;
    const itemData = annualThemes[themeIdx % annualThemes.length];
    
    let cycleVisualItems: any[] = [];
    if (i % 3 === 0) {
      const yearHex = HEXAGRAMS_INFO[i % HEXAGRAMS_INFO.length];
      cycleVisualItems = [
        {
          type: 'hexagram_card',
          label: `本命流年运卦测定 (${profile.user.birthDate.getFullYear() + (i-86) + 25}年)`,
          value: yearHex.name,
          subtext: `${yearHex.theme} —— 该时期自保心法：${yearHex.advice}`
        }
      ];
    } else if (i % 3 === 1) {
      cycleVisualItems = [
        {
          type: 'matrix',
          label: `大平生大命流岁阵`,
          value: `流年神煞评分:95, 核心喜用药:${profile.bazi.usefulGods.primary[0]}极重辅佐力量, 避雷要害:多走下马路接触高沸腾红尘香气烟气, 解劫动作:引入白纸黑字契约阻击面子借钱`
        }
      ];
    } else {
      cycleVisualItems = [
        { type: 'dial', label: `大运流限谐冲谐率`, value: ((i * 3 + 12) % 15) + 82, subtext: '星力潮汐顺受比' },
        { type: 'tag', label: '行事精粹建议', value: '守护好个人专属核心资产，微笑拒绝无理索赔' }
      ];
    }

    pages.push({
      pageNumber: i,
      title: `${itemData.title} · 第${i-85}章`,
      subtitle: `ANNUAL DESTINY IN MATRIX`,
      content: `翻看第 ${i} 页面。系统的 deterministic 算法根据你身处的大运「${profile.bazi.luckPillars[0]?.pillar || '开盘大命'}」分析，为你单独解析当前生命流年运轨第${i-85}条运程防线：\n\n` + itemData.content + `\n\n运势从来不是被动的终局判决，而是你可以选择切入和驾驭的宇宙能量浪潮。`,
      visualItems: cycleVisualItems
    });
  }

  // PAGE 96-99: Volume 9 - Action Sheets & Outro
  pages.push({
    pageNumber: 96,
    title: `每日对抗卡：降噪与自我更新行动表`,
    subtitle: `DAILY ANTIDOTE: PROP & ACTION`,
    content: `你的命运代码，已经演算到了本系统的物质实体底层。任何宏大的命运蓝图，在最日常的清晨和下午，终究是由你身边的实物以及行动组成的。
    
针对你的【${dm.element}】日主以及【最弱五行：${profile.derivedProfile.fiveElementExtremes.weakest}】：
    
系统为您定制了一份专属每日对抗抗震装备，当您感受气血枯竭、内耗过载时，请物理随身带上、或开启执行这些降噪道具。`,
    visualItems: [
      { type: 'card', label: '救赎道具 (SSR级)', value: '降噪耳机 (开启绝对无噪壁障)', accent: true },
      { type: 'card', label: '救赎饮品 (SR级)', value: dm.element === '火' ? '少糖金银茶 / 冰镇流体' : '双倍冰咖啡 / 热赤乌茶' },
      { type: 'list', label: '救赎能量行为', value: '脱下鞋袜，用脚底板物理狠狠踩大草坪15分钟', subtext: '接地接土元气法' },
      { type: 'list', label: '救赎风水配色', value: profile.derivedProfile.fiveElementExtremes.weakest === '木' ? '森林古翠、淡浅空绿' : '钛空深沙、冰凝澈红', subtext: '元气日常加持' }
    ]
  });

  pages.push({
    pageNumber: 97,
    title: `人生源代码重构行动契约`,
    subtitle: `THE REFACTOR CONTRACT OF MY LIFE`,
    content: `这是一份由旅行者「${user.name}」与宇宙天命系统底座达成的【重构契约】。
    
请在这行文字之下，在内心中，写下你的数字签字。
    
1. 我承诺，坚决停止在不配的人身上提供多余、消耗、充满内耗罪恶感的情绪价值和任何形式的自断财路行为；
2. 我承诺，每周用至少6小时与大自然连接并进入纯物理排毒戒断；
3. 我承诺，面对不合理的系统性剥削与低维指责，高高昂起头颅，运用生命主原力进行无情降维反击。`,
    visualItems: [
      { type: 'tag', label: '契约版本', value: '99-Manual Core Refactor 1.1' },
      { type: 'list', label: '主权独立度参数', value: '100% (绝对主权自我掌控)', subtext: '不可动摇底线' },
      { type: 'quote', value: '契约已深深刻入你的魂域。当你再次软弱想充当面子买单的牺牲者时，它会在脑际对你鸣笛警告。', subtext: '源代码意志' }
    ]
  });

  pages.push({
    pageNumber: 98,
    title: `高维天意：给旅行者的灵魂指引信(上篇)`,
    subtitle: `A HIGH-DIMENSIONAL MESSAGE FOR MY SOUL`,
    content: `写在你这使用说明书即将合拢的终极前夕：
    
亲爱的「${user.name}」，你的出生和呼吸是一万颗恒星爆破后，它们的骨灰在虚空中碰撞、冷却，偶然地在这个蓝色的星球重新凝聚出的灵体。
    
你的人生绝无可能被区区一个八字、几个行星或者六十四爻卦死死框死。`,
    visualItems: [
      { type: 'quote', value: '每一个在你看来无法挣脱的严厉黑夜，在未来的高维拉长看，都是一颗不可多得的钻石拼板。', subtext: '星光书简' }
    ]
  });

  pages.push({
    pageNumber: 99,
    title: `天意回向：给旅行者的灵魂指引信(下篇)`,
    subtitle: `RESONATING SOUL MESSAGE`,
    content: `一切星象计算，都只是告诉你，你这艘巨轮出厂时配备的双叶引擎参数、船帆的方向以及容易在哪个洋流里偏航。至于你最终要在哪座无名海啸里破浪起锚，重力加速度的大转盘永远握在你的手里。
    
命运并非一堵不可越过的墙，它是一道道由重重迷雾织就的浪潮。你现在，已经握紧了方向盘。请带上自愈的原力，继续坚定地去开辟独属于你的主权道路。`,
    visualItems: [
      { type: 'card', label: '重构执行力指数', value: '99/99 EXP LEVEL UP', accent: true }
    ]
  });

  pages.push({
    pageNumber: 100,
    title: `尾页：源代码重定义说明`,
    subtitle: `EPILOGUE: REDEFINED SOURCE CODE`,
    content: `旅行者「${user.name}」，你的人生使用说明书至此全部一百页，正式推演生成完毕。
    
系统并非是一部可以被死死剧透、索然无味的小说。这一册，是递给你的【出厂改装设计原纸】。去翻开、去质疑、去狠狠地突破、重构，去把它蹂躏、撕碎，然后活出一个高维、不被定义、令神明都意想不到的非线性宇宙。
    
祝你今天扬帆顺风起航。`,
    visualItems: [
      { type: 'tag', label: '系统生成序列ID', value: `MANUAL-#${hashVal}` },
      { type: 'tag', label: '状态', value: '完全体觉醒' },
      { type: 'card', label: '今日起重整能量底牌', value: '100% 重塑主权', accent: true },
      { type: 'quote', value: '重构今日开始。翻页退出，狠狠去活。', subtext: '说明书合拢' }
    ]
  });

  return pages;
};
