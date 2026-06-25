import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

type Check = {
  name: string;
  ok: boolean;
  detail?: string;
};

const mode = process.argv.includes("--production") ? "production" : "local";
const checks: Check[] = [];
const warnings: string[] = [];

const add = (name: string, ok: boolean, detail?: string) => {
  checks.push({ name, ok, detail });
};

const requireFile = (relativePath: string) => {
  add(`file:${relativePath}`, existsSync(path.join(process.cwd(), relativePath)));
};

const collectFiles = (relativePath: string): string[] => {
  const fullPath = path.join(process.cwd(), relativePath);
  if (!existsSync(fullPath)) return [];

  const stat = statSync(fullPath);
  if (stat.isFile()) return [relativePath];
  if (!stat.isDirectory()) return [];

  return readdirSync(fullPath).flatMap((entry) => {
    if (entry === "node_modules" || entry === "dist" || entry === "build" || entry === "public") {
      return [];
    }
    return collectFiles(path.join(relativePath, entry));
  });
};

const sourceFileExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);

const nodeMajor = Number(process.versions.node.split(".")[0]);
add("node >= 22", nodeMajor >= 22, process.versions.node);

try {
  await import("node:sqlite");
  add("node:sqlite available", true);
} catch (error) {
  add("node:sqlite available", false, error instanceof Error ? error.message : String(error));
}

requireFile("package-lock.json");
requireFile("tailwind.config.cjs");
requireFile("postcss.config.cjs");
requireFile("server.ts");
requireFile("server/database.ts");
requireFile("server/routes.ts");
requireFile("server/security.ts");
requireFile("server/validation.ts");
requireFile("server/aiProvider.ts");
requireFile("server/postgres/index.ts");
requireFile("server/postgres/db.ts");
requireFile("server/postgres/env.ts");
requireFile("server/postgres/auth.service.ts");
requireFile("server/postgres/password.service.ts");
requireFile("server/postgres/sms.service.ts");
requireFile("server/postgres/tencentSms.service.ts");
requireFile("server/postgres/registration.service.ts");
requireFile("server/postgres/user.service.ts");
requireFile("server/postgres/ai.service.ts");
requireFile("server/postgres/payment.service.ts");
requireFile("server/postgres/xunhupay.controller.ts");
requireFile("server/postgres/xunhupay.service.ts");
requireFile("server/postgres/xunhupay.sign.ts");
requireFile("server/postgres/health.controller.ts");
requireFile("server/postgres/appleWebhook.service.ts");
requireFile("server/postgres/webhook.controller.ts");
requireFile("server/postgres/rateLimit.middleware.ts");
requireFile("db/migrations/001_phase1_auth_schema.sql");
requireFile("db/migrations/002_webhooks_rate_limits.sql");
requireFile("db/migrations/003_user_preferences_and_prod_guards.sql");
requireFile("db/migrations/004_xunhupay_payment_fields.sql");
requireFile("db/migrations/005_identity_ownership_guards.sql");
requireFile("db/migrations/006_password_credentials.sql");
requireFile("db/migrations/007_sms_auth_challenges.sql");
requireFile("scripts/postgres-migrate.ts");
requireFile("capacitor.config.ts");
requireFile("ios/App/App/Info.plist");
requireFile("ios/App/CapApp-SPM/Sources/CapApp-SPM/LifeKlineNativePlugin.swift");
requireFile("docs/execution-runbook.md");
requireFile("docs/agent-execution-instructions.md");
requireFile("docs/launch-readiness-checklist.md");

const pkg = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
const requiredScripts = [
  "dev",
  "build:web",
  "build",
  "start",
  "lint",
  "test:api",
  "verify:full",
  "preflight",
  "preflight:prod",
  "db:stats",
  "db:backup",
  "db:vacuum",
  "db:purge",
  "db:postgres:migrate",
  "ios:sync",
  "ios:open",
];

for (const script of requiredScripts) {
  add(`script:${script}`, Boolean(pkg.scripts?.[script]));
}

const envExample = existsSync(".env.example") ? readFileSync(".env.example", "utf8") : "";
for (const key of [
  "AI_PROVIDER",
  "AI_API_KEY",
  "AI_API_BASE_URL",
  "GEMINI_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "DATABASE_URL",
	  "DATABASE_SSL",
	  "APP_ENV",
	  "HOST",
	  "CLIENT_ORIGINS",
	  "CLIENT_CONNECT_SRC",
	  "TRUST_PROXY",
	  "ENABLE_LEGACY_COMPAT_API",
  "ENABLE_LEGACY_AI_PROXY",
  "PAYMENTS_MODE",
  "PAYMENTS_PROVIDER",
  "PUBLIC_SITE_URL",
  "XUNHUPAY_APP_ID",
  "XUNHUPAY_SECRET",
  "XUNHUPAY_GATEWAY",
  "XUNHUPAY_GATEWAY_BACKUP",
  "XUNHUPAY_NOTIFY_URL",
  "XUNHUPAY_RETURN_URL",
  "XUNHUPAY_CALLBACK_URL",
  "APPLE_CLIENT_ID",
  "APPLE_BUNDLE_ID",
  "APPLE_IAP_PRODUCT_IDS",
  "APPLE_APP_APPLE_ID",
  "APPLE_ROOT_CERTIFICATE_PATHS",
  "APPLE_ROOT_CERTIFICATES_PEM",
  "APPLE_SIGNED_DATA_ONLINE_CHECKS",
  "APPLE_SHARED_SECRET",
  "SMS_MODE",
  "SMS_CODE_HMAC_SECRET",
  "SMS_CODE_TTL_SECONDS",
  "SMS_CODE_MAX_ATTEMPTS",
  "SMS_SEND_COOLDOWN_SECONDS",
  "SMS_SEND_IP_LIMIT",
  "SMS_SEND_PHONE_LIMIT",
  "SMS_SEND_DEVICE_LIMIT",
  "SMS_MOCK_CODE",
  "TENCENTCLOUD_SECRET_ID",
  "TENCENTCLOUD_SECRET_KEY",
  "TENCENTCLOUD_SMS_SDK_APP_ID",
  "TENCENTCLOUD_SMS_SIGN_NAME",
  "TENCENTCLOUD_SMS_TEMPLATE_ID",
  "TENCENTCLOUD_SMS_REGION",
  "PG_RATE_LIMIT_ENABLED",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "VITE_API_BASE_URL",
  "VITE_ENABLE_LEGACY_AI_PROXY",
  "VITE_ALLOW_LOCAL_PREMIUM_FALLBACK",
  "VITE_APPLE_IAP_MONTHLY_PRODUCT_ID",
  "VITE_APPLE_IAP_LIFETIME_PRODUCT_ID",
  "AI_MODEL",
  "AI_FALLBACK_MODELS",
  "AI_TEMPERATURE",
  "AI_TOP_P",
  "AI_MAX_OUTPUT_TOKENS",
  "AI_TIMEOUT_MS",
  "AI_CONTRACT_VERSION",
  "AI_ALLOW_CLIENT_MODEL_OVERRIDE",
  "AI_DISABLE_NATIVE_RESPONSE_FORMAT",
  "AI_ANON_DAILY_LIMIT",
  "AI_FREE_DAILY_LIMIT",
  "AI_MEMBER_DAILY_LIMIT",
  "AI_REQUEST_WINDOW_MS",
]) {
  add(`env-example:${key}`, envExample.includes(`${key}=`));
}

const frontendSourceRoots = [
  "index.html",
  "index.css",
  "App.tsx",
  "components",
  "services",
  "lifeBook",
  "SmoothSailingToday",
  "revenueForecast",
  "valuationOriented",
];

const frontendTextFileExtensions = new Set([".css", ".html", ".js", ".jsx", ".ts", ".tsx"]);
const frontendTextFiles = frontendSourceRoots
  .flatMap(collectFiles)
  .filter((file) => frontendTextFileExtensions.has(path.extname(file)));

const directLegacyAiCallFiles = frontendSourceRoots
  .flatMap(collectFiles)
  .filter((file) => sourceFileExtensions.has(path.extname(file)))
  .filter((file) => file !== "services/geminiProxyClient.ts")
  .filter((file) => readFileSync(path.join(process.cwd(), file), "utf8").includes("/api/gemini/"));

add(
  "frontend:no-direct-legacy-gemini-api",
  directLegacyAiCallFiles.length === 0,
	  directLegacyAiCallFiles.length ? directLegacyAiCallFiles.join(", ") : "all frontend AI calls use secure proxy"
);

const forbiddenRuntimeCdns = [
  "cdn.tailwindcss.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "aistudiocdn.com",
  "esm.sh",
  "cdnjs.cloudflare.com",
  "cdn.jsdelivr.net",
  "transparenttextures.com",
  "grainy-gradients.vercel.app",
];

const externalRuntimeDependencyFiles = frontendTextFiles.filter((file) => {
  const source = readFileSync(path.join(process.cwd(), file), "utf8");
  return forbiddenRuntimeCdns.some((dependency) => source.includes(dependency));
});

add(
  "frontend:no-external-runtime-cdn",
  externalRuntimeDependencyFiles.length === 0,
  externalRuntimeDependencyFiles.length
    ? externalRuntimeDependencyFiles.join(", ")
    : "Tailwind, fonts, and frontend libraries are bundled locally"
);

const aiProvider = String(process.env.AI_PROVIDER || "gemini").toLowerCase();
const normalizedAiProvider = aiProvider === "openai_compatible" || aiProvider === "compatible"
  ? "openai-compatible"
  : aiProvider;
const supportedAiProviders = ["gemini", "openai", "openai-compatible", "anthropic"];
const hasAiProviderKey = (() => {
  if (normalizedAiProvider === "openai") return Boolean(process.env.OPENAI_API_KEY || process.env.AI_API_KEY);
  if (normalizedAiProvider === "openai-compatible") {
    return Boolean(process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.API_KEY);
  }
  if (normalizedAiProvider === "anthropic") return Boolean(process.env.ANTHROPIC_API_KEY || process.env.AI_API_KEY);
  return Boolean(process.env.GEMINI_API_KEY || process.env.AI_API_KEY || process.env.API_KEY);
})();

add(
  "ai-provider:supported",
  supportedAiProviders.includes(normalizedAiProvider),
  normalizedAiProvider
);

if (normalizedAiProvider === "openai-compatible" && !process.env.AI_API_BASE_URL) {
  warnings.push("AI_PROVIDER=openai-compatible should set AI_API_BASE_URL for the target vendor endpoint.");
}

if (mode === "production") {
  const paymentProvider = String(process.env.PAYMENTS_PROVIDER || "").toLowerCase();
  const requiredEnv = [
    "APP_ENV",
    "HOST",
    "DATABASE_URL",
    "CLIENT_ORIGINS",
    "TRUST_PROXY",
    "PAYMENTS_PROVIDER",
    "PAYMENTS_MODE",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
  ];
  for (const key of requiredEnv) {
    add(`production-env:${key}`, Boolean(process.env[key]), process.env[key] ? "set" : "missing");
  }

  if (!hasAiProviderKey) {
    warnings.push(`AI provider key is not set for AI_PROVIDER=${normalizedAiProvider}. AI endpoints will fail fast with 503.`);
  }

  add(
    "production-env:APP_ENV",
    ["staging", "production"].includes(String(process.env.APP_ENV || "").toLowerCase()),
    process.env.APP_ENV ? "set" : "missing"
  );

  if (paymentProvider === "xunhupay") {
    for (const key of [
      "PUBLIC_SITE_URL",
      "XUNHUPAY_APP_ID",
      "XUNHUPAY_SECRET",
      "XUNHUPAY_NOTIFY_URL",
      "XUNHUPAY_RETURN_URL",
      "XUNHUPAY_CALLBACK_URL",
    ]) {
      add(`production-env:${key}`, Boolean(process.env[key]), process.env[key] ? "set" : "missing");
    }
    for (const key of [
      "PUBLIC_SITE_URL",
      "XUNHUPAY_GATEWAY",
      "XUNHUPAY_GATEWAY_BACKUP",
      "XUNHUPAY_NOTIFY_URL",
      "XUNHUPAY_RETURN_URL",
      "XUNHUPAY_CALLBACK_URL",
    ]) {
      const value = process.env[key] || "";
      let https = false;
      try {
        https = new URL(value).protocol === "https:";
      } catch {
        https = false;
      }
      add(`production-env-https:${key}`, https, https ? "https" : "missing or not https");
    }
  } else {
    for (const key of [
      "APPLE_CLIENT_ID",
      "APPLE_BUNDLE_ID",
      "APPLE_IAP_PRODUCT_IDS",
      "APPLE_SHARED_SECRET",
    ]) {
      add(`production-env:${key}`, Boolean(process.env[key]), process.env[key] ? "set" : "missing");
    }
    if (process.env.APPLE_IAP_ENV === "production" && !process.env.APPLE_APP_APPLE_ID) {
      add("production-env:APPLE_APP_APPLE_ID", false, "required for production App Store notification verification");
    }
    if (!process.env.APPLE_ROOT_CERTIFICATE_PATHS && !process.env.APPLE_ROOT_CERTIFICATES_PEM) {
      add("production-env:APPLE_ROOT_CERTIFICATES", false, "root certificates are required for App Store notification verification");
    } else {
      add("production-env:APPLE_ROOT_CERTIFICATES", true, "set");
    }
  }

  for (const key of [
    "SMS_MODE",
    "SMS_CODE_HMAC_SECRET",
    "TENCENTCLOUD_SECRET_ID",
    "TENCENTCLOUD_SECRET_KEY",
    "TENCENTCLOUD_SMS_SDK_APP_ID",
    "TENCENTCLOUD_SMS_SIGN_NAME",
    "TENCENTCLOUD_SMS_TEMPLATE_ID",
    "TENCENTCLOUD_SMS_REGION",
  ]) {
    add(`production-env:${key}`, Boolean(process.env[key]), process.env[key] ? "set" : "missing");
  }
  add(
    "production-env:SMS_MODE",
    process.env.SMS_MODE === "tencent",
    process.env.SMS_MODE ? "set" : "missing"
  );
  if ((process.env.SMS_CODE_HMAC_SECRET || "").length < 32) {
    add("production-env-strength:SMS_CODE_HMAC_SECRET", false, "must be at least 32 characters");
  } else {
    add("production-env-strength:SMS_CODE_HMAC_SECRET", true, "strong");
  }

  const appleAuthConfigured = Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_BUNDLE_ID);
  const wechatAuthConfigured = Boolean(process.env.WECHAT_APP_ID && process.env.WECHAT_APP_SECRET);
  const phoneAuthConfigured = process.env.SMS_MODE === "tencent" &&
    Boolean(
      process.env.SMS_CODE_HMAC_SECRET &&
      process.env.TENCENTCLOUD_SECRET_ID &&
      process.env.TENCENTCLOUD_SECRET_KEY &&
      process.env.TENCENTCLOUD_SMS_SDK_APP_ID &&
      process.env.TENCENTCLOUD_SMS_SIGN_NAME &&
      process.env.TENCENTCLOUD_SMS_TEMPLATE_ID
    );
  add(
    "production-auth:external-provider",
    appleAuthConfigured || wechatAuthConfigured || phoneAuthConfigured,
    appleAuthConfigured ? "apple" : wechatAuthConfigured ? "wechat" : phoneAuthConfigured ? "phone_sms" : "missing"
  );

  if (process.env.PAYMENTS_MODE !== "live") {
    warnings.push("PAYMENTS_MODE is not live. Production payments will not be verified.");
  }

  if (process.env.ENABLE_LEGACY_COMPAT_API === "true") {
    add("production-env:ENABLE_LEGACY_COMPAT_API", false, "must be false for commercial production");
  } else {
    add("production-env:ENABLE_LEGACY_COMPAT_API", true, "disabled");
  }

  if (process.env.ENABLE_LEGACY_AI_PROXY === "true") {
    add("production-env:ENABLE_LEGACY_AI_PROXY", false, "must be false for commercial production");
  } else {
    add("production-env:ENABLE_LEGACY_AI_PROXY", true, "disabled");
  }

  if (process.env.VITE_ALLOW_LOCAL_PREMIUM_FALLBACK === "true") {
    add("production-env:VITE_ALLOW_LOCAL_PREMIUM_FALLBACK", false, "must be false for commercial production");
  } else {
    add("production-env:VITE_ALLOW_LOCAL_PREMIUM_FALLBACK", true, "disabled");
  }

  for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"]) {
    const value = process.env[key] || "";
    if (value && value.length < 32) {
      add(`production-env-strength:${key}`, false, "must be at least 32 characters");
    } else if (value) {
      add(`production-env-strength:${key}`, true, "strong");
    }
  }

  if (!process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGINS.includes("*")) {
    warnings.push("CLIENT_ORIGINS should be an exact production allowlist.");
  }
} else {
  if (!hasAiProviderKey) {
    warnings.push(`AI provider key is not set for AI_PROVIDER=${normalizedAiProvider}. AI endpoints will fail fast with 503.`);
  }
}

const failed = checks.filter((check) => !check.ok);
const result = {
  ok: failed.length === 0,
  mode,
  checks,
  warnings,
};

console.log(JSON.stringify(result, null, 2));

if (failed.length) {
  process.exitCode = 1;
}
