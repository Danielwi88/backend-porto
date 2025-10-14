// packages/api-core/src/openapi.register.ts
import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
extendZodWithOpenApi(z);
import { registry } from "./openapi.js";

// import your existing schemas so we reuse them
import { registerSchema, loginSchema } from "./modules/users/users.schemas.js";

// Common response schemas
const Tokens = z.object({
  accessToken: z.string().openapi({ example: "eyJhbGciOi..." }),
  refreshToken: z.string().openapi({ example: "eyJhbGciOi..." }),
});

const Me = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
  role: z.enum(["USER", "ADMIN"]),
  avatarUrl: z.string().url().nullable().optional(),
});

// ---- Users
export function registerUserPaths() {
  registry.registerPath({
    method: "post",
    path: "/api/users/register",
    tags: ["Users"],
    request: {
      body: {
        content: {
          "application/json": { schema: registerSchema.shape.body },
        },
      },
    },
    responses: {
      201: {
        description: "Registered – returns tokens",
        content: { "application/json": { schema: Tokens } },
      },
      400: { description: "Validation or duplicate email" },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/users/login",
    tags: ["Users"],
    request: {
      body: {
        content: {
          "application/json": { schema: loginSchema.shape.body },
        },
      },
    },
    responses: {
      200: {
        description: "Logged in – returns tokens",
        content: { "application/json": { schema: Tokens } },
      },
      401: { description: "Invalid credentials" },
    },
  });

  registry.registerPath({
    method: "get",
    path: "/api/users/me",
    tags: ["Users"],
    responses: {
      200: { description: "Current user", content: { "application/json": { schema: Me } } },
      401: { description: "Unauthorized" },
    },
    security: [{ bearerAuth: [] }],
  });
}

// ---- Posts (minimal – list & create; add like/save similarly)
const PostCreate = z.object({
  caption: z.string().min(1),
  imageUrl: z.string().url().optional(),
});

const Post = z.object({
  id: z.string(),
  caption: z.string(),
  imageUrl: z.string().url().nullable().optional(),
  createdAt: z.string(),
  author: z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    avatarUrl: z.string().url().nullable().optional(),
  }).optional(),
});

export function registerPostPaths() {
  registry.registerPath({
    method: "get",
    path: "/api/posts",
    tags: ["Posts"],
    request: {
      query: z.object({
        cursor: z.string().optional(),
        limit: z.coerce.number().min(1).max(50).default(10),
      }),
    },
    responses: {
      200: {
        description: "Paginated posts",
        content: {
          "application/json": {
            schema: z.object({
              items: z.array(Post),
              nextCursor: z.string().nullable(),
            }),
          },
        },
      },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/posts",
    tags: ["Posts"],
    request: {
      body: { content: { "application/json": { schema: PostCreate } } },
    },
    responses: {
      201: {
        description: "Created post",
        content: { "application/json": { schema: Post } },
      },
      401: { description: "Unauthorized" },
    },
    security: [{ bearerAuth: [] }],
  });

  // like/unlike/save can be added similarly if you want them in docs
}

// Call this once from the app to register everything
export function registerAllPaths() {
  // Optional: define bearer auth scheme
  registry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  });

  registerUserPaths();
  registerPostPaths();
}
