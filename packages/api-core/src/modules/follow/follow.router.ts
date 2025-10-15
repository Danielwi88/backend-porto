import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { usernameParamSchema } from "../users/users.schemas.js";
import * as controller from "./follow.controller.js";

export const followRouter: ExpressRouter = Router();

followRouter.post(
  "/:username",
  requireAuth,
  validate(usernameParamSchema),
  controller.follow,
);

followRouter.delete(
  "/:username",
  requireAuth,
  validate(usernameParamSchema),
  controller.unfollow,
);
