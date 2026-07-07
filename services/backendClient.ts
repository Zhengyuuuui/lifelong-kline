import {
  apiJson,
  clearAuthTokens,
  getRefreshToken,
  getSessionToken,
  isJwtToken,
  setAuthTokens,
} from "./apiBase";
import { UserBaziMeta, UserInputProfile } from "../types";
import type { PaymentSuccessDetails } from "../components/PaymentModal";

export type AuthProvider = "wechat" | "apple" | "google" | "phone" | "email" | "guest";
export type AiFeature =
  | "bazi_report"
  | "life_book"
  | "life_kline"
  | "smooth_sailing"
  | "valuation"
  | "revenue_forecast"
  | "chat";

export interface BackendUser {
  id: string;
  authProvider?: string;
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  status?: string;
}

export interface AuthIdentity {
  id: string;
  provider: string;
  maskedIdentifier?: string | null;
  status: string;
  isPrimary?: boolean;
  verifiedAt?: string | null;
  lastUsedAt?: string | null;
  boundAt?: string | null;
}

export interface BackendBundle {
  ok?: boolean;
  authenticated?: boolean;
  sessionToken?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  user?: BackendUser;
  identities?: AuthIdentity[];
  profile?: UserInputProfile | null;
  membership?: Record<string, unknown> | null;
  accountSecurity?: {
    hasPassword?: boolean;
  };
  payment?: Record<string, unknown>;
  generation?: Record<string, unknown>;
  settings?: {
    settings?: Record<string, unknown>;
    bindings?: Record<string, unknown>;
    shareCount?: number;
  };
}

export interface AppleSignInPayload {
  identityToken: string;
  nonce?: string;
  nonceSha256?: string;
  fullName?: string;
  email?: string;
}

export interface PasswordLoginPayload {
  phone: string;
  password: string;
}

export interface RegistrationSmsPayload {
  phone: string;
  purpose: "register";
  deviceId?: string;
}

export interface AuthSmsPayload {
  phone: string;
  purpose: "auth";
  deviceId?: string;
}

export interface RegistrationSmsResult {
  ok: boolean;
  challengeId: string;
  expiresIn?: number;
  retryAfterSeconds: number;
}

export interface PhoneRegisterPayload {
  challengeId: string;
  phone: string;
  code: string;
  password: string;
}

export interface SmsAuthPayload {
  challengeId: string;
  phone: string;
  code: string;
}

export interface PasswordChangePayload {
  currentPassword: string;
  newPassword: string;
}

export interface PasswordSetPayload {
  newPassword: string;
}

export interface PasswordChangeResult {
  ok: boolean;
  refreshTokensRevoked?: boolean;
}

export interface AiGeneratePayload {
  feature: AiFeature;
  input?: Record<string, unknown>;
  locale?: "zh-CN" | "zh-TW" | "en-US";
  responseFormat?: "json" | "text";
}

export interface AppleReceiptPayload {
  receiptData?: string;
  signedTransactionInfo?: string;
  receipt?: string;
  purchaseToken?: string;
  productId?: string;
  transactionId?: string;
  environment?: "auto" | "sandbox" | "production";
  mockSuccess?: boolean;
}

export interface CreateXunhuPaymentPayload {
  productId: string;
}

export interface XunhuPaymentCreateResult {
  ok?: boolean;
  orderId: string;
  merchantOrderNo?: string;
  paymentProvider?: string;
  paymentStatus: string;
  amountCents?: number;
  currency?: "CNY" | string;
  payUrl?: string | null;
  qrCodeUrl?: string | null;
}

export interface PaymentOrderStatusResult {
  ok?: boolean;
  orderId: string;
  merchantOrderNo?: string;
  paymentProvider?: string;
  paymentStatus: string;
  membershipStatus?: string | null;
  paidAt?: string | null;
  membership?: {
    id?: string;
    status?: string;
    productId?: string;
    startedAt?: string;
    expiresAt?: string | null;
  } | null;
}

const CLIENT_INSTALLATION_KEY = "life_kline_client_installation_id";

const getClientInstallationId = () => {
  try {
    let value = localStorage.getItem(CLIENT_INSTALLATION_KEY);
    if (!value) {
      value = crypto.randomUUID();
      localStorage.setItem(CLIENT_INSTALLATION_KEY, value);
    }
    return value;
  } catch {
    return "browser-fallback";
  }
};

const isJwtSession = () => {
  const token = getSessionToken();
  return Boolean(token && token.split(".").length === 3);
};

const persistToken = (payload: BackendBundle) => {
  setAuthTokens({
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    sessionToken: payload.sessionToken,
  });
  return payload;
};

export const backendClient = {
  getSession: async () => {
    getClientInstallationId();
    if (isJwtSession() || isJwtToken(getRefreshToken())) {
      try {
        const bundle = await apiJson<BackendBundle>("/api/user/me");
        return persistToken({ authenticated: true, ...bundle });
      } catch (error) {
        if ((error as { status?: number }).status === 401) throw error;
      }
    }
    clearAuthTokens();
    return { authenticated: false } satisfies BackendBundle;
  },

  loginWithPassword: async (payload: PasswordLoginPayload) =>
    persistToken(
      await apiJson<BackendBundle>("/api/auth/password/login", {
        method: "POST",
        body: JSON.stringify({
          phone: payload.phone,
          password: payload.password,
        }),
      })
    ),

  sendRegistrationSms: async (payload: RegistrationSmsPayload) =>
    apiJson<RegistrationSmsResult>("/api/auth/sms/send", {
      method: "POST",
      body: JSON.stringify({
        phone: payload.phone,
        purpose: "register",
        deviceId: payload.deviceId || getClientInstallationId(),
      }),
    }),

  sendAuthSms: async (payload: AuthSmsPayload) =>
    apiJson<RegistrationSmsResult>("/api/auth/sms/send", {
      method: "POST",
      body: JSON.stringify({
        phone: payload.phone,
        purpose: "auth",
        deviceId: payload.deviceId || getClientInstallationId(),
      }),
    }),

  verifySmsAuth: async (payload: SmsAuthPayload) =>
    persistToken(
      await apiJson<BackendBundle>("/api/auth/sms/verify", {
        method: "POST",
        body: JSON.stringify({
          challengeId: payload.challengeId,
          phone: payload.phone,
          code: payload.code,
        }),
      })
    ),

  registerWithPhone: async (payload: PhoneRegisterPayload) =>
    persistToken(
      await apiJson<BackendBundle>("/api/auth/register/phone", {
        method: "POST",
        body: JSON.stringify({
          challengeId: payload.challengeId,
          phone: payload.phone,
          code: payload.code,
          password: payload.password,
        }),
      })
    ),

  setPassword: async (payload: PasswordSetPayload) =>
    apiJson<PasswordChangeResult>("/api/auth/password/set", {
      method: "POST",
      body: JSON.stringify({
        newPassword: payload.newPassword,
      }),
    }),

  changePassword: async (payload: PasswordChangePayload) =>
    apiJson<PasswordChangeResult>("/api/auth/password/change", {
      method: "POST",
      body: JSON.stringify({
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
      }),
    }),

  signInWithApple: async (payload: AppleSignInPayload) =>
    persistToken(
      await apiJson<BackendBundle>("/api/auth/apple", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    ),

  signInWithWeChat: async (code: string) =>
    persistToken(
      await apiJson<BackendBundle>("/api/auth/wechat", {
        method: "POST",
        body: JSON.stringify({ code }),
      })
    ),

  logout: async () => {
    try {
      await apiJson<BackendBundle>("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken: getRefreshToken() }),
      });
    } finally {
      clearAuthTokens();
    }
  },

  saveProfile: async (profile: UserInputProfile, bazi?: UserBaziMeta) =>
    isJwtSession()
      ? apiJson<BackendBundle>("/api/user/profile", {
          method: "POST",
          body: JSON.stringify({
            profile,
            derivedAiFoundation: bazi || {},
          }),
        })
      : apiJson<BackendBundle>("/api/profile", {
          method: "POST",
          body: JSON.stringify({ profile, bazi }),
        }),

  getMe: async () => {
    const bundle = await apiJson<BackendBundle>("/api/user/me");
    return persistToken({ authenticated: true, ...bundle });
  },

  saveProductionProfile: async (profile: UserInputProfile, bazi?: UserBaziMeta) =>
    apiJson<BackendBundle>("/api/user/profile", {
      method: "POST",
      body: JSON.stringify({
        profile,
        derivedAiFoundation: bazi || {},
      }),
    }),

  generateAi: async (payload: AiGeneratePayload) =>
    apiJson<BackendBundle>("/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({
        feature: payload.feature,
        input: payload.input || {},
        locale: payload.locale || "zh-CN",
        responseFormat: payload.responseFormat || "json",
      }),
    }),

  verifyAppleReceipt: async (payload: AppleReceiptPayload) =>
    apiJson<BackendBundle>("/api/payment/verify-receipt", {
      method: "POST",
      body: JSON.stringify({
        receiptData: payload.receiptData || payload.receipt || payload.purchaseToken,
        signedTransactionInfo: payload.signedTransactionInfo,
        productId: payload.productId,
        transactionId: payload.transactionId,
        environment: payload.environment || "auto",
        mockSuccess: payload.mockSuccess === true,
      }),
    }),

  createXunhuPayment: async (payload: CreateXunhuPaymentPayload) =>
    apiJson<XunhuPaymentCreateResult>("/api/payment/xunhupay/create", {
      method: "POST",
      body: JSON.stringify({
        productId: payload.productId,
      }),
    }),

  getPaymentOrderStatus: async (orderId: string) =>
    apiJson<PaymentOrderStatusResult>(`/api/payment/orders/${encodeURIComponent(orderId)}/status`),

  upgradeMembership: async (details?: PaymentSuccessDetails) =>
    isJwtSession() && details?.method === "apple" && (
      "receiptData" in details ||
      "signedTransactionInfo" in details ||
      "receipt" in details ||
      "transactionId" in details ||
      "productId" in details
    )
      ? backendClient.verifyAppleReceipt({
          receiptData: (details as PaymentSuccessDetails & { receiptData?: string }).receiptData,
          signedTransactionInfo: (details as PaymentSuccessDetails & { signedTransactionInfo?: string }).signedTransactionInfo,
          receipt: (details as PaymentSuccessDetails & { receipt?: string }).receipt,
          productId: (details as PaymentSuccessDetails & { productId?: string }).productId,
          transactionId: (details as PaymentSuccessDetails & { transactionId?: string }).transactionId,
          environment: "auto",
        })
      : apiJson<BackendBundle>("/api/membership/checkout", {
          method: "POST",
          body: JSON.stringify({
            plan: details?.planType || "lifetime",
            provider: details?.method || "apple",
            amountCents: details?.amountCents || 1880,
          }),
        }),

  saveSettings: async (settings: Record<string, unknown>) =>
    apiJson<BackendBundle>(isJwtSession() ? "/api/user/settings" : "/api/settings", {
      method: "POST",
      body: JSON.stringify({ settings }),
    }),

  saveBindings: async (bindings: Record<string, unknown>) =>
    apiJson<BackendBundle>(isJwtSession() ? "/api/user/bindings" : "/api/bindings", {
      method: "POST",
      body: JSON.stringify({ bindings }),
    }),

  saveShareCount: async (shareCount: number) =>
    apiJson<BackendBundle>(isJwtSession() ? "/api/user/share-count" : "/api/share-count", {
      method: "POST",
      body: JSON.stringify({ shareCount }),
    }),

  deleteAccount: async () => {
    try {
      await apiJson<BackendBundle>(isJwtSession() ? "/api/user/account" : "/api/account", { method: "DELETE" });
    } finally {
      clearAuthTokens();
    }
  },
};
