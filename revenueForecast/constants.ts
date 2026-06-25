

import { Rank } from './types';

// Refined Tags based on Tiers (2026 Horse Year Version)
export const TAGS: Record<Rank, string[]> = {
  SSS: ["纯血汗血马", "翻身银行行长", "马斯克异父异母兄弟", "全村的希望", "财神爷私生子"],
  SS: ["甚至不用努力马", "发际线保护协会会长", "日入斗金预备役", "家里有矿", "未来首富"],
  A: ["吗喽大统领", "五险一金贡献者", "全自动扣款机", "顶级吗喽", "精神离职合伙人"],
  C: ["旋转木马", "牛马不如", "哈基米铲屎官", "退堂鼓一级演奏家", "花呗守夜人"],
  D: ["系统Bug", "行走的人民币(冥币)", "天选大冤种", "赛博乞丐", "碳基生物耻辱"]
};

// New PK Roles & Verdicts (More Viral)
export const PK_ROLES = {
  WINNER_SELF: "S级金主",
  WINNER_OPPONENT: "专属挂件",
  LOSER_SELF: "电子宠物",
  LOSER_OPPONENT: "野生干爹",
  TIE_SELF: "穷鬼A",
  TIE_OPPONENT: "穷鬼B"
};

export const PK_VERDICTS = {
  WIN: "系统判定：@对方 别努力了，快把腿伸过去让大哥抱一会儿。",
  LOSE: "系统判定：@对方 爸爸！还缺挂件吗？会吃会睡那种。",
  TIE: "系统判定：你俩凑不出一个满减外卖。锁死吧。"
};

export const PK_ACTIONS = {
  WIN_BUTTON: "⚖️ 生成强制执行令",
  WIN_TOAST: "已生成债权证书，发群里让大家作证。",
  LOSER_BUTTON: "签署卖身契",
  LOSER_TOAST: "愿赌服输！系统已生成劳务抵债合同。",
  TIE_BUTTON: "签署贫困互助条约"
};

export const RELATION_TITLES = {
  WINNER_HIGH: "野生父子",
  WINNER_NORMAL: "精准扶贫对象",
  LOSER_HIGH: "人形提款机",
  LOSER_NORMAL: "速效救心丸",
  TIE: "卧龙凤雏"
};

export const RELATION_DESC = {
  WINNER_HIGH: "系统判定：别说话，把腿伸过去让 @对方 抱一会儿。",
  WINNER_NORMAL: "系统判定：虽然你也穷，但对方比你更需要关怀。",
  LOSER_HIGH: "系统判定：听话，@对方 说什么都是对的。快叫爸爸。",
  LOSER_NORMAL: "系统判定：你俩这身价差距，中间差了一个珠穆朗玛峰。",
  TIE: "系统判定：你俩凑不出一个满减外卖。锁死吧，别祸害别人。"
};

export const PK_SHARE_COPY = [
  "系统估值我身价过亿。不服？进来比比谁才是弟中弟。",
  "听说2026年是马年？测测咱俩谁是骑马的，谁是当牛马的。",
  "我身价只有250块... 谁能来垫个底，让我知道人间有真情？",
  "别做牛马了，测测明年能否“马上暴富”？",
  "敢不敢点进来？输了的明年请吃饭！"
];

export const POST_PK_COPY = {
  LOSER_ACTION: "义父受我一拜 (讨个彩头)",
  LOSER_TOAST: "愿赌服输！系统检测到我五行缺钱，急需大佬发个红包冲喜！",
  WINNER_ACTION: "赏他一口饭吃 (发个安慰包)",
  WINNER_TOAST: "拿着去买糖吃，明年跟着哥混。",
  MONETIZATION: "不甘心当NPC？仅需 ¥3.88 开启【逆天改命包】"
};

// --- New Content Pools for Dynamic Generation ---

// Pain Points: For Tier B/C
export const INGREDIENTS_PAIN = ["早八", "调休", "房贷", "相亲", "脱发", "冰美式", "领导画饼", "周一", "乙方", "催婚", "舔狗", "纯爱", "加班", "背锅"];
// Pleasure Points: For Tier S/A
export const INGREDIENTS_GAIN = ["暴富", "退休", "继承遗产", "拆迁", "中奖", "桃花", "自然醒", "腹肌", "带薪拉屎", "分红", "软饭"];
// Memes: General Mix
export const INGREDIENTS_MEME = ["吗喽", "哈基米", "中国宝宝体质", "防御性编程", "精神离职", "该省省", "特种兵", "发疯", "摆烂"];

// Tier-specific Roasts
export const ROASTS = {
  SSS: [
    "建议明年把二维码纹在身上，因为谁看见你都想扫一扫付款。财神爷是你干爹。",
    "你这身价，呼吸的不是空气，是金粉。走路小心点，别被钱绊倒了。",
    "系统提示：由于您的身价过高，已自动为您屏蔽所有烦恼。"
  ],
  SS: [
    "虽然还没到富可敌国的地步，但在这个群里横着走完全没问题。",
    "潜力巨大，只要稍微努努力（或者稍微做做梦），明年福布斯见。",
    "你距离首富只差一个亿的小目标，加油，我看好你。"
  ],
  A: [
    "看似忙得像头驴，实际产出像只鸡。2026年建议少做梦，多睡觉。",
    "比上不足比下有余，最大的资产是心态，最大的负债是这破班。",
    "你的身价很稳定，稳定得像你的工资一样，不仅没涨还甚至想降。"
  ],
  C: [
    "你的身价甚至买不起两斤猪肉。建议立刻发起PK，寻找那个能包养你的大冤种。",
    "全身上下最值钱的是那双还要还花呗的鞋。明年建议全职做个废物。",
    "虽然我也很穷，但没想到你比我还穷。系统建议：重开吧。"
  ],
  D: [
    "系统检测到你的命格过于离谱，CPU已烧毁。这破班你是怎么上得下去的？",
    "身价 250。多一分浪费，少一分不配。你是懂数值平衡的。",
    "警告：您的账户余额不足以支付本次估值费用，请倒贴系统 5 毛。"
  ]
};

export const LUCKY_ITEMS = [
    "红塑料袋 (用来装空气)", "前任的眼泪", "老板的饼", "彩票站门口的土", "发光的键盘", 
    "马蹄铁", "防脱发洗发水", "辞职信草稿", "速效救心丸", "富婆通讯录"
];

// --- Viral Contract System Pools (Updated) ---
// 赛博契约专用文案

// 赢家条款（我是债权人，对方要履行的义务）
export const CONTRACT_WINNER_ITEMS = [
  "一杯奶茶 (¥20以上，少冰三分糖)", 
  "一顿深夜烧烤 (随叫随到，负责剥虾)", 
  "连续三天朋友圈点赞 (不得遗漏)", 
  "王者荣耀当辅助 (死保我，不许抢人头)", 
  "无理由彩虹屁 (夸够100字)",
  "发一个红包 (金额随意，态度要帅)"
];

// 输家条款（我是债务人，我要履行的义务）
export const CONTRACT_LOSER_SERVICES = [
  "专属夸夸群群主 (仅夸对方，全天候)", 
  "人肉闹钟 (负责叫早，不许发火)", 
  "情绪垃圾桶 (只许听不许杠)", 
  "备用钱包 (虽然经常是空的，但态度要端正)",
  "代喝奶茶 (我胖你瘦，这苦我吃)",
  "一日御用司机/跟班 (负责拎包)"
];

// 众筹海报文案
export const REVIVAL_POSTER_TITLE = "翻身银行急报：穷鬼预警";
export const REVIVAL_POSTER_COPY = "我被系统判定为“穷鬼”！\n哪位好心人点一下帮我加点身价？\n每点一下，我身价涨 ¥100万！";

// --- 翻身银行流水数据 ---
export const BANK_TRANSACTIONS = [
    { id: 'b-1', time: '刚刚', type: '转账入款', name: '财神爷', amount: 66666.00, remark: '马年开工利是，拿去花！', status: '交易成功' },
    { id: 'b-2', time: '05-20', type: '工资收入', name: '翻身银行财务', amount: 3500.00, remark: '精神损失费（窝囊费）', status: '交易成功' },
    { id: 'b-3', time: '03-15', type: '奖金', name: '翻身银行财务', amount: 100000.00, remark: '颜值溢价补贴。', status: '交易成功' },
    { id: 'b-4', time: '01-01', type: '理财收益', name: '吗喽基金', amount: 503559.00, remark: '咸鱼翻身，暴富启动。', status: '交易成功' }
];

// --- 新增：赛博固定资产内容池 ---
export const FIXED_ASSET_POOL = [
  { type: 'body', name: '头顶野生保护区', amount: '326 根', trend: 'down', valuation: '无价之宝', comment: '每一根都值得你用命去守护。建议减少熬夜。' },
  { type: 'emotion', name: '备胎养殖基地', amount: '0 人', trend: 'flat', valuation: '¥ 0.00', comment: '凭实力单身，无需缴纳‘恋爱智商税’。稳健！' },
  { type: 'work', name: '陈年大饼 (老板画)', amount: '500 吨', trend: 'up', valuation: '负资产', comment: '消化不良，建议在 2026 年全部吐出来。' },
  { type: 'virtual', name: '各大视频网站会员', amount: '借来的 5 个', trend: 'explode', valuation: '随时被顶号', comment: '你是懂白嫖的，这是你最稳定的快乐源泉。' },
  { type: 'work', name: '顶级退堂鼓', amount: '一级演奏家', trend: 'up', valuation: '保命神器', comment: '遇到困难睡大觉，不仅有效还能美容。' },
  { type: 'emotion', name: '焦虑收纳箱', amount: '爆满', trend: 'explode', valuation: '危险品', comment: '建议定期清理，或者直接发疯丢给别人。' }
];

// --- 新增：人生概念股内容池 ---
export const STOCK_POOL = [
  { name: '发际线科技', code: '996', pnl: '-100%', isUp: false, status: '跌停', comment: '绿得让人发慌，建议通过植发进行资产重组。' },
  { name: '摸鱼实业', code: '666', pnl: '+200%', isUp: true, status: '涨停', comment: '带薪拉屎时长创新高，击败了 99% 的同事。' },
  { name: '纯爱精工', code: '520', pnl: '---', isUp: true, status: '停牌重组', comment: '智者不入爱河，建设美丽祖国。明智的操作！' },
  { name: '暴富能源', code: '888', pnl: '+∞%', isUp: true, status: '妖股起飞', comment: '虽然没本金，但梦想一定要有。万一呢？' },
  { name: '熬夜生物', code: '007', pnl: '-50%', isUp: false, status: '技术性调整', comment: '用最贵的眼霜，熬最晚的夜。主打一个倔强。' },
  { name: '口嗨动力', code: '250', pnl: '+0%', isUp: true, status: '横盘震荡', comment: '思想上的巨人，行动上的矮子。' }
];

// --- 新增：人品信用分规则 ---
export const CREDIT_LEVELS = [
  { min: 0, max: 499, level: '画饼欺诈犯', reasons: ['多次发誓“今晚早睡”但从未执行', '办了健身卡只去洗澡', '说“下次一定”次数过多'] },
  { min: 500, max: 699, level: '嘴强王者', reasons: ['虽然口嗨要辞职，但身体很诚实地打卡', '收藏了800个教程一个没看', '间歇性踌躇满志，持续性混吃等死'] },
  { min: 700, max: 899, level: '绝世大冤种', reasons: ['朋友借钱从来不好意思催还', '你是懂“吃亏是福”的', '加班从来不记得申请调休'] },
  { min: 900, max: 1000, level: '天选欧皇', reasons: ['转发锦鲤从来不落空', '走路都能捡到钱', '系统判定你就是天命之子'] }
];