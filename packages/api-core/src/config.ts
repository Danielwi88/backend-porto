export const cfg = {
  port: Number(process.env.PORT ?? 9000),
  jwtSecret: process.env.JWT_SECRET!,
  corsOrigins: (process.env.CORS_ORIGIN ?? "*").split(","),
};