// src/routes/health.ts (or wherever your router lives)
import { Router } from 'express';
import { prisma } from "../db.js";

export const health: ReturnType<typeof Router> = Router();

health.get('/health', async (_req, res) => {
  try {
    // DB ping (Postgres)
    await prisma.$queryRawUnsafe('SELECT 1');
    res.json({ ok: true, db: 'up', version: process.env.npm_package_version });
  } catch (e) {
    res.status(500).json({ ok: false, db: 'down' });
  }
});
