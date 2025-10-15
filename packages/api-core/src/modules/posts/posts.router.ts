import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { optionalAuth, requireAuth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { upload } from "../../utils/uploads.js";
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
  controller.getPost,
);

postsRouter.post(
  "/",
  requireAuth,
  upload.single("image"),
  validate(createPostSchema),
  controller.createPost,
);

postsRouter.delete(
  "/:id",
  requireAuth,
  validate(postIdParamSchema),
  controller.deletePost,
);

postsRouter.post(
  "/:id/like",
  requireAuth,
  validate(postIdParamSchema),
  controller.likePost,
);

postsRouter.delete(
  "/:id/like",
  requireAuth,
  validate(postIdParamSchema),
  controller.unlikePost,
);

postsRouter.post(
  "/:id/save",
  requireAuth,
  validate(postIdParamSchema),
  controller.savePost,
);

postsRouter.delete(
  "/:id/save",
  requireAuth,
  validate(postIdParamSchema),
  controller.unsavePost,
);

postsRouter.get(
  "/:postId/comments",
  optionalAuth,
  validate(commentsListSchema),
  controller.listComments,
);

postsRouter.post(
  "/:postId/comments",
  requireAuth,
  validate(commentCreateSchema),
  controller.addComment,
);

postsRouter.get(
  "/:postId/likes",
  optionalAuth,
  validate(likesListSchema),
  controller.listPostLikes,
);
