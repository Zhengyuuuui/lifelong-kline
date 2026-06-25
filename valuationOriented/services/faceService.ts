
import { AnalysisTag, FaceFeatures, RadarStats, ValuationResult, Ingredient, ValuationAnchor, CreatorNote, MarketAdvice, ExpansionPack, UpgradeData, ExpansionAttribute, PrivilegeItem } from '../types';
import { GoogleGenAI, Schema, Type } from "../../services/geminiProxyClient";

// --- MOCK DATA CONSTANTS (FALLBACK) ---
// Original Comments (Kept as requested)
const WEALTH_COMMENTS_HIGH = [
  "这张脸建议立刻投保，它是行走的一线城市首付。",
  "面部折叠度极高，每一道褶子里都藏着金条。",
  "天庭饱满，地阁方圆，典型的老天爷赏饭吃。",
  "财帛宫光气润泽，近期必有横财进账。"
];

const WEALTH_COMMENTS_LOW = [
  "这张脸... 怎么说呢，长得很省钱，看起来没什么欲望。",
  "五行缺金，眉眼间透着一股清澈的贫穷。",
  "建议多喝水，毕竟这是你目前唯一能负担得起的养生。",
  "虽然没钱，但你长得很有骨气，这也是一种财富（吧？）。"
];

const SOUL_ANIMALS = ["吞金兽", "招财猫", "深山灵狐", "咸鱼(王)", "高傲天鹅", "卷王蜜蜂", "哈士奇"];
const LUCKY_ITEMS = ["买彩票", "表白", "加班", "喝奶茶", "躺平", "发朋友圈"];
const UNLUCKY_ITEMS = ["借钱", "前任", "看股票", "早起", "立Flag", "减肥"];

// 1. Ingredients Templates
const INGREDIENT_TEMPLATES = [
    [ // Stupid/Pure
        { name: "清澈的愚蠢", min: 50, max: 80 },
        { name: "没挨过毒打", min: 20, max: 40 },
        { name: "容易被骗", min: 10, max: 30 }
    ],
    [ // Scumbag
        { name: "深情(装的)", min: 40, max: 60 },
        { name: "鱼塘管理", min: 30, max: 50 },
        { name: "借钱不还", min: 5, max: 20 }
    ],
    [ // Worker
        { name: "班味儿", min: 70, max: 95 },
        { name: "咖啡因腌制", min: 10, max: 30 },
        { name: "想死的心", min: 5, max: 50 }
    ],
    [ // Rich
        { name: "人民币味", min: 60, max: 90 },
        { name: "智商税收割", min: 10, max: 30 },
        { name: "也就是玩玩", min: 10, max: 20 }
    ],
    [ // Meme
        { name: "哈基米", min: 40, max: 60 },
        { name: "吗喽", min: 40, max: 60 },
        { name: "进化未完全", min: 1, max: 10 }
    ]
];

// 2. Nuwa Logic
const NUWA_NOTES = {
    HIGH: [
        { title: "精雕细琢款", content: "女娲：这是我的毕业设计，得用最好的泥，捏7天7夜，不能手抖。" },
        { title: "甚至吻过款", content: "女娲：这个捏得太完美了，忍不住亲了一口（导致脸有点太迷人）。" }
    ],
    MID: [
        { title: "标准流水线", content: "女娲：今日KPI已达标，这个就按标准模板复制粘贴吧。" },
        { title: "心情不错款", content: "女娲：那天天气不错，随手捏了个看起来顺眼的。" }
    ],
    LOW: [
        { title: "随意甩泥款", content: "女娲：下班了下班了，这把泥随便甩甩得了……哎呀甩墙上了，算了就这样吧。" },
        { title: "AI幻觉款", content: "女娲：服务器卡了，五官加载错误，出现了未知的抽象艺术风格。" }
    ]
};

// 3. Market Advice
const MARKET_ADVICE = [
    { action: 'HOLD', title: '长期持有', reason: '越看越耐看，属于“养老保险型”长相。' },
    { action: 'SELL', title: '立刻做空', reason: '颜值巅峰已过，发际线正在撤退，建议趁现在还能看，赶紧谈个恋爱。' },
    { action: 'ANGEL', title: '寻找天使投资', reason: '这是一个潜力股，急需一位富婆/大款注入资金进行“重组”（整容/医美）。' }
] as const;

// 4. Expansion Pack Pools
const EXPANSION_POOLS = {
    CAREER: {
        HIGH: ["纳斯达克敲钟人", "如果不努力就要回家继承家产", "豪门恶毒女配/男配", "行走的热搜"],
        MID: ["专业背锅侠", "PPT 雕花大师", "公司茶水间八卦会长", "周一综合症晚期患者"],
        LOW: ["国家一级退堂鼓表演艺术家", "全职儿女", "村口情报中心主任", "空气炸锅鉴赏家"],
        ABSTRACT: ["吗喽大统领", "该省省该花花践行者", "赛博木鱼敲击者", "麦当劳门徒"]
    },
    ARTIFACT: {
        LUXURY: ["无限额度黑卡", "喜马拉雅空气罐", "前任的悔过书", "免死金牌", "迈巴赫车钥匙", "汤臣一品门禁卡"],
        SURVIVAL: ["速效救心丸", "防脱发洗发水", "冰美式 (加浓)", "颈椎按摩仪", "美团外卖会员卡"],
        MEME: ["洞洞鞋", "红塑料袋 (装气质)", "电子木鱼", "烂尾楼购房合同", "空气炸锅"]
    },
    HABITAT: [
        "上海安福路 (路口)",
        "深圳科兴科学园 (凌晨3点)",
        "王者峡谷 (草丛)",
        "某鱼塘 (深水区)",
        "天桥底下 (坐北朝南)",
        "精神病院 (VIP房)",
        "云南某不知名大山"
    ],
    BUGS: [
        "Fix: '智商太高' -> Result: '系统内存溢出，导致发际线后移'",
        "Fix: '过于贫穷' -> Result: '修复失败，硬件配置不支持'",
        "Fix: '性格太软' -> Result: '已自动安装 `发疯模块` v2.0'",
        "Fix: '单身太久' -> Result: '误将 `路边的狗` 识别为 `心动对象`'",
        "Fix: '看见帅哥走不动' -> Result: '恋爱脑占用内存过高'",
        "Fix: '想上班' -> Result: '检测到病毒，已自动查杀'"
    ],
    // New Visual Pools
    COLORS: ["赛博粉", "五彩斑斓的黑", "原谅绿", "土豪金", "焦虑蓝", "网抑云灰"],
    DIRECTIONS: ["躺平方向", "老板看不到的地方", "财神爷怀里", "被窝里", "风口浪尖"],
    ENERGY: ["冰美式 (加浓)", "八卦", "画的大饼", "薪水到账提醒", "奶茶三分糖", "带薪拉屎"]
};

// --- HELPER FUNCTIONS ---

const formatBigNumber = (val: number): string => {
    if (val >= 100000000) {
        return `¥ ${(val / 100000000).toFixed(2)}亿`;
    }
    return val.toLocaleString('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        minimumFractionDigits: 2
    });
};

const generateExpansion = (score: number): ExpansionPack => {
    let careerPool = EXPANSION_POOLS.CAREER.MID;
    if (score > 10000000) careerPool = EXPANSION_POOLS.CAREER.HIGH;
    else if (score > 5000) careerPool = EXPANSION_POOLS.CAREER.MID;
    else if (score > 0) careerPool = EXPANSION_POOLS.CAREER.LOW;
    else careerPool = EXPANSION_POOLS.CAREER.ABSTRACT;

    const artifactTypes = ['LUXURY', 'SURVIVAL', 'MEME'] as const;
    const selectedArtifactType = artifactTypes[Math.floor(Math.random() * artifactTypes.length)];
    const artifactPool = EXPANSION_POOLS.ARTIFACT[selectedArtifactType];

    const career = careerPool[Math.floor(Math.random() * careerPool.length)];
    const artifact = artifactPool[Math.floor(Math.random() * artifactPool.length)];
    const habitat = EXPANSION_POOLS.HABITAT[Math.floor(Math.random() * EXPANSION_POOLS.HABITAT.length)];
    const bug = EXPANSION_POOLS.BUGS[Math.floor(Math.random() * EXPANSION_POOLS.BUGS.length)];

    const isRareCombination = (career.includes("吗喽") && artifact.includes("洞洞鞋")) || (career.includes("PPT") && artifact.includes("冰美式"));

    const attributes: ExpansionAttribute[] = [
        { label: "精神状态", value: Math.floor(Math.random() * 80) + 10, color: "bg-red-500" },
        { label: "抗压能力", value: Math.floor(Math.random() * 90), color: "bg-blue-500" },
        { label: "摸鱼技巧", value: Math.floor(Math.random() * 50) + 50, color: "bg-green-500" },
        { label: "发疯指数", value: Math.floor(Math.random() * 100), color: "bg-purple-500" }
    ];

    return {
        defaultCareer: career,
        soulArtifact: artifact,
        bestHabitat: habitat,
        patchNote: bug,
        isRareCombination,
        attributes,
        luckyColor: EXPANSION_POOLS.COLORS[Math.floor(Math.random() * EXPANSION_POOLS.COLORS.length)],
        luckyDirection: EXPANSION_POOLS.DIRECTIONS[Math.floor(Math.random() * EXPANSION_POOLS.DIRECTIONS.length)],
        energySource: EXPANSION_POOLS.ENERGY[Math.floor(Math.random() * EXPANSION_POOLS.ENERGY.length)],
        socialBattery: Math.floor(Math.random() * 100)
    };
};

// --- MOCK ANALYSIS (Fallback) ---
export const analyzeFaceMock = async (): Promise<ValuationResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Basic random stats
      const noseRatio = 0.12 + Math.random() * 0.1;
      const foreheadRatio = 0.25 + Math.random() * 0.15;
      const symmetryScore = 0.8 + Math.random() * 0.2;

      const features: FaceFeatures = { noseRatio, foreheadRatio, symmetryScore };

      // 1. Calculate Score
      let baseScore = 10000;
      if (noseRatio > 0.18) baseScore *= 8;
      if (foreheadRatio > 0.3) baseScore *= 5;
      baseScore *= symmetryScore;
      const randomFactor = (Math.random() * 0.8) + 0.6;
      let finalValue = Math.floor(baseScore * randomFactor);

      // Force high/low scenarios for demo variety
      const scenario = Math.random();
      if (scenario < 0.2) finalValue = 9800000000; // S Tier
      else if (scenario < 0.4) finalValue = 88000000; // A Tier
      else if (scenario < 0.6) finalValue = 3500; // C Tier
      else if (scenario < 0.8) finalValue = 9.9; // X Tier
      else finalValue = -50000; // Negative

      // 2. Generate Tags (Existing logic)
      const tags: AnalysisTag[] = [];
      if (noseRatio > 0.17) tags.push({ name: "悬胆鼻", grade: 'S', description: "守财Max，只进不出。" });
      else if (noseRatio < 0.14) tags.push({ name: "孤峰鼻", grade: 'C', description: "财气难聚，建议理财。" });
      else tags.push({ name: "截筒鼻", grade: 'A', description: "中规中矩，小康之相。" });
      
      const memeTags = [
         { name: "招风耳", grade: 'B' as const, description: "漏财风险，别带钱包。" },
         { name: "覆舟嘴", grade: 'C' as const, description: "怼人Pro，气走财神。" },
         { name: "桃花眼", grade: 'A' as const, description: "人缘极好，因情破财。" }
      ];
      tags.push(memeTags[Math.floor(Math.random() * memeTags.length)]);

      // 3. Comment & Formatting (Existing Logic)
      let comment = "";
      if (finalValue < 500) comment = WEALTH_COMMENTS_LOW[Math.floor(Math.random() * WEALTH_COMMENTS_LOW.length)];
      else comment = WEALTH_COMMENTS_HIGH[Math.floor(Math.random() * WEALTH_COMMENTS_HIGH.length)];

      const formattedValue = formatBigNumber(finalValue);

      // 4. Radar (Existing Logic)
      const radar: RadarStats = {
        wealth: Math.min(100, Math.floor(Math.random() * 100)),
        charm: Math.min(100, Math.floor(Math.random() * 100)),
        wisdom: Math.min(100, Math.floor(Math.random() * 100)),
        luck: Math.min(100, Math.floor(Math.random() * 100)),
        prestige: Math.min(100, Math.floor(Math.random() * 100)),
      };

      // --- NEW LOGIC IMPLEMENTATION ---

      // A. Anchors
      let anchor: ValuationAnchor = { text: "≈ 未知资产", comment: "系统无法识别" };
      if (finalValue > 1000000000) {
          anchor = { text: "≈ 3座汤臣一品 + 10辆法拉利", comment: "这张脸的安保费用，建议按国宝级配置。" };
      } else if (finalValue > 10000000) {
          anchor = { text: "≈ 一家A轮融资的独角兽公司", comment: "不仅长得贵，还长得对。有效长相的教科书。" };
      } else if (finalValue > 10000) {
          anchor = { text: "≈ 县城一套房", comment: "比上不足比下有余，稳稳的幸福。" };
      } else if (finalValue > 1000) {
          anchor = { text: "≈ 一台二手iPhone 11", comment: "主打一个‘重在参与’。脸是好脸，就是有点随意。" };
      } else if (finalValue > 0) {
          anchor = { text: "≈ 拼多多5斤红薯 (包邮)", comment: "由于长相过于抽象，系统无法估值，建议挂咸鱼试试。" };
      } else {
          anchor = { text: "≈ 需倒贴彩礼", comment: "这张脸长得太‘刑’了，看着像背了3个亿的债。" };
      }

      // B. Ingredients
      const templateIndex = Math.floor(Math.random() * INGREDIENT_TEMPLATES.length);
      const selectedTemplate = INGREDIENT_TEMPLATES[templateIndex];
      const ingredients: Ingredient[] = selectedTemplate.map(t => ({
          name: t.name,
          percentage: Math.floor(Math.random() * (t.max - t.min + 1)) + t.min
      }));

      // C. Creator Note
      let creatorNote: CreatorNote;
      if (finalValue > 50000000) {
          creatorNote = NUWA_NOTES.HIGH[Math.floor(Math.random() * NUWA_NOTES.HIGH.length)];
      } else if (finalValue > 5000) {
          creatorNote = NUWA_NOTES.MID[Math.floor(Math.random() * NUWA_NOTES.MID.length)];
      } else {
          creatorNote = NUWA_NOTES.LOW[Math.floor(Math.random() * NUWA_NOTES.LOW.length)];
      }

      // D. Market Advice
      const marketAdvice = MARKET_ADVICE[Math.floor(Math.random() * MARKET_ADVICE.length)];

      // E. Expansion Pack
      const expansion = generateExpansion(finalValue);

      resolve({
        score: finalValue,
        formattedValue,
        features,
        tags,
        comment,
        isUpgraded: false,
        radar,
        soulAnimal: SOUL_ANIMALS[Math.floor(Math.random() * SOUL_ANIMALS.length)],
        luckyItem: LUCKY_ITEMS[Math.floor(Math.random() * LUCKY_ITEMS.length)],
        unluckyItem: UNLUCKY_ITEMS[Math.floor(Math.random() * UNLUCKY_ITEMS.length)],
        anchor,
        ingredients,
        creatorNote,
        marketAdvice,
        expansion
      });
    }, 1500);
  });
};

// --- REAL GEMINI AI ANALYSIS ---

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    baseScore: { type: Type.NUMBER, description: "A numeric score of the face from -100 to 10000000000 based on 'wealth potential'." },
    comment: { type: Type.STRING, description: "A witty, slightly roasting or extremely complimentary comment about the face's wealth potential." },
    anchorText: { type: Type.STRING, description: "A funny equivalent value (e.g. '3 Ferraris' or '1 Potato')." },
    anchorComment: { type: Type.STRING, description: "A short comment explaining the anchor value." },
    tags: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          grade: { type: Type.STRING, enum: ['S', 'A', 'B', 'C'] },
          description: { type: Type.STRING }
        }
      }
    },
    radar: {
      type: Type.OBJECT,
      properties: {
        wealth: { type: Type.NUMBER },
        charm: { type: Type.NUMBER },
        wisdom: { type: Type.NUMBER },
        luck: { type: Type.NUMBER },
        prestige: { type: Type.NUMBER }
      }
    },
    soulAnimal: { type: Type.STRING },
    luckyItem: { type: Type.STRING },
    unluckyItem: { type: Type.STRING },
    ingredients: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          percentage: { type: Type.NUMBER }
        }
      }
    },
    creatorNoteTitle: { type: Type.STRING, description: "Title of Nuwa's creation note." },
    creatorNoteContent: { type: Type.STRING, description: "Content of Nuwa's creation note." },
    marketAdvice: {
       type: Type.OBJECT,
       properties: {
           action: { type: Type.STRING, enum: ['BUY', 'SELL', 'HOLD', 'ANGEL'] },
           title: { type: Type.STRING },
           reason: { type: Type.STRING }
       }
    }
  },
  required: ["baseScore", "comment", "anchorText", "anchorComment", "tags", "radar", "soulAnimal", "luckyItem", "unluckyItem", "ingredients", "creatorNoteTitle", "creatorNoteContent", "marketAdvice"]
};

export const analyzeFaceWithGemini = async (base64Image: string): Promise<ValuationResult> => {
    try {
        const ai = new GoogleGenAI({});
        
        // Extract mimeType and clean base64 string
        const match = base64Image.match(/^data:(image\/(png|jpeg|jpg|webp));base64,/);
        const mimeType = match ? match[1] : 'image/jpeg';
        const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: cleanBase64
                        }
                    },
                    {
                        text: `You are a "Cyberpunk Mianxiang (Face Reading) Master". Analyze this face for a wealth & asset valuation app. 
                        
                        Role: Sharp-tongued, humorous, pop-culture savvy, mixes ancient Chinese metaphysics with cyber-slang.
                        Task: Estimate the "monetary value" of this face based on symmetry, nose (wealth palace), and forehead.
                        
                        Tone: 
                        - If the face looks great/symmetrical: Be poetic, overly complimentary, compare to billionaires.
                        - If the face is average/funny: Be wittily roasting, compare to cheap items, but keep it lighthearted (no insults, just "roast").
                        
                        Output Requirements:
                        - JSON Format only.
                        - Language: Simplified Chinese (zh-CN) ONLY. No English allowed.
                        - Generate 3-4 specific facial feature tags (e.g., "Rich Nose", "Peach Eyes").
                        - Ingredients should be abstract concepts summing to 100% (e.g. "30% Caffeine", "20% Dreams").
                        `
                    }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: analysisSchema,
                temperature: 0.8 // High creativity for humor
            }
        });

        const jsonText = response.text;
        if (!jsonText) throw new Error("Empty response from AI");

        const aiData = JSON.parse(jsonText);

        // Map AI data to Application Interface
        const features: FaceFeatures = {
             noseRatio: 0.15, // AI doesn't return geometry, use generic valid values
             foreheadRatio: 0.3, 
             symmetryScore: 0.9 
        };

        const formattedValue = formatBigNumber(aiData.baseScore);
        
        // Generate deterministic expansion locally to save tokens/latency, or use AI data if we added it to schema.
        // Here we use the local generator based on the AI's score for consistency with the game logic.
        const expansion = generateExpansion(aiData.baseScore);

        return {
            score: aiData.baseScore,
            formattedValue: formattedValue,
            features: features,
            tags: aiData.tags,
            comment: aiData.comment,
            isUpgraded: false,
            radar: aiData.radar,
            soulAnimal: aiData.soulAnimal,
            luckyItem: aiData.luckyItem,
            unluckyItem: aiData.unluckyItem,
            anchor: {
                text: aiData.anchorText,
                comment: aiData.anchorComment
            },
            ingredients: aiData.ingredients,
            creatorNote: {
                title: aiData.creatorNoteTitle,
                content: aiData.creatorNoteContent
            },
            marketAdvice: aiData.marketAdvice,
            expansion: expansion
        };

    } catch (error) {
        if (JSON.stringify(error).includes("429") || error?.status === 429) { console.warn("Gemini API Quota Error:", error); } else { console.error("Gemini API Error:", error); }
        // Fallback to mock if AI fails (e.g. safety filter, quota, net error)
        return analyzeFaceMock();
    }
};

export const upgradeFate = async (originalResult: ValuationResult): Promise<ValuationResult> => {
    return new Promise((resolve) => {
        setTimeout(() => {
             const newScore = 9999999999.00;
             const privileges: PrivilegeItem[] = [
                 { id: "p1", icon: 'Zap', name: "水逆退散", description: "自动屏蔽方圆5公里内的倒霉事，不仅防小人，还防前任。" },
                 { id: "p2", icon: 'Eye', name: "洞察之眼", description: "直视老板画的大饼本质，自动将其转化为空气。" },
                 { id: "p3", icon: 'Infinity', name: "无限额度", description: "梦境世界专属黑卡，想买什么买什么（醒后失效）。" },
                 { id: "p4", icon: 'Heart', name: "正缘磁场", description: "烂桃花退散，只吸引那些带着钱来爱你的高质量人类。" }
             ];

             const upgradeData: UpgradeData = {
                 newScore: newScore,
                 newFormattedValue: formatBigNumber(newScore),
                 title: "钞能力完全体",
                 sponsors: [
                     { name: "王校长", amount: "5000万", title: "首席撒币官", avatarColor: "bg-blue-500" },
                     { name: "富婆通讯录", amount: "8000万", title: "圆梦合伙人", avatarColor: "bg-pink-500" },
                     { name: "榜一大哥", amount: "1.2亿", title: "全村的希望", avatarColor: "bg-amber-500" }
                 ],
                 composition: {
                     originalText: "90% 穷酸 + 10% 倔强",
                     tech: 50,
                     hardcore: 49,
                     money: 1
                 },
                 hackLog: [
                     "> Injecting Friend_Luck.exe... Success.",
                     "> Deleting Poverty_Gene.dll... Success.",
                     "> Overclocking Face_Value... 400,000,000% Boost.",
                     "> Result: Destiny Hacked."
                 ],
                 stockSymbol: `GOD.${Math.floor(Math.random() * 900) + 100}`,
                 marketCap: "9,999 兆",
                 privileges,
                 divineQuote: "凡人看脸，神看估值。现在，你就是规则。"
             };

             resolve({
                ...originalResult,
                isUpgraded: true,
                upgradeData: upgradeData,
            });
        }, 1000); 
    });
}
