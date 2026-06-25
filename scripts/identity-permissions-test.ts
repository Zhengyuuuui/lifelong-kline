import { randomUUID } from "node:crypto";
import { AuthService } from "../server/postgres/auth.service";
import { getPool, query } from "../server/postgres/db";
import { getBackendConfig } from "../server/postgres/env";
import { HttpError } from "../server/postgres/errors";

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};

const assertHttpError = async (operation: () => Promise<unknown>, statusCode: number) => {
  try {
    await operation();
  } catch (error) {
    assert(error instanceof HttpError, "Expected HttpError");
    assert(error.statusCode === statusCode, `Expected ${statusCode}, received ${error.statusCode}`);
    return;
  }
  throw new Error(`Expected operation to fail with ${statusCode}`);
};

const ensureLocalTestDatabase = () => {
  const databaseUrl = new URL(getBackendConfig().databaseUrl);
  const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
  assert(localHosts.has(databaseUrl.hostname), "Identity tests require a local Postgres host");
  assert(
    /(?:life_kline|test)/i.test(databaseUrl.pathname),
    "Identity tests require the local life_kline or an explicitly named test database"
  );
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

const main = async () => {
  const database = ensureLocalTestDatabase();
  const runId = randomUUID().replace(/-/g, "").slice(0, 12);
  const authService = new AuthService();
  const createdUserIds: string[] = [];
  const result: Record<string, unknown> = { database, baseUrl };

  try {
    const health = await apiRequest("/api/health");
    assert(health.status === 200, `Expected running test server, received ${health.status}`);

    const loginA = await authService.signInWithPasswordless(
      {
        provider: "email",
        providerSubject: `identity-a-${runId}@test.invalid`,
        displayName: "同名身份测试用户",
      },
      { userAgent: "identity-permissions-test" }
    );
    const loginB = await authService.signInWithPasswordless(
      {
        provider: "email",
        providerSubject: `identity-b-${runId}@test.invalid`,
        displayName: "同名身份测试用户",
      },
      { userAgent: "identity-permissions-test" }
    );
    createdUserIds.push(loginA.user.id, loginB.user.id);
    assert(loginA.user.id !== loginB.user.id, "Same-name users must have distinct UUIDs");

    const repeatedLogin = await authService.signInWithPasswordless(
      {
        provider: "email",
        providerSubject: `identity-a-${runId}@test.invalid`,
        displayName: "同名身份测试用户",
      },
      { userAgent: "identity-permissions-test" }
    );
    assert(repeatedLogin.user.id === loginA.user.id, "Repeated identity login must return same UUID");

    const phoneSubject = `+1555${runId.slice(0, 7)}`;
    const phoneIdentity = await authService.bindVerifiedIdentity(loginA.user.id, {
      provider: "phone",
      providerSubject: phoneSubject,
      verifiedAt: new Date().toISOString(),
      verificationSource: "local_test",
      phone: phoneSubject,
    });
    await authService.bindVerifiedIdentity(loginA.user.id, {
      provider: "phone",
      providerSubject: phoneSubject,
      verifiedAt: new Date().toISOString(),
      verificationSource: "local_test",
      phone: phoneSubject,
    });
    const aIdentities = await authService.listIdentities(loginA.user.id);
    assert(aIdentities.length === 2, "Same-user repeated binding must be idempotent");

    await assertHttpError(
      () => authService.bindVerifiedIdentity(loginB.user.id, {
        provider: "phone",
        providerSubject: phoneSubject,
        verifiedAt: new Date().toISOString(),
        verificationSource: "local_test",
        phone: phoneSubject,
      }),
      409
    );
    const bIdentities = await authService.listIdentities(loginB.user.id);
    await assertHttpError(
      () => authService.unbindIdentity(loginB.user.id, bIdentities[0].id),
      409
    );

    const identitiesResponse = await apiRequest("/api/user/identities", {
      token: loginA.accessToken,
    });
    assert(identitiesResponse.status === 200, "Authenticated identities request must succeed");
    assert(identitiesResponse.body.identities.length === 2, "Identities response must include both bindings");
    const serializedIdentities = JSON.stringify(identitiesResponse.body.identities);
    assert(!serializedIdentities.includes(phoneSubject), "Identities response must mask provider subject");
    assert(!serializedIdentities.includes("providerSubject"), "Identities response must omit providerSubject");
    assert(!serializedIdentities.includes("rawClaims"), "Identities response must omit raw claims");

    const meResponse = await apiRequest("/api/user/me", { token: loginA.accessToken });
    assert(meResponse.status === 200, "Authenticated /api/user/me must succeed");
    assert(meResponse.body.identities.length === 2, "/api/user/me must include identities");
    assert(!("openid" in meResponse.body.user), "/api/user/me must not expose openid");
    assert(!("unionid" in meResponse.body.user), "/api/user/me must not expose unionid");
    assert(!("appleSub" in meResponse.body.user), "/api/user/me must not expose Apple subject");
    const historyResponse = await apiRequest("/api/ai/history", {
      token: loginA.accessToken,
    });
    assert(historyResponse.status === 200, "Authenticated AI history request must succeed");

    const profileB = await apiRequest("/api/user/profile", {
      method: "POST",
      token: loginB.accessToken,
      body: {
        name: "B档案",
        gender: "neutral",
        birthDate: "1992-02-02",
      },
    });
    assert(profileB.status === 200, "User B profile creation must succeed");
    const profileA = await apiRequest("/api/user/profile", {
      method: "POST",
      token: loginA.accessToken,
      body: {
        userId: loginB.user.id,
        name: "A档案",
        gender: "neutral",
        birthDate: "1991-01-01",
      },
    });
    assert(profileA.status === 200, "User A profile creation must succeed");
    assert(profileA.body.profile.userId === loginA.user.id, "Profile owner must come from JWT");

    const profileRows = await query<{ user_id: string; name: string }>(
      "SELECT user_id, name FROM user_profiles WHERE user_id = ANY($1::uuid[]) ORDER BY user_id",
      [[loginA.user.id, loginB.user.id]]
    );
    const namesByUser = new Map(profileRows.rows.map((row) => [row.user_id, row.name]));
    assert(namesByUser.get(loginA.user.id) === "A档案", "User A must only update own profile");
    assert(namesByUser.get(loginB.user.id) === "B档案", "User B profile must remain unchanged");
    const aReadsProfile = await apiRequest(`/api/user/profile?userId=${loginB.user.id}`, {
      token: loginA.accessToken,
    });
    assert(aReadsProfile.body.profile.user_id === loginA.user.id, "Profile reads must ignore foreign userId");

    const createOrder = await apiRequest("/api/payment/xunhupay/create", {
      method: "POST",
      token: loginA.accessToken,
      body: { productId: "life_kline_lifetime" },
    });
    assert(createOrder.status === 200, `Authenticated payment create failed: ${createOrder.status}`);
    const orderId = String(createOrder.body.orderId || "");
    assert(orderId, "Payment create must return orderId");
    const ownOrder = await apiRequest(`/api/payment/orders/${orderId}/status`, {
      token: loginA.accessToken,
    });
    const foreignOrder = await apiRequest(`/api/payment/orders/${orderId}/status`, {
      token: loginB.accessToken,
    });
    assert(ownOrder.status === 200, "Order owner must be able to read order");
    assert(foreignOrder.status === 404, "Another user must receive 404 for the order");

    const unauthenticatedMatrix = [
      ["GET", "/api/user/me"],
      ["GET", "/api/user/profile"],
      ["POST", "/api/user/profile"],
      ["POST", "/api/user/settings"],
      ["POST", "/api/user/bindings"],
      ["GET", "/api/user/identities"],
      ["DELETE", "/api/user/account"],
      ["POST", "/api/ai/generate"],
      ["GET", "/api/ai/history"],
      ["POST", "/api/payment/xunhupay/create"],
      ["GET", `/api/payment/orders/${randomUUID()}/status`],
      ["POST", "/api/membership/checkout"],
    ] as const;
    const unauthenticatedStatuses: Record<string, number> = {};
    for (const [method, path] of unauthenticatedMatrix) {
      const response = await apiRequest(path, {
        method,
        body: method === "POST" ? {} : undefined,
      });
      unauthenticatedStatuses[`${method} ${path}`] = response.status;
      assert(response.status === 401, `${method} ${path} must return 401 without JWT`);
    }

    await authService.unbindIdentity(loginA.user.id, phoneIdentity.id);
    const remainingAIdentities = await authService.listIdentities(loginA.user.id);
    assert(remainingAIdentities.length === 1, "Non-final identity must be revocable");
    const audit = await query<{ event_type: string; count: number }>(
      `
        SELECT event_type, count(*)::int AS count
        FROM audit_events
        WHERE user_id = $1 AND event_type IN ('auth.identity_bound', 'auth.identity_unbound')
        GROUP BY event_type
      `,
      [loginA.user.id]
    );
    const auditCounts = new Map(
      audit.rows.map((row) => [row.event_type, Number(row.count)])
    );
    assert(auditCounts.get("auth.identity_bound") === 2, "Both verified identity bindings must be audited");
    assert(auditCounts.get("auth.identity_unbound") === 1, "Identity unbind must be audited once");

    const deleteAccount = await apiRequest("/api/user/account", {
      method: "DELETE",
      token: loginB.accessToken,
    });
    assert(deleteAccount.status === 200, "Authenticated account deletion must succeed");
    const deletedState = await query<{
      user_status: string;
      deleted_at: string | null;
      identity_status: string;
      is_primary: boolean;
      revoked_at: string | null;
      active_refresh_tokens: number;
      identity_revoked_events: number;
    }>(
      `
        SELECT
          u.status AS user_status,
          u.deleted_at::text,
          i.status AS identity_status,
          i.is_primary,
          i.revoked_at::text,
          (
            SELECT count(*)::int
            FROM refresh_tokens token
            WHERE token.user_id = u.id AND token.revoked_at IS NULL
          ) AS active_refresh_tokens,
          (
            SELECT count(*)::int
            FROM audit_events event
            WHERE event.user_id = u.id AND event.event_type = 'auth.identity_revoked'
          ) AS identity_revoked_events
        FROM users u
        JOIN user_auth_identities i ON i.user_id = u.id
        WHERE u.id = $1
      `,
      [loginB.user.id]
    );
    const deleted = deletedState.rows[0];
    assert(deleted.user_status === "deleted" && Boolean(deleted.deleted_at), "User must be soft deleted");
    assert(deleted.identity_status === "revoked", "Deleted user's identity must be revoked");
    assert(deleted.is_primary === false, "Revoked identity must not remain primary");
    assert(Boolean(deleted.revoked_at), "Revoked identity must have revoked_at");
    assert(Number(deleted.active_refresh_tokens) === 0, "All refresh tokens must be revoked");
    assert(Number(deleted.identity_revoked_events) === 1, "Identity revocation must be audited");

    const deletedAccess = await apiRequest("/api/user/me", { token: loginB.accessToken });
    const deletedPayment = await apiRequest("/api/payment/xunhupay/create", {
      method: "POST",
      token: loginB.accessToken,
      body: { productId: "life_kline_lifetime" },
    });
    const deletedRefresh = await apiRequest("/api/auth/refresh", {
      method: "POST",
      body: { refreshToken: loginB.refreshToken },
    });
    assert(deletedAccess.status === 401, "Deleted user's access JWT must be rejected");
    assert(deletedPayment.status === 401, "Deleted user's access JWT must not create payment orders");
    assert(deletedRefresh.status === 401, "Deleted user's refresh token must be rejected");
    await assertHttpError(
      () => authService.signInWithPasswordless(
        {
          provider: "email",
          providerSubject: `identity-b-${runId}@test.invalid`,
          displayName: "同名身份测试用户",
        },
        { userAgent: "identity-permissions-test" }
      ),
      403
    );

    result.sameNameDistinctUsers = true;
    result.repeatedIdentitySameUser = true;
    result.multipleIdentities = 2;
    result.crossUserIdentityConflict = 409;
    result.lastIdentityUnbind = 409;
    result.maskedIdentityResponse = true;
    result.profileOwnership = true;
    result.orderOwnership = { owner: 200, otherUser: 404 };
    result.unauthenticatedStatuses = unauthenticatedStatuses;
    result.identityAuditEvents = {
      bound: auditCounts.get("auth.identity_bound"),
      unbound: auditCounts.get("auth.identity_unbound"),
    };
    result.accountDeletion = {
      userStatus: "deleted",
      identityStatus: "revoked",
      primary: false,
      refreshTokensActive: 0,
      oldAccessJwt: 401,
      oldRefreshToken: 401,
      repeatedProviderLogin: 403,
      identityRevokedAudit: 1,
    };
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  } finally {
    if (createdUserIds.length) {
      await query("DELETE FROM audit_events WHERE user_id = ANY($1::uuid[])", [createdUserIds]);
      await query("DELETE FROM users WHERE id = ANY($1::uuid[])", [createdUserIds]);
    }
    await getPool().end();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
