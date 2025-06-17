import express, { Request, Response } from "express";
import { authMiddleware } from "./authMiddleware";
import { aiService } from "../services/aiService";

const router = express.Router();

// Define a custom request type to include `userId`
interface AuthenticatedRequest extends Request {
  userId?: number;
  email?: string;
}

router.post(
  "/",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stream = await aiService.makeRequest({
        ...req.body,
        userId: req.userId,
      });
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }

      res.end();
    } catch (err) {
      console.error("Failed AI request:", err);
      res.status(400).json({ error: "Failed AI request" });
    }
  }
);

export default router;
