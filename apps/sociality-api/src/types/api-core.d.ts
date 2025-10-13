declare module "api-core/src/db" {
  export { prisma } from "../../../packages/api-core/src/db.js";
}

declare module "api-core/src/utils/passwords" {
  export { hash, compare } from "../../../packages/api-core/src/utils/passwords.js";
}

declare module "api-core/src/server" {
  export { makeApp } from "../../../packages/api-core/src/server.js";
}
