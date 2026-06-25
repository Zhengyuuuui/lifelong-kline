import { Router } from "express";
import { AppleWebhookService } from "./appleWebhook.service";
import { asyncHandler } from "./errors";
import { createPostgresRateLimiter } from "./rateLimit.middleware";
import { validateAppleWebhookPayload } from "./validation";

export const createWebhookRouter = () => {
  const router = Router();
  const appleWebhookService = new AppleWebhookService();

  router.post(
    "/apple",
    createPostgresRateLimiter({ routeKey: "webhooks.apple", limit: 120, windowMs: 60_000 }),
    asyncHandler(async (req, res) => {
      const payload = validateAppleWebhookPayload(req.body);
      const result = await appleWebhookService.handleNotification(payload);
      res.json(result);
    })
  );

  return router;
};
