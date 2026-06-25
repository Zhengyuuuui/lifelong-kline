export class ValidationError extends Error {
  statusCode = 422;
  details: Record<string, string>;

  constructor(details: Record<string, string>) {
    super("Validation failed");
    this.details = details;
  }
}

const MAX_TEXT = 120;
const MAX_PLACE = 160;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const asString = (value: unknown, max = MAX_TEXT) =>
  String(value ?? "")
    .trim()
    .slice(0, max);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const assertUuid = (value: string, field: string) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ValidationError({ [field]: "Invalid id format" });
  }
};

export const validateAuthPayload = (body: unknown) => {
  if (!isObject(body)) throw new ValidationError({ body: "Expected JSON object" });

  const provider = asString(body.provider || "guest", 20);
  if (!["wechat", "apple", "google", "phone", "email", "guest"].includes(provider)) {
    throw new ValidationError({ provider: "Unsupported provider" });
  }

  const clientInstallationId = asString(body.clientInstallationId, 80);
  const providerSubject = asString(body.providerSubject, 160);

  if (!clientInstallationId && !providerSubject) {
    throw new ValidationError({ clientInstallationId: "Required for passwordless auth" });
  }

  const displayName = asString(body.displayName || "天命用户", 80);
  const email = body.email ? asString(body.email, 255) : undefined;
  const phone = body.phone ? asString(body.phone, 32) : undefined;

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError({ email: "Invalid email" });
  }

  if (phone && !/^[+\d\s-]{6,32}$/.test(phone)) {
    throw new ValidationError({ phone: "Invalid phone" });
  }

  return { provider, clientInstallationId, providerSubject, displayName, email, phone };
};

export const validateProfilePayload = (body: unknown) => {
  if (!isObject(body) || !isObject(body.profile)) {
    throw new ValidationError({ profile: "Expected profile object" });
  }

  const profile = {
    name: asString(body.profile.name, 80),
    gender: asString(body.profile.gender, 12) as "male" | "female",
    birthDate: asString(body.profile.birthDate, 10),
    birthTime: asString(body.profile.birthTime, 5),
    birthPlace: asString(body.profile.birthPlace, MAX_PLACE),
  };

  const details: Record<string, string> = {};
  if (!profile.name) details.name = "Required";
  if (!["male", "female"].includes(profile.gender)) details.gender = "Expected male or female";
  if (!DATE_RE.test(profile.birthDate) || Number.isNaN(Date.parse(profile.birthDate))) {
    details.birthDate = "Expected YYYY-MM-DD";
  }
  if (!TIME_RE.test(profile.birthTime)) details.birthTime = "Expected HH:mm";
  if (!profile.birthPlace) details.birthPlace = "Required";

  if (Object.keys(details).length) throw new ValidationError(details);

  const bazi = isObject(body.bazi) ? body.bazi : undefined;
  return { profile, bazi };
};

export const validateCheckoutPayload = (body: unknown) => {
  if (!isObject(body)) throw new ValidationError({ body: "Expected JSON object" });

  const plan = asString(body.plan || "lifetime", 20);
  const provider = asString(body.provider || "apple", 20);
  const amountCents = Number(body.amountCents || 1880);

  const details: Record<string, string> = {};
  if (!["monthly", "lifetime"].includes(plan)) details.plan = "Unsupported plan";
  if (!["wechat", "alipay", "apple"].includes(provider)) details.provider = "Unsupported provider";
  if (!Number.isInteger(amountCents) || amountCents < 100 || amountCents > 999900) {
    details.amountCents = "Invalid amount";
  }
  if (Object.keys(details).length) throw new ValidationError(details);

  return { plan, provider, amountCents };
};

export const validateConfirmPayload = (body: unknown) => {
  if (!isObject(body)) throw new ValidationError({ body: "Expected JSON object" });

  const orderId = asString(body.orderId, 64);
  assertUuid(orderId, "orderId");

  return {
    orderId,
    providerOrderId: body.providerOrderId ? asString(body.providerOrderId, 160) : undefined,
    receipt: body.receipt ? asString(body.receipt, 4096) : undefined,
  };
};

export const validateSettingsPayload = (body: unknown) => {
  if (!isObject(body) || !isObject(body.settings)) {
    throw new ValidationError({ settings: "Expected settings object" });
  }

  return {
    notifications: Boolean(body.settings.notifications),
    language: asString(body.settings.language || "中文 / EN", 40),
  };
};

export const validateBindingsPayload = (body: unknown) => {
  if (!isObject(body) || !isObject(body.bindings)) {
    throw new ValidationError({ bindings: "Expected bindings object" });
  }

  return {
    phone: body.bindings.phone ? asString(body.bindings.phone, 32) : null,
    wechat: Boolean(body.bindings.wechat),
  };
};

export const validateShareCountPayload = (body: unknown) => {
  if (!isObject(body)) throw new ValidationError({ body: "Expected JSON object" });
  const shareCount = Number(body.shareCount || 0);
  if (!Number.isFinite(shareCount) || shareCount < 0 || shareCount > 1000) {
    throw new ValidationError({ shareCount: "Invalid share count" });
  }
  return Math.floor(shareCount);
};
