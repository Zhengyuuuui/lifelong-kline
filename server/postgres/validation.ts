import { createHash } from "node:crypto";
import { ValidationError } from "./errors";

export type Gender = "male" | "female" | "neutral";
export type AiFeature =
  | "bazi_report"
  | "life_book"
  | "life_kline"
  | "smooth_sailing"
  | "valuation"
  | "revenue_forecast"
  | "chat";

export type AppleReceiptEnvironment = "auto" | "sandbox" | "production";

export interface AppleLoginPayload {
  identityToken: string;
  nonce?: string;
  nonceSha256?: string;
  fullName?: string;
  email?: string;
}

export interface WeChatLoginPayload {
  code: string;
}

export interface RefreshPayload {
  refreshToken: string;
}

export interface PasswordLoginPayload {
  phone: string;
  password: string;
}

export interface PasswordChangePayload {
  currentPassword: string;
  newPassword: string;
}

export type SmsPurpose = "register";

export interface SmsSendPayload {
  phone: string;
  purpose: SmsPurpose;
  deviceId: string;
}

export interface PhoneRegisterPayload {
  challengeId: string;
  phone: string;
  code: string;
  password: string;
}

export interface UserProfilePayload {
  name: string;
  gender: Gender;
  birthDate: string;
  birthTime?: string | null;
  birthPlace?: string | null;
  derivedAiFoundation?: Record<string, unknown>;
}

export interface AiGeneratePayload {
  feature: AiFeature;
  input: Record<string, unknown>;
  locale: "zh-CN" | "zh-TW" | "en-US";
  responseFormat: "json" | "text";
}

export interface PaymentVerifyReceiptPayload {
  receiptData?: string;
  signedTransactionInfo?: string;
  productId?: string;
  transactionId?: string;
  environment: AppleReceiptEnvironment;
  mockSuccess: boolean;
}

export interface AppleWebhookPayload {
  signedPayload: string;
}

export interface UserSettingsPayload {
  notifications: boolean;
  language: string;
}

export interface UserBindingsPayload {
  phone: string | null;
  wechat: boolean;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const str = (value: unknown, max = 255) => String(value ?? "").trim().slice(0, max);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const JWT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const AI_FEATURES: AiFeature[] = [
  "bazi_report",
  "life_book",
  "life_kline",
  "smooth_sailing",
  "valuation",
  "revenue_forecast",
  "chat",
];
const LOCALES = ["zh-CN", "zh-TW", "en-US"] as const;
const PAYMENT_ENVS: AppleReceiptEnvironment[] = ["auto", "sandbox", "production"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEVICE_ID_RE = /^[A-Za-z0-9._:-]{8,128}$/;

const passwordValue = (value: unknown) => typeof value === "string" ? value : "";

export const validateCredentialPassword = (password: string, field = "password") => {
  const length = Array.from(password).length;
  if (length < 10 || length > 128 || password.includes("\0")) {
    throw new ValidationError({ [field]: "Password must be 10-128 characters" });
  }
  return password;
};

export const normalizeE164Phone = (value: unknown) => {
  const normalized = String(value ?? "").trim().replace(/[\s().-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new ValidationError({ phone: "Expected E.164 phone number" });
  }
  return normalized;
};

export const sha256Base64Url = (value: string) =>
  createHash("sha256").update(value).digest("base64url");

export const validateAppleLoginPayload = (body: unknown): AppleLoginPayload => {
  if (!isObject(body)) throw new ValidationError({ body: "Expected JSON object" });
  const identityToken = str(body.identityToken, 8192);
  const nonce = body.nonce ? str(body.nonce, 256) : undefined;
  const nonceSha256 = body.nonceSha256 ? str(body.nonceSha256, 256) : undefined;
  const fullName = body.fullName ? str(body.fullName, 120) : undefined;
  const email = body.email ? str(body.email, 255) : undefined;

  const details: Record<string, string> = {};
  if (!JWT_RE.test(identityToken)) details.identityToken = "Expected Apple identity JWT";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) details.email = "Invalid email";
  if (Object.keys(details).length) throw new ValidationError(details);

  return { identityToken, nonce, nonceSha256, fullName, email };
};

export const validateWeChatLoginPayload = (body: unknown): WeChatLoginPayload => {
  if (!isObject(body)) throw new ValidationError({ body: "Expected JSON object" });
  const code = str(body.code, 512);
  if (!code || !/^[A-Za-z0-9_\-:/.]+$/.test(code)) {
    throw new ValidationError({ code: "Invalid WeChat authorization code" });
  }
  return { code };
};

export const validateRefreshPayload = (body: unknown): RefreshPayload => {
  if (!isObject(body)) throw new ValidationError({ body: "Expected JSON object" });
  const refreshToken = str(body.refreshToken, 8192);
  if (!JWT_RE.test(refreshToken)) {
    throw new ValidationError({ refreshToken: "Expected refresh JWT" });
  }
  return { refreshToken };
};

export const validatePasswordLoginPayload = (body: unknown): PasswordLoginPayload => {
  if (!isObject(body)) throw new ValidationError({ body: "Expected JSON object" });
  return {
    phone: normalizeE164Phone(body.phone),
    password: validateCredentialPassword(passwordValue(body.password), "password"),
  };
};

export const validatePasswordChangePayload = (body: unknown): PasswordChangePayload => {
  if (!isObject(body)) throw new ValidationError({ body: "Expected JSON object" });
  return {
    currentPassword: validateCredentialPassword(
      passwordValue(body.currentPassword),
      "currentPassword"
    ),
    newPassword: validateCredentialPassword(passwordValue(body.newPassword), "newPassword"),
  };
};

const normalizeDeviceId = (value: unknown) => {
  const deviceId = str(value, 128);
  if (!DEVICE_ID_RE.test(deviceId)) {
    throw new ValidationError({ deviceId: "Expected stable device identifier" });
  }
  return deviceId;
};

export const validateSmsSendPayload = (body: unknown): SmsSendPayload => {
  if (!isObject(body)) throw new ValidationError({ body: "Expected JSON object" });
  const purpose = str(body.purpose, 32) as SmsPurpose;
  const details: Record<string, string> = {};
  if (purpose !== "register") details.purpose = "Unsupported SMS purpose";
  if (Object.keys(details).length) throw new ValidationError(details);
  return {
    phone: normalizeE164Phone(body.phone),
    purpose,
    deviceId: normalizeDeviceId(body.deviceId),
  };
};

export const validatePhoneRegisterPayload = (body: unknown): PhoneRegisterPayload => {
  if (!isObject(body)) throw new ValidationError({ body: "Expected JSON object" });
  const challengeId = str(body.challengeId, 64);
  const code = str(body.code, 16);
  const details: Record<string, string> = {};
  if (!UUID_RE.test(challengeId)) details.challengeId = "Expected challenge UUID";
  if (!/^\d{6}$/.test(code)) details.code = "Expected 6-digit verification code";
  if (Object.keys(details).length) throw new ValidationError(details);
  return {
    challengeId,
    phone: normalizeE164Phone(body.phone),
    code,
    password: validateCredentialPassword(passwordValue(body.password), "password"),
  };
};

export const validateUserProfilePayload = (body: unknown): UserProfilePayload => {
  if (!isObject(body)) throw new ValidationError({ body: "Expected JSON object" });
  const source = isObject(body.profile) ? body.profile : body;
  const name = str(source.name, 80);
  const gender = str(source.gender, 20) as Gender;
  const birthDate = str(source.birthDate || source.birth_date, 10);
  const birthTimeRaw = str(source.birthTime || source.birth_time || "", 5);
  const birthPlace = str(source.birthPlace || source.birth_place || "", 160) || null;
  const derivedAiFoundation = isObject(source.derivedAiFoundation)
    ? source.derivedAiFoundation
    : isObject(source.derived_ai_foundation)
      ? source.derived_ai_foundation
      : isObject(body.derivedAiFoundation)
        ? body.derivedAiFoundation
        : isObject(body.bazi)
          ? body.bazi
          : {};

  const details: Record<string, string> = {};
  if (!name) details.name = "Required";
  if (!["male", "female", "neutral"].includes(gender)) {
    details.gender = "Expected male, female, or neutral";
  }
  if (!DATE_RE.test(birthDate)) {
    details.birthDate = "Expected YYYY-MM-DD";
  } else {
    const date = new Date(`${birthDate}T00:00:00.000Z`);
    if (
      Number.isNaN(date.getTime()) ||
      birthDate < "1900-01-01" ||
      date.getTime() > Date.now()
    ) {
      details.birthDate = "Birth date must be between 1900-01-01 and today";
    }
  }
  if (birthTimeRaw && !TIME_RE.test(birthTimeRaw)) {
    details.birthTime = "Expected HH:mm";
  }
  if (Object.keys(details).length) throw new ValidationError(details);

  return {
    name,
    gender,
    birthDate,
    birthTime: birthTimeRaw || null,
    birthPlace,
    derivedAiFoundation,
  };
};

export const validateAiGeneratePayload = (body: unknown): AiGeneratePayload => {
  if (!isObject(body)) throw new ValidationError({ body: "Expected JSON object" });

  const feature = str(body.feature || body.type || "chat", 40) as AiFeature;
  const locale = str(body.locale || "zh-CN", 12) as AiGeneratePayload["locale"];
  const responseFormat = str(body.responseFormat || body.response_format || "json", 12) as
    AiGeneratePayload["responseFormat"];
  const rawInput = isObject(body.input)
    ? body.input
    : isObject(body.params)
      ? body.params
      : isObject(body.payload)
        ? body.payload
        : {};

  const details: Record<string, string> = {};
  if (!AI_FEATURES.includes(feature)) details.feature = "Unsupported AI feature";
  if (!LOCALES.includes(locale)) details.locale = "Unsupported locale";
  if (!["json", "text"].includes(responseFormat)) {
    details.responseFormat = "Expected json or text";
  }

  const serialized = JSON.stringify(rawInput);
  if (serialized.length > 12000) {
    details.input = "Input is too large";
  }
  if (Object.keys(details).length) throw new ValidationError(details);

  return {
    feature,
    input: rawInput,
    locale,
    responseFormat,
  };
};

export const validatePaymentVerifyReceiptPayload = (body: unknown): PaymentVerifyReceiptPayload => {
  if (!isObject(body)) throw new ValidationError({ body: "Expected JSON object" });

  const receiptData = str(body.receiptData || body.receipt || body.purchaseToken || "", 2_000_000);
  const signedTransactionInfo = str(body.signedTransactionInfo || body.signed_transaction_info || "", 2_000_000);
  const productId = str(body.productId || body.product_id || "", 180) || undefined;
  const transactionId = str(body.transactionId || body.transaction_id || "", 180) || undefined;
  const environment = str(body.environment || "auto", 20) as AppleReceiptEnvironment;
  const mockSuccess = body.mockSuccess === true || body.mock_success === true;

  const details: Record<string, string> = {};
  if (receiptData && !/^[A-Za-z0-9+/=_\-\r\n]+$/.test(receiptData)) {
    details.receiptData = "Receipt must be base64 encoded";
  }
  if (signedTransactionInfo && signedTransactionInfo.split(".").length !== 3) {
    details.signedTransactionInfo = "Expected StoreKit 2 signed transaction JWS";
  }
  if (productId && !/^[A-Za-z0-9_.:\-]+$/.test(productId)) {
    details.productId = "Invalid product id";
  }
  if (transactionId && !/^[A-Za-z0-9_.:\-]+$/.test(transactionId)) {
    details.transactionId = "Invalid transaction id";
  }
  if (!PAYMENT_ENVS.includes(environment)) {
    details.environment = "Expected auto, sandbox, or production";
  }
  if (Object.keys(details).length) throw new ValidationError(details);

  return {
    receiptData: receiptData || undefined,
    signedTransactionInfo: signedTransactionInfo || undefined,
    productId,
    transactionId,
    environment,
    mockSuccess,
  };
};

export const validateAppleWebhookPayload = (body: unknown): AppleWebhookPayload => {
  if (!isObject(body)) throw new ValidationError({ body: "Expected JSON object" });
  const signedPayload = str(body.signedPayload, 2_000_000);
  if (!signedPayload || signedPayload.split(".").length !== 3) {
    throw new ValidationError({ signedPayload: "Expected App Store signedPayload JWS" });
  }
  return { signedPayload };
};

export const validateUserSettingsPayload = (body: unknown): UserSettingsPayload => {
  if (!isObject(body)) throw new ValidationError({ body: "Expected JSON object" });
  const source = isObject(body.settings) ? body.settings : body;
  return {
    notifications: source.notifications !== false,
    language: str(source.language || "中文 / EN", 40),
  };
};

export const validateUserBindingsPayload = (body: unknown): UserBindingsPayload => {
  if (!isObject(body)) throw new ValidationError({ body: "Expected JSON object" });
  const source = isObject(body.bindings) ? body.bindings : body;
  const phone = source.phone ? str(source.phone, 32) : null;
  if (phone && !/^[+\d\s*.-]{6,32}$/.test(phone)) {
    throw new ValidationError({ phone: "Invalid phone binding" });
  }
  return {
    phone,
    wechat: source.wechat === true,
  };
};

export const validateShareCountPayload = (body: unknown): number => {
  if (!isObject(body)) throw new ValidationError({ body: "Expected JSON object" });
  const value = Number(body.shareCount ?? body.share_count ?? 0);
  if (!Number.isInteger(value) || value < 0 || value > 1_000_000) {
    throw new ValidationError({ shareCount: "Invalid share count" });
  }
  return value;
};
