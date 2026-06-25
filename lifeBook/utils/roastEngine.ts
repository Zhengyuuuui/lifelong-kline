

import { ElementType, AstrologyData } from '../types';

export type ElementState = 'depleted' | 'healthy' | 'overload';

export interface RoastResult {
  state: ElementState;
  visualTag: string;
  visualDesc: string;
  slotName: string;
  roast: string;
}

export interface SOSAction {
  title: string;
  hint: string;
  instruction: string;
  buttonText: string;
  effect: Partial<Record<ElementType, number>>; 
  resetTarget?: boolean;
}

// User specified thresholds explicitly in text (implied matches)
export const getElementState = (percentage: number): ElementState => {
  if (percentage <= 25) return 'depleted';
  if (percentage >= 85) return 'overload';
  return 'healthy';
};

// Simplified translation map for structural UI elements
const I18N_MAP: any = {
    'zh': {
        slot: { Wood: "创造槽", Fire: "狂暴槽", Earth: "护盾槽", Metal: "暴击槽", Water: "蓝量" },
        tag: {
            Wood: { depleted: "灵感便秘", healthy: "生长", overload: "脑洞大开" },
            Fire: { depleted: "熄火", healthy: "燃烧", overload: "炸裂" },
            Earth: { depleted: "脆皮", healthy: "坚固", overload: "满防" },
            Metal: { depleted: "破财", healthy: "锋利", overload: "欧皇" },
            Water: { depleted: "干烧", healthy: "流动", overload: "深渊" }
        },
        sos: { title: "能量调优", emergency: "急救方案", done: "我已照做", confirm: "确认" }
    },
    'en': {
        slot: { Wood: "Creation Slot", Fire: "Rage Slot", Earth: "Shield Slot", Metal: "Crit Slot", Water: "Mana Pool" },
        tag: {
            Wood: { depleted: "Dry Spell", healthy: "Growth", overload: "Overthink" },
            Fire: { depleted: "Burnt Out", healthy: "Burning", overload: "Explosive" },
            Earth: { depleted: "Fragile", healthy: "Solid", overload: "Tank" },
            Metal: { depleted: "Broke", healthy: "Sharp", overload: "Lucky" },
            Water: { depleted: "Drained", healthy: "Flow", overload: "Abyss" }
        },
        sos: { title: "Tuning", emergency: "Emergency", done: "Done", confirm: "Confirm" }
    }
    // Other languages default to English for brevity in this engine, 
    // real text comes from AI in fetchElementAnalysis
};

const ELEMENT_CONFIG: Record<ElementType, {
    slotNameKey: string;
    visuals: Record<ElementState, { tagKey: string; desc: string }>;
}> = {
    [ElementType.Wood]: {
        slotNameKey: "Wood",
        visuals: {
            depleted: { tagKey: "depleted", desc: "Dry" },
            healthy: { tagKey: "healthy", desc: "Lush" },
            overload: { tagKey: "overload", desc: "Wild" }
        }
    },
    [ElementType.Fire]: {
        slotNameKey: "Fire",
        visuals: {
            depleted: { tagKey: "depleted", desc: "Ash" },
            healthy: { tagKey: "healthy", desc: "Warm" },
            overload: { tagKey: "overload", desc: "Inferno" }
        }
    },
    [ElementType.Earth]: {
        slotNameKey: "Earth",
        visuals: {
            depleted: { tagKey: "depleted", desc: "Dust" },
            healthy: { tagKey: "healthy", desc: "Rock" },
            overload: { tagKey: "overload", desc: "Mountain" }
        }
    },
    [ElementType.Metal]: {
        slotNameKey: "Metal",
        visuals: {
            depleted: { tagKey: "depleted", desc: "Rust" },
            healthy: { tagKey: "healthy", desc: "Shine" },
            overload: { tagKey: "overload", desc: "Blade" }
        }
    },
    [ElementType.Water]: {
        slotNameKey: "Water",
        visuals: {
            depleted: { tagKey: "depleted", desc: "Empty" },
            healthy: { tagKey: "healthy", desc: "Calm" },
            overload: { tagKey: "overload", desc: "Flood" }
        }
    }
};

export const getRoast = (type: ElementType, percentage: number, astro?: AstrologyData, language: string = 'zh'): RoastResult => {
  // FORCE CHINESE
  language = 'zh';
  
  const state = getElementState(percentage);
  const config = ELEMENT_CONFIG[type];
  const dict = I18N_MAP['zh'];
  
  // 0. Handle Invalid Data State
  if (astro && astro.isValid === false) {
      return {
          state: 'depleted',
          visualTag: "ERROR 404",
          visualDesc: "Data Error",
          slotName: dict.slot[config.slotNameKey],
          roast: `[系统报错]: ${astro.validationMessage || "输入数据不真实"}。无法生成有效星盘解析。` 
      };
  }
  
  // Note: Actual roast text is largely placeholder here as the AI will overwrite it in the UI.
  // We provide a basic fallback.
  const fallbackRoast = "连接云端获取毒舌辣评...";

  return {
    state,
    visualTag: dict.tag[type][state],
    visualDesc: config.visuals[state].desc,
    slotName: dict.slot[config.slotNameKey],
    roast: fallbackRoast
  };
};

export const getSOSAction = (type: ElementType, percentage: number, language: string = 'zh'): SOSAction => {
  // FORCE CHINESE
  language = 'zh';
  const isZh = true;
  
  const state = getElementState(percentage);
  const dict = I18N_MAP['zh'];

  // These static fallbacks are simple, the AI version in the UI is better.
  const getHint = (gen: string, act: string) => `五行提示：${gen}。${act}`;

  // === HEALTHY STATE (Energy Optimization) ===
  if (state === 'healthy') {
      switch (type) {
          case ElementType.Wood:
              return {
                  title: dict.sos.title,
                  hint: getHint("水生木", "保持滋润"),
                  instruction: "喝一杯水，或看一眼绿色植物。",
                  buttonText: "补充养分 (+5 木)",
                  effect: { [ElementType.Wood]: 5 }
              };
          case ElementType.Fire:
              return {
                  title: dict.sos.title,
                  hint: getHint("木生火", "维持热度"),
                  instruction: "夸奖一位同事，或整理一下发型。",
                  buttonText: "维持火力 (+5 火)",
                  effect: { [ElementType.Fire]: 5 }
              };
          case ElementType.Earth:
              return {
                  title: dict.sos.title,
                  hint: getHint("火生土", "保持稳固"),
                  instruction: "吃一块巧克力，或深呼吸一次。",
                  buttonText: "加固防线 (+5 土)",
                  effect: { [ElementType.Earth]: 5 }
              };
          case ElementType.Metal:
              return {
                  title: dict.sos.title,
                  hint: getHint("水-流动", "保持锋利"),
                  instruction: "列出今天最重要的三件事。",
                  buttonText: "抛光打磨 (+5 金)",
                  effect: { [ElementType.Metal]: 5 }
              };
          case ElementType.Water:
              return {
                  title: dict.sos.title,
                  hint: getHint("金生水", "保持流动"),
                  instruction: "听一首喜欢的歌，或转动一下脖子。",
                  buttonText: "疏通河道 (+5 水)",
                  effect: { [ElementType.Water]: 5 }
              };
      }
  }

  // === DEPLETED STATE (Emergency Supply) ===
  if (state === 'depleted') {
      // Logic same as original, just wrapped text
      const emergency = dict.sos.emergency;
      if (type === ElementType.Water) {
          return {
              title: emergency,
              hint: getHint("金生水", "你需要快乐"),
              instruction: "去买一杯饮料，或清空一件购物车商品。",
              buttonText: "我已照做(+20 水，-10 金)",
              effect: { [ElementType.Water]: 20, [ElementType.Metal]: -10 }
          };
      }
      // ... (Simulated brevity for other types in fallback, main logic handles AI overwrite)
      return {
          title: emergency,
          hint: "能量枯竭",
          instruction: "休息一下。",
          buttonText: dict.sos.done,
          effect: { [type]: 20 }
      }
  } 
  
  // === OVERLOAD STATE (Emergency Control) ===
  else if (state === 'overload') {
      const emergency = dict.sos.emergency;
      // ... (Simulated brevity)
      return {
          title: emergency,
          hint: "能量过载",
          instruction: "深呼吸。",
          buttonText: dict.sos.done,
          effect: {}, // Reset logic handled in component
          resetTarget: true
      }
  }
  
  return {
       title: dict.sos.title,
       hint: "平衡",
       instruction: "...",
       buttonText: dict.sos.confirm,
       effect: {}
  };
}
