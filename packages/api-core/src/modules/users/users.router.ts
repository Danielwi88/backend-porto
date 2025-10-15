import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { optionalAuth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { asyncHandler } from "../../middlewares/async-handler.js";
import {
  followListSchema,
  searchUsersSchema,
  usernameParamSchema,
} from "./users.schemas.js";
import * as controller from "./users.controller.js";

export const usersRouter: ExpressRouter = Router();

usersRouter.get(
  "/search",
  optionalAuth,
  validate(searchUsersSchema),
  asyncHandler(controller.search),
);

usersRouter.get(
  "/:username/posts",
  optionalAuth,
  validate(usernameParamSchema),
  asyncHandler(controller.getUserPosts),
);

usersRouter.get(
  "/:username/likes",
  optionalAuth,
  validate(usernameParamSchema),
  asyncHandler(controller.getUserLikes),
);

usersRouter.get(
  "/:username/followers",
  optionalAuth,
  validate(followListSchema),
  asyncHandler(controller.getFollowers),
);

usersRouter.get(
  "/:username/following",
  optionalAuth,
  validate(followListSchema),
  asyncHandler(controller.getFollowing),
);

usersRouter.get(
  "/:username",
  optionalAuth,
  validate(usernameParamSchema),
  asyncHandler(controller.getPublicProfile),
);
