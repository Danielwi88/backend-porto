import { z } from "zod";

export const usernameParamSchema = z.object({
  params: z.object({
    username: z.string().min(1),
  }),
});

export const searchUsersSchema = z.object({
  query: z.object({
    q: z.string().optional().default(""),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
  }),
});

export const followListSchema = usernameParamSchema.extend({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
  }),
});
