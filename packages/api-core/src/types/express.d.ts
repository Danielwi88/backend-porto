import type { JwtPayload } from "../middlewares/auth.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      input?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};
