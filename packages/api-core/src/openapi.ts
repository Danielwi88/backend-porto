// packages/api-core/src/openapi.ts
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// --- Export a single registry used by all modules
export const registry = new OpenAPIRegistry();

/**
 * Build an OpenAPI (Swagger) document from the registry.
 */
export function buildOpenApiDoc(
  opts?: { title?: string; version?: string },
): ReturnType<OpenApiGeneratorV3["generateDocument"]> {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: opts?.title ?? "Sociality API",
      version: opts?.version ?? "1.0.0",
      description: "OpenAPI generated from Zod schemas",
    },
    servers: [
      // helpful in Swagger "Try it out" – can be your Railway URL in prod
      { url: process.env.PUBLIC_API_URL ?? "http://localhost:9000" },
    ],
  });
}
