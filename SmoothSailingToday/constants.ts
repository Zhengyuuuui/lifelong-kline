import { DayData, TimelineSegment, StrategyTone, Message, RelationshipCandidate, FlowPath, AlternativeRoute, SegmentType } from './types';

export const COLORS = {
  good: '#34D399',    // Emerald 400 - 顺风
  neutral: '#94A3B8', // Slate 400 - 平稳
  warn: '#FB923C',    // Orange 400 - 逆风 (Brighter for visibility)
  bad: '#EF4444',     // Red 500 - 大凶
  slow: '#818CF8',    // Indigo 400 - 缓/慢 (Calming)
  darkBg: '#050812',
};

// --- Mock Generators (Dynamic based on Date) ---

const generateSegments = (): TimelineSegment[] => {
  const segments: TimelineSegment[] = [];
  
  // Create a stable daily shift
  const date = new Date();
  const dayOfMonth = date.getDate();
  const seedString = `${date.getFullYear()}-${date.getMonth()}-${dayOfMonth}`;
  
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = ((hash << 5) - hash) + seedString.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash);
  const shift = seed % 24; // 0-23 hour shift

  for (let i = 0; i < 24; i++) {
    let type: SegmentType = 'neutral';
    let score = 50;
    let description = "平稳推进";
    
    // Calculate the pattern index by rotating the standard day
    const patternIndex = (i + 24 - shift) % 24;
    
    // Archetype Pattern
    if (patternIndex >= 0 && patternIndex < 6) { 
        type = 'slow'; score = 40 + (seed % 10); description = "深度休整"; 
    } else if (patternIndex >= 6 && patternIndex < 9) { 
        type = 'warn'; score = 35 + (seed % 5); description = "晨间逆风"; 
    } else if (patternIndex >= 9 && patternIndex < 11) { 
        type = 'neutral'; score = 65 + (seed % 10); description = "日常平稳"; 
    } else if (patternIndex >= 11 && patternIndex < 14) { 
        type = 'slow'; score = 55 + (seed % 5); description = "午间缓冲"; 
    } else if (patternIndex >= 14 && patternIndex < 16) { 
        type = 'bad'; score = 25 + (seed % 10); description = "能量低谷"; 
    } else if (patternIndex >= 16 && patternIndex < 18) { 
        type = 'neutral'; score = 60 + (seed % 10); description = "状态回升"; 
    } else if (patternIndex >= 19 && patternIndex <= 22) { 
        type = 'good'; score = 88 + (seed % 8); description = "黄金时段"; 
    } else { 
        type = 'slow'; score = 50 + (seed % 5); description = "晚间慢活"; 
    }

    segments.push({ hour: i, type, score, description });
  }
  return segments;
};

const SEGMENTS = generateSegments();

// Helper to find a 'good' window dynamically for the mock data
const findBestWindow = (segs: TimelineSegment[]) => {
    // Find the longest sequence of good segments or just the first one
    const goodSeg = segs.find(s => s.type === 'good') || segs.find(s => s.score > 75) || segs[0];
    const startHour = goodSeg.hour;
    const endHour = (startHour + 2) % 24;
    
    return {
        start: `${String(startHour).padStart(2, '0')}:00`,
        end: `${String(endHour).padStart(2, '0')}:00`,
        score: goodSeg.score,
        description: goodSeg.type === 'good' ? '黄金时段峰值' : '平稳推进期',
        type: goodSeg.type === 'good' ? 'attack' : 'steady' as 'attack' | 'steady'
    };
};

const DYNAMIC_WINDOW = findBestWindow(SEGMENTS);

// Mock Relationships
export const MOCK_RELATIONSHIPS: RelationshipCandidate[] = [
  {
    id: 'r1',
    name: '重要客户',
    roleLabel: 'A类业务',
    relationTag: '决策人',
    recommendedTimeLabel: '20:00–21:00',
    actionHint: '适合发一条短语音',
    reason: '最近这个时间回复率高 · 今日卦象利合作沟通',
    priorityLevel: 'primary',
    openingLine: '陈总，晚上好。刚复盘了一下之前的方案，发现有个细节对咱们降本很有帮助，方便时跟您同步下？'
  },
  {
    id: 'r2',
    name: '合作伙伴',
    roleLabel: '渠道资源',
    relationTag: '资源方',
    recommendedTimeLabel: '14:30–15:00',
    actionHint: '适合简短文字确认',
    reason: '下午能量平稳，适合敲定细节',
    priorityLevel: 'secondary',
    openingLine: '下午好。关于上次提的那个资源置换的事，我这边准备好了，看你何时方便过一下？'
  },
  {
    id: 'r3',
    name: '老友',
    roleLabel: '大学同学',
    relationTag: '情绪补给',
    recommendedTimeLabel: '21:30+',
    actionHint: '适合闲聊放松',
    reason: '晚间水火既济，适合情感交流',
    priorityLevel: 'secondary',
    openingLine: '老同学，最近忙啥呢？好久没聚了，改天出来喝一杯？'
  }
];

// Mock Resistance Map Data
export const MOCK_RESISTANCE_PATH: FlowPath = {
  id: 'current',
  summary: '你 → 同事 → 部门主管 → 客户',
  nodes: [
    { id: 'n1', label: '你', frictionLevel: 'low', type: 'self' },
    { id: 'n2', label: '同事协助', frictionLevel: 'low', type: 'internal' },
    { id: 'n3', label: '部门主管审批', frictionLevel: 'high', frictionReason: '近期响应极慢', type: 'internal' },
    { id: 'n4', label: '客户确认', frictionLevel: 'medium', frictionReason: '意向不明', type: 'external' }
  ]
};

export const MOCK_ALTERNATIVES: AlternativeRoute[] = [
  {
    id: 'alt1',
    label: '方案 A：越级直连',
    path: {
      id: 'path_a',
      nodes: [
        { id: 'a1', label: '你', frictionLevel: 'low' },
        { id: 'a2', label: '客户 (15min 电话)', frictionLevel: 'low' },
        { id: 'a3', label: '主管补流程', frictionLevel: 'medium' }
      ],
      summary: '你 → 客户(电话) → 主管补票'
    },
    highlights: ['减少高摩擦节点', '先锁定意向'],
    explanationLines: [
      '避开主管审批的拥堵期，直接用顺风时间窗口拿到客户口头承诺。',
      '今日卦象宜“先谈后批”，事半功倍。'
    ]
  },
  {
    id: 'alt2',
    label: '方案 B：借力打力',
    path: {
      id: 'path_b',
      nodes: [
        { id: 'b1', label: '你', frictionLevel: 'low' },
        { id: 'b2', label: '总监背书', frictionLevel: 'low' },
        { id: 'b3', label: '客户', frictionLevel: 'low' }
      ],
      summary: '你 → 总监 → 客户'
    },
    highlights: ['提升权重', '快速通过'],
    explanationLines: [
      '利用“贵人”运势，请总监出面打个招呼，直接跳过中间摩擦。'
    ]
  }
];


export const MOCK_DATA: DayData = {
  isMock: true,
  winScore: Math.floor((SEGMENTS.reduce((acc, s) => acc + s.score, 0) / 24) * 1.2), // Approx score
  mode: DYNAMIC_WINDOW.type,
  modeLabel: DYNAMIC_WINDOW.type === 'attack' ? '进攻局' : '稳进局',
  summary: DYNAMIC_WINDOW.type === 'attack' ? '今日黄金窗口期明显，宜果断出击。' : '今日局势平稳，适合铺垫，多收少冲。',
  quote: DYNAMIC_WINDOW.type === 'attack' ? '时来天地皆同力。' : '适合铺垫，少锋芒。',
  factors: { t: 84, d: 68, r: 72, s: 61 },
  segments: SEGMENTS,
  mainWindow: {
    start: DYNAMIC_WINDOW.start,
    end: DYNAMIC_WINDOW.end,
    score: DYNAMIC_WINDOW.score,
    type: DYNAMIC_WINDOW.type,
    tags: ['深度沟通', '谈条款', '要结果'],
    description: '沟通成功率峰值；对方此时段在线率高。',
    advice: '沉稳版：先锁决策人，再要条款。'
  },
  suitableActions: [
    { id: '1', label: '沟通 / 谈判', type: 'primary' },
    { id: '2', label: '锁试单条款', type: 'primary' },
    { id: '3', label: '面向决策人', type: 'primary' },
    { id: '4', label: '关系跟进', type: 'secondary' },
    { id: '5', label: '复盘整理', type: 'secondary' },
  ],
  dashboard: {
    windDirection: { value: 78, label: '顺风', status: 'good' },
    control: { value: 65, label: '稳' },
    fit: { value: 82, label: '合拍' },
    summary: '今天这件事：风向偏顺，可推进；但流程略粘，要多一点耐心。'
  },
  destress: {
    active: true,
    bullets: [
      '纠结对方沉默（此时段回应率本来就低）',
      '硬撞审批（本周 D 显示流程摩擦上升）',
      '怀疑自己（你的晚间成功峰还在前面）'
    ]
  },
  future: {
    range: '7d',
    summary: '接下来一周：前两天偏打磨，周中易推进，周末适合收口。',
    nodes: [
        { day: 1, score: 70, type: 'neutral', dateLabel: '周一', weatherIcon: 'cloudy' },
        { day: 2, score: 65, type: 'warn', dateLabel: '周二', weatherIcon: 'cloudy' },
        { day: 3, score: 85, type: 'good', dateLabel: '周三', weatherIcon: 'sunny' },
        { day: 4, score: 90, type: 'good', dateLabel: '周四', weatherIcon: 'sunny' },
        { day: 5, score: 60, type: 'neutral', dateLabel: '周五', weatherIcon: 'rain' },
        { day: 6, score: 40, type: 'bad', dateLabel: '周六', weatherIcon: 'storm' },
        { day: 7, score: 80, type: 'good', dateLabel: '周日', weatherIcon: 'sunny' },
    ]
  },
  relationships: MOCK_RELATIONSHIPS
};

export const TONE_TEMPLATES: Record<StrategyTone, string> = {
  steady: `锁定决策人｜${DYNAMIC_WINDOW.start} 要条款`,
  direct: `今晚亮剑｜${DYNAMIC_WINDOW.start} 必须要条款`,
  smooth: `先打照面｜${DYNAMIC_WINDOW.start} 约 10:30 晨电`,
  neutral: '按部就班｜推进标准流程'
};

export const INITIAL_MESSAGES: Message[] = [
  {
    id: 'init-1',
    role: 'ai',
    text: '嗨，今天想先搞定什么？点上面的“搞钱 / 沟通 / 催款”等标签，我帮你排顺风窗口。',
    timestamp: Date.now(),
    quickReplies: ['帮我看下晚上打电话合适吗？', '我今天状态很差']
  }
];