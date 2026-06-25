import type { NextFunction, Request, Response } from "express";
import { AuthService } from "./auth.service";
import { HttpError } from "./errors";

export interface PgAuthContext {
  userId: string;
  tokenId: string;
}

export type PgAuthedRequest = Request & {
  pgAuth?: PgAuthContext;
};

const authService = new AuthService();

export const getBearerToken = (req: Request) => {
  const header = req.headers.authorization || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim();
};

export const optionalPostgresAuth = async (
  req: PgAuthedRequest,
  _res: Response,
  next: NextFunction
) => {
  const token = getBearerToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const verified = await authService.verifyAccessToken(token);
    req.pgAuth = { userId: verified.userId, tokenId: verified.jti };
    next();
  } catch {
    next();
  }
};

export const requirePostgresAuth = async (
  req: PgAuthedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = getBearerToken(req);
    if (!token) throw new HttpError(401, "Authentication required");
    const verified = await authService.verifyAccessToken(token);
    req.pgAuth = { userId: verified.userId, tokenId: verified.jti };
    next();
  } catch (error) {
    next(error);
  }
};
