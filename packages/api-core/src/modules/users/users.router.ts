import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { loginSchema, registerSchema } from "./users.schemas.js";
import * as c from "./users.controller.js";

export const usersRouter: ExpressRouter = Router();

usersRouter.post("/register", validate(registerSchema), c.register);
usersRouter.post("/login", validate(loginSchema), c.login);
usersRouter.get("/me", requireAuth, c.me);
