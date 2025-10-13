import { prisma } from "api-core/src/db";
import { hash } from "api-core/src/utils/passwords";

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.ADMIN_PASSWORD ?? "Admin12345!";
  const passwordHash = await hash(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN" },
    create: { email, passwordHash, role: "ADMIN", name: "Admin" }
  });
  console.log("Admin upserted:", user.email);
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());