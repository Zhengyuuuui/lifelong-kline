import express, { Router } from "express";
import { requirePostgresAuth, type PgAuthedRequest } from "./auth.middleware";
import { asyncHandler } from "./errors";
import { createPostgresRateLimiter } from "./rateLimit.middleware";
import { XunhupayService } from "./xunhupay.service";

export const createXunhupayRouter = () => {
  const router = Router();
  const xunhupayService = new XunhupayService();

  router.post(
    "/xunhupay/notify",
    express.urlencoded({ extended: false }),
    createPostgresRateLimiter({ routeKey: "payment.xunhupay_notify", limit: 240, windowMs: 60_000 }),
    asyncHandler(async (req, res) => {
      await xunhupayService.handleNotify(req.body || {});
      res.status(200).type("text/plain").send("success");
    })
  );

  router.post(
    "/xunhupay/create",
    requirePostgresAuth,
    createPostgresRateLimiter({ routeKey: "payment.xunhupay_create", limit: 30, windowMs: 60_000 }),
    asyncHandler(async (req: PgAuthedRequest, res) => {
      const result = await xunhupayService.createPaymentOrder(req.pgAuth!.userId, req.body || {});
      res.json(result);
    })
  );

  router.get(
    "/orders/:orderId/status",
    requirePostgresAuth,
    createPostgresRateLimiter({ routeKey: "payment.order_status", limit: 120, windowMs: 60_000 }),
    asyncHandler(async (req: PgAuthedRequest, res) => {
      const result = await xunhupayService.getOrderStatus(req.pgAuth!.userId, String(req.params.orderId || ""));
      res.json(result);
    })
  );

  return router;
};
