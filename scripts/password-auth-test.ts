import { randomInt, randomUUID } from "node:crypto";
import * as argon2 from "argon2";
import { getBackendConfig } from "../server/postgres/env";
import { getPool, query, withTransaction } from "../server/postgres/db";
import {
  hashPhoneIdentifier,
  PASSWORD_HASH_OPTIONS,
  PasswordService,
} from "../server/postgres/password.service";

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};

const ensureLocalTestDatabase = () => {
  const config = getBackendConfig();
  const databaseUrl = new URL(config.databaseUrl);
  const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  assert(config.nodeEnv !== "production", "Password tests cannot run in production");
  assert(config.appEnv === "sandbox", "Password tests require APP_ENV=sandbox");
  assert(localHosts.has(databaseUrl.hostname), "Password tests require local Postgres");
  assert(/(?:life_kline|test)/i.test(databaseUrl.pathname), "Password tests require a test database");
  return `${databaseUrl.hostname}${databaseUrl.pathname}`;
};

const baseUrl = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

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
  return { status: response.status, body };
};

const login = (phone: string, password: string) => apiRequest("/api/auth/password/login", {
  method: "POST",
  body: { phone, password },
});

const main = async () => {
  const database = ensureLocalTestDatabase();
  const startedAt = new Date().toISOString();
  const seed = randomInt(1_000_000, 9_999_990);
  const phoneA = `+1555${seed}`;
  const phoneB = `+1555${seed + 1}`;
  const phoneUnknown = `+1555${seed + 2}`;
  const phoneUnverified = `+1555${seed + 3}`;
  const phoneRateLimited = `+1555${seed + 4}`;
  const passwordA = `Local-A-${randomUUID()}!`;
  const passwordB = `Local-B-${randomUUID()}!`;
  const passwordBNew = `Local-B-New-${randomUUID()}!`;
  const wrongPassword = `Wrong-${randomUUID()}!`;
  const passwordService = new PasswordService();
  const createdUserIds: string[] = [];
  const phoneHashes = [phoneA, phoneB, phoneUnknown, phoneUnverified, phoneRateLimited]
    .map(hashPhoneIdentifier);

  try {
    const health = await apiRequest("/api/health");
    assert(health.status === 200, "Expected running local server");

    const accountA = await passwordService.provisionLocalTestPhoneUser({
      phone: phoneA,
      password: passwordA,
      displayName: "同名密码测试用户",
    });
    const accountB = await passwordService.provisionLocalTestPhoneUser({
      phone: phoneB,
      password: passwordB,
      displayName: "同名密码测试用户",
    });
    createdUserIds.push(accountA.userId, accountB.userId);
    assert(accountA.userId !== accountB.userId, "Same-name phone users must have distinct UUIDs");

    const repeatedProvision = await passwordService.provisionLocalTestPhoneUser({
      phone: phoneA,
      password: passwordA,
      displayName: "另一个不参与匹配的姓名",
    });
    assert(repeatedProvision.created === false, "Repeated provisioning must be idempotent");
    assert(repeatedProvision.userId === accountA.userId, "Verified phone must retain same UUID");

    const unverifiedPasswordHash = await argon2.hash(passwordA, PASSWORD_HASH_OPTIONS);
    const unverifiedUserId = await withTransaction(async (client) => {
      const user = await client.query<{ id: string }>(
        `
          INSERT INTO users (auth_provider, phone, display_name)
          VALUES ('phone', $1, '未验证手机号测试用户')
          RETURNING id
        `,
        [phoneUnverified]
      );
      await client.query(
        `
          INSERT INTO password_credentials (user_id, password_hash, algorithm, algorithm_version)
          VALUES ($1, $2, 'argon2id', 1)
        `,
        [user.rows[0].id, unverifiedPasswordHash]
      );
      return user.rows[0].id;
    });
    createdUserIds.push(unverifiedUserId);

    const correctA = await login(phoneA, passwordA);
    assert(
      correctA.status === 200,
      `Correct password login failed with ${correctA.status}: ${correctA.body.error?.message || "unknown"}`
    );
    assert(correctA.body.user.id === accountA.userId, "Login must return provisioned UUID");
    assert(correctA.body.accessToken?.split(".").length === 3, "Login must return access JWT");
    assert(correctA.body.refreshToken?.split(".").length === 3, "Login must return refresh JWT");
    assert(correctA.body.sessionToken === correctA.body.accessToken, "sessionToken must equal accessToken");
    assert("profile" in correctA.body, "Login response must contain profile");
    assert("membership" in correctA.body, "Login response must contain membership");
    assert(Array.isArray(correctA.body.identities), "Login response must contain identities");
    assert(!JSON.stringify(correctA.body.identities).includes(phoneA), "Identity response must mask phone");

    const repeatedLogin = await login(phoneA, passwordA);
    assert(repeatedLogin.status === 200, "Repeated phone login must succeed");
    assert(repeatedLogin.body.user.id === accountA.userId, "Repeated login must return same UUID");

    const wrong = await login(phoneA, wrongPassword);
    const unknown = await login(phoneUnknown, wrongPassword);
    const unverified = await login(phoneUnverified, passwordA);
    assert(wrong.status === 401 && unknown.status === 401 && unverified.status === 401, "Invalid logins must return 401");
    assert(wrong.body.error.message === "账号或密码错误", "Wrong password response must be generic");
    assert(unknown.body.error.message === wrong.body.error.message, "Unknown account response must match wrong password");
    assert(unverified.body.error.message === wrong.body.error.message, "Unverified phone response must be generic");

    const weakHash = await argon2.hash(passwordA, {
      type: argon2.argon2id,
      memoryCost: 8_192,
      timeCost: 1,
      parallelism: 1,
      hashLength: 24,
    });
    await query("UPDATE password_credentials SET password_hash = $2 WHERE user_id = $1", [
      accountA.userId,
      weakHash,
    ]);
    const upgradedLogin = await login(phoneA, passwordA);
    assert(upgradedLogin.status === 200, "Login with an older valid hash must succeed");
    const upgradedCredential = await query<{
      password_hash: string;
      algorithm: string;
      algorithm_version: number;
    }>(
      "SELECT password_hash, algorithm, algorithm_version FROM password_credentials WHERE user_id = $1",
      [accountA.userId]
    );
    const upgraded = upgradedCredential.rows[0];
    assert(upgraded.password_hash !== weakHash, "Successful login must upgrade old hash parameters");
    assert(upgraded.password_hash.startsWith("$argon2id$"), "Password hash must use Argon2id");
    assert(upgraded.algorithm === "argon2id" && upgraded.algorithm_version === 1, "Algorithm metadata must be current");
    assert(!argon2.needsRehash(upgraded.password_hash, PASSWORD_HASH_OPTIONS), "Upgraded hash must match current parameters");

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const failed = await login(phoneA, wrongPassword);
      assert(failed.status === 401, "Failed password attempt must return 401");
    }
    const lockedLogin = await login(phoneA, passwordA);
    assert(lockedLogin.status === 401, "Locked credential must reject correct password");
    const lockState = await query<{ failed_attempts: number; locked: boolean }>(
      `
        SELECT failed_attempts, (locked_until > now()) AS locked
        FROM password_credentials
        WHERE user_id = $1
      `,
      [accountA.userId]
    );
    assert(lockState.rows[0].failed_attempts === 5, "Five failures must be recorded");
    assert(lockState.rows[0].locked === true, "Five failures must trigger temporary lock");

    const correctB = await login(phoneB, passwordB);
    assert(correctB.status === 200, "Second user login must succeed");
    const noJwtChange = await apiRequest("/api/auth/password/change", {
      method: "POST",
      body: { currentPassword: passwordB, newPassword: passwordBNew },
    });
    assert(noJwtChange.status === 401, "Password change must require JWT");
    const changed = await apiRequest("/api/auth/password/change", {
      method: "POST",
      token: correctB.body.accessToken,
      body: { currentPassword: passwordB, newPassword: passwordBNew },
    });
    assert(changed.status === 200, "Authenticated password change must succeed");

    const oldPasswordLogin = await login(phoneB, passwordB);
    const newPasswordLogin = await login(phoneB, passwordBNew);
    assert(oldPasswordLogin.status === 401, "Old password must fail after change");
    assert(newPasswordLogin.status === 200, "New password must succeed after change");

    const revokedRefresh = await apiRequest("/api/auth/refresh", {
      method: "POST",
      body: { refreshToken: correctB.body.refreshToken },
    });
    assert(revokedRefresh.status === 401, "Password change must revoke prior refresh token");
    const refreshed = await apiRequest("/api/auth/refresh", {
      method: "POST",
      body: { refreshToken: newPasswordLogin.body.refreshToken },
    });
    assert(refreshed.status === 200, "Refresh must work for session created after password change");
    const getMe = await apiRequest("/api/user/me", { token: refreshed.body.accessToken });
    assert(getMe.status === 200 && getMe.body.user.id === accountB.userId, "Refreshed access token must work with getMe");
    const logout = await apiRequest("/api/auth/logout", {
      method: "POST",
      token: refreshed.body.accessToken,
      body: { refreshToken: refreshed.body.refreshToken },
    });
    assert(logout.status === 200, "Logout must succeed");
    const refreshAfterLogout = await apiRequest("/api/auth/refresh", {
      method: "POST",
      body: { refreshToken: refreshed.body.refreshToken },
    });
    assert(refreshAfterLogout.status === 401, "Logged-out refresh token must be rejected");

    let rateLimitedStatus = 0;
    for (let attempt = 0; attempt < 11; attempt += 1) {
      const response = await login(phoneRateLimited, wrongPassword);
      rateLimitedStatus = response.status;
    }
    assert(rateLimitedStatus === 429, "Phone-hash rate limit must return 429");

    const registerAttempt = await apiRequest("/api/auth/password/register", {
      method: "POST",
      body: { phone: phoneUnknown, password: wrongPassword },
    });
    assert(registerAttempt.status === 404, "Public password registration route must not exist");

    const securityAudit = await query<{
      leaked_phone_or_password: number;
      login_success: number;
      login_failed: number;
      locked: number;
      password_changed: number;
    }>(
      `
        SELECT
          count(*) FILTER (
            WHERE metadata::text LIKE '%' || $2 || '%'
               OR metadata::text LIKE '%' || $3 || '%'
               OR metadata::text LIKE '%' || $4 || '%'
          )::int AS leaked_phone_or_password,
          count(*) FILTER (WHERE event_type = 'auth.password.login_success')::int AS login_success,
          count(*) FILTER (WHERE event_type = 'auth.password.login_failed')::int AS login_failed,
          count(*) FILTER (WHERE event_type = 'auth.password.locked')::int AS locked,
          count(*) FILTER (WHERE event_type = 'auth.password.password_changed')::int AS password_changed
        FROM audit_events
        WHERE created_at >= $1::timestamptz
      `,
      [startedAt, phoneA, passwordA, upgraded.password_hash]
    );
    const audit = securityAudit.rows[0];
    assert(audit.leaked_phone_or_password === 0, "Audit metadata must not contain phone, password, or password hash");
    assert(audit.login_success >= 4, "Successful password logins must be audited");
    assert(audit.login_failed >= 1, "Failed password logins must be audited");
    assert(audit.locked >= 1, "Credential lock must be audited");
    assert(audit.password_changed === 1, "Password change must be audited once");

    const rateBuckets = await query<{ unsafe_bucket: number; phone_buckets: number }>(
      `
        SELECT
          count(*) FILTER (WHERE bucket_key LIKE '%' || $2 || '%')::int AS unsafe_bucket,
          count(*) FILTER (
            WHERE route_key = 'auth.password.login.phone' AND bucket_key LIKE 'phone:%'
          )::int AS phone_buckets
        FROM api_rate_limits
        WHERE created_at >= $1::timestamptz
      `,
      [startedAt, phoneA]
    );
    assert(rateBuckets.rows[0].unsafe_bucket === 0, "Rate-limit keys must not contain full phone");
    assert(rateBuckets.rows[0].phone_buckets >= 1, "Phone-hash rate-limit bucket must be stored");

    console.log(JSON.stringify({
      ok: true,
      database,
      dependency: { name: "argon2", algorithm: "argon2id" },
      correctLogin: 200,
      genericFailures: { wrongPassword: 401, unknownPhone: 401, unverifiedPhone: 401 },
      samePhoneSameUser: true,
      sameNameDistinctUsers: true,
      hashParameterUpgrade: true,
      lock: { failedAttempts: 5, locked: true },
      phoneHashRateLimit: 429,
      passwordChange: 200,
      oldPasswordAfterChange: 401,
      refreshAfterChange: 401,
      refreshAndLogout: true,
      publicRegisterRoute: 404,
      auditLeakCount: 0,
    }, null, 2));
  } finally {
    await query(
      `
        DELETE FROM audit_events
        WHERE user_id = ANY($1::uuid[])
           OR metadata->>'phoneHash' = ANY($2::text[])
      `,
      [createdUserIds, phoneHashes]
    );
    await query(
      `
        DELETE FROM api_rate_limits
        WHERE created_at >= $1::timestamptz
          AND route_key LIKE 'auth.password.%'
      `,
      [startedAt]
    );
    if (createdUserIds.length) {
      await query("DELETE FROM users WHERE id = ANY($1::uuid[])", [createdUserIds]);
    }
    await getPool().end();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
