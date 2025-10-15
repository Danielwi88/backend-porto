import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { validate } from "../../middlewares/validate.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";
import * as controller from "./auth.controller.js";

export const authRouter: ExpressRouter = Router();

authRouter.post("/register", validate(registerSchema), controller.register);
authRouter.post("/login", validate(loginSchema), controller.login);
