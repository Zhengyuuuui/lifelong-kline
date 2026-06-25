

import React, { useEffect, useState, useRef, useMemo, Suspense, lazy } from 'react';
const ElementsScene = lazy(() => import('./components/ElementsScene'));
import Dashboard from './components/Dashboard';
import Onboarding from './components/Onboarding';
import LifeBook from './components/LifeBook';
import CheatSheetSection from './components/CheatSheet';
import InstantInventory from './components/InstantInventory'; // New Module
import { TutorialOverlay } from './components/TutorialOverlay'; // New Tutorial Module
import { getDailyEnergyLevels } from './utils/energyCalculator';
import { generateLifeBook } from './utils/lifeBookGenerator';
import { calculateAstrologyData, formatLocalDateKey, parseLocalDate } from './utils/astrologyEngine';
import { generateCheatCards, validateUserProfile, getFallbackCheats } from './utils/gemini';
import { ElementData, ElementType, UserData, LifeBookData, AstrologyData, CheatCard } from './types';
import { useI18n, I18nProvider } from './utils/i18nContext';
import { ArrowLeft } from 'lucide-react'; // Import Icon
import { ModuleHelperTag } from '../components/ModuleHelperTag';
import './lifebook-style.css'; // Import Styles

const KEY_USER_DATA = 'life_book_user_data';
const KEY_LIFE_BOOK = 'life_book_data_v2';
const KEY_CHEATS = 'life_book_cheats';
const KEY_CHEAT_DATE = 'life_book_cheat_date';
const KEY_SAVED_ENERGY = 'life_book_energy';
const KEY_TUTORIAL = 'life_book_tutorial_done';

interface AppProps {
  onBack?: () => void;
  isExpanded?: boolean;
  onExpand?: () => void;
  userProfile?: {
    name: string;
    birthDate: string;
    birthTime: string;
    birthPlace: string;
    gender: string;
  };
  insight?: any;
  activeUserBazi?: any;
  isPremium?: boolean;
  onRequirePremium?: () => void;
  onResetProfile?: () => void;
  allowAi?: boolean;
}

// Descriptions for the elements (Static Maps for I18N)
const INITIAL_DESCRIPTIONS_EN: Record<ElementType, string> = {
  [ElementType.Wood]: "扎根与延展。生命生长的有机原力。",
  [ElementType.Fire]: "体积燃烧。激情与变革的上升驱动力。",
  [ElementType.Earth]: "固态物质。稳定与滋养的引力中心。",
  [ElementType.Metal]: "精细结构。磁性与精度的流体逻辑。",
  [ElementType.Water]: "悬浮流动。零重力下的适应性本质。",
};

const INITIAL_DESCRIPTIONS_ZH: Record<ElementType, string> = {
  [ElementType.Wood]: "扎根与延展。生命生长的有机原力。",
  [ElementType.Fire]: "体积燃烧。激情与变革的上升驱动力。",
  [ElementType.Earth]: "固态物质。稳定与滋养的引力中心。",
  [ElementType.Metal]: "精细结构。磁性与精度的流体逻辑。",
  [ElementType.Water]: "悬浮流动。零重力下的适应性本质。",
};

const TRAITS_EN: Record<ElementType, string> = {
  [ElementType.Wood]: "生长", [ElementType.Fire]: "动力", [ElementType.Earth]: "稳固", [ElementType.Metal]: "逻辑", [ElementType.Water]: "适应"
};
const TRAITS_ZH: Record<ElementType, string> = {
  [ElementType.Wood]: "生长", [ElementType.Fire]: "动力", [ElementType.Earth]: "稳固", [ElementType.Metal]: "逻辑", [ElementType.Water]: "适应"
};

const ELEMENT_NAMES_ZH: Record<ElementType, string> = {
  [ElementType.Wood]: "木", [ElementType.Fire]: "火", [ElementType.Earth]: "土", [ElementType.Metal]: "金", [ElementType.Water]: "水"
};
const ELEMENT_NAMES_EN: Record<ElementType, string> = {
  [ElementType.Wood]: "木", [ElementType.Fire]: "火", [ElementType.Earth]: "土", [ElementType.Metal]: "金", [ElementType.Water]: "水"
};


const COLORS: Record<ElementType, string> = {
  [ElementType.Wood]: "text-emerald-400",
  [ElementType.Fire]: "text-orange-500",
  [ElementType.Earth]: "text-stone-400",
  [ElementType.Metal]: "text-amber-400", // Gold for Metal
  [ElementType.Water]: "text-cyan-400",
};

// Fixed order: Metal -> Wood -> Water -> Fire -> Earth
const ELEMENT_ORDER = [
  ElementType.Metal,
  ElementType.Wood,
  ElementType.Water,
  ElementType.Fire,
  ElementType.Earth
];

// Fallback Mock Data for Cheat Cards (Updated to be Grounded/Daily Life style) - NOTE: This is initial state only, dynamic provided by gemini.ts
const MOCK_CHEATS: CheatCard[] = [
  {
    id: 'mock-init-1',
    type: 'prop',
    title: '降噪耳机',
    description: '系统检测到你的土属性（防御）过低。戴上它，物理屏蔽老板的画饼和同事的废话，还你一片净土。',
    duration: '4小时',
    effects: { [ElementType.Earth]: 30, [ElementType.Fire]: -10 },
    linkText: '开启勿扰'
  },
  {
    id: 'mock-init-2',
    type: 'consumable',
    title: '冰美式',
    description: '你的火属性（动力）熄火了？来一杯加浓冰美式，虽然苦，但能让你在下午三点保持清醒。',
    duration: '2小时',
    effects: { [ElementType.Fire]: 40, [ElementType.Water]: -20 },
    linkText: '去咖啡店'
  },
  {
    id: 'mock-init-3',
    type: 'environment',
    title: '楼下便利店',
    description: '工位气压太低时，这里是唯一的庇护所。',
    duration: '15分钟',
    effects: { [ElementType.Water]: 20, [ElementType.Metal]: 10 },
    linkText: '去避难'
  }
];

export function LifeBookContent({ onBack, userProfile, insight, activeUserBazi, isExpanded, onExpand, isPremium, onRequirePremium, onResetProfile, allowAi = false }: AppProps) {
  const { language } = useI18n();

  const injectStages = (bookStr: LifeBookData | null): LifeBookData | null => {
      return bookStr;
  }
  
  // Update the book if insight or activeUserBazi changes while we already have it
  useEffect(() => {
     if (lifeBookData) {
         setLifeBookData(injectStages(lifeBookData));
     }
  }, [insight, activeUserBazi]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Initialize State from Storage if available
  const [userData, setUserData] = useState<UserData | null>(() => {
    if (!allowAi) return null;
    try {
      const stored = localStorage.getItem(KEY_USER_DATA);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Rehydrate Date Object
        if (parsed.birthDate) {
          parsed.birthDate = parseLocalDate(parsed.birthDate);
        }
        return parsed;
      }
      return null;
    } catch (e) { return null; }
  });

  const [hasOnboarded, setHasOnboarded] = useState(() => {
    if (!allowAi) return false;
    // If we have user data, we are onboarded
    try {
      const stored = localStorage.getItem(KEY_USER_DATA);
      return !!stored;
    } catch (e) { return false; }
  });

  const [astrologyData, setAstrologyData] = useState<AstrologyData | undefined>(undefined);
  const [showTutorial, setShowTutorial] = useState(false); // Tutorial State

  // Base Energy (Before Buffs)
  const [baseElements, setBaseElements] = useState<Record<ElementType, number>>(() => {
    const levels = getDailyEnergyLevels(userData || undefined); // Pass userData if exists
    return levels;
  });

  // Display Elements (After Buffs)
  const [elements, setElements] = useState<ElementData[]>([]);

  // Cheat Sheet State (Always Visible now as a section)
  const [generatedCheats, setGeneratedCheats] = useState<CheatCard[]>(MOCK_CHEATS); // Init with Mocks
  const [activeCheats, setActiveCheats] = useState<CheatCard[]>([]);
  const [cheatModifiers, setCheatModifiers] = useState<Partial<Record<ElementType, number>>>({});

  // Loading States
  const [isGeneratingBook, setIsGeneratingBook] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [generationComplete, setGenerationComplete] = useState(false);

  // Race Condition Guard: Track current language ref
  const languageRef = useRef(language);
  const generationIdRef = useRef(0);
  const generationProgressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const generationCompletionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const clearGenerationTimers = () => {
    if (generationProgressTimerRef.current) {
      clearInterval(generationProgressTimerRef.current);
      generationProgressTimerRef.current = null;
    }
    if (generationCompletionTimerRef.current) {
      clearTimeout(generationCompletionTimerRef.current);
      generationCompletionTimerRef.current = null;
    }
  };

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      generationIdRef.current += 1;
      clearGenerationTimers();
    };
  }, []);

  const runLifeBookGeneration = (parsedUser: UserData, targetLang: string, isBackgroundUpdate: boolean = false) => {
    const generationId = isBackgroundUpdate ? generationIdRef.current : ++generationIdRef.current;
    if (!isBackgroundUpdate) {
      clearGenerationTimers();
    }
    const isCurrent = () =>
      isMountedRef.current &&
      generationIdRef.current === generationId &&
      languageRef.current === targetLang;

    if (!isBackgroundUpdate) {
      setIsGeneratingBook(true);
      setGenProgress(6);
      setGenerationComplete(false);
    }

    // Load the deterministic book immediately while secure AI enrichment finishes.
    generateLifeBook(parsedUser, targetLang, true)
      .then(staticBook => {
        if (isCurrent()) setLifeBookData(injectStages(staticBook));
      })
      .catch(() => undefined);

    if (!isBackgroundUpdate) {
      generationProgressTimerRef.current = setInterval(() => {
        setGenProgress(prev => {
          if (prev >= 98) return 98;
          return prev + Math.floor(Math.random() * 8) + 2;
        });
      }, 500);
    }

    generateLifeBook(parsedUser, targetLang, false)
      .then(book => {
        if (!isCurrent()) return;
        if (!isBackgroundUpdate && generationProgressTimerRef.current) {
          clearInterval(generationProgressTimerRef.current);
          generationProgressTimerRef.current = null;
        }

        const applyFinalBook = () => {
          if (!isCurrent()) return;
          const finalBook = injectStages(book);
          setLifeBookData(finalBook);
          if (!book.isFallback) localStorage.setItem(KEY_LIFE_BOOK, JSON.stringify(finalBook));
          if (!isBackgroundUpdate) {
            setGenerationComplete(true);
            setHasOnboarded(true);
          }
        };

        if (isBackgroundUpdate) {
          applyFinalBook();
          return;
        }

        setGenProgress(100);
        generationCompletionTimerRef.current = setTimeout(applyFinalBook, 800);
      })
      .catch(() => {
        if (!isCurrent() || isBackgroundUpdate) return;
        clearGenerationTimers();
        setGenProgress(100);
        setGenerationComplete(true);
        setHasOnboarded(true);
      });
  };

  // Public visitors receive deterministic demo content; authenticated profiles may use AI enrichment.
  useEffect(() => {
    // Check if we are ALREADY onboarded from storage (state init handled it)
    if (hasOnboarded) return;

    // Determine Profile Data (User or Guest) -> Triggers if NOT onboarded
    // Determine Profile Data (User or Guest) -> Triggers if NOT onboarded
    const profileData: UserData = userProfile ? {
      name: userProfile.name,
      birthDate: parseLocalDate(userProfile.birthDate),
      birthTime: userProfile.birthTime,
      location: userProfile.birthPlace, // Mapped to Correct Interface Key
      gender: (userProfile.gender === 'secret' ? 'neutral' : userProfile.gender) as 'male' | 'female' | 'neutral',
    } : {
      name: "旅行者",
      birthDate: parseLocalDate("2000-01-01"), // Default Date
      birthTime: "12:00",
      location: "宇宙", // Mapped to Correct Interface Key
      gender: "neutral"
    };

    // Trigger Logic
    handleOnboardingComplete(profileData);
  }, [userProfile, hasOnboarded, allowAi]); // removed userData dep to avoid loops

  // --- SYNC EXTERNAL USER PROFILE (FOR UPDATED OR LOGGED-IN USERS) ---
  useEffect(() => {
    if (!allowAi || !userProfile) return;

    const profileData: UserData = {
      name: userProfile.name,
      birthDate: parseLocalDate(userProfile.birthDate),
      birthTime: userProfile.birthTime || "12:00",
      location: userProfile.birthPlace || "未知",
      gender: (userProfile.gender === 'secret' ? 'neutral' : userProfile.gender) as 'male' | 'female' | 'neutral',
    };

    const hasChanged = !userData || 
      userData.name !== profileData.name ||
      userData.location !== profileData.location ||
      userData.gender !== profileData.gender ||
      userData.birthTime !== profileData.birthTime ||
      userData.birthDate.getTime() !== profileData.birthDate.getTime();

    if (hasChanged) {
      setUserData(profileData);
      setHasOnboarded(true);
      localStorage.setItem(KEY_USER_DATA, JSON.stringify(profileData));

      const levels = getDailyEnergyLevels(profileData);
      const astro = calculateAstrologyData(profileData);
      setBaseElements(levels);
      setAstrologyData(astro);

      runLifeBookGeneration(profileData, language, false);
      regenerateCheats(levels, language);
    }
  }, [userProfile, language, allowAi]);

  // Initialize Elements from base
  useEffect(() => {
    const isZh = language === 'zh';
    const names = isZh ? ELEMENT_NAMES_ZH : ELEMENT_NAMES_EN;
    const traits = isZh ? TRAITS_ZH : TRAITS_EN;
    const descs = isZh ? INITIAL_DESCRIPTIONS_ZH : INITIAL_DESCRIPTIONS_EN;

    const newElements = ELEMENT_ORDER.map((type) => {
      // Apply Cheat Modifiers
      const modifier = cheatModifiers[type] || 0;
      const baseVal = baseElements[type];
      const finalVal = Math.min(100, Math.max(5, baseVal + modifier));

      return {
        type,
        name: names[type],
        trait: traits[type],
        description: descs[type],
        percentage: finalVal,
        color: COLORS[type],
        position: [0, 0, 0] as [number, number, number],
      }
    });
    setElements(newElements);
  }, [baseElements, cheatModifiers, language]); // Added language dep

  const [activeIndex, setActiveIndex] = useState(2); // Start in middle
  const [showDetail, setShowDetail] = useState(false);
  // Removed isFadingOut state as it caused race conditions with dashboard visibility

  // Life Book State
  const [showLifeBook, setShowLifeBook] = useState(false);
  const [lifeBookData, setLifeBookData] = useState<LifeBookData | null>(null);

  // --- High Performance Drag Logic (useRef) ---
  const dragOffset = useRef(0);
  const startX = useRef<number | null>(null);
  const isDragging = useRef(false);

  // --- INITIALIZATION (PERSISTENCE CHECK) ---
  useEffect(() => {
    if (!allowAi) return;
    const storedUser = localStorage.getItem(KEY_USER_DATA);
    const storedBook = localStorage.getItem(KEY_LIFE_BOOK);

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Revive Date object
        parsedUser.birthDate = parseLocalDate(parsedUser.birthDate);

        // 1. Restore User & Energy
        setUserData(parsedUser);

        // Backend Logic: Check for intraday persisted energy state
        // This ensures if user refreshes, their "Food" or "SOS" effects remain active (Commercial Requirement)
        let levels = getDailyEnergyLevels(parsedUser);
        const todayStr = formatLocalDateKey();
        const savedEnergyJson = localStorage.getItem(KEY_SAVED_ENERGY);

        if (savedEnergyJson) {
          try {
            const savedEnergy = JSON.parse(savedEnergyJson);
            if (savedEnergy.date === todayStr && savedEnergy.levels) {
              levels = savedEnergy.levels; // Restore persisted state
            }
          } catch (e) { console.warn("Energy load failed, using calc"); }
        }

        const astro = calculateAstrologyData(parsedUser);

        setBaseElements(levels);
        setAstrologyData(astro);
        setHasOnboarded(true);

        // 2. Restore Book
        let isValidBook = false;
        if (storedBook && !storedBook.includes("系统离线模式")) {
            try {
                const parsed = JSON.parse(storedBook);
                if (!parsed.isFallback) isValidBook = true;
            } catch(e) {}
        }
        
        if (isValidBook) {
          setLifeBookData(injectStages(JSON.parse(storedBook!)));
        } else {
          runLifeBookGeneration(parsedUser, language, false); // Block with loading if no valid book
        }


        // 3. Restore or Regen Cheats (Daily Logic)
        const storedCheats = localStorage.getItem(KEY_CHEATS);
        const storedDate = localStorage.getItem(KEY_CHEAT_DATE);

        let parsedCheatsSuccess = false;
        if (storedCheats && storedCheats !== 'undefined' && storedCheats !== 'null' && storedDate === todayStr) {
          try {
            setGeneratedCheats(JSON.parse(storedCheats));
            parsedCheatsSuccess = true;
          } catch (e) {
            console.warn("Failed to parse lifeBook storedCheats:", e);
          }
        }
        
        if (!parsedCheatsSuccess) {
          // New day, corrupt data, or first time -> Generate new cheats
          regenerateCheats(levels, language);
        }

      } catch (e) {
        console.error("Failed to restore session", e);
        localStorage.removeItem(KEY_USER_DATA); // Clean corrupted data
      }
    }
  }, [allowAi]);

  // --- REGENERATE ON LANGUAGE CHANGE ---
  // When language changes, we re-run generation to ensure translations are correct
  useEffect(() => {
    if (!allowAi) {
      setGeneratedCheats(getFallbackCheats(language));
      return;
    }
    if (hasOnboarded && userData && !isGeneratingBook) {
      const targetLang = language;

      // 1. INSTANT FEEDBACK: Switch Cheats to synchronous fallback immediately
      // This prevents "Mixed Language" bug where headers are translated but cards are old
      setGeneratedCheats(getFallbackCheats(targetLang));

      // Cancel older in-flight generations so rapid language changes never restore stale content.
      runLifeBookGeneration(userData, targetLang, true);

      // 3. Regen Real Cheats (AI)
      regenerateCheats(baseElements, targetLang);
    }
  }, [language, hasOnboarded, userData, isGeneratingBook, allowAi]);


  const regenerateCheats = (currentLevels: Record<ElementType, number>, targetLang: string) => {
    if (!allowAi) {
      setGeneratedCheats(getFallbackCheats(targetLang));
      return;
    }
    const tempElements = ELEMENT_ORDER.map((type) => ({
      type,
      name: ELEMENT_NAMES_ZH[type],
      trait: TRAITS_ZH[type],
      description: INITIAL_DESCRIPTIONS_ZH[type],
      percentage: currentLevels[type],
      color: COLORS[type],
      position: [0, 0, 0] as [number, number, number],
    }));

    generateCheatCards(tempElements, targetLang).then(cheats => {
      // Race Condition Guard
      if (languageRef.current !== targetLang) return;

      if (cheats && cheats.length > 0) {
        setGeneratedCheats(cheats);
        localStorage.setItem(KEY_CHEATS, JSON.stringify(cheats));
        // Update Date Key to current day
        localStorage.setItem(KEY_CHEAT_DATE, formatLocalDateKey());
      }
    }).catch(e => console.log("Cheat Gen Error", e));
  }

  // Exposed handler for Manual Refresh
  const handleRefreshCheats = () => {
    regenerateCheats(baseElements, language);
  };

  const handleOnboardingComplete = async (data: UserData) => {
    try {
      // 1. VALIDATE USER INPUT (AI Check)
      // For auto-guest, we skip validation to ensure speed
      // We also skip validation if data comes from the main app to ensure instant loading
      let validation = { isValid: true, reason: "" };

      // 2. Process Data
      setUserData(data);
      if (allowAi) {
        localStorage.setItem(KEY_USER_DATA, JSON.stringify(data));
      }

      let levels = getDailyEnergyLevels(data);
      let astro = calculateAstrologyData(data);

      // 3. Handle Invalid State
      if (!validation.isValid) {
        // Set Astro flag
        astro.isValid = false;
        astro.validationMessage = validation.reason;

        // Flatten Energy to a "Low/Glitch" state
        levels = {
          [ElementType.Wood]: 10,
          [ElementType.Fire]: 10,
          [ElementType.Earth]: 10,
          [ElementType.Metal]: 10,
          [ElementType.Water]: 10
        };
      } else {
        astro.isValid = true;
      }

      // 4. Update State
      setBaseElements(levels);
      setAstrologyData(astro);

      if (allowAi) {
        const hasSeenTutorial = localStorage.getItem(KEY_TUTORIAL);
        if (!hasSeenTutorial) {
          setShowTutorial(true);
        }
        runLifeBookGeneration(data, language, false);
        regenerateCheats(levels, language);
      } else {
        const demoBook = await generateLifeBook(data, language, true);
        setLifeBookData(injectStages(demoBook));
        setGeneratedCheats(getFallbackCheats(language));
        setGenerationComplete(true);
        setHasOnboarded(true);
      }
    } catch (e) {
      console.error("Onboarding Critical Failure", e);
      // Force entry even if calculation fails
      setHasOnboarded(true);
    }
  };

  // --- RESET IDENTITY ---
  const handleResetUser = () => {
    generationIdRef.current += 1;
    clearGenerationTimers();

    // Clear all persistence
    localStorage.removeItem(KEY_USER_DATA);
    localStorage.removeItem(KEY_LIFE_BOOK);
    localStorage.removeItem(KEY_CHEATS);
    localStorage.removeItem(KEY_CHEAT_DATE);
    localStorage.removeItem(KEY_SAVED_ENERGY); // Clear backend persistence
    // We keep tutorial seen status

    // Reset State
    setHasOnboarded(false);
    setUserData(null);
    setAstrologyData(undefined);
    setLifeBookData(null);
    setGeneratedCheats(MOCK_CHEATS);
    setActiveCheats([]);
    setCheatModifiers({});
    setShowLifeBook(false);
    setShowDetail(false);

    // Reset energy to generic
    setBaseElements(getDailyEnergyLevels());

    if (onResetProfile) {
      onResetProfile();
    }
  };

  // Handler for SOS Interactions (Modify BASE energy) - Also used by Inventory
  const handleUpdateEnergy = (delta: Partial<Record<ElementType, number>>, resetTarget?: boolean) => {
    setBaseElements(prev => {
      const next = { ...prev };
      Object.keys(delta || {}).forEach((key) => {
        const k = key as ElementType;
        if (delta[k]) {
          next[k] = Math.min(100, Math.max(5, next[k] + delta[k]!));
        }
      });

      if (resetTarget) {
        // Find active element (the one over 85)
        Object.keys(next || {}).forEach((key) => {
          const k = key as ElementType;
          if (next[k] > 85) {
            next[k] = 65;
          }
        });
      }

      // BACKEND INTEGRATION: Persist State Change
      // This simulates a PUT request to update user status
      localStorage.setItem(KEY_SAVED_ENERGY, JSON.stringify({
        date: formatLocalDateKey(),
        levels: next
      }));

      return next;
    });
  };

  // Handler for Equipping Cheats (Dock)
  const handleEquipCheat = (card: CheatCard) => {
    let newActiveCheats = [...activeCheats];
    if (card.type === 'environment') {
      newActiveCheats = newActiveCheats.filter(c => c.type !== 'environment');
    } else {
      newActiveCheats = newActiveCheats.filter(c => c.type === 'environment');
    }
    newActiveCheats.push(card);
    setActiveCheats(newActiveCheats);
    recalculateModifiers(newActiveCheats);
  };

  const handleUnequipCheat = (cardId: string) => {
    const newActiveCheats = activeCheats.filter(c => c.id !== cardId);
    setActiveCheats(newActiveCheats);
    recalculateModifiers(newActiveCheats);
  };

  const recalculateModifiers = (cheats: CheatCard[]) => {
    const mods: Partial<Record<ElementType, number>> = {};
    cheats.forEach(card => {
      Object.entries(card.effects || {}).forEach(([key, val]) => {
        const k = key as ElementType;
        mods[k] = (mods[k] || 0) + val;
      });
    });
    setCheatModifiers(mods);
  };

  const handleSelect = (index: number) => {
    if (index === activeIndex) {
      setShowDetail(true);
    } else {
      setActiveIndex(index);
      setShowDetail(false);
    }
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % elements.length);
    setShowDetail(false);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + elements.length) % elements.length);
    setShowDetail(false);
  };

  // --- Interaction Logic (Mouse & Touch) ---
  const handleDragStart = (clientX: number) => {
    startX.current = clientX;
    isDragging.current = true;
    dragOffset.current = 0;
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging.current || startX.current === null) return;
    const deltaX = clientX - startX.current;

    // REDUCED SCREEN FACTOR FOR HIGHER SENSITIVITY AND SPEED
    // was 0.6 -> now 0.45
    const screenFactor = window.innerWidth * 0.45;

    const offset = deltaX / screenFactor;
    dragOffset.current = offset;
  };

  const handleDragEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    startX.current = null;
    const threshold = 0.01;
    if (dragOffset.current < -threshold) {
      handleNext();
    } else if (dragOffset.current > threshold) {
      handlePrev();
    }
    dragOffset.current = 0;
  };

  // Touch Events/Drag events no longer needed for slider, so we clean it up.
  return (
    <div
      className={`relative w-full h-full font-sans text-gray-200 flex flex-col items-center ${isExpanded ? 'lifebook-expanded-root justify-center overflow-hidden bg-[#030303] isolate' : 'py-4 px-2 justify-start bg-transparent'}`}
      style={isExpanded ? { minHeight: '100dvh', overscrollBehavior: 'none' } : undefined}
    >
      {!isExpanded && <ModuleHelperTag text="你的出厂自带代码及人生破解指引手册。" />}

      <div className={`w-full flex justify-center ${isExpanded ? 'h-full items-center flex-1 mt-0' : 'mt-4 animate-fade-in'}`}>
        {lifeBookData ? (
          isExpanded ? (
            <LifeBook
              data={lifeBookData}
              isOpen={true}
              isExpanded={true}
              initialPage={1}
              onClose={onBack || (() => {})}
              onReset={handleResetUser}
              isPremium={isPremium}
              onRequirePremium={onRequirePremium}
              isGenerating={false}
              genProgress={100}
              generationComplete={true}
              onEnterManual={() => setIsGeneratingBook(false)}
            />
          ) : (
            <LifeBook
              data={lifeBookData}
              isOpen={true}
              isExpanded={false}
              onExpand={onExpand}
              onClose={onBack || (() => {})}
              onReset={handleResetUser}
              isPremium={isPremium}
              onRequirePremium={onRequirePremium}
              isGenerating={isGeneratingBook}
              genProgress={genProgress}
              generationComplete={generationComplete}
              onEnterManual={() => setIsGeneratingBook(false)}
            />
          )
        ) : (
          <div className="w-full py-20 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin"></div>
            </div>
            <div>
              <p className="text-sm font-semibold text-white/80">资源初始化中...</p>
              <p className="text-xs text-white/40 mt-1 font-mono uppercase tracking-widest">Initializing Module</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default function App(props: AppProps) {
  return (
    <I18nProvider>
      <LifeBookContent {...props} />
    </I18nProvider>
  );
}
