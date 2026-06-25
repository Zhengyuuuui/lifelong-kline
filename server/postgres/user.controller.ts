import { Router } from "express";
import { AuthService } from "./auth.service";
import { requirePostgresAuth, type PgAuthedRequest } from "./auth.middleware";
import { asyncHandler } from "./errors";
import { UserService } from "./user.service";
import {
  validateShareCountPayload,
  validateUserBindingsPayload,
  validateUserProfilePayload,
  validateUserSettingsPayload,
} from "./validation";

export const createUserRouter = () => {
  const router = Router();
  const authService = new AuthService();
  const userService = new UserService();

  router.use(requirePostgresAuth);

  router.get(
    "/me",
    asyncHandler(async (req: PgAuthedRequest, res) => {
      const userId = req.pgAuth!.userId;
      const [result, identities] = await Promise.all([
        userService.getMe(userId),
        authService.listIdentities(userId),
      ]);
      res.json({ ...result, identities });
    })
  );

  router.get(
    "/identities",
    asyncHandler(async (req: PgAuthedRequest, res) => {
      const identities = await authService.listIdentities(req.pgAuth!.userId);
      res.json({ ok: true, identities });
    })
  );

  router.get(
    "/profile",
    asyncHandler(async (req: PgAuthedRequest, res) => {
      const profile = await userService.getProfile(req.pgAuth!.userId);
      res.json({ ok: true, profile });
    })
  );

  router.post(
    "/profile",
    asyncHandler(async (req: PgAuthedRequest, res) => {
      const payload = validateUserProfilePayload(req.body);
      const result = await userService.upsertProfile(req.pgAuth!.userId, payload);
      res.json(result);
    })
  );

  router.put(
    "/profile",
    asyncHandler(async (req: PgAuthedRequest, res) => {
      const payload = validateUserProfilePayload(req.body);
      const result = await userService.upsertProfile(req.pgAuth!.userId, payload);
      res.json(result);
    })
  );

  router.post(
    "/settings",
    asyncHandler(async (req: PgAuthedRequest, res) => {
      const payload = validateUserSettingsPayload(req.body);
      const result = await userService.saveSettings(req.pgAuth!.userId, payload);
      res.json(result);
    })
  );

  router.post(
    "/bindings",
    asyncHandler(async (req: PgAuthedRequest, res) => {
      const payload = validateUserBindingsPayload(req.body);
      const result = await userService.saveBindings(req.pgAuth!.userId, payload);
      res.json(result);
    })
  );

  router.post(
    "/share-count",
    asyncHandler(async (req: PgAuthedRequest, res) => {
      const payload = validateShareCountPayload(req.body);
      const result = await userService.saveShareCount(req.pgAuth!.userId, payload);
      res.json(result);
    })
  );

  router.delete(
    "/account",
    asyncHandler(async (req: PgAuthedRequest, res) => {
      const result = await userService.deleteAccount(req.pgAuth!.userId);
      res.json(result);
    })
  );

  return router;
};
