import { UserData, LifeBookData, LifeBookPageData } from '../types';
import { formatLocalDate } from './gemini';
import { calculateDestinyProfile, build99Pages, DestinyProfile } from './manualTemplates';
import { parseLocalDate } from './astrologyEngine';
import { GoogleGenAI, Type, type GenerateContentResponse } from '../../services/geminiProxyClient';
import { hasAuthTokens } from '../../services/apiBase';

const ai = new GoogleGenAI({});

const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('LIFE_BOOK_AI_TIMEOUT')), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export const generateLifeBook = async (
  userData: UserData | null,
  language: string = 'zh',
  skipAI: boolean = false
): Promise<LifeBookData> => {
  const today = new Date();
  const dateStr = formatLocalDate(today);

  // 1. Ensure user data is present, otherwise create custom target guest
  const activeUserData: UserData = userData || {
    name: "旅行者",
    birthDate: parseLocalDate("2000-01-01"),
    birthTime: "12:00",
    gender: "neutral",
    location: "赛博空间"
  };

  // 2. Compute Destiny Profile deterministically (千人千面先算)
  const profile: DestinyProfile = calculateDestinyProfile(activeUserData);

  // 3. Populate 99 Pages using manual templates
  const pages: LifeBookPageData[] = build99Pages(profile);

  // 4. If AI synthesis is requested (skipAI is false), enrich core narrative pages using Gemini 3.5
  if (!skipAI && hasAuthTokens()) {
    try {
      const dm = profile.bazi.dayMaster;
      const systemPrompt = `你现在是一名顶级命理算法系统设计师结合高维灵魂叙事宗师。
你的任务是将天命参数进行高度 resonant（共鸣性）的叙事合成。语言风格：深刻、克制、一针见血、充满宿命感、文笔极高、字字诛心却心怀慈悲。
坚决避免任何巴纳姆效应的废话，禁止盲目讨好，禁止世俗说教。`;

      const userPrompt = `【持有人姓名】: ${activeUserData.name}
【日主本源】: ${dm.stem}${dm.element} (${dm.yinYang === 'yang' ? '阳极' : '阴极'}, 强度 Score: ${dm.strengthScore})
【五行偏枯】: 最强 ${profile.derivedProfile.fiveElementExtremes.strongest}, 最弱 ${profile.derivedProfile.fiveElementExtremes.weakest}
【心智伤口】: ${profile.derivedProfile.soulWound}
【事业机制】: ${profile.derivedProfile.careerEngine}
【财富容器】: ${profile.derivedProfile.wealthPattern}
【关系博弈模式】: ${profile.derivedProfile.relationshipPattern}
【易经本命卦】: ${profile.iching.natalHexagram.name} (${profile.iching.natalHexagram.coreTheme})

请你结合以上数据，为该用户深度定制两篇独立的叙事合成文本。
格式要求：必须输出为 JSON 对象，包含两个键:
1. "coverGreeting": 大约 250 字左右，作为第 1 页的深度说明书入卷引言，写出其日主的特异格调，指出其深层心因和本说明书的反锁定制。
2. "soulLetter": 大约 400 字左右，作为第 98 页合卷前的灵魂回响信。请把他的痛苦、天赋、灵魂原力剖析得淋漓尽致，像一位认领了他一生的观测者，递给他一份不合常理的高维指引，彻底点亮他的底层代码，激励他打破宿命惯性重构人生。

输出格式必须是合法的 JSON 字符串，直接输出 {} ，不要包含 markdown 代码块包围标记。`;

      const result = await withTimeout<GenerateContentResponse & { text?: string }>(
        ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: [
            {
              role: 'user',
              parts: [{ text: systemPrompt + '\n\n' + userPrompt }]
            }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                coverGreeting: { type: Type.STRING },
                soulLetter: { type: Type.STRING }
              },
              required: ["coverGreeting", "soulLetter"]
            }
          }
        }) as Promise<GenerateContentResponse & { text?: string }>,
        18000
      );

      if (result) {
        const rawText = result.text || '';
        // Strip out optional markdown blocks if they are present in rawText
        const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonResult = JSON.parse(cleanedText);

        if (jsonResult.coverGreeting) {
          pages[0].content = jsonResult.coverGreeting;
          if (pages[0].visualItems) {
            pages[0].visualItems.push({
              type: 'tag',
              label: 'AI心灵合成',
              value: 'COMPLETED'
            });
          }
        }
        if (jsonResult.soulLetter) {
          const paragraphs = jsonResult.soulLetter.split('\n').map(p => p.trim()).filter(Boolean);
          if (paragraphs.length >= 3 && pages[97] && pages[98]) {
            const halfIndex = Math.ceil(paragraphs.length / 2);
            const part1 = paragraphs.slice(0, halfIndex).join('\n\n');
            const part2 = paragraphs.slice(halfIndex).join('\n\n');
            
            pages[97].content = part1;
            pages[97].title = `天意回响：给旅行者的灵魂判词信 (上篇)`;
            
            pages[98].content = part2;
            pages[98].title = `天意回向：给旅行者的灵魂判词信 (下篇)`;
          } else {
            if (pages[97]) {
              pages[97].content = jsonResult.soulLetter;
              pages[97].title = `天意回向：给旅行者的灵魂判词信`;
            }
          }
        }
      }
    } catch (e) {
      console.warn("Gemini synthesis temporary failed or timed out. Gracefully fall back to deterministic templates, preserving 100% stability.", e);
    }
  }

  return {
    ownerName: activeUserData.name,
    generatedDate: dateStr,
    pages: pages,
    isFallback: false
  };
};
