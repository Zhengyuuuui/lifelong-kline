import type { NextFunction, Request, Response } from "express";

const isProduction = () => process.env.NODE_ENV === "production";

const buildConnectSrc = () => {
  const configured = (process.env.CLIENT_CONNECT_SRC || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const devServers = isProduction() ? [] : ["ws://localhost:*", "ws://127.0.0.1:*"];

  return ["'self'", ...configured, ...devServers].join(" ");
};

export const securityHeaders = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-DNS-Prefetch-Control", "on");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    [
      "camera=(self)",
      "microphone=()",
      "geolocation=()",
      "payment=(self)",
    ].join(", ")
  );

  if (isProduction()) {
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src " + buildConnectSrc(),
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "worker-src 'self' blob:",
    ].join("; ")
  );

  next();
};
