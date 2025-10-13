import express, { type Express, type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { errorHandler } from "./middlewares/errors.js";
import { usersRouter } from "./modules/users/users.router.js";
import { postsRouter } from "./modules/posts/posts.router.js";

export function makeApp(opts: { enable: { posts?: boolean } }): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? "*" }));
  app.use(express.json({ limit: "2mb" }));
  app.use(rateLimit({ windowMs: 60_000, max: 300 }));

  app.get("/health", (_req: Request, res: Response) => res.json({ ok: true, ts: Date.now() }));

  app.use("/api/users", usersRouter);
  if (opts.enable.posts) app.use("/api/posts", postsRouter);

  app.use(errorHandler);
  return app;
}
