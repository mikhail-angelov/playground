import { db, users, projects } from "./index";
import { eq } from "drizzle-orm";

// Demo user email
const DEMO_EMAIL = "demo@example.com";

// 9 demo projects data
const demoProjects = [
  {
    name: "Project Alpha",
    content: { description: "First project", tags: ["alpha", "demo"] },
    image: "https://picsum.photos/id/101/400/300",
  },
  {
    name: "Beta Launch",
    content: { description: "Beta version launch", tags: ["beta", "release"] },
    image: "https://picsum.photos/id/102/400/300",
  },
  {
    name: "Gamma Tools",
    content: {
      description: "Tooling for gamma workflows",
      tags: ["tools", "gamma"],
    },
    image: "https://picsum.photos/id/103/400/300",
  },
  {
    name: "Delta Dashboard",
    content: {
      description: "Analytics dashboard",
      tags: ["dashboard", "analytics"],
    },
    image: "https://picsum.photos/id/104/400/300",
  },
  {
    name: "Epsilon API",
    content: {
      description: "API for Epsilon integration",
      tags: ["api", "epsilon"],
    },
    image: "https://picsum.photos/id/105/400/300",
  },
  {
    name: "Zeta CRM",
    content: {
      description: "Customer relationship management",
      tags: ["crm", "zeta"],
    },
    image: "https://picsum.photos/id/106/400/300",
  },
  {
    name: "Eta Mobile",
    content: { description: "Mobile app for Eta", tags: ["mobile", "eta"] },
    image: "https://picsum.photos/id/107/400/300",
  },
  {
    name: "Theta AI",
    content: { description: "AI-powered features", tags: ["ai", "theta"] },
    image: "https://picsum.photos/id/108/400/300",
  },
  {
    name: "Iota Sync",
    content: {
      description: "Data synchronization service",
      tags: ["sync", "iota"],
    },
    image: "https://picsum.photos/id/109/400/300",
  },
];

async function main() {
  let user = db.select().from(users).where(eq(users.email, DEMO_EMAIL)).get();
  if (!user) {
    user = db
      .insert(users)
      .values({
        email: DEMO_EMAIL,
      })
      .returning()
      .get();
    if (Array.isArray(user)) user = user[0];
  }

  if (!user?.id) {
    console.log("no demo user");
    return;
  }
  // Remove existing projects for this user (for idempotency)
  db.delete(projects).where(eq(projects.userId, user.id)).run();

  // Insert demo projects
  for (const [i, proj] of demoProjects.entries()) {
    db.insert(projects)
      .values({
        name: proj.name,
        userId: user.id,
        image: proj.image,
        projectId: `demo-project-${i + 1}`,
        rating: 0,
      })
      .run();
  }

  console.log("Seeded 9 demo projects for user:", DEMO_EMAIL);
}

main();
