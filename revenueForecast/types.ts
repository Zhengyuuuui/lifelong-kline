
export type Rank = 'SSS' | 'SS' | 'A' | 'C' | 'D';

export interface UserInput {
  name: string;
  birthdate: string;
  gender: 'male' | 'female';
}

export interface RadarStats {
  wealth: number;    // 吸金
  romance: number;   // 桃花
  chaos: number;     // 搞事
  lazy: number;      // 躺平
  luck: number;      // 贵人
  grit: number;      // 硬骨
}

export interface AssetItem {
  name: string;
  value: number;
  type: 'base' | 'bonus' | 'penalty';
}

export interface SoulComponent {
  label: string;
  percent: number;
  color: string;
}

export interface LuckyGuide {
  luckyItem: string;
  luckyDirection: string;
  todo: string;
  notTodo: string;
}

// 新增：赛博固定资产类型
export interface FixedAsset {
  type: 'body' | 'emotion' | 'work' | 'virtual';
  name: string;
  amount: string;
  trend: 'up' | 'down' | 'flat' | 'explode';
  valuation: string;
  comment: string;
}

// 新增：人生概念股类型
export interface ConceptStock {
  name: string;
  code: string;
  pnl: string;
  isUp: boolean; // true for red (up), false for green (down)
  status: string;
  comment: string;
}

// 新增：人品信用分类型
export interface CreditScore {
  score: number;
  level: string;
  reason: string;
}

// 新增：银行资产总览
export interface BankAssets {
  fixedAsset: FixedAsset;
  stock: ConceptStock;
  creditScore: CreditScore;
}

export interface ValuationResult {
  valuation: number;
  rank: Rank;
  tag: string;
  beatPercentage: number;
  stats: RadarStats;
  soulComposition: SoulComponent[];
  assetBreakdown: AssetItem[]; // 新增：资产构成明细
  bankAssets: BankAssets; // 新增：银行资产组合
  luckyGuide: LuckyGuide;
  comment: {
    title: string;
    body: string;
  };
  shareCopy: {
    title: string;
    subTitle: string;
  };
}

export interface ContractDetails {
  type: 'winner' | 'loser' | 'tie' | 'wager'; // 新增 wager 类型
  title: string;
  content: string;
  stampText: string;
  blockchainId: string;
  item: string; // 具体的惩罚/奖励项
}

export interface PkResult {
  winner: 'user' | 'opponent' | 'tie';
  relationTitle: string;
  relationDesc: string;
  selfTitle: string;     // 新增：我方称号
  opponentTitle: string; // 新增：对方称号
  verdict: string;       // 新增：判词
  contract: ContractDetails; // 新增契约详情
}

// --- 后端数据模型 ---

export interface UserProfile {
  id: string;
  token: string;
  nickname: string;
  avatar: string;
  createdAt: number;
  bestValuation: number | null; // 历史最高身价
}

export interface TransactionRecord {
  id: string;
  userId: string;
  type: 'income' | 'expense' | 'system';
  category: string; // e.g., '工资', '理财', '转账'
  title: string;
  amount: number;
  status: 'success' | 'pending' | 'failed';
  timestamp: number;
  remark?: string;
}

export type PkStatus = 'CREATED' | 'SHARED' | 'JOINED' | 'FINISHED';

export interface PkSession {
  id: string;
  creatorId: string;
  challengerId?: string; // 对手ID
  status: PkStatus;
  creatorValuation: number;
  challengerValuation?: number;
  createdAt: number;
}
