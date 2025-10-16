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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function makeApp(opts: { enable: { posts?: boolean } }): Express {
  const app = express();

  // Honor reverse proxies (Railway) so middleware like rate-limit reads X-Forwarded-For
  app.set("trust proxy", 1);

  const configuredOriginsRaw = process.env.CORS_ORIGIN ?? "";
  const explicitOrigins = configuredOriginsRaw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const fallbackOrigins = [
    process.env.PUBLIC_API_URL,
    process.env.RAILWAY_STATIC_URL,
    process.env.URL,
  ].filter(Boolean) as string[];

  const parsedOrigins = [...explicitOrigins, ...fallbackOrigins]
    .map((origin) => origin.trim())
    .filter(Boolean);
  const hasExplicitOrigins = explicitOrigins.length > 0;

  const exactOrigins = new Set<string>();
  const wildcardOrigins: RegExp[] = [];

  for (const origin of parsedOrigins) {
    let normalized = origin.replace(/\/$/, "");
    if (!normalized.includes("*")) {
      try {
        normalized = new URL(normalized).origin;
      } catch {
        // value is already a bare origin; ignore parse errors to avoid breaking startup
      }
      normalized = normalized.replace(/\/$/, "");
    }

    if (normalized.includes("*")) {
      const regex = normalized
        .split("*")
        .map((segment) => escapeRegex(segment))
        .join(".*");
      wildcardOrigins.push(new RegExp(`^${regex}$`));
    } else {
      exactOrigins.add(normalized);
    }
  }

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
    }),
  );
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          return callback(null, true);
        }

        const normalizedOrigin = origin.replace(/\/$/, "");

        if (!hasExplicitOrigins) {
          return callback(null, true);
        }

        if (
          exactOrigins.has(normalizedOrigin) ||
          wildcardOrigins.some((pattern) => pattern.test(normalizedOrigin))
        ) {
          return callback(null, true);
        }

        return callback(new Error("Not allowed by CORS"));
      },
    }),
  );
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
