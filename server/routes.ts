import crypto from "node:crypto";
import type { Express, NextFunction, Request, Response } from "express";
import type { AppDatabase, SessionContext } from "./database";
import { AuthService, type AuthProvider as PostgresAuthProvider } from "./postgres/auth.service";
import {
  ValidationError,
  validateAuthPayload,
  validateBindingsPayload,
  validateCheckoutPayload,
  validateConfirmPayload,
  validateProfilePayload,
  validateSettingsPayload,
  validateShareCountPayload,
} from "./validation";

type AuthedRequest = Request & { auth?: SessionContext };

const SESSION_COOKIE = "life_session";

const jsonOk = (res: Response, data: object) => res.json({ ok: true, ...data });

const getIp = (req: Request) => req.ip || req.socket.remoteAddress || "";

const readCookie = (req: Request, name: string) => {
  const cookie = req.headers.cookie || "";
  const parts = cookie.split(";").map((item) => item.trim());
  const match = parts.find((item) => item.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
};

const buildSessionCookie = (token: string, expiresAt: string) => {
  const secure = process.env.NODE_ENV === "production";
  const sameSite = secure ? "None" : "Lax";
  const maxAge = Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
    `Max-Age=${maxAge}`,
    secure ? "Secure" : "",
  ].filter(Boolean).join("; ");
};

const clearSessionCookie = () => [
  `${SESSION_COOKIE}=`,
  "Path=/",
  "HttpOnly",
  "SameSite=Lax",
  "Max-Age=0",
].join("; ");

const legacyCompatEnabled = () => process.env.NODE_ENV !== "production";

const requireLegacyCompat = (_req: Request, res: Response, next: NextFunction) => {
  if (legacyCompatEnabled()) {
    next();
    return;
  }
  res.status(410).json({
    ok: false,
    error: {
      message: "Legacy compatibility API is disabled in production. Use the JWT/Postgres API.",
    },
  });
};

const requireDevelopmentPasswordless = (_req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== "production") {
    next();
    return;
  }
  res.status(410).json({
    ok: false,
    error: {
      message: "Passwordless development auth is disabled in production.",
    },
  });
};

const getBearerToken = (req: Request) => {
  const header = req.headers.authorization || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim();
};

const getToken = (req: Request) => getBearerToken(req) || readCookie(req, SESSION_COOKIE);

export const resolveAuth = (database: AppDatabase) => (
  req: AuthedRequest,
  _res: Response,
  next: NextFunction
) => {
  const token = getToken(req);
  if (token) {
    req.auth = database.findSession(token) ?? undefined;
  }
  next();
};

const requireAuth = (req: AuthedRequest, res: Response, next: NextFunction) => {
  if (!req.auth) {
    res.status(401).json({ ok: false, error: { message: "Authentication required" } });
    return;
  }
  next();
};

export const apiErrorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (error instanceof ValidationError) {
    res.status(error.statusCode).json({
      ok: false,
      error: { message: error.message, details: error.details },
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";
  const statusCode = message === "Order not found" ? 404 : 500;
  res.status(statusCode).json({
    ok: false,
    error: {
      message: process.env.NODE_ENV === "production" && statusCode >= 500
        ? "Internal server error"
        : message,
    },
  });
};

export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const configured = (process.env.CLIENT_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const developmentOrigins = process.env.NODE_ENV === "production"
    ? []
    : [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "capacitor://localhost",
        "ionic://localhost",
      ];
  const allowed = new Set([...developmentOrigins, ...configured]);

  const origin = req.headers.origin;
  if (origin && (allowed.has(origin) || process.env.NODE_ENV !== "production")) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
};

export const createRateLimiter = (limit: number, windowMs: number) => {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (req.path === "/health" || req.path === "/api/health") {
      next();
      return;
    }

    const key = req.auth?.userId || getIp(req) || "anonymous";
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > limit) {
      res.status(429).json({ ok: false, error: { message: "Too many requests" } });
      return;
    }

    next();
  };
};

export const hashSubject = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex").slice(0, 32);

export const registerBusinessRoutes = (app: Express, database: AppDatabase) => {
  const postgresAuthService = new AuthService();

  app.get("/api/health", (_req, res) => {
    jsonOk(res, {
      service: "life-kline-api",
      ...(process.env.NODE_ENV === "production" ? {} : { db: database.sqlitePath }),
      time: new Date().toISOString(),
    });
  });

  app.get("/api/session", (req: AuthedRequest, res) => {
    if (!legacyCompatEnabled()) {
      res.status(410).json({
        ok: false,
        error: { message: "Legacy session API is disabled in production. Use /api/user/me." },
      });
      return;
    }
    if (!req.auth) {
      jsonOk(res, { authenticated: false });
      return;
    }
    jsonOk(res, { authenticated: true, ...database.getUserBundle(req.auth.userId) });
  });

  app.post("/api/auth/passwordless", requireDevelopmentPasswordless, async (req, res, next) => {
    try {
      const payload = validateAuthPayload(req.body);
      const subjectSeed =
        payload.providerSubject ||
        `${payload.provider}:${payload.clientInstallationId || hashSubject(`${getIp(req)}:${req.headers["user-agent"] || ""}`)}`;
      const postgresProvider = (payload.provider === "google"
        ? "email"
        : payload.provider) as PostgresAuthProvider;

      const legacyResult = database.createOrLogin(
        {
          provider: payload.provider as "wechat" | "apple" | "google" | "phone" | "email" | "guest",
          providerSubject: subjectSeed,
          displayName: payload.displayName,
          email: payload.email,
          phone: payload.phone,
        },
        getIp(req),
        req.headers["user-agent"]
      );
      const postgresResult = await postgresAuthService.signInWithPasswordless(
        {
          provider: postgresProvider,
          providerSubject: subjectSeed,
          displayName: payload.displayName,
          email: payload.email,
          phone: payload.phone,
        },
        {
          ipAddress: getIp(req),
          userAgent: req.headers["user-agent"] || null,
        }
      );

      res.setHeader(
        "Set-Cookie",
        buildSessionCookie(legacyResult.session.token, legacyResult.session.expiresAt)
      );
      jsonOk(res, {
        ...postgresResult,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/logout", (req: AuthedRequest, res, next) => {
    if (!req.auth && getBearerToken(req)) {
      next("route");
      return;
    }
    requireAuth(req, res, next);
  }, (req: AuthedRequest, res) => {
    database.revokeSession(req.auth!.sessionId);
    res.setHeader("Set-Cookie", clearSessionCookie());
    jsonOk(res, { authenticated: false });
  });

  app.post("/api/profile", requireLegacyCompat, requireAuth, (req: AuthedRequest, res) => {
    const payload = validateProfilePayload(req.body);
    const bundle = database.saveProfile(req.auth!.userId, payload.profile, payload.bazi);
    jsonOk(res, bundle);
  });

  app.get("/api/me", requireLegacyCompat, requireAuth, (req: AuthedRequest, res) => {
    jsonOk(res, database.getUserBundle(req.auth!.userId));
  });

  app.post("/api/membership/checkout", requireLegacyCompat, requireAuth, (req: AuthedRequest, res) => {
    const { plan, provider, amountCents } = validateCheckoutPayload(req.body);
    const order = database.createOrder(req.auth!.userId, plan, provider, amountCents, req.body || {});

    if (process.env.PAYMENTS_MODE !== "live") {
      const bundle = database.markOrderPaid(req.auth!.userId, order.orderId, `mock_${order.orderId}`);
      jsonOk(res, { orderId: order.orderId, status: "paid", ...bundle });
      return;
    }

    jsonOk(res, { orderId: order.orderId, status: order.status });
  });

  app.post("/api/membership/confirm", requireLegacyCompat, requireAuth, (req: AuthedRequest, res) => {
    const payload = validateConfirmPayload(req.body);

    if (process.env.PAYMENTS_MODE === "live" && !payload.receipt) {
      res.status(422).json({
        ok: false,
        error: { message: "Live payment verification requires a provider receipt." },
      });
      return;
    }

    const bundle = database.markOrderPaid(
      req.auth!.userId,
      payload.orderId,
      payload.providerOrderId
    );
    jsonOk(res, { orderId: payload.orderId, status: "paid", ...bundle });
  });

  app.post("/api/settings", requireLegacyCompat, requireAuth, (req: AuthedRequest, res) => {
    jsonOk(res, database.saveSettings(req.auth!.userId, validateSettingsPayload(req.body)));
  });

  app.post("/api/bindings", requireLegacyCompat, requireAuth, (req: AuthedRequest, res) => {
    jsonOk(res, database.saveBindings(req.auth!.userId, validateBindingsPayload(req.body)));
  });

  app.post("/api/share-count", requireLegacyCompat, requireAuth, (req: AuthedRequest, res) => {
    jsonOk(res, database.saveShareCount(req.auth!.userId, validateShareCountPayload(req.body)));
  });

  app.delete("/api/account", requireLegacyCompat, requireAuth, (req: AuthedRequest, res) => {
    database.deleteAccount(req.auth!.userId);
    res.setHeader("Set-Cookie", clearSessionCookie());
    jsonOk(res, { authenticated: false });
  });
};
