import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { asyncHandler } from "../../middlewares/async-handler.js";
import { upload, optimizeImage } from "../../utils/uploads.js";
import { paginationSchema, updateMeSchema } from "./me.schemas.js";
import * as controller from "./me.controller.js";

export const meRouter: ExpressRouter = Router();

meRouter.get("/", requireAuth, asyncHandler(controller.getMe));

meRouter.patch(
  "/",
  requireAuth,
  upload.single("avatar"),
  optimizeImage,
  validate(updateMeSchema),
  asyncHandler(controller.updateMe),
);

meRouter.get(
  "/saved",
  requireAuth,
  validate(paginationSchema),
  asyncHandler(controller.getMySaved),
);

meRouter.get("/likes", requireAuth, asyncHandler(controller.getMyLikes));

meRouter.get(
  "/followers",
  requireAuth,
  validate(paginationSchema),
  asyncHandler(controller.getMyFollowers),
);

meRouter.get(
  "/following",
  requireAuth,
  validate(paginationSchema),
  asyncHandler(controller.getMyFollowing),
);
