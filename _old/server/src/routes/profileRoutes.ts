import express, { Request, Response } from "express";
import { authMiddleware } from "./authMiddleware";
import { profileService } from "../../services/profileService";

const router = express.Router();

// Define a custom request type to include `userId`
interface AuthenticatedRequest extends Request {
  userId?: number;
  email?: string;
}

router.get(
  "/",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    const id = req.userId;
    try {
      const api = await profileService.get(id || 0);

      res.json(api);
    } catch (err) {
      console.error("Error fetching profile:", err);
      res.status(400).json({ error: "Failed to fetch profile" });
    }
  },
);

router.post(
  "/",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    const id = req.userId;
    try {
      const api = await profileService.save(id || 0, req.body);

      res.json(api);
    } catch (err) {
      console.error("Error save profile:", err);
      res.status(400).json({ error: "Failed to save profile" });
    }
  },
);

export default router;
