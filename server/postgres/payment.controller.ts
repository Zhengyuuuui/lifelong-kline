import { Router } from "express";
import { requirePostgresAuth, type PgAuthedRequest } from "./auth.middleware";
import { asyncHandler } from "./errors";
import { PaymentService } from "./payment.service";
import { createPostgresRateLimiter } from "./rateLimit.middleware";
import { validatePaymentVerifyReceiptPayload } from "./validation";

export const createPaymentRouter = () => {
  const router = Router();
  const paymentService = new PaymentService();

  router.use(requirePostgresAuth);

  router.post(
    "/verify-receipt",
    createPostgresRateLimiter({ routeKey: "payment.verify_receipt", limit: 20, windowMs: 60_000 }),
    asyncHandler(async (req: PgAuthedRequest, res) => {
      const payload = validatePaymentVerifyReceiptPayload(req.body);
      const result = await paymentService.verifyReceipt(req.pgAuth!.userId, payload);
      res.json(result);
    })
  );

  return router;
};
