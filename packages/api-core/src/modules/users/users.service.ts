import { prisma } from "../../db.js";
import jwt from "jsonwebtoken";
import { hash, compare } from "../../utils/passwords.js";

function signTokens(userId: string, role: "USER" | "ADMIN") {
  const secret = process.env.JWT_SECRET!;
  const accessToken = jwt.sign({ sub: userId, role }, secret, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ sub: userId, role, t: "refresh" }, secret, { expiresIn: "7d" });
  return { accessToken, refreshToken };
}

export async function register(email: string, password: string, name?: string) {
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new Error("Email already used");
  const passwordHash = await hash(password);
  const user = await prisma.user.create({ data: { email, passwordHash, name } });
  return signTokens(user.id, user.role);
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Invalid credentials");
  const ok = await compare(password, user.passwordHash);
  if (!ok) throw new Error("Invalid credentials");
  return signTokens(user.id, user.role);
}
