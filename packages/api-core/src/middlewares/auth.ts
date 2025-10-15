import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type JwtPayload = { sub: string; role: "USER" | "ADMIN" };

const jwtSecret = () => {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return secret;
};

const extractToken = (req: Request) => {
  const header = req.headers.authorization ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
};

const verifyToken = (token: string): JwtPayload | null => {
  if (!token) return null;
  try {
    return jwt.verify(token, jwtSecret()) as JwtPayload;
  } catch {
    return null;
  }
};

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  const payload = verifyToken(token);
  if (payload) req.user = payload;
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Unauthorized" });
  req.user = payload;
  next();
}

export function requireRole(role: "ADMIN") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}
