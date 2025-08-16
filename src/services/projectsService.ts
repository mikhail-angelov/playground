import { db, users, projects, Project } from "@/db";
import { eq } from "drizzle-orm";
import ejs from "ejs";
import path from "path";
import { v4 } from "uuid";
import { uploadFileToS3 } from "./s3Service";

function parseContent(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export type TopProject = {
  id: number;
  name: string;
  image: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  userEmail: string | null;
  userName: string | null;
};

export function getBestProjects(limit: number = 9): TopProject[] {
  const topProjects = db
    .select({
      id: projects.id,
      name: projects.name,
      image: projects.image,
      content: projects.content,
      userEmail: users.email,
      userName: users.name,
    })
    .from(projects)
    .innerJoin(users, eq(projects.userId, users.id))
    .limit(limit)
    .all();

  return topProjects.map((proj) => ({
    ...proj,
    content: parseContent(proj.content as string),
  }));
}

export function getMyProjects(userId: number): Project[] {
  const items = db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .all();

  return items.map((proj) => ({
    ...proj,
    content: parseContent(proj.content as string),
  }));
}

export async function generatePreviewHtml({
  name,
  projectId,
  content,
}: {
  name: string;
  projectId: string;
  content: Record<string, string>;
}): Promise<string> {
  try {
    const baseUrl = process.env.CLIENT_URL || "http://localhost:5000";
    const projectUrl = `${baseUrl}/edit/${projectId}`;
    const image = `https://app.js2go.ru/${projectId}.png`;
    const description = `${name} app` || "js2go.ru";
    const htmlContent =
      Object.entries(content).find(([key]) => key.includes(".html"))?.[1] || "";
    const cssContent =
      Object.entries(content).find(([key]) => key.includes(".css"))?.[1] || "";
    const jsContent =
      Object.entries(content).find(([key]) => key.includes(".js"))?.[1] || "";

    const templatePath = path.resolve(
      process.cwd(),
      "src/templates/preview.ejs",
    );

    return ejs.renderFile(templatePath, {
      name,
      description,
      projectUrl,
      image,
      htmlContent,
      cssContent,
      jsContent,
      projectId,
    });
  } catch (error) {
    console.error("generatePreviewHtml:", error);
    throw error;
  }
}

export async function upload({
  name = "",
  projectId,
  content,
  image,
  userId,
  email,
}: {
  name: string;
  projectId: number;
  content: Record<string, string>;
  image: string;
  userId: number;
  email: string;
}) {
  const existingProject = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .get();
  if (existingProject && existingProject.userId != userId) {
    console.log(
      `File ${projectId} with the same key already exists for another user: ${existingProject.userId}, but current user is ${userId}`,
    );
    throw new Error("File with the same key already exists for another user");
  }

  if (!projectId) {
    projectId = v4();
  }

  // Upload the file to S3
  await uploadFileToS3(
    projectId,
    JSON.stringify({ projectId, name, content, email }),
  );

  console.log(`Project ${projectId} uploaded successfully to S3`);
  // Decode the base64 image string
  const base64Image = image.split(";base64,").pop(); // Extract the base64 part
  const imageBuffer = Buffer.from(base64Image || "", "base64");
  await uploadFileToS3(`${projectId}.png`, imageBuffer, "image/png");

  console.log(`Project image ${projectId}.png uploaded successfully to S3`);
  // Generate the preview HTML
  const previewHtml = await generatePreviewHtml({
    name,
    projectId,
    content,
  });

  console.log(`Generated preview HTML for project ${projectId}`);
  // Upload the preview HTML to S3 with the key `${projectId}-share`
  await uploadFileToS3(`${projectId}.html`, previewHtml, "text/html");
  console.log(`Preview HTML uploaded for project ${projectId}`);

  if (existingProject) {
    await db
      .update(projects)
      .set({ name, image })
      .where(eq(projects.projectId, projectId));
  } else {
    await db.insert(projects).values({
      userId: userId,
      email,
      name,
      projectId,
      image,
      rating: 0,
    });
  }

  return { status: "success" };
}

export async function updateProject(
  projectId: string,
  updates: Partial<Project>,
) {
  return await db
    .update(projects)
    .set(updates)
    .where(eq(projects.id, projectId));
}

// export async function deleteProject(projectId: string, userId: string) {
//   const project = await Project.findOne({
//     where: { projectId, userId },
//   });

//   if (!project) {
//     throw new Error(
//       "Project not found or you do not have permission to delete it",
//     );
//   }

//   await Project.destroy({
//     where: { projectId, userId },
//   });

//   return { status: "success", message: "Project deleted successfully" };
// }
