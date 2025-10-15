import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { commentIdSchema } from "../posts/posts.schemas.js";
import { deleteComment } from "../posts/posts.controller.js";

export const commentsRouter: ExpressRouter = Router();

commentsRouter.delete("/:id", requireAuth, validate(commentIdSchema), deleteComment);
