import { randomInt, randomUUID } from "node:crypto";
import { getBackendConfig } from "../server/postgres/env";
import { getPool, query } from "../server/postgres/db";
import {
  hashSmsDeviceIdentifier,
  hashSmsPhoneIdentifier,
  smsDeviceRateLimitBucket,
  smsPhoneRateLimitBucket,
} from "../server/postgres/sms.service";

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};

const ensureLocalTestDatabase = () => {
  const config = getBackendConfig();
  const databaseUrl = new URL(config.databaseUrl);
  const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  assert(config.nodeEnv !== "production", "SMS registration tests cannot run in production");
  assert(config.appEnv === "sandbox", "SMS registration tests require APP_ENV=sandbox");
  assert(localHosts.has(databaseUrl.hostname), "SMS registration tests require local Postgres");
  assert(/(?:life_kline|test)/i.test(databaseUrl.pathname), "SMS registration tests require a test database");
  assert(config.smsMode === "mock", "SMS registration tests require SMS_MODE=mock");
  assert(/^\d{6}$/.test(config.smsMockCode), "SMS registration tests require a local SMS_MOCK_CODE");
  return `${databaseUrl.hostname}${databaseUrl.pathname}`;
};

const baseUrl = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";

const apiRequest = async (
  path: string,
  options: { method?: string; token?: string; body?: Record<string, unknown> } = {}
) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let body: Record<string, any> = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { status: response.status, body, text };
};

const sendSms = (phone: string, deviceId: string) => apiRequest("/api/auth/sms/send", {
  method: "POST",
  body: { phone, purpose: "register", deviceId },
});

const registerPhone = (challengeId: string, phone: string, code: string, password: string) =>
  apiRequest("/api/auth/register/phone", {
    method: "POST",
    body: { challengeId, phone, code, password },
  });

const passwordLogin = (phone: string, password: string) => apiRequest("/api/auth/password/login", {
  method: "POST",
  body: { phone, password },
});

const currentRateWindow = (windowMs: number) =>
  new Date(Date.now() - (Date.now() % windowMs)).toISOString();

const preseedRateLimit = async (
  bucketKey: string,
  routeKey: string,
  limit: number,
  windowMs = 60 * 60_000
) => {
  await query(
    `
      INSERT INTO api_rate_limits (bucket_key, route_key, window_start, request_count)
      VALUES ($1, $2, $3::timestamptz, $4)
      ON CONFLICT (bucket_key, route_key, window_start)
      DO UPDATE SET request_count = $4
    `,
    [bucketKey, routeKey, currentRateWindow(windowMs), limit]
  );
};

const main = async () => {
  const database = ensureLocalTestDatabase();
  const config = getBackendConfig();
  const startedAt = new Date().toISOString();
  const seed = randomInt(10_000_000, 89_999_000);
  const phone = (offset: number) => `+1555${seed + offset}`;
  const device = (offset: number) => `sms-device-${seed + offset}`;
  const password = (label: string) => `Sms-${label}-${randomUUID()}!`;
  const mockCode = config.smsMockCode;
  const phones = Array.from({ length: 12 }, (_, index) => phone(index));
  const phoneHashes = phones.map(hashSmsPhoneIdentifier);
  const deviceIds = Array.from({ length: 12 }, (_, index) => device(index));
  const createdUserIds: string[] = [];
  const challengeIds: string[] = [];

  const recordChallenge = (response: Awaited<ReturnType<typeof sendSms>>) => {
    const challengeId = String(response.body.challengeId || "");
    if (challengeId) challengeIds.push(challengeId);
    return challengeId;
  };

  try {
    await query("DELETE FROM api_rate_limits WHERE route_key LIKE 'auth.sms.%'");

    const health = await apiRequest("/api/health");
    assert(health.status === 200, "Expected running local server");

    const firstSend = await sendSms(phones[0], deviceIds[0]);
    assert(firstSend.status === 200, `Mock SMS send failed: ${firstSend.status}`);
    assert(firstSend.body.ok === true, "SMS send must return ok=true");
    assert(firstSend.body.challengeId, "SMS send must return challengeId");
    assert(firstSend.body.expiresIn === config.smsCodeTtlSeconds, "SMS send must return configured ttl");
    assert(firstSend.body.retryAfterSeconds === config.smsSendCooldownSeconds, "SMS send must return cooldown");
    assert(!JSON.stringify(firstSend.body).includes(mockCode), "SMS send response must not expose code");
    const challengeA = recordChallenge(firstSend);

    const cooldown = await sendSms(phones[0], deviceIds[0]);
    assert(cooldown.status === 429, "Repeated SMS send within cooldown must be limited");

    for (const bucketKey of ["ip:127.0.0.1", "ip:::ffff:127.0.0.1"]) {
      await preseedRateLimit(bucketKey, "auth.sms.send.ip", config.smsSendIpLimit);
    }
    const ipLimited = await sendSms(phones[1], deviceIds[1]);
    assert(ipLimited.status === 429, "IP SMS send rate limit must return 429");
    await query("DELETE FROM api_rate_limits WHERE route_key = 'auth.sms.send.ip'");

    await preseedRateLimit(
      smsPhoneRateLimitBucket(phones[2]),
      "auth.sms.send.phone",
      config.smsSendPhoneLimit
    );
    const phoneLimited = await sendSms(phones[2], deviceIds[2]);
    assert(phoneLimited.status === 429, "Phone-hash SMS send rate limit must return 429");
    await query("DELETE FROM api_rate_limits WHERE route_key = 'auth.sms.send.phone'");

    await preseedRateLimit(
      smsDeviceRateLimitBucket(deviceIds[3]),
      "auth.sms.send.device",
      config.smsSendDeviceLimit
    );
    const deviceLimited = await sendSms(phones[3], deviceIds[3]);
    assert(deviceLimited.status === 429, "Device-hash SMS send rate limit must return 429");
    await query("DELETE FROM api_rate_limits WHERE route_key = 'auth.sms.send.device'");

    const passwordA = password("A");
    const registered = await registerPhone(challengeA, phones[0], mockCode, passwordA);
    assert(registered.status === 200, `Phone registration failed: ${registered.status}`);
    assert(registered.body.accessToken?.split(".").length === 3, "Registration must return access JWT");
    assert(registered.body.refreshToken?.split(".").length === 3, "Registration must return refresh JWT");
    assert(registered.body.sessionToken === registered.body.accessToken, "sessionToken must equal accessToken");
    createdUserIds.push(registered.body.user.id);

    const userA = await query<{
      id: string;
      phone: string;
      identity_count: string;
      verified_count: string;
      credential_hash: string;
      consumed: boolean;
    }>(
      `
        SELECT
          users.id,
          users.phone,
          count(identity.id)::text AS identity_count,
          count(identity.id) FILTER (WHERE identity.verified_at IS NOT NULL)::text AS verified_count,
          max(credential.password_hash) AS credential_hash,
          bool_or(challenge.consumed_at IS NOT NULL) AS consumed
        FROM users
        JOIN user_auth_identities identity ON identity.user_id = users.id
        JOIN password_credentials credential ON credential.user_id = users.id
        LEFT JOIN auth_challenges challenge ON challenge.id = $2::uuid
        WHERE users.id = $1
        GROUP BY users.id, users.phone
      `,
      [registered.body.user.id, challengeA]
    );
    const accountA = userA.rows[0];
    assert(accountA.phone === phones[0], "Registered user must store normalized phone");
    assert(Number(accountA.identity_count) === 1, "Registration must create one phone identity");
    assert(Number(accountA.verified_count) === 1, "Phone identity must be verified");
    assert(accountA.credential_hash.startsWith("$argon2id$"), "Password credential must use Argon2id");
    assert(accountA.consumed === true, "Successful registration must consume challenge");

    const loginA = await passwordLogin(phones[0], passwordA);
    assert(loginA.status === 200, "Password login after registration must succeed");
    assert(loginA.body.user.id === registered.body.user.id, "Password login must return same UUID");

    const me = await apiRequest("/api/user/me", { token: registered.body.accessToken });
    assert(me.status === 200 && me.body.user.id === registered.body.user.id, "Registration access token must work with getMe");

    const consumedReuse = await registerPhone(challengeA, phones[0], mockCode, passwordA);
    assert(consumedReuse.status === 409, "Consumed challenge must not be reusable");

    const wrongSend = await sendSms(phones[4], deviceIds[4]);
    assert(wrongSend.status === 200, "Wrong-code setup SMS send must succeed");
    const wrongChallenge = recordChallenge(wrongSend);
    const wrongCode = await registerPhone(wrongChallenge, phones[4], "000000", password("wrong"));
    assert(wrongCode.status === 422, "Wrong code must return 422 before max attempts");
    const attempts = await query<{ attempt_count: number }>(
      "SELECT attempt_count FROM auth_challenges WHERE id = $1",
      [wrongChallenge]
    );
    assert(attempts.rows[0].attempt_count === 1, "Wrong code must increment attempt_count");

    const maxSend = await sendSms(phones[5], deviceIds[5]);
    assert(maxSend.status === 200, "Max-attempt setup SMS send must succeed");
    const maxChallenge = recordChallenge(maxSend);
    let maxStatus = 0;
    for (let attempt = 0; attempt < config.smsCodeMaxAttempts; attempt += 1) {
      maxStatus = (await registerPhone(maxChallenge, phones[5], "111111", password("max"))).status;
    }
    assert(maxStatus === 429, "Max wrong attempts must return 429");
    const afterMax = await registerPhone(maxChallenge, phones[5], mockCode, password("after-max"));
    assert(afterMax.status === 429, "Exhausted challenge must reject correct code");

    const expiredSend = await sendSms(phones[6], deviceIds[6]);
    assert(expiredSend.status === 200, "Expired setup SMS send must succeed");
    const expiredChallenge = recordChallenge(expiredSend);
    await query("UPDATE auth_challenges SET expires_at = now() - interval '1 second' WHERE id = $1", [
      expiredChallenge,
    ]);
    const expired = await registerPhone(expiredChallenge, phones[6], mockCode, password("expired"));
    assert(expired.status === 410, "Expired challenge must return 410");

    await query(
      "UPDATE auth_challenges SET created_at = now() - interval '2 minutes' WHERE phone_hash = $1",
      [hashSmsPhoneIdentifier(phones[0])]
    );
    const duplicateSend = await sendSms(phones[0], deviceIds[7]);
    assert(duplicateSend.status === 200, "Duplicate-registration setup SMS send must succeed");
    const duplicateChallenge = recordChallenge(duplicateSend);
    const duplicate = await registerPhone(duplicateChallenge, phones[0], mockCode, password("duplicate"));
    assert(duplicate.status === 409, "Correct code for registered phone must return 409");
    const duplicateCount = await query<{ count: string }>(
      "SELECT count(*)::text FROM user_auth_identities WHERE provider = 'phone' AND provider_subject = $1",
      [phones[0]]
    );
    assert(Number(duplicateCount.rows[0].count) === 1, "Duplicate registration must not create a second identity");

    const passwordB = password("B");
    const secondSend = await sendSms(phones[7], deviceIds[8]);
    assert(secondSend.status === 200, "Second user setup SMS send must succeed");
    const secondChallenge = recordChallenge(secondSend);
    const secondRegistration = await registerPhone(secondChallenge, phones[7], mockCode, passwordB);
    assert(secondRegistration.status === 200, "Second distinct phone registration must succeed");
    createdUserIds.push(secondRegistration.body.user.id);
    assert(secondRegistration.body.user.id !== registered.body.user.id, "Different phone users must have distinct UUIDs");

    for (const token of [registered.body.accessToken, secondRegistration.body.accessToken]) {
      const profile = await apiRequest("/api/user/profile", {
        method: "POST",
        token,
        body: {
          name: "同名短信注册测试用户",
          gender: "neutral",
          birthDate: "1990-01-01",
        },
      });
      assert(profile.status === 200, "Same-name profile save must succeed per user");
    }

    const failureSend = await sendSms(phones[8], deviceIds[9]);
    assert(failureSend.status === 200, "Transaction-failure setup SMS send must succeed");
    const failureChallenge = recordChallenge(failureSend);
    await query(`
      CREATE OR REPLACE FUNCTION sms_registration_test_fail_credential()
      RETURNS trigger AS $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM users WHERE id = NEW.user_id AND phone = '${phones[8]}'
        ) THEN
          RAISE EXCEPTION 'sms registration test credential failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await query(`
      CREATE TRIGGER sms_registration_test_fail_credential
      BEFORE INSERT ON password_credentials
      FOR EACH ROW EXECUTE FUNCTION sms_registration_test_fail_credential();
    `);
    const failedTransaction = await registerPhone(failureChallenge, phones[8], mockCode, password("fail"));
    assert(failedTransaction.status === 500, "Injected credential failure must surface as 500");
    await query("DROP TRIGGER IF EXISTS sms_registration_test_fail_credential ON password_credentials");
    await query("DROP FUNCTION IF EXISTS sms_registration_test_fail_credential()");
    const halfCreated = await query<{ users: string; identities: string; credentials: string; consumed: boolean }>(
      `
        SELECT
          (SELECT count(*)::text FROM users WHERE phone = $1) AS users,
          (SELECT count(*)::text FROM user_auth_identities WHERE provider = 'phone' AND provider_subject = $1) AS identities,
          (
            SELECT count(*)::text
            FROM password_credentials credential
            JOIN users user_account ON user_account.id = credential.user_id
            WHERE user_account.phone = $1
          ) AS credentials,
          (SELECT consumed_at IS NOT NULL FROM auth_challenges WHERE id = $2) AS consumed
      `,
      [phones[8], failureChallenge]
    );
    assert(Number(halfCreated.rows[0].users) === 0, "Failed transaction must not leave user");
    assert(Number(halfCreated.rows[0].identities) === 0, "Failed transaction must not leave identity");
    assert(Number(halfCreated.rows[0].credentials) === 0, "Failed transaction must not leave credential");
    assert(halfCreated.rows[0].consumed === false, "Failed transaction must not consume challenge");

    const audit = await query<{ leaked: string; sms_send: string; register_success: string; register_failed: string; rate_limited: string }>(
      `
        SELECT
          count(*) FILTER (
            WHERE metadata::text LIKE '%' || $2 || '%'
               OR metadata::text LIKE '%' || $3 || '%'
               OR metadata::text LIKE '%' || $4 || '%'
          )::text AS leaked,
          count(*) FILTER (WHERE event_type = 'sms_send')::text AS sms_send,
          count(*) FILTER (WHERE event_type = 'register_success')::text AS register_success,
          count(*) FILTER (WHERE event_type = 'register_failed')::text AS register_failed,
          count(*) FILTER (WHERE event_type = 'rate_limited')::text AS rate_limited
        FROM audit_events
        WHERE created_at >= $1::timestamptz
      `,
      [startedAt, phones[0], passwordA, mockCode]
    );
    assert(Number(audit.rows[0].leaked) === 0, "Audit metadata must not contain full phone, password, or code");
    assert(Number(audit.rows[0].sms_send) >= 1, "SMS send must be audited");
    assert(Number(audit.rows[0].register_success) >= 2, "Successful registrations must be audited");
    assert(Number(audit.rows[0].register_failed) >= 1, "Failed registrations must be audited");
    assert(Number(audit.rows[0].rate_limited) >= 1, "Rate limit hits must be audited");

    const challengeSecurity = await query<{ exposed_code: string; phone_hashes: string; device_hashes: string }>(
      `
        SELECT
          count(*) FILTER (WHERE code_hash = $2)::text AS exposed_code,
          count(DISTINCT phone_hash)::text AS phone_hashes,
          count(DISTINCT device_hash)::text AS device_hashes
        FROM auth_challenges
        WHERE id = ANY($1::uuid[])
      `,
      [challengeIds, mockCode]
    );
    assert(Number(challengeSecurity.rows[0].exposed_code) === 0, "Challenge code must be HMAC hashed");
    assert(Number(challengeSecurity.rows[0].phone_hashes) >= 1, "Challenges must store phone hashes");
    assert(Number(challengeSecurity.rows[0].device_hashes) >= 1, "Challenges must store device hashes");

    const rateBucketSafety = await query<{ unsafe: string; phone_buckets: string; device_buckets: string }>(
      `
        SELECT
          count(*) FILTER (WHERE bucket_key LIKE '%' || $2 || '%')::text AS unsafe,
          count(*) FILTER (WHERE route_key = 'auth.sms.send.phone' AND bucket_key LIKE 'sms-phone:%')::text AS phone_buckets,
          count(*) FILTER (WHERE route_key = 'auth.sms.send.device' AND bucket_key LIKE 'sms-device:%')::text AS device_buckets
        FROM api_rate_limits
        WHERE created_at >= $1::timestamptz
      `,
      [startedAt, phones[0]]
    );
    assert(Number(rateBucketSafety.rows[0].unsafe) === 0, "Rate-limit buckets must not contain full phone");
    assert(Number(rateBucketSafety.rows[0].phone_buckets) >= 1, "Phone rate bucket must be hashed");
    assert(Number(rateBucketSafety.rows[0].device_buckets) >= 1, "Device rate bucket must be hashed");

    console.log(JSON.stringify({
      ok: true,
      database,
      smsMode: config.smsMode,
      migration: "007_sms_auth_challenges.sql",
      send: { status: 200, exposesCode: false },
      cooldown: 429,
      rateLimits: { ip: ipLimited.status, phone: phoneLimited.status, device: deviceLimited.status },
      register: { status: registered.status, jwt: true },
      dbWrites: {
        user: true,
        verifiedPhoneIdentity: true,
        passwordCredential: "argon2id",
        consumedChallenge: true,
      },
      passwordLoginSameUser: true,
      sameNameDistinctUsers: true,
      wrongCode: 422,
      maxAttempts: 429,
      expired: 410,
      consumedReuse: 409,
      duplicateRegisteredPhone: 409,
      transactionRollback: true,
      auditLeakCount: Number(audit.rows[0].leaked),
    }, null, 2));
  } finally {
    await query("DROP TRIGGER IF EXISTS sms_registration_test_fail_credential ON password_credentials").catch(() => undefined);
    await query("DROP FUNCTION IF EXISTS sms_registration_test_fail_credential()").catch(() => undefined);
    await query(
      "DELETE FROM audit_events WHERE created_at >= $1::timestamptz AND (event_type IN ('sms_send', 'sms_failed', 'register_success', 'register_failed', 'rate_limited') OR metadata->>'phoneHash' = ANY($2::text[]))",
      [startedAt, phoneHashes]
    ).catch(() => undefined);
    await query("DELETE FROM api_rate_limits WHERE route_key LIKE 'auth.sms.%'").catch(() => undefined);
    await query(
      "DELETE FROM auth_challenges WHERE phone_hash = ANY($1::text[])",
      [phoneHashes]
    ).catch(() => undefined);
    if (createdUserIds.length) {
      await query("DELETE FROM users WHERE id = ANY($1::uuid[])", [createdUserIds]).catch(() => undefined);
    }
    await getPool().end();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
