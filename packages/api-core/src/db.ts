import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

type ColumnMetadata = {
  column_name: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
};

async function ensurePgcrypto() {
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
  } catch (error) {
    console.warn("Unable to enable pgcrypto extension (continuing)", error);
  }
}

async function getColumns(table: string): Promise<Map<string, ColumnMetadata>> {
  const result = (await prisma.$queryRawUnsafe(
    `SELECT column_name, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = '${table}'`
  )) as ColumnMetadata[] | null;

  const rows = result ?? [];
  return new Map(rows.map((col) => [col.column_name, col]));
}

async function ensureColumns(table: string, columns: Array<{ name: string; definition: string }>) {
  const existing = await getColumns(table);

  for (const column of columns) {
    if (!existing.has(column.name)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN ${column.definition}`);
    }
  }
}

async function ensureTimestampColumn(table: string, column: string) {
  const columns = await getColumns(table);

  if (!columns.has(column)) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "${column}" TIMESTAMPTZ`);
  }

  await prisma.$executeRawUnsafe(
    `UPDATE "${table}"
     SET "${column}" = now()
     WHERE "${column}" IS NULL`,
  );

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${table}" ALTER COLUMN "${column}" SET DEFAULT now()`,
  );

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "${table}" ALTER COLUMN "${column}" SET NOT NULL`,
  );
}

async function ensureUserTableShape() {
  await ensureColumns("User", [
    { name: "username", definition: `"username" TEXT` },
    { name: "phone", definition: `"phone" TEXT` },
    { name: "bio", definition: `"bio" TEXT` },
    { name: "avatarUrl", definition: `"avatarUrl" TEXT` },
  ]);

  await prisma.$executeRawUnsafe(`
    UPDATE "User"
    SET "username" = CONCAT('user_', "id")
    WHERE "username" IS NULL OR BTRIM("username") = ''
  `);

  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL`);

  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username")`,
  );
}

async function ensureFollowTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Follow" (
      "id" TEXT PRIMARY KEY,
      "followerId" TEXT NOT NULL,
      "followingId" TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await ensureTimestampColumn("Follow", "createdAt");

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'Follow_followerId_fkey'
      ) THEN
        ALTER TABLE "Follow"
          ADD CONSTRAINT "Follow_followerId_fkey"
          FOREIGN KEY ("followerId") REFERENCES "User"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'Follow_followingId_fkey'
      ) THEN
        ALTER TABLE "Follow"
          ADD CONSTRAINT "Follow_followingId_fkey"
          FOREIGN KEY ("followingId") REFERENCES "User"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END;
    $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Follow_followerId_followingId_key"
    ON "Follow"("followerId", "followingId")
  `);
}

async function ensurePostGraphTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Post" (
      "id" TEXT PRIMARY KEY,
      "authorId" TEXT NOT NULL,
      "caption" TEXT NOT NULL,
      "imageUrl" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await ensureTimestampColumn("Post", "createdAt");
  await ensureTimestampColumn("Post", "updatedAt");
  await ensureColumns("Post", [{ name: "imageUrl", definition: `"imageUrl" TEXT` }]);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Comment" (
      "id" TEXT PRIMARY KEY,
      "postId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await ensureTimestampColumn("Comment", "createdAt");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Like" (
      "id" TEXT PRIMARY KEY,
      "postId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await ensureTimestampColumn("Like", "createdAt");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Save" (
      "id" TEXT PRIMARY KEY,
      "postId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await ensureTimestampColumn("Save", "createdAt");

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Post_authorId_fkey') THEN
        ALTER TABLE "Post"
          ADD CONSTRAINT "Post_authorId_fkey"
          FOREIGN KEY ("authorId") REFERENCES "User"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Comment_postId_fkey') THEN
        ALTER TABLE "Comment"
          ADD CONSTRAINT "Comment_postId_fkey"
          FOREIGN KEY ("postId") REFERENCES "Post"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Comment_userId_fkey') THEN
        ALTER TABLE "Comment"
          ADD CONSTRAINT "Comment_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Like_postId_fkey') THEN
        ALTER TABLE "Like"
          ADD CONSTRAINT "Like_postId_fkey"
          FOREIGN KEY ("postId") REFERENCES "Post"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Like_userId_fkey') THEN
        ALTER TABLE "Like"
          ADD CONSTRAINT "Like_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Save_postId_fkey') THEN
        ALTER TABLE "Save"
          ADD CONSTRAINT "Save_postId_fkey"
          FOREIGN KEY ("postId") REFERENCES "Post"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Save_userId_fkey') THEN
        ALTER TABLE "Save"
          ADD CONSTRAINT "Save_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END;
    $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Like_postId_userId_key"
    ON "Like"("postId", "userId")
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Save_postId_userId_key"
    ON "Save"("postId", "userId")
  `);
}

let schemaGuard: Promise<void> | null = null;

export function ensureDatabaseCompatibility(): Promise<void> {
  if (!schemaGuard) {
    schemaGuard = (async () => {
      await ensurePgcrypto();
      await ensureUserTableShape();
      await ensureFollowTable();
      await ensurePostGraphTables();
    })().catch((error) => {
      console.error("Failed to ensure database compatibility", error);
      throw error;
    });
  }
  return schemaGuard;
}
