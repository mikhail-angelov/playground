import express, { Request, Response } from "express";
import { v4 } from "uuid";
import { uploadFileToS3 } from "../services/s3Service";
import { Project } from "../models/Project";
import { authMiddleware } from "./authMiddleware";
import { projectsService } from "../services/projectsService";

const router = express.Router();

// Define a custom request type to include `userId`
interface AuthenticatedRequest extends Request {
  userId?: string;
  email?: string;
}

router.post(
  "/upload",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    const { name = "", projectId = v4(), content, image } = req.body;
    const userId = req.userId;
    const email = req.email;

    if (!userId) {
      return res
        .status(401)
        .json({ error: "Unauthorized: No user ID provided" });
    }

    try {
      const result = await projectsService.upload({
        name,
        projectId,
        content,
        image,
        userId,
        email,
      });
      
      res.json(result);
    } catch (err) {
      console.error("Error uploading file:", err);
      res.status(500).json({ error: "Failed to upload file" });
    }
  }
);
// Get the best projects
router.get("/best", async (req: Request, res: Response) => {
  try {
    const projects = await projectsService.getBestProjects();

    res.json(projects);
  } catch (err) {
    console.error("Error fetching best projects:", err);
    res.status(500).json({ error: "Failed to fetch best projects" });
  }
});

// Get projects for the authenticated user
router.get(
  "/my",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projects = await projectsService.getMyProjects(
        req.userId as string
      );
      res.json(projects);
    } catch (err) {
      console.error("Error fetching user projects:", err);
      res.status(500).json({ error: "Failed to fetch user projects" });
    }
  }
);

// Delete a project
router.delete(
  "/:projectId",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    const { projectId } = req.params;
    const userId = req.userId;
    const { my } = req.body;

    if (!userId) {
      return res
        .status(401)
        .json({ error: "Unauthorized: No user ID provided" });
    }

    try {
      await projectsService.deleteProject(projectId, userId);
      const projects = await (my
        ? projectsService.getMyProjects(userId)
        : projectsService.getBestProjects());
      res.json(projects);
    } catch (err) {
      console.error("Error deleting project:", err);
      res.status(500).json({ error: "Failed to delete project" });
    }
  }
);

export default router;
