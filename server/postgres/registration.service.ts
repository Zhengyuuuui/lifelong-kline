import { createHmac } from "node:crypto";
import type { PoolClient } from "pg";
import { AuthService, type RequestMeta } from "./auth.service";
import { withTransaction } from "./db";
import { getBackendConfig } from "./env";
import { HttpError } from "./errors";
import { InviteService } from "./invite.service";
import {
  PASSWORD_ALGORITHM,
  PASSWORD_ALGORITHM_VERSION,
  hashPasswordCredential,
} from "./password.service";
import type { PhoneRegisterPayload, SmsVerifyPayload } from "./validation";
import { normalizeE164Phone, normalizeMainlandChinaPhone } from "./validation";
import { hashSmsCode, hashSmsPhoneIdentifier, verifySmsCodeHash } from "./sms.service";

interface ChallengeRow {
  id: string;
  purpose: "register" | "auth";
  phone_hash: string;
  device_hash: string;
  code_hash: string;
  expires_at: string;
  attempt_count: number;
  max_attempts: number;
  consumed_at: string | null;
  send_status: string;
}

interface PhoneIdentityUserRow {
  identity_id: string;
  user_id: string;
  identity_status: string;
  identity_revoked_at: string | null;
  identity_verified_at: string | null;
  user_status: string;
  user_deleted_at: string | null;
}

const normalizeIp = (value?: string | null) => {
  if (!value) return null;
  const first = value.split(",")[0]?.trim();
  return first || null;
};

const hmacHex = (domain: string, value: string) => {
  const config = getBackendConfig();
  const secret = config.smsCodeHmacSecret || config.jwtAccessSecret;
  return createHmac("sha256", secret)
    .update(`${domain}:${value}`)
    .digest("hex");
};

const dayWindowSql = "date_trunc('day', now())";

export class RegistrationService {
  private readonly authService = new AuthService();
  private readonly inviteService = new InviteService();

  async registerPhone(payload: PhoneRegisterPayload, meta: RequestMeta) {
    const normalizedPhone = normalizeE164Phone(payload.phone);
    const phoneHash = hashSmsPhoneIdentifier(normalizedPhone);

    const outcome = await withTransaction(async (client) => {
      const challenge = await this.getLockedChallenge(client, payload.challengeId);
      if (!challenge) {
        await this.audit(client, null, "register_failed", {
          phoneHash,
          reason: "challenge_not_found",
        }, meta);
        return { error: new HttpError(404, "验证码不存在或已失效") };
      }

      if (challenge.purpose !== "register" || challenge.phone_hash !== phoneHash) {
        await this.audit(client, null, "register_failed", {
          challengeId: challenge.id,
          phoneHash,
          reason: "challenge_mismatch",
        }, meta);
        return { error: new HttpError(422, "验证码与手机号不匹配") };
      }
      if (challenge.send_status !== "sent") {
        await this.audit(client, null, "register_failed", {
          challengeId: challenge.id,
          phoneHash,
          reason: "challenge_not_sent",
        }, meta);
        return { error: new HttpError(409, "验证码尚未发送成功") };
      }
      if (challenge.consumed_at) {
        await this.audit(client, null, "register_failed", {
          challengeId: challenge.id,
          phoneHash,
          reason: "challenge_consumed",
        }, meta);
        return { error: new HttpError(409, "验证码已使用") };
      }
      if (Date.parse(challenge.expires_at) <= Date.now()) {
        await this.audit(client, null, "register_failed", {
          challengeId: challenge.id,
          phoneHash,
          reason: "challenge_expired",
        }, meta);
        return { error: new HttpError(410, "验证码已过期") };
      }
      if (challenge.attempt_count >= challenge.max_attempts) {
        await this.audit(client, null, "register_failed", {
          challengeId: challenge.id,
          phoneHash,
          reason: "attempts_exhausted",
        }, meta);
        return { error: new HttpError(429, "验证码尝试次数过多") };
      }

      const validCode = verifySmsCodeHash(
        challenge.id,
        challenge.purpose,
        challenge.phone_hash,
        payload.code,
        challenge.code_hash
      );
      if (!validCode) {
        const attempts = challenge.attempt_count + 1;
        await client.query(
          "UPDATE auth_challenges SET attempt_count = $2 WHERE id = $1",
          [challenge.id, attempts]
        );
        await this.audit(client, null, "register_failed", {
          challengeId: challenge.id,
          phoneHash,
          reason: attempts >= challenge.max_attempts ? "attempts_exhausted" : "invalid_code",
          attemptCount: attempts,
        }, meta);
        return {
          error: new HttpError(
            attempts >= challenge.max_attempts ? 429 : 422,
            attempts >= challenge.max_attempts ? "验证码尝试次数过多" : "验证码错误"
          ),
        };
      }

      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [`phone:${normalizedPhone}`]
      );
      const existingIdentity = await client.query<{ user_id: string }>(
        `
          SELECT user_id
          FROM user_auth_identities
          WHERE provider = 'phone' AND provider_subject = $1
          LIMIT 1
          FOR UPDATE
        `,
        [normalizedPhone]
      );
      if (existingIdentity.rows[0]) {
        await client.query(
          "UPDATE auth_challenges SET consumed_at = now() WHERE id = $1",
          [challenge.id]
        );
        await this.audit(client, existingIdentity.rows[0].user_id, "register_failed", {
          challengeId: challenge.id,
          phoneHash,
          reason: "phone_already_registered",
        }, meta);
        return { error: new HttpError(409, "手机号已注册，请直接登录") };
      }

      const registrationLimit = await this.checkAutoRegisterDailyLimits(
        client,
        challenge,
        phoneHash,
        meta
      );
      if (registrationLimit.limited) {
        return { error: new HttpError(429, "Too many registration attempts") };
      }

      const user = await client.query<{ id: string }>(
        `
          INSERT INTO users (auth_provider, phone, display_name, last_login_at)
          VALUES ('phone', $1, '手机用户', now())
          RETURNING id
        `,
        [normalizedPhone]
      );
      const userId = user.rows[0].id;

      await this.authService.bindVerifiedIdentity(
        userId,
        {
          provider: "phone",
          providerSubject: normalizedPhone,
          verifiedAt: new Date().toISOString(),
          verificationSource: "sms_verification",
          phone: normalizedPhone,
          rawClaims: {
            challengeId: challenge.id,
            purpose: challenge.purpose,
            phoneHash,
          },
        },
        meta,
        client
      );

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
        [
          userId,
          await hashPasswordCredential(payload.password),
          PASSWORD_ALGORITHM,
          PASSWORD_ALGORITHM_VERSION,
        ]
      );
      await client.query(
        "UPDATE auth_challenges SET consumed_at = now() WHERE id = $1",
        [challenge.id]
      );
      await this.inviteService.recordReferralForNewUser(
        client,
        userId,
        payload.inviteCode,
        meta
      );
      await this.audit(client, userId, "register_success", {
        challengeId: challenge.id,
        phoneHash,
      }, meta);

      return { response: await this.authService.createSessionForUser(userId, meta, client) };
    });

    if ("error" in outcome) throw outcome.error;
    return outcome.response;
  }

  async verifyPhoneAuth(payload: SmsVerifyPayload, meta: RequestMeta) {
    const normalizedPhone = normalizeMainlandChinaPhone(payload.phone);
    const phoneHash = hashSmsPhoneIdentifier(normalizedPhone);

    const outcome = await withTransaction(async (client) => {
      const challenge = await this.getLockedChallenge(client, payload.challengeId);
      if (!challenge) {
        await this.audit(client, null, "sms_auth.verify_failed", {
          challengeId: payload.challengeId,
          phoneHash,
          reason: "challenge_not_found",
        }, meta);
        return { error: new HttpError(422, "验证码错误") };
      }

      if (challenge.purpose !== "auth" || challenge.phone_hash !== phoneHash) {
        await this.audit(client, null, "sms_auth.verify_failed", {
          challengeId: challenge.id,
          phoneHash,
          reason: "challenge_mismatch",
        }, meta);
        return { error: new HttpError(422, "验证码错误") };
      }
      if (challenge.send_status !== "sent") {
        await this.audit(client, null, "sms_auth.verify_failed", {
          challengeId: challenge.id,
          phoneHash,
          reason: "challenge_not_sent",
        }, meta);
        return { error: new HttpError(409, "验证码尚未发送成功") };
      }
      if (challenge.consumed_at) {
        await this.audit(client, null, "sms_auth.verify_failed", {
          challengeId: challenge.id,
          phoneHash,
          reason: "challenge_consumed",
        }, meta);
        return { error: new HttpError(409, "验证码已使用") };
      }
      if (Date.parse(challenge.expires_at) <= Date.now()) {
        await this.audit(client, null, "sms_auth.verify_failed", {
          challengeId: challenge.id,
          phoneHash,
          reason: "challenge_expired",
        }, meta);
        return { error: new HttpError(410, "验证码已过期") };
      }
      if (challenge.attempt_count >= challenge.max_attempts) {
        await this.audit(client, null, "sms_auth.verify_failed", {
          challengeId: challenge.id,
          phoneHash,
          reason: "attempts_exhausted",
        }, meta);
        return { error: new HttpError(429, "验证码尝试次数过多") };
      }

      const validCode = verifySmsCodeHash(
        challenge.id,
        challenge.purpose,
        challenge.phone_hash,
        payload.code,
        challenge.code_hash
      );
      if (!validCode) {
        const attempts = challenge.attempt_count + 1;
        await client.query(
          "UPDATE auth_challenges SET attempt_count = $2 WHERE id = $1",
          [challenge.id, attempts]
        );
        await this.audit(client, null, "sms_auth.verify_failed", {
          challengeId: challenge.id,
          phoneHash,
          reason: attempts >= challenge.max_attempts ? "attempts_exhausted" : "invalid_code",
          attemptCount: attempts,
        }, meta);
        return {
          error: new HttpError(
            attempts >= challenge.max_attempts ? 429 : 422,
            attempts >= challenge.max_attempts ? "验证码尝试次数过多" : "验证码错误"
          ),
        };
      }

      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [`phone:${normalizedPhone}`]
      );
      const existingIdentity = await client.query<PhoneIdentityUserRow>(
        `
          SELECT
            identity.id AS identity_id,
            identity.user_id,
            identity.status AS identity_status,
            identity.revoked_at::text AS identity_revoked_at,
            identity.verified_at::text AS identity_verified_at,
            user_account.status AS user_status,
            user_account.deleted_at::text AS user_deleted_at
          FROM user_auth_identities identity
          JOIN users user_account ON user_account.id = identity.user_id
          WHERE identity.provider = 'phone' AND identity.provider_subject = $1
          LIMIT 1
          FOR UPDATE OF identity, user_account
        `,
        [normalizedPhone]
      );

      const identity = existingIdentity.rows[0];
      if (
        identity &&
        (
          identity.identity_status !== "active" ||
          identity.identity_revoked_at ||
          !identity.identity_verified_at ||
          identity.user_status !== "active" ||
          identity.user_deleted_at
        )
      ) {
        await client.query(
          "UPDATE auth_challenges SET consumed_at = now() WHERE id = $1",
          [challenge.id]
        );
        await this.audit(client, identity.user_id, "sms_auth.verify_failed", {
          challengeId: challenge.id,
          phoneHash,
          reason: "identity_unavailable",
        }, meta);
        return { error: new HttpError(403, "当前手机号不可登录") };
      }

      let userId = identity?.user_id;
      const createdUser = !userId;
      if (!userId) {
        const registrationLimit = await this.checkAutoRegisterDailyLimits(
          client,
          challenge,
          phoneHash,
          meta
        );
        if (registrationLimit.limited) {
          return { error: new HttpError(429, "Too many registration attempts") };
        }

        const user = await client.query<{ id: string }>(
          `
            INSERT INTO users (auth_provider, phone, display_name, last_login_at)
            VALUES ('phone', $1, '手机用户', now())
            RETURNING id
          `,
          [normalizedPhone]
        );
        userId = user.rows[0].id;
      } else {
        await client.query(
          `
            UPDATE users
            SET phone = COALESCE(phone, $2), last_login_at = now(), updated_at = now()
            WHERE id = $1
          `,
          [userId, normalizedPhone]
        );
      }

      await this.authService.bindVerifiedIdentity(
        userId,
        {
          provider: "phone",
          providerSubject: normalizedPhone,
          verifiedAt: new Date().toISOString(),
          verificationSource: "sms_verification",
          phone: normalizedPhone,
          rawClaims: {
            challengeId: challenge.id,
            purpose: challenge.purpose,
            phoneHash,
          },
        },
        meta,
        client
      );

      await client.query(
        "UPDATE auth_challenges SET consumed_at = now() WHERE id = $1",
        [challenge.id]
      );
      if (createdUser) {
        await this.inviteService.recordReferralForNewUser(
          client,
          userId,
          payload.inviteCode,
          meta
        );
      }
      await this.audit(
        client,
        userId,
        createdUser ? "sms_auth.register_success" : "sms_auth.login_success",
        {
          challengeId: challenge.id,
          phoneHash,
        },
        meta
      );

      return { response: await this.authService.createSessionForUser(userId, meta, client) };
    });

    if ("error" in outcome) throw outcome.error;
    return outcome.response;
  }

  private async getLockedChallenge(client: PoolClient, challengeId: string) {
    const result = await client.query<ChallengeRow>(
      `
        SELECT
          id,
          purpose,
          phone_hash,
          device_hash,
          code_hash,
          expires_at::text,
          attempt_count,
          max_attempts,
          consumed_at::text,
          send_status
        FROM auth_challenges
        WHERE id = $1
        FOR UPDATE
      `,
      [challengeId]
    );
    return result.rows[0];
  }

  private async checkAutoRegisterDailyLimits(
    client: PoolClient,
    challenge: ChallengeRow,
    phoneHash: string,
    meta: RequestMeta
  ) {
    const config = getBackendConfig();
    if (!config.pgRateLimitEnabled) return { limited: false as const };

    const checks = [
      {
        type: "ip",
        limit: config.smsAuthRegisterIpDailyLimit,
        bucketKey: `sms-auth-register-ip:${hmacHex("sms-auth-register-ip:v1", normalizeIp(meta.ipAddress) || "unknown")}`,
      },
      {
        type: "device",
        limit: config.smsAuthRegisterDeviceDailyLimit,
        bucketKey: `sms-auth-register-device:${challenge.device_hash}`,
      },
      {
        type: "phone",
        limit: config.smsAuthRegisterPhoneDailyLimit,
        bucketKey: `sms-auth-register-phone:${phoneHash}`,
      },
    ] as const;

    for (const check of checks) {
      const result = await client.query<{ request_count: number }>(
        `
          INSERT INTO api_rate_limits (bucket_key, route_key, window_start, request_count)
          VALUES ($1, $2, ${dayWindowSql}, 1)
          ON CONFLICT (bucket_key, route_key, window_start)
          DO UPDATE SET request_count = api_rate_limits.request_count + 1
          RETURNING request_count
        `,
        [check.bucketKey, "auth.sms.auto_register.daily"]
      );
      const count = Number(result.rows[0]?.request_count || 0);
      if (count > check.limit) {
        await this.audit(client, null, "sms_auth.register_rate_limited", {
          challengeId: challenge.id,
          phoneHash,
          deviceHash: challenge.device_hash,
          ipBucketHash: hmacHex("sms-auth-register-ip-bucket:v1", check.bucketKey),
          limitType: check.type,
        }, meta);
        return { limited: true as const, limitType: check.type };
      }
    }

    return { limited: false as const };
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
