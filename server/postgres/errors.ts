import type { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(statusCode: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ValidationError extends HttpError {
  constructor(details: Record<string, unknown>) {
    super(422, "Validation failed", details);
  }
}

export const asyncHandler = (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
};

export const toPublicError = (error: unknown) => {
  if (error instanceof HttpError) {
    return {
      statusCode: error.statusCode,
      body: {
        ok: false,
        error: {
          message: error.message,
          details: error.details,
        },
      },
    };
  }

  const message = error instanceof Error ? error.message : "Internal server error";
  return {
    statusCode: 500,
    body: {
      ok: false,
      error: {
        message: process.env.NODE_ENV === "production" ? "Internal server error" : message,
      },
    },
  };
};
