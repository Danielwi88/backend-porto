import { prisma } from "api-core/src/db";
import { hash } from "api-core/src/utils/passwords";

type SeedUser = {
  email: string;
  username: string;
  name: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  role?: "USER" | "ADMIN";
};

async function resetDatabase() {
  await prisma.comment.deleteMany();
  await prisma.like.deleteMany();
  await prisma.save.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
}

async function seedUsers(): Promise<Map<string, { id: string; username: string }>> {
  const passwordHash = await hash("Password123!");

  const users: SeedUser[] = [
    {
      email: "sarah.johnson@example.com",
      username: "sarah",
      name: "Sarah Johnson",
      phone: "+1-555-0101",
      bio: "Product designer sharing color palettes, sketches, and life in Brooklyn.",
      avatarUrl: "https://i.pravatar.cc/150?img=5",
    },
    {
      email: "miguel.fernandez@example.com",
      username: "miguel",
      name: "Miguel Fernandez",
      phone: "+34-555-2201",
      bio: "Travel photographer chasing golden hours across Europe.",
      avatarUrl: "https://i.pravatar.cc/150?img=32",
    },
    {
      email: "ayana.tanaka@example.com",
      username: "ayana",
      name: "Ayana Tanaka",
      phone: "+81-555-7704",
      bio: "Full-stack dev building delightful social experiences.",
      avatarUrl: "https://i.pravatar.cc/150?img=15",
    },
    {
      email: "liam.murphy@example.com",
      username: "liam",
      name: "Liam Murphy",
      phone: "+353-555-4120",
      bio: "Videographer, editor, coffee lover ☕️🎬",
      avatarUrl: "https://i.pravatar.cc/150?img=17",
    },
  ];

  const createdUsers = await Promise.all(
    users.map((user) =>
      prisma.user.create({
        data: {
          email: user.email,
          username: user.username,
          name: user.name,
          phone: user.phone,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          passwordHash,
          role: user.role ?? "USER",
        },
        select: { id: true, username: true },
      })
    )
  );

  return new Map(
    createdUsers.map((user: { id: string; username: string }) => [user.username, user])
  );
}

async function seedPosts(
  users: Map<string, { id: string; username: string }>
): Promise<Map<string, { id: string; authorId: string }>> {
  const now = new Date();
  const posts = [
    {
      key: "sarah-1",
      authorUsername: "sarah",
      caption:
        "Moodboard for the spring capsule collection. Lots of muted greens and warm neutrals 🌿",
      imageUrl:
        "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=1200&q=80",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3),
    },
    {
      key: "sarah-2",
      authorUsername: "sarah",
      caption: "Work in progress: redesigning the interactions for explore cards.",
      imageUrl:
        "https://images.unsplash.com/photo-1431576901776-e539bd916ba2?auto=format&fit=crop&w=1200&q=80",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5),
    },
    {
      key: "miguel-1",
      authorUsername: "miguel",
      caption: "Lisbon sunrise never disappoints. Shot on 50mm. ☀️",
      imageUrl:
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2),
    },
    {
      key: "miguel-2",
      authorUsername: "miguel",
      caption: "Playing with silhouettes at the beach. Thoughts?",
      imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=60",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7),
    },
    {
      key: "ayana-1",
      authorUsername: "ayana",
      caption: "Shipped a realtime comment experience today 💬✨",
      imageUrl:
        "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 12),
    },
    {
      key: "liam-1",
      authorUsername: "liam",
      caption: "Storyboard done. Tomorrow we shoot in the old warehouse. Can't wait.",
      imageUrl:
        "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 48),
    },
  ];

  const createdPosts = await Promise.all(
    posts.map((post) =>
      prisma.post.create({
        data: {
          caption: post.caption,
          imageUrl: `${post.imageUrl}&w=900&q=80`,
          authorId: users.get(post.authorUsername)!.id,
          createdAt: post.createdAt,
        },
        select: { id: true, authorId: true, createdAt: true },
      })
    )
  );

  return new Map(
    createdPosts.map(
      (post: { id: string; authorId: string }, index: number) => [posts[index]!.key, post]
    )
  );
}

async function seedFollowGraph(users: Map<string, { id: string }>) {
  const followPairs: Array<[string, string]> = [
    ["sarah", "miguel"],
    ["sarah", "ayana"],
    ["miguel", "sarah"],
    ["miguel", "ayana"],
    ["ayana", "sarah"],
    ["liam", "sarah"],
    ["liam", "miguel"],
  ];

  await prisma.follow.createMany({
    data: followPairs.map(([followerUsername, followingUsername]) => ({
      followerId: users.get(followerUsername)!.id,
      followingId: users.get(followingUsername)!.id,
    })),
    skipDuplicates: true,
  });
}

async function seedEngagement(
  users: Map<string, { id: string; username: string }>,
  posts: Map<string, { id: string; authorId: string }>
) {
  const likes: Array<[string, string]> = [
    ["sarah", "miguel-1"],
    ["sarah", "liam-1"],
    ["miguel", "sarah-1"],
    ["miguel", "sarah-2"],
    ["ayana", "sarah-1"],
    ["ayana", "miguel-1"],
    ["liam", "sarah-1"],
    ["liam", "miguel-1"],
  ];

  await prisma.like.createMany({
    data: likes.map(([username, postKey]) => ({
      userId: users.get(username)!.id,
      postId: posts.get(postKey)!.id,
    })),
    skipDuplicates: true,
  });

  await prisma.save.createMany({
    data: [
      { userId: users.get("sarah")!.id, postId: posts.get("miguel-1")!.id },
      { userId: users.get("sarah")!.id, postId: posts.get("liam-1")!.id },
      { userId: users.get("ayana")!.id, postId: posts.get("sarah-2")!.id },
    ],
    skipDuplicates: true,
  });

  const commentsPayload = [
    {
      postKey: "sarah-1",
      user: "miguel",
      body: "The palette feels super fresh – can already imagine this in the app!",
    },
    {
      postKey: "sarah-1",
      user: "ayana",
      body: "Love how the typography hierarchy guides the eye. Nice work!",
    },
    {
      postKey: "miguel-1",
      user: "sarah",
      body: "This light is unreal. Need to know your lens setup!",
    },
    {
      postKey: "miguel-1",
      user: "liam",
      body: "Adding this spot to my location scouting list 👀",
    },
    {
      postKey: "liam-1",
      user: "sarah",
      body: "Can’t wait to see the final cut. The storyboard looks promising!",
    },
  ];

  for (const entry of commentsPayload) {
    await prisma.comment.create({
      data: {
        postId: posts.get(entry.postKey)!.id,
        userId: users.get(entry.user)!.id,
        body: entry.body,
      },
    });
  }
}

async function main() {
  await resetDatabase();
  const users = await seedUsers();
  const posts = await seedPosts(users);
  await seedFollowGraph(users);
  await seedEngagement(users, posts);

  console.log("Seed complete. You can log in with any seeded email using Password123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
