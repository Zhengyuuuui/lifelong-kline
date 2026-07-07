import { createHmac, randomInt, randomUUID } from "node:crypto";
import { getBackendConfig } from "../server/postgres/env";
import { getPool, query } from "../server/postgres/db";
import { hashSmsPhoneIdentifier } from "../server/postgres/sms.service";

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};

const ensureLocalTestDatabase = () => {
  const config = getBackendConfig();
  const databaseUrl = new URL(config.databaseUrl);
  const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  assert(config.nodeEnv !== "production", "SMS auth tests cannot run in production");
  assert(config.appEnv === "sandbox", "SMS auth tests require APP_ENV=sandbox");
  assert(localHosts.has(databaseUrl.hostname), "SMS auth tests require local Postgres");
  assert(/(?:life_kline|test)/i.test(databaseUrl.pathname), "SMS auth tests require a test database");
  assert(config.smsMode === "mock", "SMS auth tests require SMS_MODE=mock");
  assert(/^\d{6}$/.test(config.smsMockCode), "SMS auth tests require a local SMS_MOCK_CODE");
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

const sendAuthSms = (phone: string, deviceId: string) => apiRequest("/api/auth/sms/send", {
  method: "POST",
  body: { phone, purpose: "auth", deviceId },
});

const sendRegisterSms = (phone: string, deviceId: string) => apiRequest("/api/auth/sms/send", {
  method: "POST",
  body: { phone, purpose: "register", deviceId },
});

const verifyAuthSms = (challengeId: string, phone: string, code: string) =>
  apiRequest("/api/auth/sms/verify", {
    method: "POST",
    body: { challengeId, phone, code },
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

const setPassword = (token: string, newPassword: string) => apiRequest("/api/auth/password/set", {
  method: "POST",
  token,
  body: { newPassword },
});

const getMe = (token: string) => apiRequest("/api/user/me", { token });

const hmacHex = (domain: string, value: string) => {
  const config = getBackendConfig();
  return createHmac("sha256", config.smsCodeHmacSecret || config.jwtAccessSecret)
    .update(`${domain}:${value}`)
    .digest("hex");
};

const autoRegisterIpBucket = (ip: string) =>
  `sms-auth-register-ip:${hmacHex("sms-auth-register-ip:v1", ip)}`;

const autoRegisterDeviceBucket = (deviceHash: string) =>
  `sms-auth-register-device:${deviceHash}`;

const autoRegisterPhoneBucket = (phoneHash: string) =>
  `sms-auth-register-phone:${phoneHash}`;

const preseedAutoRegisterLimit = async (bucketKey: string, limit: number) => {
  await query(
    `
      INSERT INTO api_rate_limits (bucket_key, route_key, window_start, request_count)
      VALUES ($1, 'auth.sms.auto_register.daily', date_trunc('day', now()), $2)
      ON CONFLICT (bucket_key, route_key, window_start)
      DO UPDATE SET request_count = $2
    `,
    [bucketKey, limit]
  );
};

const getChallengeHashes = async (challengeId: string) => {
  const result = await query<{ phone_hash: string; device_hash: string }>(
    "SELECT phone_hash, device_hash FROM auth_challenges WHERE id = $1",
    [challengeId]
  );
  return result.rows[0];
};

const main = async () => {
  const database = ensureLocalTestDatabase();
  const config = getBackendConfig();
  const startedAt = new Date().toISOString();
  const seed = randomInt(100_000_000, 899_999_000);
  const phone = (offset: number) => `+8615${seed + offset}`;
  const device = (offset: number) => `sms-auth-device-${seed + offset}`;
  const newPassword = `SmsAuth-${randomUUID()}!`;
  const phones = Array.from({ length: 8 }, (_, index) => phone(index));
  const phoneHashes = phones.map(hashSmsPhoneIdentifier);
  const createdUserIds: string[] = [];
  const challengeIds: string[] = [];

  const recordChallenge = (response: Awaited<ReturnType<typeof sendAuthSms>>) => {
    const challengeId = String(response.body.challengeId || "");
    if (challengeId) challengeIds.push(challengeId);
    return challengeId;
  };

  try {
    await query("DELETE FROM api_rate_limits WHERE route_key LIKE 'auth.sms.%' OR route_key LIKE 'auth.password.%'");

    const health = await apiRequest("/api/health");
    assert(health.status === 200, "Expected running local server");

    const unsupportedRegion = await sendAuthSms("+15551234567", device(9));
    assert(unsupportedRegion.status === 422, "Non +86 SMS auth send must return 422");

    const firstSend = await sendAuthSms(phones[0], device(0));
    assert(firstSend.status === 200, `SMS auth send failed: ${firstSend.status}`);
    assert(firstSend.body.ok === true, "SMS auth send must return ok=true");
    assert(firstSend.body.challengeId, "SMS auth send must return challengeId");
    assert(!JSON.stringify(firstSend.body).includes(config.smsMockCode), "SMS auth send response must not expose code");
    const firstChallenge = recordChallenge(firstSend);

    const registered = await verifyAuthSms(firstChallenge, phones[0], config.smsMockCode);
    assert(registered.status === 200, `SMS auth registration failed: ${registered.status}`);
    assert(registered.body.accessToken?.split(".").length === 3, "SMS auth must return access JWT");
    assert(registered.body.refreshToken?.split(".").length === 3, "SMS auth must return refresh JWT");
    assert(registered.body.sessionToken === registered.body.accessToken, "sessionToken must equal accessToken");
    createdUserIds.push(registered.body.user.id);

    const userA = await query<{
      identity_count: string;
      credential_count: string;
      consumed: boolean;
    }>(
      `
        SELECT
          (SELECT count(*)::text FROM user_auth_identities WHERE user_id = $1 AND provider = 'phone') AS identity_count,
          (SELECT count(*)::text FROM password_credentials WHERE user_id = $1) AS credential_count,
          (SELECT consumed_at IS NOT NULL FROM auth_challenges WHERE id = $2) AS consumed
      `,
      [registered.body.user.id, firstChallenge]
    );
    assert(Number(userA.rows[0].identity_count) === 1, "SMS auth registration must create one phone identity");
    assert(Number(userA.rows[0].credential_count) === 0, "SMS auth registration must not create password credential");
    assert(userA.rows[0].consumed === true, "SMS auth success must consume challenge");

    const meWithoutPassword = await getMe(registered.body.accessToken);
    assert(meWithoutPassword.status === 200, "SMS auth token must work with getMe");
    assert(meWithoutPassword.body.accountSecurity?.hasPassword === false, "New SMS auth user must report hasPassword=false");

    const noPasswordLogin = await passwordLogin(phones[0], newPassword);
    assert(noPasswordLogin.status === 401, "Password login without credential must fail uniformly");

    const passwordSet = await setPassword(registered.body.accessToken, newPassword);
    assert(passwordSet.status === 200, "First password set must succeed");
    const secondPasswordSet = await setPassword(registered.body.accessToken, `${newPassword}x`);
    assert(secondPasswordSet.status === 409, "Second password set must return 409");
    const meWithPassword = await getMe(registered.body.accessToken);
    assert(meWithPassword.body.accountSecurity?.hasPassword === true, "User must report hasPassword=true after set");
    const passwordLoginAfterSet = await passwordLogin(phones[0], newPassword);
    assert(passwordLoginAfterSet.status === 200, "Password login must succeed after set");
    assert(passwordLoginAfterSet.body.user.id === registered.body.user.id, "Password login must return same UUID");

    await query(
      "UPDATE auth_challenges SET created_at = now() - interval '2 minutes' WHERE phone_hash = $1 AND purpose = 'auth'",
      [phoneHashes[0]]
    );
    const loginSend = await sendAuthSms(phones[0], device(1));
    assert(loginSend.status === 200, "SMS auth login setup send must succeed");
    const loginChallenge = recordChallenge(loginSend);
    const loggedIn = await verifyAuthSms(loginChallenge, phones[0], config.smsMockCode);
    assert(loggedIn.status === 200, "SMS auth login for existing phone must succeed");
    assert(loggedIn.body.user.id === registered.body.user.id, "SMS auth login must return same UUID");

    const consumedReuse = await verifyAuthSms(loginChallenge, phones[0], config.smsMockCode);
    assert(consumedReuse.status === 409, "Consumed auth challenge must not be reusable");
    const identityCount = await query<{ count: string }>(
      "SELECT count(*)::text FROM user_auth_identities WHERE provider = 'phone' AND provider_subject = $1",
      [phones[0]]
    );
    assert(Number(identityCount.rows[0].count) === 1, "SMS auth login must not duplicate identity");

    const wrongSend = await sendAuthSms(phones[1], device(2));
    assert(wrongSend.status === 200, "Wrong-code SMS auth setup send must succeed");
    const wrongChallenge = recordChallenge(wrongSend);
    const wrongCode = await verifyAuthSms(wrongChallenge, phones[1], "000000");
    assert(wrongCode.status === 422, "Wrong auth code must return 422 before max attempts");
    const attempts = await query<{ attempt_count: number }>(
      "SELECT attempt_count FROM auth_challenges WHERE id = $1",
      [wrongChallenge]
    );
    assert(attempts.rows[0].attempt_count === 1, "Wrong auth code must increment attempt_count");

    for (const ip of ["127.0.0.1", "::ffff:127.0.0.1"]) {
      await preseedAutoRegisterLimit(
        autoRegisterIpBucket(ip),
        config.smsAuthRegisterIpDailyLimit
      );
    }
    const ipLimitSend = await sendAuthSms(phones[2], device(3));
    assert(ipLimitSend.status === 200, "IP-limit setup SMS auth send must succeed");
    const ipLimitChallenge = recordChallenge(ipLimitSend);
    const ipLimited = await verifyAuthSms(ipLimitChallenge, phones[2], config.smsMockCode);
    assert(ipLimited.status === 429, "IP daily auto-register limit must return 429");
    assert(!JSON.stringify(ipLimited.body).includes(phones[2]), "IP limit response must not leak phone");

    await query(
      "UPDATE auth_challenges SET created_at = now() - interval '2 minutes' WHERE phone_hash = $1 AND purpose = 'auth'",
      [phoneHashes[0]]
    );
    const existingLoginAfterLimitSend = await sendAuthSms(phones[0], device(4));
    assert(existingLoginAfterLimitSend.status === 200, "Existing-phone login setup must not be blocked by register limit");
    const existingLoginAfterLimitChallenge = recordChallenge(existingLoginAfterLimitSend);
    const existingLoginAfterLimit = await verifyAuthSms(
      existingLoginAfterLimitChallenge,
      phones[0],
      config.smsMockCode
    );
    assert(existingLoginAfterLimit.status === 200, "Existing-phone SMS login must not consume auto-register daily limit");
    assert(existingLoginAfterLimit.body.user.id === registered.body.user.id, "Existing-phone SMS login after limit must return same UUID");

    await query("DELETE FROM api_rate_limits WHERE route_key = 'auth.sms.auto_register.daily'");

    const deviceLimitSend = await sendAuthSms(phones[3], device(5));
    assert(deviceLimitSend.status === 200, "Device-limit setup SMS auth send must succeed");
    const deviceLimitChallenge = recordChallenge(deviceLimitSend);
    const deviceHashes = await getChallengeHashes(deviceLimitChallenge);
    await preseedAutoRegisterLimit(
      autoRegisterDeviceBucket(deviceHashes.device_hash),
      config.smsAuthRegisterDeviceDailyLimit
    );
    const deviceLimited = await verifyAuthSms(deviceLimitChallenge, phones[3], config.smsMockCode);
    assert(deviceLimited.status === 429, "Device daily auto-register limit must return 429");

    await query("DELETE FROM api_rate_limits WHERE route_key = 'auth.sms.auto_register.daily'");

    const phoneLimitSend = await sendAuthSms(phones[4], device(6));
    assert(phoneLimitSend.status === 200, "Phone-limit setup SMS auth send must succeed");
    const phoneLimitChallenge = recordChallenge(phoneLimitSend);
    await preseedAutoRegisterLimit(
      autoRegisterPhoneBucket(hashSmsPhoneIdentifier(phones[4])),
      config.smsAuthRegisterPhoneDailyLimit
    );
    const phoneLimited = await verifyAuthSms(phoneLimitChallenge, phones[4], config.smsMockCode);
    assert(phoneLimited.status === 429, "Phone daily auto-register limit must return 429");

    await query("DELETE FROM api_rate_limits WHERE route_key = 'auth.sms.auto_register.daily'");

    const legacyLimitSend = await sendRegisterSms(phones[5], device(7));
    assert(legacyLimitSend.status === 200, "Legacy register limit setup SMS send must succeed");
    const legacyLimitChallenge = recordChallenge(legacyLimitSend);
    await preseedAutoRegisterLimit(
      autoRegisterPhoneBucket(hashSmsPhoneIdentifier(phones[5])),
      config.smsAuthRegisterPhoneDailyLimit
    );
    const legacyLimited = await registerPhone(
      legacyLimitChallenge,
      phones[5],
      config.smsMockCode,
      `SmsAuthLegacy-${randomUUID()}!`
    );
    assert(legacyLimited.status === 429, "Legacy register/phone must not bypass auto-register daily limit");

    const audit = await query<{
      leaked: string;
      register_success: string;
      login_success: string;
      verify_failed: string;
      register_rate_limited: string;
    }>(
      `
        SELECT
          count(*) FILTER (
            WHERE metadata::text LIKE '%' || $2 || '%'
               OR metadata::text LIKE '%' || $3 || '%'
               OR metadata::text LIKE '%' || $4 || '%'
          )::text AS leaked,
          count(*) FILTER (WHERE event_type = 'sms_auth.register_success')::text AS register_success,
          count(*) FILTER (WHERE event_type = 'sms_auth.login_success')::text AS login_success,
          count(*) FILTER (WHERE event_type = 'sms_auth.verify_failed')::text AS verify_failed,
          count(*) FILTER (WHERE event_type = 'sms_auth.register_rate_limited')::text AS register_rate_limited
        FROM audit_events
        WHERE created_at >= $1::timestamptz
      `,
      [startedAt, phones[0], newPassword, config.smsMockCode]
    );
    assert(Number(audit.rows[0].leaked) === 0, "SMS auth audit metadata must not contain full phone, password, or code");
    assert(Number(audit.rows[0].register_success) >= 1, "SMS auth register success must be audited");
    assert(Number(audit.rows[0].login_success) >= 1, "SMS auth login success must be audited");
    assert(Number(audit.rows[0].verify_failed) >= 1, "SMS auth verify failure must be audited");
    assert(Number(audit.rows[0].register_rate_limited) >= 3, "SMS auth register rate limits must be audited");

    console.log(JSON.stringify({
      ok: true,
      database,
      smsMode: config.smsMode,
      migration: "008_auth_challenge_auth_purpose.sql",
      unsupportedRegion: unsupportedRegion.status,
      registerWithSms: registered.status,
      noPasswordCredentialInitially: true,
      accountSecurity: { beforeSet: false, afterSet: true },
      setPassword: passwordSet.status,
      passwordLoginSameUser: true,
      smsLoginSameUser: true,
      consumedReuse: consumedReuse.status,
      wrongCode: wrongCode.status,
      autoRegisterDailyLimits: {
        ip: ipLimited.status,
        device: deviceLimited.status,
        phone: phoneLimited.status,
        legacyRegisterPhone: legacyLimited.status,
        existingPhoneLoginUnaffected: existingLoginAfterLimit.status,
      },
      auditLeakCount: Number(audit.rows[0].leaked),
    }, null, 2));
  } finally {
    await query(
      "DELETE FROM audit_events WHERE created_at >= $1::timestamptz AND (event_type LIKE 'sms_auth.%' OR event_type IN ('sms_send', 'sms_failed', 'rate_limited', 'auth.password.set_success') OR metadata->>'phoneHash' = ANY($2::text[]))",
      [startedAt, phoneHashes]
    ).catch(() => undefined);
    await query("DELETE FROM api_rate_limits WHERE route_key LIKE 'auth.sms.%' OR route_key LIKE 'auth.password.%' OR route_key = 'auth.sms.auto_register.daily'").catch(() => undefined);
    await query("DELETE FROM auth_challenges WHERE phone_hash = ANY($1::text[])", [phoneHashes]).catch(() => undefined);
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
