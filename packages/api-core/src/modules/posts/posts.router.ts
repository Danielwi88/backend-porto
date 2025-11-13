import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { optionalAuth, requireAuth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { asyncHandler } from "../../middlewares/async-handler.js";
import { upload, optimizeImage } from "../../utils/uploads.js";
import {
  commentCreateSchema,
  commentIdSchema,
  commentsListSchema,
  createPostSchema,
  likesListSchema,
  postIdParamSchema,
  postSlugParamSchema,
} from "./posts.schemas.js";
import * as controller from "./posts.controller.js";

export const postsRouter: ExpressRouter = Router();

postsRouter.get(
  "/:id",
  optionalAuth,
  validate(postIdParamSchema),
  asyncHandler(controller.getPost),
);

postsRouter.post(
  "/",
  requireAuth,
  upload.single("image"),
  optimizeImage,
  validate(createPostSchema),
  asyncHandler(controller.createPost),
);

postsRouter.delete(
  "/:id",
  requireAuth,
  validate(postIdParamSchema),
  asyncHandler(controller.deletePost),
);

postsRouter.post(
  "/:id/like",
  requireAuth,
  validate(postIdParamSchema),
  asyncHandler(controller.likePost),
);

postsRouter.delete(
  "/:id/like",
  requireAuth,
  validate(postIdParamSchema),
  asyncHandler(controller.unlikePost),
);

postsRouter.post(
  "/:id/save",
  requireAuth,
  validate(postIdParamSchema),
  asyncHandler(controller.savePost),
);

postsRouter.delete(
  "/:id/save",
  requireAuth,
  validate(postIdParamSchema),
  asyncHandler(controller.unsavePost),
);

postsRouter.get(
  "/:postId/comments",
  optionalAuth,
  validate(commentsListSchema),
  asyncHandler(controller.listComments),
);

postsRouter.post(
  "/:postId/comments",
  requireAuth,
  validate(commentCreateSchema),
  asyncHandler(controller.addComment),
);

postsRouter.get(
  "/:postId/likes",
  optionalAuth,
  validate(likesListSchema),
  asyncHandler(controller.listPostLikes),
);
