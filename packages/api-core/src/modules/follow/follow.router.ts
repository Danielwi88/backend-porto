import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { asyncHandler } from "../../middlewares/async-handler.js";
import { usernameParamSchema } from "../users/users.schemas.js";
import * as controller from "./follow.controller.js";

export const followRouter: ExpressRouter = Router();

followRouter.post(
  "/:username",
  requireAuth,
  validate(usernameParamSchema),
  asyncHandler(controller.follow),
);

followRouter.delete(
  "/:username",
  requireAuth,
  validate(usernameParamSchema),
  asyncHandler(controller.unfollow),
);
