import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

async function ensureLegacyUsernames() {
  const columnInfo = await prisma.$queryRaw<
    Array<{ is_nullable: "YES" | "NO" }>
  >`
    SELECT is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name = 'username'
    LIMIT 1
  `;

  const columnExists = columnInfo.length > 0;

  if (!columnExists) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "username" TEXT`);
  }

  await prisma.$executeRawUnsafe(`
    UPDATE "User"
    SET "username" = CONCAT('user_', "id")
    WHERE "username" IS NULL OR BTRIM("username") = ''
  `);

  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL`);

  const indexInfo = await prisma.$queryRaw<Array<{ exists: number }>>`
    SELECT 1 AS exists
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'User'
      AND indexname = 'User_username_key'
    LIMIT 1
  `;

  if (!indexInfo.length) {
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username")`,
    );
  }
}

let schemaGuard: Promise<void> | null = null;

export function ensureDatabaseCompatibility(): Promise<void> {
  if (!schemaGuard) {
    schemaGuard = ensureLegacyUsernames().catch((error) => {
      console.error("Failed to ensure database compatibility", error);
      throw error;
    });
  }
  return schemaGuard;
}
