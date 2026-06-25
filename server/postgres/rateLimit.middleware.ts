import type { NextFunction, Request, Response } from "express";
import { query } from "./db";
import { getBackendConfig } from "./env";
import { HttpError } from "./errors";

const normalizeIp = (req: Request) => req.ip || req.socket.remoteAddress || "unknown";

const bucketWindow = (windowMs: number) => {
  const now = Date.now();
  return new Date(now - (now % windowMs)).toISOString();
};

export const createPostgresRateLimiter = (options: {
  routeKey: string;
  limit: number;
  windowMs: number;
  bucketKey?: (req: Request) => string;
  onRateLimited?: (
    req: Request,
    context: {
      bucketKey: string;
      routeKey: string;
      limit: number;
      windowMs: number;
      count: number;
    }
  ) => Promise<void>;
}) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!getBackendConfig().pgRateLimitEnabled) {
      next();
      return;
    }

    try {
      const authUserId = (req as { pgAuth?: { userId?: string } }).pgAuth?.userId;
      const bucketKey = options.bucketKey?.(req) || (
        authUserId ? `user:${authUserId}` : `ip:${normalizeIp(req)}`
      );
      const windowStart = bucketWindow(options.windowMs);
      const result = await query<{ request_count: number }>(
        `
          INSERT INTO api_rate_limits (bucket_key, route_key, window_start, request_count)
          VALUES ($1, $2, $3::timestamptz, 1)
          ON CONFLICT (bucket_key, route_key, window_start)
          DO UPDATE SET request_count = api_rate_limits.request_count + 1
          RETURNING request_count
        `,
        [bucketKey, options.routeKey, windowStart]
      );

      const count = Number(result.rows[0]?.request_count || 0);
      if (count > options.limit) {
        if (options.onRateLimited) {
          await options.onRateLimited(req, {
            bucketKey,
            routeKey: options.routeKey,
            limit: options.limit,
            windowMs: options.windowMs,
            count,
          });
        }
        throw new HttpError(429, "Too many requests", {
          route: options.routeKey,
          limit: options.limit,
          windowMs: options.windowMs,
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
