import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { createRemoteJWKSet, jwtVerify, SignJWT, type JWTPayload } from "jose";
import { getBackendConfig } from "./env";
import { query, withTransaction } from "./db";
import { HttpError } from "./errors";
import {
  sha256Base64Url,
  type AppleLoginPayload,
  type WeChatLoginPayload,
} from "./validation";

export type AuthProvider = "apple" | "wechat" | "phone" | "email" | "guest";

export type IdentityVerificationSource =
  | "apple_identity_token"
  | "wechat_oauth"
  | "sms_verification"
  | "email_verification"
  | "development_passwordless"
  | "local_test";

export interface VerifiedIdentityInput {
  provider: AuthProvider;
  providerSubject: string;
  verifiedAt: string;
  verificationSource: IdentityVerificationSource;
  openid?: string;
  unionid?: string;
  appleSub?: string;
  email?: string;
  phone?: string;
  rawClaims?: Record<string, unknown>;
}

export interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface UserRow {
  id: string;
  auth_provider: AuthProvider;
  openid: string | null;
  unionid: string | null;
  apple_sub: string | null;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

interface ProfileRow {
  name: string;
  gender: string;
  birth_date: string;
  birth_time: string | null;
  birth_place: string | null;
  derived_ai_foundation: Record<string, unknown>;
  updated_at: string;
}

interface MembershipRow {
  id: string;
  product_id: string;
  status: string;
  entitlements: Record<string, unknown>;
  started_at: string;
  expires_at: string | null;
}

interface TokenPairOptions extends RequestMeta {
  familyId?: string;
  replacedTokenId?: string;
}

interface IdentityRow {
  id: string;
  user_id: string;
  provider: AuthProvider;
  provider_subject: string;
  email: string | null;
  status: "active" | "revoked";
  is_primary: boolean;
  verified_at: string | null;
  last_used_at: string | null;
  bound_at: string;
  revoked_at: string | null;
}

interface VerifiedRefreshPayload extends JWTPayload {
  typ?: string;
  jti?: string;
  sub?: string;
}

const encoder = new TextEncoder();
let appleJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

const getSecret = (secret: string) => encoder.encode(secret);

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const normalizeIp = (value?: string | null) => {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
};

const maskIdentity = (provider: AuthProvider, subject: string, email?: string | null) => {
  if (provider === "email") {
    const [local, domain] = String(email || subject).split("@");
    if (local && domain) return `${local.slice(0, 1)}***@${domain}`;
  }
  if (provider === "phone") {
    const digits = subject.replace(/\D/g, "");
    return digits.length >= 4 ? `***${digits.slice(-4)}` : "***";
  }
  if (subject.length <= 8) return `${subject.slice(0, 2)}***`;
  return `${subject.slice(0, 4)}...${subject.slice(-4)}`;
};

const validateVerifiedIdentity = (input: VerifiedIdentityInput) => {
  const trimmedSubject = input.providerSubject.trim();
  const providerSubject = input.provider === "email" ? trimmedSubject.toLowerCase() : trimmedSubject;
  if (!providerSubject || providerSubject.length > 512) {
    throw new HttpError(422, "Verified identity subject is invalid");
  }

  const verifiedAtMs = Date.parse(input.verifiedAt);
  if (!Number.isFinite(verifiedAtMs) || verifiedAtMs > Date.now() + 5 * 60_000) {
    throw new HttpError(422, "Verified identity timestamp is invalid");
  }

  const expectedProvider: Partial<Record<IdentityVerificationSource, AuthProvider>> = {
    apple_identity_token: "apple",
    wechat_oauth: "wechat",
    sms_verification: "phone",
    email_verification: "email",
  };
  if (expectedProvider[input.verificationSource] && expectedProvider[input.verificationSource] !== input.provider) {
    throw new HttpError(422, "Identity verification source does not match provider");
  }
  if (
    process.env.NODE_ENV === "production" &&
    ["development_passwordless", "local_test"].includes(input.verificationSource)
  ) {
    throw new HttpError(403, "Development identity verification is disabled in production");
  }

  return { ...input, providerSubject };
};

const sanitizeIdentityClaims = (claims: Record<string, unknown> = {}) =>
  Object.fromEntries(
    Object.entries(claims).filter(([key]) => ![
      "access_token",
      "refresh_token",
      "identity_token",
      "id_token",
      "client_secret",
    ].includes(key.toLowerCase()))
  );

const getAppleJwks = () => {
  if (!appleJwks) {
    appleJwks = createRemoteJWKSet(new URL(getBackendConfig().appleJwksUrl));
  }
  return appleJwks;
};

const runQuery = async <T extends QueryResultRow>(
  client: PoolClient | undefined,
  text: string,
  values: unknown[] = []
) => {
  return client ? client.query<T>(text, values) : query<T>(text, values);
};

const mapUser = (row: UserRow) => ({
  id: row.id,
  authProvider: row.auth_provider,
  displayName: row.display_name,
  email: row.email,
  phone: row.phone,
  avatarUrl: row.avatar_url,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapProfile = (row?: ProfileRow) => {
  if (!row) return null;
  return {
    name: row.name,
    gender: row.gender,
    birthDate: row.birth_date,
    birthTime: row.birth_time,
    birthPlace: row.birth_place,
    derivedAiFoundation: row.derived_ai_foundation || {},
    updatedAt: row.updated_at,
  };
};

const mapMembership = (row?: MembershipRow) => {
  if (!row) return null;
  return {
    id: row.id,
    productId: row.product_id,
    status: row.status,
    entitlements: row.entitlements || {},
    startedAt: row.started_at,
    expiresAt: row.expires_at,
  };
};

const getProfileForUser = async (userId: string, client?: PoolClient) => {
  const result = await runQuery<ProfileRow>(
    client,
    `
      SELECT
        name,
        gender,
        birth_date::text,
        to_char(birth_time, 'HH24:MI') AS birth_time,
        birth_place,
        derived_ai_foundation,
        updated_at::text
      FROM user_profiles
      WHERE user_id = $1
    `,
    [userId]
  );
  return result.rows[0];
};

const getMembershipForUser = async (userId: string, client?: PoolClient) => {
  const result = await runQuery<MembershipRow>(
    client,
    `
      SELECT
        id,
        product_id,
        status,
        entitlements,
        started_at::text,
        expires_at::text
      FROM memberships
      WHERE user_id = $1
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > now())
      ORDER BY started_at DESC
      LIMIT 1
    `,
    [userId]
  );
  return result.rows[0];
};

export class AuthService {
  async signInWithPasswordless(
    payload: {
      provider: AuthProvider;
      providerSubject: string;
      displayName?: string;
      email?: string;
      phone?: string;
    },
    meta: RequestMeta
  ) {
    return this.createOrUpdateExternalUser({
      provider: payload.provider,
      providerSubject: payload.providerSubject,
      verifiedAt: new Date().toISOString(),
      verificationSource: "development_passwordless",
      appleSub: payload.provider === "apple" ? payload.providerSubject : undefined,
      openid: payload.provider === "wechat" ? payload.providerSubject : undefined,
      displayName: payload.displayName,
      email: payload.email,
      phone: payload.phone,
      rawClaims: {
        authMode: "development_passwordless",
        phone: payload.phone || null,
      },
      meta,
    });
  }

  async signInWithApple(payload: AppleLoginPayload, meta: RequestMeta) {
    const config = getBackendConfig();
    const audience = Array.from(new Set([config.appleClientId, config.appleBundleId].filter(Boolean)));
    const verified = await jwtVerify(payload.identityToken, getAppleJwks(), {
      issuer: config.appleIssuer,
      audience,
    }).catch((error) => {
      throw new HttpError(401, "Invalid Apple identity token", {
        reason: error instanceof Error ? error.message : "verification_failed",
      });
    });

    const claims = verified.payload;
    const appleSub = String(claims.sub || "");
    if (!appleSub) throw new HttpError(401, "Apple identity token is missing subject");

    if (payload.nonce || payload.nonceSha256) {
      const tokenNonce = typeof claims.nonce === "string" ? claims.nonce : "";
      const accepted = new Set(
        [
          payload.nonce,
          payload.nonce ? sha256Base64Url(payload.nonce) : undefined,
          payload.nonceSha256,
        ].filter(Boolean)
      );
      if (!tokenNonce || !accepted.has(tokenNonce)) {
        throw new HttpError(401, "Apple nonce verification failed");
      }
    }

    const email = payload.email || (typeof claims.email === "string" ? claims.email : undefined);
    const displayName = payload.fullName || email || "Apple User";
    return this.createOrUpdateExternalUser({
      provider: "apple",
      providerSubject: appleSub,
      verifiedAt: new Date().toISOString(),
      verificationSource: "apple_identity_token",
      appleSub,
      displayName,
      email,
      rawClaims: claims,
      meta,
    });
  }

  async signInWithWeChat(payload: WeChatLoginPayload, meta: RequestMeta) {
    const config = getBackendConfig();
    if (!config.wechatAppId || !config.wechatAppSecret) {
      throw new HttpError(503, "WeChat OAuth is not configured on the server");
    }

    const params = new URLSearchParams({
      appid: config.wechatAppId,
      secret: config.wechatAppSecret,
      code: payload.code,
      grant_type: "authorization_code",
    });
    const response = await fetch(`${config.wechatOauthBaseUrl}/sns/oauth2/access_token?${params}`);
    const data = await response.json().catch(() => ({})) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      openid?: string;
      scope?: string;
      unionid?: string;
      errcode?: number;
      errmsg?: string;
    };

    if (!response.ok || data.errcode || !data.openid) {
      throw new HttpError(401, "WeChat authorization failed", {
        code: data.errcode || response.status,
        message: data.errmsg || response.statusText,
      });
    }

    return this.createOrUpdateExternalUser({
      provider: "wechat",
      providerSubject: data.openid,
      verifiedAt: new Date().toISOString(),
      verificationSource: "wechat_oauth",
      openid: data.openid,
      unionid: data.unionid,
      displayName: "微信用户",
      rawClaims: data,
      meta,
    });
  }

  async refresh(refreshToken: string, meta: RequestMeta) {
    const config = getBackendConfig();
    const verified = await jwtVerify(refreshToken, getSecret(config.jwtRefreshSecret), {
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
    }).catch(() => {
      throw new HttpError(401, "Invalid refresh token");
    });
    const payload = verified.payload as VerifiedRefreshPayload;
    if (payload.typ !== "refresh" || !payload.sub || !payload.jti) {
      throw new HttpError(401, "Invalid refresh token payload");
    }

    return withTransaction(async (client) => {
      const tokenResult = await client.query<{
        id: string;
        user_id: string;
        family_id: string;
        revoked_at: string | null;
        expires_at: string;
      }>(
        `
          SELECT id, user_id, family_id, revoked_at::text, expires_at::text
          FROM refresh_tokens
          WHERE token_hash = $1
          FOR UPDATE
        `,
        [hashToken(refreshToken)]
      );
      const tokenRow = tokenResult.rows[0];
      if (
        !tokenRow ||
        tokenRow.user_id !== payload.sub ||
        tokenRow.revoked_at ||
        Date.parse(tokenRow.expires_at) <= Date.now()
      ) {
        throw new HttpError(401, "Refresh token has expired or was revoked");
      }

      await client.query("UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1", [tokenRow.id]);
      const user = await this.getActiveUser(payload.sub, client);
      const tokens = await this.issueTokenPair(user.id, client, {
        ...meta,
        familyId: tokenRow.family_id,
        replacedTokenId: tokenRow.id,
      });
      await client.query(
        "UPDATE refresh_tokens SET replaced_by_token_id = $1 WHERE id = $2",
        [tokens.refreshTokenId, tokenRow.id]
      );
      return this.buildAuthResponse(user, tokens, client);
    });
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await query("UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND user_id = $2", [
        hashToken(refreshToken),
        userId,
      ]);
      return;
    }
    await query("UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL", [userId]);
  }

  async verifyAccessToken(accessToken: string) {
    const config = getBackendConfig();
    const verified = await jwtVerify(accessToken, getSecret(config.jwtAccessSecret), {
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
    }).catch(() => {
      throw new HttpError(401, "Invalid access token");
    });
    if (verified.payload.typ !== "access" || !verified.payload.sub) {
      throw new HttpError(401, "Invalid access token payload");
    }
    const userId = String(verified.payload.sub);
    await this.getActiveUser(userId);
    return { userId, jti: String(verified.payload.jti || "") };
  }

  async createSessionForUser(userId: string, meta: RequestMeta, client?: PoolClient) {
    const create = async (transactionClient: PoolClient) => {
      const user = await this.getActiveUser(userId, transactionClient);
      const tokens = await this.issueTokenPair(user.id, transactionClient, meta);
      return this.buildAuthResponse(user, tokens, transactionClient);
    };
    return client ? create(client) : withTransaction(create);
  }

  async listIdentities(userId: string, client?: PoolClient) {
    await this.getActiveUser(userId, client);
    const result = await runQuery<IdentityRow>(
      client,
      `
        SELECT
          id,
          user_id,
          provider,
          provider_subject,
          email,
          status,
          is_primary,
          verified_at::text,
          last_used_at::text,
          bound_at::text,
          revoked_at::text
        FROM user_auth_identities
        WHERE user_id = $1 AND status = 'active' AND revoked_at IS NULL
        ORDER BY is_primary DESC, bound_at, id
      `,
      [userId]
    );
    return result.rows.map((identity) => ({
      id: identity.id,
      provider: identity.provider,
      maskedIdentifier: maskIdentity(
        identity.provider,
        identity.provider_subject,
        identity.email
      ),
      status: identity.status,
      isPrimary: identity.is_primary,
      verifiedAt: identity.verified_at,
      lastUsedAt: identity.last_used_at,
      boundAt: identity.bound_at,
    }));
  }

  async bindVerifiedIdentity(
    userId: string,
    input: VerifiedIdentityInput,
    meta: RequestMeta = {},
    client?: PoolClient
  ) {
    const verifiedIdentity = validateVerifiedIdentity(input);
    return client
      ? this.bindVerifiedIdentityWithClient(client, userId, verifiedIdentity, meta)
      : withTransaction((transactionClient) =>
          this.bindVerifiedIdentityWithClient(transactionClient, userId, verifiedIdentity, meta)
        );
  }

  async unbindIdentity(userId: string, identityId: string, meta: RequestMeta = {}) {
    return withTransaction(async (client) => {
      await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [userId]);
      const identities = await client.query<IdentityRow>(
        `
          SELECT
            id,
            user_id,
            provider,
            provider_subject,
            email,
            status,
            is_primary,
            verified_at::text,
            last_used_at::text,
            bound_at::text,
            revoked_at::text
          FROM user_auth_identities
          WHERE user_id = $1 AND status = 'active' AND revoked_at IS NULL
          ORDER BY is_primary DESC, bound_at, id
          FOR UPDATE
        `,
        [userId]
      );
      const target = identities.rows.find((identity) => identity.id === identityId);
      if (!target) throw new HttpError(404, "Identity not found");
      if (identities.rows.length <= 1) {
        throw new HttpError(409, "At least one login identity must remain bound");
      }

      await client.query(
        `
          UPDATE user_auth_identities
          SET status = 'revoked', revoked_at = now(), is_primary = false
          WHERE id = $1 AND user_id = $2
        `,
        [identityId, userId]
      );
      if (target.is_primary) {
        const replacement = identities.rows.find((identity) => identity.id !== identityId)!;
        await client.query(
          "UPDATE user_auth_identities SET is_primary = true WHERE id = $1",
          [replacement.id]
        );
      }
      await this.writeIdentityAudit(client, userId, "auth.identity_unbound", {
        identityId,
        provider: target.provider,
      }, meta);
      return { ok: true, identityId, status: "revoked" as const };
    });
  }

  private async createOrUpdateExternalUser(input: {
    provider: AuthProvider;
    providerSubject: string;
    verifiedAt: string;
    verificationSource: IdentityVerificationSource;
    appleSub?: string;
    openid?: string;
    unionid?: string;
    displayName?: string;
    email?: string;
    phone?: string;
    rawClaims: Record<string, unknown>;
    meta: RequestMeta;
  }) {
    const verifiedIdentity = validateVerifiedIdentity({
      provider: input.provider,
      providerSubject: input.providerSubject,
      verifiedAt: input.verifiedAt,
      verificationSource: input.verificationSource,
      appleSub: input.appleSub,
      openid: input.openid,
      unionid: input.unionid,
      email: input.email,
      phone: input.phone,
      rawClaims: input.rawClaims,
    });

    return withTransaction(async (client) => {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [`${verifiedIdentity.provider}:${verifiedIdentity.providerSubject}`]
      );
      const existingResult = await client.query<UserRow & {
        identity_status: string;
        identity_revoked_at: string | null;
      }>(
        `
          SELECT
            u.*,
            i.status AS identity_status,
            i.revoked_at::text AS identity_revoked_at
          FROM user_auth_identities i
          JOIN users u ON u.id = i.user_id
          WHERE i.provider = $1 AND i.provider_subject = $2
          LIMIT 1
          FOR UPDATE OF i, u
        `,
        [verifiedIdentity.provider, verifiedIdentity.providerSubject]
      );

      const identityUser = existingResult.rows[0];
      if (
        identityUser &&
        (
          identityUser.identity_status !== "active" ||
          identityUser.identity_revoked_at ||
          identityUser.deleted_at ||
          identityUser.status !== "active"
        )
      ) {
        throw new HttpError(403, "Identity is not available for login");
      }
      let user: UserRow | undefined = identityUser;

      if (!user) {
        try {
          const created = await client.query<UserRow>(
            `
              INSERT INTO users (
                auth_provider, openid, unionid, apple_sub, display_name, email, phone, last_login_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, now())
              RETURNING *
            `,
            [
              input.provider,
              input.openid || null,
              input.unionid || null,
              input.appleSub || null,
              input.displayName || null,
              input.email || null,
              input.phone || null,
            ]
          );
          user = created.rows[0];
        } catch (error) {
          if ((error as { code?: string }).code === "23505") {
            throw new HttpError(409, "Verified account data is already used by another user");
          }
          throw error;
        }
      } else {
        try {
          const updated = await client.query<UserRow>(
            `
              UPDATE users
              SET
                openid = COALESCE($2, openid),
                unionid = COALESCE($3, unionid),
                apple_sub = COALESCE($4, apple_sub),
                display_name = COALESCE($5, display_name),
                email = COALESCE($6, email),
                phone = COALESCE($7, phone),
                last_login_at = now()
              WHERE id = $1
              RETURNING *
            `,
            [
              user.id,
              input.openid || null,
              input.unionid || null,
              input.appleSub || null,
              input.displayName || null,
              input.email || null,
              input.phone || null,
            ]
          );
          user = updated.rows[0];
        } catch (error) {
          if ((error as { code?: string }).code === "23505") {
            throw new HttpError(409, "Verified account data is already used by another user");
          }
          throw error;
        }
      }

      await this.bindVerifiedIdentityWithClient(client, user.id, verifiedIdentity, input.meta);

      await this.writeIdentityAudit(client, user.id, "auth.login", {
        provider: input.provider,
      }, input.meta);

      const tokens = await this.issueTokenPair(user.id, client, input.meta);
      return this.buildAuthResponse(user, tokens, client);
    });
  }

  private async bindVerifiedIdentityWithClient(
    client: PoolClient,
    userId: string,
    input: ReturnType<typeof validateVerifiedIdentity>,
    meta: RequestMeta
  ) {
    const activeUser = await client.query<{ id: string }>(
      "SELECT id FROM users WHERE id = $1 AND status = 'active' AND deleted_at IS NULL FOR UPDATE",
      [userId]
    );
    if (!activeUser.rows[0]) throw new HttpError(404, "User not found");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`${input.provider}:${input.providerSubject}`]
    );
    const existing = await client.query<IdentityRow>(
      `
        SELECT
          id,
          user_id,
          provider,
          provider_subject,
          email,
          status,
          is_primary,
          verified_at::text,
          last_used_at::text,
          bound_at::text,
          revoked_at::text
        FROM user_auth_identities
        WHERE provider = $1 AND provider_subject = $2
        FOR UPDATE
      `,
      [input.provider, input.providerSubject]
    );
    const current = existing.rows[0];
    if (current && current.user_id !== userId) {
      throw new HttpError(409, "Identity is already bound to another user");
    }

    if (current) {
      const updated = await client.query<IdentityRow>(
        `
          UPDATE user_auth_identities
          SET
            openid = COALESCE($2, openid),
            unionid = COALESCE($3, unionid),
            apple_sub = COALESCE($4, apple_sub),
            email = COALESCE($5, email),
            raw_claims = $6::jsonb,
            verified_at = $7::timestamptz,
            last_used_at = now(),
            status = 'active',
            revoked_at = NULL
          WHERE id = $1
          RETURNING *, verified_at::text, last_used_at::text, bound_at::text, revoked_at::text
        `,
        [
          current.id,
          input.openid || null,
          input.unionid || null,
          input.appleSub || null,
          input.email || null,
          JSON.stringify(sanitizeIdentityClaims(input.rawClaims)),
          input.verifiedAt,
        ]
      );
      return updated.rows[0];
    }

    const primaryResult = await client.query<{ is_primary: boolean }>(
      `
        SELECT NOT EXISTS (
          SELECT 1
          FROM user_auth_identities
          WHERE user_id = $1 AND status = 'active' AND revoked_at IS NULL
        ) AS is_primary
      `,
      [userId]
    );
    const inserted = await client.query<IdentityRow>(
      `
        INSERT INTO user_auth_identities (
          user_id,
          provider,
          provider_subject,
          openid,
          unionid,
          apple_sub,
          email,
          raw_claims,
          verified_at,
          status,
          is_primary,
          last_used_at,
          bound_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::timestamptz, 'active', $10, now(), now())
        RETURNING *, verified_at::text, last_used_at::text, bound_at::text, revoked_at::text
      `,
      [
        userId,
        input.provider,
        input.providerSubject,
        input.openid || null,
        input.unionid || null,
        input.appleSub || null,
        input.email || null,
        JSON.stringify(sanitizeIdentityClaims(input.rawClaims)),
        input.verifiedAt,
        primaryResult.rows[0]?.is_primary === true,
      ]
    );
    await this.writeIdentityAudit(client, userId, "auth.identity_bound", {
      identityId: inserted.rows[0].id,
      provider: input.provider,
      verificationSource: input.verificationSource,
    }, meta);
    return inserted.rows[0];
  }

  private async writeIdentityAudit(
    client: PoolClient,
    userId: string,
    eventType: string,
    metadata: Record<string, unknown>,
    meta: RequestMeta
  ) {
    await client.query(
      `
        INSERT INTO audit_events (user_id, event_type, metadata, ip_address, user_agent)
        VALUES ($1, $2, $3::jsonb, $4, $5)
      `,
      [
        userId,
        eventType,
        JSON.stringify(metadata),
        normalizeIp(meta.ipAddress),
        meta.userAgent || null,
      ]
    );
  }

  private async getActiveUser(userId: string, client?: PoolClient) {
    const result = await runQuery<UserRow>(
      client,
      "SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL AND status = 'active'",
      [userId]
    );
    const user = result.rows[0];
    if (!user) throw new HttpError(401, "User is not active");
    return user;
  }

  private async issueTokenPair(userId: string, client: PoolClient, options: TokenPairOptions = {}) {
    const config = getBackendConfig();
    const nowSeconds = Math.floor(Date.now() / 1000);
    const accessJti = randomUUID();
    const refreshJti = randomUUID();
    const refreshTokenId = randomUUID();
    const familyId = options.familyId || randomUUID();
    const refreshExpiresAt = new Date(
      Date.now() + config.jwtRefreshTtlDays * 24 * 60 * 60 * 1000
    ).toISOString();

    const accessToken = await new SignJWT({ typ: "access" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer(config.jwtIssuer)
      .setAudience(config.jwtAudience)
      .setSubject(userId)
      .setJti(accessJti)
      .setIssuedAt(nowSeconds)
      .setExpirationTime(nowSeconds + config.jwtAccessTtlSeconds)
      .sign(getSecret(config.jwtAccessSecret));

    const refreshToken = await new SignJWT({ typ: "refresh" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer(config.jwtIssuer)
      .setAudience(config.jwtAudience)
      .setSubject(userId)
      .setJti(refreshJti)
      .setIssuedAt(nowSeconds)
      .setExpirationTime(`${config.jwtRefreshTtlDays}d`)
      .sign(getSecret(config.jwtRefreshSecret));

    await client.query(
      `
        INSERT INTO refresh_tokens (
          id, user_id, token_hash, family_id, user_agent, ip_address, expires_at, replaced_by_token_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        refreshTokenId,
        userId,
        hashToken(refreshToken),
        familyId,
        options.userAgent || null,
        normalizeIp(options.ipAddress),
        refreshExpiresAt,
        options.replacedTokenId || null,
      ]
    );

    return {
      accessToken,
      refreshToken,
      refreshTokenId,
      expiresIn: config.jwtAccessTtlSeconds,
      refreshExpiresAt,
    };
  }

  private async buildAuthResponse(
    user: UserRow,
    tokens: Awaited<ReturnType<AuthService["issueTokenPair"]>>,
    client?: PoolClient
  ) {
    const [profile, membership, identities] = client
      ? [
          await getProfileForUser(user.id, client),
          await getMembershipForUser(user.id, client),
          await this.listIdentities(user.id, client),
        ]
      : await Promise.all([
          getProfileForUser(user.id),
          getMembershipForUser(user.id),
          this.listIdentities(user.id),
        ]);
    return {
      ok: true,
      authenticated: true,
      tokenType: "Bearer",
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      sessionToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      refreshExpiresAt: tokens.refreshExpiresAt,
      user: mapUser(user),
      profile: mapProfile(profile),
      membership: mapMembership(membership),
      identities,
    };
  }
}
