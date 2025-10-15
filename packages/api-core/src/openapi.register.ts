import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
extendZodWithOpenApi(z);
import { registry } from "./openapi.js";

import { registerSchema, loginSchema } from "./modules/auth/auth.schemas.js";
import { updateMeSchema } from "./modules/me/me.schemas.js";
import {
  commentCreateSchema,
  commentsListSchema,
  createPostSchema,
  feedQuerySchema,
  likesListSchema,
  postIdParamSchema,
  postSlugParamSchema,
} from "./modules/posts/posts.schemas.js";
import { followListSchema, searchUsersSchema, usernameParamSchema } from "./modules/users/users.schemas.js";

const TokenResponse = z.object({
  token: z.string().openapi({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…" }),
});

const UserCounts = z.object({
  posts: z.number().int().nonnegative(),
  followers: z.number().int().nonnegative(),
  following: z.number().int().nonnegative(),
  likes: z.number().int().nonnegative(),
});

const UserMini = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

const PublicUser = UserMini.extend({
  bio: z.string().nullable().optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  counts: UserCounts.optional(),
  isFollowing: z.boolean().optional(),
  isMe: z.boolean().optional(),
});

const Post = z.object({
  id: z.string(),
  imageUrl: z.string().openapi({ example: "/uploads/abc123.jpg" }),
  caption: z.string(),
  createdAt: z.string(),
  author: UserMini,
  likeCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  liked: z.boolean().optional(),
  saved: z.boolean().optional(),
});

const Comment = z.object({
  id: z.string(),
  postId: z.string(),
  body: z.string(),
  createdAt: z.string(),
  author: UserMini,
});

const Pagination = z.object({
  page: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

const FeedResponse = z.object({
  items: z.array(Post),
  pagination: Pagination,
  nextCursor: z.string().nullable().optional(),
});

const CommentsResponse = z.object({
  items: z.array(Comment),
  pagination: Pagination,
  nextCursor: z.string().nullable().optional(),
});

const FollowListResponse = z.object({
  followers: z.array(PublicUser).optional(),
  following: z.array(PublicUser).optional(),
  users: z.array(PublicUser).optional(),
  items: z.array(PublicUser).optional(),
  pagination: Pagination.optional(),
});

const LikesResponse = z.object({
  users: z.array(PublicUser),
  pagination: Pagination,
});

const MePayload = z.object({
  profile: z.object({
    id: z.string(),
    username: z.string(),
    name: z.string().nullable().optional(),
    email: z.string().email(),
    phone: z.string().nullable().optional(),
    bio: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
  }),
  stats: UserCounts,
});

const CreatePostForm = createPostSchema.shape.body.extend({
  image: z
    .string()
    .openapi({ type: "string", format: "binary", description: "Image file" }),
});

const UpdateMeForm = updateMeSchema.shape.body.extend({
  avatar: z
    .string()
    .optional()
    .openapi({ type: "string", format: "binary", description: "Avatar image file" }),
});

function registerAuthPaths() {
  registry.registerPath({
    method: "post",
    path: "/api/auth/register",
    tags: ["Auth"],
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: registerSchema.shape.body } },
      },
    },
    responses: {
      201: {
        description: "Registration successful",
        content: { "application/json": { schema: TokenResponse } },
      },
      400: { description: "Validation error or duplicate email/username" },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/auth/login",
    tags: ["Auth"],
    request: {
      body: {
        required: true,
        content: { "application/json": { schema: loginSchema.shape.body } },
      },
    },
    responses: {
      200: {
        description: "Login successful",
        content: { "application/json": { schema: TokenResponse } },
      },
      401: { description: "Invalid credentials" },
    },
  });
}

function registerMePaths() {
  registry.registerPath({
    method: "get",
    path: "/api/me",
    tags: ["Me"],
    responses: {
      200: { description: "Current profile", content: { "application/json": { schema: MePayload } } },
      401: { description: "Unauthorized" },
    },
    security: [{ bearerAuth: [] }],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/me",
    tags: ["Me"],
    request: {
      body: {
        required: false,
        content: {
          "multipart/form-data": { schema: UpdateMeForm.partial() },
        },
      },
    },
    responses: {
      200: { description: "Updated profile", content: { "application/json": { schema: MePayload } } },
      400: { description: "Validation error" },
      401: { description: "Unauthorized" },
    },
    security: [{ bearerAuth: [] }],
  });

  registry.registerPath({
    method: "get",
    path: "/api/me/saved",
    tags: ["Me"],
    request: { query: feedQuerySchema.shape.query.partial() },
    responses: {
      200: {
        description: "Saved posts",
        content: {
          "application/json": {
            schema: FeedResponse.extend({
              posts: z.array(Post).optional(),
              data: z
                .object({
                  items: z.array(Post),
                  posts: z.array(Post),
                  pagination: Pagination,
                })
                .optional(),
            }),
          },
        },
      },
      401: { description: "Unauthorized" },
    },
    security: [{ bearerAuth: [] }],
  });

  registry.registerPath({
    method: "get",
    path: "/api/me/likes",
    tags: ["Me"],
    responses: {
      200: { description: "Posts liked by current user", content: { "application/json": { schema: z.array(Post) } } },
      401: { description: "Unauthorized" },
    },
    security: [{ bearerAuth: [] }],
  });

  const followQuery = followListSchema.shape.query;

  registry.registerPath({
    method: "get",
    path: "/api/me/followers",
    tags: ["Me"],
    request: { query: followQuery },
    responses: {
      200: { description: "Followers", content: { "application/json": { schema: FollowListResponse } } },
      401: { description: "Unauthorized" },
    },
    security: [{ bearerAuth: [] }],
  });

  registry.registerPath({
    method: "get",
    path: "/api/me/following",
    tags: ["Me"],
    request: { query: followQuery },
    responses: {
      200: { description: "Accounts the user follows", content: { "application/json": { schema: FollowListResponse } } },
      401: { description: "Unauthorized" },
    },
    security: [{ bearerAuth: [] }],
  });
}

function registerFeedPaths() {
  registry.registerPath({
    method: "get",
    path: "/api/feed",
    tags: ["Feed"],
    request: { query: feedQuerySchema.shape.query },
    responses: {
      200: { description: "Feed page", content: { "application/json": { schema: FeedResponse } } },
    },
  });
}

function registerPostPaths() {
  registry.registerPath({
    method: "post",
    path: "/api/posts",
    tags: ["Posts"],
    request: {
      body: {
        required: true,
        content: {
          "multipart/form-data": { schema: CreatePostForm },
        },
      },
    },
    responses: {
      201: { description: "Created post", content: { "application/json": { schema: Post } } },
      400: { description: "Validation error" },
      401: { description: "Unauthorized" },
    },
    security: [{ bearerAuth: [] }],
  });

  registry.registerPath({
    method: "get",
    path: "/api/posts/{id}",
    tags: ["Posts"],
    request: { params: postIdParamSchema.shape.params },
    responses: {
      200: { description: "Post", content: { "application/json": { schema: Post } } },
      404: { description: "Not found" },
    },
  });

  registry.registerPath({
    method: "delete",
    path: "/api/posts/{id}",
    tags: ["Posts"],
    request: { params: postIdParamSchema.shape.params },
    responses: {
      200: { description: "Deleted", content: { "application/json": { schema: z.object({ ok: z.boolean() }) } } },
      401: { description: "Unauthorized" },
      403: { description: "Forbidden" },
      404: { description: "Not found" },
    },
    security: [{ bearerAuth: [] }],
  });

  const likeResponse = z.object({ liked: z.boolean(), likeCount: z.number().int().nonnegative() });

  registry.registerPath({
    method: "post",
    path: "/api/posts/{id}/like",
    tags: ["Posts"],
    request: { params: postIdParamSchema.shape.params },
    responses: {
      200: { description: "Liked", content: { "application/json": { schema: likeResponse } } },
      401: { description: "Unauthorized" },
    },
    security: [{ bearerAuth: [] }],
  });

  registry.registerPath({
    method: "delete",
    path: "/api/posts/{id}/like",
    tags: ["Posts"],
    request: { params: postIdParamSchema.shape.params },
    responses: {
      200: { description: "Unliked", content: { "application/json": { schema: likeResponse } } },
      401: { description: "Unauthorized" },
    },
    security: [{ bearerAuth: [] }],
  });

  const saveResponse = z.object({ saved: z.boolean() });

  registry.registerPath({
    method: "post",
    path: "/api/posts/{id}/save",
    tags: ["Posts"],
    request: { params: postIdParamSchema.shape.params },
    responses: {
      200: { description: "Saved", content: { "application/json": { schema: saveResponse } } },
      401: { description: "Unauthorized" },
    },
    security: [{ bearerAuth: [] }],
  });

  registry.registerPath({
    method: "delete",
    path: "/api/posts/{id}/save",
    tags: ["Posts"],
    request: { params: postIdParamSchema.shape.params },
    responses: {
      200: { description: "Unsaved", content: { "application/json": { schema: saveResponse } } },
      401: { description: "Unauthorized" },
    },
    security: [{ bearerAuth: [] }],
  });
}

function registerCommentPaths() {
  registry.registerPath({
    method: "get",
    path: "/api/posts/{postId}/comments",
    tags: ["Comments"],
    request: {
      params: postSlugParamSchema.shape.params,
      query: commentsListSchema.shape.query,
    },
    responses: {
      200: { description: "Comments", content: { "application/json": { schema: CommentsResponse } } },
      404: { description: "Post not found" },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/posts/{postId}/comments",
    tags: ["Comments"],
    request: {
      params: postSlugParamSchema.shape.params,
      body: { content: { "application/json": { schema: commentCreateSchema.shape.body } } },
    },
    responses: {
      201: { description: "Created", content: { "application/json": { schema: Comment } } },
      400: { description: "Validation error" },
      401: { description: "Unauthorized" },
      404: { description: "Post not found" },
    },
    security: [{ bearerAuth: [] }],
  });

  registry.registerPath({
    method: "delete",
    path: "/api/comments/{id}",
    tags: ["Comments"],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: { description: "Deleted", content: { "application/json": { schema: z.object({ ok: z.boolean() }) } } },
      401: { description: "Unauthorized" },
      403: { description: "Forbidden" },
      404: { description: "Not found" },
    },
    security: [{ bearerAuth: [] }],
  });
}

function registerLikesPath() {
  registry.registerPath({
    method: "get",
    path: "/api/posts/{postId}/likes",
    tags: ["Posts"],
    request: { params: postSlugParamSchema.shape.params, query: likesListSchema.shape.query },
    responses: {
      200: { description: "Users who liked a post", content: { "application/json": { schema: LikesResponse } } },
      404: { description: "Post not found" },
    },
  });
}

function registerFollowPaths() {
  registry.registerPath({
    method: "post",
    path: "/api/follow/{username}",
    tags: ["Follow"],
    request: { params: usernameParamSchema.shape.params },
    responses: {
      200: {
        description: "Followed",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(true), message: z.string(), following: z.boolean(), counts: UserCounts }),
          },
        },
      },
      400: { description: "Cannot follow" },
      401: { description: "Unauthorized" },
      404: { description: "User not found" },
    },
    security: [{ bearerAuth: [] }],
  });

  registry.registerPath({
    method: "delete",
    path: "/api/follow/{username}",
    tags: ["Follow"],
    request: { params: usernameParamSchema.shape.params },
    responses: {
      200: {
        description: "Unfollowed",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(true), message: z.string(), following: z.boolean(), counts: UserCounts }),
          },
        },
      },
      400: { description: "Cannot unfollow" },
      401: { description: "Unauthorized" },
      404: { description: "User not found" },
    },
    security: [{ bearerAuth: [] }],
  });
}

function registerUserPaths() {
  registry.registerPath({
    method: "get",
    path: "/api/users/search",
    tags: ["Users"],
    request: { query: searchUsersSchema.shape.query },
    responses: {
      200: {
        description: "Search users",
        content: {
          "application/json": {
            schema: z.object({
              users: z.array(PublicUser),
              pagination: Pagination,
            }),
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/users/{username}",
    tags: ["Users"],
    request: { params: usernameParamSchema.shape.params },
    responses: {
      200: { description: "Public profile", content: { "application/json": { schema: PublicUser.extend({ counts: UserCounts }) } } },
      404: { description: "Not found" },
    },
  });

  const simpleListResponse = z.object({ posts: z.array(Post), items: z.array(Post).optional() });

  registry.registerPath({
    method: "get",
    path: "/api/users/{username}/posts",
    tags: ["Users"],
    request: { params: usernameParamSchema.shape.params },
    responses: {
      200: { description: "User posts", content: { "application/json": { schema: simpleListResponse } } },
      404: { description: "User not found" },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/users/{username}/likes",
    tags: ["Users"],
    request: { params: usernameParamSchema.shape.params },
    responses: {
      200: { description: "Posts the user liked", content: { "application/json": { schema: simpleListResponse } } },
      404: { description: "User not found" },
    },
  });

  const followQuery = followListSchema.shape.query.partial();

  registry.registerPath({
    method: "get",
    path: "/api/users/{username}/followers",
    tags: ["Users"],
    request: { params: usernameParamSchema.shape.params, query: followQuery },
    responses: {
      200: { description: "Followers", content: { "application/json": { schema: FollowListResponse } } },
      404: { description: "User not found" },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/users/{username}/following",
    tags: ["Users"],
    request: { params: usernameParamSchema.shape.params, query: followQuery },
    responses: {
      200: { description: "Following", content: { "application/json": { schema: FollowListResponse } } },
      404: { description: "User not found" },
    },
  });
}

export function registerAllPaths() {
  registry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  });

  registerAuthPaths();
  registerMePaths();
  registerFeedPaths();
  registerPostPaths();
  registerCommentPaths();
  registerLikesPath();
  registerFollowPaths();
  registerUserPaths();
}
