import type { Request, Response } from "express";
import type { ValidatedRequest } from "../../middlewares/validate.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";
import * as svc from "./auth.service.js";

type RegisterRequest = ValidatedRequest<typeof registerSchema>;
type LoginRequest = ValidatedRequest<typeof loginSchema>;

export async function register(req: Request, res: Response) {
  const payload = (req as RegisterRequest).input.body;
  const result = await svc.register(payload);
  res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
  const payload = (req as LoginRequest).input.body;
  const result = await svc.login(payload.username, payload.password);
  res.json(result);
}
