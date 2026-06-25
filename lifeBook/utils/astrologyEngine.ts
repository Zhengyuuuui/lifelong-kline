import { UserData, AstrologyData, ElementType, TenGod } from '../types';

// --- CONSTANTS ---
const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

// Element Mapping for Stems (0-9)
// 甲乙(Wood), 丙丁(Fire), 戊己(Earth), 庚辛(Metal), 壬癸(Water)
const STEM_ELEMENTS = [
    ElementType.Wood, ElementType.Wood,
    ElementType.Fire, ElementType.Fire,
    ElementType.Earth, ElementType.Earth,
    ElementType.Metal, ElementType.Metal,
    ElementType.Water, ElementType.Water
];

// Ziwei Stars (Simulated lookup)
const ZIWEI_STARS = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'];

// Hexagrams
const HEXAGRAMS = ['乾为天', '坤为地', '水雷屯', '山水蒙', '水天需', '天水讼', '地水师', '水地比', '小畜', '天泽履', '泰', '否', '同人', '大有', '谦', '豫', '随', '蛊', '临', '观', '噬嗑', '贲', '剥', '复', '无妄', '大畜', '颐', '大过', '坎为水', '离为火', '泽山咸', '雷风恒', '天山遁', '雷天大壮', '火地晋', '地火明夷', '风火家人', '火泽睽', '水山蹇', '雷水解', '山泽损', '风雷益', '泽天夬', '天风姤', '泽地萃', '地风升', '困', '井', '革', '鼎', '震', '艮', '渐', '归妹', '丰', '旅', '巽', '兑', '涣', '节', '中孚', '小过', '既济', '未济'];

// --- BAZI CALCULATION HELPERS ---

// 1. Year Pillar: (Year - 4) % 60
const getYearPillar = (year: number) => {
    const offset = (year - 4) % 60;
    const stemIdx = offset % 10;
    const branchIdx = offset % 12;
    const correctedStem = stemIdx < 0 ? stemIdx + 10 : stemIdx;
    const correctedBranch = branchIdx < 0 ? branchIdx + 12 : branchIdx;
    return { 
        stem: HEAVENLY_STEMS[correctedStem], 
        branch: EARTHLY_BRANCHES[correctedBranch],
        stemIdx: correctedStem,
        branchIdx: correctedBranch
    };
};

// 2. Month Pillar
const getMonthPillar = (yearStemIdx: number, month: number) => {
    // Standard simplified mapping for solar month approx
    const branchIdx = (month + 1) % 12; // Jan(1)->Yin(2) approx in solar logic for simplicity
    
    // Formula: (YearStem * 2 + 1) % 10 is the stem of the first month (Yin month)
    const monthFromYin = (branchIdx - 2 + 12) % 12;
    const startStem = (yearStemIdx % 5) * 2 + 2; 
    const currentStemIdx = (startStem + monthFromYin) % 10;
    
    return {
        stem: HEAVENLY_STEMS[currentStemIdx],
        branch: EARTHLY_BRANCHES[branchIdx],
        stemIdx: currentStemIdx
    };
};

// 3. Day Pillar: Reference Date Calculation (UTC Safe)
const getDayPillar = (date: Date) => {
    // Reference: Jan 1 2000 was Wu-Wu (Stem 4, Branch 6).
    // Use UTC to avoid DST offsets causing partial day errors
    const utcNow = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const utcBase = Date.UTC(2000, 0, 1);
    
    const diffMs = utcNow - utcBase;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    const stemBase = 4;
    const branchBase = 6;
    
    let stemIdx = (stemBase + diffDays) % 10;
    let branchIdx = (branchBase + diffDays) % 12;
    
    if (stemIdx < 0) stemIdx += 10;
    if (branchIdx < 0) branchIdx += 12;
    
    return {
        stem: HEAVENLY_STEMS[stemIdx],
        branch: EARTHLY_BRANCHES[branchIdx],
        stemIdx: stemIdx,
        branchIdx: branchIdx
    };
};

// 4. Hour Pillar
const getHourPillar = (dayStemIdx: number, hour: number) => {
    const branchIdx = Math.floor(((hour + 1) % 24) / 2);
    const startStem = (dayStemIdx % 5) * 2;
    const currentStemIdx = (startStem + branchIdx) % 10;
    
    return {
        stem: HEAVENLY_STEMS[currentStemIdx],
        branch: EARTHLY_BRANCHES[branchIdx],
        stemIdx: currentStemIdx
    };
};

// --- TEN GODS LOGIC ---
const getTenGod = (dayMasterIdx: number, targetStemIdx: number): TenGod => {
    const dmElem = STEM_ELEMENTS[dayMasterIdx];
    const targetElem = STEM_ELEMENTS[targetStemIdx];
    
    const dmPol = dayMasterIdx % 2;
    const targetPol = targetStemIdx % 2;
    const samePol = dmPol === targetPol;
    
    const elemOrder = [ElementType.Wood, ElementType.Fire, ElementType.Earth, ElementType.Metal, ElementType.Water];
    const dmEIdx = elemOrder.indexOf(dmElem);
    const tEIdx = elemOrder.indexOf(targetElem);
    
    const diff = (tEIdx - dmEIdx + 5) % 5;
    
    let name = "";
    let weight = 0;
    
    switch (diff) {
        case 0: // Same Element
            name = samePol ? "比肩" : "劫财";
            weight = samePol ? 12 : 8;
            break;
        case 1: // Output
            name = samePol ? "食神" : "伤官";
            weight = samePol ? 10 : -8;
            break;
        case 2: // Wealth
            name = samePol ? "偏财" : "正财";
            weight = samePol ? 18 : 15;
            break;
        case 3: // Officer
            name = samePol ? "七杀" : "正官";
            weight = samePol ? -15 : 12;
            break;
        case 4: // Resource
            name = samePol ? "偏印" : "正印";
            weight = samePol ? 20 : 18;
            break;
    }
    
    return { name, element: targetElem, weight };
};

export const parseLocalDate = (dateInput: string | Date | any): Date => {
    if (!dateInput) return new Date();
    if (typeof dateInput === 'string') {
        const parts = dateInput.split('T')[0].split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            return new Date(year, month, day, 12, 0, 0); // Noon to avoid small boundary errors
        }
        const parsed = new Date(dateInput);
        if (!isNaN(parsed.getTime())) return parsed;
    } else if (dateInput instanceof Date) {
        // If it's already a Date object, let's extract components carefully if it has timezone shifts
        // but if it is already constructed via parseLocalDate, we can use it directly.
        // To be safe, if we parse a Date object, we look at its local components
        return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 12, 0, 0);
    } else if (typeof dateInput === 'object' && dateInput !== null) {
        const str = dateInput.toString();
        const parts = str.split('T')[0].split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            return new Date(year, month, day, 12, 0, 0);
        }
    }
    return new Date();
};

export const formatLocalDateKey = (dateInput: string | Date = new Date()): string => {
    const date = typeof dateInput === 'string' ? parseLocalDate(dateInput) : dateInput;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- WESTERN ASTROLOGY ---
const getSunSign = (month: number, day: number): string => {
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

// --- MAIN CALCULATION ---
export const calculateAstrologyData = (userData: UserData): AstrologyData => {
    const birthDate = parseLocalDate(userData.birthDate);
    const year = birthDate.getFullYear();
    const month = birthDate.getMonth(); // 0-11
    const day = birthDate.getDate();
    const hour = parseInt(userData.birthTime.split(':')[0]);

    // 1. Calculate Bazi Pillars (Deterministic)
    const yearPillar = getYearPillar(year);
    const monthPillar = getMonthPillar(yearPillar.stemIdx, month + 1);
    const dayPillar = getDayPillar(birthDate);
    const hourPillar = getHourPillar(dayPillar.stemIdx, hour);
    
    const bazi = {
        year: `${yearPillar.stem}${yearPillar.branch}`,
        month: `${monthPillar.stem}${monthPillar.branch}`,
        day: `${dayPillar.stem}${dayPillar.branch}`,
        hour: `${hourPillar.stem}${hourPillar.branch}`,
        dayMaster: `${dayPillar.stem}${STEM_ELEMENTS[dayPillar.stemIdx] === ElementType.Wood ? '木' : STEM_ELEMENTS[dayPillar.stemIdx] === ElementType.Fire ? '火' : STEM_ELEMENTS[dayPillar.stemIdx] === ElementType.Earth ? '土' : STEM_ELEMENTS[dayPillar.stemIdx] === ElementType.Metal ? '金' : '水'}`
    };

    // 2. Ten Gods (Strict)
    const tenGods: TenGod[] = [];
    tenGods.push(getTenGod(dayPillar.stemIdx, yearPillar.stemIdx));
    tenGods.push(getTenGod(dayPillar.stemIdx, monthPillar.stemIdx));
    tenGods.push(getTenGod(dayPillar.stemIdx, hourPillar.stemIdx));
    
    // Calculate Base Scores
    const scores = { wood: 60, fire: 60, earth: 60, metal: 60, water: 60 };
    const dmElem = STEM_ELEMENTS[dayPillar.stemIdx];
    
    // Day Master boosts its own element
    const boostMap: Record<string, string> = {
        [ElementType.Wood]: 'wood', [ElementType.Fire]: 'fire', [ElementType.Earth]: 'earth', [ElementType.Metal]: 'metal', [ElementType.Water]: 'water'
    };
    if (boostMap[dmElem]) scores[boostMap[dmElem] as keyof typeof scores] += 20;

    tenGods.forEach(tg => {
        if (tg.element === ElementType.Wood) scores.wood += tg.weight;
        if (tg.element === ElementType.Fire) scores.fire += tg.weight;
        if (tg.element === ElementType.Earth) scores.earth += tg.weight;
        if (tg.element === ElementType.Metal) scores.metal += tg.weight;
        if (tg.element === ElementType.Water) scores.water += tg.weight;
    });

    Object.keys(scores).forEach(k => {
        // @ts-ignore
        scores[k] = Math.min(100, Math.max(10, scores[k]));
    });

    // 3. Ziwei & Western (Deterministic Simulation based on Day/Hour)
    const lunarDayHash = (day + hour) % 14; 
    const mainStar = ZIWEI_STARS[lunarDayHash];
    const bodyStar = ZIWEI_STARS[(lunarDayHash + 4) % 14];
    const movementStar = ZIWEI_STARS[(lunarDayHash + 6) % 14];

    const sunSign = getSunSign(month, day);
    const signs = ['摩羯座', '水瓶座', '双鱼座', '白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座'];
    const westernMoon = signs[(month + hour) % 12];
    const westernAsc = signs[(hour + 6) % 24 / 2 | 0];

    // 4. Hexagrams
    const totalHash = yearPillar.stemIdx + monthPillar.stemIdx + dayPillar.stemIdx + hourPillar.stemIdx;
    const currentHex = HEXAGRAMS[totalHash % 64];
    const changeHex = HEXAGRAMS[(totalHash + 7) % 64];

    // 5. Bazi Strength
    let dmScore = 0;
    if (dmElem === ElementType.Wood) dmScore = scores.wood;
    if (dmElem === ElementType.Fire) dmScore = scores.fire;
    if (dmElem === ElementType.Earth) dmScore = scores.earth;
    if (dmElem === ElementType.Metal) dmScore = scores.metal;
    if (dmElem === ElementType.Water) dmScore = scores.water;
    let baziStrength = dmScore > 75 ? "身强" : dmScore < 45 ? "身弱" : "中和";

    // 6. Behavior
    const behavior = {
        rationality: Math.floor(scores.metal * 0.8 + scores.water * 0.7),
        execution: Math.floor(scores.fire * 1.0 + (tenGods.some(t => t.name === '七杀') ? 20 : 0)),
        recovery: Math.floor(scores.water * 0.9 + (tenGods.some(t => t.name === '偏印') ? 15 : 0)),
        social: Math.floor(((scores.wood + scores.fire) / 2) * 0.8),
        pressure: Math.floor(scores.earth * 0.7 - (tenGods.some(t => t.name === '伤官') ? 15 : 0)),
        summary: ""
    };
    const qualities = [];
    if (behavior.rationality > 75) qualities.push("高洞察");
    if (behavior.execution > 75) qualities.push("强执行"); else if (behavior.execution < 40) qualities.push("需行动力");
    behavior.summary = qualities.length > 0 ? qualities.join(" · ") : "平衡发展";

    // 7. Identity & Timeline
    const generation = (year % 100);
    const userId = `${currentHex.substring(0,1)}${changeHex.substring(0,1)}·第${generation}代${mainStar}守门人`;
    const daYun = `${HEAVENLY_STEMS[(yearPillar.stemIdx + 2) % 10]}${EARTHLY_BRANCHES[(yearPillar.branchIdx + 2) % 12]}`;
    
    // Deterministic Wealth Years based on Element Cycles
    const wealthYears = [year + 28, year + 36, year + 48];
    const lowYears = [year + 29, year + 39, year + 49];

    let luckyDirection = "北方";
    if (dmElem === ElementType.Wood) luckyDirection = "北方 (水生木)";
    if (dmElem === ElementType.Fire) luckyDirection = "东方 (木生火)";
    if (dmElem === ElementType.Earth) luckyDirection = "南方 (火生土)";
    if (dmElem === ElementType.Metal) luckyDirection = "中宫 (水-流动)";
    if (dmElem === ElementType.Water) luckyDirection = "西方 (金生水)";

    return {
        bazi,
        baziStrength,
        gongSha: ['天乙贵人', '文昌'],
        ziwei: { mainStar, bodyStar, palace: '命宫', movementStar },
        western: { sun: sunSign, moon: westernMoon, ascendant: westernAsc },
        scores,
        tenGods,
        behavior,
        hexagram: { current: currentHex, change: changeHex },
        currentEnergy: { daYun, year: `${new Date().getFullYear()}`, month: `${new Date().getMonth()+1}` },
        userId,
        generation,
        wealthYears,
        lowYears,
        dungeonDates: [`${year+25}.05`, `${year+28}.09`, `${year+30}.01`],
        restartDays: (100 - day) * 10,
        nameScore: 80 + (userData.name.length * 2),
        luckyDirection
    };
};
