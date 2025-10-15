import { z } from "zod";

export const registerSchema = z.object({
  body: z
    .object({
      name: z.string().min(2).max(120),
      username: z
        .string()
        .min(3)
        .max(30)
        .regex(/^[a-z0-9_]+$/i, "Username can contain letters, numbers, and underscores only"),
      email: z.string().email(),
      phone: z
        .string()
        .min(6)
        .max(20)
        .regex(/^[+0-9()[\]\-\s]*$/, "Phone can include digits, spaces, and +()-")
        .optional()
        .or(z.literal("").transform(() => undefined)),
      password: z.string().min(8).max(100),
    })
    .strict(),
});

export const loginSchema = z.object({
  body: z
    .object({
      email: z.string().email(),
      password: z.string().min(8).max(100),
    })
    .strict(),
});
