import { Prisma } from "@prisma/client";
import { prisma } from "../../db.js";
import { buildPostInclude } from "../shared/transformers.js";
import type { PublicUserStats } from "../shared/transformers.js";

const baseUserSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
  email: true,
  phone: true,
  bio: true,
} as const;

const paginate = (page: number, limit: number) => ({
  skip: (page - 1) * limit,
  take: limit,
});

const emptyStats = (): PublicUserStats => ({
  posts: 0,
  followers: 0,
  following: 0,
  likes: 0,
});

export async function findUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
    select: baseUserSelect,
  });
}

export async function isFollowing(followerId: string, followingId: string) {
  if (!followerId || !followingId) return false;
  if (followerId === followingId) return false;
  const follow = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
    select: { id: true },
  });
  return Boolean(follow);
}

export async function getStatsForUsers(userIds: string[]): Promise<Map<string, PublicUserStats>> {
  if (!userIds.length) return new Map();

  const [postCounts, followerCounts, followingCounts, postLikes] = await Promise.all([
    prisma.post.groupBy({
      by: ["authorId"],
      where: { authorId: { in: userIds } },
      _count: { _all: true },
    }),
    prisma.follow.groupBy({
      by: ["followingId"],
      where: { followingId: { in: userIds } },
      _count: { _all: true },
    }),
    prisma.follow.groupBy({
      by: ["followerId"],
      where: { followerId: { in: userIds } },
      _count: { _all: true },
    }),
    prisma.post.findMany({
      where: { authorId: { in: userIds } },
      select: { authorId: true, _count: { select: { likes: true } } },
    }),
  ]);

  const stats = new Map<string, PublicUserStats>();
  userIds.forEach((id) => stats.set(id, emptyStats()));

  postCounts.forEach((row) => {
    const entry = stats.get(row.authorId);
    if (entry) entry.posts = row._count._all;
  });

  followerCounts.forEach((row) => {
    const entry = stats.get(row.followingId);
    if (entry) entry.followers = row._count._all;
  });

  followingCounts.forEach((row) => {
    const entry = stats.get(row.followerId);
    if (entry) entry.following = row._count._all;
  });

  postLikes.forEach((row) => {
    const entry = stats.get(row.authorId);
    if (entry) entry.likes += row._count.likes;
  });

  return stats;
}

export async function getUserStats(userId: string): Promise<PublicUserStats> {
  if (!userId) return emptyStats();
  const stats = await getStatsForUsers([userId]);
  return stats.get(userId) ?? emptyStats();
}

export async function listFollowers(
  userId: string,
  page: number,
  limit: number,
) {
  const [items, total] = await Promise.all([
    prisma.follow.findMany({
      where: { followingId: userId },
      include: { follower: { select: baseUserSelect } },
      orderBy: { createdAt: "desc" },
      ...paginate(page, limit),
    }),
    prisma.follow.count({ where: { followingId: userId } }),
  ]);

  const followers = items.map((entry) => entry.follower);
  const stats = await getStatsForUsers(followers.map((user) => user.id));

  return {
    users: followers,
    stats,
    total,
  };
}

export async function listFollowing(
  userId: string,
  page: number,
  limit: number,
) {
  const [items, total] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: userId },
      include: { following: { select: baseUserSelect } },
      orderBy: { createdAt: "desc" },
      ...paginate(page, limit),
    }),
    prisma.follow.count({ where: { followerId: userId } }),
  ]);

  const following = items.map((entry) => entry.following);
  const stats = await getStatsForUsers(following.map((user) => user.id));

  return {
    users: following,
    stats,
    total,
  };
}

export async function listUserPosts(userId: string, currentUserId?: string) {
  return prisma.post.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: "desc" },
    include: buildPostInclude(currentUserId),
  });
}

export async function listUserLikedPosts(userId: string, currentUserId?: string) {
  const likes = await prisma.like.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      post: {
        include: buildPostInclude(currentUserId),
      },
    },
  });

  return likes
    .map((entry) => entry.post)
    .filter((post): post is NonNullable<typeof post> => Boolean(post));
}

export async function resolveFollowingSet(currentUserId: string | undefined, userIds: string[]) {
  if (!currentUserId || !userIds.length) return new Set<string>();

  const relations = await prisma.follow.findMany({
    where: {
      followerId: currentUserId,
      followingId: { in: userIds },
    },
    select: { followingId: true },
  });

  return new Set(relations.map((row) => row.followingId));
}

export async function searchUsers(query: string, page: number, limit: number) {
  const normalized = query.trim();
  const where: Prisma.UserWhereInput =
    normalized === ""
      ? {}
      : {
          OR: [
            { username: { contains: normalized, mode: Prisma.QueryMode.insensitive } },
            { name: { contains: normalized, mode: Prisma.QueryMode.insensitive } },
            { email: { contains: normalized, mode: Prisma.QueryMode.insensitive } },
          ],
        };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ name: "asc" }, { username: "asc" }],
      ...paginate(page, limit),
      select: baseUserSelect,
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total };
}
