

import { UserInput, ValuationResult, Rank, PkResult, RadarStats, SoulComponent, LuckyGuide, AssetItem, ContractDetails, BankAssets } from './types';
import { 
  RELATION_TITLES, 
  RELATION_DESC, 
  TAGS, 
  INGREDIENTS_PAIN, 
  INGREDIENTS_GAIN, 
  INGREDIENTS_MEME, 
  ROASTS, 
  LUCKY_ITEMS,
  CONTRACT_WINNER_ITEMS,
  CONTRACT_LOSER_SERVICES,
  PK_ROLES,
  PK_VERDICTS,
  FIXED_ASSET_POOL,
  STOCK_POOL,
  CREDIT_LEVELS
} from './constants';

// --- Image Saving Utility ---
export const saveImageToLocal = (base64Data: string, fileName: string = 'image.png') => {
    // 创建一个临时的 a 标签
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = fileName;
    
    // 兼容部分移动端浏览器，将其加入文档流
    document.body.appendChild(link);
    link.click();
    
    // 清理
    document.body.removeChild(link);
};

const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; 
  }
  return Math.abs(hash);
};

const seededRandom = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

const pick = <T>(arr: T[], seed: number): T => {
    return arr[Math.floor(seededRandom(seed) * arr.length)];
};

export const formatCurrency = (val: number) => {
  // Chinese format: roughly appropriate scaling
  return new Intl.NumberFormat('zh-CN', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
};

const generateBlockchainId = (seed: number): string => {
    const chars = "ABCDEF0123456789";
    let id = "0x";
    for(let i=0; i<8; i++) id += chars[Math.floor(seededRandom(seed + i) * chars.length)];
    id += "...";
    for(let i=0; i<4; i++) id += chars[Math.floor(seededRandom(seed + 10 + i) * chars.length)];
    return id;
};

// New logic to generate asset breakdown to explain the valuation
const generateAssetBreakdown = (rank: Rank, totalValuation: number, hash: number): AssetItem[] => {
    let items: AssetItem[] = [];
    
    // 1. Base Salary / Hard Work (Basic)
    const baseValue = Math.floor(totalValuation * (0.01 + seededRandom(hash) * 0.1)); 
    items.push({ name: "搬砖辛苦费", value: baseValue, type: 'base' });
    
    let remain = totalValuation - baseValue;

    if (rank === 'SSS' || rank === 'SS') {
        // High ranks: Mostly luck/assets
        const luckVal = Math.floor(remain * 0.6);
        const faceVal = Math.floor(remain * 0.3);
        const dreamVal = remain - luckVal - faceVal;
        
        items.push({ name: "泼天富贵运", value: luckVal, type: 'bonus' });
        items.push({ name: "颜值变现", value: faceVal, type: 'bonus' });
        items.push({ name: "老板画的饼", value: dreamVal, type: 'penalty' }); // Joke
    } else if (rank === 'A' || rank === 'C') {
        // Mid ranks: Mixed
        const potential = Math.floor(remain * 0.5);
        const emotional = remain - potential;
        items.push({ name: "潜力股溢价", value: potential, type: 'bonus' });
        items.push({ name: "精神损失费", value: emotional, type: 'base' });
    } else {
        // Low ranks / Meme
        items.push({ name: "做梦素材", value: remain, type: 'penalty' });
        items.push({ name: "空气", value: 0, type: 'base' });
    }

    return items;
};

export const calculateFate = (input: UserInput): ValuationResult => {
  const seedString = `${input.name}-${input.birthdate}-${input.gender}-2026-Horse`; 
  const hash = simpleHash(seedString);
  const p = hash % 10000;
  
  let rank: Rank;
  let valuation: number;
  let beatPercentage: number;
  
  // Range Requirements: Min 50,000, Max 300,000,000
  // SSS: 1亿 - 3亿
  // SS: 2000万 - 1亿
  // A: 200万 - 2000万
  // C: 50万 - 200万
  // D: 5万 - 50万

  if (p < 100) { 
    rank = 'SSS';
    // 100,000,000 to 300,000,000
    valuation = 100000000 + Math.floor(seededRandom(hash) * 200000000);
    beatPercentage = 99.9;
  } else if (p < 1600) { 
    rank = 'SS';
    // 20,000,000 to 100,000,000
    valuation = 20000000 + Math.floor(seededRandom(hash) * 80000000);
    beatPercentage = 95 + Number((seededRandom(hash) * 4).toFixed(1));
  } else if (p < 6600) { 
    rank = 'A';
    // 2,000,000 to 20,000,000
    valuation = 2000000 + Math.floor(seededRandom(hash) * 18000000);
    beatPercentage = 50 + Number((seededRandom(hash) * 40).toFixed(1));
  } else if (p < 9100) { 
    rank = 'C';
    // 500,000 to 2,000,000
    valuation = 500000 + Math.floor(seededRandom(hash) * 1500000);
    beatPercentage = 20 + Number((seededRandom(hash) * 30).toFixed(1));
  } else { 
    rank = 'D';
    // 50,000 to 500,000
    valuation = 50000 + Math.floor(seededRandom(hash) * 450000);
    beatPercentage = Number((seededRandom(hash) * 20).toFixed(1));
  }

  // Generate breakdown
  const assetBreakdown = generateAssetBreakdown(rank, valuation, hash);

  // Soul Composition
  let soulComposition: SoulComponent[] = [];
  if (rank === 'SSS' || rank === 'SS') {
    soulComposition = [
      { label: pick(INGREDIENTS_GAIN, hash), percent: 90, color: "#D92332" },
      { label: pick(INGREDIENTS_MEME, hash + 1), percent: 10, color: "#F2C97D" },
    ];
  } else {
    soulComposition = [
      { label: pick(INGREDIENTS_PAIN, hash), percent: 60, color: "#2C1608" },
      { label: pick(INGREDIENTS_MEME, hash + 1), percent: 40, color: "#8E0000" },
    ];
  }

  // Tags & Comments
  const tag = pick(TAGS[rank], hash);
  const commentBody = pick(ROASTS[rank], hash);
  const commentTitle = rank === 'SSS' ? "翻身银行VIP" : "人间真实";

  // Guide
  const luckyGuide: LuckyGuide = {
    luckyItem: pick(LUCKY_ITEMS, hash),
    luckyDirection: ["正东", "正西", "正南", "正北"][hash % 4],
    todo: pick(INGREDIENTS_GAIN, hash + 3),
    notTodo: pick(INGREDIENTS_PAIN, hash + 4)
  };

  const stats: RadarStats = {
    wealth: Math.floor(seededRandom(hash) * 100),
    romance: Math.floor(seededRandom(hash + 1) * 100),
    chaos: Math.floor(seededRandom(hash + 2) * 100),
    lazy: Math.floor(seededRandom(hash + 3) * 100),
    luck: Math.floor(seededRandom(hash + 4) * 100),
    grit: Math.floor(seededRandom(hash + 5) * 100),
  };

  // Generate Bank Assets (Meme Modules)
  const assetSeed = hash + 100;
  const fixedAssetRaw = pick(FIXED_ASSET_POOL, assetSeed);

  const stockSeed = hash + 200;
  const stockRaw = pick(STOCK_POOL, stockSeed);

  const creditSeed = hash + 300;
  const creditScoreVal = 350 + Math.floor(seededRandom(creditSeed) * 601); // 350 - 950
  const creditLevelObj = CREDIT_LEVELS.find(l => creditScoreVal >= l.min && creditScoreVal <= l.max) || CREDIT_LEVELS[0];
  const creditReason = pick(creditLevelObj.reasons, creditSeed);

  const bankAssets: BankAssets = {
      fixedAsset: { ...fixedAssetRaw, trend: fixedAssetRaw.trend as any, type: fixedAssetRaw.type as any },
      stock: stockRaw,
      creditScore: { score: creditScoreVal, level: creditLevelObj.level, reason: creditReason }
  };

  return {
    valuation,
    rank,
    tag,
    beatPercentage,
    stats,
    soulComposition,
    assetBreakdown,
    bankAssets,
    luckyGuide,
    comment: { title: commentTitle, body: commentBody },
    shareCopy: {
      title: "我的马年身价",
      subTitle: `系统估值 ¥${formatCurrency(valuation)}`
    }
  };
};

// 新增：生成对赌协议（Wager Contract）
export const generateWagerContract = (userValuation: number): ContractDetails => {
    const seed = Math.floor(userValuation + Date.now()); // Random seed
    const item = pick(CONTRACT_WINNER_ITEMS, seed); // 复用赢家奖励池作为对赌筹码
    const blockchainId = generateBlockchainId(seed);
    
    return {
        type: 'wager',
        title: "身价PK挑战书",
        item: item,
        content: `兹向【朋友圈好友】发起身价挑战：\n\n以 2026 天命估值为准，输家需无条件履行以下义务：\n【${item}】\n\n（以此图为证，拒绝赖账）`,
        stampText: "对赌\n协议\n生效",
        blockchainId
    };
};

export const calculatePk = (userVal: number, opponentVal: number): PkResult => {
  const seed = Math.floor(userVal + opponentVal);
  const ratio = userVal > opponentVal ? userVal / opponentVal : opponentVal / userVal;
  
  let winner: 'user' | 'opponent' | 'tie';
  let relationTitle = "";
  let relationDesc = "";
  let selfTitle = "";
  let opponentTitle = "";
  let verdict = "";
  
  if (ratio < 1.1) {
    winner = 'tie';
    relationTitle = RELATION_TITLES.TIE;
    relationDesc = RELATION_DESC.TIE;
    selfTitle = PK_ROLES.TIE_SELF;
    opponentTitle = PK_ROLES.TIE_OPPONENT;
    verdict = PK_VERDICTS.TIE;
  } else if (userVal > opponentVal) {
    winner = 'user';
    relationTitle = RELATION_TITLES.WINNER_NORMAL;
    relationDesc = RELATION_DESC.WINNER_NORMAL;
    selfTitle = PK_ROLES.WINNER_SELF;
    opponentTitle = PK_ROLES.WINNER_OPPONENT;
    verdict = PK_VERDICTS.WIN;
  } else {
    winner = 'opponent';
    relationTitle = RELATION_TITLES.LOSER_NORMAL;
    relationDesc = RELATION_DESC.LOSER_NORMAL;
    selfTitle = PK_ROLES.LOSER_SELF;
    opponentTitle = PK_ROLES.LOSER_OPPONENT;
    verdict = PK_VERDICTS.LOSE;
  }

  // Generate Contract Data
  let contract: ContractDetails;
  const blockchainId = generateBlockchainId(seed);

  // Viral Meme Content Logic
  // 核心改动：使用用户指定的新模板
  if (winner === 'user') {
      const item = pick(CONTRACT_WINNER_ITEMS, seed); 
      contract = {
          type: 'winner',
          title: "请客兑换券",
          item: item,
          content: `经系统公证：\n@输家 需在 3 日内请 @赢家 \n【${item}】\n\n（若违约，2026年财运减半）`,
          stampText: "系统\n公证\n有效",
          blockchainId
      };
  } else if (winner === 'opponent') {
      const item = pick(CONTRACT_LOSER_SERVICES, seed);
      contract = {
          type: 'loser',
          title: "打工抵债承诺书",
          item: item,
          content: `愿赌服输。\n本人因身价不足，自愿做 @赢家 的：\n【${item}】\n\n（大佬，我不想打工，能发个红包抵消吗？）`,
          stampText: "含泪\n签字\n画押",
          blockchainId
      };
  } else {
      contract = {
          type: 'tie',
          title: "贫困互助条约",
          item: "互相安慰",
          content: "经系统检测，你俩身价半斤八两。\n\n双方应立即组建【拼多多砍一刀互助组】，谁也别嫌弃谁，在这个冷漠的社会抱团取暖。",
          stampText: "穷鬼\n联盟\n锁死",
          blockchainId
      };
  }

  return { winner, relationTitle, relationDesc, selfTitle, opponentTitle, verdict, contract };
};