import type { Request, Response } from "express";
import { prisma } from "../../db.js";
import * as svc from "./users.service.js";
import { loginSchema, registerSchema } from "./users.schemas.js";
import type { ValidatedRequest } from "../../middlewares/validate.js";

type RegisterRequest = ValidatedRequest<typeof registerSchema>;
type LoginRequest = ValidatedRequest<typeof loginSchema>;

export async function me(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, avatarUrl: true },
  });
  res.json(user);
}

export async function register(req: Request, res: Response) {
  const { email, password, name } = (req as RegisterRequest).input.body;
  const tokens = await svc.register(email, password, name);
  res.status(201).json(tokens);
}

export async function login(req: Request, res: Response) {
  const { email, password } = (req as LoginRequest).input.body;
  const tokens = await svc.login(email, password);
  res.json(tokens);
}
