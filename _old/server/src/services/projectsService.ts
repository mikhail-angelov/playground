import { Project } from "../models/Project";
import { v4 } from "uuid";
import ejs from "ejs";
import path from "path";
import { uploadFileToS3 } from "./s3Service";

export const projectsService = {
  async generatePreviewHtml({
    name,
    projectId,
    content,
  }: {
    name: string;
    projectId: string;
    content: Record<string, string>;
  }): Promise<string> {
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

    const templatePath = path.resolve(__dirname, "../templates/preview.ejs");

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
  },

  async upload({
    name = "",
    projectId = v4(),
    content,
    image,
    userId,
    email,
  }: {
    name: string;
    projectId?: string;
    content: Record<string, string>;
    image: string;
    userId: string;
    email?: string;
  }) {
    const existingProject = await Project.findOne({ where: { projectId } });
    if (existingProject && existingProject.userId != userId) {
      console.log(
        `File ${projectId} with the same key already exists for another user: ${existingProject.userId}, but current user is ${userId}`
      );
      throw new Error("File with the same key already exists for another user");
    }

    console.log(`Uploading project with ID: ${projectId}`);

    // Upload the file to S3
    await uploadFileToS3(
      projectId,
      JSON.stringify({ projectId, name, content, email })
    );

    console.log(`Project ${projectId} uploaded successfully to S3`);
    // Decode the base64 image string
    const base64Image = image.split(";base64,").pop(); // Extract the base64 part
    const imageBuffer = Buffer.from(base64Image || "", "base64");
    await uploadFileToS3(`${projectId}.png`, imageBuffer, "image/png");

    // Generate the preview HTML
    const previewHtml = await this.generatePreviewHtml({
      name,
      projectId,
      content,
    });

    console.log(`Generated preview HTML for project ${projectId}`);
    // Upload the preview HTML to S3 with the key `${projectId}-share`
    await uploadFileToS3(`${projectId}.html`, previewHtml, "text/html");
    console.log(`Preview HTML uploaded for project ${projectId}`);

    if (existingProject) {
      await Project.update(
        {
          name,
          image,
        },
        {
          where: { projectId },
        }
      );
    } else {
      // Create or update the UserFile record
      await Project.upsert({
        userId,
        email,
        name,
        projectId,
        rating: 0,
      });
    }

    return { status: "success" };
  },

  async getBestProjects() {
    return await Project.findAll({
      order: [["rating", "DESC"]],
      limit: 9,
    });
  },

  async getMyProjects(userId: string) {
    return await Project.findAll({
      where: { userId },
      order: [["updatedAt", "DESC"]],
    });
  },

  async updateProject(projectId: string, updates: Partial<Project>) {
    return await Project.update(updates, {
      where: { projectId },
    });
  },

  /**
   * Delete a project by its ID and user ID.
   * @param projectId The ID of the project to delete.
   * @param userId The ID of the user who owns the project.
   */
  async deleteProject(projectId: string, userId: string) {
    const project = await Project.findOne({
      where: { projectId, userId },
    });

    if (!project) {
      throw new Error(
        "Project not found or you do not have permission to delete it"
      );
    }

    await Project.destroy({
      where: { projectId, userId },
    });

    return { status: "success", message: "Project deleted successfully" };
  },
};
