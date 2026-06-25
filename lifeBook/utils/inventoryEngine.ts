

import { ElementType, InventoryItem, DailyRecommendation, ItemRarity, EquipmentSlot } from '../types';

// --- CONFIGURATION & DATABASE (I18N SUPPORT) ---
// Simple translation map for the hardcoded keywords
const I18N_DB: Record<string, Record<string, string>> = {
    'zh': {
        // Colors
        '墨绿': '墨绿', '青葱': '青葱', '藏蓝': '藏蓝', '薄荷绿': '薄荷绿', '橄榄': '橄榄', '苔藓': '苔藓',
        '绯红': '绯红', '紫罗兰': '紫罗兰', '脏粉': '脏粉', '赤金': '赤金', '日落橘': '日落橘', '勃艮第红': '勃艮第红',
        // Items
        '连帽卫衣': '连帽卫衣', '丝绸衬衫': '丝绸衬衫', '机能马甲': '机能马甲', '羊绒大衣': '羊绒大衣',
        '冰美式': '冰美式', '麻辣小龙虾': '麻辣小龙虾', '重庆老火锅': '重庆老火锅',
        // Styles
        '街头': '街头', '复古': '复古', '机能': '机能', '老钱': '老钱', '休闲': '休闲', '商务': '商务'
    },
    'en': {
        // Colors
        '墨绿': 'Dark Green', '青葱': 'Scallion Green', '藏蓝': 'Navy', '薄荷绿': 'Mint', '橄榄': 'Olive', '苔藓': 'Moss',
        '绯红': 'Crimson', '紫罗兰': 'Violet', '脏粉': 'Dusty Pink', '赤金': 'Red Gold', '日落橘': 'Sunset', '勃艮第红': 'Burgundy',
        '卡其': 'Khaki', '驼色': 'Camel', '焦糖': 'Caramel', '米白': 'Beige', '陶土': 'Clay', '岩灰': 'Slate',
        '钛银': 'Titanium', '纯白': 'White', '深灰': 'Dark Grey', '香槟': 'Champagne', '冷钢': 'Steel', '珍珠白': 'Pearl',
        '极夜黑': 'Midnight', '深海蓝': 'Deep Sea', '雾霾蓝': 'Haze Blue', '银灰': 'Silver', '克莱因蓝': 'Klein Blue', '墨色': 'Ink',
        // Items (Outfit)
        '连帽卫衣': 'Hoodie', '丝绸衬衫': 'Silk Shirt', '机能马甲': 'Tech Vest', '羊绒大衣': 'Cashmere Coat',
        '瑜伽服': 'Yoga Set', '丝绒睡袍': 'Velvet Robe', '丹宁夹克': 'Denim Jacket', '高领羊毛衫': 'Turtleneck',
        '廓形西装': 'Oversized Suit', '飞行员夹克': 'Bomber Jacket', '粗花呢外套': 'Tweed Jacket', '吊带黑裙': 'Slip Dress',
        '经典白衬衫': 'White Shirt', '工装连体裤': 'Boilersuit', '露背晚礼服': 'Backless Gown',
        // Items (Acc)
        '银色古巴链': 'Cuban Chain', '黑框眼镜': 'Black Glasses', '复古机械表': 'Mech Watch', '帆布托特包': 'Canvas Tote',
        '降噪耳机': 'ANC Headphones', '水晶手串': 'Crystal Bead', '棒球帽': 'Baseball Cap', '羊绒围巾': 'Cashmere Scarf',
        '钛钢戒指': 'Steel Ring', '珍珠项链': 'Pearl Necklace',
        // Food
        '轻食波奇饭': 'Poke Bowl', '麻辣小龙虾': 'Spicy Crayfish', '广式花胶鸡': 'Fish Maw Chicken', '重庆老火锅': 'Spicy Hotpot',
        '日式寿喜烧': 'Sukiyaki', '美式酸黄瓜三明治': 'Pickle Sandwich', '泰式冬阴功': 'Tom Yum', '手冲瑰夏': 'Geisha Pour-over',
        // Drink
        '冰美式': 'Iced Americano', '鸭屎香柠檬茶': 'Lemon Tea', '热红酒': 'Mulled Wine', '生椰拿铁': 'Coconut Latte',
        '依云矿泉水': 'Evian', '锡兰红茶': 'Ceylon Tea', '青汁': 'Green Juice', '威士忌酸': 'Whiskey Sour',
        // Flavors
        '青柠': 'Lime', '抹茶': 'Matcha', '陈醋': 'Vinegar', '蔬菜': 'Veggie', '香菜': 'Coriander', '奇异果': 'Kiwi',
        '变态辣': 'Super Spicy', '意式浓缩': 'Espresso', '姜撞奶': 'Ginger Milk', '红油': 'Chili Oil', '黑胡椒': 'Pepper',
        '海盐芝士': 'Salted Cheese', '全麦': 'Whole Wheat', '红薯': 'Sweet Potato', '板栗': 'Chestnut', '芋泥': 'Taro', '花生酱': 'Peanut Butter',
        '薄荷': 'Mint', '芥末': 'Wasabi', '气泡水': 'Sparkling', '法棍': 'Baguette', '白兰地': 'Brandy', '冰糖': 'Rock Candy',
        '海盐': 'Sea Salt', '冰镇': 'Iced', '清汤': 'Clear Soup', '鱼子酱': 'Caviar', '海鲜': 'Seafood', '黑咖': 'Black Coffee',
        // Styles/Tags
        '街头': 'Street', '复古': 'Vintage', '机能': 'Techwear', '老钱': 'Old Money', '运动': 'Sporty', '慵懒': 'Lazy',
        '工装': 'Workwear', '禁欲': 'Ascetic', '极简': 'Minimal', '硬汉': 'Tough', '小香风': 'Chanel Style', '性感': 'Sexy',
        '经典': 'Classic', '潮流': 'Trendy', '奢华': 'Luxury', '金属': 'Metal', '智性': 'Smart', '时间': 'Time', '实用': 'Utility',
        '隔绝': 'Isolate', '玄学': 'Mystic', '低调': 'Lowkey', '温暖': 'Warm', '冷酷': 'Cool', '优雅': 'Elegant',
        '清淡': 'Light', '冷': 'Cold', '辣': 'Spicy', '热': 'Hot', '咸': 'Salty', '甜': 'Sweet', '酸': 'Sour',
        '酸辣': 'Sour Spicy', '苦': 'Bitter', '液体': 'Liquid', '提神': 'Energy', '解腻': 'Fresh', '微醺': 'Tipsy',
        '丝滑': 'Silky', '纯净': 'Pure', '排毒': 'Detox', '情调': 'Vibe',
        '逛街': 'Shopping', '约会': 'Date', '通勤': 'Work', '居家': 'Home', '艳遇': 'Flirt'
    },
    'jp': {
        // Colors
        '墨绿': '深緑', '青葱': '葱緑', '藏蓝': '紺色', '薄荷绿': 'ミント', '橄榄': 'オリーブ', '苔藓': '苔色',
        '绯红': '深紅', '紫罗兰': 'スミレ色', '脏粉': 'くすみピンク', '赤金': '赤金', '日落橘': '夕日色', '勃艮第红': 'ワインレッド',
        '卡其': 'カーキ', '驼色': 'キャメル', '焦糖': 'キャラメル', '米白': 'オフホワイト', '陶土': 'テラコッタ', '岩灰': 'スレートグレー',
        '钛银': 'チタンシルバー', '纯白': '純白', '深灰': 'ダークグレー', '香槟': 'シャンパン', '冷钢': 'スチール', '珍珠白': 'パールホワイト',
        '极夜黑': 'ミッドナイト', '深海蓝': '深海青', '雾霾蓝': 'スモーキーブルー', '银灰': 'シルバーグレー', '克莱因蓝': 'クラインブルー', '墨色': '墨色',
        // Items (Outfit)
        '连帽卫衣': 'パーカー', '丝绸衬衫': 'シルクシャツ', '机能马甲': 'テックベスト', '羊绒大衣': 'カシミアコート',
        '瑜伽服': 'ヨガウェア', '丝绒睡袍': 'ベルベットガウン', '丹宁夹克': 'デニムジャケット', '高领羊毛衫': 'タートルネック',
        '廓形西装': 'オーバーサイズスーツ', '飞行员夹克': 'ボンバージャケット', '粗花呢外套': 'ツイードジャケット', '吊带黑裙': 'スリップドレス',
        '经典白衬衫': '白シャツ', '工装连体裤': 'ジャンプスーツ', '露背晚礼服': 'バックレスドレス',
        // Items (Acc)
        '银色古巴链': '喜平チェーン', '黑框眼镜': '黒縁メガネ', '复古机械表': '機械式時計', '帆布托特包': 'キャンバストート',
        '降噪耳机': 'ノイキャン箸', '水晶手串': 'クリスタル数珠', '棒球帽': 'キャップ', '羊绒围巾': 'カシミアマフラー',
        '钛钢戒指': 'チタンリング', '珍珠项链': 'パールネックレス',
        // Food
        '轻食波奇饭': 'ポキ丼', '麻辣小龙虾': 'ザリガニ麻辣炒め', '广式花胶鸡': '花膠鶏鍋', '重庆老火锅': '重慶火鍋',
        '日式寿喜烧': 'すき焼き', '美式酸黄瓜三明治': 'ピクルスサンド', '泰式冬阴功': 'トムヤムクン', '手冲瑰夏': 'ゲイシャコーヒー',
        // Drink
        '冰美式': 'アイスアメリカーノ', '鸭屎香柠檬茶': '鴨屎香レモンティー', '热红酒': 'ホットワイン', '生椰拿铁': 'ココナッツラテ',
        '依云矿泉水': 'エビアン', '锡兰红茶': 'セイロンティー', '青汁': '青汁', '威士忌酸': 'ウイスキーサワー',
        // Flavors
        '青柠': 'ライム', '抹茶': '抹茶', '陈醋': '黒酢', '蔬菜': '野菜', '香菜': 'パクチー', '奇异果': 'キウイ',
        '变态辣': '激辛', '意式浓缩': 'エスプレッソ', '姜撞奶': '生姜牛乳プリン', '红油': 'ラー油', '黑胡椒': '黒胡椒',
        '海盐芝士': '海塩チーズ', '全麦': '全粒粉', '红薯': 'さつまいも', '板栗': '栗', '芋泥': 'タロイモ', '花生酱': 'ピーナッツバター',
        '薄荷': 'ミント', '芥末': 'わさび', '气泡水': '炭酸水', '法棍': 'バゲット', '白兰地': 'ブランデー', '冰糖': '氷砂糖',
        '海盐': '海塩', '冰镇': 'アイス', '清汤': 'クリアスープ', '鱼子酱': 'キャビア', '海鲜': 'シーフード', '黑咖': 'ブラックコーヒー',
        // Styles/Tags
        '街头': 'ストリート', '复古': 'レトロ', '机能': 'テックウェア', '老钱': 'オールドマネー', '运动': 'スポーティー', '慵懒': 'ルーズ',
        '工装': 'ワークウェア', '禁欲': 'ストイック', '极简': 'ミニマル', '硬汉': 'タフ', '小香风': 'シャネル風', '性感': 'セクシー',
        '经典': 'クラシック', '潮流': 'トレンディ', '奢华': 'ラグジュアリー', '金属': 'メタル', '智性': 'インテリ', '时间': 'タイムレス', '实用': '実用的',
        '隔绝': '遮断', '玄学': 'オカルト', '低调': '控えめ', '温暖': 'ウォーム', '冷酷': 'クール', '优雅': 'エレガント',
        '清淡': 'あっさり', '冷': 'コールド', '辣': 'スパイシー', '热': 'ホット', '咸': '塩味', '甜': '甘い', '酸': '酸っぱい',
        '酸辣': '酸っぱ辛い', '苦': 'ビター', '液体': 'リキッド', '提神': 'エナジー', '解腻': 'さっぱり', '微醺': 'ほろ酔い',
        '丝滑': 'シルキー', '纯净': 'ピュア', '排毒': 'デトックス', '情调': 'ムード',
        '逛街': 'ショッピング', '约会': 'デート', '通勤': '通勤', '居家': 'ホーム', '艳遇': 'ナンパ待ち'
    }
};

const translate = (text: string, lang: string): string => {
    // FORCE CHINESE for all languages as per user request
    return text; 
};

export const ELEMENT_COLORS: Record<ElementType, string[]> = {
    [ElementType.Wood]: ['墨绿', '青葱', '藏蓝', '薄荷绿', '橄榄', '苔藓'],
    [ElementType.Fire]: ['绯红', '紫罗兰', '脏粉', '赤金', '日落橘', '勃艮第红'],
    [ElementType.Earth]: ['卡其', '驼色', '焦糖', '米白', '陶土', '岩灰'],
    [ElementType.Metal]: ['钛银', '纯白', '深灰', '香槟', '冷钢', '珍珠白'],
    [ElementType.Water]: ['极夜黑', '深海蓝', '雾霾蓝', '银灰', '克莱因蓝', '墨色']
};

export const ELEMENT_FLAVORS: Record<ElementType, string[]> = {
    [ElementType.Wood]: ['青柠', '抹茶', '陈醋', '蔬菜', '香菜', '奇异果'],
    [ElementType.Fire]: ['变态辣', '焦糖', '意式浓缩', '姜撞奶', '红油', '黑胡椒'],
    [ElementType.Earth]: ['海盐芝士', '全麦', '红薯', '板栗', '芋泥', '花生酱'],
    [ElementType.Metal]: ['薄荷', '芥末', '气泡水', '法棍', '白兰地', '冰糖'],
    [ElementType.Water]: ['海盐', '冰镇', '清汤', '鱼子酱', '海鲜', '黑咖']
};

// "God Equipment" Database for random generation - STRICTLY CHINESE
// Updated with 'styles' for occasion filtering
const OUTFIT_TEMPLATES = [
    { name: "连帽卫衣", tags: ['街头'], styles: ['休闲', '逛街', '微醺'] },
    { name: "丝绸衬衫", tags: ['复古'], styles: ['约会', '艳遇', '微醺', '商务'] },
    { name: "机能马甲", tags: ['机能'], styles: ['逛街', '休闲'] },
    { name: "羊绒大衣", tags: ['老钱'], styles: ['通勤', '商务', '约会'] },
    { name: "瑜伽服", tags: ['运动'], styles: ['休闲', '居家'] },
    { name: "丝绒睡袍", tags: ['慵懒'], styles: ['居家', '微醺', '艳遇'] },
    { name: "丹宁夹克", tags: ['工装'], styles: ['休闲', '逛街', '微醺'] },
    { name: "高领羊毛衫", tags: ['禁欲'], styles: ['通勤', '约会', '商务'] },
    { name: "廓形西装", tags: ['极简'], styles: ['通勤', '商务', '逛街', '约会'] },
    { name: "飞行员夹克", tags: ['硬汉'], styles: ['休闲', '逛街', '微醺'] },
    { name: "粗花呢外套", tags: ['小香风'], styles: ['约会', '商务', '逛街'] },
    { name: "吊带黑裙", tags: ['性感'], styles: ['艳遇', '约会', '微醺'] },
    { name: "经典白衬衫", tags: ['经典'], styles: ['通勤', '商务', '约会'] },
    { name: "工装连体裤", tags: ['潮流'], styles: ['逛街', '休闲'] },
    { name: "露背晚礼服", tags: ['奢华'], styles: ['艳遇', '商务'] }
];

const ACCESSORY_TEMPLATES = [
    { name: "银色古巴链", tags: ['金属'] },
    { name: "黑框眼镜", tags: ['智性'] },
    { name: "复古机械表", tags: ['时间'] },
    { name: "帆布托特包", tags: ['实用'] },
    { name: "降噪耳机", tags: ['隔绝'] },
    { name: "水晶手串", tags: ['玄学'] },
    { name: "棒球帽", tags: ['低调'] },
    { name: "羊绒围巾", tags: ['温暖'] },
    { name: "钛钢戒指", tags: ['冷酷'] },
    { name: "珍珠项链", tags: ['优雅'] }
];

const FOOD_TEMPLATES = [
    { name: "轻食波奇饭", tags: ['清淡', '冷'] },
    { name: "麻辣小龙虾", tags: ['辣', '热'] },
    { name: "广式花胶鸡", tags: ['咸', '热'] },
    { name: "重庆老火锅", tags: ['辣', '热'] },
    { name: "日式寿喜烧", tags: ['甜', '热'] },
    { name: "美式酸黄瓜三明治", tags: ['酸', '冷'] },
    { name: "泰式冬阴功", tags: ['酸辣', '热'] },
    { name: "手冲瑰夏", tags: ['苦', '液体'] }
];

const DRINK_TEMPLATES = [
    { name: "冰美式", tags: ['提神'] },
    { name: "鸭屎香柠檬茶", tags: ['解腻'] },
    { name: "热红酒", tags: ['微醺'] },
    { name: "生椰拿铁", tags: ['丝滑'] },
    { name: "依云矿泉水", tags: ['纯净'] },
    { name: "锡兰红茶", tags: ['经典'] },
    { name: "青汁", tags: ['排毒'] },
    { name: "威士忌酸", tags: ['情调'] }
];

// --- LOGIC: RECOMMENDATION ALGORITHM ---

export const getLowestElement = (levels: Record<ElementType, number>): { type: ElementType, value: number } => {
    let min = 101;
    let type = ElementType.Wood;
    
    if (levels === null || levels === undefined || typeof levels !== 'object') {
        return { type: ElementType.Wood, value: 50 };
    }

    Object.entries(levels || {}).forEach(([k, v]) => {
        if (typeof v === 'number' && v < min) {
            min = v;
            type = k as ElementType;
        }
    });
    return { type, value: min };
};

const getMotherElement = (target: ElementType): ElementType => {
    switch(target) {
        case ElementType.Wood: return ElementType.Water;
        case ElementType.Fire: return ElementType.Wood;
        case ElementType.Earth: return ElementType.Fire;
        case ElementType.Metal: return ElementType.Earth;
        case ElementType.Water: return ElementType.Metal;
    }
};

export const getRandomTagForElement = (type: ElementType, slot: EquipmentSlot): string => {
    const list = slot === 'outfit' ? ELEMENT_COLORS[type] : ELEMENT_FLAVORS[type];
    return list[Math.floor(Math.random() * list.length)];
};

export const getDailyRecommendation = (levels: Record<ElementType, number>, isInvalid?: boolean, language: string = 'zh'): DailyRecommendation => {
    // FORCE CHINESE
    language = 'zh';

    // ERROR STATE HANDLER
    if (isInvalid) {
        return {
            targetElement: ElementType.Metal,
            reason: "DATA_ERR",
            strategyName: "数据异常",
            suggestedOutfit: {
                id: 'err-outfit',
                slot: 'outfit',
                name: "空对象",
                subName: "材质丢失",
                rarity: 'C',
                effects: {},
                aiComment: "检测到非法用户数据，无法生成穿搭建议。",
                tags: ["ERROR"],
                styleTags: [],
                sticker: "ERR"
            },
            suggestedFood: {
                id: 'err-food',
                slot: 'food',
                name: "404 套餐",
                subName: "数据未找到",
                rarity: 'C',
                effects: {},
                aiComment: "输入数据不真实，无法匹配能量食谱。",
                tags: ["ERROR"],
                sticker: "404"
            }
        };
    }

    const lowest = getLowestElement(levels);
    const mother = getMotherElement(lowest.type);
    
    let strategyName = "";
    let outfitTag = getRandomTagForElement(lowest.type, 'outfit');
    let foodTag = getRandomTagForElement(lowest.type, 'food');
    let reason = "";
    
    // Logic based on Prompt Requirements (Chinese Base)
    // We will translate strategy name at the end
    const strategies: any = {
        [ElementType.Wood]: { name: "水生木", reason: "木属性极低：补足创造力" },
        [ElementType.Fire]: { name: "木生火", reason: "火属性极低：补足行动力" },
        [ElementType.Earth]: { name: "火生土", reason: "土属性极低：补足防御力" },
        [ElementType.Metal]: { name: "水-流动", reason: "金属性极低：补足财运" },
        [ElementType.Water]: { name: "金生水", reason: "水属性极低：补足情绪/蓝量" },
    }
    const strat = strategies[lowest.type];
    strategyName = strat.name;
    reason = strat.reason;
    
    // Translate Strategy/Reason if needed (Basic static map logic)
    // REMOVED ENGLISH LOGIC AS PER REQUEST

    const outfit = generateItem('outfit', outfitTag, lowest.type, mother, undefined, language);
    const food = generateItem('food', foodTag, lowest.type, mother, undefined, language);

    return {
        targetElement: lowest.type,
        reason,
        strategyName,
        suggestedOutfit: outfit,
        suggestedFood: food,
        strategyKey: lowest.type // Store key for reconstruction
    };
};

// --- HELPER: Translate Daily Recommendation ---
export const translateRecommendation = (rec: DailyRecommendation, language: string): DailyRecommendation => {
    // FORCE CHINESE
    return rec;
}


// --- LOGIC: ITEM GENERATOR ---

const getRandomRarity = (): ItemRarity => {
    const r = Math.random();
    if (r > 0.90) return 'SSR';
    if (r > 0.70) return 'SR';
    if (r > 0.40) return 'R';
    if (r > 0.15) return 'UC';
    return 'C';
};

const getEffects = (
    rarity: ItemRarity, 
    target: ElementType, 
    mother: ElementType
): Partial<Record<ElementType, number>> => {
    let multiplier = 1;
    switch(rarity) {
        case 'SSR': multiplier = 3.5; break;
        case 'SR': multiplier = 2.5; break;
        case 'R': multiplier = 1.5; break;
        case 'UC': multiplier = 1.2; break;
        case 'C': multiplier = 1; break;
    }
    return {
        [mother]: Math.floor((15 + Math.random() * 10) * multiplier),
        [target]: Math.floor((10 + Math.random() * 5) * multiplier),
        [getMotherElement(mother)]: -Math.floor(5 * multiplier)
    };
};

const getRichComment = (tag: string, target: ElementType, slot: EquipmentSlot, subItemName: string, occasion?: string, language: string = 'zh'): string => {
    // FORCE CHINESE
    const isZh = true;
    const isJp = false;
    
    // Generate context-aware rich text
    let actions = [];
    if (isZh) {
        actions = ["能够瞬间平衡你的磁场", "是今天绝对的能量开关", "让你在混乱中保持理智", "能有效阻挡烂桃花", "把流失的运气补回来"];
    } 
    
    const action = actions[Math.floor(Math.random() * actions.length)];

    if (slot === 'outfit') {
        if (isZh) {
             const occText = occasion ? `【${occasion}】场景` : "今日";
             return `${occText}穿搭逻辑：大面积的${tag}色${action}。搭配${subItemName}，能在视觉上形成能量闭环。不要在意别人的眼光，这套Look专为你今天的五行缺口定制。`;
        }
    } else {
        if (isZh) {
            return `今日食补方案：${tag}口味${action}。饭后一定要配${subItemName}，这是激活身体吸收效率的关键。建议点外卖时备注“加量”，今天的你消耗巨大。`;
        }
    }
    return ""; // Should not reach here
};

const getBrandHint = (slot: EquipmentSlot, tag: string, language: string = 'zh'): string => {
    // FORCE CHINESE
    const isZh = true;
    
    if (slot === 'outfit') {
        const brands = ["Uniqlo Basic", "Muji", "Nike Lab", "Vintage Shop", "Zara Studio", "Designer Brand"];
        if (isZh) {
            return `推荐来源：${brands[Math.floor(Math.random() * brands.length)]} 或衣柜底层`;
        }
    } else {
        if (isZh) {
            const apps = ["美团 · 高分榜", "饿了么 · 必吃榜", "楼下便利店", "公司食堂", "手作便当"];
            return `外卖建议：${apps[Math.floor(Math.random() * apps.length)]}，搜索关键词“${tag}”`;
        }
    }
    return "";
}

const getTextStampForItem = (name: string, tag: string, slot: EquipmentSlot): string => {
    const c = (name + tag).toLowerCase();
    if (c.includes('hoodie') || c.includes('卫衣') || c.includes('パーカー')) return '卫';
    if (c.includes('shirt') || c.includes('衬衫') || c.includes('シャツ')) return '衫';
    if (c.includes('dress') || c.includes('裙') || c.includes('ドレス')) return '裙';
    if (c.includes('shoe') || c.includes('boot') || c.includes('鞋') || c.includes('靴')) return '鞋';
    if (c.includes('coffee') || c.includes('咖') || c.includes('コーヒー')) return '饮';
    if (c.includes('noodles') || c.includes('面') || c.includes('麺')) return '面';
    if (c.includes('spicy') || c.includes('辣') || c.includes('辛')) return '辣';
    return slot === 'outfit' ? '装' : '餐';
};

export const generateItem = (
    slot: EquipmentSlot, 
    inputTag: string, 
    targetCtx?: ElementType, 
    motherCtx?: ElementType,
    fixedStyleTag?: string,
    language: string = 'zh'
): InventoryItem => {
    const rarity = getRandomRarity();
    let target = targetCtx || ElementType.Metal;
    let mother = motherCtx || ElementType.Earth;
    
    const effects = getEffects(rarity, target, mother);

    // 2. Select Main & Sub Items
    let name = "Unknown";
    let subName = "Unknown Acc";
    let chosenStyle = fixedStyleTag;
    let availableStyles: string[] = [];
    
    // Store source keys for re-translation
    let mainTemplateKey = "";
    let subTemplateKey = "";
    let styleKey = "";

    // Local translate helper
    const tr = (txt: string) => translate(txt, language);

    if (slot === 'outfit') {
        let templateList = OUTFIT_TEMPLATES;
        if (fixedStyleTag) {
            const filtered = OUTFIT_TEMPLATES.filter(t => t.styles.includes(fixedStyleTag));
            if (filtered.length > 0) templateList = filtered;
        }

        const t = templateList[Math.floor(Math.random() * templateList.length)];
        mainTemplateKey = t.name;

        // Translate styles for UI
        const styles = t.styles.map(s => tr(s));
        
        if (!chosenStyle) {
            chosenStyle = t.styles[Math.floor(Math.random() * t.styles.length)];
        }
        styleKey = chosenStyle!;
        
        // Translate chosen style for comment generation
        const chosenStyleTr = tr(chosenStyle);

        availableStyles = styles;
        const sub = ACCESSORY_TEMPLATES[Math.floor(Math.random() * ACCESSORY_TEMPLATES.length)];
        subTemplateKey = sub.name;
        
        // Translate Name Parts
        const tagTr = tr(inputTag);
        const nameTr = tr(t.name);
        const subNameTr = tr(sub.name);

        name = `${tagTr} · ${nameTr}`;
        subName = subNameTr;
        
        const comment = getRichComment(tagTr, target, slot, subNameTr, chosenStyleTr, language);
        const brandHint = getBrandHint(slot, tagTr, language);
        const sticker = getTextStampForItem(name, tagTr, slot);
        
        return {
            id: `item-${Date.now()}-${Math.random()}`,
            slot,
            name,
            subName,
            rarity,
            effects,
            aiComment: comment,
            brandHint,
            tags: [tagTr],
            styleTags: availableStyles,
            mainColor: tagTr,
            sticker,
            sourceKeys: {
                mainTag: inputTag,
                mainTemplate: mainTemplateKey,
                subTemplate: subTemplateKey,
                styleTag: styleKey
            }
        };
    } else {
        const t = FOOD_TEMPLATES[Math.floor(Math.random() * FOOD_TEMPLATES.length)];
        mainTemplateKey = t.name;
        const sub = DRINK_TEMPLATES[Math.floor(Math.random() * DRINK_TEMPLATES.length)];
        subTemplateKey = sub.name;
        
        const tagTr = tr(inputTag);
        const nameTr = tr(t.name);
        const subNameTr = tr(sub.name);

        const prefix = tagTr.length > 0 ? tagTr : "特制";
        name = `${prefix} · ${nameTr}`;
        subName = subNameTr;
        
        const comment = getRichComment(tagTr, target, slot, subNameTr, undefined, language);
        const brandHint = getBrandHint(slot, tagTr, language);
        const sticker = getTextStampForItem(name, tagTr, slot);

        return {
            id: `item-${Date.now()}-${Math.random()}`,
            slot,
            name,
            subName,
            rarity,
            effects,
            aiComment: comment,
            brandHint,
            tags: [tagTr],
            styleTags: [],
            mainColor: tagTr,
            sticker,
            sourceKeys: {
                mainTag: inputTag,
                mainTemplate: mainTemplateKey,
                subTemplate: subTemplateKey
            }
        };
    }
};

// --- HELPER: Reconstruct Item Text based on Language ---
export const translateItem = (item: InventoryItem, language: string): InventoryItem => {
    // If no source keys (legacy data), return as is
    if (!item.sourceKeys) return item;

    const { mainTag, mainTemplate, subTemplate, styleTag } = item.sourceKeys;
    const tr = (txt: string) => translate(txt, language);
    
    // Determine Target/Mother context from existing effects
    // We need to deduce the 'target' element to color comment correctly. 
    // Usually the highest positive effect is the target.
    let target = ElementType.Metal;
    let maxVal = -999;
    Object.entries(item.effects || {}).forEach(([k, v]) => {
        if ((v as number) > maxVal) {
            maxVal = v as number;
            target = k as ElementType;
        }
    });

    const tagTr = tr(mainTag);
    const mainTemplateTr = tr(mainTemplate);
    const subTemplateTr = tr(subTemplate);
    const styleTr = styleTag ? tr(styleTag) : undefined;

    let newName = "";
    
    if (item.slot === 'outfit') {
        newName = `${tagTr} · ${mainTemplateTr}`;
    } else {
        const prefix = tagTr.length > 0 ? tagTr : "特制";
        newName = `${prefix} · ${mainTemplateTr}`;
    }

    const newComment = getRichComment(tagTr, target, item.slot, subTemplateTr, styleTr, language);
    const newBrandHint = getBrandHint(item.slot, tagTr, language);
    
    // Re-translate available styles if outfit
    let newStyleTags = item.styleTags;
    if (item.slot === 'outfit' && styleTag) {
        // We don't have the original list of all styles in sourceKeys, so we can only translate the current ones
        // But since we store styleTags as already translated strings in the original object, we might lose the original keys.
        // Ideally we should have stored source keys for styleTags too.
        // For now, let's just use the single chosen style tag if available or keep existing if we can't map back.
        // Improvement: We can look up the template again to get all styles?
        const t = OUTFIT_TEMPLATES.find(t => t.name === mainTemplate);
        if (t) {
            newStyleTags = t.styles.map(s => tr(s));
        }
    }

    return {
        ...item,
        name: newName,
        subName: subTemplateTr,
        tags: [tagTr],
        styleTags: newStyleTags,
        aiComment: newComment,
        brandHint: newBrandHint,
        mainColor: tagTr
    };
}
