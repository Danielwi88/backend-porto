export { makeApp } from "./server.js";
export { health } from "./routes/health.js";
export { buildOpenApiDoc, registry } from "./openapi.js";
export { registerAllPaths } from "./openapi.register.js";
export { ensureDatabaseCompatibility } from "./db.js";
