import { rmSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const PORT = 3901;
const baseUrl = `http://127.0.0.1:${PORT}`;
const sqlitePath = path.join(process.cwd(), "tmp", "api-smoke.sqlite");

rmSync(sqlitePath, { force: true });

const server = spawn("npm", ["run", "dev"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(PORT),
    SQLITE_PATH: sqlitePath,
    GEMINI_API_KEY: "",
    API_KEY: "",
    API_RATE_LIMIT: "1000",
    ENABLE_LEGACY_AI_PROXY: "true",
    PAYMENTS_MODE: "mock",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
server.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForHealth = async () => {
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return response;
    } catch {
      // Server is still booting.
    }
    await sleep(250);
  }
  throw new Error(`Server did not become healthy.\n${output}`);
};

const json = async (pathName: string, init: RequestInit = {}) => {
  const response = await fetch(`${baseUrl}${pathName}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
};

try {
  const health = await waitForHealth();
  assert(health.headers.get("x-content-type-options") === "nosniff", "security header missing");

  const badLogin = await json("/api/auth/passwordless", {
    method: "POST",
    body: JSON.stringify({ provider: "unknown" }),
  });
  assert(badLogin.response.status === 422, "invalid login provider should be rejected");

  const login = await json("/api/auth/passwordless", {
    method: "POST",
    body: JSON.stringify({
      provider: "apple",
      clientInstallationId: "api-smoke-client",
      displayName: "API Smoke",
    }),
  });
  assert(login.payload.authenticated === true, "login failed");
  const token = String(login.payload.sessionToken);
  assert(token.length > 20, "session token missing");

  const authHeaders = { Authorization: `Bearer ${token}` };

  const invalidProfile = await json("/api/profile", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      profile: { name: "", gender: "secret", birthDate: "bad", birthTime: "99:99", birthPlace: "" },
    }),
  });
  assert(invalidProfile.response.status === 422, "invalid profile should be rejected");

  const profile = await json("/api/profile", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      profile: {
        name: "测试用户",
        gender: "male",
        birthDate: "1990-01-01",
        birthTime: "12:00",
        birthPlace: "上海",
      },
      bazi: {
        age: 36,
        epoch_label: "测试",
        hexagram_main: "乾",
        wuxing_tendency: "平衡",
        useful_elements: ["水"],
        avoid_elements: ["火"],
        luck_cycle: "测试",
      },
    }),
  });
  assert(profile.payload.profile?.name === "测试用户", "profile save failed");

  const badCheckout = await json("/api/membership/checkout", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ provider: "cash", plan: "lifetime", amountCents: 1880 }),
  });
  assert(badCheckout.response.status === 422, "invalid checkout should be rejected");

  const checkout = await json("/api/membership/checkout", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ provider: "apple", plan: "lifetime", amountCents: 1880 }),
  });
  assert(checkout.payload.status === "paid", "checkout did not complete in mock mode");

  const session = await json("/api/session", { headers: authHeaders });
  assert(session.payload.membership?.status === "active", "membership not restored");

  const ai = await json("/api/gemini/generateContent", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ model: "gemini-3.5-flash", contents: "hello" }),
  });
  assert(ai.response.status === 503, "AI should fail fast when key is not configured");

  const deleted = await json("/api/account", {
    method: "DELETE",
    headers: authHeaders,
  });
  assert(deleted.payload.authenticated === false, "account delete failed");

  console.log(JSON.stringify({ ok: true, baseUrl, sqlitePath }, null, 2));
} finally {
  server.kill("SIGTERM");
  setTimeout(() => server.kill("SIGKILL"), 1500).unref();
}
