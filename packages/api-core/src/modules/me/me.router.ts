import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { upload } from "../../utils/uploads.js";
import { paginationSchema, updateMeSchema } from "./me.schemas.js";
import * as controller from "./me.controller.js";

export const meRouter: ExpressRouter = Router();

meRouter.get("/", requireAuth, controller.getMe);

meRouter.patch(
  "/",
  requireAuth,
  upload.single("avatar"),
  validate(updateMeSchema),
  controller.updateMe,
);

meRouter.get(
  "/saved",
  requireAuth,
  validate(paginationSchema),
  controller.getMySaved,
);

meRouter.get("/likes", requireAuth, controller.getMyLikes);

meRouter.get(
  "/followers",
  requireAuth,
  validate(paginationSchema),
  controller.getMyFollowers,
);

meRouter.get(
  "/following",
  requireAuth,
  validate(paginationSchema),
  controller.getMyFollowing,
);
