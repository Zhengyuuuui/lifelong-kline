// server.ts or server/gemini.ts
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dns from "dns";
import crypto from "node:crypto";
import {
  buildLegacyPromptFromContents,
  callAiProvider,
  getAiProviderRuntimeConfig,
  getProviderModelLabel,
  isAiProviderConfigured,
  toAiProviderStatus,
} from "./server/aiProvider";
import { createDatabase } from "./server/database";
import {
  apiErrorHandler,
  corsMiddleware,
  createRateLimiter,
  registerBusinessRoutes,
  resolveAuth,
} from "./server/routes";
import { securityHeaders } from "./server/security";
import { postgresApiErrorHandler, registerPostgresApiRoutes } from "./server/postgres";
import { getBackendConfig } from "./server/postgres/env";

dns.setDefaultResultOrder("ipv4first");

async function startServer() {
  const app = express();
  getBackendConfig();
  const PORT = Number(process.env.PORT || 3000);
  const HOST = process.env.HOST || (process.env.NODE_ENV === "production" ? "127.0.0.1" : "0.0.0.0");
  const database = createDatabase();
  const anonymousAiUsage = new Map<string, { count: number; resetAt: number }>();
  const AI_WINDOW_MS = 24 * 60 * 60 * 1000;
  const ANON_AI_DAILY_LIMIT = Number(process.env.AI_ANON_DAILY_LIMIT || 4);
  const FREE_AI_DAILY_LIMIT = Number(process.env.AI_FREE_DAILY_LIMIT || 20);
  const MEMBER_AI_DAILY_LIMIT = Number(process.env.AI_MEMBER_DAILY_LIMIT || 500);
  const legacyAiProxyEnabled =
    process.env.NODE_ENV !== "production" && process.env.ENABLE_LEGACY_AI_PROXY === "true";

  const trustProxy = String(process.env.TRUST_PROXY || "").trim();
  if (["1", "true", "yes", "on"].includes(trustProxy.toLowerCase())) {
    app.set("trust proxy", "loopback");
  } else if (trustProxy && !["0", "false", "no", "off"].includes(trustProxy.toLowerCase())) {
    app.set("trust proxy", trustProxy);
  }

  const getIp = (req: express.Request) => req.ip || req.socket.remoteAddress || "";

  const getAuthUserId = (req: express.Request) => (req as any).auth?.userId as string | undefined;

  const consumeAiBudget = (req: express.Request, res: express.Response) => {
    const userId = getAuthUserId(req);
    const now = Date.now();

    if (!userId) {
      if (process.env.AI_REQUIRE_AUTH === "true") {
        res.status(401).json({ ok: false, error: { message: "Login required for AI features." } });
        return false;
      }

      const key = getIp(req) || "anonymous";
      const bucket = anonymousAiUsage.get(key);
      if (!bucket || bucket.resetAt <= now) {
        anonymousAiUsage.set(key, { count: 1, resetAt: now + AI_WINDOW_MS });
        return true;
      }

      bucket.count += 1;
      if (bucket.count > ANON_AI_DAILY_LIMIT) {
        res.status(429).json({
          ok: false,
          error: { message: "Anonymous AI preview quota reached. Please log in or upgrade." },
        });
        return false;
      }
      return true;
    }

    const sinceIso = new Date(now - AI_WINDOW_MS).toISOString();
    const isMember = database.hasActiveMembership(userId);
    const dailyLimit = isMember ? MEMBER_AI_DAILY_LIMIT : FREE_AI_DAILY_LIMIT;
    const used = database.countAiRequests(userId, sinceIso);

    if (used >= dailyLimit) {
      res.status(429).json({
        ok: false,
        error: {
          message: isMember
            ? "Member AI daily quota reached. Please try again tomorrow."
            : "Free AI daily quota reached. Upgrade to continue.",
          quota: { used, dailyLimit, isMember },
        },
      });
      return false;
    }

    return true;
  };

  app.disable("x-powered-by");
  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(express.json({ limit: "20mb" }));
  app.use(resolveAuth(database));
  app.use("/api", createRateLimiter(Number(process.env.API_RATE_LIMIT || 240), 60_000));
  registerBusinessRoutes(app, database);
  registerPostgresApiRoutes(app);

  const aiProviderConfig = getAiProviderRuntimeConfig();
  if (!isAiProviderConfigured(aiProviderConfig)) {
    console.warn(
      `[Server] AI provider is not configured. provider=${aiProviderConfig.provider} model=${aiProviderConfig.model}`
    );
  }

  // 1. API Route for standard model generation proxy
  app.post("/api/gemini/generateContent", async (req, res) => {
    if (!legacyAiProxyEnabled) {
      res.status(410).json({
        ok: false,
        error: {
          message: "Legacy Gemini proxy is disabled in production. Use /api/ai/generate.",
        },
      });
      return;
    }

    const startedAt = Date.now();
    const { model, contents, config } = req.body;
    const primaryModel = model || "gemini-3.5-flash";
    const promptHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(contents ?? ""))
      .digest("hex");

    if (!isAiProviderConfigured(aiProviderConfig)) {
      database.logAiRequest({
        userId: getAuthUserId(req) ?? null,
        route: "gemini.generateContent",
        model: getProviderModelLabel(aiProviderConfig),
        promptHash,
        statusCode: 503,
        latencyMs: Date.now() - startedAt,
        errorMessage: "AI provider key is not configured",
      });
      res.status(503).json({
        ok: false,
        error: { message: "AI provider is not configured on the server." },
      });
      return;
    }

    if (!consumeAiBudget(req, res)) {
      database.logAiRequest({
        userId: getAuthUserId(req) ?? null,
        route: "gemini.generateContent",
        model: primaryModel,
        promptHash,
        statusCode: res.statusCode,
        latencyMs: Date.now() - startedAt,
        errorMessage: "AI quota rejected",
      });
      return;
    }

    try {
      const response = await callAiProvider({
        prompt: buildLegacyPromptFromContents(contents),
        responseFormat: String(config?.responseMimeType || "").toLowerCase().includes("json") || config?.responseSchema
          ? "json"
          : "text",
        responseSchema: config?.responseSchema,
        requestedModel: primaryModel,
        nativeContents: contents,
        nativeConfig: config,
        route: "gemini.generateContent",
      }, aiProviderConfig);

      database.logAiRequest({
        userId: (req as any).auth?.userId ?? null,
        route: "gemini.generateContent",
        model: getProviderModelLabel(response),
        promptHash,
        statusCode: 200,
        latencyMs: Date.now() - startedAt,
      });
      
      res.json({
        text: response.text,
        provider: response.provider,
        model: response.model,
      });
    } catch (error: any) {
      const statusCode = toAiProviderStatus(error);

      if (statusCode === 429 || statusCode === 403) {
         console.log(`ℹ️ Rate regulation matched (${statusCode}). Re-routing...`);
      } else {
         console.log("[Info] Proxy handled status code:", statusCode);
      }

      database.logAiRequest({
        userId: (req as any).auth?.userId ?? null,
        route: "gemini.generateContent",
        model: getProviderModelLabel(aiProviderConfig),
        promptHash,
        statusCode,
        latencyMs: Date.now() - startedAt,
        errorMessage: error.message || "AI provider proxy error",
      });

      res.status(statusCode).json({
        error: {
          message: error.message || "An error occurred with the AI provider proxy on the server.",
          code: error.code || statusCode,
          status: error.statusText || error.status || "PROXY_ERROR"
        }
      });
    }
  });

  // 2. API Route for streaming model generation proxy (Server-Sent Events / SSE)
  app.post("/api/gemini/generateContentStream", async (req, res) => {
    if (!legacyAiProxyEnabled) {
      res.status(410).json({
        ok: false,
        error: {
          message: "Legacy Gemini streaming proxy is disabled in production. Use /api/ai/generate.",
        },
      });
      return;
    }

    const startedAt = Date.now();
    const { model, contents, config } = req.body;
    const primaryModel = model || "gemini-3.5-flash";
    const promptHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(contents ?? ""))
      .digest("hex");

    if (!isAiProviderConfigured(aiProviderConfig)) {
      database.logAiRequest({
        userId: getAuthUserId(req) ?? null,
        route: "gemini.generateContentStream",
        model: getProviderModelLabel(aiProviderConfig),
        promptHash,
        statusCode: 503,
        latencyMs: Date.now() - startedAt,
        errorMessage: "AI provider key is not configured",
      });
      res.status(503).json({
        ok: false,
        error: { message: "AI provider is not configured on the server." },
      });
      return;
    }

    if (!consumeAiBudget(req, res)) {
      database.logAiRequest({
        userId: getAuthUserId(req) ?? null,
        route: "gemini.generateContentStream",
        model: primaryModel,
        promptHash,
        statusCode: res.statusCode,
        latencyMs: Date.now() - startedAt,
        errorMessage: "AI quota rejected",
      });
      return;
    }

    try {
      const response = await callAiProvider({
        prompt: buildLegacyPromptFromContents(contents),
        responseFormat: String(config?.responseMimeType || "").toLowerCase().includes("json") || config?.responseSchema
          ? "json"
          : "text",
        responseSchema: config?.responseSchema,
        requestedModel: primaryModel,
        nativeContents: contents,
        nativeConfig: config,
        route: "gemini.generateContentStream",
      }, aiProviderConfig);
      
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(`data: ${JSON.stringify({ text: response.text })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();

      database.logAiRequest({
        userId: (req as any).auth?.userId ?? null,
        route: "gemini.generateContentStream",
        model: getProviderModelLabel(response),
        promptHash,
        statusCode: 200,
        latencyMs: Date.now() - startedAt,
      });
    } catch (error: any) {
      const statusCode = toAiProviderStatus(error);
      console.log("[Info] Stream proxy encountered interruption status:", error?.message || error);
      database.logAiRequest({
        userId: (req as any).auth?.userId ?? null,
        route: "gemini.generateContentStream",
        model: getProviderModelLabel(aiProviderConfig),
        promptHash,
        statusCode,
        latencyMs: Date.now() - startedAt,
        errorMessage: error.message || "AI streaming proxy error",
      });
      res.write(`data: ${JSON.stringify({ error: error.message || "Streaming Proxy Error" })}\n\n`);
      res.end();
    }
  });

  app.use("/api", postgresApiErrorHandler);
  app.use("/api", apiErrorHandler);

  // 3. Vite development vs Production asset serving middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`🚀 Full-stack Destiny Server running on http://${HOST}:${PORT}`);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Server] SQLite database ready at ${database.sqlitePath}`);
    }
  });
}

startServer().catch((err) => {
  console.error("Failed to start full-stack server:", err);
  process.exitCode = 1;
});
