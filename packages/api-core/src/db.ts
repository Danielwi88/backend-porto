import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

type ColumnMetadata = {
  column_name: string;
  is_nullable: "YES" | "NO";
};

async function ensureUserTableShape() {
  const columnInfo = await prisma.$queryRaw<ColumnMetadata[]>`
    SELECT column_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
  `;

  const columns = new Map(columnInfo.map((col) => [col.column_name, col]));

  const ensureColumn = async (name: string, definition: string) => {
    if (!columns.has(name)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN ${definition}`);
      columns.set(name, { column_name: name, is_nullable: "YES" });
    }
  };

  await Promise.all([
    ensureColumn(`username`, `"username" TEXT`),
    ensureColumn(`phone`, `"phone" TEXT`),
    ensureColumn(`bio`, `"bio" TEXT`),
    ensureColumn(`avatarUrl`, `"avatarUrl" TEXT`),
  ]);

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
    schemaGuard = ensureUserTableShape().catch((error) => {
      console.error("Failed to ensure database compatibility", error);
      throw error;
    });
  }
  return schemaGuard;
}
