import type { Request, Response } from "express";
import type { ValidatedRequest } from "../../middlewares/validate.js";
import {
  feedQuerySchema,
  createPostSchema,
  postIdParamSchema,
  postSlugParamSchema,
  commentCreateSchema,
  commentsListSchema,
  commentIdSchema,
  likesListSchema,
} from "./posts.schemas.js";
import { prisma } from "../../db.js";
import { publicUrlFor } from "../../utils/uploads.js";
import {
  buildPostInclude,
  toCommentResponse,
  toPostResponse,
} from "../shared/transformers.js";
import { toFollowUser } from "../shared/transformers.js";
import * as userService from "../users/users.service.js";

type FeedRequest = ValidatedRequest<typeof feedQuerySchema>;
type CreatePostRequest = ValidatedRequest<typeof createPostSchema>;
type PostIdRequest = ValidatedRequest<typeof postIdParamSchema>;
type PostSlugRequest = ValidatedRequest<typeof postSlugParamSchema>;
type CommentCreateRequest = ValidatedRequest<typeof commentCreateSchema>;
type CommentsListRequest = ValidatedRequest<typeof commentsListSchema>;
type CommentIdRequest = ValidatedRequest<typeof commentIdSchema>;
type LikesListRequest = ValidatedRequest<typeof likesListSchema>;

const zeroStats = { posts: 0, followers: 0, following: 0, likes: 0 } as const;

export async function getFeed(req: Request, res: Response) {
  const { page, limit } = (req as FeedRequest).input.query;
  const currentUserId = req.user?.sub;

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: buildPostInclude(currentUserId),
    }),
    prisma.post.count(),
  ]);

  const posts = items.map((post) => toPostResponse(post, { currentUserId }));
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const nextCursor = page < totalPages ? String(page + 1) : null;

  res.json({
    items: posts,
    pagination: { page, limit, total, totalPages },
    nextCursor,
    data: { items: posts, pagination: { page, limit, total, totalPages } },
  });
}

export async function getPost(req: Request, res: Response) {
  const { id } = (req as PostIdRequest).input.params;
  const currentUserId = req.user?.sub;

  const post = await prisma.post.findUnique({
    where: { id },
    include: buildPostInclude(currentUserId),
  });

  if (!post) return res.status(404).json({ error: "Post not found" });

  res.json(toPostResponse(post, { currentUserId }));
}

export async function createPost(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { caption } = (req as CreatePostRequest).input.body ?? {};
  const file = (req as Request & { file?: Express.Multer.File }).file;

  if (!file) return res.status(400).json({ error: "Image upload is required" });

  const post = await prisma.post.create({
    data: {
      authorId: userId,
      caption: caption?.trim() ?? "",
      imageUrl: publicUrlFor(file.filename),
    },
    include: buildPostInclude(userId),
  });

  res.status(201).json(toPostResponse(post, { currentUserId: userId }));
}

export async function deletePost(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { id } = (req as PostIdRequest).input.params;
  const post = await prisma.post.findUnique({ where: { id }, select: { id: true, authorId: true } });
  if (!post) return res.status(404).json({ error: "Post not found" });
  if (post.authorId !== userId) return res.status(403).json({ error: "Forbidden" });

  await prisma.comment.deleteMany({ where: { postId: id } });
  await prisma.like.deleteMany({ where: { postId: id } });
  await prisma.save.deleteMany({ where: { postId: id } });
  await prisma.post.delete({ where: { id } });

  res.json({ ok: true });
}

export async function likePost(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { id } = (req as PostIdRequest).input.params;
  const post = await prisma.post.findUnique({ where: { id }, select: { id: true } });
  if (!post) return res.status(404).json({ error: "Post not found" });

  await prisma.like.upsert({
    where: { postId_userId: { postId: id, userId } },
    update: {},
    create: { postId: id, userId },
  });

  const likeCount = await prisma.like.count({ where: { postId: id } });
  res.json({ liked: true, likeCount });
}

export async function unlikePost(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { id } = (req as PostIdRequest).input.params;
  await prisma.like.deleteMany({ where: { postId: id, userId } });
  const likeCount = await prisma.like.count({ where: { postId: id } });
  res.json({ liked: false, likeCount });
}

export async function savePost(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { id } = (req as PostIdRequest).input.params;
  await prisma.save.upsert({
    where: { postId_userId: { postId: id, userId } },
    update: {},
    create: { postId: id, userId },
  });

  res.json({ saved: true });
}

export async function unsavePost(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { id } = (req as PostIdRequest).input.params;
  await prisma.save.deleteMany({ where: { postId: id, userId } });
  res.json({ saved: false });
}

export async function listComments(req: Request, res: Response) {
  const { postId } = (req as CommentsListRequest).input.params;
  const { page, limit } = (req as CommentsListRequest).input.query;

  const [items, total] = await Promise.all([
    prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, username: true, name: true, avatarUrl: true } },
      },
    }),
    prisma.comment.count({ where: { postId } }),
  ]);

  const comments = items.map(toCommentResponse);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const nextCursor = page < totalPages ? String(page + 1) : null;

  res.json({
    items: comments,
    pagination: { page, limit, total, totalPages },
    nextCursor,
    data: { items: comments, pagination: { page, limit, total, totalPages }, nextCursor },
  });
}

export async function addComment(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { postId } = (req as CommentCreateRequest).input.params;
  const payload = (req as CommentCreateRequest).input.body ?? {};

  const text = (payload.body ?? payload.text ?? payload.comment ?? "").trim();
  if (!text) return res.status(400).json({ error: "Comment cannot be empty" });

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) return res.status(404).json({ error: "Post not found" });

  const comment = await prisma.comment.create({
    data: { body: text, postId, userId },
    include: {
      user: { select: { id: true, username: true, name: true, avatarUrl: true } },
    },
  });

  res.status(201).json(toCommentResponse(comment));
}

export async function deleteComment(req: Request, res: Response) {
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { id } = (req as CommentIdRequest).input.params;
  const comment = await prisma.comment.findUnique({
    where: { id },
    include: { post: { select: { authorId: true } } },
  });

  if (!comment) return res.status(404).json({ error: "Comment not found" });
  if (comment.userId !== userId && comment.post.authorId !== userId)
    return res.status(403).json({ error: "Forbidden" });

  await prisma.comment.delete({ where: { id } });
  res.json({ ok: true });
}

export async function listPostLikes(req: Request, res: Response) {
  const currentUserId = req.user?.sub;
  const { postId } = (req as LikesListRequest).input.params;
  const { page, limit } = (req as LikesListRequest).input.query;

  const [rows, total] = await Promise.all([
    prisma.like.findMany({
      where: { postId },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.like.count({ where: { postId } }),
  ]);

  const userIds = rows.map((row) => row.user.id);
  const followingSet = await userService.resolveFollowingSet(currentUserId, userIds);
  const stats = await userService.getStatsForUsers(userIds);

  const users = rows.map((row) =>
    toFollowUser(row.user, stats.get(row.user.id) ?? { ...zeroStats }, {
      isFollowing: followingSet.has(row.user.id),
      isMe: currentUserId === row.user.id,
    })
  );

  const totalPages = Math.max(1, Math.ceil(total / limit));

  res.json({
    users,
    pagination: { page, limit, total, totalPages },
    data: { users, pagination: { page, limit, total, totalPages } },
  });
}
