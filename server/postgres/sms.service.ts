import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type { PoolClient } from "pg";
import { getBackendConfig } from "./env";
import { query, withTransaction } from "./db";
import { HttpError } from "./errors";
import type { RequestMeta } from "./auth.service";
import type { SmsSendPayload } from "./validation";
import { normalizeE164Phone } from "./validation";
import { TencentSmsService, type SmsProviderResult } from "./tencentSms.service";
import { AliyunSmsService } from "./aliyunSms.service";

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

export const hashSmsPhoneIdentifier = (phone: unknown) => {
  let canonical: string;
  try {
    canonical = normalizeE164Phone(phone);
  } catch {
    canonical = String(phone ?? "").trim().slice(0, 64);
  }
  return hmacHex("sms-phone:v1", canonical);
};

export const hashSmsDeviceIdentifier = (deviceId: unknown) =>
  hmacHex("sms-device:v1", String(deviceId ?? "").trim().slice(0, 128));

export const smsPhoneRateLimitBucket = (phone: unknown) =>
  `sms-phone:${hashSmsPhoneIdentifier(phone)}`;

export const smsDeviceRateLimitBucket = (deviceId: unknown) =>
  `sms-device:${hashSmsDeviceIdentifier(deviceId)}`;

export const hashSmsCode = (
  challengeId: string,
  purpose: string,
  phoneHash: string,
  code: string
) => hmacHex("sms-code:v1", `${challengeId}:${purpose}:${phoneHash}:${code}`);

export const verifySmsCodeHash = (
  challengeId: string,
  purpose: string,
  phoneHash: string,
  code: string,
  expectedHash: string
) => {
  const actual = Buffer.from(hashSmsCode(challengeId, purpose, phoneHash, code), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

const generateCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

interface ChallengeInsertResult {
  id: string;
  code: string;
}

interface SendOutcome {
  challengeId: string;
  code: string;
  rateLimited?: false;
}

interface RateLimitedOutcome {
  rateLimited: true;
  retryAfterSeconds: number;
}

export class SmsService {
  private readonly tencentProvider = new TencentSmsService();
  private readonly aliyunProvider = new AliyunSmsService();

  async sendRegisterCode(payload: SmsSendPayload, meta: RequestMeta) {
    const config = getBackendConfig();
    if (config.smsMode === "disabled") {
      throw new HttpError(503, "SMS registration is not configured");
    }

    const phoneHash = hashSmsPhoneIdentifier(payload.phone);
    const deviceHash = hashSmsDeviceIdentifier(payload.deviceId);
    const ttlSeconds = config.smsCodeTtlSeconds;
    const cooldownSeconds = config.smsSendCooldownSeconds;

    const outcome = await withTransaction<SendOutcome | RateLimitedOutcome>(async (client) => {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [`sms:${payload.purpose}:${phoneHash}`]
      );
      const recent = await client.query<{ created_at: string }>(
        `
          SELECT created_at::text
          FROM auth_challenges
          WHERE purpose = $1
            AND phone_hash = $2
            AND send_status IN ('pending', 'sent')
            AND created_at > now() - ($3::int * interval '1 second')
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [payload.purpose, phoneHash, cooldownSeconds]
      );
      const recentChallenge = recent.rows[0];
      if (recentChallenge) {
        const elapsedSeconds = Math.max(
          0,
          Math.floor((Date.now() - Date.parse(recentChallenge.created_at)) / 1000)
        );
        const retryAfterSeconds = Math.max(1, cooldownSeconds - elapsedSeconds);
        await this.audit(client, null, "rate_limited", {
          scope: "sms_send_cooldown",
          purpose: payload.purpose,
          phoneHash,
          deviceHash,
          retryAfterSeconds,
        }, meta);
        return { rateLimited: true, retryAfterSeconds };
      }

      const challenge = this.createChallenge(payload.purpose, phoneHash);
      await client.query(
        `
          INSERT INTO auth_challenges (
            id,
            purpose,
            phone_hash,
            device_hash,
            code_hash,
            expires_at,
            max_attempts,
            send_status
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            now() + ($6::int * interval '1 second'),
            $7,
            'pending'
          )
        `,
        [
          challenge.id,
          payload.purpose,
          phoneHash,
          deviceHash,
          hashSmsCode(challenge.id, payload.purpose, phoneHash, challenge.code),
          ttlSeconds,
          config.smsCodeMaxAttempts,
        ]
      );
      return {
        challengeId: challenge.id,
        code: challenge.code,
        rateLimited: false,
      };
    });

    if (outcome.rateLimited === true) {
      throw new HttpError(429, "SMS send cooldown is active", {
        retryAfterSeconds: outcome.retryAfterSeconds,
      });
    }
    const sentOutcome = outcome as SendOutcome;

    let providerResult: SmsProviderResult;
    try {
      providerResult = await this.sendViaProvider({
        phone: payload.phone,
        code: sentOutcome.code,
        challengeId: sentOutcome.challengeId,
        ttlSeconds,
      });
    } catch (error) {
      await query(
        `
          UPDATE auth_challenges
          SET send_status = 'failed', provider_request_id = NULL
          WHERE id = $1
        `,
        [sentOutcome.challengeId]
      );
      await this.audit(null, null, "sms_failed", {
        challengeId: sentOutcome.challengeId,
        purpose: payload.purpose,
        phoneHash,
        deviceHash,
        reason: error instanceof Error && error.message ? error.message : "provider_failed",
        errorName: error instanceof Error ? error.name : undefined,
        errorCode: typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : undefined,
      }, meta);
      throw error;
    }

    await query(
      `
        UPDATE auth_challenges
        SET send_status = 'sent', provider_request_id = $2, sent_at = now()
        WHERE id = $1
      `,
      [sentOutcome.challengeId, providerResult.requestId || null]
    );
    await this.audit(null, null, "sms_send", {
      challengeId: sentOutcome.challengeId,
      purpose: payload.purpose,
      phoneHash,
      deviceHash,
      provider: config.smsMode === "mock" ? "mock" : config.smsProvider,
    }, meta);

    return {
      ok: true,
      challengeId: sentOutcome.challengeId,
      expiresIn: ttlSeconds,
      retryAfterSeconds: cooldownSeconds,
    };
  }

  async auditRateLimited(
    scope: string,
    bucketKey: string,
    meta: RequestMeta,
    extra: Record<string, unknown> = {}
  ) {
    await this.audit(null, null, "rate_limited", {
      scope,
      bucketHash: hmacHex("rate-limit-bucket:v1", bucketKey),
      ...extra,
    }, meta).catch(() => undefined);
  }

  private createChallenge(purpose: string, _phoneHash: string): ChallengeInsertResult {
    const config = getBackendConfig();
    const id = randomUUID();
    const code = config.smsMode === "mock" ? config.smsMockCode : generateCode();
    if (!/^\d{6}$/.test(code)) {
      throw new HttpError(500, "SMS code generation failed");
    }
    return { id, code };
  }

  private async sendViaProvider(input: {
    phone: string;
    code: string;
    challengeId: string;
    ttlSeconds: number;
  }): Promise<SmsProviderResult> {
    const config = getBackendConfig();
    if (config.smsMode === "mock") {
      return { requestId: `mock:${input.challengeId}` };
    }
    if (config.smsMode === "live" && config.smsProvider === "tencent") {
      return this.tencentProvider.sendVerificationCode(input);
    }
    if (config.smsMode === "live" && config.smsProvider === "aliyun_dypns_sms") {
      return this.aliyunProvider.sendVerificationCode(input);
    }
    throw new HttpError(503, "SMS registration is not configured");
  }

  private async audit(
    client: PoolClient | null,
    userId: string | null,
    eventType: string,
    metadata: Record<string, unknown>,
    meta: RequestMeta
  ) {
    const text = `
        INSERT INTO audit_events (user_id, event_type, metadata, ip_address, user_agent)
        VALUES ($1, $2, $3::jsonb, $4, $5)
      `;
    const values = [
      userId,
      eventType,
      JSON.stringify(metadata),
      normalizeIp(meta.ipAddress),
      meta.userAgent || null,
    ];
    if (client) {
      await client.query(
        text,
        values
      );
      return;
    }
    await query(
      text,
      values
    );
  }
}
