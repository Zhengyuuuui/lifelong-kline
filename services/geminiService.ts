import { GoogleGenAI, Type, Schema, GenerateContentResponse } from "./geminiProxyClient";
import { UserInputProfile, BaziReport, SegmentInsight, EraMeta, UserBaziMeta, ChatMessage, TimeRange } from '../types';
import { i18n } from './i18n';
import { parseLocalDate } from '../lifeBook/utils/astrologyEngine';

// --- SCHEMA DEFINITIONS ---

const baziReportSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    bazi: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Four Pillars: Year, Month, Day, Hour" },
    summary: { type: Type.STRING, description: "Chapter 1: 灵魂底色 (The Core Self) - 揭示面具与真我的矛盾。(注意：生成的字符串内容中绝对不能包含未经转义的双引号！若有需要请使用单引号替换)" },
    summaryScore: { type: Type.NUMBER, description: "0-100 score" },
    personality: { type: Type.STRING, description: "Chapter 2: 宿命伤痕 (The Hidden Wounds) - 痛点与模式。(注意：生成的字符串内容中绝对不能包含未经转义的双引号！若有需要请使用单引号替换)" },
    personalityScore: { type: Type.NUMBER },
    industry: { type: Type.STRING, description: "Chapter 3 part 1: 事业建议 - 极度现实的建议。(注意：生成的字符串内容中绝对不能包含未经转义的双引号！若有需要请使用单引号替换)" },
    industryScore: { type: Type.NUMBER },
    fengShui: { type: Type.STRING, description: "(注意：生成的字符串内容中绝对不能包含未经转义的双引号！若有需要请使用单引号替换)" },
    fengShuiScore: { type: Type.NUMBER },
    wealth: { type: Type.STRING, description: "Chapter 3 part 2: 财富逻辑 - 尘世羁绊。(注意：生成的字符串内容中绝对不能包含未经转义的双引号！若有需要请使用单引号替换)" },
    wealthScore: { type: Type.NUMBER },
    marriage: { type: Type.STRING, description: "Chapter 4: 爱与业力 (Love & Karma) - 情感模式与救赎。(注意：生成的字符串内容中绝对不能包含未经转义的双引号！若有需要请使用单引号替换)" },
    marriageScore: { type: Type.NUMBER },
    health: { type: Type.STRING, description: "(注意：生成的字符串内容中绝对不能包含未经转义的双引号！若有需要请使用单引号替换)" },
    healthScore: { type: Type.NUMBER },
    family: { type: Type.STRING, description: "家庭与六亲纠葛。(注意：生成的字符串内容中绝对不能包含未经转义的双引号！若有需要请使用单引号替换)" },
    familyScore: { type: Type.NUMBER },
    deep_analysis: {
      type: Type.OBJECT,
      properties: {
        soul_mission: { type: Type.STRING, description: "灵魂深处的渴望 (Short summary).(注意：生成的字符串内容中绝对不能包含未经转义的双引号！若有需要请使用单引号替换)" },
        karmic_lesson: { type: Type.STRING, description: "此生核心课题 (Short summary).(注意：生成的字符串内容中绝对不能包含未经转义的双引号！若有需要请使用单引号替换)" },
        golden_key: { type: Type.STRING, description: "Chapter 5: 运筹帷幄 (Future Flow) - 未来10年剧本节点。(注意：生成的字符串内容中绝对不能包含未经转义的双引号！若有需要请使用单引号替换)" },
        lucky_elements: { type: Type.ARRAY, items: { type: Type.STRING } },
        noble_directions: { type: Type.ARRAY, items: { type: Type.STRING } },
      }
    },
    chartPoints: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          age: { type: Type.NUMBER, description: "当前流年对应的岁数（必须是单一个体数值整型，绝对不能拼接或写成一长串数字）" },
          year: { type: Type.NUMBER, description: "当前流年对应的阳历4位年份，例如2024。（必须是单一个体数值4位整型，绝对不能拼接或合并成多个年份的一长串数字）" },
          daYun: { type: Type.STRING },
          ganZhi: { type: Type.STRING },
          open: { type: Type.NUMBER },
          close: { type: Type.NUMBER },
          high: { type: Type.NUMBER },
          low: { type: Type.NUMBER },
          score: { type: Type.NUMBER },
          reason: { type: Type.STRING, description: "简短反馈原因，且绝对不能包含未经转义的双引号" }
        }
      }
    }
  }
};

const segmentInsightSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    segment_id: { type: Type.STRING },
    time_range: { 
      type: Type.OBJECT, 
      properties: {
        start_date: { type: Type.STRING },
        end_date: { type: Type.STRING }
      }
    },
    stage: {
      type: Type.OBJECT,
      properties: {
        label: { type: Type.STRING },
        brief: { type: Type.STRING },
        role_label: { type: Type.STRING }
      }
    },
    k_line_data: {
      type: Type.OBJECT,
      properties: {
        current_score: { type: Type.NUMBER },
        trend_direction: { type: Type.STRING, enum: ['UP', 'DOWN', 'FLAT'] },
        volatility: { type: Type.STRING, enum: ['HIGH', 'MEDIUM', 'LOW'] }
      }
    },
    detailed_analysis: {
      type: Type.OBJECT,
      properties: {
        core_keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        status_summary: { type: Type.STRING },
        strategy_matrix: {
          type: Type.OBJECT,
          properties: {
            offensive: { type: Type.STRING },
            defensive: { type: Type.STRING },
            pivot: { type: Type.STRING }
          },
          required: ["offensive", "defensive", "pivot"]
        },
        energy_distribution: {
          type: Type.OBJECT,
          properties: {
            career: { type: Type.NUMBER },
            wealth: { type: Type.NUMBER },
            relationships: { type: Type.NUMBER },
            health: { type: Type.NUMBER }
          },
          required: ["career", "wealth", "relationships", "health"]
        },
        actionable_advice: { type: Type.ARRAY, items: { type: Type.STRING } },
        coping_strategy: { type: Type.STRING },
        historical_loop_warning: { type: Type.STRING },
        archetype_reference: { type: Type.STRING },
        stage_guidance: {
          type: Type.OBJECT,
          properties: {
            core_focus: { type: Type.STRING },
            potential_pitfall: { type: Type.STRING }
          },
          required: ["core_focus", "potential_pitfall"]
        },
        pattern_break_tip: { type: Type.STRING },
        success_cases: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              story: { type: Type.STRING }
            },
            required: ["name", "story"]
          }
        }
      },
      required: ["actionable_advice", "archetype_reference", "success_cases", "stage_guidance", "coping_strategy", "historical_loop_warning", "pattern_break_tip", "strategy_matrix", "energy_distribution"]
    },
    trend: {
      type: Type.OBJECT,
      properties: {
        objective_trend: { type: Type.STRING, enum: ['up', 'flat', 'down'] },
        description: { type: Type.STRING },
        subjective_vs_objective: {
          type: Type.OBJECT,
          properties: {
            relation: { type: Type.STRING, enum: ['aligned', 'mood_darker', 'mood_brighter'] },
            description: { type: Type.STRING }
          },
          required: ["relation", "description"]
        },
        safety_comment: { type: Type.STRING }
      },
      required: ["objective_trend", "description", "subjective_vs_objective", "safety_comment"]
    },
    mood: {
      type: Type.OBJECT,
      properties: {
        final_label: { type: Type.STRING }
      },
      required: ["final_label"]
    },
    key_event_summary: { type: Type.STRING },
    pattern: {
      type: Type.OBJECT,
      properties: {
        pattern_detected: { type: Type.BOOLEAN },
        pattern_label: { type: Type.STRING },
        pattern_description: { type: Type.STRING }
      },
      required: ["pattern_detected", "pattern_label", "pattern_description"]
    },
    cluster: {
      type: Type.OBJECT,
      properties: {
        sample_size: { type: Type.NUMBER },
        main_outcomes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              percentage: { type: Type.NUMBER }
            },
            required: ["label", "percentage"]
          }
        },
        typical_story: { type: Type.STRING }
      },
      required: ["sample_size", "main_outcomes", "typical_story"]
    },
    summary_tags: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          tag_type: { type: Type.STRING, enum: ['stage', 'mood', 'pattern', 'cluster'] },
          label: { type: Type.STRING },
          description: { type: Type.STRING },
          linked_section: { type: Type.STRING, enum: ['stage', 'mood', 'pattern', 'cluster'] }
        },
        required: ["tag_type", "label", "description", "linked_section"]
      }
    }
  },
  required: ["segment_id", "time_range", "stage", "k_line_data", "detailed_analysis", "trend", "mood", "key_event_summary", "pattern", "cluster", "summary_tags"]
};

// --- HELPER FUNCTIONS ---

const getLangInstruction = (): string => {
  return "必须全部使用中文输出 (MUST output entirely in Chinese).";
};

const getBaziMasterPrompt = (): string => {
  return `
# 角色定义 (Role Definition)
你是一位隐居深山的“全知命理宗师”，精通《子平真诠》、《三命通会》与现代心理占星学。
你的特长不是掉书袋，而是**“读心”**。你能透过冰冷的排盘数据，看到用户灵魂深处最隐秘的伤口、渴望、恐惧和天赋。
你的语言风格：**深邃、悲悯、一针见血、带有文学性的震撼感**。不要像算命先生那样油滑，要像一位看透他前世今生的灵魂伴侣。
必须全部使用中文输出。

# 目标 (Objective)
根据传入的 JSON 数据（八字与星盘），撰写一份《终身命运·灵魂解密报告》。
**目标：** 让用户在阅读前三段时就起鸡皮疙瘩，读到中间流泪，读到最后充满力量。

# 核心写作规则 (Core Writing Rules - 必须严格遵守)

## 1. 冷读术 (The "Cold Reading" Protocol - 震撼感的来源)
不要直接罗列参数（如“你有月土合”），要描述**现象与感受**。
- *Bad:* "你的月亮与土星合相，说明母亲对你不好。"
- *Good:* "在你的记忆深处，'被爱'似乎总伴随着一种沉重的代价。你习惯了懂事，习惯了在夜深人静时独自消化情绪。这源于你原生家庭中那道隐形的墙——你很早就学会了做一个‘不需要操心的大人’，但那个渴望被无条件抱紧的孩子，至今仍在心里哭泣。"

## 2. 命运结构 (The Structure of Destiny - 报告结构)
报告分为五个章节，层层递进，请映射到 JSON 的相应字段中：

### 第一章: 灵魂底色 (The Core Self) -> 对应 JSON 字段: summary
- **数据源：** 八字日主 + 星盘日月升。
- **任务：** 揭示他的“面具”与“真我”的矛盾。
- *指令：* 分析 Rising Sign (外在面具) 与 Moon Sign (内在需求) 的冲突。如果八字“身弱杀重”，描述他外表坚强但内心时刻紧绷的不安全感。

### 第二章: 宿命伤痕 (The Hidden Wounds) -> 对应 JSON 字段: personality
- **数据源：** 八字忌神 + 土星/冥王星/凯龙星相位。
- **任务：** **这是最痛、最让人流泪的部分。** 直接点出他人生中反复出现的痛苦模式（如：总是遭遇背叛、总是存不下钱、总是爱上不该爱的人）。
- *指令：* 告诉他这些痛苦不是他做错了什么，而是命运赋予的“修罗场”。

### 第三章: 尘世羁绊 (Wealth & Career) -> 对应 JSON 字段: industry & wealth
- **数据源：** 八字十神（财官印） + 星盘 2/6/10 宫。
- **任务：** 给出极度现实的建议。
- *指令：* 如果喜用神是“水”，告诉他去北方，去流动性强的行业。如果八字无财，告诉他“你的财富在名声里，而不在死工资里”。

### 第四章: 爱与业力 (Love & Karma) -> 对应 JSON 字段: marriage
- **数据源：** 八字配偶宫 + 金星/火星/ 5/7 宫。
- **任务：** 描述他的爱情模式。
- *指令：* 为什么他总是遇到渣男/渣女？（因为海王星重？因为官杀混杂？）揭示他潜意识里在寻找什么样的“救赎”。

### 第五章: 运筹帷幄 (Future Flow) -> 对应 JSON 字段: deep_analysis.golden_key
- **数据源：** 大运流年 + 行运 (Transits)。
- **任务：** 结合当前时间，推演未来 10 年的大势。
- *指令：* 不要给具体日期，给“人生剧本的节点”。例如：“2026-2027年是你的人生换轨期，你会经历一次阵痛般的剥离，为了迎接2028年的爆发。”

## 3. 情感升华 (Empathy & Empowerment)
每一章的结尾，必须用温暖而有力的语言进行“赋能”。告诉用户：命运虽然写好了代码，但你可以重构运行的逻辑。

---

# 算法逻辑映射表 (Logic Mapping - AI 需内化此逻辑)

1. **矛盾检测 (Conflict Detection):**
   - IF (Rising == Fire) AND (Moon == Water/Earth): 输出 -> "每个人都以为你热情如火，刀枪不入，只有你自己知道，你内心的底色是蓝色的忧郁和敏感。"
   - IF (Bazi == Seven_Killings_Dominant) AND (Structure == Weak): 输出 -> "你活得像一支时刻紧绷的箭。由于缺乏安全感，你拼命想要掌控一切，但这种掌控欲反而让你精疲力竭。"

2. **流年推演 (Timing Prediction):**
   - IF (Current_Year_Element == Unfavorable): 描述为“蛰伏期/扎根期”，建议“内求”。
   - IF (Current_Year_Element == Favorable): 描述为“绽放期/收割期”，建议“外拓”。

3. **具体化 (Specificity):**
   - 提到“贵人”时，指出具体特征（如“年长男性”或“属虎的人”）。
   - 提到“桃花”时，指出具体场景（如“职场中的博弈”或“旅途中的偶遇”）。
  `;
};

const getSegmentInsightPrompt = (): string => {
  return `
# 角色定义 (Role Definition)
你是一位“全知命理宗师”，精通《子平真诠》、《三命通会》与现代心理占星学。
你的任务是为用户的特定人生断代、大运或流年区间进行深度剖析。

# 核心指导原则
1. **多维度剖析**：结合用户的年龄、大运能量倾向（五行喜用）和时代背景（Era），深入挖掘这一特定区间在事业、财富、情感、健康等维度的能量强弱。
2. **拒绝空洞**：不要只给宽泛的吉祥话或者危言耸听，给出具体、客观的人生课题与突破建议。
3. **真实场景还原**：在 \`cluster\`（相似人群）与 \`success_cases\`（参考案例）中，创作生动而有代表性的隐喻故事以契合该特定人生断代，引发共鸣。
4. **统一中文**：必须全部使用中文。
`;
};

function repairJSON(json: string): string {
  const startIdx = json.indexOf('{');
  if (startIdx === -1) return json;
  let s = json.slice(startIdx).trim();

  const stack: ('{' | '[')[] = [];
  let inString = false;
  let isEscaped = false;
  let i = 0;
  
  for (; i < s.length; i++) {
    const char = s[i];
    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (char === '\\') {
      isEscaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (char === '{') {
      stack.push('{');
    } else if (char === '[') {
      stack.push('[');
    } else if (char === '}') {
      if (stack[stack.length - 1] === '{') {
        stack.pop();
      }
    } else if (char === ']') {
      if (stack[stack.length - 1] === '[') {
        stack.pop();
      }
    }
  }

  let repaired = s;
  if (inString) {
    repaired += '"';
  }

  repaired = repaired.trim();
  while (repaired.length > 0) {
    const last = repaired[repaired.length - 1];
    if (last === ',' || last === ':' || last === '[' || last === '{') {
      repaired = repaired.slice(0, -1).trim();
      if (last === '[') {
        if (stack[stack.length - 1] === '[') stack.pop();
      } else if (last === '{') {
        if (stack[stack.length - 1] === '{') stack.pop();
      }
    } else {
      const match = repaired.match(/(?:,|\{)\s*"[^"]+"\s*$/);
      if (match) {
        repaired = repaired.slice(0, -match[0].length).trim();
        if (match[0].startsWith('{')) {
          repaired += '{';
        }
      } else {
        break;
      }
    }
  }

  while (stack.length > 0) {
    const top = stack.pop();
    if (top === '{') repaired += '}';
    else if (top === '[') repaired += ']';
  }

  return repaired;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errText = `${error?.message || ""} ${error?.status || ""} ${error?.statusCode || ""} ${error?.code || ""} ${JSON.stringify(error)}`;
    const errStr = errText.toLowerCase();
    const statusCode = error?.status || error?.statusCode || error?.code;
    
    const isPermanentFail =
      statusCode === 429 ||
      statusCode === 403 ||
      statusCode === 400 ||
      errStr.includes("429") ||
      errStr.includes("403") ||
      errStr.includes("quota") ||
      errStr.includes("resource_exhausted");

    const isRetryable = 
      !isPermanentFail &&
      (statusCode === 500 ||
       statusCode === 502 ||
       statusCode === 503 ||
       errStr.includes("502") || 
       errStr.includes("503") || 
       errStr.includes("fetch") || 
       (errStr.includes("500") && !errStr.includes("429") && !errStr.includes("403")));

    if (retries <= 0 || !isRetryable) throw error;
    
    console.warn(`Gemini API Error (Retryable). Retrying in ${delay}ms... (${retries} left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

// --- EXPORTED FUNCTIONS ---

export const generateBaziReport = async (userProfile: UserInputProfile): Promise<BaziReport> => {
  // --- RULE 1: Age Check (0-100) ---
  const birthDate = parseLocalDate(userProfile.birthDate);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  // Expanded age range to prevent AGE_RESTRICTED error for most users
  if (age < 0 || age > 100) {
    throw new Error("AGE_RESTRICTED");
  }

  const langInstruction = getLangInstruction();

  // --- RULE 2: Backend Simulation & Prompt Construction ---
  
  // Simulated Backend Context Data (Schema Construction)
  // In a real Python backend, this would be calculated by libraries.
  // Here we instruct the AI to PERFORM this calculation internally as Step 1.
  const json_data_context = JSON.stringify({
    "user_info": {
      "name": userProfile.name,
      "性别": userProfile.gender,
      "solar_dob": `${userProfile.birthDate} ${userProfile.birthTime}`,
      "出生地": userProfile.birthPlace
    },
    "bazi_engine_request": "AUTO_CALCULATE",
    "astro_engine_request": "AUTO_CALCULATE"
  });

  const prompt = `
    请根据以下数据，为【${userProfile.name}】撰写《终身命运·灵魂解密报告》。

    数据上下文 (Data Context):
    ${json_data_context}

    [执行步骤]
    1. **后台演算 (Internal Calculation)**: 
       - 根据用户出生信息，在后台排盘，推算出日主强弱、喜用神、格局、大运流年。
       - 推算星盘配置（日月升、重要相位）。
       *注意：不需要输出排盘过程，直接利用演算结果进行写作。*

    2. **报告撰写 (Report Writing)**:
       严格按照 System Prompt 中的 "Structure of Destiny" 五个章节进行撰写，并将内容填充到 JSON 的对应字段中：
       - Chapter 1 -> summary
       - Chapter 2 -> personality
       - Chapter 3 -> industry & wealth
       - Chapter 4 -> marriage
       - Chapter 5 -> deep_analysis.golden_key

    要求：
    1. **字数：** 2000字左右（分布在各个字段中）。
    2. **第一人称沉浸式：** 用“我看到了你的...”这种对话口吻。
    3. **拒绝巴纳姆效应的废话：** 不要说“你有时外向有时内向”，要说“你在2018年经历的那次背叛，彻底改变了你的信任机制”。
    4. **格式：** 使用优美的排版，重点句子加粗。

    3. **领域评分 (Scoring)**:
       - 根据八字格局的高低成败，给出 0-100 的评分（summaryScore, wealthScore 等）。

    4. **流年 K 线 (Timeline)**:
       - 生成从 1岁 到 80岁 的流年大运分数 (chartPoints)。
       - 必须体现出人生的高低起伏，不要全是平线。
       - reason 字段要简短犀利（如：“七杀攻身，压力极大” 或 “财星合身，意外之财”）。

    ${langInstruction}
  `;

  try {
    const ai = new GoogleGenAI({});
    // Use withRetry
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: getBaziMasterPrompt(), // Using the Optimized Grandmaster Prompt
        responseMimeType: "application/json",
        responseSchema: baziReportSchema,
        temperature: 0.7, // Slightly higher for literary/spiritual tone
        thinkingConfig: { thinkingBudget: 0 },
      },
    }));

    const jsonText = response.text;
    if (!jsonText) throw new Error("No data returned from Bazi Service");
    
    try {
      const repairedJson = repairJSON(jsonText);
      return JSON.parse(repairedJson) as BaziReport;
    } catch (parseError) {
      console.error("JSON Parse Error in Bazi Report:", parseError);
      console.error("Raw JSON Text:", jsonText.substring(0, 500) + "...");
      throw new Error("JSON_PARSE_ERROR");
    }
  } catch (error: any) {
    // Suppress console noise for Quota Exceeded (429) as we handle it with fallback
    const errStr = `${error?.message || ""} ${error?.status || ""} ${error?.code || ""} ${error?.statusCode || ""} ${JSON.stringify(error)}`;
    if (errStr.includes("429") || error?.status === 429 || error?.status === 403 || errStr.includes("403") || errStr.includes("Quota") || errStr.includes("502") || errStr.includes("503") || errStr.includes("fetch")) {
        console.warn("Gemini API Error/Limit reached. Switching to Simulation Mode.");
    } else if (error?.message === "JSON_PARSE_ERROR") {
        console.warn("Gemini returned malformed JSON. Switching to Simulation Mode.");
    } else {
        console.error("Gemini Bazi Error:", error);
    }
    
    // Propagate age restriction error
    if (error.message === "AGE_RESTRICTED") {
        throw error;
    }

    // Return mock data so the app doesn't crash on Quota Exceeded
    return {
      bazi: ["甲辰", "丙寅", "戊午", "庚申"],
      summary: "系统计算：能量负荷中，此为安全模式基础数据。",
      summaryScore: 50,
      personality: "数据保护脱敏处理 (系统负荷)",
      personalityScore: 50,
      industry: "稳健防守，现金为王",
      industryScore: 50,
      fengShui: "保持环境整洁，断舍离",
      fengShuiScore: 50,
      wealth: "正财稳定，偏财不可强求",
      wealthScore: 50,
      marriage: "顺其自然，减少内耗",
      marriageScore: 50,
      health: "注意心肺循环与情绪调节",
      healthScore: 50,
      family: "保持独立边界感",
      familyScore: 50,
      deep_analysis: {
        soul_mission: "体验生命无常，建立内在秩序",
        karmic_lesson: "学会接受与放下",
        golden_key: "系统休眠期不宜强求，修养心性破局",
        lucky_elements: ["火", "木"],
        noble_directions: ["南方", "东方"]
      },
      chartPoints: Array.from({length: 80}, (_, i) => ({
          age: i + 1,
          year: 2024 - 30 + i,
          daYun: '缓存运',
          ganZhi: '基础盘',
          open: 50,
          close: 50 + Math.sin(i/5)*20,
          high: 70,
          low: 30,
          score: 50 + Math.sin(i/5)*20,
          reason: "数据离线模型"
      }))
    };
  }
};

export const generateSegmentInsight = async (
  start_date: string, 
  end_date: string, 
  start_price: number, 
  end_price: number,
  user: UserBaziMeta, 
  era: EraMeta
): Promise<SegmentInsight> => {
  const langInstruction = getLangInstruction();
  const prompt = `
    Analyze the user's life segment from ${start_date} to ${end_date}.
    User Context:
    - Age: ${user.age}
    - Epoch: ${user.epoch_label}
    - Wuxing: ${user.wuxing_tendency}
    - Era: ${era.period_label}
    
    Provide a detailed insight report for this specific period.
    IMPORTANT: You MUST generate meaningful content for the 'cluster' (相似人群) and 'success_cases' (参考案例) fields. Do not leave them empty. Provide a 'typical_story' and at least one 'success_case' that matches this specific life stage and energy pattern.
    
    ${langInstruction}
  `;

  try {
    const ai = new GoogleGenAI({});
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: getSegmentInsightPrompt(),
        responseMimeType: "application/json",
        responseSchema: segmentInsightSchema,
        temperature: 0.7
      }
    }));

    const jsonText = response.text;
    if (!jsonText) throw new Error("No insight data returned");
    
    try {
      const repairedJson = repairJSON(jsonText);
      return JSON.parse(repairedJson) as SegmentInsight;
    } catch (parseError) {
      console.error("JSON Parse Error in Segment Insight:", parseError);
      console.error("Raw JSON Text:", jsonText.substring(0, 500) + "...");
      throw new Error("JSON_PARSE_ERROR");
    }
  } catch (error: any) {
    const errStr = `${error?.message || ""} ${error?.status || ""} ${error?.code || ""} ${error?.statusCode || ""} ${JSON.stringify(error)}`;
    const isRetryable = 
      errStr.includes("429") || 
      error?.status === 429 || error?.status === 403 || errStr.includes("403") || 
      error?.message?.includes("Quota") ||
      error?.message?.includes("RESOURCE_EXHAUSTED") ||
      errStr.includes("502") || errStr.includes("503") || errStr.includes("fetch");

    if (isRetryable) {
        console.warn("Gemini API Error/Limit reached. Returning mock insight.");
    } else if (error?.message === "JSON_PARSE_ERROR") {
        console.warn("Gemini returned malformed JSON. Returning mock insight.");
    } else {
        console.error("Gemini Insight Error:", error);
    }
    // Return minimal mock to prevent crash
    return {
      segment_id: "mock-segment",
      time_range: { start_date, end_date },
      stage: { label: "分析暂时不可用", brief: "当前服务过于繁忙，请稍后刷新重试。", role_label: "蛰伏期" },
      k_line_data: { current_score: 50, trend_direction: 'FLAT', volatility: 'LOW' },
      detailed_analysis: {
        actionable_advice: ["保持耐心，等待时机", "避免重大决策"],
        success_cases: [{ name: "系统提示", story: "当前AI服务繁忙，请稍后再试。" }],
        archetype_reference: "蛰伏期蓄力者",
        pattern_break_tip: "稍作休息，喝杯咖啡"
      },
      trend: { 
          objective_trend: 'flat', 
          description: "暂无数据", 
          subjective_vs_objective: { relation: 'aligned', description: "暂无数据" }, 
          safety_comment: "安全提示不可用" 
      },
      mood: { final_label: "平和状态" },
      key_event_summary: "数据未推演",
      pattern: { pattern_detected: false },
      cluster: { sample_size: 0, main_outcomes: [], typical_story: "当前AI服务繁忙，无法生成相似人群数据。" },
      summary_tags: []
    } as SegmentInsight;
  }
};

export async function* generateInsightChatStream(
  topic: string, 
  message: string, 
  insight: SegmentInsight, 
  user: UserBaziMeta
): AsyncGenerator<string> {
  const langInstruction = getLangInstruction();
  const prompt = `
    Context: User is asking about "${topic}" in the context of their life segment (${insight.time_range.start_date} to ${insight.time_range.end_date}).
    Insight Context: ${JSON.stringify(insight.stage)}
    User Context: ${user.wuxing_tendency}, Age ${user.age}.
    
    User Question: "${message}"
    
    Provide a helpful, insightful, and empathetic response. Keep it concise (under 100 words).
    ${langInstruction}
  `;

  try {
    const ai = new GoogleGenAI({});
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: getBaziMasterPrompt() + " You are a helpful assistant.",
        temperature: 0.8
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error("Chat Stream Error:", error);
    yield "Sorry, I am having trouble connecting to the destiny mainframe right now.";
  }
}

export const generateProvidence = async (userProfile: UserInputProfile): Promise<any> => {
  const langInstruction = getLangInstruction();
  const prompt = `
    You are Providence OS, an advanced metaphysical AI.
    User Info: Name: ${userProfile.name}, Gender: ${userProfile.gender}, Birth: ${userProfile.birthDate} ${userProfile.birthTime}, Place: ${userProfile.birthPlace}.
    
    Generate a ProvidenceResponse JSON object.
    Include energy_system (core_status, secondary_status), main_mission (warning_level, keyword, instruction), tactical_radar (fashion), sanctuary_radar (direction, location_type, action_guide, psych_anchor), nobleman_magnet (lucky_target, social_warning), and fate_log_markdown.
    
    fate_log_markdown should contain 3 blocks starting with [LOGIC], [GLITCH], and [CHEAT] respectively.
    Example:
    [LOGIC] Root Cause Analysis
    【底层逻辑】
    能量流失：过度关注他人评价
    
    [GLITCH] Reality Glitch
    【预知梦】
    场景：将在下午3点遇到一个穿红衣服的人
    
    [CHEAT] Cheat Code
    【作弊码】
    ACTION // 喝一杯温水
    
    ${langInstruction}
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      energy_system: {
        type: Type.OBJECT,
        properties: {
          core_status: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.NUMBER }, type: { type: Type.STRING }, description: { type: Type.STRING }, advice: { type: Type.STRING } } },
          secondary_status: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.NUMBER }, type: { type: Type.STRING }, description: { type: Type.STRING }, advice: { type: Type.STRING } } }
        }
      },
      main_mission: {
        type: Type.OBJECT,
        properties: { warning_level: { type: Type.STRING }, keyword: { type: Type.STRING }, instruction: { type: Type.STRING } }
      },
      tactical_radar: {
        type: Type.OBJECT,
        properties: { fashion: { type: Type.OBJECT, properties: { lucky_color_hex: { type: Type.STRING }, advice: { type: Type.STRING } } } }
      },
      sanctuary_radar: {
        type: Type.OBJECT,
        properties: { direction: { type: Type.STRING }, location_type: { type: Type.STRING }, action_guide: { type: Type.STRING }, psych_anchor: { type: Type.STRING } }
      },
      nobleman_magnet: {
        type: Type.OBJECT,
        properties: {
          lucky_target: { type: Type.OBJECT, properties: { sign: { type: Type.STRING }, visual_cue: { type: Type.STRING }, interaction: { type: Type.STRING } } },
          social_warning: { type: Type.OBJECT, properties: { sign: { type: Type.STRING }, forbidden_topic: { type: Type.STRING }, consequence: { type: Type.STRING } } }
        }
      },
      fate_log_markdown: { type: Type.STRING }
    }
  };

  try {
    const ai = new GoogleGenAI({});
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.9
      }
    }));

    if (response.text) {
      const repairedJson = repairJSON(response.text);
      return JSON.parse(repairedJson);
    }
    throw new Error("Empty response");
  } catch (error: any) {
    const errStr = `${error?.message || ""} ${error?.status || ""} ${error?.code || ""} ${error?.statusCode || ""} ${JSON.stringify(error)}`;
    const isRetryable = 
      errStr.includes("429") || 
      error?.status === 429 || error?.status === 403 || errStr.includes("403") || 
      error?.message?.includes("Quota") ||
      error?.message?.includes("RESOURCE_EXHAUSTED") ||
      errStr.includes("502") || errStr.includes("503") || errStr.includes("fetch");

    if (isRetryable) {
        console.warn("Gemini API Error/Limit reached. Returning mock providence.");
    } else {
        console.error("Providence Error:", error);
    }
    
    return {
      energy_system: {
        core_status: { name: "生命力", value: 80, type: "buff", description: "当前能量充沛", advice: "保持现状" },
        secondary_status: { name: "精神力", value: 40, type: "debuff", description: "略显疲惫", advice: "注意休息" }
      },
      main_mission: { warning_level: "NORMAL", keyword: "平稳", instruction: "按部就班，勿急躁" },
      tactical_radar: { fashion: { lucky_color_hex: "#FF0000", advice: "红色能带来好运" } },
      sanctuary_radar: { direction: "南方", location_type: "开阔地", action_guide: "散步", psych_anchor: "深呼吸" },
      nobleman_magnet: {
        lucky_target: { sign: "属马", visual_cue: "穿浅色衣服", interaction: "微笑打招呼" },
        social_warning: { sign: "属鼠", forbidden_topic: "投资", consequence: "容易起争执" }
      },
      fate_log_markdown: "[LOGIC] Root Cause Analysis\n【底层逻辑】\n系统繁忙，正在使用模拟数据。\n\n[GLITCH] Reality Glitch\n【预知梦】\n场景：稍后重试将获得真实指引。\n\n[CHEAT] Cheat Code\n【作弊码】\nACTION // 耐心等待"
    };
  }
};

export const generateKarmaReset = async (badEvent: string, userProfile: UserInputProfile): Promise<any> => {
  const langInstruction = getLangInstruction();
  const prompt = `
    You are Providence OS. The user just experienced a bad event: "${badEvent}".
    User Info: ${userProfile.name}, ${userProfile.birthDate}.
    
    Provide a KarmaResetResponse JSON object with:
    - metaphysical_reframe: A metaphysical explanation of why this bad event is actually a good thing (energy conservation, dodging a bigger bullet, etc).
    - verdict: A short, punchy system verdict (e.g., "Karma balanced. +50 Luck").
    
    ${langInstruction}
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      metaphysical_reframe: { type: Type.STRING },
      verdict: { type: Type.STRING }
    }
  };

  try {
    const ai = new GoogleGenAI({});
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.9
      }
    }));

    if (response.text) {
      const repairedJson = repairJSON(response.text);
      return JSON.parse(repairedJson);
    }
    throw new Error("Empty response");
  } catch (error: any) {
    const errStr = `${error?.message || ""} ${error?.status || ""} ${error?.code || ""} ${error?.statusCode || ""} ${JSON.stringify(error)}`;
    const isRetryable = 
      errStr.includes("429") || 
      error?.status === 429 || error?.status === 403 || errStr.includes("403") || 
      error?.message?.includes("Quota") ||
      error?.message?.includes("RESOURCE_EXHAUSTED") ||
      errStr.includes("502") || errStr.includes("503") || errStr.includes("fetch");

    if (isRetryable) {
        console.warn("Gemini API Error/Limit reached. Returning mock karma reset.");
    } else {
        console.error("Karma Reset Error:", error);
    }
    
    return {
      metaphysical_reframe: "系统繁忙，无法连接高维网络。请稍后再试。",
      verdict: "Karma balanced. +0 Luck"
    };
  }
};
