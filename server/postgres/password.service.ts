import { createHmac, randomBytes } from "node:crypto";
import * as argon2 from "argon2";
import type { PoolClient } from "pg";
import { AuthService, type RequestMeta } from "./auth.service";
import { getBackendConfig } from "./env";
import { withTransaction } from "./db";
import { HttpError } from "./errors";
import { normalizeE164Phone, validateCredentialPassword } from "./validation";

export const PASSWORD_ALGORITHM = "argon2id";
export const PASSWORD_ALGORITHM_VERSION = 1;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60_000;
const INVALID_CREDENTIALS_MESSAGE = "账号或密码错误";

export const PASSWORD_HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
} as const;

interface CredentialRow {
  user_id: string;
  password_hash: string;
  algorithm: string;
  algorithm_version: number;
  failed_attempts: number;
  locked_until: string | null;
  identity_id: string;
}

interface ProvisionedIdentityRow {
  id: string;
  user_id: string;
  status: string;
  revoked_at: string | null;
  user_status: string;
  deleted_at: string | null;
}

const normalizeIp = (value?: string | null) => {
  if (!value) return null;
  return value.split(",")[0]?.trim() || null;
};

const safeVerify = async (hash: string, password: string) => {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
};

export const hashPasswordCredential = (password: string) =>
  argon2.hash(password, PASSWORD_HASH_OPTIONS);

const dummyHashPromise = argon2.hash(randomBytes(32), PASSWORD_HASH_OPTIONS);

export const hashPhoneIdentifier = (phone: unknown) => {
  let canonical: string;
  try {
    canonical = normalizeE164Phone(phone);
  } catch {
    canonical = String(phone ?? "").trim().slice(0, 64);
  }
  return createHmac("sha256", getBackendConfig().jwtAccessSecret)
    .update(canonical)
    .digest("hex");
};

export const phoneRateLimitBucket = (phone: unknown) =>
  `phone:${hashPhoneIdentifier(phone)}`;

export const maskPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 4 ? `***${digits.slice(-4)}` : "***";
};

const assertLocalProvisioning = () => {
  const config = getBackendConfig();
  const databaseUrl = new URL(config.databaseUrl);
  const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  if (
    config.nodeEnv === "production" ||
    config.appEnv !== "sandbox" ||
    !localHosts.has(databaseUrl.hostname) ||
    !/(?:life_kline|test)/i.test(databaseUrl.pathname)
  ) {
    throw new HttpError(403, "Test phone users can only be provisioned in a local sandbox database");
  }
};

export class PasswordService {
  private readonly authService = new AuthService();

  async login(phone: string, password: string, meta: RequestMeta) {
    const normalizedPhone = normalizeE164Phone(phone);
    const phoneHash = hashPhoneIdentifier(normalizedPhone);
    const outcome = await withTransaction(async (client) => {
      const credentialResult = await client.query<CredentialRow>(
        `
          SELECT
            credential.user_id,
            credential.password_hash,
            credential.algorithm,
            credential.algorithm_version,
            credential.failed_attempts,
            credential.locked_until::text,
            identity.id AS identity_id
          FROM user_auth_identities identity
          JOIN users user_account ON user_account.id = identity.user_id
          JOIN password_credentials credential ON credential.user_id = user_account.id
          WHERE identity.provider = 'phone'
            AND identity.provider_subject = $1
            AND identity.status = 'active'
            AND identity.revoked_at IS NULL
            AND identity.verified_at IS NOT NULL
            AND user_account.status = 'active'
            AND user_account.deleted_at IS NULL
          LIMIT 1
          FOR UPDATE OF credential, identity, user_account
        `,
        [normalizedPhone]
      );
      const credential = credentialResult.rows[0];

      if (!credential) {
        await safeVerify(await dummyHashPromise, password);
        await this.audit(client, null, "auth.password.login_failed", {
          phoneHash,
          reason: "invalid_credentials",
        }, meta);
        return { failure: true as const };
      }

      if (credential.locked_until && Date.parse(credential.locked_until) > Date.now()) {
        await safeVerify(await dummyHashPromise, password);
        await this.audit(client, credential.user_id, "auth.password.login_failed", {
          phoneHash,
          reason: "locked",
        }, meta);
        return { failure: true as const };
      }

      const valid = credential.algorithm === PASSWORD_ALGORITHM &&
        await safeVerify(credential.password_hash, password);
      if (!valid) {
        const failedAttempts = credential.failed_attempts + 1;
        const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;
        await client.query(
          `
            UPDATE password_credentials
            SET
              failed_attempts = $2,
              locked_until = CASE
                WHEN $3::boolean THEN now() + ($4::int * interval '1 millisecond')
                ELSE NULL
              END
            WHERE user_id = $1
          `,
          [credential.user_id, failedAttempts, shouldLock, LOCK_DURATION_MS]
        );
        await this.audit(client, credential.user_id, "auth.password.login_failed", {
          phoneHash,
          failedAttempts,
        }, meta);
        if (shouldLock) {
          await this.audit(client, credential.user_id, "auth.password.locked", {
            phoneHash,
            failedAttempts,
            lockDurationSeconds: LOCK_DURATION_MS / 1000,
          }, meta);
        }
        return { failure: true as const };
      }

      let upgradedHash: string | null = null;
      if (
        credential.algorithm_version !== PASSWORD_ALGORITHM_VERSION ||
        argon2.needsRehash(credential.password_hash, PASSWORD_HASH_OPTIONS)
      ) {
        upgradedHash = await hashPasswordCredential(password);
      }
      await client.query(
        `
          UPDATE password_credentials
          SET
            password_hash = COALESCE($2, password_hash),
            algorithm = $3,
            algorithm_version = $4,
            failed_attempts = 0,
            locked_until = NULL
          WHERE user_id = $1
        `,
        [
          credential.user_id,
          upgradedHash,
          PASSWORD_ALGORITHM,
          PASSWORD_ALGORITHM_VERSION,
        ]
      );
      await client.query(
        "UPDATE user_auth_identities SET last_used_at = now() WHERE id = $1",
        [credential.identity_id]
      );
      await this.audit(client, credential.user_id, "auth.password.login_success", {
        phoneHash,
        hashUpgraded: Boolean(upgradedHash),
      }, meta);
      const response = await this.authService.createSessionForUser(
        credential.user_id,
        meta,
        client
      );
      return { failure: false as const, response };
    });

    if (outcome.failure) throw new HttpError(401, INVALID_CREDENTIALS_MESSAGE);
    return outcome.response;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    meta: RequestMeta
  ) {
    const outcome = await withTransaction(async (client) => {
      const credentialResult = await client.query<CredentialRow>(
        `
          SELECT
            credential.user_id,
            credential.password_hash,
            credential.algorithm,
            credential.algorithm_version,
            credential.failed_attempts,
            credential.locked_until::text,
            identity.id AS identity_id
          FROM password_credentials credential
          JOIN users user_account ON user_account.id = credential.user_id
          JOIN user_auth_identities identity
            ON identity.user_id = user_account.id
            AND identity.provider = 'phone'
            AND identity.status = 'active'
            AND identity.revoked_at IS NULL
            AND identity.verified_at IS NOT NULL
          WHERE credential.user_id = $1
            AND user_account.status = 'active'
            AND user_account.deleted_at IS NULL
          ORDER BY identity.is_primary DESC, identity.bound_at
          LIMIT 1
          FOR UPDATE OF credential, user_account
        `,
        [userId]
      );
      const credential = credentialResult.rows[0];
      const currentValid = credential
        ? await safeVerify(credential.password_hash, currentPassword)
        : await safeVerify(await dummyHashPromise, currentPassword);
      if (!credential || !currentValid) {
        await this.audit(client, credential?.user_id || userId, "auth.password.change_failed", {
          reason: "invalid_current_password",
        }, meta);
        return { failure: true as const };
      }
      if (await safeVerify(credential.password_hash, newPassword)) {
        throw new HttpError(422, "New password must differ from current password");
      }

      const passwordHash = await hashPasswordCredential(newPassword);
      await client.query(
        `
          UPDATE password_credentials
          SET
            password_hash = $2,
            algorithm = $3,
            algorithm_version = $4,
            failed_attempts = 0,
            locked_until = NULL,
            password_changed_at = now()
          WHERE user_id = $1
        `,
        [userId, passwordHash, PASSWORD_ALGORITHM, PASSWORD_ALGORITHM_VERSION]
      );
      const revokedTokens = await client.query(
        `
          UPDATE refresh_tokens
          SET revoked_at = now()
          WHERE user_id = $1 AND revoked_at IS NULL
        `,
        [userId]
      );
      await this.audit(client, userId, "auth.password.password_changed", {
        revokedRefreshTokenCount: revokedTokens.rowCount || 0,
        algorithm: PASSWORD_ALGORITHM,
        algorithmVersion: PASSWORD_ALGORITHM_VERSION,
      }, meta);
      return { failure: false as const };
    });

    if (outcome.failure) throw new HttpError(401, INVALID_CREDENTIALS_MESSAGE);
    return { ok: true, refreshTokensRevoked: true };
  }

  async provisionLocalTestPhoneUser(input: {
    phone: string;
    password: string;
    displayName?: string;
  }) {
    assertLocalProvisioning();
    const normalizedPhone = normalizeE164Phone(input.phone);
    const password = validateCredentialPassword(input.password);
    const phoneHash = hashPhoneIdentifier(normalizedPhone);
    const passwordHash = await hashPasswordCredential(password);

    return withTransaction(async (client) => {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [`phone:${normalizedPhone}`]
      );
      const identityResult = await client.query<ProvisionedIdentityRow>(
        `
          SELECT
            identity.id,
            identity.user_id,
            identity.status,
            identity.revoked_at::text,
            user_account.status AS user_status,
            user_account.deleted_at::text
          FROM user_auth_identities identity
          JOIN users user_account ON user_account.id = identity.user_id
          WHERE identity.provider = 'phone' AND identity.provider_subject = $1
          LIMIT 1
          FOR UPDATE OF identity, user_account
        `,
        [normalizedPhone]
      );
      const existingIdentity = identityResult.rows[0];
      if (
        existingIdentity &&
        (
          existingIdentity.status !== "active" ||
          existingIdentity.revoked_at ||
          existingIdentity.user_status !== "active" ||
          existingIdentity.deleted_at
        )
      ) {
        throw new HttpError(409, "Phone identity is not available for test provisioning");
      }

      let userId = existingIdentity?.user_id;
      let createdUser = false;
      if (!userId) {
        const userResult = await client.query<{ id: string }>(
          `
            INSERT INTO users (auth_provider, phone, display_name, last_login_at)
            VALUES ('phone', $1, $2, NULL)
            RETURNING id
          `,
          [normalizedPhone, input.displayName || "本地测试用户"]
        );
        userId = userResult.rows[0].id;
        createdUser = true;
        await this.authService.bindVerifiedIdentity(
          userId,
          {
            provider: "phone",
            providerSubject: normalizedPhone,
            verifiedAt: new Date().toISOString(),
            verificationSource: "local_test",
            phone: normalizedPhone,
            rawClaims: { provisionedBy: "local_test_script" },
          },
          { userAgent: "create-test-phone-user" },
          client
        );
      }

      const existingCredential = await client.query<{ password_hash: string }>(
        "SELECT password_hash FROM password_credentials WHERE user_id = $1 FOR UPDATE",
        [userId]
      );
      if (existingCredential.rows[0]) {
        const matches = await safeVerify(existingCredential.rows[0].password_hash, password);
        if (!matches) {
          throw new HttpError(409, "Test account already exists with a different password");
        }
        return {
          ok: true,
          created: false,
          userId,
          phone: maskPhone(normalizedPhone),
        };
      }

      await client.query(
        `
          INSERT INTO password_credentials (
            user_id,
            password_hash,
            algorithm,
            algorithm_version
          )
          VALUES ($1, $2, $3, $4)
        `,
        [userId, passwordHash, PASSWORD_ALGORITHM, PASSWORD_ALGORITHM_VERSION]
      );
      await this.audit(client, userId, "auth.password.test_account_provisioned", {
        phoneHash,
        createdUser,
      }, { userAgent: "create-test-phone-user" });
      return {
        ok: true,
        created: true,
        userId,
        phone: maskPhone(normalizedPhone),
      };
    });
  }

  private async audit(
    client: PoolClient,
    userId: string | null,
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
}
