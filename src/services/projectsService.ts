import { db, users, projects, Project } from "@/db";
import { eq } from "drizzle-orm";
import ejs from "ejs";
import { v4 } from "uuid";
import { uploadFileToS3 } from "./s3Service";
import { previewTemplate } from "./preview.ejs";
import zlib from "zlib";
import { ProjectDto } from "@/dto/project.dto";

export type TopProject = {
  id: number;
  projectId: string;
  name: string;
  image: string | null;
  userEmail: string | null;
};

export function getBestProjects(limit: number = 9): TopProject[] {
  const topProjects = db
    .select({
      id: projects.id,
      projectId: projects.projectId,
      name: projects.name,
      image: projects.image,
      userEmail: users.email,
    })
    .from(projects)
    .innerJoin(users, eq(projects.userId, users.id))
    .limit(limit)
    .all();

  return topProjects.map((proj) => ({
    ...proj,
  }));
}

export function getMyProjects(userId: number): TopProject[] {
  const items = db
    .select({
      id: projects.id,
      projectId: projects.projectId,
      name: projects.name,
      image: projects.image,
      userEmail: users.email,
    })
    .from(projects)
    .innerJoin(users, eq(projects.userId, users.id)) // <-- Add this line
    .where(eq(projects.userId, userId))
    .all();

  return items.map((proj) => ({
    ...proj,
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
    const baseUrl = process.env.APP_URL || "http://localhost:3000";
    const projectUrl = `${baseUrl}/project/${projectId}`;
    const image = `${baseUrl}/${projectId}.png`;
    const description = `${name} app` || "js2go.ru";
    const htmlContent =
      Object.entries(content).find(([key]) => key.includes(".html"))?.[1] || "";
    const cssContent =
      Object.entries(content).find(([key]) => key.includes(".css"))?.[1] || "";
    const jsContent =
      Object.entries(content).find(([key]) => key.includes(".js"))?.[1] || "";

    // Get Yandex Metrica ID from env
    const yandexMetricaId = process.env.YANDEX_METRICA_ID || '';
    return ejs.render(previewTemplate, {
      name,
      description,
      projectUrl,
      image,
      htmlContent,
      cssContent,
      jsContent,
      projectId,
      yandexMetricaId,
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
  tags,
}: {
  name: string;
  projectId: string;
  content: Record<string, string>;
  image: string;
  userId: number;
  email: string;
  tags: string[];
}): Promise<ProjectDto> {
  const existingProject = await db
    .select()
    .from(projects)
    .where(eq(projects.projectId, projectId))
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
  const projectData = JSON.stringify({ projectId, name, content });
  const compressedProjectData = zlib.gzipSync(projectData);
  await uploadFileToS3(
    projectId,
    compressedProjectData,
    "application/json",
    "gzip"
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
  const compressedPreviewHtml = zlib.gzipSync(previewHtml);
  await uploadFileToS3(`${projectId}.html`, compressedPreviewHtml, "text/html", "gzip");
  console.log(`Preview HTML uploaded for project ${projectId}`);

  if (existingProject) {
    await db
      .update(projects)
      .set({ name, image, tags })
      .where(eq(projects.projectId, projectId));
  } else {
    await db.insert(projects).values({
      userId: userId,
      email,
      name,
      projectId,
      image,
      tags,
    });
  }

  return await getProject(projectId, email);
}

export async function updateProject(
  projectId: string,
  updates: Partial<Project>,
) {
  return await db
    .update(projects)
    .set(updates)
    .where(eq(projects.projectId, projectId));
}

export async function getProject(  projectId: string, email: string): Promise<ProjectDto> {
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.projectId, projectId))
    .get();
  if (!project) {
    throw new Error("Project not found");
  }
  return {
    isMy: project.email===email,
    hasAi: false,
    email: project.email,
    name: project.name,
    projectId: project.projectId,
    lastPublish: "",
    error: "",
    isLoading: false,
    selectedFile: "index.html",
    fileContents: {
      "index.html": "",
      "style.css": "",
      "script.js": "",
    },
    preview: "",
    tags: project.tags,
    url: `${process.env.APP_HOST}/${projectId}.html`,
  };
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
