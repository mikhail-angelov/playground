import express, { Request, Response } from "express";
import { v4 } from "uuid";
import { uploadFileToS3 } from "../services/s3Service";
import { Project } from "../models/Project";
import { authMiddleware } from "./authMiddleware";

const router = express.Router();

// Define a custom request type to include `userId`
interface AuthenticatedRequest extends Request {
  userId?: string;
}

router.post(
  "/upload",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    const { name = "", projectId = v4(), content, image } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res
        .status(401)
        .json({ error: "Unauthorized: No user ID provided" });
    }

    try {
      const s3Key = projectId || v4();

      // Check if a file with the same s3Key already exists
      const existingProject = await Project.findOne({ where: { projectId } });

      if (existingProject && existingProject.userId != userId) {
        console.log(
          `File ${projectId} with the same key already exists for another user: ${existingProject.userId}, but current user is ${userId}`
        );
        return res.status(400).json({
          error: "File with the same key already exists for another user",
        });
      }

      // Upload the file to S3
      await uploadFileToS3(s3Key, JSON.stringify(content));

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
        const project = await Project.upsert({
          userId,
          name,
          projectId,
          image,
          rating: 0,
        });
      }

      res.json({ status: "success" });
    } catch (err) {
      console.error("Error uploading file:", err);
      res.status(500).json({ error: "Failed to upload file" });
    }
  }
);

router.get("/best", async (req: Request, res: Response) => {
  try {
    // Fetch the top 9 projects sorted by rating or likes in descending order
    const projects = await Project.findAll({
      order: [["rating", "DESC"]], // Replace "rating" with the appropriate field (e.g., "likes")
      limit: 9, // Limit to 9 projects
    });

    res.json(projects);
  } catch (err) {
    console.error("Error fetching best projects:", err);
    res.status(500).json({ error: "Failed to fetch best projects" });
  }
});

export default router;
