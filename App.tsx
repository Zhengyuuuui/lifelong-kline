import React, { useState, useEffect, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { LifeKlineChart } from './components/LifeKlineChart';
import { InsightDock } from './components/InsightDock';
import { DestinyHeartbeat } from './components/DestinyHeartbeat';
import { ThreeRingsCompass } from './components/ThreeRingsCompass';
import { UserInfoForm } from './components/UserInfoForm';
import { OnboardingTutorial } from './components/OnboardingTutorial';
import { SegmentInsightSheet } from './components/SegmentInsightSheet';
import { UserCenter } from './components/UserCenter';
import { PaymentModal, type PaymentSuccessDetails } from './components/PaymentModal';
import { AuthModal } from './components/AuthModal';
import { SystemActivationIntro } from './components/SystemActivationIntro'; // NEW IMPORT
import { AIFeatureGuide } from './components/AIFeatureGuide';
import { generateLifeBook as generateStableLifeBook } from './lifeBook/utils/lifeBookGenerator';
import OriginalLifeBook from './lifeBook/components/LifeBook';
import { I18nProvider as LifeBookI18nProvider } from './lifeBook/utils/i18nContext';
import './lifeBook/lifebook-style.css';
import type { LifeBookData, UserData as LifeBookUserData } from './lifeBook/types';

const SmoothSailingApp = lazy(() => import('./SmoothSailingToday/App'));
const RevenueForecastApp = lazy(() => import('./revenueForecast/App'));
const ValuationApp = lazy(() => import('./valuationOriented/App'));
const LifeBookApp = lazy(() => import('./lifeBook/App'));
import { formatLocalDateKey, parseLocalDate } from './lifeBook/utils/astrologyEngine';
import {
    getMockEraMeta,
    MOCK_USER_BAZI,
    MOCK_SYNERGY,
    MOCK_CURRENT_STAGE,
    generateRingsData,
    generateWeeklyData,
    generateMacroData
} from './services/mockData';
import { simulateLevel1Analysis, calculateThreeRings } from './services/simulationService';
import { storage } from './services/storageService';
import {
    backendClient,
    type AuthIdentity,
    type AuthSmsPayload,
    type AuthProvider,
    type BackendBundle,
    type BackendUser,
    type PasswordLoginPayload,
    type SmsAuthPayload,
} from './services/backendClient';
import { AUTH_INVALIDATED_EVENT, clearAuthTokens } from './services/apiBase';
import { iosProductionBridge } from './services/iosProductionBridge';
import { KlinePoint, TimeRange, SegmentInsight, UserInputProfile, UserBaziMeta, BaziReport, EraMeta } from './types';
import { Compass, Sparkles, Activity, Globe, Play, Wind, LayoutDashboard, Clock, BookOpen, User, TrendingUp, Crosshair, Zap, Lock, Flame, Settings, X, Users, CheckCircle2, HelpCircle } from 'lucide-react';
import { i18n, LANGUAGES, LangCode } from './services/i18n';

const getAppleIapProductId = (planType?: PaymentSuccessDetails['planType']) => {
    if (planType === 'lifetime') {
        return import.meta.env.VITE_APPLE_IAP_LIFETIME_PRODUCT_ID || 'com.lifekline.lifetime';
    }
    return import.meta.env.VITE_APPLE_IAP_MONTHLY_PRODUCT_ID || 'com.lifekline.monthly';
};

const LIFE_BOOK_CACHE_KEYS = ['life_book_data_v2', 'life_book_data'] as const;
const getScopedLifeBookCacheKeys = (userId?: string | null) =>
    userId ? LIFE_BOOK_CACHE_KEYS.map((key) => `${key}_${userId}`) : [];
const LIFE_BOOK_OVERLAY_Z_INDEX = 2147483000;
const PAYMENT_OVERLAY_Z_INDEX = 2147483647;
const LIFE_BOOK_MIN_COMPLETE_PAGES = 90;
const LIFE_BOOK_MIN_VISUAL_PAGES = 18;
const LIFE_BOOK_MIN_CONTENT_CHARS = 12000;

type AuthStatus = 'loading' | 'anonymous' | 'authenticated';
type PersonalizedFeature = 'life_book' | 'smooth_sailing' | 'insight';
type AuthIntent =
    | { type: 'create_profile' }
    | { type: 'open_feature'; feature: PersonalizedFeature }
    | { type: 'open_payment' }
    | { type: 'open_user_center' };
type PostProfileIntent = Exclude<AuthIntent, { type: 'create_profile' }>;
type PendingGuestIntent = Extract<AuthIntent, { type: 'open_feature' }>;

const bundleHasActiveMembership = (bundle?: BackendBundle) =>
    Boolean(bundle?.membership && (bundle.membership as { status?: unknown }).status === 'active');

const bundleHasCompletedPayment = (bundle?: BackendBundle) => {
    if (!bundle) return false;
    const payment = bundle.payment as { status?: unknown; active?: unknown; verified?: unknown } | undefined;
    const topLevelStatus = (bundle as BackendBundle & { status?: unknown }).status;
    const normalizedPaymentStatus = typeof payment?.status === 'string' ? payment.status.toLowerCase() : '';
    const normalizedTopLevelStatus = typeof topLevelStatus === 'string' ? topLevelStatus.toLowerCase() : '';

    return Boolean(
        payment?.active === true ||
        (payment?.verified === true && ['success', 'paid'].includes(normalizedPaymentStatus)) ||
        ['success', 'paid'].includes(normalizedTopLevelStatus)
    );
};

const toLifeBookUserData = (profile: UserInputProfile | null): LifeBookUserData => ({
    name: profile?.name || '旅行者',
    birthDate: parseLocalDate(profile?.birthDate || '2000-01-01'),
    birthTime: profile?.birthTime || '12:00',
    location: profile?.birthPlace || '宇宙',
    gender: profile?.gender || 'neutral',
});

const createEmergencyLifeBookData = (profile: UserInputProfile | null): LifeBookData => ({
    ownerName: profile?.name || '旅行者',
    generatedDate: formatLocalDateKey(),
    isFallback: true,
    pages: [
        {
            pageNumber: 1,
            title: '你的人生使用说明书',
            subtitle: '01 / LIFE USER MANUAL',
            content: `这是一个完全属于「${profile?.name || '旅行者'}」的人生说明书入口。系统已进入稳定阅读模式，正在以更安全的方式承载你的命运底层代码。\n\n本页用于保证 iOS 全屏阅读层在任何网络、缓存或子模块加载异常下都不会黑屏。你可以点击右侧进入下一页，或点击左上角返回首页。`,
            visualItems: [
                { type: 'tag', label: 'STABLE MODE', value: 'iOS 稳定阅读层' },
                { type: 'quote', value: '先让内容稳定可见，再让体验继续变得高级。' }
            ]
        },
        {
            pageNumber: 2,
            title: '说明书正在恢复完整内容',
            subtitle: '02 / RECOVERY',
            content: '完整的一百页说明书数据会在用户档案完成后自动生成。如果你看到此页，说明主 App 级别兜底已生效，页面不再允许进入纯黑状态。',
            visualItems: [
                { type: 'list', label: '状态', value: '阅读层可见' },
                { type: 'list', label: '交互', value: '左右点击/滑动翻页' }
            ]
        }
    ]
});

const allowedLifeBookVisualTypes = new Set([
    'stat',
    'quote',
    'card',
    'list',
    'tag',
    'separator',
    'bazi_chart',
    'hexagram_card',
    'matrix',
    'checklist',
    'dial',
]);

const stringifyLifeBookValue = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
        return value.map(stringifyLifeBookValue).filter(Boolean).join('\n');
    }
    if (value && typeof value === 'object') {
        try {
            return Object.values(value as Record<string, unknown>)
                .map(stringifyLifeBookValue)
                .filter(Boolean)
                .join('\n');
        } catch {
            return '';
        }
    }
    return '';
};

const stringifyLifeBookVisualValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value) || typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch {
            return stringifyLifeBookValue(value);
        }
    }
    return stringifyLifeBookValue(value);
};

const getLifeBookRawVisualItems = (page: unknown): unknown[] => {
    const pageRecord = (page || {}) as Record<string, unknown>;
    if (Array.isArray(pageRecord.visualItems)) return pageRecord.visualItems;
    if (Array.isArray(pageRecord.visual_items)) return pageRecord.visual_items;
    return [];
};

const isCompleteLifeBookData = (value: unknown): value is LifeBookData => {
    const book = value as LifeBookData | null | undefined;
    const pages = Array.isArray(book?.pages) ? book.pages : [];
    const visualPageCount = pages.filter((page) => getLifeBookRawVisualItems(page).length > 0).length;
    const contentCharCount = pages.reduce((total, page) => {
        const pageRecord = (page || {}) as Record<string, unknown>;
        return total +
            stringifyLifeBookValue(pageRecord.title).length +
            stringifyLifeBookValue(pageRecord.subtitle).length +
            stringifyLifeBookValue(pageRecord.content).length +
            stringifyLifeBookValue(pageRecord.footer).length;
    }, 0);

    return Boolean(
        book &&
        !book.isFallback &&
        pages.length >= LIFE_BOOK_MIN_COMPLETE_PAGES &&
        visualPageCount >= LIFE_BOOK_MIN_VISUAL_PAGES &&
        contentCharCount >= LIFE_BOOK_MIN_CONTENT_CHARS
    );
};

const loadCachedLifeBookData = (userId?: string | null): LifeBookData | null => {
    if (typeof localStorage === 'undefined' || !userId) return null;

    for (const key of getScopedLifeBookCacheKeys(userId)) {
        const raw = localStorage.getItem(key);
        if (!raw || raw.includes('系统离线模式')) continue;
        try {
            const parsed = JSON.parse(raw);
            if (isCompleteLifeBookData(parsed)) return parsed;
            const normalized = normalizeLifeBookData(parsed, null);
            if (isCompleteLifeBookData(normalized)) return normalized;
            localStorage.removeItem(key);
        } catch {
            localStorage.removeItem(key);
            continue;
        }
    }

    return null;
};

const saveLifeBookDataToCaches = (book: LifeBookData | null | undefined, userId?: string | null) => {
    if (typeof localStorage === 'undefined' || !userId || !isCompleteLifeBookData(book)) return;
    const serialized = JSON.stringify(book);
    getScopedLifeBookCacheKeys(userId).forEach((key) => localStorage.setItem(key, serialized));
};

const normalizeLifeBookData = (data: LifeBookData | null | undefined, profile: UserInputProfile | null): LifeBookData => {
    const fallback = createEmergencyLifeBookData(profile);
    const rawPages = Array.isArray(data?.pages) ? data.pages : [];
    const pages = rawPages
        .map((rawPage, index) => {
            const pageRecord = (rawPage || {}) as Record<string, unknown>;
            const pageNumberValue = Number(pageRecord.pageNumber);
            const pageNumber = Number.isFinite(pageNumberValue) && pageNumberValue > 0 ? pageNumberValue : index + 1;
            const title = stringifyLifeBookValue(pageRecord.title).trim() || `人生使用说明书 · 第 ${pageNumber} 页`;
            const subtitle = stringifyLifeBookValue(pageRecord.subtitle).trim();
            const content =
                stringifyLifeBookValue(pageRecord.content).trim() ||
                stringifyLifeBookValue(pageRecord.footer).trim() ||
                '本页内容正在稳定载入。请继续翻阅，系统会保持阅读层可见，不再进入黑屏状态。';
            const rawVisualItems = Array.isArray(pageRecord.visualItems)
                ? pageRecord.visualItems
                : Array.isArray(pageRecord.visual_items)
                    ? pageRecord.visual_items
                    : [];
            const visualItems = rawVisualItems
                .map((item) => {
                    const itemRecord = (item || {}) as Record<string, unknown>;
                    const rawType = stringifyLifeBookValue(itemRecord.type);
                    const type = allowedLifeBookVisualTypes.has(rawType) ? rawType : 'card';
                    const value = stringifyLifeBookVisualValue(itemRecord.value).trim();
                    const subtext = stringifyLifeBookValue(itemRecord.subtext).trim();
                    return {
                        type: type as NonNullable<LifeBookData['pages'][number]['visualItems']>[number]['type'],
                        label: stringifyLifeBookValue(itemRecord.label).trim() || undefined,
                        value: value || subtext || undefined,
                        subtext: subtext || undefined,
                        accent: Boolean(itemRecord.accent),
                        icon: stringifyLifeBookValue(itemRecord.icon).trim() || undefined,
                    };
                })
                .filter((item) => item.value || item.label);

            return {
                pageNumber,
                title,
                subtitle,
                content,
                visualItems: visualItems.length > 0 ? visualItems : undefined,
                footer: stringifyLifeBookValue(pageRecord.footer).trim() || undefined,
                aiPrompt: stringifyLifeBookValue(pageRecord.aiPrompt).trim() || undefined,
            };
        })
        .filter((page) => page.title || page.content);

    return {
        ownerName: stringifyLifeBookValue(data?.ownerName).trim() || fallback.ownerName,
        generatedDate: stringifyLifeBookValue(data?.generatedDate).trim() || fallback.generatedDate,
        isFallback: Boolean(data?.isFallback),
        pages: pages.length > 0 ? pages : fallback.pages,
    };
};

const getLifeBookPortalHost = (): HTMLElement => {
    const existingHost = document.getElementById('life-book-root-portal');
    if (existingHost) return existingHost;

    const host = document.createElement('div');
    host.id = 'life-book-root-portal';
    host.setAttribute('data-role', 'life-book-root-portal');
    Object.assign(host.style, {
        position: 'fixed',
        inset: '0',
        zIndex: String(LIFE_BOOK_OVERLAY_Z_INDEX),
        pointerEvents: 'none',
    });
    document.documentElement.appendChild(host);
    return host;
};

const getPaymentPortalHost = (): HTMLElement => {
    const existingHost = document.getElementById('payment-root-portal');
    if (existingHost) return existingHost;

    const host = document.createElement('div');
    host.id = 'payment-root-portal';
    host.setAttribute('data-role', 'payment-root-portal');
    Object.assign(host.style, {
        position: 'fixed',
        inset: '0',
        zIndex: String(PAYMENT_OVERLAY_Z_INDEX),
        pointerEvents: 'none',
    });
    document.documentElement.appendChild(host);
    return host;
};

interface RootLifeBookOverlayProps {
    data: LifeBookData | null;
    isPremium: boolean;
    onClose: () => void;
    onRequirePremium: () => void;
    onReset: () => void;
}

const RootLifeBookOverlay: React.FC<RootLifeBookOverlayProps> = ({ data, isPremium, onClose, onRequirePremium, onReset }) => {
    const safeData = data ? normalizeLifeBookData(data, null) : null;
    const hasCompleteData = isCompleteLifeBookData(safeData);

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: LIFE_BOOK_OVERLAY_Z_INDEX,
                width: '100vw',
                height: '100vh',
                overflow: 'hidden',
                background: '#030303',
                overscrollBehavior: 'none',
                pointerEvents: 'auto',
            }}
        >
            <LifeBookI18nProvider>
                {hasCompleteData ? (
                    <OriginalLifeBook
                        data={safeData}
                        isOpen={true}
                        isExpanded={true}
                        initialPage={1}
                        onClose={onClose}
                        onReset={onReset}
                        isPremium={isPremium}
                        onRequirePremium={onRequirePremium}
                        isGenerating={false}
                        genProgress={100}
                        generationComplete={true}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center px-8 text-center bg-[#030303] text-[#F6F1EA]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute top-[max(24px,env(safe-area-inset-top))] left-5 rounded-full border border-[#D4C4A8]/20 bg-black/35 px-4 py-2 text-[11px] font-medium tracking-[0.18em] text-[#D4C4A8]/80 active:scale-95"
                        >
                            返回首页
                        </button>
                        <div className="relative mb-7 flex h-16 w-16 items-center justify-center">
                            <div className="absolute inset-0 rounded-full border border-[#D4AF37]/20" />
                            <div className="absolute inset-2 rounded-full border-2 border-[#D4AF37]/35 border-t-[#F3CD68] animate-spin" />
                            <BookOpen size={22} className="text-[#F3CD68]" />
                        </div>
                        <h2 className="font-serif text-[18px] font-bold tracking-[0.28em] text-[#F3CD68]">原版说明书恢复中</h2>
                        <p className="mt-4 max-w-[280px] text-[12px] leading-relaxed tracking-wide text-[#D4C4A8]/70">
                            正在生成完整 99 页内容与原版可视化特效，系统不会再展示半成品缓存。
                        </p>
                    </div>
                )}
            </LifeBookI18nProvider>
        </div>
    );
};

export default function App() {
    // --- LANGUAGE STATE ---
    const [lang, setLang] = useState<LangCode>('zh_CN');

    // Sync global i18n instance synchronously to prevent lag
    i18n.setLanguage(lang);

    // --- USER STATE ---
    const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
    const [authIntent, setAuthIntent] = useState<AuthIntent | null>(null);
    const [postProfileIntent, setPostProfileIntent] = useState<PostProfileIntent | null>(null);
    const [currentUser, setCurrentUser] = useState<BackendUser | null>(null);
    const [identities, setIdentities] = useState<AuthIdentity[]>([]);
    const [accountSecurity, setAccountSecurity] = useState<BackendBundle['accountSecurity']>(undefined);
    const [userProfile, setUserProfile] = useState<UserInputProfile | null>(null);
    const [guestProfile, setGuestProfile] = useState<UserInputProfile | null>(null);
    const [guestBazi, setGuestBazi] = useState<UserBaziMeta | null>(null);
    const [pendingGuestIntent, setPendingGuestIntent] = useState<PendingGuestIntent | null>(null);

    // Active Bazi/Meta (Uses Mock if Profile is null)
    const [activeUserBazi, setActiveUserBazi] = useState<UserBaziMeta>(MOCK_USER_BAZI);
    const [activeEraMeta, setActiveEraMeta] = useState<EraMeta>(getMockEraMeta());

    // --- THREE RINGS STATE ---
    const [ringsData, setRingsData] = useState(generateRingsData(null));
    // NEW: Lifted state for Compass Mode
    const [compassMode, setCompassMode] = useState<'today' | '10y' | '3y' | '1y'>('10y');

    // --- SUB-MODULE STATE ---
    const [showRevenueForecast, setShowRevenueForecast] = useState(false);
    const [showValuation, setShowValuation] = useState(false);

    // --- NAVIGATION STATE ---
    type Tab = 'dashboard' | 'smooth_sailing' | 'bazi_report' | 'life_book' | 'providence' | 'user_center';
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');

    // --- DATA CACHE STATE ---
    const [cachedBaziReport, setCachedBaziReport] = useState<BaziReport | null>(null);

    // --- TUTORIAL STATE ---
    const [showTutorial, setShowTutorial] = useState(false);
    const [isFullscreenBook, setIsFullscreenBook] = useState(false);
    const [lifeBookRenderKey, setLifeBookRenderKey] = useState(0);
    const [fullscreenLifeBookData, setFullscreenLifeBookData] = useState<LifeBookData | null>(null);

    // --- NEW: SYSTEM INTRO STATE ---
    const [showSystemIntro, setShowSystemIntro] = useState(false);

    // View Mode State
    const [viewMode, setViewMode] = useState<'macro' | 'weekly'>('macro');

    // Data State
    const [klineData, setKlineData] = useState<KlinePoint[]>([]);
    const [selectedRange, setSelectedRange] = useState<TimeRange | null>(null);

    // UI State
    const [loading, setLoading] = useState(false);
    const [insight, setInsight] = useState<SegmentInsight | null>(null);
    const [showInsightSheet, setShowInsightSheet] = useState(false);
    const [showLangMenu, setShowLangMenu] = useState(false);

    // --- ACTIVATION & AUTH STATE ---
    const [showActivation, setShowActivation] = useState(false); // Shows UserInfoForm
    const [showAuth, setShowAuth] = useState(false);
    const [authNotice, setAuthNotice] = useState<string | null>(null);

    // --- PAYMENT STATE (Simulated) ---
	    const [isPremium, setIsPremium] = useState(false);
    const [showPaywall, setShowPaywall] = useState(false);
    const [showMembershipIntro, setShowMembershipIntro] = useState(false);
        const canUseAiRequests = () => authStatus === 'authenticated';
    const profileForPreview = userProfile || guestProfile;

    const activatePremiumAccess = (refreshLifeBook = true) => {
        setIsPremium(true);
        storage.savePremium(true);
        if (refreshLifeBook) {
            setLifeBookRenderKey((key) => key + 1);
        }
    };

    const deactivatePremiumAccess = () => {
        setIsPremium(false);
        storage.savePremium(false);
    };

    useEffect(() => {
        const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
        const body = document.body;
        const html = document.documentElement;
        const releaseScrollLock = () => {
            html.classList.remove('app-scroll-locked');
            body.classList.remove('app-scroll-locked');
            html.style.removeProperty('overflow');
            html.style.removeProperty('overscroll-behavior');
            body.style.removeProperty('overflow');
            body.style.removeProperty('overscroll-behavior');
        };

        // Reconcile stale locks left by interrupted overlays or development hot reloads.
        if (!isFullscreenBook) {
            releaseScrollLock();
            return;
        }

        html.classList.add('app-scroll-locked');
        body.classList.add('app-scroll-locked');

        return () => {
            releaseScrollLock();
            requestAnimationFrame(() => window.scrollTo(0, scrollY));
        };
    }, [isFullscreenBook]);

    useEffect(() => {
        if (!isFullscreenBook) return;

        let cancelled = false;
        const fullLifeBookCacheUserId = authStatus === 'authenticated' && isPremium ? currentUser?.id : null;
        const cachedBook = loadCachedLifeBookData(fullLifeBookCacheUserId);
        setFullscreenLifeBookData(cachedBook);

        generateStableLifeBook(toLifeBookUserData(profileForPreview), 'zh', true)
            .then((book) => {
                if (!cancelled && isCompleteLifeBookData(book)) {
                    setFullscreenLifeBookData(book);
                    saveLifeBookDataToCaches(book, fullLifeBookCacheUserId);
                }
            })
            .catch((error) => {
                console.warn('Stable fullscreen LifeBook generation failed', error);
            });

        generateStableLifeBook(toLifeBookUserData(profileForPreview), 'zh', false)
            .then((book) => {
                if (!cancelled && isCompleteLifeBookData(book)) {
                    setFullscreenLifeBookData(book);
                    saveLifeBookDataToCaches(book, fullLifeBookCacheUserId);
                }
            })
            .catch((error) => {
                console.warn('Full LifeBook enrichment failed, keeping deterministic original content', error);
            });

        return () => {
            cancelled = true;
        };
    }, [isFullscreenBook, profileForPreview, lifeBookRenderKey, authStatus, currentUser?.id, isPremium]);

    const applyBackendBundle = (bundle: BackendBundle) => {
        if (typeof bundle.authenticated === 'boolean') {
            setAuthStatus(bundle.authenticated ? 'authenticated' : 'anonymous');
        }
        if (bundle.user !== undefined) {
            setCurrentUser(bundle.user || null);
        }
        if (bundle.identities !== undefined) {
            setIdentities(bundle.identities);
        }
        if (bundle.accountSecurity !== undefined) {
            setAccountSecurity(bundle.accountSecurity);
        }

        if (bundle.profile !== undefined) {
            setUserProfile(bundle.profile || null);
            if (bundle.profile) {
                setGuestProfile(null);
                setGuestBazi(null);
                setPendingGuestIntent(null);
                storage.clearGuestProfile();
                storage.saveProfile(bundle.profile);
                const simulatedBazi = simulateLevel1Analysis(bundle.profile);
                setActiveUserBazi(simulatedBazi);
                storage.saveBazi(simulatedBazi);
                setRingsData(calculateThreeRings(simulatedBazi));
            } else {
                setActiveUserBazi(MOCK_USER_BAZI);
                setRingsData(generateRingsData(null));
            }
        }

        if (bundle.membership !== undefined || bundle.payment !== undefined) {
            const premium = bundleHasActiveMembership(bundle) || bundleHasCompletedPayment(bundle);
            if (premium) {
                activatePremiumAccess(false);
            } else {
                deactivatePremiumAccess();
            }
        }

        if (bundle.settings) {
            if (bundle.settings.settings) {
                storage.saveSettings(bundle.settings.settings as any);
            }
            if (bundle.settings.bindings) {
                storage.saveBindings(bundle.settings.bindings as any);
            }
            if (typeof bundle.settings.shareCount === 'number') {
                storage.saveShareCount(bundle.settings.shareCount);
            }
        }
    };

    const requireAuth = (intent: AuthIntent) => {
        setAuthIntent(intent);
    };

    const fulfillGuestIntent = (intent: PendingGuestIntent, profile: UserInputProfile) => {
        setShowActivation(false);
        if (intent.feature === 'life_book') {
            setActiveTab('dashboard');
            setIsFullscreenBook(true);
            setLifeBookRenderKey((key) => key + 1);
            return;
        }
        if (intent.feature === 'smooth_sailing') {
            openSmoothSailingForProfile(profile);
            return;
        }
        setActiveTab('dashboard');
    };

    const startGuestPreview = (intent: PendingGuestIntent) => {
        if (authStatus === 'authenticated') {
            requireAuth(intent);
            return;
        }
        if (guestProfile) {
            fulfillGuestIntent(intent, guestProfile);
            return;
        }
        setPendingGuestIntent(intent);
        setShowActivation(true);
    };

    const handleLockedContentUnlock = () => {
        if (isPremium) return;
        setShowMembershipIntro(true);
    };

    const handleMembershipPaymentRequest = () => {
        setShowMembershipIntro(false);
        if (authStatus === 'authenticated') {
            setShowPaywall(true);
            return;
        }
        requireAuth({ type: 'open_payment' });
    };

    const requestInsightPreview = () => {
        if (!profileForPreview) {
            startGuestPreview({ type: 'open_feature', feature: 'insight' });
            return;
        }
        handleLockedContentUnlock();
    };

    const saveGuestProfile = (profile: UserInputProfile) => {
        const simulatedBazi = simulateLevel1Analysis(profile);
        setGuestProfile(profile);
        setGuestBazi(simulatedBazi);
        setActiveUserBazi(simulatedBazi);
        setRingsData(calculateThreeRings(simulatedBazi));
        storage.saveGuestProfile(profile);
        setLifeBookRenderKey((key) => key + 1);
        const nextIntent = pendingGuestIntent || { type: 'open_feature' as const, feature: 'life_book' as const };
        setPendingGuestIntent(null);
        fulfillGuestIntent(nextIntent, profile);
    };

    const fulfillIntent = (intent: AuthIntent, profile: UserInputProfile) => {
        setShowActivation(false);
        switch (intent.type) {
            case 'create_profile':
            case 'open_user_center':
                setActiveTab('user_center');
                return;
            case 'open_payment':
                setShowPaywall(true);
                return;
            case 'open_feature':
                if (intent.feature === 'life_book') {
                    setIsFullscreenBook(true);
                    return;
                }
                if (intent.feature === 'smooth_sailing') {
                    openSmoothSailingForProfile(profile);
                    return;
                }
                setShowInsightSheet(true);
        }
    };

    useEffect(() => {
        if (!authIntent || authStatus === 'loading') return;
        if (authStatus === 'anonymous') {
            setShowAuth(true);
            return;
        }

        setShowAuth(false);
        setAuthIntent(null);
        if (!userProfile) {
            const nextIntent: PostProfileIntent = authIntent.type === 'create_profile'
                ? { type: 'open_user_center' }
                : authIntent;
            setPostProfileIntent(nextIntent);
            setShowActivation(true);
            return;
        }
        setPostProfileIntent(null);
        fulfillIntent(authIntent, userProfile);
    }, [authIntent, authStatus, userProfile]);

    useEffect(() => {
        const handleAuthInvalidated = () => {
            clearAuthTokens();
            storage.clearAccountData();
            setAuthStatus('anonymous');
            setCurrentUser(null);
            setIdentities([]);
            setAccountSecurity(undefined);
            setUserProfile(null);
            setPostProfileIntent(null);
            setIsPremium(false);
            setCachedBaziReport(null);
            setInsight(null);
            setLoading(false);
            setShowActivation(false);
            setShowPaywall(false);
            setShowMembershipIntro(false);
            setShowInsightSheet(false);
            setIsFullscreenBook(false);
            setFullscreenLifeBookData(null);
            setShowRevenueForecast(false);
            setShowValuation(false);
            setActiveUserBazi(MOCK_USER_BAZI);
            setRingsData(generateRingsData(null));
            setActiveTab('dashboard');
            setAuthNotice('登录已过期，请重新登录。');
            setShowAuth(Boolean(authIntent));
        };

        window.addEventListener(AUTH_INVALIDATED_EVENT, handleAuthInvalidated);
        return () => window.removeEventListener(AUTH_INVALIDATED_EVENT, handleAuthInvalidated);
    }, [authIntent]);

    // Warm lazy modules one at a time during idle periods to avoid WebView jank.
    useEffect(() => {
        if (iosProductionBridge.isNativeRuntime()) return;

        const moduleWarmers = [
            () => import('./lifeBook/App'),
            () => import('./SmoothSailingToday/App'),
            () => import('./revenueForecast/App'),
            () => import('./valuationOriented/App'),
        ];

        const win = window as any;
        let idleId: number | null = null;
        let timeoutId: number | null = null;
        let cancelled = false;

        const scheduleWarm = (index = 0) => {
            if (cancelled || index >= moduleWarmers.length) return;

            const loadModule = () => {
                if (cancelled) return;
                void moduleWarmers[index]()
                    .catch((error) => console.warn("Lazy module warmup failed", error))
                    .finally(() => {
                        if (!cancelled) {
                            timeoutId = window.setTimeout(() => scheduleWarm(index + 1), 360);
                        }
                    });
            };

            if (typeof win.requestIdleCallback === 'function') {
                idleId = win.requestIdleCallback(loadModule, { timeout: 2600 + index * 700 });
            } else {
                timeoutId = window.setTimeout(loadModule, 1300 + index * 500);
            }
        };

        scheduleWarm();

        return () => {
            cancelled = true;
            if (idleId !== null && typeof win.cancelIdleCallback === 'function') {
                win.cancelIdleCallback(idleId);
            }
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
        };
    }, []);

    // --- RESTORATION ---
    useEffect(() => {
        const hasSeenIntro = localStorage.getItem('hasSeenSystemIntro');
        const cachedGuestProfile = storage.getGuestProfile();
        storage.clearAccountData();
        setUserProfile(null);
        setCurrentUser(null);
        setIdentities([]);
        setAccountSecurity(undefined);
        setIsPremium(false);
        setCachedBaziReport(null);
        setGuestProfile(cachedGuestProfile);
        if (cachedGuestProfile) {
            const simulatedGuestBazi = simulateLevel1Analysis(cachedGuestProfile);
            setGuestBazi(simulatedGuestBazi);
            setActiveUserBazi(simulatedGuestBazi);
            setRingsData(calculateThreeRings(simulatedGuestBazi));
        } else {
            setGuestBazi(null);
            setActiveUserBazi(MOCK_USER_BAZI);
            setRingsData(generateRingsData(null));
        }
        if (!hasSeenIntro) setShowSystemIntro(true);

        backendClient.getSession()
            .then((bundle) => {
                applyBackendBundle(bundle);
                if (bundle.authenticated && bundle.profile && bundle.user?.id) {
                    void preloadAllAIData(bundle.profile, bundle.user.id, bundleHasActiveMembership(bundle));
                }
            })
            .catch((error) => {
                console.warn("Server session restore failed", error);
                clearAuthTokens();
                storage.clearAccountData();
                setAuthStatus('anonymous');
            });
    }, []);

    // Re-calculate localizable data when lang changes
    useEffect(() => {
        setActiveEraMeta(getMockEraMeta());
        if (profileForPreview) {
            const newBazi = simulateLevel1Analysis(profileForPreview);
            setActiveUserBazi(prev => ({ ...prev, ...newBazi }));
            setRingsData(calculateThreeRings(newBazi));
        }
    }, [lang, profileForPreview]);

    // Load Data based on View Mode
    useEffect(() => {
        let data: KlinePoint[] = [];
        if (viewMode === 'weekly') {
            data = generateWeeklyData(52, profileForPreview);
            if (data.length > 8) {
                const lastPoint = data[data.length - 1];
                const startPoint = data[data.length - 8];
                setSelectedRange({
                    start_date: startPoint.date,
                    end_date: lastPoint.date
                });
            }
        } else {
            data = generateMacroData(profileForPreview);
            setSelectedRange(null);
        }
        setKlineData(data);
    }, [viewMode, profileForPreview]);

    // Update Rings Data when Profile Changes
    useEffect(() => {
        setRingsData(generateRingsData(profileForPreview));
    }, [profileForPreview]);

    // AUTO ANALYZE EFFECT & TUTORIAL CHECK
    useEffect(() => {
	        if (klineData.length > 0 && userProfile && activeTab === 'dashboard' && canUseAiRequests()) {
            if (!insight && !loading) {
                handleAnalyze();
            }
        }
    }, [klineData, userProfile, activeTab]);

    const handleRangeSelect = (range: TimeRange, startPrice?: number, endPrice?: number) => {
	        setSelectedRange(range);
	        setInsight(null);
            if (!canUseAiRequests()) {
                if (!profileForPreview) {
                    startGuestPreview({ type: 'open_feature', feature: 'insight' });
                }
                return;
            }
	        void handleAnalyze(range);
    };

    const handleAnalyze = async (manualRange?: TimeRange) => {
        if (loading) return;
        if (!canUseAiRequests() || !userProfile) {
            if (!profileForPreview) {
                startGuestPreview({ type: 'open_feature', feature: 'insight' });
            } else {
                handleLockedContentUnlock();
            }
            return;
        }

        const rangeToUse = manualRange || selectedRange;
        const startD = rangeToUse ? rangeToUse.start_date : klineData[0]?.date;
        const endD = rangeToUse ? rangeToUse.end_date : klineData[klineData.length - 1]?.date;

        if (!startD || !endD) return;

        setLoading(true);
        setInsight(null);

        try {
            const { generateSegmentInsight } = await import('./services/geminiService');
            const result = await generateSegmentInsight(
                startD,
                endD,
                0, // Mock prices for now
                0,
                activeUserBazi,
                activeEraMeta
            );
            setInsight(result);
        } catch (error) {
            console.warn("Segment analysis failed", error);
        } finally {
            setLoading(false);
        }
    };

    const handleProfileActivation = async (data: UserInputProfile) => {
        if (authStatus !== 'authenticated' || !currentUser) {
            saveGuestProfile(data);
            return;
        }
        const simulatedBazi = simulateLevel1Analysis(data);
        try {
            await backendClient.saveProductionProfile(data, simulatedBazi);
            const bundle = await backendClient.getMe();
            if (!bundle.profile || !bundle.user?.id) {
                throw new Error("Saved profile was not returned for the authenticated user.");
            }
            applyBackendBundle(bundle);
            setShowActivation(false);
            setIsFullscreenBook(false);
            setLifeBookRenderKey((key) => key + 1);
            window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
            void preloadAllAIData(bundle.profile, bundle.user.id, bundleHasActiveMembership(bundle));

            const nextIntent = postProfileIntent || { type: 'open_user_center' as const };
            setPostProfileIntent(null);
            fulfillIntent(nextIntent, bundle.profile);
        } catch (error) {
            console.warn("Profile sync failed", error);
            window.alert("资料保存失败，请检查网络后重试。");
        }
    };

    function openSmoothSailingForProfile(profile: UserInputProfile) {
        setActiveTab('smooth_sailing');
        window.requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: 'auto' });
        });

        const profileSnapshot = profile;
        window.setTimeout(() => {
            if (authStatus === 'authenticated' && userProfile && currentUser?.id) {
                const subModuleProfile = {
                    name: profileSnapshot.name,
                    birthDate: profileSnapshot.birthDate,
                    birthTime: profileSnapshot.birthTime,
                    birthPlace: profileSnapshot.birthPlace,
                    gender: profileSnapshot.gender,
                    onboardedAt: Date.now()
                };
                localStorage.setItem('user_profile_v1', JSON.stringify(subModuleProfile));
            }
            void import('./SmoothSailingToday/App').catch((error) => {
                console.warn("Smooth Sailing preload failed", error);
            });
        }, 0);
    }

    const openSmoothSailing = () => {
        startGuestPreview({ type: 'open_feature', feature: 'smooth_sailing' });
    };

		    const preloadAllAIData = async (profile: UserInputProfile, userId: string, canPersistCompleteLifeBook = false) => {
            if (!canUseAiRequests()) return;
            const lifeBookCacheUserId = canPersistCompleteLifeBook ? userId : null;

	        const promises: Promise<any>[] = [];
        
        // 1. Preload Bazi Report
        if (!cachedBaziReport) {
            promises.push(
                import('./services/geminiService').then(async ({ generateBaziReport }) => {
                    try {
                        const report = await generateBaziReport(profile);
                        setCachedBaziReport(report);
                        storage.saveBaziReport(report);
                        
                        // 2. ONLY Preload Life Book AFTER Bazi Report to prevent 429 Rate Limit
                        const lifeBookCached = loadCachedLifeBookData(lifeBookCacheUserId);
                        if (lifeBookCacheUserId && !lifeBookCached) {
                            const { generateLifeBook } = await import('./lifeBook/utils/lifeBookGenerator');
                            const userData = {
                                name: profile.name,
                                birthDate: parseLocalDate(profile.birthDate),
                                birthTime: profile.birthTime || "12:00",
                                location: profile.birthPlace || "未知",
                                gender: (profile.gender as string === 'secret' ? 'neutral' : profile.gender) as 'male' | 'female' | 'neutral',
                            };
                            const book = await generateLifeBook(userData, lang, false);
                            if (!book.isFallback) {
                                saveLifeBookDataToCaches(book, lifeBookCacheUserId);
                            }
                        }
                    } catch(e) {
                         console.error("Preload sequential tasks failed", e);
                    }
                })
            );
        } else {
             // Fallback if Bazi is already cached but LifeBook is not
             const lifeBookCached = loadCachedLifeBookData(lifeBookCacheUserId);
             if (lifeBookCacheUserId && !lifeBookCached) {
                 promises.push(
                     import('./lifeBook/utils/lifeBookGenerator').then(async ({ generateLifeBook }) => {
                         try {
                             const userData = {
                                 name: profile.name,
                                 birthDate: parseLocalDate(profile.birthDate),
                                 birthTime: profile.birthTime || "12:00",
                                 location: profile.birthPlace || "未知",
                                 gender: (profile.gender as string === 'secret' ? 'neutral' : profile.gender) as 'male' | 'female' | 'neutral',
                             };
	                             const book = await generateLifeBook(userData, lang, false);
	                             if (!book.isFallback) {
	                                saveLifeBookDataToCaches(book, lifeBookCacheUserId);
	                             }
                         } catch (e) {}
                     })
                 );
             }
        }

        // 3. Preload Smooth Sailing (顺风窗)
        const todayStr = formatLocalDateKey();
        const smoothCacheKey = `smooth_sailing_data_${userId}_${todayStr}`;
        const smoothCached = localStorage.getItem(smoothCacheKey);
        if (!smoothCached) {
            promises.push(
                Promise.all([
                    import('./SmoothSailingToday/services/ai'),
                    import('./SmoothSailingToday/constants')
                ]).then(([{ generateDailyFortune, generateMorningRiskAndSniper }, { MOCK_DATA }]) => {
                    const subModuleProfile = {
                        name: profile.name,
                        birthDate: profile.birthDate,
                        birthTime: profile.birthTime || "12:00",
                        birthPlace: profile.birthPlace || "未知",
                        gender: (profile.gender || "other") as 'male' | 'female' | 'other',
                        onboardedAt: Date.now()
                    };
                    
                    return generateDailyFortune(subModuleProfile, lang as any).then(async (aiResult) => {
                        const morningData = await generateMorningRiskAndSniper(
                            subModuleProfile,
                            aiResult.overview.score,
                            aiResult.overview.window_tags[0] || "14:00-16:00",
                            aiResult.overview.lucky_direction,
                            aiResult.overview.lucky_color || "Water",
                            lang as any
                        );
                        
                        if (aiResult && aiResult.segments.length === 24) {
                            const newDayData = {
                                ...MOCK_DATA,
                                isMock: false,
                                segments: aiResult.segments,
                                summary: aiResult.overview?.summary || MOCK_DATA.summary,
                                winScore: aiResult.overview?.score || MOCK_DATA.winScore,
                                dailyOverview: aiResult.overview,
                                modeLabel: aiResult.overview?.level === 'ROCKET' ? '火箭模式' : aiResult.overview?.level === 'STABLE' ? '稳健模式' : aiResult.overview?.level === 'AVOID' ? '避坑模式' : '平稳模式',
                                morningRisk: morningData.morningRisk,
                                timeSniper: morningData.timeSniper,
                                suitableActions: aiResult.overview?.recommended_actions?.map((a: any, i: number) => ({
                                    id: `ai-action-${i}`,
                                    label: a.label,
                                    type: a.type
                                })) || MOCK_DATA.suitableActions,
                                destress: aiResult.overview?.destress_guide?.items ? {
                                    active: true,
                                    bullets: aiResult.overview.destress_guide.items
                                } : MOCK_DATA.destress,
                                mainWindow: {
                                    ...MOCK_DATA.mainWindow,
                                    start: String(aiResult.segments.find((s: any) => s.type === 'good')?.hour || 10).padStart(2, '0') + ":00",
                                    end: String((aiResult.segments.find((s: any) => s.type === 'good')?.hour || 10) + 2).padStart(2, '0') + ":00",
                                    score: Math.max(...aiResult.segments.map((s: any) => s.score)),
                                    description: 'AI智能推荐',
                                    tags: aiResult.overview?.window_tags || MOCK_DATA.mainWindow.tags,
                                    advice: aiResult.overview?.strategy_guide?.main_quote || MOCK_DATA.mainWindow.advice
                                }
                            };
                            
                            let newCandidates = MOCK_DATA.relationships;
                            if (aiResult.overview?.daily_relationships && aiResult.overview.daily_relationships.length > 0) {
                                newCandidates = aiResult.overview.daily_relationships;
                            }
                            
                            let newTone = 'steady';
                            if (aiResult.overview?.strategy_guide) {
                                newTone = aiResult.overview.strategy_guide.recommended_tone;
                            }
                            
                            localStorage.setItem(smoothCacheKey, JSON.stringify({
                                dayData: newDayData,
                                relationshipCandidates: newCandidates,
                                currentTone: newTone
                            }));
                        }
                    }).catch(e => console.error("Preload Smooth Sailing failed", e));
                })
            );
        }
        
        // Wait for all preloads to finish
        await Promise.all(promises);
    };

    const finishAuthenticatedLogin = async () => {
        storage.clearAccountData();
        const syncedBundle = await backendClient.getMe();
        let guestProfileSyncFailed = false;
        if (guestProfile && !syncedBundle.profile) {
            try {
                const simulatedGuestBazi = guestBazi || simulateLevel1Analysis(guestProfile);
                await backendClient.saveProductionProfile(guestProfile, simulatedGuestBazi);
                const profileBundle = await backendClient.getMe();
                applyBackendBundle(profileBundle);
            } catch (error) {
                console.warn("Guest profile sync failed after authentication", error);
                guestProfileSyncFailed = true;
                applyBackendBundle(syncedBundle);
            }
        } else {
            applyBackendBundle(syncedBundle);
        }
        setAuthNotice(guestProfileSyncFailed ? '登录成功，但游客资料暂未保存。请稍后在档案页重新保存。' : null);
        setShowAuth(false);
    };

    const handlePasswordLogin = async (payload: PasswordLoginPayload) => {
        await backendClient.loginWithPassword(payload);
        await finishAuthenticatedLogin();
    };

    const handleSendAuthSms = (payload: AuthSmsPayload) =>
        backendClient.sendAuthSms(payload);

    const handleSmsAuth = async (payload: SmsAuthPayload) => {
        await backendClient.verifySmsAuth(payload);
        await finishAuthenticatedLogin();
    };

    const handleNativeAuthSuccess = async (provider: AuthProvider) => {
        if (provider === 'apple' && iosProductionBridge.supportsAppleSignIn()) {
            await iosProductionBridge.signInWithApple();
        } else if (provider === 'wechat' && iosProductionBridge.supportsWeChatLogin()) {
            await iosProductionBridge.signInWithWeChat();
        } else {
            throw new Error(`${provider} native login bridge is not configured for this iOS build.`);
        }
        await finishAuthenticatedLogin();
    };

    const handleUserLogout = () => {
        void backendClient.logout().catch((error) => console.warn("Logout sync failed", error));
        clearAuthTokens();
        storage.clearAccountData();
        setUserProfile(null);
        setCurrentUser(null);
        setIdentities([]);
        setAccountSecurity(undefined);
        setAuthStatus('anonymous');
        setAuthIntent(null);
        setPostProfileIntent(null);
        setShowAuth(false);
        setShowActivation(false);
        setShowPaywall(false);
        setShowMembershipIntro(false);
        setShowInsightSheet(false);
        setIsFullscreenBook(false);
        setFullscreenLifeBookData(null);
        setInsight(null);
        setCachedBaziReport(null);
        setActiveTab('dashboard');
        setIsPremium(false);
        setActiveUserBazi(MOCK_USER_BAZI);
        setRingsData(generateRingsData(null));
    };

    const handlePasswordChanged = async (action: 'set' | 'change') => {
        if (action === 'set') {
            const bundle = await backendClient.getMe();
            applyBackendBundle(bundle);
            setAuthNotice('登录密码已设置。');
            return;
        }
        handleUserLogout();
        setAuthNotice('密码修改成功，请使用新密码重新登录。');
        requireAuth({ type: 'open_user_center' });
    };

    const handleResetProfileAndReactivate = () => {
        storage.clearAccountData();
        setUserProfile(null);
        setInsight(null);
        setCachedBaziReport(null);
        setIsPremium(false);
        setActiveUserBazi(MOCK_USER_BAZI);
        setRingsData(generateRingsData(null));
        setIsFullscreenBook(false);
        requireAuth({ type: 'create_profile' });
    };

    const handleUpgradeSuccess = async (details?: PaymentSuccessDetails) => {
        let nativeApplePurchaseCompleted = false;
        try {
            if (details?.method && details.method !== 'apple') {
                const bundle = await backendClient.getMe();
                applyBackendBundle(bundle);
                if (bundleHasActiveMembership(bundle) || bundleHasCompletedPayment(bundle)) {
                    activatePremiumAccess();
                } else {
                    console.warn("Payment completed but refreshed membership is not active yet", {
                        orderId: details.orderId,
                        paymentStatus: details.paymentStatus,
                    });
                }
                return;
            }

            if (details?.method === 'apple' && details.restore) {
                if (!iosProductionBridge.supportsAppleRestore()) {
                    throw new Error("Apple restore purchases bridge is not configured for this iOS build.");
                }
                const bundles = await iosProductionBridge.restoreApplePurchases();
	                if (!bundles.length) {
	                    throw new Error("No restorable Apple purchases were found.");
	                }
	                bundles.forEach(applyBackendBundle);
	                if (!bundles.some(bundleHasActiveMembership)) {
	                    throw new Error("Restored Apple purchases did not activate a membership.");
	                }
	                activatePremiumAccess();
	                return;
            }
            const needsNativeAppleReceipt = details?.method === 'apple'
                && !details.receiptData
                && !details.signedTransactionInfo
                && !details.receipt
                && !details.productId
                && !details.transactionId
                && iosProductionBridge.supportsApplePurchases();
	            const bundle = needsNativeAppleReceipt
	                ? await (async () => {
                        const purchase = await iosProductionBridge.purchaseAppleProductReceipt(getAppleIapProductId(details.planType));
                        nativeApplePurchaseCompleted = true;
                        activatePremiumAccess();
                        return backendClient.verifyAppleReceipt({
                            receiptData: purchase.receiptData || purchase.receipt || purchase.purchaseToken,
                            signedTransactionInfo: purchase.signedTransactionInfo,
                            productId: purchase.productId,
                            transactionId: purchase.transactionId,
                            environment: purchase.environment || "auto",
                        });
                    })()
	                : await backendClient.upgradeMembership(details);
	            applyBackendBundle(bundle);
	            if (bundleHasActiveMembership(bundle) || bundleHasCompletedPayment(bundle) || details?.method !== 'apple') {
	                activatePremiumAccess();
	            }
	            return;
	        } catch (error) {
	            console.warn("Membership sync failed; premium state was not changed", error);
	            if (nativeApplePurchaseCompleted) {
	                activatePremiumAccess();
	                return;
	            }
	            if (details?.method && details.method !== 'apple') return;
	            if (import.meta.env.PROD || (details?.method === 'apple' && iosProductionBridge.isNativeRuntime())) {
	                return;
	            }
	        }
	        activatePremiumAccess();
    };

    const handleSaveReport = (data: BaziReport) => {
        setCachedBaziReport(data);
        storage.saveBaziReport(data);
    };

    const completeTutorial = () => {
        setShowTutorial(false);
        localStorage.setItem('hasSeenTutorial', 'true');
    };

    // --- NEW: Handle Intro Complete ---
    const handleIntroComplete = () => {
        setShowSystemIntro(false);
        localStorage.setItem('hasSeenSystemIntro', 'true');
        // CHANGE: Do NOT open activation form automatically.
        // User must click "Start Activation" button.
    };

    const LanguageSwitcher = () => (
        <div
            className="fixed right-5 z-[550]"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 20px)' }}
        >
            <div className="relative">
                {showLangMenu && (
                    <div className="absolute right-0 top-full mt-2 w-32 bg-[#1A1D24] border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-fade-in-up origin-top-right">
	                        {LANGUAGES.map(l => (
	                            <button
                                type="button"
	                                key={l.code}
	                                onClick={() => {
                                    setLang(l.code);
                                    setShowLangMenu(false);
                                    setCachedBaziReport(null);
                                    storage.saveBaziReport(null as any);
                                }}
                                className={`w-full text-left px-4 py-3 text-xs font-medium hover:bg-white/5 transition-colors ${lang === l.code ? 'text-teal-400 bg-white/5' : 'text-slate-400'}`}
                            >
                                {l.label}
                            </button>
                        ))}
                    </div>
	                )}
	                <button
                    type="button"
	                    onClick={() => setShowLangMenu(!showLangMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-[#D4C4A8]/20 hover:bg-black/60 transition-all active:scale-95 select-none shadow-lg"
                >
                    <Globe size={14} className="text-[#D4C4A8]" />
                    <span className="text-[10px] text-[#D4C4A8] font-bold uppercase">{LANGUAGES.find(l => l.code === lang)?.label}</span>
                </button>
            </div>
        </div>
    );

    const ModuleLoading = () => (
        <div className="min-h-screen bg-[#050505] text-slate-300 flex items-center justify-center px-6">
            <div className="flex flex-col items-center gap-4">
                <div className="w-9 h-9 rounded-full border border-white/10 border-t-teal-400 animate-spin" />
                <p className="text-[11px] tracking-[0.28em] uppercase text-slate-500">Loading Module</p>
            </div>
        </div>
    );

    // --- RENDER CONDITIONAL: REVENUE FORECAST SUB-MODULE (Full Screen) ---
    if (showRevenueForecast) {
        return (
            <Suspense fallback={<ModuleLoading />}>
                <RevenueForecastApp
                    onBack={() => setShowRevenueForecast(false)}
                    userProfile={profileForPreview || undefined}
                />
            </Suspense>
        );
    }

    // --- RENDER CONDITIONAL: VALUATION SUB-MODULE (Full Screen) ---
    if (showValuation) {
        return (
            <Suspense fallback={<ModuleLoading />}>
                <ValuationApp
                    onBack={() => setShowValuation(false)}
                    userProfile={profileForPreview || undefined}
                />
            </Suspense>
        );
    }

    const fullscreenBookOverlay = isFullscreenBook
        ? createPortal(
            <RootLifeBookOverlay
                data={fullscreenLifeBookData}
                isPremium={isPremium}
                onClose={() => {
                    setIsFullscreenBook(false);
                    setActiveTab('dashboard');
                    setLifeBookRenderKey((key) => key + 1);
                }}
                onRequirePremium={() => {
                    handleLockedContentUnlock();
                }}
                onReset={handleResetProfileAndReactivate}
            />,
            getLifeBookPortalHost()
        )
        : null;

    const paymentModalOverlay = showPaywall
        ? createPortal(
            <PaymentModal
                isOpen={showPaywall}
                onClose={() => setShowPaywall(false)}
                onRequireLogin={() => {
                    setShowPaywall(false);
                    requireAuth({ type: 'open_payment' });
                }}
                onSuccess={(details) => {
                    setShowPaywall(false);
                    void handleUpgradeSuccess(details);
                }}
            />,
            getPaymentPortalHost()
        )
        : null;

    const membershipIntroOverlay = showMembershipIntro
        ? createPortal(
            <div style={{ pointerEvents: 'auto' }}>
                <UserCenter
                    isOpen={showMembershipIntro}
                    onClose={() => setShowMembershipIntro(false)}
                    userProfile={userProfile || undefined}
                    user={currentUser || undefined}
                    identities={identities}
                    accountSecurity={accountSecurity}
                    isPremium={isPremium}
                    membershipOnly
                    onRequirePayment={handleMembershipPaymentRequest}
                />
            </div>,
            getPaymentPortalHost()
        )
        : null;

    const NavItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center w-16 h-full gap-1.5 transition-all duration-200 ease-out active:scale-90 active:opacity-70 select-none relative ${active ? 'text-teal-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
            {active && (
                <div className="absolute -top-1 w-8 h-1 bg-teal-400 rounded-b-full shadow-[0_0_10px_rgba(45,212,191,0.5)]" />
            )}
            <div className={`${active ? 'scale-110 drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]' : 'scale-100'} transition-all duration-300 ease-out`}>
                {React.cloneElement(icon as React.ReactElement<any>, { size: 22 })}
            </div>
            <span className={`text-[10px] font-medium tracking-wide ${active ? 'font-bold' : ''}`}>{label}</span>
        </button>
    );

    return (
        <>
        {fullscreenBookOverlay}
        {membershipIntroOverlay}
        {paymentModalOverlay}
        <div className="h-[100dvh] bg-[#050505] text-slate-200 font-sans selection:bg-amber-500/30 overflow-hidden relative">

            {/* iOS Style Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-amber-900/10 blur-[80px] rounded-full opacity-60" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] bg-orange-900/10 blur-[80px] rounded-full opacity-60" />
                <div className="absolute top-[40%] left-[20%] w-[60vw] h-[60vw] bg-red-900/5 blur-[60px] rounded-full opacity-40 animate-pulse-slow" />
            </div>

            {!isFullscreenBook && !showActivation && <LanguageSwitcher />}

            {/* System Activation Intro (Highest Priority Modal) - REMOVED */}
            {/* showSystemIntro && (
                <SystemActivationIntro onComplete={handleIntroComplete} />
            ) */}

            {/* Activation Modal (UserInfoForm) */}
            {showActivation && (authStatus === 'authenticated' || authStatus === 'anonymous') && (
                <UserInfoForm
                    onSubmit={handleProfileActivation}
                    mode={authStatus === 'authenticated' ? 'authenticated' : 'guest'}
                    initialValue={authStatus === 'authenticated' ? userProfile : guestProfile}
                    onGuestSubmit={saveGuestProfile}
                    onCancel={() => setShowActivation(false)}
                />
            )}

            {/* Auth Modal (High End Login) */}
            <AuthModal
                isOpen={showAuth}
                notice={authNotice}
                onClose={() => {
                    setShowAuth(false);
                    setAuthIntent(null);
                    setAuthNotice(null);
                }}
                onPasswordLogin={handlePasswordLogin}
                onSendAuthSms={handleSendAuthSms}
                onSmsAuth={handleSmsAuth}
                onNativeLoginSuccess={handleNativeAuthSuccess}
            />

            {/* Tutorial Overlay */}
            {showTutorial && (
                 <OnboardingTutorial onComplete={() => setShowTutorial(false)} />
            )}

            {/* Main Content Area */}
            <div
                className="relative z-10 h-full overflow-y-auto overflow-x-hidden pb-28 ios-fluid-scroll"
                style={!isFullscreenBook ? { paddingTop: 'env(safe-area-inset-top, 0px)' } : undefined}
            >
                
                {activeTab === 'dashboard' && (
                    <div className="space-y-6 px-4 pb-4 relative z-10 pt-2 w-full max-w-full overflow-x-hidden">
                        {/* Core Feature: Meta & K-Line Unified Dashboard */}
                        <div className="relative mt-2 animate-fade-in-up">
                            {/* Row: Era and How to Use */}
                            {!isFullscreenBook && (
                                <div className="flex items-center justify-between mb-3 pb-1 border-b border-white/[0.02]">
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#220E03]/80 to-[#140600]/80 border border-[#E0A96D]/12 backdrop-blur-md shadow-[0_2px_10px_rgba(224,169,109,0.02)]">
                                        <Flame size={11} className="text-[#FF9D00] animate-pulse" />
                                        <span className="text-[10px] sm:text-[11px] font-medium text-[#F2C294] tracking-[0.08em]">时代主火 · {activeEraMeta.year_pillar || '2026'}</span>
                                    </div>
                                    <button 
                                        onClick={() => setShowTutorial(true)}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.01] border border-white/5 text-[10px] sm:text-[11px] font-medium text-slate-400 hover:bg-white/[0.04] hover:text-white hover:border-white/10 active:scale-[0.98] transition-all duration-300 shadow-sm"
                                    >
                                        <HelpCircle size={11} className="text-[#D4AF37]/70" />
                                        如何使用
                                    </button>
                                </div>
                            )}

                            {/* === MERGED LIFE BOOK (人生使用说明书) === */}
                            <div className="w-full animate-fade-in-up mt-1 relative z-20">
                                {!isFullscreenBook && (
                                    <div className="flex flex-col items-center justify-center mb-4 px-1 opacity-95">
                                        <div className="flex items-center gap-3 mb-1.5">
                                            <div className="h-[1px] w-8 sm:w-12 bg-gradient-to-l from-[#D4AF37]/40 to-transparent"></div>
                                            <h3 className="text-[15px] sm:text-[17px] font-serif font-light text-[#E5E0D8] tracking-[0.3em] px-2 whitespace-nowrap">人生使用说明书</h3>
                                            <div className="h-[1px] w-8 sm:w-12 bg-gradient-to-r from-[#D4AF37]/40 to-transparent"></div>
                                        </div>
                                        <div className="flex items-center justify-center text-center mt-0.5">
                                            <span className="text-[11px] sm:text-[13px] font-medium tracking-[0.14em] text-[#D4AF37]">3分钟，读懂你的命运底层代码</span>
                                        </div>
                                    </div>
                                )}
	                                <div className={`transition-all duration-420 ease-app-panel ${
	                                    isFullscreenBook 
	                                      ? 'hidden' 
	                                      : 'w-full relative flex items-center justify-center min-h-[460px] -mt-10 sm:-mt-14'
	                                }`}
			                                style={undefined}
			                                >
		                                    {!isFullscreenBook && (
			                                <Suspense fallback={
			                                        <div className="flex flex-col items-center justify-center p-12 text-center w-full h-full">
		                                                <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4"></div>
		                                                <p className="text-amber-500/80 text-xs font-mono tracking-widest">加载中...</p>
		                                            </div>
	                                        }>
	                                            <LifeBookApp
	                                                allowAi={authStatus === 'authenticated' && Boolean(userProfile) && isPremium}
	                                                userProfile={profileForPreview ? {
	                                                    name: profileForPreview.name,
	                                                    birthDate: profileForPreview.birthDate,
	                                                    birthTime: profileForPreview.birthTime || "12:00",
	                                                    birthPlace: profileForPreview.birthPlace || "未知",
	                                                    gender: profileForPreview.gender || "secret"
	                                                } : undefined}
	                                                insight={insight}
	                                                activeUserBazi={activeUserBazi}
	                                                key={`embedded-${currentUser?.id || guestProfile?.name || 'guest'}-${lifeBookRenderKey}`}
	                                                onBack={() => {
	                                                    setIsFullscreenBook(false);
	                                                    setLifeBookRenderKey((key) => key + 1);
	                                                }}
	                                                isExpanded={false}
		                                                onExpand={() => startGuestPreview({ type: 'open_feature', feature: 'life_book' })}
	                                                isPremium={isPremium}
		                                                onRequirePremium={() => {
		                                                    handleLockedContentUnlock();
		                                                }}
		                                                onResetProfile={handleResetProfileAndReactivate}
		                                            />
		                                        </Suspense>
		                                    )}

                                    {/* Interaction Blocker for embedded mode to trigger fullscreen or activation */}
	                                    {!isFullscreenBook && (
	                                        <div 
	                                            className="absolute inset-0 z-[650] cursor-pointer"
	                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
	                                                startGuestPreview({ type: 'open_feature', feature: 'life_book' });
                                            }}
                                        />
                                    )}
                                </div>

                                {!isFullscreenBook && (
                                    <div className="mt-4 flex flex-col items-center w-full relative z-10">
                                        <div className="grid grid-cols-4 gap-1.5 sm:gap-4 mt-2 w-full px-0.5">
                                            {[
                                                { icon: <User className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] text-[#E0A96D] group-hover:text-[#F5E6D3] transition-colors" />, title: "你是谁", desc: "看清你的核心性格\n与内在驱动力", number: "01" },
                                                { icon: <Sparkles className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] text-[#E0A96D] group-hover:text-[#F5E6D3] transition-colors" />, title: "你的天赋", desc: "找到你最容易\n发光的优势", number: "02" },
                                                { icon: <Users className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] text-[#E0A96D] group-hover:text-[#F5E6D3] transition-colors" />, title: "关系模式", desc: "看懂你和别人的\n理解方式", number: "03" },
                                                { icon: <Compass className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] text-[#E0A96D] group-hover:text-[#F5E6D3] transition-colors" />, title: "未来方向", desc: "获得最适合\n你的行动建议", number: "04" }
                                            ].map((item, i) => (
                                                <div key={i} className="flex flex-col items-center text-center py-3.5 px-1 sm:py-5 sm:px-3 rounded-xl sm:rounded-2xl bg-[#08080A]/95 backdrop-blur-md border border-white/[0.04] relative overflow-hidden group hover:border-[#D4AF37]/35 hover:bg-[#0E0B08]/95 hover:shadow-[0_12px_36px_rgba(212,175,55,0.08)] hover:-translate-y-1 active:scale-[0.98] transition-all duration-500 cursor-pointer h-full" onClick={() => {
                                                    startGuestPreview({ type: 'open_feature', feature: 'life_book' });
                                                }}>
                                                    {/* Glow & Index */}
                                                    <div className="absolute top-0 right-0 p-1 sm:p-2 text-[8px] sm:text-[10px] font-mono text-white/5 font-bold group-hover:text-[#D4AF37]/20 transition-colors pointer-events-none">{item.number}</div>
                                                    <div className="absolute -inset-1 bg-gradient-to-b from-[#D4AF37]/[0.06] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-xl sm:rounded-2xl"></div>
                                                     
                                                    {/* Icon Container */}
                                                    <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-full border border-white/[0.06] bg-gradient-to-br from-[#141415] to-[#0A0A0B] flex items-center justify-center mb-2 sm:mb-3.5 relative group-hover:scale-110 group-hover:border-[#D4AF37]/40 transition-all duration-500 shadow-[inset_0_1px_3px_rgba(255,255,255,0.05),0_4px_10px_rgba(0,0,0,0.4)]">
                                                         {item.icon}
                                                    </div>
                                                     
                                                    {/* Text Content */}
                                                    <h4 className="text-[10.5px] sm:text-[14px] font-serif font-medium text-[#F5E6D3] mb-1 sm:mb-2 tracking-[0.05em] sm:tracking-[0.15em] drop-shadow-sm group-hover:text-white transition-colors">{item.title}</h4>
                                                    <div className="w-4 sm:w-5 h-[1px] bg-white/10 mb-1.5 sm:mb-2.5 group-hover:w-[75%] group-hover:bg-gradient-to-r group-hover:from-transparent group-hover:via-[#D4AF37]/30 group-hover:to-transparent transition-all duration-500"></div>
                                                    <p className="text-[7.5px] sm:text-[11px] text-[#A39F99] leading-normal sm:leading-[1.6] whitespace-pre-line tracking-tight px-0.5 sm:px-1 group-hover:text-[#D9D5CB] transition-colors duration-300">{item.desc}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="w-full mt-8">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-1.5 font-medium text-[#D4AF37] text-[15px] tracking-wide">
                                                    猜你想问 <span className="text-[13px] ml-1">✦</span>
                                                </div>
                                                <button className="text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center tracking-widest">
                                                    更多探索 <span className="ml-1 text-[10px]">&gt;</span>
                                                </button>
                                            </div>
                                            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x -mx-4 px-4">
                                                {[
                                                    { q: "你最强的\n天赋是什么？", icon: <User size={26} />, bg: "from-[#0F1E24] to-[#050D11]", borderColor: "border-teal-900/30", opacity: "opacity-[0.15]" },
                                                    { q: "今年你该抓住\n什么机会？", icon: <Sparkles size={26} />, bg: "from-[#111222] to-[#0A0B16]", borderColor: "border-indigo-900/30", opacity: "opacity-[0.1]" },
                                                    { q: "你的人际关系\n盲区在哪里？", icon: <Users size={26} />, bg: "from-[#131F1D] to-[#081512]", borderColor: "border-emerald-900/30", opacity: "opacity-[0.15]" },
                                                ].map((q, i) => (
                                                    <div key={i} onClick={() => {
                                                        startGuestPreview({ type: 'open_feature', feature: 'life_book' });
                                                    }} className={`cursor-pointer min-w-[145px] sm:min-w-[160px] flex-shrink-0 h-[85px] p-3 rounded-2xl bg-gradient-to-br ${q.bg} border ${q.borderColor} relative overflow-hidden flex flex-col justify-between snap-center group hover:scale-[1.02] transition-transform`}>
                                                        <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] bg-white/[0.02] rounded-full pointer-events-none" />
                                                        <div className={`absolute top-2 right-2 text-[#D4AF37] ${q.opacity} group-hover:scale-110 transition-transform`}>{q.icon}</div>
                                                        <div className="text-[12px] font-medium text-zinc-200 leading-snug whitespace-pre-line relative z-10">{q.q}</div>
                                                        <div className="w-5 h-5 rounded-full border border-white/10 flex flex-shrink-0 items-center justify-center bg-black/40 self-end relative z-10 group-hover:bg-[#D4AF37]/30 transition-colors">
                                                            <Play size={8} className="text-[#D4AF37] ml-0.5 opacity-90" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {!isFullscreenBook && (
                            <>
                            {/* New Top Banner - Move down here */}
                            <div className="p-4 sm:p-5 rounded-[24px] bg-gradient-to-br from-[#11162A] to-[#0A0D1A] border border-white/5 mt-8 sm:mt-10 mb-4 relative overflow-hidden shadow-lg">
                                <div className="absolute top-[-50%] right-[-10%] w-[150px] h-[150px] bg-blue-500/20 blur-[60px] rounded-full pointer-events-none" />
                                <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-100 to-blue-300 tracking-wide mb-3 flex items-center">
                                    <span className="text-blue-400 text-3xl mr-1">3</span>步看懂你的人生走势
                                </h2>
                                <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-blue-200/60 font-medium whitespace-nowrap overflow-x-auto no-scrollbar relative z-10">
                                    <span className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-blue-900/40 flex items-center justify-center text-[10px] text-blue-100">1</div>看阶段</span>
                                    <span className="text-blue-900/60">&gt;</span>
                                    <span className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-blue-900/40 flex items-center justify-center text-[10px] text-blue-100">2</div>拖时间轴</span>
                                    <span className="text-blue-900/60">&gt;</span>
                                    <span className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full bg-blue-900/40 flex items-center justify-center text-[10px] text-blue-100">3</div>拿建议</span>
                                </div>
                            </div>

                            {/* K-Line Chart Container */}
                            <div className="bg-[#050914] rounded-[32px] border border-white/10 overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] relative group">
                                {/* Intense Ambient Glows inside the container */}
                                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-teal-500/10 blur-[120px] rounded-[50%] pointer-events-none transition-all duration-1000 group-hover:bg-teal-500/15" />
                                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-500/10 blur-[100px] rounded-[50%] pointer-events-none transition-all duration-1000 group-hover:bg-orange-500/15" />
                                <div className="absolute inset-0 texture-cubes opacity-[0.03] pointer-events-none mix-blend-overlay" />

                                {/* K-Line Chart Container */}
                                <div className="relative z-10 w-full pt-4 pb-2">
                                    <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/40 pointer-events-none" />
                                    <div className="relative">
                                        <LifeKlineChart
                                            data={klineData}
                                            selectedRange={selectedRange}
                                            onSelectRange={handleRangeSelect}
                                            viewMode={viewMode}
                                            onToggleView={(mode) => setViewMode(mode)}
                                            userName={profileForPreview?.name || "访客"}
                                            onSnailClick={() => {
                                                requestInsightPreview();
                                            }}
                                        />
                                    </div>
	                                </div>
	                            </div>
                            </>
                            )}
	                        </div>

                            {!isFullscreenBook && (
                            <>
	                        {/* 4. Destiny Heartbeat (Visual Separator/Effect) */}
	                        <div className="py-2 relative mt-8">
                            <div className="mb-4">
 {/* Removed AIFeatureGuide */}
                            </div>
                            <DestinyHeartbeat />
                        </div>

                        {/* 5. Core Feature: Energy Compass */}
                        <div className="relative mt-8">
                            <div className="mb-4">
                                <AIFeatureGuide text={<>顺势者昌。<br/>为你精准对齐「时代大势」与「个人周期」，找到当下最该做的那件事。</>} />
                            </div>
                            <div className="bg-[#111111]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-4 shadow-lg">
                                <ThreeRingsCompass
                                    epoch={ringsData.epoch}
                                    year={ringsData.year}
                                    quarter={ringsData.quarter}
                                    mode={compassMode}
                                    onModeChange={setCompassMode}
                                    onShowSmoothSailing={openSmoothSailing}
                                />
                            </div>
                        </div>



                        {/* 7. Quick Actions Dock */}
                        <div className="mt-8">
                            <InsightDock 
                                insight={insight}
                                loading={loading}
                                onAnalyze={handleAnalyze}
                                onShowInsight={requestInsightPreview}
                            />
                        </div>

                        {/* 8. Global Settings & Language Button (Mobile & Desktop) */}
                        <div className="mt-10 mb-6 flex justify-center">
                            <button 
                                onClick={() => requireAuth({ type: 'open_user_center' })}
                                className="group flex items-center gap-3 px-6 py-3 rounded-full bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all shadow-lg backdrop-blur-md active:scale-95"
                            >
                                <Globe size={18} className="text-slate-400 group-hover:text-amber-400 transition-colors" />
                                <div className="w-px h-4 bg-white/20" />
                                <div className="flex flex-col items-start leading-none text-left">
                                    <span className="text-[9px] text-slate-500 font-bold tracking-widest uppercase mb-0.5">Settings & Language</span>
                                    <span className="text-xs text-slate-300 font-bold group-hover:text-white transition-colors">账号设置与多语言</span>
                                </div>
                                <div className="ml-2 w-8 h-8 rounded-full bg-white/[0.05] border border-white/5 flex items-center justify-center group-hover:bg-amber-500/10 group-hover:border-amber-500/20 transition-colors">
                                    <Settings size={14} className="text-slate-400 group-hover:text-amber-400 transition-colors" />
                                </div>
                            </button>
                        </div>
                        </>
                        )}
                    </div>
                )}



                {activeTab === 'smooth_sailing' && profileForPreview && (
                    <Suspense fallback={<ModuleLoading />}>
                        <SmoothSailingApp 
                            userProfile={profileForPreview} 
                            isPremium={isPremium} 
                            allowPersistence={authStatus === 'authenticated' && Boolean(userProfile) && isPremium}
                            onBack={() => setActiveTab('dashboard')}
                            onRequirePremium={handleLockedContentUnlock}
                        />
                    </Suspense>
                )}
                
                {activeTab === 'smooth_sailing' && !profileForPreview && (
                    <div className="flex flex-col items-center justify-center h-[60vh] px-6 text-center animate-fade-in">
                        <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-6 border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                            <Clock size={32} className="text-slate-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3 tracking-wide">开启24小时顺风窗</h3>
                        <p className="text-slate-400 text-sm mb-8 max-w-[260px] leading-relaxed">激活您的专属身份信息，精准捕捉全天运势最佳时刻。</p>
                        <button 
                            onClick={() => startGuestPreview({ type: 'open_feature', feature: 'smooth_sailing' })}
                            className="px-8 py-3.5 bg-white text-black rounded-full font-bold shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] active:scale-95 select-none transition-all duration-200 ease-out"
                        >
                            立即激活身份
                        </button>
                    </div>
                )}



                {activeTab === 'user_center' && authStatus === 'authenticated' && userProfile && currentUser && (
                    <UserCenter
                        isOpen={true}
                        onClose={() => setActiveTab('dashboard')}
                        userProfile={userProfile}
                        user={currentUser}
                        identities={identities}
                        accountSecurity={accountSecurity}
                        onLogout={handleUserLogout}
                        onPasswordChanged={handlePasswordChanged}
                        isPremium={isPremium}
                        onRequirePayment={() => requireAuth({ type: 'open_payment' })}
                        insight={insight}
                        loading={loading}
                        onAnalyze={() => void handleAnalyze()}
                        onShowInsight={() => requireAuth({ type: 'open_feature', feature: 'insight' })}
                    />
                )}
                
                {activeTab === 'user_center' && !userProfile && (
                    <div className="flex flex-col items-center justify-center min-h-[70vh] sm:min-h-[75vh] px-6 text-center animate-fade-in relative z-10 w-full max-w-lg mx-auto">
                        
                        {/* Background Atmospheric Glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>

                        {/* Mysterious Identity Card / Dossier visual abstract */}
                        <div className="relative w-full max-w-[240px] sm:max-w-[280px] aspect-[1/1.2] mb-10 group cursor-pointer" onClick={() => requireAuth({ type: 'open_user_center' })}>
                            {/* Animated floating frame */}
                            <div className="absolute inset-0 border border-white/5 bg-gradient-to-b from-[#18181b]/80 to-[#09090b]/90 rounded-[32px] backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:-translate-y-2 group-hover:shadow-[0_30px_60px_rgba(99,102,241,0.15)] flex flex-col items-center justify-center overflow-hidden">
                                
                                {/* Inner glow scanning line */}
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent transform -translate-x-full group-hover:animate-shimmer transition-all duration-1000"></div>
                                <div className="absolute bottom-0 right-0 w-full h-[1px] bg-gradient-to-l from-transparent via-violet-400/50 to-transparent transform translate-x-full group-hover:animate-shimmer transition-all duration-1000" style={{animationDelay: '0.5s'}}></div>

                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-indigo-500/20 bg-indigo-500/5 flex items-center justify-center mb-6 shadow-[inset_0_0_20px_rgba(99,102,241,0.1),0_0_20px_rgba(99,102,241,0.2)] group-hover:bg-indigo-500/10 transition-colors duration-500">
                                    <Lock size={28} className="text-indigo-400/80 group-hover:text-indigo-300 transition-colors" />
                                </div>
                                
                                {/* Skeleton Lines */}
                                <div className="space-y-3 sm:space-y-4 w-full px-8 sm:px-10">
                                    <div className="h-1.5 w-1/2 bg-white/10 rounded-full mx-auto group-hover:bg-indigo-400/20 transition-colors"></div>
                                    <div className="h-1.5 w-3/4 bg-white/5 rounded-full mx-auto group-hover:bg-indigo-400/10 transition-colors"></div>
                                    <div className="h-1.5 w-2/3 bg-white/5 rounded-full mx-auto group-hover:bg-indigo-400/10 transition-colors"></div>
                                </div>

                                {/* Obfuscated Text watermark */}
                                <div className="absolute bottom-6 left-0 w-full text-center">
                                    <span className="font-mono text-[9px] text-white/20 tracking-[0.4em] uppercase group-hover:text-indigo-300/40 transition-colors">Identity Classified</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 mb-8 sm:mb-10 relative">
                            <h3 className="text-[22px] sm:text-[26px] font-serif font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 tracking-[0.08em]">
                                解锁核心命盘矩阵
                            </h3>
                            <p className="text-slate-400/90 text-[13.5px] sm:text-[14px] max-w-[280px] sm:max-w-[320px] mx-auto leading-[1.8] tracking-[0.05em] font-light">
                                激活专属认证，解密深层命运档案。重掌人生底层代码，开启高维视角。
                            </p>
                        </div>
                        
                        <button 
                            onClick={() => requireAuth({ type: 'open_user_center' })}
                            className="relative group w-full max-w-[260px] py-4 rounded-2xl overflow-hidden transition-all duration-300 active:scale-95"
                        >
                            {/* Button Background Layers */}
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/80 to-violet-600/80 transition-all duration-500 group-hover:scale-105 group-hover:from-indigo-500 group-hover:to-violet-500"></div>
                            <div className="absolute inset-0 border border-white/20 rounded-2xl z-10 group-hover:border-white/30 transition-colors"></div>
                            
                            {/* Inner Glow Array */}
                            <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent z-10"></div>
                            
                            {/* Hover aura blowout */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-white/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 mix-blend-overlay"></div>
                            
                            <div className="relative z-20 flex items-center justify-center gap-3">
                                <span className="font-medium text-white tracking-[0.2em] text-[15px] drop-shadow-md">立即激活专属身份</span>
                                <Sparkles size={16} className="text-indigo-100 group-hover:text-white transition-colors" />
                            </div>
                        </button>
                        
                        <p className="mt-6 text-[11px] text-slate-500/70 font-mono tracking-widest uppercase">
                            Secure / Encrypted / Offline-First
                        </p>
                    </div>
                )}
            </div>

            <SegmentInsightSheet
                isOpen={showInsightSheet}
                onClose={() => setShowInsightSheet(false)}
                insight={insight}
                era={activeEraMeta}
                user={activeUserBazi}
            />

            {/* Bottom Navigation Bar */}
            {!isFullscreenBook && (
                <div className="fixed bottom-0 left-0 right-0 h-[72px] bg-[#050505]/90 backdrop-blur-2xl border-t border-white/5 flex items-center justify-around z-[100] px-2 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
                    <NavItem icon={<LayoutDashboard />} label="运势" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                    
                    <NavItem 
                        icon={<Clock />} 
                        label="顺风窗" 
                        active={activeTab === 'smooth_sailing'} 
	                        onClick={openSmoothSailing} 
                    />
                    
                    <NavItem icon={<User />} label="我的" active={activeTab === 'user_center'} onClick={() => requireAuth({ type: 'open_user_center' })} />
                </div>
            )}

        </div>
        </>
    );
}
