import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { optionalAuth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { feedQuerySchema } from "../posts/posts.schemas.js";
import { getFeed } from "../posts/posts.controller.js";

export const feedRouter: ExpressRouter = Router();

feedRouter.get("/", optionalAuth, validate(feedQuerySchema), getFeed);
