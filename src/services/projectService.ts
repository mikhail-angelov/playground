"use server";

import { db, users, projects } from "@/db";
import { eq } from "drizzle-orm";

export type TopProject = {
  id: number;
  name: string;
  image: string | null;
  projectId: string;
  userEmail: string | null;
};

/**
 * Fetch the first N top projects, joined with user info.
 * @param limit Number of projects to fetch (default 9)
 */
export async function getTopProjects(limit: number = 9): Promise<TopProject[]> {
  const topProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      image: projects.image,
      projectId: projects.projectId,
      // content: projects.content,
      userEmail: users.email,
    })
    .from(projects)
    .innerJoin(users, eq(projects.userId, users.id))
    .limit(limit)
    .all();

  return topProjects;
}
