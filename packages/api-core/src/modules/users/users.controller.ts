import type { Request, Response } from "express";
import type { ValidatedRequest } from "../../middlewares/validate.js";
import {
  followListSchema,
  searchUsersSchema,
  usernameParamSchema,
} from "./users.schemas.js";
import * as svc from "./users.service.js";
import { toFollowUser, toPostResponse, toPublicUserResponse } from "../shared/transformers.js";

type UsernameRequest = ValidatedRequest<typeof usernameParamSchema>;
type SearchRequest = ValidatedRequest<typeof searchUsersSchema>;
type FollowListRequest = ValidatedRequest<typeof followListSchema>;

const zeroStats = { posts: 0, followers: 0, following: 0, likes: 0 } as const;

export async function getPublicProfile(req: Request, res: Response) {
  const { username } = (req as UsernameRequest).input.params;
  const currentUserId = req.user?.sub;

  const user = await svc.findUserByUsername(username);
  if (!user) return res.status(404).json({ error: "User not found" });

  const stats = await svc.getUserStats(user.id);
  const isMe = currentUserId === user.id;
  const isFollowing = isMe ? true : await svc.isFollowing(currentUserId ?? "", user.id);

  const payload = toPublicUserResponse(user, stats, {
    isMe,
    isFollowing: isMe ? false : isFollowing,
  });

  res.json(payload);
}

export async function search(req: Request, res: Response) {
  const { q, page, limit } = (req as SearchRequest).input.query;
  const currentUserId = req.user?.sub;
  const query = q?.trim() ?? "";

  const { users, total } = await svc.searchUsers(query, page, limit);
  const followingSet = await svc.resolveFollowingSet(
    currentUserId,
    users.map((user) => user.id)
  );

  const results = users.map((user) => ({
    id: user.id,
    username: user.username,
    name: user.name ?? null,
    displayName: user.name ?? user.username,
    avatarUrl: user.avatarUrl ?? null,
    isFollowedByMe: followingSet.has(user.id),
  }));

  res.json({
    users: results,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

export async function getUserPosts(req: Request, res: Response) {
  const { username } = (req as UsernameRequest).input.params;
  const currentUserId = req.user?.sub;

  const user = await svc.findUserByUsername(username);
  if (!user) return res.status(404).json({ error: "User not found" });

  const posts = await svc.listUserPosts(user.id, currentUserId);
  const items = posts.map((post) => toPostResponse(post, { currentUserId }));
  res.json({
    posts: items,
    items,
    data: { posts: items, items },
  });
}

export async function getUserLikes(req: Request, res: Response) {
  const { username } = (req as UsernameRequest).input.params;
  const currentUserId = req.user?.sub;

  const user = await svc.findUserByUsername(username);
  if (!user) return res.status(404).json({ error: "User not found" });

  const posts = await svc.listUserLikedPosts(user.id, currentUserId);
  const items = posts.map((post) => toPostResponse(post, { currentUserId }));
  res.json({
    posts: items,
    items,
    data: { posts: items, items },
  });
}

export async function getFollowers(req: Request, res: Response) {
  const { username } = (req as FollowListRequest).input.params;
  const { page, limit } = (req as FollowListRequest).input.query;
  const currentUserId = req.user?.sub;

  const user = await svc.findUserByUsername(username);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { users, stats, total } = await svc.listFollowers(user.id, page, limit);
  const followingSet = await svc.resolveFollowingSet(
    currentUserId,
    users.map((entry) => entry.id)
  );

  const payload = users.map((entry) =>
    toFollowUser(entry, stats.get(entry.id) ?? { ...zeroStats }, {
      isFollowing: followingSet.has(entry.id),
      isMe: currentUserId === entry.id,
    })
  );

  const wantsEnvelope = "page" in req.query || "limit" in req.query;

  if (!wantsEnvelope)
    return res.json(payload);

  res.json({
    followers: payload,
    items: payload,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

export async function getFollowing(req: Request, res: Response) {
  const { username } = (req as FollowListRequest).input.params;
  const { page, limit } = (req as FollowListRequest).input.query;
  const currentUserId = req.user?.sub;

  const user = await svc.findUserByUsername(username);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { users, stats, total } = await svc.listFollowing(user.id, page, limit);
  const followingSet = await svc.resolveFollowingSet(
    currentUserId,
    users.map((entry) => entry.id)
  );

  const payload = users.map((entry) =>
    toFollowUser(entry, stats.get(entry.id) ?? { ...zeroStats }, {
      isFollowing: followingSet.has(entry.id),
      isMe: currentUserId === entry.id,
    })
  );

  const wantsEnvelope = "page" in req.query || "limit" in req.query;

  if (!wantsEnvelope)
    return res.json(payload);

  res.json({
    following: payload,
    items: payload,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}
