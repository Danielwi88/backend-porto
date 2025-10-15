import { z } from "zod";

export const feedQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(12),
  }),
});

export const postIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const postSlugParamSchema = z.object({
  params: z.object({
    postId: z.string().min(1),
  }),
});

export const createPostSchema = z.object({
  body: z.object({
    caption: z.string().max(2200).optional(),
  }),
});

export const commentsListSchema = postSlugParamSchema.extend({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(10),
  }),
});

export const commentCreateSchema = postSlugParamSchema.extend({
  body: z.object({
    body: z.string().min(1).max(2000).optional(),
    text: z.string().min(1).max(2000).optional(),
    comment: z.string().min(1).max(2000).optional(),
  }),
});

export const commentIdSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const likesListSchema = postSlugParamSchema.extend({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
  }),
});
