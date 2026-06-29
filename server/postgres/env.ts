import type { AiProviderName } from "../aiProvider";

export interface BackendConfig {
  nodeEnv: string;
  appEnv: "development" | "sandbox" | "staging" | "production";
  databaseUrl: string;
  databaseSsl: boolean;
  pgPoolMax: number;
  pgStatementTimeoutMs: number;
  pgIdleTimeoutMs: number;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtIssuer: string;
  jwtAudience: string;
  jwtAccessTtlSeconds: number;
  jwtRefreshTtlDays: number;
  appleClientId: string;
  appleBundleId: string;
  appleJwksUrl: string;
  appleIssuer: string;
  wechatAppId: string;
  wechatAppSecret: string;
  wechatOauthBaseUrl: string;
  aiProvider: AiProviderName;
  aiModel: string;
  aiFallbackModels: string[];
  aiApiKey: string;
  aiApiBaseUrl: string;
  aiTemperature: number;
  aiTopP: number;
  aiMaxOutputTokens: number;
  aiTimeoutMs: number;
  aiRequestWindowMs: number;
  aiFreeDailyLimit: number;
  aiMemberDailyLimit: number;
  paymentsMode: "mock" | "live";
  paymentsProvider: "apple_iap" | "xunhupay";
  appleIapEnv: "sandbox" | "production";
  appleVerifyReceiptSandboxUrl: string;
  appleVerifyReceiptProductionUrl: string;
  appleSharedSecret: string;
  appleIapProductIds: string[];
  appleAppAppleId?: number;
  appleRootCertificatePaths: string[];
  appleRootCertificatesPem: string;
  appleSignedDataOnlineChecks: boolean;
  xunhupayAppId: string;
  xunhupaySecret: string;
  xunhupayGateway: string;
  xunhupayGatewayBackup: string;
  xunhupayNotifyUrl: string;
  xunhupayReturnUrl: string;
  xunhupayCallbackUrl: string;
  publicSiteUrl: string;
  smsMode: "disabled" | "mock" | "tencent";
  smsCodeHmacSecret: string;
  smsCodeTtlSeconds: number;
  smsCodeMaxAttempts: number;
  smsSendCooldownSeconds: number;
  smsSendIpLimit: number;
  smsSendPhoneLimit: number;
  smsSendDeviceLimit: number;
  smsMockCode: string;
  tencentCloudSecretId: string;
  tencentCloudSecretKey: string;
  tencentCloudSmsSdkAppId: string;
  tencentCloudSmsSignName: string;
  tencentCloudSmsTemplateId: string;
  tencentCloudSmsRegion: string;
  pgRateLimitEnabled: boolean;
}

const boolEnv = (value: string | undefined, fallback: boolean) => {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const intEnv = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const listEnv = (value: string | undefined, fallback: string[] = []) => {
  if (!value) return fallback;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const aiProviderEnv = (value: string | undefined): AiProviderName => {
  const normalized = String(value || "gemini").toLowerCase();
  if (normalized === "openai_compatible" || normalized === "compatible") return "openai-compatible";
  if (["gemini", "openai", "openai-compatible", "anthropic"].includes(normalized)) {
    return normalized as AiProviderName;
  }
  return "gemini";
};

const aiKeyEnv = (provider: AiProviderName) => {
  if (provider === "openai") return process.env.OPENAI_API_KEY || process.env.AI_API_KEY || "";
  if (provider === "openai-compatible") {
    return process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.API_KEY || "";
  }
  if (provider === "anthropic") return process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY || "";
  return process.env.GEMINI_API_KEY || process.env.AI_API_KEY || process.env.API_KEY || "";
};

const isProductionAppEnv = (appEnv: BackendConfig["appEnv"]) => appEnv === "production";

const requireStrongSecret = (name: string, value: string, appEnv: BackendConfig["appEnv"]) => {
  if (isProductionAppEnv(appEnv) && value.length < 32) {
    throw new Error(`${name} must be at least 32 characters in production.`);
  }
  return value;
};

const appEnvValue = (value: string | undefined, nodeEnv: string): BackendConfig["appEnv"] => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    if (nodeEnv === "production") {
      throw new Error("APP_ENV must be explicitly set to staging or production when NODE_ENV=production.");
    }
    return "development";
  }
  if (!["development", "sandbox", "staging", "production"].includes(normalized)) {
    throw new Error("APP_ENV must be development, staging, or production.");
  }
  if (nodeEnv === "production" && (normalized === "development" || normalized === "sandbox")) {
    throw new Error("APP_ENV=development/sandbox is not allowed when NODE_ENV=production. Use APP_ENV=staging for production-build dry runs.");
  }
  if ((normalized === "staging" || normalized === "production") && nodeEnv !== "production") {
    throw new Error("APP_ENV=staging/production requires NODE_ENV=production.");
  }
  return normalized as BackendConfig["appEnv"];
};

const paymentProviderEnv = (value: string | undefined): BackendConfig["paymentsProvider"] => {
  const normalized = String(value || "xunhupay").toLowerCase();
  return normalized === "xunhupay" ? "xunhupay" : "apple_iap";
};

const paymentModeEnv = (
  value: string | undefined,
  appEnv: BackendConfig["appEnv"],
  paymentsProvider: BackendConfig["paymentsProvider"]
): BackendConfig["paymentsMode"] => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    if (isProductionAppEnv(appEnv) && paymentsProvider === "xunhupay") {
      throw new Error("PAYMENTS_MODE=live is required for Xunhupay in production.");
    }
    return "mock";
  }
  if (normalized !== "mock" && normalized !== "live") {
    throw new Error("PAYMENTS_MODE must be either mock or live.");
  }
  if (isProductionAppEnv(appEnv) && paymentsProvider === "xunhupay" && normalized !== "live") {
    throw new Error("PAYMENTS_MODE=mock is not allowed for Xunhupay in production.");
  }
  return normalized;
};

const requireValue = (name: string, value: string) => {
  if (!value) {
    throw new Error(`${name} is required when PAYMENTS_MODE=live and PAYMENTS_PROVIDER=xunhupay.`);
  }
  return value;
};

const requireHttpsUrl = (name: string, value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid HTTPS URL.`);
  }
  if (url.protocol !== "https:") {
    throw new Error(`${name} must use HTTPS.`);
  }
  return value;
};

const boundedIntEnv = (name: string, value: string | undefined, fallback: number, min: number, max: number) => {
  const parsed = intEnv(value, fallback);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
};

const smsModeEnv = (value: string | undefined, appEnv: BackendConfig["appEnv"]): BackendConfig["smsMode"] => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    if (isProductionAppEnv(appEnv)) {
      throw new Error("SMS_MODE=tencent is required when APP_ENV=production.");
    }
    return "disabled";
  }
  if (!["disabled", "mock", "tencent"].includes(normalized)) {
    throw new Error("SMS_MODE must be disabled, mock, or tencent.");
  }
  if (isProductionAppEnv(appEnv) && normalized !== "tencent") {
    throw new Error("SMS_MODE=mock/disabled is not allowed when APP_ENV=production.");
  }
  return normalized as BackendConfig["smsMode"];
};

const requireSmsHmacSecret = (
  value: string,
  smsMode: BackendConfig["smsMode"],
  appEnv: BackendConfig["appEnv"]
) => {
  if (smsMode === "disabled") return value;
  if (!value) throw new Error("SMS_CODE_HMAC_SECRET is required when SMS_MODE is enabled.");
  if (value.length < 32) {
    throw new Error("SMS_CODE_HMAC_SECRET must be at least 32 characters.");
  }
  if (isProductionAppEnv(appEnv)) {
    requireStrongSecret("SMS_CODE_HMAC_SECRET", value, appEnv);
  }
  return value;
};

const requireSmsMockCode = (value: string, smsMode: BackendConfig["smsMode"]) => {
  if (smsMode !== "mock") return value;
  if (!/^\d{6}$/.test(value)) {
    throw new Error("SMS_MOCK_CODE must be a 6-digit code when SMS_MODE=mock.");
  }
  return value;
};

const requireTencentSmsValue = (
  name: string,
  value: string,
  smsMode: BackendConfig["smsMode"]
) => {
  if (smsMode !== "tencent") return value;
  if (!value) throw new Error(`${name} is required when SMS_MODE=tencent.`);
  return value;
};

export const getBackendConfig = (): BackendConfig => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const appEnv = appEnvValue(process.env.APP_ENV, nodeEnv);
  const aiProvider = aiProviderEnv(process.env.AI_PROVIDER);
  const paymentsProvider = paymentProviderEnv(process.env.PAYMENTS_PROVIDER);
  const paymentsMode = paymentModeEnv(process.env.PAYMENTS_MODE, appEnv, paymentsProvider);
  const smsMode = smsModeEnv(process.env.SMS_MODE, appEnv);
  const appleIapEnv = process.env.APPLE_IAP_ENV === "production" ? "production" : "sandbox";
  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || "dev-only-access-secret-change-before-release";
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || "dev-only-refresh-secret-change-before-release";
  const smsCodeHmacSecret = requireSmsHmacSecret(
    process.env.SMS_CODE_HMAC_SECRET || "",
    smsMode,
    appEnv
  );
  const smsMockCode = requireSmsMockCode(process.env.SMS_MOCK_CODE || "", smsMode);
  const publicSiteUrl = process.env.PUBLIC_SITE_URL || "";
  const xunhupayNotifyUrl = process.env.XUNHUPAY_NOTIFY_URL || (
    publicSiteUrl ? `${publicSiteUrl.replace(/\/$/, "")}/api/payment/xunhupay/notify` : ""
  );
  const xunhupayReturnUrl = process.env.XUNHUPAY_RETURN_URL || publicSiteUrl;
  const xunhupayCallbackUrl = process.env.XUNHUPAY_CALLBACK_URL || publicSiteUrl;
  const xunhupayGateway = process.env.XUNHUPAY_GATEWAY || "https://api.xunhupay.com/payment/do.html";
  const xunhupayGatewayBackup = process.env.XUNHUPAY_GATEWAY_BACKUP || "https://api.dpweixin.com/payment/do.html";

  if (paymentsMode === "live" && paymentsProvider === "xunhupay") {
    requireValue("XUNHUPAY_APP_ID", process.env.XUNHUPAY_APP_ID || "");
    requireValue("XUNHUPAY_SECRET", process.env.XUNHUPAY_SECRET || "");
    requireValue("XUNHUPAY_NOTIFY_URL", xunhupayNotifyUrl);
    requireValue("XUNHUPAY_RETURN_URL", xunhupayReturnUrl);
    requireValue("XUNHUPAY_CALLBACK_URL", xunhupayCallbackUrl);
    requireHttpsUrl("XUNHUPAY_GATEWAY", xunhupayGateway);
    if (xunhupayGatewayBackup) {
      requireHttpsUrl("XUNHUPAY_GATEWAY_BACKUP", xunhupayGatewayBackup);
    }
    requireHttpsUrl("XUNHUPAY_NOTIFY_URL", xunhupayNotifyUrl);
    requireHttpsUrl("XUNHUPAY_RETURN_URL", xunhupayReturnUrl);
    requireHttpsUrl("XUNHUPAY_CALLBACK_URL", xunhupayCallbackUrl);
  }

  return {
    nodeEnv,
    appEnv,
    databaseUrl:
      process.env.DATABASE_URL ||
      "postgres://life_kline:life_kline_password@127.0.0.1:5432/life_kline",
    databaseSsl: boolEnv(process.env.DATABASE_SSL, false),
    pgPoolMax: intEnv(process.env.PG_POOL_MAX, 10),
    pgStatementTimeoutMs: intEnv(process.env.PG_STATEMENT_TIMEOUT_MS, 15000),
    pgIdleTimeoutMs: intEnv(process.env.PG_IDLE_TIMEOUT_MS, 30000),
    jwtAccessSecret: requireStrongSecret("JWT_ACCESS_SECRET", jwtAccessSecret, appEnv),
    jwtRefreshSecret: requireStrongSecret("JWT_REFRESH_SECRET", jwtRefreshSecret, appEnv),
    jwtIssuer: process.env.JWT_ISSUER || "life-kline-api",
    jwtAudience: process.env.JWT_AUDIENCE || "life-kline-ios",
    jwtAccessTtlSeconds: intEnv(process.env.JWT_ACCESS_TTL_SECONDS, 900),
    jwtRefreshTtlDays: intEnv(process.env.JWT_REFRESH_TTL_DAYS, 30),
    appleClientId: process.env.APPLE_CLIENT_ID || "com.lifekline.destiny",
    appleBundleId: process.env.APPLE_BUNDLE_ID || process.env.APPLE_CLIENT_ID || "com.lifekline.destiny",
    appleJwksUrl: process.env.APPLE_JWKS_URL || "https://appleid.apple.com/auth/keys",
    appleIssuer: process.env.APPLE_ISSUER || "https://appleid.apple.com",
    wechatAppId: process.env.WECHAT_APP_ID || "",
    wechatAppSecret: process.env.WECHAT_APP_SECRET || "",
    wechatOauthBaseUrl: process.env.WECHAT_OAUTH_BASE_URL || "https://api.weixin.qq.com",
    aiProvider,
    aiModel: process.env.AI_MODEL || (aiProvider === "anthropic"
      ? "claude-3-5-haiku-latest"
      : aiProvider === "openai" || aiProvider === "openai-compatible"
        ? "gpt-4o-mini"
        : "gemini-3.5-flash"),
    aiFallbackModels: listEnv(
      process.env.AI_FALLBACK_MODELS,
      aiProvider === "gemini" ? ["gemini-3.1-flash-lite", "gemini-flash-latest"] : []
    ),
    aiApiKey: aiKeyEnv(aiProvider),
    aiApiBaseUrl: process.env.AI_API_BASE_URL || "",
    aiTemperature: intEnv(process.env.AI_TEMPERATURE, 0.68),
    aiTopP: intEnv(process.env.AI_TOP_P, 0.9),
    aiMaxOutputTokens: intEnv(process.env.AI_MAX_OUTPUT_TOKENS, 4096),
    aiTimeoutMs: intEnv(process.env.AI_TIMEOUT_MS, 45000),
    aiRequestWindowMs: intEnv(process.env.AI_REQUEST_WINDOW_MS, 24 * 60 * 60 * 1000),
    aiFreeDailyLimit: intEnv(process.env.AI_FREE_DAILY_LIMIT, 20),
    aiMemberDailyLimit: intEnv(process.env.AI_MEMBER_DAILY_LIMIT, 500),
    paymentsMode,
    paymentsProvider,
    appleIapEnv,
    appleVerifyReceiptSandboxUrl:
      process.env.APPLE_VERIFY_RECEIPT_SANDBOX_URL || "https://sandbox.itunes.apple.com/verifyReceipt",
    appleVerifyReceiptProductionUrl:
      process.env.APPLE_VERIFY_RECEIPT_PRODUCTION_URL || "https://buy.itunes.apple.com/verifyReceipt",
    appleSharedSecret: process.env.APPLE_SHARED_SECRET || "",
    appleIapProductIds: listEnv(process.env.APPLE_IAP_PRODUCT_IDS),
    appleAppAppleId: process.env.APPLE_APP_APPLE_ID
      ? intEnv(process.env.APPLE_APP_APPLE_ID, 0)
      : undefined,
    appleRootCertificatePaths: listEnv(process.env.APPLE_ROOT_CERTIFICATE_PATHS),
    appleRootCertificatesPem: (process.env.APPLE_ROOT_CERTIFICATES_PEM || "").replace(/\\n/g, "\n"),
    appleSignedDataOnlineChecks: boolEnv(process.env.APPLE_SIGNED_DATA_ONLINE_CHECKS, true),
    xunhupayAppId: process.env.XUNHUPAY_APP_ID || "",
    xunhupaySecret: process.env.XUNHUPAY_SECRET || "",
    xunhupayGateway,
    xunhupayGatewayBackup,
    xunhupayNotifyUrl,
    xunhupayReturnUrl,
    xunhupayCallbackUrl,
    publicSiteUrl,
    smsMode,
    smsCodeHmacSecret,
    smsCodeTtlSeconds: boundedIntEnv("SMS_CODE_TTL_SECONDS", process.env.SMS_CODE_TTL_SECONDS, 300, 60, 1800),
    smsCodeMaxAttempts: boundedIntEnv("SMS_CODE_MAX_ATTEMPTS", process.env.SMS_CODE_MAX_ATTEMPTS, 5, 1, 20),
    smsSendCooldownSeconds: boundedIntEnv("SMS_SEND_COOLDOWN_SECONDS", process.env.SMS_SEND_COOLDOWN_SECONDS, 60, 15, 3600),
    smsSendIpLimit: boundedIntEnv("SMS_SEND_IP_LIMIT", process.env.SMS_SEND_IP_LIMIT, 20, 1, 1000),
    smsSendPhoneLimit: boundedIntEnv("SMS_SEND_PHONE_LIMIT", process.env.SMS_SEND_PHONE_LIMIT, 5, 1, 200),
    smsSendDeviceLimit: boundedIntEnv("SMS_SEND_DEVICE_LIMIT", process.env.SMS_SEND_DEVICE_LIMIT, 10, 1, 500),
    smsMockCode,
    tencentCloudSecretId: requireTencentSmsValue(
      "TENCENTCLOUD_SECRET_ID",
      process.env.TENCENTCLOUD_SECRET_ID || "",
      smsMode
    ),
    tencentCloudSecretKey: requireTencentSmsValue(
      "TENCENTCLOUD_SECRET_KEY",
      process.env.TENCENTCLOUD_SECRET_KEY || "",
      smsMode
    ),
    tencentCloudSmsSdkAppId: requireTencentSmsValue(
      "TENCENTCLOUD_SMS_SDK_APP_ID",
      process.env.TENCENTCLOUD_SMS_SDK_APP_ID || "",
      smsMode
    ),
    tencentCloudSmsSignName: requireTencentSmsValue(
      "TENCENTCLOUD_SMS_SIGN_NAME",
      process.env.TENCENTCLOUD_SMS_SIGN_NAME || "",
      smsMode
    ),
    tencentCloudSmsTemplateId: requireTencentSmsValue(
      "TENCENTCLOUD_SMS_TEMPLATE_ID",
      process.env.TENCENTCLOUD_SMS_TEMPLATE_ID || "",
      smsMode
    ),
    tencentCloudSmsRegion: process.env.TENCENTCLOUD_SMS_REGION || "ap-guangzhou",
    pgRateLimitEnabled: boolEnv(process.env.PG_RATE_LIMIT_ENABLED, true),
  };
};
