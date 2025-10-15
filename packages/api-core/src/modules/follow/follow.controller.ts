import type { Request, Response } from "express";
import type { ValidatedRequest } from "../../middlewares/validate.js";
import { usernameParamSchema } from "../users/users.schemas.js";
import { prisma } from "../../db.js";
import * as userService from "../users/users.service.js";

type UsernameRequest = ValidatedRequest<typeof usernameParamSchema>;

const ok = (message: string, following: boolean, extras?: object) => ({
  success: true,
  message,
  following,
  ...(extras ?? {}),
});

export async function follow(req: Request, res: Response) {
  const currentUserId = req.user?.sub;
  if (!currentUserId) return res.status(401).json({ error: "Unauthorized" });

  const { username } = (req as UsernameRequest).input.params;
  const target = await prisma.user.findUnique({ where: { username } });
  if (!target) return res.status(404).json({ error: "User not found" });
  if (target.id === currentUserId)
    return res.status(400).json({ error: "You cannot follow yourself" });

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: currentUserId, followingId: target.id } },
    update: {},
    create: { followerId: currentUserId, followingId: target.id },
  });

  const stats = await userService.getUserStats(target.id);
  res.json(ok(`You are now following @${target.username}`, true, { counts: stats }));
}

export async function unfollow(req: Request, res: Response) {
  const currentUserId = req.user?.sub;
  if (!currentUserId) return res.status(401).json({ error: "Unauthorized" });

  const { username } = (req as UsernameRequest).input.params;
  const target = await prisma.user.findUnique({ where: { username } });
  if (!target) return res.status(404).json({ error: "User not found" });
  if (target.id === currentUserId)
    return res.status(400).json({ error: "You cannot unfollow yourself" });

  await prisma.follow.deleteMany({
    where: { followerId: currentUserId, followingId: target.id },
  });

  const stats = await userService.getUserStats(target.id);
  res.json(ok(`You unfollowed @${target.username}`, false, { counts: stats }));
}
