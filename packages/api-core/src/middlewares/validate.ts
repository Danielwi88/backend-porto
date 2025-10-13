import type { NextFunction, Request, Response } from "express";
import type { AnyZodObject, TypeOf } from "zod";

export type ValidatedRequest<TSchema extends AnyZodObject> = Request & {
  input: TypeOf<TSchema>;
};

export const validate =
  <TSchema extends AnyZodObject>(schema: TSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    (req as ValidatedRequest<TSchema>).input = parsed.data;
    next();
  };
