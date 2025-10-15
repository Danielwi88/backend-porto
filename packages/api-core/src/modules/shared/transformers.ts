import type { Post, Save, User, Comment, Like, Prisma } from "@prisma/client";

type AuthorLike = Pick<User, "id" | "username" | "name" | "avatarUrl">;
type PublicUserBase = Pick<User, "id" | "username" | "name" | "avatarUrl" | "email" | "phone" | "bio">;

export type PostWithMeta = Post & {
  author: AuthorLike;
  _count: {
    comments: number;
    likes: number;
  };
  likes?: Array<Pick<Like, "userId">>;
  saves?: Array<Pick<Save, "userId">>;
};

export type CommentWithAuthor = Comment & {
  user: Pick<User, "id" | "username" | "name" | "avatarUrl">;
};

export type PublicUserStats = {
  posts: number;
  followers: number;
  following: number;
  likes: number;
};

export type PublicUserExtras = {
  isFollowing?: boolean;
  isMe?: boolean;
};

export const toUserMini = (user: AuthorLike) => ({
  id: user.id,
  username: user.username,
  displayName: user.name ?? user.username,
  name: user.name ?? null,
  avatarUrl: user.avatarUrl ?? null,
});

export const toPostResponse = (post: PostWithMeta, opts?: { currentUserId?: string }) => {
  const liked =
    opts?.currentUserId && Array.isArray(post.likes)
      ? post.likes.some((like) => like.userId === opts.currentUserId)
      : undefined;

  const saved =
    opts?.currentUserId && Array.isArray(post.saves)
      ? post.saves.some((save) => save.userId === opts.currentUserId)
      : undefined;

  return {
    id: post.id,
    imageUrl: post.imageUrl ?? "",
    caption: post.caption,
    createdAt: post.createdAt.toISOString(),
    author: toUserMini(post.author),
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    liked,
    saved,
  };
};

export const toPublicUserResponse = (
  user: PublicUserBase,
  stats: PublicUserStats,
  extras?: PublicUserExtras
) => ({
  id: user.id,
  username: user.username,
  name: user.name ?? null,
  displayName: user.name ?? user.username,
  bio: user.bio ?? null,
  avatarUrl: user.avatarUrl ?? null,
  email: user.email,
  phone: user.phone ?? null,
  counts: {
    posts: stats.posts,
    followers: stats.followers,
    following: stats.following,
    likes: stats.likes,
  },
  isFollowing: extras?.isFollowing ?? false,
  isMe: extras?.isMe ?? false,
});

export const toFollowUser = (
  user: PublicUserBase,
  stats: PublicUserStats,
  extras?: { isFollowing?: boolean; defaultIsFollowing?: boolean | null; isMe?: boolean }
) => ({
  id: user.id,
  username: user.username,
  name: user.name ?? null,
  displayName: user.name ?? user.username,
  avatarUrl: user.avatarUrl ?? null,
  counts: {
    posts: stats.posts,
    followers: stats.followers,
    following: stats.following,
    likes: stats.likes,
  },
  isFollowing:
    extras?.isFollowing ??
    (typeof extras?.defaultIsFollowing === "boolean" ? extras.defaultIsFollowing : undefined),
  isMe: extras?.isMe ?? false,
});

export const toCommentResponse = (comment: CommentWithAuthor) => ({
  id: comment.id,
  postId: comment.postId,
  body: comment.body,
  createdAt: comment.createdAt.toISOString(),
  author: toUserMini(comment.user),
});

export const buildPostInclude = (currentUserId?: string): Prisma.PostInclude => {
  const include: Prisma.PostInclude = {
    author: { select: { id: true, username: true, name: true, avatarUrl: true } },
    _count: { select: { comments: true, likes: true } },
  };

  if (currentUserId) {
    include.likes = { where: { userId: currentUserId }, select: { userId: true } };
    include.saves = { where: { userId: currentUserId }, select: { userId: true } };
  }

  return include;
};
