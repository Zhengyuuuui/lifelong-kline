import { Router } from "express";
import { AuthService } from "./auth.service";
import { asyncHandler } from "./errors";
import { requirePostgresAuth, type PgAuthedRequest } from "./auth.middleware";
import {
  validateAppleLoginPayload,
  validatePhoneRegisterPayload,
  validatePasswordChangePayload,
  validatePasswordLoginPayload,
  validateRefreshPayload,
  validateSmsSendPayload,
  validateWeChatLoginPayload,
} from "./validation";
import { createPostgresRateLimiter } from "./rateLimit.middleware";
import { PasswordService, phoneRateLimitBucket } from "./password.service";
import { getBackendConfig } from "./env";
import {
  SmsService,
  smsDeviceRateLimitBucket,
  smsPhoneRateLimitBucket,
} from "./sms.service";
import { RegistrationService } from "./registration.service";

const getRequestMeta = (req: PgAuthedRequest) => ({
  ipAddress: req.ip || req.socket.remoteAddress || "",
  userAgent: req.headers["user-agent"] || null,
});

export const createAuthRouter = () => {
  const router = Router();
  const authService = new AuthService();
  const passwordService = new PasswordService();
  const smsService = new SmsService();
  const registrationService = new RegistrationService();
  const config = getBackendConfig();

  router.post(
    "/sms/send",
    createPostgresRateLimiter({
      routeKey: "auth.sms.send.ip",
      limit: config.smsSendIpLimit,
      windowMs: 60 * 60_000,
      onRateLimited: (req, context) => smsService.auditRateLimited(
        "sms_send_ip",
        context.bucketKey,
        getRequestMeta(req),
        { routeKey: context.routeKey }
      ),
    }),
    createPostgresRateLimiter({
      routeKey: "auth.sms.send.phone",
      limit: config.smsSendPhoneLimit,
      windowMs: 60 * 60_000,
      bucketKey: (req) => smsPhoneRateLimitBucket(req.body?.phone),
      onRateLimited: (req, context) => smsService.auditRateLimited(
        "sms_send_phone",
        context.bucketKey,
        getRequestMeta(req),
        { routeKey: context.routeKey }
      ),
    }),
    createPostgresRateLimiter({
      routeKey: "auth.sms.send.device",
      limit: config.smsSendDeviceLimit,
      windowMs: 60 * 60_000,
      bucketKey: (req) => smsDeviceRateLimitBucket(req.body?.deviceId),
      onRateLimited: (req, context) => smsService.auditRateLimited(
        "sms_send_device",
        context.bucketKey,
        getRequestMeta(req),
        { routeKey: context.routeKey }
      ),
    }),
    asyncHandler(async (req, res) => {
      const payload = validateSmsSendPayload(req.body);
      const result = await smsService.sendRegisterCode(payload, getRequestMeta(req));
      res.json(result);
    })
  );

  router.post(
    "/register/phone",
    createPostgresRateLimiter({
      routeKey: "auth.register.phone.ip",
      limit: 30,
      windowMs: 15 * 60_000,
    }),
    asyncHandler(async (req, res) => {
      const payload = validatePhoneRegisterPayload(req.body);
      const result = await registrationService.registerPhone(payload, getRequestMeta(req));
      res.json(result);
    })
  );

  router.post(
    "/password/login",
    createPostgresRateLimiter({
      routeKey: "auth.password.login.ip",
      limit: 30,
      windowMs: 15 * 60_000,
    }),
    createPostgresRateLimiter({
      routeKey: "auth.password.login.phone",
      limit: 10,
      windowMs: 15 * 60_000,
      bucketKey: (req) => phoneRateLimitBucket(req.body?.phone),
    }),
    asyncHandler(async (req, res) => {
      const payload = validatePasswordLoginPayload(req.body);
      const result = await passwordService.login(
        payload.phone,
        payload.password,
        getRequestMeta(req)
      );
      res.json(result);
    })
  );

  router.post(
    "/password/change",
    requirePostgresAuth,
    createPostgresRateLimiter({
      routeKey: "auth.password.change",
      limit: 10,
      windowMs: 60 * 60_000,
    }),
    asyncHandler(async (req: PgAuthedRequest, res) => {
      const payload = validatePasswordChangePayload(req.body);
      const result = await passwordService.changePassword(
        req.pgAuth!.userId,
        payload.currentPassword,
        payload.newPassword,
        getRequestMeta(req)
      );
      res.json(result);
    })
  );

  router.post(
    "/apple",
    createPostgresRateLimiter({ routeKey: "auth.apple", limit: 20, windowMs: 60_000 }),
    asyncHandler(async (req, res) => {
      const payload = validateAppleLoginPayload(req.body);
      const result = await authService.signInWithApple(payload, getRequestMeta(req));
      res.json(result);
    })
  );

  router.post(
    "/wechat",
    createPostgresRateLimiter({ routeKey: "auth.wechat", limit: 20, windowMs: 60_000 }),
    asyncHandler(async (req, res) => {
      const payload = validateWeChatLoginPayload(req.body);
      const result = await authService.signInWithWeChat(payload, getRequestMeta(req));
      res.json(result);
    })
  );

  router.post(
    "/refresh",
    createPostgresRateLimiter({ routeKey: "auth.refresh", limit: 60, windowMs: 60_000 }),
    asyncHandler(async (req, res) => {
      const payload = validateRefreshPayload(req.body);
      const result = await authService.refresh(payload.refreshToken, getRequestMeta(req));
      res.json(result);
    })
  );

  router.post(
    "/logout",
    requirePostgresAuth,
    asyncHandler(async (req: PgAuthedRequest, res) => {
      const refreshToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken : undefined;
      await authService.logout(req.pgAuth!.userId, refreshToken);
      res.json({ ok: true, authenticated: false });
    })
  );

  return router;
};
