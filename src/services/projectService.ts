import { db, users, projects } from "@/db";
import { eq } from "drizzle-orm";

export type TopProject = {
  id: number;
  name: string;
  image: string | null;
  projectId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  userEmail: string | null;
  userName: string | null;
};

/**
 * Fetch the first N top projects, joined with user info.
 * @param limit Number of projects to fetch (default 9)
 */
export function getTopProjects(limit: number = 9): TopProject[] {
  const topProjects = db
    .select({
      id: projects.id,
      name: projects.name,
      image: projects.image,
      projectId: projects.projectId,
      // content: projects.content,
      userEmail: users.email,
      userName: users.name,
    })
    .from(projects)
    .innerJoin(users, eq(projects.userId, users.id))
    .limit(limit)
    .all();

  return topProjects.map((proj) => ({
    ...proj,
    // content: parseContent(proj.content as string),
  }));
}
