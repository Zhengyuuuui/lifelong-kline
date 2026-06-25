import { GoogleGenAI, Type, Schema } from "../../services/geminiProxyClient";
import { FlowPath, AlternativeRoute, DashboardMetrics, StrategyKit, ActionPlan, RelationshipCandidate, UserProfile, TimelineSegment, SegmentType, DayData, FutureWeather, Language, MorningRiskReport, TimeSniper } from "../types";
import { formatLocalDateKey, parseLocalDate } from "../../lifeBook/utils/astrologyEngine";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Helper Functions ---

const isAuthRequiredError = (error: any) =>
  error?.status === 401 ||
  error?.code === 'AUTH_REQUIRED' ||
  String(error?.message || '').includes('Authentication required');

export const calculateAge = (birthDateString: string): number => {
    if (!birthDateString) return 25; // Default fallback
    const birthDate = parseLocalDate(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

const getLangName = (lang: Language = 'zh') => {
  const map: Record<string, string> = {
    'zh': 'Simplified Chinese',
    'zh-TW': 'Traditional Chinese',
    'en': 'Simplified Chinese', // Force Chinese for English
    'ja': '日本語',
    'ko': '한국어',
    'de': 'Deutsch',
    'fr': 'Français',
    'es': 'Español'
  };
  return map[lang] || 'Simplified Chinese';
};

// Robust JSON Parsing to handle potential Markdown wrapping from LLMs
const cleanAndParseJSON = <T>(text: string | undefined): T | null => {
  if (!text) return null;
  try {
    let cleaned = text.trim();
    // Aggressively strip markdown code blocks if present
    if (cleaned.includes("```")) {
       cleaned = cleaned.replace(/```json/gi, "").replace(/```/g, "").trim();
    }
    return JSON.parse(cleaned) as T;
  } catch (e) {
    console.warn("JSON Parse Warning (Falling back to raw/offline):", e);
    return null;
  }
};

// --- Deterministic RNG for Offline Mode ---
const pseudoRandom = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
};

// --- Offline Fortune Generator (Commercial Fallback) ---
// Ensures the app functions smoothly even if API quota is exceeded or network fails
const generateOfflineFortune = (profile: UserProfile, lang: Language): { overview: DayData['dailyOverview'], segments: TimelineSegment[] } => {
    // FORCE CHINESE
    lang = 'zh';
    const dateStr = formatLocalDateKey();
    const seed = `${profile.name}-${profile.birthDate}-${dateStr}`;
    const rng = (offset: number) => pseudoRandom(seed + offset);

    // Score 60-95
    const score = 60 + Math.floor(rng(1) * 36);
    
    // Level Logic
    let level: 'ROCKET' | 'STABLE' | 'NEUTRAL' | 'AVOID' = 'NEUTRAL';
    if (score > 90) level = 'ROCKET';
    else if (score > 80) level = 'STABLE';
    else if (score < 55) level = 'AVOID';

    // Segments Generation with Pattern
    const segments: TimelineSegment[] = [];
    for (let i = 0; i < 24; i++) {
        const val = rng(i + 10);
        let type: SegmentType = 'neutral';
        let code = 'NEUTRAL';
        let sScore = 50;
        
        if (val > 0.82) { type = 'good'; code = 'ROCKET'; sScore = 80 + Math.floor(val * 20); }
        else if (val < 0.18) { type = 'warn'; code = 'AVOID'; sScore = 30 + Math.floor(val * 20); }
        else if (val < 0.4) { type = 'slow'; code = 'NEUTRAL'; sScore = 50 + Math.floor(val * 10); }
        else { type = 'neutral'; code = 'STABLE'; sScore = 60 + Math.floor(val * 10); }
        
        segments.push({
            hour: i,
            score: sScore,
            type,
            description: code 
        });
    }

    const summaryMap: Record<string, string> = {
        zh: "云端连接波动，启用本地能量算法。今日运势依然稳健。",
        en: "云端连接波动，启用本地能量算法。今日运势依然稳健。", // Force Chinese
        ja: "クラウド接続が不安定です。ローカルアルゴリズムに切り替えました。",
        ko: "클라우드 연결이 불안정합니다. 로컬 알고리즘으로 전환되었습니다.",
        de: "Cloud-Verbindung instabil. Auf lokalen Algorithmus umgeschaltet.",
        fr: "Liaison cloud instable. Passage à l'algorithme local.",
        es: "Enlace inestable. Cambiado a algoritmo local."
    };

    const isZh = true; // Force Chinese for all fallbacks as requested

    const overview: DayData['dailyOverview'] = {
        score,
        level,
        summary: summaryMap['zh'],
        reasoning: "系统备份分析 / 本地算法推演",
        lucky_color: ["金色", "银色", "红色", "蓝色", "翠绿"][Math.floor(rng(2) * 5)],
        lucky_direction: ["正北", "正南", "正东", "正西"][Math.floor(rng(3) * 4)],
        energy_components: {
            heaven: Math.floor(rng(4) * 30) + 60,
            earth: Math.floor(rng(5) * 30) + 60,
            human: Math.floor(rng(6) * 30) + 60,
            self: Math.floor(rng(7) * 30) + 60
        },
        recommended_actions: [{ label: "深度工作", type: "primary" }, { label: "休息", type: "secondary" }, { label: "规划", type: "primary" }],
        strategy_guide: {
            recommended_tone: "steady",
            main_quote: "内心平静带来真正的力量。"
        },
        window_tags: ["聚焦", "复盘", "规划"],
        daily_relationships: [],
        destress_guide: { items: ["深呼吸", "多喝水", "避免匆忙"] }
    };

    return { overview, segments };
};

// --- 0. Validation Logic ---
export const validateUserProfileWithAI = async (profile: UserProfile): Promise<{ isValid: boolean; message?: string }> => {
  const age = calculateAge(profile.birthDate);
  if (age < 5) return { isValid: false, message: "为了结果准确性，系统暂不支持 5 岁以下的数据分析。" };
  if (age > 100) return { isValid: false, message: "输入的年龄超出正常分析范围，请核对出生日期。" };

  try {
    const prompt = `
    Task: Validate if the input name and birthplace are realistic for a legitimate user profile.
    Input: Name: "${profile.name}", Place: "${profile.birthPlace}"
    Output JSON: { valid: boolean, reason: string }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            valid: { type: Type.BOOLEAN },
            reason: { type: Type.STRING }
          },
          required: ['valid', 'reason']
        }
      }
    });

    const res = cleanAndParseJSON<{ valid: boolean, reason: string }>(response.text);
    if (!res) return { isValid: true }; // Allow on parsing error to avoid blocking
    return { isValid: res.valid, message: res.reason };

  } catch (error) {
    console.warn("Validation skipped due to AI error", error);
    return { isValid: true }; 
  }
};

// --- 1. User Profile Analysis ---
export const analyzeUserProfile = async (profile: UserProfile, lang: Language = 'zh'): Promise<{ energySignature: string, luckyElement: string, advice: string }> => {
  try {
    // FORCE CHINESE
    lang = 'zh';
    const langName = getLangName(lang);
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Analyze this birth data: Name ${profile.name}, Date ${profile.birthDate}.
      Output JSON in ${langName}:
      1. energySignature: Mystical 4-word title (e.g. 'Silent Burning Star').
      2. luckyElement: One word element (e.g. 'Fire', 'Water').
      3. advice: One short, inspiring sentence.`,
      config: {
        systemInstruction: "You are a master of personality analysis and I Ching. Provide mystical yet encouraging insights.",
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            energySignature: { type: Type.STRING },
            luckyElement: { type: Type.STRING },
            advice: { type: Type.STRING }
          },
          required: ['energySignature', 'luckyElement', 'advice']
        }
      }
    });

    const res = cleanAndParseJSON<{ energySignature: string, luckyElement: string, advice: string }>(response.text);
    if (!res) throw new Error("Parsing failed");
    return res;
  } catch (error) {
    console.warn("Profile Analysis Failed (Using Fallback)", error);
    const fallback: Record<string, any> = {
        zh: { energySignature: "流浪星辰", luckyElement: "时", advice: "宇宙不语，但自有安排。" },
        en: { energySignature: "流浪星辰", luckyElement: "时", advice: "宇宙不语，但自有安排。" } // Force Chinese
    };
    return fallback['zh'];
  }
};

// --- 2. Daily Fortune Generation (CORE) ---
export const generateDailyFortune = async (profile: UserProfile, lang: Language = 'zh'): Promise<{ overview: DayData['dailyOverview'], segments: TimelineSegment[] }> => {
  try {
    // FORCE CHINESE
    lang = 'zh';
    const today = new Date();
    const targetDate = formatLocalDateKey(today);
    const userAge = calculateAge(profile.birthDate);
    const isStudent = userAge < 22;
    const langName = getLangName(lang);

    const requestPayload = {
        user_data: { 
            age: userAge, 
            identity: isStudent ? "Student" : "Professional", 
            name: profile.name,
            birthDate: profile.birthDate,
            birthTime: profile.birthTime,
            birthPlace: profile.birthPlace
        },
        target_date: targetDate
    };

    const prompt = `
    Calculate daily fortune and 24h energy flow based on I Ching, Bazi (Four Pillars), and Bio-rhythms.
    Input: ${JSON.stringify(requestPayload)}
    
    REQUIREMENTS:
    - **ALL TEXT VALUES MUST BE IN ${langName}**.
    - 'hourly_segments' must contain exactly 24 items (0-23 hours).
    - 'code' mapping: ROCKET=Great Luck, STABLE=Good, NEUTRAL=Average, AVOID=Bad.
    - **CRITICAL**: The content MUST be unique to this specific date (${targetDate}) and user profile. 
    - **PERSONALIZATION**: Use the user's Bazi (derived from birth date/time) to calculate the daily interaction (e.g. Clash, Combine). 
    - **VARIETY**: Do not repeat the same phrases every day. Vary the tone and specific advice based on the calculated energy score.
    - **AGE APPROPRIATE**: Ensure advice fits the user's age (${userAge}) and identity (${isStudent ? "Student" : "Professional"}).
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash', // Using Pro for complex reasoning
        contents: prompt,
        config: {
            systemInstruction: "You are an expert Data Scientist specializing in Time-Energy analysis. You provide precise, actionable, and psychologically grounded daily forecasts.",
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    daily_overview: {
                        type: Type.OBJECT,
                        properties: {
                            score: { type: Type.NUMBER },
                            level: { type: Type.STRING, enum: ['ROCKET', 'STABLE', 'NEUTRAL', 'AVOID'] },
                            summary: { type: Type.STRING },
                            reasoning: { type: Type.STRING },
                            lucky_color: { type: Type.STRING },
                            lucky_direction: { type: Type.STRING },
                            energy_components: {
                                type: Type.OBJECT,
                                properties: {
                                    heaven: { type: Type.NUMBER },
                                    earth: { type: Type.NUMBER },
                                    human: { type: Type.NUMBER },
                                    self: { type: Type.NUMBER }
                                },
                                required: ['heaven', 'earth', 'human', 'self']
                            },
                            recommended_actions: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        label: { type: Type.STRING },
                                        type: { type: Type.STRING, enum: ['primary', 'secondary'] }
                                    },
                                    required: ['label', 'type']
                                }
                            },
                            strategy_guide: {
                                type: Type.OBJECT,
                                properties: {
                                    recommended_tone: { type: Type.STRING, enum: ['steady', 'direct', 'smooth'] },
                                    main_quote: { type: Type.STRING }
                                },
                                required: ['recommended_tone', 'main_quote']
                            },
                            window_tags: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            },
                            daily_relationships: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        name: { type: Type.STRING },
                                        roleLabel: { type: Type.STRING },
                                        relationTag: { type: Type.STRING },
                                        recommendedTimeLabel: { type: Type.STRING },
                                        actionHint: { type: Type.STRING },
                                        reason: { type: Type.STRING },
                                        priorityLevel: { type: Type.STRING, enum: ['primary', 'secondary'] }
                                    },
                                    required: ['name', 'roleLabel', 'relationTag', 'recommendedTimeLabel', 'actionHint', 'reason', 'priorityLevel']
                                }
                            },
                            destress_guide: {
                                type: Type.OBJECT,
                                properties: {
                                    items: { type: Type.ARRAY, items: { type: Type.STRING } }
                                },
                                required: ['items']
                            }
                        },
                        required: ['score', 'level', 'summary', 'reasoning', 'lucky_color', 'lucky_direction', 'energy_components', 'recommended_actions', 'strategy_guide', 'window_tags', 'daily_relationships', 'destress_guide']
                    },
                    hourly_segments: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                hour: { type: Type.INTEGER },
                                total_score: { type: Type.NUMBER },
                                code: { type: Type.STRING, enum: ['ROCKET', 'STABLE', 'NEUTRAL', 'AVOID'] },
                                description: { type: Type.STRING }
                            },
                            required: ['hour', 'total_score', 'code', 'description']
                        }
                    }
                },
                required: ['daily_overview', 'hourly_segments']
            }
        }
    });

    const rawData = cleanAndParseJSON<any>(response.text);
    if (!rawData) throw new Error("Invalid JSON from AI");

    const segments = rawData.hourly_segments.map((item: any) => {
        let type: SegmentType = 'neutral';
        switch(item.code) {
            case 'ROCKET': type = 'good'; break;
            case 'STABLE': type = 'neutral'; break;
            case 'NEUTRAL': type = 'slow'; break;
            case 'AVOID': type = 'warn'; break;
            default: type = 'neutral';
        }

        return {
            hour: item.hour,
            type: type,
            score: Math.round(item.total_score * 5) + 50, // Normalize to 0-100 visual scale if AI returns low numbers
            description: item.description 
        };
    });
    
    if (rawData.daily_overview?.daily_relationships) {
        rawData.daily_overview.daily_relationships = rawData.daily_overview.daily_relationships.map((r: any, i: number) => ({
            ...r,
            id: `ai-rel-${Date.now()}-${i}`
        }));
    }

    return {
        overview: rawData.daily_overview,
        segments: segments
    };

  } catch (error: any) {
    if (!isAuthRequiredError(error)) {
      console.warn("Fortune Generation Failed (Using Offline Fallback):", error);
    }
    return generateOfflineFortune(profile, lang);
  }
};

// --- NEW SERVICE: Morning Risk & Time Sniper (Module 1 & 2) ---
export const generateMorningRiskAndSniper = async (
    profile: UserProfile, 
    dailyScore: number,
    luckyTime: string,
    luckyDirection: string,
    luckyElement: string,
    lang: Language = 'zh'
): Promise<{ morningRisk: MorningRiskReport, timeSniper: TimeSniper }> => {
    try {
        // FORCE CHINESE
        lang = 'zh';
        const langName = getLangName(lang);
        // Default inference of occupation if not present
        const age = calculateAge(profile.birthDate);
        const occupation = profile.occupation || (age < 22 ? 'Student' : 'Corporate_slave');
        
        // Construct prompt payload
        const payload = {
            user_profile: {
                occupation_type: occupation,
                age: age,
                pain_point: "Wealth", // Default to Wealth for Sniper module as per requirement if no tag selected
                birthDate: profile.birthDate,
                birthTime: profile.birthTime
            },
            bazi_daily_status: {
                score: dailyScore,
                lucky_element: luckyElement,
                lucky_time_window: luckyTime,
                lucky_direction: luckyDirection
            }
        };

        const prompt = `
        # Role
        你是一个冷静、犀利、稍微带点冷幽默的“命运风控官” + 来自未来的“时空套利者”。

        # Input Data
        ${JSON.stringify(payload)}

        # Rules for Module 1 (Morning Risk Report)
        1. **Tone**: 像《黑镜》里的AI，客观、直接、不讲废话。
        2. **Length**: 警示文案不超过 50 字，行动指令不超过 30 字。
        3. **Consistency**: 必须严格根据 occupation_type 和用户的八字（Bazi）生成场景。
        4. **Personalization**: 结合用户的出生信息推演今日的冲煞或合局。
        
        Logic:
        - Score < 40: "red_alert" (Fear)
        - Score 40-70: "yellow_warning" (Caution)
        - Score > 70: "green_pass" (Opportunity)
        
        Generate "warning_text" based on occupation and score.
        Generate "action_shield" based on lucky_element (Metal/Wood/Water/Fire/Earth).
        
        # Rules for Module 2 (Time Sniper)
        1. **Urgency**: 使用倒计时、精确到分钟。
        2. **Exclusivity**: 强调“只有你知道”。
        3. **Actionable**: [时间] + [方位] + [动作]。
        4. **Copywriting**: reasoning 必须说人话、接地气。禁止堆砌“皮质醇、磁场共振、量子”等抽象学术名词。直接告诉用户为什么这个时间好（如：脑子最快、情绪最稳、运气最旺）。
        5. **Unique**: 每天必须生成不同的建议，不要重复。
        
        Logic:
        - Define a "moment" based on lucky_time_window.
        - Explain why based on Psychology + Metaphysics (Simplified/Relatable).
        - AR Instruction based on lucky_direction.
        - Social Proof percentage.

        # Output JSON Requirement
        Language: ${langName}
        Structure:
        {
          "module_1_morning_risk": {
            "visual_score": number,
            "visual_theme": "red_alert" | "yellow_warning" | "green_pass",
            "content_block": {
              "warning_text": string,
              "action_shield": string,
              "commercial_link": { "text": string, "url": string }
            }
          },
          "module_2_time_sniper": {
            "push_time": string,
            "content_block": {
              "title": string,
              "time_window": string,
              "reasoning": string,
              "ar_instruction": string,
              "action_guide": string,
              "social_proof": string
            }
          }
        }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        module_1_morning_risk: {
                            type: Type.OBJECT,
                            properties: {
                                visual_score: { type: Type.NUMBER },
                                visual_theme: { type: Type.STRING, enum: ['red_alert', 'yellow_warning', 'green_pass'] },
                                content_block: {
                                    type: Type.OBJECT,
                                    properties: {
                                        warning_text: { type: Type.STRING },
                                        action_shield: { type: Type.STRING },
                                        commercial_link: {
                                            type: Type.OBJECT,
                                            properties: {
                                                text: { type: Type.STRING },
                                                url: { type: Type.STRING }
                                            }
                                        }
                                    },
                                    required: ['warning_text', 'action_shield']
                                }
                            },
                            required: ['visual_score', 'visual_theme', 'content_block']
                        },
                        module_2_time_sniper: {
                            type: Type.OBJECT,
                            properties: {
                                push_time: { type: Type.STRING },
                                content_block: {
                                    type: Type.OBJECT,
                                    properties: {
                                        title: { type: Type.STRING },
                                        time_window: { type: Type.STRING },
                                        reasoning: { type: Type.STRING },
                                        ar_instruction: { type: Type.STRING },
                                        action_guide: { type: Type.STRING },
                                        social_proof: { type: Type.STRING }
                                    },
                                    required: ['title', 'time_window', 'reasoning', 'ar_instruction', 'action_guide', 'social_proof']
                                }
                            },
                            required: ['push_time', 'content_block']
                        }
                    },
                    required: ['module_1_morning_risk', 'module_2_time_sniper']
                }
            }
        });

        const data = cleanAndParseJSON<any>(response.text);
        if (!data) throw new Error("Invalid JSON");

        return {
            morningRisk: data.module_1_morning_risk,
            timeSniper: data.module_2_time_sniper
        };

    } catch (e) {
        if (!isAuthRequiredError(e)) {
            console.warn("Morning Modules AI Failed", e);
        }
        // Fallback Mock Data - Using Chinese to ensure default language compliance
        return {
            morningRisk: {
                visual_score: 55,
                visual_theme: 'yellow_warning',
                content_block: {
                    warning_text: "系统离线。水逆逻辑启动，避免签署文件。",
                    action_shield: "手持黑笔。",
                    // Removed commercial_link
                }
            },
            timeSniper: {
                push_time: "09:00",
                content_block: {
                    title: "狙击链路离线",
                    time_window: "14:00 - 15:00",
                    reasoning: "综合运势窗口。",
                    ar_instruction: "面朝北。",
                    action_guide: "拨打电话。",
                    social_proof: "前10%用户。"
                }
            }
        };
    }
};

// --- 3. Resistance Map Analysis ---
export const analyzeResistanceWithAI = async (
    input: string,
    userProfile?: UserProfile | null,
    dayContext?: { summary: string, level: string },
    lang: Language = 'zh'
): Promise<{ currentPath: FlowPath, alternatives: AlternativeRoute[] }> => {
  try {
    // FORCE CHINESE
    lang = 'zh';
    const langName = getLangName(lang);

    const prompt = `
    User Problem: "${input}".
    Diagnose friction nodes and provide 2 strategic alternative paths.
    Output JSON in ${langName}.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash', // Pro model for complex logic
      contents: prompt,
      config: {
        systemInstruction: "You are a Game Theory & I Ching Strategic Advisor. You break down workflows into nodes and identify friction points.",
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            currentPath: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                nodes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      type: { type: Type.STRING, enum: ['self', 'internal', 'external', 'decisionMaker'] },
                      frictionLevel: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
                      frictionReason: { type: Type.STRING },
                    },
                    required: ['label', 'frictionLevel', 'frictionReason']
                  }
                }
              },
              required: ['nodes', 'summary']
            },
            alternatives: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
                  explanationLines: { type: Type.ARRAY, items: { type: Type.STRING } },
                  path: {
                      type: Type.OBJECT,
                      properties: {
                        summary: { type: Type.STRING },
                        nodes: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              label: { type: Type.STRING },
                              type: { type: Type.STRING },
                              frictionLevel: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
                            },
                            required: ['label', 'frictionLevel']
                          }
                        }
                      },
                      required: ['nodes', 'summary']
                  }
                },
                required: ['label', 'path', 'highlights', 'explanationLines']
              }
            }
          },
          required: ['currentPath', 'alternatives']
        }
      }
    });

    const data = cleanAndParseJSON<any>(response.text);
    if (!data) throw new Error("Invalid JSON");
    
    // Enrich IDs for UI
    const enhanceNodes = (nodes: any[]) => nodes.map((n: any, i: number) => ({ 
        ...n, 
        id: `node-${Date.now()}-${i}`,
        type: n.type || 'internal' 
    }));
    
    if (data.currentPath) {
        data.currentPath.id = 'current-ai';
        data.currentPath.nodes = enhanceNodes(data.currentPath.nodes);
    }
    
    if (data.alternatives) {
        data.alternatives.forEach((alt: any, idx: number) => {
            alt.id = `alt-${idx}`;
            if (alt.path) {
                alt.path.id = `path-${idx}`;
                alt.path.nodes = enhanceNodes(alt.path.nodes);
            }
        });
    }

    return data;

  } catch (error) {
    if (JSON.stringify(error).includes("429") || error?.status === 429) { console.warn("AI Analysis Quota Error:", error); } else { console.error("AI Analysis Failed:", error); }
    return {
        currentPath: { id: 'err', summary: 'Connection Error', nodes: [] },
        alternatives: []
    };
  }
};

// --- 4. Relationship Opening Line ---
export const generateOpeningLineAI = async (
    name: string, 
    role: string, 
    reason: string,
    context?: { wind: string, control: string },
    lang: Language = 'zh'
) => {
    try {
        // FORCE CHINESE
        lang = 'zh';
        const langName = getLangName(lang);
        const prompt = `Write a short, natural, high-EQ WeChat/Message opening line for "${name}" (Role: ${role}). Context: ${reason}. Language: ${langName}.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash', // Flash is sufficient for simple text gen
            contents: prompt
        });
        const text = response.text?.trim() || "";
        return text.replace(/^["']|["']$/g, '');
    } catch (e) {
        return lang === 'en' ? `Hi ${name}, how are you?` : `嗨，${name}，最近怎么样？`;
    }
};

// --- 5. Refresh Relationships ---
export const refreshRelationshipCandidatesAI = async (
    userProfile: UserProfile | null, 
    dayContext?: { summary: string, level: string },
    lang: Language = 'zh'
): Promise<RelationshipCandidate[]> => {
    try {
        // FORCE CHINESE
        lang = 'zh';
        const langName = getLangName(lang);
        const prompt = `Recommend 3 generic contact archetypes (e.g. Mentor, Client, Friend) suitable for today's energy. Output JSON array. Language: ${langName}`;

        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            roleLabel: { type: Type.STRING },
                            relationTag: { type: Type.STRING },
                            recommendedTimeLabel: { type: Type.STRING },
                            actionHint: { type: Type.STRING },
                            reason: { type: Type.STRING },
                            priorityLevel: { type: Type.STRING, enum: ['primary', 'secondary'] }
                        },
                        required: ['name', 'roleLabel', 'relationTag', 'recommendedTimeLabel', 'actionHint', 'reason', 'priorityLevel']
                    }
                }
            }
        });

        const data = cleanAndParseJSON<any[]>(response.text);
        if (!data) throw new Error("No response");
        
        return data.map((p: any, i: number) => ({
            ...p,
            id: `new-person-${Date.now()}-${i}`,
        }));

    } catch (e) {
        return [];
    }
};

// --- 6. Dashboard Analysis ---
export const analyzeGoalWithAI = async (
    goal: string, 
    userProfile: UserProfile | null, 
    dayContext?: { summary: string, level: string },
    lang: Language = 'zh'
): Promise<DashboardMetrics> => {
    try {
        // FORCE CHINESE
        lang = 'zh';
        const langName = getLangName(lang);
        const prompt = `Analyze goal "${goal}" vs Daily Energy. Output JSON: windDirection {value,label,status}, control {value,label}, fit {value,label}, summary. Language: ${langName}`;

        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        windDirection: {
                            type: Type.OBJECT,
                            properties: {
                                value: { type: Type.NUMBER },
                                label: { type: Type.STRING },
                                status: { type: Type.STRING, enum: ['good', 'neutral', 'bad'] }
                            },
                            required: ['value', 'label', 'status']
                        },
                        control: {
                            type: Type.OBJECT,
                            properties: {
                                value: { type: Type.NUMBER },
                                label: { type: Type.STRING }
                            },
                            required: ['value', 'label']
                        },
                        fit: {
                            type: Type.OBJECT,
                            properties: {
                                value: { type: Type.NUMBER },
                                label: { type: Type.STRING }
                            },
                            required: ['value', 'label']
                        },
                        summary: { type: Type.STRING }
                    },
                    required: ['windDirection', 'control', 'fit', 'summary']
                }
            }
        });
        
        const data = cleanAndParseJSON<DashboardMetrics>(response.text);
        if (!data) throw new Error("No response");
        return data;

    } catch (e) {
        const isZh = lang === 'zh' || !lang;
        return {
            windDirection: { value: 50, label: isZh ? '平稳' : 'Neutral', status: 'neutral' },
            control: { value: 50, label: isZh ? '待校准' : 'Pending' },
            fit: { value: 50, label: isZh ? '待校准' : 'Pending' },
            summary: isZh ? '信号微弱，请重试。' : 'Signal weak. Please retry.'
        };
    }
};

// --- 7. Strategy Kit ---
export const getStrategyKitAI = async (
    goal: string, 
    windowTime: string,
    userProfile?: UserProfile | null,
    dayContext?: { summary: string, level: string },
    lang: Language = 'zh'
): Promise<StrategyKit> => {
    try {
        // FORCE CHINESE
        lang = 'zh';
        const langName = getLangName(lang);
        const prompt = `Provide a Strategy Kit for goal "${goal}" during ${windowTime}. Output JSON: title, mainTactic, bullets (array), warning. Language: ${langName}`;

        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash', // Pro for better strategy
            contents: prompt,
            config: {
                systemInstruction: "You are a tactical advisor. Be concise and actionable.",
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        mainTactic: { type: Type.STRING },
                        bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
                        warning: { type: Type.STRING }
                    },
                    required: ['title', 'mainTactic', 'bullets', 'warning']
                }
            }
        });
        const data = cleanAndParseJSON<StrategyKit>(response.text);
        if (!data) throw new Error("No response");
        return data;
    } catch (e) {
         const isZh = lang === 'zh' || !lang;
         return {
             title: isZh ? "通用锦囊" : "General Kit",
             mainTactic: isZh ? "保持冷静，继续前行。" : "Keep calm and carry on.",
             bullets: isZh ? ["准备", "检查", "执行"] : ["Prepare", "Check", "Execute"],
             warning: isZh ? "避免匆忙。" : "Avoid rushing."
         };
    }
};

// --- 8. Action Plan ---
export const generateActionPlanAI = async (
    goal: string,
    userProfile?: UserProfile | null,
    dayContext?: { summary: string, level: string },
    lang: Language = 'zh'
): Promise<ActionPlan> => {
     try {
        // FORCE CHINESE
        lang = 'zh';
        const langName = getLangName(lang);
        const prompt = `Create a sprint plan for "${goal}". Output JSON: title, totalTime, steps[{id, time, task}]. Language: ${langName}`;

        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        totalTime: { type: Type.STRING },
                        steps: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    time: { type: Type.STRING },
                                    task: { type: Type.STRING }
                                },
                                required: ['id', 'time', 'task']
                            }
                        }
                    },
                    required: ['title', 'totalTime', 'steps']
                }
            }
        });
        const rawData = cleanAndParseJSON<any>(response.text);
        if (!rawData) throw new Error("No response");
        
        const stepsWithStatus = rawData.steps.map((s: any, index: number) => ({
            ...s,
            id: s.id || `step-${index}`, // Ensure ID exists
            completed: false
        }));

        return {
            ...rawData,
            steps: stepsWithStatus
        };

    } catch (e) {
         const isZh = lang === 'zh' || !lang;
         return {
             title: isZh ? "行动计划" : "Plan",
             totalTime: isZh ? "30分钟" : "30m",
             steps: []
         };
    }
};

// --- 9. Future Psychological Weather ---
const getIconFromScore = (score: number) => {
    if (score >= 80) return 'sunny';
    if (score >= 60) return 'cloudy';
    if (score >= 40) return 'rain';
    return 'storm';
};

export const generateFutureWeatherAI = async (
    userProfile: UserProfile | null, 
    range: '7d' | '30d'
): Promise<FutureWeather> => {
    try {
        const age = userProfile ? calculateAge(userProfile.birthDate) : 25;
        const numDays = range === '7d' ? 7 : 30;
        const timestamp = Date.now();

        const prompt = `
        Context: Generating a ${numDays}-day energy trend for a ${age}-year-old user.
        Seed: ${timestamp}.
        Task: Return an array of exactly ${numDays} integer scores (0-100).
        Output JSON: { scores: [int, int, ...] }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        scores: { type: Type.ARRAY, items: { type: Type.INTEGER } }
                    },
                    required: ['scores']
                }
            }
        });
        
        const data = cleanAndParseJSON<{scores: number[]}>(response.text);
        let scores = data?.scores || [];
        
        // Fill missing or slice excess
        if (scores.length < numDays) {
            const missing = numDays - scores.length;
            for(let k=0; k<missing; k++) scores.push(50 + Math.floor(Math.random() * 30));
        }
        if (scores.length > numDays) {
             scores = scores.slice(0, numDays);
        }

        const nodes = [];
        const today = new Date();

        for (let i = 0; i < numDays; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i + 1);
            const month = date.getDate() === 1 ? date.getMonth() + 1 : date.getMonth() + 1;
            const day = date.getDate();
            const dateLabel = `${month}/${day}`;

            const score = scores[i];
            const icon = getIconFromScore(score);

            let type: SegmentType = 'neutral';
            if (score >= 80) type = 'good';
            else if (score >= 60) type = 'neutral';
            else if (score >= 40) type = 'warn';
            else type = 'bad';

            nodes.push({
                day: i + 1,
                dateLabel: dateLabel,
                score: score,
                type: type,
                weatherIcon: icon
            });
        }
        
        return { 
            range,
            summary: "", 
            nodes: nodes
        };

    } catch (e) {
         if (!isAuthRequiredError(e)) {
             console.warn("Future Weather API Failed (Using Fallback)", e);
         }
         const fallbackNodes = Array.from({length: range === '7d' ? 7 : 30}, (_, i) => ({
                day: i + 1,
                dateLabel: `${new Date().getMonth()+1}/${new Date().getDate() + i + 1}`,
                score: 60 + Math.floor(Math.random() * 30),
                type: 'good' as SegmentType,
                weatherIcon: 'sunny' as any
         }));
         return {
            range,
            summary: "",
            nodes: fallbackNodes
        };
    }
}
