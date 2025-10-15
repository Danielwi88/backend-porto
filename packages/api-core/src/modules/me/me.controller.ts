import type { Request, Response } from "express";
import type { ValidatedRequest } from "../../middlewares/validate.js";
import { paginationSchema, updateMeSchema } from "./me.schemas.js";
import { prisma } from "../../db.js";
import { toFollowUser, toPostResponse, buildPostInclude } from "../shared/transformers.js";
import { publicUrlFor } from "../../utils/uploads.js";
import * as userService from "../users/users.service.js";

type UpdateMeRequest = ValidatedRequest<typeof updateMeSchema>;
type PaginationRequest = ValidatedRequest<typeof paginationSchema>;

const zeroStats = { posts: 0, followers: 0, following: 0, likes: 0 } as const;

export async function getMe(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const stats = await userService.getUserStats(user.id);

  res.json({
    profile: {
      id: user.id,
      username: user.username,
      name: user.name ?? null,
      email: user.email,
      phone: user.phone ?? null,
      bio: user.bio ?? null,
      avatarUrl: user.avatarUrl ?? null,
    },
    stats,
  });
}

export async function updateMe(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const payload = (req as UpdateMeRequest).input.body ?? {};
  const avatarFile = (req as Request & { file?: Express.Multer.File }).file;

  const data: Record<string, unknown> = {};

  if (payload.name !== undefined) {
    const trimmed = payload.name.trim();
    data.name = trimmed === "" ? null : trimmed;
  }

  if (payload.username !== undefined) {
    const desired = payload.username.trim();
    if (!desired) return res.status(400).json({ error: "Username cannot be empty" });
    const existing = await prisma.user.findUnique({
      where: { username: desired },
      select: { id: true },
    });
    if (existing && existing.id !== userId)
      return res.status(400).json({ error: "Username already taken" });
    data.username = desired;
  }

  if (payload.phone !== undefined)
    data.phone = payload.phone.trim() === "" ? null : payload.phone.trim();

  if (payload.bio !== undefined)
    data.bio = payload.bio.trim() === "" ? null : payload.bio.trim();

  if (payload.avatarUrl !== undefined)
    data.avatarUrl = payload.avatarUrl.trim() === "" ? null : payload.avatarUrl.trim();

  if (avatarFile) {
    data.avatarUrl = publicUrlFor(avatarFile.filename);
  }

  if (Object.keys(data).length > 0) {
    await prisma.user.update({ where: { id: userId }, data });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const stats = await userService.getUserStats(userId);

  res.json({
    profile: {
      id: user.id,
      username: user.username,
      name: user.name ?? null,
      email: user.email,
      phone: user.phone ?? null,
      bio: user.bio ?? null,
      avatarUrl: user.avatarUrl ?? null,
    },
    stats,
  });
}

export async function getMySaved(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { page, limit } = (req as PaginationRequest).input.query;

  const [items, total] = await Promise.all([
    prisma.save.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        post: {
          include: buildPostInclude(userId),
        },
      },
    }),
    prisma.save.count({ where: { userId } }),
  ]);

  const posts = items
    .map((entry) => entry.post)
    .filter((post): post is NonNullable<typeof post> => Boolean(post))
    .map((post) => toPostResponse(post, { currentUserId: userId }));

  const totalPages = Math.max(1, Math.ceil(total / limit));

  res.json({
    items: posts,
    posts,
    data: { items: posts, posts },
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
}

export async function getMyLikes(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const likes = await prisma.like.findMany({
    where: { userId },
    include: {
      post: {
        include: buildPostInclude(userId),
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const posts = likes
    .map((entry) => entry.post)
    .filter((post): post is NonNullable<typeof post> => Boolean(post))
    .map((post) => toPostResponse(post, { currentUserId: userId }));

  res.json(posts);
}

export async function getMyFollowers(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { page, limit } = (req as PaginationRequest).input.query;

  const { users, stats, total } = await userService.listFollowers(userId, page, limit);
  const followingSet = await userService.resolveFollowingSet(
    userId,
    users.map((user) => user.id)
  );

  const payload = users.map((entry) =>
    toFollowUser(entry, stats.get(entry.id) ?? { ...zeroStats }, {
      isFollowing: followingSet.has(entry.id),
      isMe: entry.id === userId,
    })
  );

  const totalPages = Math.max(1, Math.ceil(total / limit));

  res.json({
    followers: payload,
    items: payload,
    data: { followers: payload, items: payload },
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
}

export async function getMyFollowing(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { page, limit } = (req as PaginationRequest).input.query;

  const { users, stats, total } = await userService.listFollowing(userId, page, limit);
  const followingSet = await userService.resolveFollowingSet(
    userId,
    users.map((user) => user.id)
  );

  const payload = users.map((entry) =>
    toFollowUser(entry, stats.get(entry.id) ?? { ...zeroStats }, {
      isFollowing: followingSet.has(entry.id),
      isMe: entry.id === userId,
    })
  );

  const totalPages = Math.max(1, Math.ceil(total / limit));

  res.json({
    following: payload,
    items: payload,
    data: { following: payload, items: payload },
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
}
