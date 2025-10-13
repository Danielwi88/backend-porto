import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { z } from "zod";
import { validate, type ValidatedRequest } from "../../middlewares/validate.js";
import { prisma } from "../../db.js";

const createSchema = z.object({
  body: z.object({
    caption: z.string().min(1),
    imageUrl: z.string().url().optional(),
  }),
});

const listSchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().min(1).max(50).default(10),
  }),
});

export const postsRouter: ExpressRouter = Router();

postsRouter.get("/", validate(listSchema), async (req, res) => {
  const { cursor, limit } = (req as ValidatedRequest<typeof listSchema>).input.query;
  const currentUserId = req.user?.sub ?? "";
  const items = await prisma.post.findMany({
    take: limit + 1,
    orderBy: { createdAt: "desc" },
    cursor: cursor ? { id: cursor } : undefined,
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      _count: { select: { comments: true, likes: true, saves: true } },
      likes: { where: { userId: currentUserId }, select: { id: true } },
      saves: { where: { userId: currentUserId }, select: { id: true } },
    },
  });
  const nextCursor = items.length > limit ? items.pop()!.id : null;
  res.json({ items, nextCursor });
});

postsRouter.post("/", requireAuth, validate(createSchema), async (req, res) => {
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { caption, imageUrl } = (req as ValidatedRequest<typeof createSchema>).input.body;
  const post = await prisma.post.create({
    data: { caption, imageUrl, authorId: userId },
  });
  res.status(201).json(post);
});

postsRouter.post("/:id/like", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  await prisma.like.upsert({
    where: { postId_userId: { postId: id, userId } },
    update: {},
    create: { postId: id, userId },
  });
  res.json({ ok: true });
});

postsRouter.delete("/:id/like", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  await prisma.like.deleteMany({ where: { postId: id, userId } });
  res.json({ ok: true });
});

postsRouter.post("/:id/save", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  await prisma.save.upsert({
    where: { postId_userId: { postId: id, userId } },
    update: {},
    create: { postId: id, userId },
  });
  res.json({ ok: true });
});
