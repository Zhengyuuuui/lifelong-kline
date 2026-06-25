import { Router } from "express";
import { requirePostgresAuth, type PgAuthedRequest } from "./auth.middleware";
import { AiService } from "./ai.service";
import { asyncHandler } from "./errors";
import { createPostgresRateLimiter } from "./rateLimit.middleware";
import { validateAiGeneratePayload } from "./validation";

export const createAiRouter = () => {
  const router = Router();
  const aiService = new AiService();

  router.use(requirePostgresAuth);

  router.get(
    "/history",
    asyncHandler(async (req: PgAuthedRequest, res) => {
      const requestedLimit = Number(req.query.limit || 20);
      const limit = Number.isFinite(requestedLimit) ? requestedLimit : 20;
      const result = await aiService.getHistory(req.pgAuth!.userId, limit);
      res.json(result);
    })
  );

  router.post(
    "/generate",
    createPostgresRateLimiter({ routeKey: "ai.generate", limit: 30, windowMs: 60_000 }),
    asyncHandler(async (req: PgAuthedRequest, res) => {
      const payload = validateAiGeneratePayload(req.body);
      const result = await aiService.generate(req.pgAuth!.userId, payload);
      res.json(result);
    })
  );

  return router;
};
