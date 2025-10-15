import jwt from "jsonwebtoken";
import { prisma } from "../../db.js";
import { hash, compare } from "../../utils/passwords.js";
import type { Role } from "@prisma/client";

const TOKEN_TTL = "7d";

const jwtSecret = () => {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return secret;
};

const signToken = (userId: string, role: Role) =>
  jwt.sign({ sub: userId, role }, jwtSecret(), { expiresIn: TOKEN_TTL });

const httpError = (status: number, message: string) => Object.assign(new Error(message), { status });

export async function register(data: {
  name: string;
  username: string;
  email: string;
  phone?: string;
  password: string;
}) {
  const normalizedEmail = data.email.trim().toLowerCase();
  const normalizedUsername = data.username.trim();

  const normalizedPhone = data.phone?.trim();

  const [emailExists, usernameExists] = await Promise.all([
    prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } }),
    prisma.user.findUnique({ where: { username: normalizedUsername }, select: { id: true } }),
  ]);

  if (emailExists) throw httpError(400, "Email already registered");
  if (usernameExists) throw httpError(400, "Username already taken");

  const passwordHash = await hash(data.password);
  const user = await prisma.user.create({
    data: {
      name: data.name.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      phone: normalizedPhone ? normalizedPhone : null,
      passwordHash,
    },
    select: { id: true, role: true },
  });

  return { token: signToken(user.id, user.role) };
}

export async function login(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, passwordHash: true, role: true },
  });

  if (!user) throw httpError(401, "Invalid credentials");

  const matches = await compare(password, user.passwordHash);
  if (!matches) throw httpError(401, "Invalid credentials");

  return { token: signToken(user.id, user.role) };
}
