import express, { type Express, type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { errorHandler } from "./middlewares/errors.js";
import { usersRouter } from "./modules/users/users.router.js";
import { postsRouter } from "./modules/posts/posts.router.js";
import { authRouter } from "./modules/auth/auth.router.js";
import { meRouter } from "./modules/me/me.router.js";
import { feedRouter } from "./modules/feed/feed.router.js";
import { followRouter } from "./modules/follow/follow.router.js";
import { commentsRouter } from "./modules/comments/comments.router.js";
import { uploadsDir } from "./utils/uploads.js";

export function makeApp(opts: { enable: { posts?: boolean } }): Express {
  const app = express();

  // Honor reverse proxies (Railway) so middleware like rate-limit reads X-Forwarded-For
  app.set("trust proxy", 1);

  const rawOrigins = process.env.CORS_ORIGIN ?? "";
  const allowedOrigins = rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
    }),
  );
  app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(rateLimit({ windowMs: 60_000, max: 300 }));
  app.use("/uploads", express.static(uploadsDir));

  app.get("/", (_req: Request, res: Response) =>
    res.json({ ok: true, message: "Sociality API" })
  );

  app.get("/health", (_req: Request, res: Response) => res.json({ ok: true, ts: Date.now() }));

  app.use("/api/auth", authRouter);
  app.use("/api/me", meRouter);
  app.use("/api/feed", feedRouter);
  if (opts.enable.posts) {
    app.use("/api/posts", postsRouter);
    app.use("/api/comments", commentsRouter);
  }
  app.use("/api/follow", followRouter);
  app.use("/api/users", usersRouter);

  app.use(errorHandler);
  return app;
}
