import { prisma } from "api-core/src/db";

async function main() {
  await prisma.user.upsert({
    where: { email: "user1@mail.com" },
    update: {},
    create: { email: "user1@mail.com", passwordHash: "<hashed>" }
  });

  await prisma.post.createMany({
    data: Array.from({ length: 5 }).map((_, i) => ({
      caption: `Sample ${i+1}`,
      authorId: "<some-user-id>",
      imageUrl: "https://picsum.photos/400"
    }))
  });
}
main().finally(() => prisma.$disconnect());