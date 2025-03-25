import { Project } from "../models/Project";
import { v4 } from "uuid";
import { uploadFileToS3 } from "./s3Service";

export const projectsService = {
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
    content: any;
    image: string;
    userId: string;
    email?: string;
  }) {
    const s3Key = projectId;

    // Check if a file with the same s3Key already exists
    const existingProject = await Project.findOne({ where: { projectId } });

    if (existingProject && existingProject.userId != userId) {
      console.log(
        `File ${projectId} with the same key already exists for another user: ${existingProject.userId}, but current user is ${userId}`
      );
      throw new Error("File with the same key already exists for another user");
    }

    // Upload the file to S3
    await uploadFileToS3(
      s3Key,
      JSON.stringify({ projectId, name, content, email })
    );

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
        image,
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
