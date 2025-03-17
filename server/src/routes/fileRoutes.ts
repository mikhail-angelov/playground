import express, { Request, Response } from "express";
import { UserFile } from "../models/UserFile";
import { uploadFileToS3, getFileFromS3 } from "../services/s3Service";

const router = express.Router();

// Define a custom request type to include `userId`
interface AuthenticatedRequest extends Request {
  userId?: string;
}

router.post("/upload", async (req: AuthenticatedRequest, res: Response) => {
  const { fileName, content } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: No user ID provided" });
  }

  try {
    const s3Key = `${userId}/${fileName}`;
    await uploadFileToS3(s3Key, content);

    const userFile = await UserFile.create({ userId, fileName, s3Key });
    res.json(userFile);
  } catch (err) {
    res.status(500).json({ error: "Failed to upload file" });
  }
});

router.get(
  "/download/:fileName",
  async (req: AuthenticatedRequest, res: Response) => {
    const { fileName } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res
        .status(401)
        .json({ error: "Unauthorized: No user ID provided" });
    }

    try {
      const userFile = await UserFile.findOne({ where: { userId, fileName } });
      if (!userFile) return res.status(404).json({ error: "File not found" });

      const content = await getFileFromS3(userFile.s3Key);
      res.json({ content });
    } catch (err) {
      res.status(500).json({ error: "Failed to download file" });
    }
  }
);

export default router;
