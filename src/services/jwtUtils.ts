import jwt from "jsonwebtoken";

export const generateToken = (payload: {
  userId: string;
  email: string;
  hasAi: boolean;
}): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: 864000000 });
};

export const verifyToken = (token: string): string | jwt.JwtPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!);
};
