import type { Express, NextFunction, Request, Response } from "express";
import { createAiRouter } from "./ai.controller";
import { createAuthRouter } from "./auth.controller";
import { createPostgresHealthRouter } from "./health.controller";
import { createPaymentRouter } from "./payment.controller";
import { createUserRouter } from "./user.controller";
import { createWebhookRouter } from "./webhook.controller";
import { createXunhupayRouter } from "./xunhupay.controller";
import { HttpError, toPublicError } from "./errors";

export const registerPostgresApiRoutes = (app: Express) => {
  app.use("/api/auth", createAuthRouter());
  app.use("/api/user", createUserRouter());
  app.use("/api/ai", createAiRouter());
  app.use("/api/payment", createXunhupayRouter());
  app.use("/api/payment", createPaymentRouter());
  app.use("/api/postgres", createPostgresHealthRouter());
  app.use("/api/webhooks", createWebhookRouter());
};

export const postgresApiErrorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!(error instanceof HttpError)) {
    next(error);
    return;
  }

  const publicError = toPublicError(error);
  res.status(publicError.statusCode).json(publicError.body);
};
