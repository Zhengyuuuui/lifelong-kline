import { Router } from "express";
import { requirePostgresAuth, type PgAuthedRequest } from "./auth.middleware";
import { asyncHandler } from "./errors";
import { createPostgresRateLimiter } from "./rateLimit.middleware";
import { InviteService } from "./invite.service";

const getRequestMeta = (req: PgAuthedRequest) => ({
  ipAddress: req.ip || req.socket.remoteAddress || "",
  userAgent: req.headers["user-agent"] || null,
});

export const createInviteRouter = () => {
  const router = Router();
  const inviteService = new InviteService();

  router.use(requirePostgresAuth);

  router.get(
    "/me",
    createPostgresRateLimiter({ routeKey: "invites.me", limit: 120, windowMs: 60_000 }),
    asyncHandler(async (req: PgAuthedRequest, res) => {
      const result = await inviteService.getMyInviteSummary(req.pgAuth!.userId);
      res.json(result);
    })
  );

  router.post(
    "/code",
    createPostgresRateLimiter({ routeKey: "invites.code", limit: 20, windowMs: 60_000 }),
    asyncHandler(async (req: PgAuthedRequest, res) => {
      const result = await inviteService.createOrGetCode(req.pgAuth!.userId, getRequestMeta(req));
      res.json(result);
    })
  );

  return router;
};
