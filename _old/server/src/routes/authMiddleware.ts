import express from "express";
import { verifyToken } from "../../services/jwtUtils";

export const authMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const token = req.cookies?.auth; // Read the token from the 'auth' cookie
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  try {
    const decoded = verifyToken(token);
    (req as any).userId = (decoded as any).userId;
    (req as any).email = (decoded as any).email;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};
