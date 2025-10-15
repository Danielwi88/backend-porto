import { prisma } from "api-core/src/db";
import { hash } from "api-core/src/utils/passwords";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim() || "admin@example.com";
  const username = process.env.ADMIN_USERNAME?.trim() || "admin";
  const password = process.env.ADMIN_PASSWORD?.trim() || "Admin12345!";
  const passwordHash = await hash(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: "ADMIN",
      username,
      name: "Administrator",
    },
    create: {
      email,
      username,
      passwordHash,
      role: "ADMIN",
      name: "Administrator",
    },
  });

  console.log("Admin upserted:", { email: user.email, username: user.username });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
