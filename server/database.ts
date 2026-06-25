import { mkdirSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

export interface AuthIdentityInput {
  provider: "wechat" | "apple" | "google" | "phone" | "email" | "guest";
  providerSubject: string;
  displayName?: string;
  email?: string;
  phone?: string;
}

export interface SessionContext {
  userId: string;
  sessionId: string;
}

export interface UserBundle {
  user: Record<string, unknown>;
  profile: Record<string, unknown> | null;
  membership: Record<string, unknown> | null;
  settings: Record<string, unknown>;
}

const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 30);

const nowIso = () => new Date().toISOString();

const jsonString = (value: JsonValue | undefined) => JSON.stringify(value ?? null);

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const rowToObject = (row: Record<string, unknown> | undefined) => row ?? null;

export const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const createDatabase = () => {
  const sqlitePath =
    process.env.SQLITE_PATH ||
    path.join(process.cwd(), "data", "life-kline.sqlite");

  mkdirSync(path.dirname(sqlitePath), { recursive: true });
  const db = new DatabaseSync(sqlitePath);

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT,
      email TEXT,
      phone TEXT,
      avatar_url TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS auth_identities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_subject TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(provider, provider_subject)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      user_agent TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      profile_json TEXT NOT NULL,
      bazi_json TEXT,
      name TEXT,
      gender TEXT,
      birth_date TEXT,
      birth_time TEXT,
      birth_place TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memberships (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan TEXT NOT NULL,
      status TEXT NOT NULL,
      source TEXT NOT NULL,
      entitlements_json TEXT NOT NULL,
      started_at TEXT NOT NULL,
      expires_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_order_id TEXT,
      status TEXT NOT NULL,
      raw_payload_json TEXT,
      created_at TEXT NOT NULL,
      paid_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      settings_json TEXT NOT NULL,
      bindings_json TEXT NOT NULL,
      share_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_request_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      route TEXT NOT NULL,
      model TEXT,
      prompt_hash TEXT,
      status_code INTEGER,
      latency_ms INTEGER NOT NULL,
      error_message TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_response_cache (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      cache_key TEXT NOT NULL,
      route TEXT NOT NULL,
      response_json TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, cache_key)
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL,
      metadata_json TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_ai_request_logs_user_created ON ai_request_logs(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at);
  `);

  const audit = (
    userId: string | null,
    eventType: string,
    metadata?: JsonValue,
    ipAddress?: string,
    userAgent?: string
  ) => {
    db.prepare(`
      INSERT INTO audit_events (id, user_id, event_type, metadata_json, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      userId,
      eventType,
      metadata ? jsonString(metadata) : null,
      ipAddress ?? null,
      userAgent ?? null,
      nowIso()
    );
  };

  const ensureSettings = (userId: string) => {
    const existing = db.prepare("SELECT user_id FROM user_settings WHERE user_id = ?").get(userId);
    if (existing) return;
    const ts = nowIso();
    db.prepare(`
      INSERT INTO user_settings (user_id, settings_json, bindings_json, share_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      jsonString({ notifications: true, language: "中文 / EN" }),
      jsonString({ phone: "138****8888", wechat: false }),
      0,
      ts,
      ts
    );
  };

  const createSession = (
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) => {
    const sessionId = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString("base64url");
    const createdAt = nowIso();
    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO sessions (id, user_id, token_hash, user_agent, ip_address, created_at, last_seen_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sessionId,
      userId,
      hashToken(token),
      userAgent ?? null,
      ipAddress ?? null,
      createdAt,
      createdAt,
      expiresAt
    );

    return { token, sessionId, expiresAt };
  };

  const createOrLogin = (
    identity: AuthIdentityInput,
    ipAddress?: string,
    userAgent?: string
  ) => {
    const ts = nowIso();
    const existing = db.prepare(`
      SELECT users.*
      FROM auth_identities
      JOIN users ON users.id = auth_identities.user_id
      WHERE auth_identities.provider = ? AND auth_identities.provider_subject = ? AND users.deleted_at IS NULL
    `).get(identity.provider, identity.providerSubject);

    let userId = typeof existing?.id === "string" ? existing.id : "";
    if (!userId) {
      userId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO users (id, display_name, email, phone, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        identity.displayName || "天命用户",
        identity.email ?? null,
        identity.phone ?? null,
        ts,
        ts
      );
      db.prepare(`
        INSERT INTO auth_identities (id, user_id, provider, provider_subject, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), userId, identity.provider, identity.providerSubject, ts, ts);
      audit(userId, "auth.user_created", { provider: identity.provider }, ipAddress, userAgent);
    } else {
      db.prepare(`
        UPDATE users SET display_name = COALESCE(?, display_name), email = COALESCE(?, email),
          phone = COALESCE(?, phone), updated_at = ? WHERE id = ?
      `).run(identity.displayName ?? null, identity.email ?? null, identity.phone ?? null, ts, userId);
      db.prepare(`
        UPDATE auth_identities SET updated_at = ? WHERE provider = ? AND provider_subject = ?
      `).run(ts, identity.provider, identity.providerSubject);
    }

    ensureSettings(userId);
    const session = createSession(userId, ipAddress, userAgent);
    audit(userId, "auth.login", { provider: identity.provider }, ipAddress, userAgent);

    return {
      session,
      bundle: getUserBundle(userId),
    };
  };

  const findSession = (token: string): SessionContext | null => {
    const tokenHash = hashToken(token);
    const row = db.prepare(`
      SELECT id, user_id, expires_at, revoked_at
      FROM sessions
      WHERE token_hash = ?
    `).get(tokenHash);

    if (!row || typeof row.user_id !== "string" || typeof row.id !== "string") return null;
    if (row.revoked_at || Date.parse(String(row.expires_at)) <= Date.now()) return null;

    db.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?").run(nowIso(), row.id);
    return { userId: row.user_id, sessionId: row.id };
  };

  function getUserBundle(userId: string): UserBundle {
    ensureSettings(userId);
    const user = rowToObject(db.prepare(`
      SELECT id, display_name, email, phone, avatar_url, status, created_at, updated_at
      FROM users WHERE id = ? AND deleted_at IS NULL
    `).get(userId));

    const profileRow = db.prepare(`
      SELECT profile_json, bazi_json, name, gender, birth_date, birth_time, birth_place, updated_at
      FROM user_profiles WHERE user_id = ?
    `).get(userId);

    const membershipRow = db.prepare(`
      SELECT id, plan, status, source, entitlements_json, started_at, expires_at, updated_at
      FROM memberships
      WHERE user_id = ? AND status = 'active'
      ORDER BY started_at DESC
      LIMIT 1
    `).get(userId);

    const settingsRow = db.prepare(`
      SELECT settings_json, bindings_json, share_count FROM user_settings WHERE user_id = ?
    `).get(userId);

    const profileJson = parseJson<Record<string, unknown> | null>(profileRow?.profile_json, null);
    const membership = membershipRow
      ? {
          ...membershipRow,
          entitlements: parseJson<Record<string, unknown>>(membershipRow.entitlements_json, {}),
        }
      : null;

    return {
      user: user ?? { id: userId, status: "missing" },
      profile: profileJson,
      membership,
      settings: {
        settings: parseJson<Record<string, unknown>>(settingsRow?.settings_json, {}),
        bindings: parseJson<Record<string, unknown>>(settingsRow?.bindings_json, {}),
        shareCount: Number(settingsRow?.share_count ?? 0),
      },
    };
  }

  const saveProfile = (
    userId: string,
    profile: Record<string, unknown>,
    bazi?: Record<string, unknown>
  ) => {
    const ts = nowIso();
    const existing = db.prepare("SELECT id FROM user_profiles WHERE user_id = ?").get(userId);
    if (existing) {
      db.prepare(`
        UPDATE user_profiles
        SET profile_json = ?, bazi_json = COALESCE(?, bazi_json), name = ?, gender = ?, birth_date = ?,
          birth_time = ?, birth_place = ?, updated_at = ?
        WHERE user_id = ?
      `).run(
        jsonString(profile),
        bazi ? jsonString(bazi) : null,
        String(profile.name ?? ""),
        String(profile.gender ?? ""),
        String(profile.birthDate ?? ""),
        String(profile.birthTime ?? ""),
        String(profile.birthPlace ?? ""),
        ts,
        userId
      );
    } else {
      db.prepare(`
        INSERT INTO user_profiles (
          id, user_id, profile_json, bazi_json, name, gender, birth_date, birth_time, birth_place, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        userId,
        jsonString(profile),
        bazi ? jsonString(bazi) : null,
        String(profile.name ?? ""),
        String(profile.gender ?? ""),
        String(profile.birthDate ?? ""),
        String(profile.birthTime ?? ""),
        String(profile.birthPlace ?? ""),
        ts,
        ts
      );
    }
    audit(userId, "profile.upserted", { hasBazi: Boolean(bazi) });
    return getUserBundle(userId);
  };

  const createOrder = (
    userId: string,
    plan: string,
    provider: string,
    amountCents: number,
    rawPayload?: JsonValue
  ) => {
    const ts = nowIso();
    const orderId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO orders (
        id, user_id, plan, amount_cents, currency, provider, status, raw_payload_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderId,
      userId,
      plan,
      amountCents,
      "CNY",
      provider,
      "pending",
      rawPayload ? jsonString(rawPayload) : null,
      ts,
      ts
    );
    audit(userId, "billing.order_created", { orderId, plan, provider, amountCents });
    return { orderId, status: "pending" };
  };

  const markOrderPaid = (userId: string, orderId: string, providerOrderId?: string) => {
    const ts = nowIso();
    const order = db.prepare(`
      SELECT * FROM orders WHERE id = ? AND user_id = ?
    `).get(orderId, userId);
    if (!order) throw new Error("Order not found");

    db.prepare(`
      UPDATE orders SET status = 'paid', provider_order_id = COALESCE(?, provider_order_id),
        paid_at = ?, updated_at = ? WHERE id = ?
    `).run(providerOrderId ?? null, ts, ts, orderId);

    const existing = db.prepare(`
      SELECT id FROM memberships WHERE user_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 1
    `).get(userId);

    const entitlements = {
      baziReport: true,
      lifeBook: true,
      smoothSailing: true,
      aiAdvisor: true,
      valuation: true,
      revenueForecast: true,
    };

    if (existing?.id) {
      db.prepare(`
        UPDATE memberships SET plan = ?, source = ?, entitlements_json = ?, updated_at = ? WHERE id = ?
      `).run(String(order.plan), String(order.provider), jsonString(entitlements), ts, existing.id);
    } else {
      db.prepare(`
        INSERT INTO memberships (
          id, user_id, plan, status, source, entitlements_json, started_at, expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, 'active', ?, ?, ?, NULL, ?, ?)
      `).run(
        crypto.randomUUID(),
        userId,
        String(order.plan),
        String(order.provider),
        jsonString(entitlements),
        ts,
        ts,
        ts
      );
    }

    audit(userId, "billing.order_paid", { orderId });
    return getUserBundle(userId);
  };

  const saveSettings = (userId: string, settings: Record<string, unknown>) => {
    ensureSettings(userId);
    db.prepare("UPDATE user_settings SET settings_json = ?, updated_at = ? WHERE user_id = ?")
      .run(jsonString(settings), nowIso(), userId);
    audit(userId, "settings.updated");
    return getUserBundle(userId);
  };

  const saveBindings = (userId: string, bindings: Record<string, unknown>) => {
    ensureSettings(userId);
    db.prepare("UPDATE user_settings SET bindings_json = ?, updated_at = ? WHERE user_id = ?")
      .run(jsonString(bindings), nowIso(), userId);
    audit(userId, "settings.bindings_updated");
    return getUserBundle(userId);
  };

  const saveShareCount = (userId: string, shareCount: number) => {
    ensureSettings(userId);
    db.prepare("UPDATE user_settings SET share_count = ?, updated_at = ? WHERE user_id = ?")
      .run(Math.max(0, Math.floor(shareCount)), nowIso(), userId);
    audit(userId, "growth.share_count_updated", { shareCount });
    return getUserBundle(userId);
  };

  const revokeSession = (sessionId: string) => {
    db.prepare("UPDATE sessions SET revoked_at = ? WHERE id = ?").run(nowIso(), sessionId);
  };

  const deleteAccount = (userId: string) => {
    const ts = nowIso();
    db.prepare("UPDATE users SET status = 'deleted', deleted_at = ?, updated_at = ? WHERE id = ?")
      .run(ts, ts, userId);
    db.prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ?").run(ts, userId);
    audit(userId, "account.deleted");
  };

  const logAiRequest = (entry: {
    userId?: string | null;
    route: string;
    model?: string;
    promptHash?: string;
    statusCode?: number;
    latencyMs: number;
    errorMessage?: string;
  }) => {
    db.prepare(`
      INSERT INTO ai_request_logs (
        id, user_id, route, model, prompt_hash, status_code, latency_ms, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      entry.userId ?? null,
      entry.route,
      entry.model ?? null,
      entry.promptHash ?? null,
      entry.statusCode ?? null,
      entry.latencyMs,
      entry.errorMessage ?? null,
      nowIso()
    );
  };

  const countAiRequests = (userId: string, sinceIso: string) => {
    const row = db.prepare(`
      SELECT COUNT(*) AS count
      FROM ai_request_logs
      WHERE user_id = ? AND created_at >= ? AND status_code BETWEEN 200 AND 299
    `).get(userId, sinceIso);
    return Number(row?.count ?? 0);
  };

  const hasActiveMembership = (userId: string) => {
    const row = db.prepare(`
      SELECT id FROM memberships
      WHERE user_id = ? AND status = 'active'
      ORDER BY started_at DESC LIMIT 1
    `).get(userId);
    return Boolean(row?.id);
  };

  return {
    sqlitePath,
    db,
    createOrLogin,
    findSession,
    getUserBundle,
    saveProfile,
    createOrder,
    markOrderPaid,
    saveSettings,
    saveBindings,
    saveShareCount,
    revokeSession,
    deleteAccount,
    logAiRequest,
    countAiRequests,
    hasActiveMembership,
  };
};

export type AppDatabase = ReturnType<typeof createDatabase>;
