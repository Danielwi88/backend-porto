import { z } from "zod";

export const updateMeSchema = z.object({
  body: z
    .object({
      name: z.string().min(2).max(120).optional(),
      username: z
        .string()
        .min(3)
        .max(30)
        .regex(/^[a-z0-9_]+$/i, "Username can contain letters, numbers, and underscores only")
        .optional(),
      phone: z
        .string()
        .max(25)
        .regex(/^[+0-9()[\]\-\s]*$/, "Phone can include digits, spaces, and +()-")
        .optional(),
      bio: z.string().max(280).optional(),
      avatarUrl: z.string().url().optional(),
    })
    .partial(),
});

export const paginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(20),
  }),
});
